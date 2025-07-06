#!/bin/bash

# Music Sync Server - Node.js版本启动脚本

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Music Sync Server - Node.js版本${NC}"
echo "================================="

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: Node.js 未安装${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "Node.js版本: $NODE_VERSION"

# 检查npm版本
if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: npm 未安装${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "npm版本: $NPM_VERSION"

# 检查package.json
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: package.json 文件不存在${NC}"
    exit 1
fi

# 检查依赖
echo "检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}依赖安装成功${NC}"
    else
        echo -e "${RED}依赖安装失败${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}依赖已存在${NC}"
fi

# 加载环境变量
if [ -f ".env" ]; then
    echo "加载环境变量..."
    export $(grep -v '^#' .env | xargs)
    echo -e "${GREEN}环境变量加载成功${NC}"
else
    echo -e "${YELLOW}警告: .env 文件不存在，使用默认配置${NC}"
    echo "可以复制 .env.example 为 .env 并修改配置"
fi

# 设置默认环境变量
export NODE_ENV=${NODE_ENV:-development}
export PORT=${PORT:-3000}

echo "服务器配置:"
echo "  环境: $NODE_ENV"
echo "  端口: $PORT"
echo ""

# 检查端口是否被占用
if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
    echo -e "${YELLOW}警告: 端口 $PORT 已被占用${NC}"
    echo "请检查是否有其他进程正在使用该端口"
fi

# 启动服务器
echo -e "${GREEN}启动服务器...${NC}"
echo "访问地址: http://localhost:$PORT"
echo "按 Ctrl+C 停止服务器"
echo ""

# 根据环境选择启动方式
if [ "$NODE_ENV" = "development" ]; then
    if command -v nodemon &> /dev/null; then
        echo "使用 nodemon 启动开发模式"
        nodemon server.js
    else
        echo "nodemon 未安装，使用 node 启动"
        node server.js
    fi
else
    echo "生产模式启动"
    node server.js
fi