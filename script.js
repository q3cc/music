// 全局变量
let currentTrack = null;
let audioPlayer = new Audio();
let playlist = [];
let currentIndex = 0;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let roomId = null;
let socket = null;
let isRoomHost = false;
let lastSyncTime = 0;

// DOM 元素
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const sourceSelect = document.getElementById('source-select');
const resultsContainer = document.getElementById('results-container');
const recommendationsContainer = document.getElementById('recommendations-container');
const favoritesContainer = document.getElementById('favorites-container');
const navLinks = document.querySelectorAll('.nav-links li');
const pages = document.querySelectorAll('.page');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const volumeSlider = document.getElementById('volume-slider');
const progressBar = document.getElementById('progress');
const progressContainer = document.querySelector('.progress-bar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const currentThumbnail = document.getElementById('current-thumbnail');
const currentTitle = document.getElementById('current-title');
const currentArtist = document.getElementById('current-artist');
const favoriteIcon = document.getElementById('favorite-icon');
const playerDetails = document.getElementById('player-details');
const closeDetails = document.getElementById('close-details');
const detailsThumbnail = document.getElementById('details-thumbnail');
const detailsTitle = document.getElementById('details-title');
const detailsArtist = document.getElementById('details-artist');
const detailsAlbum = document.getElementById('details-album');
const lyricsContainer = document.getElementById('lyrics');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomInput = document.getElementById('room-input');
const roomStatus = document.querySelector('.room-status');
const roomIdDisplay = document.getElementById('room-id');
const roomUsersDisplay = document.getElementById('room-users');
const leaveRoomBtn = document.getElementById('leave-room');

// 初始化
function init() {
    // 导航切换
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const pageId = link.getAttribute('data-page');
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === pageId) {
                    page.classList.add('active');
                }
            });
        });
    });

    // 搜索功能
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') performSearch();
    });

    // 播放控制
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    volumeSlider.addEventListener('input', updateVolume);
    progressContainer.addEventListener('click', seekTo);
    
    // 音频事件
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', () => playNext());
    audioPlayer.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(audioPlayer.duration);
    });

    // 详情页
    currentThumbnail.addEventListener('click', showPlayerDetails);
    currentTitle.addEventListener('click', showPlayerDetails);
    currentArtist.addEventListener('click', showPlayerDetails);
    closeDetails.addEventListener('click', hidePlayerDetails);
    
    // 收藏功能
    favoriteIcon.addEventListener('click', toggleFavorite);
    
    // 一起听功能
    createRoomBtn.addEventListener('click', createRoom);
    joinRoomBtn.addEventListener('click', joinRoom);
    leaveRoomBtn.addEventListener('click', leaveRoom);
    
    // 加载推荐歌曲
    loadRecommendations();
    
    // 加载收藏列表
    loadFavorites();
}

// 搜索音乐
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    const source = sourceSelect.value;
    
    resultsContainer.innerHTML = '<div class="loading">搜索中...</div>';
    
    try {
        const response = await fetch(`https://music-api.gdstudio.xyz/api.php?types=search&source=${source}&name=${encodeURIComponent(query)}&count=20`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            displaySearchResults(data);
            playlist = data; // 更新播放列表
        } else {
            resultsContainer.innerHTML = '<div class="empty-message">未找到相关结果</div>';
        }
    } catch (error) {
        console.error('搜索失败:', error);
        resultsContainer.innerHTML = '<div class="empty-message">搜索失败，请稍后再试</div>';
    }
}

// 显示搜索结果
function displaySearchResults(results) {
    resultsContainer.innerHTML = '';
    displayMusicList(results, resultsContainer);
}

