const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// 配置Socket.IO
const io = socketIO(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

// 中间件配置
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*"
}));
app.use(express.json());

// 房间数据存储
const rooms = new Map();

// 配置常量
const CONFIG = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    ROOM_CLEANUP_INTERVAL: parseInt(process.env.ROOM_CLEANUP_INTERVAL) || 60000,
    MAX_ROOMS: parseInt(process.env.MAX_ROOMS) || 1000,
    MAX_USERS_PER_ROOM: parseInt(process.env.MAX_USERS_PER_ROOM) || 50
};

// 工具函数
const utils = {
    // 生成随机房间ID
    generateRoomId: () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    },
    
    // 验证房间ID格式
    isValidRoomId: (roomId) => {
        return typeof roomId === 'string' && roomId.length === 6 && /^[A-Z0-9]+$/.test(roomId);
    },
    
    // 记录日志
    log: (level, message, data = null) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        
        if (CONFIG.NODE_ENV === 'development') {
            console.log(logMessage, data ? JSON.stringify(data, null, 2) : '');
        } else {
            console.log(logMessage);
        }
    }
};

// 房间类
class Room {
    constructor(id, hostId) {
        this.id = id;
        this.hostId = hostId;
        this.users = new Map();
        this.currentTrack = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.lastUpdate = Date.now();
        this.createdAt = Date.now();
        
        utils.log('info', `房间 ${id} 创建成功`, { hostId });
    }

    addUser(userId, socketId) {
        if (this.users.size >= CONFIG.MAX_USERS_PER_ROOM) {
            utils.log('warn', `房间 ${this.id} 已达到最大用户数限制`, { 
                currentUsers: this.users.size, 
                maxUsers: CONFIG.MAX_USERS_PER_ROOM 
            });
            return false;
        }
        
        this.users.set(userId, {
            id: userId,
            socketId: socketId,
            joinTime: Date.now()
        });
        
        utils.log('info', `用户 ${userId} 加入房间 ${this.id}`);
        return true;
    }

    removeUser(userId) {
        const removed = this.users.delete(userId);
        if (removed) {
            utils.log('info', `用户 ${userId} 离开房间 ${this.id}`);
        }
        return removed;
    }

    getUserCount() {
        return this.users.size;
    }

    updatePlayState(track, isPlaying, currentTime) {
        if (track !== undefined) this.currentTrack = track;
        if (isPlaying !== undefined) this.isPlaying = isPlaying;
        if (currentTime !== undefined) this.currentTime = currentTime;
        this.lastUpdate = Date.now();
        
        utils.log('debug', `房间 ${this.id} 播放状态更新`, {
            track: track?.name || this.currentTrack?.name,
            isPlaying: this.isPlaying,
            currentTime: this.currentTime
        });
    }

    getPlayState() {
        // 计算当前实际播放时间
        if (this.isPlaying) {
            const elapsed = (Date.now() - this.lastUpdate) / 1000;
            return {
                currentTrack: this.currentTrack,
                isPlaying: this.isPlaying,
                currentTime: this.currentTime + elapsed
            };
        }
        return {
            currentTrack: this.currentTrack,
            isPlaying: this.isPlaying,
            currentTime: this.currentTime
        };
    }
    
    // 获取房间详细信息
    getInfo() {
        return {
            id: this.id,
            hostId: this.hostId,
            userCount: this.getUserCount(),
            createdAt: this.createdAt,
            ...this.getPlayState()
        };
    }
}

// 房间管理函数
const roomManager = {
    // 创建房间
    createRoom(roomId, hostId) {
        if (rooms.size >= CONFIG.MAX_ROOMS) {
            utils.log('warn', '已达到最大房间数限制', { 
                currentRooms: rooms.size, 
                maxRooms: CONFIG.MAX_ROOMS 
            });
            return null;
        }
        
        if (rooms.has(roomId)) {
            utils.log('warn', `房间 ${roomId} 已存在`);
            return null;
        }
        
        const room = new Room(roomId, hostId);
        rooms.set(roomId, room);
        return room;
    },
    
    // 获取房间
    getRoom(roomId) {
        return rooms.get(roomId) || null;
    },
    
    // 删除房间
    deleteRoom(roomId) {
        const deleted = rooms.delete(roomId);
        if (deleted) {
            utils.log('info', `房间 ${roomId} 已删除`);
        }
        return deleted;
    },
    
    // 获取房间统计
    getStats() {
        return {
            totalRooms: rooms.size,
            totalUsers: Array.from(rooms.values()).reduce((sum, room) => sum + room.getUserCount(), 0)
        };
    }
};

