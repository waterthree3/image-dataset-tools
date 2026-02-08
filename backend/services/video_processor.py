import cv2
import os
import gc
from PIL import Image
import config


class VideoProcessor:
    """视频处理核心类，负责帧提取和视频信息获取"""

    @staticmethod
    def get_video_info(video_path):
        """
        获取视频元数据信息

        Args:
            video_path: 视频文件路径

        Returns:
            dict: 包含分辨率、帧率、时长、总帧数的字典
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        # 尝试使用 FFMPEG 后端
        cap = cv2.VideoCapture(video_path, cv2.CAP_FFMPEG)
        if not cap.isOpened():
            # 如果 FFMPEG 失败，尝试默认后端
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Cannot open video file: {video_path}")

        try:
            # 获取视频属性
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = frame_count / fps if fps > 0 else 0

            # 验证视频信息的有效性
            if fps <= 0 or frame_count <= 0 or width <= 0 or height <= 0:
                raise ValueError(f"Invalid video properties: fps={fps}, frames={frame_count}, size={width}x{height}")

            print(f"Video info retrieved: {width}x{height}, {fps:.2f} fps, {frame_count} frames, {duration:.2f}s")

            return {
                'fps': fps,
                'total_frames': frame_count,
                'width': width,
                'height': height,
                'duration': duration,
                'duration_formatted': f"{int(duration // 60)}:{int(duration % 60):02d}"
            }
        finally:
            cap.release()

    @staticmethod
    def extract_frames(video_path, output_dir, fps=None, progress_callback=None):
        """
        从视频中提取帧并保存为JPEG文件

        Args:
            video_path: 视频文件路径
            output_dir: 输出目录
            fps: 每秒提取帧数，None表示提取所有帧
            progress_callback: 进度回调函数，接收(current, total)参数

        Returns:
            dict: 包含提取的帧数和缩略图信息
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        thumbnail_dir = os.path.join(output_dir, 'thumbnails')
        os.makedirs(thumbnail_dir, exist_ok=True)

        # 使用 CAP_FFMPEG 后端并设置额外参数
        cap = cv2.VideoCapture(video_path, cv2.CAP_FFMPEG)

        # Try to set properties to help with problematic videos
        if cap.isOpened():
            # These properties can help with some decoding issues
            cap.set(cv2.CAP_PROP_CONVERT_RGB, 1)

        if not cap.isOpened():
            # 如果 FFMPEG 失败，尝试默认后端
            print("FFmpeg backend failed, trying default backend...")
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Cannot open video file: {video_path}. Video may be corrupted or have encoding issues. Try using fix_video.py to re-encode it.")

        try:
            video_fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            print(f"Video info: {width}x{height}, {video_fps} fps, {total_frames} frames")

            # 计算帧提取间隔
            if fps is None:
                frame_interval = 1  # 提取所有帧
            else:
                frame_interval = max(1, int(video_fps / fps))

            frame_count = 0
            saved_count = 0
            extracted_frames = []
            failed_frames = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # 按间隔提取帧
                if frame_count % frame_interval == 0:
                    # 验证帧数据有效性
                    if frame is None or frame.size == 0:
                        print(f"Warning: Frame {frame_count} is empty, skipping...")
                        failed_frames += 1
                        frame_count += 1
                        continue

                    # 检查帧是否全黑
                    if frame.mean() < 1.0:
                        print(f"Warning: Frame {frame_count} appears to be black (mean={frame.mean():.2f})")
                        # 继续保存，但记录警告

                    try:
                        # 保存全尺寸帧
                        frame_filename = f'frame_{saved_count:06d}.jpg'
                        frame_path = os.path.join(output_dir, frame_filename)
                        success = cv2.imwrite(frame_path, frame, [cv2.IMWRITE_JPEG_QUALITY, config.FRAME_QUALITY])

                        if not success:
                            print(f"Warning: Failed to save frame {frame_count}")
                            failed_frames += 1
                            frame_count += 1
                            continue

                        # 生成缩略图
                        thumbnail_filename = f'thumb_{saved_count:06d}.jpg'
                        thumbnail_path = os.path.join(thumbnail_dir, thumbnail_filename)
                        VideoProcessor._create_thumbnail(frame, thumbnail_path)

                        # 记录帧信息
                        extracted_frames.append({
                            'index': saved_count,
                            'frame_number': frame_count,
                            'timestamp': frame_count / video_fps,
                            'filename': frame_filename,
                            'thumbnail': thumbnail_filename
                        })

                        saved_count += 1

                        # 每处理100帧清理一次内存
                        if saved_count % 100 == 0:
                            gc.collect()
                            if progress_callback:
                                progress_callback(frame_count, total_frames)

                    except Exception as e:
                        print(f"Error processing frame {frame_count}: {str(e)}")
                        failed_frames += 1

                frame_count += 1

            # 最终进度回调
            if progress_callback:
                progress_callback(total_frames, total_frames)

            print(f"Extraction complete: {saved_count} frames saved, {failed_frames} frames failed")

            return {
                'total_extracted': saved_count,
                'frames': extracted_frames,
                'output_dir': output_dir,
                'failed_frames': failed_frames
            }

        finally:
            cap.release()
            gc.collect()

    @staticmethod
    def _create_thumbnail(frame, output_path):
        """
        创建帧的缩略图

        Args:
            frame: OpenCV图像帧
            output_path: 输出路径
        """
        try:
            # 验证帧数据
            if frame is None or frame.size == 0:
                raise ValueError("Invalid frame data")

            # 确保帧维度正确
            if len(frame.shape) != 3 or frame.shape[2] != 3:
                raise ValueError(f"Invalid frame shape: {frame.shape}")

            # OpenCV BGR转RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # 使用PIL创建缩略图
            img = Image.fromarray(frame_rgb)
            img.thumbnail(config.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
            img.save(output_path, 'JPEG', quality=config.THUMBNAIL_QUALITY)
        except Exception as e:
            print(f"Error creating thumbnail: {str(e)}")
            raise

    @staticmethod
    def get_frame_at_index(video_path, frame_index):
        """
        获取指定索引的帧

        Args:
            video_path: 视频文件路径
            frame_index: 帧索引

        Returns:
            numpy.ndarray: 帧图像数据
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        # 使用 FFMPEG 后端
        cap = cv2.VideoCapture(video_path, cv2.CAP_FFMPEG)
        if not cap.isOpened():
            # 如果 FFMPEG 失败，尝试默认后端
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Cannot open video file: {video_path}")

        try:
            # 设置帧位置
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            ret, frame = cap.read()

            if not ret or frame is None or frame.size == 0:
                raise ValueError(f"Cannot read frame at index {frame_index}")

            return frame

        finally:
            cap.release()
