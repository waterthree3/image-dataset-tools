import axios from 'axios';

const API_BASE = '/api';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 300000, // 5分钟超时（用于大文件上传）
  headers: {
    'Content-Type': 'application/json'
  }
});

// 响应拦截器 - 错误处理
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const api = {
  /**
   * 上传视频文件
   * @param {File} file - 视频文件
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise}
   */
  uploadVideo: (file, onProgress) => {
    const formData = new FormData();
    formData.append('video', file);

    return apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (onProgress) onProgress(progress);
        }
      }
    });
  },

  /**
   * 提取视频帧
   * @param {string} videoId - 视频ID
   * @param {number} fps - 每秒提取帧数
   * @returns {Promise}
   */
  extractFrames: (videoId, fps = 1) => {
    return apiClient.post(`/videos/${videoId}/extract`, { fps });
  },

  /**
   * 获取帧列表
   * @param {string} videoId - 视频ID
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   * @returns {Promise}
   */
  getFrameList: (videoId, page = 1, limit = 50) => {
    return apiClient.get(`/videos/${videoId}/frames`, {
      params: { page, limit }
    });
  },

  /**
   * 获取单帧图像URL
   * @param {string} videoId - 视频ID
   * @param {number} frameIndex - 帧索引
   * @param {boolean} thumbnail - 是否获取缩略图
   * @returns {string} 图像URL
   */
  getFrameUrl: (videoId, frameIndex, thumbnail = false) => {
    return `${API_BASE}/videos/${videoId}/frames/${frameIndex}?thumbnail=${thumbnail}`;
  },

  /**
   * 获取视频信息
   * @param {string} videoId - 视频ID
   * @returns {Promise}
   */
  getVideoInfo: (videoId) => {
    return apiClient.get(`/videos/${videoId}/info`);
  },

  /**
   * 导出选定的帧
   * @param {string} videoId - 视频ID
   * @param {Array<number>} frameIndices - 帧索引数组
   * @param {string} format - 导出格式 ('png' 或 'jpeg')
   * @param {number} quality - JPEG质量 (1-100)
   * @param {string} prefix - 文件名前缀（可选）
   * @returns {Promise}
   */
  exportFrames: (videoId, frameIndices, format = 'jpeg', quality = 85, prefix = null) => {
    const payload = {
      frames: frameIndices,
      format,
      quality
    };

    if (prefix) {
      payload.prefix = prefix;
    }

    return apiClient.post(`/videos/${videoId}/export`, payload);
  },

  /**
   * 下载导出的ZIP文件
   * @param {string} exportId - 导出ID
   * @returns {Promise}
   */
  downloadExport: (exportId) => {
    return apiClient.get(`/exports/${exportId}/download`, {
      responseType: 'blob'
    });
  },

  /**
   * 获取视频列表
   * @returns {Promise}
   */
  getVideoList: () => {
    return apiClient.get('/videos');
  },

  /**
   * 删除视频
   * @param {string} videoId - 视频ID
   * @returns {Promise}
   */
  deleteVideo: (videoId) => {
    return apiClient.delete(`/videos/${videoId}`);
  },

  // ── Image batch processing ──────────────────────────────────────────────

  /**
   * 创建新的图片批次
   * @returns {Promise<{batch_id: string}>}
   */
  createImageBatch: () => {
    return apiClient.post('/images/batch/create');
  },

  /**
   * 上传图片到批次
   * @param {string} batchId - 批次ID
   * @param {File[]} files - 图片文件数组
   * @returns {Promise}
   */
  uploadImages: (batchId, files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    return apiClient.post(`/images/batch/${batchId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  /**
   * 获取批次图片的URL（缩略图或原图）
   * @param {string} batchId
   * @param {string} imageId
   * @param {boolean} thumbnail
   * @returns {string}
   */
  getImageUrl: (batchId, imageId, thumbnail = false) => {
    return `${API_BASE}/images/batch/${batchId}/image/${imageId}?thumbnail=${thumbnail}`;
  },

  /**
   * 预览单张图片的处理效果
   * @param {string} batchId
   * @param {string} imageId
   * @param {object} settings - 处理参数（mode, ratio_w, ratio_h, anchor_x, anchor_y 等）
   * @returns {Promise<Blob>} JPEG image blob
   */
  previewImage: (batchId, imageId, settings) => {
    return apiClient.post(
      `/images/batch/${batchId}/image/${imageId}/preview`,
      settings,
      { responseType: 'blob' }
    );
  },

  /**
   * 处理图片批次并生成ZIP
   * @param {string} batchId
   * @param {Array} imageSettings - 每张图片的处理参数
   * @param {string} format - 'jpeg' 或 'png'
   * @param {number} quality - JPEG质量 1-100
   * @returns {Promise}
   */
  processImages: (batchId, imageSettings, format = 'jpeg', quality = 85) => {
    return apiClient.post(`/images/batch/${batchId}/process`, {
      image_settings: imageSettings,
      format,
      quality,
    });
  },

  /**
   * 下载处理后的ZIP文件
   * @param {string} exportId
   * @returns {Promise<Blob>}
   */
  downloadImageExport: (exportId) => {
    return apiClient.get(`/images/exports/${exportId}/download`, {
      responseType: 'blob',
    });
  },

  /**
   * 删除图片批次
   * @param {string} batchId
   * @returns {Promise}
   */
  deleteImageBatch: (batchId) => {
    return apiClient.delete(`/images/batch/${batchId}`);
  },
};

export default api;
