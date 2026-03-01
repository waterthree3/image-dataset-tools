import { useState } from 'react';
import VideoUploader from './components/VideoUploader';
import VideoTimeline from './components/VideoTimeline';
import ImageBatchProcessor from './components/ImageBatchProcessor';
import './styles/App.css';

/**
 * 主应用组件 — 包含"视频拆解"和"图片处理"两个功能标签页
 */
function App() {
  const [activeTab, setActiveTab] = useState('video'); // 'video' | 'image'
  const [videoData, setVideoData] = useState(null);    // 上传完成后的视频信息

  const handleUploadComplete = (data) => {
    setVideoData(data);
  };

  const handleReset = () => {
    setVideoData(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎬 视频/图片处理工具</h1>
        <p>视频帧提取 · 图片批量裁切缩放</p>

        <nav className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            视频拆解
          </button>
          <button
            className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            图片处理
          </button>
        </nav>
      </header>

      <main className="app-main">

        {/* ── 视频标签页 ──────────────────────────────────────── */}
        {activeTab === 'video' && (
          <>
            {!videoData ? (
              <section className="upload-section">
                <VideoUploader onUploadComplete={handleUploadComplete} />
                <div className="empty-state">
                  <p>👆 上传视频后，通过时间轴拖动截取任意帧</p>
                </div>
              </section>
            ) : (
              <section className="timeline-section">
                <VideoTimeline videoData={videoData} onReset={handleReset} />
              </section>
            )}
          </>
        )}

        {/* ── 图片标签页 ──────────────────────────────────────── */}
        {activeTab === 'image' && (
          <ImageBatchProcessor />
        )}
      </main>

      <footer className="app-footer">
        {activeTab === 'video'
          ? '使用提示：上传视频 → 拖动时间轴 → 添加此帧 → 导出下载'
          : '使用提示：选择文件夹 → 选中图片 → 配置处理方式 → 处理并下载 ZIP'}
      </footer>
    </div>
  );
}

export default App;
