import { useState } from 'react';
import VideoUploader from './components/VideoUploader';
import VideoTimeline from './components/VideoTimeline';
import ImageBatchProcessor from './components/ImageBatchProcessor';
import { LangProvider, useLang } from './LangContext';
import './styles/App.css';

/**
 * Inner app — uses lang context already provided by the outer wrapper.
 */
function AppInner() {
  const { lang, setLang, t } = useLang();
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
        <h1>🎬 {t('视频/图片处理工具', 'Video/Image Processing Tool')}</h1>
        <p>{t('视频帧提取 · 图片批量裁切缩放', 'Video Frame Extraction · Batch Image Processing')}</p>

        <nav className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            {t('视频拆解', 'Video Split')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            {t('图片处理', 'Image Processing')}
          </button>

          {/* Language toggle */}
          <button
            className="lang-toggle-btn"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            title={lang === 'zh' ? 'Switch to English' : '切换为中文'}
          >
            {lang === 'zh' ? 'EN' : '中'}
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
                  <p>{t('👆 上传视频后，通过时间轴拖动截取任意帧', '👆 Upload a video, then drag the timeline to capture frames')}</p>
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
          ? t('使用提示：上传视频 → 拖动时间轴 → 添加此帧 → 导出下载',
              'Tip: Upload video → Drag timeline → Add frame → Export ZIP')
          : t('使用提示：选择文件夹 → 选中图片 → 配置处理方式 → 处理并下载 ZIP',
              'Tip: Select folder → Pick images → Configure → Process & Download ZIP')}
      </footer>
    </div>
  );
}

/**
 * 主应用组件 — 包含"视频拆解"和"图片处理"两个功能标签页，支持中/英文切换
 */
function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}

export default App;
