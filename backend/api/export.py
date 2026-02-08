import os
import uuid
import zipfile
import shutil
from flask import Blueprint, request, jsonify, send_file
from PIL import Image
import cv2
import config
from services.frame_manager import FrameManager

export_bp = Blueprint('export', __name__)
frame_manager = FrameManager(config.FRAME_FOLDER)


@export_bp.route('/videos/<video_id>/export', methods=['POST'])
def export_frames(video_id):
    """
    导出选定的帧

    Args:
        video_id: 视频唯一标识

    Request Body:
        frames: 帧索引列表 [0, 1, 2, ...]
        format: 导出格式（'png' 或 'jpeg'）
        quality: JPEG质量（1-100，仅format='jpeg'时有效）

    Returns:
        JSON响应，包含导出ID和下载信息
    """
    try:
        data = request.get_json()

        if not data or 'frames' not in data:
            return jsonify({'error': 'Missing frames parameter'}), 400

        frame_indices = data.get('frames', [])
        export_format = data.get('format', 'jpeg').lower()
        quality = data.get('quality', 85)

        if export_format not in ['png', 'jpeg', 'jpg']:
            return jsonify({'error': 'Invalid format. Use "png" or "jpeg"'}), 400

        if not frame_indices:
            return jsonify({'error': 'No frames selected'}), 400

        # 生成导出ID
        export_id = str(uuid.uuid4())
        export_dir = os.path.join(config.EXPORT_FOLDER, export_id)
        os.makedirs(export_dir, exist_ok=True)

        # 转换格式并保存
        exported_count = 0
        for frame_index in frame_indices:
            frame_path = frame_manager.get_frame_path(video_id, frame_index, thumbnail=False)

            if not frame_path:
                continue

            # 读取帧
            if export_format == 'png':
                # 转换为PNG
                img = Image.open(frame_path)
                output_filename = f'frame_{exported_count:04d}.png'
                output_path = os.path.join(export_dir, output_filename)
                img.save(output_path, 'PNG')
            else:
                # 保持JPEG或重新编码
                if frame_path.endswith('.jpg') or frame_path.endswith('.jpeg'):
                    # 重新编码以应用质量设置
                    img = Image.open(frame_path)
                    output_filename = f'frame_{exported_count:04d}.jpg'
                    output_path = os.path.join(export_dir, output_filename)
                    img.save(output_path, 'JPEG', quality=quality)
                else:
                    # 从其他格式转换
                    img = Image.open(frame_path)
                    output_filename = f'frame_{exported_count:04d}.jpg'
                    output_path = os.path.join(export_dir, output_filename)
                    img.save(output_path, 'JPEG', quality=quality)

            exported_count += 1

        if exported_count == 0:
            # 清理空目录
            shutil.rmtree(export_dir)
            return jsonify({'error': 'No frames were exported'}), 400

        # 打包成ZIP
        zip_filename = f'frames_{export_id}.zip'
        zip_path = os.path.join(config.EXPORT_FOLDER, zip_filename)

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for filename in os.listdir(export_dir):
                file_path = os.path.join(export_dir, filename)
                zipf.write(file_path, filename)

        # 清理临时文件
        shutil.rmtree(export_dir)

        return jsonify({
            'export_id': export_id,
            'file_count': exported_count,
            'download_url': f'/api/exports/{export_id}/download',
            'format': export_format
        }), 200

    except Exception as e:
        # 清理可能创建的文件
        if 'export_dir' in locals() and os.path.exists(export_dir):
            shutil.rmtree(export_dir, ignore_errors=True)

        return jsonify({'error': f'Export failed: {str(e)}'}), 500


@export_bp.route('/exports/<export_id>/download', methods=['GET'])
def download_export(export_id):
    """
    下载导出的ZIP文件

    Args:
        export_id: 导出唯一标识

    Returns:
        ZIP文件
    """
    try:
        zip_filename = f'frames_{export_id}.zip'
        zip_path = os.path.join(config.EXPORT_FOLDER, zip_filename)

        if not os.path.exists(zip_path):
            return jsonify({'error': 'Export not found or expired'}), 404

        return send_file(
            zip_path,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'video_frames_{export_id[:8]}.zip'
        )

    except Exception as e:
        return jsonify({'error': f'Download failed: {str(e)}'}), 500


@export_bp.route('/exports/<export_id>', methods=['DELETE'])
def delete_export(export_id):
    """
    删除导出文件

    Args:
        export_id: 导出唯一标识

    Returns:
        JSON响应
    """
    try:
        zip_filename = f'frames_{export_id}.zip'
        zip_path = os.path.join(config.EXPORT_FOLDER, zip_filename)

        if os.path.exists(zip_path):
            os.remove(zip_path)

        return jsonify({'message': 'Export deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': f'Delete failed: {str(e)}'}), 500
