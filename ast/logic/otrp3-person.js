(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const RateLimit = {
            _records: {},
            check(key, interval) {
                const now = Date.now();
                const last = this._records[key] || 0;
                const elapsed = now - last;
                if (elapsed < interval) {
                    return {
                        allowed: false,
                        waitTime: Math.ceil((interval - elapsed) / 1000)
                    };
                }
                this._records[key] = now;
                return { allowed: true, waitTime: 0 };
            },
            reset(key) {
                delete this._records[key];
            }
        };
        const profileNavItem = document.querySelector('#userprofile-center-updates');
        if (!profileNavItem) {
            return;
        }
        let currentUserData = null;
        let originalUserData = null;
        let modalExists = false;
        let currentUser_tximg_link = null;
        profileNavItem.addEventListener('click', openProfileModal);
        function getCurrentUserId() {
            return window.qmok_userid_id || null;
        }
        async function fetchUserInfo() {
            const userId = getCurrentUserId();
            if (!userId) {
                return null;
            }
            const authdatas = await tmd_newcontroler.writenewwords(userId);
            return new Promise((resolve, reject) => {
                plugin_post_requests(
                    { action: 'get_user_info', user_id: authdatas },
                    (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    },
                    { url: '/api/user/profile.php', timeout: 10000 }
                );
            });
        }

        async function updateUserInfo_basicinfo(updateData) {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('未获取到用户ID');
            }
            const authdatas = await tmd_newcontroler.writenewwords(userId);
            return new Promise((resolve, reject) => {
                plugin_post_requests(
                    { action: 'update_user_info', user_id: authdatas, ...updateData },
                    (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    },
                    { url: '/api/user/updatebinfo.php', timeout: 10000 }
                );
            });
        }
        async function updateUserInfo_password(updateData) {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('未获取到用户ID');
            }
            const authdatas = await tmd_newcontroler.writenewwords(userId);
            return new Promise((resolve, reject) => {
                plugin_post_requests(
                    { action: 'update_user_password', user_id: authdatas, ...updateData },
                    (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    },
                    { url: '/api/user/updatepass.php', timeout: 10000 }
                );
            });
        }

        async function openProfileModal() {
            if (modalExists) {
                closeModal();
            }
            const result = RateLimit.check('check_loaded_profile', 10000);
            if (!result.allowed) {
                alertMsg('操作过于频繁，请稍后再试');
                return;
            }
            showLoadingToast('加载个人信息中...');
            try {
                const result = await fetchUserInfo();
                if (result && result.code === 200 && result.data) {
                    currentUserData = result.data;
                    originalUserData = JSON.parse(JSON.stringify(currentUserData));
                    currentUser_tximg_link = currentUserData.tximg;
                    if (currentUserData.tximg === '(&&)::avatar.jpg') {
                        currentUserData.tximg = '/ast/fickp/default.png';
                        currentUser_tximg_link = '(&&)::avatar.jpg';
                    }
                    hideLoadingToast();
                    createModal();
                } else {
                    hideLoadingToast();
                    throw new Error(result?.message || '获取用户信息失败');
                }
            } catch (error) {
                hideLoadingToast();
                Swal.fire({
                    title: '提示',
                    text: '获取用户信息失败，请稍后重试',
                    icon: 'error',
                    confirmButtonText: '确定'
                });
            }
        }


        function showLoadingToast(message) {
            let loadingDiv = document.querySelector('.profile-loading-toast');
            if (!loadingDiv) {
                loadingDiv = document.createElement('div');
                loadingDiv.className = 'profile-loading-toast';
                loadingDiv.innerHTML = `
                    <div class="profile-loading-content">
                        <i class="fas fa-spinner fa-pulse"></i>
                        <span>${message}</span>
                    </div>
                `;
                document.body.appendChild(loadingDiv);
            } else {
                loadingDiv.querySelector('span').textContent = message;
                loadingDiv.style.display = 'flex';
            }
        }

        function hideLoadingToast() {
            const loadingDiv = document.querySelector('.profile-loading-toast');
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
        }


        function createModal() {
            const existingModal = document.querySelector('.profile-modal-mask');
            if (existingModal) {
                existingModal.remove();
            }

            const modalHTML = `
                <div class="profile-modal-mask">
                    <div class="profile-modal-container">
                        <div class="profile-modal-header">
                            <h3><i class="fas fa-user-circle"></i> 个人中心</h3>
                            <button class="profile-modal-close" id="profileCloseBtn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="profile-modal-body">
                            <div class="profile-tabs">
                                <div class="profile-tab active" data-tab="basic">
                                    <i class="fas fa-info-circle"></i> 基本信息
                                </div>
                                <div class="profile-tab" data-tab="records">
                                    <i class="fas fa-chart-line"></i> 我的战绩
                                </div>
                                <div class="profile-tab" data-tab="security">
                                    <i class="fas fa-shield-alt"></i> 安全设置
                                </div>
                                <div class="profile-tab" data-tab="stats">
                                    <i class="fas fa-chart-line"></i> 数据统计
                                </div>
                            </div>
                            <div class="profile-content">
                                <div class="profile-panel active" id="profilePanelBasic">
                                    <div class="profile-section">
                                        <div class="profile-section-title">
                                            <i class="fas fa-address-card"></i> 个人资料
                                            <span class="profile-section-desc">点击编辑修改信息</span>
                                        </div>
                                        <div class="profile-field-group">
                                            <div class="profile-field-item">
                                                <div class="profile-field-label">
                                                    <i class="fas fa-id-card"></i> 账号ID
                                                </div>
                                                <div class="profile-field-value" id="profileUserId">${escapeHtml(currentUserData.id || '-')}</div>
                                                <button class="profile-field-copy" data-copy="id" title="复制账号">
                                                    <i class="fas fa-copy"></i>
                                                </button>
                                            </div>
                                            <div class="profile-field-item editable" data-field="uname">
                                                <div class="profile-field-label">
                                                    <i class="fas fa-user"></i> 昵称
                                                </div>
                                                <div class="profile-field-value" id="profileUname">${escapeHtml(currentUserData.uname || '-')}</div>
                                                <button class="profile-field-edit" data-field="uname" title="编辑昵称">
                                                    <i class="fas fa-pen"></i>
                                                </button>
                                            </div>
                                            <div class="profile-field-item editable" data-field="username">
                                                <div class="profile-field-label">
                                                    <i class="fas fa-user-tag"></i> 用户名
                                                </div>
                                                <div class="profile-field-value" id="profileUsername">${escapeHtml(currentUserData.username || '-')}</div>
                                                <button class="profile-field-edit" data-field="username" title="编辑用户名">
                                                    <i class="fas fa-pen"></i>
                                                </button>
                                            </div>
                                            <div class="profile-field-item editable" data-field="sayed">
                                                <div class="profile-field-label">
                                                    <i class="fas fa-quote-left"></i> 个性签名
                                                </div>
                                                <div class="profile-field-value" id="profileSayed">${escapeHtml(currentUserData.sayed || '暂无签名')}</div>
                                                <button class="profile-field-edit" data-field="sayed" title="编辑签名">
                                                    <i class="fas fa-pen"></i>
                                                </button>
                                            </div>
                                            <div class="profile-field-item editable" data-field="bdmail">
                                                <div class="profile-field-label">
                                                    <i class="fas fa-envelope"></i> 绑定邮箱
                                                </div>
                                                <div class="profile-field-value" id="profileBdmail">${escapeHtml((currentUserData.bdmail !== 'null' ? currentUserData.bdmail : '无') || '未绑定')}</div>
                                                <button class="profile-field-edit" data-field="bdmail" title="编辑邮箱">
                                                    <i class="fas fa-pen"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="profile-section">
    <div class="profile-section-title">
        <i class="fas fa-image"></i> 头像设置
    </div>
    <div class="profile-avatar-section">
        <div class="profile-avatar-preview" id="profileAvatarPreview">
            ${currentUserData.tximg ? `<img src="${escapeHtml(currentUserData.tximg)}" alt="头像" onerror="this.onerror=null;this.src='';this.parentElement.innerHTML='<i class=\"fas fa-user-circle\"></i>` : `<i class="fas fa-user-circle"></i>`}
        </div>
        <div class="profile-field-item editable" data-field="tximg" style="width: 100%; margin-top: 12px;">
            <div class="profile-field-label" style="width: auto;">
                <i class="fas fa-link"></i> 头像外链
            </div>
            <div class="profile-field-value" id="profileTximg" style="word-break: break-all; font-size: 12px;">${escapeHtml(currentUser_tximg_link || '未设置')}</div>
            <button class="profile-field-edit" data-field="tximg" title="编辑头像链接">
                <i class="fas fa-pen"></i>
            </button>
        </div>
        <div class="profile-avatar-tip">支持输入图片外链（http/https），建议使用正方形图片</div>
    </div>
</div>
                                </div>
                                <div class="profile-panel" id="profilePanelSecurity">
                                    <div class="profile-section">
                                        <div class="profile-section-title">
                                            <i class="fas fa-lock"></i> 密码安全
                                        </div>
                                        <div class="profile-field-item">
                                            <div class="profile-field-label">
                                                <i class="fas fa-key"></i> 登录密码
                                            </div>
                                            <div class="profile-field-value">********</div>
                                            <button class="profile-btn profile-btn-secondary" id="profileChangePwdBtn">
                                                <i class="fas fa-edit"></i> 修改密码
                                            </button>
                                        </div>
                                    </div>
                                    <div class="profile-section">
                                        <div class="profile-section-title">
                                            <i class="fas fa-shield-virus"></i> 安全状态
                                        </div>
                                        <div class="profile-status-item">
                                            <div class="profile-status-label">
                                                <i class="fas ${currentUserData.isban ? 'fa-ban text-danger' : 'fa-check-circle text-success'}"></i>
                                                账号状态
                                            </div>
                                            <div class="profile-status-value ${currentUserData.isban ? 'text-danger' : 'text-success'}">
                                                ${currentUserData.isban ? '已封禁' : '正常'}
                                            </div>
                                        </div>
                                        <div class="profile-status-item">
                                            <div class="profile-status-label">
                                                <i class="fas fa-envelope"></i> 邮箱验证
                                            </div>
                                            <div class="profile-status-value ${(currentUserData.bdmail !== 'null' && currentUserData.bdmail) ? 'text-success' : 'text-warning'}">
                                                ${(currentUserData.bdmail !== 'null' && currentUserData.bdmail) ? '已验证' : '未验证'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="profile-panel" id="profilePanelStats">
                                    <div class="profile-stats-grid">
                                        <div class="profile-stat-card">
                                            <div class="profile-stat-icon">
                                                <i class="fas fa-coins"></i>
                                            </div>
                                            <div class="profile-stat-info">
                                                <div class="profile-stat-value" id="profileSpkcin">${formatNumber(currentUserData.spkcin || 0)}</div>
                                                <div class="profile-stat-label">G币</div>
                                            </div>
                                        </div>
                                        <div class="profile-stat-card">
                                            <div class="profile-stat-icon">
                                                <i class="fas fa-medal"></i>
                                            </div>
                                            <div class="profile-stat-info">
                                                <div class="profile-stat-value" id="profileCredit">${currentUserData.credit || 0}</div>
                                                <div class="profile-stat-label">信誉分</div>
                                            </div>
                                        </div>
                                        <div class="profile-stat-card">
                                            <div class="profile-stat-icon">
                                                <i class="fas fa-calendar-alt"></i>
                                            </div>
                                            <div class="profile-stat-info">
                                                <div class="profile-stat-value" id="profileRegtime">${formatDate(currentUserData.regtime)}</div>
                                                <div class="profile-stat-label">注册时间</div>
                                            </div>
                                        </div>
                                       
                                    </div>
                                </div>
                                <div class="profile-panel" id="profilePanelRecords">
                                    <div class="profile-section" style="padding: 0;">
                                        <div id="statsContainer" style="padding: 0;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="profile-modal-footer">
                            <button class="profile-btn profile-btn-secondary" id="profileCancelBtn">取消</button>
                            <button class="profile-btn profile-btn-primary" id="profileSaveBtn">保存修改</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modalExists = true;
            bindModalEvents();
        }


        function bindModalEvents() {
            const mask = document.querySelector('.profile-modal-mask');
            const closeBtn = document.getElementById('profileCloseBtn');
            const cancelBtn = document.getElementById('profileCancelBtn');
            const saveBtn = document.getElementById('profileSaveBtn');
            const tabs = document.querySelectorAll('.profile-tab');
            const editBtns = document.querySelectorAll('.profile-field-edit');
            const copyBtns = document.querySelectorAll('.profile-field-copy');
            const changePwdBtn = document.getElementById('profileChangePwdBtn');
            const closeModalHandler = () => closeModal();
            if (closeBtn) closeBtn.addEventListener('click', closeModalHandler);
            if (cancelBtn) cancelBtn.addEventListener('click', closeModalHandler);
            if (mask) mask.addEventListener('click', (e) => {
                if (e.target === mask) closeModalHandler();
            });
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape' && modalExists) {
                    closeModal();
                    document.removeEventListener('keydown', escHandler);
                }
            });
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.dataset.tab;
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    document.querySelectorAll('.profile-panel').forEach(panel => panel.classList.remove('active'));
                    if (tabName === 'basic') {
                        document.getElementById('profilePanelBasic').classList.add('active');
                    } else if (tabName === 'security') {
                        document.getElementById('profilePanelSecurity').classList.add('active');
                    } else if (tabName === 'stats') {
                        document.getElementById('profilePanelStats').classList.add('active');
                    } else if (tabName === 'records') {
                        document.getElementById('profilePanelRecords').classList.add('active');
                        setTimeout(() => {
                            initStatsModule();
                        }, 100);
                    }
                });
            });
            editBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const field = btn.dataset.field;
                    openEditDialog(field);
                });
            });
            copyBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const field = btn.dataset.copy;
                    let textToCopy = '';
                    if (field === 'id') textToCopy = currentUserData.id;
                    if (textToCopy) {
                        navigator.clipboard.writeText(textToCopy).then(() => {
                            Swal.fire({
                                icon: 'success',
                                title: '复制成功',
                                text: '账号已复制到剪贴板',
                                timer: 1500,
                                showConfirmButton: false
                            });
                        }).catch(() => {
                            Swal.fire({ icon: 'error', title: '复制失败', text: '请手动复制' });
                        });
                    }
                });
            });


            if (saveBtn) {
                saveBtn.addEventListener('click', saveProfileChanges);
            }
            if (changePwdBtn) {
                changePwdBtn.addEventListener('click', openChangePasswordDialog);
            }
        }
        function initStatsModule() {
            const container = document.getElementById('statsContainer');
            if (!container) return;
            if (container.dataset.initialized === 'true') return;
            container.dataset.initialized = 'true';
            const userId = window.qmok_userid_id;
            if (!userId) {
                container.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">请先登录</div>';
                return;
            }
            try {
                if (typeof YhMokTTCreateStatsModule === 'function') {
                    YhMokTTCreateStatsModule(userId, container);
                } else {
                   alertMsg('战绩引擎加载失败');
                }
            } catch (e) {
                console.error('加载战绩模块失败:', e);
                container.innerHTML = '<div style="text-align:center;padding:20px;color:#f87171;">加载失败，请刷新重试</div>';
            }
        }
        async function openEditDialog(field) {
            const fieldConfig = {
                uname: { label: '昵称', type: 'text', maxLength: 30, current: currentUserData.uname || '' },
                username: { label: '用户名', type: 'text', maxLength: 255, current: currentUserData.username || '' },
                sayed: { label: '个性签名', type: 'textarea', maxLength: 50, current: currentUserData.sayed || '' },
                bdmail: { label: '绑定邮箱', type: 'email', maxLength: 25, current: currentUserData.bdmail || '' },
                tximg: { label: '头像链接', type: 'url', maxLength: 200, current: currentUserData.tximg || '' }
            };

            const config = fieldConfig[field];
            if (!config) return;

            const { value } = await Swal.fire({
                title: `编辑${config.label}`,
                input: config.type === 'textarea' ? 'textarea' : 'text',
                inputValue: config.current,
                inputPlaceholder: `请输入${config.label}`,
                inputAttributes: {
                    maxlength: config.maxLength,
                    autocomplete: 'off'
                },
                showCancelButton: true,
                confirmButtonText: '保存',
                cancelButtonText: '取消',
                preConfirm: (inputValue) => {
                    preConfirm: (inputValue) => {
                        if (!inputValue || inputValue.trim() === '') {
                            Swal.showValidationMessage(`${config.label}不能为空`);
                            return false;
                        }
                        if (field === 'bdmail' && !isValidEmail(inputValue)) {
                            Swal.showValidationMessage('请输入有效的邮箱地址');
                            return false;
                        }
                        if (field === 'tximg') {
                            const urlPattern = /^https?:\/\/.+/i;
                            if (!urlPattern.test(inputValue)) {
                                Swal.showValidationMessage('请输入有效的头像链接（以http://或https://开头）');
                                return false;
                            }
                        }
                        return inputValue.trim();
                    }
                    return inputValue.trim();
                }
            });

            if (value) {
                currentUserData[field] = value;
                const displayElement = document.getElementById(`profile${field.charAt(0).toUpperCase() + field.slice(1)}`);
                if (displayElement) {
                    displayElement.textContent = value;
                }
                if (field === 'tximg') {
                    const avatarPreview = document.getElementById('profileAvatarPreview');
                    if (avatarPreview && value) {
                        avatarPreview.innerHTML = `<img src="${escapeHtml(value)}" alt="头像" onerror="this.onerror=null;this.src='';this.parentElement.innerHTML='<i class=\"fas fa-user-circle\"></i>'">`;
                    } else if (avatarPreview) {
                        avatarPreview.innerHTML = `<i class="fas fa-user-circle"></i>`;
                    }
                }
                highlightSaveButton();
            }
        }


        async function openChangePasswordDialog() {
            const { value: formData } = await Swal.fire({
                title: '修改密码',
                html: `
                    <input type="password" id="oldPassword" class="swal2-input" placeholder="当前密码" autocomplete="off">
                    <input type="password" id="newPassword" class="swal2-input" placeholder="新密码" autocomplete="off">
                    <input type="password" id="confirmPassword" class="swal2-input" placeholder="确认新密码" autocomplete="off">
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: '确认修改',
                cancelButtonText: '取消',
                preConfirm: () => {
                    const oldPwd = document.getElementById('oldPassword').value;
                    const newPwd = document.getElementById('newPassword').value;
                    const confirmPwd = document.getElementById('confirmPassword').value;

                    if (!oldPwd) {
                        Swal.showValidationMessage('请输入当前密码');
                        return false;
                    }
                    if (!newPwd) {
                        Swal.showValidationMessage('请输新密码');
                        return false;
                    }
                    if (newPwd.length < 6) {
                        Swal.showValidationMessage('新密码长度至少6位');
                        return false;
                    }
                    if (newPwd !== confirmPwd) {
                        Swal.showValidationMessage('两次输入的密码不一致');
                        return false;
                    }
                    return { old_password: oldPwd, new_password: newPwd };
                }
            });

            if (formData) {
                try {
                    const result = await updateUserInfo_password({ action_type: 'change_password', ...formData });
                    if (result && result.code === 200) {
                        Swal.fire({ icon: 'success', title: '修改成功', text: '请重新登录' });
                        setTimeout(() => { location.href = 'logout.php'; }, 2000);
                    } else {
                        throw new Error(result?.message || '修改失败');
                    }
                } catch (error) {
                    Swal.fire({ icon: 'error', title: '修改失败', text: error.message });
                }
            }
        }

        async function saveProfileChanges() {
            const changedFields = {};
            const editableFields = ['uname', 'username', 'sayed', 'bdmail', 'tximg'];
            for (const field of editableFields) {
                if (currentUserData[field] !== originalUserData[field]) {
                    changedFields[field] = currentUserData[field];
                }
            }

            if (Object.keys(changedFields).length === 0) {
                Swal.fire({ icon: 'info', title: '提示', text: '没有修改任何信息', timer: 1500, showConfirmButton: false });
                return;
            }

            try {
                const result = await updateUserInfo_basicinfo({ action_type: 'update_profile', ...changedFields });
                if (result && result.code === 200) {
                    originalUserData = JSON.parse(JSON.stringify(currentUserData));
                    Swal.fire({ icon: 'success', title: '保存成功', timer: 1500, showConfirmButton: false });
                    setTimeout(() => {
                        closeModal();
                    }, 1500);
                } else {
                    throw new Error(result?.message || '保存失败');
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: '保存失败', text: error.message });
            }
        }
        function highlightSaveButton() {
            const saveBtn = document.getElementById('profileSaveBtn');
            if (saveBtn) {
                saveBtn.classList.add('has-changes');
                setTimeout(() => {
                    saveBtn.classList.remove('has-changes');
                }, 500);
            }
        }


        function closeModal() {
            const modal = document.querySelector('.profile-modal-mask');
            if (modal) {
                modal.remove();
            }
            modalExists = false;
        }


        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function (m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function (c) {
                return c;
            });
        }

        function formatDate(dateStr, defaultValue = '') {
            if (!dateStr) return defaultValue;
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return defaultValue;
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            } catch {
                return defaultValue;
            }
        }

        function formatNumber(num) {
            if (num >= 10000) {
                return (num / 10000).toFixed(1) + 'w';
            }
            return num.toString();
        }

        function isValidEmail(email) {
            const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
            return re.test(email);
        }
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
                e.preventDefault();
                openProfileModal();
            }
        });
    });
})();