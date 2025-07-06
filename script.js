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

// 缓存相关变量
let searchCache = new Map(); // 搜索结果缓存
let albumArtCache = new Map(); // 专辑图片缓存
let musicUrlCache = new Map(); // 音乐URL缓存
let lyricsCache = new Map(); // 歌词缓存

// 分页相关变量
let currentPage = 1;
let totalPages = 1;
let currentSearchQuery = '';
let currentSearchSource = 'netease';
let isLoadingMore = false;

// 图片加载队列管理
let imageLoadQueue = [];
let isProcessingImages = false;

// DOM 元素
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const sourceSelect = document.getElementById('source-select');
const qualitySelect = document.getElementById('quality-select');
const resultsContainer = document.getElementById('results-container');
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

// 移动端元素
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileSearchBtn = document.getElementById('mobile-search-btn');
const mobilePlaylistBtn = document.getElementById('mobile-playlist-btn');
const mobileOverlay = document.getElementById('mobile-overlay');
const sidebar = document.querySelector('.sidebar');

// 初始化
function init() {
    // 移动端导航事件
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
            
            // 移动端点击导航后关闭菜单
            if (window.innerWidth <= 1024) {
                closeMobileMenu();
            }
        });
    });

    // 搜索功能 - 添加防抖
    const debouncedSearch = debounce(() => performSearch(), 500);
    searchBtn.addEventListener('click', () => performSearch());
    searchInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') {
            performSearch();
        } else {
            // 实时搜索建议（可选）
            // debouncedSearch();
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
    
    // 添加进度条拖动事件 - 支持触摸
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
    
    // 触摸手势支持
    initTouchGestures();
    
    // 窗口大小改变时的响应
    window.addEventListener('resize', handleResize);
    
    // 加载收藏列表
    loadFavorites();
    
    // 更新播放列表显示
    updatePlaylistDisplay();
}

// 移动端菜单切换
function toggleMobileMenu() {
    sidebar.classList.toggle('show');
    mobileOverlay.classList.toggle('show');
    
    // 阻止背景滚动
    if (sidebar.classList.contains('show')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// 关闭移动端菜单
function closeMobileMenu() {
    sidebar.classList.remove('show');
    mobileOverlay.classList.remove('show');
    document.body.style.overflow = '';
}

// 聚焦搜索输入框
function focusSearchInput() {
    searchInput.focus();
    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 窗口大小改变处理
function handleResize() {
    // 如果窗口变大，关闭移动端菜单
    if (window.innerWidth > 1024) {
        closeMobileMenu();
    }
}

// 初始化触摸手势
function initTouchGestures() {
    let startX = 0;
    let startY = 0;
    let isScrolling = false;
    
    // 侧滑手势支持
    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isScrolling = false;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!startX || !startY) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = startX - currentX;
        const diffY = startY - currentY;
        
        // 确定是水平滑动还是垂直滚动
        if (!isScrolling) {
            if (Math.abs(diffX) > Math.abs(diffY)) {
                isScrolling = false; // 水平滑动
                e.preventDefault(); // 阻止默认的水平滚动
            } else {
                isScrolling = true; // 垂直滚动
                return;
            }
        }
        
        // 如果是水平滑动且在屏幕边缘，显示/隐藏侧边栏
        if (!isScrolling && window.innerWidth <= 1024) {
            if (startX < 20 && diffX < -50) {
                // 从左边缘右滑，显示侧边栏
                if (!sidebar.classList.contains('show')) {
                    toggleMobileMenu();
                }
            } else if (startX > window.innerWidth - 20 && diffX > 50) {
                // 从右边缘左滑，显示播放列表
                if (!playlistSidebar.classList.contains('show')) {
                    showPlaylist();
                }
            }
        }
    }, { passive: false });
    
    document.addEventListener('touchend', () => {
        startX = 0;
        startY = 0;
        isScrolling = false;
    }, { passive: true });
    
    // 双击播放/暂停
    let tapCount = 0;
    let tapTimer = null;
    
    if (currentThumbnail) {
        currentThumbnail.addEventListener('touchend', (e) => {
            e.preventDefault();
            tapCount++;
            
            if (tapCount === 1) {
                tapTimer = setTimeout(() => {
                    // 单击显示详情
                    showPlayerDetails();
                    tapCount = 0;
                }, 300);
            } else if (tapCount === 2) {
                // 双击播放/暂停
                clearTimeout(tapTimer);
                togglePlay();
                tapCount = 0;
            }
        });
    }
}

