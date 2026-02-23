import { useState, useRef } from 'react';
import { api } from '../services/api';

/**
 * 视频上传组件
 */
export const VideoUploader = ({ onUploadComplete, onExtractionComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [showFpsSelection, setShowFpsSelection] = useState(false);
  const [selectedFps, setSelectedFps] = useState(1);
  const [videoInfo, setVideoInfo] = useState(null);
  const fileInputRef = useRef(null);

  // 处理文件选择
  const handleFileSelect = async (file) => {
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska'];
    if (!allowedTypes.includes(file.type)) {
      setError('不支持的文件格式。请上传MP4、AVI、MOV或MKV文件。');
      return;
    }

    // 验证文件大小（500MB）
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('文件过大。最大支持500MB的视频文件。');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // 上传视频
      const uploadResponse = await api.uploadVideo(file, (progress) => {
        setUploadProgress(progress);
      });

      const videoData = uploadResponse.data;
      console.log('视频上传成功:', videoData);

      if (onUploadComplete) {
        onUploadComplete(videoData);
      }

      // 保存视频信息并显示帧率选择界面
      setUploading(false);
      setVideoInfo(videoData);
      setSelectedFps(Math.min(1, Math.floor(videoData.fps))); // 默认1fps，不超过视频帧率
      setShowFpsSelection(true);

    } catch (err) {
      console.error('上传失败:', err);
      setError(err.response?.data?.error || '上传失败，请重试');
      setUploading(false);
      setExtracting(false);
    }
  };

  // 开始提取帧
  const handleStartExtraction = async () => {
    if (!videoInfo) return;

    setShowFpsSelection(false);
    setExtracting(true);
    setError(null);

    try {
      const extractResponse = await api.extractFrames(videoInfo.video_id, selectedFps);
      console.log('帧提取完成:', extractResponse.data);

      setExtracting(false);

      if (onExtractionComplete) {
        onExtractionComplete(videoInfo.video_id);
      }

    } catch (err) {
      console.error('提取失败:', err);
      setError(err.response?.data?.error || '提取失败，请重试');
      setExtracting(false);
    }
  };

  // 处理文件输入变化
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  // 处理拖放
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  // 点击上传区域
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="uploader-container">
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading || extracting || showFpsSelection ? 'uploading' : ''}`}
        onDragEnter={!showFpsSelection ? handleDrag : undefined}
        onDragLeave={!showFpsSelection ? handleDrag : undefined}
        onDragOver={!showFpsSelection ? handleDrag : undefined}
        onDrop={!showFpsSelection ? handleDrop : undefined}
        onClick={!showFpsSelection ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/avi,video/quicktime,video/x-matroska"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {!uploading && !extracting && !showFpsSelection && (
          <>
            <div className="upload-icon">📹</div>
            <h3>上传视频文件</h3>
            <p>点击或拖放视频文件到此区域</p>
            <p className="upload-hint">支持 MP4, AVI, MOV, MKV 格式，最大 500MB</p>
          </>
        )}

        {uploading && (
          <>
            <div className="upload-icon">⬆️</div>
            <h3>上传中...</h3>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <p>{uploadProgress}%</p>
          </>
        )}

        {showFpsSelection && videoInfo && (
          <div className="fps-selection" onClick={(e) => e.stopPropagation()}>
            <div className="upload-icon">⚙️</div>
            <h3>选择提取帧率</h3>
            <p className="video-info-text">
              视频帧率: {videoInfo.fps.toFixed(2)} FPS |
              时长: {videoInfo.duration_formatted}
            </p>

            <div className="fps-input-group">
              <label>每秒提取帧数：</label>
              <input
                type="number"
                min="0.1"
                max={Math.floor(videoInfo.fps)}
                step="0.1"
                value={selectedFps}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value > 0 && value <= videoInfo.fps) {
                    setSelectedFps(value);
                  }
                }}
                className="fps-input"
              />
              <span className="fps-hint">FPS (最大: {Math.floor(videoInfo.fps)})</span>
            </div>

            <div className="fps-presets">
              <button onClick={() => setSelectedFps(0.5)} className="preset-btn">0.5 FPS (2秒1帧)</button>
              <button onClick={() => setSelectedFps(1)} className="preset-btn">1 FPS (1秒1帧)</button>
              <button onClick={() => setSelectedFps(2)} className="preset-btn" disabled={videoInfo.fps < 2}>2 FPS</button>
              <button onClick={() => setSelectedFps(5)} className="preset-btn" disabled={videoInfo.fps < 5}>5 FPS</button>
              <button onClick={() => setSelectedFps(Math.floor(videoInfo.fps))} className="preset-btn">最大 ({Math.floor(videoInfo.fps)} FPS)</button>
            </div>

            <p className="extraction-estimate">
              预计提取约 <strong>{Math.floor(videoInfo.duration * selectedFps)}</strong> 帧
            </p>

            <button onClick={handleStartExtraction} className="start-extraction-btn">
              开始提取
            </button>
          </div>
        )}

        {extracting && (
          <>
            <div className="upload-icon">⚙️</div>
            <h3>提取视频帧...</h3>
            <p>正在以 {selectedFps} FPS 提取，请稍候</p>
          </>
        )}
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
