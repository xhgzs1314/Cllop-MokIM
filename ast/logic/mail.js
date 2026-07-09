(function () {
    const mask = document.getElementById('mailDrawerMask');
    const closeBtn = document.getElementById('closeMailDrawerBtn');
    const triggerNav = document.getElementById('mailget-tabber-nav');
    const listView = document.getElementById('mailListView');
    const detailView = document.getElementById('mailDetailView');
    const emptyState = document.getElementById('mailEmptyState');
    const backToListBtn = document.getElementById('backToListBtn');
    const detailContent = document.getElementById('detailContent');
    const unreadBadge = document.querySelector('.mail-tab-item[data-tab="inbox"] .badge');
    const tabItems = document.querySelectorAll('.mail-tab-item');
    let currentTab = 'inbox';
    let mailData = {
        inbox: [],
        unread: []
    };
    let currentMailList = [];
    let lastFetchTime = 0;
    const FETCH_COOLDOWN = 30000;
    let isFetching = false;
    async function fetchMails(type = 'inbox') {
        const now = Date.now();
        if (isFetching) {
            return null;
        }

        isFetching = true;

        try {
            const response = await fetch(`/api/mailget/?action=list&type=${type}&t=${now}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });

            const result = await response.json();

            if (result.code === 200) {
                lastFetchTime = now;
                return result.data;
            } else if (result.code === 401) {
                window.location.href = '/use/user/';
                return null;
            } else {
                console.error('获取邮件失败:', result.msg);
                return null;
            }
        } catch (error) {
            console.error('请求失败:', error);
            return null;
        } finally {
            isFetching = false;
        }
    }

    async function markAsRead(mailId) {
        try {
            const response = await fetch(`/api/mailget/?action=read&id=${mailId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });

            const result = await response.json();
            return result.code === 200;
        } catch (error) {
            console.error('标记已读失败:', error);
            return false;
        }
    }

    async function deleteMail(mailId) {
        try {
            const response = await fetch(`/api/mailget/?action=delete&id=${mailId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });

            const result = await response.json();
            return result.code === 200;
        } catch (error) {
            console.error('删除邮件失败:', error);
            return false;
        }
    }
    function renderMailList(listArray) {
        listView.innerHTML = '';

        if (!listArray || listArray.length === 0) {
            listView.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        listView.style.display = 'block';
        emptyState.style.display = 'none';

        listArray.forEach(mail => {
            const mailItem = document.createElement('div');
            mailItem.className = `mail-item ${mail.unread ? 'unread' : ''}`;
            mailItem.dataset.id = mail.id;
            mailItem.dataset.tab = currentTab;

            const avatarText = mail.sender_initial || mail.sender.charAt(0);

            mailItem.innerHTML = `
                <div class="mail-avatar" style="background-color: ${mail.avatar_color || '#409eff'};">${avatarText}</div>
                <div class="mail-content">
                    <div class="mail-header">
                        <span class="mail-sender">${mail.sender}</span>
                        <span class="mail-time">${mail.time}</span>
                    </div>
                    <div class="mail-title">${mail.title}</div>
                    <div class="mail-desc-preview">${mail.desc}</div>
                </div>
            `;

            mailItem.addEventListener('click', () => {
                showMailDetail(mail);
            });

            listView.appendChild(mailItem);
        });
    }
    function showMailDetail(mail) {
        if (mail.unread) {
            markAsRead(mail.id).then(success => {
                if (success) {
                    updateMailReadStatus(mail.id);
                }
            });
        }

        listView.style.display = 'none';
        emptyState.style.display = 'none';
        detailView.classList.add('active');
        const detailTime = mail.time_raw ? new Date(mail.time_raw).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }) : mail.time;

        detailContent.innerHTML = `
            <div class="detail-sender">
                <div class="detail-avatar" style="background-color: ${mail.avatar_color || '#409eff'};">${mail.sender_initial || mail.sender.charAt(0)}</div>
                <div class="detail-sender-info">
                    <h4>${mail.sender}</h4>
                    <p>发件人 · ${mail.sender_id}</p>
                </div>
            </div>
            <div class="detail-title">${mail.title}</div>
            <div class="detail-time"><i class="far fa-clock" style="margin-right: 4px;"></i>${detailTime}</div>
            <div class="detail-body">${mail.content}</div>
            <div class="detail-actions">
                <button class="mail-action-btn" onclick="window.location.href='mailto:${mail.sender_id}'"><i class="fas fa-reply"></i> 回复</button>
                <button class="mail-action-btn delete-mail-btn" data-id="${mail.id}"><i class="fas fa-trash"></i> 删除</button>
                ${mail.unread ? '<button class="mail-action-btn primary mark-read-btn" data-id="' + mail.id + '"><i class="fas fa-check"></i> 标记已读</button>' : ''}
            </div>
        `;
        const deleteBtn = detailContent.querySelector('.delete-mail-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (await mok_confirm('确定要删除这封邮件吗？')) {
                    const success = await deleteMail(mail.id);
                    if (success) {
                        alertMsg('删除成功');
                        backToList();
                        refreshMailData();
                    } else {
                        alertMsg('删除失败，请重试');
                    }
                }
            });
        }
        const markReadBtn = detailContent.querySelector('.mark-read-btn');
        if (markReadBtn) {
            markReadBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const success = await markAsRead(mail.id);
                if (success) {
                    updateMailReadStatus(mail.id);
                    refreshMailData();
                }
            });
        }
    }
    function updateMailReadStatus(mailId) {
        mailData.inbox = mailData.inbox.map(mail => {
            if (mail.id === mailId) {
                return { ...mail, unread: false, is_read: 1 };
            }
            return mail;
        });
        mailData.unread = mailData.unread.filter(mail => mail.id !== mailId);
        updateUnreadBadge();
        if (currentTab === 'unread') {
            currentMailList = mailData.unread;
            renderMailList(currentMailList);
        }
    }


    function updateUnreadBadge() {
        const unreadCount = mailData.unread.length;
        if (unreadBadge) {
            if (unreadCount > 0) {
                unreadBadge.textContent = unreadCount;
                unreadBadge.style.display = 'inline-block';
            } else {
                unreadBadge.style.display = 'none';
            }
        }
    }


    function backToList() {
        detailView.classList.remove('active');
        switch (currentTab) {
            case 'inbox':
                currentMailList = mailData.inbox;
                break;
            case 'unread':
                currentMailList = mailData.unread;
                break;
            default:
                currentMailList = mailData.inbox;
        }
        renderMailList(currentMailList);
    }


    function switchTab(tabId) {
        currentTab = tabId;

        tabItems.forEach(tab => {
            const tabAttr = tab.dataset.tab;
            if (tabAttr === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        if (tabId === 'inbox') currentMailList = mailData.inbox;
        else if (tabId === 'unread') currentMailList = mailData.unread;

        if (detailView.classList.contains('active')) {
            detailView.classList.remove('active');
        }

        renderMailList(currentMailList);
    }


    async function refreshMailData() {
        const inboxData = await fetchMails('inbox');
        if (inboxData) {
            mailData.inbox = inboxData.list || [];
            if (inboxData.unread_count !== undefined) {
                if (unreadBadge) {
                    unreadBadge.textContent = inboxData.unread_count;
                    unreadBadge.style.display = inboxData.unread_count > 0 ? 'inline-block' : 'none';
                }
            }
        }
        const unreadData = await fetchMails('unread');
        if (unreadData) {
            mailData.unread = unreadData.list || [];
        }
        if (currentTab === 'inbox') {
            currentMailList = mailData.inbox;
        } else {
            currentMailList = mailData.unread;
        }

        renderMailList(currentMailList);
    }
    function openDrawer() {
        mask.classList.add('active');

        if (detailView.classList.contains('active')) {
            detailView.classList.remove('active');
        }
        const now = Date.now();
        if (now - lastFetchTime > FETCH_COOLDOWN || mailData.inbox.length === 0) {
            listView.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
            listView.style.display = 'block';
            emptyState.style.display = 'none';

            refreshMailData().then(() => {
                switchTab('inbox');
            });
        } else {
            switchTab('inbox');
        }
    }


    function closeDrawer() {
        mask.classList.remove('active');
    }


    triggerNav.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);

    mask.addEventListener('click', (e) => {
        if (e.target === mask) {
            closeDrawer();
        }
    });

    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            if (tabId) switchTab(tabId);
        });
    });

    backToListBtn.addEventListener('click', backToList);


    const searchInput = document.querySelector('.mail-search input');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            const keyword = e.target.value.trim().toLowerCase();

            if (keyword === '') {
                switchTab(currentTab);
                return;
            }

            const baseList = currentTab === 'inbox' ? mailData.inbox : mailData.unread;
            const filtered = baseList.filter(mail =>
                mail.sender.toLowerCase().includes(keyword) ||
                mail.title.toLowerCase().includes(keyword) ||
                (mail.desc && mail.desc.toLowerCase().includes(keyword))
            );

            renderMailList(filtered);
        }, 300);
    });
    refreshMailData();
    mask.classList.remove('active');
})();