// Socket.io 连接处理
io.on('connection', (socket) => {
    utils.log('info', '新用户连接', { socketId: socket.id });

    // 创建房间
    socket.on('create-room', (data) => {
        const { roomId, track, currentTime } = data;
        
        // 验证输入
        if (!roomId || !utils.isValidRoomId(roomId)) {
            socket.emit('error', { message: '无效的房间ID格式' });
            return;
        }
        
        // 创建房间
        const room = roomManager.createRoom(roomId, socket.id);
        if (!room) {
            socket.emit('error', { message: '房间创建失败或已存在' });
            return;
        }

        // 添加用户到房间
        if (!room.addUser(socket.id, socket.id)) {
            roomManager.deleteRoom(roomId);
            socket.emit('error', { message: '房间已满' });
            return;
        }
        
        room.updatePlayState(track, true, currentTime || 0);

        // 加入Socket.io房间
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;

        // 发送房间信息
        socket.emit('room-created', {
            roomId,
            userCount: room.getUserCount()
        });

        // 通知房间用户数更新
        io.to(roomId).emit('room-users', {
            count: room.getUserCount()
        });
    });

    // 加入房间
    socket.on('join-room', (data) => {
        const { roomId } = data;
        
        if (!rooms.has(roomId)) {
            socket.emit('error', { message: '房间不存在' });
            return;
        }

        const room = rooms.get(roomId);
        room.addUser(socket.id, socket.id);

        // 加入Socket.io房间
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = false;

        console.log(`用户 ${socket.id} 加入房间 ${roomId}`);

        // 获取当前播放状态
        const playState = room.getPlayState();

        // 发送房间信息和当前播放状态
        socket.emit('room-joined', {
            roomId,
            userCount: room.getUserCount(),
            ...playState
        });

        // 通知所有用户更新用户数
        io.to(roomId).emit('room-users', {
            count: room.getUserCount()
        });

        // 如果有正在播放的歌曲，同步给新用户
        if (playState.currentTrack) {
            socket.emit('sync-state', playState);
        }
    });

    // 歌曲变更
    socket.on('track-change', (data) => {
        const { roomId, track } = data;
        
        if (!socket.isHost || !rooms.has(roomId)) return;

        const room = rooms.get(roomId);
        room.updatePlayState(track, true, 0);

        // 广播给房间内其他用户
        socket.to(roomId).emit('track-change', {
            track,
            currentTime: 0
        });

        console.log(`房间 ${roomId} 切换歌曲:`, track.name);
    });

    // 播放
    socket.on('play', (data) => {
        const { roomId, currentTime } = data;
        
        if (!socket.isHost || !rooms.has(roomId)) return;

        const room = rooms.get(roomId);
        room.updatePlayState(room.currentTrack, true, currentTime || room.currentTime);

        // 广播给房间内其他用户
        socket.to(roomId).emit('play', {
            currentTime: currentTime || room.currentTime
        });

        console.log(`房间 ${roomId} 开始播放`);
    });

    // 暂停
    socket.on('pause', (data) => {
        const { roomId, currentTime } = data;
        
        if (!socket.isHost || !rooms.has(roomId)) return;

        const room = rooms.get(roomId);
        room.updatePlayState(room.currentTrack, false, currentTime || room.currentTime);

        // 广播给房间内其他用户
        socket.to(roomId).emit('pause', {
            currentTime: currentTime || room.currentTime
        });

        console.log(`房间 ${roomId} 暂停播放`);
    });

    // 进度同步
    socket.on('seek', (data) => {
        const { roomId, currentTime } = data;
        
        if (!socket.isHost || !rooms.has(roomId)) return;

        const room = rooms.get(roomId);
        room.updatePlayState(room.currentTrack, room.isPlaying, currentTime);

        // 广播给房间内其他用户
        socket.to(roomId).emit('seek', {
            currentTime
        });

        console.log(`房间 ${roomId} 同步进度: ${currentTime}s`);
    });

    // 定期同步进度（每5秒）
    socket.on('sync-progress', (data) => {
        const { roomId, currentTime } = data;
        
        if (!socket.isHost || !rooms.has(roomId)) return;

        const room = rooms.get(roomId);
        room.currentTime = currentTime;
        room.lastUpdate = Date.now();

        // 广播给房间内其他用户
        socket.to(roomId).emit('sync-progress', {
            currentTime
        });
    });

    // 获取房间状态
    socket.on('get-room-state', (data) => {
        const { roomId } = data;
        
        if (!rooms.has(roomId)) {
            socket.emit('error', { message: '房间不存在' });
            return;
        }

        const room = rooms.get(roomId);
        const playState = room.getPlayState();

        socket.emit('room-state', {
            roomId,
            userCount: room.getUserCount(),
            ...playState
        });
    });

    // 断开连接
    socket.on('disconnect', () => {
        console.log('用户断开连接:', socket.id);

        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            room.removeUser(socket.id);

            // 如果是房主离开，且房间还有其他用户
            if (socket.isHost && room.getUserCount() > 0) {
                // 选择新房主（第一个用户）
                const newHostId = room.users.keys().next().value;
                room.hostId = newHostId;
                
                // 通知新房主
                io.to(newHostId).emit('become-host', {
                    roomId: socket.roomId
                });
            }

            // 如果房间没有用户了，删除房间
            if (room.getUserCount() === 0) {
                rooms.delete(socket.roomId);
                console.log(`房间 ${socket.roomId} 已删除`);
            } else {
                // 通知剩余用户
                io.to(socket.roomId).emit('room-users', {
                    count: room.getUserCount()
                });
            }
        }
    });
});

