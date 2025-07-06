#!/usr/bin/env python3
"""
Music Sync Server - Python版本
基于Flask-SocketIO的音乐同步服务器
"""

import os
import time
import threading
from datetime import datetime
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'music-sync-secret-key'
CORS(app, origins="*")

# 初始化SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# 房间数据存储
rooms = {}
rooms_lock = threading.Lock()


class Room:
    """房间类 - 管理房间状态和用户"""
    
    def __init__(self, room_id, host_id):
        self.id = room_id
        self.host_id = host_id
        self.users = {}
        self.current_track = None
        self.is_playing = False
        self.current_time = 0
        self.last_update = time.time()
        self.created_at = datetime.now()
    
    def add_user(self, user_id, socket_id):
        """添加用户到房间"""
        self.users[user_id] = {
            'id': user_id,
            'socket_id': socket_id,
            'join_time': time.time()
        }
    
    def remove_user(self, user_id):
        """从房间移除用户"""
        if user_id in self.users:
            del self.users[user_id]
    
    def get_user_count(self):
        """获取房间用户数"""
        return len(self.users)
    
    def update_play_state(self, track=None, is_playing=None, current_time=None):
        """更新播放状态"""
        if track is not None:
            self.current_track = track
        if is_playing is not None:
            self.is_playing = is_playing
        if current_time is not None:
            self.current_time = current_time
        self.last_update = time.time()
        
        # 调试日志
        if DEBUG:
            track_name = track.get('name') if track else self.current_track.get('name') if self.current_track else 'Unknown'
            track_source = track.get('source') if track else self.current_track.get('source') if self.current_track else 'Unknown'
            print(f'[DEBUG] 房间 {self.id} 播放状态更新: {track_name} (来源: {track_source}), 播放: {self.is_playing}, 时间: {self.current_time}s')
    
    def get_play_state(self):
        """获取当前播放状态"""
        # 计算当前实际播放时间
        if self.is_playing:
            elapsed = time.time() - self.last_update
            return {
                'current_track': self.current_track,
                'is_playing': self.is_playing,
                'current_time': self.current_time + elapsed
            }
        return {
            'current_track': self.current_track,
            'is_playing': self.is_playing,
            'current_time': self.current_time
        }
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'id': self.id,
            'host_id': self.host_id,
            'user_count': self.get_user_count(),
            'created_at': self.created_at.isoformat(),
            **self.get_play_state()
        }


def get_room(room_id):
    """安全地获取房间"""
    with rooms_lock:
        return rooms.get(room_id)


def create_room(room_id, host_id):
    """创建新房间"""
    with rooms_lock:
        if room_id not in rooms:
            rooms[room_id] = Room(room_id, host_id)
            return rooms[room_id]
        return None


def delete_room(room_id):
    """删除房间"""
    with rooms_lock:
        if room_id in rooms:
            del rooms[room_id]


