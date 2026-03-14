import { useState, useRef } from 'react';
import VideoUploader from './components/VideoUploader';
import VideoTimeline from './components/VideoTimeline';
import VideoFolderList from './components/VideoFolderList';
import ImageBatchProcessor from './components/ImageBatchProcessor';
import { LangProvider, useLang } from './LangContext';
import { api } from './services/api';
import './styles/App.css';

const VIDEO_EXTS = ['mp4', 'avi', 'mov', 'mkv'];

/**
 * Inner app — uses lang context already provided by the outer wrapper.
 */
function AppInner() {
  const { lang, setLang, t } = useLang();
  const [activeTab, setActiveTab] = useState('video'); // 'video' | 'image'

  // ── Single-video mode state ────────────────────────────────────────────────
  const [videoData, setVideoData] = useState(null);

  // ── Folder mode state ──────────────────────────────────────────────────────
  // folderFiles: File[] — all video files picked from the folder
  // folderState: { [filename]: { videoData, frames, uploading, error } }
  // currentFolderFile: File | null — the video currently open in the timeline
  const [folderFiles, setFolderFiles] = useState([]);
  const [folderState, setFolderState] = useState({});
  const [currentFolderFile, setCurrentFolderFile] = useState(null);
  const folderInputRef = useRef(null);

  const inFolderMode = folderFiles.length > 0;

  // ── Single video handlers ──────────────────────────────────────────────────
  const handleUploadComplete = (data) => setVideoData(data);
  const handleResetSingle    = () => setVideoData(null);

  // ── Folder handlers ────────────────────────────────────────────────────────
  const handleFolderInputChange = (e) => {
    const all = Array.from(e.target.files);
    const videos = all.filter((f) => {
      const ext = f.name.split('.').pop().toLowerCase();
      return VIDEO_EXTS.includes(ext);
    });
    if (videos.length > 0) {
      setFolderFiles(videos);
      setFolderState({});
      setCurrentFolderFile(null);
      setVideoData(null);
    }
    e.target.value = '';
  };

  // Called when user clicks a video card in the folder list
  const handleSelectFolderVideo = async (file) => {
    const key = file.name;
    const existing = folderState[key];

    // Already uploaded — jump straight to timeline
    if (existing?.videoData) {
      setCurrentFolderFile(file);
      return;
    }

    // Mark as uploading and enter the timeline view (it will show a loading state)
    setFolderState((prev) => ({
      ...prev,
      [key]: { ...prev[key], uploading: true, error: false },
    }));
    setCurrentFolderFile(file);

    try {
      const resp = await api.uploadVideo(file, () => {});
      setFolderState((prev) => ({
        ...prev,
        [key]: { ...prev[key], videoData: resp.data, uploading: false },
      }));
    } catch {
      setFolderState((prev) => ({
        ...prev,
        [key]: { ...prev[key], uploading: false, error: true },
      }));
      setCurrentFolderFile(null); // go back to list on failure
    }
  };

  // Called by VideoTimeline's "Back to List" button — saves the frames
  const handleBackToFolderList = (frames) => {
    if (currentFolderFile) {
      setFolderState((prev) => ({
        ...prev,
        [currentFolderFile.name]: { ...prev[currentFolderFile.name], frames },
      }));
    }
    setCurrentFolderFile(null);
  };

  const handleExitFolderMode = () => {
    setFolderFiles([]);
    setFolderState({});
    setCurrentFolderFile(null);
  };

  // ── Derived data for the currently open folder video ──────────────────────
  const currentFolderKey    = currentFolderFile?.name;
  const currentFolderEntry  = currentFolderKey ? folderState[currentFolderKey] : null;
  const currentFolderVData  = currentFolderEntry?.videoData || null;
  const currentFolderFrames = currentFolderEntry?.frames || [];
  const currentFolderLoading = !!currentFolderEntry?.uploading;
  const currentFolderError   = !!currentFolderEntry?.error;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <h1>🎬 {t('视频/图片处理工具', 'Video / Image Tool')}</h1>
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
            {/* ① Single video timeline */}
            {videoData && !inFolderMode && (
              <section className="timeline-section">
                <VideoTimeline videoData={videoData} onReset={handleResetSingle} />
              </section>
            )}

            {/* ② Folder video timeline (uploading) */}
            {inFolderMode && currentFolderFile && currentFolderLoading && (
              <section className="timeline-section">
                <div className="folder-uploading-view">
                  <div className="folder-uploading-icon">⬆️</div>
                  <p className="folder-uploading-text">
                    {t(`正在上传 ${currentFolderFile.name}…`, `Uploading ${currentFolderFile.name}…`)}
                  </p>
                  <button className="folder-exit-btn" onClick={() => {
                    setCurrentFolderFile(null);
                  }}>
                    ← {t('返回列表', 'Back to List')}
                  </button>
                </div>
              </section>
            )}

            {/* ③ Folder video timeline (error) */}
            {inFolderMode && currentFolderFile && currentFolderError && !currentFolderLoading && (
              <section className="timeline-section">
                <div className="folder-uploading-view">
                  <p className="error-message">❌ {t('上传失败，请重试', 'Upload failed, please retry')}</p>
                  <button className="folder-exit-btn" onClick={() => setCurrentFolderFile(null)}>
                    ← {t('返回列表', 'Back to List')}
                  </button>
                </div>
              </section>
            )}

            {/* ④ Folder video timeline (ready) */}
            {inFolderMode && currentFolderFile && currentFolderVData && !currentFolderLoading && (
              <section className="timeline-section">
                <VideoTimeline
                  videoData={currentFolderVData}
                  initialFrames={currentFolderFrames}
                  onBack={handleBackToFolderList}
                />
              </section>
            )}

            {/* ⑤ Folder list view */}
            {inFolderMode && !currentFolderFile && (
              <section className="timeline-section">
                <VideoFolderList
                  files={folderFiles}
                  folderState={folderState}
                  onSelectVideo={handleSelectFolderVideo}
                  onExitFolder={handleExitFolderMode}
                />
              </section>
            )}

            {/* ⑥ Home screen (no video, no folder) */}
            {!videoData && !inFolderMode && (
              <section className="upload-section">
                {/* Hidden folder input */}
                <input
                  ref={folderInputRef}
                  type="file"
                  // webkitdirectory lets user pick an entire folder
                  webkitdirectory=""
                  multiple
                  accept=".mp4,.avi,.mov,.mkv"
                  style={{ display: 'none' }}
                  onChange={handleFolderInputChange}
                />

                <div className="video-home-layout">
                  {/* Single upload card */}
                  <div className="video-home-card">
                    <VideoUploader onUploadComplete={handleUploadComplete} />
                  </div>

                  {/* Folder select card */}
                  <div className="video-home-card folder-card">
                    <div
                      className="folder-select-area"
                      onClick={() => folderInputRef.current?.click()}
                    >
                      <div className="upload-icon">📁</div>
                      <h3>{t('选择文件夹', 'Select Folder')}</h3>
                      <p>{t('批量处理同一目录下的多个视频', 'Process multiple videos from one folder')}</p>
                      <p className="upload-hint">
                        {t('选取后可逐个进入，已选帧自动暂存', 'Frames are saved when switching between videos')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="empty-state">
                  <p>{t('👆 上传单个视频，或选择文件夹批量处理', '👆 Upload a single video, or pick a folder to process multiple')}</p>
                </div>
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
          ? t('使用提示：上传视频 / 选择文件夹 → 拖动时间轴 → 添加此帧 → 导出下载',
              'Tip: Upload video or select folder → Drag timeline → Add frame → Export ZIP')
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