// 优化触摸拖动处理
function handleDragStart(e) {
    isDragging = true;
    e.preventDefault();
    
    // 暂停播放
    const wasPlaying = !audioPlayer.paused;
    if (wasPlaying) {
        audioPlayer.pause();
    }
    
    // 添加全局监听器，支持触摸和鼠标
    const handleMove = (e) => handleDrag(e, wasPlaying);
    const handleEnd = (e) => handleDragEnd(e, wasPlaying);
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    
    // 存储清理函数
    window.dragCleanup = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
    };
}

// 处理拖动中 - 优化触摸支持
function handleDrag(e, wasPlaying) {
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
        
        // 更新进度条显示
        progressBar.style.width = `${percentage * 100}%`;
        currentTimeEl.textContent = formatTime(seekTime);
    }
}

// 处理拖动结束 - 优化触摸支持
function handleDragEnd(e, wasPlaying) {
    if (!isDragging) return;
    
    isDragging = false;
    
    // 清理事件监听器
    if (window.dragCleanup) {
        window.dragCleanup();
        delete window.dragCleanup;
    }
    
    // 恢复播放状态
    if (currentTrack && wasPlaying) {
        audioPlayer.play();
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
    
    // 同步进度
    if (roomId && socket) {
        socket.emit('seek', {
            roomId,
            currentTime: audioPlayer.currentTime
        });
    }
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
        resultsContainer.innerHTML = '<div class="loading">搜索中...</div>';
    } else {
        // 加载更多时显示加载状态
        isLoadingMore = true;
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.textContent = '加载中...';
            loadMoreBtn.disabled = true;
        }
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
        const response = await fetch(`https://music-api.gdstudio.xyz/api.php?types=search&source=${source}&name=${encodeURIComponent(query)}&count=20&pages=${currentPage}`);
        const data = await response.json();
        
        if (data && Array.isArray(data) && data.length > 0) {
            // 缓存搜索结果
            const totalPages = currentPage < 5 ? currentPage + 1 : currentPage; // 假设最多5页
            searchCache.set(cacheKey, { results: data, totalPages });
            
            // 限制缓存大小，保留最近50个搜索结果
            if (searchCache.size > 50) {
                const firstKey = searchCache.keys().next().value;
                searchCache.delete(firstKey);
            }
            
            displaySearchResults(data, loadMore);
            updatePagination(totalPages);
            
            if (!loadMore) {
                playlist = data; // 更新播放列表
            } else {
                playlist = [...playlist, ...data]; // 追加到播放列表
            }
        } else {
            console.warn('搜索API返回数据:', data);
            if (!loadMore) {
                resultsContainer.innerHTML = '<div class="empty-message">未找到相关结果或API返回格式异常</div>';
            }
        }
    } catch (error) {
        console.error('搜索失败:', error);
        if (!loadMore) {
            resultsContainer.innerHTML = '<div class="empty-message">搜索失败，请稍后再试</div>';
        }
    } finally {
        isLoadingMore = false;
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.textContent = '加载更多';
            loadMoreBtn.disabled = false;
        }
    }
}

// 显示搜索结果
function displaySearchResults(results, loadMore = false) {
    if (!loadMore) {
        resultsContainer.innerHTML = '';
    }
    
    displayMusicList(results, resultsContainer, loadMore);
}

// 更新分页显示
function updatePagination(totalPagesCount) {
    totalPages = totalPagesCount;
    
    // 移除旧的分页按钮
    const existingPagination = document.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    // 如果有多页，添加加载更多按钮
    if (currentPage < totalPages) {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-container';
        paginationContainer.innerHTML = `
            <button id="load-more-btn" class="btn btn-secondary">加载更多</button>
            <span class="page-info">第 ${currentPage} 页，共 ${totalPages} 页</span>
        `;
        
        resultsContainer.appendChild(paginationContainer);
        
        // 添加加载更多事件
        const loadMoreBtn = document.getElementById('load-more-btn');
        loadMoreBtn.addEventListener('click', () => {
            if (!isLoadingMore) {
                currentPage++;
                performSearch(true);
            }
        });
    }
}

