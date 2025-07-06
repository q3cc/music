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
let repeatMode = 'off'; // off, one, all
let isShuffled = false;
let originalPlaylist = [];
let isSocketConnected = false; // 连接状态标记

// 音质设置
let currentQuality = '999';

// 缓存相关变量
let searchCache = new Map();
let albumArtCache = new Map();
let musicUrlCache = new Map();
let lyricsCache = new Map();

// 分页相关变量
let currentPage = 1;
let totalPages = 1;
let currentSearchQuery = '';
let currentSearchSource = 'netease';
let isLoadingMore = false;

// 图片加载队列管理
let imageLoadQueue = [];
let isProcessingImages = false;

// API 配置
const API_BASE_URL = 'https://music-api.gdstudio.xyz/api.php';

// 音乐源配置
const MUSIC_SOURCES = {
    netease: { name: '网易云音乐', icon: 'cloud' },
    tencent: { name: 'QQ音乐', icon: 'qq' },
    migu: { name: '咪咕音乐', icon: 'music' },
    kugou: { name: '酷狗音乐', icon: 'dog' },
    kuwo: { name: '酷我音乐', icon: 'microphone' },
    ximalaya: { name: '喜马拉雅', icon: 'podcast' },
    tidal: { name: 'TIDAL', icon: 'wave' },
    spotify: { name: 'Spotify', icon: 'spotify' },
    ytmusic: { name: 'YouTube Music', icon: 'youtube' },
    qobuz: { name: 'Qobuz', icon: 'record-vinyl' },
    joox: { name: 'JOOX', icon: 'headphones' },
    deezer: { name: 'Deezer', icon: 'compact-disc' }
};

// DOM 元素
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const sourceSelect = document.getElementById('source-select');
const qualitySelect = document.getElementById('quality-select');
const resultsContainer = document.getElementById('results-container');
const resultsInfo = document.getElementById('results-info');
const favoritesContainer = document.getElementById('favorites-container');
const trendingContainer = document.getElementById('trending-container');
const navLinks = document.querySelectorAll('.nav-links li');
const pages = document.querySelectorAll('.page');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const repeatBtn = document.getElementById('repeat-btn');
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
const playlistBtn = document.getElementById('playlist-btn');
const playlistSidebar = document.getElementById('playlist-sidebar');
const closePlaylist = document.getElementById('close-playlist');
const playlistTracks = document.getElementById('playlist-tracks');
const playlistCount = document.getElementById('playlist-count');
const clearPlaylist = document.getElementById('clear-playlist');
const toastContainer = document.getElementById('toast-container');
const loadingOverlay = document.getElementById('loading-overlay');

// 移动端元素
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileSearchBtn = document.getElementById('mobile-search-btn');
const mobilePlaylistBtn = document.getElementById('mobile-playlist-btn');
const mobileOverlay = document.getElementById('mobile-overlay');
const sidebar = document.querySelector('.sidebar');

// 热门推荐标签
const tabBtns = document.querySelectorAll('.tab-btn');

// 初始化
function init() {
    // 事件监听器
    setupEventListeners();
    
    // 加载收藏列表
    loadFavorites();
    
    // 更新播放列表显示
    updatePlaylistDisplay();
    
    // 初始化房间UI状态
    updateRoomUI();
    
    // 初始化音质设置
    if (qualitySelect) {
        qualitySelect.addEventListener('change', (e) => {
            currentQuality = e.target.value;
            showToast('音质设置已更新', 'success');
        });
    }
    
    // 初始化触摸手势
    initTouchGestures();
    
    // 检查 URL 参数
    checkURLParams();
}

// 设置事件监听器
function setupEventListeners() {
    // 移动端导航
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', focusSearchInput);
    }
    
    if (mobilePlaylistBtn) {
        mobilePlaylistBtn.addEventListener('click', showPlaylist);
    }
    
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMobileMenu);
    }
    
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
            
            if (window.innerWidth <= 1024) {
                closeMobileMenu();
            }
        });
    });
    
    // 搜索功能
    searchBtn.addEventListener('click', () => performSearch());
    searchInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // 播放控制
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    volumeSlider.addEventListener('input', updateVolume);
    progressContainer.addEventListener('click', seekTo);
    
    // 进度条拖动
    progressContainer.addEventListener('mousedown', handleDragStart);
    progressContainer.addEventListener('touchstart', handleDragStart, { passive: false });
    
    // 音频事件
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', handleTrackEnd);
    audioPlayer.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(audioPlayer.duration);
    });
    audioPlayer.addEventListener('error', handleAudioError);
    
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
    
    // 播放列表功能
    playlistBtn.addEventListener('click', showPlaylist);
    closePlaylist.addEventListener('click', hidePlaylist);
    clearPlaylist.addEventListener('click', clearPlaylistTracks);
    
    // 热门推荐标签
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadTrendingContent(e.target.getAttribute('data-tab'));
        });
    });
    
    // 窗口大小改变
    window.addEventListener('resize', handleResize);
}

