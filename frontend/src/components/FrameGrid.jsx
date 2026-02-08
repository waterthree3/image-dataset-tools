import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

/**
 * 帧网格视图组件（简化版，不使用react-window）
 */
export const FrameGrid = ({ videoId, selectedFrames, onToggleFrame }) => {
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedImages, setLoadedImages] = useState(new Set());
  const observerRef = useRef(null);

  // 加载帧列表
  useEffect(() => {
    const loadFrames = async () => {
      if (!videoId) return;

      setLoading(true);
      setError(null);

      try {
        // 获取所有帧（分页加载可以优化）
        const response = await api.getFrameList(videoId, 1, 1000);
        setFrames(response.data.frames);
      } catch (err) {
        console.error('加载帧列表失败:', err);
        setError('加载失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    loadFrames();
  }, [videoId]);

  // 懒加载图像
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            if (src && !img.src) {
              img.src = src;
              img.onload = () => {
                setLoadedImages(prev => new Set([...prev, src]));
              };
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // 注册图像到懒加载观察器
  const registerImage = (element) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (frames.length === 0) {
    return <div className="empty">没有找到视频帧</div>;
  }

  return (
    <div className="frame-grid">
      {frames.map((frame) => {
        const isSelected = selectedFrames.has(frame.index);
        const thumbnailUrl = api.getFrameUrl(videoId, frame.index, true);

        return (
          <div
            key={frame.index}
            className={`frame-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onToggleFrame(frame.index)}
          >
            <img
              ref={registerImage}
              data-src={thumbnailUrl}
              alt={`Frame ${frame.index}`}
              className="frame-thumbnail"
            />
            <div className="frame-overlay">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="frame-index">#{frame.index}</span>
            </div>
            {frame.timestamp !== undefined && (
              <div className="frame-time">
                {formatTime(frame.timestamp)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// 格式化时间戳
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default FrameGrid;
