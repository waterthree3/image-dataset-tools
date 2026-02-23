import { useState, useImperativeHandle, forwardRef } from 'react';

const RATIO_PRESETS = [
  { label: '1:1',  w: 1,  h: 1  },
  { label: '4:3',  w: 4,  h: 3  },
  { label: '3:2',  w: 3,  h: 2  },
  { label: '16:9', w: 16, h: 9  },
  { label: '21:9', w: 21, h: 9  },
  { label: '9:16', w: 9,  h: 16 },
  { label: '2:3',  w: 2,  h: 3  },
  { label: '3:4',  w: 3,  h: 4  },
];

// 3×3 alignment grid cells: [label, anchor_x, anchor_y]
const ALIGN_CELLS = [
  ['↖', 0,   0  ], ['↑', 0.5, 0  ], ['↗', 1,   0  ],
  ['←', 0,   0.5], ['·', 0.5, 0.5], ['→', 1,   0.5],
  ['↙', 0,   1  ], ['↓', 0.5, 1  ], ['↘', 1,   1  ],
];

/**
 * Settings panel for image processing.
 *
 * Props:
 *   selectedCount   – number of currently selected images
 *   onApply         – (settings) => void
 *   onClearSettings – () => void
 */
const ImageProcessSettings = forwardRef(function ImageProcessSettings(
  { selectedCount, onApply, onClearSettings }, ref
) {
  const [mode, setMode] = useState('scale');

  // Scale mode
  const [maxWidth,  setMaxWidth]  = useState('');
  const [maxHeight, setMaxHeight] = useState('');

  // Crop / Pad shared
  const [ratioW, setRatioW] = useState(16);
  const [ratioH, setRatioH] = useState(9);
  const [outputWidth,  setOutputWidth]  = useState('');
  const [outputHeight, setOutputHeight] = useState('');

  // Crop anchor (0–100 for slider, converted to 0–1 on send)
  const [cropAnchorX, setCropAnchorX] = useState(50);
  const [cropAnchorY, setCropAnchorY] = useState(50);

  // Pad alignment (anchor_x / anchor_y as 0 | 0.5 | 1)
  const [padAnchorX, setPadAnchorX] = useState(0.5);
  const [padAnchorY, setPadAnchorY] = useState(0.5);

  const selectPreset = (w, h) => { setRatioW(w); setRatioH(h); };

  // Expose current settings to parent via ref
  useImperativeHandle(ref, () => ({
    getCurrentSettings: () => ({
      mode,
      max_width:     maxWidth  ? parseInt(maxWidth,  10) : 0,
      max_height:    maxHeight ? parseInt(maxHeight, 10) : 0,
      ratio_w:       parseInt(ratioW, 10) || 16,
      ratio_h:       parseInt(ratioH, 10) || 9,
      output_width:  outputWidth  ? parseInt(outputWidth,  10) : null,
      output_height: outputHeight ? parseInt(outputHeight, 10) : null,
      anchor_x: mode === 'crop' ? cropAnchorX / 100 : padAnchorX,
      anchor_y: mode === 'crop' ? cropAnchorY / 100 : padAnchorY,
    }),
  }));

  const handleApply = () => {
    onApply({
      mode,
      maxWidth:     maxWidth  ? parseInt(maxWidth,  10) : 0,
      maxHeight:    maxHeight ? parseInt(maxHeight, 10) : 0,
      ratioW:       parseInt(ratioW, 10) || 16,
      ratioH:       parseInt(ratioH, 10) || 9,
      outputWidth:  outputWidth  ? parseInt(outputWidth,  10) : null,
      outputHeight: outputHeight ? parseInt(outputHeight, 10) : null,
      anchorX: mode === 'crop' ? cropAnchorX / 100 : padAnchorX,
      anchorY: mode === 'crop' ? cropAnchorY / 100 : padAnchorY,
    });
  };

  return (
    <div className="image-process-settings">
      <h3>处理设置</h3>

      {selectedCount === 0 && (
        <p className="settings-hint">请先在左侧选择图片，再配置处理方式</p>
      )}

      {/* Mode selector */}
      <div className="option-group">
        <label>处理模式</label>
        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'scale' ? 'active' : ''}`}
            onClick={() => setMode('scale')}
            title="保持宽高比缩放到指定最大尺寸"
          >缩放</button>
          <button
            className={`mode-tab ${mode === 'crop' ? 'active' : ''}`}
            onClick={() => setMode('crop')}
            title="裁切到目标宽高比"
          >裁切</button>
          <button
            className={`mode-tab ${mode === 'pad' ? 'active' : ''}`}
            onClick={() => setMode('pad')}
            title="填充黑边到目标宽高比"
          >填黑边</button>
        </div>
      </div>

      {/* ── Scale ─────────────────────────────────────── */}
      {mode === 'scale' && (
        <div className="mode-settings">
          <p className="mode-desc">
            保持原始宽高比缩放，图片不超过设定的最大尺寸。留空表示该方向不限制。
          </p>
          <div className="size-inputs">
            <div className="size-input-group">
              <label>最大宽度 (px)</label>
              <input type="number" placeholder="不限" value={maxWidth}
                onChange={e => setMaxWidth(e.target.value)} min="1" className="size-input" />
            </div>
            <span className="size-sep">×</span>
            <div className="size-input-group">
              <label>最大高度 (px)</label>
              <input type="number" placeholder="不限" value={maxHeight}
                onChange={e => setMaxHeight(e.target.value)} min="1" className="size-input" />
            </div>
          </div>
        </div>
      )}

      {/* ── Crop ──────────────────────────────────────── */}
      {mode === 'crop' && (
        <div className="mode-settings">
          <p className="mode-desc">
            裁切到目标宽高比，超出比例的部分被移除。通过下方滑块控制保留哪个区域。
          </p>
          <RatioSelector
            ratioW={ratioW} ratioH={ratioH}
            setRatioW={setRatioW} setRatioH={setRatioH}
            onPreset={selectPreset}
          />

          {/* Crop position sliders */}
          <div className="option-group crop-anchor-group">
            <label>裁切位置</label>
            <div className="anchor-slider-row">
              <span className="anchor-label-side">左</span>
              <input type="range" min="0" max="100" value={cropAnchorX}
                onChange={e => setCropAnchorX(Number(e.target.value))}
                className="anchor-slider" />
              <span className="anchor-label-side">右</span>
            </div>
            <div className="anchor-slider-desc">水平（图片过宽时生效）</div>
            <div className="anchor-slider-row" style={{ marginTop: '0.5rem' }}>
              <span className="anchor-label-side">上</span>
              <input type="range" min="0" max="100" value={cropAnchorY}
                onChange={e => setCropAnchorY(Number(e.target.value))}
                className="anchor-slider" />
              <span className="anchor-label-side">下</span>
            </div>
            <div className="anchor-slider-desc">垂直（图片过高时生效）</div>
          </div>

          <OutputSizeInputs
            outputWidth={outputWidth} outputHeight={outputHeight}
            setOutputWidth={setOutputWidth} setOutputHeight={setOutputHeight}
          />
        </div>
      )}

      {/* ── Pad ───────────────────────────────────────── */}
      {mode === 'pad' && (
        <div className="mode-settings">
          <p className="mode-desc">
            在图片周围填充黑边以达到目标宽高比。通过对齐格控制图片在画布中的位置。
          </p>
          <RatioSelector
            ratioW={ratioW} ratioH={ratioH}
            setRatioW={setRatioW} setRatioH={setRatioH}
            onPreset={selectPreset}
          />

          {/* Pad alignment grid */}
          <div className="option-group">
            <label>图片对齐</label>
            <div className="align-grid">
              {ALIGN_CELLS.map(([label, ax, ay]) => (
                <button
                  key={`${ax}-${ay}`}
                  className={`align-cell ${padAnchorX === ax && padAnchorY === ay ? 'active' : ''}`}
                  onClick={() => { setPadAnchorX(ax); setPadAnchorY(ay); }}
                  title={`水平${Math.round(ax * 100)}% 垂直${Math.round(ay * 100)}%`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <OutputSizeInputs
            outputWidth={outputWidth} outputHeight={outputHeight}
            setOutputWidth={setOutputWidth} setOutputHeight={setOutputHeight}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="settings-actions">
        <button
          className="apply-settings-btn"
          onClick={handleApply}
          disabled={selectedCount === 0}
        >
          应用到已选 ({selectedCount})
        </button>
        <button
          className="clear-settings-btn"
          onClick={onClearSettings}
          disabled={selectedCount === 0}
        >
          清除设置
        </button>
      </div>

    </div>
  );
});

/** Shared ratio selector. */
function RatioSelector({ ratioW, ratioH, setRatioW, setRatioH, onPreset }) {
  return (
    <div className="option-group">
      <label>目标宽高比</label>
      <div className="ratio-presets">
        {RATIO_PRESETS.map(p => (
          <button
            key={p.label}
            className={`ratio-preset-btn ${Number(ratioW) === p.w && Number(ratioH) === p.h ? 'active' : ''}`}
            onClick={() => onPreset(p.w, p.h)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="ratio-custom">
        <input type="number" value={ratioW} onChange={e => setRatioW(e.target.value)}
          min="1" className="ratio-input" />
        <span className="ratio-colon">:</span>
        <input type="number" value={ratioH} onChange={e => setRatioH(e.target.value)}
          min="1" className="ratio-input" />
      </div>
    </div>
  );
}

/** Optional output dimensions for crop/pad modes. */
function OutputSizeInputs({ outputWidth, outputHeight, setOutputWidth, setOutputHeight }) {
  return (
    <div className="option-group">
      <label>输出尺寸（可选，留空则保持像素量）</label>
      <div className="size-inputs">
        <div className="size-input-group">
          <label>宽度 (px)</label>
          <input type="number" placeholder="自动" value={outputWidth}
            onChange={e => setOutputWidth(e.target.value)} min="1" className="size-input" />
        </div>
        <span className="size-sep">×</span>
        <div className="size-input-group">
          <label>高度 (px)</label>
          <input type="number" placeholder="自动" value={outputHeight}
            onChange={e => setOutputHeight(e.target.value)} min="1" className="size-input" />
        </div>
      </div>
    </div>
  );
}

export default ImageProcessSettings;
export { ALIGN_CELLS };
