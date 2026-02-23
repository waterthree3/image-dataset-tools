# 视频 / 图片处理工具

一个功能完整的 Web 应用，包含**视频帧提取**和**图片批量裁切缩放**两大功能模块。

## 功能特性

### 视频拆解
- 📹 **视频上传**：支持 MP4, AVI, MOV, MKV 格式，最大 500MB
- 🎞️ **帧提取**：自定义提取帧率（0.1 FPS ~ 视频原始帧率），精确控制提取密度
- 🖼️ **可视化浏览**：网格视图展示所有帧，支持缩略图懒加载
- ✅ **灵活选择**：单选、多选、全选帧
- 💾 **格式导出**：支持 PNG 和 JPEG 格式，可调节 JPEG 质量
- 📝 **智能命名**：自动使用视频文件名或自定义前缀，多视频处理无需手动改名
- 📦 **批量下载**：自动打包成 ZIP 文件下载

### 图片批量处理
- 📁 **批量导入**：支持选择整个文件夹或单独选取图片（JPG/PNG/BMP/WebP/GIF/TIFF）
- 🔄 **三种处理模式**：
  - **缩放**：保持宽高比缩放，限制最大宽度/高度
  - **裁切**：裁切到目标宽高比，可手动调整保留区域（左右/上下滑块控制）
  - **填黑边**：填充黑边到目标宽高比，支持 3×3 对齐网格控制图片位置
- 🎯 **按组配置**：同一批次内可对不同图片分别设置不同处理参数
- 👁️ **实时预览**：选中图片后点击「预览效果」，对比查看原图与处理结果
- 📐 **宽高比预设**：内置 1:1 / 4:3 / 3:2 / 16:9 / 21:9 / 9:16 / 2:3 / 3:4，也支持自定义
- 📦 **ZIP 打包下载**：所有处理结果打包下载，支持 JPEG（可调质量）和 PNG 输出

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
├── backend/                        # Python Flask 后端
│   ├── app.py                     # Flask 应用主入口
│   ├── config.py                  # 配置文件
│   ├── requirements.txt           # Python 依赖
│   ├── api/
│   │   ├── upload.py              # 视频上传 API
│   │   ├── frame.py               # 视频帧 API
│   │   ├── export.py              # 视频帧导出 API
│   │   └── image_processor.py    # 图片批处理 API
│   ├── services/
│   │   ├── video_processor.py    # 视频处理逻辑
│   │   └── image_batch_service.py # 图片批处理逻辑
│   └── storage/                   # 存储目录（自动创建）
│       ├── uploads/               # 上传的视频
│       ├── frames/                # 提取的视频帧
│       ├── exports/               # 视频帧导出 ZIP
│       ├── image_batches/         # 上传的图片批次
│       └── image_exports/         # 图片处理导出 ZIP
├── frontend/                       # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoUploader.jsx  # 视频上传 & 帧提取
│   │   │   ├── FrameViewer.jsx    # 视频帧浏览
│   │   │   ├── ExportPanel.jsx    # 视频帧导出
│   │   │   ├── ImageBatchProcessor.jsx  # 图片批处理主组件
│   │   │   └── ImageProcessSettings.jsx # 图片处理设置面板
│   │   ├── services/api.js        # API 调用封装
│   │   ├── hooks/                 # 自定义 Hooks
│   │   └── styles/App.css         # 全局样式
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

打开浏览器访问 http://localhost:5173，顶部 Tab 切换两个功能模块：

**视频拆解：**
1. 上传视频文件（支持拖放）
2. 选择提取帧率（快捷选项：0.5/1/2/5 FPS 或最大帧率）
3. 等待视频帧提取完成
4. 在网格视图中浏览和选择需要的帧
5. 自定义文件命名前缀（默认使用视频文件名）
6. 选择导出格式（PNG/JPEG）和质量，点击"导出并下载"获取 ZIP

**图片处理：**
1. 点击「选择文件夹」或「选择图片」导入图片
2. 在图片网格中点击选择要处理的图片
3. 在右侧面板选择处理模式（缩放 / 裁切 / 填黑边）并配置参数
4. 点击「预览效果」查看处理结果，满意后点击「应用到已选」
5. 对不同图片重复步骤 2–4，为每组图片配置不同参数
6. 选择导出格式，点击「处理并下载 ZIP」

## API 端点

### 图片批处理 API

```
POST /api/images/batch/create
Response: { "batch_id": "uuid" }

POST /api/images/batch/{batch_id}/upload
Content-Type: multipart/form-data
Body: images (multiple files)

POST /api/images/batch/{batch_id}/image/{image_id}/preview
Body: {
  "mode": "scale" | "crop" | "pad",
  "max_width": 1920, "max_height": 1080,   // scale
  "ratio_w": 16, "ratio_h": 9,             // crop / pad
  "anchor_x": 0.5, "anchor_y": 0.5,       // 0–1, default 0.5 = center
  "output_width": null, "output_height": null
}
Response: image/jpeg

POST /api/images/batch/{batch_id}/process
Body: {
  "image_settings": [ { ...同上... } ],
  "format": "jpeg" | "png",
  "quality": 85
}
Response: { "export_id": "uuid", "processed_count": 42 }

GET /api/images/exports/{export_id}/download
Response: application/zip
```

