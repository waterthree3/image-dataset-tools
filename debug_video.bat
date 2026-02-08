@echo off
echo ========================================
echo Video Debug Tool
echo ========================================
echo.

REM Change this path to your video file
set VIDEO_PATH=C:\ComfyUI_workspace\ComfyUI_windows_portable\input\Wan2.2_I2V_V63_00116.mp4

echo Target file: %VIDEO_PATH%
echo.

cd backend
call venv\Scripts\activate

REM Run debug script
python debug_video.py "%VIDEO_PATH%"

echo.
echo ========================================
echo Debug Complete
echo ========================================
echo Check the generated test images in backend directory:
echo   - test_frame_0.jpg      (first frame)
echo   - test_frame_middle.jpg (middle frame)
echo.
pause
