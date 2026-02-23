import { useState } from 'react';
import VideoUploader from './components/VideoUploader';
import FrameViewer from './components/FrameViewer';
import ExportPanel from './components/ExportPanel';
import ImageBatchProcessor from './components/ImageBatchProcessor';
import { useFrameSelection } from './hooks/useFrameSelection';
import './styles/App.css';

/**
 * 主应用组件 — 包含"视频拆解"和"图片处理"两个功能标签页
 */
function App() {
  const [activeTab, setActiveTab] = useState('video'); // 'video' | 'image'
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [videoData, setVideoData] = useState(null);

  const {
    selectedFrames,
    selectedCount,
    toggleFrame,
    selectAll,
    clearSelection,
  } = useFrameSelection();

  const handleUploadComplete = (data) => {
    setVideoData(data);
  };

  const handleExtractionComplete = (videoId) => {
    setCurrentVideoId(videoId);
    clearSelection();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎬 视频/图片处理工具</h1>
        <p>视频帧提取 · 图片批量裁切缩放</p>

        {/* Tab navigation */}
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

        {/* ── Video tab ──────────────────────────────────────── */}
        {activeTab === 'video' && (
          <>
            <section className="upload-section">
              <VideoUploader
                onUploadComplete={handleUploadComplete}
                onExtractionComplete={handleExtractionComplete}
              />
            </section>

            {currentVideoId && (
              <div className="content-layout">
                <section className="viewer-section">
                  <FrameViewer
                    videoId={currentVideoId}
                    selectedFrames={selectedFrames}
                    onToggleFrame={toggleFrame}
                    onSelectAll={selectAll}
                    onClearSelection={clearSelection}
                  />
                </section>
                <aside className="export-section">
                  <ExportPanel
                    videoId={currentVideoId}
                    selectedFrames={selectedFrames}
                  />
                </aside>
              </div>
            )}

            {!currentVideoId && (
              <div className="empty-state">
                <p>👆 请先上传视频文件以开始使用</p>
              </div>
            )}
          </>
        )}

        {/* ── Image tab ──────────────────────────────────────── */}
        {activeTab === 'image' && (
          <ImageBatchProcessor />
        )}
      </main>

      <footer className="app-footer">
        {activeTab === 'video'
          ? '使用提示：上传视频 → 浏览帧 → 选择需要的帧 → 导出下载'
          : '使用提示：选择文件夹 → 选中图片 → 配置处理方式 → 处理并下载 ZIP'}
      </footer>
    </div>
  );
}

export default App;
