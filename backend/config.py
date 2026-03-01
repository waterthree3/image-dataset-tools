import os

# 基础路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, 'storage')

# 存储配置
UPLOAD_FOLDER = os.path.join(STORAGE_DIR, 'uploads')
FRAME_FOLDER = os.path.join(STORAGE_DIR, 'frames')
EXPORT_FOLDER = os.path.join(STORAGE_DIR, 'exports')

# 文件限制
MAX_VIDEO_SIZE = None  # 无限制（None = 不设置 Flask MAX_CONTENT_LENGTH）
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

# 帧处理配置
DEFAULT_FPS = 1  # 默认每秒提取1帧
THUMBNAIL_SIZE = (160, 90)  # 缩略图尺寸
THUMBNAIL_QUALITY = 75  # 缩略图JPEG质量
FRAME_QUALITY = 85  # 帧图像JPEG质量

# 缓存配置
FRAME_CACHE_SIZE = 100  # 内存中缓存的帧数
FRAME_CLEANUP_HOURS = 24  # 临时帧保留时间（小时）

# API配置
API_PREFIX = '/api'

# Image batch processing paths
IMAGE_BATCH_FOLDER = os.path.join(STORAGE_DIR, 'image_batches')
IMAGE_EXPORT_FOLDER = os.path.join(STORAGE_DIR, 'image_exports')

# Allowed image extensions for batch processing
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'bmp', 'webp', 'tiff', 'tif', 'gif'}

# 确保存储目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(FRAME_FOLDER, exist_ok=True)
os.makedirs(EXPORT_FOLDER, exist_ok=True)
os.makedirs(IMAGE_BATCH_FOLDER, exist_ok=True)
os.makedirs(IMAGE_EXPORT_FOLDER, exist_ok=True)
