# 🎵 Moring 音乐台

基于 GD Studio 音乐聚合API 的现代化在线音乐播放平台，支持多音乐源搜索与播放。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=flat&logo=javascript&logoColor=%23F7DF1E)
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=flat&logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/python-3670A0?style=flat&logo=python&logoColor=ffdd54)

## ✨ 功能特色

- 🔍 **多音乐源聚合搜索** - 支持12个主流音乐平台
- 🎼 **无损音质播放** - 支持999k无损、320k高品质等多种音质
- 📝 **实时歌词显示** - 自动同步歌词高亮显示
- ❤️ **收藏夹功能** - 本地存储个人收藏歌曲
- 📱 **响应式设计** - 完美适配桌面端、平板和手机
- 🎨 **现代化UI** - 玻璃态设计风格，流畅动画效果
- 👥 **一起听功能** - 创建或加入房间与好友同步听歌
- 🎵 **播放列表管理** - 添加、删除、排序播放列表
- ⌨️ **键盘快捷键** - 支持空格播放/暂停等快捷操作
- 🔄 **实时同步服务器** - Node.js 和 Python 双版本支持

## 🎯 支持的音乐源

| 平台 | 状态 | 备注 |
|------|------|------|
| 网易云音乐 | ✅ | NetEase Cloud Music |
| QQ音乐 | ✅ | Tencent Music |
| 咪咕音乐 | ✅ | Migu Music |
| 酷狗音乐 | ✅ | KuGou Music |
| 酷我音乐 | ✅ | KuWo Music |
| 喜马拉雅 | ✅ | Ximalaya |
| TIDAL | ✅ | TIDAL HiFi |
| Spotify | ✅ | Spotify |
| YouTube Music | ✅ | YouTube Music |
| Qobuz | ✅ | Qobuz |
| JOOX | ✅ | JOOX |
| Deezer | ✅ | Deezer |

## 🚀 快速开始

### 前端部署

1. **克隆项目**
   ```bash
   git clone https://github.com/q3cc/music.git
   cd music
   ```

2. **启动前端服务器**
   
   使用 Python:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   或使用 Node.js:
   ```bash
   npx http-server
   ```

3. **访问应用**
   
   打开浏览器访问 `http://localhost:8000`

### 服务端部署（一起听功能）

项目提供两个版本的同步服务器，任选其一：

#### Node.js 版本（推荐）

```bash
# 进入 Node.js 服务器目录
cd music-sync-server

# 安装依赖
npm install

# 配置环境变量（可选）
cp .env.example .env

# 启动服务器
npm start              # 生产模式
npm run dev           # 开发模式
./start.sh            # 使用启动脚本
```

#### Python 版本

```bash
# 进入 Python 服务器目录
cd music-sync-server-python

# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务器
python server.py      # 直接启动
./start.sh           # 使用启动脚本
```

#### 服务器配置

默认配置下，同步服务器运行在端口 **3000**，如需修改：

- **Node.js**: 修改 `.env` 文件或设置环境变量 `PORT=3000`
- **Python**: 修改 `.env` 文件或设置环境变量 `PORT=3000`

确保前端的 Socket.IO 连接地址指向正确的服务器：
```javascript
// script.js 中的连接地址
socket = io('http://localhost:3000'); // 修改为你的服务器地址
```

## 📱 使用说明

### 基础功能

1. **搜索音乐**
   - 在搜索框输入歌曲名、歌手名或专辑名
   - 选择音乐源和音质
   - 点击搜索或按Enter键

2. **播放控制**
   - 点击歌曲即可播放
   - 使用底部播放器控制播放/暂停、上一首/下一首
   - 拖拽进度条调节播放进度

3. **收藏管理**
   - 点击歌曲旁的心形图标收藏
   - 在"我的收藏"页面查看所有收藏歌曲

### 高级功能

1. **一起听**
   - 创建房间：点击"创建房间"获得6位房间号
   - 加入房间：输入房间号加入好友的房间
   - 房间内音乐播放状态会自动同步

2. **播放列表**
   - 点击右侧播放列表图标打开播放列表
   - 添加歌曲到播放列表
   - 管理播放队列

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放/暂停 |
| `←` | 上一首 |
| `→` | 下一首 |
| `↑` | 增加音量 |
| `↓` | 减少音量 |
| `F` | 收藏当前歌曲 |
| `L` | 显示歌词 |
| `Esc` | 关闭弹窗 |

## 🛠️ 技术栈

### 前端技术
- **前端框架**: 原生 HTML5 + CSS3 + JavaScript ES6+
- **CSS框架**: 自定义CSS变量系统，玻璃态设计
- **字体图标**: Font Awesome 6.4.0
- **音频处理**: HTML5 Audio API
- **实时通信**: Socket.IO Client

### 后端技术
- **API接口**: GD Studio Music API
- **同步服务器**: Node.js (Express + Socket.IO) / Python (Flask + Flask-SocketIO)
- **实时通信**: WebSocket (Socket.IO)
- **数据存储**: 内存存储 (支持 Redis 扩展)

### 服务端架构