// 加载专辑图片
function loadAlbumArt(img, picId, source) {
    fetch(`https://music-api.gdstudio.xyz/api.php?types=pic&id=${picId}&source=${source}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.url) {
                img.src = data.url;
            }
        })
        .catch(error => console.error('获取专辑图片失败:', error));
}

// 播放音乐
function playTrack(track, index) {
    currentTrack = track;
    currentIndex = index;
    
    // 更新播放器UI
    currentTitle.textContent = track.name;
    currentArtist.textContent = Array.isArray(track.artist) ? track.artist.join(', ') : track.artist;
    
    // 加载专辑图片
    loadAlbumArt(currentThumbnail, track.pic_id, track.source);
    
    // 检查是否收藏
    const isFavorite = favorites.some(fav => 
        fav.id === track.id && fav.source === track.source);
    favoriteIcon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
    
    // 获取音乐URL
    fetch(`https://music-api.gdstudio.xyz/api.php?types=url&id=${track.id}&source=${track.source}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.url) {
                audioPlayer.src = data.url;
                audioPlayer.play()
                    .then(() => {
                        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    })
                    .catch(error => {
                        console.error('播放失败:', error);
                        playBtn.innerHTML = '<i class="fas fa-play"></i>';
                    });
                
                // 加载歌词
                loadLyrics(track.id, track.source);
                
                // 如果在房间中，同步播放状态
                if (roomId && isRoomHost && socket) {
                    socket.emit('track-change', {
                        roomId,
                        track: currentTrack
                    });
                }
            } else {
                alert('无法获取音乐播放地址，请尝试其他歌曲');
            }
        })
        .catch(error => {
            console.error('获取音乐URL失败:', error);
            alert('获取音乐播放地址失败，请稍后再试');
        });
}

// 切换播放/暂停
function togglePlay() {
    if (!currentTrack) return;
    
    if (audioPlayer.paused) {
        audioPlayer.play();
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        
        // 同步播放状态
        if (roomId && isRoomHost && socket) {
            socket.emit('play', { 
                roomId,
                currentTime: audioPlayer.currentTime
            });
        }
    } else {
        audioPlayer.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        
        // 同步暂停状态
        if (roomId && isRoomHost && socket) {
            socket.emit('pause', { 
                roomId,
                currentTime: audioPlayer.currentTime
            });
        }
    }
}

// 播放上一首
function playPrevious() {
    if (playlist.length === 0 || currentIndex <= 0) return;
    playTrack(playlist[currentIndex - 1], currentIndex - 1);
}

// 播放下一首
function playNext() {
    if (playlist.length === 0 || currentIndex >= playlist.length - 1) return;
    playTrack(playlist[currentIndex + 1], currentIndex + 1);
}

// 更新音量
function updateVolume() {
    audioPlayer.volume = volumeSlider.value / 100;
}

// 更新进度条
function updateProgress() {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration || 1;
    const progressPercent = (currentTime / duration) * 100;
    
    progressBar.style.width = `${progressPercent}%`;
    currentTimeEl.textContent = formatTime(currentTime);
    
    // 更新歌词显示
    updateLyricHighlight(currentTime);
    
    // 如果是房主，定期同步进度（每5秒）
    if (roomId && isRoomHost && socket && Math.floor(currentTime) % 5 === 0 && Math.floor(currentTime) !== lastSyncTime) {
        lastSyncTime = Math.floor(currentTime);
        socket.emit('sync-progress', {
            roomId,
            currentTime
        });
    }
}

// 跳转播放进度
function seekTo(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    const seekTime = (clickX / width) * duration;
    
    audioPlayer.currentTime = seekTime;
    
    // 如果是房主，同步进度
    if (roomId && isRoomHost && socket) {
        socket.emit('seek', {
            roomId,
            currentTime: seekTime
        });
    }
}

// 格式化时间
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// 显示播放详情页
function showPlayerDetails() {
    if (!currentTrack) return;
    
    detailsTitle.textContent = currentTrack.name;
    detailsArtist.textContent = Array.isArray(currentTrack.artist) ? currentTrack.artist.join(', ') : currentTrack.artist;
    detailsAlbum.textContent = currentTrack.album || '未知专辑';
    
    // 加载高清专辑图片
    loadAlbumArt(detailsThumbnail, currentTrack.pic_id, currentTrack.source);
    
    playerDetails.classList.add('show');
}

// 隐藏播放详情页
function hidePlayerDetails() {
    playerDetails.classList.remove('show');
}

