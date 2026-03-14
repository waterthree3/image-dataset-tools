# 视频 / 图片处理工具

一个功能完整的 Web 应用，包含**视频帧提取**和**图片批量裁切缩放**两大功能模块。支持中英文界面切换。

## 功能特性

### 视频拆解
- 📹 **视频上传**：支持 MP4, AVI, MOV, MKV 格式，**无文件大小限制**
- 📁 **文件夹批量模式**：选择整个文件夹，逐个进入视频时间轴操作，已选帧自动暂存，切换视频不丢失
- 🎛️ **时间轴截帧**：拖动滑块实时预览任意时间点的画面，精确到毫秒
- ⌨️ **键盘快捷键**：按住 `A` 逐帧后退，按住 `D` 逐帧前进；单次按下跳一帧，持续按住连续步进
- ⏩ **快速导航**：±10 秒跳转按钮 + 逐帧步进按钮
- 🖼️ **帧选取列表**：可添加多个时间点，自动按时序排列，支持点击跳转、移除
- 💾 **格式导出**：支持 PNG 和 JPEG 格式，可调节 JPEG 质量（全分辨率导出）
- 📝 **智能命名**：自动使用视频文件名作为前缀，支持自定义
- 📦 **批量下载**：自动打包成 ZIP 文件下载
- 🤖 **AI 智能拆解**：接入大模型 API，自动对视频采样并根据自然语言需求筛选关键帧

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

### 通用
- 🌐 **中英文切换**：顶部导航栏一键切换，所有 UI 文字同步翻译

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
│   │   ├── frame.py               # 视频帧 API（含时间轴取帧）
│   │   ├── export.py              # 视频帧导出 API
│   │   ├── image_processor.py    # 图片批处理 API
│   │   └── ai_analyzer.py        # AI 大模型视频分析 API
│   ├── services/
│   │   ├── video_processor.py    # 视频处理逻辑
│   │   └── image_batch_service.py # 图片批处理逻辑
│   └── storage/                   # 存储目录（自动创建）
│       ├── uploads/               # 上传的视频
│       ├── frames/                # 提取的视频帧缓存
│       ├── exports/               # 视频帧导出 ZIP
│       ├── image_batches/         # 上传的图片批次
│       └── image_exports/         # 图片处理导出 ZIP
├── frontend/                       # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoUploader.jsx      # 视频上传组件
│   │   │   ├── VideoTimeline.jsx      # 时间轴截帧 + AI 拆解面板
│   │   │   ├── VideoFolderList.jsx    # 文件夹多视频列表
│   │   │   ├── ImageBatchProcessor.jsx    # 图片批处理主组件
│   │   │   └── ImageProcessSettings.jsx   # 图片处理设置面板
│   │   ├── LangContext.jsx        # 中英文切换 Context
│   │   ├── services/api.js        # API 调用封装
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

**视频拆解（单个视频）：**
1. 上传视频文件（支持拖放，无大小限制）
2. 拖动时间轴滑块或按住 `A`/`D` 键逐帧导航，预览画面实时刷新
3. 找到目标画面后点击「+ 添加此帧」，可添加多个时间点
4. 在导出面板中选择格式（PNG/JPEG）、质量、文件名前缀
5. 点击「导出并下载 ZIP」获取全分辨率帧图像

**视频拆解（文件夹批量模式）：**
1. 在首页点击「选择文件夹」，选取包含视频的目录
2. 卡片列表显示目录内所有视频，已选帧数量以绿色角标展示
3. 点击任意视频进入时间轴操作，点击「← 返回列表」保存当前选帧并切换下一个视频
4. 所有视频操作完毕后，分别进入每个视频导出 ZIP

**AI 智能拆解：**
1. 在视频时间轴界面，展开底部「🤖 AI 智能拆解」面板
2. 选择 API 接口（OpenAI / Anthropic / 自定义），填写 API Key 和模型
3. 在「拆解需求」文本框描述想要提取的画面（支持从 `.md`/`.txt` 文件导入需求）
4. 设置采样间隔（建议 5–10 秒），点击「开始 AI 分析」
5. 分析完成后，查看 AI 推荐的帧列表（含缩略图和原因说明），单帧点击「+」或批量「全部添加」

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

#### 上传视频
```
POST /api/upload
Content-Type: multipart/form-data
Body: video (file)

Response: {
  "video_id": "uuid",
  "filename": "video.mp4",
  "duration": 120.5,
  "duration_formatted": "2:00.500",
  "total_frames": 3600,
  "fps": 30,
  "width": 1920,
  "height": 1080
}
```

