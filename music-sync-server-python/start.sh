#!/bin/bash

# Music Sync Server - Python版本启动脚本

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Music Sync Server - Python版本${NC}"
echo "================================="

# 检查Python版本
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}错误: Python 3 未安装${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python版本: $PYTHON_VERSION"

# 检查虚拟环境
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo -e "${GREEN}虚拟环境已激活: $VIRTUAL_ENV${NC}"
else
    echo -e "${YELLOW}警告: 未检测到虚拟环境${NC}"
    echo "推荐使用虚拟环境："
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo ""
fi

# 检查依赖
echo "检查依赖..."
if [ -f "requirements.txt" ]; then
    python3 -m pip install -r requirements.txt
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}依赖安装成功${NC}"
    else
        echo -e "${RED}依赖安装失败${NC}"
        exit 1
    fi
else
    echo -e "${RED}错误: requirements.txt 文件不存在${NC}"
    exit 1
fi

# 设置环境变量
export FLASK_ENV=${FLASK_ENV:-production}
export PORT=${PORT:-3000}

echo "服务器配置:"
echo "  环境: $FLASK_ENV"
echo "  端口: $PORT"
echo ""

# 启动服务器
echo -e "${GREEN}启动服务器...${NC}"
echo "访问地址: http://localhost:$PORT"
echo "按 Ctrl+C 停止服务器"
echo ""

python3 server.py