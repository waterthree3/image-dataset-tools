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

      // 自动开始提取帧
      setUploading(false);
      setExtracting(true);

      const extractResponse = await api.extractFrames(videoData.video_id, 1);
      console.log('帧提取完成:', extractResponse.data);

      setExtracting(false);

      if (onExtractionComplete) {
        onExtractionComplete(videoData.video_id);
      }

    } catch (err) {
      console.error('上传或提取失败:', err);
      setError(err.response?.data?.error || '上传失败，请重试');
      setUploading(false);
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
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading || extracting ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/avi,video/quicktime,video/x-matroska"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {!uploading && !extracting && (
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

        {extracting && (
          <>
            <div className="upload-icon">⚙️</div>
            <h3>提取视频帧...</h3>
            <p>正在处理视频，请稍候</p>
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
