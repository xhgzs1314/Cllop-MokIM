(function () {
    'use strict';
    const GroupFileRateLimiter = (function () {
        const lastRequestTime = new Map();
        const RATE_LIMITS = {
            upload: { interval: 30000, maxRequests: 2 },
            download: { interval: 15000, maxRequests: 1 },
            delete: { interval: 10000, maxRequests: 3 },
            list: { interval: 5000, maxRequests: 5 }
        };
        let isUploading = false;
        let isDownloading = false;
        let isDeleting = false;

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
                } else if (type === 'delete') {
                    if (isDeleting) return false;
                    isDeleting = true;
                    return true;
                }
                return false;
            },

            releaseLock(type) {
                if (type === 'upload') isUploading = false;
                else if (type === 'download') isDownloading = false;
                else if (type === 'delete') isDeleting = false;
            },

            isLocked(type) {
                if (type === 'upload') return isUploading;
                if (type === 'download') return isDownloading;
                if (type === 'delete') return isDeleting;
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
        GroupFileRateLimiter.cleanup();
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
    const GroupFileModule = (function () {
        let uploadFileId = null;
        let uploadFileName = null;
        let uploadFileSize = 0;
        let isUploadComplete = false;
        let currentPage = 1;
        const pageSize = 20;
        let totalFiles = 0;
        let fileListData = [];
        let isLoadingList = false;
        let cachedDownloadUrls = new Map();
        let domCache = {};
        function buildModal() {
            const modalHTML = `
                <div id="gfile-modal-overlay" class="gfile-modal-overlay">
                    <div class="gfile-modal-box">
                 
                        <div class="gfile-modal-header">
                            <h3><i class="fas fa-folder-open"></i> 群文件管理</h3>
                            <button class="gfile-modal-close" id="gfile-close-btn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                 
                        <div class="gfile-tabs">
                            <button class="gfile-tab-btn active" data-tab="upload">
                                <i class="fas fa-upload"></i> 上传文件
                            </button>
                            <button class="gfile-tab-btn" data-tab="list">
                                <i class="fas fa-list"></i> 文件列表
                            </button>
                        </div>

                      
                        <div class="gfile-tab-content active" id="gfile-tab-upload">
                        
                            <div class="gfile-upload-zone" id="gfile-upload-zone">
                                <span class="gfile-upload-icon"><i class="fas fa-cloud-upload-alt"></i></span>
                                <p class="gfile-upload-text">点击或拖拽文件到此处上传</p>
                                <p class="gfile-upload-hint">支持所有文件类型</p>
                                <input type="file" id="gfile-file-input" style="display:none;" />
                                <div class="gfile-file-preview" id="gfile-file-preview">
                                    <div>
                                        <span class="gfile-file-name" id="gfile-file-name">文件名</span>
                                        <span class="gfile-file-size" id="gfile-file-size">0 B</span>
                                    </div>
                                </div>
                            </div>

                          
                            <div class="gfile-progress-wrapper" id="gfile-progress-wrapper">
                                <div class="gfile-progress-bar">
                                    <div class="gfile-progress-fill" id="gfile-progress-fill"></div>
                                </div>
                                <div class="gfile-progress-text">
                                    <span id="gfile-progress-label">上传中...</span>
                                    <span class="gfile-progress-percent" id="gfile-progress-percent">0%</span>
                                </div>
                            </div>

                        
                            <div class="gfile-feedback" id="gfile-feedback">
                                <span class="gfile-feedback-label" id="gfile-feedback-label"></span>
                                <span class="gfile-feedback-detail" id="gfile-feedback-detail"></span>
                            </div>

                          
                            <div class="gfile-form-group" style="margin-top:16px;">
                                <label for="gfile-file-name-input">文件名 (可选)</label>
                                <input type="text" class="gfile-form-control" id="gfile-file-name-input"
                                       placeholder="留空使用原始文件名" maxlength="255" />
                            </div>

                         
                            <div class="gfile-btn-group">
                                <button class="gfile-btn gfile-btn-secondary" id="gfile-upload-reset-btn">
                                    <i class="fas fa-undo"></i> 重置
                                </button>
                                <button class="gfile-btn gfile-btn-success" id="gfile-send-btn" disabled>
                                    <i class="fas fa-paper-plane"></i> 发送
                                </button>
                            </div>
                        </div>
                        <div class="gfile-tab-content" id="gfile-tab-list">
                            <div class="gfile-list-toolbar">
                                <span class="gfile-list-total" id="gfile-list-total">共 0 个文件</span>
                                <button class="gfile-btn gfile-btn-sm gfile-btn-refresh" id="gfile-refresh-btn">
                                    <i class="fas fa-sync-alt"></i> 刷新
                                </button>
                            </div>
                            <div class="gfile-list-container" id="gfile-list-container">
                                <div class="gfile-list-loading" id="gfile-list-loading">
                                    <i class="fas fa-spinner fa-pulse"></i> 加载中...
                                </div>
                                <div class="gfile-list-empty" id="gfile-list-empty" style="display:none;">
                                    <i class="fas fa-inbox"></i>
                                    <p>暂无文件</p>
                                </div>
                                <div class="gfile-list-items" id="gfile-list-items"></div>
                            </div>
                            <div class="gfile-pagination" id="gfile-pagination">
                                <button class="gfile-page-btn" id="gfile-page-prev" disabled>
                                    <i class="fas fa-chevron-left"></i> 上一页
                                </button>
                                <span class="gfile-page-info" id="gfile-page-info">1 / 1</span>
                                <button class="gfile-page-btn" id="gfile-page-next" disabled>
                                    下一页 <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                            <div class="gfile-feedback" id="gfile-list-feedback">
                                <span class="gfile-feedback-label" id="gfile-list-feedback-label"></span>
                                <span class="gfile-feedback-detail" id="gfile-list-feedback-detail"></span>
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
                overlay: document.getElementById('gfile-modal-overlay'),
                closeBtn: document.getElementById('gfile-close-btn'),
                tabs: document.querySelectorAll('.gfile-tab-btn'),
                tabUpload: document.getElementById('gfile-tab-upload'),
                tabList: document.getElementById('gfile-tab-list'),
                uploadZone: document.getElementById('gfile-upload-zone'),
                fileInput: document.getElementById('gfile-file-input'),
                filePreview: document.getElementById('gfile-file-preview'),
                fileName: document.getElementById('gfile-file-name'),
                fileSize: document.getElementById('gfile-file-size'),
                progressWrapper: document.getElementById('gfile-progress-wrapper'),
                progressFill: document.getElementById('gfile-progress-fill'),
                progressLabel: document.getElementById('gfile-progress-label'),
                progressPercent: document.getElementById('gfile-progress-percent'),
                feedback: document.getElementById('gfile-feedback'),
                feedbackLabel: document.getElementById('gfile-feedback-label'),
                feedbackDetail: document.getElementById('gfile-feedback-detail'),
                fileNameInput: document.getElementById('gfile-file-name-input'),
                resetBtn: document.getElementById('gfile-upload-reset-btn'),
                sendBtn: document.getElementById('gfile-send-btn'),
                listTotal: document.getElementById('gfile-list-total'),
                refreshBtn: document.getElementById('gfile-refresh-btn'),
                listContainer: document.getElementById('gfile-list-container'),
                listLoading: document.getElementById('gfile-list-loading'),
                listEmpty: document.getElementById('gfile-list-empty'),
                listItems: document.getElementById('gfile-list-items'),
                pagePrev: document.getElementById('gfile-page-prev'),
                pageNext: document.getElementById('gfile-page-next'),
                pageInfo: document.getElementById('gfile-page-info'),
                listFeedback: document.getElementById('gfile-list-feedback'),
                listFeedbackLabel: document.getElementById('gfile-list-feedback-label'),
                listFeedbackDetail: document.getElementById('gfile-list-feedback-detail'),
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
                    document.querySelectorAll('.gfile-tab-content').forEach(c => c.classList.remove('active'));
                    if (target === 'upload') {
                        domCache.tabUpload.classList.add('active');
                    } else {
                        domCache.tabList.classList.add('active');
                        if (appState?.selectedContact?.isGroup) {
                            loadFileList(1);
                        } else {
                            showListFeedback('error', '请先选择一个群聊');
                        }
                    }
                    domCache.listFeedback.classList.remove('active', 'info', 'success', 'error');
                });
            });
            domCache.uploadZone.addEventListener('click', function (e) {
                if (e.target.closest('.gfile-file-preview')) return;
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
            domCache.fileNameInput.addEventListener('input', updateSendButtonState);
            domCache.refreshBtn.addEventListener('click', function () {
                loadFileList(currentPage);
            });
            domCache.pagePrev.addEventListener('click', function () {
                if (currentPage > 1) {
                    loadFileList(currentPage - 1);
                }
            });
            domCache.pageNext.addEventListener('click', function () {
                const totalPages = Math.ceil(totalFiles / pageSize);
                if (currentPage < totalPages) {
                    loadFileList(currentPage + 1);
                }
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && domCache.overlay?.classList.contains('active')) {
                    closeModal();
                }
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
            const check = GroupFileRateLimiter.canRequest('upload', limitKey);
            if (!check.allowed) {
                showFeedback('error', '提示', check.message);
                return;
            }
            if (!GroupFileRateLimiter.acquireLock('upload')) {
                showFeedback('error', '上传中', '请等待当前上传完成');
                return;
            }
            try {
                GroupFileRateLimiter.recordRequest('upload', limitKey);
                domCache.progressWrapper.classList.add('active');
                domCache.progressFill.style.width = '0%';
                domCache.progressPercent.textContent = '0%';
                domCache.progressLabel.textContent = '准备上传...';
                showFeedback('info', '上传中', '正在准备分片上传...');
                let customName = domCache.fileNameInput.value.trim();
                const fileName = customName || file.name;
                const isGroup = appState?.selectedContact?.isGroup || false;
                let targetId = appState?.selectedContact?.contactId ||
                    appState?.selectedContact?.conversationId || '';
                targetId = targetId.replace(/^group_/, '');
                const initFormData = new FormData();
                initFormData.append('action', 'initiate_multipart');
                initFormData.append('file_name', fileName);
                initFormData.append('file_size', file.size);
                initFormData.append('user_id', appState?.userId || 'unknown');
                initFormData.append('dfid', appState?.userId || 'unknown');
                initFormData.append('target_type', isGroup ? 'group' : 'user');
                initFormData.append('target_id', targetId);
                const initResponse = await fetch('/api/groupfiles/', {
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
                    const partResponse = await fetch('/api/groupfiles/', {
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
                const completeResponse = await fetch('/api/groupfiles/', {
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
                    `文件ID: <span class="gfile-file-id-display">${uploadFileId}</span><br>
             大小: ${formatFileSize(file.size)}`);
                updateSendButtonState();
            } catch (error) {
                domCache.progressWrapper.classList.remove('active');
                showFeedback('error', '❌ 上传失败', error.message || '网络错误，请重试');
                isUploadComplete = false;
                console.error('上传文件失败:', error);
            } finally {
                GroupFileRateLimiter.releaseLock('upload');
                if (!isUploadComplete) {
                    domCache.progressLabel.textContent = '上传失败';
                }
            }
        }

        function updateSendButtonState() {
            const isReady = isUploadComplete && uploadFileId;
            domCache.sendBtn.disabled = !isReady;
        }

        function showFeedback(type, label, detail) {
            const el = domCache.feedback;
            el.className = 'gfile-feedback active ' + type;
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
            try {
                alertMsg('文件已上传');
                setTimeout(resetUploadState, 300);
            } catch (error) {
                alertMsg(`发送失败：${error.message}`);
                console.error('发送文件消息失败:', error);
            }
        }
        async function loadFileList(page) {
            if (!appState?.selectedContact?.isGroup) {
                showListFeedback('error', '请先选择一个群聊');
                return;
            }

            let groupId = appState.selectedContact.contactId || appState.selectedContact.conversationId;
            if (!groupId) {
                showListFeedback('error', '群组ID无效');
                return;
            }
            groupId = groupId.replace(/^group_/, '');
            if (isLoadingList) return;
            isLoadingList = true;
            domCache.listLoading.style.display = 'flex';
            domCache.listEmpty.style.display = 'none';
            domCache.listItems.innerHTML = '';
            domCache.listFeedback.classList.remove('active', 'info', 'success', 'error');
            const limitKey = `groupfile_${groupId}`;
            const check = GroupFileRateLimiter.canRequest('list', limitKey);
            if (!check.allowed) {
                showListFeedback('error', '提示', check.message);
                isLoadingList = false;
                domCache.listLoading.style.display = 'none';
                return;
            }

            try {
                GroupFileRateLimiter.recordRequest('list', limitKey);
                const formData = new FormData();
                formData.append('action', 'list_group_files');
                formData.append('group_id', groupId);
                formData.append('page', page);
                formData.append('page_size', pageSize);
                formData.append('user_id', appState?.userId || 'unknown');
                formData.append('dfid', appState?.userId || 'unknown');
                const response = await fetch('/api/groupfiles/', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || '获取文件列表失败');
                }
                const data = result.data || {};
                fileListData = data.files || [];
                totalFiles = data.total || 0;
                currentPage = data.page || page;

                renderFileList();

            } catch (error) {
                console.error('加载文件列表失败:', error);
                showListFeedback('error', '加载失败', error.message || '网络错误，请重试');
                domCache.listItems.innerHTML = '';
            } finally {
                isLoadingList = false;
                domCache.listLoading.style.display = 'none';
            }
        }

        function renderFileList() {
            const container = domCache.listItems;
            container.innerHTML = '';
            if (fileListData.length === 0) {
                domCache.listEmpty.style.display = 'flex';
                domCache.listTotal.textContent = '共 0 个文件';
                domCache.pageInfo.textContent = '1 / 1';
                domCache.pagePrev.disabled = true;
                domCache.pageNext.disabled = true;
                return;
            }

            domCache.listEmpty.style.display = 'none';
            domCache.listTotal.textContent = `共 ${totalFiles} 个文件`;
            fileListData.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'gfile-list-item';
                item.dataset.index = index;
                const iconClass = getFileIconClass(file.file_name || '');
                const fileSize = formatFileSize(file.file_size || 0);
                const uploadTime = formatTime(file.upload_time || file.create_time);
                item.innerHTML = `
                    <div class="gfile-item-icon">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="gfile-item-info">
                        <div class="gfile-item-name" title="${escapeHtml(file.file_name || '未命名')}">
                            ${escapeHtml(file.file_name || '未命名')}
                        </div>
                        <div class="gfile-item-meta">
                            <span>${fileSize}</span>
                            <span>·</span>
                            <span>${uploadTime}</span>
                            <span>·</span>
                            <span>上传者: ${escapeHtml(file.uploader_name || file.uploader_id || '未知')}</span>
                        </div>
                    </div>
                    <div class="gfile-item-actions">
                        <button class="gfile-btn gfile-btn-sm gfile-btn-download" data-file-id="${file.file_id}" title="下载">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="gfile-btn gfile-btn-sm gfile-btn-danger" data-file-id="${file.file_id}" title="删除">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                container.appendChild(item);
                const downloadBtn = item.querySelector('.gfile-btn-download');
                downloadBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const fileId = this.dataset.fileId;
                    handleDownloadFile(fileId);
                });
                const deleteBtn = item.querySelector('.gfile-btn-danger');
                deleteBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const fileId = this.dataset.fileId;
                    const fileName = fileListData[index]?.file_name || '文件';
                    handleDeleteFile(fileId, fileName);
                });
            });
            const totalPages = Math.ceil(totalFiles / pageSize);
            domCache.pageInfo.textContent = `${currentPage} / ${totalPages || 1}`;
            domCache.pagePrev.disabled = currentPage <= 1;
            domCache.pageNext.disabled = currentPage >= totalPages;
            domCache.listFeedback.classList.remove('active', 'info', 'success', 'error');
        }

        function getFileIconClass(fileName) {
            const ext = fileName.split('.').pop()?.toLowerCase() || '';
            const iconMap = {
                'pdf': 'fa-file-pdf',
                'doc': 'fa-file-word',
                'docx': 'fa-file-word',
                'xls': 'fa-file-excel',
                'xlsx': 'fa-file-excel',
                'ppt': 'fa-file-powerpoint',
                'pptx': 'fa-file-powerpoint',
                'jpg': 'fa-file-image',
                'jpeg': 'fa-file-image',
                'png': 'fa-file-image',
                'gif': 'fa-file-image',
                'bmp': 'fa-file-image',
                'svg': 'fa-file-image',
                'mp4': 'fa-file-video',
                'avi': 'fa-file-video',
                'mkv': 'fa-file-video',
                'mov': 'fa-file-video',
                'mp3': 'fa-file-audio',
                'wav': 'fa-file-audio',
                'flac': 'fa-file-audio',
                'zip': 'fa-file-archive',
                'rar': 'fa-file-archive',
                '7z': 'fa-file-archive',
                'tar': 'fa-file-archive',
                'gz': 'fa-file-archive',
                'js': 'fa-file-code',
                'html': 'fa-file-code',
                'css': 'fa-file-code',
                'json': 'fa-file-code',
                'xml': 'fa-file-code',
                'py': 'fa-file-code',
                'java': 'fa-file-code',
                'cpp': 'fa-file-code',
                'c': 'fa-file-code',
                'go': 'fa-file-code',
                'rs': 'fa-file-code',
                'txt': 'fa-file-alt',
                'log': 'fa-file-alt',
                'md': 'fa-file-alt',
            };
            return iconMap[ext] || 'fa-file';
        }
        async function handleDownloadFile(fileId) {
            if (!fileId) {
                alertMsg('文件ID无效');
                return;
            }

            const limitKey = fileId;
            const check = GroupFileRateLimiter.canRequest('download', limitKey);
            if (!check.allowed) {
                showListFeedback('error', '提示', check.message);
                return;
            }

            if (!GroupFileRateLimiter.acquireLock('download')) {
                showListFeedback('error', '下载中', '请等待当前下载完成');
                return;
            }

            try {
                GroupFileRateLimiter.recordRequest('download', limitKey);
                let downloadUrl = null;
                let fileName = '';
                if (cachedDownloadUrls.has(fileId)) {
                    const cached = cachedDownloadUrls.get(fileId);
                    if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
                        downloadUrl = cached.url;
                        fileName = cached.fileName || '文件';
                    }
                }

                if (!downloadUrl) {
                    const formData = new FormData();
                    formData.append('action', 'get_group_download_url');
                    formData.append('file_id', fileId);
                    formData.append('user_id', appState?.userId || 'unknown');
                    formData.append('dfid', appState?.userId || 'unknown');
                    const response = await fetch('/api/groupfiles/', {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    if (!result.success || !result.data?.download_url) {
                        throw new Error(result.error || '获取下载链接失败');
                    }
                    downloadUrl = result.data.download_url;
                    fileName = result.data.file_name || '文件';
                    cachedDownloadUrls.set(fileId, {
                        url: downloadUrl,
                        fileName: fileName,
                        fileSize: result.data.file_size || 0,
                        timestamp: Date.now()
                    });
                }
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showListFeedback('success', '下载已开始', `正在下载: ${fileName}`);

            } catch (error) {
                console.error('下载文件失败:', error);
                alertMsg(`下载失败：${error.message}`);
                showListFeedback('error', '下载失败', error.message || '网络错误，请重试');
            } finally {
                GroupFileRateLimiter.releaseLock('download');
            }
        }
        async function handleDeleteFile(fileId, fileName) {
            if (!fileId) {
                alertMsg('文件ID无效');
                return;
            }

            if (!confirm(`确定要删除文件 "${fileName || '未命名'}" 吗？此操作不可恢复！`)) {
                return;
            }

            const limitKey = fileId;
            const check = GroupFileRateLimiter.canRequest('delete', limitKey);
            if (!check.allowed) {
                showListFeedback('error', '提示', check.message);
                return;
            }

            if (!GroupFileRateLimiter.acquireLock('delete')) {
                showListFeedback('error', '删除中', '请等待当前删除操作完成');
                return;
            }

            try {
                GroupFileRateLimiter.recordRequest('delete', limitKey);
                const formData = new FormData();
                formData.append('action', 'delete_group_file');
                formData.append('file_id', fileId);
                formData.append('user_id', appState?.userId || 'unknown');
                formData.append('dfid', appState?.userId || 'unknown');
                const response = await fetch('/api/groupfiles/', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || '删除文件失败');
                }
                cachedDownloadUrls.delete(fileId);
                showListFeedback('success', '删除成功', `文件 "${fileName}" 已删除`);
                setTimeout(() => {
                    loadFileList(currentPage);
                }, 500);

            } catch (error) {
                console.error('删除文件失败:', error);
                alertMsg(`删除失败：${error.message}`);
                showListFeedback('error', '删除失败', error.message || '网络错误，请重试');
            } finally {
                GroupFileRateLimiter.releaseLock('delete');
            }
        }
        function showListFeedback(type, label, detail) {
            const el = domCache.listFeedback;
            el.className = 'gfile-feedback active ' + type;
            domCache.listFeedbackLabel.textContent = label;
            domCache.listFeedbackDetail.innerHTML = detail || '';
        }
        function openModal() {
            if (!domCache.overlay) {
                buildModal();
            }
            resetUploadState();
            domCache.tabs.forEach(t => t.classList.remove('active'));
            document.querySelector('.gfile-tab-btn[data-tab="upload"]').classList.add('active');
            domCache.tabUpload.classList.add('active');
            domCache.tabList.classList.remove('active');
            domCache.listFeedback.classList.remove('active', 'info', 'success', 'error');
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
            const triggerBtn = document.getElementById('groups_upload_file_xpacev1');
            if (triggerBtn) {
                triggerBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (!appState?.selectedContact) {
                        alertMsg('请先选择一个会话');
                        return;
                    }
                    if (!appState.selectedContact.isGroup) {
                        alertMsg('请先选择一个群聊');
                        return;
                    }
                    openModal();
                });
            } else {
                console.warn('[GroupFile] 触发按钮 #groups_upload_file_xpacev1 未找到');
            }
        }

        return {
            init: init,
            open: openModal,
            close: closeModal,
            refreshList: loadFileList,
            resetUpload: resetUploadState
        };

    })();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            GroupFileModule.init();
        });
    } else {
        GroupFileModule.init();
    }

})();