import { useState, useRef } from 'react';
import { api } from '../services/api';

/**
 * 视频上传组件（简化版：仅上传，不包含帧率提取步骤）
 */
export const VideoUploader = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // 验证文件格式（通过扩展名，兼容不同浏览器的MIME类型差异）
    const allowedExtensions = ['mp4', 'avi', 'mov', 'mkv'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setError('不支持的文件格式。请上传 MP4、AVI、MOV 或 MKV 文件。');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadResponse = await api.uploadVideo(file, (progress) => {
        setUploadProgress(progress);
      });

      setUploading(false);

      if (onUploadComplete) {
        onUploadComplete(uploadResponse.data);
      }

    } catch (err) {
      console.error('上传失败:', err);
      setError(err.response?.data?.error || '上传失败，请重试');
      setUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files[0]);
    // 允许重复选同一文件
    e.target.value = '';
  };

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
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleClick = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  return (
    <div className="uploader-container">
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={!uploading ? handleDrag : undefined}
        onDragLeave={!uploading ? handleDrag : undefined}
        onDragOver={!uploading ? handleDrag : undefined}
        onDrop={!uploading ? handleDrop : undefined}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.avi,.mov,.mkv"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {!uploading && (
          <>
            <div className="upload-icon">📹</div>
            <h3>上传视频文件</h3>
            <p>点击或拖放视频文件到此区域</p>
            <p className="upload-hint">支持 MP4、AVI、MOV、MKV 格式，无文件大小限制</p>
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
      </div>

      {error && (
        <div className="error-message">❌ {error}</div>
      )}
    </div>
  );
};

export default VideoUploader;
