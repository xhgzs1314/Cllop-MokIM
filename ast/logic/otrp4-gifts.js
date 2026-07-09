(function () {
    'use strict';
    const GIFT_CONFIG = {
        giftList: [
            {
                id: 1,
                name: '🌹 红玫瑰',
                description: '永恒的爱情象征',
                icon: '🌹',
                price: 100,
                intimacyValue: 60,
                hasAnimation: true,
                animationType: 'hearts',
                category: 'flowers'
            },
            {
                id: 2,
                name: '💎 钻石',
                description: '闪耀的永恒之约',
                icon: '💎',
                price: 200,
                intimacyValue: 180,
                hasAnimation: true,
                animationType: 'sparkle',
                category: 'luxury'
            },
            {
                id: 3,
                name: '🎂 蛋糕',
                description: '甜蜜的祝福',
                icon: '🎂',
                price: 50,
                intimacyValue: 40,
                hasAnimation: true,
                animationType: 'cake',
                category: 'daily'
            },
            {
                id: 4,
                name: '🎈 庆祝礼炮',
                description: '欢乐的陪伴',
                icon: '🎈',
                price: 30,
                intimacyValue: 20,
                hasAnimation: true,
                animationType: 'celebration',
                category: 'daily'
            },
            {
                id: 5,
                name: '🎇 烟花',
                description: '盛大的烟花秀',
                icon: '🎇',
                price: 300,
                intimacyValue: 250,
                hasAnimation: true,
                animationType: 'fireworks',
                category: 'daily'
            }
        ],
        dailyLimit: 200,
        cooldown: 3
    };
    const GiftState = {
        isOpen: false,
        selectedGiftId: null,
        isSending: false,
        cooldownTimer: null,
        cooldownRemaining: 0,
        dailyIntimacyGiven: 0,
        todayDate: new Date().toDateString()
    };
    let AnimationEngine = null;
    function injectStyles() {
        const styleId = 'gift-system-styles';
        if (document.getElementById(styleId)) return;
        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = `
            @keyframes heartBurst {
            0% {
                opacity: 0;
                transform: scale(0) rotate(0deg) translate(0, 0);
            }
            20% {
                opacity: 1;
                transform: scale(1.2) rotate(20deg) translate(0, -20px);
            }
            100% {
                opacity: 0;
                transform: scale(0.3) rotate(360deg) translate(${Math.random() > 0.5 ? '' : '-'}200px, -400px);
            }
        }
        @keyframes glowPulse {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.3; }
            100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.6; }
        }
        @keyframes particleBurst {
            0% { opacity: 0; transform: translate(0, 0) scale(0); }
            20% { opacity: 1; transform: translate(0, -20px) scale(1); }
            100% { opacity: 0; transform: translate(${Math.random() > 0.5 ? '' : '-'}150px, ${Math.random() > 0.5 ? '' : '-'}300px) scale(0); }
        }
        @keyframes rayFlash {
            0% { opacity: 0.2; transform: translate(-50%, -100%) rotate(var(--angle, 0rad)) scaleY(0.5); }
            100% { opacity: 1; transform: translate(-50%, -100%) rotate(var(--angle, 0rad)) scaleY(1.2); }
        }
        @keyframes starPop {
            0% { opacity: 0; transform: scale(0) rotate(0deg); }
            30% { opacity: 1; transform: scale(1.5) rotate(180deg); }
            100% { opacity: 0; transform: scale(0.5) rotate(360deg) translateY(-80px); }
        }
        @keyframes dotPop {
            0% { opacity: 0; transform: scale(0); }
            40% { opacity: 1; transform: scale(2); }
            100% { opacity: 0; transform: scale(0.2) translateY(-60px); }
        }
        @keyframes textFloat {
            0% { opacity: 0; transform: translateY(0) scale(0.5) rotate(0deg); }
            30% { opacity: 1; transform: translateY(-30px) scale(1.2) rotate(20deg); }
            100% { opacity: 0; transform: translateY(-120px) scale(0.8) rotate(-30deg); }
        }
        @keyframes cakePop {
            0% { transform: translate(-50%, -50%) scale(0) rotate(-30deg); }
            60% { transform: translate(-50%, -50%) scale(1.3) rotate(5deg); }
            100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
        }
        @keyframes confettiFall {
            0% {
                opacity: 0;
                transform: translateY(0) rotate(0deg) scale(0.5);
            }
            10% { opacity: 1; transform: translateY(20px) rotate(30deg) scale(1); }
            100% {
                opacity: 0;
                transform: translateY(${80 + Math.random() * 100}vh) rotate(${360 + Math.random() * 360}deg) scale(0.3);
            }
        }
        @keyframes flashBurst {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
        @keyframes fireworkParticle {
            0% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0);
            }
        }

      
        `;
        document.head.appendChild(styles);
    }
    function showToast(message, type = 'info', duration = 2500) {
        const existing = document.querySelector('.gift-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `gift-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }
    function createGiftPanel() {
        if (document.getElementById('giftPanelOverlay')) {
            return document.getElementById('giftPanelOverlay');
        }

        const overlay = document.createElement('div');
        overlay.id = 'giftPanelOverlay';
        overlay.className = 'gift-panel-overlay';

        overlay.innerHTML = `
            <div class="gift-panel">
                <div class="gift-panel-header">
                    <h3>
                        🎁 赠送礼物
                        <span class="gift-balance">💎 <span id="giftBalanceDisplay">0</span></span>
                    </h3>
                    <button class="gift-panel-close" id="giftPanelCloseBtn">✕</button>
                </div>
                <div class="gift-list-container">
                    <div class="gift-grid" id="giftGrid"></div>
                </div>
                <div class="gift-panel-footer">
                    <div class="gift-selected-info">
                        ${'已选择：'} <strong id="giftSelectedName">无</strong>
                        <span id="giftSelectedMeta" style="font-size:12px;color:#999;display:block;margin-top:2px;"></span>
                    </div>
                    <button class="gift-send-btn" id="giftSendBtn" disabled>
                        <span class="spinner"></span>
                        <span class="btn-text">🎁 赠送</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.getElementById('giftPanelCloseBtn').addEventListener('click', closeGiftPanel);
        overlay.addEventListener('click', function (e) {
            if (e.target === this) closeGiftPanel();
        });
        document.getElementById('giftSendBtn').addEventListener('click', handleSendGift);
        document.addEventListener('keydown', function handleEsc(e) {
            if (e.key === 'Escape' && GiftState.isOpen) {
                closeGiftPanel();
                document.removeEventListener('keydown', handleEsc);
            }
        });

        return overlay;
    }
    function renderGiftList() {
        const grid = document.getElementById('giftGrid');
        if (!grid) return;

        const gifts = GIFT_CONFIG.giftList;

        grid.innerHTML = gifts.map(gift => `
            <div class="gift-card" data-gift-id="${gift.id}" data-gift-price="${gift.price}" data-gift-intimacy="${gift.intimacyValue}">
                <span class="gift-animation-badge">${gift.hasAnimation ? '✨' : ''}</span>
                <span class="gift-icon">${gift.icon}</span>
                <div class="gift-name">${gift.name}</div>
                <div class="gift-desc">${gift.description}</div>
                <div class="gift-meta">
                    <span class="price">💰 ${gift.price}G</span>
                    <span class="intimacy">❤️ +${gift.intimacyValue}</span>
                </div>
            </div>
        `).join('');
        grid.querySelectorAll('.gift-card').forEach(card => {
            card.addEventListener('click', function () {
                const giftId = parseInt(this.dataset.giftId);
                selectGift(giftId);
            });
        });
    }
    function selectGift(giftId) {
        if (GiftState.isSending) return;
        const gift = GIFT_CONFIG.giftList.find(g => g.id === giftId);
        if (!gift) return;
        document.querySelectorAll('.gift-card').forEach(c => c.classList.remove('selected'));
        const card = document.querySelector(`.gift-card[data-gift-id="${giftId}"]`);
        if (card) card.classList.add('selected');
        GiftState.selectedGiftId = giftId;
        const nameEl = document.getElementById('giftSelectedName');
        const metaEl = document.getElementById('giftSelectedMeta');
        const sendBtn = document.getElementById('giftSendBtn');

        if (nameEl) nameEl.textContent = gift.name;
        if (metaEl) metaEl.textContent = `💰 ${gift.price}G · ❤️ +${gift.intimacyValue}`;
        if (sendBtn) sendBtn.disabled = false;
    }

    async function handleSendGift() {
        if (GiftState.isSending) return;

        const giftId = GiftState.selectedGiftId;
        if (!giftId) {
            showToast('请先选择一个礼物', 'error');
            return;
        }

        const gift = GIFT_CONFIG.giftList.find(g => g.id === giftId);
        if (!gift) return;

        if (!appState || !appState.selectedContact) {
            showToast('请先选择一个好友', 'error');
            return;
        }

        const contact = appState.selectedContact;
        if (contact.isGroup) {
            showToast('不能给群聊赠送礼物，请选择好友', 'error');
            return;
        }
        const confirmed = await showConfirmDialog(
            `确定要送给 ${contact.friendAlias || contact.uname || '对方'} 「${gift.name}」吗？`,
            `将花费 ${gift.price}G，增加亲密度 ${gift.intimacyValue} 点`
        );
        if (!confirmed) return;

        GiftState.isSending = true;
        const sendBtn = document.getElementById('giftSendBtn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.classList.add('loading');
        }

        try {
            const result = await sendGiftToAPI(gift, contact);
            if (!result.success) {
                showToast(result.message || '赠送失败，请重试', 'error');
                return;
            }
            updateBalance(result.data.newBalance);
            updateIntimacyDisplay(contact, result.data.intimacyChange);
            await sendGiftMessage(gift, contact);
            if (gift.hasAnimation && gift.animationType) {
                AnimationEngine.play(gift.animationType);
            }

            showToast(`🎉 成功赠送 ${gift.name} 给 ${contact.friendAlias || contact.uname || '对方'}！+${gift.intimacyValue}亲密度`, 'success', 3000);

            setTimeout(() => closeGiftPanel(), 1000);

        } catch (error) {
            showToast(`赠送失败：${error.message}`, 'error');
        } finally {
            GiftState.isSending = false;
            if (sendBtn) {
                sendBtn.disabled = GiftState.selectedGiftId === null;
                sendBtn.classList.remove('loading');
            }
        }
    }
    async function sendGiftMessage(gift, contact) {
        let message = {
            messageId: generateUniqueId(),
            conversationId: contact.conversationId,
            senderId: appState.userId,
            receiverId: contact.contactId,
            messageType: 'gift',
            content: {
                giftId: gift.id,
                giftName: gift.name,
                giftIcon: gift.icon,
                intimacyValue: gift.intimacyValue,
                animationType: gift.animationType,
                price: gift.price
            },
            sendTime: Date.now(),
            isSelf: true,
            status: 'sending',
            read: false
        };
        message = await hashy_addHashToMessage(message);
        if (appState.isConnected && appState.ws) {
            sendWsMessage({
                type: 'new_message',
                data: message
            });
        }
        await saveMessageToDB(message);
        message.status = 'sent';
        if (appState.selectedContact?.conversationId === contact.conversationId) {
            renderMessages([message]);
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
        await renderContacts();
        await renderGroups();
        if (currentQuoteMsgId) {
            const oldQuoteItem = document.querySelector(`.message-item[data-message-id="${currentQuoteMsgId}"]`);
            if (oldQuoteItem) oldQuoteItem.style.cssText = DEFAULT_STYLE;
            currentQuoteMsgId = null;
            const chatInput = document.querySelector('.chat-input');
            chatInput.placeholder = '请输入消息...';
            chatInput.removeEventListener('dblclick', handleChatInputDblClick);
        }
    }


    async function sendGiftToAPI(gift, contact) {
        try {
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            return new Promise((resolve, reject) => {
                plugin_post_requests({
                    UserId: authdatas,
                    targetId: contact.contactId,
                    giftId: gift.id
                }, (error, response) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    if (response && response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response?.message || '赠送失败'));
                    }
                }, {
                    url: '/api/gifts/',
                    timeout: 15000
                });
            });
        } catch (error) {
            console.error('赠送礼物API调用失败:', error);
            throw error;
        }
    }
    async function saveGiftMessageToDB(gift, contact) {
        const message = {
            messageId: generateUniqueId(),
            conversationId: contact.conversationId,
            senderId: appState.userId,
            receiverId: contact.contactId,
            messageType: 'gift',
            content: {
                giftId: gift.id,
                giftName: gift.name,
                giftIcon: gift.icon,
                intimacyValue: gift.intimacyValue,
                animationType: gift.animationType,
                isSelf: true
            },
            sendTime: Date.now(),
            isSelf: true,
            status: 'sent',
            read: false
        };

        try {
            await saveMessageToDB(message);
            if (appState.selectedContact?.conversationId === contact.conversationId) {
                renderMessages([message]);
                const chatMessages = document.querySelector('.chat-messages');
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }


            await renderContacts();
            await renderGroups();

        } catch (error) {
            console.error('保存礼物消息失败:', error);
        }
    }
    function handleGiftReceived(data) {
        if (!data) return;
        const { fromUserId, giftId, giftName, giftIcon, intimacyChange, hasAnimation, animationType } = data;
        if (fromUserId !== appState?.userId) {
            saveReceivedGiftMessage(data);
            showToast(`🎁 收到 ${giftIcon} ${giftName}！亲密度 +${intimacyChange}`, 'info', 4000);
            if (appState?.selectedContact?.contactId === fromUserId) {
                const loveNumberEl = document.getElementById('us_contact_lovenumber');
                if (loveNumberEl) {
                    const current = parseInt(loveNumberEl.textContent) || 0;
                    loveNumberEl.textContent = current + intimacyChange;
                }
            }
            if (hasAnimation && animationType) {
                setTimeout(() => {
                    if (AnimationEngine) {
                        AnimationEngine.play(animationType);
                    }
                }, 300);
            }
            setTimeout(() => {
                renderContacts();
                renderGroups();
            }, 500);
        }
        const event = new CustomEvent('giftReceived', { detail: data });
        window.dispatchEvent(event);
    }
    async function saveReceivedGiftMessage(data) {
        const { fromUserId, giftId, giftName, giftIcon, intimacyChange, animationType } = data;
        let conversationId = null;
        if (appState.contacts) {
            const contact = appState.contacts.find(c => c.contactId === fromUserId);
            if (contact) {
                conversationId = contact.conversationId;
            }
        }

        if (!conversationId) {
            if (appState.groups) {
            }
            return;
        }

        const message = {
            messageId: generateUniqueId(),
            conversationId: conversationId,
            senderId: fromUserId,
            receiverId: appState.userId,
            messageType: 'gift',
            content: {
                giftId: giftId,
                giftName: giftName,
                giftIcon: giftIcon,
                intimacyValue: intimacyChange,
                animationType: animationType,
                isSelf: false
            },
            sendTime: Date.now(),
            isSelf: false,
            status: 'received',
            read: false
        };

        try {
            await saveMessageToDB(message);
            if (appState.selectedContact?.conversationId === conversationId) {
                renderMessages([message]);
                const chatMessages = document.querySelector('.chat-messages');
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
        } catch (error) {
            console.error('保存收到的礼物消息失败:', error);
        }
    }
    function updateBalance(newBalance) {
        if (appState) {
            appState.gCoinBalance = newBalance;
        }
        localStorage.setItem('mok_gCoinBalance', String(newBalance));

        const display = document.getElementById('giftBalanceDisplay');
        if (display) display.textContent = newBalance;
        const event = new CustomEvent('giftBalanceUpdated', {
            detail: { balance: newBalance }
        });
        window.dispatchEvent(event);
    }
    function updateIntimacyDisplay(contact, change) {
        if (!contact) return;
        const loveNumberEl = document.getElementById('us_contact_lovenumber');
        if (loveNumberEl) {
            const current = parseInt(loveNumberEl.textContent) || 0;
            const newValue = current + change;
            loveNumberEl.textContent = newValue;
            loveNumberEl.style.transition = 'transform 0.3s';
            loveNumberEl.style.transform = 'scale(1.4)';
            setTimeout(() => {
                loveNumberEl.style.transform = 'scale(1)';
            }, 300);
        }
        const loveBodyEl = document.getElementById('us_contact_loverbody');
        if (loveBodyEl) {
            const current = parseInt(loveNumberEl?.textContent) || 0;
            if (window.mokim_tool_getIntimacyLevel) {
                loveBodyEl.textContent = window.mokim_tool_getIntimacyLevel(current, null);
            }
        }
        const event = new CustomEvent('intimacyUpdated', {
            detail: { contactId: contact.contactId, change: change }
        });
        window.dispatchEvent(event);
    }
    function showConfirmDialog(title, desc) {
        return new Promise((resolve) => {
            if (window.Swal) {
                window.Swal.fire({
                    title: title,
                    text: desc,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#409eff',
                    cancelButtonColor: '#909399',
                    confirmButtonText: '确认赠送',
                    cancelButtonText: '取消',
                    didOpen: (popup) => {
                        const container = popup.closest('.swal2-container');
                        if (container) {
                            container.style.zIndex = '999999999';
                        }
                    }
                }).then(result => {
                    resolve(result.isConfirmed);
                });
            } else {
                resolve(confirm(`${title}\n${desc}`));
            }
        });
    }
    function openGiftPanel() {
        if (GiftState.isOpen) {
            closeGiftPanel();
            setTimeout(() => openGiftPanel(), 100);
            return;
        }
        if (!appState || !appState.selectedContact) {
            showToast('请先选择一个好友', 'error');
            return;
        }

        if (appState.selectedContact.isGroup) {
            showToast('群聊不支持赠送礼物', 'error');
            return;
        }
        const overlay = createGiftPanel();
        renderGiftList();
        GiftState.selectedGiftId = null;
        GiftState.isSending = false;
        document.querySelectorAll('.gift-card').forEach(c => c.classList.remove('selected'));
        const sendBtn = document.getElementById('giftSendBtn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.classList.remove('loading');
        }
        document.getElementById('giftSelectedName').textContent = '无';
        document.getElementById('giftSelectedMeta').textContent = '';
        updateBalance('当前数据仅供参考');
        overlay.classList.add('active');
        GiftState.isOpen = true;
        const event = new CustomEvent('giftPanelOpened');
        window.dispatchEvent(event);
    }


    function closeGiftPanel() {
        const overlay = document.getElementById('giftPanelOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            GiftState.isOpen = false;
        }
        GiftState.selectedGiftId = null;
        GiftState.isSending = false;
        const event = new CustomEvent('giftPanelClosed');
        window.dispatchEvent(event);
    }
    function initGiftSystem() {
        injectStyles();
        AnimationEngine = window.mokim_AnimationEngine;
        const init = function () {
            const giftActionCard = document.getElementById('giftActionBtn');
            giftActionCard.addEventListener('click', openGiftPanel);
        }
        init();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGiftSystem);
    } else {
        initGiftSystem();
    }
})();