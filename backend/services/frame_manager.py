import os
import json
import shutil
from datetime import datetime


class FrameManager:
    """帧数据管理类，负责帧元数据的存储和查询"""

    def __init__(self, base_dir):
        """
        初始化帧管理器

        Args:
            base_dir: 帧数据基础目录
        """
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)

    def save_metadata(self, video_id, metadata):
        """
        保存视频帧元数据

        Args:
            video_id: 视频唯一标识
            metadata: 元数据字典
        """
        video_dir = os.path.join(self.base_dir, video_id)
        os.makedirs(video_dir, exist_ok=True)

        metadata_file = os.path.join(video_dir, 'metadata.json')

        # 添加时间戳
        metadata['created_at'] = datetime.now().isoformat()
        metadata['video_id'] = video_id

        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)

    def get_metadata(self, video_id):
        """
        获取视频帧元数据

        Args:
            video_id: 视频唯一标识

        Returns:
            dict: 元数据字典，不存在返回None
        """
        metadata_file = os.path.join(self.base_dir, video_id, 'metadata.json')

        if not os.path.exists(metadata_file):
            return None

        with open(metadata_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def get_frame_list(self, video_id, page=1, limit=50):
        """
        分页获取帧列表

        Args:
            video_id: 视频唯一标识
            page: 页码（从1开始）
            limit: 每页数量

        Returns:
            dict: 包含帧列表和分页信息
        """
        metadata = self.get_metadata(video_id)
        if not metadata:
            return None

        frames = metadata.get('frames', [])
        total = len(frames)

        # 计算分页
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        page_frames = frames[start_idx:end_idx]

        return {
            'frames': page_frames,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit
        }

    def get_frame_path(self, video_id, frame_index, thumbnail=False):
        """
        获取帧文件路径

        Args:
            video_id: 视频唯一标识
            frame_index: 帧索引
            thumbnail: 是否获取缩略图路径

        Returns:
            str: 文件路径，不存在返回None
        """
        metadata = self.get_metadata(video_id)
        if not metadata:
            return None

        frames = metadata.get('frames', [])
        if frame_index >= len(frames):
            return None

        frame_info = frames[frame_index]
        video_dir = os.path.join(self.base_dir, video_id)

        if thumbnail:
            filename = frame_info['thumbnail']
            file_path = os.path.join(video_dir, 'thumbnails', filename)
        else:
            filename = frame_info['filename']
            file_path = os.path.join(video_dir, filename)

        if os.path.exists(file_path):
            return file_path
        return None

    def delete_video_frames(self, video_id):
        """
        删除视频的所有帧数据

        Args:
            video_id: 视频唯一标识

        Returns:
            bool: 删除是否成功
        """
        video_dir = os.path.join(self.base_dir, video_id)

        if os.path.exists(video_dir):
            try:
                shutil.rmtree(video_dir)
                return True
            except Exception as e:
                print(f"Error deleting frames for video {video_id}: {e}")
                return False
        return False

    def get_all_videos(self):
        """
        获取所有视频列表

        Returns:
            list: 视频信息列表
        """
        videos = []

        for video_id in os.listdir(self.base_dir):
            video_dir = os.path.join(self.base_dir, video_id)
            if not os.path.isdir(video_dir):
                continue

            metadata = self.get_metadata(video_id)
            if metadata:
                videos.append({
                    'video_id': video_id,
                    'filename': metadata.get('filename', 'unknown'),
                    'total_frames': metadata.get('total_extracted', 0),
                    'created_at': metadata.get('created_at')
                })

        # 按创建时间排序
        videos.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return videos
