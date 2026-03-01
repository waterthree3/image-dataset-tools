from flask import Flask, jsonify
from flask_cors import CORS
import config
from api.upload import upload_bp
from api.frame import frame_bp
from api.export import export_bp
from api.image_processor import image_bp

# 创建Flask应用
app = Flask(__name__)

# CORS配置 - 允许前端跨域访问
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# 配置（MAX_VIDEO_SIZE=None 表示不限制上传大小）
if config.MAX_VIDEO_SIZE is not None:
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_VIDEO_SIZE
app.config['UPLOAD_FOLDER'] = config.UPLOAD_FOLDER

# 注册蓝图
app.register_blueprint(upload_bp, url_prefix=config.API_PREFIX)
app.register_blueprint(frame_bp, url_prefix=config.API_PREFIX)
app.register_blueprint(export_bp, url_prefix=config.API_PREFIX)
app.register_blueprint(image_bp, url_prefix=config.API_PREFIX)


# 根路由
@app.route('/')
def index():
    """API根路径"""
    return jsonify({
        'name': 'Video Frame Extractor API',
        'version': '1.0.0',
        'endpoints': {
            'upload': f'{config.API_PREFIX}/upload',
            'videos': f'{config.API_PREFIX}/videos',
            'extract': f'{config.API_PREFIX}/videos/<video_id>/extract',
            'frames': f'{config.API_PREFIX}/videos/<video_id>/frames',
            'frame': f'{config.API_PREFIX}/videos/<video_id>/frames/<frame_index>',
            'export': f'{config.API_PREFIX}/videos/<video_id>/export',
            'download': f'{config.API_PREFIX}/exports/<export_id>/download'
        }
    })


# 错误处理
@app.errorhandler(413)
def file_too_large(e):
    """处理文件过大错误"""
    return jsonify({'error': 'File too large'}), 413


@app.errorhandler(404)
def not_found(e):
    """处理404错误"""
    return jsonify({'error': 'Resource not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    """处理500错误"""
    return jsonify({'error': 'Internal server error'}), 500


@app.errorhandler(Exception)
def handle_exception(e):
    """处理其他异常"""
    app.logger.error(f'Unhandled exception: {str(e)}')
    return jsonify({'error': 'An unexpected error occurred'}), 500


if __name__ == '__main__':
    print('=' * 60)
    print('视频拆解器 API 服务器')
    print('=' * 60)
    print(f'服务器地址: http://localhost:5000')
    print(f'API文档: http://localhost:5000/')
    size_str = f"{config.MAX_VIDEO_SIZE / (1024 * 1024):.0f}MB" if config.MAX_VIDEO_SIZE else "无限制"
    print(f'最大上传大小: {size_str}')
    print(f'支持格式: {", ".join(config.ALLOWED_EXTENSIONS)}')
    print('=' * 60)

    app.run(debug=True, host='0.0.0.0', port=5000)
