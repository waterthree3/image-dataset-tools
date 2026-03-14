import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { useLang } from '../LangContext';

/**
 * 将秒数格式化为 M:SS.mmm
 */
const formatTime = (seconds) => {
  const totalSec = Math.floor(seconds);
  const ms = Math.round((seconds - totalSec) * 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};

/**
 * 时间轴截帧组件
 * 上传完成后展示：拖动时间轴实时预览帧，点击"添加此帧"将当前帧加入选取列表，
 * 最后按时间戳一次性导出ZIP。
 * 包含 AI 智能拆解面板，支持 OpenAI 兼容 / Anthropic API 配置。
 */
export const VideoTimeline = ({ videoData, onReset, initialFrames, onBack }) => {
  const { lang, t } = useLang();
  const { video_id, duration, fps, width, height, filename, duration_formatted } = videoData;

  const [currentTime, setCurrentTime] = useState(0);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [selectedFrames, setSelectedFrames] = useState(initialFrames || []); // [{time, thumbUrl}]
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('jpeg');
  const [exportQuality, setExportQuality] = useState(85);
  const [exportPrefix, setExportPrefix] = useState(
    filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_')
  );
  const [error, setError] = useState(null);

  // ── AI panel state ────────────────────────────────────────────────────────
  const [aiOpen, setAiOpen]           = useState(false);
  const [aiProvider, setAiProvider]   = useState('openai'); // 'openai' | 'anthropic' | 'custom'
  const [aiApiKey, setAiApiKey]       = useState('');
  const [aiModel, setAiModel]         = useState('gpt-4o');
  const [aiBaseUrl, setAiBaseUrl]     = useState('https://api.openai.com/v1');
  const [aiInterval, setAiInterval]   = useState(5);       // seconds between samples
  const [aiReqs, setAiReqs]           = useState('');      // requirements text
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResults, setAiResults]     = useState(null);    // { selected_frames, total_sampled, model }
  const [aiError, setAiError]         = useState(null);
  const skillFileRef = useRef(null);

  // Auto-fill model/URL when provider changes
  useEffect(() => {
    if (aiProvider === 'openai') {
      setAiModel('gpt-4o');
      setAiBaseUrl('https://api.openai.com/v1');
    } else if (aiProvider === 'anthropic') {
      setAiModel('claude-opus-4-6');
    }
  }, [aiProvider]);

  // ── Frame preview machinery ───────────────────────────────────────────────
  const debounceRef  = useRef(null);
  const fetchStateRef = useRef({ fetching: false, pending: null });
  const objectUrlRef  = useRef(null);
  const keyStateRef   = useRef({ a: false, d: false });
  const keyTimersRef  = useRef({ timerA: null, timerD: null, intervalA: null, intervalD: null });
  const frameStep     = fps > 0 ? 1 / fps : 1 / 30;

  const buildPreviewUrl = useCallback(
    (t) => `/api/videos/${video_id}/frame_at?time=${t.toFixed(4)}`,
    [video_id]
  );

  const fetchFrame = useCallback((t) => {
    const state = fetchStateRef.current;
    if (state.fetching) { state.pending = t; return; }
    state.fetching = true;
    fetch(buildPreviewUrl(t))
      .then((res) => res.blob())
      .then((blob) => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = URL.createObjectURL(blob);
        setPreviewSrc(objectUrlRef.current);
        state.fetching = false;
        if (state.pending !== null) {
          const next = state.pending;
          state.pending = null;
          fetchFrame(next);
        }
      })
      .catch(() => { state.fetching = false; });
  }, [buildPreviewUrl]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchFrame(currentTime), 60);
    return () => clearTimeout(debounceRef.current);
  }, [currentTime, fetchFrame]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const clampTime = (t) => Math.max(0, Math.min(duration, t));
  const stepFrame = (dir) => setCurrentTime((t) => clampTime(t + dir * frameStep));
  const jumpTime  = (delta) => setCurrentTime((t) => clampTime(t + delta));

  // A / D keyboard shortcuts
  useEffect(() => {
    const step = (dir) =>
      setCurrentTime((t) => Math.max(0, Math.min(duration, t + dir * frameStep)));

    const startRepeat = (dir, key) => {
      step(dir);
      keyTimersRef.current[`timer${key}`] = setTimeout(() => {
        keyTimersRef.current[`interval${key}`] = setInterval(() => step(dir), 80);
      }, 350);
    };

    const stopRepeat = (key) => {
      clearTimeout(keyTimersRef.current[`timer${key}`]);
      clearInterval(keyTimersRef.current[`interval${key}`]);
      keyTimersRef.current[`timer${key}`] = null;
      keyTimersRef.current[`interval${key}`] = null;
    };

    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'a' || e.key === 'A') && !keyStateRef.current.a) {
        keyStateRef.current.a = true;
        startRepeat(-1, 'A');
      } else if ((e.key === 'd' || e.key === 'D') && !keyStateRef.current.d) {
        keyStateRef.current.d = true;
        startRepeat(1, 'D');
      }
    };

    const onKeyUp = (e) => {
      if (e.key === 'a' || e.key === 'A') { keyStateRef.current.a = false; stopRepeat('A'); }
      else if (e.key === 'd' || e.key === 'D') { keyStateRef.current.d = false; stopRepeat('D'); }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
      stopRepeat('A');
      stopRepeat('D');
    };
  }, [duration, frameStep]);

  // ── Frame management ──────────────────────────────────────────────────────
  const addFrameAt = useCallback((time) => {
    const snap = Math.round(time * fps) / fps;
    const isDuplicate = selectedFrames.some((f) => Math.abs(f.time - snap) < frameStep * 0.5);
    if (!isDuplicate) {
      setSelectedFrames((prev) =>
        [...prev, { time: snap, thumbUrl: buildPreviewUrl(snap) }].sort((a, b) => a.time - b.time)
      );
    }
  }, [selectedFrames, fps, frameStep, buildPreviewUrl]);

  const addFrame = () => addFrameAt(currentTime);

  const removeFrame = (time) =>
    setSelectedFrames((prev) => prev.filter((f) => f.time !== time));

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (selectedFrames.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const timestamps = selectedFrames.map((f) => f.time);
      const resp = await api.exportFramesByTimestamps(
        video_id, timestamps, exportFormat, exportQuality, exportPrefix
      );
      const { export_id } = resp.data;

      const dlResp = await api.downloadExport(export_id);
      const blob = new Blob([dlResp.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportPrefix}_frames.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || t('导出失败，请重试', 'Export failed, please retry'));
    } finally {
      setExporting(false);
    }
  };

  // ── AI analysis ───────────────────────────────────────────────────────────
  const handleAiAnalyze = async () => {
    if (!aiApiKey.trim() || !aiReqs.trim()) return;
    setAiAnalyzing(true);
    setAiError(null);
    setAiResults(null);
    try {
      const resp = await api.aiAnalyzeVideo(video_id, {
        api_key:         aiApiKey.trim(),
        model:           aiModel.trim(),
        base_url:        aiProvider === 'anthropic' ? 'https://api.anthropic.com' : aiBaseUrl.trim(),
        api_format:      aiProvider === 'anthropic' ? 'anthropic' : 'openai',
        requirements:    aiReqs.trim(),
        sample_interval: aiInterval,
      });
      setAiResults(resp.data);
    } catch (err) {
      setAiError(err.response?.data?.error || err.message);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const addAllAiFrames = () => {
    if (!aiResults?.selected_frames) return;
    aiResults.selected_frames.forEach(f => addFrameAt(f.time));
  };

  const handleSkillImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') setAiReqs(ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="video-timeline">
      {/* 顶部：视频信息 + 重新上传 */}
      <div className="timeline-header">
        <div className="timeline-video-info">
          <h2 className="timeline-filename">{filename}</h2>
          <p className="timeline-meta">
            {width} × {height} · {fps.toFixed(2)} FPS · {duration_formatted}
          </p>
        </div>
        {onBack ? (
          <button className="timeline-reset-btn" onClick={() => onBack(selectedFrames)}>
            ← {t('返回列表', 'Back to List')}
          </button>
        ) : (
          <button className="timeline-reset-btn" onClick={onReset}>
            {t('换一个视频', 'Change Video')}
          </button>
        )}
      </div>

      {/* 帧预览区 */}
      <div className="timeline-preview-area">
        {previewSrc ? (
          <img src={previewSrc} alt={t('帧预览', 'Frame preview')} className="timeline-preview-img" />
        ) : (
          <div className="timeline-preview-placeholder">{t('加载中...', 'Loading...')}</div>
        )}
        <div className="preview-time-badge">{formatTime(currentTime)}</div>
      </div>

      {/* 时间轴控制区 */}
      <div className="timeline-controls">
        <div className="timeline-nav">
          <button className="tl-btn" onClick={() => jumpTime(-10)} title={t('后退10秒', 'Back 10s')}>⏪ 10s</button>
          <button className="tl-btn" onClick={() => stepFrame(-1)} title={t('上一帧 (A)', 'Prev Frame (A)')}>◀</button>
          <span className="tl-time-display">
            {formatTime(currentTime)} / {duration_formatted}
          </span>
          <button className="tl-btn" onClick={() => stepFrame(1)} title={t('下一帧 (D)', 'Next Frame (D)')}>▶</button>
          <button className="tl-btn" onClick={() => jumpTime(10)} title={t('前进10秒', 'Forward 10s')}>10s ⏩</button>
        </div>
        <p className="tl-key-hint">
          {t('键盘快捷键：按住', 'Keyboard: Hold')} <kbd>A</kbd>{' '}
          {t('快退 · 按住', 'rewind · Hold')} <kbd>D</kbd>{' '}
          {t('快进（逐帧）', 'advance (frame by frame)')}
        </p>

        <input
          type="range"
          min="0"
          max={duration}
          step="any"
          value={currentTime}
          onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
          className="timeline-slider"
        />

        <button className="add-frame-btn" onClick={addFrame}>
          + {t('添加此帧', 'Add Frame')}
        </button>
      </div>

      {/* 已选帧列表 */}
      <div className="selected-frames-panel">
        <div className="selected-frames-header">
          <h3>{lang === 'zh' ? `已选帧 (${selectedFrames.length})` : `Selected Frames (${selectedFrames.length})`}</h3>
          {selectedFrames.length > 0 && (
            <button className="tl-clear-btn" onClick={() => setSelectedFrames([])}>
              {t('清空', 'Clear')}
            </button>
          )}
        </div>

        {selectedFrames.length === 0 ? (
          <p className="tl-empty-hint">
            {t('拖动时间轴到目标画面，点击「添加此帧」进行采集',
               'Drag the timeline to the target frame, then click 「Add Frame」')}
          </p>
        ) : (
          <div className="selected-frames-strip">
            {selectedFrames.map((frame) => (
              <div key={frame.time} className="selected-frame-item">
                <img
                  src={frame.thumbUrl}
                  alt={formatTime(frame.time)}
                  onClick={() => setCurrentTime(frame.time)}
                  title={t('点击跳转到该时间点', 'Click to jump to this time')}
                />
                <span className="frame-time-label">{formatTime(frame.time)}</span>
                <button
                  className="remove-frame-btn"
                  onClick={() => removeFrame(frame.time)}
                  title={t('移除此帧', 'Remove')}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AI 智能拆解面板 ─────────────────────────────────── */}
      <div className="ai-panel">
        <button
          className="ai-panel-toggle"
          onClick={() => setAiOpen(v => !v)}
        >
          <span>🤖 {t('AI 智能拆解', 'AI Smart Split')}</span>
          <span className="ai-toggle-arrow">{aiOpen ? '▲' : '▼'}</span>
        </button>

        {aiOpen && (
          <div className="ai-panel-body">
            {/* Provider tabs */}
            <div className="ai-provider-row">
              <span className="ai-field-label">{t('API 接口', 'API Provider')}</span>
              <div className="ai-provider-tabs">
                {['openai', 'anthropic', 'custom'].map(p => (
                  <button
                    key={p}
                    className={`ai-provider-tab ${aiProvider === p ? 'active' : ''}`}
                    onClick={() => setAiProvider(p)}
                  >
                    {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : t('自定义', 'Custom')}
                  </button>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div className="ai-field-row">
              <label className="ai-field-label">API Key</label>
              <input
                type="password"
                className="ai-text-input"
                value={aiApiKey}
                onChange={e => setAiApiKey(e.target.value)}
                placeholder={t('输入 API Key', 'Enter API Key')}
                autoComplete="off"
              />
            </div>

            {/* Model */}
            <div className="ai-field-row">
              <label className="ai-field-label">{t('模型', 'Model')}</label>
              <input
                type="text"
                className="ai-text-input"
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                placeholder="gpt-4o"
              />
            </div>

            {/* Base URL (shown for openai / custom) */}
            {aiProvider !== 'anthropic' && (
              <div className="ai-field-row">
                <label className="ai-field-label">Base URL</label>
                <input
                  type="text"
                  className="ai-text-input"
                  value={aiBaseUrl}
                  onChange={e => setAiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
            )}

            {/* Sample interval */}
            <div className="ai-field-row">
              <label className="ai-field-label">{t('采样间隔', 'Sample Every')}</label>
              <div className="ai-interval-group">
                {[2, 5, 10, 30].map(s => (
                  <button
                    key={s}
                    className={`ai-interval-btn ${aiInterval === s ? 'active' : ''}`}
                    onClick={() => setAiInterval(s)}
                  >
                    {s}s
                  </button>
                ))}
                <input
                  type="number"
                  className="ai-interval-input"
                  min="1"
                  max="300"
                  value={aiInterval}
                  onChange={e => setAiInterval(Math.max(1, parseInt(e.target.value) || 5))}
                />
                <span className="ai-interval-unit">s</span>
              </div>
            </div>

            {/* Requirements */}
            <div className="ai-field-row ai-field-col">
              <div className="ai-reqs-header">
                <label className="ai-field-label">
                  {t('拆解需求', 'Requirements')}
                </label>
                <div className="ai-reqs-actions">
                  <button
                    className="ai-import-btn"
                    onClick={() => skillFileRef.current?.click()}
                    title={t('从文件导入需求', 'Import requirements from file')}
                  >
                    📄 {t('导入文件', 'Import File')}
                  </button>
                  {aiReqs && (
                    <button className="ai-clear-reqs-btn" onClick={() => setAiReqs('')}>
                      {t('清空', 'Clear')}
                    </button>
                  )}
                </div>
              </div>
              <textarea
                className="ai-reqs-textarea"
                value={aiReqs}
                onChange={e => setAiReqs(e.target.value)}
                placeholder={t(
                  '描述你想提取的画面，例如：\n· 找出所有包含人物的特写镜头\n· 筛选出场景切换的关键帧\n· 提取所有字幕出现的帧',
                  'Describe the frames you want to extract, e.g.:\n· Find all close-up shots with people\n· Select key frames at scene transitions\n· Extract frames where subtitles appear'
                )}
                rows={4}
              />
              <input
                ref={skillFileRef}
                type="file"
                accept=".md,.txt,.skill"
                style={{ display: 'none' }}
                onChange={handleSkillImport}
              />
            </div>

            {/* Analyze button */}
            <button
              className="ai-analyze-btn"
              onClick={handleAiAnalyze}
              disabled={aiAnalyzing || !aiApiKey.trim() || !aiReqs.trim()}
            >
              {aiAnalyzing
                ? t('AI 分析中…', 'Analyzing…')
                : t('🤖 开始 AI 分析', '🤖 Start AI Analysis')}
            </button>

            {aiAnalyzing && (
              <div className="ai-analyzing-hint">
                {t('正在对视频进行采样并调用 AI，请稍候…', 'Sampling video and calling AI, please wait…')}
              </div>
            )}

            {/* Error */}
            {aiError && <div className="error-message">❌ {aiError}</div>}

            {/* Results */}
            {aiResults && (
              <div className="ai-results">
                <div className="ai-results-header">
                  <span className="ai-results-summary">
                    {lang === 'zh'
                      ? `AI 从 ${aiResults.total_sampled} 个采样帧中选出了 ${aiResults.selected_frames.length} 帧`
                      : `AI selected ${aiResults.selected_frames.length} of ${aiResults.total_sampled} sampled frames`}
                  </span>
                  {aiResults.selected_frames.length > 0 && (
                    <button className="ai-add-all-btn" onClick={addAllAiFrames}>
                      {t('全部添加到选取列表', 'Add All to Selection')}
                    </button>
                  )}
                </div>

                {aiResults.selected_frames.length === 0 ? (
                  <p className="ai-no-results">
                    {t('AI 未找到匹配的帧，请尝试修改需求描述或增大采样间隔',
                       'No matching frames found. Try refining requirements or adjusting the sample interval.')}
                  </p>
                ) : (
                  <div className="ai-result-list">
                    {aiResults.selected_frames.map((item) => (
                      <div key={item.time} className="ai-result-item">
                        <div className="ai-result-left">
                          <img
                            src={buildPreviewUrl(item.time)}
                            alt={formatTime(item.time)}
                            className="ai-result-thumb"
                            onClick={() => setCurrentTime(item.time)}
                            title={t('点击跳转', 'Click to jump')}
                          />
                          <span className="ai-result-time">{formatTime(item.time)}</span>
                        </div>
                        <p className="ai-result-reason">{item.reason}</p>
                        <button
                          className="ai-add-frame-btn"
                          onClick={() => addFrameAt(item.time)}
                          title={t('添加到选取列表', 'Add to selection')}
                        >+</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 导出面板 */}
      {selectedFrames.length > 0 && (
        <div className="timeline-export-panel">
          <div className="tl-export-options">
            <div className="tl-export-row">
              <label>{t('格式：', 'Format:')}</label>
              <label className="tl-radio">
                <input type="radio" value="jpeg" checked={exportFormat === 'jpeg'}
                  onChange={() => setExportFormat('jpeg')} />
                JPEG
              </label>
              <label className="tl-radio">
                <input type="radio" value="png" checked={exportFormat === 'png'}
                  onChange={() => setExportFormat('png')} />
                PNG
              </label>
            </div>

            {exportFormat === 'jpeg' && (
              <div className="tl-export-row">
                <label>{t('质量：', 'Quality: ')}{exportQuality}</label>
                <input
                  type="range" min="1" max="100" value={exportQuality}
                  onChange={(e) => setExportQuality(parseInt(e.target.value))}
                  className="tl-quality-slider"
                />
              </div>
            )}

            <div className="tl-export-row">
              <label>{t('文件名前缀：', 'Filename Prefix:')}</label>
              <input
                type="text" value={exportPrefix}
                onChange={(e) => setExportPrefix(e.target.value)}
                className="tl-prefix-input"
                placeholder="frame"
              />
            </div>
          </div>

          <button className="tl-export-btn" onClick={handleExport} disabled={exporting}>
            {exporting
              ? t('导出中...', 'Exporting...')
              : lang === 'zh'
                ? `导出并下载 ZIP（${selectedFrames.length} 帧）`
                : `Export & Download ZIP (${selectedFrames.length} frames)`}
          </button>

          {error && <div className="error-message">❌ {error}</div>}
        </div>
      )}
    </div>
  );
};

export default VideoTimeline;