// HTTP路由
app.get('/', (req, res) => {
    const stats = roomManager.getStats();
    res.json({
        status: 'ok',
        message: 'Music Sync Server is running',
        version: '1.0.0',
        environment: CONFIG.NODE_ENV,
        uptime: process.uptime(),
        ...stats,
        timestamp: new Date().toISOString()
    });
});

// 获取房间信息API
app.get('/room/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    
    if (!utils.isValidRoomId(roomId)) {
        return res.status(400).json({ error: '无效的房间ID格式' });
    }
    
    const room = roomManager.getRoom(roomId);
    if (!room) {
        return res.status(404).json({ error: '房间不存在' });
    }

    res.json(room.getInfo());
});

// 获取所有房间列表
app.get('/rooms', (req, res) => {
    const roomList = Array.from(rooms.values()).map(room => room.getInfo());
    res.json({
        rooms: roomList,
        count: roomList.length,
        timestamp: new Date().toISOString()
    });
});

// 健康检查接口
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    utils.log('error', '服务器错误', { error: err.message, stack: err.stack });
    res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
server.listen(CONFIG.PORT, '127.0.0.1', () => {
    utils.log('info', `Music Sync Server 启动成功`, {
        port: CONFIG.PORT,
        host: '127.0.0.1',
        environment: CONFIG.NODE_ENV,
        pid: process.pid
    });
});

// 优雅关闭
process.on('SIGTERM', () => {
    utils.log('info', '收到 SIGTERM 信号，开始优雅关闭');
    server.close(() => {
        utils.log('info', '服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    utils.log('info', '收到 SIGINT 信号，开始优雅关闭');
    server.close(() => {
        utils.log('info', '服务器已关闭');
        process.exit(0);
    });
});

// 定期清理空房间
setInterval(() => {
    const emptyRooms = [];
    for (const [roomId, room] of rooms.entries()) {
        if (room.getUserCount() === 0) {
            emptyRooms.push(roomId);
        }
    }
    
    emptyRooms.forEach(roomId => {
        roomManager.deleteRoom(roomId);
    });
    
    if (emptyRooms.length > 0) {
        utils.log('info', `清理了 ${emptyRooms.length} 个空房间`);
    }
}, CONFIG.ROOM_CLEANUP_INTERVAL);