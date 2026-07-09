// ===================== 消息翻译模块 =====================
const TranslationManager = (function () {
    const COOLDOWN_DURATION = 5000;
    const lastTranslateTime = new Map();
    const TARGET_LANGUAGES = {
        'zh': '中文',
        'en': '英语',
        'ja': '日语',
        'ko': '韩语',
        'fr': '法语',
        'de': '德语',
        'es': '西班牙语',
        'ru': '俄语',
        'ar': '阿拉伯语',
        'pt': '葡萄牙语',
        'it': '意大利语'
    };
    function getTargetLanguage() {
        const saved = localStorage.getItem('mok_translation_target_lang');
        return saved || 'zh';
    }
    function setTargetLanguage(lang) {
        if (TARGET_LANGUAGES[lang]) {
            localStorage.setItem('mok_translation_target_lang', lang);
            return true;
        }
        return false;
    }
    function isInCooldown(messageId) {
        const lastTime = lastTranslateTime.get(messageId);
        if (!lastTime) return false;
        const elapsed = Date.now() - lastTime;
        return elapsed < COOLDOWN_DURATION;
    }
    function getRemainingCooldown(messageId) {
        const lastTime = lastTranslateTime.get(messageId);
        if (!lastTime) return 0;
        const elapsed = Date.now() - lastTime;
        const remaining = COOLDOWN_DURATION - elapsed;
        return Math.ceil(remaining / 1000);
    }
    function recordTranslation(messageId) {
        lastTranslateTime.set(messageId, Date.now());
    }
    function getMessageText(messageElement) {
        const messageTextEl = messageElement.querySelector('.message-text');
        if (!messageTextEl) return null;
        const lockContainer = messageElement.querySelector('.message-locked');
        if (lockContainer) {
            const revealedContent = lockContainer.querySelector('.message-text');
            if (revealedContent) {
                return revealedContent.textContent.trim();
            }
            return null;
        }
        const text = messageTextEl.textContent || messageTextEl.innerText;
        return text.trim() || null;
    }
    async function translateText(text, targetLang) {
        const response = await fetch('https://uapi.woobx.cn/v2/app/translation/translate', {
            method: 'POST',
            headers: {
                'User-Agent': 'WoodBox-Android/7.17.18-normal woodbox-vc/20250125',
                'accept-language': 'zh-CN',
                'Authorization': 'Bearer null',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `from=auto&to=${targetLang}&text=${encodeURIComponent(text)}`
        });

        if (!response.ok) {
            throw new Error(`翻译请求失败: ${response.status}`);
        }

        const data = await response.json();
        if (data.code !== 200) {
            throw new Error(data.message || '翻译失败');
        }

        return data.data.trans_result.dst;
    }
    function showTranslationResult(messageElement, result, targetLang) {
        const existingResult = messageElement.querySelector('.translation-result');
        if (existingResult) {
            existingResult.remove();
        }

        const bubble = messageElement.querySelector('.message-bubble');
        if (!bubble) return;

        const resultDiv = document.createElement('div');
        resultDiv.className = 'translation-result';
        resultDiv.style.cssText = `
            margin-top: 8px;
            padding: 8px 12px;
            background: #f0f8ff;
            border-radius: 6px;
            border-left: 3px solid #409eff;
            font-size: 13px;
            color: #333;
            word-break: break-all;
            position: relative;
        `;

        const langName = TARGET_LANGUAGES[targetLang] || targetLang;
        resultDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 11px; color: #999;">翻译 (${langName})</span>
                <button class="translation-close-btn" style="
                    background: none;
                    border: none;
                    color: #999;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 0 4px;
                ">✕</button>
            </div>
            <div class="translation-content">${escapeHtml(result)}</div>
        `;
        const closeBtn = resultDiv.querySelector('.translation-close-btn');
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            resultDiv.remove();
        });
        const textContainer = bubble.querySelector('.message-text');
        if (textContainer) {
            textContainer.after(resultDiv);
        } else {
            bubble.appendChild(resultDiv);
        }
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    async function translateMessage(messageElement, messageId) {
        if (!messageId) {
            messageId = messageElement.dataset.messageId;
        }

        if (!messageId) {
            showTranslationToast('无法获取消息ID', 'error');
            return;
        }
        if (isInCooldown(messageId)) {
            const remaining = getRemainingCooldown(messageId);
            showTranslationToast(`请等待 ${remaining} 秒后再试`, 'warning');
            return;
        }
        const text = getMessageText(messageElement);
        if (!text) {
            showTranslationToast('此消息无可翻译的内容', 'warning');
            return;
        }

        if (text.length === 0) {
            showTranslationToast('消息内容为空', 'warning');
            return;
        }
        const existingResult = messageElement.querySelector('.translation-result');
        if (existingResult) {
            existingResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }
        const targetLang = getTargetLanguage();
        try {
            recordTranslation(messageId);
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'translation-loading';
            loadingDiv.style.cssText = `
                margin-top: 8px;
                padding: 6px 12px;
                font-size: 12px;
                color: #999;
            `;
            loadingDiv.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 翻译中...';
            const bubble = messageElement.querySelector('.message-bubble');
            if (bubble) {
                const textContainer = bubble.querySelector('.message-text');
                if (textContainer) {
                    textContainer.after(loadingDiv);
                } else {
                    bubble.appendChild(loadingDiv);
                }
            }
            const result = await translateText(text, targetLang);
            loadingDiv.remove();
            showTranslationResult(messageElement, result, targetLang);
            showTranslationToast('翻译成功', 'success');

        } catch (error) {
            const loadingDiv = messageElement.querySelector('.translation-loading');
            if (loadingDiv) loadingDiv.remove();
            showTranslationToast(`翻译失败: ${error.message}`, 'error');
            console.error('翻译失败:', error);
        }
    }
    function showTranslationToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'translation-toast';
        const colors = {
            success: '#52c41a',
            warning: '#e6a23c',
            error: '#f56c6c',
            info: '#409eff'
        };

        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 24px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            border-left: 4px solid ${colors[type] || colors.info};
            z-index: 10001;
            font-size: 14px;
            color: #333;
            transition: all 0.3s ease;
            max-width: 80%;
        `;

        const iconMap = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };
        toast.innerHTML = `${iconMap[type] || ''} ${escapeHtml(message)}`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }, 3000);
    }
    function showLanguageSelector() {
        const currentLang = getTargetLanguage();
        const currentName = TARGET_LANGUAGES[currentLang] || '中文';
        const modal = document.createElement('div');
        modal.className = 'translation-lang-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.4);
            z-index: 10002;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #fff;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;

        let langOptionsHtml = '';
        for (const [code, name] of Object.entries(TARGET_LANGUAGES)) {
            const isActive = code === currentLang;
            langOptionsHtml += `
                <button class="lang-option-btn" data-lang="${code}" style="
                    display: block;
                    width: 100%;
                    padding: 10px 16px;
                    margin: 4px 0;
                    border: ${isActive ? '2px solid #409eff' : '1px solid #e0e0e0'};
                    border-radius: 6px;
                    background: ${isActive ? '#f0f8ff' : '#fff'};
                    color: ${isActive ? '#409eff' : '#333'};
                    cursor: pointer;
                    font-size: 14px;
                    text-align: left;
                    transition: all 0.2s;
                ">
                    ${isActive ? '✅ ' : ''}${name}
                </button>
            `;
        }

        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; font-size: 18px;">🌐 翻译目标语言</h3>
                <button class="lang-modal-close" style="
                    background: none;
                    border: none;
                    font-size: 20px;
                    color: #999;
                    cursor: pointer;
                ">✕</button>
            </div>
            <p style="color: #666; font-size: 13px; margin-bottom: 12px;">当前: ${currentName}</p>
            <div style="display: flex; flex-direction: column; gap: 4px;">
                ${langOptionsHtml}
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);
        content.querySelector('.lang-modal-close').addEventListener('click', () => {
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        content.querySelectorAll('.lang-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                if (setTargetLanguage(lang)) {
                    showTranslationToast(`已切换至 ${TARGET_LANGUAGES[lang]}`, 'success');
                    modal.remove();
                }
            });
        });
    }
    function init() {
        if (!localStorage.getItem('mok_translation_target_lang')) {
            setTargetLanguage('zh');
        }
    }

    return {
        init,
        translateMessage,
        showLanguageSelector,
        getTargetLanguage,
        setTargetLanguage,
        TARGET_LANGUAGES,
        isInCooldown,
        getRemainingCooldown
    };
})();
// ===================== 哈希链模块=====================
async function simpleSha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
async function hashy_getGenesisHash(conversationId, userId1, userId2) {
    const sortedUsers = [String(userId1), String(userId2)].sort();
    const genesisStr = `chain_${conversationId}_${sortedUsers[0]}_${sortedUsers[1]}`;
    return await simpleSha256(genesisStr);
}
async function hashy_getAllMessages(conversationId) {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('messages', 'readonly');
        const store = transaction.objectStore('messages');
        const index = store.index('conversationId');
        const request = index.getAll(conversationId);
        request.onsuccess = (e) => {
            let messages = e.target.result;
            messages = messages.filter(m => m.messageType !== 'system');
            messages.sort((a, b) => a.sendTime - b.sendTime);
            resolve(messages);
        };
        request.onerror = (e) => reject(e.target.error);
    });
}
async function hashy_addHashToMessage(message) {
    const allMessages = await hashy_getAllMessages(message.conversationId);
    const existingIndex = allMessages.findIndex(m => m.messageId === message.messageId);
    let prevHash = '';

    if (existingIndex > 0) {
        prevHash = allMessages[existingIndex - 1].chain_hash;
    } else if (allMessages.length > 0 && existingIndex === -1) {
        prevHash = allMessages[allMessages.length - 1].chain_hash;
    } else {
        const ids = [message.senderId, message.receiverId];
        prevHash = await hashy_getGenesisHash(message.conversationId, ids[0], ids[1]);
    }
    const hashContent = {
        prev_hash: prevHash,
        msg_id: message.messageId,
        sender: message.senderId,
        receiver: message.receiverId,
        content: message.content,
        send_time: message.sendTime,
        msg_type: message.messageType,
        conv_id: message.conversationId
    };

    const chainHash = await simpleSha256(JSON.stringify(hashContent));

    return {
        ...message,
        chain_prev_hash: prevHash,
        chain_hash: chainHash
    };
}
async function hashy_verifyConversation(conversationId) {
    const messages = await hashy_getAllMessages(conversationId);

    if (messages.length === 0) {
        return { valid: true, message: '无消息记录', totalMessages: 0, brokenMessages: [] };
    }

    const brokenMessages = [];
    let isValid = true;
    const firstMsg = messages[0];
    const ids = [firstMsg.senderId, firstMsg.receiverId];
    const genesisHash = await hashy_getGenesisHash(conversationId, ids[0], ids[1]);
    const senderSequence = [];
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        let expectedPrevHash = (i === 0) ? genesisHash : messages[i - 1].chain_hash;
        if (msg.chain_prev_hash !== expectedPrevHash) {
            isValid = false;
            brokenMessages.push({
                index: i,
                messageId: msg.messageId,
                time: msg.sendTime,
                reason: '链断裂（前置哈希不匹配）',
                expected: expectedPrevHash,
                actual: msg.chain_prev_hash
            });
            continue;
        }
        const hashContent = {
            prev_hash: msg.chain_prev_hash,
            msg_id: msg.messageId,
            sender: msg.senderId,
            receiver: msg.receiverId,
            content: msg.content,
            send_time: msg.sendTime,
            msg_type: msg.messageType,
            conv_id: conversationId
        };
        const calculatedHash = await simpleSha256(JSON.stringify(hashContent));
        if (calculatedHash !== msg.chain_hash) {
            isValid = false;
            brokenMessages.push({
                index: i,
                messageId: msg.messageId,
                time: msg.sendTime,
                reason: '内容被篡改（哈希不匹配）',
                expected: calculatedHash,
                actual: msg.chain_hash
            });
            continue;
        }
        senderSequence.push({
            index: i,
            senderId: msg.senderId,
            time: msg.sendTime
        });
        if (i > 0 && msg.sendTime < messages[i - 1].sendTime) {
            isValid = false;
            brokenMessages.push({
                index: i,
                messageId: msg.messageId,
                time: msg.sendTime,
                reason: '时间戳异常（消息时间早于上一条）'
            });
        }
    }
    return {
        valid: isValid,
        totalMessages: messages.length,
        firstMessageTime: messages[0]?.sendTime,
        lastMessageTime: messages[messages.length - 1]?.sendTime,
        genesisHash: genesisHash,
        lastHash: messages[messages.length - 1]?.chain_hash,
        brokenMessages: brokenMessages,
        message: isValid ? '✅ 验证通过' : '❌ 验证失败'
    };
}
async function hashy_migrateMessages() {
    const db = await initIndexedDB();
    const allMessages = await new Promise((resolve, reject) => {
        const transaction = db.transaction('messages', 'readonly');
        const store = transaction.objectStore('messages');
        const request = store.getAll();
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
    const conversations = new Map();
    for (const msg of allMessages) {
        if (msg.messageType === 'system') continue;
        if (!conversations.has(msg.conversationId)) {
            conversations.set(msg.conversationId, []);
        }
        conversations.get(msg.conversationId).push(msg);
    }

    let totalFixed = 0;

    for (const [convId, messages] of conversations) {
        messages.sort((a, b) => a.sendTime - b.sendTime);
        if (messages.length === 0) continue;
        const firstMsg = messages[0];
        const ids = [firstMsg.senderId, firstMsg.receiverId];
        let prevHash = await hashy_getGenesisHash(convId, ids[0], ids[1]);
        for (const msg of messages) {
            const hashContent = {
                prev_hash: prevHash,
                msg_id: msg.messageId,
                sender: msg.senderId,
                receiver: msg.receiverId,
                content: msg.content,
                send_time: msg.sendTime,
                msg_type: msg.messageType
            };
            const chainHash = await simpleSha256(JSON.stringify(hashContent));

            msg.chain_prev_hash = prevHash;
            msg.chain_hash = chainHash;
            prevHash = chainHash;
            const updateTx = db.transaction('messages', 'readwrite');
            const updateStore = updateTx.objectStore('messages');
            updateStore.put(msg);
            await new Promise((resolve) => { updateTx.oncomplete = resolve; });
            totalFixed++;
        }
    }

    alertMsg(`哈希链迁移完成！共处理 ${totalFixed} 条消息`);
}

async function hashy_exportChatEvidence(conversationId, contactName) {
    Loading.show('正在生成证据包...');

    try {
        const verification = await hashy_verifyConversation(conversationId);
        if (verification.totalMessages === 0) {
            alertMsg('该会话暂无消息记录，无法生成证据包');
            Loading.hide();
            return;
        }
        const messages = await hashy_getAllMessages(conversationId);
        const myId = appState.userId;
        const otherId = messages.find(m => m.senderId !== myId)?.senderId || 'unknown';
        const chatHistory = messages.map((msg, idx) => ({
            sequence: idx + 1,
            time: new Date(msg.sendTime).toISOString(),
            timeLocal: new Date(msg.sendTime).toLocaleString('zh-CN'),
            sender: msg.senderId === myId ? '我' : (contactName || msg.senderId),
            senderId: msg.senderId,
            content: msg.content?.text || msg.content?.fileName || `[${msg.messageType}]`,
            hash: msg.chain_hash,
            prevHash: msg.chain_prev_hash
        }));
        const evidence = {
            metadata: {
                version: '1.0',
                exportTime: new Date().toISOString(),
                exportTimeLocal: new Date().toLocaleString('zh-CN'),
                conversationId: conversationId,
                myId: myId,
                otherId: otherId,
                otherName: contactName || '未知联系人'
            },
            verification: {
                isValid: verification.valid,
                totalMessages: verification.totalMessages,
                genesisHash: verification.genesisHash,
                lastHash: verification.lastHash,
                verifyTime: new Date().toISOString()
            },
            conclusion: verification.valid
                ? '聊天记录完整有效，哈希链验证通过'
                : '聊天记录已被篡改或删除',
            brokenMessages: verification.brokenMessages,
            chatHistory: chatHistory,
            algorithm: 'SHA-256',
            chainType: 'sequential'
        };
        const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_evidence_${conversationId}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Loading.hide();
        if (verification.valid) {
            await Swal.fire({
                icon: 'success',
                title: '验证通过',
                html: `
                    <div style="text-align: left;">
                        <p><strong>✅ 聊天记录完整有效！</strong></p>
                        <hr>
                        <p>📊 总消息数：${verification.totalMessages} 条</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">📦 证据包已下载，包含完整哈希链</p>
                    </div>
                `,
                confirmButtonText: '确定'
            });
        } else {
            const broken = verification.brokenMessages[0];
            await Swal.fire({
                icon: 'error',
                title: '验证失败',
                html: `
                    <div style="text-align: left;">
                        <p><strong>❌ 聊天记录已被篡改！</strong></p>
                        <hr>
                        <p>🔴 问题位置：第 ${broken?.index + 1} 条消息</p>
                        <p>📝 问题原因：${broken?.reason}</p>
                        <p>⏰ 问题时间：${broken?.time ? new Date(broken.time).toLocaleString('zh-CN') : '未知'}</p>
                        <hr>
                        <p style="font-size: 12px; color: #f56c6c;">⚠️ 此导出文件不具备法律效力</p>
                    </div>
                `,
                confirmButtonText: '确定'
            });
        }

        return evidence;

    } catch (error) {
        Loading.hide();
        alertMsg(`导出失败：${error.message}`);
        throw error;
    }
}
//-------------------------------
const emojiCache = new Map();
const MOKIM_MAX_MESSAGE_LENGTH = 1500; //单条文本消息限制
let emojiPreloadTimer = null;
const EMOJI_BASE_PATH = 'ast/image/emoji/';
function xplugin_idToCode(id, length = 8) {
    if (!id && id !== 0) {
        throw new Error('ID不能为空');
    }
    const idStr = String(id).trim();
    if (idStr === '') {
        throw new Error('ID不能为空白字符串');
    }
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
    const charsetLen = charset.length;
    let hash = simpleHash(idStr);
    let code = '';
    for (let i = 0; i < length; i++) {
        const index = hash % charsetLen;
        code += charset[index];
        hash = Math.floor(hash / charsetLen);
    }

    return code;
}
var jucontactclick_bytwicetry = 0;
// ===================== 聊天记录搜索 =====================
function mokrun_bindConversationSearch() {
    const conversationList = document.querySelector('.conversation-list');
    const searchBox = document.querySelector('.search-box');
    if (!searchBox || !conversationList) return;
    searchBox.addEventListener('input', function (e) {
        const searchText = e.target.value.trim().toLowerCase();
        const conversationItems = conversationList.querySelectorAll('.conversation-item');
        conversationItems.forEach(item => {
            const convName = item.querySelector('.conv-name');
            if (convName) {
                const nameText = convName.textContent.toLowerCase();
                if (searchText === '' || nameText.includes(searchText)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            }
        });
    });
}
function initSimpleSearch() {
    const searchInput = document.querySelector('.glinput-search input');
    const searchIcon = document.querySelector('.glinput-search .search-icon');
    const clearBtn = document.getElementById('glclearBtn');
    const contentList = document.querySelector('.s-content-search-result');
    if (!searchInput) return;
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const keyword = searchInput.value.trim();

            if (!keyword) {
                alertMsg('请输入搜索关键词');
                return;
            }

            if (!appState.selectedContact) {
                alertMsg('请先选择一个会话');
                return;
            }

            performSimpleSearch(keyword);
        }
    });
    if (searchIcon) {
        searchIcon.addEventListener('click', () => {
            const keyword = searchInput.value.trim();

            if (!keyword) {
                alertMsg('请输入搜索关键词');
                return;
            }

            if (!appState.selectedContact) {
                alertMsg('请先选择一个会话');
                return;
            }

            performSimpleSearch(keyword);
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            if (contentList) {
                contentList.innerHTML = '';
                contentList.style.display = 'none';
            }
        });
    }
}
async function performSimpleSearch(keyword) {
    if (!appState.selectedContact) return;
    const conversationId = appState.selectedContact.conversationId;
    const contentList = document.querySelector('.content-list');
    if (!contentList) return;
    Loading.show(`正在搜索“${keyword}”...`);
    try {
        setTimeout(async () => {
            try {
                const db = await initIndexedDB();
                const transaction = db.transaction('messages', 'readonly');
                const store = transaction.objectStore('messages');
                const index = store.index('conversationId');
                const request = index.getAll(conversationId);
                request.onsuccess = (e) => {
                    const messages = e.target.result;
                    const results = [];
                    const lowerKeyword = keyword.toLowerCase();
                    for (const msg of messages) {
                        let matched = false;
                        let displayText = '';
                        switch (msg.messageType) {
                            case 'text':
                                if (msg.content.text && msg.content.text.toLowerCase().includes(lowerKeyword)) {
                                    matched = true;
                                    displayText = mokim_shouldShowPlainText(msg) ? msg.content.text : '[LOCKED]';
                                }
                                break;
                            case 'image':
                                displayText = '[图片]';
                                break;
                            case 'file':
                                if (msg.content.fileName && msg.content.fileName.toLowerCase().includes(lowerKeyword)) {
                                    matched = true;
                                    displayText = `[文件] ${msg.content.fileName}`;
                                } else {
                                    displayText = '[文件]';
                                }
                                break;
                            case 'quote':
                                if (msg.content.text && msg.content.text.toLowerCase().includes(lowerKeyword)) {
                                    matched = true;
                                    displayText = `[引用] ${msg.content.text}`;
                                }
                                break;
                            case 'invite_group':
                                displayText = '[邀请加入群组]';
                                break;
                            case 'call':
                                displayText = msg.content.callType === 'video' ? '[视频通话]' : '[语音通话]';
                                break;
                            case 'system':
                                if (msg.content.systemText && msg.content.systemText.toLowerCase().includes(lowerKeyword)) {
                                    matched = true;
                                    displayText = `[系统消息] ${msg.content.systemText}`;
                                } else {
                                    displayText = '[系统消息]';
                                }
                                break;
                            case 'gift':
                                displayText = '[礼物]';
                                break;
                            case 'music':
                                displayText = '[音乐分享]';
                                break;
                            case 'video':
                                displayText = '[视频分享]';
                                break;
                            case 'game':
                                displayText = '[游戏分享]';
                                break;
                            case 'redpacket':
                                displayText = '[红包]';
                                break;
                            case 'files':
                                displayText = '[文件分享]';
                                break;
                            default:
                                displayText = `[${msg.messageType}]`;
                        }

                        if (matched) {
                            results.push({
                                messageId: msg.messageId,
                                sender: msg.isSelf ? '我' : (msg.senderName || msg.senderId || '对方'),
                                content: displayText,
                                time: formatTime(msg.sendTime),
                                sendTime: msg.sendTime
                            });
                        }
                    }
                    results.sort((a, b) => b.sendTime - a.sendTime);
                    renderSimpleResults(results, keyword);
                    Loading.hide();
                };

                request.onerror = () => {
                    Loading.hide();
                    alertMsg('搜索失败，请重试');
                };

            } catch (error) {
                Loading.hide();
                alertMsg(`搜索失败：${error.message}`);
                console.error('搜索失败:', error);
            }
        }, 0);

    } catch (error) {
        Loading.hide();
        alertMsg(`搜索失败：${error.message}`);
    }
}
function renderSimpleResults(results, keyword) {
    const contentList = document.querySelector('.s-content-search-result');
    if (!contentList) return;

    if (results.length === 0) {
        contentList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #999;">
                <i class="fas fa-search" style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>未找到包含“${escapeHtml(keyword)}”的聊天记录</p>
            </div>
        `;
        contentList.style.display = 'block';
        return;
    }

    let html = `
        <div style="padding: 8px 12px; background: #f5f7fa; border-bottom: 1px solid #e0e0e0;">
            <span style="font-size: 13px; color: #409eff;">找到 ${results.length} 条相关记录</span>
        </div>
    `;

    results.forEach(result => {
        const highlightedContent = result.content.replace(
            new RegExp(escapeRegExp(keyword), 'gi'),
            match => `<span style="background-color: #ffeb3b; color: #333; padding: 0 2px; border-radius: 2px;">${match}</span>`
        );

        html += `
            <li class="search-result-item" data-message-id="${result.messageId}" 
                style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; list-style: none;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-size: 13px; font-weight: 500; color: #333;">${escapeHtml(result.sender)}</span>
                    <span style="font-size: 11px; color: #999;">${result.time}</span>
                </div>
                <div style="font-size: 12px; color: #666; line-height: 1.4;">${highlightedContent}</div>
            </li>
        `;
    });

    contentList.innerHTML = html;
    contentList.style.display = 'block';


    contentList.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const messageId = item.dataset.messageId;
            jumpToSimpleMessage(messageId);
        });
    });
}

function mokim_tool_getDaysDiff(time1, time2) {
    const date1 = new Date(time1);
    const date2 = new Date(time2);
    const diffMs = Math.abs(date2 - date1);
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return days;
}
function mokim_tool_getIntimacyLevel(value, mrgx) {
    if (mrgx === null || !mrgx) {
        if (value >= 5000) return '死党';
        if (value >= 3000) return '挚友';
        if (value >= 1000) return '好友';
        if (value >= 500) return '朋友';
        if (value >= 100) return '认识';
        return '陌生人';
    } else {
        return mrgx;
    }
}
function jumpToSimpleMessage(messageId) {
    const targetMsg = document.querySelector(`.message-item[data-message-id="${messageId}"]`);

    if (targetMsg) {
        targetMsg.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        targetMsg.style.transition = 'all 0.3s';
        targetMsg.style.backgroundColor = '#fff9e6';
        targetMsg.style.border = '1px solid #409eff';

        setTimeout(() => {
            targetMsg.style.backgroundColor = '';
            targetMsg.style.border = '';
        }, 2000);
    } else {
        alertMsg('消息未加载，请先加载更多消息');
    }
}
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// ===================== 输入状态管理 =====================
let typingTimeout = null;
let typingStarted = false;
let typingEndTimeout = null;
let lastTypingNotifyTime = 0;
const TYPING_NOTIFY_INTERVAL = 5000;
const TYPING_END_DELAY = 3000;
const EMOJI_IDS = new Set(
    Array.from({ length: 141 }, (_, i) => `eg_${String(i + 1).padStart(4, '0')}`)
);
function handleTypingStatus() {
    const chatInput = document.querySelector('.chat-input');
    if (!chatInput || !appState.selectedContact) return;
    const count = chatInput.value.length;
    document.getElementById('mokim_input_charCount').textContent = `${count} / ${MOKIM_MAX_MESSAGE_LENGTH}`;
    if (count > MOKIM_MAX_MESSAGE_LENGTH) {
        document.getElementById('mokim_input_charCount').style.color = '#f56c6c';
    } else {
        document.getElementById('mokim_input_charCount').style.color = '#999';
    }
    if (count && count > 0) {
        document.getElementById('mokim_zujian_send_btn').disabled = false;
    } else {
        document.getElementById('mokim_zujian_send_btn').disabled = true;
    }
    const settings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
    if (settings.typingStatus === false) return;
    clearTimeout(typingTimeout);
    if (!typingStarted) {
        typingStarted = true;
        const now = Date.now();
        if (now - lastTypingNotifyTime >= TYPING_NOTIFY_INTERVAL) {
            sendTypingStatus('start');
            lastTypingNotifyTime = now;
        }
    }
    clearTimeout(typingEndTimeout);
    typingEndTimeout = setTimeout(() => {
        if (typingStarted) {
            typingStarted = false;
            sendTypingStatus('end');
        }
    }, TYPING_END_DELAY);
}
function sendTypingStatus(status) {
    if (!appState.isConnected || !appState.selectedContact) return;
    sendWsMessage({
        type: 'typing_status',
        data: {
            conversationId: appState.selectedContact.conversationId,
            receiverId: appState.selectedContact.contactId,
            status: status,
            timestamp: Date.now()
        }
    });
}
function handleTypingStatusReceived(data) {
    const { conversationId, senderId, status } = data;
    if (appState.selectedContact?.conversationId !== conversationId) return;
    if (senderId === appState.userId) return;
    const chatTitle = document.querySelector('.chat-title');
    if (!chatTitle) return;
    if (status === 'start') {
        if (!chatTitle.dataset.originalTitle) {
            chatTitle.dataset.originalTitle = chatTitle.textContent;
        }
        chatTitle.textContent = '对方正在输入...';
        setTimeout(() => {
            if (chatTitle.textContent === '对方正在输入...') {
                chatTitle.textContent = chatTitle.dataset.originalTitle || '';
                delete chatTitle.dataset.originalTitle;
            }
        }, 5000);
    } else if (status === 'end') {
        if (chatTitle.dataset.originalTitle) {
            chatTitle.textContent = chatTitle.dataset.originalTitle;
            delete chatTitle.dataset.originalTitle;
        }
    }
}
// ===================== 通用右键菜单模块 =====================
let currentQuoteMsgId = null;
const QUOTE_HIGHLIGHT_STYLE = `
    border: 2px solid #409eff;
    background-color: #f0f8ff;
    border-radius: 4px;
`;
const DEFAULT_STYLE = `
    border: none;
    background-color: transparent;
`;
const ContextMenu = (function () {
    const createMenuElement = () => {
        let menu = document.getElementById('custom-context-menu');
        if (menu) return menu;

        const menuEl = document.createElement('div');
        menuEl.id = 'custom-context-menu';
        menuEl.className = 'context-menu';
        menuEl.style.cssText = `
            position: fixed;
            z-index: 9999;
            background: #fff;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.15);
            padding: 8px 0;
            display: none;
            min-width: 120px;
        `;
        document.body.appendChild(menuEl);
        return menuEl;
    };

    const menuEl = createMenuElement();
    let currentTarget = null;
    const hideMenu = () => {
        menuEl.style.display = 'none';
        currentTarget = null;
    };
    document.addEventListener('click', (e) => {
        if (!menuEl.contains(e.target)) {
            hideMenu();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideMenu();
    });
    return {
        show: function (options) {
            const { event, target, items } = options;
            event.preventDefault();
            menuEl.innerHTML = '';
            currentTarget = target;
            items.forEach(item => {
                if (item.disabled) return;
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                menuItem.style.cssText = `
                    padding: 8px 16px;
                    cursor: pointer;
                    font-size: 14px;
                    color: #333;
                `;
                menuItem.textContent = item.label;
                menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.background = '#f5f5f5';
                });
                menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.background = 'transparent';
                });
                menuItem.addEventListener('click', () => {
                    item.action(currentTarget);
                    hideMenu();
                });

                menuEl.appendChild(menuItem);
            });
            const { clientX, clientY } = event;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const menuWidth = menuEl.offsetWidth || 120;
            const menuHeight = menuEl.offsetHeight || 80;
            let left = clientX;
            let top = clientY;
            if (left + menuWidth > viewportWidth) {
                left = clientX - menuWidth;
            }
            if (top + menuHeight > viewportHeight) {
                top = clientY - menuHeight;
            }

            menuEl.style.left = `${left}px`;
            menuEl.style.top = `${top}px`;
            menuEl.style.display = 'block';
        },
        hide: hideMenu,
        bind: function (selector, getItemFn) {
            document.addEventListener('contextmenu', (e) => {
                const target = e.target.closest(selector);
                if (target) {
                    const items = getItemFn(target);
                    this.show({
                        event: e,
                        target: target,
                        items: items
                    });
                }
            });
        }
    };
})();
// ===================== 批量删除消息模块 =====================
let isBatchMode = false;
let selectedMessages = new Set();
let batchToolbar = null;
function createBatchToolbar() {
    if (batchToolbar) return batchToolbar;

    batchToolbar = document.createElement('div');
    batchToolbar.id = 'batch-toolbar';
    batchToolbar.className = 'batch-toolbar';
    batchToolbar.style.cssText = `
        position: sticky;
        bottom: 0;
        left: 0;
        right: 0;
        background: #fff;
        border-top: 1px solid #e0e0e0;
        padding: 12px 20px;
        display: none;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        z-index: 100;
        border-radius: 0 0 8px 8px;
    `;

    batchToolbar.innerHTML = `
        <div class="batch-info">
            <span class="batch-count">已选择 <strong>0</strong> 条消息</span>
        </div>
        <div class="batch-actions">
            <button class="batch-select-all btn btn-sm btn-outline-primary">全选</button>
            <button class="batch-cancel btn btn-sm btn-outline-secondary">取消</button>
            <button class="batch-delete btn btn-sm btn-danger" disabled>删除</button>
        </div>
    `;


    const style = document.createElement('style');
    style.textContent = `
        .batch-toolbar .btn-sm {
            padding: 6px 12px;
            font-size: 13px;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 8px;
            border: 1px solid transparent;
        }
        .batch-toolbar .btn-outline-primary {
            color: #409eff;
            border-color: #409eff;
            background: transparent;
        }
        .batch-toolbar .btn-outline-primary:hover {
            background: #409eff;
            color: #fff;
        }
        .batch-toolbar .btn-outline-secondary {
            color: #909399;
            border-color: #dcdfe6;
            background: transparent;
        }
        .batch-toolbar .btn-outline-secondary:hover {
            background: #f5f7fa;
        }
        .batch-toolbar .btn-danger {
            background: #f56c6c;
            color: #fff;
            border-color: #f56c6c;
        }
        .batch-toolbar .btn-danger:hover {
            background: #f78989;
        }
        .batch-toolbar .btn-danger:disabled {
            background: #fab6b6;
            border-color: #fab6b6;
            cursor: not-allowed;
        }
        .message-item.batch-selected {
            background-color: #f0f9ff;
            border: 1px solid #409eff;
            border-radius: 8px;
        }
        .message-checkbox {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 20px;
            height: 20px;
            cursor: pointer;
            display: none;
            z-index: 10;
        }
        .message-item {
            position: relative;
        }
        .batch-mode .message-checkbox {
            display: block;
        }
        .batch-mode .message-item {
            padding-left: 40px !important;
        }
        .message-item.batch-selected .message-checkbox {
            accent-color: #409eff;
        }
    `;

    document.head.appendChild(style);

    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        chatMessages.parentNode.insertBefore(batchToolbar, chatMessages.nextSibling);
    } else {
        document.body.appendChild(batchToolbar);
    }

    return batchToolbar;
}
function enterBatchMode() {
    if (isBatchMode) return;
    isBatchMode = true;
    selectedMessages.clear();
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        chatMessages.classList.add('batch-mode');
    }
    addCheckboxesToMessages();
    if (!batchToolbar) {
        createBatchToolbar();
    }
    updateBatchToolbar();
    batchToolbar.style.display = 'flex';
    bindBatchToolbarEvents();
}
function exitBatchMode() {
    if (!isBatchMode) return;
    isBatchMode = false;
    selectedMessages.clear();
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        chatMessages.classList.remove('batch-mode');
    }
    removeCheckboxesFromMessages();
    if (batchToolbar) {
        batchToolbar.style.display = 'none';
    }
    document.querySelectorAll('.message-item.batch-selected').forEach(item => {
        item.classList.remove('batch-selected');
    });
}
function addCheckboxesToMessages() {
    document.querySelectorAll('.message-item:not(.message-system)').forEach(messageItem => {
        if (!messageItem.querySelector('.message-checkbox')) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'message-checkbox';
            checkbox.dataset.messageId = messageItem.dataset.messageId;

            checkbox.addEventListener('change', (e) => {
                const msgId = e.target.dataset.messageId;
                if (e.target.checked) {
                    selectedMessages.add(msgId);
                    messageItem.classList.add('batch-selected');
                } else {
                    selectedMessages.delete(msgId);
                    messageItem.classList.remove('batch-selected');
                }
                updateBatchToolbar();
            });

            messageItem.style.position = 'relative';
            messageItem.insertBefore(checkbox, messageItem.firstChild);
        }
    });
}
function removeCheckboxesFromMessages() {
    document.querySelectorAll('.message-checkbox').forEach(checkbox => {
        checkbox.remove();
    });
}
function updateBatchToolbar() {
    if (!batchToolbar) return;
    const countSpan = batchToolbar.querySelector('.batch-count strong');
    if (countSpan) {
        countSpan.textContent = selectedMessages.size;
    }
    const deleteBtn = batchToolbar.querySelector('.batch-delete');
    if (deleteBtn) {
        deleteBtn.disabled = selectedMessages.size === 0;
    }
}
function bindBatchToolbarEvents() {
    if (!batchToolbar) return;
    const newToolbar = batchToolbar.cloneNode(true);
    batchToolbar.parentNode.replaceChild(newToolbar, batchToolbar);
    batchToolbar = newToolbar;
    batchToolbar.querySelector('.batch-select-all')?.addEventListener('click', () => {
        const allCheckboxes = document.querySelectorAll('.message-checkbox');
        const allSelected = Array.from(allCheckboxes).every(cb => cb.checked);

        allCheckboxes.forEach(checkbox => {
            checkbox.checked = !allSelected;
            const msgId = checkbox.dataset.messageId;
            const messageItem = checkbox.closest('.message-item');

            if (!allSelected) {
                selectedMessages.add(msgId);
                messageItem.classList.add('batch-selected');
            } else {
                selectedMessages.delete(msgId);
                messageItem.classList.remove('batch-selected');
            }
        });

        updateBatchToolbar();
    });
    batchToolbar.querySelector('.batch-cancel')?.addEventListener('click', () => {
        exitBatchMode();
    });
    batchToolbar.querySelector('.batch-delete')?.addEventListener('click', async () => {
        if (selectedMessages.size === 0) return;

        const confirmMsg = `确定要删除选中的 ${selectedMessages.size} 条消息吗？此操作不可恢复！`;
        if (!await mok_confirm(confirmMsg)) return;

        await batchDeleteMessages(Array.from(selectedMessages));
    });
}
async function batchDeleteMessages(messageIds) {
    try {
        Loading.show(`正在删除 ${messageIds.length} 条消息...`);
        for (const msgId of messageIds) {
            await deleteMessageFromDB(msgId);
            const messageItem = document.querySelector(`.message-item[data-message-id="${msgId}"]`);
            if (messageItem) {
                messageItem.remove();
            }
        }
        if (appState.selectedContact) {
            const { conversationId } = appState.selectedContact;

            const db = await initIndexedDB();
            const transaction = db.transaction('messages', 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('conversationId');
            const request = index.getAll(conversationId);

            request.onsuccess = async (e) => {
                const messages = e.target.result;

                if (messages.length > 0) {
                    const latestMsg = messages.sort((a, b) => b.sendTime - a.sendTime)[0];
                    let lastMessagePreview = '';

                    switch (latestMsg.messageType) {
                        case 'text':
                            lastMessagePreview = latestMsg.content.text || '';
                            break;
                        case 'image':
                            lastMessagePreview = '[图片]';
                            break;
                        case 'file':
                            lastMessagePreview = `[文件: ${latestMsg.content.fileName || '未知文件'}]`;
                            break;
                        case 'quote':
                            lastMessagePreview = `[引用] ${latestMsg.content.text || ''}`;
                            break;
                        case 'call':
                            lastMessagePreview = `[${latestMsg.content.callType === 'video' ? '视频' : '语音'}通话]`;
                            break;
                        case 'invite_group':
                            lastMessagePreview = '[群邀请]';
                            break;
                        case 'system':
                            lastMessagePreview = `[系统消息] ${latestMsg.content.systemText || ''}`;
                            break;
                        case 'gift':
                            lastMessagePreview = `[礼物]`;
                            break;
                        default:
                            lastMessagePreview = `[${latestMsg.messageType}]`;
                    }

                    if (lastMessagePreview.length > 20) {
                        lastMessagePreview = lastMessagePreview.substring(0, 20) + '...';
                    }

                    updateContactLastMessage(conversationId, lastMessagePreview, latestMsg.sendTime);
                } else {
                    updateContactLastMessage(conversationId, '暂无消息', 0);
                }
                await renderContacts();
                await renderGroups();
                exitBatchMode();
                Loading.hide();
                alertMsg(`成功删除 ${messageIds.length} 条消息`);
            };
        } else {
            exitBatchMode();
            Loading.hide();
            alertMsg(`成功删除 ${messageIds.length} 条消息`);
        }

    } catch (error) {
        Loading.hide();
        alertMsg(`批量删除失败：${error.message}`);
        console.error('批量删除消息失败:', error);
    }
}
function updateContactLastMessage(conversationId, lastMessage, lastInteractTime) {
    appState.contacts = appState.contacts.map(contact => {
        if (contact.conversationId === conversationId) {
            return {
                ...contact,
                lastMessage,
                lastInteractTime
            };
        }
        return contact;
    });

    appState.groups = appState.groups.map(group => {
        if (group.conversationId === conversationId) {
            return {
                ...group,
                lastMessage,
                lastInteractTime
            };
        }
        return group;
    });
}
// ===================== 已读回执=====================

async function sendReadReceipt(conversationId, messageIds, receiverId) {
    const settings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
    if (settings.readReceipt === false) return;

    if (!appState.isConnected || !messageIds || messageIds.length === 0) return;

    sendWsMessage({
        type: 'read_receipt',
        data: {
            conversationId: conversationId,
            messageIds: messageIds,
            readerId: appState.userId,
            readTime: Date.now(),
            receiverId: receiverId,
        }
    });
}


function handleReadReceipt(data) {
    const { conversationId, messageIds, readerId, readTime } = data;
    if (appState.selectedContact?.conversationId !== conversationId) return;
    messageIds.forEach(msgId => {
        const messageItem = document.querySelector(`.message-item.self[data-message-id="${msgId}"]`);
        if (messageItem) {
            const readStatus = messageItem.querySelector('.message-status-container');
            if (readStatus) {
                readStatus.innerHTML = '<i class="fas fa-check-double" style="color: #409eff;" title="已读"></i>';
                messageItem.dataset.read = 'true';
            }
        }
    });
    updateMessagesReadStatus(messageIds);
}
async function updateMessagesReadStatus(messageIds) {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction('messages', 'readwrite');
        const store = transaction.objectStore('messages');

        for (const msgId of messageIds) {
            const request = store.get(msgId);
            request.onsuccess = (e) => {
                const message = e.target.result;
                if (message) {
                    message.read = true;
                    store.put(message);
                }
            };
        }
    } catch (error) {
        console.error('更新消息已读状态失败:', error);
    }
}

async function markConversationAsRead(conversationId) {
    const settings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
    if (settings.readReceipt === false) return;
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction('messages', 'readonly');
        const store = transaction.objectStore('messages');
        const index = store.index('conversationId');
        const request = index.getAll(conversationId);

        request.onsuccess = (e) => {
            const messages = e.target.result;
            const unreadMessages = messages
                .filter(msg => !msg.isSelf && !msg.read)
                .map(msg => msg.messageId);

            if (unreadMessages.length > 0) {
                const receiverId = appState.selectedContact?.contactId;
                sendReadReceipt(conversationId, unreadMessages, receiverId);
                updateMessagesReadStatus(unreadMessages);
            }
        };
    } catch (error) {
        console.error('标记会话已读失败:', error);
    }
}
function initEmojiPicker() {
    const emojiBtn = document.querySelector('.emoji-picker-btn');
    const emojiPanel = document.createElement('div');
    emojiPanel.className = 'emoji-panel';
    emojiPanel.style.display = 'none';
    document.body.appendChild(emojiPanel);
    let emojisLoaded = false;
    const commonEmojis = [];
    for (let i = 1; i <= 141; i++) {
        const emojiId = `eg_${String(i).padStart(4, '0')}`;
        commonEmojis.push(emojiId);
    }
    function loadEmojisInBatches(batchSize = 20, onComplete) {
        let currentIndex = 0;
        function loadBatch() {
            const endIndex = Math.min(currentIndex + batchSize, commonEmojis.length);
            const fragment = document.createDocumentFragment();
            for (let i = currentIndex; i < endIndex; i++) {
                const emojiId = commonEmojis[i];
                const emojiItem = document.createElement('div');
                emojiItem.className = 'emoji-item';
                emojiItem.innerHTML = `
                    <div class="emoji-placeholder" style="width:32px;height:32px;background:#f0f0f0;border-radius:4px;"></div>
                    <img 
                        data-src="ast/image/emoji/${emojiId}.png" 
                        alt="${emojiId}" 
                        title=":${emojiId}:"
                        class="emoji-lazy"
                        style="display:none;"
                        loading="lazy"
                    >
                `;

                const img = emojiItem.querySelector('img');
                const placeholder = emojiItem.querySelector('.emoji-placeholder');
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            img.src = img.dataset.src;
                            img.style.display = 'block';
                            placeholder.style.display = 'none';
                            observer.unobserve(img);
                        }
                    });
                }, { rootMargin: '50px' });
                observer.observe(placeholder);
                emojiItem.addEventListener('click', () => {
                    const chatInput = document.querySelector('.chat-input');
                    if (chatInput) {
                        chatInput.value += ` [#${emojiId}] `;
                        chatInput.focus();
                    }
                    emojiPanel.style.display = 'none';
                });

                fragment.appendChild(emojiItem);
            }
            emojiPanel.appendChild(fragment);
            currentIndex = endIndex;
            if (currentIndex < commonEmojis.length) {
                setTimeout(loadBatch, 100);
            } else if (onComplete) {
                onComplete();
            }
        }

        loadBatch();
    }
    function showEmojiPanel() {
        emojiPanel.style.display = 'flex';
        if (!emojisLoaded) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'emoji-loading';
            loadingDiv.innerHTML = '<span>加载表情中...</span>';
            loadingDiv.style.cssText = 'text-align:center;padding:20px;color:#999;';
            emojiPanel.appendChild(loadingDiv);
            setTimeout(() => {
                emojiPanel.innerHTML = '';
                loadEmojisInBatches(20, () => {
                    emojisLoaded = true;
                });
            }, 50);
        }
    }
    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = emojiBtn.getBoundingClientRect();
        emojiPanel.style.position = 'fixed';
        emojiPanel.style.left = rect.left + 'px';
        emojiPanel.style.bottom = (window.innerHeight - rect.top + 10) + 'px';

        if (emojiPanel.style.display === 'none') {
            showEmojiPanel();
        } else {
            emojiPanel.style.display = 'none';
        }
    });
    document.addEventListener('click', (e) => {
        if (!emojiPanel.contains(e.target) && !emojiBtn.contains(e.target)) {
            emojiPanel.style.display = 'none';
        }
    });
}
// ===================== 消息右键菜单绑定 =====================
function handleChatInputDblClick() {
    const chatInput = document.querySelector('.chat-input');
    const quoteItem = document.querySelector(`.message-item[data-message-id="${currentQuoteMsgId}"]`);
    if (quoteItem) quoteItem.style.cssText = DEFAULT_STYLE;
    currentQuoteMsgId = null;
    chatInput.placeholder = '请输入消息...';
    chatInput.removeEventListener('dblclick', handleChatInputDblClick);
}
async function deleteMessage(msgId, messageItem) {
    try {
        if (!await mok_confirm('确定要删除这条消息吗？')) {
            return;
        }

        Loading.show('正在删除消息...');

        await deleteMessageFromDB(msgId);

        if (messageItem) {
            messageItem.remove();
        }
        if (isBatchMode && selectedMessages.has(msgId)) {
            selectedMessages.delete(msgId);
            updateBatchToolbar();
        }

        if (appState.selectedContact) {
            const { conversationId } = appState.selectedContact;

            const db = await initIndexedDB();
            const transaction = db.transaction('messages', 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('conversationId');
            const request = index.getAll(conversationId);

            request.onsuccess = async (e) => {
                const messages = e.target.result;
                if (messages.length > 0) {
                    const latestMsg = messages.sort((a, b) => b.sendTime - a.sendTime)[0];
                    let lastMessagePreview = '';

                    switch (latestMsg.messageType) {
                        case 'text':
                            lastMessagePreview = latestMsg.content.text || '';
                            break;
                        case 'image':
                            lastMessagePreview = '[图片]';
                            break;
                        case 'file':
                            lastMessagePreview = `[文件: ${latestMsg.content.fileName || '未知文件'}]`;
                            break;
                        case 'quote':
                            lastMessagePreview = `[引用] ${latestMsg.content.text || ''}`;
                            break;
                        case 'invite_group':
                            lastMessagePreview = `[邀请加入群组]`;
                            break;
                        case 'call':
                            lastMessagePreview = `[${latestMsg.content.callType === 'video' ? '视频' : '语音'}通话]`;
                            break;
                        case 'system':
                            lastMessagePreview = `[系统消息] ${latestMsg.content.systemText || ''}`;
                            break;
                        case 'gift':
                            lastMessagePreview = `[礼物]`;
                            break;
                        default:
                            lastMessagePreview = `[${latestMsg.messageType}]`;
                    }

                    if (lastMessagePreview.length > 20) {
                        lastMessagePreview = lastMessagePreview.substring(0, 20) + '...';
                    }
                    updateContactLastMessage(conversationId, lastMessagePreview, latestMsg.sendTime);
                } else {
                    updateContactLastMessage(conversationId, '暂无消息', 0);
                }

                await renderContacts();
                await renderGroups();
                Loading.hide();
                alertMsg('消息已删除');
            };
        } else {
            Loading.hide();
            alertMsg('消息已删除');
        }

    } catch (error) {
        Loading.hide();
        alertMsg(`删除失败：${error.message}`);
        console.error('删除消息失败:', error);
    }
}
function bindMessageContextMenu() {
    ContextMenu.bind('.message-resource, .message-item:not(.message-system)', (target) => {
        const messageItem = target.closest('.message-item');
        const msgId = messageItem?.dataset.messageId;
        const menuItems = [];
        const isSelfMessage = messageItem?.classList.contains('self');
        if (msgId) {
            const isInCooldown = TranslationManager.isInCooldown(msgId);
            const remaining = TranslationManager.getRemainingCooldown(msgId);
            menuItems.push({
                label: isInCooldown ? `翻译 (冷却中 ${remaining}s)` : '翻译',
                disabled: isInCooldown,
                action: () => {
                    if (isInCooldown) {
                        TranslationManager.showTranslationToast(`请等待 ${remaining} 秒后再试`, 'warning');
                        return;
                    }
                    TranslationManager.translateMessage(messageItem, msgId);
                }
            });
            menuItems.push({
                label: '翻译设置',
                action: () => {
                    TranslationManager.showLanguageSelector();
                }
            });

            menuItems.push({ label: '──────────', disabled: true });
            menuItems.push({
                label: '引用',
                action: () => {
                    const chatInput = document.querySelector('.chat-input');
                    chatInput.removeEventListener('dblclick', handleChatInputDblClick);
                    if (currentQuoteMsgId) {
                        const oldQuoteItem = document.querySelector(`.message-item[data-message-id="${currentQuoteMsgId}"]`);
                        if (oldQuoteItem) oldQuoteItem.style.cssText = DEFAULT_STYLE;
                    }
                    currentQuoteMsgId = msgId;
                    messageItem.style.cssText = QUOTE_HIGHLIGHT_STYLE;
                    chatInput.placeholder = `已引用消息，输入后发送(双击去除引用)`;
                    chatInput.focus();
                    chatInput.addEventListener('dblclick', handleChatInputDblClick);
                }
            });
            if (isSelfMessage) {
                const sendTimeAttr = messageItem.dataset.sendTime;
                if (sendTimeAttr) {
                    const sendTime = parseInt(sendTimeAttr);
                    const now = Date.now();
                    const timeDiff = now - sendTime;
                    const fiveMinutes = 5 * 60 * 1000;
                    if (timeDiff <= fiveMinutes) {
                        menuItems.push({
                            label: '撤回',
                            action: async () => {
                                await recallMessage(msgId, messageItem);
                            }
                        });
                    } else {
                        menuItems.push({
                            label: '撤回 (已超过5分钟)',
                            disabled: true
                        });
                    }
                } else {
                    menuItems.push({
                        label: '撤回',
                        action: async () => {
                            await recallMessage(msgId, messageItem);
                        }
                    });
                }
            }
            menuItems.push({
                label: '删除',
                action: async () => {
                    await deleteMessage(msgId, messageItem);
                }
            });
        }
        const messageType = messageItem?.dataset.messageType || (target.querySelector('.message-image') ? 'image' : 'file');
        const url = target.querySelector('img')?.src || target.querySelector('.message-file-download')?.dataset.url || target.dataset.url;
        if (messageType === 'image' && url) {
            menuItems.push({ label: '预览', action: () => previewImage(url) });
        }
        if (url) {
            menuItems.push({
                label: '下载',
                action: () => {
                    const btn = event.currentTarget;
                    if (btn.dataset.isDownloading) return;
                    btn.dataset.isDownloading = 'true';
                    downloadFile(url, target);
                    setTimeout(() => {
                        delete btn.dataset.isDownloading;
                    }, 500);
                }
            });
        }
        return menuItems;
    });
    document.addEventListener('contextmenu', (e) => {
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages && chatMessages.contains(e.target) && !e.target.closest('.message-item')) {
            e.preventDefault();
            ContextMenu.show({
                event: e,
                target: chatMessages,
                items: [
                    {
                        label: isBatchMode ? '退出批量选择' : '批量选择',
                        action: () => {
                            if (isBatchMode) {
                                exitBatchMode();
                            } else {
                                enterBatchMode();
                            }
                        }
                    },
                    {
                        label: '全选',
                        action: () => {
                            if (!isBatchMode) {
                                enterBatchMode();
                            }
                            document.querySelectorAll('.message-checkbox').forEach(checkbox => {
                                checkbox.checked = true;
                                const msgId = checkbox.dataset.messageId;
                                const messageItem = checkbox.closest('.message-item');
                                selectedMessages.add(msgId);
                                messageItem.classList.add('batch-selected');
                            });
                            updateBatchToolbar();
                        }
                    }
                ]
            });
        }
    });
}
async function recallMessage(msgId, messageItem) {
    try {
        const sendTime = parseInt(messageItem.dataset.sendTime || '0');
        const now = Date.now();
        if (sendTime > 0 && (now - sendTime) > 5 * 60 * 1000) {
            alertMsg('只能撤回5分钟内的消息');
            return;
        }
        if (!appState.selectedContact) {
            alertMsg('请先选择联系人');
            return;
        }
        const { contactId, conversationId } = appState.selectedContact;
        Loading.show('正在撤回消息...');
        sendWsMessage({
            type: 'recall_message',
            data: {
                messageId: msgId,
                conversationId: conversationId,
                receiverId: contactId
            }
        });
        messageItem.style.display = 'none';
        await deleteMessageFromDB(msgId);
        const systemMsg = {
            messageId: generateUniqueId(),
            conversationId: conversationId,
            senderId: 'system',
            receiverId: contactId,
            messageType: 'system',
            content: {
                systemText: '该消息已被撤回'
            },
            sendTime: Date.now(),
            isSelf: false,
            status: 'received'
        };

        await saveMessageToDB(systemMsg);
        await renderContacts();
        await renderGroups();
        if (appState.selectedContact?.conversationId === conversationId) {
            renderMessages([systemMsg]);
        }
        Loading.hide();
        alertMsg('消息已撤回');

    } catch (error) {
        Loading.hide();
        alertMsg(`撤回失败：${error.message}`);
        console.error('撤回消息失败:', error);
    }
}
async function deleteMessageFromDB(messageId) {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('messages', 'readwrite');
        const store = transaction.objectStore('messages');
        const request = store.delete(messageId);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

function previewImage(url) {
    const previewMask = document.createElement('div');
    previewMask.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.85);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: zoom-out;
    `;

    const previewImg = document.createElement('img');
    previewImg.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
    `;
    previewImg.src = url;
    previewImg.alt = '图片预览';
    previewImg.onerror = () => {
        previewImg.style.display = 'none';
        const errorText = document.createElement('div');
        errorText.style.cssText = `
            color: #fff;
            font-size: 16px;
            text-align: center;
        `;
        errorText.textContent = '图片加载失败';
        previewMask.appendChild(errorText);
    };
    previewMask.appendChild(previewImg);
    document.body.appendChild(previewMask);
    previewMask.addEventListener('click', () => {
        previewMask.remove();
    });
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            previewMask.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}
function downloadFile(url, target) {
    try {
        let fileName = target.querySelector('.message-file-name')?.textContent ||
            url.split('/').pop().split('?')[0];
        fileName = decodeURIComponent(fileName);
        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName) ||
            target.closest('.message-image') !== null;

        if (isImage) {
            Loading.show('正在打开图片...');
            const newWindow = window.open(url, '_blank');
            if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                alertMsg('请允许浏览器弹出新窗口，或手动复制链接打开');
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.click();
            } else {
                Loading.hide();
                alertMsg(`正在打开：${fileName}`);
            }
        } else {
            const newWindow = window.open(url, '_blank');
            if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.click();
            }

            alertMsg(`正在打开：${fileName}`);
        }
    } catch (error) {
        alertMsg(`打开失败：${error.message}`);
        console.error('文件打开失败:', error);
    } finally {
        setTimeout(() => {
            Loading.hide();
        }, 500);
    }
}
async function downloadMultipleFiles(urls, fileNames) {
    Loading.show('正在准备批量下载...');

    try {
        for (let i = 0; i < urls.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 300));

            const link = document.createElement('a');
            link.href = urls[i];
            link.download = fileNames[i] || `file_${i + 1}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                if (document.body.contains(link)) {
                    document.body.removeChild(link);
                }
            }, 500);
        }

        Loading.hide();
        alertMsg(`开始下载 ${urls.length} 个文件`);
    } catch (error) {
        Loading.hide();
        alertMsg(`批量下载失败：${error.message}`);
        console.error('批量下载失败:', error);
    }
}
const Loading = (function () {
    const createLoadingElement = () => {
        let loading = document.getElementById('global-loading');
        if (loading) return loading;

        const mask = document.createElement('div');
        mask.id = 'global-loading';
        mask.className = 'loading-mask';

        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';

        const text = document.createElement('div');
        text.className = 'loading-text';
        text.textContent = '加载中...';

        spinner.appendChild(text);
        mask.appendChild(spinner);
        document.body.appendChild(mask);
        return mask;
    };

    const loadingEl = createLoadingElement();
    return {
        show: function (text = '加载中...') {
            const textEl = loadingEl.querySelector('.loading-text');
            textEl.innerHTML = text;
            loadingEl.classList.add('show');
        },
        hide: function (delay = 0) {
            setTimeout(() => {
                loadingEl.classList.remove('show');
            }, delay);
        }
    };
})();
let initResourceLoadedCount = 0;
function initResourceLoaded(delta = 1) {
    initResourceLoadedCount += delta;
    if (initResourceLoadedCount >= 2 && isOfflineMessagesComplete) {
        mokrun_bindConversationSearch();
        Loading.hide(500);
    }
}
function resetOfflineMessageState() {
    offlineMessageCount = 0;
    processedOfflineCount = 0;
    isOfflineMessagesComplete = false;
}
const appState = {
    userId: '', // 登录用户ID
    ws: null, // WS实例
    reconnectTimer: null, // 重连定时器
    heartbeatTimer: null, // 心跳定时器
    isConnected: false, // WS连接状态
    contacts: [], // 联系人列表 
    groups: [], // 群聊列表
    selectedContact: null, // 当前选中的联系人/群聊 
    hiddenConversations: new Set(), // 隐藏的聊天列表
};
/** 群公告**/
let currentGroupAnnouncements = {
    list: [],
    total: 0,
    currentPage: 1,
    pageSize: 5,
    isLoading: false
};
const AnnouncementRateLimiter = (function () {
    const lastRequestTime = new Map();
    const RATE_LIMIT_INTERVAL = 5000;
    let isRequesting = false;
    return {
        canRequest(announcementId) {
            const now = Date.now();
            const lastTime = lastRequestTime.get(String(announcementId));

            if (lastTime && (now - lastTime) < RATE_LIMIT_INTERVAL) {
                const waitSeconds = Math.ceil((RATE_LIMIT_INTERVAL - (now - lastTime)) / 1000);
                return false;
            }
            return true;
        },
        recordRequest(announcementId) {
            lastRequestTime.set(String(announcementId), Date.now());
        },
        isRequestingLock() {
            return isRequesting;
        },
        acquireLock() {
            if (isRequesting) return false;
            isRequesting = true;
            return true;
        },
        releaseLock() {
            isRequesting = false;
        },
        cleanup(maxAge = 60000) {
            const now = Date.now();
            for (const [id, time] of lastRequestTime.entries()) {
                if (now - time > maxAge) {
                    lastRequestTime.delete(id);
                }
            }
        }
    };
})();
const GroupAnnouncementRateLimiter = (function () {
    const lastRequestTime = new Map();
    const RATE_LIMIT_INTERVAL = 3000;
    let isRequesting = false;

    return {
        canRequest(groupId) {
            const now = Date.now();
            const lastTime = lastRequestTime.get(String(groupId));
            if (lastTime && (now - lastTime) < RATE_LIMIT_INTERVAL) {
                return false;
            }
            return true;
        },
        recordRequest(groupId) {
            lastRequestTime.set(String(groupId), Date.now());
        },
        isRequestingLock() {
            return isRequesting;
        },
        acquireLock() {
            if (isRequesting) return false;
            isRequesting = true;
            return true;
        },
        releaseLock() {
            isRequesting = false;
        },
        cleanup(maxAge = 60000) {
            const now = Date.now();
            for (const [id, time] of lastRequestTime.entries()) {
                if (now - time > maxAge) {
                    lastRequestTime.delete(id);
                }
            }
        }
    };
})();
setInterval(() => {
    AnnouncementRateLimiter.cleanup();
    GroupAnnouncementRateLimiter.cleanup();
}, 60000);
async function showAnnouncementDetailModal(announcementId) {
    if (!AnnouncementRateLimiter.canRequest(announcementId)) {
        const waitTime = 3000;
        mok_confirm(`操作过于频繁，请稍后再试`, {
            title: '提示',
            icon: 'warning',
            timer: waitTime,
            showConfirmButton: false
        }).catch(() => { });
        return;
    }
    if (AnnouncementRateLimiter.isRequestingLock()) {
        return;
    }
    if (!AnnouncementRateLimiter.acquireLock()) {
        return;
    }

    if (window.detailLoading) {
        AnnouncementRateLimiter.releaseLock();
        return;
    }
    window.detailLoading = true;
    AnnouncementRateLimiter.recordRequest(announcementId);
    const modalMask = document.createElement('div');
    modalMask.className = 'notice-modal-mask';
    modalMask.innerHTML = `
        <div class="notice-modal-box">
            <div class="notice-modal-header">
                <h3><i class="fas fa-bullhorn"></i> 公告详情</h3>
                <button class="notice-modal-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="notice-modal-body">
                <div class="modal-loading"><i class="fas fa-spinner fa-pulse"></i> 正在加载完整公告...</div>
            </div>
        </div>
    `;
    document.body.appendChild(modalMask);
    const closeBtn = modalMask.querySelector('.notice-modal-close');
    const modalBody = modalMask.querySelector('.notice-modal-body');
    const closeModal = () => {
        if (modalMask && modalMask.parentNode) modalMask.remove();
        window.detailLoading = false;
        AnnouncementRateLimiter.releaseLock();
    };
    closeBtn.addEventListener('click', closeModal);
    modalMask.addEventListener('click', (e) => {
        if (e.target === modalMask) closeModal();
    });
    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('请求超时，请稍后重试')), 15000);
        });
        const detailPromise = fetchAnnouncementDetail(announcementId);
        const detailData = await Promise.race([detailPromise, timeoutPromise]);
        const fullTitle = escapeHtml(detailData.title);
        const fullContent = escapeHtml(detailData.content).replace(/\n/g, '<br>');
        const pubFullTime = new Date(detailData.publish_time).toLocaleString('zh-CN', { hour12: false });
        const creatorShow = `发布人: ${detailData.creator_name || detailData.creator_id || '系统'}`;
        modalBody.innerHTML = `
            <div class="notice-full-title">${fullTitle}</div>
            <div class="notice-meta-row">
                <span><i class="far fa-clock"></i> ${pubFullTime}</span>
                <span><i class="fas fa-user-circle"></i> ${creatorShow}</span>
                ${detailData.is_top ? '<span class="sticky-badge" style="background:#fef3e2;"><i class="fas fa-thumbtack"></i> 置顶公告</span>' : ''}
            </div>
            <div class="notice-full-content">${fullContent}</div>
        `;
    } catch (error) {
        modalBody.innerHTML = `<div style="padding: 20px; text-align: center; color:#e26a6a;">
            <i class="fas fa-exclamation-triangle"></i> 加载失败，请稍后重试<br>
            <span style="font-size:12px;">${escapeHtml(error.message)}</span>
        </div>`;
    } finally {
        window.detailLoading = false;
    }
}
async function fetchGroupAnnouncements(groupId, page = 1, pageSize = 5) {
    if (currentGroupAnnouncements.isLoading) return;
    currentGroupAnnouncements.isLoading = true;
    try {
        const authdatas = await tmd_newcontroler.writenewwords(groupId);
        return new Promise((resolve, reject) => {
            plugin_post_requests({
                dfid: authdatas,
                UserId: appState.userId,
                page: page,
                page_size: pageSize
            }, (error, response) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (response && response.success) {
                    const data = response.data;
                    if (data && data.list && Array.isArray(data.list)) {
                        data.list.sort((a, b) => {
                            if (a.is_top !== b.is_top) {
                                return (b.is_top || 0) - (a.is_top || 0);
                            }
                            const timeA = new Date(a.publish_time).getTime();
                            const timeB = new Date(b.publish_time).getTime();
                            return timeB - timeA;
                        });
                    }
                    resolve(data);
                } else {
                    reject(new Error(response?.message || '获取公告失败'));
                }
            }, {
                url: '/api/groupannouncements/',
                timeout: 10000
            });
        });
    } catch (error) {
        throw error;
    } finally {
        currentGroupAnnouncements.isLoading = false;
    }
}

async function fetchAnnouncementDetail(announcementId) {
    try {
        const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
        return new Promise((resolve, reject) => {
            plugin_post_requests({
                dfid: authdatas,
                announcement_id: announcementId
            }, (error, response) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (response && response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response?.message || '获取公告详情失败'));
                }
            }, {
                url: '/api/announcementdetail/',
                timeout: 10000
            });
        });
    } catch (error) {
        console.error('获取公告详情失败:', error);
        throw error;
    }
}
function renderGroupAnnouncements(announcements, total, currentPage, totalPages) {
    const noticeListContainer = document.querySelector('#gnoticeContainer');
    const paginationBar = document.querySelector('#gnotice-clasic-groups .pagination-bar');
    const loadingTip = document.querySelector('#gnotice-clasic-groups .loading-tip');
    if (!noticeListContainer) return;
    if (loadingTip) loadingTip.style.display = 'none';
    if (!announcements || announcements.length === 0) {
        noticeListContainer.innerHTML = `
            <div class="empty-tip">
                <i class="fas fa-bullhorn" style="font-size: 32px; opacity: 0.5; margin-bottom: 10px;"></i>
                <p>暂无公告</p>
            </div>
        `;
        if (paginationBar) paginationBar.style.display = 'none';
        return;
    }
    noticeListContainer.innerHTML = '';
    let html = '';
    for (const item of announcements) {
        const isTop = item.is_top === 1;
        const stickyClass = isTop ? 'sticky-card' : '';
        const pubTime = formatAnnouncementTime(item.publish_time);
        let summary = item.summary;
        if (!summary && item.content) {
            const plainContent = item.content.replace(/<[^>]*>/g, '');
            summary = plainContent.length > 80 ? plainContent.substring(0, 80) + '...' : plainContent;
        }
        summary = summary || '暂无内容';

        html += `
            <div class="notice-card ${stickyClass}" data-id="${item.id}" data-title="${escapeHtml(item.title)}" data-content="${escapeHtml(item.content)}" data-is-top="${isTop}">
                <div class="notice-title-row">
                    <div class="notice-title">
                        ${isTop ? `<span class="sticky-badge"><i class="fas fa-thumbtack"></i> 置顶</span>` : ''}
                        <span>${escapeHtml(item.title)}</span>
                    </div>
                    <div class="notice-date"><i class="far fa-calendar-alt"></i> ${pubTime}</div>
                </div>
                <div class="notice-summary">${escapeHtml(summary)}</div>
                <div class="notice-footer">
                    <span class="detail-tip"><i class="fas fa-mouse-pointer"></i> 单击查看完整内容</span>
                </div>
            </div>
        `;
    }
    noticeListContainer.innerHTML = html;
    let clickTimer = null;
    noticeListContainer.querySelectorAll('.notice-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.button === 2) return;
            e.stopPropagation();
            if (clickTimer) return;
            clickTimer = setTimeout(() => {
                clickTimer = null;
            }, 300);

            const annId = parseInt(card.dataset.id);
            if (annId) {
                showAnnouncementDetailModal(annId);
            }
        });
        card.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const annId = parseInt(card.dataset.id);
            const annTitle = card.dataset.title;
            const annContent = card.dataset.content;
            const isTop = card.dataset.isTop === 'true';
            const isAdmin = appState.selectedContact?.is_admin === true;
            if (!isAdmin) {
                return;
            }
            let contextMenu = document.getElementById('announcement-context-menu');
            if (!contextMenu) {
                contextMenu = document.createElement('div');
                contextMenu.id = 'announcement-context-menu';
                contextMenu.className = 'context-menu';
                contextMenu.style.cssText = `
                    position: fixed;
                    z-index: 10000;
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                    padding: 4px 0;
                    min-width: 120px;
                    display: none;
                `;
                document.body.appendChild(contextMenu);
                document.addEventListener('click', () => {
                    contextMenu.style.display = 'none';
                });
            }
            contextMenu.innerHTML = '';
            const pinItem = document.createElement('div');
            pinItem.className = 'context-menu-item';
            pinItem.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                font-size: 14px;
                color: #333;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            pinItem.innerHTML = isTop
                ? '<i class="fas fa-thumbtack" style="color: #e6a23c;"></i> 取消置顶'
                : '<i class="fas fa-thumbtack"></i> 置顶公告';
            pinItem.addEventListener('mouseenter', () => { pinItem.style.backgroundColor = '#f5f5f5'; });
            pinItem.addEventListener('mouseleave', () => { pinItem.style.backgroundColor = 'transparent'; });
            pinItem.addEventListener('click', async (e) => {
                e.stopPropagation();
                contextMenu.style.display = 'none';
                await mokimg_toggleAnnouncementTop(annId, !isTop);
            });
            contextMenu.appendChild(pinItem);
            const editItem = document.createElement('div');
            editItem.className = 'context-menu-item';
            editItem.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                font-size: 14px;
                color: #333;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            editItem.innerHTML = '<i class="fas fa-edit" style="color: #409eff;"></i> 修改公告';
            editItem.addEventListener('mouseenter', () => { editItem.style.backgroundColor = '#f5f5f5'; });
            editItem.addEventListener('mouseleave', () => { editItem.style.backgroundColor = 'transparent'; });
            editItem.addEventListener('click', async (e) => {
                e.stopPropagation();
                contextMenu.style.display = 'none';
                mokim_showEditAnnouncementModal(annId, annTitle, annContent);
            });
            contextMenu.appendChild(editItem);
            const deleteItem = document.createElement('div');
            deleteItem.className = 'context-menu-item';
            deleteItem.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                font-size: 14px;
                color: #f56c6c;
                display: flex;
                align-items: center;
                gap: 8px;
                border-top: 1px solid #f0f0f0;
            `;
            deleteItem.innerHTML = '<i class="fas fa-trash-alt"></i> 删除公告';
            deleteItem.addEventListener('mouseenter', () => { deleteItem.style.backgroundColor = '#fef0f0'; });
            deleteItem.addEventListener('mouseleave', () => { deleteItem.style.backgroundColor = 'transparent'; });
            deleteItem.addEventListener('click', async (e) => {
                e.stopPropagation();
                contextMenu.style.display = 'none';
                const confirm = await mok_confirm(`确定要删除公告「${annTitle}」吗？此操作不可恢复！`);
                if (confirm) {
                    await mok_im_g_deleteAnnouncement(annId);
                }
            });
            contextMenu.appendChild(deleteItem);
            const { clientX, clientY } = e;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const menuWidth = 140;
            const menuHeight = contextMenu.offsetHeight || 120;
            let left = clientX;
            let top = clientY;
            if (left + menuWidth > viewportWidth) {
                left = clientX - menuWidth;
            }
            if (top + menuHeight > viewportHeight) {
                top = clientY - menuHeight;
            }
            contextMenu.style.left = `${left}px`;
            contextMenu.style.top = `${top}px`;
            contextMenu.style.display = 'block';
        });
    });

    if (paginationBar && totalPages > 1) {
        paginationBar.style.display = 'flex';
        const pageInfo = paginationBar.querySelector('.page-info');
        const prevBtn = paginationBar.querySelector('.prev-page');
        const nextBtn = paginationBar.querySelector('.next-page');

        if (pageInfo) {
            pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页`;
        }

        if (prevBtn) {
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => {
                if (currentGroupAnnouncements.isLoading) return;
                loadGroupAnnouncementsPage(currentGroupAnnouncements.currentPage - 1);
            };
        }

        if (nextBtn) {
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.onclick = () => {
                if (currentGroupAnnouncements.isLoading) return;
                loadGroupAnnouncementsPage(currentGroupAnnouncements.currentPage + 1);
            };
        }
    } else if (paginationBar) {
        paginationBar.style.display = 'none';
    }
}
async function mokimg_toggleAnnouncementTop(announcementId, isTop) {
    if (!AnnouncementRateLimiter.canRequest(announcementId)) {
        mok_confirm('操作过于频繁，请稍后再试', {
            title: '提示',
            icon: 'warning',
            timer: 3000,
            showConfirmButton: false
        }).catch(() => { });
        return;
    }
    const groupId = appState.selectedContact.group_id ||
        appState.selectedContact.contactId?.replace('group_', '');
    if (!groupId) return;
    AnnouncementRateLimiter.recordRequest(announcementId);
    Loading.show(isTop ? '正在置顶公告...' : '正在取消置顶...');
    try {
        const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
        return new Promise((resolve, reject) => {
            plugin_post_requests({
                dfid: groupId,
                UserId: authdatas,
                announcement_id: announcementId,
                action: isTop ? 'pin' : 'unpin'
            }, (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg(`操作失败：${error.message}`);
                    reject(error);
                    return;
                }
                if (response && response.success) {
                    alertMsg(isTop ? '公告已置顶' : '已取消置顶');
                    loadGroupAnnouncementsPage(currentGroupAnnouncements.currentPage);
                    resolve(response.data);
                } else {
                    alertMsg(response?.message || '操作失败');
                    reject(new Error(response?.message || '操作失败'));
                }
            }, {
                url: '/api/announcement_toggle_top/',
                timeout: 10000
            });
        });
    } catch (error) {
        Loading.hide();
        alertMsg(`操作失败：${error.message}`);
        console.error('置顶操作失败:', error);
    }
}
async function mok_im_g_deleteAnnouncement(announcementId) {
    if (!AnnouncementRateLimiter.canRequest(announcementId)) {
        mok_confirm('操作过于频繁，请稍后再试', {
            title: '提示',
            icon: 'warning',
            timer: 3000,
            showConfirmButton: false
        }).catch(() => { });
        return;
    }
    const groupId = appState.selectedContact.group_id ||
        appState.selectedContact.contactId?.replace('group_', '');
    if (!groupId) return;
    AnnouncementRateLimiter.recordRequest(announcementId);
    Loading.show('正在删除公告...');
    try {
        const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
        return new Promise((resolve, reject) => {
            plugin_post_requests({
                dfid: groupId,
                UserId: authdatas,
                announcement_id: announcementId
            }, (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg(`删除失败：${error.message}`);
                    reject(error);
                    return;
                }
                if (response && response.success) {
                    alertMsg('公告已删除');
                    loadGroupAnnouncementsPage(1);
                    resolve(response.data);
                } else {
                    alertMsg(response?.message || '删除失败');
                    reject(new Error(response?.message || '删除失败'));
                }
            }, {
                url: '/api/announcement_delete/',
                timeout: 10000
            });
        });
    } catch (error) {
        Loading.hide();
        alertMsg(`删除失败：${error.message}`);
        console.error('删除公告失败:', error);
    }
}
function mokim_showEditAnnouncementModal(announcementId, currentTitle, currentContent) {
    const modalMask = document.createElement('div');
    modalMask.className = 'notice-modal-mask';
    modalMask.innerHTML = `
        <div class="notice-modal-box" style="width: 500px; max-width: 90%;">
            <div class="notice-modal-header">
                <h3><i class="fas fa-edit"></i> 修改公告</h3>
                <button class="notice-modal-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="notice-modal-body">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">公告标题</label>
                    <input type="text" id="editAnnTitle" class="form-control" value="${escapeHtml(currentTitle)}" style="width: 100%; padding: 8px 12px; border: 1px solid #dcdfe6; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">公告内容</label>
                    <textarea id="editAnnContent" rows="6" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #dcdfe6; border-radius: 4px; resize: vertical;">${escapeHtml(currentContent)}</textarea>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button id="cancelEditBtn" class="btn btn-sm btn-outline-secondary" style="padding: 8px 16px;background: #b2eba4;">取消</button>
                    <button id="confirmEditBtn" class="btn btn-sm btn-primary" style="padding: 8px 16px; background: #409eff; color: #fff; border: none; border-radius: 4px;">确认修改</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalMask);

    const closeModal = () => {
        if (modalMask && modalMask.parentNode) modalMask.remove();
    };

    modalMask.querySelector('.notice-modal-close').addEventListener('click', closeModal);
    modalMask.addEventListener('click', (e) => {
        if (e.target === modalMask) closeModal();
    });

    modalMask.querySelector('#cancelEditBtn').addEventListener('click', closeModal);
    modalMask.querySelector('#confirmEditBtn').addEventListener('click', async () => {
        const newTitle = modalMask.querySelector('#editAnnTitle').value.trim();
        const newContent = modalMask.querySelector('#editAnnContent').value.trim();

        if (!newTitle) {
            alertMsg('请输入公告标题');
            return;
        }
        if (!newContent) {
            alertMsg('请输入公告内容');
            return;
        }

        await mok_im_g_updateAnnouncement(announcementId, newTitle, newContent);
        closeModal();
    });
}
async function mok_im_g_updateAnnouncement(announcementId, title, content) {
    if (!AnnouncementRateLimiter.canRequest(announcementId)) {
        mok_confirm('操作过于频繁，请稍后再试', {
            title: '提示',
            icon: 'warning',
            timer: 3000,
            showConfirmButton: false
        }).catch(() => { });
        return;
    }
    const groupId = appState.selectedContact.group_id ||
        appState.selectedContact.contactId?.replace('group_', '');
    if (!groupId) return;
    AnnouncementRateLimiter.recordRequest(announcementId);
    Loading.show('正在更新公告...');
    try {
        const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
        return new Promise((resolve, reject) => {
            plugin_post_requests({
                dfid: groupId,
                UserId: authdatas,
                announcement_id: announcementId,
                title: title,
                content: content
            }, (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg(`更新失败：${error.message}`);
                    reject(error);
                    return;
                }
                if (response && response.success) {
                    alertMsg('公告已更新');
                    loadGroupAnnouncementsPage(currentGroupAnnouncements.currentPage);
                    resolve(response.data);
                } else {
                    alertMsg(response?.message || '更新失败');
                    reject(new Error(response?.message || '更新失败'));
                }
            }, {
                url: '/api/announcement_update/',
                timeout: 10000
            });
        });
    } catch (error) {
        Loading.hide();
        alertMsg(`更新失败：${error.message}`);
    }
}
function formatAnnouncementTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return '昨天';
    } else if (diffDays < 7) {
        return `${diffDays}天前`;
    }
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getAnnouncementSummary(content, maxLen = 80) {
    if (!content) return '暂无内容';
    let plain = content.replace(/<[^>]*>/g, '');
    if (plain.length <= maxLen) return plain;
    return plain.substring(0, maxLen) + '...';
}



