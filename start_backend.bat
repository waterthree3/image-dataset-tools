@echo off
echo ========================================
echo 启动视频拆解器后端服务器
echo ========================================
cd backend
call venv\Scripts\activate
python app.py
pause
