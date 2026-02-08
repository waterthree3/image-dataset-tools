# 视频拆解器 (Video Frame Extractor)

一个功能完整的Web应用，用于将视频文件拆解成单独的帧图像，支持可视化浏览和选择性导出。

## 功能特性

- 📹 **视频上传**：支持 MP4, AVI, MOV, MKV 格式，最大 500MB
- 🎞️ **帧提取**：自动提取视频帧（默认每秒1帧）
- 🖼️ **可视化浏览**：网格视图展示所有帧，支持缩略图懒加载
- ✅ **灵活选择**：单选、多选、全选帧
- 💾 **格式导出**：支持 PNG 和 JPEG 格式，可调节 JPEG 质量
- 📦 **批量下载**：自动打包成 ZIP 文件下载

## 技术栈

### 后端
- Python 3.x
- Flask 3.0 - Web框架
- OpenCV 4.9 - 视频处理
- Pillow 10.2 - 图像处理

### 前端
- React 18.2
- Vite 5.0 - 构建工具
- Axios - HTTP客户端
- 原生CSS - 样式

## 项目结构

```
video_split/
├── backend/                 # Python Flask后端
│   ├── app.py              # Flask应用主入口
│   ├── config.py           # 配置文件
│   ├── requirements.txt    # Python依赖
│   ├── api/                # API路由
│   ├── services/           # 业务逻辑
│   └── storage/            # 存储目录
├── frontend/                # React前端
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── services/       # API调用
│   │   ├── hooks/          # 自定义Hooks
│   │   └── styles/         # 样式文件
│   └── package.json
└── README.md
```

## 快速开始

### 1. 安装依赖

#### 后端依赖
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

#### 前端依赖
```bash
cd frontend
npm install
```

### 2. 启动应用

#### 启动后端服务器
```bash
cd backend
venv\Scripts\activate       # Windows
python app.py
```
后端运行在: http://localhost:5000

#### 启动前端开发服务器
```bash
cd frontend
npm run dev
```
前端运行在: http://localhost:5173

### 3. 使用应用

1. 打开浏览器访问 http://localhost:5173
2. 上传视频文件（支持拖放）
3. 等待视频帧自动提取
4. 在网格视图中浏览和选择需要的帧
5. 选择导出格式（PNG/JPEG）
6. 点击"导出并下载"获取ZIP文件

## API 端点

### 上传视频
```
POST /api/upload
Content-Type: multipart/form-data
Body: video (file)

Response: {
  "video_id": "uuid",
  "filename": "video.mp4",
  "duration": 120.5,
  "total_frames": 3600,
  "fps": 30
}
```

### 提取帧
```
POST /api/videos/{video_id}/extract
Body: { "fps": 1 }

Response: {
  "video_id": "uuid",
  "total_frames": 120,
  "status": "completed"
}
```

### 获取帧列表
```
GET /api/videos/{video_id}/frames?page=1&limit=50

Response: {
  "frames": [...],
  "total": 120,
  "page": 1,
  "limit": 50
}
```

### 获取单帧图像
```
GET /api/videos/{video_id}/frames/{frame_index}?thumbnail=true

Response: image/jpeg
```

### 导出帧
```
POST /api/videos/{video_id}/export
Body: {
  "frames": [0, 1, 2],
  "format": "jpeg",
  "quality": 85
}

Response: {
  "export_id": "uuid",
  "file_count": 3,
  "download_url": "/api/exports/{export_id}/download"
}
```

### 下载导出文件
```
GET /api/exports/{export_id}/download

Response: application/zip
```

## 配置说明

### backend/config.py

主要配置项：
- `MAX_VIDEO_SIZE`: 最大视频文件大小 (默认 500MB)
- `ALLOWED_EXTENSIONS`: 允许的视频格式
- `DEFAULT_FPS`: 默认提取帧率 (默认每秒1帧)
- `THUMBNAIL_SIZE`: 缩略图尺寸 (默认 160x90)
- `FRAME_QUALITY`: 帧图像质量 (默认 85)

## 性能优化

### 后端优化
- **流式处理**: OpenCV逐帧读取，避免内存溢出
- **缩略图生成**: 列表使用小尺寸缩略图，加快加载
- **垃圾回收**: 每100帧执行一次内存清理
- **HTTP缓存**: 设置缓存头减少重复请求

### 前端优化
- **懒加载**: 使用 Intersection Observer 实现图像懒加载
- **Set数据结构**: O(1)时间复杂度的选择状态查询
- **代理配置**: Vite开发服务器代理API请求

## 常见问题

### Q: 支持哪些视频格式？
A: 支持 MP4 (H.264), AVI, MOV, MKV 格式。

### Q: 视频文件大小限制是多少？
A: 默认最大 500MB，可在 config.py 中修改。

### Q: 提取所有帧需要多长时间？
A: 取决于视频时长和分辨率。默认每秒提取1帧，一个10分钟的视频大约需要1-2分钟。

### Q: 导出的图像保存在哪里？
A: 后端临时存储在 backend/storage/exports/，下载后会自动清理。

### Q: 如何提取更多或更少的帧？
A: 可以在提取接口的 fps 参数中指定，或修改 config.py 中的 DEFAULT_FPS。

## 开发说明

### 添加新功能

1. 后端添加新API：在 `backend/api/` 下创建新的蓝图
2. 前端添加新组件：在 `frontend/src/components/` 下创建新组件
3. 更新API服务：在 `frontend/src/services/api.js` 中添加新方法

### 调试

- 后端日志：Flask自带日志输出到控制台
- 前端调试：使用浏览器开发者工具
- API测试：使用 Postman 或 curl 测试端点

## 生产部署

### 后端部署
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### 前端部署
```bash
npm run build
# 将 dist/ 目录部署到静态文件服务器（Nginx, Apache等）
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### 2026-02-08 - 视频编码兼容性修复

**修复的问题:**
- 修复了批处理文件中文乱码导致的执行错误
- 解决了 FFmpeg swscaler 参数错误导致的黑屏问题
- 改进了视频编码兼容性检测和诊断

**新增功能:**
- 添加视频修复工具 `fix_video.py` - 用于重新编码有问题的视频
- 添加便捷批处理脚本 `fix_video.bat`
- 添加视频修复指南 `VIDEO_FIX_GUIDE.md`

**改进:**
- 所有批处理文件（`debug_video.bat`, `fix_video.bat`）改为纯英文，避免编码问题
- `debug_video.py` 国际化，移除中文输出
- 增强错误诊断：检测到黑屏帧时自动提示解决方案
- 改进视频处理器错误提示，指导用户使用修复工具

**技术细节:**
- 视频修复使用 libx264 编码器和 yuv420p 像素格式确保最大兼容性
- CRF 18 质量设置保证视觉无损
- 添加 `CAP_PROP_CONVERT_RGB` 属性帮助处理问题视频

**受影响文件:**
- `debug_video.bat` - 移除中文，改为英文
- `backend/debug_video.py` - 国际化更新
- `backend/services/video_processor.py` - 增强错误处理
- `backend/fix_video.py` - 新增视频修复工具
- `fix_video.bat` - 新增批处理脚本
- `VIDEO_FIX_GUIDE.md` - 新增修复指南文档

---

## 作者

开发于 2026年2月