// 加载歌词
async function loadLyrics(id, source) {
    lyricsContainer.innerHTML = '<p class="loading">加载歌词中...</p>';
    
    try {
        const response = await fetch(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${id}&source=${source}`);
        const data = await response.json();
        
        if (data && data.lyric) {
            const lyrics = parseLyrics(data.lyric);
            displayLyrics(lyrics);
        } else {
            lyricsContainer.innerHTML = '<p class="no-lyrics">暂无歌词</p>';
        }
    } catch (error) {
        console.error('获取歌词失败:', error);
        lyricsContainer.innerHTML = '<p class="no-lyrics">获取歌词失败</p>';
    }
}

// 解析歌词
function parseLyrics(lrc) {
    const lines = lrc.split('\n');
    const lyrics = [];
    
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    lines.forEach(line => {
        const match = timeRegex.exec(line);
        if (match) {
            const mins = parseInt(match[1]);
            const secs = parseInt(match[2]);
            const ms = parseInt(match[3]);
            const time = (mins * 60) + secs + (ms / 1000);
            const text = line.replace(timeRegex, '').trim();
            
            if (text) {
                lyrics.push({ time, text });
            }
        }
    });
    
    return lyrics.sort((a, b) => a.time - b.time);
}

// 显示歌词
function displayLyrics(lyrics) {
    if (!lyrics || lyrics.length === 0) {
        lyricsContainer.innerHTML = '<p class="no-lyrics">暂无歌词</p>';
        return;
    }
    
    lyricsContainer.innerHTML = '';
    lyrics.forEach(line => {
        const p = document.createElement('p');
        p.setAttribute('data-time', line.time);
        p.textContent = line.text;
        lyricsContainer.appendChild(p);
    });
}

// 高亮当前歌词
function updateLyricHighlight(currentTime) {
    const lines = lyricsContainer.querySelectorAll('p');
    let activeIndex = -1;
    
    lines.forEach((line, index) => {
        const time = parseFloat(line.getAttribute('data-time'));
        const nextTime = index < lines.length - 1 ? 
            parseFloat(lines[index + 1].getAttribute('data-time')) : Infinity;
        
        if (currentTime >= time && currentTime < nextTime) {
            activeIndex = index;
        }
        
        line.classList.remove('active');
    });
    
    if (activeIndex !== -1) {
        lines[activeIndex].classList.add('active');
        lines[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// 加载推荐歌曲
function loadRecommendations() {
    recommendationsContainer.innerHTML = '<div class="loading">加载推荐中...</div>';
    
    // 模拟推荐数据（因为API没有推荐接口）
    const mockRecommendations = [
        {
            id: '1868553',
            name: '七里香',
            artist: ['周杰伦'],
            album: '七里香',
            pic_id: '109951165566399790',
            url_id: 1868553,
            lyric_id: 1868553,
            source: 'netease'
        },
        {
            id: '1958729',
            name: '晴天',
            artist: ['周杰伦'],
            album: '叶惠美',
            pic_id: '109951165566392690',
            url_id: 1958729,
            lyric_id: 1958729,
            source: 'netease'
        },
        {
            id: '1407551413',
            name: '虚拟',
            artist: ['陈粒'],
            album: '小梦大半',
            pic_id: '109951164583315030',
            url_id: 1407551413,
            lyric_id: 1407551413,
            source: 'netease'
        },
        {
            id: '1997438791',
            name: 'Mojito',
            artist: ['周杰伦'],
            album: 'Mojito',
            pic_id: '109951165084303050',
            url_id: 1997438791,
            lyric_id: 1997438791,
            source: 'netease'
        },
        {
            id: '1985329094',
            name: '我们',
            artist: ['陈奕迅'],
            album: '我们',
            pic_id: '109951167043288310',
            url_id: 1985329094,
            lyric_id: 1985329094,
            source: 'netease'
        },
        {
            id: '65766',
            name: '平凡之路',
            artist: ['朴树'],
            album: '猎户星座',
            pic_id: '2537672838499056',
            url_id: 65766,
            lyric_id: 65766,
            source: 'netease'
        },
        {
            id: '25906124',
            name: '起风了',
            artist: ['买辣椒也用券'],
            album: '起风了',
            pic_id: '109951163099860370',
            url_id: 25906124,
            lyric_id: 25906124,
            source: 'netease'
        },
        {
            id: '2007204',
            name: '甜甜的',
            artist: ['周杰伦'],
            album: '我很忙',
            pic_id: '109951165541135660',
            url_id: 2007204,
            lyric_id: 2007204,
            source: 'netease'
        }
    ];
    
    // 显示推荐歌曲列表
    displayMusicList(mockRecommendations, recommendationsContainer);
    
    // 设置为播放列表
    playlist = mockRecommendations;
}

// 显示音乐列表
function displayMusicList(tracks, container) {
    container.innerHTML = '';
    
    tracks.forEach((track, index) => {
        const isFavorite = favorites.some(fav => 
            fav.id === track.id && fav.source === track.source);
        
        const musicItem = document.createElement('div');
        musicItem.className = 'music-item';
        musicItem.innerHTML = `
            <div class="music-thumbnail">
                <img src="https://via.placeholder.com/50" alt="${track.name}" data-pic-id="${track.pic_id}" data-source="${track.source}">
            </div>
            <div class="music-info">
                <div class="music-title">${track.name}</div>
                <div class="music-artist">${Array.isArray(track.artist) ? track.artist.join(', ') : track.artist}</div>
            </div>
            <div class="music-actions">
                <button class="favorite-btn" data-id="${track.id}" data-source="${track.source}">
                    <i class="fa${isFavorite ? 's' : 'r'} fa-heart"></i>
                </button>
            </div>
        `;
        
        // 加载专辑图片
        const img = musicItem.querySelector('img');
        loadAlbumArt(img, track.pic_id, track.source);
        
        // 点击播放
        musicItem.querySelector('.music-info').addEventListener('click', () => {
            playTrack(track, index);
        });
        
        // 收藏按钮
        musicItem.querySelector('.favorite-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavoriteItem(track, e.currentTarget);
        });
        
        container.appendChild(musicItem);
    });
}

// 收藏/取消收藏
function toggleFavorite() {
    if (!currentTrack) return;
    
    const index = favorites.findIndex(fav => 
        fav.id === currentTrack.id && fav.source === currentTrack.source);
    
    if (index === -1) {
        favorites.push(currentTrack);
        favoriteIcon.className = 'fas fa-heart';
    } else {
        favorites.splice(index, 1);
        favoriteIcon.className = 'far fa-heart';
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites();
}

// 收藏/取消收藏列表项
function toggleFavoriteItem(track, button) {
    const index = favorites.findIndex(fav => 
        fav.id === track.id && fav.source === track.source);
    
    if (index === -1) {
        favorites.push(track);
        button.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
        favorites.splice(index, 1);
        button.innerHTML = '<i class="far fa-heart"></i>';
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites();
    
    // 如果当前播放的歌曲是被操作的歌曲，更新收藏图标
    if (currentTrack && currentTrack.id === track.id && currentTrack.source === track.source) {
        favoriteIcon.className = index === -1 ? 'fas fa-heart' : 'far fa-heart';
    }
}

// 加载收藏列表
function loadFavorites() {
    if (favorites.length === 0) {
        favoritesContainer.innerHTML = '<div class="empty-message">还没有收藏歌曲</div>';
        return;
    }
    
    displayMusicList(favorites, favoritesContainer);
}

// 创建房间
function createRoom() {
    if (!currentTrack) {
        alert('请先选择一首歌曲进行播放');
        return;
    }
    
    // 随机生成6位房间号
    roomId = Math.floor(100000 + Math.random() * 900000).toString();
    isRoomHost = true;
    
    // 连接WebSocket
    connectToRoom();
    
    // 更新UI
    roomIdDisplay.textContent = roomId;
    roomStatus.classList.remove('hidden');
    document.querySelector('.create-room').style.display = 'none';
    document.querySelector('.join-room').style.display = 'none';
}

// 加入房间
function joinRoom() {
    const inputId = roomInput.value.trim();
    if (!inputId || inputId.length !== 6) {
        alert('请输入正确的6位房间号');
        return;
    }
    
    roomId = inputId;
    isRoomHost = false;
    
    // 连接WebSocket
    connectToRoom();
    
    // 更新UI
    roomIdDisplay.textContent = roomId;
    roomStatus.classList.remove('hidden');
    document.querySelector('.create-room').style.display = 'none';
    document.querySelector('.join-room').style.display = 'none';
}

// 退出房间
function leaveRoom() {
    if (socket) {
        socket.disconnect();
    }
    
    roomId = null;
    isRoomHost = false;
    
    // 更新UI
    roomStatus.classList.add('hidden');
    document.querySelector('.create-room').style.display = 'block';
    document.querySelector('.join-room').style.display = 'block';
    roomInput.value = '';
}

// 连接到WebSocket服务器
function connectToRoom() {
    // 连接到实际的Socket.io服务器
    socket = io('http://localhost:3000'); // 根据实际服务器地址修改

    // 设置Socket事件处理
    setupSocketEvents();

    // 根据是否是房主执行不同操作
    if (isRoomHost) {
        socket.emit('create-room', {
            roomId,
            track: currentTrack,
            currentTime: audioPlayer.currentTime
        });
    } else {
        socket.emit('join-room', { roomId });
    }
}

// 设置WebSocket事件处理
function setupSocketEvents() {
    // 房间创建成功
    socket.on('room-created', (data) => {
        console.log('房间创建成功:', data);
        roomUsersDisplay.textContent = data.userCount;
    });

    // 加入房间成功
    socket.on('room-joined', (data) => {
        console.log('加入房间成功:', data);
        roomUsersDisplay.textContent = data.userCount;
        
        // 同步当前播放状态
        if (data.currentTrack) {
            receiveTrackInfo({
                track: data.currentTrack,
                currentTime: data.currentTime
            });
            
            if (!data.isPlaying) {
                audioPlayer.pause();
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
    });

    // 同步状态
    socket.on('sync-state', (data) => {
        if (!isRoomHost) {
            receiveTrackInfo({
                track: data.currentTrack,
                currentTime: data.currentTime
            });
            
            if (!data.isPlaying) {
                audioPlayer.pause();
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
    });

    // 成为新房主
    socket.on('become-host', (data) => {
        isRoomHost = true;
        console.log('你已成为房主');
        alert('原房主已离开，你现在是房主');
    });

    // 错误处理
    socket.on('error', (data) => {
        alert(data.message);
        leaveRoom();
    });

    // 房间用户数更新
    socket.on('room-users', (data) => {
        roomUsersDisplay.textContent = data.count;
    });

    // 歌曲变更
    socket.on('track-change', (data) => {
        if (!isRoomHost) {
            receiveTrackInfo(data);
        }
    });

    // 播放
    socket.on('play', (data) => {
        if (!isRoomHost) {
            if (data.currentTime !== undefined) {
                audioPlayer.currentTime = data.currentTime;
            }
            audioPlayer.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    });

    // 暂停
    socket.on('pause', (data) => {
        if (!isRoomHost) {
            if (data.currentTime !== undefined) {
                audioPlayer.currentTime = data.currentTime;
            }
            audioPlayer.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });

    // 进度同步
    socket.on('seek', (data) => {
        if (!isRoomHost) {
            audioPlayer.currentTime = data.currentTime;
        }
    });

    // 定期进度同步
    socket.on('sync-progress', (data) => {
        if (!isRoomHost && Math.abs(audioPlayer.currentTime - data.currentTime) > 2) {
            // 如果进度差异超过2秒，进行同步
            audioPlayer.currentTime = data.currentTime;
        }
    });
}

// 接收并播放歌曲信息
function receiveTrackInfo(data) {
    if (!data.track) return;
    
    // 更新当前播放歌曲
    currentTrack = data.track;
    
    // 更新播放器UI
    currentTitle.textContent = currentTrack.name;
    currentArtist.textContent = Array.isArray(currentTrack.artist) ? currentTrack.artist.join(', ') : currentTrack.artist;
    
    // 加载专辑图片
    loadAlbumArt(currentThumbnail, currentTrack.pic_id, currentTrack.source);
    
    // 检查是否收藏
    const isFavorite = favorites.some(fav => 
        fav.id === currentTrack.id && fav.source === currentTrack.source);
    favoriteIcon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
    
    // 获取音乐URL
    fetch(`https://music-api.gdstudio.xyz/api.php?types=url&id=${currentTrack.id}&source=${currentTrack.source}`)
        .then(response => response.json())
        .then(urlData => {
            if (urlData && urlData.url) {
                audioPlayer.src = urlData.url;
                
                // 加载歌词
                loadLyrics(currentTrack.id, currentTrack.source);
                
                // 如果有进度信息，同步进度
                if (data.currentTime) {
                    audioPlayer.currentTime = data.currentTime;
                }
                
                audioPlayer.play()
                    .then(() => {
                        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    })
                    .catch(error => {
                        console.error('播放失败:', error);
                        playBtn.innerHTML = '<i class="fas fa-play"></i>';
                    });
            } else {
                alert('无法获取音乐播放地址，请尝试其他歌曲');
            }
        })
        .catch(error => {
            console.error('获取音乐URL失败:', error);
            alert('获取音乐播放地址失败，请稍后再试');
        });
}

// 初始化应用
window.addEventListener('DOMContentLoaded', init);