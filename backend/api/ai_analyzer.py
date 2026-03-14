"""
AI-powered video frame analyzer.

POST /api/videos/<video_id>/ai_analyze
  Body: {
    "api_key":         "...",
    "model":           "gpt-4o",
    "base_url":        "https://api.openai.com/v1",   # only used when api_format=openai
    "api_format":      "openai" | "anthropic",
    "requirements":    "描述你要找的画面",
    "sample_interval": 5    # seconds between sampled frames (min 1)
  }
  Response: {
    "selected_frames": [{"time": <float>, "reason": "<str>"}],
    "total_sampled": <int>,
    "model": "<str>"
  }
"""

import base64
import json
import os
import re

import cv2
import requests
from flask import Blueprint, jsonify, request

import config

ai_bp = Blueprint('ai', __name__)

ALLOWED_EXTS = list(config.ALLOWED_EXTENSIONS)  # e.g. ['mp4', 'avi', 'mov', 'mkv']


def _find_video(video_id: str):
    """Return the full path of the uploaded video, or None."""
    for ext in ALLOWED_EXTS:
        path = os.path.join(config.UPLOAD_FOLDER, f"{video_id}.{ext}")
        if os.path.exists(path):
            return path
    return None


def _sample_frames(video_path: str, interval: float, max_width: int = 512):
    """Extract frames at `interval`-second intervals.
    Returns list of (time_seconds: float, base64_jpeg: str).
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("Could not open video file")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps

    frames = []
    t = 0.0
    while t <= duration:
        idx = min(int(t * fps), total_frames - 1)
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            h, w = frame.shape[:2]
            if w > max_width:
                new_h = int(h * max_width / w)
                frame = cv2.resize(frame, (max_width, new_h), interpolation=cv2.INTER_AREA)
            _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            b64 = base64.b64encode(buf).decode('utf-8')
            frames.append((round(t, 2), b64))
        t += interval

    cap.release()
    return frames


def _call_openai(api_key: str, model: str, base_url: str, requirements: str, frames):
    """Call an OpenAI-compatible vision API.  Returns list of {"time", "reason"} dicts."""
    system_prompt = (
        f"You are a video frame analyzer. I'll show you {len(frames)} frames sampled from a video.\n\n"
        f"User requirements: {requirements}\n\n"
        "Identify which frames match the requirements.\n"
        "Respond with ONLY valid JSON — no markdown, no explanation:\n"
        '{"selected": [{"time": <seconds_float>, "reason": "<≤20 words>"}]}\n'
        'If nothing matches, return {"selected": []}.'
    )

    content = [{"type": "text", "text": system_prompt}]
    for time_sec, b64 in frames:
        content.append({"type": "text", "text": f"Frame at {time_sec}s:"})
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
        })

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": 2000,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    url = base_url.rstrip('/') + '/chat/completions'
    resp = requests.post(url, json=payload, headers=headers, timeout=120)
    resp.raise_for_status()
    text = resp.json()['choices'][0]['message']['content']
    return _parse_json_response(text)


def _call_anthropic(api_key: str, model: str, requirements: str, frames):
    """Call the Anthropic messages API. Returns list of {"time", "reason"} dicts."""
    content = []
    for time_sec, b64 in frames:
        content.append({"type": "text", "text": f"Frame at {time_sec}s:"})
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
        })

    content.append({
        "type": "text",
        "text": (
            f"User requirements: {requirements}\n\n"
            "Identify which of the frames above match the requirements.\n"
            "Respond with ONLY valid JSON — no markdown, no explanation:\n"
            '{"selected": [{"time": <seconds_float>, "reason": "<≤20 words>"}]}\n'
            'If nothing matches, return {"selected": []}.'
        ),
    })

    payload = {
        "model": model,
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": content}],
    }
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
    }
    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        json=payload, headers=headers, timeout=120,
    )
    resp.raise_for_status()
    text = resp.json()['content'][0]['text']
    return _parse_json_response(text)


def _parse_json_response(text: str):
    """Extract the {"selected": [...]} list from an AI response string."""
    try:
        m = re.search(r'\{[\s\S]*\}', text)
        if m:
            return json.loads(m.group()).get('selected', [])
    except (json.JSONDecodeError, AttributeError):
        pass
    return []


# ── Route ────────────────────────────────────────────────────────────────────

@ai_bp.route('/videos/<video_id>/ai_analyze', methods=['POST'])
def ai_analyze(video_id):
    data = request.get_json(force=True) or {}

    api_key        = (data.get('api_key')   or '').strip()
    model          = (data.get('model')     or 'gpt-4o').strip()
    base_url       = (data.get('base_url')  or 'https://api.openai.com/v1').strip()
    api_format     = (data.get('api_format') or 'openai').strip()
    requirements   = (data.get('requirements') or '').strip()
    sample_interval = max(float(data.get('sample_interval') or 5), 1.0)

    if not api_key:
        return jsonify({'error': 'api_key is required'}), 400
    if not requirements:
        return jsonify({'error': 'requirements cannot be empty'}), 400

    video_path = _find_video(video_id)
    if not video_path:
        return jsonify({'error': 'Video not found'}), 404

    # ── Sample frames ────────────────────────────────────────────────────────
    try:
        sampled = _sample_frames(video_path, sample_interval)
    except Exception as e:
        return jsonify({'error': f'Frame extraction failed: {e}'}), 500

    if not sampled:
        return jsonify({'error': 'No frames could be extracted'}), 500

    # ── Call AI in batches of 20 ─────────────────────────────────────────────
    BATCH = 20
    all_selected = []
    try:
        for start in range(0, len(sampled), BATCH):
            batch = sampled[start:start + BATCH]
            if api_format == 'anthropic':
                selected = _call_anthropic(api_key, model, requirements, batch)
            else:
                selected = _call_openai(api_key, model, base_url, requirements, batch)
            all_selected.extend(selected)

    except requests.exceptions.HTTPError as e:
        msg = ''
        try:
            msg = e.response.json().get('error', {}).get('message', str(e))
        except Exception:
            msg = str(e)
        return jsonify({'error': f'AI API error: {msg}'}), 502

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {e}'}), 502

    except Exception as e:
        return jsonify({'error': f'Analysis failed: {e}'}), 500

    # Sort by time, remove duplicates
    seen = set()
    deduped = []
    for item in sorted(all_selected, key=lambda x: x.get('time', 0)):
        t = item.get('time')
        if t not in seen:
            seen.add(t)
            deduped.append(item)

    return jsonify({
        'selected_frames': deduped,
        'total_sampled': len(sampled),
        'model': model,
    })
