# Video Fix Guide

## Problem

If you see ffmpeg errors like:
```
[swscaler @ ...] Slice parameters 0, 679 are invalid
```

And all frames appear black with mean=0.00, this indicates a video encoding compatibility issue.

## Solution

### Quick Fix (Recommended)

1. **Edit the video path** in `fix_video.bat`:
   ```batch
   set VIDEO_PATH=C:\path\to\your\video.mp4
   ```

2. **Run the batch file**:
   ```
   fix_video.bat
   ```

3. **Use the fixed video** (will be saved as `video_fixed.mp4`)

### Manual Fix

If you prefer to run the Python script directly:

```bash
cd backend
venv\Scripts\activate
python fix_video.py "C:\path\to\your\video.mp4"
```

## What Does the Fix Do?

The fix tool re-encodes your video with these settings:
- **Codec**: H.264 (libx264) - widely compatible
- **Pixel format**: yuv420p - most compatible format
- **Quality**: CRF 18 - visually lossless
- **Audio**: Copied without re-encoding

This resolves most ffmpeg compatibility issues while maintaining high quality.

## Requirements

- **FFmpeg** must be installed on your system
- Windows: Download from https://ffmpeg.org/download.html
- Or install via: `winget install ffmpeg`

## Still Having Issues?

If the problem persists after re-encoding:

1. Check if ffmpeg is installed: `ffmpeg -version`
2. Try opening the fixed video in a media player to verify it works
3. Check the debug output for other error messages

## Alternative: Use Different Video Source

If re-encoding doesn't help, the original video file may be corrupted. Try:
1. Re-exporting the video from your source application
2. Using a different video file
3. Converting with a different tool (e.g., HandBrake, VLC)
