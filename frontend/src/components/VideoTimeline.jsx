import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

/**
 * 将秒数格式化为 M:SS.mmm
 */
const formatTime = (seconds) => {
  const totalSec = Math.floor(seconds);
  const ms = Math.round((seconds - totalSec) * 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};

/**
 * 时间轴截帧组件
 * 上传完成后展示：拖动时间轴实时预览帧，点击"添加此帧"将当前帧加入选取列表，
 * 最后按时间戳一次性导出ZIP。
 */
export const VideoTimeline = ({ videoData, onReset }) => {
  const { video_id, duration, fps, width, height, filename, duration_formatted } = videoData;

  const [currentTime, setCurrentTime] = useState(0);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [selectedFrames, setSelectedFrames] = useState([]); // [{time, thumbUrl}]
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('jpeg');
  const [exportQuality, setExportQuality] = useState(85);
  const [exportPrefix, setExportPrefix] = useState(
    filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_')
  );
  const [error, setError] = useState(null);

  const debounceRef = useRef(null);
  const fetchStateRef = useRef({ fetching: false, pending: null });
  const objectUrlRef = useRef(null);
  const keyStateRef = useRef({ a: false, d: false });
  const keyTimersRef = useRef({ timerA: null, timerD: null, intervalA: null, intervalD: null });
  const frameStep = fps > 0 ? 1 / fps : 1 / 30;

  // 构建预览图URL（带时间戳缓存破坏）
  const buildPreviewUrl = useCallback(
    (t) => `/api/videos/${video_id}/frame_at?time=${t.toFixed(4)}`,
    [video_id]
  );

  // 取帧：fetch + ObjectURL，确保持续按键时每帧完成后立即取下一帧
  // 若有请求在途，仅记录最新时间；请求完成后立即发起下一个（不堆积并行请求）
  const fetchFrame = useCallback((t) => {
    const state = fetchStateRef.current;
    if (state.fetching) {
      state.pending = t;
      return;
    }
    state.fetching = true;
    fetch(buildPreviewUrl(t))
      .then((res) => res.blob())
      .then((blob) => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = URL.createObjectURL(blob);
        setPreviewSrc(objectUrlRef.current);
        state.fetching = false;
        if (state.pending !== null) {
          const next = state.pending;
          state.pending = null;
          fetchFrame(next);
        }
      })
      .catch(() => { state.fetching = false; });
  }, [buildPreviewUrl]);

  // 防抖60ms避免滑块拖动时发出过多请求
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchFrame(currentTime), 60);
    return () => clearTimeout(debounceRef.current);
  }, [currentTime, fetchFrame]);

  // 卸载时释放 ObjectURL
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const clampTime = (t) => Math.max(0, Math.min(duration, t));

  const stepFrame = (dir) => setCurrentTime((t) => clampTime(t + dir * frameStep));
  const jumpTime = (delta) => setCurrentTime((t) => clampTime(t + delta));

  // A / D 键盘快捷键：单次按下跳一帧，持续按住则连续步进
  useEffect(() => {
    const step = (dir) =>
      setCurrentTime((t) => Math.max(0, Math.min(duration, t + dir * frameStep)));

    const startRepeat = (dir, key) => {
      step(dir); // 立即跳一帧
      keyTimersRef.current[`timer${key}`] = setTimeout(() => {
        keyTimersRef.current[`interval${key}`] = setInterval(() => step(dir), 80); // ~12fps
      }, 350);
    };

    const stopRepeat = (key) => {
      clearTimeout(keyTimersRef.current[`timer${key}`]);
      clearInterval(keyTimersRef.current[`interval${key}`]);
      keyTimersRef.current[`timer${key}`] = null;
      keyTimersRef.current[`interval${key}`] = null;
    };

    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.key === 'a' || e.key === 'A') && !keyStateRef.current.a) {
        keyStateRef.current.a = true;
        startRepeat(-1, 'A');
      } else if ((e.key === 'd' || e.key === 'D') && !keyStateRef.current.d) {
        keyStateRef.current.d = true;
        startRepeat(1, 'D');
      }
    };

    const onKeyUp = (e) => {
      if (e.key === 'a' || e.key === 'A') {
        keyStateRef.current.a = false;
        stopRepeat('A');
      } else if (e.key === 'd' || e.key === 'D') {
        keyStateRef.current.d = false;
        stopRepeat('D');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      stopRepeat('A');
      stopRepeat('D');
    };
  }, [duration, frameStep]);

  const addFrame = () => {
    const snap = Math.round(currentTime * fps) / fps; // 对齐到最近帧
    const isDuplicate = selectedFrames.some((f) => Math.abs(f.time - snap) < frameStep * 0.5);
    if (isDuplicate) return;

    setSelectedFrames((prev) =>
      [...prev, { time: snap, thumbUrl: buildPreviewUrl(snap) }].sort((a, b) => a.time - b.time)
    );
  };

  const removeFrame = (time) =>
    setSelectedFrames((prev) => prev.filter((f) => f.time !== time));

  const handleExport = async () => {
    if (selectedFrames.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const timestamps = selectedFrames.map((f) => f.time);
      const resp = await api.exportFramesByTimestamps(
        video_id, timestamps, exportFormat, exportQuality, exportPrefix
      );
      const { export_id } = resp.data;

      const dlResp = await api.downloadExport(export_id);
      const blob = new Blob([dlResp.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportPrefix}_frames.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || '导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="video-timeline">
      {/* 顶部：视频信息 + 重新上传 */}
      <div className="timeline-header">
        <div className="timeline-video-info">
          <h2 className="timeline-filename">{filename}</h2>
          <p className="timeline-meta">
            {width} × {height} · {fps.toFixed(2)} FPS · {duration_formatted}
          </p>
        </div>
        <button className="timeline-reset-btn" onClick={onReset}>
          换一个视频
        </button>
      </div>

      {/* 帧预览区 */}
      <div className="timeline-preview-area">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt="帧预览"
            className="timeline-preview-img"
          />
        ) : (
          <div className="timeline-preview-placeholder">加载中...</div>
        )}
        <div className="preview-time-badge">{formatTime(currentTime)}</div>
      </div>

      {/* 时间轴控制区 */}
      <div className="timeline-controls">
        {/* 导航按钮 */}
        <div className="timeline-nav">
          <button className="tl-btn" onClick={() => jumpTime(-10)} title="后退10秒">⏪ 10s</button>
          <button className="tl-btn" onClick={() => stepFrame(-1)} title="上一帧 (A)">◀</button>
          <span className="tl-time-display">
            {formatTime(currentTime)} / {duration_formatted}
          </span>
          <button className="tl-btn" onClick={() => stepFrame(1)} title="下一帧 (D)">▶</button>
          <button className="tl-btn" onClick={() => jumpTime(10)} title="前进10秒">10s ⏩</button>
        </div>
        <p className="tl-key-hint">键盘快捷键：按住 <kbd>A</kbd> 快退 · 按住 <kbd>D</kbd> 快进（逐帧）</p>

        {/* 滑块 */}
        <input
          type="range"
          min="0"
          max={duration}
          step="any"
          value={currentTime}
          onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
          className="timeline-slider"
        />

        {/* 添加帧按钮 */}
        <button className="add-frame-btn" onClick={addFrame}>
          + 添加此帧
        </button>
      </div>

      {/* 已选帧列表 */}
      <div className="selected-frames-panel">
        <div className="selected-frames-header">
          <h3>已选帧 ({selectedFrames.length})</h3>
          {selectedFrames.length > 0 && (
            <button className="tl-clear-btn" onClick={() => setSelectedFrames([])}>
              清空
            </button>
          )}
        </div>

        {selectedFrames.length === 0 ? (
          <p className="tl-empty-hint">拖动时间轴到目标画面，点击「添加此帧」进行采集</p>
        ) : (
          <div className="selected-frames-strip">
            {selectedFrames.map((frame) => (
              <div key={frame.time} className="selected-frame-item">
                <img
                  src={frame.thumbUrl}
                  alt={formatTime(frame.time)}
                  onClick={() => setCurrentTime(frame.time)}
                  title="点击跳转到该时间点"
                />
                <span className="frame-time-label">{formatTime(frame.time)}</span>
                <button
                  className="remove-frame-btn"
                  onClick={() => removeFrame(frame.time)}
                  title="移除此帧"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 导出面板 */}
      {selectedFrames.length > 0 && (
        <div className="timeline-export-panel">
          <div className="tl-export-options">
            <div className="tl-export-row">
              <label>格式：</label>
              <label className="tl-radio">
                <input
                  type="radio"
                  value="jpeg"
                  checked={exportFormat === 'jpeg'}
                  onChange={() => setExportFormat('jpeg')}
                />
                JPEG
              </label>
              <label className="tl-radio">
                <input
                  type="radio"
                  value="png"
                  checked={exportFormat === 'png'}
                  onChange={() => setExportFormat('png')}
                />
                PNG
              </label>
            </div>

            {exportFormat === 'jpeg' && (
              <div className="tl-export-row">
                <label>质量：{exportQuality}</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={exportQuality}
                  onChange={(e) => setExportQuality(parseInt(e.target.value))}
                  className="tl-quality-slider"
                />
              </div>
            )}

            <div className="tl-export-row">
              <label>文件名前缀：</label>
              <input
                type="text"
                value={exportPrefix}
                onChange={(e) => setExportPrefix(e.target.value)}
                className="tl-prefix-input"
                placeholder="frame"
              />
            </div>
          </div>

          <button
            className="tl-export-btn"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? '导出中...' : `导出并下载 ZIP（${selectedFrames.length} 帧）`}
          </button>

          {error && <div className="error-message">❌ {error}</div>}
        </div>
      )}
    </div>
  );
};

export default VideoTimeline;
