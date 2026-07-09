(function () {
    'use strict';
    const CONFIG = {
        MAX_SEARCH_RESULTS: 30,
        SEARCH_DEBOUNCE: 500,
        AUDIO_VOLUME: 0.7,
        PREVIEW_DURATION: 30,  //试听时长
    };
    const MUSIC_URL_CACHE = new Map();
    const MUSIC_CACHE_TTL = 10 * 60 * 1000;
    let currentAudio = null;
    let isPlaying = false;
    let currentPreviewSongId = null;
    let searchAbortController = null;
    let modalInstance = null;
    let isModalOpen = false;
    let modalContainer = null;
    let modalOverlay = null;
    let modalContent = null;
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    async function getSongUrlWithCache(songId) {
        if (!songId) return null;
        const cached = MUSIC_URL_CACHE.get(songId);
        if (cached && (Date.now() - cached.time) < MUSIC_CACHE_TTL) {
            return cached.url;
        }
        const url = await musicAPI.getSongUrl(songId);
        if (url) {
            MUSIC_URL_CACHE.set(songId, { url, time: Date.now() });
        }
        return url;
    }
    function formatDuration(seconds) {
        if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function generateUniqueId() {
        return Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    function sanitizeText(text) {
        if (!text) return '';
        return text.replace(/[<>"']/g, '').trim();
    }
    function showToast(message, type = 'info', duration = 3000) {
        const existing = document.querySelector('.music-toast-mokim');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'music-toast-mokim';
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            padding: 10px 24px;
            border-radius: 12px;
            background: rgba(0,0,0,0.78);
            color: #fff;
            font-size: 14px;
            z-index: 9999999;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            opacity: 0;
            transition: all 0.35s cubic-bezier(0.34, 1.2, 0.64, 1);
            pointer-events: none;
            max-width: 90%;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.08);
        `;
        const colors = {
            success: '#52c41a',
            error: '#f56c6c',
            info: '#409eff',
            warning: '#e6a23c'
        };
        toast.style.borderLeft = `3px solid ${colors[type] || colors.info}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, duration);
    }
    class NeteaseMusicAPI {
        constructor() {
            this.baseUrl = '/api/wyymusic/';
        }

        async getAuthData() {
            try {
                const userId = window.qmok_userid_id || '';
                return await tmd_newcontroler.writenewwords(userId);
            } catch (e) {
                return '';
            }
        }

        async search(keyword) {
            if (!keyword || keyword.trim().length === 0) {
                return { code: 400, text: '请输入歌名' };
            }
            try {
                const auth = await this.getAuthData();
                const resp = await fetch(this.baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `keyword=${encodeURIComponent(keyword.trim())}&ak=${auth}`
                });

                if (!resp.ok) throw new Error('搜索请求失败: ' + resp.status);
                const data = await resp.json();

                if (!data || data.code !== 200) {
                    return { code: data?.code || 500, text: data?.text || '搜索失败' };
                }

                return data;
            } catch (error) {
                console.error('网易云搜索失败:', error);
                return { code: 500, text: '网络错误: ' + error.message };
            }
        }

        async getSongUrl(songId) {
            if (!songId) return null;
            try {
                const auth = await this.getAuthData();
                const resp = await fetch(this.baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `songId=${songId}&ak=${encodeURIComponent(auth)}`
                });

                if (!resp.ok) throw new Error('获取链接失败');
                const data = await resp.json();
                return data.url || `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
            } catch (error) {
                console.warn('获取歌曲URL失败，使用备用链接:', error);
                return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
            }
        }
    }

    const musicAPI = new NeteaseMusicAPI();
    const AudioPlayer = {
        _audio: null,
        _isPlaying: false,
        _currentSongId: null,
        _progressInterval: null,
        _onEndCallback: null,

        init() {
            this._audio = new Audio();
            this._audio.volume = CONFIG.AUDIO_VOLUME;
            this._audio.addEventListener('ended', () => {
                this._isPlaying = false;
                this._stopProgress();
                if (this._onEndCallback) {
                    this._onEndCallback();
                }
            });
            this._audio.addEventListener('error', (e) => {
                console.warn('音频播放错误:', e);
                this._isPlaying = false;
                this._stopProgress();
            });
        },

        play(url, songId, onEnd) {
            this.stop();
            this._currentSongId = songId;
            this._onEndCallback = onEnd || null;

            if (!url) {
                showToast('无法获取播放链接', 'error');
                return false;
            }

            this._audio.src = url;
            this._audio.load();

            const playPromise = this._audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this._isPlaying = true;
                    this._startProgress();
                }).catch((err) => {
                    console.warn('播放被阻止:', err);
                    showToast('播放失败，请点击重试', 'error');
                    this._isPlaying = false;
                });
            }
            return true;
        },

        pause() {
            if (this._audio && this._isPlaying) {
                this._audio.pause();
                this._isPlaying = false;
                this._stopProgress();
            }
        },

        resume() {
            if (this._audio && !this._isPlaying && this._audio.src) {
                this._audio.play().then(() => {
                    this._isPlaying = true;
                    this._startProgress();
                }).catch((err) => {
                    console.warn('恢复播放失败:', err);
                });
            }
        },

        toggle() {
            if (this._isPlaying) {
                this.pause();
                return false;
            } else {
                this.resume();
                return true;
            }
        },

        stop() {
            if (this._audio) {
                this._audio.pause();
                this._audio.src = '';
                this._audio.load();
            }
            this._isPlaying = false;
            this._currentSongId = null;
            this._stopProgress();
            this._onEndCallback = null;
        },

        isPlaying() {
            return this._isPlaying;
        },

        getCurrentSongId() {
            return this._currentSongId;
        },

        getDuration() {
            return this._audio ? this._audio.duration : 0;
        },

        getCurrentTime() {
            return this._audio ? this._audio.currentTime : 0;
        },

        seekTo(percent) {
            if (this._audio && this._audio.duration && isFinite(this._audio.duration)) {
                this._audio.currentTime = (percent / 100) * this._audio.duration;
            }
        },

        setVolume(volume) {
            if (this._audio) {
                this._audio.volume = Math.max(0, Math.min(1, volume));
            }
        },

        _startProgress() {
            this._stopProgress();
            this._progressInterval = setInterval(() => {
                this._onProgressUpdate();
            }, 300);
        },

        _stopProgress() {
            if (this._progressInterval) {
                clearInterval(this._progressInterval);
                this._progressInterval = null;
            }
        },

        _onProgressUpdate() {
        },

        onProgress(callback) {
            this._onProgressUpdate = callback || (() => { });
        }
    };

    AudioPlayer.init();
    function buildModalHTML() {
        return `
            <div class="mokim-music-modal-overlay" id="mokimMusicModalOverlay">
                <div class="mokim-music-modal-container">
                    <div class="mokim-music-modal-header">
                        <h3><i class="fas fa-music" style="color: #409eff;"></i> 音乐分享</h3>
                        <button class="mokim-music-modal-close" id="mokimMusicModalClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="mokim-music-modal-tabs">
                        <button class="mokim-music-tab-btn active" data-tab="search">
                            <i class="fas fa-search"></i> 音乐分享
                        </button>
                        <button class="mokim-music-tab-btn" data-tab="about">
                            <i class="fas fa-info-circle"></i> 关于
                        </button>
                    </div>
                    <div class="mokim-music-modal-body">
                        <div class="mokim-music-tab-pane active" id="mokimMusicPaneSearch">
                            <div class="mokim-music-search-area">
                                <div class="mokim-music-search-box">
                                    <input type="text" id="mokimMusicSearchInput" placeholder="搜索歌曲、歌手、专辑..." maxlength="100" autocomplete="off">
                                    <button id="mokimMusicSearchBtn"><i class="fas fa-search"></i></button>
                                </div>
                                <div class="mokim-music-search-hint">
                                    <i class="fas fa-info-circle"></i> 数据来源：网易云音乐 · 仅供试听与分享
                                </div>
                            </div>
                            <div class="mokim-music-result-list" id="mokimMusicResultList">
                                <div class="mokim-music-empty-state">
                                    <i class="fas fa-music" style="font-size: 48px; opacity: 0.3;"></i>
                                    <p>搜索你喜欢的音乐开始分享</p>
                                    <span style="font-size: 12px; color: #999;">支持歌曲名、歌手名、专辑名</span>
                                </div>
                            </div>
                            <div class="mokim-music-preview-bar" id="mokimMusicPreviewBar" style="display: none;">
                                <div class="preview-info">
                                    <span class="preview-name" id="mokimPreviewName">未选择</span>
                                    <span class="preview-artist" id="mokimPreviewArtist">-</span>
                                </div>
                                <div class="preview-controls">
                                    <button id="mokimPreviewPlayBtn" class="preview-play-btn">
                                        <i class="fas fa-play"></i>
                                    </button>
                                    <span class="preview-time" id="mokimPreviewTime">0:00 / 0:00</span>
                                </div>
                                <div class="preview-progress">
                                    <input type="range" id="mokimPreviewProgress" min="0" max="100" value="0">
                                </div>
                                <button id="mokimPreviewCloseBtn" class="preview-close-btn">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="mokim-music-tab-pane" id="mokimMusicPaneAbout">
                            <div class="mokim-music-about-content">
                                <div class="about-header">
                                    <i class="fas fa-music" style="font-size: 36px; color: #409eff;"></i>
                                    <h2>音乐分享模块</h2>
                                    <p style="color: #999; font-size: 14px;">Love Life</p>
                                </div>
                                <div class="about-section">
                                    <h4><i class="fas fa-shield-alt"></i> 免责声明</h4>
                                    <ul>
                                        <li>本模块仅提供音乐信息检索与试听功能，所有音乐数据来源于 <strong>网易云音乐</strong> 公开接口。</li>
                                        <li>本模块 <strong>不存储、不缓存、不传播</strong> 任何音乐文件，所有播放链接由网易云音乐官方提供。</li>
                                        <li>音乐版权归 <strong>网易云音乐</strong> 及相应版权方所有，请勿将本模块用于商业用途。</li>
                                        <li>用户通过本模块分享的音乐链接仅用于个人欣赏与交流，请尊重音乐版权。</li>
                                        <li>如涉及版权问题，请联系平台处理，我们将及时配合下架相关功能。</li>
                                    </ul>
                                </div>
                                <div class="about-section">
                                    <h4><i class="fas fa-info-circle"></i> 使用说明</h4>
                                    <ul>
                                        <li>在「音乐分享」标签页搜索歌曲，支持歌名、歌手名、专辑名。</li>
                                        <li>每个搜索结果包含 <strong>试听</strong> 和 <strong>发送</strong> 两个操作按钮。</li>
                                        <li>点击「试听」可播放30秒歌曲片段（完整歌曲需在网易云音乐APP收听）。</li>
                                        <li>点击「发送」将音乐卡片分享到当前聊天会话，对方可点击卡片试听。</li>
                                        <li>试听过程中可随时暂停/继续，拖拽进度条跳转。</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    function getModal() {
        if (modalContainer) return modalContainer;
        const container = document.createElement('div');
        container.id = 'mokimMusicModalContainer';
        container.innerHTML = buildModalHTML();
        document.body.appendChild(container);
        modalContainer = container;
        modalOverlay = container.querySelector('#mokimMusicModalOverlay');
        modalContent = container.querySelector('.mokim-music-modal-container');
        bindModalEvents();
        return container;
    }
    function bindModalEvents() {
        if (!modalContainer) return;
        const closeBtn = modalContainer.querySelector('#mokimMusicModalClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    closeModal();
                }
            });
        }
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape' && isModalOpen) {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });
        const tabBtns = modalContainer.querySelectorAll('.mokim-music-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                switchTab(tab);
            });
        });
        const searchBtn = modalContainer.querySelector('#mokimMusicSearchBtn');
        const searchInput = modalContainer.querySelector('#mokimMusicSearchInput');
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => performSearch());
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performSearch();
                }
            });
            let debounceTimer = null;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                const val = searchInput.value.trim();
            });
        }
        const playBtn = modalContainer.querySelector('#mokimPreviewPlayBtn');
        if (playBtn) {
            playBtn.addEventListener('click', togglePreviewPlay);
        }

        const progressBar = modalContainer.querySelector('#mokimPreviewProgress');
        if (progressBar) {
            progressBar.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                AudioPlayer.seekTo(val);
            });
        }

        const closePreviewBtn = modalContainer.querySelector('#mokimPreviewCloseBtn');
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', closePreview);
        }
        AudioPlayer.onProgress(() => {
            updatePreviewProgress();
        });
    }
    function openModal() {
        if (isModalOpen) return;
        const container = getModal();
        if (container) {
            container.querySelector('#mokimMusicModalOverlay').classList.add('active');
            isModalOpen = true;
            document.body.style.overflow = 'hidden';
            switchTab('search');
            const input = container.querySelector('#mokimMusicSearchInput');
            if (input) input.value = '';
            const list = container.querySelector('#mokimMusicResultList');
            if (list) {
                list.innerHTML = `
                    <div class="mokim-music-empty-state">
                        <i class="fas fa-music" style="font-size: 48px; opacity: 0.3;"></i>
                        <p>搜索你喜欢的音乐开始分享</p>
                        <span style="font-size: 12px; color: #999;">支持歌曲名、歌手名、专辑名</span>
                    </div>
                `;
            }
            closePreview();
        }
    }

    function closeModal() {
        if (!isModalOpen) return;
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
        isModalOpen = false;
        document.body.style.overflow = '';
        AudioPlayer.stop();
        closePreview();
    }

    function switchTab(tab) {
        if (!modalContainer) return;
        const tabs = modalContainer.querySelectorAll('.mokim-music-tab-btn');
        const panes = modalContainer.querySelectorAll('.mokim-music-tab-pane');

        tabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        panes.forEach(pane => {
            const paneId = pane.id;
            const expectedId = tab === 'search' ? 'mokimMusicPaneSearch' : 'mokimMusicPaneAbout';
            pane.classList.toggle('active', paneId === expectedId);
        });
    }
    async function performSearch() {
        if (!modalContainer) return;
        const input = modalContainer.querySelector('#mokimMusicSearchInput');
        const list = modalContainer.querySelector('#mokimMusicResultList');
        if (!input || !list) return;
        const keyword = input.value.trim();
        if (!keyword) {
            showToast('请输入歌曲名称', 'warning');
            return;
        }
        if (searchAbortController) {
            searchAbortController.abort();
        }

        list.innerHTML = `
            <div style="text-align: center; padding: 30px 0; color: #999;">
                <i class="fas fa-spinner fa-pulse" style="font-size: 24px;"></i>
                <p style="margin-top: 8px;">搜索中...</p>
            </div>
        `;

        try {
            const result = await musicAPI.search(keyword);
            if (result.code !== 200 || !result.result || result.result.length === 0) {
                list.innerHTML = `
                    <div class="mokim-music-empty-state">
                        <i class="fas fa-search-minus" style="font-size: 40px; opacity: 0.4;"></i>
                        <p>未找到相关歌曲</p>
                        <span style="font-size: 12px; color: #999;">试试其他关键词</span>
                    </div>
                `;
                return;
            }
            const songs = (result.result.songs).slice(0, CONFIG.MAX_SEARCH_RESULTS);
            renderSearchResults(songs);
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }
            list.innerHTML = `
                <div class="mokim-music-empty-state">
                    <i class="fas fa-exclamation-triangle" style="font-size: 40px; opacity: 0.4; color: #f56c6c;"></i>
                    <p>搜索失败，请重试</p>
                    <span style="font-size: 12px; color: #999;">${escapeHtml(error.message || '网络错误')}</span>
                </div>
            `;
            showToast('搜索失败: ' + (error.message || '网络错误'), 'error');
        }
    }

    function renderSearchResults(songs) {
        const list = document.querySelector('#mokimMusicResultList');
        if (!list) return;

        if (!songs || songs.length === 0) {
            list.innerHTML = `
                <div class="mokim-music-empty-state">
                    <i class="fas fa-search-minus" style="font-size: 40px; opacity: 0.4;"></i>
                    <p>未找到相关歌曲</p>
                </div>
            `;
            return;
        }

        let html = '';
        songs.forEach((song, index) => {
            const name = escapeHtml(song.name || '未知歌曲');
            const artist = escapeHtml(song.artist || '未知歌手');
            const songId = song.id || '';
            const isPlaying = AudioPlayer.isPlaying() && AudioPlayer.getCurrentSongId() === String(songId);

            html += `
                <div class="mokim-music-result-item" data-song-id="${songId}" data-index="${index}">
                    <div class="info">
                        <div class="name">${name}</div>
                        <div class="artist">${artist}</div>
                    </div>
                    <div class="actions">
                        <button class="btn-preview ${isPlaying ? 'playing' : ''}" data-song-id="${songId}" data-name="${name}" data-artist="${artist}">
                            <i class="fas ${isPlaying ? 'fa-stop' : 'fa-headphones'}"></i> ${isPlaying ? '停止' : '试听'}
                        </button>
                        <button class="btn-send" data-song-id="${songId}" data-name="${name}" data-artist="${artist}">
                            <i class="fas fa-paper-plane"></i> 发送
                        </button>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
        list.querySelectorAll('.btn-preview').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const songId = btn.dataset.songId;
                const name = btn.dataset.name;
                const artist = btn.dataset.artist;
                handlePreview(songId, name, artist, btn);
            });
        });

        list.querySelectorAll('.btn-send').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const songId = btn.dataset.songId;
                const name = btn.dataset.name;
                const artist = btn.dataset.artist;
                handleSend(songId, name, artist);
            });
        });
    }
    async function handlePreview(songId, name, artist, btn) {
        if (!songId) {
            showToast('歌曲ID无效', 'error');
            return;
        }
        if (AudioPlayer.isPlaying() && AudioPlayer.getCurrentSongId() === String(songId)) {
            AudioPlayer.stop();
            closePreview();
            updatePreviewButtonState(false);
            return;
        }
        const previewBar = document.querySelector('#mokimMusicPreviewBar');
        const previewName = document.querySelector('#mokimPreviewName');
        const previewArtist = document.querySelector('#mokimPreviewArtist');
        if (previewBar) previewBar.style.display = 'flex';
        if (previewName) previewName.textContent = name || '未知歌曲';
        if (previewArtist) previewArtist.textContent = artist || '未知歌手';
        showToast('正在获取播放链接...', 'info');
        try {
            const url = await musicAPI.getSongUrl(songId);
            if (!url) {
                showToast('无法获取播放链接', 'error');
                return;
            }

            const success = AudioPlayer.play(url, songId, () => {
                updatePreviewButtonState(false);
            });

            if (success) {
                updatePreviewButtonState(true);
                updateAllPreviewButtons(songId, true);
            }

        } catch (error) {
            console.error('试听失败:', error);
            showToast('试听失败: ' + error.message, 'error');
        }
    }

    function togglePreviewPlay() {
        if (!AudioPlayer.isPlaying()) {
            const songId = AudioPlayer.getCurrentSongId();
            if (songId) {
                AudioPlayer.resume();
                updatePreviewButtonState(true);
                updateAllPreviewButtons(songId, true);
            } else {
                showToast('请先选择一首歌曲试听', 'info');
            }
        } else {
            AudioPlayer.pause();
            updatePreviewButtonState(false);
            const songId = AudioPlayer.getCurrentSongId();
            if (songId) {
                updateAllPreviewButtons(songId, false);
            }
        }
    }

    function updatePreviewButtonState(isPlaying) {
        const playBtn = document.querySelector('#mokimPreviewPlayBtn');
        if (playBtn) {
            playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }
    }

    function updateAllPreviewButtons(songId, isPlaying) {
        document.querySelectorAll('.btn-preview').forEach(btn => {
            if (btn.dataset.songId === String(songId)) {
                btn.classList.toggle('playing', isPlaying);
                btn.innerHTML = isPlaying
                    ? '<i class="fas fa-stop"></i> 停止'
                    : '<i class="fas fa-headphones"></i> 试听';
            } else if (isPlaying === false) {
                btn.classList.remove('playing');
                btn.innerHTML = '<i class="fas fa-headphones"></i> 试听';
            }
        });
    }

    function updatePreviewProgress() {
        const progressBar = document.querySelector('#mokimPreviewProgress');
        const timeLabel = document.querySelector('#mokimPreviewTime');
        if (!progressBar || !timeLabel) return;

        const duration = AudioPlayer.getDuration();
        const currentTime = AudioPlayer.getCurrentTime();

        if (duration && isFinite(duration) && duration > 0) {
            const pct = (currentTime / duration) * 100;
            progressBar.value = Math.min(100, pct);
            timeLabel.textContent = formatDuration(currentTime) + ' / ' + formatDuration(duration);
        } else {
            timeLabel.textContent = '0:00 / 0:00';
        }
    }

    function closePreview() {
        AudioPlayer.stop();
        const previewBar = document.querySelector('#mokimMusicPreviewBar');
        if (previewBar) previewBar.style.display = 'none';
        const progressBar = document.querySelector('#mokimPreviewProgress');
        if (progressBar) progressBar.value = 0;
        const timeLabel = document.querySelector('#mokimPreviewTime');
        if (timeLabel) timeLabel.textContent = '0:00 / 0:00';
        document.querySelectorAll('.btn-preview').forEach(btn => {
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-headphones"></i> 试听';
        });
        updatePreviewButtonState(false);
    }
    function handleSend(songId, name, artist) {
        if (!songId) {
            showToast('歌曲ID无效，无法发送', 'error');
            return;
        }

        if (!appState.selectedContact) {
            showToast('请先选择一个聊天会话', 'warning');
            return;
        }
        const contact = appState.selectedContact;
        const isGroup = contact.isGroup || false;
        const musicContent = {
            songId: String(songId),
            name: name || '未知歌曲',
            artist: artist || '未知歌手',
        };

        const messageData = {
            messageType: 'music',
            content: '音乐分享',
            otherpastxfuks: musicContent,
            text: `分享歌曲：${name} - ${artist}`,
        };
        showToast('正在发送音乐分享...', 'info');
        try {
            if (isGroup) {
                if (typeof sendGroupMessage === 'function') {
                    sendGroupMessage(messageData);
                } else {
                    showToast('群聊发送功能不可用', 'error');
                    return;
                }
            } else {
                if (typeof sendMessage === 'function') {
                    sendMessage(messageData);
                } else {
                    showToast('发送功能不可用', 'error');
                    return;
                }
            }

            showToast(`已发送：${name} - ${artist}`, 'success');
            closeModal();

        } catch (error) {
            console.error('发送音乐消息失败:', error);
            showToast('发送失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    function init() {
        const musicBtn = document.querySelector('.filesmusic-btn');
        if (!musicBtn) {
            return;
        }
        musicBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal();
        });
    }
    window.MokimMusicShare = {
        init: init,
        openModal: openModal,
        closeModal: closeModal,
        search: performSearch,
        play: AudioPlayer.play.bind(AudioPlayer),
        stop: AudioPlayer.stop.bind(AudioPlayer),
        getCurrentSong: () => ({
            id: AudioPlayer.getCurrentSongId(),
            isPlaying: AudioPlayer.isPlaying(),
            duration: AudioPlayer.getDuration(),
            currentTime: AudioPlayer.getCurrentTime()
        }),
        playInline: async function (songId, onPlay, onError) {
            if (!songId) {
                if (onError) onError('歌曲ID无效');
                return;
            }
            if (window._musicPreviewAudio) {
                window._musicPreviewAudio.pause();
                window._musicPreviewAudio = null;
            }
            try {
                const url = await getSongUrlWithCache(songId);
                if (!url) {
                    if (onError) onError('获取播放链接失败');
                    return;
                }

                const audio = new Audio(url);
                audio.volume = 0.7;

                audio.play().then(() => {
                    if (onPlay) onPlay(audio);
                }).catch((err) => {
                    MUSIC_URL_CACHE.delete(songId);
                    getSongUrlWithCache(songId).then((newUrl) => {
                        if (newUrl && newUrl !== url) {
                            audio.src = newUrl;
                            audio.play().then(() => {
                                if (onPlay) onPlay(audio);
                            }).catch((e2) => {
                                if (onError) onError('播放失败: ' + e2.message);
                            });
                        } else {
                            if (onError) onError('播放失败: ' + err.message);
                        }
                    });
                });
            } catch (err) {
                if (onError) onError('播放失败: ' + err.message);
            }
        },
        playMusicPreview: async function (songId, name, artist) {
            if (!songId) {
                showToast('歌曲ID无效', 'error');
                return;
            }
            openModal();
            setTimeout(async () => {
                const url = await getSongUrlWithCache(songId);
                if (url) {
                    const success = AudioPlayer.play(url, songId, () => {
                        updatePreviewButtonState(false);
                    });
                    if (success) {
                        const previewBar = document.querySelector('#mokimMusicPreviewBar');
                        const previewName = document.querySelector('#mokimPreviewName');
                        const previewArtist = document.querySelector('#mokimPreviewArtist');
                        if (previewBar) previewBar.style.display = 'flex';
                        if (previewName) previewName.textContent = name || '未知歌曲';
                        if (previewArtist) previewArtist.textContent = artist || '未知歌手';
                        updatePreviewButtonState(true);
                        switchTab('search');
                    }
                }
            }, 300);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 300);
    }

})();