#### 时间轴预览取帧
```
GET /api/videos/{video_id}/frame_at?time=12.345

Response: image/jpeg（960px 宽度预览，无需预先提取）
```

#### 按时间戳导出帧
```
POST /api/videos/{video_id}/export_at
Body: {
  "timestamps": [1.0, 5.5, 12.3],   // 时间点列表（秒）
  "format": "jpeg",                   // "jpeg" | "png"
  "quality": 85,                      // JPEG 质量 1–100
  "prefix": "my_video"                // 可选，自定义文件名前缀
}

Response: {
  "export_id": "uuid",
  "file_count": 3,
  "download_url": "/api/exports/{export_id}/download",
  "format": "jpeg"
}
```

#### 下载导出文件
```
GET /api/exports/{export_id}/download

Response: application/zip
```

### AI 视频分析 API

```
POST /api/videos/{video_id}/ai_analyze
Body: {
  "api_key":         "sk-...",
  "model":           "gpt-4o",
  "base_url":        "https://api.openai.com/v1",  // OpenAI 兼容接口
  "api_format":      "openai" | "anthropic",
  "requirements":    "找出所有包含人物特写的镜头",
  "sample_interval": 5   // 采样间隔（秒），最小 1
}

Response: {
  "selected_frames": [
    { "time": 12.5, "reason": "Close-up of a person's face" }
  ],
  "total_sampled": 48,
  "model": "gpt-4o"
}
```

- 支持 OpenAI 兼容接口（GPT-4o、Qwen-VL 等）和 Anthropic 原生接口（Claude 系列）
- 超长视频自动分批（每批 20 帧）调用，结果去重并按时间排序
- 超时设置 10 分钟，适合长视频分析

## 配置说明

### backend/config.py

主要配置项：
- `MAX_VIDEO_SIZE`: 最大视频文件大小（`None` = 不限制，默认无限制）
- `ALLOWED_EXTENSIONS`: 允许的视频格式
- `THUMBNAIL_SIZE`: 缩略图尺寸（默认 160×90）
- `FRAME_QUALITY`: 帧图像质量（默认 85）
- `ALLOWED_IMAGE_EXTENSIONS`: 图片批处理支持格式（JPG/PNG/BMP/WebP/GIF/TIFF）

## 性能优化

### 后端优化
- **按需取帧**: 时间轴模式无需预先批量提取，按请求实时解码
- **预览缩放**: 预览帧缩放至 960px 宽，降低传输量；导出时使用全分辨率
- **HTTP缓存**: 静态帧设置缓存头，预览帧禁用缓存确保实时性

### 前端优化
- **fetch + ObjectURL**: 预览使用 `fetch()` 获取 Blob 再转 ObjectURL，避免 `<img src>` 并发请求堆积问题
- **请求队列**: 持续按键时只保留最新待取帧，上一请求完成后立即取最新帧，不堆积并行请求
- **防抖60ms**: 滑块拖动时合并高频事件，避免短时间内发出过多请求
- **内存管理**: 每次更新前 `revokeObjectURL` 释放旧 Blob，防止内存泄漏

## 常见问题

### Q: 支持哪些视频格式？
A: 支持 MP4 (H.264), AVI, MOV, MKV 格式。

### Q: 视频文件大小限制是多少？
A: 无限制。可在 `config.py` 中通过 `MAX_VIDEO_SIZE` 按需设置上限（单位字节）。

### Q: 预览帧和导出帧的分辨率一样吗？
A: 不一样。预览帧缩放至最大 960px 宽以加快响应；导出帧使用视频原始全分辨率。

### Q: 导出的图像保存在哪里？
A: 后端临时存储在 `backend/storage/exports/`，下载后可手动清理。

### Q: 导出的文件名可以自定义吗？
A: 可以。导出时默认使用视频文件名作为前缀，可在导出面板中修改。导出的图片格式为 `{前缀}_0001.jpg`。

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

## 仓库地址

GitHub: https://github.com/waterthree3/image-dataset-tools

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### 2026-03-14 - 中英文切换 + AI 智能拆解 + 文件夹批量视频模式

**新增功能:**
- **中英文界面切换** — 顶部导航栏新增 EN/中 切换按钮，所有 UI 文字（视频上传区、时间轴、图片处理设置、按钮提示等）一键同步翻译
- **AI 智能拆解面板** — 视频时间轴底部新增可折叠面板，支持 OpenAI 兼容（GPT-4o / Qwen-VL 等）和 Anthropic（Claude 系列）两种接口格式；自然语言描述需求，AI 自动采样视频帧并返回推荐帧列表（含缩略图 + 理由）；支持从 `.md`/`.txt` 文件导入需求，可单帧或批量添加到选取列表
- **文件夹批量视频模式** — 首页新增「选择文件夹」入口，展示目录内所有视频的卡片列表；点击视频自动上传并进入时间轴；点击「← 返回列表」自动保存当前已选帧；每个视频的帧选取独立暂存，切换视频时不丢失

