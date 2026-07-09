(function () {
    'use strict';
    const CONFIG = {
        SEARCH_DEBOUNCE: 500,
        PREVIEW_DURATION: 30
    };
    let modalInstance = null;
    let isModalOpen = false;
    let modalContainer = null;
    let modalOverlay = null;
    let currentVideoData = null;
    let activePlatform = 'douyin';
    let bofangqi_VideoEngine = null;
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function generateUniqueId() {
        return Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    function formatTime(time) {
        if (!time) return '未知时间';
        const date = new Date(time);
        return date.toLocaleString('zh-CN', { hour12: false });
    }

    function showToast(message, type = 'info', duration = 3000) {
        const existing = document.querySelector('.video-toast-mokim');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'video-toast-mokim';
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
    class VideoParserAPI {
        constructor() {
            this.baseUrl = '/api/videoparser/';
            this._cache = new Map();
            this._cacheDuration = 30 * 60 * 1000;
        }

        async getAuthData() {
            try {
                const userId = window.qmok_userid_id || '';
                return await tmd_newcontroler.writenewwords(userId);
            } catch (e) {
                return '';
            }
        }
        async parseVideo(url, platform) {
            if (!url || url.trim().length === 0) {
                return { code: 400, message: '请输入视频链接' };
            }

            try {
                const auth = await this.getAuthData();
                const resp = await fetch(this.baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `url=${encodeURIComponent(url.trim())}&platform=${platform}&ak=${encodeURIComponent(auth)}`
                });

                if (!resp.ok) throw new Error('解析请求失败: ' + resp.status);
                const data = await resp.json();

                if (!data || !data.success) {
                    return {
                        code: data?.code || 500,
                        message: data?.error || data?.message || '解析失败'
                    };
                }
                return { code: 200, data: data.data };
            } catch (error) {
                console.error('视频解析失败:', error);
                return { code: 500, message: '网络错误: ' + error.message };
            }
        }
        async parseVideos(url, platform, options = {}) {
            if (!url || url.trim().length === 0) {
                return { code: 400, message: '请输入视频链接' };
            }
            const cacheKey = `${platform}_${url.trim()}`;
            const forceRefresh = options.forceRefresh || false;
            if (!forceRefresh) {
                const cached = this._cache.get(cacheKey);
                if (cached && (Date.now() - cached.timestamp) < this._cacheDuration) {
                    console.log(`[视频缓存] 命中: ${cacheKey}`);
                    return {
                        code: 200,
                        data: JSON.parse(JSON.stringify(cached.data)),
                        fromCache: true
                    };
                }
                if (cached) {
                    this._cache.delete(cacheKey);
                    console.log(`[视频缓存] 已过期: ${cacheKey}`);
                }
            }
            const result = await this.parseVideo(url, platform);
            if (result.code === 200 && result.data) {
                this._cache.set(cacheKey, {
                    data: JSON.parse(JSON.stringify(result.data)),
                    timestamp: Date.now()
                });
                console.log(`[视频缓存] 已存储: ${cacheKey}`);
                return { ...result, fromCache: false };
            }

            return result;
        }
        getCachedVideo(url, platform) {
            const cacheKey = `${platform}_${url.trim()}`;
            const cached = this._cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this._cacheDuration) {
                return JSON.parse(JSON.stringify(cached.data));
            }
            return null;
        }
        clearCache() {
            this._cache.clear();
            console.log('[视频缓存] 已清空');
        }
        getCacheStats() {
            const now = Date.now();
            let valid = 0, expired = 0;
            for (const entry of this._cache.values()) {
                if ((now - entry.timestamp) < this._cacheDuration) {
                    valid++;
                } else {
                    expired++;
                }
            }
            return { total: this._cache.size, valid, expired };
        }
    }

    const videoAPI = new VideoParserAPI();
    function buildModalHTML() {
        return `
            <div class="mokim-video-modal-overlay" id="mokimVideoModalOverlay">
                <div class="mokim-video-modal-container">
                    <div class="mokim-video-modal-header">
                        <h3><i class="fas fa-video" style="color: #409eff;"></i> 视频分享</h3>
                        <button class="mokim-video-modal-close" id="mokimVideoModalClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="mokim-video-modal-tabs">
                        <button class="mokim-video-tab-btn active" data-tab="about">
                            <i class="fas fa-info-circle"></i> 关于
                        </button>
                        <button class="mokim-video-tab-btn" data-tab="douyin">
                            <i class="fab fa-tiktok"></i> 抖音解析
                        </button>
                        <button class="mokim-video-tab-btn" data-tab="bilibili">
                            <i class="fab fa-bilibili"></i> B站解析
                        </button>
                    </div>
                    <div class="mokim-video-modal-body">
                        <div class="mokim-video-tab-pane active" id="mokimVideoPaneAbout">
                            <div class="mokim-video-about-content">
                                <div class="about-header">
                                    <i class="fas fa-video" style="font-size: 36px; color: #409eff;"></i>
                                    <h2>视频分享模块</h2>
                                    <p style="color: #999; font-size: 14px;">支持抖音 / B站 视频解析与分享</p>
                                </div>
                                <div class="about-section">
                                    <h4><i class="fas fa-shield-alt"></i> 免责声明</h4>
                                    <ul>
                                        <li>本模块仅提供视频信息检索与解析功能，所有视频数据来源于 <strong>抖音</strong> 和 <strong>Bilibili</strong> 公开接口。</li>
                                        <li>本模块 <strong>不存储、不缓存、不传播</strong> 任何视频文件，所有播放链接由源平台官方提供。</li>
                                        <li>视频版权归 <strong>抖音/B站</strong> 及相应版权方所有，请勿将本模块用于商业用途。</li>
                                        <li>用户通过本模块分享的视频链接仅用于个人欣赏与交流，请尊重视频版权。</li>
                                        <li>如涉及版权问题，请联系平台处理，我们将及时配合下架相关功能。</li>
                                    </ul>
                                </div>
                                <div class="about-section">
                                    <h4><i class="fas fa-info-circle"></i> 使用说明</h4>
                                    <ul>
                                        <li>在「抖音解析」或「B站解析」标签页粘贴视频链接。</li>
                                        <li>点击「解析」按钮获取视频信息。</li>
                                        <li>解析成功后，可点击「鉴赏」在新窗口预览视频。</li>
                                        <li>点击「发送」将视频卡片分享到当前聊天会话。</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                  
                        <div class="mokim-video-tab-pane" id="mokimVideoPaneDouyin">
                            <div class="mokim-video-search-area">
                                <div class="mokim-video-search-box">
                                    <input type="text" id="mokimVideoDouyinInput" placeholder="粘贴抖音视频分享链接..." maxlength="500" autocomplete="off">
                                    <button id="mokimVideoDouyinBtn"><i class="fas fa-search"></i> 解析</button>
                                </div>
                                <div class="mokim-video-search-hint">
                                    <i class="fas fa-info-circle"></i> 支持抖音APP分享链接 · 如：https://v.douyin.com/1QeQ4WWLN00/
                                </div>
                            </div>
                            <div class="mokim-video-result-area" id="mokimVideoDouyinResult">
                                <div class="mokim-video-empty-state">
                                    <i class="fab fa-tiktok" style="font-size: 48px; opacity: 0.3;"></i>
                                    <p>粘贴抖音链接开始解析</p>
                                    <span style="font-size: 12px; color: #999;">支持视频分享链接</span>
                                </div>
                            </div>
                        </div>

                  
                        <div class="mokim-video-tab-pane" id="mokimVideoPaneBilibili">
                            <div class="mokim-video-search-area">
                                <div class="mokim-video-search-box">
                                    <input type="text" id="mokimVideoBiliInput" placeholder="粘贴B站视频链接或BV号..." maxlength="500" autocomplete="off">
                                    <button id="mokimVideoBiliBtn"><i class="fas fa-search"></i> 解析</button>
                                </div>
                                <div class="mokim-video-search-hint">
                                    <i class="fas fa-info-circle"></i> 支持B站视频链接或BV号 · 如：https://www.bilibili.com/video/BVxxxxx
                                </div>
                            </div>
                            <div class="mokim-video-result-area" id="mokimVideoBiliResult">
                                <div class="mokim-video-empty-state">
                                    <i class="fab fa-bilibili" style="font-size: 48px; opacity: 0.3;"></i>
                                    <p>粘贴B站链接开始解析</p>
                                    <span style="font-size: 12px; color: #999;">支持视频BV号</span>
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
        container.id = 'mokimVideoModalContainer';
        container.innerHTML = buildModalHTML();
        document.body.appendChild(container);
        modalContainer = container;
        modalOverlay = container.querySelector('#mokimVideoModalOverlay');
        bindModalEvents();
        return container;
    }

    function bindModalEvents() {
        if (!modalContainer) return;

        const closeBtn = modalContainer.querySelector('#mokimVideoModalClose');
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
        const tabBtns = modalContainer.querySelectorAll('.mokim-video-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                switchTab(tab);
            });
        });
        const douyinBtn = modalContainer.querySelector('#mokimVideoDouyinBtn');
        const douyinInput = modalContainer.querySelector('#mokimVideoDouyinInput');
        if (douyinBtn && douyinInput) {
            douyinBtn.addEventListener('click', () => performParse('douyin'));
            douyinInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performParse('douyin');
                }
            });
        }
        const biliBtn = modalContainer.querySelector('#mokimVideoBiliBtn');
        const biliInput = modalContainer.querySelector('#mokimVideoBiliInput');
        if (biliBtn && biliInput) {
            biliBtn.addEventListener('click', () => performParse('bilibili'));
            biliInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performParse('bilibili');
                }
            });
        }
    }

    function openModal() {
        if (isModalOpen) return;
        const container = getModal();
        if (container) {
            container.querySelector('#mokimVideoModalOverlay').classList.add('active');
            isModalOpen = true;
            document.body.style.overflow = 'hidden';
            switchTab('about');
            const douyinInput = container.querySelector('#mokimVideoDouyinInput');
            const biliInput = container.querySelector('#mokimVideoBiliInput');
            if (douyinInput) douyinInput.value = '';
            if (biliInput) biliInput.value = '';
            resetResultAreas();
        }
    }

    function closeModal() {
        if (!isModalOpen) return;
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
        isModalOpen = false;
        document.body.style.overflow = '';
        currentVideoData = null;
    }

    function switchTab(tab) {
        if (!modalContainer) return;
        const tabs = modalContainer.querySelectorAll('.mokim-video-tab-btn');
        const panes = modalContainer.querySelectorAll('.mokim-video-tab-pane');

        tabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        const paneMap = {
            'about': 'mokimVideoPaneAbout',
            'douyin': 'mokimVideoPaneDouyin',
            'bilibili': 'mokimVideoPaneBilibili'
        };

        panes.forEach(pane => {
            pane.classList.toggle('active', pane.id === paneMap[tab]);
        });
    }

    function resetResultAreas() {
        const douyinResult = document.querySelector('#mokimVideoDouyinResult');
        const biliResult = document.querySelector('#mokimVideoBiliResult');

        if (douyinResult) {
            douyinResult.innerHTML = `
                <div class="mokim-video-empty-state">
                    <i class="fab fa-tiktok" style="font-size: 48px; opacity: 0.3;"></i>
                    <p>粘贴抖音链接开始解析</p>
                    <span style="font-size: 12px; color: #999;">支持视频分享链接</span>
                </div>
            `;
        }

        if (biliResult) {
            biliResult.innerHTML = `
                <div class="mokim-video-empty-state">
                    <i class="fab fa-bilibili" style="font-size: 48px; opacity: 0.3;"></i>
                    <p>粘贴B站链接开始解析</p>
                    <span style="font-size: 12px; color: #999;">支持视频BV号</span>
                </div>
            `;
        }
    }
    async function performParse(platform) {
        if (!modalContainer) return;
        const inputId = platform === 'douyin' ? '#mokimVideoDouyinInput' : '#mokimVideoBiliInput';
        const resultId = platform === 'douyin' ? '#mokimVideoDouyinResult' : '#mokimVideoBiliResult';
        const input = modalContainer.querySelector(inputId);
        const resultArea = modalContainer.querySelector(resultId);
        if (!input || !resultArea) return;
        const url = input.value.trim();
        if (!url) {
            showToast('请输入视频链接', 'warning');
            return;
        }
        resultArea.innerHTML = `
            <div class="mokim-video-loading-state">
                <i class="fas fa-spinner fa-pulse" style="font-size: 28px;"></i>
                <p>正在解析视频信息...</p>
                <span style="font-size: 12px; color: #999;">请稍候</span>
            </div>
        `;

        try {
            const result = await videoAPI.parseVideo(url, platform);
            if (result.code !== 200 || !result.data) {
                resultArea.innerHTML = `
                    <div class="mokim-video-error-state">
                        <i class="fas fa-exclamation-triangle" style="font-size: 36px; color: #f56c6c;"></i>
                        <p>解析失败</p>
                        <span style="font-size: 12px; color: #999;">${escapeHtml(result.message || '未知错误')}</span>
                    </div>
                `;
                showToast(result.message || '解析失败', 'error');
                return;
            }

            const data = result.data;
            currentVideoData = {
                ...data,
                platform: platform,
                url: url
            };

            renderVideoResult(resultArea, data, platform);

        } catch (error) {
            console.error('视频解析失败:', error);
            resultArea.innerHTML = `
                <div class="mokim-video-error-state">
                    <i class="fas fa-exclamation-triangle" style="font-size: 36px; color: #f56c6c;"></i>
                    <p>解析异常</p>
                    <span style="font-size: 12px; color: #999;">${escapeHtml(error.message || '网络错误')}</span>
                </div>
            `;
            showToast('解析失败: ' + error.message, 'error');
        }
    }
    function renderVideoResult(container, data, platform) {
        const title = escapeHtml(data.title || '无标题');
        const author = escapeHtml(data.author || '未知作者');
        const duration = data.duration ? formatDuration(data.duration) : '未知时长';
        const coverUrl = data.cover || '';
        const platformName = platform === 'douyin' ? '抖音' : 'B站';
        const platformIcon = platform === 'douyin' ? 'fab fa-tiktok' : 'fab fa-bilibili';
        const platformColor = platform === 'douyin' ? '#000000' : '#00a1d6';
        container.innerHTML = `
            <div class="mokim-video-result-card">
                <div class="video-result-header">
                    <span class="video-platform-badge" style="background: ${platformColor};">
                        <i class="${platformIcon}"></i> ${platformName}
                    </span>
                    <span class="video-status-badge success">
                        <i class="fas fa-check-circle"></i> 解析成功
                    </span>
                </div>
                <div class="video-result-body">
                    ${coverUrl ? `
                        <div class="video-cover-wrapper">
                            <img src="${coverUrl}" class="video-cover" alt="视频封面" loading="lazy"
                                 onerror="this.style.display='none'">
                        </div>
                    ` : ''}
                    <div class="video-info-wrapper">
                        <div class="video-title">${title}</div>
                        <div class="video-meta">
                            <span><i class="fas fa-user"></i> ${author}</span>
                            <span><i class="fas fa-clock"></i> ${duration}</span>
                        </div>
                        <div class="video-actions">
                            <button class="video-preview-btn" id="videoPreviewBtn">
                                <i class="fas fa-play"></i> 鉴赏
                            </button>
                            <button class="video-send-btn" id="videoSendBtn">
                                <i class="fas fa-paper-plane"></i> 发送
                            </button>
                        </div>
                    </div>
                </div>
                <div class="video-result-footer">
                    <span class="video-parse-time"><i class="far fa-clock"></i> 解析时间: ${formatTime(Date.now())}</span>
                </div>
            </div>
        `;
        const previewBtn = container.querySelector('#videoPreviewBtn');
        const sendBtn = container.querySelector('#videoSendBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                if (currentVideoData) {
                    handlePreview(currentVideoData);
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                if (currentVideoData) {
                    handleSend(currentVideoData);
                }
            });
        }
    }
    function handlePreview(data) {
        if (!data) {
            showToast('视频数据无效', 'error');
            return;
        }
        const videoUrl = data.video_url || data.url;
        if (!videoUrl) {
            showToast('无法获取视频播放链接', 'error');
            return;
        }
        if (bofangqi_VideoEngine) {
            try {
                bofangqi_VideoEngine.destroy();
            } catch (e) {
                console.warn('销毁播放器失败:', e);
            }
            bofangqi_VideoEngine = null;
        }
        bofangqi_VideoEngine = new YHTVideoPlayerEngine([videoUrl], {
            autoplay: true,
            poster: data.cover || '',
            useIframe: true
        });
        bofangqi_VideoEngine.show();
    }

    function handleSend(data) {
        if (!data) {
            showToast('视频数据无效', 'error');
            return;
        }

        if (!appState.selectedContact) {
            showToast('请先选择一个聊天会话', 'warning');
            return;
        }

        const contact = appState.selectedContact;
        const isGroup = contact.isGroup || false;
        const platform = data.platform || 'unknown';

        const videoContent = {
            platform: platform,
            title: data.title || '视频分享',
            author: data.author || '未知作者',
            cover: data.cover || '',
            video_url: data.video_url || data.url || '',
            duration: data.duration || 0,
            source_url: data.source_url || data.url || ''
        };

        const messageData = {
            messageType: 'video',
            content: `分享视频：${data.title || '视频分享'}`,
            otherpastxfuks: videoContent,
            text: `分享视频：${data.title || '视频分享'} - ${data.author || '未知作者'}`
        };

        showToast('正在发送视频分享...', 'info');

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

            showToast(`已发送：${data.title || '视频分享'}`, 'success');
            closeModal();

        } catch (error) {
            console.error('发送视频消息失败:', error);
            showToast('发送失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    function formatDuration(seconds) {
        if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }
    function init() {
        const videoBtn = document.querySelector('#chat-file-fjvideoss');
        if (!videoBtn) {
            return;
        }

        videoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal();
        });
    }
    window.MokimVideoShare = {
        init: init,
        openModal: openModal,
        closeModal: closeModal,
        parse: performParse,
        getCurrentVideo: () => currentVideoData,
        setVideoData: (data) => { currentVideoData = data; },
        parseVideoUrl: async function (url, platform) {
            return await videoAPI.parseVideos(url, platform);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 300);
    }

})();