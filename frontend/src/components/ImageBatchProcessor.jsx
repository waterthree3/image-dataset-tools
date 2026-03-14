import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import ImageProcessSettings from './ImageProcessSettings';

/** Modal that shows a before/after preview for a single image. */
function PreviewModal({ originalUrl, previewUrl, filename, onClose, loading, error }) {
  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={e => e.stopPropagation()}>
        <div className="preview-modal-header">
          <span className="preview-modal-title">预览：{filename}</span>
          <button className="preview-close-btn" onClick={onClose}>✕</button>
        </div>
        {loading && <div className="preview-loading">处理中…</div>}
        {error   && <div className="preview-error">{error}</div>}
        {!loading && !error && (
          <div className="preview-images">
            <div className="preview-col">
              <div className="preview-col-label">原图</div>
              <img src={originalUrl} alt="原图" className="preview-img" />
            </div>
            <div className="preview-divider" />
            <div className="preview-col">
              <div className="preview-col-label">处理后</div>
              <img src={previewUrl} alt="处理后" className="preview-img" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** WebP → PNG lossless converter — self-contained quick-tool section. */
function WebpToPngConverter() {
  const [webpFiles, setWebpFiles]   = useState([]);
  const [status, setStatus]         = useState(null); // null|'uploading'|'converting'|'done'|'error'
  const [progress, setProgress]     = useState({ current: 0, total: 0 });
  const [message, setMessage]       = useState(null);
  const [error, setError]           = useState(null);

  const folderInputRef = useRef(null);
  const fileInputRef   = useRef(null);

  useEffect(() => {
    if (folderInputRef.current) folderInputRef.current.setAttribute('webkitdirectory', '');
  }, []);

  const handleFiles = (files) => {
    const webps = Array.from(files).filter(f => /\.(webp|avif)$/i.test(f.name));
    setWebpFiles(webps);
    setMessage(null);
    setError(webps.length === 0 ? '所选文件中没有 WebP / AVIF 格式的图片' : null);
  };

  const handleConvert = async () => {
    if (webpFiles.length === 0) return;
    setStatus('uploading');
    setError(null);
    setMessage(null);
    setProgress({ current: 0, total: webpFiles.length });

    try {
      const { data: { batch_id } } = await api.createImageBatch();

      const CHUNK = 10;
      const uploadedItems = [];

      for (let i = 0; i < webpFiles.length; i += CHUNK) {
        const chunk = webpFiles.slice(i, i + CHUNK);
        const { data } = await api.uploadImages(batch_id, chunk);
        uploadedItems.push(...(data.uploaded || []).filter(u => !u.error));
        setProgress({ current: Math.min(i + CHUNK, webpFiles.length), total: webpFiles.length });
      }

      if (uploadedItems.length === 0) throw new Error('没有文件上传成功');

      setStatus('converting');
      const imageInfoList = uploadedItems.map(u => ({
        image_id: u.image_id,
        original_filename: u.filename,
      }));

      const { data } = await api.convertImagesToPng(batch_id, imageInfoList);

      const blobResp = await api.downloadImageExport(data.export_id);
      const url = URL.createObjectURL(blobResp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'webp_to_png.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('done');
      setMessage(`成功转换 ${data.processed_count} 个 WebP 文件，下载已开始`);
    } catch (err) {
      setStatus('error');
      setError('转换失败：' + (err.response?.data?.error || err.message));
    }
  };

  const isRunning  = status === 'uploading' || status === 'converting';
  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="webp-converter-card">
      <div className="webp-converter-header">
        <span className="webp-converter-title">WebP / AVIF → PNG 无损转换</span>
        <span className="webp-converter-desc">将文件夹中的所有 WebP / AVIF 文件无损转换为 PNG，打包下载</span>
      </div>

      <div className="webp-converter-body">
        <div className="image-upload-buttons">
          <button className="folder-select-btn" onClick={() => folderInputRef.current?.click()} disabled={isRunning}>
            📁 选择文件夹
          </button>
          <button className="file-select-btn" onClick={() => fileInputRef.current?.click()} disabled={isRunning}>
            🖼️ 选择 WebP / AVIF 文件
          </button>
        </div>

        <input ref={folderInputRef} type="file" multiple accept=".webp,.avif" style={{ display: 'none' }}
          onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
        <input ref={fileInputRef}   type="file" multiple accept=".webp,.avif" style={{ display: 'none' }}
          onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />

        {webpFiles.length > 0 && !error && (
          <p className="webp-file-count">已选择 <strong>{webpFiles.length}</strong> 个 WebP / AVIF 文件</p>
        )}

        {error   && <div className="error-message">{error}</div>}
        {message && !error && <div className="message success-message">{message}</div>}

        {isRunning && (
          <div className="upload-progress-info">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <p>{status === 'uploading' ? `上传中… ${progress.current} / ${progress.total}` : '转换中…'}</p>
          </div>
        )}

        <button
          className="process-button webp-convert-btn"
          onClick={handleConvert}
          disabled={webpFiles.length === 0 || isRunning}
        >
          {isRunning
            ? (status === 'converting' ? '转换中…' : '上传中…')
            : `无损转换为 PNG 并下载（${webpFiles.length || 0} 个文件）`}
        </button>
      </div>
    </div>
  );
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'bmp', 'webp', 'gif', 'tiff', 'tif']);

function getExt(name) {
  return name.split('.').pop().toLowerCase();
}

function isImage(filename) {
  return IMAGE_EXTS.has(getExt(filename));
}

/** Return a short human-readable description of an image's settings. */
function settingsBadge(settings) {
  if (!settings) return null;
  if (settings.mode === 'scale') {
    const parts = [];
    if (settings.maxWidth)  parts.push(`W≤${settings.maxWidth}`);
    if (settings.maxHeight) parts.push(`H≤${settings.maxHeight}`);
    return parts.length > 0 ? `缩放 ${parts.join(' ')}` : '缩放（不变）';
  }
  if (settings.mode === 'crop') return `裁切 ${settings.ratioW}:${settings.ratioH}`;
  if (settings.mode === 'pad')  return `填边 ${settings.ratioW}:${settings.ratioH}`;
  return null;
}

/**
 * Main component for the image batch processing feature.
 *
 * Workflow:
 *   1. User selects a folder (webkitdirectory) or individual images.
 *   2. Images are uploaded to the backend in chunks.
 *   3. Images are shown in a grid. Each card shows a thumbnail,
 *      the original dimensions, and the applied settings badge.
 *   4. User selects a subset → configures settings → "Apply to selected".
 *   5. Repeat for other subsets (e.g. landscape vs portrait).
 *   6. "Process & Download" sends all settings to the backend,
 *      receives a ZIP, and triggers browser download.
 */
function ImageBatchProcessor() {
  const [batchId, setBatchId]     = useState(null);
  const [images, setImages]       = useState([]);   // {id, filename, width, height, thumbUrl, settings}
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [processing, setProcessing] = useState(false);
  const [exportFormat, setExportFormat] = useState('jpeg');
  const [quality, setQuality]     = useState(85);
  const [error, setError]         = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [preview, setPreview] = useState(null); // { imageId, filename, originalUrl, previewUrl, loading, error }

  const folderInputRef   = useRef(null);
  const fileInputRef     = useRef(null);
  const settingsRef      = useRef(null);

  // Set the non-standard webkitdirectory attribute via ref
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
    }
  }, []);

  /** Upload an array of File objects to the backend. */
  const uploadFiles = useCallback(async (files) => {
    const imageFiles = Array.from(files).filter(f => isImage(f.name));
    if (imageFiles.length === 0) {
      setError('所选文件中没有支持的图片格式（JPG、PNG、BMP、WebP、GIF、TIFF）');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setUploading(true);
    setImages([]);
    setSelectedIds(new Set());
    setUploadProgress({ current: 0, total: imageFiles.length });

    try {
      const { data: { batch_id } } = await api.createImageBatch();
      setBatchId(batch_id);

      const CHUNK = 10;
      const allImages = [];

      for (let i = 0; i < imageFiles.length; i += CHUNK) {
        const chunk = imageFiles.slice(i, i + CHUNK);
        const { data } = await api.uploadImages(batch_id, chunk);

        const uploaded = (data.uploaded || [])
          .filter(u => !u.error)
          .map(u => ({
            id:       u.image_id,
            filename: u.filename,
            width:    u.width,
            height:   u.height,
            thumbUrl: api.getImageUrl(batch_id, u.image_id, true),
            settings: null,
          }));

        allImages.push(...uploaded);
        setUploadProgress({ current: Math.min(i + CHUNK, imageFiles.length), total: imageFiles.length });
        setImages([...allImages]);
      }

      setSuccessMsg(`已上传 ${allImages.length} 张图片，请选择图片并配置处理方式`);
    } catch (err) {
      setError('上传失败：' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files?.length > 0) {
      uploadFiles(e.target.files);
      // Reset so the same folder can be re-selected
      e.target.value = '';
    }
  };

  /** Toggle selection of a single image. */
  const toggleImage = (imageId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  };

  const selectAll   = () => setSelectedIds(new Set(images.map(i => i.id)));
  const clearSelect = () => setSelectedIds(new Set());

  /** Save settings for all currently selected images. */
  const applySettings = (settings) => {
    setImages(prev =>
      prev.map(img => selectedIds.has(img.id) ? { ...img, settings } : img)
    );
    setSuccessMsg(`已为 ${selectedIds.size} 张图片应用设置`);
    setError(null);
  };

  /** Remove settings from all currently selected images. */
  const clearSettings = () => {
    setImages(prev =>
      prev.map(img => selectedIds.has(img.id) ? { ...img, settings: null } : img)
    );
  };

  /** Preview the first selected image using the current panel settings. */
  const handlePreview = async () => {
    if (!batchId || selectedIds.size === 0) return;

    const firstId = [...selectedIds][0];
    const img = images.find(i => i.id === firstId);
    if (!img) return;

    const settings = settingsRef.current?.getCurrentSettings() ?? { mode: 'scale', max_width: 0, max_height: 0 };
    const originalUrl = api.getImageUrl(batchId, firstId, false);

    setPreview({ imageId: firstId, filename: img.filename, originalUrl, previewUrl: null, loading: true, error: null });

    try {
      const resp = await api.previewImage(batchId, firstId, settings);
      const url  = URL.createObjectURL(resp.data);
      setPreview(prev => ({ ...prev, previewUrl: url, loading: false }));
    } catch (err) {
      setPreview(prev => ({
        ...prev,
        loading: false,
        error: '预览失败：' + (err.response?.data?.error || err.message),
      }));
    }
  };

  /** Send all images with their settings to the backend and download the ZIP. */
  const handleProcess = async () => {
    if (!batchId || images.length === 0) return;
    setProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const imageSettings = images.map(img => {
        const s = img.settings;
        if (!s) {
          // No settings → copy as-is (scale with no constraints)
          return {
            image_id:          img.id,
            original_filename: img.filename,
            mode:              'scale',
            max_width:         0,
            max_height:        0,
          };
        }
        return {
          image_id:          img.id,
          original_filename: img.filename,
          mode:              s.mode,
          max_width:         s.maxWidth  || 0,
          max_height:        s.maxHeight || 0,
          ratio_w:           s.ratioW    || 16,
          ratio_h:           s.ratioH    || 9,
          output_width:      s.outputWidth  || null,
          output_height:     s.outputHeight || null,
          anchor_x:          s.anchorX ?? 0.5,
          anchor_y:          s.anchorY ?? 0.5,
        };
      });

      const { data } = await api.processImages(batchId, imageSettings, exportFormat, quality);

      // Trigger download
      const blobResp = await api.downloadImageExport(data.export_id);
      const url = URL.createObjectURL(blobResp.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = 'processed_images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMsg(`成功处理 ${data.processed_count} 张图片，下载已开始`);
    } catch (err) {
      setError('处理失败：' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const configuredCount = images.filter(i => i.settings !== null).length;
  const progressPct = uploading && uploadProgress.total > 0
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
    : 0;

  return (
    <div className="image-processor">
      {/* ── WebP → PNG quick converter ────────────────────────── */}
      <WebpToPngConverter />

      <div className="section-divider" />

      {/* ── Preview modal ─────────────────────────────────────── */}
      {preview && (
        <PreviewModal
          originalUrl={preview.originalUrl}
          previewUrl={preview.previewUrl}
          filename={preview.filename}
          loading={preview.loading}
          error={preview.error}
          onClose={() => {
            if (preview.previewUrl) URL.revokeObjectURL(preview.previewUrl);
            setPreview(null);
          }}
        />
      )}

      {/* ── Upload controls ──────────────────────────────────── */}
      <div className="image-upload-area">
        <div className="image-upload-buttons">
          <button
            className="folder-select-btn"
            onClick={() => folderInputRef.current?.click()}
            disabled={uploading}
          >
            📁 选择文件夹
          </button>
          <button
            className="file-select-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            🖼️ 选择图片
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={folderInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileInput}
        />

        {uploading && (
          <div className="upload-progress-info">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <p>上传中… {uploadProgress.current} / {uploadProgress.total} 张</p>
          </div>
        )}

        {error      && <div className="error-message">{error}</div>}
        {successMsg && !error && <div className="message success-message">{successMsg}</div>}
      </div>

      {/* ── Image grid + settings sidebar ────────────────────── */}
      {images.length > 0 && (
        <div className="image-processor-layout">

          {/* Left: image grid */}
          <div className="image-batch-grid-section">
            <div className="image-batch-toolbar">
              <span>
                {images.length} 张图片 &nbsp;·&nbsp;
                {selectedIds.size} 已选中 &nbsp;·&nbsp;
                {configuredCount} 已配置
              </span>
              <div className="toolbar-btns">
                <button onClick={selectAll}>全选</button>
                <button onClick={clearSelect}>取消全选</button>
              </div>
            </div>

            <div className="image-batch-grid">
              {images.map(img => (
                <div
                  key={img.id}
                  className={`image-batch-item ${selectedIds.has(img.id) ? 'selected' : ''}`}
                  onClick={() => toggleImage(img.id)}
                >
                  <img
                    src={img.thumbUrl}
                    alt={img.filename}
                    className="image-batch-thumb"
                    loading="lazy"
                  />

                  {/* Checkbox + dimensions */}
                  <div className="image-batch-overlay">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(img.id)}
                      onChange={() => toggleImage(img.id)}
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="image-dim">{img.width}×{img.height}</span>
                  </div>

                  {/* Filename */}
                  <div className="image-batch-name" title={img.filename}>
                    {img.filename}
                  </div>

                  {/* Settings badge */}
                  {img.settings && (
                    <div className="settings-badge">
                      {settingsBadge(img.settings)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: settings panel */}
          <aside className="image-settings-panel">
            <ImageProcessSettings
              ref={settingsRef}
              selectedCount={selectedIds.size}
              onApply={applySettings}
              onClearSettings={clearSettings}
            />

            <button
              className="preview-settings-btn"
              onClick={handlePreview}
              disabled={selectedIds.size === 0}
              title="用当前设置预览第一张选中的图片"
            >
              预览效果
            </button>

            <hr className="panel-divider" />

            {/* Export format */}
            <div className="export-format-section">
              <h4>导出格式</h4>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    value="jpeg"
                    checked={exportFormat === 'jpeg'}
                    onChange={() => setExportFormat('jpeg')}
                  />
                  JPEG
                </label>
                <label>
                  <input
                    type="radio"
                    value="png"
                    checked={exportFormat === 'png'}
                    onChange={() => setExportFormat('png')}
                  />
                  PNG
                </label>
              </div>

              {exportFormat === 'jpeg' && (
                <div className="option-group" style={{ marginTop: '0.75rem' }}>
                  <label>JPEG 质量：{quality}</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={e => setQuality(Number(e.target.value))}
                    className="quality-slider"
                  />
                  <div className="quality-labels">
                    <span>低</span><span>高</span>
                  </div>
                </div>
              )}
            </div>

            <button
              className="process-button"
              onClick={handleProcess}
              disabled={processing || images.length === 0}
            >
              {processing ? '处理中…' : `处理并下载 ZIP（${images.length} 张）`}
            </button>
          </aside>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {images.length === 0 && !uploading && (
        <div className="image-empty-state">
          <div className="image-empty-icon">🖼️</div>
          <p>点击"选择文件夹"导入整个文件夹，或点击"选择图片"导入单张/多张图片</p>
          <p className="hint">支持格式：JPG、PNG、BMP、WebP、GIF、TIFF</p>
        </div>
      )}
    </div>
  );
}

export default ImageBatchProcessor;
