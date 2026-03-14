import { useLang } from '../LangContext';

const VIDEO_EXTS = ['mp4', 'avi', 'mov', 'mkv'];

/**
 * Folder list view: shows all video files from a selected folder.
 * Props:
 *   files        – File[] of all video files from the folder
 *   folderState  – { [filename]: { videoData, frames, uploading, error } }
 *   onSelectVideo – (file: File) => void  — called when user clicks a video card
 *   onExitFolder  – () => void            — go back to the single-upload home screen
 */
export function VideoFolderList({ files, folderState, onSelectVideo, onExitFolder }) {
  const { t, lang } = useLang();

  return (
    <div className="folder-list-view">
      <div className="folder-list-header">
        <button className="folder-exit-btn" onClick={onExitFolder}>
          ← {t('重新选择', 'Change Folder')}
        </button>
        <h2 className="folder-list-title">
          {lang === 'zh'
            ? `文件夹内共 ${files.length} 个视频`
            : `${files.length} video${files.length !== 1 ? 's' : ''} in folder`}
        </h2>
      </div>

      <div className="folder-video-grid">
        {files.map((file) => {
          const state = folderState[file.name] || {};
          const frameCount = state.frames?.length || 0;
          const isUploading = !!state.uploading;
          const hasError = !!state.error;

          return (
            <div
              key={file.name}
              className={`folder-video-card${isUploading ? ' uploading' : ''}${hasError ? ' has-error' : ''}`}
              onClick={() => !isUploading && onSelectVideo(file)}
              title={file.name}
            >
              <div className="folder-video-icon">
                {isUploading ? '⏳' : hasError ? '❌' : '🎬'}
              </div>

              <div className="folder-video-info">
                <p className="folder-video-name">{file.name}</p>
                <p className="folder-video-size">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>

              <div className="folder-video-badges">
                {frameCount > 0 && (
                  <span className="folder-frame-badge">
                    {frameCount} {t('帧', 'frames')}
                  </span>
                )}
                {isUploading && (
                  <span className="folder-status-badge uploading-badge">
                    {t('上传中…', 'Uploading…')}
                  </span>
                )}
                {hasError && !isUploading && (
                  <span className="folder-status-badge error-badge">
                    {t('上传失败', 'Failed')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { VIDEO_EXTS };
export default VideoFolderList;