#### Node.js 版本
- **Express** - Web框架
- **Socket.IO** - WebSocket实时通信
- **CORS** - 跨域支持
- **dotenv** - 环境变量管理

#### Python 版本  
- **Flask** - Web框架
- **Flask-SocketIO** - WebSocket实时通信
- **Flask-CORS** - 跨域支持
- **eventlet** - 异步IO支持

## 📁 项目结构

```
music/
├── index.html                    # 主页面
├── styles.css                    # 样式文件
├── script.js                     # 前端主要逻辑
├── README.md                     # 项目说明
├── LICENSE                       # 开源协议
├── music-sync-server/            # Node.js 同步服务器
│   ├── server.js                 # 服务器主文件
│   ├── package.json              # 项目配置
│   ├── .env.example              # 环境变量示例
│   ├── start.sh                  # 启动脚本 (Linux/macOS)
│   ├── start.bat                 # 启动脚本 (Windows)
│   └── README.md                 # 服务器说明
└── music-sync-server-python/     # Python 同步服务器
    ├── server.py                 # 服务器主文件
    ├── requirements.txt          # Python 依赖
    ├── .env.example              # 环境变量示例
    ├── start.sh                  # 启动脚本 (Linux/macOS)
    ├── start.bat                 # 启动脚本 (Windows)
    └── README.md                 # 服务器说明
```

## 🔧 配置说明

### 前端API配置

项目使用 GD Studio Music API，默认配置：

```javascript
const API_BASE_URL = 'https://music-api.gdstudio.xyz/api.php';
```

### 音质设置

支持多种音质选项：

```javascript
const QUALITY_OPTIONS = {
    '999': '无损音质',
    '320': '高品质 (320k)',
    '192': '标准 (192k)', 
    '128': '流畅 (128k)'
};
```

### 服务端配置

#### Node.js 服务器环境变量

```bash
# 服务器端口
PORT=3000

# 环境模式
NODE_ENV=development

# 跨域设置
CORS_ORIGIN=*

# 房间清理间隔 (毫秒)
ROOM_CLEANUP_INTERVAL=60000

# 最大房间数
MAX_ROOMS=1000

# 房间最大用户数
MAX_USERS_PER_ROOM=50
```

#### Python 服务器环境变量

```bash
# 服务器端口
PORT=3000

# Flask环境模式
FLASK_ENV=production

# 调试模式
DEBUG=false

# 日志级别
LOG_LEVEL=INFO

# 房间清理间隔 (秒)
ROOM_CLEANUP_INTERVAL=60

# 最大房间数量
MAX_ROOMS=1000

# 房间最大用户数
MAX_USERS_PER_ROOM=50
```

### 同步服务器API

两个版本的服务器都提供相同的API接口：

#### HTTP 接口
- `GET /` - 服务器状态
- `GET /room/:roomId` - 获取房间信息
- `GET /rooms` - 获取所有房间列表
- `GET /health` - 健康检查

#### Socket.IO 事件
- 房间管理：`create-room`, `join-room`, `leave-room`
- 播放控制：`play`, `pause`, `seek`, `track-change`
- 状态同步：`sync-progress`, `sync-state`

## 🚀 部署说明

### 生产环境部署

#### 前端部署
- 支持任何静态文件托管服务（Nginx, Apache, CDN等）
- 推荐使用 HTTPS 协议
- 需要配置 CORS 以支持跨域音频播放

#### Node.js 服务器生产部署

```bash
# 使用 PM2 进程管理
npm install -g pm2
pm2 start server.js --name music-sync-server

# 使用 Docker 部署
docker build -t music-sync-server .
docker run -p 3000:3000 music-sync-server

# 使用 Nginx 反向代理
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Python 服务器生产部署

```bash
# 使用 Gunicorn + Eventlet
pip install gunicorn
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:3000 server:app

# 使用 Supervisor 进程管理
[program:music-sync-server]
command=python server.py
directory=/path/to/music-sync-server-python
autostart=true
autorestart=true
```

### 性能优化建议

1. **启用 Redis**：用于多实例部署时的数据共享
2. **负载均衡**：使用 Nginx 或云服务负载均衡器
3. **CDN加速**：前端静态资源使用 CDN 分发
4. **GZIP压缩**：启用服务器 GZIP 压缩
5. **内存监控**：定期监控服务器内存使用情况

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 2 空格缩进
- 遵循 ES6+ 语法规范
- 添加必要的注释
- 确保代码在主流浏览器中兼容

## ⚠️ 免责声明

- 本项目仅供学习交流使用，严禁商业用途
- 音乐资源来源于各大音乐平台，版权归原作者所有
- 使用本项目产生的任何法律后果由使用者自行承担
- 部分音乐源可能不稳定或失效，属正常现象

## 🙏 致谢

- [GD Studio](https://music-api.gdstudio.xyz) - 提供音乐聚合API
- [Meting](https://github.com/metowolf/Meting) - 原始API项目
- [Font Awesome](https://fontawesome.com/) - 图标库
- [Socket.io](https://socket.io/) - 实时通信

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。


---

⭐ 如果这个项目对你有帮助，请给它一个星标！