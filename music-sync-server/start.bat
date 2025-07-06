@echo off
chcp 65001 >nul 2>&1
REM Music Sync Server - Node.js版本启动脚本 (Windows)

title Music Sync Server - Node.js
color 0A

echo Music Sync Server - Node.js版本
echo =================================

REM 检查Node.js版本
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: Node.js 未安装
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js版本: %NODE_VERSION%

REM 检查npm版本
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: npm 未安装
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo npm版本: %NPM_VERSION%

REM 检查package.json
if not exist package.json (
    echo 错误: package.json 文件不存在
    pause
    exit /b 1
)

REM 检查依赖
echo 检查依赖...
if not exist node_modules (
    echo 正在安装依赖...
    npm install
    if %errorlevel% equ 0 (
        echo 依赖安装成功
    ) else (
        echo 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo 依赖已存在
)

REM 加载环境变量
if exist .env (
    echo 加载环境变量...
    for /f "usebackq tokens=1,2 delims==" %%i in (".env") do (
        if not "%%i"=="" if not "%%i:~0,1%"=="#" set %%i=%%j
    )
    echo 环境变量加载成功
) else (
    echo 警告: .env 文件不存在，使用默认配置
    echo 可以复制 .env.example 为 .env 并修改配置
)

REM 设置默认环境变量
if not defined NODE_ENV set NODE_ENV=development
if not defined PORT set PORT=3000

echo 服务器配置:
echo   环境: %NODE_ENV%
echo   端口: %PORT%
echo.

REM 检查端口是否被占用
netstat -an | findstr ":%PORT% " >nul 2>&1
if %errorlevel% equ 0 (
    echo 警告: 端口 %PORT% 已被占用
    echo 请检查是否有其他进程正在使用该端口
)

REM 启动服务器
echo 启动服务器...
echo 访问地址: http://localhost:%PORT%
echo 按 Ctrl+C 停止服务器
echo.

REM 根据环境选择启动方式
if "%NODE_ENV%"=="development" (
    where nodemon >nul 2>&1
    if %errorlevel% equ 0 (
        echo 使用 nodemon 启动开发模式
        nodemon server.js
    ) else (
        echo nodemon 未安装，使用 node 启动
        node server.js
    )
) else (
    echo 生产模式启动
    node server.js
)

pause