// 搜索音乐
async function performSearch(loadMore = false) {
    const query = searchInput.value.trim();
    if (!query) {
        showToast('请输入搜索内容', 'error');
        return;
    }
    
    const source = sourceSelect.value;
    
    // 如果是新搜索，重置分页
    if (!loadMore || query !== currentSearchQuery || source !== currentSearchSource) {
        currentPage = 1;
        currentSearchQuery = query;
        currentSearchSource = source;
        resultsContainer.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>搜索中...</p></div>';
        resultsInfo.textContent = '';
    } else {
        isLoadingMore = true;
    }
    
    // 检查缓存
    const cacheKey = `${source}-${query}-${currentPage}`;
    if (searchCache.has(cacheKey)) {
        const cachedData = searchCache.get(cacheKey);
        displaySearchResults(cachedData.results, loadMore);
        updatePagination(cachedData.totalPages);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}?types=search&source=${source}&name=${encodeURIComponent(query)}&count=20&pages=${currentPage}`);
        const data = await response.json();
        
        if (data && Array.isArray(data) && data.length > 0) {
            // 缓存搜索结果
            const totalPages = currentPage < 5 ? currentPage + 1 : currentPage;
            searchCache.set(cacheKey, { results: data, totalPages });
            
            // 限制缓存大小
            if (searchCache.size > 50) {
                const firstKey = searchCache.keys().next().value;
                searchCache.delete(firstKey);
            }
            
            displaySearchResults(data, loadMore);
            updatePagination(totalPages);
            
            if (!loadMore) {
                playlist = data;
            } else {
                playlist = [...playlist, ...data];
            }
            
            // 更新结果信息
            resultsInfo.textContent = `找到 ${data.length} 首歌曲`;
        } else {
            if (!loadMore) {
                resultsContainer.innerHTML = '<div class="empty-message">未找到相关结果</div>';
                resultsInfo.textContent = '';
            }
            showToast('未找到相关结果', 'info');
        }
    } catch (error) {
        console.error('搜索失败:', error);
        if (!loadMore) {
            resultsContainer.innerHTML = '<div class="empty-message">搜索失败，请稍后再试</div>';
        }
        showToast('搜索失败，请稍后再试', 'error');
    } finally {
        isLoadingMore = false;
    }
}

// 显示搜索结果
function displaySearchResults(results, loadMore = false) {
    if (!loadMore) {
        resultsContainer.innerHTML = '';
    }
    
    displayMusicList(results, resultsContainer, loadMore);
}

// 显示音乐列表
function displayMusicList(tracks, container, append = false) {
    if (!append) {
        container.innerHTML = '';
    }
    
    tracks.forEach((track, index) => {
        const isFavorite = favorites.some(fav => 
            fav.id === track.id && fav.source === track.source);
        
        const sourceInfo = MUSIC_SOURCES[track.source] || { name: track.source, icon: 'music' };
        
        const musicItem = document.createElement('div');
        musicItem.className = 'music-item';
        musicItem.innerHTML = `
            <div class="music-thumbnail">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Crect width='56' height='56' fill='%23282828'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23717171' font-family='Arial' font-size='24'%3E♪%3C/text%3E%3C/svg%3E" 
                     alt="${track.name}" 
                     data-pic-id="${track.pic_id}" 
                     data-source="${track.source}">
            </div>
            <div class="music-info">
                <div class="music-title">${track.name}</div>
                <div class="music-artist">${Array.isArray(track.artist) ? track.artist.join(', ') : track.artist}</div>
                <div class="music-meta">
                    <span class="music-source">${sourceInfo.name}</span>
                    <span class="music-album">${track.album || '未知专辑'}</span>
                </div>
            </div>
            <div class="music-actions">
                <button class="add-to-playlist-btn" data-id="${track.id}" data-source="${track.source}" title="添加到播放列表">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="favorite-btn" data-id="${track.id}" data-source="${track.source}" title="收藏">
                    <i class="fa${isFavorite ? 's' : 'r'} fa-heart"></i>
                </button>
            </div>
        `;
        
        // 加载专辑图片
        const img = musicItem.querySelector('img');
        if (track.pic_id) {
            loadAlbumArt(img, track.pic_id, track.source, track);
        }
        
        // 点击播放
        musicItem.querySelector('.music-info').addEventListener('click', () => {
            const adjustedIndex = append ? playlist.length - tracks.length + index : index;
            playTrack(track, adjustedIndex);
            addToPlaylist(track);
        });
        
        // 添加到播放列表
        musicItem.querySelector('.add-to-playlist-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            addToPlaylist(track);
            showToast('已添加到播放列表', 'success');
        });
        
        // 收藏按钮
        musicItem.querySelector('.favorite-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavoriteItem(track, e.currentTarget);
        });
        
        container.appendChild(musicItem);
    });
}

// 加载专辑图片
async function loadAlbumArt(img, picId, source, trackInfo = null) {
    const cacheKey = `${source}-${picId}`;
    
    // 检查缓存
    if (albumArtCache.has(cacheKey)) {
        img.src = albumArtCache.get(cacheKey);
        return;
    }
    
    // 添加到加载队列
    imageLoadQueue.push({
        img,
        picId,
        source,
        cacheKey,
        trackInfo
    });
    
    // 开始处理队列
    processImageQueue();
}

// 处理图片加载队列
async function processImageQueue() {
    if (isProcessingImages || imageLoadQueue.length === 0) return;
    
    isProcessingImages = true;
    
    while (imageLoadQueue.length > 0) {
        const batch = imageLoadQueue.splice(0, 5);
        const promises = batch.map(item => loadSingleImage(item));
        
        try {
            await Promise.all(promises);
        } catch (error) {
            console.warn('批量加载图片时出现错误:', error);
        }
        
        if (imageLoadQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    isProcessingImages = false;
}

// 加载单张图片
async function loadSingleImage({ img, picId, source, cacheKey }) {
    try {
        const response = await fetch(`${API_BASE_URL}?types=pic&source=${source}&id=${picId}&size=300`);
        const data = await response.json();
        
        if (data && data.url) {
            img.src = data.url;
            albumArtCache.set(cacheKey, data.url);
            
            // 限制缓存大小
            if (albumArtCache.size > 200) {
                const firstKey = albumArtCache.keys().next().value;
                albumArtCache.delete(firstKey);
            }
        }
    } catch (error) {
        console.warn(`获取专辑图片失败 ${cacheKey}:`, error);
    }
}

// 播放音乐
async function playTrack(track, index) {
    currentTrack = track;
    currentIndex = index;
    
    // 更新播放器UI
    currentTitle.textContent = track.name;
    currentArtist.textContent = Array.isArray(track.artist) ? track.artist.join(', ') : track.artist;
    
    // 加载专辑图片
    if (track.pic_id) {
        loadAlbumArt(currentThumbnail, track.pic_id, track.source, track);
        loadAlbumArt(detailsThumbnail, track.pic_id, track.source, track);
    }
    
    // 更新详情页信息
    detailsTitle.textContent = track.name;
    detailsArtist.textContent = Array.isArray(track.artist) ? track.artist.join(', ') : track.artist;
    detailsAlbum.textContent = track.album || '未知专辑';
    
    // 检查是否收藏
    const isFavorite = favorites.some(fav => 
        fav.id === track.id && fav.source === track.source);
    favoriteIcon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
    
    // 标记当前播放项
    updatePlayingItemUI();
    
    // 获取音乐URL
    const urlCacheKey = `${track.source}-${track.id}-${currentQuality}`;
    
    // 检查URL缓存
    if (musicUrlCache.has(urlCacheKey)) {
        const cachedUrl = musicUrlCache.get(urlCacheKey);
        playAudio(cachedUrl);
        loadLyrics(track.id, track.source);
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}?types=url&source=${track.source}&id=${track.id}&br=${currentQuality}`);
        const data = await response.json();
        
        if (data && data.url) {
            // 缓存音乐URL
            musicUrlCache.set(urlCacheKey, data.url);
            cleanExpiredCache();
            
            playAudio(data.url);
            loadLyrics(track.id, track.source);
            
            // 如果在房间中，同步播放状态
            if (roomId && socket) {
                socket.emit('track-change', {
                    roomId,
                    track: currentTrack
                });
            }
        } else {
            throw new Error('无法获取音乐播放地址');
        }
    } catch (error) {
        console.error('获取音乐URL失败:', error);
        showToast('无法播放该歌曲，请尝试其他音源', 'error');
    } finally {
        showLoading(false);
    }
}

