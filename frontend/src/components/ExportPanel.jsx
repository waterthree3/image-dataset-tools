import { useState } from 'react';
import { api } from '../services/api';

/**
 * 导出控制面板组件
 */
export const ExportPanel = ({ videoId, selectedFrames }) => {
  const [format, setFormat] = useState('jpeg');
  const [quality, setQuality] = useState(85);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const selectedCount = selectedFrames.size;
  const selectedArray = Array.from(selectedFrames).sort((a, b) => a - b);

  // 处理导出
  const handleExport = async () => {
    if (selectedCount === 0) {
      setError('请先选择要导出的帧');
      return;
    }

    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      // 导出帧
      const exportResponse = await api.exportFrames(
        videoId,
        selectedArray,
        format,
        quality
      );

      const { export_id, file_count } = exportResponse.data;
      console.log('导出成功:', exportResponse.data);

      // 下载ZIP文件
      const downloadResponse = await api.downloadExport(export_id);

      // 创建下载链接
      const blob = new Blob([downloadResponse.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video_frames_${export_id.slice(0, 8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`成功导出 ${file_count} 帧图像！`);

    } catch (err) {
      console.error('导出失败:', err);
      setError(err.response?.data?.error || '导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-panel">
      <h3>导出设置</h3>

      <div className="export-info">
        <p>已选择 <strong>{selectedCount}</strong> 帧</p>
      </div>

      <div className="export-options">
        <div className="option-group">
          <label>导出格式：</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="jpeg"
                checked={format === 'jpeg'}
                onChange={(e) => setFormat(e.target.value)}
              />
              JPEG
            </label>
            <label>
              <input
                type="radio"
                value="png"
                checked={format === 'png'}
                onChange={(e) => setFormat(e.target.value)}
              />
              PNG
            </label>
          </div>
        </div>

        {format === 'jpeg' && (
          <div className="option-group">
            <label>JPEG 质量：{quality}</label>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="quality-slider"
            />
            <div className="quality-labels">
              <span>低</span>
              <span>高</span>
            </div>
          </div>
        )}
      </div>

      <button
        className="export-button"
        onClick={handleExport}
        disabled={selectedCount === 0 || exporting}
      >
        {exporting ? '导出中...' : '导出并下载'}
      </button>

      {error && (
        <div className="message error-message">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="message success-message">
          ✅ {success}
        </div>
      )}
    </div>
  );
};

export default ExportPanel;
