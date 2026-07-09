(function () {
    const modifyDeleteFriendBtn = document.getElementById('modify-update-delfri');
    const modifyBlacklistBtn = document.getElementById('modify-update-blackhome');
    if (modifyDeleteFriendBtn || modifyBlacklistBtn) {
        modifyDeleteFriendBtn.addEventListener('click', function () {
            mok_handleFriendAction('delete');
        });
        modifyBlacklistBtn.addEventListener('click', function () {
            mok_handleFriendAction('blacklist');
        });
    }

    async function mok_handleFriendAction(actionType) {
        if (!appState.selectedContact) {
            alertMsg('请先选择一个联系人');
            return;
        }

        const { contactId, uname, friendAlias } = appState.selectedContact;
        const displayName = friendAlias || uname || '该联系人';
        const config = {
            delete: {
                title: '删除好友',
                method: 0,
                confirmText: '确定删除',
                warningText: '删除后，您将不再和对方是好友关系，聊天记录将被保留但无法继续聊天。',
                successMsg: '好友删除成功',
                failMsg: '删除好友失败'
            },
            blacklist: {
                title: '拉黑好友',
                method: 2,
                confirmText: '确定拉黑',
                warningText: '拉黑后，您将不再接收对方的消息，且对方无法再与您聊天。',
                successMsg: '拉黑好友成功',
                failMsg: '拉黑好友失败'
            }
        };
        const action = config[actionType];
        const result = await Swal.fire({
            title: action.title,
            html: `
            <div style="text-align: left; margin: 10px 0;">
                <p style="color: #f56c6c; margin-bottom: 15px;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>
                    警告：此操作不可逆！
                </p>
                <p>确定要${action.title} <strong>${escapeHtml(displayName)}</strong> 吗？</p>
                <p style="font-size: 12px; color: #999; margin-top: 10px;">${action.warningText}</p>
            </div>
        `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: action.confirmText,
            cancelButtonText: '取消',
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) {
                    container.style.zIndex = '999999999';
                }
            },
        });

        if (result.isConfirmed) {
            await mok_performFriendAction(contactId, action.method, action.successMsg, action.failMsg);
        }
    }
    async function mokim_group_showGroupLogModal(groupId, isOwner, isAdmin) {
        let currentPage = 1;
        const pageSize = 15;
        let lastRefreshTime = 0;
        const REFRESH_INTERVAL = 3000;
        let totalLogs = 0;
        let allLogs = [];
        const modalHtml = `
        <div id="groupLogModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div style="background: #fff; border-radius: 12px; width: 90%; max-width: 900px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                <div style="padding: 16px 20px; border-bottom: 1px solid #e8e8e8; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 18px;">
                        <i class="fas fa-history" style="margin-right: 8px; color: #409eff;"></i>
                        群聊操作日志
                    </h3>
                    <button id="closeLogModalBtn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">&times;</button>
                </div>
                <div style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <span style="font-size: 13px; color: #666;">
                            <i class="fas fa-info-circle"></i> 
                            ${isOwner ? '您拥有全部权限（群主）' : (isAdmin ? '您拥有管理员权限' : '您只有查看部分日志的权限')}
                        </span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <select id="logFilterAction" style="padding: 6px 12px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 13px;">
                            <option value="">全部操作</option>
                            <option value="create_group">创建群聊</option>
                            <option value="update_info">更新群信息</option>
                            <option value="add_admin">添加管理员</option>
                            <option value="remove_admin">移除管理员</option>
                            <option value="kick_member">踢出成员</option>
                            <option value="quit_group">退出群聊</option>
                            <option value="dismiss_group">解散群聊</option>
                            <option value="ban_member">禁言成员</option>
                            <option value="unban_member">解除禁言</option>
                            <option value="pin">置顶公告</option>
                            <option value="unpin">取消置顶公告</option>
                            <option value="delete_announcement">删除公告</option>
                            <option value="update_announcement">修改公告</option>
                            <option value="send_redpacket">发红红包</option>
                            <option value="fileupload">上传群文件</option>
                        </select>
                        <button id="refreshLogBtn" style="padding: 6px 12px; background: #409eff; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> 刷新
                        </button>
                    </div>
                </div>
                <div style="flex: 1; overflow-y: auto; padding: 16px 20px;" id="logListContainer">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-pulse" style="font-size: 24px; color: #409eff;"></i>
                        <p style="margin-top: 12px; color: #999;">加载日志中...</p>
                    </div>
                </div>
                <div style="padding: 12px 20px; border-top: 1px solid #e8e8e8; display: flex; justify-content: space-between; align-items: center;">
                    <span id="logPaginationInfo" style="font-size: 13px; color: #666;">第 1 / 1 页</span>
                    <div style="display: flex; gap: 8px;">
                        <button id="prevLogPageBtn" class="log-page-btn" style="padding: 6px 12px; border: 1px solid #dcdfe6; background: #fff; border-radius: 4px; cursor: pointer;" disabled>上一页</button>
                        <button id="nextLogPageBtn" class="log-page-btn" style="padding: 6px 12px; border: 1px solid #dcdfe6; background: #fff; border-radius: 4px; cursor: pointer;" disabled>下一页</button>
                    </div>
                </div>
            </div>
        </div>
    `;
        const existingModal = document.getElementById('groupLogModal');
        if (existingModal) {
            existingModal.remove();
        }
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('groupLogModal');
        const closeBtn = document.getElementById('closeLogModalBtn');
        const refreshBtn = document.getElementById('refreshLogBtn');
        const prevBtn = document.getElementById('prevLogPageBtn');
        const nextBtn = document.getElementById('nextLogPageBtn');
        const filterSelect = document.getElementById('logFilterAction');
        modal.style.display = 'flex';
        const closeModal = () => {
            modal.style.display = 'none';
            setTimeout(() => modal.remove(), 300);
        };
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        let currentFilter = '';
        async function loadGroupLogs(page = 1) {
            try {
                Loading.show('正在加载操作日志...');
                const authdatas = await tmd_newcontroler.writenewwords(groupId);
                return new Promise((resolve, reject) => {
                    plugin_post_requests({
                        dfid: authdatas,
                        UserId: appState.userId,
                        group_id: groupId,
                        page: page,
                        page_size: pageSize,
                        action: currentFilter
                    }, (error, response) => {
                        Loading.hide();
                        if (error) {
                            reject(error);
                            return;
                        }
                        if (response && response.success) {
                            resolve(response.data);
                        } else {
                            reject(new Error(response?.message || '获取日志失败'));
                        }
                    }, {
                        url: '/api/grouplogs/',
                        timeout: 10000
                    });
                });
            } catch (error) {
                Loading.hide();
                throw error;
            }
        }
        function renderLogs(logs, total, currentPage, totalPages) {
            const container = document.getElementById('logListContainer');
            if (!container) return;

            if (!logs || logs.length === 0) {
                container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-inbox" style="font-size: 48px; color: #ddd;"></i>
                <p style="margin-top: 12px; color: #999;">暂无操作日志</p>
            </div>
        `;
                return;
            }
            const filteredLogs = logs.map(log => {
                const logData = { ...log };
                if (!isOwner && !isAdmin) {
                    logData.user_id = '***';
                    logData.operator_name = '某位成员';
                    logData.ip_address = null;
                    if (logData.new_data && typeof logData.new_data === 'object') {
                        logData.new_data = { msg: '详情已隐藏' };
                    }
                    if (logData.old_data && typeof logData.old_data === 'object') {
                        logData.old_data = { msg: '详情已隐藏' };
                    }
                    if (logData.remark) {
                        logData.remark = '***';
                    }
                    const sensitiveActions = ['kick_member', 'add_admin', 'remove_admin', 'ban_member', 'unban_member'];
                    if (sensitiveActions.includes(logData.action)) {
                        if (logData.new_data && logData.new_data.user_id) {
                            logData.new_data = { msg: '涉及成员信息已隐藏' };
                        }
                    }
                }
                return logData;
            });
            const actionMap = {
                'create_group': { text: '创建群聊', icon: 'fa-plus-circle', color: '#67c23a' },
                'update_info': { text: '更新群信息', icon: 'fa-edit', color: '#409eff' },
                'add_admin': { text: '添加管理员', icon: 'fa-user-plus', color: '#e6a23c' },
                'remove_admin': { text: '移除管理员', icon: 'fa-user-minus', color: '#e6a23c' },
                'kick_member': { text: '踢出成员', icon: 'fa-sign-out-alt', color: '#f56c6c' },
                'quit_group': { text: '退出群聊', icon: 'fa-door-open', color: '#909399' },
                'dismiss_group': { text: '解散群聊', icon: 'fa-trash-alt', color: '#f56c6c' },
                'ban_member': { text: '禁言成员', icon: 'fa-microphone-slash', color: '#e6a23c' },
                'unban_member': { text: '解除禁言', icon: 'fa-microphone', color: '#67c23a' },
                'pin': { text: '置顶公告', icon: 'fa-thumbtack', color: '#409eff' },
                'unpin': { text: '取消置顶公告', icon: 'fa-thumbtack', color: '#909399' },
                'delete_announcement': { text: '删除公告', icon: 'fa-trash', color: '#f56c6c' },
                'update_announcement': { text: '修改公告', icon: 'fa-pen', color: '#409eff' },
                'publish_announcement': { text: '发布公告', icon: 'fa-bullhorn', color: '#67c23a' },
                'add_member': { text: '添加成员', icon: 'fa-user-plus', color: '#67c23a' },
                'join_group': { text: '加入群聊', icon: 'fa-door-closed', color: '#67c23a' },
                'send_redpacket': { text: '发送红包', icon: 'fa-packet', color: '#c2833a' },
                'fileupload': { text: '上传群文件', icon: 'fa-file', color: '#c4a98c' },
            };
            let html = '';
            filteredLogs.forEach(log => {
                const actionInfo = actionMap[log.action] || { text: log.action, icon: 'fa-info-circle', color: '#909399' };
                const actionTime = new Date(log.action_time).toLocaleString('zh-CN', { hour12: false });
                let detailHtml = '';
                if (!isOwner && !isAdmin) {
                    detailHtml = '';
                } else if (log.new_data && Object.keys(log.new_data).length > 0) {
                    const detailText = JSON.stringify(log.new_data, null, 2);
                    detailHtml = `<div class="log-detail" style="margin-top: 8px; padding: 8px; background: #f5f7fa; border-radius: 4px; font-size: 12px; color: #666; word-break: break-all; max-height: 100px; overflow-y: auto;">
                <i class="fas fa-code"></i> 变更详情: <code style="font-size: 11px;">${escapeHtml(detailText.substring(0, 200))}${detailText.length > 200 ? '...' : ''}</code>
            </div>`;
                }

                let remarkHtml = '';
                if (log.remark) {
                    remarkHtml = `<span style="margin-left: 12px; font-size: 12px; color: #999;"><i class="fas fa-comment"></i> ${escapeHtml(log.remark)}</span>`;
                }
                const operatorDisplay = (!isOwner && !isAdmin) ? '某位成员' : escapeHtml(log.operator_name || log.user_id || '未知用户');

                html += `
            <div class="log-item" style="padding: 12px; border-bottom: 1px solid #f0f0f0; transition: background 0.2s;" onmouseenter="this.style.backgroundColor='#fafafa'" onmouseleave="this.style.backgroundColor='transparent'">
                <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <span style="display: inline-flex; align-items: center; gap: 4px; background: ${actionInfo.color}15; color: ${actionInfo.color}; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                        <i class="fas ${actionInfo.icon}"></i> ${actionInfo.text}
                    </span>
                    <span style="font-size: 13px; color: #333;">
                        <i class="fas fa-user"></i> ${operatorDisplay}
                    </span>
                    <span style="font-size: 12px; color: #999;">
                        <i class="far fa-clock"></i> ${actionTime}
                    </span>
                    ${remarkHtml}
                </div>
                ${detailHtml}
                ${log.ip_address && (isOwner || isAdmin) ? `<div style="margin-top: 6px; font-size: 11px; color: #bbb;"><i class="fas fa-network-wired"></i> IP: ${escapeHtml(log.ip_address)}</div>` : ''}
            </div>
        `;
            });
            container.innerHTML = html;
            const paginationInfo = document.getElementById('logPaginationInfo');
            if (paginationInfo) {
                paginationInfo.textContent = `第 ${currentPage} / ${totalPages || 1} 页 (共 ${total} 条记录)`;
            }
            if (prevBtn) {
                prevBtn.disabled = currentPage === 1;
            }
            if (nextBtn) {
                nextBtn.disabled = currentPage === totalPages || totalPages === 0;
            }
            totalLogs = total;
        }
        async function refreshLogs(resetPage = true) {
            const now = Date.now();
            if (now - lastRefreshTime < REFRESH_INTERVAL) {
                const remainingSeconds = Math.ceil((REFRESH_INTERVAL - (now - lastRefreshTime)) / 1000);
                const container = document.getElementById('logListContainer');
                if (container) {
                    const originalHtml = container.innerHTML;
                    container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-hourglass-half" style="font-size: 48px; color: #e6a23c;"></i>
                    <p style="margin-top: 12px; color: #e6a23c;">操作太频繁，请 ${remainingSeconds} 秒后再试</p>
                </div>
            `;
                    setTimeout(() => {
                        if (document.getElementById('logListContainer')) {
                            container.innerHTML = originalHtml;
                        }
                    }, 2000);
                }
                return;
            }

            lastRefreshTime = now;

            if (resetPage) {
                currentPage = 1;
            }
            try {
                const result = await loadGroupLogs(currentPage);
                const logs = result.list || [];
                const total = result.total || 0;
                const totalPages = Math.ceil(total / pageSize);
                renderLogs(logs, total, currentPage, totalPages);
                window._currentLogTotalPages = totalPages;
                window._currentLogTotal = total;
            } catch (error) {
                const container = document.getElementById('logListContainer');
                if (container) {
                    container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f56c6c;"></i>
                    <p style="margin-top: 12px; color: #999;">加载失败: ${escapeHtml(error.message)}</p>
                </div>
            `;
                }
            }
        }
        let filterChangeTimer = null;
        if (filterSelect) {
            filterSelect.addEventListener('change', async () => {
                if (filterChangeTimer) {
                    clearTimeout(filterChangeTimer);
                }
                filterChangeTimer = setTimeout(async () => {
                    currentFilter = filterSelect.value;
                    currentPage = 1;
                    lastRefreshTime = 0;
                    await refreshLogs(true);
                }, 300);
            });
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', async () => {
                if (currentPage > 1) {
                    currentPage--;
                    await refreshLogs(false);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', async () => {
                const totalPages = window._currentLogTotalPages || 1;
                if (currentPage < totalPages) {
                    currentPage++;
                    await refreshLogs(false);
                }
            });
        }
        if (filterSelect) {
            filterSelect.addEventListener('change', async () => {
                currentFilter = filterSelect.value;
                currentPage = 1;
                await refreshLogs(true);
            });
        }
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await refreshLogs(true);
            });
        }
        await refreshLogs(true);
    }
    async function mok_im_group_infosupdates_gg(group) {
        const currentGroupName = group?.group_name || group?.uname || '';
        const currentGroupDesc = group?.group_desc || group?.sayed || '';
        const currentVerify = group?.need_verify !== undefined ? group.need_verify : '3';
        const currentGroupConfig = group?.group_settings || '';
        Swal.fire({
            title: '编辑群信息',
            width: '800px',
            html: `
            <div style="text-align: left;">
                <label style="display: block; margin-bottom: 5px;">群名称 <span style="color: red;">*</span></label>
                <input type="text" id="group-name-input" class="swal2-input" 
                       value="${escapeHtml(currentGroupName)}" placeholder="请输入群名称（1-20个字）">
                <div id="group-name-error" style="color: #f56c6c; font-size: 12px; margin-top: -10px; margin-bottom: 10px; display: none;"></div>
                
                <label style="display: block; margin-bottom: 5px;">群介绍</label>
                <textarea id="group-desc-input" class="swal2-textarea" rows="3" 
                          placeholder="请输入群介绍（最多80个字）">${escapeHtml(currentGroupDesc)}</textarea>
                <div id="group-desc-error" style="color: #f56c6c; font-size: 12px; margin-top: -10px; margin-bottom: 10px; display: none;"></div>
                
                <label style="display: block; margin-bottom: 5px;">加入方式</label>
                <select id="group-verify-input" class="swal2-select">
                    <option value="0" ${currentVerify == '0' ? 'selected' : ''}>禁止搜索</option>
                    <option value="1" ${currentVerify == '1' ? 'selected' : ''}>禁止加入</option>
                    <option value="2" ${currentVerify == '2' ? 'selected' : ''}>无需验证</option>
                    <option value="3" ${currentVerify == '3' ? 'selected' : ''}>需群主/管理员验证</option>
                    <option value="4" ${currentVerify == '4' ? 'selected' : ''}>仅邀请加入</option>
                </select>
                <br>
                <label style="display: block; margin-bottom: 5px;">群配置-运行(不懂勿填)</label>
                <textarea id="group-config" class="swal2-textarea" rows="3" 
                          placeholder='const weigui_words = ["傻逼","猎奇","乐子"]; //违规词库
function onEnter() {
    infomsg("请开始畅聊吧！"); //欢迎提示
}
function onSend(msg) {
    const msgcontent = msg.content;
	if(msgcontent.checkIfrom(weigui_words)){
		WSystemMsg("禁止使用违规词！！！此消息已被屏蔽");
		return false; //禁止发送此消息
	}
}'>${escapeHtml(currentGroupConfig)}</textarea>
                <a href="notice/Doc/groups-settings/" class="about-link" target="_blank" rel="noopener noreferrer">群配置-参考文档</a>
            </div>
        `,
            showCancelButton: true,
            confirmButtonText: '保存',
            cancelButtonText: '取消',
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) {
                    container.style.zIndex = '999999999';
                }
                const groupNameInput = document.getElementById('group-name-input');
                const groupNameError = document.getElementById('group-name-error');
                groupNameInput.addEventListener('input', function () {
                    const value = this.value.trim();
                    if (value.length === 0) {
                        groupNameError.textContent = '群名称不能为空';
                        groupNameError.style.display = 'block';
                    } else if (value.length > 20) {
                        groupNameError.textContent = '群名称不能超过20个字';
                        groupNameError.style.display = 'block';
                    } else {
                        groupNameError.style.display = 'none';
                    }
                });
                const groupDescInput = document.getElementById('group-desc-input');
                const groupDescError = document.getElementById('group-desc-error');
                groupDescInput.addEventListener('input', function () {
                    const value = this.value.trim();
                    if (value.length > 80) {
                        groupDescError.textContent = '群介绍不能超过80个字';
                        groupDescError.style.display = 'block';
                    } else {
                        groupDescError.style.display = 'none';
                    }
                });
            },
            preConfirm: () => {
                const groupName = document.getElementById('group-name-input').value.trim();
                const groupDesc = document.getElementById('group-desc-input').value.trim();
                const needVerify = document.getElementById('group-verify-input').value;
                let groupConfig = document.getElementById('group-config').value.trim();
                if (!groupName) {
                    Swal.showValidationMessage('群名称不能为空');
                    return false;
                }
                if (groupName.length > 20) {
                    Swal.showValidationMessage('群名称不能超过20个字');
                    return false;
                }
                if (groupDesc.length > 80) {
                    Swal.showValidationMessage('群介绍不能超过80个字');
                    return false;
                }
                if (groupConfig.length <= 0) {
                    groupConfig = '//GroupST';
                }
                return {
                    groupName: groupName,
                    groupDesc: groupDesc,
                    needVerify: needVerify,
                    groupConfig: groupConfig
                };
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                await mok_im_infoupdateGroupInfo(group.contactId, result.value);
            }
        });
    }
    async function mok_im_infoupdateGroupInfo(contactId, groupInfo) {
        try {
            Loading.show('正在更新群信息...');
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            plugin_post_requests({
                dfid: contactId,
                UserId: authdatas,
                group_name: groupInfo.groupName,
                group_desc: groupInfo.groupDesc,
                need_verify: parseInt(groupInfo.needVerify),
                group_settings: groupInfo.groupConfig
            }, (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg('更新群信息失败：' + error.message);
                    return;
                }
                if (response && response.success) {
                    if (appState.groups) {
                        appState.groups = appState.groups.map(group => {
                            if (group.contactId === contactId || group.group_id === contactId) {
                                return {
                                    ...group,
                                    group_name: groupInfo.groupName,
                                    group_desc: groupInfo.groupDesc,
                                    need_verify: groupInfo.needVerify,
                                    group_settings: groupInfo.groupConfig,
                                    uname: groupInfo.groupName
                                };
                            }
                            return group;
                        });
                    }
                    if (appState.selectedContact &&
                        (appState.selectedContact.contactId === contactId ||
                            appState.selectedContact.group_id === contactId)) {
                        appState.selectedContact.group_name = groupInfo.groupName;
                        appState.selectedContact.group_desc = groupInfo.groupDesc;
                        appState.selectedContact.need_verify = groupInfo.needVerify;
                        appState.selectedContact.group_settings = groupInfo.groupConfig;
                        appState.selectedContact.uname = groupInfo.groupName;
                        const chatHeader = document.querySelector('.chat-header .chat-name');
                        if (chatHeader) {
                            chatHeader.textContent = groupInfo.groupName;
                        }
                    }
                    if (typeof renderContacts === 'function') {
                        renderContacts();
                    }
                    Swal.fire({
                        icon: 'success',
                        title: '更新成功',
                        text: '群信息已更新',
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    alertMsg('更新群信息失败：' + (response ? response.message : '未知错误'));
                }
            }, {
                url: '/api/updategroupinfo/',
                timeout: 10000
            });

        } catch (error) {
            Loading.hide();
            alertMsg('更新群信息失败：' + error.message);
        }
    }
    async function mok_performFriendAction(contactId, method, successMsg, failMsg) {
        try {
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            Loading.show('正在处理，请稍候...');
            plugin_post_requests({
                dfid: contactId,
                UserId: authdatas,
                method: method
            }, (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg(failMsg + '：' + error.message);
                    return;
                }

                if (response && response.success) {
                    mok_removeContactFromLists(contactId);
                    if (appState.selectedContact && appState.selectedContact.contactId === contactId) {
                        unselectContact();
                    }
                    renderContacts().then(() => {
                        Swal.fire({
                            icon: 'success',
                            title: '操作成功',
                            text: successMsg,
                            timer: 1500,
                            showConfirmButton: false
                        });
                    });
                } else {
                    alertMsg(failMsg + '：' + (response ? response.message : '未知错误'));
                }
            }, {
                url: '/api/friendmanage/',
                timeout: 10000
            });

        } catch (error) {
            Loading.hide();
            alertMsg(failMsg + '：' + error.message);
        }
    }

    function mok_removeContactFromLists(contactId) {
        if (appState.contacts) {
            appState.contacts = appState.contacts.filter(contact => contact.contactId !== contactId);
        }
        if (appState.groups) {
            appState.groups = appState.groups.filter(group => group.contactId !== contactId);
        }
    }
    async function mokim_publishAnnouncement(title, content, isTop) {
        const groupId = appState.selectedContact.group_id ||
            appState.selectedContact.contactId?.replace('group_', '');
        if (!groupId) {
            alertMsg('获取群聊信息失败');
            return;
        }
        Loading.show('正在发布公告...');
        try {
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            const result = await new Promise((resolve, reject) => {
                plugin_post_requests({
                    dfid: groupId,
                    UserId: authdatas,
                    title: title,
                    content: content,
                    is_top: isTop
                }, (error, response) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    if (response && response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response?.message || '发布公告失败'));
                    }
                }, {
                    url: '/api/publish_announcement/',
                    timeout: 15000
                });
            });
            Loading.hide();
            alertMsg('公告发布成功！');
            await initGroupAnnouncements(true);
        } catch (error) {
            Loading.hide();
            alertMsg(`发布公告失败：${error.message}`);
        } finally {
            console.log('ttxx');
        }
    }
    async function mokim_clearAllMessages(conversationId) {
        try {
            const db = await initIndexedDB();
            const transaction = db.transaction('messages', 'readwrite');
            const store = transaction.objectStore('messages');
            const index = store.index('conversationId');
            const request = index.getAll(conversationId);
            return new Promise((resolve, reject) => {
                request.onsuccess = (e) => {
                    const messages = e.target.result;

                    if (messages.length === 0) {
                        resolve();
                        return;
                    }
                    let deleteCount = 0;
                    messages.forEach(msg => {
                        const deleteRequest = store.delete(msg.messageId);

                        deleteRequest.onsuccess = () => {
                            deleteCount++;
                            if (deleteCount === messages.length) {
                                resolve();
                            }
                        };

                        deleteRequest.onerror = (err) => {
                            reject(new Error(`删除消息失败: ${err.target.error}`));
                        };
                    });
                };

                request.onerror = (err) => {
                    reject(new Error(`获取消息列表失败: ${err.target.error}`));
                };
            });

        } catch (error) {
            console.error('清除聊天记录失败:', error);
            throw error;
        }
    }

    const modifyAliasBtn = document.getElementById('modify-update-alias');
    const modifygcoinsBtn = document.getElementById('modify-update-gcoins');
    const modifygroupsf = document.getElementById('modify-update-groupsf');
    const modifyDeleteMsgsBtn = document.querySelectorAll('#modify-update-delmsgs');
    const modifyaliasgbtn = document.getElementById('modify-update-aliasgroup');
    const modifydelgroup_g = document.getElementById('modify-update-delgroup');
    const modifybreakgroupr = document.getElementById('modify-update-breakgr');
    const modifyupdategroupinfoin = document.getElementById('modify-update-groupinfoin');
    const modifyaddnewnotices_sg = document.getElementById('modify-add-noticenew-sg');
    const modifysearching_grouplog = document.getElementById('user_grouplog_seaking');
    const modifygroupinvitayion_gglog = document.getElementById('user_groupinvitaion_send');
    const modifyfriendshipsmanner_powerg = document.getElementById('qinmidu_friendpowers');
    if (modifyAliasBtn || modifygcoinsBtn || modifygroupsf || modifyDeleteMsgsBtn || modifyaliasgbtn || modifydelgroup_g) {
        modifyDeleteMsgsBtn.forEach((btn_one, index) => {
            btn_one.addEventListener('click', function (event) {
                event.stopPropagation();
                if (!appState.selectedContact) {
                    alertMsg('请先选择一个联系人');
                    return;
                }
                const { contactId, conversationId, uname, friendAlias } = appState.selectedContact;
                const displayName = friendAlias || uname || '该联系人';
                Swal.fire({
                    title: '清除聊天记录',
                    html: `
                <div style="text-align: left; margin: 10px 0;">
                    <p style="color: #f56c6c; margin-bottom: 15px;">
                        <i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>
                        警告：此操作不可恢复！
                    </p>
                    <p>确定要清除与 <strong>${escapeHtml(displayName)}</strong> 的所有聊天记录吗？</p>
                    <p style="font-size: 12px; color: #999; margin-top: 10px;">包括所有文本消息、图片、文件、系统消息等</p>
                </div>
            `,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: '确定清除',
                    cancelButtonText: '取消',
                    preConfirm: async () => {
                        try {
                            Loading.show('正在清除聊天记录...');
                            await mokim_clearAllMessages(conversationId);
                            Loading.hide();
                            Swal.fire({
                                icon: 'success',
                                title: '清除成功',
                                text: `已清除与 ${displayName} 的所有聊天记录`,
                                timer: 2000,
                                showConfirmButton: false
                            });
                            const chatMessages = document.querySelector('.chat-messages');
                            if (chatMessages) {
                                chatMessages.innerHTML = '';
                            }
                            updateContactLastMessage(conversationId, '暂无消息', 0);
                            renderContacts();
                            return true;
                        } catch (error) {
                            Loading.hide();
                            Swal.showValidationMessage(`清除失败：${error.message}`);
                            return false;
                        }
                    }
                });
            });
        });
        modifyfriendshipsmanner_powerg.addEventListener('click', function () {
            if (!appState.selectedContact) {
                alertMsg('请先选择一个联系人');
                return;
            }

            const { contactId, uname, friendAlias } = appState.selectedContact;
            const displayName = friendAlias || uname || '该联系人';
            const currentPermission = 'allow';
            Swal.fire({
                title: '朋友圈权限设置',
                html: `
            <div style="text-align: left; margin: 10px 0;">
                <p style="margin-bottom: 15px; color: #333;">
                    是否允许 <strong>${escapeHtml(displayName)}</strong> 查看你的朋友圈？
                </p>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
                    <label style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 2px solid #dcdfe6; border-radius: 8px; cursor: pointer; transition: all 0.2s;" 
                           id="moment-allow-label" onclick="document.getElementById('moment-allow').checked = true; mokim_updateMomentSelection('allow')">
                        <input type="radio" name="momentPermission" id="moment-allow" value="allow" ${currentPermission === 'allow' ? 'checked' : ''}>
                        <span style="font-size: 15px; font-weight: 500; color: #67c23a;">
                            <i class="fas fa-check-circle" style="margin-right: 6px;"></i>同意
                        </span>
                        <span style="font-size: 13px; color: #999;">对方可以查看你的朋友圈动态</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 2px solid #dcdfe6; border-radius: 8px; cursor: pointer; transition: all 0.2s;" 
                           id="moment-deny-label" onclick="document.getElementById('moment-deny').checked = true; mokim_updateMomentSelection('deny')">
                        <input type="radio" name="momentPermission" id="moment-deny" value="deny" ${currentPermission === 'deny' ? 'checked' : ''}>
                        <span style="font-size: 15px; font-weight: 500; color: #f56c6c;">
                            <i class="fas fa-times-circle" style="margin-right: 6px;"></i>拒绝
                        </span>
                        <span style="font-size: 13px; color: #999;">对方无法查看你的朋友圈动态</span>
                    </label>
                </div>
                <div id="moment-permission-error" style="color: #f56c6c; font-size: 13px; margin-top: 10px; display: none;">
                    <i class="fas fa-exclamation-circle"></i> 请选择同意或拒绝
                </div>
            </div>
        `,
                showCancelButton: true,
                confirmButtonText: '确认设置',
                cancelButtonText: '取消',
                confirmButtonColor: '#409eff',
                cancelButtonColor: '#909399',
                didOpen: (popup) => {
                    const container = popup.closest('.swal2-container');
                    if (container) {
                        container.style.zIndex = '999999999';
                    }
                    const allowRadio = document.getElementById('moment-allow');
                    const denyRadio = document.getElementById('moment-deny');
                    const allowLabel = document.getElementById('moment-allow-label');
                    const denyLabel = document.getElementById('moment-deny-label');
                    const updateLabelStyle = () => {
                        allowLabel.style.borderColor = allowRadio.checked ? '#67c23a' : '#dcdfe6';
                        allowLabel.style.background = allowRadio.checked ? '#f0f9f0' : 'transparent';
                        denyLabel.style.borderColor = denyRadio.checked ? '#f56c6c' : '#dcdfe6';
                        denyLabel.style.background = denyRadio.checked ? '#fdf0f0' : 'transparent';
                    };
                    allowRadio.addEventListener('change', updateLabelStyle);
                    denyRadio.addEventListener('change', updateLabelStyle);
                    updateLabelStyle();
                    window.mokim_updateMomentSelection = function (value) {
                        const errorEl = document.getElementById('moment-permission-error');
                        if (errorEl) {
                            errorEl.style.display = 'none';
                        }
                    };
                },
                preConfirm: () => {
                    const allowRadio = document.getElementById('moment-allow');
                    const denyRadio = document.getElementById('moment-deny');
                    const errorEl = document.getElementById('moment-permission-error');
                    if (!allowRadio.checked && !denyRadio.checked) {
                        if (errorEl) {
                            errorEl.style.display = 'block';
                        }
                        Swal.showValidationMessage('请选择同意或拒绝');
                        return false;
                    }
                    const permission = allowRadio.checked ? 'allow' : 'deny';
                    return permission;
                }
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const permission = result.value;
                    try {
                        Loading.show('正在设置朋友圈权限...');
                        const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
                        const contactId = appState.selectedContact.contactId;
                        plugin_post_requests({
                            dfid: contactId,
                            UserId: authdatas,
                            moment_permission: permission
                        }, (error, response) => {
                            Loading.hide();
                            if (error) {
                                alertMsg('设置朋友圈权限失败：' + error.message);
                                return;
                            }
                            if (response && response.success) {
                                const permissionText = permission === 'allow' ? '同意' : '拒绝';
                                Swal.fire({
                                    icon: 'success',
                                    title: '设置成功',
                                    text: `已${permissionText} ${displayName} 查看你的朋友圈`,
                                    timer: 1500,
                                    showConfirmButton: false
                                });
                            } else {
                                alertMsg('设置朋友圈权限失败：' + (response ? response.message : '未知错误'));
                            }
                        }, {
                            url: '/api/update_moment_permission/',
                            timeout: 10000
                        });
                    } catch (error) {
                        Loading.hide();
                        alertMsg('设置朋友圈权限失败：' + error.message);
                    }
                }
            });
        });
        modifydelgroup_g.addEventListener('click', async function () {
            if (!appState.selectedContact) {
                alertMsg('请先选择一个联系人');
                return;
            }
            const isGroup = appState.selectedContact.isGroup ||
                appState.selectedContact.type === 'group' ||
                appState.selectedContact.conversationId?.startsWith('group_');

            if (!isGroup) {
                alertMsg('只有群聊才能执行退出操作');
                return;
            }

            const { contactId, conversationId, uname, group_name } = appState.selectedContact;
            const groupDisplayName = group_name || uname || '该群聊';
            const result = await Swal.fire({
                title: '退出群聊',
                html: `
            <div style="text-align: left; margin: 10px 0;">
                <p style="color: #f56c6c; margin-bottom: 15px;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>
                    警告：此操作不可逆！
                </p>
                <p>确定要退出群聊 <strong>${escapeHtml(groupDisplayName)}</strong> 吗？</p>
                <p style="font-size: 12px; color: #999; margin-top: 10px;">
                    退出后，您将不再接收该群聊的消息，且无法查看历史聊天记录。
                </p>
            </div>
        `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: '确定退出',
                cancelButtonText: '取消',
                didOpen: (popup) => {
                    const container = popup.closest('.swal2-container');
                    if (container) {
                        container.style.zIndex = '999999999';
                    }
                },
            });

            if (!result.isConfirmed) {
                return;
            }
            try {
                Loading.show('正在退出群聊...');
                const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
                plugin_post_requests({
                    dfid: contactId,
                    UserId: authdatas
                }, async (error, response) => {
                    Loading.hide();
                    if (error) {
                        alertMsg('退出群聊失败：' + error.message);
                        return;
                    }
                    if (response && response.success) {
                        if (appState.groups) {
                            appState.groups = appState.groups.filter(group => {
                                const groupId = group.contactId || group.group_id || group.conversationId;
                                return groupId !== contactId && `group_${groupId}` !== contactId;
                            });
                        }
                        if (appState.selectedContact &&
                            (appState.selectedContact.contactId === contactId ||
                                appState.selectedContact.conversationId === conversationId)) {
                            unselectContact();
                        }
                        await renderContacts();
                        Swal.fire({
                            icon: 'success',
                            title: '退出成功',
                            text: `已成功退出群聊 ${groupDisplayName}`,
                            timer: 1500,
                            showConfirmButton: false
                        });
                    } else {
                        alertMsg('退出群聊失败：' + (response ? response.message : '未知错误'));
                    }
                }, {
                    url: '/api/quitgroup/',
                    timeout: 10000
                });

            } catch (error) {
                Loading.hide();
                alertMsg('退出群聊失败：' + error.message);
            }
        });
        if (modifyaddnewnotices_sg) {
            modifyaddnewnotices_sg.addEventListener('click', async function () {
                if (!appState.selectedContact) {
                    alertMsg('请先选择一个联系人');
                    return;
                }
                const isGroup = appState.selectedContact.isGroup ||
                    appState.selectedContact.type === 'group' ||
                    appState.selectedContact.conversationId?.startsWith('group_');
                if (!isGroup) {
                    alertMsg('只有群聊才能执行添加新成员操作');
                }
                Swal.fire({
                    title: '发布群公告',
                    html: `
            <div style="text-align: left;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">公告标题 <span style="color: #f56c6c;">*</span></label>
                    <input type="text" id="announcement-title" class="swal2-input" placeholder="请输入公告标题" style="width: 100%; box-sizing: border-box;">
                    <div style="font-size: 12px; color: #999; margin-top: 4px;">不超过30个字</div>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">公告内容 <span style="color: #f56c6c;">*</span></label>
                    <textarea id="announcement-content" class="swal2-textarea" placeholder="请输入公告内容" rows="5" style="width: 100%; box-sizing: border-box; resize: vertical;"></textarea>
                    <div style="font-size: 12px; color: #999; margin-top: 4px;">不超过300个字</div>
                </div>
                <div style="margin-bottom: 5px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="announcement-top"> 
                        <span>置顶公告</span>
                    </label>
                </div>
            </div>
        `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: '发布',
                    cancelButtonText: '取消',
                    confirmButtonColor: '#409eff',
                    cancelButtonColor: '#909399',
                    preConfirm: () => {
                        const title = document.getElementById('announcement-title').value.trim();
                        const content = document.getElementById('announcement-content').value.trim();
                        const isTop = document.getElementById('announcement-top').checked;
                        if (!title) {
                            Swal.showValidationMessage('请输入公告标题');
                            return false;
                        }
                        if (title.length > 30) {
                            Swal.showValidationMessage('公告标题不能超过30个字');
                            return false;
                        }
                        if (!content) {
                            Swal.showValidationMessage('请输入公告内容');
                            return false;
                        }
                        if (content.length > 300) {
                            Swal.showValidationMessage('公告内容不能超过300个字');
                            return false;
                        }
                        return { title, content, isTop: isTop ? 1 : 0 };
                    }
                }).then(async (result) => {
                    if (result.isConfirmed && result.value) {
                        await mokim_publishAnnouncement(result.value.title, result.value.content, result.value.isTop);
                    }
                });
            });
        }
        if (modifysearching_grouplog) {
            modifysearching_grouplog.addEventListener('click', async function () {
                if (!appState.selectedContact) {
                    alertMsg('请先选择一个联系人');
                    return;
                }
                const isGroup = appState.selectedContact.isGroup ||
                    appState.selectedContact.type === 'group' ||
                    appState.selectedContact.conversationId?.startsWith('group_');
                if (!isGroup) {
                    alertMsg('只有群聊才能执行查看日志操作');
                    return;
                }
                const groupId = appState.selectedContact.group_id ||
                    appState.selectedContact.contactId?.replace('group_', '');
                if (!groupId) {
                    alertMsg('获取群聊信息失败');
                    return;
                }
                const isAdmin = appState.selectedContact.is_admin === true;
                const isOwner = appState.selectedContact.owner_id === appState.userId;
                mokim_group_showGroupLogModal(groupId, isOwner, isAdmin);
            });
        }
        if (modifybreakgroupr) {
            modifybreakgroupr.addEventListener('click', async function () {
                if (!appState.selectedContact) {
                    alertMsg('请先选择一个联系人');
                    return;
                }
                const isGroup = appState.selectedContact.isGroup ||
                    appState.selectedContact.type === 'group' ||
                    appState.selectedContact.conversationId?.startsWith('group_');
                if (!isGroup) {
                    alertMsg('只有群聊才能执行销毁操作');
                    return;
                }
                const { contactId, conversationId, uname, group_name } = appState.selectedContact;
                const groupDisplayName = group_name || uname || '该群聊';
                const result = await Swal.fire({
                    title: '解散群聊',
                    html: `
            <div style="text-align: left; margin: 10px 0;">
                <p style="color: #f56c6c; margin-bottom: 15px;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>
                    警告：此操作不可逆！
                </p>
                <p>确定要解散群聊 <strong>${escapeHtml(groupDisplayName)}</strong> 吗？</p>
                <p style="font-size: 12px; color: #999; margin-top: 10px;">
                    解散后，您将不再接收该群聊的消息，且无法查看历史聊天记录。
                </p>
            </div>
        `,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: '确定解散',
                    cancelButtonText: '取消',
                    didOpen: (popup) => {
                        const container = popup.closest('.swal2-container');
                        if (container) {
                            container.style.zIndex = '999999999';
                        }
                    },
                });
                if (!result.isConfirmed) {
                    return;
                }
                try {
                    Loading.show('正在解散群聊...');
                    const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
                    plugin_post_requests({
                        dfid: contactId,
                        UserId: authdatas
                    }, async (error, response) => {
                        Loading.hide();
                        if (error) {
                            alertMsg('解散群聊失败：' + error.message);
                            return;
                        }
                        if (response && response.success) {
                            if (appState.groups) {
                                appState.groups = appState.groups.filter(group => {
                                    const groupId = group.contactId || group.group_id || group.conversationId;
                                    return groupId !== contactId && `group_${groupId}` !== contactId;
                                });
                            }
                            if (appState.selectedContact &&
                                (appState.selectedContact.contactId === contactId ||
                                    appState.selectedContact.conversationId === conversationId)) {
                                unselectContact();
                            }
                            await renderContacts();
                            Swal.fire({
                                icon: 'success',
                                title: '解散成功',
                                text: `已成功解散群聊 ${groupDisplayName}`,
                                timer: 1500,
                                showConfirmButton: false
                            });
                        } else {
                            alertMsg('解散群聊失败：' + (response ? response.message : '未知错误'));
                        }
                    }, {
                        url: '/api/destorygroup/',
                        timeout: 10000
                    });

                } catch (error) {
                    Loading.hide();
                    alertMsg('解散群聊失败：' + error.message);
                }
            });
        }
        if (modifyupdategroupinfoin) {
            modifyupdategroupinfoin.addEventListener('click', async function () {
                if (!appState.selectedContact) {
                    alertMsg('请先选择一个联系人');
                    return;
                }
                const isGroup = appState.selectedContact.isGroup ||
                    appState.selectedContact.type === 'group' ||
                    appState.selectedContact.conversationId?.startsWith('group_');
                if (!isGroup) {
                    alertMsg('只有群聊才能执行修改操作');
                    return;
                }
                mok_im_group_infosupdates_gg(appState.selectedContact);
            });
        }
        modifyAliasBtn.addEventListener('click', function () {
            if (!appState.selectedContact) {
                alertMsg('请先选择一个联系人');
                return;
            }
            const { contactId, uname } = appState.selectedContact;
            const currentAlias = appState.selectedContact.friendAlias || uname || '';
            Swal.fire({
                title: '修改备注',
                html: `
                    <div style="text-align: left; margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px; color: #666;">当前备注：${currentAlias}</label>
                    </div>
                    <input type="text" id="swal-alias-input" class="swal2-input" placeholder="请输入新的备注" value="${currentAlias}">
                `,
                showCancelButton: true,
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                preConfirm: () => {
                    const newAlias = document.getElementById('swal-alias-input').value.trim();
                    if (!newAlias) {
                        Swal.showValidationMessage('备注不能为空');
                        return false;
                    }
                    if (newAlias.length > 15) {
                        Swal.showValidationMessage('备注不能超过15个字符');
                        return false;
                    }
                    return newAlias;
                }
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    updateContactAlias(contactId, result.value);
                }
            });
        });
        if (modifygroupinvitayion_gglog) {
            modifygroupinvitayion_gglog.addEventListener('click', function () {
                if (!appState.selectedContact) {
                    alertMsg('请先选择一个联系人');
                    return;
                }
                const isGroup = appState.selectedContact.isGroup ||
                    appState.selectedContact.type === 'group' ||
                    appState.selectedContact.conversationId?.startsWith('group_');
                if (!isGroup) {
                    alertMsg('只有群聊才能邀请好友');
                    return;
                }
                const groupId = appState.selectedContact.group_id ||
                    appState.selectedContact.contactId?.replace('group_', '');
                const groupName = appState.selectedContact.group_name || appState.selectedContact.uname || '该群聊';
                const friendsList = (appState.contacts || []).filter(contact => {
                    return contact.contactId && !contact.isGroup;
                });

                if (friendsList.length === 0) {
                    alertMsg('暂无好友可邀请');
                    return;
                }
                let selectedFriends = new Set();
                const modalHtml = `
            <div id="inviteFriendsModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="background: #fff; border-radius: 12px; width: 90%; max-width: 500px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                    <div style="padding: 16px 20px; border-bottom: 1px solid #e8e8e8; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 18px;">
                            <i class="fas fa-user-plus" style="margin-right: 8px; color: #409eff;"></i>
                            邀请好友加入群聊
                        </h3>
                        <button id="closeInviteModalBtn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">&times;</button>
                    </div>
                    <div style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0;">
                        <div style="font-size: 13px; color: #666;">
                            <i class="fas fa-info-circle"></i> 正在邀请加入：<strong>${escapeHtml(groupName)}</strong>
                        </div>
                        <div style="margin-top: 8px;">
                            <input type="text" id="friendSearchInput" placeholder="搜索好友" style="width: 100%; padding: 8px 12px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 13px;">
                        </div>
                    </div>
                    <div style="flex: 1; overflow-y: auto; padding: 0 20px;" id="friendsListContainer">
                        <div style="text-align: center; padding: 20px;">
                            <i class="fas fa-spinner fa-pulse" style="font-size: 24px; color: #409eff;"></i>
                            <p style="margin-top: 12px; color: #999;">加载好友列表中...</p>
                        </div>
                    </div>
                    <div style="padding: 12px 20px; border-top: 1px solid #e8e8e8; display: flex; justify-content: space-between; align-items: center;">
                        <span id="selectedCount" style="font-size: 13px; color: #666;">已选择 0 位好友</span>
                        <button id="sendInviteBtn" style="padding: 8px 16px; background: #409eff; color: #fff; border: none; border-radius: 4px; cursor: pointer;" disabled>发送邀请</button>
                    </div>
                </div>
            </div>
        `;
                const existingModal = document.getElementById('inviteFriendsModal');
                if (existingModal) {
                    existingModal.remove();
                }
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                const modal = document.getElementById('inviteFriendsModal');
                const closeBtn = document.getElementById('closeInviteModalBtn');
                const friendsContainer = document.getElementById('friendsListContainer');
                const sendBtn = document.getElementById('sendInviteBtn');
                const selectedCountSpan = document.getElementById('selectedCount');
                const searchInput = document.getElementById('friendSearchInput');
                modal.style.display = 'flex';
                const closeModal = () => {
                    modal.style.display = 'none';
                    setTimeout(() => modal.remove(), 300);
                };

                closeBtn.addEventListener('click', closeModal);
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) closeModal();
                });
                function renderFriendsList(filterText = '') {
                    let filteredFriends = friendsList;
                    if (filterText.trim()) {
                        const lowerFilter = filterText.trim().toLowerCase();
                        filteredFriends = friendsList.filter(friend => {
                            const displayName = friend.friendAlias || friend.uname || '';
                            return displayName.toLowerCase().includes(lowerFilter);
                        });
                    }

                    if (filteredFriends.length === 0) {
                        friendsContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-user-friends" style="font-size: 48px; color: #ddd;"></i>
                        <p style="margin-top: 12px; color: #999;">暂无好友</p>
                    </div>
                `;
                        return;
                    }

                    let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
                    filteredFriends.forEach(friend => {
                        const friendId = friend.contactId;
                        const displayName = friend.friendAlias || friend.uname || '未知';
                        const isChecked = selectedFriends.has(friendId);
                        html += `
                    <li class="invite-friend-item" data-friend-id="${escapeHtml(friendId)}" style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; cursor: pointer; display: flex; align-items: center; gap: 12px;">
                        <input type="checkbox" class="invite-friend-checkbox" data-friend-id="${escapeHtml(friendId)}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: #333;">${escapeHtml(displayName)}</div>
                            <div style="font-size: 12px; color: #999;">ID: ${escapeHtml(friendId)}</div>
                        </div>
                    </li>
                `;
                    });
                    html += '</ul>';
                    friendsContainer.innerHTML = html;
                    document.querySelectorAll('.invite-friend-checkbox').forEach(checkbox => {
                        checkbox.addEventListener('change', (e) => {
                            e.stopPropagation();
                            const friendId = checkbox.dataset.friendId;
                            if (checkbox.checked) {
                                selectedFriends.add(friendId);
                            } else {
                                selectedFriends.delete(friendId);
                            }
                            updateSelectedCount();
                        });
                    });
                    document.querySelectorAll('.invite-friend-item').forEach(item => {
                        const checkbox = item.querySelector('.invite-friend-checkbox');
                        item.addEventListener('click', (e) => {
                            if (e.target !== checkbox && !checkbox.contains(e.target)) {
                                checkbox.checked = !checkbox.checked;
                                const friendId = checkbox.dataset.friendId;
                                if (checkbox.checked) {
                                    selectedFriends.add(friendId);
                                } else {
                                    selectedFriends.delete(friendId);
                                }
                                updateSelectedCount();
                            }
                        });
                    });
                }

                function updateSelectedCount() {
                    const count = selectedFriends.size;
                    selectedCountSpan.textContent = `已选择 ${count} 位好友`;
                    sendBtn.disabled = count === 0;
                }
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        renderFriendsList(e.target.value);
                    });
                }
                sendBtn.addEventListener('click', async () => {
                    const selectedIds = Array.from(selectedFriends);
                    if (selectedIds.length === 0) {
                        alertMsg('请至少选择一位好友');
                        return;
                    }
                    const confirmResult = await Swal.fire({
                        title: '确认邀请',
                        html: `确定要邀请 <strong>${selectedIds.length}</strong> 位好友加入群聊 <strong>${escapeHtml(groupName)}</strong> 吗？`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: '确定邀请',
                        cancelButtonText: '取消'
                    });

                    if (!confirmResult.isConfirmed) {
                        return;
                    }

                    if (!appState.isConnected || !appState.ws || appState.ws.readyState !== WebSocket.OPEN) {
                        alertMsg('连接已断开，请刷新页面重试');
                        return;
                    }
                    Loading.show(`正在向 ${selectedIds.length} 位好友发送邀请...`);
                    let successCount = 0;
                    let failCount = 0;
                    for (const friendId of selectedIds) {
                        try {
                            const friend = friendsList.find(f => f.contactId === friendId);
                            const friendName = friend ? (friend.friendAlias || friend.uname || '好友') : '好友';
                            const conversationId_f = friend?.conversationId || friendId;
                            const inviteMessage = {
                                type: 'new_message',
                                data: {
                                    messageId: generateUniqueId(),
                                    conversationId: conversationId_f,
                                    senderId: appState.userId,
                                    receiverId: friendId,
                                    messageType: 'invite_group',
                                    content: {
                                        groupId: groupId,
                                        groupName: groupName,
                                        inviterName: getCurrentUserName(),
                                        inviteTime: Date.now(),
                                        text: `邀请你加入群聊「${groupName}」`
                                    },
                                    sendTime: Date.now()
                                }
                            };
                            appState.ws.send(JSON.stringify(inviteMessage));
                            successCount++;
                            await new Promise(resolve => setTimeout(resolve, 100));
                        } catch (error) {
                            console.error(`邀请好友 ${friendId} 失败:`, error);
                            failCount++;
                        }
                    }
                    Loading.hide();
                    if (successCount > 0) {
                        alertMsg(`已向 ${successCount} 位好友发送邀请${failCount > 0 ? `，${failCount} 位发送失败` : ''}`);
                        closeModal();
                    } else {
                        alertMsg('邀请发送失败，请重试');
                    }
                });
                renderFriendsList('');
            });
        }
        modifyaliasgbtn.addEventListener('click', function () {
            if (!appState.selectedContact) {
                alertMsg('请先选择一个联系人');
                return;
            }
            const { contactId, uname } = appState.selectedContact;
            const currentAlias = appState.selectedContact.friendAlias || uname || '';
            Swal.fire({
                title: '修改备注',
                html: `
                    <div style="text-align: left; margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px; color: #666;">当前备注：${currentAlias}</label>
                    </div>
                    <input type="text" id="swal-alias-input" class="swal2-input" placeholder="请输入新的备注" value="${currentAlias}">
                `,
                showCancelButton: true,
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                preConfirm: () => {
                    const newAlias = document.getElementById('swal-alias-input').value.trim();
                    if (!newAlias) {
                        Swal.showValidationMessage('备注不能为空');
                        return false;
                    }
                    if (newAlias.length > 15) {
                        Swal.showValidationMessage('备注不能超过15个字符');
                        return false;
                    }
                    return newAlias;
                }
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    updateContactgroupAlias(contactId, result.value);
                }
            });
        });
        modifygcoinsBtn.addEventListener('click', function () {
            if (!appState.selectedContact) {
                alertMsg('请先选择一个联系人');
                return;
            }
            const { contactId } = appState.selectedContact;
            Swal.fire({
                title: '转赠G币',
                html: `
        <input type="number" id="swal-gcoins-input" class="swal2-input" placeholder="请输入要转赠的G币数量" value="">
        <textarea id="swal-gcoins-textarea" class="swal2-textarea" placeholder="转赠留言(可不填写)"></textarea>
        <p style="font-size: 12px; color: #999;">转赠G币后,对方将收到通知(G币转赠不计入亲密度计算)</p>
    `,
                showCancelButton: true,
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                preConfirm: () => {
                    const newgcoinsStr = document.getElementById('swal-gcoins-input').value.trim();
                    const newgcoinstext = document.getElementById('swal-gcoins-textarea').value.trim();
                    if (!newgcoinsStr) {
                        Swal.showValidationMessage('转赠G币数量不能为空');
                        return false;
                    }
                    const newgcoins = Number(newgcoinsStr);
                    if (isNaN(newgcoins)) {
                        Swal.showValidationMessage('转赠G币数量必须是有效数字');
                        return false;
                    }
                    if (newgcoins <= 0) {
                        Swal.showValidationMessage('转赠G币数量必须大于0');
                        return false;
                    }
                    if (newgcoinstext.length > 30) {
                        Swal.showValidationMessage('转赠留言不能超过30个字符');
                        return false;
                    }
                    return {
                        amount: newgcoins,
                        message: newgcoinstext
                    };
                }
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    updatelocalgcoins(contactId, result.value.amount, result.value.message);
                }
            });
        });
        modifygroupsf.addEventListener('click', function () {
            if (!appState.selectedContact) {
                alertMsg('请先选择一个联系人');
                return;
            }
            const { contactId } = appState.selectedContact;
            Swal.fire({
                title: '修改分组',
                html: `
                    <input type="text" id="swal-grf-input" class="swal2-input" placeholder="请输入要修改的组别名" value="">
                `,
                showCancelButton: true,
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                preConfirm: () => {
                    const newgf = document.getElementById('swal-grf-input').value.trim();
                    if (!newgf) {
                        Swal.showValidationMessage('分组别名不能为空');
                        return false;
                    }
                    if (newgf.length > 8) {
                        Swal.showValidationMessage('分组别名不能超过8个字符');
                        return false;
                    }
                    return newgf;
                }
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    updatelocalgrf(contactId, result.value);
                }
            });
        });
    }
    async function updatelocalgrf(contactId, newgrname) {
        try {
            const authdatas = await tmd_newcontroler.writenewwords(contactId);
            plugin_post_requests({
                dfid: authdatas,
                UserId: appState.userId,
                grname: newgrname
            }, (error, response) => {
                if (error) {
                    alertMsg('修改组别名失败：' + error.message);
                    return;
                }
                if (response && response.success) {
                    updateLocalgr(contactId, newgrname);
                    alertMsg('组别名修改成功');
                } else {
                    alertMsg('修改组别名失败：' + (response ? response.message : '未知错误'));
                }
            }, {
                url: '/api/updategrfname/',
                timeout: 10000
            });
        } catch (error) {
            alertMsg('修改组别名失败：' + error.message);
        }
    }
    function updateLocalgr(contactId, newgr) {
        if (appState.contacts) {
            appState.contacts = appState.contacts.map(contact => {
                if (contact.contactId === contactId) {
                    return {
                        ...contact,
                        friend_group: newgr
                    };
                }
                return contact;
            });
        }
        if (appState.groups) {
            appState.groups = appState.groups.map(group => {
                if (group.contactId === contactId) {
                    return {
                        ...group,
                        groupname: newgr
                    };
                }
                return group;
            });
        }
        if (appState.selectedContact && appState.selectedContact.contactId === contactId) {
            appState.selectedContact.friend_group = newgr;
        }
    }
    async function updatelocalgcoins(contactId, gcoins, gcointext) {
        try {
            const authdatas = await tmd_newcontroler.writenewwords(contactId);
            plugin_post_requests({
                dfid: authdatas,
                UserId: appState.userId,
                gcoin: gcoins,
                gcointext: gcointext || ''
            }, (error, response) => {
                if (error) {
                    alertMsg('转赠G币失败：' + error.message);
                    return;
                }
                if (response && response.success) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Love Greeting',
                        text: "对方已收到转账...",
                        showConfirmButton: false,
                        timer: 5000,
                        background: '#e8f4fd',
                        iconColor: '#409eff',
                        didOpen: (popup) => {
                            popup.addEventListener('click', () => {
                                Swal.close();
                            });
                        }
                    });
                    mokim_AnimationEngine.play('loveup', null, {
                        type: 'both',
                        coinAmount: gcoins,
                        intimacyAmount: 15,
                        duration: 3500
                    });
                    const now = new Date();
                    const timeStr = now.toLocaleString('zh-CN', { hour12: false });
                    const conversationId = appState.selectedContact?.conversationId;
                    if (appState && appState.isConnected && appState.ws && appState.ws.readyState === WebSocket.OPEN) {
                        const giftMessage = {
                            type: 'system_i_msg',
                            data: {
                                receiverId: contactId,
                                messageType: 'system',
                                content: {
                                    systemText: `您有一条新的G币转赠通知,请及时查看~`,
                                    giftAmount: gcoins,
                                    giftType: 'gcoin'
                                },
                                sendTime: Date.now()
                            }
                        };
                        const selfSystemMsg = {
                            type: 'new_message',
                            data: {
                                messageId: generateUniqueId(),
                                conversationId: conversationId,
                                senderId: 'system',
                                receiverId: contactId,
                                messageType: 'system',
                                content: {
                                    systemText: `您于 ${timeStr} 向对方转赠 ${gcoins} G币`
                                },
                                sendTime: Date.now()
                            }
                        };
                        const targetSystemMsg = {
                            type: 'new_message',
                            data: {
                                messageId: generateUniqueId(),
                                conversationId: conversationId,
                                senderId: 'system',
                                receiverId: contactId,
                                messageType: 'system',
                                content: {
                                    systemText: `对方于 ${timeStr} 向您转赠 ${gcoins} G币,请及时在站内信处查看详情`
                                },
                                sendTime: Date.now()
                            }
                        };
                        appState.ws.send(JSON.stringify(giftMessage));
                        appState.ws.send(JSON.stringify(targetSystemMsg));
                        saveMessageToDB(selfSystemMsg.data).then(() => {
                            if (appState.selectedContact?.conversationId === conversationId) {
                                refreshChatWindow(selfSystemMsg.data);
                                renderContacts();
                            }
                        });
                    } else {
                        console.warn('当前已掉线,G币转赠通知未发送');
                    }
                } else {
                    alertMsg('转赠G币失败：' + (response ? response.message : '未知错误'));
                }
            }, {
                url: '/api/gcoinfec/',
                timeout: 10000
            });
        } catch (error) {
            alertMsg('转赠G币失败' + error.message);
        }
    }
    async function updateContactAlias(contactId, newAlias) {
        try {
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            plugin_post_requests({
                dfid: contactId,
                UserId: authdatas,
                Alias: newAlias
            }, (error, response) => {
                if (error) {
                    alertMsg('修改备注失败：' + error.message);
                    return;
                }
                if (response && response.success) {
                    updateLocalAlias(contactId, newAlias);
                    alertMsg('备注修改成功');
                } else {
                    alertMsg('修改备注失败：' + (response ? response.message : '未知错误'));
                }
            }, {
                url: '/api/updatealias/',
                timeout: 10000
            });
        } catch (error) {
            alertMsg('修改备注失败：' + error.message);
        }
    }
    async function updateContactgroupAlias(contactId, newAlias) {
        try {
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            plugin_post_requests({
                dfid: contactId,
                UserId: authdatas,
                Alias: newAlias
            }, (error, response) => {
                if (error) {
                    alertMsg('修改备注失败：' + error.message);
                    return;
                }
                if (response && response.success) {
                    updateLocalAlias(contactId, newAlias);
                    alertMsg('备注修改成功');
                } else {
                    alertMsg('修改备注失败：' + (response ? response.message : '未知错误'));
                }
            }, {
                url: '/api/updatealiasg/',
                timeout: 10000
            });
        } catch (error) {
            alertMsg('修改备注失败：' + error.message);
        }
    }
    function updateLocalAlias(contactId, newAlias) {
        if (appState.contacts) {
            appState.contacts = appState.contacts.map(contact => {
                if (contact.contactId === contactId) {
                    return {
                        ...contact,
                        friendAlias: newAlias
                    };
                }
                return contact;
            });
        }
        if (appState.groups) {
            const rawId = contactId?.toString() || '';
            const tx_contactid = rawId.startsWith('group_') ? rawId.slice(6) : rawId;
            appState.groups = appState.groups.map(group => {
                const groupId = group.group_id?.toString();
                const contactIdStr = group.contactId?.toString();
                if (contactIdStr === tx_contactid || groupId === tx_contactid) {
                    return {
                        ...group,
                        friendAlias: newAlias,
                        galias: newAlias
                    };
                }
                return group;
            });
        }
        if (appState.selectedContact && appState.selectedContact.contactId === contactId) {
            appState.selectedContact.friendAlias = newAlias;
        }
    }
    async function person_bin_status(updatedIsPinned) {
        try {
            const { conversationId, contactId } = appState.selectedContact;
            appState.contacts = appState.contacts.map(contact => {
                if (contact.conversationId === conversationId) {
                    return {
                        ...contact,
                        isPinned: updatedIsPinned
                    };
                }
                return contact;
            });
            appState.groups = appState.groups.map(group => {
                if (group.conversationId === conversationId) {
                    return {
                        ...group,
                        isPinned: updatedIsPinned
                    };
                }
                return group;
            });
            await renderContacts();
            await renderGroups();
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            const xpax_num = updatedIsPinned ? 1 : 0;
            plugin_post_requests(
                {
                    dfid: contactId,
                    UserId: authdatas,
                    Pinned: xpax_num,
                    type: 'friend'
                },
                (error, response) => {
                    if (error) {
                        alertMsg('置顶操作失败');
                        return;
                    }
                    if (response.success) {
                        alertMsg('置顶操作成功');
                    } else {
                        alertMsg('置顶操作失败');
                    }
                },
                {
                    url: '/api/pinnedcontact/',
                }
            );
        } catch (error) {
            alertMsg('置顶操作失败：' + error.message);
        }
    }
    async function group_bin_status(updatedIsPinned) {
        try {
            const { conversationId, contactId } = appState.selectedContact;
            appState.groups = appState.groups.map(group => {
                const groupConvId = group.conversationId || `group_${group.group_id}`;
                if (groupConvId === conversationId || group.group_id === conversationId) {
                    return {
                        ...group,
                        isPinned: updatedIsPinned
                    };
                }
                return group;
            });
            appState.contacts = appState.contacts.map(contact => {
                if (contact.conversationId === conversationId) {
                    return {
                        ...contact,
                        isPinned: updatedIsPinned
                    };
                }
                return contact;
            });
            if (appState.selectedContact &&
                (appState.selectedContact.conversationId === conversationId ||
                    appState.selectedContact.contactId === contactId)) {
                appState.selectedContact.isPinned = updatedIsPinned;
            }
            await renderContacts();
            await renderGroups();
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            const xpax_num = updatedIsPinned ? 1 : 0;
            plugin_post_requests(
                {
                    dfid: contactId,
                    UserId: authdatas,
                    Pinned: xpax_num,
                    type: 'group'
                },
                (error, response) => {
                    if (error) {
                        alertMsg('置顶操作失败：' + (error.message || '网络错误'));
                        return;
                    }
                    if (response && response.success) {
                        alertMsg(updatedIsPinned ? '群聊置顶成功' : '取消置顶成功');
                    } else {
                        alertMsg('置顶操作失败：' + (response ? response.message : '未知错误'));
                    }
                },
                {
                    url: '/api/pinnedcontact/',
                    timeout: 10000
                }
            );
        } catch (error) {
            alertMsg('置顶操作失败：' + error.message);
        }
    }

    function handle_to_dowith_statuser(datatype, eventsta) {
        if (!appState.selectedContact) {
            return;
        }
        switch (datatype) {
            case 'person_pin':
                person_bin_status(eventsta);
                break;
            case 'group_pin':
                group_bin_status(eventsta);
                break;
            default:
                break;
        }
    }
    const switchElement = document.querySelectorAll('#switch-thumb-solots-ggovers');
    if (switchElement && switchElement.length > 0) {
        switchElement.forEach((element) => {
            element.addEventListener('click', function (event) {
                setTimeout(() => {
                    const newState = element.classList.contains('active');
                    const dataType = element.getAttribute('data_types');
                    if (dataType) {
                        handle_to_dowith_statuser(dataType, newState);
                        event.stopPropagation();
                    }
                }, 100);
            });
        });
    }
    window.updatelocalgrf = updatelocalgrf;
    window.updateContactAlias = updateContactAlias;
    window.mok_handleFriendAction = mok_handleFriendAction;
    window.mok_handlegroupaction_infoget = mok_im_group_infosupdates_gg;
})();