@app.route('/')
def index():
    """服务器状态API"""
    return jsonify({
        'status': 'ok',
        'message': 'Music Sync Server (Python) is running',
        'rooms': len(rooms),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/room/<room_id>')
def get_room_info(room_id):
    """获取房间信息API"""
    room = get_room(room_id)
    if not room:
        return jsonify({'error': '房间不存在'}), 404
    
    return jsonify(room.to_dict())


@app.route('/rooms')
def list_rooms():
    """列出所有房间"""
    with rooms_lock:
        room_list = [room.to_dict() for room in rooms.values()]
    return jsonify({
        'rooms': room_list,
        'count': len(room_list)
    })


# Socket.IO 事件处理
@socketio.on('connect')
def on_connect():
    """客户端连接事件"""
    print(f'新用户连接: {request.sid}')
    emit('connected', {'message': '连接成功'})


@socketio.on('disconnect')
def on_disconnect():
    """客户端断开连接事件"""
    print(f'用户断开连接: {request.sid}')
    
    # 查找用户所在的房间
    user_room = None
    with rooms_lock:
        for room_id, room in rooms.items():
            if request.sid in [user['socket_id'] for user in room.users.values()]:
                user_room = room
                break
    
    if user_room:
        # 移除用户
        users_to_remove = [user_id for user_id, user in user_room.users.items() 
                          if user['socket_id'] == request.sid]
        
        for user_id in users_to_remove:
            user_room.remove_user(user_id)
        
        # 如果是房主离开，且房间还有其他用户
        if user_room.host_id == request.sid and user_room.get_user_count() > 0:
            # 选择新房主（第一个用户）
            new_host_id = next(iter(user_room.users.keys()))
            user_room.host_id = new_host_id
            
            # 通知新房主
            socketio.emit('become_host', {
                'room_id': user_room.id
            }, room=user_room.users[new_host_id]['socket_id'])
        
        # 如果房间没有用户了，删除房间
        if user_room.get_user_count() == 0:
            delete_room(user_room.id)
            print(f'房间 {user_room.id} 已删除')
        else:
            # 通知剩余用户
            socketio.emit('room_users', {
                'count': user_room.get_user_count()
            }, room=user_room.id)


@socketio.on('create_room')
def on_create_room(data):
    """创建房间事件"""
    room_id = data.get('room_id')
    track = data.get('track')
    current_time = data.get('current_time', 0)
    
    if not room_id:
        emit('error', {'message': '房间ID不能为空'})
        return
    
    # 检查房间是否已存在
    if get_room(room_id):
        emit('error', {'message': '房间已存在'})
        return
    
    # 创建新房间
    room = create_room(room_id, request.sid)
    if not room:
        emit('error', {'message': '房间创建失败'})
        return
    
    # 添加用户到房间
    room.add_user(request.sid, request.sid)
    room.update_play_state(track, True, current_time)
    
    # 加入Socket.IO房间
    join_room(room_id)
    
    print(f'房间 {room_id} 创建成功')
    
    # 发送房间信息
    emit('room_created', {
        'room_id': room_id,
        'user_count': room.get_user_count()
    })
    
    # 通知房间用户数更新
    socketio.emit('room_users', {
        'count': room.get_user_count()
    }, room=room_id)


@socketio.on('join_room')
def on_join_room(data):
    """加入房间事件"""
    room_id = data.get('room_id')
    
    if not room_id:
        emit('error', {'message': '房间ID不能为空'})
        return
    
    room = get_room(room_id)
    if not room:
        emit('error', {'message': '房间不存在'})
        return
    
    # 添加用户到房间
    room.add_user(request.sid, request.sid)
    
    # 加入Socket.IO房间
    join_room(room_id)
    
    print(f'用户 {request.sid} 加入房间 {room_id}')
    
    # 获取当前播放状态
    play_state = room.get_play_state()
    
    # 发送房间信息和当前播放状态
    emit('room_joined', {
        'room_id': room_id,
        'user_count': room.get_user_count(),
        **play_state
    })
    
    # 通知所有用户更新用户数
    socketio.emit('room_users', {
        'count': room.get_user_count()
    }, room=room_id)
    
    # 如果有正在播放的歌曲，同步给新用户
    if play_state['current_track']:
        emit('sync_state', play_state)


@socketio.on('track_change')
def on_track_change(data):
    """歌曲变更事件"""
    room_id = data.get('room_id')
    track = data.get('track')
    
    room = get_room(room_id)
    if not room or room.host_id != request.sid:
        return
    
    room.update_play_state(track, True, 0)
    
    # 广播给房间内其他用户
    socketio.emit('track_change', {
        'track': track,
        'current_time': 0
    }, room=room_id, include_self=False)
    
    print(f'房间 {room_id} 切换歌曲: {track.get("name", "Unknown")} (来源: {track.get("source", "未知")})')


@socketio.on('play')
def on_play(data):
    """播放事件"""
    room_id = data.get('room_id')
    current_time = data.get('current_time')
    
    room = get_room(room_id)
    if not room or room.host_id != request.sid:
        return
    
    room.update_play_state(is_playing=True, current_time=current_time or room.current_time)
    
    # 广播给房间内其他用户
    socketio.emit('play', {
        'current_time': current_time or room.current_time
    }, room=room_id, include_self=False)
    
    print(f'房间 {room_id} 开始播放')


@socketio.on('pause')
def on_pause(data):
    """暂停事件"""
    room_id = data.get('room_id')
    current_time = data.get('current_time')
    
    room = get_room(room_id)
    if not room or room.host_id != request.sid:
        return
    
    room.update_play_state(is_playing=False, current_time=current_time or room.current_time)
    
    # 广播给房间内其他用户
    socketio.emit('pause', {
        'current_time': current_time or room.current_time
    }, room=room_id, include_self=False)
    
    print(f'房间 {room_id} 暂停播放')


@socketio.on('seek')
def on_seek(data):
    """进度跳转事件"""
    room_id = data.get('room_id')
    current_time = data.get('current_time')
    
    room = get_room(room_id)
    if not room or room.host_id != request.sid:
        return
    
    room.update_play_state(current_time=current_time)
    
    # 广播给房间内其他用户
    socketio.emit('seek', {
        'current_time': current_time
    }, room=room_id, include_self=False)
    
    print(f'房间 {room_id} 同步进度: {current_time}s')


@socketio.on('sync_progress')
def on_sync_progress(data):
    """定期同步进度事件"""
    room_id = data.get('room_id')
    current_time = data.get('current_time')
    
    room = get_room(room_id)
    if not room or room.host_id != request.sid:
        return
    
    room.current_time = current_time
    room.last_update = time.time()
    
    # 广播给房间内其他用户
    socketio.emit('sync_progress', {
        'current_time': current_time
    }, room=room_id, include_self=False)


@socketio.on('get_room_state')
def on_get_room_state(data):
    """获取房间状态事件"""
    room_id = data.get('room_id')
    
    room = get_room(room_id)
    if not room:
        emit('error', {'message': '房间不存在'})
        return
    
    play_state = room.get_play_state()
    
    emit('room_state', {
        'room_id': room_id,
        'user_count': room.get_user_count(),
        **play_state
    })


def cleanup_empty_rooms():
    """清理空房间的后台任务"""
    while True:
        time.sleep(60)  # 每分钟执行一次
        
        empty_rooms = []
        with rooms_lock:
            for room_id, room in rooms.items():
                if room.get_user_count() == 0:
                    empty_rooms.append(room_id)
        
        for room_id in empty_rooms:
            delete_room(room_id)
            print(f'清理空房间: {room_id}')


import socket

def find_available_port(start_port=3000, max_port=3010):
    """寻找可用的端口"""
    for port in range(start_port, max_port):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    raise RuntimeError(f"无法找到 {start_port}-{max_port-1} 范围内的可用端口")

if __name__ == '__main__':
    # 启动后台清理任务
    cleanup_thread = threading.Thread(target=cleanup_empty_rooms, daemon=True)
    cleanup_thread.start()
    
    # 获取端口号，如果环境变量未设置则自动寻找可用端口
    if 'PORT' in os.environ:
        port = int(os.environ.get('PORT'))
    else:
        port = find_available_port()
    
    print(f'Music Sync Server (Python) 启动在端口 {port}')
    
    # 启动服务器
    try:
        socketio.run(app, host='127.0.0.1', port=port, debug=False)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f'端口 {port} 被占用，正在寻找其他可用端口...')
            port = find_available_port(port + 1)
            print(f'使用端口 {port}')
            socketio.run(app, host='127.0.0.1', port=port, debug=False)
        else:
            raise