async function loadGroupAnnouncementsPage(page) {
    if (!appState.selectedContact || !appState.selectedContact.isGroup) return;
    const groupId = appState.selectedContact.group_id ||
        appState.selectedContact.contactId?.replace('group_', '');
    if (!groupId) return;
    try {
        currentGroupAnnouncements.currentPage = page;
        const result = await fetchGroupAnnouncements(groupId, page, currentGroupAnnouncements.pageSize);
        let sortedList = result.list || [];
        sortedList.sort((a, b) => {
            if (a.is_top !== b.is_top) {
                return (b.is_top || 0) - (a.is_top || 0);
            }
            const timeA = new Date(a.publish_time).getTime();
            const timeB = new Date(b.publish_time).getTime();
            return timeB - timeA;
        });

        currentGroupAnnouncements.list = sortedList;
        currentGroupAnnouncements.total = result.total || 0;
        const totalPages = Math.ceil(currentGroupAnnouncements.total / currentGroupAnnouncements.pageSize);
        renderGroupAnnouncements(
            currentGroupAnnouncements.list,
            currentGroupAnnouncements.total,
            currentGroupAnnouncements.currentPage,
            totalPages
        );
    } catch (error) {
        const noticeListContainer = document.querySelector('#gnoticeContainer');
        if (noticeListContainer) {
            noticeListContainer.innerHTML = '<div class="empty-tip"><i class="fas fa-exclamation-circle"></i> 加载公告失败</div>';
        }
    }
}

