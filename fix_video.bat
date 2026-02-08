@echo off
echo ========================================
echo Video Fix Tool
echo ========================================
echo.

REM Change this path to your problematic video file
set VIDEO_PATH=C:\ComfyUI_workspace\ComfyUI_windows_portable\input\Wan2.2_I2V_V63_00116.mp4

echo Source file: %VIDEO_PATH%
echo.
echo This tool will re-encode the video to fix compatibility issues.
echo The fixed video will be saved as: %VIDEO_PATH:~0,-4%_fixed.mp4
echo.

cd backend
call venv\Scripts\activate

REM Run fix script
python fix_video.py "%VIDEO_PATH%"

echo.
pause