// 播放音频
function playAudio(url) {
    audioPlayer.src = url;
    audioPlayer.play()
        .then(() => {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            document.title = `${currentTrack.name} - ${currentTrack.artist} | Moring音乐台`;
        })
        .catch(error => {
            console.error('播放失败:', error);
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            showToast('播放失败，请稍后再试', 'error');
        });
}

// 加载歌词
async function loadLyrics(id, source) {
    const cacheKey = `${source}-${id}`;
    
    // 检查缓存
    if (lyricsCache.has(cacheKey)) {
        const cachedLyrics = lyricsCache.get(cacheKey);
        displayLyrics(cachedLyrics);
        return;
    }
    
    lyricsContainer.innerHTML = '<p class="loading">加载歌词中...</p>';
    
    try {
        const response = await fetch(`${API_BASE_URL}?types=lyric&source=${source}&id=${id}`);
        const data = await response.json();
        
        if (data && data.lyric) {
            const lyrics = parseLyrics(data.lyric);
            lyricsCache.set(cacheKey, lyrics);
            displayLyrics(lyrics);
            
            // 限制歌词缓存大小
            if (lyricsCache.size > 100) {
                const firstKey = lyricsCache.keys().next().value;
                lyricsCache.delete(firstKey);
            }
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
    lyrics.forEach((line, index) => {
        const p = document.createElement('p');
        p.setAttribute('data-time', line.time);
        p.setAttribute('data-index', index);
        p.textContent = line.text;
        p.addEventListener('click', () => {
            audioPlayer.currentTime = line.time;
        });
        lyricsContainer.appendChild(p);
    });
}

// 更新歌词高亮
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

// 切换播放/暂停
function togglePlay() {
    if (!currentTrack) {
        showToast('请先选择一首歌曲', 'info');
        return;
    }
    
    if (audioPlayer.paused) {
        audioPlayer.play();
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        
        if (roomId && socket) {
            socket.emit('play', { 
                roomId,
                currentTime: audioPlayer.currentTime
            });
        }
    } else {
        audioPlayer.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        
        if (roomId && socket) {
            socket.emit('pause', { 
                roomId,
                currentTime: audioPlayer.currentTime
            });
        }
    }
}

// 播放上一首
function playPrevious() {
    if (playlist.length === 0) return;
    
    if (isShuffled) {
        const randomIndex = Math.floor(Math.random() * playlist.length);
        playTrack(playlist[randomIndex], randomIndex);
    } else if (currentIndex > 0) {
        playTrack(playlist[currentIndex - 1], currentIndex - 1);
    } else {
        playTrack(playlist[playlist.length - 1], playlist.length - 1);
    }
}

// 播放下一首
function playNext() {
    if (playlist.length === 0) return;
    
    if (isShuffled) {
        const randomIndex = Math.floor(Math.random() * playlist.length);
        playTrack(playlist[randomIndex], randomIndex);
    } else if (currentIndex < playlist.length - 1) {
        playTrack(playlist[currentIndex + 1], currentIndex + 1);
    } else {
        playTrack(playlist[0], 0);
    }
}

// 处理歌曲结束
function handleTrackEnd() {
    if (repeatMode === 'one') {
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    } else if (repeatMode === 'all' || currentIndex < playlist.length - 1) {
        playNext();
    } else {
        // 播放列表结束
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

// 切换随机播放
function toggleShuffle() {
    isShuffled = !isShuffled;
    shuffleBtn.classList.toggle('active');
    
    if (isShuffled) {
        originalPlaylist = [...playlist];
        playlist.sort(() => Math.random() - 0.5);
        showToast('随机播放已开启', 'success');
    } else {
        if (originalPlaylist.length > 0) {
            playlist = [...originalPlaylist];
        }
        showToast('随机播放已关闭', 'success');
    }
}

// 切换循环模式
function toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const currentModeIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentModeIndex + 1) % modes.length];
    
    repeatBtn.classList.toggle('active', repeatMode !== 'off');
    
    if (repeatMode === 'one') {
        repeatBtn.innerHTML = '<i class="fas fa-redo-alt">1</i>';
        showToast('单曲循环', 'success');
    } else if (repeatMode === 'all') {
        repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
        showToast('列表循环', 'success');
    } else {
        repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
        showToast('循环关闭', 'success');
    }
}

// 更新音量
function updateVolume() {
    audioPlayer.volume = volumeSlider.value / 100;
}

// 更新进度条
function updateProgress() {
    if (isDragging) return;
    
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration || 1;
    const progressPercent = (currentTime / duration) * 100;
    
    progressBar.style.width = `${progressPercent}%`;
    currentTimeEl.textContent = formatTime(currentTime);
    
    // 更新歌词高亮
    updateLyricHighlight(currentTime);
    
    // 定期同步进度
    if (roomId && socket && Math.floor(currentTime) % 5 === 0 && Math.floor(currentTime) !== lastSyncTime) {
        lastSyncTime = Math.floor(currentTime);
        socket.emit('sync-progress', {
            roomId,
            currentTime
        });
    }
}

// 跳转播放进度
function seekTo(e) {
    const rect = progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const seekTime = percentage * audioPlayer.duration;
    
    audioPlayer.currentTime = seekTime;
    
    if (roomId && socket) {
        socket.emit('seek', {
            roomId,
            currentTime: seekTime
        });
    }
}

// 进度条拖动
let isDragging = false;

function handleDragStart(e) {
    isDragging = true;
    e.preventDefault();
    
    const handleMove = (e) => handleDrag(e);
    const handleEnd = () => handleDragEnd();
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    
    window.dragCleanup = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
    };
}

