@echo off
REM Music Sync Server - Python版本启动脚本 (Windows)

title Music Sync Server - Python
color 0A

echo Music Sync Server - Python版本
echo =================================

REM 检查Python版本
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: Python 未安装
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Python版本: %PYTHON_VERSION%

REM 检查虚拟环境
if defined VIRTUAL_ENV (
    echo 虚拟环境已激活: %VIRTUAL_ENV%
) else (
    echo 警告: 未检测到虚拟环境
    echo 推荐使用虚拟环境：
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo.
)

REM 检查依赖
echo 检查依赖...
if exist requirements.txt (
    python -m pip install -r requirements.txt
    if %errorlevel% equ 0 (
        echo 依赖安装成功
    ) else (
        echo 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo 错误: requirements.txt 文件不存在
    pause
    exit /b 1
)

REM 设置环境变量
if not defined FLASK_ENV set FLASK_ENV=production
if not defined PORT set PORT=3000

echo 服务器配置:
echo   环境: %FLASK_ENV%
echo   端口: %PORT%
echo.

REM 启动服务器
echo 启动服务器...
echo 访问地址: http://localhost:%PORT%
echo 按 Ctrl+C 停止服务器
echo.

python server.py

pause