async function initGroupAnnouncements(force = false) {
    if (!appState.selectedContact || !appState.selectedContact.isGroup) return;
    const groupId = appState.selectedContact.group_id ||
        appState.selectedContact.contactId?.replace('group_', '');
    if (!groupId) return;
    if (!force && !GroupAnnouncementRateLimiter.canRequest(groupId)) {
        return;
    }
    if (GroupAnnouncementRateLimiter.isRequestingLock()) {
        return;
    }

    if (!GroupAnnouncementRateLimiter.acquireLock()) {
        return;
    }
    GroupAnnouncementRateLimiter.recordRequest(groupId);
    currentGroupAnnouncements = {
        list: [],
        total: 0,
        currentPage: 1,
        pageSize: 5,
        isLoading: false
    };
    const noticeListContainer = document.querySelector('#gnoticeContainer');
    if (noticeListContainer) {
        noticeListContainer.innerHTML = '<div class="loading-tip"><i class="fas fa-spinner fa-pulse"></i> 加载公告中...</div>';
    }
    try {
        await loadGroupAnnouncementsPage(1);
    } finally {
        GroupAnnouncementRateLimiter.releaseLock();
    }
}
// ===================== IndexedDB 初始化 =====================
const initIndexedDB = () => {
    return new Promise((resolve, reject) => {
        const dbName = `ChatDB_${appState.userId}`;
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('conversations')) {
                const conversationStore = db.createObjectStore('conversations', { keyPath: 'conversationId' });
                conversationStore.createIndex('userId', 'userId', { unique: false });
                conversationStore.createIndex('lastUpdateTime', 'lastUpdateTime', { unique: false });
            }
            if (!db.objectStoreNames.contains('messages')) {
                const messageStore = db.createObjectStore('messages', { keyPath: 'messageId', autoIncrement: true });
                messageStore.createIndex('conversationId', 'conversationId', { unique: false });
                messageStore.createIndex('sendTime', 'sendTime', { unique: false });
                messageStore.createIndex('messageType', 'messageType', { unique: false });
            }
            if (!db.objectStoreNames.contains('contacts')) {
                const contactStore = db.createObjectStore('contacts', { keyPath: 'contactId' });
                contactStore.createIndex('userId', 'userId', { unique: false });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

// ===================== 应用初始化 =====================
async function initApp() {
    try {
        if (!window.qmok_userid_id) {
            throw new Error('用户未登录，请重新登录');
        }
        appState.userId = window.qmok_userid_id;
        resetOfflineMessageState();
        await initIndexedDB();
        initWebSocket();
    } catch (error) {
        alertMsg('应用初始化失败，请稍后重试');
        if (error.message.includes('未登录')) {
            window.location.href = 'use/user/';
        }
    }
}
function yhmokim_t_getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}
// ===================== WebSocket 核心逻辑 =====================
function initWebSocket() {
    if (appState.ws) {
        appState.ws.close(1000, '重新初始化连接');
    }
    if (sessionStorage.getItem('kicked_out') === 'true') {
        window.location.replace('/logout.php');
        return false;
    }
    resetOfflineMessageState();
    Loading.show(`正在尝试连接服务器中...</br>
    连接失败？<a href="use/freetl/" onclick="initWebSocket();">->娱乐&工具<-</a>`);
    const wsUrl = `${window.goutapi_wslinkingadd}?userId=${appState.userId}&deviceId=${yhmokim_t_getDeviceId()}`;
    appState.ws = new WebSocket(wsUrl);
    appState.ws.onopen = function () {
        Loading.show('服务器连接成功，正在同步数据...');
        appState.isConnected = true;
        startHeartbeat();
        setTimeout(mokim_setupGameRoomBridge, 300);
        sendWsMessage({ type: 'online', userId: appState.userId });
    };
    appState.ws.onmessage = function (event) {
        try {
            const message = JSON.parse(event.data);
            handleWsMessage(message);
        } catch (error) {
            console.error('解析WebSocket消息失败:', error);
        }
    };
    appState.ws.onclose = function (event) {
        appState.isConnected = false;
        console.log('WebSocket连接关闭，状态码:', event.code);
        stopHeartbeat();
        if (event.code !== 1000) {
            startReconnect();
        }
    };
    appState.ws.onerror = function (error) {
        appState.isConnected = false;
        console.error('WebSocket连接错误:', error);
    };
}
function sendWsMessage(data) {
    if (appState.isConnected && appState.ws.readyState === WebSocket.OPEN) {
        appState.ws.send(JSON.stringify(data));
    } else {
        console.warn('WebSocket未连接，消息发送失败:', data);
    }
}
function startHeartbeat() {
    stopHeartbeat();
    appState.heartbeatTimer = setInterval(() => {
        sendWsMessage({ type: 'heartbeat', timestamp: Date.now() });
    }, 30000);
}


function stopHeartbeat() {
    if (appState.heartbeatTimer) {
        clearInterval(appState.heartbeatTimer);
        appState.heartbeatTimer = null;
    }
}


function startReconnect() {
    if (appState.reconnectTimer) {
        clearTimeout(appState.reconnectTimer);
    }
    appState.reconnectTimer = setTimeout(() => {
        initWebSocket();
    }, 5000);
}
// ===================== 群聊解散处理 =====================
function handleGroupDestroyed(data) {
    const { groupId, message, disbandTime } = data;
    const groupConversationId = `group_${groupId}`;
    if (appState.groups) {
        appState.groups = appState.groups.filter(group => {
            const groupConvId = group.conversationId || `group_${group.group_id}`;
            return groupConvId !== groupConversationId;
        });
    }
    if (appState.contacts) {
        appState.contacts = appState.contacts.filter(contact => {
            return contact.conversationId !== groupConversationId;
        });
    }
    if (appState.selectedContact) {
        const selectedConvId = appState.selectedContact.conversationId;
        const selectedGroupId = appState.selectedContact.group_id;
        const isSelectedGroup =
            selectedConvId === groupConversationId ||
            (selectedGroupId && String(selectedGroupId) === String(groupId)) ||
            (appState.selectedContact.contactId === groupConversationId);
        if (isSelectedGroup) {
            unselectContact();
            Swal.fire({
                icon: 'info',
                title: '群聊已解散',
                text: `您所在的群聊已被解散`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }
    }
    deleteAllMessagesForConversation(groupConversationId).catch(err => {
        console.error('删除已解散群聊的消息失败:', err);
    });
    renderContacts().then(() => {
        Swal.fire({
            icon: 'warning',
            title: '群聊解散通知',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-trash-alt" style="font-size: 48px; color: #f56c6c; margin-bottom: 15px;"></i>
                    <p>您所在的群聊已被群主解散</p>
                    <p style="font-size: 12px; color: #999; margin-top: 10px;">群聊已从您的会话列表中移除</p>
                </div>
            `,
            confirmButtonText: '知道了',
            confirmButtonColor: '#409eff',
            allowOutsideClick: true
        });
    });
}
async function deleteAllMessagesForConversation(conversationId) {
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
                            console.log(`已删除 ${deleteCount} 条群聊消息，会话: ${conversationId}`);
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
        console.error('删除会话消息失败:', error);
        throw error;
    }
}
// ===================== 离线消息处理状态 =====================
let offlineMessageCount = 0;
let processedOfflineCount = 0;
let isOfflineMessagesComplete = false;
const RenderHooks = { //钩子Hook
    _hooks: {
        contacts: null,
        groups: null,
        all: null
    },
    setContactsHook(callback) {
        this._hooks.contacts = callback;
    },
    setGroupsHook(callback) {
        this._hooks.groups = callback;
    },
    setAllHook(callback) {
        this._hooks.all = callback;
    },
    executeContactsHook() {
        if (this._hooks.contacts) {
            const fn = this._hooks.contacts;
            this._hooks.contacts = null;
            fn();
            return true;
        }
        return false;
    },
    executeGroupsHook() {
        if (this._hooks.groups) {
            const fn = this._hooks.groups;
            this._hooks.groups = null;
            fn();
            return true;
        }
        return false;
    },
    executeAllsHook() {
        if (this._hooks.all) {
            const fn = this._hooks.all;
            this._hooks.all = null;
            fn();
            return true;
        }
        return false;
    },
    clearAll() {
        this._hooks.contacts = null;
        this._hooks.groups = null;
        this._hooks.all = null;
    }
};
let isOfflineSyncing = false;
let offlineMessagesCache = [];
function findUpdatedContact(currentContact) {
    if (!currentContact) return null;
    const isGroup = currentContact.isGroup || false;
    if (isGroup) {
        const updated = appState.groups?.find(g =>
            `group_${g.group_id}` === currentContact.conversationId ||
            g.group_id === currentContact.group_id
        );
        if (updated) {
            return {
                ...updated,
                isGroup: true,
                conversationId: currentContact.conversationId || `group_${updated.group_id}`,
                contactId: currentContact.conversationId || `group_${updated.group_id}`,
                uname: updated.group_name,
                friendAlias: updated.galias || updated.group_name
            };
        }
    } else {
        const updated = appState.contacts?.find(c =>
            c.conversationId === currentContact.conversationId ||
            c.contactId === currentContact.contactId
        );
        if (updated) {
            return {
                ...updated,
                contactId: updated.contactId || updated.user_id || updated.userId,
                conversationId: updated.conversationId,
                isGroup: false,
                uname: updated.uname,
                friendAlias: updated.friendAlias || updated.uname
            };
        }
    }
    return null;
}
async function handleWsMessage(message) {
    switch (message.type) {
        case 'system_message_i':
            const isFriendRequest = message.data.messageType === 'friend_request' ||
                message.data.messageType === 'friend_request_accepted' ||
                message.data.messageType === 'group_request_accepted';
            if (isFriendRequest) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: '新通知',
                    text: message.data.content,
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
                if (message.data.messageType === 'friend_request_accepted' ||
                    message.data.messageType === 'group_request_accepted') {
                    setTimeout(() => {
                        if (message.data.messageType === 'friend_request_accepted') {
                            RenderHooks.setContactsHook(async function () {
                                Loading.show("重新加载联系人列表");
                                await renderContacts();
                                Loading.hide();
                            });
                            sendWsMessage({ type: 'refresh_contacts' });
                        } else {
                            RenderHooks.setGroupsHook(async function () {
                                Loading.show("重新加载联系人列表");
                                await renderContacts();
                                Loading.hide();
                            });
                            sendWsMessage({ type: 'refresh_groups' });
                        }
                    }, 1000);
                }
            } else {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: message.data.content,
                    showConfirmButton: false,
                    timer: 3000,
                    background: '#c7e4d0',
                    iconColor: '#e9b2f0'
                });
            }
            break;
        case 'group_destroyed':
            handleGroupDestroyed(message.data);
            break;
        case 'validate_result':
            break;
        case 'kicked_out':
            sessionStorage.setItem('kicked_out', 'true');
            sessionStorage.setItem('kicked_out_time', Date.now().toString());
            Swal.fire({
                icon: 'warning',
                title: '账号已在其他设备登录',
                text: message.msg || '您的账号在其他设备上登录，即将跳转到登录页',
                confirmButtonText: '确定',
                allowOutsideClick: false
            }).then(() => {
                if (appState.ws) {
                    appState.ws.close(4003, '账号在其他设备登录');
                }
                localStorage.removeItem('deviceId');
                window.location.href = '/logout.php';
            });
            break;
        case 'contacts_alldata':
            const { contacts, groups } = message.data || {};
            if (contacts) {
                appState.contacts = Array.from(new Map(
                    contacts.map(contact => [contact.conversationId, contact])
                )).map(([_, contact]) => ({
                    ...contact,
                    isGroup: false
                }));
            }
            if (groups) {
                appState.groups = groups.map(group => ({
                    ...group,
                    isGroup: true
                }));
            }
            const hasAllsHook = RenderHooks.executeAllsHook();
            if (!hasAllsHook) {
                await renderContacts();
            } else {
                console.log('Hook OK');
            }
            if (appState.selectedContact) {
                const updated = findUpdatedContact(appState.selectedContact);
                if (updated) {
                    appState.selectedContact = updated;
                    switchChatWindow(appState.selectedContact);
                }
            }
            break;
        case 'groups_data':
            appState.groups = (message.data || []).map(group => ({
                ...group,
                isGroup: true
            }));
            const hasGroupsHook = RenderHooks.executeGroupsHook();
            if (!hasGroupsHook) {
                renderGroups();
            } else {
                console.log('Hook OK');
            }
            initResourceLoaded();
            break;

        case 'contacts_data':
            const rawContacts = message.data || [];
            appState.contacts = Array.from(new Map(
                rawContacts.map(contact => [contact.conversationId, contact])
            )).map(([_, contact]) => ({
                ...contact,
                isGroup: false
            }));
            const hasContactsHook = RenderHooks.executeContactsHook();
            if (hasContactsHook) {
                console.log("Hook OK");
            }
            initResourceLoaded();
            break;
        case 'heartbeat_resp':
            console.log('心跳检测正常');
            break;
        case 'new_message':
            handleNewMessage(message.data);
            break;
        case 'new_message_oine':
            if (message.data.totalCount) {
                offlineMessageCount = message.data.totalCount;
                processedOfflineCount = 0;
                isOfflineMessagesComplete = false;
                isOfflineSyncing = true;
                Loading.show(`正在同步离线消息...请耐心等待`);
            }
            handleNewMessage(message.data);
            processedOfflineCount++;
            if (offlineMessageCount > 0) {
                Loading.show(`正在同步离线消息...请耐心等待`);
            }
            sendWsMessage({
                type: 'offline_message_ack',
                data: {
                    messageId: message.data.messageId,
                    timestamp: Date.now()
                }
            });
            break;
        case 'offline_messages_complete':
            isOfflineMessagesComplete = true;
            isOfflineSyncing = false;
            Loading.show('消息缓存中....请耐心等待...');
            await renderContacts();
            setTimeout(() => {
                Loading.hide();
                if (isOfflineMessagesComplete) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '所有离线消息已全部同步！',
                        showConfirmButton: false,
                        timer: 3000,
                        background: '#f0f9ff',
                        iconColor: '#2563eb'
                    });
                }
            }, 2000);
            break;
        case 'offline_message_ack':
            break;
        case 'contact_change':
            sendWsMessage({ type: 'refresh_contacts' });
            break;
        case 'group_change':
            sendWsMessage({ type: 'refresh_groups' });
            break;
        case 'message_recalled':
            handleMessageRecalled(message.data);
            break;
        case 'recall_success':
            handleRecallSuccess(message.data);
            break;
        case 'read_receipt':
            handleReadReceipt(message.data);
            break;
        case 'message_ack':
            console.log('no problem');
            break;
        case 'new_group_message':
            handleNewGroupMessage(message.data);
            break;

        case 'group_message_ack':
            console.log('群消息发送成功', message.data);
            break;
        case 'typing_status':
            handleTypingStatusReceived(message.data);
            return;
        case 'read_receipt_ack':
            if (message.data.status === 'success') {
                if (appState.selectedContact) {
                    const { conversationId } = appState.selectedContact;
                    loadMessagesByPage(conversationId, 1, 20).then(() => {
                        console.log('drc update!');
                    });
                }
            }
            break;
        case 'error':
            console.error('服务器返回错误:', message.msg);
            break;
        default:
            console.log('未知消息类型:', message.type);
    }
}
async function handleMessageRecalled(data) {
    const { messageId, conversationId } = data;
    try {
        const recalledMsg = document.querySelector(`.message-item[data-message-id="${messageId}"]`);
        if (recalledMsg) {
            recalledMsg.remove();
        }
        await deleteMessageFromDB(messageId);
        const systemMsg = {
            messageId: generateUniqueId(),
            conversationId: conversationId,
            senderId: 'system',
            receiverId: appState.userId,
            messageType: 'system',
            content: {
                systemText: '该消息已被撤回'
            },
            sendTime: Date.now(),
            isSelf: false,
            status: 'received'
        };
        await saveMessageToDB(systemMsg);
        if (appState.selectedContact?.conversationId === conversationId) {
            renderMessages([systemMsg]);
        }
        await renderContacts();
        await renderGroups();

    } catch (error) {
        console.error('处理消息撤回失败:', error);
    }
}
function handleRecallSuccess(data) {
    const { messageId } = data;
    const recalledMsg = document.querySelector(`.message-item[data-message-id="${messageId}"]`);
    if (recalledMsg) {
        recalledMsg.remove();
    }
}
async function sendMessage(messageContent) {
    if (!appState.isConnected) {
        alertMsg('服务器连接失败,消息发送异常');
        return;
    }
    if (!appState.selectedContact) {
        alertMsg('请选择联系人后再发送消息');
        return;
    }

    const { conversationId, contactId } = appState.selectedContact;
    const isTextMessage = messageContent.messageType === 'text' || !messageContent.messageType;
    const lockData = (isTextMessage && messageContent.lock) ? messageContent.lock : null;
    var message = {
        messageId: generateUniqueId(),
        conversationId: String(conversationId),
        senderId: appState.userId,
        receiverId: String(contactId),
        messageType: messageContent.messageType || 'text',
        content: {
            text: messageContent.text || messageContent.content,
            quoteMsgId: currentQuoteMsgId,
            others: messageContent.otherpastxfuks ?? null
        },
        sendTime: Date.now(),
        isSelf: true,
        status: 'sending',
        read: false
    };
    if (lockData) {
        message.lock = lockData;
    }
    message = await hashy_addHashToMessage(message);
    try {
        sendWsMessage({ type: 'new_message', data: message });
        await saveMessageToDB(message);
        message.status = 'sent';
        const existingMsg = document.querySelector(`.message-item[data-message-id="${message.messageId}"], .message-system[data-message-id="${message.messageId}"]`);
        if (!existingMsg) {
            refreshChatWindow(message);
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
    } catch (error) {
        message.status = 'failed';
        alertMsg(`消息发送失败：${error.message}`);
        refreshChatWindow(message);
    }
}
function handleNewMessage(message) {
    if (window.isHandlingNewMessage) return;
    window.isHandlingNewMessage = true;
    try {
        hashy_addHashToMessage({
            ...message,
            isSelf: false,
            status: 'received',
            read: false
        }).then(receiveMessage => {
            saveMessageToDB(receiveMessage).then(async () => {
                const settings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
                if (settings.notifySound !== false) {
                    playNewMessageSound();
                }
                if (!receiveMessage.isSelf && document.hidden) {
                    let senderName = receiveMessage.senderName || receiveMessage.senderId;
                    if (!senderName && appState.contacts) {
                        const contact = appState.contacts.find(c =>
                            c.conversationId === receiveMessage.conversationId
                        );
                        senderName = contact?.friendAlias || contact?.uname || senderName;
                    }
                    const notificationEvent = new CustomEvent('new-message-received', {
                        detail: {
                            message: receiveMessage,
                            senderName: senderName || '联系人',
                            isGroup: false
                        }
                    });
                    window.dispatchEvent(notificationEvent);
                }
                if (appState.selectedContact?.conversationId === receiveMessage.conversationId) {
                    const existingMsg = document.querySelector(`.message-item[data-message-id="${receiveMessage.messageId}"], .message-system[data-message-id="${receiveMessage.messageId}"]`);
                    if (!existingMsg) {
                        refreshChatWindow(receiveMessage);
                        markConversationAsRead(receiveMessage.conversationId);
                    }
                } else {
                    updateContactUnreadCount(receiveMessage.conversationId);
                }
                if (!isOfflineSyncing && receiveMessage.senderId !== 'system') {
                    await renderContacts();
                }
                window.isHandlingNewMessage = false;
            });
        });
    } catch (error) {
        console.error('接收消息处理失败:', error);
        window.isHandlingNewMessage = false;
    }
}
async function saveMessageToDB(message) {
    const db = await initIndexedDB();
    const transaction = db.transaction('messages', 'readwrite');
    const store = transaction.objectStore('messages');
    await store.put(message);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (e) => reject(e.target.error);
    });
}
function refreshChatWindow(message) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;
    if (appState.selectedContact?.conversationId === message.conversationId) {
        const existingMsg = document.querySelector(`.message-item[data-message-id="${message.messageId}"], .message-system[data-message-id="${message.messageId}"]`);
        if (!existingMsg) {
            renderMessages([message]);
            if (message.isSelf) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    }
}
function updateContactUnreadCount(conversationId) {
    appState.contacts = appState.contacts.map(contact => {
        if (contact.conversationId === conversationId) {
            return {
                ...contact,
                unreadCount: (contact.unreadCount || 0) + 1
            };
        }
        return contact;
    });
    const hasConversation = appState.contacts.some(c => c.conversationId === conversationId);
    if (!hasConversation) {
        console.warn(`会话ID ${conversationId} 不存在于联系人列表，跳过未读数更新`);
    }
}

// ===================== UI渲染 =====================
async function getLatestMessageByConversationId(conversationId) {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction('messages', 'readonly');
        const store = transaction.objectStore('messages');
        const index = store.index('conversationId');
        const request = index.getAll(conversationId);
        return new Promise((resolve) => {
            request.onsuccess = (e) => {
                const allMessages = e.target.result;
                if (!allMessages.length) {
                    resolve({
                        lastMessage: '暂无消息',
                        lastInteractTime: 0
                    });
                    return;
                }
                const latestMsg = allMessages.sort((a, b) => b.sendTime - a.sendTime)[0];
                let lastMessagePreview = '';
                switch (latestMsg.messageType) {
                    case 'text':
                        lastMessagePreview = mokim_shouldShowPlainText(latestMsg) ? (latestMsg.content.text || '') : '[LOCKED]';
                        break;
                    case 'image':
                        lastMessagePreview = '[图片]';
                        break;
                    case 'file':
                        lastMessagePreview = `[文件: ${latestMsg.content.fileName || '未知文件'}]`;
                        break;
                    case 'quote':
                        lastMessagePreview = `[引用] ${latestMsg.content.text || ''}`;
                        break;
                    case 'call':
                        lastMessagePreview = `[${latestMsg.content.callType === 'video' ? '视频' : '语音'}通话]`;
                        break;
                    case 'invite_group':
                        lastMessagePreview = `[群邀请]`;
                        break;
                    case 'system':
                        lastMessagePreview = `[系统消息] ${latestMsg.content.systemText || ''}`;
                        break;
                    case 'gift':
                        lastMessagePreview = '[礼物赠送]';
                        break;
                    case 'music':
                        lastMessagePreview = '[音乐分享]';
                        break;
                    case 'video':
                        lastMessagePreview = '[视频分享]';
                        break;
                    case 'game':
                        lastMessagePreview = '[游戏分享]';
                        break;
                    case 'redpacket':
                        lastMessagePreview = '[红包]';
                        break;
                    case 'files':
                        lastMessagePreview = '[文件分享]';
                        break;
                    default:
                        lastMessagePreview = `[${latestMsg.messageType}]`;
                }
                if (lastMessagePreview.length > 20) {
                    lastMessagePreview = lastMessagePreview.substring(0, 20) + '...';
                }

                resolve({
                    lastMessage: lastMessagePreview,
                    lastInteractTime: latestMsg.sendTime
                });
            };
        });
    } catch (error) {
        console.error('获取最新消息失败:', error);
        return {
            lastMessage: '暂无消息',
            lastInteractTime: 0
        };
    }
}
function renderEmoji(text) {
    if (!text) return '';
    const emojiRegex = /\[#([a-zA-Z0-9_-]+)\]/g;
    if (!hasValidEmoji(text)) {
        return escapeHtml(text);
    }
    emojiRegex.lastIndex = 0;
    let lastIndex = 0;
    let result = '';
    let match;
    const emojiPositions = [];
    while ((match = emojiRegex.exec(text)) !== null) {
        result += escapeHtml(text.substring(lastIndex, match.index));
        const emojiId = match[1];
        if (EMOJI_IDS.has(emojiId)) {
            const placeholder = `__EMOJI_${emojiId}_${Date.now()}_${Math.random()}__`;
            result += placeholder;
            emojiPositions.push({
                placeholder: placeholder,
                emojiId: emojiId,
                index: result.length - placeholder.length
            });
        } else {
            result += escapeHtml(`[#${emojiId}]`);
        }
        lastIndex = match.index + match[0].length;
    }
    result += escapeHtml(text.substring(lastIndex));
    if (emojiPositions.length > 0) {
        scheduleEmojiRender(result, emojiPositions);
    }

    return result;
}
function scheduleEmojiRender(baseHtml, emojiPositions) {
    if (emojiPreloadTimer) {
        clearTimeout(emojiPreloadTimer);
    }
    const renderFn = () => {
        const container = document.querySelector('.chat-messages');
        if (!container) return;
        renderEmojiBatch(emojiPositions, 0, 5, baseHtml);
    };

    if (window.requestIdleCallback) {
        requestIdleCallback(renderFn, { timeout: 100 });
    } else {
        setTimeout(renderFn, 50);
    }
}
function renderEmojiBatch(emojiPositions, startIndex, batchSize, baseHtml) {
    const batch = emojiPositions.slice(startIndex, startIndex + batchSize);
    if (batch.length === 0) return;
    requestAnimationFrame(() => {
        batch.forEach(({ placeholder, emojiId }) => {
            if (emojiCache.has(emojiId)) {
                const imgHtml = `<img src="${EMOJI_BASE_PATH}${emojiId}.png" class="emoji-img" alt="[${emojiId}]" title=":${emojiId}:" loading="lazy">`;
                replacePlaceholderInDOM(placeholder, imgHtml);
            } else {
                const placeholderSpan = document.createElement('span');
                placeholderSpan.className = 'emoji-placeholder';
                placeholderSpan.textContent = `[${emojiId}]`;
                placeholderSpan.style.opacity = '0.5';
                placeholderSpan.style.display = 'inline-block';
                placeholderSpan.style.minWidth = '20px';
                replacePlaceholderInDOM(placeholder, placeholderSpan.outerHTML);
                const img = new Image();
                img.onload = () => {
                    const imgHtml = `<img src="${EMOJI_BASE_PATH}${emojiId}.png" class="emoji-img" alt="[${emojiId}]" title=":${emojiId}:" loading="lazy">`;
                    replacePlaceholderInDOM(placeholder, imgHtml);
                    emojiCache.set(emojiId, true);
                };
                img.onerror = () => {
                    replacePlaceholderInDOM(placeholder, `[${emojiId}]`);
                };
                img.src = `${EMOJI_BASE_PATH}${emojiId}.png`;
            }
        });
        if (startIndex + batchSize < emojiPositions.length) {
            renderEmojiBatch(emojiPositions, startIndex + batchSize, batchSize, baseHtml);
        }
    });
}
function replacePlaceholderInDOM(placeholder, replacementHtml) {
    const elements = document.querySelectorAll('.message-text, .quote-card');
    for (const element of elements) {
        if (element.innerHTML.includes(placeholder)) {
            element.innerHTML = element.innerHTML.replace(new RegExp(escapeRegExp(placeholder), 'g'), replacementHtml);
        }
    }
}
function hasValidEmoji(text) {
    if (!text) return false;
    const emojiRegex = /\[#([a-zA-Z0-9_-]+)\]/g;
    let match;
    while ((match = emojiRegex.exec(text)) !== null) {
        if (EMOJI_IDS.has(match[1])) {
            return true;
        }
    }
    return false;
}
function preloadVisibleEmojis() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src && !img.src) {
                    img.src = img.dataset.src;
                }
                observer.unobserve(img);
            }
        });
    });
    document.querySelectorAll('.emoji-img[data-src]').forEach(img => {
        observer.observe(img);
    });
}
function cleanupEmojiCache() {
    const MAX_CACHE_SIZE = 200;
    if (emojiCache.size > MAX_CACHE_SIZE) {
        const keysToDelete = Array.from(emojiCache.keys()).slice(0, emojiCache.size - MAX_CACHE_SIZE);
        keysToDelete.forEach(key => emojiCache.delete(key));
    }
}
setInterval(cleanupEmojiCache, 60000);
function extractEmojiIds(text) {
    if (!text) return [];
    const emojiRegex = /\[#([a-zA-Z0-9_-]+)\]/g;
    const ids = [];
    let match;
    while ((match = emojiRegex.exec(text)) !== null) {
        if (EMOJI_IDS.has(match[1])) {
            ids.push(match[1]);
        }
    }
    return ids;
}
function mokim_isConversationHidden(conversationId) {
    return appState.hiddenConversations.has(conversationId);
}
function mokim_unhideConversation(conversationId) {
    appState.hiddenConversations.delete(conversationId);
    const conversationItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
    if (conversationItem) {
        conversationItem.style.display = '';
    }
}
function mokim_hideConversation(conversationId) {
    appState.hiddenConversations.add(conversationId);
    const conversationItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
    if (conversationItem) {
        conversationItem.style.display = 'none';
    }
}
async function renderContacts() {
    const conversationList = document.querySelector('.conversation-list');
    if (!conversationList) return;
    conversationList.innerHTML = '';
    let allConversations = [];
    const conversationMap = new Map();
    if (appState.contacts && Array.isArray(appState.contacts)) {
        appState.contacts.forEach(contact => {
            const convId = contact.conversationId || contact.contactId;
            if (convId && !conversationMap.has(convId)) {
                conversationMap.set(convId, {
                    ...contact,
                    type: 'contact',
                    conversationId: convId,
                    contactId: contact.contactId || contact.user_id || contact.userId
                });
            }
        });
    }

    if (appState.groups && Array.isArray(appState.groups)) {
        appState.groups.forEach(group => {
            const convId = `group_${group.group_id}`;
            if (!conversationMap.has(convId)) {
                conversationMap.set(convId, {
                    ...group,
                    contactId: convId,
                    conversationId: convId,
                    uname: group.group_name || '群聊',
                    friendAlias: group.galias || group.group_name,
                    isGroup: true,
                    type: 'group',
                    isPinned: group.isPinned || false,
                    unreadCount: group.unreadCount || 0
                });
            }
        });
    }
    allConversations = Array.from(conversationMap.values());
    if (allConversations.length === 0) {
        const emptyStateHtml = `
            <div class="empty-contacts-state">
                <div class="empty-contacts-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <div class="empty-contacts-title">暂无会话</div>
                <div class="empty-contacts-desc">
                    您还没有添加任何好友或加入群聊
                </div>
                <div class="empty-contacts-suggest">
                    <div class="suggest-item">
                        <i class="fas fa-user-plus"></i>
                        <span>点击"联系人"添加好友</span>
                    </div>
                    <div class="suggest-item">
                        <i class="fas fa-users"></i>
                        <span>创建或加入群聊开始聊天</span>
                    </div>
                    <div class="suggest-item">
                        <i class="fas fa-search"></i>
                        <span>搜索账号找到更多朋友</span>
                    </div>
                </div>
            </div>
        `;
        conversationList.innerHTML = emptyStateHtml;
        return;
    }
    const conversationsWithMessages = [];
    for (const conv of allConversations) {
        const { lastMessage, lastInteractTime } =
            await getLatestMessageByConversationId(conv.conversationId);
        conversationsWithMessages.push({
            ...conv,
            lastMessage,
            lastInteractTime
        });
    }

    conversationsWithMessages.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.lastInteractTime || 0) - (a.lastInteractTime || 0);
    });

    for (const item of conversationsWithMessages) {
        const {
            conversationId,
            uname,
            friendAlias,
            lastMessage,
            lastInteractTime,
            unreadCount,
            isPinned,
            isGroup,
            type,
            contactId
        } = item;

        const isSelected = appState.selectedContact && (
            appState.selectedContact.conversationId === conversationId
        );

        const li = document.createElement('li');
        li.id = `conv-${conversationId}`;
        li.className = `conversation-item ${isSelected ? 'selected' : ''} ${unreadCount > 0 ? 'unread' : ''}`;
        li.dataset.conversationId = conversationId;
        li.dataset.type = type || (isGroup ? 'group' : 'contact');
        const avatarText = (friendAlias || uname || 'U').charAt(0).toUpperCase();
        const unreadHtml = unreadCount > 0
            ? `<div class="conv-unread">${unreadCount > 99 ? '99+' : unreadCount}</div>`
            : '';
        const typeBadge = isGroup
            ? '<span class="conv-type-badge" title="群聊"><i class="fas fa-users"></i></span>'
            : '';

        li.innerHTML = `
            ${isPinned ? '<span class="conv-pinned">置顶</span>' : ''}
            <div class="conv-avatar">${escapeHtml(avatarText)}</div>
            <div class="conv-info">
                <div class="conv-name">
                    ${escapeHtml(friendAlias || uname || '未知')}
                    ${typeBadge}
                </div>
                <div class="conv-preview">${escapeHtml(lastMessage || '暂无消息')}</div>
            </div>
            <div class="conv-time">${formatTime(lastInteractTime)}</div>
            ${unreadHtml}
        `;
        li.removeEventListener('click', handleContactClick);
        li.addEventListener('click', handleContactClick);
        conversationList.appendChild(li);
        if (mokim_isConversationHidden(conversationId)) {
            li.style.display = 'none';
        }
    }
}
function handleContactClick(e) {
    const li = e.currentTarget;
    const conversationId = li.dataset.conversationId;
    const type = li.dataset.type;
    if (li._clickTimer) {
        clearTimeout(li._clickTimer);
        li._clickTimer = null;
        if (appState.selectedContact && (appState.selectedContact.conversationId === conversationId)) {
            jucontactclick_bytwicetry = 1;
            unselectContact();
        }
        return;
    }

    li._clickTimer = setTimeout(() => {
        li._clickTimer = null;
        let selectedItem = null;
        if (type === 'group') {
            selectedItem = appState.groups?.find(g => `group_${g.group_id}` === conversationId);
            if (selectedItem) {
                selectedItem = {
                    ...selectedItem,
                    isGroup: true,
                    conversationId: conversationId
                };
            }
        } else {
            selectedItem = appState.contacts?.find(c =>
                (c.conversationId === conversationId) || (c.contactId === conversationId)
            );
        }

        if (selectedItem) {
            if (appState.selectedContact &&
                appState.selectedContact.conversationId === conversationId) {
                unselectContact();
                jucontactclick_bytwicetry = 1;
            } else {
                selectContact(selectedItem);
            }
        }
    }, 50);
}
function clearContactClickTimers() {
    document.querySelectorAll('.conversation-item').forEach(item => {
        if (item._clickTimer) {
            clearTimeout(item._clickTimer);
            item._clickTimer = null;
        }
    });
}

