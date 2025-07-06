# Music Sync Server - Node.js版本

基于Express + Socket.IO的音乐同步服务器，支持多房间实时音乐播放同步。

## 功能特性

- 🎵 **多房间支持** - 支持创建和管理多个音乐房间
- 👥 **实时同步** - 房间内用户音乐播放状态实时同步
- 🎮 **房主控制** - 房主可以控制播放、暂停、切换歌曲
- 🔄 **自动接管** - 房主离开时自动选择新房主
- 🧹 **自动清理** - 定期清理空房间，节约内存
- 🌐 **RESTful API** - 提供HTTP接口查询房间状态
- 📱 **跨平台** - 支持所有主流浏览器和移动设备

## 技术栈

- **Express** - Web框架
- **Socket.IO** - WebSocket实时通信
- **CORS** - 跨域支持
- **Node.js 14+** - 运行环境

## 快速开始

### 1. 环境要求

- Node.js 14+ 
- npm 6+

### 2. 安装依赖

```bash
# 进入项目目录
cd music-sync-server

# 安装依赖
npm install
```

### 3. 运行服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start

# 或直接运行
node server.js
```

### 4. 验证服务

访问 `http://localhost:3000` 查看服务器状态

## 环境变量

| 变量名 | 默认值 | 描述 |
|--------|-------|------|
| PORT | 3000 | 服务器端口 |
| NODE_ENV | development | 环境模式 |
| CORS_ORIGIN | * | 允许的跨域来源 |

## 项目结构

```
music-sync-server/
├── server.js          # 主服务器文件
├── package.json       # 项目配置
├── README.md          # 项目文档
├── .env.example       # 环境变量示例
├── start.sh           # Linux/macOS启动脚本
└── start.bat          # Windows启动脚本
```

## API接口

### HTTP API

#### 获取服务器状态
```
GET /
```

**响应示例：**
```json
{
  "status": "ok",
  "message": "Music Sync Server is running",
  "rooms": 2
}
```

#### 获取房间信息
```
GET /room/:roomId
```

**响应示例：**
```json
{
  "roomId": "123456",
  "userCount": 3,
  "currentTrack": {
    "name": "歌曲名",
    "artist": "歌手",
    "duration": 240
  },
  "isPlaying": true,
  "currentTime": 120.5
}
```

### Socket.IO 事件

#### 客户端 → 服务器

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `create-room` | `{roomId, track, currentTime}` | 创建房间 |
| `join-room` | `{roomId}` | 加入房间 |
| `track-change` | `{roomId, track}` | 切换歌曲 |
| `play` | `{roomId, currentTime}` | 开始播放 |
| `pause` | `{roomId, currentTime}` | 暂停播放 |
| `seek` | `{roomId, currentTime}` | 跳转进度 |
| `sync-progress` | `{roomId, currentTime}` | 同步进度 |
| `get-room-state` | `{roomId}` | 获取房间状态 |

#### 服务器 → 客户端

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `room-created` | `{roomId, userCount}` | 房间创建成功 |
| `room-joined` | `{roomId, userCount, ...playState}` | 加入房间成功 |
| `room-users` | `{count}` | 房间用户数更新 |
| `track-change` | `{track, currentTime}` | 歌曲变更 |
| `play` | `{currentTime}` | 开始播放 |
| `pause` | `{currentTime}` | 暂停播放 |
| `seek` | `{currentTime}` | 进度跳转 |
| `sync-progress` | `{currentTime}` | 进度同步 |
| `sync-state` | `{...playState}` | 状态同步 |
| `become-host` | `{roomId}` | 成为房主 |
| `room-state` | `{roomId, userCount, ...playState}` | 房间状态 |
| `error` | `{message}` | 错误信息 |

## 客户端集成

### 连接服务器

```javascript
// 连接到服务器
const socket = io('http://localhost:3000');

// 监听连接成功
socket.on('connect', () => {
    console.log('连接服务器成功');
});
```

### 创建房间

```javascript
// 创建房间
socket.emit('create-room', {
    roomId: '123456',
    track: {
        name: '歌曲名',
        artist: '歌手',
        url: 'http://example.com/song.mp3'
    },
    currentTime: 0
});

// 监听房间创建成功
socket.on('room-created', (data) => {
    console.log('房间创建成功:', data);
});
```

### 加入房间

```javascript
// 加入房间
socket.emit('join-room', {
    roomId: '123456'
});

// 监听加入房间成功
socket.on('room-joined', (data) => {
    console.log('加入房间成功:', data);
    // 同步播放状态
    if (data.currentTrack) {
        // 设置当前歌曲
        // 设置播放进度
        // 设置播放状态
    }
});
```

### 播放控制

```javascript
// 播放
socket.emit('play', {
    roomId: '123456',
    currentTime: 120.5
});

// 暂停
socket.emit('pause', {
    roomId: '123456',
    currentTime: 120.5
});

// 切换歌曲
socket.emit('track-change', {
    roomId: '123456',
    track: {
        name: '新歌曲',
        artist: '歌手',
        url: 'http://example.com/new-song.mp3'
    }
});
```

## 部署说明

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name music-sync-server

# 查看状态
pm2 status

# 查看日志
pm2 logs music-sync-server
```

### 使用 Docker

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### 使用 Nginx 反向代理

```nginx
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 性能优化

1. **启用集群模式**：使用PM2集群模式提升性能
2. **Redis适配器**：使用Redis适配器支持多实例
3. **负载均衡**：使用Nginx进行负载均衡
4. **内存监控**：定期监控内存使用情况

## 开发说明

### 开发模式

```bash
# 开发模式运行（自动重启）
npm run dev

# 启用调试模式
DEBUG=socket.io:* npm run dev
```

### 测试

```bash
# 运行测试
npm test

# 代码覆盖率
npm run coverage
```

## 故障排除

### 常见问题

1. **端口占用**：检查端口3000是否被其他程序占用
2. **跨域问题**：检查CORS配置是否正确
3. **连接断开**：检查网络连接和防火墙设置
4. **内存泄漏**：检查是否有房间未正确清理

### 日志调试

```bash
# 启用详细日志
DEBUG=* node server.js

# 只显示Socket.IO日志
DEBUG=socket.io:* node server.js
```

## 更新日志

### v1.0.0 (当前版本)
- 基础房间功能
- 实时音乐同步
- 自动房主切换
- 定期清理空房间

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 联系方式

- 项目地址：https://github.com/q3cc/music.git
- 问题反馈：请在GitHub Issues中提交

## 致谢

- 基于Express和Socket.IO构建
- 参考了多个开源项目的最佳实践