function handleDrag(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const rect = progressContainer.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const duration = audioPlayer.duration;
    
    if (duration) {
        const seekTime = percentage * duration;
        audioPlayer.currentTime = seekTime;
        progressBar.style.width = `${percentage * 100}%`;
        currentTimeEl.textContent = formatTime(seekTime);
    }
}

function handleDragEnd() {
    if (!isDragging) return;
    
    isDragging = false;
    
    if (window.dragCleanup) {
        window.dragCleanup();
        delete window.dragCleanup;
    }
    
    if (roomId && socket) {
        socket.emit('seek', {
            roomId,
            currentTime: audioPlayer.currentTime
        });
    }
}

// 格式化时间
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// 显示/隐藏播放详情页
function showPlayerDetails() {
    if (!currentTrack) return;
    playerDetails.classList.add('show');
}

function hidePlayerDetails() {
    playerDetails.classList.remove('show');
}

// 收藏功能
function toggleFavorite() {
    if (!currentTrack) return;
    
    const index = favorites.findIndex(fav => 
        fav.id === currentTrack.id && fav.source === currentTrack.source);
    
    if (index === -1) {
        favorites.push(currentTrack);
        favoriteIcon.className = 'fas fa-heart';
        showToast('已添加到收藏', 'success');
    } else {
        favorites.splice(index, 1);
        favoriteIcon.className = 'far fa-heart';
        showToast('已从收藏中移除', 'success');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites();
}

function toggleFavoriteItem(track, button) {
    const index = favorites.findIndex(fav => 
        fav.id === track.id && fav.source === track.source);
    
    if (index === -1) {
        favorites.push(track);
        button.innerHTML = '<i class="fas fa-heart"></i>';
        showToast('已添加到收藏', 'success');
    } else {
        favorites.splice(index, 1);
        button.innerHTML = '<i class="far fa-heart"></i>';
        showToast('已从收藏中移除', 'success');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites();
    
    // 更新当前播放歌曲的收藏状态
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

// 播放列表功能
function showPlaylist() {
    playlistSidebar.classList.add('show');
    updatePlaylistDisplay();
}

function hidePlaylist() {
    playlistSidebar.classList.remove('show');
}

function clearPlaylistTracks() {
    if (confirm('确定要清空播放列表吗？')) {
        playlist = [];
        currentIndex = 0;
        updatePlaylistDisplay();
        showToast('播放列表已清空', 'success');
        
        if (roomId && socket) {
            socket.emit('playlist-update', {
                roomId,
                playlist
            });
        }
    }
}

function addToPlaylist(track) {
    const exists = playlist.some(item => 
        item.id === track.id && item.source === track.source);
    
    if (!exists) {
        playlist.push(track);
        updatePlaylistDisplay();
        
        if (roomId && socket) {
            socket.emit('playlist-update', {
                roomId,
                playlist
            });
        }
    }
}

function removeFromPlaylist(index) {
    if (index === currentIndex) {
        audioPlayer.pause();
        currentTrack = null;
        currentTitle.textContent = '未播放';
        currentArtist.textContent = '--';
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else if (index < currentIndex) {
        currentIndex--;
    }
    
    playlist.splice(index, 1);
    updatePlaylistDisplay();
    
    if (roomId && socket) {
        socket.emit('playlist-update', {
            roomId,
            playlist
        });
    }
}

function updatePlaylistDisplay() {
    playlistCount.textContent = `${playlist.length} 首歌曲`;
    
    if (playlist.length === 0) {
        playlistTracks.innerHTML = '<div class="empty-playlist">播放列表为空</div>';
        return;
    }
    
    playlistTracks.innerHTML = '';
    
    playlist.forEach((track, index) => {
        const isPlaying = index === currentIndex && currentTrack;
        const trackElement = document.createElement('div');
        trackElement.className = `playlist-track ${isPlaying ? 'playing' : ''}`;
        trackElement.innerHTML = `
            <div class="playlist-track-index">${index + 1}</div>
            <div class="playlist-track-thumbnail">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23282828'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23717171' font-family='Arial' font-size='16'%3E♪%3C/text%3E%3C/svg%3E" 
                     alt="${track.name}">
            </div>
            <div class="playlist-track-info">
                <div class="playlist-track-title">${track.name}</div>
                <div class="playlist-track-artist">${Array.isArray(track.artist) ? track.artist.join(', ') : track.artist}</div>
            </div>
            <button class="playlist-track-remove" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // 加载专辑图片
        const img = trackElement.querySelector('img');
        if (track.pic_id) {
            loadAlbumArt(img, track.pic_id, track.source, track);
        }
        
        // 点击播放
        trackElement.addEventListener('click', (e) => {
            if (!e.target.closest('.playlist-track-remove')) {
                playTrack(track, index);
            }
        });
        
        // 移除按钮
        const removeBtn = trackElement.querySelector('.playlist-track-remove');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromPlaylist(index);
        });
        
        playlistTracks.appendChild(trackElement);
    });
}

// 更新当前播放项UI
function updatePlayingItemUI() {
    // 更新搜索结果中的播放状态
    document.querySelectorAll('.music-item').forEach(item => {
        item.classList.remove('playing');
    });
    
    // 更新播放列表中的播放状态
    document.querySelectorAll('.playlist-track').forEach((item, index) => {
        if (index === currentIndex) {
            item.classList.add('playing');
        } else {
            item.classList.remove('playing');
        }
    });
}

// 分页功能
function updatePagination(totalPagesCount) {
    totalPages = totalPagesCount;
    
    const existingPagination = document.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    if (currentPage < totalPages) {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-container';
        paginationContainer.innerHTML = `
            <button id="load-more-btn" class="btn btn-secondary">加载更多</button>
            <span class="page-info">第 ${currentPage} 页</span>
        `;
        
        resultsContainer.appendChild(paginationContainer);
        
        const loadMoreBtn = document.getElementById('load-more-btn');
        loadMoreBtn.addEventListener('click', () => {
            if (!isLoadingMore) {
                currentPage++;
                performSearch(true);
            }
        });
    }
}

// Toast 提示
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    }[type] || 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 加载提示
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('show');
    } else {
        loadingOverlay.classList.remove('show');
    }
}

// 移动端菜单
function toggleMobileMenu() {
    sidebar.classList.toggle('show');
    mobileOverlay.classList.toggle('show');
    document.body.style.overflow = sidebar.classList.contains('show') ? 'hidden' : '';
}

function closeMobileMenu() {
    sidebar.classList.remove('show');
    mobileOverlay.classList.remove('show');
    document.body.style.overflow = '';
}

function focusSearchInput() {
    searchInput.focus();
    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 窗口大小改变处理
function handleResize() {
    if (window.innerWidth > 1024) {
        closeMobileMenu();
    }
}

// 触摸手势支持
function initTouchGestures() {
    let startX = 0;
    let startY = 0;
    
    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!startX || !startY) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = startX - currentX;
        const diffY = startY - currentY;
        
        if (Math.abs(diffX) > Math.abs(diffY) && window.innerWidth <= 1024) {
            if (startX < 20 && diffX < -50) {
                if (!sidebar.classList.contains('show')) {
                    toggleMobileMenu();
                }
            } else if (startX > window.innerWidth - 20 && diffX > 50) {
                if (!playlistSidebar.classList.contains('show')) {
                    showPlaylist();
                }
            }
        }
    }, { passive: true });
}

// 热门推荐功能
async function loadTrendingContent(tab) {
    trendingContainer.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>加载中...</p></div>';
    
    try {
        // 这里可以根据不同的标签加载不同的内容
        let query = '';
        switch (tab) {
            case 'hot-songs':
                query = '热门';
                break;
            case 'new-songs':
                query = '新歌';
                break;
            case 'top-charts':
                query = '排行榜';
                break;
        }
        
        const response = await fetch(`${API_BASE_URL}?types=search&source=netease&name=${encodeURIComponent(query)}&count=20`);
        const data = await response.json();
        
        if (data && Array.isArray(data) && data.length > 0) {
            displayMusicList(data, trendingContainer);
        } else {
            trendingContainer.innerHTML = '<div class="empty-message">暂无数据</div>';
        }
    } catch (error) {
        console.error('加载热门内容失败:', error);
        trendingContainer.innerHTML = '<div class="empty-message">加载失败，请稍后再试</div>';
    }
}

// 一起听功能
function createRoom() {
    // 检查是否连接到同步服务器
    if (!isSocketConnected) {
        showToast('无法连接到同步服务器，请稍后再试', 'error');
        return;
    }
    
    if (!currentTrack) {
        showToast('请先选择一首歌曲进行播放', 'error');
        return;
    }
    
    roomId = Math.floor(100000 + Math.random() * 900000).toString();
    isRoomHost = true;
    
    connectToRoom();
    
    roomIdDisplay.textContent = roomId;
    roomStatus.classList.remove('hidden');
    document.querySelector('.create-room').style.display = 'none';
    document.querySelector('.join-room').style.display = 'none';
    
    showToast(`房间已创建，房间号：${roomId}`, 'success');
}

function joinRoom() {
    // 检查是否连接到同步服务器
    if (!isSocketConnected) {
        showToast('无法连接到同步服务器，请稍后再试', 'error');
        return;
    }
    
    const inputId = roomInput.value.trim();
    if (!inputId || inputId.length !== 6) {
        showToast('请输入正确的6位房间号', 'error');
        return;
    }
    
    roomId = inputId;
    isRoomHost = false;
    
    connectToRoom();
    
    roomIdDisplay.textContent = roomId;
    roomStatus.classList.remove('hidden');
    document.querySelector('.create-room').style.display = 'none';
    document.querySelector('.join-room').style.display = 'none';
}

function leaveRoom() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    roomId = null;
    isRoomHost = false;
    isSocketConnected = false;
    
    roomStatus.classList.add('hidden');
    document.querySelector('.create-room').style.display = 'block';
    document.querySelector('.join-room').style.display = 'block';
    roomInput.value = '';
    
    updateRoomUI();
    showToast('已退出房间', 'info');
}

function connectToRoom() {
    // 尝试连接到可能的服务器端口
    const serverPorts = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009];
    let currentPortIndex = 0;
    
    function tryConnect() {
        const port = serverPorts[currentPortIndex];
        const serverUrl = `http://localhost:${port}`;
        console.log(`尝试连接到: ${serverUrl}`);
        
        socket = io(serverUrl, {
            timeout: 3000, // 3秒连接超时
            autoConnect: true
        });
        
        // 设置连接状态监听
        socket.on('connect', () => {
            isSocketConnected = true;
            console.log(`Socket连接成功: ${serverUrl}`);
            updateRoomUI();
            
            // 连接成功后发送房间请求
            if (isRoomHost) {
                socket.emit('create-room', {
                    roomId,
                    track: currentTrack,
                    currentTime: audioPlayer.currentTime
                });
            } else {
                socket.emit('join-room', { roomId });
            }
        });
        
        socket.on('disconnect', () => {
            isSocketConnected = false;
            console.log('Socket连接断开');
            updateRoomUI();
        });
        
        socket.on('connect_error', (error) => {
            isSocketConnected = false;
            console.error(`Socket连接错误 (${serverUrl}):`, error);
            
            // 尝试下一个端口
            currentPortIndex++;
            if (currentPortIndex < serverPorts.length) {
                setTimeout(tryConnect, 500); // 0.5秒后尝试下一个端口
            } else {
                showToast('无法连接到任何同步服务器，请确保服务器已启动', 'error');
                updateRoomUI();
            }
        });
        
        setupSocketEvents();
    }
    
    tryConnect();
}

// 更新房间UI状态
function updateRoomUI() {
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomInput = document.getElementById('room-input');
    
    if (isSocketConnected) {
        // 连接正常，启用按钮
        createRoomBtn.disabled = false;
        joinRoomBtn.disabled = false;
        roomInput.disabled = false;
        createRoomBtn.textContent = '创建房间';
        joinRoomBtn.textContent = '加入房间';
    } else {
        // 连接断开，禁用按钮
        createRoomBtn.disabled = true;
        joinRoomBtn.disabled = true;
        roomInput.disabled = true;
        createRoomBtn.textContent = '服务器连接中...';
        joinRoomBtn.textContent = '服务器连接中...';
    }
}

function setupSocketEvents() {
    socket.on('room-created', (data) => {
        console.log('房间创建成功:', data);
        roomUsersDisplay.textContent = data.userCount;
    });
    
    socket.on('room-joined', (data) => {
        console.log('加入房间成功:', data);
        roomUsersDisplay.textContent = data.userCount;
        
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
    
    socket.on('room-users', (data) => {
        roomUsersDisplay.textContent = data.count;
    });
    
    socket.on('track-change', (data) => {
        receiveTrackInfo(data);
    });
    
    socket.on('play', (data) => {
        if (data.currentTime !== undefined) {
            audioPlayer.currentTime = data.currentTime;
        }
        audioPlayer.play();
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });
    
    socket.on('pause', (data) => {
        if (data.currentTime !== undefined) {
            audioPlayer.currentTime = data.currentTime;
        }
        audioPlayer.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
    
    socket.on('seek', (data) => {
        audioPlayer.currentTime = data.currentTime;
    });
    
    socket.on('error', (data) => {
        showToast(data.message, 'error');
        leaveRoom();
    });
}

function receiveTrackInfo(data) {
    if (!data.track) return;
    
    currentTrack = data.track;
    currentTitle.textContent = currentTrack.name;
    currentArtist.textContent = Array.isArray(currentTrack.artist) ? currentTrack.artist.join(', ') : currentTrack.artist;
    
    if (currentTrack.pic_id) {
        loadAlbumArt(currentThumbnail, currentTrack.pic_id, currentTrack.source);
    }
    
    const isFavorite = favorites.some(fav => 
        fav.id === currentTrack.id && fav.source === currentTrack.source);
    favoriteIcon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
    
    playTrack(currentTrack, 0);
    
    if (data.currentTime) {
        audioPlayer.currentTime = data.currentTime;
    }
}

// 清理过期缓存
function cleanExpiredCache() {
    if (musicUrlCache.size > 100) {
        const firstKey = musicUrlCache.keys().next().value;
        musicUrlCache.delete(firstKey);
    }
}

// 处理音频错误
function handleAudioError(e) {
    console.error('音频播放错误:', e);
    showToast('播放出错，尝试重新加载...', 'error');
    
    // 清除当前URL缓存并重试
    if (currentTrack) {
        const urlCacheKey = `${currentTrack.source}-${currentTrack.id}-${currentQuality}`;
        musicUrlCache.delete(urlCacheKey);
        
        // 延迟后重试
        setTimeout(() => {
            playTrack(currentTrack, currentIndex);
        }, 1000);
    }
}

// 检查URL参数
function checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const source = params.get('source');
    
    if (query) {
        searchInput.value = decodeURIComponent(query);
        if (source && sourceSelect) {
            sourceSelect.value = source;
        }
        performSearch();
    }
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // 空格键播放/暂停
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlay();
    }
    
    // 左右键切歌
    if (e.code === 'ArrowLeft' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        playPrevious();
    }
    
    if (e.code === 'ArrowRight' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        playNext();
    }
    
    // 上下键调音量
    if (e.code === 'ArrowUp' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 5);
        updateVolume();
    }
    
    if (e.code === 'ArrowDown' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 5);
        updateVolume();
    }
    
    // F键收藏
    if (e.code === 'KeyF' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        toggleFavorite();
    }
    
    // L键显示歌词
    if (e.code === 'KeyL' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        showPlayerDetails();
    }
    
    // ESC键关闭弹窗
    if (e.code === 'Escape') {
        if (playerDetails.classList.contains('show')) {
            hidePlayerDetails();
        }
        if (playlistSidebar.classList.contains('show')) {
            hidePlaylist();
        }
    }
});

// 初始化应用
window.addEventListener('DOMContentLoaded', init);