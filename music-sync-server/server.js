const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// 房间数据存储
const rooms = new Map();

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
    }

    addUser(userId, socketId) {
        this.users.set(userId, {
            id: userId,
            socketId: socketId,
            joinTime: Date.now()
        });
    }

    removeUser(userId) {
        this.users.delete(userId);
    }

    getUserCount() {
        return this.users.size;
    }

    updatePlayState(track, isPlaying, currentTime) {
        this.currentTrack = track;
        this.isPlaying = isPlaying;
        this.currentTime = currentTime;
        this.lastUpdate = Date.now();
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
}

// Socket.io 连接处理
io.on('connection', (socket) => {
    console.log('新用户连接:', socket.id);

    // 创建房间
    socket.on('create-room', (data) => {
        const { roomId, track, currentTime } = data;
        
        if (rooms.has(roomId)) {
            socket.emit('error', { message: '房间已存在' });
            return;
        }

        // 创建新房间
        const room = new Room(roomId, socket.id);
        room.addUser(socket.id, socket.id);
        room.updatePlayState(track, true, currentTime || 0);
        rooms.set(roomId, room);

        // 加入Socket.io房间
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;

        console.log(`房间 ${roomId} 创建成功`);

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
    res.json({
        status: 'ok',
        message: 'Music Sync Server is running',
        rooms: rooms.size
    });
});

// 获取房间信息API
app.get('/room/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    
    if (!rooms.has(roomId)) {
        return res.status(404).json({ error: '房间不存在' });
    }

    const room = rooms.get(roomId);
    const playState = room.getPlayState();

    res.json({
        roomId,
        userCount: room.getUserCount(),
        ...playState
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

// 定期清理空房间（每分钟检查一次）
setInterval(() => {
    for (const [roomId, room] of rooms.entries()) {
        if (room.getUserCount() === 0) {
            rooms.delete(roomId);
            console.log(`清理空房间: ${roomId}`);
        }
    }
}, 60000);