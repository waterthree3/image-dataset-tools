import os
from flask import Blueprint, request, jsonify, send_file
import config
from services.video_processor import VideoProcessor
from services.frame_manager import FrameManager

frame_bp = Blueprint('frame', __name__)
frame_manager = FrameManager(config.FRAME_FOLDER)


@frame_bp.route('/videos/<video_id>/extract', methods=['POST'])
def extract_frames(video_id):
    """
    提取视频帧

    Args:
        video_id: 视频唯一标识

    Request Body:
        fps: 每秒提取帧数（可选，默认为config.DEFAULT_FPS）

    Returns:
        JSON响应，包含提取状态
    """
    try:
        # 获取参数
        data = request.get_json() or {}
        fps = data.get('fps', config.DEFAULT_FPS)

        # 查找视频文件
        video_path = None
        for ext in config.ALLOWED_EXTENSIONS:
            path = os.path.join(config.UPLOAD_FOLDER, f"{video_id}.{ext}")
            if os.path.exists(path):
                video_path = path
                break

        if not video_path:
            return jsonify({'error': 'Video not found'}), 404

        # 提取帧
        output_dir = os.path.join(config.FRAME_FOLDER, video_id)

        # 定义进度回调（可以后续实现WebSocket推送）
        def progress_callback(current, total):
            progress = int((current / total) * 100)
            print(f"Extraction progress: {progress}%")

        result = VideoProcessor.extract_frames(
            video_path=video_path,
            output_dir=output_dir,
            fps=fps,
            progress_callback=progress_callback
        )

        # 保存元数据
        metadata = {
            'filename': os.path.basename(video_path),
            'total_extracted': result['total_extracted'],
            'frames': result['frames'],
            'fps_setting': fps
        }
        frame_manager.save_metadata(video_id, metadata)

        return jsonify({
            'video_id': video_id,
            'total_frames': result['total_extracted'],
            'status': 'completed'
        }), 200

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': f'Extraction failed: {str(e)}'}), 500


@frame_bp.route('/videos/<video_id>/frames', methods=['GET'])
def get_frames(video_id):
    """
    获取帧列表（分页）

    Args:
        video_id: 视频唯一标识

    Query Parameters:
        page: 页码（默认1）
        limit: 每页数量（默认50）

    Returns:
        JSON响应，包含帧列表和分页信息
    """
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int)

        result = frame_manager.get_frame_list(video_id, page, limit)

        if result is None:
            return jsonify({'error': 'Video not found or not extracted'}), 404

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': f'Failed to get frames: {str(e)}'}), 500


@frame_bp.route('/videos/<video_id>/frames/<int:frame_index>', methods=['GET'])
def get_frame(video_id, frame_index):
    """
    获取单帧图像

    Args:
        video_id: 视频唯一标识
        frame_index: 帧索引

    Query Parameters:
        thumbnail: 是否获取缩略图（true/false，默认false）

    Returns:
        图像文件
    """
    try:
        thumbnail = request.args.get('thumbnail', 'false').lower() == 'true'

        frame_path = frame_manager.get_frame_path(video_id, frame_index, thumbnail)

        if not frame_path:
            return jsonify({'error': 'Frame not found'}), 404

        # 设置缓存头
        response = send_file(
            frame_path,
            mimetype='image/jpeg',
            as_attachment=False
        )

        # 缓存1小时
        response.headers['Cache-Control'] = 'public, max-age=3600'

        return response

    except Exception as e:
        return jsonify({'error': f'Failed to get frame: {str(e)}'}), 500


@frame_bp.route('/videos/<video_id>/info', methods=['GET'])
def get_video_info(video_id):
    """
    获取视频信息

    Args:
        video_id: 视频唯一标识

    Returns:
        JSON响应，包含视频元数据
    """
    try:
        metadata = frame_manager.get_metadata(video_id)

        if not metadata:
            return jsonify({'error': 'Video not found'}), 404

        return jsonify(metadata), 200

    except Exception as e:
        return jsonify({'error': f'Failed to get video info: {str(e)}'}), 500
