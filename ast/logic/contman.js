(function () {
    const triggerNav = document.getElementById('mailget-tabber-nav');
    const CONTACT_TRIGGER_ID = 'contact-nav-man-get';
    const triggerContactNav = document.getElementById(CONTACT_TRIGGER_ID) || document.querySelector('.nav-item i.fa-users')?.closest('.nav-item');
    if (!triggerContactNav) {
        return;
    }
    let modalMask = document.getElementById('contactManagerModal');
    if (!modalMask) {
        modalMask = document.createElement('div');
        modalMask.id = 'contactManagerModal';
        modalMask.className = 'contact-manager-mask';
        modalMask.innerHTML = `
            <div class="contact-manager-panel">
                <div class="contact-manager-header">
                    <h3><i class="fas fa-address-book"></i> 联系人管理</h3>
                    <button class="contact-manager-close" id="closeContactManagerBtn"><i class="fas fa-times"></i></button>
                </div>
                <div class="contact-tabs">
                    <div class="contact-tab-item active" data-tab="friends"><i class="fas fa-user-friends"></i> 好友</div>
                    <div class="contact-tab-item" data-tab="groups"><i class="fas fa-users"></i> 群聊</div>
                </div>
                <div class="contact-search-section">
                    <div class="contact-search-wrapper">
                        <i class="fas fa-search contact-search-icon"></i>
                        <input type="text" class="contact-search-input" placeholder="搜索联系人/群名称">
                    </div>
                    <div class="contact-actions">
                        <button class="contact-add-btn" title="添加联系人/群"><i class="fas fa-user-plus"></i></button>
                        <button class="contact-requests-btn" title="待处理申请"><i class="fas fa-bell"></i><span class="request-badge" style="display:none;">0</span></button>
                    </div>
                </div>
                <div class="contact-groups-container" id="contactGroupsContainer">
                </div>
                <div class="contact-side-panel" id="contactSidePanel" style="display: none;">
                    <div class="contact-side-header">
                        <span class="contact-side-title">联系人操作</span>
                        <button class="contact-side-close"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="contact-side-content" id="contactSideContent">
                    </div>
                </div>
                <div class="contact-empty-state" id="contactEmptyState" style="display: none;">
                    <i class="fas fa-address-book"></i>
                    <p>暂无联系人</p>
                </div>
            </div>
        `;
        document.body.appendChild(modalMask);
    }
    const mask = modalMask;
    const closeBtn = document.getElementById('closeContactManagerBtn');
    const panel = mask.querySelector('.contact-manager-panel');
    const groupsContainer = document.getElementById('contactGroupsContainer');
    const sidePanel = document.getElementById('contactSidePanel');
    const sideContent = document.getElementById('contactSideContent');
    const sideClose = sidePanel?.querySelector('.contact-side-close');
    const emptyState = document.getElementById('contactEmptyState');
    const searchInput = mask.querySelector('.contact-search-input');
    const tabItems = mask.querySelectorAll('.contact-tab-item');
    const addBtn = mask.querySelector('.contact-add-btn');
    const requestsBtn = mask.querySelector('.contact-requests-btn');
    const requestBadge = mask.querySelector('.request-badge');

    let contactData = {
        friends: [],
        groups: [],
        friendGroups: []
    };
    let currentTab = 'friends';
    let selectedContact = null;
    let filterKeyword = '';

    function buildFriendGroups(friends) {
        const groupMap = new Map();
        friends.forEach(f => {
            const group = f.friend_group || '默认分组';
            if (!groupMap.has(group)) {
                groupMap.set(group, []);
            }
            groupMap.get(group).push(f);
        });
        return Array.from(groupMap.entries()).map(([groupName, items]) => ({
            groupName,
            items,
            count: items.length
        }));
    }

    function refreshContactData() {
        if (appState && appState.contacts) {
            contactData.friends = appState.contacts.map(c => ({
                ...c,
                contactId: c.contactId,
                uname: c.uname,
                friendAlias: c.friendAlias || c.uname,
                friend_group: c.friend_group || '默认分组',
                sayed: c.sayed || '暂无签名',
                createTime: c.createTime || '未知',
                avatarColor: c.avatarColor || '#409eff',
                isGroup: false
            }));
        } else {
            contactData.friends = [];
        }
        if (appState && appState.groups) {
            contactData.groups = appState.groups.map(g => ({
                ...g,
                contactId: g.contactId || g.group_id || g.conversationId?.replace('group_', ''),
                conversationId: g.conversationId || `group_${g.group_id}`,
                uname: g.group_name || g.uname || '群聊',
                friendAlias: g.galias || g.group_name || g.uname || '群聊',
                sayed: g.group_desc || g.notice || g.sayed || '暂无群介绍',
                createTime: g.create_time || g.created_at || '未知',
                avatarColor: g.avatarColor || '#909399',
                isGroup: true,
                memberCount: g.memberCount || g.max_member || 0,
                owner_id: g.owner_id,
                owner_name: g.owner_name,
                is_admin: g.is_admin || false,
                is_owner: g.is_owner || false,
                group_notice: g.group_notice || g.notice || '',
                searnum: g.searnum || ''
            }));
        } else {
            contactData.groups = [];
        }

        contactData.friendGroups = buildFriendGroups(contactData.friends);
        const pendingCount = 0;
        if (pendingCount > 0) {
            requestBadge.style.display = 'inline-block';
            requestBadge.textContent = pendingCount;
        } else {
            requestBadge.style.display = 'none';
        }
    }

    function filterContacts(items) {
        if (!filterKeyword) return items;
        const kw = filterKeyword.toLowerCase();
        return items.filter(item =>
            (item.uname && item.uname.toLowerCase().includes(kw)) ||
            (item.friendAlias && item.friendAlias.toLowerCase().includes(kw)) ||
            (item.group_name && item.group_name.toLowerCase().includes(kw))
        );
    }
    function renderGroups() {
        groupsContainer.innerHTML = '';
        let hasAny = false;

        if (currentTab === 'friends') {
            const groups = contactData.friendGroups;
            groups.forEach(group => {
                const filteredItems = filterContacts(group.items);
                if (filteredItems.length === 0) return;
                hasAny = true;

                const groupDiv = document.createElement('div');
                groupDiv.className = 'contact-group';
                groupDiv.dataset.group = group.groupName;

                const header = document.createElement('div');
                header.className = 'group-header';
                header.innerHTML = `
                    <span class="group-title"><i class="fas fa-users"></i> ${escapeHtml(group.groupName)} <span class="group-count">${filteredItems.length}</span></span>
                    <span class="group-toggle"><i class="fas fa-chevron-down"></i></span>
                `;

                const content = document.createElement('div');
                content.className = 'group-content';

                filteredItems.forEach(friend => {
                    const item = document.createElement('div');
                    item.className = `contact-item ${selectedContact?.contactId === friend.contactId ? 'selected' : ''}`;
                    item.dataset.id = friend.contactId;
                    item.dataset.type = 'friend';
                    const avatarHtml = friend.tximg && friend.tximg !== '(&&)::avatar.jpg' ?
                        `<div class="contact-avatar" style="background-image: url(${escapeHtml(friend.tximg)}); background-size: cover; background-position: center; background-color: ${friend.avatarColor || '#409eff'};">` :
                        `<div class="contact-avatar" style="background-color: ${friend.avatarColor || '#409eff'};">${friend.uname?.charAt(0) || '?'}</div>`;
                    item.innerHTML = `
                       ${avatarHtml}</div>
                        <div class="contact-info">
                            <div class="contact-name">${escapeHtml(friend.friendAlias || friend.uname)} <span class="contact-alias">${friend.uname ? `(${escapeHtml(friend.uname)})` : ''}</span></div>
                            <div class="contact-signature">${escapeHtml(friend.sayed || '暂无签名')}</div>
                        </div>
                    `;
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        selectContactForSidePanel(friend, 'friend');
                    });
                    content.appendChild(item);
                });

                header.addEventListener('click', () => {
                    header.classList.toggle('collapsed');
                });

                groupDiv.appendChild(header);
                groupDiv.appendChild(content);
                groupsContainer.appendChild(groupDiv);
            });
        } else {
            const filteredGroups = filterContacts(contactData.groups);
            if (filteredGroups.length > 0) {
                hasAny = true;
                const sortedGroups = [...filteredGroups].sort((a, b) => {
                    if (a.is_owner && !b.is_owner) return -1;
                    if (!a.is_owner && b.is_owner) return 1;
                    if (a.is_admin && !b.is_admin) return -1;
                    if (!a.is_admin && b.is_admin) return 1;
                    return 0;
                });

                const groupDiv = document.createElement('div');
                groupDiv.className = 'contact-group';

                const header = document.createElement('div');
                header.className = 'group-header';
                header.innerHTML = `
                    <span class="group-title"><i class="fas fa-comments"></i> 我的群聊 <span class="group-count">${sortedGroups.length}</span></span>
                    <span class="group-toggle"><i class="fas fa-chevron-down"></i></span>
                `;

                const content = document.createElement('div');
                content.className = 'group-content';

                sortedGroups.forEach(group => {
                    const item = document.createElement('div');
                    item.className = `contact-item ${selectedContact?.contactId === group.contactId ? 'selected' : ''}`;
                    item.dataset.id = group.contactId;
                    item.dataset.type = 'group';
                    let roleBadge = '';
                    if (group.is_owner) {
                        roleBadge = '<span class="group-role-badge owner" title="群主"><i class="fas fa-crown"></i></span>';
                    } else if (group.is_admin) {
                        roleBadge = '<span class="group-role-badge admin" title="管理员"><i class="fas fa-shield-alt"></i></span>';
                    }
                    const metaInfo = [];
                    if (group.memberCount > 0) {
                        metaInfo.push(`<span class="group-meta-info"><i class="fas fa-users"></i> ${group.memberCount}人</span>`);
                    }
                    if (group.searnum) {
                        metaInfo.push(`<span class="group-meta-info"><i class="fas fa-hashtag"></i> ${group.searnum}</span>`);
                    }
                    const groupAvatarHtml = group.group_avatar && group.group_avatar !== '(&&)::avatar.jpg' ?
                        `<div class="contact-avatar group-avatar" style="background-image: url(${escapeHtml(group.group_avatar)}); background-size: cover; background-position: center; background-color: ${group.avatarColor || '#909399'};">` :
                        `<div class="contact-avatar group-avatar" style="background-color: ${group.avatarColor || '#909399'};">${group.uname?.charAt(0) || 'G'}</div>`;
                    item.innerHTML = `
                        ${groupAvatarHtml}</div>
                        <div class="contact-info">
                            <div class="contact-name">
                                ${escapeHtml(group.friendAlias || group.uname)}
                                ${roleBadge}
                            </div>
                            <div class="contact-signature">${escapeHtml(group.sayed || '群聊')}</div>
                            ${metaInfo.length ? `<div class="group-meta">${metaInfo.join('')}</div>` : ''}
                        </div>
                    `;

                    item.addEventListener('click', () => {
                        selectContactForSidePanel(group, 'group');
                    });

                    content.appendChild(item);
                });

                header.addEventListener('click', () => header.classList.toggle('collapsed'));
                groupDiv.appendChild(header);
                groupDiv.appendChild(content);
                groupsContainer.appendChild(groupDiv);
            }
        }

        if (!hasAny) {
            emptyState.style.display = 'flex';
            if (currentTab === 'groups') {
                emptyState.innerHTML = `
                    <i class="fas fa-users-slash"></i>
                    <p>暂无群聊</p>
                    <small>点击 + 号按钮创建或加入群聊</small>
                `;
            } else {
                emptyState.innerHTML = `
                    <i class="fas fa-address-book"></i>
                    <p>暂无联系人</p>
                `;
            }
            groupsContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            groupsContainer.style.display = 'block';
        }
    }

    function renderGroupDetailPanel(contact) {
        const isOwner = appState.userId === contact?.owner_id;
        const isAdmin = contact.is_admin === true;
        let roleText = '成员';
        let roleClass = 'member';
        if (isOwner) {
            roleText = '群主';
            roleClass = 'owner';
        } else if (isAdmin) {
            roleText = '管理员';
            roleClass = 'admin';
        }

        return `
            <div class="contact-detail-avatar group-detail-avatar" style="background-color: ${contact.avatarColor || '#909399'};">${contact.uname?.charAt(0) || 'G'}</div>
            <div class="contact-detail-name">${escapeHtml(contact.friendAlias || contact.uname)}</div>
            <div class="contact-detail-role role-${roleClass}">${roleText}</div>
            <div class="contact-detail-id">群号: ${escapeHtml(contact.searnum || contact.contactId || '未知')}</div>
            
            <div class="contact-detail-stats">
                <div class="stat-item">
                    <div class="stat-value">${contact.memberCount || '?'}</div>
                    <div class="stat-label">最大成员数量</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${contact.is_owner ? '是' : (contact.is_admin ? '管理员' : '成员')}</div>
                    <div class="stat-label">我的角色</div>
                </div>
            </div>
            
            <div class="contact-detail-item">
                <i class="fas fa-info-circle"></i> 
                <strong>群介绍：</strong> ${escapeHtml(contact.sayed || '暂无群介绍')}
            </div>
            <div class="contact-detail-item">
                <i class="fas fa-clock"></i> 
                <strong>创建时间：</strong> ${escapeHtml(contact.create_time || '未知')}
            </div>
            ${contact.owner_name ? `
            <div class="contact-detail-item">
                <i class="fas fa-crown"></i> 
                <strong>群主：</strong> ${escapeHtml(contact.owner_name)}
            </div>
            ` : ''}
            
            <div class="contact-detail-actions">
                <button class="btn-chat" id="sideSendMsg"><i class="fas fa-comment"></i> 发送消息</button>
                <button class="btn-secondary" id="sideGroupInfo"><i class="fas fa-info-circle"></i> 群资料</button>
                <button class="btn-secondary" id="sideDeleteConversation" style="background-color: #909399; color: #fff;"><i class="fas fa-trash-alt"></i> 删除聊天</button>
                ${isOwner ? `
                    <button class="btn-warning" id="sideEditGroup"><i class="fas fa-edit"></i> 编辑群资料</button>
                    <button class="btn-danger" id="sideDestroyGroup"><i class="fas fa-trash-alt"></i> 解散群聊</button>
                ` : `
                    <button class="btn-danger" id="sideExitGroup"><i class="fas fa-sign-out-alt"></i> 退出群聊</button>
                `}
            </div>
        `;
    }


    function renderFriendDetailPanel(contact) {
        return `
            <div class="contact-detail-avatar" style="background-color: ${contact.avatarColor || '#409eff'};">${contact.uname?.charAt(0) || '?'}</div>
            <div class="contact-detail-name">${escapeHtml(contact.friendAlias || contact.uname)}</div>
            <div class="contact-detail-id">ID: ${escapeHtml(contact.contactId)}</div>
            <div class="contact-detail-item"><i class="fas fa-tag"></i> ${escapeHtml(contact.friend_group || '默认分组')}</div>
            <div class="contact-detail-item"><i class="fas fa-clock"></i> 添加时间: ${escapeHtml(contact.createTime || '未知')}</div>
            <div class="contact-detail-item"><i class="fas fa-signature"></i> ${escapeHtml(contact.sayed || '暂无签名')}</div>
            <div class="contact-detail-actions">
                <button class="btn-chat" id="sideSendMsg"><i class="fas fa-comment"></i> 发送消息</button>
                <button class="btn-secondary" id="sideModifyAlias"><i class="fas fa-edit"></i> 修改备注</button>
                <button class="btn-secondary" id="sideMoveGroup"><i class="fas fa-users"></i> 移动分组</button>
                <button class="btn-secondary" id="sideDeleteConversation" style="background-color: #909399; color: #fff;"><i class="fas fa-trash-alt"></i> 删除聊天</button>
                <button class="btn-warning" id="sideBlockFriend"><i class="fas fa-ban"></i> 拉黑好友</button>
                <button class="btn-danger" id="sideDeleteFriend"><i class="fas fa-user-minus"></i> 删除好友</button>
            </div>
        `;
    }
    async function handleDeleteConversation(contact) {
        const conversationId = contact.conversationId;
        const contactName = contact.friendAlias || contact.uname || (contact.type === 'group' ? '该群聊' : '该联系人');
        const result = await Swal.fire({
            title: '删除聊天',
            text: `确定要删除与 ${contactName} 的聊天吗？聊天记录仍保留，但会话会从列表中隐藏。收到新消息时会自动恢复显示。`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '确认隐藏',
            cancelButtonText: '取消'
        });

        if (result.isConfirmed) {
            if (window.mokim_hideConversation && typeof window.mokim_hideConversation === 'function') {
                window.mokim_hideConversation(conversationId);
            }
            closeSidePanel();
            if (appState && appState.selectedContact &&
                appState.selectedContact.conversationId === conversationId) {
                if (window.unselectContact) window.unselectContact();
            }

            Swal.fire({
                icon: 'success',
                title: '已隐藏',
                text: `与 ${contactName} 的聊天已从列表中隐藏，收到新消息后会重新显示`,
                timer: 1500,
                showConfirmButton: false
            });
        }
    }
    function selectContactForSidePanel(contact, type) {
        selectedContact = { ...contact, type };
        document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('selected'));
        const targetItem = Array.from(document.querySelectorAll('.contact-item')).find(el => el.dataset.id === contact.contactId);
        if (targetItem) targetItem.classList.add('selected');
        if (type === 'group') {
            sideContent.innerHTML = renderGroupDetailPanel(contact);
        } else {
            sideContent.innerHTML = renderFriendDetailPanel(contact);
        }
        document.getElementById('sideSendMsg')?.addEventListener('click', () => {
            if (window.selectContact && typeof window.selectContact === 'function') {
                window.selectContact(contact);
            }
            closeDrawer();
        });

        if (type === 'friend') {
            document.getElementById('sideModifyAlias')?.addEventListener('click', () => {
                handleModifyAlias(contact);
            });
            document.getElementById('sideMoveGroup')?.addEventListener('click', () => {
                handleMoveGroup(contact);
            });
            document.getElementById('sideBlockFriend')?.addEventListener('click', async () => {
                await handleBlockFriend(contact);
            });
            document.getElementById('sideDeleteFriend')?.addEventListener('click', async () => {
                await handleDeleteFriend(contact);
            });
            document.getElementById('sideDeleteConversation')?.addEventListener('click', async () => {
                await handleDeleteConversation(contact);
            });
        } else {
            document.getElementById('sideGroupInfo')?.addEventListener('click', () => {
                showGroupInfo(contact);
            });
            document.getElementById('sideExitGroup')?.addEventListener('click', async () => {
                await handleExitGroup(contact);
            });
            document.getElementById('sideDeleteConversation')?.addEventListener('click', async () => {
                await handleDeleteConversation(contact);
            });
            const editGroupBtn = document.getElementById('sideEditGroup');
            if (editGroupBtn) {
                editGroupBtn.addEventListener('click', async () => {
                    await handleEditGroup(contact);
                });
            }
            const destroyGroupBtn = document.getElementById('sideDestroyGroup');
            if (destroyGroupBtn) {
                destroyGroupBtn.addEventListener('click', async () => {
                    await handleDestroyGroup(contact);
                });
            }
        }

        sidePanel.style.display = 'flex';
    }
    function showGroupInfo(group) {
        Swal.fire({
            title: '群资料',
            html: `
                <div style="text-align: left;">
                    <p><strong>群名称：</strong> ${escapeHtml(group.group_name || group.uname)}</p>
                    <p><strong>群号：</strong> ${escapeHtml(group.searnum || group.contactId)}</p>
                    <p><strong>群介绍：</strong> ${escapeHtml(group.group_desc || group.sayed || '暂无')}</p>
                    <p><strong>成员最大数量：</strong> ${group.memberCount || '?'} 人</p>
                    <p><strong>创建时间：</strong> ${escapeHtml(group.create_time || '未知')}</p>
                </div>
            `,
            confirmButtonText: '关闭',
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) container.style.zIndex = '999999999';
            }
        });
    }


    async function handleExitGroup(group) {
        const groupName = group.group_name || group.uname || '该群聊';
        const result = await Swal.fire({
            title: '退出群聊',
            html: `
                <div style="text-align: left;">
                    <p style="color: #f56c6c;">⚠️ 警告：此操作不可逆！</p>
                    <p>确定要退出群聊 <strong>${escapeHtml(groupName)}</strong> 吗？</p>
                    <p style="font-size: 12px; color: #999;">退出后，您将不再接收该群聊的消息。</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '确定退出',
            cancelButtonText: '取消',
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) container.style.zIndex = '999999999';
            }
        });

        if (!result.isConfirmed) return;

        try {
            Loading.show('正在退出群聊...');
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            plugin_post_requests({
                dfid: group.contactId,
                UserId: authdatas
            }, async (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg('退出群聊失败：' + error.message);
                    return;
                }
                if (response && response.success) {
                    if (appState.groups) {
                        appState.groups = appState.groups.filter(g => {
                            const gId = g.contactId || g.group_id || g.conversationId;
                            return gId !== group.contactId && `group_${gId}` !== group.contactId;
                        });
                    }
                    if (appState.selectedContact &&
                        (appState.selectedContact.contactId === group.contactId ||
                            appState.selectedContact.conversationId === group.conversationId)) {
                        unselectContact();
                    }
                    await renderContacts();
                    await renderGroups();
                    closeSidePanel();
                    Swal.fire({
                        icon: 'success',
                        title: '退出成功',
                        text: `已退出群聊 ${groupName}`,
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
    }
    async function handleEditGroup(group) {
        await window.mok_handlegroupaction_infoget(group);
    }
    async function handleDestroyGroup(group) {
        const groupName = group.group_name || group.uname || '该群聊';
        const result = await Swal.fire({
            title: '解散群聊',
            html: `
                <div style="text-align: left;">
                    <p style="color: #f56c6c;">⚠️ 警告：此操作不可逆！</p>
                    <p>确定要解散群聊 <strong>${escapeHtml(groupName)}</strong> 吗？</p>
                    <p style="font-size: 12px; color: #999;">解散后，所有成员将无法再访问此群聊，所有聊天记录将被清除。</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '确定解散',
            cancelButtonText: '取消',
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) container.style.zIndex = '999999999';
            }
        });

        if (!result.isConfirmed) return;

        try {
            Loading.show('正在解散群聊...');
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            plugin_post_requests({
                dfid: group.contactId,
                UserId: authdatas
            }, async (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg('解散群聊失败：' + error.message);
                    return;
                }
                if (response && response.success) {
                    if (appState.groups) {
                        appState.groups = appState.groups.filter(g => {
                            const gId = g.contactId || g.group_id || g.conversationId;
                            return gId !== group.contactId && `group_${gId}` !== group.contactId;
                        });
                    }
                    if (appState.selectedContact &&
                        (appState.selectedContact.contactId === group.contactId ||
                            appState.selectedContact.conversationId === group.conversationId)) {
                        unselectContact();
                    }
                    await renderContacts();
                    await renderGroups();
                    closeSidePanel();
                    Swal.fire({
                        icon: 'success',
                        title: '解散成功',
                        text: `群聊 ${groupName} 已解散`,
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
    }

    async function handleModifyAlias(contact) {
        const { contactId, uname } = contact;
        const currentAlias = contact.friendAlias || uname || '';

        Swal.fire({
            title: '修改备注',
            html: `
                <div style="text-align: left; margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; color: #666;">当前备注：${escapeHtml(currentAlias)}</label>
                </div>
                <input type="text" id="swal-alias-input" class="swal2-input" placeholder="请输入新的备注" value="${escapeHtml(currentAlias)}">
            `,
            showCancelButton: true,
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) container.style.zIndex = '999999999';
            },
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
    }

    async function handleMoveGroup(contact) {
        const { contactId } = contact;
        Swal.fire({
            title: '修改分组',
            html: `
                <input type="text" id="swal-grf-input" class="swal2-input" placeholder="请输入要修改的组别名" value="">
            `,
            showCancelButton: true,
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) container.style.zIndex = '999999999';
            },
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
    }

    async function handleBlockFriend(contact) {
        await mok_handleFriendAction('blacklist', contact);
        closeSidePanel();
        refreshContactData();
        renderGroups();
    }

    async function handleDeleteFriend(contact) {
        await mok_handleFriendAction('delete', contact);
        closeSidePanel();
        refreshContactData();
        renderGroups();
    }

    async function mok_handleFriendAction(actionType, contact) {
        if (window.mok_handleFriendAction) {
            const originalSelected = appState.selectedContact;
            appState.selectedContact = contact;
            try {
                await window.mok_handleFriendAction(actionType);
            } finally {
                appState.selectedContact = originalSelected;
            }
        } else {
            alertMsg(`功能待实现: ${actionType}`);
        }
    }

    async function updateContactAlias(contactId, newAlias) {
        if (window.updateContactAlias && window.updateContactAlias !== updateContactAlias) {
            const originalSelected = appState.selectedContact;
            appState.selectedContact = { contactId };
            try {
                await window.updateContactAlias(contactId, newAlias);
            } finally {
                appState.selectedContact = originalSelected;
            }
        } else {
            alertMsg(`修改备注为 ${newAlias}`);
            updateLocalAlias(contactId, newAlias);
        }
    }

    async function updatelocalgrf(contactId, newgrname) {
        if (window.updatelocalgrf && window.updatelocalgrf !== updatelocalgrf) {
            const originalSelected = appState.selectedContact;
            appState.selectedContact = { contactId };
            try {
                await window.updatelocalgrf(contactId, newgrname);
            } finally {
                appState.selectedContact = originalSelected;
            }
        } else {
            alertMsg(`修改分组为 ${newgrname}`);
            updateLocalGrp(contactId, newgrname);
        }
    }

    function updateLocalAlias(contactId, newAlias) {
        if (appState.contacts) {
            appState.contacts = appState.contacts.map(contact => {
                if (contact.contactId === contactId) {
                    return { ...contact, friendAlias: newAlias };
                }
                return contact;
            });
        }
        refreshContactData();
        renderGroups();
    }

    function updateLocalGrp(contactId, newGroup) {
        if (appState.contacts) {
            appState.contacts = appState.contacts.map(contact => {
                if (contact.contactId === contactId) {
                    return { ...contact, friend_group: newGroup };
                }
                return contact;
            });
        }
        refreshContactData();
        renderGroups();
    }

    function closeSidePanel() {
        sidePanel.style.display = 'none';
        selectedContact = null;
        document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('selected'));
    }

    function openDrawer() {
        mask.classList.add('active');
        refreshContactData();
        renderGroups();
        closeSidePanel();
        searchInput.value = '';
        filterKeyword = '';
        fetchPendingRequests();
    }

    function closeDrawer() {
        mask.classList.remove('active');
        closeSidePanel();
    }

    triggerContactNav.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    mask.addEventListener('click', (e) => {
        if (e.target === mask) closeDrawer();
    });

    if (sideClose) {
        sideClose.addEventListener('click', closeSidePanel);
    }

    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            tabItems.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            renderGroups();
            closeSidePanel();
        });
    });

    let searchTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            filterKeyword = e.target.value.trim();
            renderGroups();
        }, 300);
    });

    addBtn.addEventListener('click', () => {
        Swal.fire({
            title: '联系人操作',
            html: `
                <div style="text-align: left;">
                    <button id="create-group-btn" class="swal2-button" style="width: 100%; margin-bottom: 10px; background: #409eff; color: #fff; border: none; padding: 10px; border-radius: 6px;">
                        <i class="fas fa-plus-circle"></i> 创建新群聊
                    </button>
                    <button id="add-friend-btn" class="swal2-button" style="width: 100%; background: #e6a23c; color: #fff; border: none; padding: 10px; border-radius: 6px;">
                        <i class="fas fa-user-plus"></i> 添加好友
                    </button>
                    <button id="join-group-btn" class="swal2-button" style="width: 100%;margin-top:8px; background: #67c23a; color: #fff; border: none; padding: 10px; border-radius: 6px;">
                        <i class="fas fa-sign-in-alt"></i> 加入群聊
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: '关闭',
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) container.style.zIndex = '999999999';

                document.getElementById('create-group-btn')?.addEventListener('click', () => {
                    Swal.close();
                    showCreateGroupModal();
                });
                document.getElementById('add-friend-btn')?.addEventListener('click', () => {
                    Swal.close();
                    showAddFriendModal();
                });
                document.getElementById('join-group-btn')?.addEventListener('click', () => {
                    Swal.close();
                    showJoinGroupModal();
                });
            }
        });
    });

    function showCreateGroupModal() {
        Swal.fire({
            title: '创建群聊',
            html: `
                <input type="text" id="group-name-input" class="swal2-input" placeholder="群聊名称">
                <textarea id="group-desc-input" class="swal2-textarea" placeholder="群聊介绍（可选）" rows="3"></textarea>
                <div style="text-align: left; margin-top: 10px;"><input type="checkbox" id="agree-terms"> 我已阅读并同意 <a href="/notice/page/2.html" target="_blank">PPU Architecture</a></div>

                `,
            showCancelButton: true,
            confirmButtonText: '创建',
            cancelButtonText: '取消',
            preConfirm: () => {
                const groupName = document.getElementById('group-name-input').value.trim();
                const agreeTerms = document.getElementById('agree-terms').checked;
                if (!agreeTerms) {
                    Swal.showValidationMessage('请先阅读并同意协议');
                    return false;

                }
                if (!groupName) {
                    Swal.showValidationMessage('群聊名称不能为空');
                    return false;
                }
                if (groupName.length > 30) {
                    Swal.showValidationMessage('群聊名称不能超过30个字符');
                    return false;
                }
                return {
                    groupName: groupName,
                    groupDesc: document.getElementById('group-desc-input').value.trim()
                };
            },
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) container.style.zIndex = '999999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                try {
                    Loading.show('正在创建群聊...');
                    const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
                    plugin_post_requests({
                        UserId: authdatas,
                        group_name: result.value.groupName,
                        group_desc: result.value.groupDesc
                    }, async (error, response) => {
                        Loading.hide();
                        if (error) {
                            alertMsg('创建群聊失败：' + error.message);
                            return;
                        }
                        if (response && response.success) {
                            sendWsMessage({ type: 'refresh_groups' });
                            Swal.fire({
                                icon: 'success',
                                title: '创建成功',
                                text: `群聊 "${result.value.groupName}" 已创建`,
                                timer: 1500,
                                showConfirmButton: false
                            });
                            setTimeout(() => {
                                refreshContactData();
                                renderGroups();
                            }, 500);
                        } else {
                            alertMsg('创建群聊失败：' + (response ? response.message : '未知错误'));
                        }
                    }, {
                        url: '/api/creategroup/',
                        timeout: 10000
                    });
                } catch (error) {
                    Loading.hide();
                    alertMsg('创建群聊失败：' + error.message);
                }
            }
        });
    }
    function showAddFriendModal() {
        Swal.fire({
            title: '添加联系人',
            html: `
            <input type="text" id="friend-search-input" class="swal2-input" placeholder="请输入联系人ID">
            <textarea id="friend-reason-input" class="swal2-textarea" placeholder="添加理由（可选）" rows="3"></textarea>
        `,
            showCancelButton: true,
            confirmButtonText: '搜索',
            cancelButtonText: '取消',
            preConfirm: () => {
                const friendId = document.getElementById('friend-search-input').value.trim();
                const friendReason = document.getElementById('friend-reason-input').value.trim();

                if (!friendId) {
                    Swal.showValidationMessage('联系人ID不能为空');
                    return false;
                }
                if (friendId === appState.userId) {
                    Swal.showValidationMessage('不能添加自己为好友');
                    return false;
                }
                return { friendId, friendReason };
            },
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) container.style.zIndex = '999999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                const { friendId, friendReason } = result.value;
                await searchAndShowUserInfo(friendId, friendReason);
            }
        });
    }

    async function searchAndShowUserInfo(searchId, friendReason) {
        try {
            Loading.show('正在搜索联系人...');
            const authdatas = await tmd_newcontroler.writenewwords(searchId);
            plugin_post_requests({
                dfid: authdatas,
                UserId: appState.userId,
            }, async (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg('搜索联系人失败：' + error.message);
                    return;
                }
                if (response && response.success) {
                    showUserInfoPanel(response.data, friendReason);
                } else {
                    alertMsg(response?.message || '用户不存在');
                }
            }, {
                url: '/api/addcontact/',
                timeout: 10000
            });
        } catch (error) {
            Loading.hide();
            alertMsg('搜索联系人失败：' + error.message);
        }
    }

    function showUserInfoPanel(userInfo, friendReason) {
        const isFriend = userInfo.isFriend;
        const hasPendingRequest = userInfo.hasPendingRequest;
        let actionButtons = '';
        if (isFriend) {
            actionButtons = `
            <button class="user-info-btn btn-disabled" disabled style="background:#c0c4cc;cursor:not-allowed;">
                <i class="fas fa-check-circle"></i> 已是好友
            </button>
        `;
        } else if (hasPendingRequest) {
            actionButtons = `
            <button class="user-info-btn btn-disabled" disabled style="background:#e6a23c;cursor:not-allowed;">
                <i class="fas fa-clock"></i> 等待验证
            </button>
        `;
        } else {
            actionButtons = `
            <button class="user-info-btn btn-cancel" id="cancelAddFriendBtn">
                <i class="fas fa-times"></i> 取消
            </button>
            <button class="user-info-btn btn-add" id="confirmAddFriendBtn">
                <i class="fas fa-user-plus"></i> 添加好友
            </button>
        `;
        }
        Swal.fire({
            title: '用户信息',
            html: `
            <div class="user-info-panel">
                <div class="user-info-avatar" style="background-color: #409eff;">
                    ${userInfo.uname?.charAt(0) || userInfo.contactId?.charAt(0) || '?'}
                </div>
                <div class="user-info-name">${escapeHtml(userInfo.uname)}</div>
                <div class="user-info-id">
                    <i class="fas fa-id-card"></i> ID: ${escapeHtml(userInfo.contactId)}
                </div>
                <div class="user-info-signature">
                    <i class="fas fa-signature"></i> ${escapeHtml(userInfo.sayed || '暂无签名')}
                </div>
                <div class="user-info-regtime">
                    <i class="fas fa-calendar-alt"></i> 注册时间: ${escapeHtml(userInfo.regtime || '未知')}
                </div>
                <div class="user-info-credit">
                    <i class="fas fa-star"></i> 信誉分: ${userInfo.credit || 0}
                </div>
                <div class="user-info-actions">
                    ${actionButtons}
                </div>
            </div>
        `,
            showConfirmButton: false,
            showCancelButton: false,
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) container.style.zIndex = '999999999';
                const cancelBtn = document.getElementById('cancelAddFriendBtn');
                const confirmBtn = document.getElementById('confirmAddFriendBtn');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        Swal.close();
                    });
                }

                if (confirmBtn) {
                    confirmBtn.addEventListener('click', async () => {
                        await sendFriendRequest(userInfo, friendReason);
                        Swal.close();
                    });
                }
            }
        });
    }

    async function sendFriendRequest(userInfo, friendReason) {
        try {
            Loading.show('正在发送好友申请...');
            const authdatas = await tmd_newcontroler.writenewwords(userInfo.contactId);
            plugin_post_requests({
                dfid: authdatas, //对方ID
                UserId: appState.userId,
                verify_msg: friendReason || `我想添加您为好友`
            }, async (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg('发送好友申请失败：' + error.message);
                    return;
                }
                if (response && response.success) {
                    if (appState.isConnected) {
                        sendWsMessage({
                            type: 'system_i_msg',
                            data: {
                                receiverId: userInfo.contactId,
                                messageType: 'friend_request',
                                content: {
                                    systemText: `用户 ${appState.userId} 向您发送了好友申请`
                                }
                            }
                        });
                    }
                    Swal.fire({
                        icon: 'success',
                        title: '申请已发送',
                        text: response.message,
                        timer: 2000,
                        showConfirmButton: false
                    });
                    setTimeout(() => {
                        refreshContactData();
                        renderGroups();
                    }, 500);
                } else {
                    alertMsg(response?.message || '发送好友申请失败');
                }
            }, {
                url: '/api/addcontact/add.php',
                timeout: 10000
            });
        } catch (error) {
            Loading.hide();
            alertMsg('发送好友申请失败：' + error.message);
        }
    }
    function showJoinGroupModal() {
        Swal.fire({
            title: '加入群聊',
            html: `
            <input type="text" id="group-code-input" class="swal2-input" placeholder="请输入群号">
        `,
            showCancelButton: true,
            confirmButtonText: '搜索',
            cancelButtonText: '取消',
            preConfirm: () => {
                const groupCode = document.getElementById('group-code-input').value.trim();
                if (!groupCode) {
                    Swal.showValidationMessage('群号不能为空');
                    return false;
                }
                return groupCode;
            },
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) container.style.zIndex = '999999999';
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                await searchAndShowGroupInfo(result.value);
            }
        });
    }

    async function searchAndShowGroupInfo(groupCode) {
        try {
            Loading.show('正在搜索群聊...');
            const authdatas = await tmd_newcontroler.writenewwords(groupCode);
            plugin_post_requests({
                dfid: authdatas,
                UserId: appState.userId,
                group_code: groupCode
            }, async (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg('搜索群聊失败：' + error.message);
                    return;
                }
                if (response && response.success) {
                    showGroupInfoPanel(response.data);
                } else {
                    alertMsg(response?.message || '群聊不存在');
                }
            }, {
                url: '/api/joingroup/',
                timeout: 10000
            });
        } catch (error) {
            Loading.hide();
            alertMsg('搜索群聊失败：' + error.message);
        }
    }

    function showGroupInfoPanel(groupInfo) {
        const isMember = groupInfo.isMember;
        const hasPendingRequest = groupInfo.hasPendingRequest;
        const canJoinDirectly = groupInfo.canJoinDirectly;
        const needVerify = groupInfo.needVerify;
        let actionButtons = '';
        if (isMember) {
            actionButtons = `
            <button class="user-info-btn btn-disabled" disabled style="background:#c0c4cc;cursor:not-allowed;">
                <i class="fas fa-check-circle"></i> 已是群成员
            </button>
        `;
        } else if (hasPendingRequest) {
            actionButtons = `
            <button class="user-info-btn btn-disabled" disabled style="background:#e6a23c;cursor:not-allowed;">
                <i class="fas fa-clock"></i> 等待验证
            </button>
        `;
        } else {
            actionButtons = `
            <button class="user-info-btn btn-cancel" id="cancelJoinGroupBtn">
                <i class="fas fa-times"></i> 取消
            </button>
            <button class="user-info-btn btn-add" id="confirmJoinGroupBtn">
                <i class="fas fa-sign-in-alt"></i> ${canJoinDirectly ? '立即加入' : '申请加入'}
            </button>
        `;
        }
        let verifyInfo = '';
        if (!isMember && !hasPendingRequest) {
            verifyInfo = `
            <div class="group-verify-info" style="margin-top: 10px; padding: 8px; background: #f5f7fa; border-radius: 6px; font-size: 12px; color: #666;">
                <i class="fas fa-info-circle"></i> ${groupInfo.joinTypeDesc}
                ${needVerify ? '<br><small>申请后需群主或管理员审核</small>' : ''}
            </div>
        `;
        }
        let memberInfo = '';
        if (groupInfo.memberCount !== undefined && groupInfo.maxMember !== undefined) {
            const percent = (groupInfo.memberCount / groupInfo.maxMember) * 100;
            memberInfo = `
            <div class="group-member-info" style="margin-top: 8px;">
                <div class="group-member-stats" style="display: flex; justify-content: space-between; font-size: 12px; color: #666;">
                    <span><i class="fas fa-users"></i> ${groupInfo.memberCount} / ${groupInfo.maxMember} 人</span>
                    <span>群主: ${escapeHtml(groupInfo.ownerName || groupInfo.ownerId)}</span>
                </div>
                <div class="progress-bar" style="margin-top: 5px; height: 4px; background: #e4e7ed; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${Math.min(percent, 100)}%; height: 100%; background: #67c23a;"></div>
                </div>
            </div>
        `;
        }

        Swal.fire({
            title: '群聊信息',
            html: `
            <div class="user-info-panel">
                <div class="user-info-avatar group-info-avatar" style="background-color: #909399;">
                    ${groupInfo.groupName?.charAt(0) || 'G'}
                </div>
                <div class="user-info-name">${escapeHtml(groupInfo.groupName)}</div>
                <div class="user-info-id">
                    <i class="fas fa-hashtag"></i> 群号: ${escapeHtml(groupInfo.searnum || groupInfo.groupId)}
                </div>
                <div class="user-info-signature">
                    <i class="fas fa-info-circle"></i> ${escapeHtml(groupInfo.groupDesc || '暂无群介绍')}
                </div>
                <div class="user-info-regtime">
                    <i class="fas fa-calendar-alt"></i> 创建时间: ${escapeHtml(groupInfo.createTime || '未知')}
                </div>
                ${memberInfo}
                ${verifyInfo}
                <div class="user-info-actions" style="margin-top: 15px;">
                    ${actionButtons}
                </div>
            </div>
        `,
            showConfirmButton: false,
            showCancelButton: false,
            didOpen: (popup) => {
                const container = popup.closest('.swal2-container');
                if (container) container.style.zIndex = '999999999';

                const cancelBtn = document.getElementById('cancelJoinGroupBtn');
                const confirmBtn = document.getElementById('confirmJoinGroupBtn');

                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        Swal.close();
                    });
                }

                if (confirmBtn) {
                    confirmBtn.addEventListener('click', async () => {
                        await sendJoinGroupRequest(groupInfo);
                        Swal.close();
                    });
                }
            }
        });
    }

    async function sendJoinGroupRequest(groupInfo) {
        let reason = '';
        if (groupInfo.needVerify && !groupInfo.canJoinDirectly) {
            const result = await Swal.fire({
                title: '申请加入群聊',
                html: `
                <textarea id="join-reason-input" class="swal2-textarea" placeholder="请输入申请理由（选填）" rows="3"></textarea>
            `,
                showCancelButton: true,
                confirmButtonText: '发送申请',
                cancelButtonText: '取消',
                didOpen: (popup) => {
                    const container = popup.closest('.swal2-container');
                    if (container) container.style.zIndex = '999999999';
                }
            });

            if (!result.isConfirmed) return;
            reason = document.getElementById('join-reason-input')?.value.trim() || '我想加入群聊';
        }

        try {
            Loading.show(groupInfo.canJoinDirectly ? '正在加入群聊...' : '正在发送申请...');
            const authdatas = await tmd_newcontroler.writenewwords(groupInfo.groupCode || groupInfo.searnum);
            plugin_post_requests({
                dfid: authdatas,
                UserId: appState.userId,
                group_code: groupInfo.searnum || groupInfo.groupId,
                reason: reason || '我想加入群聊'
            }, async (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg('操作失败：' + error.message);
                    return;
                }
                if (response && response.success) {
                    sendWsMessage({ type: 'refresh_groups' });
                    Swal.fire({
                        icon: 'success',
                        title: response.data?.auto_approved ? '加入成功' : '申请已发送',
                        text: response.message,
                        timer: 2000,
                        showConfirmButton: false
                    });
                    setTimeout(() => {
                        refreshContactData();
                        renderGroups();
                    }, 500);
                } else {
                    alertMsg(response?.message || '操作失败');
                }
            }, {
                url: '/api/joingroup/join.php',
                timeout: 10000
            });
        } catch (error) {
            Loading.hide();
            alertMsg('操作失败：' + error.message);
        }
    }
    let pendingRequests = {
        friendRequests: [],
        groupRequests: []
    };
    let currentRequestTab = 'friend';
    function updateRequestBadge() {
        const totalPending = pendingRequests.friendRequests.length + pendingRequests.groupRequests.length;
        if (totalPending > 0) {
            requestBadge.style.display = 'inline-block';
            requestBadge.textContent = totalPending > 99 ? '99+' : totalPending;
        } else {
            requestBadge.style.display = 'none';
        }
    }
    async function fetchPendingRequests() {
        try {
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            return new Promise((resolve, reject) => {
                plugin_post_requests({
                    UserId: authdatas
                }, async (error, response) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    if (response && response.success) {
                        pendingRequests.friendRequests = response.data?.friend_requests || [];
                        pendingRequests.groupRequests = response.data?.group_requests || [];
                        updateRequestBadge();
                        resolve(response.data);
                    } else {
                        reject(new Error(response?.message || '获取申请列表失败'));
                    }
                }, {
                    url: '/api/application/list/',
                    timeout: 10000
                });
            });
        } catch (error) {
            return null;
        }
    }
    async function handleRequest(action, requestId, appType, targetId, applicantId) {
        try {
            Loading.show(action === 'accept' ? '正在同意...' : '正在拒绝...');
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            return new Promise((resolve, reject) => {
                plugin_post_requests({
                    UserId: authdatas,
                    request_id: requestId,
                    app_type: appType,
                    action: action,
                    target_id: targetId,
                    applicant_id: applicantId
                }, async (error, response) => {
                    Loading.hide();
                    if (error) {
                        reject(error);
                        return;
                    }
                    if (response && response.success) {
                        if (action === 'accept' && response.data) {
                            if (appType === 1) {
                                const userData = response.data;
                                const newContact = {
                                    contact_id: userData.contactId || applicantId,
                                    user_id: appState.userId,
                                    friend_id: applicantId,
                                    friend_alias: userData.uname || '未知用户',
                                    add_status: 1,
                                    add_time: new Date().toISOString(),
                                    friend_group: '默认分组',
                                    ispin: 0,
                                    isban: userData.isban || 0,
                                    uname: userData.uname || '未知用户',
                                    tximg: userData.tximg || '/static/default-avatar.png',
                                    sayed: userData.sayed || '暂无个性签名',
                                    intimacy_value: 0,
                                    intimacy_alias: null,
                                    contactId: applicantId,
                                    conversationId: applicantId,
                                    userId: appState.userId,
                                    friendId: applicantId,
                                    friendAlias: userData.uname || '未知用户',
                                    friend_group: '默认分组',
                                    status: 1,
                                    createTime: new Date().toISOString(),
                                    uname: userData.uname || '未知用户',
                                    tximg: userData.tximg || '/static/default-avatar.png',
                                    sayed: userData.sayed || '暂无个性签名',
                                    isPinned: 0,
                                    unreadCount: 0,
                                    account_status: userData.isban || 0,
                                    intimacy: { value: 0, alias: null },
                                    avatarColor: generateAvatarColor(applicantId),
                                    isGroup: false,
                                    type: 'contact'
                                };
                                const exists = appState.contacts.some(c => c.contactId === newContact.contactId);
                                if (!exists) {
                                    appState.contacts.push(newContact);
                                }
                            } else if (appType === 2) {
                                const groupData = response.data;
                                const conversationId = `group_${targetId}`;
                                const newGroup = {
                                    group_id: targetId,
                                    group_name: groupData.group_name || '群聊',
                                    group_desc: groupData.group_desc || '暂无群介绍',
                                    searnum: groupData.searnum || targetId,
                                    owner_id: groupData.owner_id || '',
                                    owner_name: groupData.owner_name || '',
                                    max_member: groupData.max_member || 100,
                                    memberCount: groupData.memberCount || 0,
                                    create_time: groupData.create_time || new Date().toISOString(),
                                    group_avatar: groupData.group_avatar || '',
                                    is_admin: groupData.is_admin || false,
                                    is_owner: groupData.is_owner || false,
                                    contactId: conversationId,
                                    conversationId: conversationId,
                                    uname: groupData.group_name || '群聊',
                                    friendAlias: groupData.group_name || '群聊',
                                    sayed: groupData.group_desc || '暂无群介绍',
                                    createTime: groupData.create_time || new Date().toISOString(),
                                    isPinned: 0,
                                    unreadCount: 0,
                                    avatarColor: generateAvatarColor(targetId),
                                    isGroup: true,
                                    type: 'group',
                                    galias: groupData.group_name || '群聊',
                                    group_notice: groupData.group_notice || '',
                                    nalsay: groupData.nalsay || ''
                                };
                                const exists = appState.groups.some(g => g.group_id === newGroup.group_id);
                                if (!exists) {
                                    appState.groups.push(newGroup);
                                }
                            }
                            if (appState.isConnected) {
                                let notifyMessage = '';
                                let notifyType = '';
                                if (appType === 1) {
                                    notifyMessage = `用户 ${appState.userId} 已同意您的好友申请`;
                                    notifyType = 'friend_request_accepted';
                                } else if (appType === 2) {
                                    notifyMessage = `您已成功加入群聊`;
                                    notifyType = 'group_request_accepted';
                                }
                                if (notifyMessage) {
                                    sendWsMessage({
                                        type: 'system_i_msg',
                                        data: {
                                            receiverId: applicantId,
                                            messageType: notifyType,
                                            content: {
                                                systemText: notifyMessage
                                            }
                                        }
                                    });
                                }
                            }
                        }
                        await fetchPendingRequests();
                        refreshContactData();
                        renderGroups();
                        await renderContacts();
                        const requestPanel = document.getElementById('requestPanel');
                        if (requestPanel && requestPanel.style.display === 'flex') {
                            renderRequestPanel();
                        }
                        sendWsMessage({ type: 'refresh_groups' });
                        resolve(response);
                    } else {
                        reject(new Error(response?.message || '操作失败'));
                    }
                }, {
                    url: '/api/application/handle/',
                    timeout: 10000
                });
            });
        } catch (error) {
            Loading.hide();
            alertMsg('操作失败：' + error.message);
            throw error;
        }
    }
    function generateAvatarColor(id) {
        const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        const index = String(id).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    }
    function renderRequestPanel() {
        const requestPanel = document.getElementById('requestPanel');
        const requestContent = document.getElementById('requestContent');
        if (!requestContent) return;
        const friendRequests = pendingRequests.friendRequests;
        const groupRequests = pendingRequests.groupRequests;
        const isFriendTab = currentRequestTab === 'friend';
        const currentList = isFriendTab ? friendRequests : groupRequests;
        if (currentList.length === 0) {
            requestContent.innerHTML = `
            <div class="request-empty">
                <i class="fas fa-inbox"></i>
                <p>暂无待处理申请</p>
            </div>
        `;
            return;
        }

        let html = '<div class="request-list">';
        currentList.forEach(req => {
            if (isFriendTab) {
                html += `
                <div class="request-item" data-id="${req.id}" data-type="friend" data-target="${req.applicant_id}" data-applicant="${req.applicant_id}">
                    <div class="request-avatar" style="background-color: #409eff;">
                        ${req.applicant_name?.charAt(0) || req.applicant_id?.charAt(0) || '?'}
                    </div>
                    <div class="request-info">
                        <div class="request-name">${escapeHtml(req.applicant_name || req.applicant_id)}</div>
                        <div class="request-id">ID: ${escapeHtml(req.applicant_id)}</div>
                        ${req.reason ? `<div class="request-reason">验证消息: ${escapeHtml(req.reason)}</div>` : ''}
                        <div class="request-time">${escapeHtml(formatTime(req.apply_time))}</div>
                    </div>
                    <div class="request-actions">
                        <button class="request-btn accept" data-action="accept"><i class="fas fa-check"></i> 同意</button>
                        <button class="request-btn reject" data-action="reject"><i class="fas fa-times"></i> 拒绝</button>
                    </div>
                </div>
            `;
            } else {
                html += `
                <div class="request-item" data-id="${req.id}" data-type="group" data-target="${req.target_id}" data-applicant="${req.applicant_id}">
                    <div class="request-avatar group-avatar" style="background-color: #909399;">
                        ${req.group_name?.charAt(0) || 'G'}
                    </div>
                    <div class="request-info">
                        <div class="request-name">${escapeHtml(req.group_name || '群聊')}</div>
                        <div class="request-id">群号: ${escapeHtml(req.target_id)}</div>
                        <div class="request-applicant">申请人: ${escapeHtml(req.applicant_name || req.applicant_id)}</div>
                        ${req.reason ? `<div class="request-reason">申请理由: ${escapeHtml(req.reason)}</div>` : ''}
                        <div class="request-time">${escapeHtml(formatTime(req.apply_time))}</div>
                    </div>
                    <div class="request-actions">
                        <button class="request-btn accept" data-action="accept"><i class="fas fa-check"></i> 同意</button>
                        <button class="request-btn reject" data-action="reject"><i class="fas fa-times"></i> 拒绝</button>
                    </div>
                </div>
            `;
            }
        });
        html += '</div>';
        requestContent.innerHTML = html;
        requestContent.querySelectorAll('.request-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const requestItem = btn.closest('.request-item');
                const requestId = requestItem.dataset.id;
                const appType = requestItem.dataset.type === 'friend' ? 1 : 2;
                const targetId = requestItem.dataset.target;
                const applicantId = requestItem.dataset.applicant;
                const action = btn.dataset.action;
                const actionText = action === 'accept' ? '同意' : '拒绝';
                const confirmResult = await Swal.fire({
                    title: `确认${actionText}申请`,
                    text: action === 'accept' ? '确定要同意此申请吗？' : '确定要拒绝此申请吗？',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: action === 'accept' ? '同意' : '拒绝',
                    cancelButtonText: '取消'
                });

                if (confirmResult.isConfirmed) {
                    try {
                        await handleRequest(action, requestId, appType, targetId, applicantId);
                        Swal.fire({
                            icon: 'success',
                            title: `${actionText}成功`,
                            timer: 1500,
                            showConfirmButton: false
                        });
                    } catch (error) {
                        Swal.fire({
                            icon: 'error',
                            title: `${actionText}失败`,
                            text: error.message
                        });
                    }
                }
            });
        });
    }
    async function openRequestPanel() {
        let requestPanel = document.getElementById('requestPanel');
        if (!requestPanel) {
            requestPanel = document.createElement('div');
            requestPanel.id = 'requestPanel';
            requestPanel.className = 'request-panel-mask';
            requestPanel.innerHTML = `
            <div class="request-panel">
                <div class="request-panel-header">
                    <h3><i class="fas fa-bell"></i> 待处理申请</h3>
                    <button class="request-panel-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="request-tabs">
                    <div class="request-tab-item ${currentRequestTab === 'friend' ? 'active' : ''}" data-tab="friend">
                        <i class="fas fa-user-friends"></i> 好友申请 <span class="tab-count" id="friendRequestCount">${pendingRequests.friendRequests.length}</span>
                    </div>
                    <div class="request-tab-item ${currentRequestTab === 'group' ? 'active' : ''}" data-tab="group">
                        <i class="fas fa-users"></i> 群聊申请 <span class="tab-count" id="groupRequestCount">${pendingRequests.groupRequests.length}</span>
                    </div>
                </div>
                <div class="request-content" id="requestContent">
                </div>
            </div>
        `;
            document.body.appendChild(requestPanel);
            const closeBtn = requestPanel.querySelector('.request-panel-close');
            closeBtn.addEventListener('click', () => {
                requestPanel.style.display = 'none';
            });

            requestPanel.addEventListener('click', (e) => {
                if (e.target === requestPanel) {
                    requestPanel.style.display = 'none';
                }
            });
            const tabItems = requestPanel.querySelectorAll('.request-tab-item');
            tabItems.forEach(tab => {
                tab.addEventListener('click', () => {
                    currentRequestTab = tab.dataset.tab;
                    tabItems.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    renderRequestPanel();
                });
            });
        }
        const friendCountSpan = document.getElementById('friendRequestCount');
        const groupCountSpan = document.getElementById('groupRequestCount');
        if (friendCountSpan) friendCountSpan.textContent = pendingRequests.friendRequests.length;
        if (groupCountSpan) groupCountSpan.textContent = pendingRequests.groupRequests.length;
        renderRequestPanel();
        requestPanel.style.display = 'flex';
    }
    function formatTime(timeStr) {
        if (!timeStr) return '未知';
        const date = new Date(timeStr);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    requestsBtn.addEventListener('click', () => {
        openRequestPanel();
    });

    groupsContainer.addEventListener('click', (e) => {
        if (e.target === groupsContainer || e.target.classList.contains('contact-groups-container')) {
            closeSidePanel();
        }
    });

    closeSidePanel();
    window.refreshContactManager = function () {
        if (mask.classList.contains('active')) {
            refreshContactData();
            renderGroups();
        }
    };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();