(function () {
    'use strict';
    const FileRateLimiter = (function () {
        const lastRequestTime = new Map();
        const RATE_LIMITS = {
            upload: { interval: 30000, maxRequests: 2 },
            download: { interval: 15000, maxRequests: 1 }
        };
        let isUploading = false;
        let isDownloading = false;
        return {
            canRequest(type, key) {
                const now = Date.now();
                const limit = RATE_LIMITS[type];
                if (!limit) return { allowed: true };
                const fullKey = `${type}_${key}`;
                const lastTime = lastRequestTime.get(fullKey);
                if (lastTime) {
                    const elapsed = now - lastTime;
                    if (elapsed < limit.interval) {
                        const waitSeconds = Math.ceil((limit.interval - elapsed) / 1000);
                        return {
                            allowed: false,
                            message: `操作过于频繁，请等待 ${waitSeconds} 秒后重试`
                        };
                    }
                }

                return { allowed: true };
            },
            recordRequest(type, key) {
                const fullKey = `${type}_${key}`;
                lastRequestTime.set(fullKey, Date.now());
            },
            acquireLock(type) {
                if (type === 'upload') {
                    if (isUploading) return false;
                    isUploading = true;
                    return true;
                } else if (type === 'download') {
                    if (isDownloading) return false;
                    isDownloading = true;
                    return true;
                }
                return false;
            },

            releaseLock(type) {
                if (type === 'upload') {
                    isUploading = false;
                } else if (type === 'download') {
                    isDownloading = false;
                }
            },

            isLocked(type) {
                if (type === 'upload') return isUploading;
                if (type === 'download') return isDownloading;
                return false;
            },

            cleanup(maxAge = 60000) {
                const now = Date.now();
                for (const [key, time] of lastRequestTime.entries()) {
                    if (now - time > maxAge) {
                        lastRequestTime.delete(key);
                    }
                }
            }
        };
    })();
    setInterval(() => {
        FileRateLimiter.cleanup();
    }, 60000);
    function generateUniqueId() {
        return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatTime(time) {
        if (!time) return '未知时间';
        const date = new Date(time);
        return date.toLocaleString('zh-CN', { hour12: false });
    }

    const FileUploadModule = (function () {
        let uploadFileId = null;
        let uploadFileName = null;
        let uploadFileSize = 0;
        let isUploadComplete = false;
        let modalInstance = null;
        let cachedDownloadUrls = new Map();
        let domCache = {};
        function buildModal() {
            const modalHTML = `
                <div id="mokfu-modal-overlay" class="mokfu-modal-overlay">
                    <div class="mokfu-modal-box">
                        <div class="mokfu-modal-header">
                            <h3><i class="fas fa-cloud-upload-alt"></i> 文件上传</h3>
                            <button class="mokfu-modal-close" id="mokfu-close-btn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="mokfu-tabs">
                            <button class="mokfu-tab-btn active" data-tab="upload">
                                <i class="fas fa-upload"></i> 上传文件
                            </button>
                            <button class="mokfu-tab-btn" data-tab="build">
                                <i class="fas fa-link"></i> 构建文件
                            </button>
                        </div>

                
                        <div class="mokfu-tab-content active" id="mokfu-tab-upload">
                  
                            <div class="mokfu-upload-zone" id="mokfu-upload-zone">
                                <span class="mokfu-upload-icon"><i class="fas fa-cloud-upload-alt"></i></span>
                                <p class="mokfu-upload-text">点击或拖拽文件到此处上传</p>
                                <p class="mokfu-upload-hint">支持所有文件类型</p>
                                <input type="file" id="mokfu-file-input" style="display:none;" />
                                <div class="mokfu-file-preview" id="mokfu-file-preview">
                                    <div>
                                        <span class="mokfu-file-name" id="mokfu-file-name">文件名</span>
                                        <span class="mokfu-file-size" id="mokfu-file-size">0 B</span>
                                    </div>
                                </div>
                            </div>

                   
                            <div class="mokfu-progress-wrapper" id="mokfu-progress-wrapper">
                                <div class="mokfu-progress-bar">
                                    <div class="mokfu-progress-fill" id="mokfu-progress-fill"></div>
                                </div>
                                <div class="mokfu-progress-text">
                                    <span id="mokfu-progress-label">上传中...</span>
                                    <span class="mokfu-progress-percent" id="mokfu-progress-percent">0%</span>
                                </div>
                            </div>

                    
                            <div class="mokfu-feedback" id="mokfu-feedback">
                                <span class="mokfu-feedback-label" id="mokfu-feedback-label"></span>
                                <span class="mokfu-feedback-detail" id="mokfu-feedback-detail"></span>
                            </div>

                         
                            <div class="mokfu-form-group" style="margin-top:16px;">
                                <label for="mokfu-file-name-input">文件名 (可选)</label>
                                <input type="text" class="mokfu-form-control" id="mokfu-file-name-input"
                                       placeholder="留空使用原始文件名" maxlength="255" />
                            </div>

                        
                            <div class="mokfu-btn-group">
                                <button class="mokfu-btn mokfu-btn-secondary" id="mokfu-upload-reset-btn">
                                    <i class="fas fa-undo"></i> 重置
                                </button>
                                <button class="mokfu-btn mokfu-btn-success" id="mokfu-send-btn" disabled>
                                    <i class="fas fa-paper-plane"></i> 发送
                                </button>
                            </div>
                        </div>

                  
                        <div class="mokfu-tab-content" id="mokfu-tab-build">
                            <div class="mokfu-form-group">
                                <label for="mokfu-file-id-input">文件 ID</label>
                                <input type="text" class="mokfu-form-control" id="mokfu-file-id-input"
                                       placeholder="请输入已上传的文件ID" />
                                <div style="font-size:12px;color:#94a3b8;margin-top:4px;">
                                    输入文件ID后可直接发送，无需重新上传
                                </div>
                            </div>

                            <div class="mokfu-btn-group">
                                <button class="mokfu-btn mokfu-btn-secondary" id="mokfu-build-clear-btn">
                                    <i class="fas fa-times"></i> 清空
                                </button>
                                <button class="mokfu-btn mokfu-btn-primary" id="mokfu-build-send-btn" disabled>
                                    <i class="fas fa-paper-plane"></i> 发送
                                </button>
                            </div>

                            <div class="mokfu-feedback" id="mokfu-build-feedback" style="margin-top:12px;">
                                <span class="mokfu-feedback-label" id="mokfu-build-feedback-label"></span>
                                <span class="mokfu-feedback-detail" id="mokfu-build-feedback-detail"></span>
                            </div>
                        </div>
                    </div>
                </div>
            `;


            const container = document.createElement('div');
            container.innerHTML = modalHTML;
            document.body.appendChild(container.firstElementChild);
            cacheDomElements();
            bindEvents();
        }

        function cacheDomElements() {
            domCache = {
                overlay: document.getElementById('mokfu-modal-overlay'),
                closeBtn: document.getElementById('mokfu-close-btn'),
                tabs: document.querySelectorAll('.mokfu-tab-btn'),
                tabUpload: document.getElementById('mokfu-tab-upload'),
                tabBuild: document.getElementById('mokfu-tab-build'),
                uploadZone: document.getElementById('mokfu-upload-zone'),
                fileInput: document.getElementById('mokfu-file-input'),
                filePreview: document.getElementById('mokfu-file-preview'),
                fileName: document.getElementById('mokfu-file-name'),
                fileSize: document.getElementById('mokfu-file-size'),
                progressWrapper: document.getElementById('mokfu-progress-wrapper'),
                progressFill: document.getElementById('mokfu-progress-fill'),
                progressLabel: document.getElementById('mokfu-progress-label'),
                progressPercent: document.getElementById('mokfu-progress-percent'),
                feedback: document.getElementById('mokfu-feedback'),
                feedbackLabel: document.getElementById('mokfu-feedback-label'),
                feedbackDetail: document.getElementById('mokfu-feedback-detail'),
                fileNameInput: document.getElementById('mokfu-file-name-input'),
                resetBtn: document.getElementById('mokfu-upload-reset-btn'),
                sendBtn: document.getElementById('mokfu-send-btn'),
                fileIdInput: document.getElementById('mokfu-file-id-input'),
                buildSendBtn: document.getElementById('mokfu-build-send-btn'),
                buildClearBtn: document.getElementById('mokfu-build-clear-btn'),
                buildFeedback: document.getElementById('mokfu-build-feedback'),
                buildFeedbackLabel: document.getElementById('mokfu-build-feedback-label'),
                buildFeedbackDetail: document.getElementById('mokfu-build-feedback-detail'),
            };
        }

        function bindEvents() {
            domCache.closeBtn.addEventListener('click', closeModal);
            domCache.overlay.addEventListener('click', function (e) {
                if (e.target === this) closeModal();
            });
            domCache.tabs.forEach(tab => {
                tab.addEventListener('click', function () {
                    const target = this.dataset.tab;
                    domCache.tabs.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    document.querySelectorAll('.mokfu-tab-content').forEach(c => c.classList.remove('active'));
                    if (target === 'upload') {
                        domCache.tabUpload.classList.add('active');
                    } else {
                        domCache.tabBuild.classList.add('active');
                    }
                    domCache.buildFeedback.classList.remove('active', 'info', 'success', 'error');
                });
            });


            domCache.uploadZone.addEventListener('click', function (e) {
                if (e.target.closest('.mokfu-file-preview')) return;
                domCache.fileInput.click();
            });


            domCache.fileInput.addEventListener('change', function (e) {
                if (this.files && this.files[0]) {
                    handleFileSelect(this.files[0]);
                }
            });


            domCache.uploadZone.addEventListener('dragover', function (e) {
                e.preventDefault();
                this.classList.add('dragover');
            });

            domCache.uploadZone.addEventListener('dragleave', function (e) {
                e.preventDefault();
                this.classList.remove('dragover');
            });

            domCache.uploadZone.addEventListener('drop', function (e) {
                e.preventDefault();
                this.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                }
            });

            domCache.resetBtn.addEventListener('click', resetUploadState);
            domCache.sendBtn.addEventListener('click', handleSendFile);
            domCache.fileIdInput.addEventListener('input', function () {
                const val = this.value.trim();
                domCache.buildSendBtn.disabled = val.length === 0;
                domCache.buildFeedback.classList.remove('active', 'info', 'success', 'error');
            });
            domCache.buildClearBtn.addEventListener('click', function () {
                domCache.fileIdInput.value = '';
                domCache.buildSendBtn.disabled = true;
                domCache.buildFeedback.classList.remove('active', 'info', 'success', 'error');
            });
            domCache.buildSendBtn.addEventListener('click', handleBuildSend);
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && domCache.overlay.classList.contains('active')) {
                    closeModal();
                }
            });
            domCache.fileNameInput.addEventListener('input', function () {
                updateSendButtonState();
            });
        }
        function handleFileSelect(file) {
            resetUploadState();
            uploadFileName = file.name;
            uploadFileSize = file.size;
            domCache.fileName.textContent = file.name;
            domCache.fileSize.textContent = formatFileSize(file.size);
            domCache.filePreview.classList.add('show');
            domCache.fileNameInput.value = file.name;
            performUpload(file);
        }

        async function performUpload(file) {
            const limitKey = appState?.userId || 'anonymous';
            const check = FileRateLimiter.canRequest('upload', limitKey);
            if (!check.allowed) {
                showFeedback('error', '限流提示', check.message);
                return;
            }

            if (!FileRateLimiter.acquireLock('upload')) {
                showFeedback('error', '上传中', '请等待当前上传完成');
                return;
            }

            try {
                FileRateLimiter.recordRequest('upload', limitKey);
                domCache.progressWrapper.classList.add('active');
                domCache.progressFill.style.width = '0%';
                domCache.progressPercent.textContent = '0%';
                domCache.progressLabel.textContent = '准备上传...';
                showFeedback('info', '上传中', '正在准备分片上传...');
                const customName = domCache.fileNameInput.value.trim();
                const fileName = customName || file.name;
                const isGroup = appState?.selectedContact?.isGroup || false;
                const targetId = appState?.selectedContact?.contactId ||
                    appState?.selectedContact?.conversationId || '';
                const initFormData = new FormData();
                initFormData.append('action', 'initiate_multipart');
                initFormData.append('file_name', fileName);
                initFormData.append('file_size', file.size);
                initFormData.append('user_id', appState?.userId || 'unknown');
                initFormData.append('dfid', appState?.userId || 'unknown');
                initFormData.append('target_type', isGroup ? 'group' : 'user');
                initFormData.append('target_id', targetId);
                const initResponse = await fetch('/api/fileupload/', {
                    method: 'POST',
                    body: initFormData
                });
                const initResult = await initResponse.json();
                if (!initResult.success) {
                    throw new Error(initResult.error || '初始化分片上传失败');
                }
                const { file_id, object_key, upload_id, total_parts, part_size } = initResult.data;
                uploadFileId = file_id;
                uploadFileName = fileName;
                const parts = [];
                let uploadedSize = 0;
                for (let i = 0; i < total_parts; i++) {
                    const start = i * part_size;
                    const end = Math.min(start + part_size, file.size);
                    const chunk = file.slice(start, end);
                    const percent = Math.round((uploadedSize / file.size) * 100);
                    domCache.progressFill.style.width = percent + '%';
                    domCache.progressPercent.textContent = percent + '%';
                    domCache.progressLabel.textContent = `上传分片 ${i + 1}/${total_parts} (${percent}%)`;
                    const partFormData = new FormData();
                    partFormData.append('action', 'presigned_part_url');
                    partFormData.append('object_key', object_key);
                    partFormData.append('upload_id', upload_id);
                    partFormData.append('part_number', i + 1);
                    const partResponse = await fetch('/api/fileupload/', {
                        method: 'POST',
                        body: partFormData
                    });
                    const partResult = await partResponse.json();
                    if (!partResult.success) {
                        throw new Error(partResult.error || `获取分片 ${i + 1} 预签名URL失败`);
                    }
                    const uploadPartResponse = await fetch(partResult.data.presigned_url, {
                        method: 'PUT',
                        body: chunk,
                        headers: {
                            'Content-Type': 'application/octet-stream'
                        }
                    });
                    if (!uploadPartResponse.ok) {
                        throw new Error(`分片 ${i + 1} 上传失败: ${uploadPartResponse.status}`);
                    }
                    const etag = uploadPartResponse.headers.get('ETag');
                    parts.push({
                        ETag: etag ? etag.replace(/"/g, '') : '',
                        PartNumber: i + 1
                    });

                    uploadedSize += chunk.size;
                }
                domCache.progressLabel.textContent = '正在合并文件...';
                domCache.progressPercent.textContent = '99%';
                const completeFormData = new FormData();
                completeFormData.append('action', 'complete_multipart');
                completeFormData.append('file_id', file_id);
                completeFormData.append('object_key', object_key);
                completeFormData.append('upload_id', upload_id);
                completeFormData.append('file_name', fileName);
                completeFormData.append('file_size', file.size);
                completeFormData.append('user_id', appState?.userId || 'unknown');
                completeFormData.append('dfid', appState?.userId || 'unknown');
                completeFormData.append('target_type', isGroup ? 'group' : 'user');
                completeFormData.append('target_id', targetId);
                completeFormData.append('parts', JSON.stringify(parts));
                const completeResponse = await fetch('/api/fileupload/', {
                    method: 'POST',
                    body: completeFormData
                });
                const completeResult = await completeResponse.json();
                if (!completeResult.success) {
                    throw new Error(completeResult.error || '完成分片上传失败');
                }
                isUploadComplete = true;
                domCache.progressFill.style.width = '100%';
                domCache.progressPercent.textContent = '100%';
                domCache.progressLabel.textContent = '上传完成！';
                showFeedback('success', '上传成功！',
                    `文件ID: <span class="mokfu-file-id-display">${uploadFileId}</span><br>
             大小: ${formatFileSize(file.size)}`);
                updateSendButtonState();
                domCache.fileIdInput.value = uploadFileId;
                domCache.buildSendBtn.disabled = false;
                const event = new CustomEvent('mokfu-upload-complete', {
                    detail: { fileId: uploadFileId, fileName: fileName }
                });
                window.dispatchEvent(event);
            } catch (error) {
                domCache.progressWrapper.classList.remove('active');
                showFeedback('error', '❌ 上传失败', error.message || '网络错误，请重试');
                isUploadComplete = false;
                console.error('上传文件失败:', error);
            } finally {
                FileRateLimiter.releaseLock('upload');
                if (!isUploadComplete) {
                    domCache.progressLabel.textContent = '上传失败';
                }
            }
        }

        function updateSendButtonState() {
            const isReady = isUploadComplete && uploadFileId;
            const hasName = domCache.fileNameInput.value.trim().length > 0;
            domCache.sendBtn.disabled = !isReady;
        }
        function showFeedback(type, label, detail) {
            const el = domCache.feedback;
            el.className = 'mokfu-feedback active ' + type;
            domCache.feedbackLabel.textContent = label;
            domCache.feedbackDetail.innerHTML = detail || '';
        }

        function resetUploadState() {
            uploadFileId = null;
            uploadFileName = null;
            uploadFileSize = 0;
            isUploadComplete = false;
            domCache.fileInput.value = '';
            domCache.filePreview.classList.remove('show');
            domCache.fileName.textContent = '';
            domCache.fileSize.textContent = '';
            domCache.fileNameInput.value = '';
            domCache.progressWrapper.classList.remove('active');
            domCache.progressFill.style.width = '0%';
            domCache.progressPercent.textContent = '0%';
            domCache.progressLabel.textContent = '';
            domCache.feedback.classList.remove('active', 'info', 'success', 'error');
            domCache.sendBtn.disabled = true;
            domCache.uploadZone.classList.remove('dragover');
        }
        async function handleSendFile() {
            if (!isUploadComplete || !uploadFileId) {
                alertMsg('请先上传文件');
                return;
            }

            if (!appState?.selectedContact) {
                alertMsg('请先选择一个会话');
                return;
            }

            const fileName = domCache.fileNameInput.value.trim() || uploadFileName || '文件';
            const isGroup = appState.selectedContact.isGroup || false;
            const messageContent = {
                messageType: 'files',
                content: {
                    fileId: uploadFileId,
                    fileName: fileName,
                    fileSize: uploadFileSize,
                    text: `${fileName}`,
                    sendTime: Date.now(),
                    expire: Date.now() + 3 * 86400000
                }
            };

            try {
                if (isGroup) {
                    if (typeof sendGroupMessage === 'function') {
                        await sendGroupMessage(messageContent);
                    } else {
                        throw new Error('群消息发送函数未定义');
                    }
                } else {
                    if (typeof sendMessage === 'function') {
                        await sendMessage(messageContent);
                    } else {
                        throw new Error('消息发送函数未定义');
                    }
                }
                alertMsg('文件已发送');
                closeModal();
                setTimeout(resetUploadState, 300);
            } catch (error) {
                alertMsg(`发送失败：${error.message}`);
                console.error('发送文件消息失败:', error);
            }
        }

        async function handleBuildSend() {
            const fileId = domCache.fileIdInput.value.trim();
            if (!fileId) {
                domCache.buildSendBtn.disabled = true;
                return;
            }
            if (!appState?.selectedContact) {
                alertMsg('请先选择一个会话');
                return;
            }
            domCache.buildSendBtn.disabled = true;
            domCache.buildSendBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 验证中...';
            domCache.buildFeedback.className = 'mokfu-feedback active info';
            domCache.buildFeedbackLabel.textContent = '验证文件...';
            domCache.buildFeedbackDetail.textContent = '正在检查文件是否存在';
            try {
                const downloadUrl = await window.mokfu_getDownloadUrl(fileId);
                if (!downloadUrl) {
                    throw new Error('文件不存在或已过期');
                }
                const fileName = await getFileNameFromCache(fileId) || '文件';
                const isGroup = appState.selectedContact.isGroup || false;
                const messageContent = {
                    messageType: 'files',
                    content: {
                        fileId: fileId,
                        fileName: fileName,
                        text: `${fileName}`,
                        sendTime: Date.now(),
                        expire: Date.now() + 3 * 86400000
                    }
                };

                if (isGroup) {
                    if (typeof sendGroupMessage === 'function') {
                        await sendGroupMessage(messageContent);
                    } else {
                        throw new Error('群消息发送函数未定义');
                    }
                } else {
                    if (typeof sendMessage === 'function') {
                        await sendMessage(messageContent);
                    } else {
                        throw new Error('消息发送函数未定义');
                    }
                }

                domCache.buildFeedback.className = 'mokfu-feedback active success';
                domCache.buildFeedbackLabel.textContent = '发送成功！';
                domCache.buildFeedbackDetail.textContent = `文件已发送: ${fileName}`;
                domCache.fileIdInput.value = '';
                domCache.buildSendBtn.disabled = true;
                setTimeout(() => {
                    domCache.buildFeedback.classList.remove('active', 'info', 'success', 'error');
                }, 3000);

            } catch (error) {
                domCache.buildFeedback.className = 'mokfu-feedback active error';
                domCache.buildFeedbackLabel.textContent = '发送失败';
                domCache.buildFeedbackDetail.textContent = error.message || '文件验证失败，请检查文件ID是否正确';
                console.error('构建文件发送失败:', error);
            } finally {
                domCache.buildSendBtn.disabled = false;
                domCache.buildSendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送';
            }
        }

        async function getFileNameFromCache(fileId) {
            const cached = cachedDownloadUrls.get(fileId);
            if (cached && cached.fileName) {
                return cached.fileName;
            }
            return null;
        }
        async function getDownloadUrl(fileId, forceRefresh = false) {
            if (!fileId) {
                console.error('文件ID不能为空');
                return null;
            }
            if (!forceRefresh && cachedDownloadUrls.has(fileId)) {
                const cached = cachedDownloadUrls.get(fileId);
                if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
                    return cached.url;
                }
            }
            const limitKey = fileId;
            const check = FileRateLimiter.canRequest('download', limitKey);
            if (!check.allowed) {
                console.warn('下载限流:', check.message);
                if (cachedDownloadUrls.has(fileId)) {
                    return cachedDownloadUrls.get(fileId).url;
                }
                return null;
            }
            if (!FileRateLimiter.acquireLock('download')) {
                if (cachedDownloadUrls.has(fileId)) {
                    return cachedDownloadUrls.get(fileId).url;
                }
                return null;
            }

            try {
                FileRateLimiter.recordRequest('download', limitKey);
                const formData = new FormData();
                formData.append('action', 'get_download_url');
                formData.append('file_id', fileId);
                if (appState?.userId) {
                    formData.append('user_id', appState.userId);
                    formData.append('dfid', appState.userId);
                }
                const response = await fetch('/api/fileupload/', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (result.success && result.data && result.data.download_url) {
                    cachedDownloadUrls.set(fileId, {
                        url: result.data.download_url,
                        fileName: result.data.file_name || '文件',
                        fileSize: result.data.file_size || 0,
                        timestamp: Date.now()
                    });
                    return result.data.download_url;
                }
                return null;
            } catch (error) {
                console.error('获取下载链接失败:', error);
                alertMsg(`获取下载链接失败：${error.message}`);
                if (cachedDownloadUrls.has(fileId)) {
                    return cachedDownloadUrls.get(fileId).url;
                }
                return null;
            } finally {
                FileRateLimiter.releaseLock('download');
            }
        }
        function openModal() {
            if (!domCache.overlay) {
                buildModal();
            }
            resetUploadState();
            domCache.fileIdInput.value = '';
            domCache.buildSendBtn.disabled = true;
            domCache.buildFeedback.classList.remove('active', 'info', 'success', 'error');
            domCache.tabs.forEach(t => t.classList.remove('active'));
            document.querySelector('.mokfu-tab-btn[data-tab="upload"]').classList.add('active');
            domCache.tabUpload.classList.add('active');
            domCache.tabBuild.classList.remove('active');
            domCache.overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            if (domCache.overlay) {
                domCache.overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
        function init() {
            buildModal();
            const triggerBtn = document.getElementById('chat-file-fjslsend3');
            if (triggerBtn) {
                triggerBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (!appState?.selectedContact) {
                        alertMsg('请先选择一个会话');
                        return;
                    }
                    openModal();
                });
            } else {
                console.warn('[FileUpload] 触发按钮 #chat-file-fjslsend3 未找到');
            }
            window.mokfu_getDownloadUrl = getDownloadUrl;
            window.mokfu_openFileUploadModal = openModal;
            window.mokfu_closeFileUploadModal = closeModal;
            console.log('[FileUpload] 模块初始化完成');
        }
        return {
            init: init,
            open: openModal,
            close: closeModal,
            getDownloadUrl: getDownloadUrl,
            reset: resetUploadState
        };

    })();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            FileUploadModule.init();
        });
    } else {
        FileUploadModule.init();
    }
})();