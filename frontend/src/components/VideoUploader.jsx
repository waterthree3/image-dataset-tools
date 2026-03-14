import { useState, useRef } from 'react';
import { api } from '../services/api';
import { useLang } from '../LangContext';

/**
 * 视频上传组件（简化版：仅上传，不包含帧率提取步骤）
 */
export const VideoUploader = ({ onUploadComplete }) => {
  const { t } = useLang();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    const allowedExtensions = ['mp4', 'avi', 'mov', 'mkv'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setError(t(
        '不支持的文件格式。请上传 MP4、AVI、MOV 或 MKV 文件。',
        'Unsupported format. Please upload an MP4, AVI, MOV or MKV file.'
      ));
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
      console.error('Upload failed:', err);
      setError(err.response?.data?.error || t('上传失败，请重试', 'Upload failed, please retry'));
      setUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files[0]);
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
            <h3>{t('上传视频文件', 'Upload Video File')}</h3>
            <p>{t('点击或拖放视频文件到此区域', 'Click or drag a video file here')}</p>
            <p className="upload-hint">{t('支持 MP4、AVI、MOV、MKV 格式，无文件大小限制', 'MP4 · AVI · MOV · MKV · No size limit')}</p>
          </>
        )}

        {uploading && (
          <>
            <div className="upload-icon">⬆️</div>
            <h3>{t('上传中...', 'Uploading...')}</h3>
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
