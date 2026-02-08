import { useState, useCallback } from 'react';

/**
 * 自定义Hook：管理帧选择状态
 * @returns {Object} 选择状态和操作方法
 */
export const useFrameSelection = () => {
  const [selectedFrames, setSelectedFrames] = useState(new Set());

  // 切换单个帧的选择状态
  const toggleFrame = useCallback((frameIndex) => {
    setSelectedFrames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(frameIndex)) {
        newSet.delete(frameIndex);
      } else {
        newSet.add(frameIndex);
      }
      return newSet;
    });
  }, []);

  // 选择范围内的帧
  const selectRange = useCallback((startIndex, endIndex) => {
    setSelectedFrames(prev => {
      const newSet = new Set(prev);
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);
      for (let i = start; i <= end; i++) {
        newSet.add(i);
      }
      return newSet;
    });
  }, []);

  // 全选
  const selectAll = useCallback((totalFrames) => {
    const newSet = new Set();
    for (let i = 0; i < totalFrames; i++) {
      newSet.add(i);
    }
    setSelectedFrames(newSet);
  }, []);

  // 取消全选
  const clearSelection = useCallback(() => {
    setSelectedFrames(new Set());
  }, []);

  // 检查是否选中
  const isSelected = useCallback((frameIndex) => {
    return selectedFrames.has(frameIndex);
  }, [selectedFrames]);

  // 获取选中的帧索引数组
  const getSelectedArray = useCallback(() => {
    return Array.from(selectedFrames).sort((a, b) => a - b);
  }, [selectedFrames]);

  return {
    selectedFrames,
    selectedCount: selectedFrames.size,
    toggleFrame,
    selectRange,
    selectAll,
    clearSelection,
    isSelected,
    getSelectedArray
  };
};

export default useFrameSelection;
