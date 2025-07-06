# Music Sync Server - Python版本

基于Flask-SocketIO的音乐同步服务器，与Node.js版本功能完全兼容。

## 功能特性

- 🎵 **多房间支持** - 支持创建和管理多个音乐房间
- 👥 **实时同步** - 房间内用户音乐播放状态实时同步
- 🎮 **房主控制** - 房主可以控制播放、暂停、切换歌曲
- 🔄 **自动接管** - 房主离开时自动选择新房主
- 🧹 **自动清理** - 定期清理空房间，节约内存
- 🌐 **RESTful API** - 提供HTTP接口查询房间状态
- 📱 **跨平台** - 支持所有主流浏览器和移动设备

## 技术栈

- **Flask** - Web框架
- **Flask-SocketIO** - WebSocket实时通信
- **Flask-CORS** - 跨域支持
- **Python 3.7+** - 运行环境
- **Eventlet** - 异步IO支持

## 快速开始

### 1. 安装依赖

```bash
# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 运行服务器

```bash
# 开发模式
python server.py

# 生产模式
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:3000 server:app
```

### 3. 验证服务

访问 `http://localhost:3000` 查看服务器状态

## 环境变量

| 变量名 | 默认值 | 描述 |
|--------|-------|------|
| PORT | 3000 | 服务器端口 |
| FLASK_ENV | production | Flask环境模式 |

## API接口

### HTTP API

#### 获取服务器状态
```
GET /
```

#### 获取房间信息
```
GET /room/{room_id}
```

#### 获取所有房间列表
```
GET /rooms
```

### Socket.IO 事件

#### 客户端 → 服务器

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `create_room` | `{room_id, track, current_time}` | 创建房间 |
| `join_room` | `{room_id}` | 加入房间 |
| `track_change` | `{room_id, track}` | 切换歌曲 |
| `play` | `{room_id, current_time}` | 开始播放 |
| `pause` | `{room_id, current_time}` | 暂停播放 |
| `seek` | `{room_id, current_time}` | 跳转进度 |
| `sync_progress` | `{room_id, current_time}` | 同步进度 |
| `get_room_state` | `{room_id}` | 获取房间状态 |

#### 服务器 → 客户端

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `room_created` | `{room_id, user_count}` | 房间创建成功 |
| `room_joined` | `{room_id, user_count, ...play_state}` | 加入房间成功 |
| `room_users` | `{count}` | 房间用户数更新 |
| `track_change` | `{track, current_time}` | 歌曲变更 |
| `play` | `{current_time}` | 开始播放 |
| `pause` | `{current_time}` | 暂停播放 |
| `seek` | `{current_time}` | 进度跳转 |
| `sync_progress` | `{current_time}` | 进度同步 |
| `sync_state` | `{...play_state}` | 状态同步 |
| `become_host` | `{room_id}` | 成为房主 |
| `room_state` | `{room_id, user_count, ...play_state}` | 房间状态 |
| `error` | `{message}` | 错误信息 |

## 部署说明

### 使用 Gunicorn

```bash
# 安装 Gunicorn
pip install gunicorn

# 启动服务
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:3000 server:app
```

### 使用 Docker

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 3000

CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:3000", "server:app"]
```

### 使用 Supervisor

```ini
[program:music-sync-server]
command=python server.py
directory=/path/to/music-sync-server-python
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/music-sync-server.log
```

## 与Node.js版本的兼容性

Python版本与Node.js版本完全兼容，可以互换使用：

- ✅ 相同的Socket.IO事件名和参数
- ✅ 相同的HTTP API接口
- ✅ 相同的房间管理逻辑
- ✅ 相同的用户体验

## 性能优化

1. **使用生产WSGI服务器**：推荐使用Gunicorn + Eventlet
2. **启用Redis**：可以配置Redis作为消息队列提升性能
3. **负载均衡**：支持多实例部署和负载均衡
4. **内存管理**：自动清理空房间，定期GC

## 开发说明

### 项目结构

```
music-sync-server-python/
├── server.py           # 主服务器文件
├── requirements.txt    # Python依赖
├── README.md          # 文档
├── .env.example       # 环境变量示例
└── tests/             # 测试文件
```

### 代码风格

- 遵循PEP 8编码规范
- 使用类型注解（可选）
- 完整的错误处理
- 详细的日志记录

## 故障排除

### 常见问题

1. **端口占用**：检查端口3000是否被其他程序占用
2. **依赖缺失**：确保所有依赖都已正确安装
3. **跨域问题**：检查CORS配置是否正确
4. **内存泄漏**：检查是否有房间未正确清理

### 日志调试

```bash
# 开启调试模式
FLASK_ENV=development python server.py

# 查看详细日志
tail -f /var/log/music-sync-server.log
```

## 许可证

MIT License - 详见原项目许可证文件

## 贡献

欢迎提交Issue和Pull Request！

## 致谢

- 基于原Node.js版本服务器开发
- 使用Flask-SocketIO框架
- 参考了多个开源项目的最佳实践