import { useState, useEffect } from 'react';
import FrameGrid from './FrameGrid';
import { api } from '../services/api';

/**
 * 帧浏览器容器组件
 */
export const FrameViewer = ({ videoId, selectedFrames, onToggleFrame, onSelectAll, onClearSelection }) => {
  const [videoInfo, setVideoInfo] = useState(null);
  const [totalFrames, setTotalFrames] = useState(0);

  // 加载视频信息
  useEffect(() => {
    const loadVideoInfo = async () => {
      if (!videoId) return;

      try {
        const response = await api.getVideoInfo(videoId);
        setVideoInfo(response.data);
        setTotalFrames(response.data.total_extracted || 0);
      } catch (err) {
        console.error('加载视频信息失败:', err);
      }
    };

    loadVideoInfo();
  }, [videoId]);

  if (!videoId) {
    return null;
  }

  return (
    <div className="frame-viewer">
      <div className="viewer-header">
        <div className="video-info">
          {videoInfo && (
            <>
              <h2>{videoInfo.filename}</h2>
              <p>
                共 {totalFrames} 帧
                {videoInfo.fps_setting && ` (每秒 ${videoInfo.fps_setting} 帧)`}
              </p>
            </>
          )}
        </div>

        <div className="viewer-controls">
          <button onClick={() => onSelectAll(totalFrames)}>
            全选
          </button>
          <button onClick={onClearSelection}>
            取消选择
          </button>
          <span className="selection-count">
            已选择: {selectedFrames.size} / {totalFrames}
          </span>
        </div>
      </div>

      <div className="viewer-content">
        <FrameGrid
          videoId={videoId}
          selectedFrames={selectedFrames}
          onToggleFrame={onToggleFrame}
        />
      </div>
    </div>
  );
};

export default FrameViewer;
