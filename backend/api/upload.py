import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import config
from services.video_processor import VideoProcessor
from services.frame_manager import FrameManager

upload_bp = Blueprint('upload', __name__)
frame_manager = FrameManager(config.FRAME_FOLDER)


def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS


@upload_bp.route('/upload', methods=['POST'])
def upload_video():
    """
    上传视频文件

    Returns:
        JSON响应，包含video_id和视频信息
    """
    # 检查是否有文件
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    file = request.files['video']

    # 检查文件名
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # 检查文件类型
    if not allowed_file(file.filename):
        return jsonify({
            'error': f'File type not allowed. Allowed types: {", ".join(config.ALLOWED_EXTENSIONS)}'
        }), 400

    try:
        # 生成唯一video_id
        video_id = str(uuid.uuid4())

        # 保存文件
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.', 1)[1].lower()
        saved_filename = f"{video_id}.{file_ext}"
        video_path = os.path.join(config.UPLOAD_FOLDER, saved_filename)

        file.save(video_path)

        # 获取视频信息
        video_info = VideoProcessor.get_video_info(video_path)

        # 返回响应
        response = {
            'video_id': video_id,
            'filename': filename,
            'duration': video_info['duration'],
            'duration_formatted': video_info['duration_formatted'],
            'total_frames': video_info['total_frames'],
            'fps': video_info['fps'],
            'width': video_info['width'],
            'height': video_info['height']
        }

        return jsonify(response), 200

    except Exception as e:
        # 清理可能已保存的文件
        if 'video_path' in locals() and os.path.exists(video_path):
            os.remove(video_path)

        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@upload_bp.route('/videos', methods=['GET'])
def list_videos():
    """
    获取所有已上传的视频列表

    Returns:
        JSON响应，包含视频列表
    """
    try:
        videos = frame_manager.get_all_videos()
        return jsonify({'videos': videos}), 200

    except Exception as e:
        return jsonify({'error': f'Failed to list videos: {str(e)}'}), 500


@upload_bp.route('/videos/<video_id>', methods=['DELETE'])
def delete_video(video_id):
    """
    删除视频及其所有数据

    Args:
        video_id: 视频唯一标识

    Returns:
        JSON响应
    """
    try:
        # 删除帧数据
        frame_manager.delete_video_frames(video_id)

        # 删除原视频文件
        for ext in config.ALLOWED_EXTENSIONS:
            video_path = os.path.join(config.UPLOAD_FOLDER, f"{video_id}.{ext}")
            if os.path.exists(video_path):
                os.remove(video_path)
                break

        return jsonify({'message': 'Video deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': f'Delete failed: {str(e)}'}), 500
