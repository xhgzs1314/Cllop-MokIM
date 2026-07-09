class LanZouYunUploader {
    constructor() {
        this.modal = null;
        this.currentCookie = '';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSavedCookie();
    }

    bindEvents() {
        const sendBtn = document.getElementById('chat-file-fjslsend2');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.showModal());
        }
    }

    loadSavedCookie() {
        const saved = localStorage.getItem('lanzou_cookie');
        if (saved) {
            this.currentCookie = saved;
        }
    }

    showModal() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            return;
        }
        this.createModal();
    }

    createModal() {
        const modalHTML = `
            <div class="lanzou-upload-modal" id="lanzouUploadModal" style="display: flex;">
                <div class="lanzou-upload-container">
                    <div class="lanzou-upload-header">
                        <h3><i class="fas fa-cloud-upload-alt"></i> 文件上传(通道二)GFL-2</h3>
                        <button class="lanzou-close-btn" id="closeLanzouModal"><i class="fas fa-times"></i></button>
                    </div>
                    
                    <div class="lanzou-tabs">
                        <div class="lanzou-tab-item active" data-tab="cookie-tab">
                            <i class="fas fa-key"></i> 授权凭证管理
                        </div>
                        <div class="lanzou-tab-item" data-tab="upload-tab">
                            <i class="fas fa-upload"></i> 上传文件
                        </div>
                    </div>
                    <div class="lanzou-tab-content active" id="cookie-tab">
                        <div class="lanzou-cookie-section">
                            <div class="warning-box">
                                <i class="fas fa-shield-alt"></i>
                                <div class="warning-text">
                                    <strong>安全提示</strong>
                                    <p>您的 授权凭证 仅存储在本地浏览器中，平台不会上传或存储。请妥善保管，定期更新。</p>
                                    <p>⚠️ 本功能使用第三方存储服务，请自行确保使用行为符合相关服务条款。</p>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-user"></i> 账号</label>
                                <input type="text" id="lanzouUsername" class="lanzou-input" placeholder="请输入第三方账号">
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-lock"></i> 密码</label>
                                <input type="password" id="lanzouPassword" class="lanzou-input" placeholder="请输入第三方密码">
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-cookie-bite"></i> 授权凭证 (自动获取后显示)</label>
                                <textarea id="lanzouCookie" class="lanzou-textarea" rows="4" placeholder="点击下方按钮自动获取授权凭证，或手动粘贴..."></textarea>
                            </div>
                            
                            <div class="button-group">
                                <button id="getLanzouCookieBtn" class="btn-primary">
                                    <i class="fas fa-magic"></i> 自动获取授权凭证
                                </button>
                                <button id="saveLanzouCookieBtn" class="btn-secondary">
                                    <i class="fas fa-save"></i> 保存授权凭证
                                </button>
                                <button id="clearLanzouCookieBtn" class="btn-danger">
                                    <i class="fas fa-trash"></i> 清除
                                </button>
                            </div>
                            
                            <div id="cookieStatus" class="status-msg" style="display: none;"></div>
                        </div>
                    </div>
                    <div class="lanzou-tab-content" id="upload-tab">
                        <div class="lanzou-upload-section">
                            <div class="form-group">
                                <label><i class="fas fa-cookie"></i> 当前授权凭证</label>
                                <div class="cookie-preview">
                                    <span id="cookiePreview">未设置授权凭证</span>
                                    <button id="refreshCookiePreview" class="icon-btn" title="刷新">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-file"></i> 选择文件 (≤100MB)</label>
                                <div class="file-upload-area" id="fileUploadArea">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>点击或拖拽文件到此处上传</p>
                                    <span class="file-size-limit">支持格式：任意文件，最大100MB</span>
                                    <input type="file" id="fileInput" style="display: none;">
                                </div>
                                <div id="selectedFileInfo" class="file-info" style="display: none;">
                                    <i class="fas fa-file"></i>
                                    <span id="fileName"></span>
                                    <span id="fileSize"></span>
                                    <button id="clearFileBtn" class="icon-btn"><i class="fas fa-times"></i></button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label><i class="fas fa-link"></i> 上传后的直链</label>
                                <div class="link-input-group">
                                    <input type="text" id="uploadedUrl" class="lanzou-input" readonly placeholder="上传后自动生成直链">
                                    <button id="copyUrlBtn" class="icon-btn" disabled>
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="button-group">
                                <button id="uploadFileBtn" class="btn-primary" disabled>
                                    <i class="fas fa-upload"></i> 上传文件
                                </button>
                            </div>
                            
                            <div id="uploadStatus" class="status-msg" style="display: none;"></div>
                            <div class="progress-container" id="uploadProgress" style="display: none;">
                                <div class="progress-bar"></div>
                                <span class="progress-text">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        this.modal = modalContainer.firstElementChild;
        document.body.appendChild(this.modal);
        this.bindModalEvents();
        const cookieTextarea = document.getElementById('lanzouCookie');
        if (cookieTextarea && this.currentCookie) {
            cookieTextarea.value = this.currentCookie;
            this.updateCookiePreview();
        }
    }

    bindModalEvents() {
        const closeBtn = document.getElementById('closeLanzouModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }
        const tabItems = this.modal.querySelectorAll('.lanzou-tab-item');
        tabItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const tabId = item.dataset.tab;
                this.switchTab(tabId);
            });
        });
        const getCookieBtn = document.getElementById('getLanzouCookieBtn');
        if (getCookieBtn) {
            getCookieBtn.addEventListener('click', () => this.getLanzouCookie());
        }
        const saveCookieBtn = document.getElementById('saveLanzouCookieBtn');
        if (saveCookieBtn) {
            saveCookieBtn.addEventListener('click', () => this.saveCookie());
        }
        const clearCookieBtn = document.getElementById('clearLanzouCookieBtn');
        if (clearCookieBtn) {
            clearCookieBtn.addEventListener('click', () => this.clearCookie());
        }
        const refreshPreview = document.getElementById('refreshCookiePreview');
        if (refreshPreview) {
            refreshPreview.addEventListener('click', () => this.updateCookiePreview());
        }
        const uploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('fileInput');
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFile(files[0]);
                }
            });
        }
        const clearFileBtn = document.getElementById('clearFileBtn');
        if (clearFileBtn) {
            clearFileBtn.addEventListener('click', () => this.clearSelectedFile());
        }
        const uploadBtn = document.getElementById('uploadFileBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.uploadFile());
        }
        const copyBtn = document.getElementById('copyUrlBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyUrl());
        }
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
    }

    switchTab(tabId) {
        const tabItems = this.modal.querySelectorAll('.lanzou-tab-item');
        tabItems.forEach(item => {
            if (item.dataset.tab === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        const contents = this.modal.querySelectorAll('.lanzou-tab-content');
        contents.forEach(content => {
            if (content.id === tabId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }


    async getLanzouCookie() {
        const username = document.getElementById('lanzouUsername').value.trim();
        const password = document.getElementById('lanzouPassword').value;
        if (!username || !password) {
            this.showStatus('cookieStatus', '请填写账号和密码', 'error');
            return;
        }
        this.showStatus('cookieStatus', '正在获取授权凭证...', 'loading');
        this.showDebugPanel();
        try {
            const response = await fetch('/api/lanzou/get_cookie.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (result.success && result.cookie) {
                const cookieTextarea = document.getElementById('lanzouCookie');
                cookieTextarea.value = result.cookie;
                this.showStatus('cookieStatus', '授权凭证获取成功！请点击保存按钮存储', 'success');
                this.updateDebugPanel(result);
            } else {
                this.showStatus('cookieStatus', result.message || '获取授权凭证失败', 'error');
                this.updateDebugPanel(result);
            }
        } catch (error) {
            this.showStatus('cookieStatus', '获取授权凭证失败：' + error.message, 'error');
        }
    }

    showDebugPanel() {
        let debugPanel = document.getElementById('lanzouDebugPanel');
        if (!debugPanel) {
            const cookieTab = document.getElementById('cookie-tab');
            const panel = document.createElement('div');
            panel.id = 'lanzouDebugPanel';
            panel.className = 'debug-panel';
            panel.innerHTML = `
            <div class="debug-header">
                <span><i class="fas fa-bug"></i> 调试信息</span>
                <button class="debug-toggle">▼</button>
            </div>
            <div class="debug-content" style="display: block;">
                <pre id="debugOutput"></pre>
            </div>
        `;
            cookieTab.appendChild(panel);

            const toggleBtn = panel.querySelector('.debug-toggle');
            const debugContent = panel.querySelector('.debug-content');
            toggleBtn.addEventListener('click', () => {
                const isVisible = debugContent.style.display !== 'none';
                debugContent.style.display = isVisible ? 'none' : 'block';
                toggleBtn.textContent = isVisible ? '▶' : '▼';
            });
        }
    }

    updateDebugPanel(result) {
        const debugOutput = document.getElementById('debugOutput');
        if (debugOutput && result.steps) {
            debugOutput.textContent = JSON.stringify(result.steps, null, 2);
        }
    }

    saveCookie() {
        const cookieTextarea = document.getElementById('lanzouCookie');
        const cookie = cookieTextarea.value.trim();

        if (!cookie) {
            this.showStatus('cookieStatus', '请先填写或获取授权凭证', 'error');
            return;
        }
        if (!cookie.includes('ylogin=') || !cookie.includes('phpdisk_info=')) {
            this.showStatus('cookieStatus', '授权凭证格式无效，缺少必要字段', 'error');
            return;
        }

        this.currentCookie = cookie;
        localStorage.setItem('lanzou_cookie', cookie);

        this.updateCookiePreview();
        this.showStatus('cookieStatus', '授权凭证已保存到本地', 'success');
        const uploadBtn = document.getElementById('uploadFileBtn');
        if (uploadBtn) {
            uploadBtn.disabled = false;
        }
        setTimeout(() => {
            const statusDiv = document.getElementById('cookieStatus');
            if (statusDiv) statusDiv.style.display = 'none';
        }, 3000);
    }

    clearCookie() {
        localStorage.removeItem('lanzou_cookie');
        this.currentCookie = '';
        const cookieTextarea = document.getElementById('lanzouCookie');
        if (cookieTextarea) {
            cookieTextarea.value = '';
        }

        this.updateCookiePreview();
        this.showStatus('cookieStatus', '授权凭证已清除', 'success');
        const uploadBtn = document.getElementById('uploadFileBtn');
        if (uploadBtn) {
            uploadBtn.disabled = true;
        }
    }

    updateCookiePreview() {
        const previewSpan = document.getElementById('cookiePreview');
        if (previewSpan) {
            if (this.currentCookie) {
                const shortCookie = this.currentCookie.substring(0, 50) + '...';
                previewSpan.innerHTML = `<span style="color: #67c23a;">✓ 已设置</span> (${shortCookie})`;
            } else {
                previewSpan.innerHTML = '<span style="color: #f56c6c;">未设置授权凭证</span>';
            }
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    handleFile(file) {
        if (file.size > 104857600) {
            this.showStatus('uploadStatus', '文件大小超过100MB限制', 'error');
            return;
        }
        this.selectedFile = file;
        const fileInfo = document.getElementById('selectedFileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        if (fileInfo && fileName && fileSize) {
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            fileInfo.style.display = 'flex';
        }
        const uploadArea = document.getElementById('fileUploadArea');
        if (uploadArea) {
            uploadArea.style.display = 'none';
        }
        const urlInput = document.getElementById('uploadedUrl');
        if (urlInput) {
            urlInput.value = '';
        }

        const sendBtn = document.getElementById('sendFileLinkBtn');
        if (sendBtn) {
            sendBtn.disabled = true;
        }

        const copyBtn = document.getElementById('copyUrlBtn');
        if (copyBtn) {
            copyBtn.disabled = true;
        }

        this.showStatus('uploadStatus', '', 'hide');
    }

    clearSelectedFile() {
        this.selectedFile = null;

        const fileInfo = document.getElementById('selectedFileInfo');
        if (fileInfo) {
            fileInfo.style.display = 'none';
        }

        const uploadArea = document.getElementById('fileUploadArea');
        if (uploadArea) {
            uploadArea.style.display = 'flex';
        }

        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';
        }

        const urlInput = document.getElementById('uploadedUrl');
        if (urlInput) {
            urlInput.value = '';
        }

        const uploadBtn = document.getElementById('uploadFileBtn');
        if (uploadBtn) {
            uploadBtn.disabled = !this.currentCookie;
        }


    }

    async uploadFile() {
        if (!this.selectedFile) {
            this.showStatus('uploadStatus', '请先选择文件', 'error');
            return;
        }

        if (!this.currentCookie) {
            this.showStatus('uploadStatus', '请先配置授权凭证', 'error');
            return;
        }

        const uploadBtn = document.getElementById('uploadFileBtn');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 上传中...';

        this.showProgress(true);

        try {
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('cookie', this.currentCookie);

            const response = await fetch('/api/lanzou/upload.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            this.showProgress(false);

            if (result.success && result.direct_url) {
                const urlInput = document.getElementById('uploadedUrl');
                if (urlInput) {
                    urlInput.value = result.direct_url;
                }

                const sendBtn = document.getElementById('sendFileLinkBtn');
                if (sendBtn) {
                    sendBtn.disabled = false;
                }

                const copyBtn = document.getElementById('copyUrlBtn');
                if (copyBtn) {
                    copyBtn.disabled = false;
                }

                this.showStatus('uploadStatus', '上传成功！直链已生成', 'success');
            } else {
                this.showStatus('uploadStatus', result.message || '上传失败', 'error');
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> 上传文件';
            }
        } catch (error) {
            console.error('上传失败:', error);
            this.showProgress(false);
            this.showStatus('uploadStatus', '上传失败：' + error.message, 'error');
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> 上传文件';
        }
    }

    async copyUrl() {
        const urlInput = document.getElementById('uploadedUrl');
        const url = urlInput.value;

        if (!url) return;

        try {
            await navigator.clipboard.writeText(url);
            this.showStatus('uploadStatus', '链接已复制到剪贴板', 'success');
            setTimeout(() => {
                const statusDiv = document.getElementById('uploadStatus');
                if (statusDiv && statusDiv.style.display !== 'none') {
                    statusDiv.style.display = 'none';
                }
            }, 2000);
        } catch (error) {
            console.error('复制失败:', error);
            this.showStatus('uploadStatus', '复制失败，请手动复制', 'error');
        }
    }

    showProgress(show) {
        const progressContainer = document.getElementById('uploadProgress');
        if (progressContainer) {
            progressContainer.style.display = show ? 'block' : 'none';
        }
    }

    showStatus(elementId, message, type) {
        const statusDiv = document.getElementById(elementId);
        if (!statusDiv) return;

        statusDiv.textContent = message;
        statusDiv.className = `status-msg status-${type}`;
        statusDiv.style.display = 'block';

        if (type !== 'loading') {
            setTimeout(() => {
                if (statusDiv.style.display !== 'none') {
                    statusDiv.style.display = 'none';
                }
            }, 5000);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    hideModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    window.lanzouUploader = new LanZouYunUploader();
});