**改进:**
- 图片批处理区域增加标题卡片（紫色渐变 Header），与 WebP/AVIF 转换区域风格统一
- 修复视频上传组件所有文案未跟随语言切换的问题

**受影响文件:**
- `frontend/src/LangContext.jsx` — 新建：React Context 提供 `lang` / `setLang` / `t(zh, en)` 给全局组件
- `frontend/src/components/VideoUploader.jsx` — 全面接入 i18n
- `frontend/src/components/VideoTimeline.jsx` — 接入 i18n；新增 AI 面板；支持 `initialFrames`/`onBack` props 用于文件夹模式帧暂存
- `frontend/src/components/VideoFolderList.jsx` — 新建：文件夹视频列表卡片网格组件
- `frontend/src/components/ImageBatchProcessor.jsx` — 增加标题卡片；接入 i18n
- `frontend/src/components/ImageProcessSettings.jsx` — 接入 i18n
- `frontend/src/App.jsx` — 新增文件夹模式状态管理；语言切换按钮
- `frontend/src/services/api.js` — 新增 `aiAnalyzeVideo()` 方法（10 分钟超时）
- `backend/api/ai_analyzer.py` — 新建：AI 分析蓝图，支持 OpenAI 兼容/Anthropic 双格式，按 20 帧分批调用
- `backend/app.py` — 注册 `ai_bp` 蓝图
- `backend/requirements.txt` — 新增 `requests>=2.31.0`
- `frontend/src/styles/App.css` — 新增语言切换按钮、AI 面板、文件夹列表、首页双卡片布局样式

---

### 2026-03-01 - 时间轴截帧模式 + 键盘快捷键 + 预览实时刷新

**新增功能:**
- **时间轴截帧**：将视频拆解从"设置帧率批量提取"改为"拖动时间轴截取任意帧"——上传后直接进入时间轴界面，拖动滑块实时预览任意时间点画面
- **键盘快捷键**：按住 `A` 逐帧后退，按住 `D` 逐帧前进；单次按下跳一帧，按住 350ms 后进入连续步进模式（~12fps）；在文本输入框中输入时自动屏蔽快捷键
- **±10s 快速跳转**：导航栏新增 ⏪10s / 10s⏩ 按钮
- **帧选取列表**：添加的帧按时序排列，点击缩略图可跳转到对应时间点
- **无文件大小限制**：移除 500MB 上传上限

**改进:**
- 预览使用 `fetch() + ObjectURL` 方案替代 `<img src>` 直接赋值，解决持续按键时因并发请求堆积导致画面不更新的问题
- 导出使用全分辨率帧（原视频尺寸），预览使用 960px 缩放图加快响应

**受影响文件:**
- `backend/config.py` — `MAX_VIDEO_SIZE = None`（无限制）
- `backend/app.py` — 条件设置 `MAX_CONTENT_LENGTH`
- `backend/api/frame.py` — 新增 `GET /videos/<id>/frame_at?time=<秒>` 端点
- `backend/api/export.py` — 新增 `POST /videos/<id>/export_at` 端点（按时间戳列表导出）
- `backend/services/video_processor.py` — 新增 `get_frame_at_time()` 静态方法
- `frontend/src/components/VideoUploader.jsx` — 简化：移除 FPS 选择步骤，无大小限制
- `frontend/src/components/VideoTimeline.jsx` — 新建：时间轴截帧主界面
- `frontend/src/App.jsx` — 上传后直接显示 VideoTimeline，移除旧 FrameViewer/ExportPanel 流程
- `frontend/src/services/api.js` — 新增 `exportFramesByTimestamps()` 方法
- `frontend/src/styles/App.css` — 新增时间轴相关样式

---

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

**受影响文件:**
- `frontend/src/components/VideoUploader.jsx` - 帧率选择界面
- `frontend/src/services/api.js` - API 更新支持 prefix
- `frontend/src/styles/App.css` - 新增界面样式
- `backend/api/export.py` - 文件命名逻辑

---

### 2026-02-08 - 视频编码兼容性修复

**修复的问题:**
- 修复了批处理文件中文乱码导致的执行错误
- 解决了 FFmpeg swscaler 参数错误导致的黑屏问题
- 改进了视频编码兼容性检测和诊断

**受影响文件:**
- `backend/services/video_processor.py` - 增强错误处理
- `backend/fix_video.py` - 新增视频修复工具

---

## 作者

开发于 2026年2月
