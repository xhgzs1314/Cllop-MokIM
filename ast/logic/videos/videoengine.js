export default class YHTVideoPlayerEngine {
  constructor(sources, options = {}) {
    this.sources = Array.isArray(sources) ? sources : [sources];
    this.options = {
      poster: options.poster || '',
      autoplay: options.autoplay !== false,
      useIframe: options.useIframe || false,
      ...options
    };
    this.isDestroyed = false;
    this.isShowing = false;
    this.isLoading = false;
    this.volume = options.volume ?? 0.8;
    this.playbackRate = 1.0;
    this._iframeReady = false;
    this._pendingActions = [];
    this._isDragging = false;
    this._dragTargetTime = 0;
    this._duration = 0;
    this.overlay = null;
    this.video = null;
    this.iframe = null;
    this.loadingEl = null;
    this.errorEl = null;
    this.progressFill = null;
    this.progressBar = null;
    this.progressHover = null;
    this.timeDisplay = null;
    this.volumeSlider = null;
    this.speedBtn = null;
    this.playBtn = null;
    this.controls = null;
    this._boundEvents = [];
    this._controlsTimer = null;
    this._isHovering = false;
    this._swRegistration = null;
    this._initStyles();
    this._buildDOM();
    this._registerServiceWorker();
  }

  _initStyles() {
    const styleId = 'video-look-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .vl-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #000;
        z-index: 999999999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
        user-select: none;
        color: #fff;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .vl-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .vl-video-wrap {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: #000;
        overflow: hidden;
      }
      .vl-video-wrap iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: #000;
        display: block;
        pointer-events: none;
      }
      .vl-video-wrap video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
        display: none;
      }
      
      .vl-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10;
        pointer-events: none;
      }
      .vl-loading-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid rgba(255,255,255,0.1);
        border-top: 3px solid #f53d3d;
        border-radius: 50%;
        animation: vl-spin 0.8s linear infinite;
      }
      @keyframes vl-spin {
        to { transform: rotate(360deg); }
      }
      
      .vl-error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10;
        text-align: center;
        color: #ff6b6b;
        display: none;
        background: rgba(0,0,0,0.8);
        padding: 24px 32px;
        border-radius: 16px;
        backdrop-filter: blur(8px);
      }
      .vl-error.show {
        display: block;
      }
      .vl-error-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }
      .vl-error-text {
        font-size: 14px;
        color: #aaa;
        max-width: 300px;
      }
      
      .vl-close-btn {
        position: absolute;
        top: 20px;
        right: 24px;
        z-index: 20;
        background: rgba(0,0,0,0.6);
        border: none;
        color: #fff;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
        transition: all 0.2s;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        padding: 0;
        line-height: 1;
        opacity: 0;
        transition: opacity 0.3s, transform 0.2s, background 0.2s;
      }
      .vl-overlay.active .vl-close-btn {
        opacity: 1;
      }
      .vl-close-btn:hover {
        background: rgba(255,255,255,0.2);
        transform: scale(1.05);
      }
      .vl-controls {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
        padding: 20px 24px 12px 24px;
        z-index: 30;
        opacity: 0;
        transform: translateY(100%);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
      }
      .vl-overlay.active .vl-controls.show {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      
      .vl-controls-inner {
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 100%;
      }
      
      .vl-controls button {
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.85);
        font-size: 12px;
        font-weight: 400;
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        min-width: 28px;
        justify-content: center;
        height: 28px;
        flex-shrink: 0;
      }
      .vl-controls button:hover {
        background: rgba(255,255,255,0.1);
        color: #fff;
      }
      .vl-controls button:active {
        transform: scale(0.92);
      }
      .vl-controls button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }
      .vl-icon {
        font-size: 15px;
        line-height: 1;
      }
      .vl-progress-container {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .vl-progress-bar {
        flex: 1;
        height: 4px;
        background: rgba(255,255,255,0.2);
        border-radius: 2px;
        position: relative;
        cursor: pointer;
        min-height: 4px;
        min-width: 40px;
        transition: height 0.2s;
      }
      .vl-progress-bar:hover {
        height: 6px;
      }
      .vl-progress-fill {
        height: 100%;
        width: 0%;
        background: #f53d3d;
        border-radius: 2px;
        pointer-events: none;
        position: relative;
        transition: width 0.1s linear;
      }
      .vl-progress-fill::after {
        content: '';
        position: absolute;
        right: -5px;
        top: -4px;
        width: 12px;
        height: 12px;
        background: #f53d3d;
        border-radius: 50%;
        opacity: 0;
        transition: opacity 0.2s;
        box-shadow: 0 0 16px rgba(245,61,61,0.4);
      }
      .vl-progress-bar:hover .vl-progress-fill::after {
        opacity: 1;
      }
      .vl-progress-hover {
        position: absolute;
        top: -20px;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: #fff;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        pointer-events: none;
        display: none;
        white-space: nowrap;
      }
      .vl-time {
        font-size: 11px;
        color: rgba(255,255,255,0.7);
        min-width: 80px;
        text-align: center;
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
        font-weight: 300;
        letter-spacing: 0.2px;
      }
      .vl-volume-wrap {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }
      .vl-volume-slider {
        width: 40px;
        height: 3px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255,255,255,0.2);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
        transition: height 0.2s;
      }
      .vl-volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #f53d3d;
        cursor: pointer;
        box-shadow: 0 0 12px rgba(245,61,61,0.3);
        border: 2px solid rgba(255,255,255,0.9);
      }
      .vl-volume-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #f53d3d;
        cursor: pointer;
        border: 2px solid rgba(255,255,255,0.9);
      }
      .vl-volume-slider:hover {
        height: 4px;
      }
      .vl-speed-btn {
        min-width: 36px;
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 500;
        height: 24px;
        flex-shrink: 0;
        color: rgba(255,255,255,0.8);
      }
      .vl-download-btn {
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
        padding: 2px 8px;
        gap: 4px;
        height: 24px;
        flex-shrink: 0;
        font-size: 11px;
        color: rgba(255,255,255,0.8);
      }
      .vl-play-btn {
        background: rgba(255,255,255,0.08);
        border-radius: 50%;
        width: 30px;
        height: 30px;
        padding: 0;
        font-size: 13px;
        min-width: 30px;
        flex-shrink: 0;
      }
      
      @media (max-width: 700px) {
        .vl-controls { padding: 16px 12px 8px 12px; }
        .vl-volume-slider { width: 28px; }
        .vl-time { min-width: 60px; font-size: 10px; }
        .vl-close-btn { top: 12px; right: 14px; width: 34px; height: 34px; font-size: 16px; }
        .vl-play-btn { width: 26px; height: 26px; min-width: 26px; font-size: 12px; }
        .vl-download-btn span:not(.vl-icon) { display: none; }
        .vl-speed-btn { min-width: 30px; font-size: 10px; padding: 2px 6px; }
      }
    `;
    document.head.appendChild(style);
  }

  _registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    const swCode = `
      self.addEventListener('install', (event) => {
        event.waitUntil(self.skipWaiting());
      });
      
      self.addEventListener('activate', (event) => {
        event.waitUntil(self.clients.claim());
      });
      
      self.addEventListener('fetch', (event) => {
        const url = new URL(event.request.url);
        
        if (url.pathname.startsWith('/vl-download/')) {
          const videoUrl = decodeURIComponent(url.searchParams.get('url') || '');
          if (!videoUrl) {
            return event.respondWith(new Response('No URL provided', { status: 400 }));
          }
          
          event.respondWith(
            (async () => {
              try {
                const response = await fetch(videoUrl, {
                  mode: 'cors',
                  credentials: 'omit',
                  headers: {
                    'Range': event.request.headers.get('range') || 'bytes=0-'
                  }
                });
                
                const newHeaders = new Headers(response.headers);
                newHeaders.set('Access-Control-Allow-Origin', '*');
                
                return new Response(response.body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: newHeaders
                });
              } catch (error) {
                return new Response('Download failed: ' + error.message, { status: 500 });
              }
            })()
          );
        }
      });
    `;

    const swBlob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(swBlob);

    navigator.serviceWorker.register(swUrl, { scope: '/' })
      .then(registration => {
        console.log('Service Worker registered successfully');
        this._swRegistration = registration;
      })
      .catch(error => {
        console.warn('Service Worker registration failed:', error);
        this._swRegistration = null;
      });
  }

  _buildDOM() {
    const overlay = document.createElement('div');
    overlay.className = 'vl-overlay';
    overlay.innerHTML = `
      <div class="vl-video-wrap">
        <iframe id="vl-iframe" allow="autoplay; encrypted-media; fullscreen" 
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                loading="lazy"></iframe>
        <video id="vl-video" preload="metadata" playsinline crossorigin="anonymous"></video>
        <div class="vl-loading"><div class="vl-loading-spinner"></div></div>
        <div class="vl-error">
          <div class="vl-error-icon">⚠️</div>
          <div class="vl-error-text">视频加载失败</div>
        </div>
        <button class="vl-close-btn">✕</button>
        <div class="vl-controls">
          <div class="vl-controls-inner">
            <button class="vl-play-btn" id="vl-play-btn"><span class="vl-icon">▶</span></button>
            <div class="vl-progress-container">
              <div class="vl-progress-bar">
                <div class="vl-progress-fill"></div>
                <div class="vl-progress-hover">0:00</div>
              </div>
              <span class="vl-time">0:00 / 0:00</span>
            </div>
            <div class="vl-volume-wrap">
              <span class="vl-icon" style="font-size:12px;">🔊</span>
              <input class="vl-volume-slider" type="range" min="0" max="1" step="0.05" value="${this.volume}">
            </div>
            <button class="vl-speed-btn">1.0×</button>
            <button class="vl-download-btn"><span class="vl-icon">⬇</span> <span>下载</span></button>
          </div>
        </div>
      </div>
    `;

    this.overlay = overlay;
    this.iframe = overlay.querySelector('#vl-iframe');
    this.video = overlay.querySelector('#vl-video');
    this.loadingEl = overlay.querySelector('.vl-loading');
    this.errorEl = overlay.querySelector('.vl-error');
    this.progressFill = overlay.querySelector('.vl-progress-fill');
    this.progressBar = overlay.querySelector('.vl-progress-bar');
    this.progressHover = overlay.querySelector('.vl-progress-hover');
    this.timeDisplay = overlay.querySelector('.vl-time');
    this.volumeSlider = overlay.querySelector('.vl-volume-slider');
    this.speedBtn = overlay.querySelector('.vl-speed-btn');
    this.playBtn = overlay.querySelector('#vl-play-btn');
    this.controls = overlay.querySelector('.vl-controls');

    if (this.options.poster) {
      this.video.poster = this.options.poster;
    }

    this._loadVideo();
    this.video.volume = this.volume;
    this.volumeSlider.value = this.volume;
    this._bindEvents();
    this._setupControlsBehavior();
  }

  _loadVideo() {
    const url = this.sources[0];
    const useIframe = this.options.useIframe === true ||
      url.includes('douyinvod.com') ||
      url.includes('bytecdn.cn') ||
      url.includes('pstatp.com') ||
      url.includes('toutiaovod.com') ||
      url.includes('snssdk.com') ||
      url.includes('aweme/v1/play/') ||
      url.includes('douyin.com/aweme/') ||
      url.includes('iesdouyin.com');

    if (useIframe) {
      this._loadViaIframe(url);
    } else {
      this._loadViaVideo(url);
    }
  }

  _loadViaIframe(url) {
    this.iframe.style.display = 'block';
    this.video.style.display = 'none';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: #000; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            overflow: hidden;
          }
          video {
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #000;
          }
          video::-webkit-media-controls {
            display: none !important;
          }
          video::-webkit-media-controls-enclosure {
            display: none !important;
          }
          video::-webkit-media-controls-panel {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <video id="v" preload="metadata" playsinline 
               crossorigin="anonymous" 
               referrerpolicy="no-referrer-when-downgrade"
               src="${url}">
        </video>
        <script>
          const video = document.getElementById('v');
          
          function send(type, data) {
            window.parent.postMessage({ type, data, source: 'vl-iframe' }, '*');
          }
          
          video.addEventListener('loadstart', () => send('loadstart'));
          video.addEventListener('loadedmetadata', () => {
            send('loadedmetadata', {
              duration: video.duration,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight
            });
          });
          video.addEventListener('canplay', () => {
            send('canplay', {
              duration: video.duration,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight
            });
          });
          
          let lastSend = 0;
          video.addEventListener('timeupdate', () => {
            const now = Date.now();
            if (now - lastSend > 80) {
              lastSend = now;
              send('timeupdate', {
                currentTime: video.currentTime,
                duration: video.duration,
                paused: video.paused
              });
            }
          });
          
          video.addEventListener('play', () => send('play'));
          video.addEventListener('pause', () => send('pause'));
          video.addEventListener('ended', () => send('ended'));
          video.addEventListener('volumechange', () => {
            send('volumechange', { volume: video.volume });
          });
          video.addEventListener('ratechange', () => {
            send('ratechange', { playbackRate: video.playbackRate });
          });
          
          video.addEventListener('error', (e) => {
            send('error', {
              code: video.error ? video.error.code : -1,
              message: video.error ? video.error.message : '未知错误'
            });
          });
          
          window.addEventListener('message', (e) => {
            if (!e.data || e.data.source !== 'vl-parent') return;
            const { action, value } = e.data;
            switch(action) {
              case 'play': video.play().catch(() => {}); break;
              case 'pause': video.pause(); break;
              case 'toggle': video.paused ? video.play().catch(() => {}) : video.pause(); break;
              case 'seek':
                if (video.duration) {
                  video.currentTime = Math.max(0, Math.min(value, video.duration));
                }
                break;
              case 'setVolume':
                video.volume = Math.max(0, Math.min(1, value));
                break;
              case 'setPlaybackRate':
                video.playbackRate = value;
                break;
            }
          });
          
          send('ready');
          if (${this.options.autoplay}) {
            video.play().catch(() => {});
          }
        <\/script>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    this.iframe.src = blobUrl;

    this._setupIframeMessaging();
    this.isLoading = true;
    this.loadingEl.style.display = 'block';
    this.errorEl.classList.remove('show');
  }

  _setupIframeMessaging() {
    const handler = (event) => {
      if (!event.data || event.data.source !== 'vl-iframe') return;

      const { type, data } = event.data;

      switch (type) {
        case 'ready':
          this._iframeReady = true;
          this._pendingActions.forEach(action => {
            this._sendToIframe(action.action, action.value);
          });
          this._pendingActions = [];
          break;

        case 'loadstart':
          this.isLoading = true;
          this.loadingEl.style.display = 'block';
          this.errorEl.classList.remove('show');
          break;

        case 'loadedmetadata':
          break;
        case 'canplay':
          this.isLoading = false;
          this.loadingEl.style.display = 'none';
          this._iframeReady = true;
          if (data) {
            this._duration = data.duration || 0;
            this._updateTimeDisplay(0, data.duration || 0);
          }
          break;

        case 'timeupdate':
          if (data && !this._isDragging) {
            this._duration = data.duration || this._duration;
            this._updateProgress(data.currentTime, data.duration || this._duration);
            this._updateTimeDisplay(data.currentTime, data.duration || this._duration);
            if (data.paused !== undefined) {
              this._updatePlayButton(data.paused);
            }
          }
          break;

        case 'play':
          this._updatePlayButton(false);
          break;

        case 'pause':
          this._updatePlayButton(true);
          break;

        case 'ended':
          this._updateProgress(0, this._duration);
          this._updatePlayButton(true);
          break;

        case 'volumechange':
          if (data && data.volume !== undefined) {
            this.volumeSlider.value = data.volume;
            this._updateVolumeIcon(data.volume);
          }
          break;

        case 'ratechange':
          if (data && data.playbackRate !== undefined) {
            this.speedBtn.textContent = `${data.playbackRate.toFixed(2)}×`.replace(/\.?0+×$/, '×');
          }
          break;

        case 'error':
          this.isLoading = false;
          this.loadingEl.style.display = 'none';
          this.errorEl.querySelector('.vl-error-text').textContent =
            data?.message || '加载失败';
          this.errorEl.classList.add('show');
          break;
      }
    };

    window.addEventListener('message', handler);
    this._boundEvents.push({ el: window, type: 'message', fn: handler });
  }

  _sendToIframe(action, value) {
    if (!this.iframe || !this.iframe.contentWindow) return;

    if (!this._iframeReady) {
      this._pendingActions.push({ action, value });
      return;
    }

    try {
      this.iframe.contentWindow.postMessage({
        action,
        value,
        source: 'vl-parent'
      }, '*');
    } catch (e) {
      console.warn('Iframe send failed:', e);
    }
  }

  _loadViaVideo(url) {
    this.iframe.style.display = 'none';
    this.video.style.display = 'block';

    this.video.innerHTML = '';
    this.sources.forEach((src) => {
      const source = document.createElement('source');
      source.src = src;
      const ext = src.split('.').pop().toLowerCase().split('?')[0];
      const types = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        ogg: 'video/ogg',
        mov: 'video/quicktime',
        mkv: 'video/x-matroska'
      };
      source.type = types[ext] || 'video/mp4';
      this.video.appendChild(source);
    });

    this.video.load();
    this.isLoading = true;
    this.loadingEl.style.display = 'block';
    this.errorEl.classList.remove('show');

    if (this.options.autoplay) {
      this.video.play().catch(() => { });
    }
  }

  _updateProgress(current, duration) {
    const pct = duration ? (current / duration) * 100 : 0;
    this.progressFill.style.width = `${Math.min(pct, 100)}%`;
  }

  _updateTimeDisplay(current, duration) {
    this.timeDisplay.textContent = `${this._formatTime(current)} / ${this._formatTime(duration)}`;
  }

  _updatePlayButton(paused) {
    if (this.playBtn) {
      this.playBtn.querySelector('.vl-icon').textContent = paused ? '▶' : '⏸';
    }
  }

  _updateVolumeIcon(volume) {
    const icon = this.volumeSlider?.parentElement?.querySelector('.vl-icon');
    if (icon) {
      icon.textContent = volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';
    }
  }

  _isIframeMode() {
    return this.iframe && this.iframe.style.display !== 'none';
  }

  _setupControlsBehavior() {
    const showControls = () => {
      this._isHovering = true;
      this.controls.classList.add('show');
      clearTimeout(this._controlsTimer);
    };

    const hideControls = () => {
      this._isHovering = false;
      const isPaused = this.playBtn?.querySelector('.vl-icon')?.textContent === '▶';
      if (!isPaused) {
        this._controlsTimer = setTimeout(() => {
          if (!this._isHovering) {
            this.controls.classList.remove('show');
          }
        }, 2000);
      }
    };
    this.overlay.addEventListener('mouseenter', showControls);
    this.overlay.addEventListener('mousemove', () => {
      this.controls.classList.add('show');
      clearTimeout(this._controlsTimer);
      const isPaused = this.playBtn?.querySelector('.vl-icon')?.textContent === '▶';
      if (!isPaused) {
        this._controlsTimer = setTimeout(() => {
          if (!this._isHovering) {
            this.controls.classList.remove('show');
          }
        }, 2000);
      }
    });
    this.overlay.addEventListener('mouseleave', hideControls);
    let touchTimer = null;
    this.overlay.addEventListener('touchstart', () => {
      if (this.controls.classList.contains('show')) {
        this.controls.classList.remove('show');
      } else {
        this.controls.classList.add('show');
        clearTimeout(touchTimer);
        touchTimer = setTimeout(() => {
          this.controls.classList.remove('show');
        }, 3000);
      }
    });

    this._controlsCleanup = () => {
      clearTimeout(this._controlsTimer);
      clearTimeout(touchTimer);
    };
  }

  _checkDownloadAvailability(url) {
    return new Promise((resolve) => {
      fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit'
      })
      .then(response => {
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const acceptRanges = response.headers.get('accept-ranges');
        
        const isDownloadable = (
          response.ok && 
          (contentType?.includes('video') || contentType?.includes('application/octet-stream')) &&
          (acceptRanges === 'bytes' || contentLength)
        );
        
        resolve(isDownloadable);
      })
      .catch(() => {
        fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: { 'Range': 'bytes=0-0' }
        })
        .then(response => {
          const isDownloadable = response.status === 206 || 
                                response.headers.get('accept-ranges') === 'bytes';
          resolve(isDownloadable);
        })
        .catch(() => {
          resolve(false);
        });
      });
    });
  }

  async _downloadWithServiceWorker(url, downloadBtn, originalText) {
    if (!this._swRegistration) {
      throw new Error('Service Worker not available');
    }
    
    const swDownloadUrl = `/vl-download/?url=${encodeURIComponent(url)}`;
    
    downloadBtn.innerHTML = '<span class="vl-icon">⏳</span> 准备下载...';
    
    const response = await fetch(swDownloadUrl, {
      headers: {
        'Range': 'bytes=0-'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    
    const contentLength = response.headers.get('content-length');
    const totalSize = contentLength ? parseInt(contentLength) : 0;
    
    const reader = response.body.getReader();
    const chunks = [];
    let downloadedSize = 0;
    let lastUpdateTime = Date.now();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      downloadedSize += value.length;
      
      const now = Date.now();
      if (now - lastUpdateTime > 200 || downloadedSize === totalSize) {
        lastUpdateTime = now;
        
        if (totalSize > 0) {
          const progress = Math.round((downloadedSize / totalSize) * 100);
          downloadBtn.innerHTML = `<span class="vl-icon">⏳</span> ${progress}%`;
        } else {
          const mb = (downloadedSize / (1024 * 1024)).toFixed(1);
          downloadBtn.innerHTML = `<span class="vl-icon">⏳</span> ${mb}MB`;
        }
      }
    }
    
    const blob = new Blob(chunks, {
      type: response.headers.get('content-type') || 'video/mp4'
    });
    
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    const fileName = url.split('/').pop()?.split('?')[0] || 'video.mp4';
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 5000);
    
    downloadBtn.innerHTML = '✅ 下载完成';
    downloadBtn.style.opacity = '1';
    
    setTimeout(() => {
      downloadBtn.innerHTML = originalText;
      downloadBtn.disabled = false;
      downloadBtn.style.cursor = 'pointer';
    }, 2000);
  }

  _bindEvents() {
    const video = this.video;
    const overlay = this.overlay;
    const closeBtn = overlay.querySelector('.vl-close-btn');
    const progressBar = this.progressBar;
    const volumeSlider = this.volumeSlider;
    const speedBtn = this.speedBtn;
    const downloadBtn = overlay.querySelector('.vl-download-btn');
    const events = [];
    
    const onClose = () => this.hide();
    closeBtn.addEventListener('click', onClose);
    events.push({ el: closeBtn, type: 'click', fn: onClose });
    
    const onOverlayClick = (e) => {
      if (e.target === overlay || e.target === overlay.querySelector('.vl-video-wrap')) {
        this.hide();
      }
    };
    overlay.addEventListener('click', onOverlayClick);
    events.push({ el: overlay, type: 'click', fn: onOverlayClick });
    
    const onPlayClick = () => {
      if (this._isIframeMode()) {
        this._sendToIframe('toggle');
      } else {
        if (video.paused) {
          video.play().catch(() => { });
        } else {
          video.pause();
        }
      }
    };
    this.playBtn.addEventListener('click', onPlayClick);
    events.push({ el: this.playBtn, type: 'click', fn: onPlayClick });
    
    const onPlayState = () => {
      this._updatePlayButton(video.paused);
    };
    video.addEventListener('play', onPlayState);
    video.addEventListener('pause', onPlayState);
    events.push({ el: video, type: 'play', fn: onPlayState });
    events.push({ el: video, type: 'pause', fn: onPlayState });

    const onTimeUpdate = () => {
      if (!this._isDragging) {
        const duration = video.duration || 0;
        const current = video.currentTime || 0;
        this._duration = duration;
        this._updateProgress(current, duration);
        this._updateTimeDisplay(current, duration);
      }
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    events.push({ el: video, type: 'timeupdate', fn: onTimeUpdate });
    
    progressBar.addEventListener('mousemove', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, x));
      const time = clamped * this._duration;
      this.progressHover.textContent = this._formatTime(time);
      this.progressHover.style.left = `${clamped * 100}%`;
      this.progressHover.style.display = 'block';
    });
    progressBar.addEventListener('mouseleave', () => {
      this.progressHover.style.display = 'none';
    });
    
    const onProgressSeek = (e) => {
      const rect = progressBar.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, x));
      const target = clamped * this._duration;

      if (this._isIframeMode()) {
        this._sendToIframe('seek', target);
      } else {
        if (video.duration) {
          video.currentTime = target;
        }
      }
      this.progressFill.style.width = `${clamped * 100}%`;
      this._updateTimeDisplay(target, this._duration);
    };
    progressBar.addEventListener('click', onProgressSeek);
    events.push({ el: progressBar, type: 'click', fn: onProgressSeek });
    
    const onProgressMouseDown = (e) => {
      this._isDragging = true;
      const rect = progressBar.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, x));
      this._dragTargetTime = clamped * this._duration;
      this.progressFill.style.width = `${clamped * 100}%`;
      this._updateTimeDisplay(this._dragTargetTime, this._duration);
    };
    progressBar.addEventListener('mousedown', onProgressMouseDown);
    events.push({ el: progressBar, type: 'mousedown', fn: onProgressMouseDown });

    const onMouseMove = (e) => {
      if (!this._isDragging) return;
      const rect = progressBar.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, x));
      this._dragTargetTime = clamped * this._duration;
      this.progressFill.style.width = `${clamped * 100}%`;
      this._updateTimeDisplay(this._dragTargetTime, this._duration);
    };
    document.addEventListener('mousemove', onMouseMove);
    events.push({ el: document, type: 'mousemove', fn: onMouseMove });

    const onMouseUp = () => {
      if (this._isDragging) {
        this._isDragging = false;
        if (this._isIframeMode()) {
          this._sendToIframe('seek', this._dragTargetTime);
        } else {
          if (video.duration) {
            video.currentTime = this._dragTargetTime;
          }
        }
      }
    };
    document.addEventListener('mouseup', onMouseUp);
    events.push({ el: document, type: 'mouseup', fn: onMouseUp });
    
    const onVolumeChange = () => {
      const val = parseFloat(volumeSlider.value);
      this.volume = val;

      if (this._isIframeMode()) {
        this._sendToIframe('setVolume', val);
      } else {
        video.volume = val;
      }

      this._updateVolumeIcon(val);
    };
    volumeSlider.addEventListener('input', onVolumeChange);
    events.push({ el: volumeSlider, type: 'input', fn: onVolumeChange });
    
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0];
    let speedIndex = speeds.indexOf(1.0);
    const onSpeedClick = () => {
      speedIndex = (speedIndex + 1) % speeds.length;
      this.playbackRate = speeds[speedIndex];

      if (this._isIframeMode()) {
        this._sendToIframe('setPlaybackRate', this.playbackRate);
      } else {
        video.playbackRate = this.playbackRate;
      }

      speedBtn.textContent = `${this.playbackRate.toFixed(2)}×`.replace(/\.?0+×$/, '×');
    };
    speedBtn.addEventListener('click', onSpeedClick);
    events.push({ el: speedBtn, type: 'click', fn: onSpeedClick });
    
    const onDownload = async () => {
      const url = this.sources[0];
      const originalText = downloadBtn.innerHTML;
      
      const restoreBtn = () => {
        setTimeout(() => {
          downloadBtn.innerHTML = originalText;
          downloadBtn.disabled = false;
          downloadBtn.style.opacity = '1';
          downloadBtn.style.cursor = 'pointer';
        }, 3000);
      };
      
      downloadBtn.disabled = true;
      downloadBtn.style.opacity = '0.7';
      downloadBtn.style.cursor = 'default';
      downloadBtn.innerHTML = '<span class="vl-icon">⏳</span> 检测中...';
      
      try {
        const canDownload = await this._checkDownloadAvailability(url);
        
        if (!canDownload) {
          downloadBtn.innerHTML = '⚠️ 无法下载';
          downloadBtn.style.opacity = '1';
          restoreBtn();
          return;
        }
        
        await this._downloadWithServiceWorker(url, downloadBtn, originalText);
        
      } catch (error) {
        console.error('下载失败:', error);
        
        try {
          downloadBtn.innerHTML = '<span class="vl-icon">⏳</span> 尝试直接下载...';
          
          const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
          });
          
          if (!response.ok) throw new Error('直接下载失败');
          
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          const fileName = url.split('/').pop()?.split('?')[0] || 'video.mp4';
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          
          downloadBtn.innerHTML = '✅ 下载完成';
          restoreBtn();
          
        } catch (e) {
          console.error('所有下载方式均失败:', e);
          downloadBtn.innerHTML = '⚠️ 请右键另存为';
          downloadBtn.style.opacity = '1';
          
          try {
            window.open(url, '_blank');
            setTimeout(() => {
              downloadBtn.innerHTML = '📂 已在新窗口打开';
              restoreBtn();
            }, 1000);
          } catch (err) {
            restoreBtn();
          }
        }
      }
    };
    downloadBtn.addEventListener('click', onDownload);
    events.push({ el: downloadBtn, type: 'click', fn: onDownload });
    
    const onKeydown = (e) => {
      if (e.key === 'Escape') this.hide();
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        onPlayClick();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const target = Math.min((this._duration || 0), (parseFloat(this.timeDisplay.textContent.split('/')[0].trim()) || 0) + 5);
        if (this._isIframeMode()) {
          this._sendToIframe('seek', target);
        } else {
          video.currentTime = target;
        }
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const target = Math.max(0, (parseFloat(this.timeDisplay.textContent.split('/')[0].trim()) || 0) - 5);
        if (this._isIframeMode()) {
          this._sendToIframe('seek', target);
        } else {
          video.currentTime = target;
        }
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const val = Math.min(1, this.volume + 0.1);
        this.volume = val;
        volumeSlider.value = val;
        if (this._isIframeMode()) {
          this._sendToIframe('setVolume', val);
        } else {
          video.volume = val;
        }
        this._updateVolumeIcon(val);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const val = Math.max(0, this.volume - 0.1);
        this.volume = val;
        volumeSlider.value = val;
        if (this._isIframeMode()) {
          this._sendToIframe('setVolume', val);
        } else {
          video.volume = val;
        }
        this._updateVolumeIcon(val);
      }
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => { });
        } else {
          document.documentElement.requestFullscreen().catch(() => { });
        }
      }
    };
    document.addEventListener('keydown', onKeydown);
    events.push({ el: document, type: 'keydown', fn: onKeydown });
    
    const onVideoClick = () => {
      onPlayClick();
    };
    video.addEventListener('click', onVideoClick);
    events.push({ el: video, type: 'click', fn: onVideoClick });

    this._boundEvents = events;
  }

  _formatTime(seconds) {
    if (!seconds || !isFinite(seconds) || seconds < 0) return '0:00';
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  show() {
    if (this.isShowing || this.isDestroyed) return;
    this.isShowing = true;
    document.body.appendChild(this.overlay);
    requestAnimationFrame(() => {
      this.overlay.classList.add('active');
      setTimeout(() => {
        this.controls.classList.add('show');
      }, 300);
    });
  }

  hide() {
    if (!this.isShowing || this.isDestroyed) return;
    this.isShowing = false;
    this.overlay.classList.remove('active');
    this.controls.classList.remove('show');
    this.video?.pause();
    if (this._isIframeMode()) {
      this._sendToIframe('pause');
    }
    setTimeout(() => {
      if (this.overlay.parentNode && !this.isShowing) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
    }, 300);
  }

  toggle() {
    this.isShowing ? this.hide() : this.show();
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.hide();
    
    if (this._swRegistration) {
      this._swRegistration.unregister().catch(() => {});
      this._swRegistration = null;
    }
    
    this._boundEvents.forEach(({ el, type, fn }) => {
      el.removeEventListener(type, fn);
    });
    this._boundEvents = [];
    if (this._controlsCleanup) {
      this._controlsCleanup();
    }
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.iframe) {
      this.iframe.src = 'about:blank';
      this.iframe = null;
    }
    if (this.video) {
      this.video.pause();
      this.video.src = '';
      this.video.load();
      this.video = null;
    }
    this.overlay = null;
  }

  get videoElement() {
    return this.video;
  }
}