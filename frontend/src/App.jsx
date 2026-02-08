import { useState } from 'react';
import VideoUploader from './components/VideoUploader';
import FrameViewer from './components/FrameViewer';
import ExportPanel from './components/ExportPanel';
import { useFrameSelection } from './hooks/useFrameSelection';
import './styles/App.css';

/**
 * 主应用组件
 */
function App() {
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [videoData, setVideoData] = useState(null);

  const {
    selectedFrames,
    selectedCount,
    toggleFrame,
    selectAll,
    clearSelection
  } = useFrameSelection();

  // 处理上传完成
  const handleUploadComplete = (data) => {
    console.log('视频上传完成:', data);
    setVideoData(data);
  };

  // 处理提取完成
  const handleExtractionComplete = (videoId) => {
    console.log('帧提取完成:', videoId);
    setCurrentVideoId(videoId);
    clearSelection(); // 清除之前的选择
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎬 视频拆解器</h1>
        <p>将视频拆解为单帧图像，支持选择性导出</p>
      </header>

      <main className="app-main">
        {/* 上传区域 */}
        <section className="upload-section">
          <VideoUploader
            onUploadComplete={handleUploadComplete}
            onExtractionComplete={handleExtractionComplete}
          />
        </section>

        {/* 主内容区 */}
        {currentVideoId && (
          <div className="content-layout">
            {/* 帧浏览器 */}
            <section className="viewer-section">
              <FrameViewer
                videoId={currentVideoId}
                selectedFrames={selectedFrames}
                onToggleFrame={toggleFrame}
                onSelectAll={selectAll}
                onClearSelection={clearSelection}
              />
            </section>

            {/* 导出面板 */}
            <aside className="export-section">
              <ExportPanel
                videoId={currentVideoId}
                selectedFrames={selectedFrames}
              />
            </aside>
          </div>
        )}

        {/* 空状态提示 */}
        {!currentVideoId && (
          <div className="empty-state">
            <p>👆 请先上传视频文件以开始使用</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>使用提示：上传视频 → 浏览帧 → 选择需要的帧 → 导出下载</p>
      </footer>
    </div>
  );
}

export default App;