### 视频 API

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
Body: { "fps": 1 }  // 支持 0.1 ~ 视频原始帧率

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
  "quality": 85,
  "prefix": "my_video"  // 可选，自定义文件名前缀
}

Response: {
  "export_id": "uuid",
  "file_count": 3,
  "download_url": "/api/exports/{export_id}/download",
  "zip_filename": "my_video_frames.zip"
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
- `MAX_VIDEO_SIZE`: 最大视频文件大小（默认 500MB）
- `ALLOWED_EXTENSIONS`: 允许的视频格式
- `DEFAULT_FPS`: 默认提取帧率（默认每秒1帧）
- `THUMBNAIL_SIZE`: 缩略图尺寸（默认 160×90）
- `FRAME_QUALITY`: 帧图像质量（默认 85）
- `ALLOWED_IMAGE_EXTENSIONS`: 图片批处理支持格式（JPG/PNG/BMP/WebP/GIF/TIFF）

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
A: 上传视频后，在帧率选择界面中自定义 FPS 值（0.1 ~ 视频原始帧率），或使用快捷按钮。

### Q: 导出的文件名可以自定义吗？
A: 可以。导出时默认使用视频文件名作为前缀，你也可以在导出面板中修改为任意自定义名称。导出的图片格式为 `{前缀}_0001.jpg`。

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

### 2026-02-23 - 图片批处理：预览与手动裁切位置

**新增功能:**
- 实时预览 — 选中图片后点击「预览效果」，弹出对比面板查看原图与处理结果，无需等待全部处理完成
- 裁切位置滑块 — 裁切模式新增水平/垂直位置滑块，可手动控制保留图片的哪个区域（左/中/右、上/中/下），替代固定居中裁切
- 填黑边对齐网格 — 填黑边模式新增 3×3 对齐网格，点击任意方位（左上/正上/右上等9个位置）控制图片在画布中的位置

**改进:**
- 裁切和填黑边的 `anchor_x` / `anchor_y` 参数贯穿前后端，应用到最终 ZIP 导出

**受影响文件:**
- `backend/services/image_batch_service.py` — 裁切/填黑边支持 anchor 参数，新增 `preview_image` 方法
- `backend/api/image_processor.py` — 新增 `/preview` 端点
- `frontend/src/components/ImageProcessSettings.jsx` — 裁切滑块、填黑边对齐网格，`forwardRef` + `useImperativeHandle` 暴露当前设置
- `frontend/src/components/ImageBatchProcessor.jsx` — 预览按钮与预览弹窗
- `frontend/src/services/api.js` — 新增 `previewImage` 方法
- `frontend/src/styles/App.css` — 新增滑块、对齐网格、预览弹窗样式

---

### 2026-02-23 - 图片批量处理功能

**新增功能:**
- 新增「图片处理」标签页，与「视频拆解」并列
- 支持整个文件夹或单独图片的批量导入（分块上传，每次 10 张）
- 三种处理模式：缩放（保持宽高比）、裁切（去除多余边缘）、填黑边（补齐目标比例）
- 8 种常用宽高比预设 + 自定义宽高比输入
- 可选输出尺寸（裁切/填黑边模式）
- 每张或每组图片独立配置处理参数
- 图片网格展示：缩略图 + 尺寸标注 + 已配置的设置徽标
- 导出格式：JPEG（可调质量 1–100）或 PNG，下载为 ZIP

**受影响文件:**
- `backend/services/image_batch_service.py` — 新建
- `backend/api/image_processor.py` — 新建
- `backend/config.py` — 新增图片存储路径
- `backend/app.py` — 注册图片蓝图
- `frontend/src/components/ImageBatchProcessor.jsx` — 新建
- `frontend/src/components/ImageProcessSettings.jsx` — 新建
- `frontend/src/services/api.js` — 新增图片批处理 API 方法
- `frontend/src/App.jsx` — 标签页导航
- `frontend/src/styles/App.css` — 新增图片处理样式

---

### 2026-02-11 - 自定义帧率和智能命名

**新增功能:**
- 自定义帧率提取 - 上传视频后可选择 0.1 ~ 视频原始帧率的任意帧率
- 快捷帧率选项 - 提供 0.5/1/2/5 FPS 及最大帧率快捷按钮
- 实时预估 - 显示根据选择的帧率预计提取的帧数
- 智能文件命名 - 自动使用视频文件名作为导出前缀
- 自定义命名 - 支持手动修改导出文件的命名前缀
- 文件名预览 - 实时预览导出后的文件命名格式

**改进:**
- 前端：视频上传后展示帧率选择界面，而非立即提取
- 前端：导出面板新增命名配置选项，支持切换和编辑
- 后端：export API 支持 prefix 参数
- 后端：自动清理文件名中的不安全字符
- 后端：ZIP 文件名使用自定义前缀，便于区分不同视频

**受影响文件:**
- `frontend/src/components/VideoUploader.jsx` - 帧率选择界面
- `frontend/src/components/ExportPanel.jsx` - 命名配置功能
- `frontend/src/services/api.js` - API 更新支持 prefix
- `frontend/src/styles/App.css` - 新增界面样式
- `backend/api/export.py` - 文件命名逻辑

---

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