function selectContact(contact) {
    if (isBatchMode) {
        exitBatchMode();
    }
    const isGroup = contact?.isGroup || contact?.type === 'group' || contact?.conversationId?.startsWith('group_');
    if (!isGroup) {
        appState.contacts = appState.contacts.map(item => {
            if (item.conversationId === contact.conversationId) {
                return { ...item, unreadCount: 0 };
            }
            return item;
        });
    } else {
        appState.groups = appState.groups.map(item => {
            if (item.conversationId === contact.conversationId ||
                `group_${item.group_id}` === contact.conversationId) {
                return { ...item, unreadCount: 0 };
            }
            return item;
        });
    }
    appState.selectedContact = {
        ...contact,
        contactId: isGroup ? contact.conversationId : (contact.contactId || contact.user_id || contact.userId),
        conversationId: contact.conversationId,
        isGroup: isGroup,
        userId: !isGroup ? (contact.contactId || contact.user_id || contact.userId) : undefined,
        uname: isGroup ? (contact.group_name || contact.uname) : contact.uname,
        friendAlias: isGroup ? contact.group_name : (contact.friendAlias || contact.uname)
    };
    document.querySelector('.layout-container')?.classList.add('has-selected');
    updatePinSwitchStatus(contact.isPinned || false);
    renderContacts();
    switchChatWindow(appState.selectedContact);
    markConversationAsRead(contact.conversationId);
    if (mokim_isConversationHidden(contact.conversationId)) {
        mokim_unhideConversation(contact.conversationId);
    }
}
function updatePinSwitchStatus(isPinned) {
    const pinSwitch = document.querySelector('[data_types="person_pin"]');
    const pinSwitch2 = document.querySelector('[data_types="group_pin"]');
    if (!pinSwitch || !pinSwitch2) return;
    if (isPinned) {
        pinSwitch.classList.add('active');
        pinSwitch2.classList.add('active');
    } else {
        pinSwitch.classList.remove('active');
        pinSwitch2.classList.remove('active');
    }
}
function unselectContact() {
    appState.selectedContact = null;
    document.querySelector('.layout-container')?.classList.remove('has-selected');
    const chatMessages = document.querySelector('.chat-messages');
    const chatTitle = document.querySelector('.chat-title');
    const profileName = document.querySelector('.profile-name'); //联系人-名称
    const profileSignature = document.querySelector('.profile-signature'); //联系人-签名
    const profile_mid = document.querySelector('#profile_m_id'); //联系人-ID
    const profile_mregt = document.querySelector('#profile_m_regt'); //联系人-注册时间
    const profile_malias = document.querySelector('#profile_m_alias'); //联系人-备注
    const profile_mgroup = document.querySelector('#profile_m_groupto'); //联系人-分组
    if (chatMessages) chatMessages.innerHTML = '';
    if (chatTitle) chatTitle.textContent = '';
    if (profileName) profileName.textContent = '';
    if (profileSignature) profileSignature.textContent = '';
    if (profile_mid) profile_mid.textContent = '';
    if (profile_mregt) profile_mregt.textContent = '';
    if (profile_malias) profile_malias.textContent = '';
    if (profile_mgroup) profile_mgroup.textContent = '';
    if (jucontactclick_bytwicetry === 1) {
        renderContacts();
        jucontactclick_bytwicetry = 0;
    }
}
function showAccountStatusTip(contact) {
    const existingTip = document.querySelector('.account-status-tip-message');
    if (existingTip) {
        existingTip.remove();
    }
    if (contact?.isGroup) return;
    if (contact?.account_status !== 1 && contact?.account_status !== 2) return;

    const isBanned = contact.account_status === 1;
    const statusType = isBanned ? 'banned' : 'deleted';
    const config = {
        banned: {
            title: '账号已被封禁',
            titleIcon: '⛔',
            accentColor: '#d9534f',
            bgGradient: 'linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%)',
            borderColor: '#f56c6c',
            shadowColor: 'rgba(245, 108, 108, 0.15)',
            feeling: '该账号因违反社区规定被限制使用',
            advice: '请遵守平台规则，共同维护健康友善的聊天环境。如需申诉，请联系平台客服。',
            extraNote: '您无法向该账号发送消息，对方也无法接收或回复。'
        },
        deleted: {
            title: '账号已注销',
            titleIcon: '📭',
            accentColor: '#6c757d',
            bgGradient: 'linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%)',
            borderColor: '#adb5bd',
            shadowColor: 'rgba(108, 117, 125, 0.1)',
            feeling: '该账号已被用户主动注销或永久删除',
            advice: '该账号已不再存在于系统中，无法进行任何新的互动。',
            extraNote: '聊天记录将被保留用于本地查看，无法发送新消息。'
        }
    };

    const cfg = config[statusType];
    const tipId = `tip_${statusType}_${Date.now()}`;
    const tipContainer = document.createElement('div');
    tipContainer.className = 'account-status-tip-message';
    tipContainer.id = tipId;
    tipContainer.setAttribute('data-status-type', statusType);
    tipContainer.style.cssText = `
        margin: 16px 24px 20px 24px;
        opacity: 0;
        transform: translateY(-12px);
        transition: all 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
        will-change: transform, opacity;
    `;
    const atmosphereStyle = isBanned ? `
        @keyframes bannedGlow {
            0% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.2); border-left-color: #f56c6c; }
            50% { box-shadow: 0 2px 12px 0 rgba(245, 108, 108, 0.35); border-left-color: #ff7c7c; }
            100% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.2); border-left-color: #f56c6c; }
        }
        @keyframes bannedShake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-2px); }
            75% { transform: translateX(2px); }
            100% { transform: translateX(0); }
        }
        .atmosphere-banned-icon {
            animation: bannedShake 0.5s ease-in-out 0.2s;
        }
    ` : `
        @keyframes deletedFadeFlow {
            0% { opacity: 0.6; background-position: 0% 50%; }
            50% { opacity: 1; background-position: 100% 50%; }
            100% { opacity: 0.6; background-position: 0% 50%; }
        }
        @keyframes deletedFloat {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
            100% { transform: translateY(0px); }
        }
        .atmosphere-deleted-icon {
            animation: deletedFloat 1.2s ease-in-out infinite;
        }
    `;
    if (!document.getElementById('account-status-tip-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'account-status-tip-styles';
        styleSheet.textContent = `
            ${atmosphereStyle}
            .account-status-tip-message {
                backdrop-filter: blur(2px);
            }
            .account-status-tip-message .tip-glow-effect {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border-radius: 12px;
                pointer-events: none;
                z-index: 0;
            }
            .account-status-tip-message.banned-glow .tip-glow-effect {
                animation: bannedGlow 2s ease-in-out infinite;
            }
            .account-status-tip-message.deleted-flow .tip-glow-effect {
                background: linear-gradient(90deg, transparent, rgba(108, 117, 125, 0.08), transparent);
                background-size: 200% 100%;
                animation: deletedFadeFlow 3s ease-in-out infinite;
            }
            @keyframes tipContentSlideUp {
                0% { opacity: 0; transform: translateY(8px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            .tip-content-wrapper {
                animation: tipContentSlideUp 0.5s ease-out 0.15s both;
            }
            @keyframes rippleExpand {
                0% { transform: scale(0); opacity: 0.5; }
                100% { transform: scale(4); opacity: 0; }
            }
            .tip-ripple {
                position: absolute;
                border-radius: 50%;
                background-color: ${cfg.accentColor};
                opacity: 0;
                pointer-events: none;
                animation: rippleExpand 0.6s ease-out forwards;
            }
        `;
        document.head.appendChild(styleSheet);
    }
    tipContainer.innerHTML = `
        <div class="tip-glow-effect"></div>
        <div class="tip-content-wrapper" style="position: relative; z-index: 1;">
            <div style="display: flex; align-items: flex-start; gap: 14px;">
                <div class="${isBanned ? 'atmosphere-banned-icon' : 'atmosphere-deleted-icon'}" 
                     style="font-size: 32px; flex-shrink: 0; line-height: 1; filter: drop-shadow(0 2px 4px ${cfg.shadowColor});">
                    ${cfg.titleIcon}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                        <span style="font-weight: 700; font-size: 16px; color: ${cfg.accentColor}; letter-spacing: -0.3px;">
                            ${cfg.titleIcon} ${cfg.title}
                        </span>
                        <span style="font-size: 11px; background: ${cfg.accentColor}15; color: ${cfg.accentColor}; padding: 2px 8px; border-radius: 20px;">
                            ${isBanned ? '限制状态' : '失效账号'}
                        </span>
                    </div>
                    <div style="color: #5a6874; font-size: 13px; line-height: 1.55; margin-bottom: 10px;">
                        <span style="font-weight: 500;">${cfg.feeling}</span>。<br>
                        ${cfg.advice}
                    </div>
                    <div style="background: ${isBanned ? '#fef0f0' : '#f5f7fa'}; border-radius: 8px; padding: 8px 12px; margin: 8px 0 6px; font-size: 12px; color: ${cfg.accentColor}; border-left: 2px solid ${cfg.borderColor};">
                        <i class="fas fa-info-circle" style="margin-right: 6px;"></i>
                        ${cfg.extraNote}
                    </div>
                    <div style="font-size: 11px; color: #a0aab5; margin-top: 8px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <span><i class="far fa-clock"></i> 提示时间: ${new Date().toLocaleString('zh-CN')}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    tipContainer.style.position = 'relative';
    tipContainer.style.background = cfg.bgGradient;
    tipContainer.style.borderRadius = '14px';
    tipContainer.style.borderLeft = `4px solid ${cfg.borderColor}`;
    tipContainer.style.boxShadow = `0 4px 14px ${cfg.shadowColor}`;
    const insertTip = () => {
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages && !chatMessages.querySelector('.account-status-tip-message')) {
            chatMessages.appendChild(tipContainer);
            requestAnimationFrame(() => {
                tipContainer.style.opacity = '1';
                tipContainer.style.transform = 'translateY(0)';
            });
            const ripple = document.createElement('div');
            ripple.className = 'tip-ripple';
            ripple.style.cssText = `
                width: 20px;
                height: 20px;
                position: absolute;
                bottom: 10px;
                right: 10px;
                background-color: ${cfg.accentColor};
            `;
            tipContainer.appendChild(ripple);
            setTimeout(() => {
                chatMessages.scrollTo({
                    top: chatMessages.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
    };
    setTimeout(insertTip, 60);
    tipContainer.addEventListener('mouseenter', () => {
        tipContainer.style.transform = 'translateY(-2px)';
        tipContainer.style.transition = 'transform 0.25s ease-out';
    });
    tipContainer.addEventListener('mouseleave', () => {
        tipContainer.style.transform = 'translateY(0)';
    });
}
function switchChatWindow(contact) {
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) chatMessages.innerHTML = '';
    const chatTitle = document.querySelector('.chat-title');
    const profileName = document.querySelector('.profile-name');
    const profileSignature = document.querySelector('.profile-signature');
    const profile_mid = document.querySelector('#profile_m_id');
    const profile_mregt = document.querySelector('#profile_m_regt');
    const profile_malias = document.querySelector('#profile_m_alias');
    const profile_mgroup = document.querySelector('#profile_m_groupto');
    const isGroup = contact?.isGroup || false;
    const list_1 = document.getElementById('contact-play-do-init');
    const list_2 = document.getElementById('group-play-do-init');
    const list_3 = document.getElementById('tab-item-sidebar-coms3');
    const profileAvatar = document.querySelector('.profile-avatar');
    const list_4 = document.getElementById('modify-add-noticenew-sg');
    const operate_header_group = document.getElementById('fak-header-from-group-operate');
    const operte_header_person = document.getElementById('fak-header-from-person-operate');
    if (chatTitle) {
        delete chatTitle.dataset.originalTitle;
        switch (contact?.account_status) {
            case 0:
                chatTitle.textContent = isGroup
                    ? (contact?.group_name || contact?.uname || '群聊')
                    : `${contact?.friendAlias || contact?.uname || '未知联系人'}`;
                break;
            case 1:
                chatTitle.textContent = isGroup
                    ? (contact?.group_name || contact?.uname || '群聊')
                    : `[已封禁] ${contact?.friendAlias || contact?.uname || '未知联系人'}`;
                break;
            case 2:
                chatTitle.textContent = '对方已注销';
                break;
            default:
                chatTitle.textContent = isGroup
                    ? (contact?.group_name || contact?.uname || '群聊')
                    : `${contact?.friendAlias || contact?.uname || '未知联系人'}`;
                break;
        }
    }
    if (profileName) {
        switch (contact?.account_status) {
            case 0:
                profileName.textContent = isGroup
                    ? (contact?.group_name || '群聊')
                    : (contact?.uname || '未知联系人');
                break;
            case 1:
                profileName.textContent = isGroup
                    ? (contact?.group_name || '群聊')
                    : `[已封禁] ${contact?.uname || '未知联系人'}`;
                break;
            case 2:
                profileName.textContent = '对方已注销';
                break;
            default:
                profileName.textContent = isGroup
                    ? (contact?.group_name || '群聊')
                    : `${contact?.uname || '未知联系人'}`;
                break;
        }
    }

    if (profileSignature) {
        profileSignature.textContent = isGroup
            ? (contact?.group_desc || '暂无群介绍')
            : (contact?.sayed || '暂无签名');
        profileSignature.title = isGroup
            ? (contact?.group_desc || '暂无群介绍')
            : (contact?.sayed || '暂无签名');
    }

    if (profile_mid) {
        profile_mid.textContent = isGroup
            ? `群号码：${contact?.searnum || contact?.searnum || '未知'}`
            : `ID：${contact?.contactId || '未知'}`;
    }

    if (profile_mregt) {
        profile_mregt.textContent = isGroup
            ? `最大成员数量：${contact?.memberCount || contact?.max_member || '未知'}`
            : `添加时间：${contact?.createTime || '未知'}`;
    }

    if (profile_malias) {
        profile_malias.textContent = isGroup
            ? `群主代号：${xplugin_idToCode(contact?.owner_id || '10000')}`
            : `备注：${contact?.friendAlias || '无备注'}`;
    }

    if (profile_mgroup) {
        profile_mgroup.textContent = isGroup
            ? `我的角色：${contact?.is_admin ? '管理员' : '成员'}`
            : `好友分组：${contact?.friend_group || '默认分组'}`;
    }
    if (profileAvatar) {
        const displayName = isGroup
            ? (contact?.group_name || '群聊')
            : (contact?.uname || '未知联系人');
        const initial = displayName.charAt(0).toUpperCase();
        var avatarUrl = isGroup
            ? (contact?.group_avatar || null)
            : (contact?.tximg || null);
        if (avatarUrl) {
            profileAvatar.innerHTML = '';
            const img = document.createElement('img');
            if (avatarUrl === '(&&)::avatar.jpg') {
                avatarUrl = '/ast/fickp/default.png';
            } else {
                const isSafe = /^https?:\/\//i.test(avatarUrl);
                if (!isSafe) {
                    avatarUrl = '/ast/fickp/default.png';
                }
            }
            img.src = avatarUrl;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';
            img.onerror = () => {
                profileAvatar.textContent = initial;
            };
            profileAvatar.appendChild(img);
        } else {
            profileAvatar.textContent = initial;
        }
    }
    if (typingStarted) {
        clearTimeout(typingEndTimeout);
        typingStarted = false;
        lastTypingNotifyTime = 0;
    }
    if (isGroup) {
        document.getElementById('chat-toolbar-redpacket').style.display = 'inline-block';
        list_1.style.display = 'none';
        list_2.style.display = 'block';
        list_3.style.display = 'block';
        operate_header_group.style.display = 'block';
        operte_header_person.style.display = 'none';
        initGroupAnnouncements();
        if (contact?.is_admin && appState.userId === contact?.owner_id) {
            document.getElementById('modify-update-breakgr').style.display = 'block';
            document.getElementById('modify-update-groupinfoin').style.display = 'block';
        } else {
            document.getElementById('modify-update-breakgr').style.display = 'none';
            if (contact?.is_admin) {
                document.getElementById('modify-update-groupinfoin').style.display = 'block';
            } else {
                list_4.style.display = 'none';
                document.getElementById('gnoticeContainer').style.maxHeight = '286px';
                document.getElementById('gnoticeContainer').style.height = '286px';
                document.getElementById('modify-update-groupinfoin').style.display = 'none';
            }
        }
        const daynumber_diff = mokim_tool_getDaysDiff(contact?.join_time, new Date());
        document.getElementById('us_contact_lovejillydays').textContent = `${daynumber_diff}`;
        document.getElementById('us_contact_lovejillydays').title = `已加入本群${daynumber_diff}天`;
        document.getElementById('us_contact_lovenumber').textContent = contact?.is_admin ? '管理员' : '成员'
        document.getElementById('us_contact_loverbody').textContent = contact?.member_status === 1 ? '正常' : '禁言';
        document.getElementById('us_contact_loverbglobal').textContent = '状态';
        document.getElementById('us_contact_loveglobal').textContent = '身份';
        document.getElementById('us_contact_lovedayglobal').textContent = '群龄';
    } else {
        document.getElementById('chat-toolbar-redpacket').style.display = 'none';
        list_1.style.display = 'block';
        list_2.style.display = 'none';
        list_3.style.display = 'none';
        operate_header_group.style.display = 'none';
        operte_header_person.style.display = 'block';
        const daynumber_diff = mokim_tool_getDaysDiff(contact?.createTime, new Date());
        document.getElementById('us_contact_lovejillydays').textContent = `${daynumber_diff}`;
        document.getElementById('us_contact_lovenumber').textContent = contact?.intimacy.value;
        document.getElementById('us_contact_loverbody').textContent = mokim_tool_getIntimacyLevel(contact?.intimacy.value, contact?.intimacy.alias);
        document.getElementById('us_contact_loverbglobal').textContent = '关系';
        document.getElementById('us_contact_loveglobal').textContent = '亲密度';
        document.getElementById('us_contact_lovedayglobal').textContent = '相识';
        document.getElementById('us_contact_lovejillydays').title = `已成为好友${daynumber_diff}天`;
    }
    if (contact?.account_status !== 0 && !isGroup) {
        document.querySelector('.chat-toolbar').style.display = 'none';
        document.querySelector('.chat-actions').style.visibility = 'hidden';
    } else {
        document.querySelector('.chat-toolbar').style.display = 'block';
        document.querySelector('.chat-actions').style.visibility = 'visible';
    }
    document.getElementById('tab-item-sidebar-coms1').click();
    showAccountStatusTip(contact);
    loadMessagesByPage(contact?.conversationId, 1, 20);
}
async function loadMessagesByPage(conversationId, page, pageSize) {
    const db = await initIndexedDB();
    const transaction = db.transaction('messages', 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('conversationId');
    const request = index.getAll(conversationId);
    request.onsuccess = (e) => {
        const allMessages = e.target.result.sort((a, b) => a.sendTime - b.sendTime);
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const pageMessages = allMessages.slice(start, end);
        const chatMessages = document.querySelector('.chat-messages');
        if (page === 1 && chatMessages) {
            chatMessages.innerHTML = '';
        }
        renderMessages(pageMessages, true);
        if (chatMessages && !chatMessages.dataset.scrollListener) {
            chatMessages.dataset.scrollListener = 'true';
            chatMessages.addEventListener('scroll', () => {
                const { scrollTop, scrollHeight, clientHeight } = chatMessages;
                if (scrollTop <= 0 && page > 1) {
                    loadMessagesByPage(conversationId, page - 1, pageSize);
                }
                if (scrollTop + clientHeight >= scrollHeight - 20 && end < allMessages.length) {
                    loadMessagesByPage(conversationId, page + 1, pageSize);
                }
            }, { passive: true });
        }
    };
}
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
async function gimmok_acceptGroupInvite(groupId, groupName = '该群聊') {
    if (!groupId) {
        alertMsg('群聊ID无效，无法加入');
        return false;
    }
    const confirmResult = await mok_confirm(
        `是否确认加入群聊「${escapeHtml(groupName)}」？\n加入后即可与群成员聊天`,
        {
            title: '接受群聊邀请',
            icon: 'question',
            confirmButtonText: '确认加入',
            cancelButtonText: '取消',
            showCancelButton: true
        }
    );
    if (!confirmResult) {
        return false;
    }
    Loading.show('正在加入群聊...');
    try {
        const authdatas = await tmd_newcontroler.writenewwords(groupId);
        return new Promise((resolve, reject) => {
            plugin_post_requests({
                UserId: appState.userId,
                group_id: authdatas
            }, async (error, response) => {
                Loading.hide();
                if (error) {
                    alertMsg(`加入群聊失败：${error.message}`);
                    reject(error);
                    return;
                }
                if (response && response.success) {
                    alertMsg(`成功加入群聊「${escapeHtml(groupName)}」！`);
                    sendWsMessage({ type: 'refresh_groups' });
                    resolve(response.data);
                } else {
                    const errorMsg = response?.message || '加入群聊失败，请稍后重试';
                    alertMsg(errorMsg);
                    reject(new Error(errorMsg));
                }
            }, {
                url: '/api/accept_group_invite/',
                timeout: 15000
            });
        });
    } catch (error) {
        Loading.hide();
        alertMsg(`加入群聊失败：${error.message}`);
        return false;
    }
}
function renderMessages(messages, showTime = false) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages || !messages.length) return;
    const existingMessageIds = new Set();
    chatMessages.querySelectorAll('.message-item, .message-system').forEach(el => {
        const msgId = el.dataset.messageId;
        if (msgId) existingMessageIds.add(msgId);
    });
    let lastDisplayedTime = 0;
    const TIME_THRESHOLD = 5 * 60 * 1000;
    const newMessages = messages.filter(msg => !existingMessageIds.has(msg.messageId));
    if (newMessages.length === 0) return;
    const scrollTop = chatMessages.scrollTop;
    const scrollHeight = chatMessages.scrollHeight;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - chatMessages.clientHeight) < 50;
    newMessages.forEach(msg => {
        if (document.querySelector(`.message-item[data-message-id="${msg.messageId}"], .message-system[data-message-id="${msg.messageId}"]`)) {
            return;
        }
        const shouldShowTime = !msg.sendTime || (msg.sendTime - lastDisplayedTime) > TIME_THRESHOLD;
        if (showTime && shouldShowTime && msg.sendTime) {
            lastDisplayedTime = msg.sendTime;
            const timeLabel = document.createElement('div');
            timeLabel.className = 'message-time-label';
            timeLabel.textContent = new Date(msg.sendTime).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            timeLabel.style.cssText = `
                text-align: center;
                font-size: 12px;
                color: #999;
                padding: 8px 0;
                margin: 4px 0;
            `;
            chatMessages.appendChild(timeLabel);
        }
        const messageItem = document.createElement('div');
        messageItem.dataset.messageType = msg.messageType;
        messageItem.dataset.messageId = msg.messageId;
        messageItem.dataset.sendTime = msg.sendTime;
        if (msg.messageType === 'system') {
            messageItem.className = 'message-system';
            messageItem.innerHTML = `<div class="message-revoke">${msg.content.systemText}</div>`;
            chatMessages.appendChild(messageItem);
            return;
        }
        messageItem.className = `message-item ${msg.isSelf ? 'self' : 'other'}`;
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        const isGroupChat = appState.selectedContact?.isGroup || false;
        if (msg.isSelf) {
            avatar.textContent = 'Me';
            avatar.title = '我';
        } else {
            if (isGroupChat) {
                const senderName = msg.senderName || msg.senderId || '未知用户';
                avatar.textContent = senderName.charAt(0).toUpperCase();
                avatar.title = senderName;
            } else {
                avatar.textContent = '对方';
                avatar.title = '对方';
            }
        }
        messageItem.appendChild(avatar);
        messageItem.appendChild(bubble);
        const isLocked = msg.lock && msg.lock.enabled;
        const isMyMessage = msg.isSelf;
        switch (msg.messageType) {
            case 'text':
                if (isLocked && !isMyMessage) {
                    const lockMode = msg.lock.mode || 'unknown';
                    const lockIconMap = {
                        'password': '🔐',
                        'time': '⏰',
                        'burn': '🔥'
                    };
                    const lockIcon = lockIconMap[lockMode] || '🔒';
                    const modeNames = {
                        'password': '密码防护',
                        'time': '时间防护',
                        'burn': '阅后即焚'
                    };
                    const modeName = modeNames[lockMode] || '已上锁';
                    let unlockHtml = '';
                    if (lockMode === 'password') {
                        unlockHtml = `
                            <div class="lock-unlock-area" style="margin-top: 10px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                <input type="password" class="lock-answer-input" placeholder="请输入答案..." maxlength="8" style="padding: 4px 10px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 13px; flex: 1; min-width: 100px;">
                                <button class="lock-unlock-btn" data-msg-id="${msg.messageId}" style="padding: 4px 14px; background: #409eff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">解锁</button>
                            </div>
                        `;
                    } else if (lockMode === 'time') {
                        const expireTime = msg.lock.expireTime || 0;
                        const isExpired = Date.now() > expireTime;
                        if (isExpired) {
                            unlockHtml = `<div style="margin-top: 8px; color: #f56c6c; font-size: 13px;"><i class="fas fa-exclamation-circle"></i> 消息已过期，无法查看</div>`;
                        } else {
                            const remainMs = expireTime - Date.now();
                            const remainMin = Math.floor(remainMs / (1000 * 60));
                            const remainSec = Math.floor((remainMs % (1000 * 60)) / 1000);
                            unlockHtml = `
                                <div style="margin-top: 8px; color: #409eff; font-size: 13px;">
                                    <i class="fas fa-clock"></i> 有效期剩余 ${remainMin > 0 ? remainMin + '分' : ''} ${remainSec}秒
                                </div>
                                <button class="lock-unlock-btn" data-msg-id="${msg.messageId}" style="margin-top: 6px; padding: 4px 14px; background: #409eff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">查看消息</button>
                            `;
                        }
                    } else if (lockMode === 'burn') {
                        unlockHtml = `
                            <div style="margin-top: 8px; color: #e6a23c; font-size: 13px;">
                                <i class="fas fa-fire"></i> 阅后即焚，查看后 ${msg.lock.burnDelay || 5} 秒内销毁
                            </div>
                            <button class="lock-unlock-btn" data-msg-id="${msg.messageId}" style="margin-top: 6px; padding: 4px 14px; background: #e6a23c; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">查看消息</button>
                        `;
                    }

                    bubble.innerHTML = `
                        <div class="message-locked" data-lock-mode="${lockMode}" data-msg-id="${msg.messageId}">
                            <div style="display: flex; align-items: center; gap: 10px; padding: 4px 0;">
                                <span style="font-size: 28px;">${lockIcon}</span>
                                <div>
                                    <div style="font-weight: 500; font-size: 14px; color: #333;">此消息已上锁</div>
                                    <div style="font-size: 12px; color: #999;">模式：${modeName}</div>
                                    ${lockMode === 'password' && msg.lock.question ? `<div style="font-size: 12px; color: #666; margin-top: 2px;">问题：${escapeHtml(msg.lock.question)}</div>` : ''}
                                </div>
                            </div>
                            ${unlockHtml}
                            <div style="margin-top: 8px; font-size: 11px; color: #bbb; border-top: 1px dashed #eee; padding-top: 6px;">
                                <i class="fas fa-shield-alt"></i> TENC100
                            </div>
                        </div>
                    `;
                    const unlockBtn = bubble.querySelector('.lock-unlock-btn');
                    if (unlockBtn) {
                        unlockBtn.addEventListener('click', function (e) {
                            e.stopPropagation();
                            const msgId = this.dataset.msgId;
                            const lockContainer = this.closest('.message-locked');
                            const answerInput = lockContainer?.querySelector('.lock-answer-input');
                            const answer = answerInput ? answerInput.value.trim() : '';
                            mokim_unlockMessage(msgId, answer, lockContainer);
                        });
                    }
                    const answerInput = bubble.querySelector('.lock-answer-input');
                    if (answerInput) {
                        answerInput.addEventListener('keydown', function (e) {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const btn = this.closest('.lock-unlock-area')?.querySelector('.lock-unlock-btn');
                                if (btn) btn.click();
                            }
                        });
                    }

                } else {
                    const text = msg.content.text || '';
                    const renderedText = renderEmoji(text);
                    const textWithLineBreaks = renderedText.replace(/\n/g, '<br>');
                    let lockBadge = '';
                    if (isLocked && isMyMessage) {
                        const modeNames = {
                            'password': '🔐',
                            'time': '⏰',
                            'burn': '🔥'
                        };
                        lockBadge = `<span style="font-size: 12px; margin-right: 6px;" title="已上锁（${msg.lock.mode || '未知模式'}）">${modeNames[msg.lock.mode] || '🔒'}</span>`;
                    }
                    bubble.innerHTML = `<div class="message-text">${lockBadge}${textWithLineBreaks}</div>`;
                }
                break;
            case 'files':
                const data_get = msg.content?.text;
                const fileId = data_get.fileId || data_get.file_id || '';
                const fileName = data_get.fileName || data_get.file_name || '文件';
                const fileSize = data_get.fileSize || data_get.file_size || 0;
                const isSelfFile = msg.isSelf;
                const timeStr = new Date(data_get.expire).toLocaleString('zh-CN', { hour12: false });
                bubble.innerHTML = `
        <div class="message-file" data-file-id="${escapeHtml(fileId)}" data-file-name="${escapeHtml(fileName)}">
            <div class="file-card" style="
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 14px;
                background: ${isSelfFile ? '#e8f4fd' : '#f5f7fa'};
                border-radius: 10px;
                border: 1px solid ${isSelfFile ? '#b3d9f7' : '#e0e0e0'};
                min-width: 160px;
                max-width: 260px;
                cursor: pointer;
                transition: all 0.2s;
            ">
                <div style="font-size: 28px; flex-shrink: 0; color: ${isSelfFile ? '#409eff' : '#666'};">
                    <i class="fas fa-file"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; font-size: 14px; color: #1f2a3a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${escapeHtml(fileName)}
                    </div>
                    <div style="font-size: 12px; color: #999;">
                        ${fileSize > 0 ? formatFileSize(fileSize) : '文件'}
                    </div>
                     <div style="font-size: 11px; color: #d69191;">
                        过期时间：${timeStr ? timeStr : '无'}
                    </div>
                </div>
                <div style="font-size: 16px; color: #409eff; flex-shrink: 0;">
                    <i class="fas fa-download"></i>
                </div>
            </div>
        </div>
    `;
                const fileCard = bubble.querySelector('.message-file');
                if (fileCard && fileId) {
                    fileCard.addEventListener('click', async function (e) {
                        e.stopPropagation();
                        const fid = this.dataset.fileId;
                        const fname = this.dataset.fileName || '文件';
                        try {
                            const card = this.querySelector('.file-card');
                            const originalHtml = card.innerHTML;
                            card.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;padding:4px 0;">
                        <i class="fas fa-spinner fa-pulse" style="font-size:20px;color:#409eff;"></i>
                        <span style="font-size:13px;color:#666;">获取下载链接...</span>
                    </div>
                `;
                            if (typeof window.mokfu_getDownloadUrl === 'function') {
                                const downloadUrl = await window.mokfu_getDownloadUrl(fid);
                                if (downloadUrl) {
                                    const link = document.createElement('a');
                                    link.href = downloadUrl;
                                    link.download = fname;
                                    link.target = '_blank';
                                    link.click();
                                } else {
                                    alertMsg('获取下载链接失败，请重试');
                                }
                            } else {
                                alertMsg('下载模块未加载，请刷新页面');
                            }
                            card.innerHTML = originalHtml;
                        } catch (error) {
                            console.error('下载文件失败:', error);
                            alertMsg('下载失败: ' + error.message);
                            const card = this.querySelector('.file-card');
                            if (card) {
                                card.innerHTML = `
                        <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;">
                            <div style="font-size:28px;flex-shrink:0;color:#f56c6c;">
                                <i class="fas fa-file"></i>
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:500;font-size:14px;color:#1f2a3a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                    ${escapeHtml(fname)}
                                </div>
                                <div style="font-size:12px;color:#f56c6c;">下载失败，点击重试</div>
                            </div>
                            <div style="font-size:16px;color:#f56c6c;flex-shrink:0;">
                                <i class="fas fa-exclamation-circle"></i>
                            </div>
                        </div>
                    `;
                            }
                        }
                    });
                    const card = fileCard.querySelector('.file-card');
                    if (card) {
                        card.addEventListener('mouseenter', function () {
                            this.style.transform = 'scale(1.02)';
                            this.style.boxShadow = '0 4px 16px rgba(64, 158, 255, 0.2)';
                        });
                        card.addEventListener('mouseleave', function () {
                            this.style.transform = 'scale(1)';
                            this.style.boxShadow = 'none';
                        });
                    }
                }
                break;
            case 'redpacket':
                if (window.mokim_renderRedPacketMessage) {
                    window.mokim_renderRedPacketMessage(msg, bubble);
                } else {
                    bubble.innerHTML = `<div class="message-text">🧧 红包消息</div>`;
                }
                break;
            case 'game':
                const gameData = msg.content.gameData || msg.content.others || {};
                const gameName = gameData.gameName || gameData.gameType || '游戏';
                const roomId = gameData.roomId || '';
                const betText = gameData.betEnabled ?
                    `💰 ${gameData.betAmount || 0} G币 × ${gameData.betOdds || 2}x` :
                    '🎯 娱乐模式';
                const gameIcons = {
                    'poker': '♠️',
                    'chess': '♟️',
                    'mahjong': '🀄',
                    'dice': '🎲',
                    'default': '🎮'
                };
                const gameIcon = gameIcons.default;
                let betDisplay = '';
                if (gameData.betEnabled) {
                    betDisplay = `
            <div style="font-size:12px;color:#e6a23c;margin-top:2px;">
                <i class="fas fa-coins"></i> 押注 ${gameData.betAmount} G币 × ${gameData.betOdds}x 
                <span style="color:#52c41a;">(赢家 +${gameData.betAmount * gameData.betOdds} G币)</span>
            </div>
        `;
                } else {
                    betDisplay = `
            <div style="font-size:12px;color:#999;margin-top:2px;">
                <i class="fas fa-gamepad"></i> 娱乐模式
            </div>
        `;
                }

                bubble.innerHTML = `
        <div class="message-game-invite" style="max-width:320px;">
            <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;
                        background:${msg.isSelf ? 'linear-gradient(135deg, #e8f4fd, #d6eaf8)' : 'linear-gradient(135deg, #f5f7fa, #e8ecf1)'};
                        border-radius:12px;border:1px solid ${msg.isSelf ? '#b3d9f7' : '#ddd'};
                        transition:all 0.2s;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                <div style="font-size:36px;flex-shrink:0;line-height:1;">${gameIcon}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:15px;color:#1f2a3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        🎮 ${escapeHtml(gameData.roomName)}
                    </div>
                    <div style="font-size:12px;color:#666;margin-top:2px;">
                        <i class="fas fa-door-open"></i> 房间: <strong style="color:#409eff;">${escapeHtml(roomId)}</strong>
                    </div>
                    ${betDisplay}
                    <div style="font-size:11px;color:#aaa;margin-top:6px;padding-top:6px;border-top:1px dashed #e8e8e8;">
                        <i class="fas fa-hand-pointer"></i> 点击加入游戏
                    </div>
                </div>
                <div onclick="window.open('/use/activity/waiting/?room=${escapeHtml(roomId)}', '_blank')"  style="cursor:pointer;font-size:20px;color:#409eff;flex-shrink:0;align-self:center;">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
            ${msg.content.text ? `
                <div style="font-size:12px;color:#888;margin-top:6px;padding:0 4px;word-break:break-all;">
                    ${escapeHtml(msg.content.text).replace(/\n/g, '<br>')}
                </div>
            ` : ''}
        </div>
    `;
                break;
            case 'video':
                const vData = msg.content.others || {};
                const vTitle = escapeHtml(vData.title || '视频分享');
                const vAuthor = escapeHtml(vData.author || '未知作者');
                const vSourceUrl = vData.source_url || vData.url || '';
                const vPlatform = vData.platform || 'unknown';
                bubble.innerHTML = `
        <div class="message-video" 
             data-source-url="${escapeHtml(vSourceUrl)}" 
             data-platform="${escapeHtml(vPlatform)}"
             style="cursor: pointer;">
            <div class="video-card-simple" style="
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 14px;
                background: ${msg.isSelf ? '#e8f4fd' : '#f5f7fa'};
                border-radius: 10px;
                border: 1px solid ${msg.isSelf ? '#b3d9f7' : '#e0e0e0'};
                min-width: 160px;
                max-width: 260px;
                transition: all 0.2s;
            ">
                <span style="font-size: 28px; flex-shrink: 0;">🎬</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; font-size: 14px; color: #1f2a3a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${vTitle}</div>
                    <div style="font-size: 12px; color: #999;">${vAuthor}</div>
                </div>
                <span style="font-size: 14px; color: #409eff; flex-shrink: 0;"><i class="fas fa-play-circle"></i></span>
            </div>
        </div>
    `;
                const vCard = bubble.querySelector('.message-video');
                if (vCard) {
                    vCard.addEventListener('click', async function () {
                        const sourceUrl = this.dataset.sourceUrl;
                        const platform = this.dataset.platform || 'douyin';
                        if (!sourceUrl) {
                            alertMsg('视频链接无效');
                            return;
                        }
                        const card = this.querySelector('.video-card-simple');
                        const originalHtml = card.innerHTML;
                        card.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;padding:4px 0;">
                    <i class="fas fa-spinner fa-pulse" style="font-size:20px;color:#409eff;"></i>
                    <span style="font-size:13px;color:#666;">获取视频链接...</span>
                </div>
            `;
                        try {
                            const result = await window.MokimVideoShare.parseVideoUrl(sourceUrl, platform);
                            if (result.code !== 200 || !result.data) {
                                alertMsg('获取视频链接失败，请稍后重试');
                                card.innerHTML = originalHtml;
                                return;
                            }
                            const videoUrl = result.data.video_url;
                            if (!videoUrl) {
                                alertMsg('无法获取视频播放地址');
                                card.innerHTML = originalHtml;
                                return;
                            }
                            if (YHTVideoPlayerEngine) {
                                const player = new YHTVideoPlayerEngine([videoUrl], {
                                    autoplay: true,
                                    useIframe: true
                                });
                                player.show();
                            } else {
                                alertMsg('视频播放器未加载');
                            }
                            card.innerHTML = originalHtml;
                        } catch (error) {
                            console.error('获取视频链接失败:', error);
                            alertMsg('获取视频链接失败: ' + error.message);
                            card.innerHTML = originalHtml;
                        }
                    });
                }
                break;
            case 'music':
                const songId = (msg.content.others)?.songId || '';
                const songName = (msg.content.others)?.name || '未知歌曲';
                const songArtist = (msg.content.others)?.artist || '未知歌手';
                const isOwnMusic = msg.isSelf;
                bubble.innerHTML = `
        <div class="message-music" data-songname="${songName}" data-song-id="${escapeHtml(songId)}">
            <div class="music-card" style="
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 12px 16px;
                background: ${isOwnMusic ? '#e8f4fd' : '#f5f7fa'};
                border-radius: 12px;
                border: 1px solid ${isOwnMusic ? '#b3d9f7' : '#ddd'};
                min-width: 180px;
                transition: all 0.25s;
            ">
                <div style="font-size: 28px; flex-shrink: 0;">🎵</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:600;font-size:14px;color:#1f2a3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(songName)}</div>
                    <div style="font-size:12px;color:#888;">${escapeHtml(songArtist)}</div>
                </div>
                <button class="music-play-btn" data-song-id="${escapeHtml(songId)}" style="
                    width:32px;height:32px;border-radius:50%;border:none;
                    background:#409eff;color:#fff;cursor:pointer;flex-shrink:0;
                    display:flex;align-items:center;justify-content:center;
                ">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        </div>
    `;
                const playBtn = bubble.querySelector('.music-play-btn');
                const musicCard = bubble.querySelector('.message-music');
                if (playBtn && songId) {
                    playBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        const sid = this.dataset.songId;
                        const card = this.closest('.music-card');
                        const icon = this.querySelector('i');

                        if (this.classList.contains('playing')) {
                            if (window._musicPreviewAudio) {
                                window._musicPreviewAudio.pause();
                                window._musicPreviewAudio = null;
                            }
                            this.classList.remove('playing');
                            icon.className = 'fas fa-play';
                            card.style.borderColor = '#ddd';
                            return;
                        }

                        if (window.MokimMusicShare) {
                            window.MokimMusicShare.playInline(sid, (audio) => {
                                this.classList.add('playing');
                                icon.className = 'fas fa-pause';
                                card.style.borderColor = '#409eff';
                                window._musicPreviewAudio = audio;
                                audio.onended = () => {
                                    this.classList.remove('playing');
                                    icon.className = 'fas fa-play';
                                    card.style.borderColor = '#ddd';
                                    window._musicPreviewAudio = null;
                                };
                                audio.onerror = () => {
                                    this.classList.remove('playing');
                                    icon.className = 'fas fa-play';
                                    card.style.borderColor = '#ddd';
                                    window._musicPreviewAudio = null;
                                };
                            }, (err) => {
                                alertMsg('播放失败: ' + err);
                            });
                        }
                    });
                    if (musicCard) {
                        musicCard.addEventListener('dblclick', function (e) {
                            e.stopPropagation();
                            const songId = this.dataset.songId;
                            const name = this.dataset.songname;
                            const artist = this.dataset.songArtist;
                            if (songId && window.MokimMusicShare) {
                                window.MokimMusicShare.playMusicPreview(songId, name, artist);
                            } else {
                                alertMsg(`🎵 ${name} - ${artist}\n请使用音乐分享模块试听`);
                            }
                        });
                        const card = musicCard.querySelector('.music-card');
                        if (card) {
                            card.addEventListener('mouseenter', function () {
                                this.style.transform = 'scale(1.02)';
                                this.style.boxShadow = '0 4px 16px rgba(64, 158, 255, 0.2)';
                            });
                            card.addEventListener('mouseleave', function () {
                                this.style.transform = 'scale(1)';
                                this.style.boxShadow = 'none';
                            });
                        }
                    }
                }
                break;
            case 'gift':
                const giftId = msg.content.giftId;
                const giftName = msg.content.giftName || '礼物';
                const giftIcon = msg.content.giftIcon || '🎁';
                const intimacyValue = msg.content.intimacyValue || 0;
                const animType = msg.content.animationType || 'hearts';
                const isSelfGift = msg.isSelf;
                bubble.innerHTML = `
        <div class="message-gift" data-gift-id="${giftId}" data-animation="${animType}">
            <div class="gift-card-message" style="
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 16px;
                background: linear-gradient(135deg, #fff5e6 0%, #fff0d6 100%);
                border-radius: 12px;
                border: 1px solid #ffd700;
                min-width: 160px;
                cursor: pointer;
                transition: transform 0.2s;
            ">
                <div style="font-size: 32px; line-height: 1;">${giftIcon}</div>
                <div>
                    <div style="font-weight: 600; font-size: 14px; color: #333;">
                        ${isSelfGift ? '赠送了' : '收到了'} ${giftName}
                    </div>
                    <div style="font-size: 12px; color: #999;">
                        ❤️ +${intimacyValue} 亲密度
                    </div>
                </div>
                <div style="margin-left: auto; font-size: 18px; color: #ffd700;">
                    🎁
                </div>
            </div>
        </div>
    `;
                const giftCard = bubble.querySelector('.message-gift');
                if (giftCard) {
                    giftCard.addEventListener('click', function (e) {
                        e.stopPropagation();
                        const animType = this.dataset.animation;
                        if (animType && window.mokim_AnimationEngine) {
                            window.mokim_AnimationEngine.play(animType);
                        } else if (animType && window.GiftSystem) {
                            window.GiftSystem.playAnimation(animType);
                        }
                    });
                    const cardInner = giftCard.querySelector('.gift-card-message');
                    if (cardInner) {
                        cardInner.addEventListener('mouseenter', function () {
                            this.style.transform = 'scale(1.02)';
                            this.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.3)';
                        });
                        cardInner.addEventListener('mouseleave', function () {
                            this.style.transform = 'scale(1)';
                            this.style.boxShadow = 'none';
                        });
                    }
                }
                break;
            case 'image':
                bubble.innerHTML = `
                    <div class="message-resource" data-url="${msg.content['text']['url']}">
                        <img src="${msg.content['text']['url']}" class="message-image ${msg.content['text']['isBroken'] ? 'broken' : ''}" 
                             alt="${msg.content['text']['fileName'] || '图片'}">
                    </div>
                `;
                break;
            case 'invite_group':
                bubble.innerHTML = `
        <div class="message-invite">
            <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px;">
                <i class="fas fa-users" style="color: #409eff; font-size: 18px;"></i>
                <div>
                    <div style="font-weight: 500;">群聊邀请</div>
                    <div style="font-size: 12px; color: #666;">${escapeHtml(msg.content.text || '邀请你加入群聊')}</div>
                    <div style="font-size: 11px; color: #999; margin-top: 4px;">群聊：${escapeHtml(msg.content.groupName)}</div>
                    ${!msg.isSelf ? `
                        <div style="margin-top: 8px;">
                            <button class="accept-invite-btn" data-group-id="${escapeHtml(msg.content.groupId)}" data-group-name="${escapeHtml(msg.content.groupName)}" style="padding: 4px 12px; background: #409eff; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                                接受邀请
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
                const acceptBtn = bubble.querySelector('.accept-invite-btn');
                if (acceptBtn) {
                    acceptBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const groupId = acceptBtn.dataset.groupId;
                        const groupName = acceptBtn.dataset.groupName || msg.content.groupName || '群聊';
                        await gimmok_acceptGroupInvite(groupId, groupName);
                    });
                }
                break;
            case 'file':
                const t1 = msg.content['text'];
                bubble.innerHTML = `
                    <div class="message-resource" data-url="${t1.url}">
                        <div class="message-file ${t1.isBroken ? 'broken' : ''}">
                            <div class="message-file-icon"><i class="fas fa-file"></i></div>
                            <div class="message-file-info">
                                <div class="message-file-name">${t1.fileName}</div>
                                <div class="message-file-size">${formatFileSize(t1.fileSize)}</div>
                                ${t1.isBroken ? '<div class="message-file-broken-tip">文件已损坏</div>' : ''}
                            </div>
                            <div class="message-file-download" data-url="${t1.url}"><i class="fas fa-download"></i></div>
                        </div>
                    </div>
                `;
                break;
            case 'call':
                bubble.innerHTML = `
                    <div class="message-call">
                        <i class="fas fa-${msg.content.callType === 'video' ? 'video' : 'phone'}"></i>
                        <div>
                            <span class="message-call-type">${msg.content.callType === 'video' ? '视频通话' : '语音通话'}</span>
                            <span class="message-call-status">${getStatusText(msg.content.callStatus)}</span>
                        </div>
                        <span class="message-call-duration">${formatDuration(msg.content.callDuration)}</span>
                    </div>
                `;
                break;
            default:
                bubble.innerHTML = `<div class="message-text">【不支持的消息类型：${msg.messageType}】</div>`;
        }

        if (msg.isSelf) {
            const statusContainer = document.createElement('div');
            statusContainer.className = 'message-status-container';
            statusContainer.style.cssText = `
                display: inline-flex;
                align-items: center;
                margin-left: 8px;
                font-size: 12px;
            `;
            if (msg.read) {
                statusContainer.innerHTML = '<i class="fas fa-check-double" style="color: #409eff;" title="已读"></i>';
            } else if (msg.status === 'sent') {
                statusContainer.innerHTML = '<i class="fas fa-check-double" style="color: #999;" title="已送达"></i>';
            } else if (msg.status === 'sending') {
                statusContainer.innerHTML = '<i class="fas fa-check" style="color: #999;" title="发送中"></i>';
            } else {
                statusContainer.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #f56c6c;" title="发送失败"></i>';
            }
            bubble.appendChild(statusContainer);
        }

        if (msg.content.quoteMsgId) {
            const quoteCard = document.createElement('div');
            quoteCard.className = 'quote-card';
            quoteCard.style.cssText = `
                padding: 8px 12px;
                border-left: 3px solid #409eff;
                background-color: #f5f7fa;
                margin-bottom: 8px;
                cursor: pointer;
                font-size: 12px;
                color: #666;
            `;
            quoteCard.textContent = `引用消息(点我跳转)`;
            quoteCard.addEventListener('click', () => {
                const targetMsg = document.querySelector(`.message-item[data-message-id="${msg.content.quoteMsgId}"]`);
                if (targetMsg) {
                    targetMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetMsg.style.cssText = QUOTE_HIGHLIGHT_STYLE;
                    setTimeout(() => {
                        targetMsg.style.cssText = DEFAULT_STYLE;
                    }, 2000);
                } else {
                    alertMsg('被引用的消息不存在');
                }
            });
            bubble.appendChild(quoteCard);
        }

        messageItem.appendChild(avatar);
        messageItem.appendChild(bubble);
        chatMessages.appendChild(messageItem);
        if (isBatchMode && !msg.messageType === 'system') {
            setTimeout(() => {
                const newMessageItem = document.querySelector(`.message-item[data-message-id="${msg.messageId}"]`);
                if (newMessageItem && !newMessageItem.querySelector('.message-checkbox')) {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'message-checkbox';
                    checkbox.dataset.messageId = msg.messageId;
                    if (selectedMessages.has(msg.messageId)) {
                        checkbox.checked = true;
                        newMessageItem.classList.add('batch-selected');
                    }

                    checkbox.addEventListener('change', (e) => {
                        const msgId = e.target.dataset.messageId;
                        if (e.target.checked) {
                            selectedMessages.add(msgId);
                            newMessageItem.classList.add('batch-selected');
                        } else {
                            selectedMessages.delete(msgId);
                            newMessageItem.classList.remove('batch-selected');
                        }
                        updateBatchToolbar();
                    });

                    newMessageItem.style.position = 'relative';
                    newMessageItem.insertBefore(checkbox, newMessageItem.firstChild);
                }
            }, 0);
        }
    });
    if (isAtBottom) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    if (appState.selectedContact && !messages.some(msg => msg.isSelf)) {
        markConversationAsRead(appState.selectedContact.conversationId);
    }
}
async function sendGroupMessage(messageContent) {
    if (!appState.isConnected) {
        alertMsg('服务器连接失败,消息发送异常');
        return;
    }
    if (!appState.selectedContact) {
        alertMsg('请选择群聊后再发送消息');
        return;
    }
    const { conversationId, contactId, isGroup } = appState.selectedContact;
    if (!isGroup) {
        alertMsg('当前不是群聊，无法发送群消息');
        return;
    }
    const isTextMessage = messageContent.messageType === 'text' || !messageContent.messageType;
    const lockData = (isTextMessage && messageContent.lock) ? messageContent.lock : null;
    const message = {
        messageId: generateUniqueId(),
        conversationId: String(conversationId),
        senderId: appState.userId,
        senderName: getCurrentUserName(),
        receiverId: String(contactId),
        messageType: messageContent.messageType || 'text',
        content: {
            text: messageContent.text || messageContent.content,
            quoteMsgId: currentQuoteMsgId,
            others: messageContent.otherpastxfuks ?? null
        },
        sendTime: Date.now(),
        isSelf: true,
        status: 'sending',
        read: false,
        isGroup: true
    };
    if (lockData) {
        message.lock = lockData;
    }
    if (currentQuoteMsgId) {
        const quotedMsg = await getMessageById(currentQuoteMsgId);
        if (quotedMsg) {
            message.content.quotedMessage = {
                messageId: quotedMsg.messageId,
                senderId: quotedMsg.senderId,
                senderName: quotedMsg.senderName || (quotedMsg.isSelf ? '我' : '对方'),
                content: quotedMsg.content.text || '[非文本消息]'
            };
        }
    }

    try {
        sendWsMessage({
            type: 'new_group_message',
            data: message
        });
        await saveMessageToDB(message);
        message.status = 'sent';
        const existingMsg = document.querySelector(`.message-item[data-message-id="${message.messageId}"], .message-system[data-message-id="${message.messageId}"]`);
        if (!existingMsg) {
            refreshChatWindow(message);
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
    } catch (error) {
        message.status = 'failed';
        alertMsg(`群消息发送失败：${error.message}`);
        refreshChatWindow(message);
    }
}
function getCurrentUserName() {
    const profileName = window.qmok_userid_id ?? 'u1000';
    return xplugin_idToCode(profileName);
}
async function getMessageById(messageId) {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction('messages', 'readonly');
        const store = transaction.objectStore('messages');
        return new Promise((resolve) => {
            const request = store.get(messageId);
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = () => resolve(null);
        });
    } catch (error) {
        console.error('获取消息失败:', error);
        return null;
    }
}

// ===================== 处理接收群消息 =====================
function handleNewGroupMessage(message) {
    if (window.isHandlingNewMessage) return;
    window.isHandlingNewMessage = true;

    try {
        const receiveMessage = {
            ...message,
            isSelf: message.senderId === appState.userId,
            status: 'received',
            read: false,
            isGroup: true
        };

        saveMessageToDB(receiveMessage).then(async () => {
            const settings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
            if (!receiveMessage.isSelf && settings.notifySound !== false) {
                playNewMessageSound();
            }
            if (!receiveMessage.isSelf && document.hidden) {
                let groupName = appState.selectedContact?.group_name ||
                    appState.groups?.find(g =>
                        g.conversationId === receiveMessage.conversationId ||
                        `group_${g.group_id}` === receiveMessage.conversationId
                    )?.group_name || '群聊';

                const senderName = receiveMessage.senderName ||
                    xplugin_idToCode(receiveMessage.senderId) ||
                    '群成员';

                const notificationEvent = new CustomEvent('new-message-received', {
                    detail: {
                        message: receiveMessage,
                        senderName: `${senderName} (${groupName})`,
                        isGroup: true
                    }
                });
                window.dispatchEvent(notificationEvent);
            }
            if (appState.selectedContact?.conversationId === receiveMessage.conversationId) {
                const existingMsg = document.querySelector(`.message-item[data-message-id="${receiveMessage.messageId}"], .message-system[data-message-id="${receiveMessage.messageId}"]`);
                if (!existingMsg) {
                    refreshChatWindow(receiveMessage);
                }
            } else if (!receiveMessage.isSelf) {
                updateGroupUnreadCount(receiveMessage.conversationId);
            }

            await renderContacts();
            await renderGroups();
            window.isHandlingNewMessage = false;
        });
    } catch (error) {
        console.error('接收群消息处理失败:', error);
        window.isHandlingNewMessage = false;
    }
}
function updateGroupUnreadCount(conversationId) {
    appState.groups = appState.groups.map(group => {
        const groupConvId = group.conversationId || `group_${group.group_id}`;
        if (groupConvId === conversationId || group.group_id === conversationId) {
            return {
                ...group,
                unreadCount: (group.unreadCount || 0) + 1
            };
        }
        return group;
    });
}
// ===================== 事件绑定 =====================
function bindSendMessageEvent() {
    const sendBtn = document.querySelector('.send-btn');
    const chatInput = document.querySelector('.chat-input');
    if (!sendBtn || !chatInput) return;
    sendBtn.addEventListener('click', async () => {
        const text = chatInput.value.trim();
        if (!text) {
            alertMsg('消息不能为空');
            return;
        }
        if (text.length > MOKIM_MAX_MESSAGE_LENGTH) {
            alertMsg(`消息过长，请控制在 ${MAX_MESSAGE_LENGTH} 个字符以内`);
            return;
        }
        if (typingStarted) {
            clearTimeout(typingEndTimeout);
            typingStarted = false;
            sendTypingStatus('end');
            lastTypingNotifyTime = 0;
        }
        const lockStatus = await mokim_getConversationLockStatus(appState.selectedContact?.conversationId);
        let lockData = null;
        if (lockStatus && lockStatus.enabled && mokim_isLockEnabled()) {
            lockData = {
                enabled: true,
                mode: lockStatus.mode
            };
            if (lockStatus.mode === 'password') {
                lockData.question = lockStatus.question;
                lockData.answer_hash = lockStatus.answer_hash;
            }
            if (lockStatus.mode === 'time') {
                lockData.expireTime = lockStatus.expireTime;
            }
            if (lockStatus.mode === 'burn') {
                lockData.burnDelay = lockStatus.burnDelay;
                lockData.notify = lockStatus.notify || false;
            }
        }
        if (appState.selectedContact?.isGroup) {
            const timegroup_check_mokim = mokim_compareWithCurrentTime(appState.selectedContact?.nalsay);
            if (timegroup_check_mokim.success && timegroup_check_mokim.code !== 'less') {
                alertMsg('您已被禁言！解封日期：' + appState.selectedContact?.nalsay);
                chatInput.value = '';
                return;
            }
            sendGroupMessage({
                text,
                messageType: 'text',
                content: { text },
                lock: lockData
            });
        } else {
            if (appState.selectedContact?.account_status !== 0) {
                alertMsg(appState.selectedContact?.account_status === 1 ? '对方账号已被封禁，无法发送消息！' : '对方账号已注销，无法发送消息！');
                chatInput.value = '';
                return;
            }
            sendMessage({
                text,
                messageType: 'text',
                content: { text },
                lock: lockData
            });
        }
        chatInput.value = '';
        document.getElementById('mokim_zujian_send_btn').disabled = true;
        document.getElementById('mokim_input_charCount').textContent = `0 / ${MOKIM_MAX_MESSAGE_LENGTH}`;
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });
    chatInput.addEventListener('input', handleTypingStatus);
}

// ===================== 工具函数 =====================
function generateUniqueId() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}
function formatTime(time) {
    if (!time) return '未知时间';
    const date = new Date(time);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (targetDay.getTime() === today.getTime()) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    if (targetDay.getTime() === yesterday.getTime()) {
        return '昨天';
    }
    return date.toLocaleDateString('zh-CN');
}
function getStatusText(status) {
    const statusMap = {
        initiating: '发起通话',
        ringing: '正在响铃',
        finished: '通话结束',
        canceled: '已取消'
    };
    return statusMap[status] || '未知状态';
}
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
}
function playNewMessageSound() {
    const audio = new Audio('ast/sounds/notify.mp3');
    audio.volume = 0.7;
    audio.onerror = () => console.warn('新消息提示音加载失败');
    audio.play().catch(err => console.warn('播放提示音失败:', err));
}
function initAttachModal() {
    const attachBtn = document.querySelector('.attach-btn');
    const attachModal = document.getElementById('attachModal');
    const cancelAttachBtn = document.getElementById('cancelAttachBtn');
    const confirmAttachBtn = document.getElementById('confirmAttachBtn');
    const closeBtn = document.querySelector('.attach-modal-close');
    const fileUrlInput = document.getElementById('fileUrlInput');
    const fileTypeSelect = document.getElementById('fileTypeSelect');
    if (!attachBtn || !attachModal) return;
    attachBtn.addEventListener('click', () => {
        attachModal.style.display = 'flex';
        fileUrlInput.value = '';
        fileTypeSelect.selectedIndex = 0;
        confirmAttachBtn.disabled = false;
    });
    const hideModal = () => {
        attachModal.style.display = 'none';
    };
    cancelAttachBtn.addEventListener('click', hideModal);
    closeBtn.addEventListener('click', hideModal);
    attachModal.addEventListener('click', (e) => {
        if (e.target === attachModal) {
            hideModal();
        }
    });
    confirmAttachBtn.addEventListener('click', async () => {
        try {
            const fileUrl = fileUrlInput.value.trim();
            const fileType = fileTypeSelect.value;
            if (!validateFileUrl(fileUrl, fileType)) return;
            confirmAttachBtn.disabled = true;
            Loading.show('正在获取文件信息...');
            const { fileName, fileSize, isBroken } = await getFileInfo(fileUrl, fileType);
            const messageContent = {
                messageType: fileType,
                content: {
                    url: sanitizeUrl(fileUrl),
                    fileName,
                    fileSize,
                    isBroken
                }
            };

            await sendMessage(messageContent);
            hideModal();
            Loading.hide();
            alertMsg('文件消息发送成功！');
        } catch (error) {
            Loading.hide();
            alertMsg(`发送失败：${error.message}`);
            confirmAttachBtn.disabled = false;
        }
    });
}
function validateFileUrl(url, fileType) {
    if (!url) {
        alertMsg('请输入文件外链地址！');
        return false;
    }
    const urlRegex = /^(https?:\/\/)[^\s<>"]+$/i;
    if (!urlRegex.test(url)) {
        alertMsg('文件外链格式错误！仅支持http/https开头的合法URL');
        return false;
    }
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const fileExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'zip', 'rar', 'txt', 'mp4', 'mp3'];
    const ext = url.split('.').pop().toLowerCase();
    if (fileType === 'image' && !imageExts.includes(ext)) {
        alertMsg(`图片类型仅支持：${imageExts.join('/')} 扩展名`);
        return false;
    }

    if (fileType === 'file' && !fileExts.includes(ext)) {
        alertMsg(`文件类型仅支持：${fileExts.join('/')} 扩展名`);
        return false;
    }
    const dangerousChars = /<|>|"|'|\\|;|--|\/\*/i;
    if (dangerousChars.test(url)) {
        alertMsg('文件外链包含非法字符，禁止发送！');
        return false;
    }

    return true;
}
function sanitizeUrl(url) {
    const temp = document.createElement('div');
    temp.textContent = url;
    const escapedUrl = temp.innerHTML;
    if (escapedUrl.length > 2048) {
        throw new Error('文件外链地址过长（最大2048字符）');
    }

    return escapedUrl;
}
async function getFileInfo(url, fileType) {
    try {
        const response = await fetch('/api/getfileinfo/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                fileType: fileType
            })
        });
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to get file info');
        }

        return result.data;

    } catch (error) {
        const ext = url.split('.').pop().toLowerCase().split('?')[0];
        return {
            fileName: `未知文件.${ext}`,
            fileSize: 0,
            isBroken: true,
            error: error.message
        };
    }
}
//废弃基本没啥用
async function renderGroups() {
    if (!appState.groups || !Array.isArray(appState.groups)) {
        return;
    }
    await renderContacts();
}
async function add_button_export_messgaeauthlaw() {
    document.getElementById('export-contact-data-auth').addEventListener('click', async () => {
        if (!appState.selectedContact) {
            alertMsg('请先选择一个会话');
            return;
        }
        const contactName = appState.selectedContact.friendAlias || appState.selectedContact.uname || '联系人';
        mok_showDialog({
            title: '操作选择',
            content: '请选择操作<导出证据包><功能说明>',
            buttons: [
                { text: '功能说明', callback: () => window.open('/notice/Doc/g-evdence/'), type: 'default' },
                { text: '导出证据包', callback: () => hashy_exportChatEvidence(appState.selectedContact.conversationId, contactName), type: 'danger' }
            ]
        });
    });
}
/** Notifications SYSTEM */
const NotificationManager = (function () {
    let permissionGranted = false;
    let isPageVisible = true;
    let notificationQueue = [];
    let isShowingNotification = false;
    let lastNotificationTime = 0;
    const MIN_NOTIFICATION_INTERVAL = 1000;
    const MAX_QUEUE_SIZE = 50;
    let pendingNotifications = new Map();
    let batchTimer = null;
    const BATCH_WINDOW = 2000;
    async function requestPermission() {
        if (!('Notification' in window)) {
            console.warn('浏览器不支持 Web Notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            permissionGranted = true;
            return true;
        }

        if (Notification.permission !== 'denied') {
            try {
                const permission = await Notification.requestPermission();
                permissionGranted = permission === 'granted';
                if (permissionGranted) {
                    console.log('通知权限已授予');
                }
                return permissionGranted;
            } catch (error) {
                console.warn('请求通知权限失败:', error);
                return false;
            }
        }

        return false;
    }
    function initVisibilityListener() {
        isPageVisible = !document.hidden;
        const handleVisibilityChange = () => {
            const wasVisible = isPageVisible;
            isPageVisible = !document.hidden;
            if (isPageVisible && !wasVisible) {
                clearNotificationQueue();
                clearPendingNotifications();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        window.addEventListener('focus', () => {
            isPageVisible = true;
            clearNotificationQueue();
            clearPendingNotifications();
        });

        window.addEventListener('blur', () => {
            isPageVisible = false;
        });
    }
    function clearNotificationQueue() {
        notificationQueue = [];
        isShowingNotification = false;
    }

    function clearPendingNotifications() {
        if (batchTimer) {
            clearTimeout(batchTimer);
            batchTimer = null;
        }
        pendingNotifications.clear();
    }
    function processBatchNotifications() {
        if (pendingNotifications.size === 0) return;
        const now = Date.now();
        if (now - lastNotificationTime < MIN_NOTIFICATION_INTERVAL) {
            if (batchTimer) clearTimeout(batchTimer);
            batchTimer = setTimeout(processBatchNotifications, MIN_NOTIFICATION_INTERVAL);
            return;
        }

        for (const [convId, data] of pendingNotifications) {
            if (isPageVisible) continue;

            let title = data.isGroup ? `📢 ${data.groupName || data.senderName || '群聊'}` : `💬 ${data.senderName || '联系人'}`;
            let body = '';

            if (data.count === 1) {
                body = data.lastContent;
            } else {
                body = `${data.count} 条新消息`;
                if (data.lastSender) {
                    body += ` (来自: ${data.lastSender})`;
                }
            }

            showNotification(title, {
                body: body,
                icon: '/ast/fickp/default.png',
                tag: `conv_${convId}`,
                data: {
                    conversationId: convId,
                    messageId: data.lastMessageId,
                    isGroup: data.isGroup,
                    count: data.count
                },
                requireInteraction: false,
                silent: false,
                renotify: false
            });
        }

        pendingNotifications.clear();
        if (batchTimer) {
            clearTimeout(batchTimer);
            batchTimer = null;
        }
    }

    function addToBatch(message, senderName, isGroup = false) {
        const convId = message.conversationId;
        const now = Date.now();

        let contentPreview = getMessagePreview(message);

        if (!pendingNotifications.has(convId)) {
            pendingNotifications.set(convId, {
                count: 0,
                lastContent: contentPreview,
                lastSender: senderName,
                lastMessageId: message.messageId,
                isGroup: isGroup,
                groupName: isGroup ? senderName : null,
                senderName: !isGroup ? senderName : null,
                firstTime: now
            });
        }

        const data = pendingNotifications.get(convId);
        data.count++;
        data.lastContent = contentPreview;
        data.lastSender = senderName;
        data.lastMessageId = message.messageId;
        if (batchTimer) clearTimeout(batchTimer);
        batchTimer = setTimeout(processBatchNotifications, BATCH_WINDOW);
    }
    function getMessagePreview(message) {
        let preview = '';
        switch (message.messageType) {
            case 'text':
                preview = mokim_shouldShowPlainText(msg) ? (message.content?.text || '') : '[LOCKED]';
                break;
            case 'image':
                preview = '[图片]';
                break;
            case 'file':
                preview = `[文件] ${message.content?.fileName || '未知文件'}`;
                break;
            case 'quote':
                preview = `[引用] ${message.content?.text || ''}`;
                break;
            case 'call':
                preview = `[${message.content?.callType === 'video' ? '视频' : '语音'}通话]`;
                break;
            case 'invite_group':
                preview = '[群聊邀请]';
                break;
            case 'system':
                preview = `[系统] ${message.content?.systemText || ''}`;
                break;
            case 'gift':
                preview = '[礼物]';
                break;
            case 'music':
                preview = `[音乐分享]`;
                break;
            case 'video':
                preview = `[视频分享]`;
                break;
            case 'game':
                preview = `[游戏分享]`;
                break;
            case 'redpacket':
                preview = `[红包]`;
                break;
            case 'files':
                preview = `[文件分享]`;
                break;
            default:
                preview = `[${message.messageType}]`;
        }

        if (preview.length > 50) {
            preview = preview.substring(0, 50) + '...';
        }

        return preview;
    }
    function showNotification(title, options) {
        if (!permissionGranted) return;
        if (isPageVisible) return;
        const now = Date.now();
        if (now - lastNotificationTime < MIN_NOTIFICATION_INTERVAL) {
            notificationQueue.push({ title, options });
            scheduleQueueProcessing();
            return;
        }
        if (notificationQueue.length > MAX_QUEUE_SIZE) {
            notificationQueue = notificationQueue.slice(-MAX_QUEUE_SIZE);
        }

        lastNotificationTime = now;
        isShowingNotification = true;

        try {
            const notification = new Notification(title, {
                icon: options.icon || '/ast/fickp/default.png',
                badge: '/ast/fickp/default.png',
                silent: options.silent || false,
                vibrate: [200, 100, 200],
                tag: options.tag,
                renotify: options.renotify || false,
                requireInteraction: options.requireInteraction || false,
                body: options.body || '',
                data: options.data || {},
                timestamp: now
            });
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                notification.close();
                if (options.data && options.data.conversationId) {
                    const clickEvent = new CustomEvent('notification-click', {
                        detail: {
                            conversationId: options.data.conversationId,
                            messageId: options.data.messageId,
                            isGroup: options.data.isGroup
                        }
                    });
                    window.dispatchEvent(clickEvent);
                    selectConversationById(options.data.conversationId);
                }
            };
            notification.onclose = () => {
                isShowingNotification = false;
                processQueue();
            };

            notification.onerror = (error) => {
                console.warn('通知显示错误:', error);
                isShowingNotification = false;
                processQueue();
            };
            setTimeout(() => {
                if (notification && !notification.closed) {
                    notification.close();
                }
            }, 8000);

        } catch (error) {
            console.warn('显示通知失败:', error);
            isShowingNotification = false;
            processQueue();
        }
    }
    function selectConversationById(conversationId) {
        const conversationItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
        if (conversationItem) {
            conversationItem.click();
        }
    }
    function scheduleQueueProcessing() {
        if (isShowingNotification) return;
        setTimeout(processQueue, MIN_NOTIFICATION_INTERVAL);
    }
    function processQueue() {
        if (notificationQueue.length === 0) return;
        if (isShowingNotification) return;
        if (isPageVisible) {
            notificationQueue = [];
            return;
        }

        const next = notificationQueue.shift();
        if (next) {
            showNotification(next.title, next.options);
        }
    }
    function notifyNewMessage(message, senderName, isGroup = false) {
        if (!permissionGranted) return;
        const settings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
        if (settings.desktopNotify === false) return;
        if (message.isSelf) return;
        if (appState.selectedContact &&
            appState.selectedContact.conversationId === message.conversationId) {
            return;
        }
        addToBatch(message, senderName, isGroup);
    }
    function notifySystem(title, body, data = {}) {
        if (!permissionGranted) return;
        if (isPageVisible) return;

        const settings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
        if (settings.desktopNotify === false) return;

        const now = Date.now();
        if (now - lastNotificationTime < MIN_NOTIFICATION_INTERVAL) {
            notificationQueue.push({
                title,
                options: {
                    body: body,
                    icon: '/ast/fickp/default.png',
                    tag: `system_${Date.now()}`,
                    data: data,
                    requireInteraction: false,
                    silent: false
                }
            });
            scheduleQueueProcessing();
            return;
        }

        showNotification(title, {
            body: body,
            icon: '/ast/fickp/default.png',
            tag: `system_${Date.now()}`,
            data: data,
            requireInteraction: false,
            silent: false
        });
    }




    function getPermissionStatus() {
        if (!('Notification' in window)) return 'unsupported';
        return Notification.permission;
    }


    function hasPermission() {
        return permissionGranted && Notification.permission === 'granted';
    }


    async function init() {
        initVisibilityListener();
        const granted = await requestPermission();
        window.addEventListener('new-message-received', (event) => {
            const { message, senderName, isGroup } = event.detail;
            notifyNewMessage(message, senderName, isGroup);
        });
        window.addEventListener('system-notification', (event) => {
            const { title, body, data } = event.detail;
            notifySystem(title, body, data);
        });

        return granted;
    }

    return {
        init,
        notifyNewMessage,
        notifySystem,
        hasPermission,
        requestPermission,
        getPermissionStatus
    };
})();
/**  --------------------消息策略密码----------------------- */
var mokim_lock_wrapper = document.getElementById('mokim_lock_modal_wrapper');
var mokim_lock_overlay = document.getElementById('mokim_lock_modal_overlay');
var mokim_lock_close_btn = document.getElementById('mokim_lock_modal_close_btn');
var mokim_lock_trigger_btn = document.getElementById('chat-message-lockedadded');
var mokim_lock_tabs = document.querySelectorAll('.mokim_lock_tab_btn');
var mokim_lock_panes = document.querySelectorAll('.mokim_lock_tab_pane');
var mokim_lock_enablebtn = document.querySelectorAll('.mokim_lock_enable_btn');
const mokim_lock_disableBtn = document.getElementById('mokim_lock_disable_btn');
var mokim_lock_is_open = false;
var mokim_lock_current_tab = 'overview';
function mokim_isLockEnabled() {
    const settings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
    return settings.messageLockEnabled !== false;
}
function mokim_lock_open() {
    if (mokim_lock_is_open) return;
    if (!mokim_isLockEnabled()) {
        alertMsg('消息上锁功能已在设置中禁用，请前往设置开启');
        return;
    }
    mokim_lock_is_open = true;
    mokim_lock_wrapper.style.display = 'block';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
        mokim_lock_wrapper.classList.add('mokim_lock_active');
    });
    mokim_loadLockStatus();
}
function mokim_loadLockStatus() {
    const convId = appState.selectedContact?.conversationId;
    if (!convId) return;
    mokim_getConversationLockStatus(convId).then(status => {
        mokim_updateLockStatusUI(status);
    }).catch(() => {
        mokim_updateLockStatusUI(null);
    });
}
async function mokim_unlockMessage(msgId, answer, container) {
    if (!msgId) {
        alertMsg('消息ID无效');
        return;
    }

    try {
        const db = await initIndexedDB();
        const transaction = db.transaction('messages', 'readonly');
        const store = transaction.objectStore('messages');
        const request = store.get(msgId);

        request.onsuccess = async (e) => {
            const msg = e.target.result;
            if (!msg) {
                alertMsg('消息不存在');
                return;
            }

            if (!msg.lock || !msg.lock.enabled) {
                alertMsg('此消息未上锁');
                return;
            }
            const lockMode = msg.lock.mode;
            if (lockMode === 'password') {
                if (!answer || answer.length === 0) {
                    alertMsg('请输入答案');
                    return;
                }
                const hashedInput = await simpleSha256(answer);
                if (hashedInput === msg.lock.answer_hash) {
                    mokim_revealLockedMessage(msgId, container);
                } else {
                    alertMsg('答案错误，请重试');
                    const input = container?.querySelector('.lock-answer-input');
                    if (input) {
                        input.value = '';
                        input.focus();
                        input.style.borderColor = '#f56c6c';
                        setTimeout(() => { input.style.borderColor = ''; }, 1000);
                    }
                }
                return;
            }
            if (lockMode === 'time') {
                const expireTime = msg.lock.expireTime || 0;
                if (Date.now() > expireTime) {
                    alertMsg('⏰ 消息已过期，无法查看');
                    if (container) {
                        container.innerHTML = `
                            <div style="padding: 12px; text-align: center; color: #f56c6c;">
                                <i class="fas fa-clock" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                                消息已过期，无法查看
                            </div>
                        `;
                    }
                    return;
                }
                mokim_revealLockedMessage(msgId, container);
                return;
            }
            if (lockMode === 'burn') {
                const delay = msg.lock.burnDelay || 5;
                mokim_revealLockedMessage(msgId, container);

                if (container) {
                    const timerDiv = document.createElement('div');
                    timerDiv.style.cssText = `
                        margin-top: 10px;
                        padding: 6px 12px;
                        background: #fef3e2;
                        border-radius: 4px;
                        font-size: 13px;
                        color: #e6a23c;
                        text-align: center;
                    `;
                    timerDiv.innerHTML = `<i class="fas fa-fire"></i> 消息将在 <span id="burn-countdown-${msgId}">${delay}</span> 秒后销毁`;
                    container.appendChild(timerDiv);

                    let remaining = delay;
                    const intervalId = setInterval(() => {
                        remaining--;
                        const countEl = document.getElementById(`burn-countdown-${msgId}`);
                        if (countEl) {
                            countEl.textContent = remaining;
                        }
                        if (remaining <= 0) {
                            clearInterval(intervalId);
                            const msgEl = document.querySelector(`.message-item[data-message-id="${msgId}"]`);
                            if (msgEl) {
                                msgEl.style.transition = 'all 0.5s ease';
                                msgEl.style.opacity = '0';
                                msgEl.style.transform = 'scale(0.8)';
                                setTimeout(() => {
                                    msgEl.remove();
                                    deleteMessageFromDB(msgId).catch(() => { });
                                }, 500);
                            }
                            alertMsg('🔥 消息已自动销毁');
                        }
                    }, 1000);
                }
                return;
            }

            mokim_revealLockedMessage(msgId, container);
        };

        request.onerror = () => {
            alertMsg('获取消息失败，请重试');
        };

    } catch (error) {
        console.error('解锁消息失败:', error);
        alertMsg(`解锁失败：${error.message}`);
    }
}
function mokim_revealLockedMessage(msgId, container) {
    if (!container) return;
    const db = initIndexedDB().then(db => {
        const transaction = db.transaction('messages', 'readonly');
        const store = transaction.objectStore('messages');
        const request = store.get(msgId);
        request.onsuccess = (e) => {
            const msg = e.target.result;
            if (!msg) {
                container.innerHTML = '<div style="color: #f56c6c;">消息已不存在</div>';
                return;
            }
            const text = msg.content?.text || '';
            const renderedText = renderEmoji(text);
            const textWithLineBreaks = renderedText.replace(/\n/g, '<br>');

            container.innerHTML = `
                <div style="padding: 4px 0;">
                    <div style="font-size: 12px; color: #52c41a; margin-bottom: 6px;">
                        <i class="fas fa-check-circle"></i> 已解锁
                        ${msg.lock?.mode === 'burn' ? ' 🔥 阅后即焚' : ''}
                    </div>
                    <div class="message-text">${textWithLineBreaks}</div>
                    ${msg.lock?.mode === 'burn' ? '<div style="margin-top: 8px; font-size: 11px; color: #e6a23c;"><i class="fas fa-exclamation-triangle"></i> 消息将在查看后自动销毁</div>' : ''}
                </div>
            `;
        };

        request.onerror = () => {
            container.innerHTML = '<div style="color: #f56c6c;">加载消息失败</div>';
        };
    });
}
async function mokim_getConversationLockStatus(conversationId) {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction('conversations', 'readonly');
        const store = transaction.objectStore('conversations');
        return new Promise((resolve, reject) => {
            const request = store.get(conversationId);
            request.onsuccess = (e) => {
                const conv = e.target.result;
                if (conv && conv.lockSettings) {
                    resolve(conv.lockSettings);
                } else {
                    resolve(null);
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    } catch (error) {
        console.error('获取锁状态失败:', error);
        return null;
    }
}
async function mokim_saveConversationLockStatus(conversationId, lockSettings) {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction('conversations', 'readwrite');
        const store = transaction.objectStore('conversations');
        const existing = await new Promise((resolve) => {
            const request = store.get(conversationId);
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = () => resolve(null);
        });
        const data = existing || { conversationId: conversationId };
        data.lockSettings = lockSettings;
        data.lastUpdateTime = Date.now();
        await store.put(data);
        return true;
    } catch (error) {
        console.error('保存锁状态失败:', error);
        return false;
    }
}
function mokim_lock_close() {
    if (!mokim_lock_is_open) return;
    mokim_lock_is_open = false;
    mokim_lock_wrapper.classList.remove('mokim_lock_active');
    document.body.style.overflow = '';
    setTimeout(function () {
        mokim_lock_wrapper.style.display = 'none';
    }, 300);
}
function mokim_lock_toggle() {
    if (mokim_lock_is_open) {
        mokim_lock_close();
    } else {
        mokim_lock_open();
    }
}
function mokim_lock_switch_tab(tab_id) {
    if (!tab_id) return;
    mokim_lock_current_tab = tab_id;
    mokim_lock_tabs.forEach(function (btn) {
        if (btn.dataset.lockTab === tab_id) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    mokim_lock_panes.forEach(function (pane) {
        if (pane.id === 'mokim_lock_pane_' + tab_id) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
}
if (mokim_lock_trigger_btn) {
    mokim_lock_trigger_btn.addEventListener('click', function (e) {
        e.stopPropagation();
        mokim_lock_toggle();
    });
}
if (mokim_lock_close_btn) {
    mokim_lock_close_btn.addEventListener('click', mokim_lock_close);
}
if (mokim_lock_overlay) {
    mokim_lock_overlay.addEventListener('click', function (e) {
        if (e.target === this) {
            mokim_lock_close();
        }
    });
}
mokim_lock_tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
        var tab_id = this.dataset.lockTab;
        if (tab_id) {
            mokim_lock_switch_tab(tab_id);
        }
    });
});
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mokim_lock_is_open) {
        mokim_lock_close();
    }
});
document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        mokim_lock_toggle();
    }
});
var mokim_lock_question_input = document.getElementById('mokim_lock_question_input');
var mokim_lock_answer_input = document.getElementById('mokim_lock_answer_input');
function mokim_lock_update_counter(input) {
    if (!input) return;
    var parent = input.parentElement;
    var counter = parent ? parent.querySelector('.mokim_lock_char_counter') : null;
    if (!counter) return;
    var max = parseInt(input.getAttribute('maxlength')) || 0;
    var current = input.value.length;
    counter.textContent = current + ' / ' + max;
}

if (mokim_lock_question_input) {
    mokim_lock_question_input.addEventListener('input', function () {
        mokim_lock_update_counter(this);
    });
    mokim_lock_update_counter(mokim_lock_question_input);
}

if (mokim_lock_answer_input) {
    mokim_lock_answer_input.addEventListener('input', function () {
        mokim_lock_update_counter(this);
    });
    mokim_lock_update_counter(mokim_lock_answer_input);
}
mokim_lock_enablebtn.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
        e.stopPropagation();

        if (!mokim_isLockEnabled()) {
            alertMsg('消息上锁功能已在设置中禁用，请前往设置开启');
            return;
        }

        const activeTab = document.querySelector('.mokim_lock_tab_btn.active');
        if (!activeTab) {
            alertMsg('请先选择防护模式');
            return;
        }

        const convId = appState.selectedContact?.conversationId;
        if (!convId) {
            alertMsg('请先选择一个会话');
            return;
        }
        const tabId = activeTab.dataset.lockTab;
        switch (tabId) {
            case 'password':
                mokim_enablePasswordLock(convId);
                break;
            case 'time':
                mokim_enableTimeLock(convId);
                break;
            case 'burn':
                mokim_enableBurnLock(convId);
                break;
            default:
                alertMsg('请选择有效的防护模式');
        }
    });
});
async function mokim_enablePasswordLock(convId) {
    const question = document.getElementById('mokim_lock_question_input')?.value.trim();
    const answer = document.getElementById('mokim_lock_answer_input')?.value.trim();

    if (!question) {
        alertMsg('请输入安全问题');
        document.getElementById('mokim_lock_question_input')?.focus();
        return;
    }
    if (question.length < 2) {
        alertMsg('安全问题至少2个字符');
        document.getElementById('mokim_lock_question_input')?.focus();
        return;
    }
    if (!answer || answer.length < 2) {
        alertMsg('请输入答案（至少2个字符）');
        document.getElementById('mokim_lock_answer_input')?.focus();
        return;
    }
    if (answer.length > 8) {
        alertMsg('答案不能超过8个字符');
        document.getElementById('mokim_lock_answer_input')?.focus();
        return;
    }

    Loading.show('正在启用密码防护...');

    try {
        const hashedAnswer = await simpleSha256(answer);
        const lockSettings = {
            enabled: true,
            mode: 'password',
            question: question,
            answer_hash: hashedAnswer,
            createdAt: Date.now()
        };
        const success = await mokim_saveConversationLockStatus(convId, lockSettings);
        Loading.hide();
        if (success) {
            alertMsg('密码防护已启用');
            mokim_updateLockStatusUI(lockSettings);
            document.getElementById('mokim_lock_question_input').value = '';
            document.getElementById('mokim_lock_answer_input').value = '';
            mokim_lock_update_counter(document.getElementById('mokim_lock_question_input'));
            mokim_lock_update_counter(document.getElementById('mokim_lock_answer_input'));
            mokim_lock_switch_tab('overview');
        } else {
            alertMsg('启用失败，请重试');
        }
    } catch (error) {
        Loading.hide();
        alertMsg(`启用失败：${error.message}`);
    }
}
async function mokim_enableTimeLock(convId) {
    const timePicker = document.getElementById('mokim_lock_time_picker');
    if (!timePicker || !timePicker.value) {
        alertMsg('请选择有效期截止时间');
        timePicker?.focus();
        return;
    }

    const expireTime = new Date(timePicker.value).getTime();
    if (isNaN(expireTime)) {
        alertMsg('时间格式无效');
        return;
    }

    if (expireTime <= Date.now()) {
        alertMsg('有效期截止时间必须晚于当前时间');
        timePicker?.focus();
        return;
    }

    Loading.show('正在启用时间防护...');

    try {
        const lockSettings = {
            enabled: true,
            mode: 'time',
            expireTime: expireTime,
            createdAt: Date.now()
        };

        const success = await mokim_saveConversationLockStatus(convId, lockSettings);
        Loading.hide();

        if (success) {
            const expireDate = new Date(expireTime).toLocaleString('zh-CN');
            alertMsg(`时间防护已启用，有效期至 ${expireDate}`);
            mokim_updateLockStatusUI(lockSettings);
            timePicker.value = '';
            mokim_lock_switch_tab('overview');
        } else {
            alertMsg('启用失败，请重试');
        }
    } catch (error) {
        Loading.hide();
        alertMsg(`启用失败：${error.message}`);
    }
}
async function mokim_enableBurnLock(convId) {
    const delayInput = document.getElementById('mokim_lock_burn_delay');
    if (!delayInput) {
        alertMsg('请设置保留时长');
        return;
    }

    const delay = parseInt(delayInput.value);
    if (isNaN(delay) || delay < 10 || delay > 90) {
        alertMsg('保留时长必须在10-90秒之间');
        delayInput.focus();
        delayInput.select();
        return;
    }

    const notify = document.getElementById('mokim_lock_burn_notify')?.checked || false;

    Loading.show('正在启用阅后即焚...');

    try {
        const lockSettings = {
            enabled: true,
            mode: 'burn',
            burnDelay: delay,
            notify: notify,
            createdAt: Date.now()
        };

        const success = await mokim_saveConversationLockStatus(convId, lockSettings);
        Loading.hide();

        if (success) {
            alertMsg(`阅后即焚已启用，消息将在查看后 ${delay} 秒内自动销毁`);
            mokim_updateLockStatusUI(lockSettings);
            delayInput.value = 5;
            mokim_lock_switch_tab('overview');
        } else {
            alertMsg('启用失败，请重试');
        }
    } catch (error) {
        Loading.hide();
        alertMsg(`启用失败：${error.message}`);
    }
}
function mokim_getModeName(mode) {
    const modeMap = {
        'password': '密码防护',
        'time': '时间防护',
        'burn': '阅后即焚'
    };
    return modeMap[mode] || mode || '未启用';
}
function mokim_updateLockStatusUI(status) {
    const statusValue = document.querySelector('.mokim_lock_status_value');
    if (!statusValue) return;
    const disableBtn = document.getElementById('mokim_lock_disable_btn');
    if (status && status.enabled) {
        const modeText = mokim_getModeName(status.mode);
        statusValue.textContent = modeText;
        statusValue.style.color = '#409eff';
        statusValue.className = 'mokim_lock_status_value mokim_lock_status_enabled';
        if (disableBtn) {
            disableBtn.style.display = 'inline-block';
        }

        const desc = document.querySelector('#mokim_lock_overview_desc p');
        if (desc) {
            const modeDesc = {
                'password': `当前会话已启用密码防护，对方需正确回答问题才能查看消息`,
                'time': `当前会话已启用时间防护，消息仅在 ${new Date(status.expireTime).toLocaleString('zh-CN')} 前可读`,
                'burn': `当前会话已启用阅后即焚，消息被查看后 ${status.burnDelay || 5} 秒内自动销毁`
            };
            desc.innerHTML = `<i class="fas fa-info-circle"></i> ${modeDesc[status.mode] || '消息上锁已启用'}`;
        }
    } else {
        statusValue.textContent = '未启用';
        statusValue.style.color = '#999';
        statusValue.className = 'mokim_lock_status_value';
        if (disableBtn) {
            disableBtn.style.display = 'none';
        }

        const desc = document.querySelector('#mokim_lock_overview_desc p');
        if (desc) {
            desc.innerHTML = '<i class="fas fa-info-circle"></i> 消息上锁功能可为您的私密对话提供额外保护。启用后，对方需通过您设定的验证方式才能查看消息内容。';
        }
    }
}
async function mokim_disableLock(convId) {
    if (!convId) {
        alertMsg('请先选择一个会话');
        return;
    }
    const currentStatus = await mokim_getConversationLockStatus(convId);
    if (!currentStatus || !currentStatus.enabled) {
        alertMsg('当前会话未启用消息上锁');
        return;
    }

    const confirm = await mok_confirm(`确定要取消「${mokim_getModeName(currentStatus.mode)}」吗？`);
    if (!confirm) return;

    Loading.show('正在取消消息上锁...');

    try {
        const lockSettings = {
            enabled: false,
            mode: null
        };

        const success = await mokim_saveConversationLockStatus(convId, lockSettings);
        Loading.hide();

        if (success) {
            alertMsg('已取消消息上锁');
            mokim_updateLockStatusUI(null);
        } else {
            alertMsg('取消失败，请重试');
        }
    } catch (error) {
        Loading.hide();
        alertMsg(`取消失败：${error.message}`);
    }
}
function mokim_shouldShowPlainText(msg) {
    if (msg.isSelf) return true;
    if (msg.lock && msg.lock.enabled) {
        return false;
    }
    return true;
}
function mokim_lockdisbld_sss() {
    if (!mokim_lock_disableBtn) return;
    mokim_lock_disableBtn.addEventListener('click', function () {
        const convId = appState.selectedContact?.conversationId;
        if (convId) {
            mokim_disableLock(convId);
        } else {
            alertMsg('请先选择一个会话');
        }
    });
}
mokim_lockdisbld_sss();
/**  ------------------------刷新策略----------------- */
const mokim_tl_RefreshRateLimiter = (function () {
    let lastRefreshTime = 0;
    const MIN_INTERVAL = 30000;
    let isRefreshing = false;
    let refreshTimer = null;
    return {
        canRefresh() {
            const now = Date.now();
            if (isRefreshing) {
                return { allowed: false, reason: '正在刷新中...' };
            }
            const elapsed = now - lastRefreshTime;
            if (elapsed < MIN_INTERVAL) {
                const waitSeconds = Math.ceil((MIN_INTERVAL - elapsed) / 1000);
                return { allowed: false, reason: `操作过于频繁，请等待 ${waitSeconds} 秒后重试` };
            }
            return { allowed: true };
        },
        recordRefresh() {
            lastRefreshTime = Date.now();
        },
        setRefreshing(status) {
            isRefreshing = status;
            if (!status && refreshTimer) {
                clearTimeout(refreshTimer);
                refreshTimer = null;
            }
            if (status) {
                if (refreshTimer) {
                    clearTimeout(refreshTimer);
                }
                refreshTimer = setTimeout(() => {
                    isRefreshing = false;
                    refreshTimer = null;
                    console.warn('刷新状态超时自动重置');
                }, 30000);
            }
        },
        isRefreshing() {
            return isRefreshing;
        },
        reset() {
            isRefreshing = false;
            if (refreshTimer) {
                clearTimeout(refreshTimer);
                refreshTimer = null;
            }
        }
    };
})();
function mokim_bindConversationAreaContextMenu() {
    const conversationList = document.querySelector('.conversation-list');
    if (!conversationList) return;
    function finishRefresh(success = true) {
        RenderHooks.clearAll();
        mokim_tl_RefreshRateLimiter.setRefreshing(false);
        Loading.hide();
        if (success) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: '会话列表已刷新',
                showConfirmButton: false,
                timer: 1500
            });
        }
    }

    conversationList.addEventListener('contextmenu', function (e) {
        if (e.target.closest('.conversation-item')) {
            return;
        }
        e.preventDefault();
        const isRefreshing = mokim_tl_RefreshRateLimiter.isRefreshing();
        ContextMenu.show({
            event: e,
            target: this,
            items: [
                {
                    label: isRefreshing ? '刷新中...' : '刷新会话列表',
                    action: async () => {
                        const check = mokim_tl_RefreshRateLimiter.canRefresh();
                        if (!check.allowed) {
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                icon: 'warning',
                                title: check.reason,
                                showConfirmButton: false,
                                timer: 2000
                            });
                            return;
                        }
                        const currentContact = appState.selectedContact;
                        const hasSelectedContact = currentContact !== null;
                        mokim_tl_RefreshRateLimiter.setRefreshing(true);
                        mokim_tl_RefreshRateLimiter.recordRefresh();
                        Loading.show('正在刷新会话列表...');
                        RenderHooks.setAllHook(async function () {
                            finishRefresh(true);
                        });
                        try {
                            sendWsMessage({ type: 'refresh_groupsandusers' });
                        } catch (error) {
                            finishRefresh(false);
                            alertMsg(`刷新失败：${error.message}`);
                            console.error('刷新会话列表失败:', error);
                        }
                    }
                },
                {
                    label: '全部标记已读',
                    action: async () => {
                        if (!appState.contacts || appState.contacts.length === 0) {
                            alertMsg('没有可操作的会话');
                            return;
                        }
                        const confirmed = await mok_confirm('确定要将所有会话标记为已读吗？');
                        if (!confirmed) return;

                        Loading.show('正在标记全部已读...');
                        try {
                            for (const contact of appState.contacts) {
                                if (contact.unreadCount > 0) {
                                    await markConversationAsRead(contact.conversationId);
                                    contact.unreadCount = 0;
                                }
                            }
                            for (const group of appState.groups || []) {
                                if (group.unreadCount > 0) {
                                    const convId = `group_${group.group_id}`;
                                    await markConversationAsRead(convId);
                                    group.unreadCount = 0;
                                }
                            }
                            await renderContacts();
                            await renderGroups();

                            if (appState.selectedContact) {
                                switchChatWindow(appState.selectedContact);
                            }

                            Loading.hide();
                            alertMsg('所有会话已标记为已读');
                        } catch (error) {
                            Loading.hide();
                            alertMsg(`操作失败：${error.message}`);
                        }
                    }
                },
                {
                    label: (appState.hiddenConversations.size > 0 ? '显示已隐藏的会话' : '隐藏所有空会话'),
                    action: async () => {
                        if (appState.hiddenConversations.size > 0) {
                            const hiddenIds = Array.from(appState.hiddenConversations);
                            for (const convId of hiddenIds) {
                                mokim_unhideConversation(convId);
                            }
                            await renderContacts();
                            if (appState.selectedContact) {
                                switchChatWindow(appState.selectedContact);
                            }
                            alertMsg(`已恢复 ${hiddenIds.length} 个隐藏的会话`);
                        } else {
                            const allConversations = [...(appState.contacts || []), ...(appState.groups || [])];
                            let hiddenCount = 0;

                            for (const conv of allConversations) {
                                const convId = conv.conversationId || `group_${conv.group_id}`;
                                if (!mokim_isConversationHidden(convId)) {
                                    const db = await initIndexedDB();
                                    const transaction = db.transaction('messages', 'readonly');
                                    const store = transaction.objectStore('messages');
                                    const index = store.index('conversationId');

                                    const messages = await new Promise((resolve) => {
                                        const request = index.getAll(convId);
                                        request.onsuccess = (e) => resolve(e.target.result);
                                        request.onerror = () => resolve([]);
                                    });

                                    if (!messages || messages.length === 0) {
                                        mokim_hideConversation(convId);
                                        hiddenCount++;
                                    }
                                }
                            }

                            if (hiddenCount > 0) {
                                await renderContacts();
                                if (appState.selectedContact) {
                                    switchChatWindow(appState.selectedContact);
                                }
                                alertMsg(`已隐藏 ${hiddenCount} 个空会话`);
                            } else {
                                alertMsg('没有可隐藏的空会话');
                            }
                        }
                    }
                }
            ]
        });
    });
}
let mokim_gameChannel = null;
let mokim_gameChannelReady = false;

function mokim_setupGameRoomBridge() {
    try {
        if (!appState.ws || appState.ws.readyState !== WebSocket.OPEN) {
            console.log('[BroadcastChannel] WebSocket 未连接，500ms 后重试...');
            setTimeout(mokim_setupGameRoomBridge, 500);
            return;
        }
        if (mokim_gameChannelReady) {
            console.log('[BroadcastChannel] 已就绪');
            return;
        }

        mokim_gameChannel = new BroadcastChannel('mokim_game_channel');
        console.log('[BroadcastChannel] 已创建');

        mokim_gameChannel.onmessage = function (event) {
            const { type, data, messageId } = event.data;
            console.log('[BroadcastChannel] 收到消息:', type, messageId);

            if (type === 'game_ws_request') {
                const response = {
                    type: 'game_ws_response',
                    data: {
                        isConnected: appState.isConnected,
                        wsReadyState: appState.ws ? appState.ws.readyState : -1,
                        userId: appState.userId
                    },
                    messageId: messageId
                };
                console.log('[BroadcastChannel] 响应连接状态:', response);
                mokim_gameChannel.postMessage(response);
                return;
            }
            if (type === 'game_heartbeat') {
                if (appState.ws && appState.ws.readyState === WebSocket.OPEN) {
                    appState.ws.send(JSON.stringify({
                        type: 'heartbeat',
                        timestamp: data?.timestamp || Date.now()
                    }));
                    console.log('[BroadcastChannel] 转发游戏心跳到 WebSocket');
                }
                return;
            }
            if (type === 'game_send_message') {
                if (appState.ws && appState.ws.readyState === WebSocket.OPEN) {
                    appState.ws.send(JSON.stringify(data));
                    console.log('[BroadcastChannel] 转发消息:', data);
                }
                return;
            }

            if (type === 'game_register_listener') {
                const listenerId = data.listenerId || 'default';
                if (!window._gameListeners) window._gameListeners = new Map();
                window._gameListeners.set(listenerId, {
                    channel: event.source || mokim_gameChannel,
                    filter: data.filter || null
                });
                mokim_gameChannel.postMessage({
                    type: 'game_listener_registered',
                    listenerId: listenerId,
                    success: true
                });
                console.log('[BroadcastChannel] 注册监听器:', listenerId);
                return;
            }

            if (type === 'game_unregister_listener') {
                const listenerId = data.listenerId || 'default';
                if (window._gameListeners) {
                    window._gameListeners.delete(listenerId);
                }
                return;
            }
        };
        const originalOnMessage = appState.ws.onmessage;
        appState.ws.onmessage = function (event) {
            if (originalOnMessage) originalOnMessage.call(appState.ws, event);
            try {
                const msg = JSON.parse(event.data);
                if (msg.type && msg.type.startsWith('game_')) {
                    mokim_gameChannel.postMessage({
                        type: 'game_message',
                        data: msg
                    });
                }
            } catch (e) { }
        };

        mokim_gameChannelReady = true;
    } catch (e) {
        console.warn('[BroadcastChannel] 不支持:', e);
    }
}
// ===================== 初始化执行 =====================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    TranslationManager.init();
    bindSendMessageEvent();
    initAttachModal();
    bindMessageContextMenu();
    initSettingsModal(); //初始模态框
    loadSettings(); //初始设置
    initSimpleSearch(); //搜索聊天内容
    add_button_export_messgaeauthlaw();
    mokim_bindConversationAreaContextMenu();
    NotificationManager.init().then(granted => {
        if (granted) {
            console.log('桌面通知已启用');
        } else if (Notification.permission === 'default') {
            setTimeout(() => {
                NotificationManager.requestPermission();
            }, 5000);
        }
    });
    document.getElementById('qinmidu_lovenumget').addEventListener('click', function () {
        const contact = appState.selectedContact;
        if (!contact && contact !== null) {
            alertMsg('请先选择一个联系人');
            return;
        }
        const myId = appState?.userId;
        const otherId = contact?.contactId || contact?.user_id || contact?.userId;
        const otherName = encodeURIComponent(contact?.uname || contact?.friendAlias || '未知用户');
        const conversionID = contact?.conversationId;
        const url = `/use/miniworld/?u=${myId}&uu=${otherId}&un=${otherName}&conv=${conversionID}`;
        window.open(url, '_blank');
    });
    const chatInput = document.querySelector('.chat-input');
    if (chatInput) {
        chatInput.addEventListener('blur', () => {
            if (typingStarted) {
                clearTimeout(typingEndTimeout);
                typingStarted = false;
                sendTypingStatus('end');
                lastTypingNotifyTime = 0;
            }
        });
    }
    document.addEventListener('error', (e) => {
        if (e.target.classList.contains('emoji-img')) {
            e.target.classList.add('error');
            const alt = e.target.alt;
            if (alt) {
                const fallbackSpan = document.createElement('span');
                fallbackSpan.className = 'emoji-fallback';
                fallbackSpan.textContent = alt.replace(/[\[\]]/g, '');
                e.target.parentNode.replaceChild(fallbackSpan, e.target);
            }
        }
    }, true);
    initEmojiPicker();
});
window.addEventListener('beforeunload', () => {
    if (appState.ws) {
        appState.ws.close(1000, '页面关闭');
    }
    clearInterval(appState.heartbeatTimer);
    clearTimeout(appState.reconnectTimer);
});
window.mokim_hideConversation = mokim_hideConversation;
window.mokim_isConversationHidden = mokim_isConversationHidden;
window.mokim_unhideConversation = mokim_unhideConversation;