// 加载专辑图片（加入队列管理）
function loadAlbumArt(img, picId, source, trackInfo = null) {
    const cacheKey = `${source}-${picId}`;
    
    // 检查缓存
    if (albumArtCache.has(cacheKey)) {
        img.src = albumArtCache.get(cacheKey);
        return;
    }
    
    // 添加到图片加载队列
    imageLoadQueue.push({
        img,
        picId,
        source,
        cacheKey,
        trackInfo, // 歌曲信息，用于失败后的备用搜索
        retryCount: 0
    });
    
    // 开始处理图片队列
    processImageQueue();
}

// 处理图片加载队列
async function processImageQueue() {
    if (isProcessingImages || imageLoadQueue.length === 0) return;
    
    isProcessingImages = true;
    
    while (imageLoadQueue.length > 0) {
        // 每次取5张图片进行批量处理
        const batch = imageLoadQueue.splice(0, 5);
        
        // 并行请求这5张图片
        const promises = batch.map(item => loadSingleImage(item));
        
        try {
            await Promise.all(promises);
        } catch (error) {
            console.warn('批量加载图片时出现错误:', error);
        }
        
        // 等待500ms再处理下一批
        if (imageLoadQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    isProcessingImages = false;
}

// 加载单张图片
async function loadSingleImage({ img, picId, source, cacheKey, trackInfo, retryCount }) {
    try {
        const response = await fetch(`https://music-api.gdstudio.xyz/api.php?types=pic&source=${source}&id=${picId}&size=300`);
        const data = await response.json();
        
        if (data && data.url) {
            img.src = data.url;
            
            // 缓存图片URL
            albumArtCache.set(cacheKey, data.url);
            
            // 限制缓存大小，保留最近200张图片
            if (albumArtCache.size > 200) {
                const firstKey = albumArtCache.keys().next().value;
                albumArtCache.delete(firstKey);
            }
        } else {
            throw new Error('图片URL为空');
        }
    } catch (error) {
        console.warn(`获取专辑图片失败 ${cacheKey}, 重试次数: ${retryCount}:`, error);
        
        // 如果是第一次失败，进行重试
        if (retryCount === 0) {
            console.log(`重试获取图片 ${cacheKey}`);
            imageLoadQueue.push({
                img,
                picId,
                source,
                cacheKey,
                trackInfo,
                retryCount: 1
            });
            return;
        }
        
        // 如果重试也失败，且有歌曲信息，尝试从其他音乐源获取
        if (retryCount === 1 && trackInfo) {
            console.log(`尝试从其他音乐源获取图片: ${trackInfo.name} - ${trackInfo.artist}`);
            await tryGetImageFromOtherSources(img, trackInfo, source);
        }
    }
}

// 尝试从其他音乐源获取同名同歌手的图片
async function tryGetImageFromOtherSources(img, trackInfo, originalSource) {
    const sources = ['netease', 'tencent', 'kuwo', 'kugou', 'migu'];
    const availableSources = sources.filter(s => s !== originalSource);
    
    const artistName = Array.isArray(trackInfo.artist) ? trackInfo.artist.join(' ') : trackInfo.artist;
    const searchQuery = `${trackInfo.name} ${artistName}`;
    
    for (const source of availableSources) {
        try {
            console.log(`尝试从 ${source} 搜索图片: ${searchQuery}`);
            
            const searchResponse = await fetch(`https://music-api.gdstudio.xyz/api.php?types=search&source=${source}&name=${encodeURIComponent(searchQuery)}&count=1`);
            const searchData = await searchResponse.json();
            
            if (searchData && Array.isArray(searchData) && searchData.length > 0) {
                const track = searchData[0];
                console.log(`在 ${source} 找到对应歌曲:`, track);
                
                // 尝试获取这个歌曲的图片
                const picResponse = await fetch(`https://music-api.gdstudio.xyz/api.php?types=pic&source=${source}&id=${track.pic_id}&size=300`);
                const picData = await picResponse.json();
                
                if (picData && picData.url) {
                    console.log(`成功从 ${source} 获取到图片`);
                    img.src = picData.url;
                    
                    // 缓存图片（使用原始缓存键）
                    const originalCacheKey = `${originalSource}-${trackInfo.pic_id || trackInfo.id}`;
                    albumArtCache.set(originalCacheKey, picData.url);
                    
                    return; // 成功获取，退出循环
                }
            }
            
            // 延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.warn(`从 ${source} 获取图片失败:`, error);
        }
    }
    
    console.warn(`所有音乐源都无法获取到图片: ${searchQuery}`);
}

// 播放音乐
async function playTrack(track, index) {
    currentTrack = track;
    currentIndex = index;
    
    // 特殊处理：周杰伦歌曲强制使用酷我音乐
    const artistName = Array.isArray(track.artist) ? track.artist.join(' ') : track.artist;
    if (artistName.includes('周杰伦') && track.source !== 'kuwo') {
        console.log('检测到周杰伦歌曲，切换到酷我音乐源');
        // 使用酷我音乐重新搜索这首歌
        searchAndPlayFromKuwo(track.name, artistName);
        return;
    }
    
    // 更新播放器UI
    currentTitle.textContent = track.name;
    currentArtist.textContent = artistName;
    
    // 加载专辑图片
    loadAlbumArt(currentThumbnail, track.pic_id, track.source, track);
    
    // 检查是否收藏
    const isFavorite = favorites.some(fav => 
        fav.id === track.id && fav.source === track.source);
    favoriteIcon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
    
    // 标记当前播放项
    updatePlayingItemUI();
    
    // 获取音乐URL
    const urlCacheKey = `${track.source}-${track.id}`;
    
    // 检查URL缓存
    if (musicUrlCache.has(urlCacheKey)) {
        const cachedUrl = musicUrlCache.get(urlCacheKey);
        audioPlayer.src = cachedUrl;
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
        if (roomId && socket) {
            socket.emit('track-change', {
                roomId,
                track: currentTrack
            });
        }
        return;
    }
    
    fetch(`https://music-api.gdstudio.xyz/api.php?types=url&source=${track.source}&id=${track.id}&br=999`)
        .then(response => response.json())
        .then(data => {
            console.log('音乐URL API返回:', data);
            
            if (data && data.url) {
                // 缓存音乐URL
                musicUrlCache.set(urlCacheKey, data.url);
                
                // 清理过期缓存
                cleanExpiredCache();
                
                audioPlayer.src = data.url;
                audioPlayer.play()
                    .then(() => {
                        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    })
                    .catch(error => {
                        console.error('播放失败:', error);
                        playBtn.innerHTML = '<i class="fas fa-play"></i>';
                        
                        // 如果播放失败，尝试重新获取URL
                        if (musicUrlCache.has(urlCacheKey)) {
                            musicUrlCache.delete(urlCacheKey);
                        }
                        alert(`播放失败: ${error.message || '音频文件无法播放'}`);
                    });
                
                // 加载歌词
                loadLyrics(track.id, track.source);
                
                // 如果在房间中，同步播放状态
                if (roomId && socket) {
                    socket.emit('track-change', {
                        roomId,
                        track: currentTrack
                    });
                }
            } else {
                console.error('获取音乐URL失败 - API返回:', data);
                
                let errorMsg = '无法获取音乐播放地址';
                if (data && data.error) {
                    errorMsg += `: ${data.error}`;
                } else if (data && data.msg) {
                    errorMsg += `: ${data.msg}`;
                }
                
                // 特殊处理不同音乐源的版权问题
                if (track.source === 'tencent') {
                    errorMsg += '\n\nQQ音乐可能存在版权限制，建议尝试其他音乐源';
                } else if (track.source === 'netease') {
                    errorMsg += '\n\n网易云音乐可能存在版权限制，建议尝试其他音乐源';
                }
                
                alert(errorMsg);
            }
        })
        .catch(error => {
            console.error('获取音乐URL网络错误:', error);
            alert('获取音乐播放地址失败，请检查网络连接或稍后再试');
        });
}

// 从酷我音乐搜索并播放周杰伦歌曲
async function searchAndPlayFromKuwo(songName, artistName) {
    try {
        const response = await fetch(`https://music-api.gdstudio.xyz/api.php?types=search&source=kuwo&name=${encodeURIComponent(songName + ' ' + artistName)}&count=1`);
        const data = await response.json();
        
        if (data && Array.isArray(data) && data.length > 0) {
            const kuwoTrack = data[0];
            // 更新当前曲目信息为酷我版本
            currentTrack = kuwoTrack;
            
            // 更新播放器UI
            currentTitle.textContent = kuwoTrack.name;
            currentArtist.textContent = Array.isArray(kuwoTrack.artist) ? kuwoTrack.artist.join(', ') : kuwoTrack.artist;
            
            // 加载专辑图片
            loadAlbumArt(currentThumbnail, kuwoTrack.pic_id, kuwoTrack.source, kuwoTrack);
            
            // 播放酷我版本
            const urlResponse = await fetch(`https://music-api.gdstudio.xyz/api.php?types=url&source=kuwo&id=${kuwoTrack.id}&br=999`);
            const urlData = await urlResponse.json();
            
            if (urlData && urlData.url) {
                audioPlayer.src = urlData.url;
                audioPlayer.play()
                    .then(() => {
                        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    })
                    .catch(error => {
                        console.error('酷我音乐播放失败:', error);
                        alert('酷我音乐播放失败，请尝试其他歌曲');
                    });
                
                // 加载歌词
                loadLyrics(kuwoTrack.id, kuwoTrack.source);
                
                // 同步房间状态
                if (roomId && socket) {
                    socket.emit('track-change', {
                        roomId,
                        track: currentTrack
                    });
                }
            } else {
                alert('酷我音乐也无法播放此歌曲，请尝试其他版本');
            }
        } else {
            alert('酷我音乐中未找到此歌曲，请尝试其他版本');
        }
    } catch (error) {
        console.error('酷我音乐搜索失败:', error);
        alert('切换到酷我音乐失败，请稍后再试');
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
        
        // 同步播放状态
        if (roomId && socket) {
            socket.emit('play', { 
                roomId,
                currentTime: audioPlayer.currentTime
            });
        }
    } else {
        audioPlayer.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        
        // 同步暂停状态
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
    if (playlist.length === 0 || currentIndex <= 0) return;
    playTrack(playlist[currentIndex - 1], currentIndex - 1);
    
    // 同步切歌
    if (roomId && socket) {
        socket.emit('prev-track', {
            roomId,
            track: playlist[currentIndex - 1],
            index: currentIndex - 1
        });
    }
}

// 播放下一首
function playNext() {
    if (playlist.length === 0 || currentIndex >= playlist.length - 1) return;
    playTrack(playlist[currentIndex + 1], currentIndex + 1);
    
    // 同步切歌
    if (roomId && socket) {
        socket.emit('next-track', {
            roomId,
            track: playlist[currentIndex + 1],
            index: currentIndex + 1
        });
    }
}

// 更新音量
function updateVolume() {
    audioPlayer.volume = volumeSlider.value / 100;
}

// 更新进度条
function updateProgress() {
    // 如果正在拖动，不更新进度条
    if (isDragging) return;
    
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration || 1;
    const progressPercent = (currentTime / duration) * 100;
    
    progressBar.style.width = `${progressPercent}%`;
    currentTimeEl.textContent = formatTime(currentTime);
    
    // 更新歌词高亮
    updateLyricHighlight(currentTime);
    
    // 定期同步进度（每5秒）
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
    
    // 同步进度
    if (roomId && socket) {
        socket.emit('seek', {
            roomId,
            currentTime: seekTime
        });
    }
}

// 进度条拖动功能
let isDragging = false;

// 格式化时间
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// 显示/隐藏播放详情页
function showPlayerDetails() {
    if (!currentTrack) return;
    
    detailsTitle.textContent = currentTrack.name;
    detailsArtist.textContent = Array.isArray(currentTrack.artist) ? currentTrack.artist.join(', ') : currentTrack.artist;
    detailsAlbum.textContent = currentTrack.album || '未知专辑';
    
    // 加载高清专辑图片
    loadAlbumArt(detailsThumbnail, currentTrack.pic_id, currentTrack.source, currentTrack);
    
    playerDetails.classList.add('show');
}

function hidePlayerDetails() {
    playerDetails.classList.remove('show');
}

// 加载歌词
async function loadLyrics(id, source) {
    const cacheKey = `${source}-${id}`;
    
    // 检查缓存
    if (lyricsCache.has(cacheKey)) {
        const cachedLyrics = lyricsCache.get(cacheKey);
        if (cachedLyrics) {
            displayLyrics(cachedLyrics);
        } else {
            lyricsContainer.innerHTML = '<p class="no-lyrics">暂无歌词</p>';
        }
        return;
    }
    
    lyricsContainer.innerHTML = '<p class="loading">加载歌词中...</p>';
    
    try {
        const response = await fetch(`https://music-api.gdstudio.xyz/api.php?types=lyric&source=${source}&id=${id}`);
        const data = await response.json();
        
        console.log('歌词API返回:', data);
        
        if (data && data.lyric && data.lyric.trim()) {
            const lyrics = parseLyrics(data.lyric);
            lyricsCache.set(cacheKey, lyrics);
            displayLyrics(lyrics);
        } else {
            console.warn('歌词为空或格式异常:', data);
            
            // 对于酷我音乐，如果获取不到歌词，尝试使用网易云音乐的歌词
            if (source === 'kuwo' && currentTrack) {
                console.log('尝试从网易云音乐获取歌词...');
                await tryGetLyricsFromNetease(currentTrack.name, currentTrack.artist);
            } else {
                lyricsCache.set(cacheKey, null);
                lyricsContainer.innerHTML = '<p class="no-lyrics">暂无歌词</p>';
            }
        }
        
        // 限制歌词缓存大小
        if (lyricsCache.size > 100) {
            const firstKey = lyricsCache.keys().next().value;
            lyricsCache.delete(firstKey);
        }
    } catch (error) {
        console.error('获取歌词失败:', error);
        
        // 对于酷我音乐，如果请求失败，尝试使用网易云音乐的歌词
        if (source === 'kuwo' && currentTrack) {
            console.log('酷我歌词获取失败，尝试从网易云音乐获取...');
            await tryGetLyricsFromNetease(currentTrack.name, currentTrack.artist);
        } else {
            lyricsContainer.innerHTML = '<p class="no-lyrics">获取歌词失败</p>';
        }
    }
}

// 尝试从网易云音乐获取歌词
async function tryGetLyricsFromNetease(songName, artist) {
    try {
        const artistName = Array.isArray(artist) ? artist.join(' ') : artist;
        const searchQuery = `${songName} ${artistName}`;
        
        const searchResponse = await fetch(`https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(searchQuery)}&count=1`);
        const searchData = await searchResponse.json();
        
        if (searchData && Array.isArray(searchData) && searchData.length > 0) {
            const neteaseTrack = searchData[0];
            console.log('在网易云找到对应歌曲:', neteaseTrack);
            
            const lyricResponse = await fetch(`https://music-api.gdstudio.xyz/api.php?types=lyric&source=netease&id=${neteaseTrack.id}`);
            const lyricData = await lyricResponse.json();
            
            if (lyricData && lyricData.lyric && lyricData.lyric.trim()) {
                console.log('成功从网易云获取歌词');
                const lyrics = parseLyrics(lyricData.lyric);
                
                // 缓存歌词（使用酷我的缓存键，这样下次就不用再次获取）
                const kuowoCacheKey = `kuwo-${currentTrack.id}`;
                lyricsCache.set(kuowoCacheKey, lyrics);
                
                displayLyrics(lyrics);
                return;
            }
        }
        
        // 如果网易云也获取不到歌词
        lyricsContainer.innerHTML = '<p class="no-lyrics">暂无歌词</p>';
    } catch (error) {
        console.error('从网易云获取歌词失败:', error);
        lyricsContainer.innerHTML = '<p class="no-lyrics">暂无歌词</p>';
    }
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



// 显示音乐列表
function displayMusicList(tracks, container, loadMore = false) {
    if (!loadMore) {
        container.innerHTML = '';
    }
    
    tracks.forEach((track, index) => {
        const isFavorite = favorites.some(fav => 
            fav.id === track.id && fav.source === track.source);
        
        // 添加音乐源标识
        const sourceText = {
            'netease': '网易云',
            'tencent': 'QQ音乐',
            'migu': '咪咕',
            'kugou': '酷狗',
            'kuwo': '酷我'
        }[track.source] || track.source;
        
        const musicItem = document.createElement('div');
        musicItem.className = 'music-item';
        musicItem.innerHTML = `
            <div class="music-thumbnail">
                <img src="https://via.placeholder.com/50" alt="${track.name}" data-pic-id="${track.pic_id}" data-source="${track.source}">
            </div>
            <div class="music-info">
                <div class="music-title">${track.name}</div>
                <div class="music-artist">${Array.isArray(track.artist) ? track.artist.join(', ') : track.artist}</div>
                <div class="music-source">${sourceText}</div>
            </div>
            <div class="music-actions">
                <button class="add-to-playlist-btn" data-id="${track.id}" data-source="${track.source}">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="favorite-btn" data-id="${track.id}" data-source="${track.source}">
                    <i class="fa${isFavorite ? 's' : 'r'} fa-heart"></i>
                </button>
            </div>
        `;
        
        // 加载专辑图片
        const img = musicItem.querySelector('img');
        loadAlbumArt(img, track.pic_id, track.source, track);
        
        // 点击播放
        musicItem.querySelector('.music-info').addEventListener('click', () => {
            const adjustedIndex = loadMore ? playlist.length - tracks.length + index : index;
            playTrack(track, adjustedIndex);
            
            // 添加到播放列表（如果不存在）
            addToPlaylist(track);
        });
        
        // 添加到播放列表按钮
        musicItem.querySelector('.add-to-playlist-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            addToPlaylist(track);
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
    }
    
    roomId = null;
    isRoomHost = false;
    
    roomStatus.classList.add('hidden');
    document.querySelector('.create-room').style.display = 'block';
    document.querySelector('.join-room').style.display = 'block';
    roomInput.value = '';
    
    showToast('已退出房间', 'info');
}

function connectToRoom() {
    // 连接到Socket.io服务器
    socket = io('http://localhost:3000'); // 根据实际服务器地址修改
    
    setupSocketEvents();
    
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

    // 同步状态
    socket.on('sync-state', (data) => {
        receiveTrackInfo({
            track: data.currentTrack,
            currentTime: data.currentTime
        });
        
        if (!data.isPlaying) {
            audioPlayer.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });

    // 上一首
    socket.on('prev-track', (data) => {
        currentIndex = data.index;
        playTrack(data.track, data.index);
    });

    // 下一首
    socket.on('next-track', (data) => {
        currentIndex = data.index;
        playTrack(data.track, data.index);
    });

    // 播放列表更新
    socket.on('playlist-update', (data) => {
        playlist = data.playlist;
        updatePlaylistDisplay();
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

    // 定期进度同步
    socket.on('sync-progress', (data) => {
        if (Math.abs(audioPlayer.currentTime - data.currentTime) > 2) {
            // 如果进度差异超过2秒，进行同步
            audioPlayer.currentTime = data.currentTime;
        }
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

// 显示播放列表
function showPlaylist() {
    playlistSidebar.classList.add('show');
    updatePlaylistDisplay();
}

// 隐藏播放列表
function hidePlaylist() {
    playlistSidebar.classList.remove('show');
}

// 清空播放列表
function clearPlaylistTracks() {
    if (confirm('确定要清空播放列表吗？')) {
        playlist = [];
        currentIndex = 0;
        updatePlaylistDisplay();
        
        // 同步到房间
        if (roomId && socket) {
            socket.emit('playlist-update', {
                roomId,
                playlist
            });
        }
    }
}

// 更新播放列表显示
function updatePlaylistDisplay() {
    playlistCount.textContent = `${playlist.length} 首歌曲`;
    
    if (playlist.length === 0) {
        playlistTracks.innerHTML = '<div class="empty-playlist">播放列表为空</div>';
        return;
    }
    
    playlistTracks.innerHTML = '';
    
    playlist.forEach((track, index) => {
        const trackElement = document.createElement('div');
        trackElement.className = `playlist-track ${index === currentIndex ? 'playing' : ''}`;
        trackElement.innerHTML = `
            <div class="playlist-track-index">${index + 1}</div>
            <div class="playlist-track-thumbnail">
                <img src="https://via.placeholder.com/40" alt="${track.name}" data-pic-id="${track.pic_id}" data-source="${track.source}">
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
        loadAlbumArt(img, track.pic_id, track.source, track);
        
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

// 从播放列表移除歌曲
function removeFromPlaylist(index) {
    if (index === currentIndex) {
        // 如果移除的是当前播放的歌曲，停止播放
        audioPlayer.pause();
        currentTrack = null;
        currentTitle.textContent = '未播放';
        currentArtist.textContent = '--';
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else if (index < currentIndex) {
        // 如果移除的歌曲在当前播放歌曲之前，调整当前索引
        currentIndex--;
    }
    
    playlist.splice(index, 1);
    updatePlaylistDisplay();
    
    // 同步到房间
    if (roomId && socket) {
        socket.emit('playlist-update', {
            roomId,
            playlist
        });
    }
}

// 添加到播放列表
function addToPlaylist(track) {
    // 检查是否已存在
    const exists = playlist.some(item => 
        item.id === track.id && item.source === track.source);
    
    if (!exists) {
        playlist.push(track);
        updatePlaylistDisplay();
        
        // 同步到房间
        if (roomId && socket) {
            socket.emit('playlist-update', {
                roomId,
                playlist
            });
        }
    }
}

// 清理过期缓存
function cleanExpiredCache() {
    // 这个函数可以用来清理过期的音乐URL缓存
    // 目前只是删除最旧的缓存项以控制大小
    if (musicUrlCache.size > 100) {
        const firstKey = musicUrlCache.keys().next().value;
        musicUrlCache.delete(firstKey);
    }
}

// 请求节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 防抖函数
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// 清空所有缓存
function clearAllCache() {
    searchCache.clear();
    albumArtCache.clear();
    musicUrlCache.clear();
    lyricsCache.clear();
    
    // 清空图片加载队列
    imageLoadQueue = [];
    isProcessingImages = false;
    
    console.log('所有缓存已清空');
}

// 获取缓存统计信息
function getCacheStats() {
    return {
        searchCache: searchCache.size,
        albumArtCache: albumArtCache.size,
        musicUrlCache: musicUrlCache.size,
        lyricsCache: lyricsCache.size,
        imageQueue: imageLoadQueue.length
    };
}

// 测试音乐API连接
async function testMusicAPI() {
    const testSources = ['netease', 'tencent', 'migu', 'kugou', 'kuwo'];
    const testQuery = '稻香';
    
    console.log('开始测试音乐API...');
    
    for (const source of testSources) {
        try {
            console.log(`测试 ${source}...`);
            const response = await fetch(`https://music-api.gdstudio.xyz/api.php?types=search&source=${source}&name=${encodeURIComponent(testQuery)}&count=1`);
            const data = await response.json();
            
            if (data && Array.isArray(data) && data.length > 0) {
                console.log(`✅ ${source} 搜索正常:`, data[0]);
                
                // 测试获取音乐URL
                const urlResponse = await fetch(`https://music-api.gdstudio.xyz/api.php?types=url&id=${data[0].id}&source=${source}`);
                const urlData = await urlResponse.json();
                console.log(`${source} URL API返回:`, urlData);
            } else {
                console.warn(`⚠️ ${source} 搜索无结果:`, data);
            }
        } catch (error) {
            console.error(`❌ ${source} 测试失败:`, error);
        }
        
        // 延迟500ms避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('音乐API测试完成');
}

// 在控制台中可以调用 testMusicAPI() 来测试

// 初始化应用
window.addEventListener('DOMContentLoaded', init);