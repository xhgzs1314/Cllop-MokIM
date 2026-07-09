(function () {
    'use strict';
    const ALLOWED_GLOBALS = new Set([
        'Object', 'Array', 'String', 'Number', 'Boolean', 'Date',
        'Math', 'JSON', 'Promise', 'Error', 'RegExp', 'Map', 'Set',
        'WeakMap', 'WeakSet', 'ArrayBuffer', 'Uint8Array', 'Int8Array',
        'Float32Array', 'Float64Array', 'parseInt', 'parseFloat',
        'isNaN', 'isFinite', 'encodeURI', 'encodeURIComponent',
        'decodeURI', 'decodeURIComponent', 'console', 'XMLHttpRequest'
    ]);
    const DANGEROUS_GLOBALS = new Set([
        'window', 'document', 'location', 'history', 'navigator',
        'screen', 'frames', 'self', 'top', 'parent', 'opener',
        'localStorage', 'sessionStorage', 'indexedDB', 'webkitStorageInfo',
        'fetch', 'WebSocket', 'EventSource',
        'Worker', 'SharedWorker', 'ServiceWorker',
        'alert', 'confirm', 'prompt', 'print',
        'open', 'close', 'focus', 'blur', 'postMessage',
        'addEventListener', 'removeEventListener', 'dispatchEvent',
        'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
        'requestAnimationFrame', 'cancelAnimationFrame',
        'requestIdleCallback', 'cancelIdleCallback',
        'getComputedStyle', 'matchMedia', 'moveTo', 'moveBy',
        'resizeTo', 'resizeBy', 'scrollTo', 'scrollBy', 'scroll',
        'atob', 'btoa', 'escape', 'unescape',
        'webkitURL', 'URL', 'Blob', 'File', 'FileReader',
        'FormData', 'Image', 'ImageData', 'CanvasRenderingContext2D',
        'Audio', 'SpeechSynthesis', 'webkitSpeechRecognition'
    ]);
    const DANGEROUS_IDENTIFIERS = new Set([
        ...DANGEROUS_GLOBALS,
        'eval', 'Function', 'setTimeout', 'setInterval',
        'document.body', 'document.head', 'document.createElement',
        'window.location', 'localStorage.setItem', 'sessionStorage.setItem'
    ]);
    const EXECUTABLE_METHODS = new Set(['eval', 'Function', 'setTimeout', 'setInterval']);
    const STRING_PROTOTYPE_METHODS = {
        checkIfrom: function (keywordList) {
            const str = this.toString();
            const keywords = Array.isArray(keywordList) ? keywordList : [keywordList];
            for (const keyword of keywords) {
                if (typeof keyword === 'string' && str.includes(keyword)) {
                    return true;
                }
            }
            return false;
        }
    };
    function mountStringPrototypeMethods() {
        for (const [methodName, methodFunc] of Object.entries(STRING_PROTOTYPE_METHODS)) {
            if (String.prototype[methodName]) {
                continue;
            }
            Object.defineProperty(String.prototype, methodName, {
                value: methodFunc,
                writable: false,
                configurable: false,
                enumerable: false
            });
        }
    }
    mountStringPrototypeMethods();
    function scanDangerousContentInString(str) {
        if (typeof str !== 'string') return false;
        const cleanedStr = str.replace(/['"`\\]/g, '').toLowerCase();
        for (const dangerous of DANGEROUS_IDENTIFIERS) {
            if (cleanedStr.includes(dangerous.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
    function analyzeScriptAST(scriptCode) {
        const executablePattern = new RegExp(`(${Array.from(EXECUTABLE_METHODS).join('|')})\\s*\\(\\s*['"\`].*?(${Array.from(DANGEROUS_IDENTIFIERS).join('|')}).*?['"\`]\\s*\\)`, 'gi');
        if (executablePattern.test(scriptCode)) {
            return true;
        }
        const dangerousStringPattern = new RegExp(`['"\`].*?(${Array.from(DANGEROUS_IDENTIFIERS).join('|')})\\s*[=+\\-*/].*?['"\`]`, 'gi');
        if (dangerousStringPattern.test(scriptCode)) {
            return true;
        }
        return false;
    }

    const SAFE_FUNCTIONS = {
        log: (...args) => {
            console.log('[群脚本]', ...args);
        },
        warn: (...args) => {
            console.warn('[群脚本]', ...args);
        },
        error: (...args) => {
            console.error('[群脚本]', ...args);
        },
        sendGroupMessage: (content) => {
            if (!appState.selectedContact?.isGroup) return;
            const text = String(content || '').substring(0, 500);
            const filteredText = filterSensitiveContent(text);
            if (filteredText.trim()) {
                if (typeof window.sendGroupMessage === 'function') {
                    window.sendGroupMessage({
                        text: filteredText,
                        messageType: 'text',
                        content: { text: filteredText }
                    });
                }
            }
        },
        getCurrentUser: () => ({
            userId: appState.userId,
            name: typeof getCurrentUserName === 'function' ? getCurrentUserName() : appState.userId,
            isAdmin: appState.selectedContact?.is_admin === true,
            isOwner: appState.selectedContact?.owner_id === appState.userId
        }),
        WSystemMsg: async (msg) => {
            if (scanDangerousContentInString(msg)) {
                console.warn('[群脚本] 消息包含危险内容，已拒绝展示');
                return false;
            }
            const safeMsg = String(msg || '').substring(0, 500);
            if (!safeMsg.trim()) {
                console.warn('[群脚本] 消息内容为空');
                return false;
            }
            const currentContact = appState.selectedContact;
            if (!currentContact) {
                console.warn('[群脚本] 当前未选中任何会话');
                return false;
            }
            const { conversationId, contactId, isGroup } = currentContact;
            const systemMessage = {
                messageId: typeof generateUniqueId === 'function' ? generateUniqueId() : Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                conversationId: String(conversationId),
                senderId: 'system',
                receiverId: isGroup ? conversationId : String(contactId),
                messageType: 'system',
                content: {
                    systemText: safeMsg
                },
                sendTime: Date.now(),
                isSelf: false,
                status: 'received',
                read: true
            };
            try {
                if (typeof saveMessageToDB === 'function') {
                    await saveMessageToDB(systemMessage);
                } else {
                    const db = await initIndexedDB();
                    const transaction = db.transaction('messages', 'readwrite');
                    const store = transaction.objectStore('messages');
                    await new Promise((resolve, reject) => {
                        const request = store.put(systemMessage);
                        request.onsuccess = () => resolve();
                        request.onerror = (e) => reject(e.target.error);
                    });
                }
                if (appState.selectedContact?.conversationId === conversationId) {
                    if (typeof refreshChatWindow === 'function') {
                        refreshChatWindow(systemMessage);
                    }
                }
                if (typeof updateContactLastMessage === 'function') {
                    updateContactLastMessage(conversationId, `[系统消息] ${safeMsg}`, Date.now());
                }
                return true;
            } catch (error) {
                console.error('[群脚本] 发送系统消息失败:', error);
                return false;
            }
        },
        getCurrentGroup: () => {
            if (!appState.selectedContact?.isGroup) return null;
            return {
                groupId: appState.selectedContact.group_id || appState.selectedContact.contactId?.replace('group_', ''),
                groupName: appState.selectedContact.group_name || appState.selectedContact.uname,
                groupDesc: appState.selectedContact.group_desc,
                memberCount: appState.selectedContact.memberCount,
                isAdmin: appState.selectedContact.is_admin === true,
                isOwner: appState.selectedContact.owner_id === appState.userId
            };
        },
        setVariable: (key, value) => {
            if (!appState._groupScriptVars) appState._groupScriptVars = new Map();
            const groupId = appState.selectedContact?.group_id;
            if (!groupId) return;
            if (scanDangerousContentInString(JSON.stringify(value))) {
                console.warn('[群脚本] 变量值包含危险内容，已拒绝存储');
                return;
            }
            const serialized = safeStringify(value);
            if (serialized.length > 10240) {
                console.warn('[群脚本] 变量值过大，已拒绝存储');
                return;
            }
            const groupKey = `${groupId}_${safeKey(key)}`;
            appState._groupScriptVars.set(groupKey, value);
        },

        getVariable: (key) => {
            if (!appState._groupScriptVars) return undefined;
            const groupId = appState.selectedContact?.group_id;
            if (!groupId) return undefined;
            const groupKey = `${groupId}_${safeKey(key)}`;
            const value = appState._groupScriptVars.get(groupKey);
            return deepCopy(value);
        },
        delay: (ms) => {
            const maxDelay = 30000;
            const actualDelay = Math.min(Math.max(0, ms), maxDelay);
            return new Promise(resolve => setTimeout(resolve, actualDelay));
        },
        infomsg: (msg) => {
            if (scanDangerousContentInString(msg)) {
                console.warn('[群脚本] 消息包含危险内容，已拒绝展示');
                return;
            }
            const safeMsg = String(msg || '').substring(0, 200);
            if (typeof alertMsg === 'function') {
                alertMsg(safeMsg);
            }
        },
        psmute: async (time, reason) => {
            if (!time || typeof time !== 'number' || time <= 0) {
                console.warn('[群脚本] 禁言时间参数无效，必须为正数（秒）');
                return false;
            }
            if (!appState.selectedContact?.isGroup) {
                console.warn('[群脚本] 仅在群聊中可执行禁言操作');
                return false;
            }
            const maxTime = 30 * 24 * 60 * 60;
            const actualTime = Math.min(time, maxTime);
            const banToTimestamp = Date.now() + (actualTime * 1000);
            const formatDateTime = (timestamp) => {
                const date = new Date(timestamp);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            };

            const banToTimeText = formatDateTime(banToTimestamp);
            const targetUserId = appState.userId;
            const groupId = appState.selectedContact.group_id ||
                appState.selectedContact.contactId?.replace('group_', '');
            if (!groupId) {
                console.warn('[群脚本] 无法获取群组ID');
                return false;
            }
            const safeReason = reason ? String(reason).substring(0, 200).replace(/[<>'"]/g, '') : '';
            try {
                const authdatas = await tmd_newcontroler.writenewwords(groupId);
                return new Promise((resolve, reject) => {
                    plugin_post_requests({
                        dfid: authdatas,
                        UserId: targetUserId,
                        ban_until: banToTimeText
                    }, async (error, response) => {
                        if (error) {
                            console.error('[群脚本] 禁言请求失败:', error);
                            resolve(false);
                            return;
                        }
                        if (response && response.success) {
                            const banUntilText = banToTimeText;
                            if (appState.groups && Array.isArray(appState.groups)) {
                                appState.groups = appState.groups.map(group => {
                                    const groupConvId = group.conversationId || `group_${group.group_id}`;
                                    if (groupConvId === appState.selectedContact?.conversationId ||
                                        String(group.group_id) === String(groupId)) {
                                        return {
                                            ...group,
                                            nalsay: banUntilText,
                                        };
                                    }
                                    return group;
                                });
                            }
                            if (appState.selectedContact && appState.selectedContact.conversationId ===
                                appState.selectedContact.conversationId) {
                                appState.selectedContact.nalsay = banUntilText;
                            }
                            let systemMsgText = `您已被禁言，截至时间：${banUntilText}`;
                            if (safeReason) {
                                systemMsgText += `，原因：${safeReason}`;
                            }
                            if (typeof SAFE_FUNCTIONS?.WSystemMsg === 'function') {
                                await SAFE_FUNCTIONS.WSystemMsg(systemMsgText);
                            } else if (typeof window.GroupScriptEngine?.WSystemMsg === 'function') {
                                await window.GroupScriptEngine.WSystemMsg(systemMsgText);
                            } else {
                                if (typeof alertMsg === 'function') {
                                    alertMsg(systemMsgText);
                                }
                                console.log('[群脚本] 禁言通知:', systemMsgText);
                            }
                            resolve(true);
                        } else {
                            const errorMsg = response?.message || '禁言失败';
                            console.error('[群脚本] 禁言失败:', errorMsg);
                            resolve(false);
                        }
                    }, {
                        url: '/api/group_mute_member/',
                        timeout: 10000
                    });
                });
            } catch (error) {
                console.error('[群脚本] 禁言操作异常:', error);
                return false;
            }
        },
        timeNow: () => Date.now(),
        randomGet: (min = 0, max = 1) => {
            const safeMin = Math.max(0, Math.min(min, 1000000));
            const safeMax = Math.min(max, 1000000);
            return Math.random() * (safeMax - safeMin) + safeMin;
        },
        SubString: (str, start, end) => {
            if (typeof str !== 'string') return '';
            return str.substring(Math.max(0, start), Math.min(end || str.length, 500));
        },
        Slicetion: (arr, start, end) => {
            if (!Array.isArray(arr)) return [];
            return arr.slice(Math.max(0, start), Math.min(end || arr.length, 100));
        },
        stringUtils: {
            ...STRING_PROTOTYPE_METHODS
        },
        RegexUxs: {
            run: (pattern, text, flags = 'i') => {
                try {
                    const regex = new RegExp(pattern.substring(0, 100), flags);
                    return regex.test(text.substring(0, 500));
                } catch {
                    return false;
                }
            },

            check: (pattern, text) => {
                try {
                    const regex = new RegExp(pattern.substring(0, 100), 'i');
                    const matches = text.substring(0, 500).match(regex);
                    return matches ? matches.slice(0, 10) : null;
                } catch {
                    return null;
                }
            }
        },
        HttpNetServer: {
            create: () => new XMLHttpRequest(),
            open: (xhr, method, url) => xhr.open(method, url, true),
            setHeader: (xhr, k, v) => xhr.setRequestHeader(k, v),
            send: (xhr, body) => xhr.send(body),
            abort: (xhr) => xhr.abort(),
            onState: (xhr, cb) => xhr.onreadystatechange = cb,
            getReadyState: (xhr) => xhr.readyState,
            getStatus: (xhr) => xhr.status,
            getResponse: (xhr) => xhr.responseText,
            setTimeout: (xhr, ms) => xhr.timeout = ms
        },
    };

    function filterSensitiveContent(text) {
        if (!text) return '';
        const sensitivePatterns = [
            /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi,
            /(\d{3,})/g,
            /['"`;<>]/g,
            new RegExp(`(${Array.from(DANGEROUS_IDENTIFIERS).join('|')})`, 'gi')
        ];
        let filtered = text;
        sensitivePatterns.forEach(pattern => {
            filtered = filtered.replace(pattern, (match) => {
                return '*'.repeat(Math.min(match.length, 10));
            });
        });
        return filtered;
    }

    function safeKey(key) {
        if (typeof key !== 'string') key = String(key);
        return key.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 100);
    }

    function deepCopy(obj, depth = 0) {
        if (depth > 5) return null;
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof RegExp) return new RegExp(obj);
        if (Array.isArray(obj)) {
            return obj.slice(0, 100).map(item => deepCopy(item, depth + 1));
        }
        const copy = {};
        let count = 0;
        for (const key in obj) {
            if (count++ > 50) break;
            if (obj.hasOwnProperty(key) && typeof obj[key] !== 'function') {
                copy[key] = deepCopy(obj[key], depth + 1);
            }
        }
        return copy;
    }

    function safeStringify(obj) {
        try {
            const seen = new WeakSet();
            return JSON.stringify(obj, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) return '[Circular]';
                    seen.add(value);
                }
                if (typeof value === 'function') return '[Function]';
                if (typeof value === 'symbol') return '[Symbol]';
                if (typeof value === 'string' && scanDangerousContentInString(value)) {
                    return '[DangerousContent]';
                }
                return value;
            });
        } catch {
            return String(obj).substring(0, 1000);
        }
    }

    function createIsolatedSandbox(contextVars) {
        const sandbox = Object.create(null);
        for (const [key, value] of Object.entries(SAFE_FUNCTIONS)) {
            Object.defineProperty(sandbox, key, {
                value: value,
                writable: false,
                configurable: false,
                enumerable: true
            });
        }
        const safeBuiltins = ['Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON', 'Promise', 'Error', 'RegExp', 'Map', 'Set'];
        for (const name of safeBuiltins) {
            if (ALLOWED_GLOBALS.has(name)) {
                Object.defineProperty(sandbox, name, {
                    value: window[name],
                    writable: false,
                    configurable: false,
                    enumerable: true
                });
            }
        }
        for (const dangerous of DANGEROUS_GLOBALS) {
            Object.defineProperty(sandbox, dangerous, {
                value: undefined,
                writable: false,
                configurable: false,
                enumerable: false
            });
        }
        Object.defineProperty(sandbox, 'eval', { value: undefined, writable: false });
        Object.defineProperty(sandbox, 'Function', { value: undefined, writable: false });
        sandbox.$event = contextVars.$event;
        sandbox.$utils = deepCopy(contextVars.$utils);
        sandbox.$contact = contextVars.contact ? deepCopy(contextVars.contact) : null;
        const handler = {
            get: function (target, prop, receiver) {
                if (prop in target) {
                    return Reflect.get(target, prop, receiver);
                }
                if (DANGEROUS_GLOBALS.has(prop) || EXECUTABLE_METHODS.has(prop)) {
                    console.warn(`[群脚本] 禁止访问危险属性: ${prop}`);
                    return undefined;
                }
                return undefined;
            },
            set: function (target, prop, value) {
                console.warn(`[群脚本] 禁止设置属性: ${String(prop)}`);
                return false;
            },
            has: function (target, prop) {
                return prop in target;
            },
            ownKeys: function (target) {
                return Reflect.ownKeys(target);
            },
            getOwnPropertyDescriptor: function (target, prop) {
                if (prop in target) {
                    return Reflect.getOwnPropertyDescriptor(target, prop);
                }
                return undefined;
            }
        };
        const proxiedSandbox = new Proxy(sandbox, handler);
        return Object.freeze(proxiedSandbox);
    }

    async function executeWithTimeout(fn, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('脚本执行超时 (5秒)'));
            }, timeoutMs);

            try {
                const result = fn();
                if (result && typeof result.then === 'function') {
                    result
                        .then(res => {
                            clearTimeout(timeoutId);
                            resolve(res);
                        })
                        .catch(err => {
                            clearTimeout(timeoutId);
                            reject(err);
                        });
                } else {
                    clearTimeout(timeoutId);
                    resolve(result);
                }
            } catch (err) {
                clearTimeout(timeoutId);
                reject(err);
            }
        });
    }

    function preflightCheck(scriptCode) {
        if (scriptCode.length > 10000) {
            throw new Error('脚本过长，最大 10000 字符');
        }
        const dangerousPatterns = [
            /(?:while|for)\s*\([^)]*\)\s*\{[^}]*\}/g,
            /(?:__proto__|constructor|prototype)/gi,
            /(?:import|export)\s+/,
            /(?:with\s*\()/g,
            /(?:debugger)/g,
            /(?:new\s+Function)/g,
            /(?:eval\s*\()/g,
            /(?:[;{])\s*(?:while|for)\s*\([^;]*;[^;]*;[^)]*\)\s*\{\s*\}/g,
            /(?:window|document|location|localStorage|sessionStorage)\s*\./gi,
            /(?:alert|confirm|prompt)\s*\(/gi,
            /(?:setInterval|fetch)\s*\(/gi
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(scriptCode)) {
                throw new Error('脚本包含危险模式，已拒绝执行');
            }
        }
        if (analyzeScriptAST(scriptCode)) {
            throw new Error('脚本包含隐藏的危险内容，已拒绝执行');
        }

        let maxDepth = 0;
        let currentDepth = 0;
        for (const char of scriptCode) {
            if (char === '{') {
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
            } else if (char === '}') {
                currentDepth--;
            }
            if (currentDepth < 0) currentDepth = 0;
            if (maxDepth > 20) {
                throw new Error('脚本嵌套深度过大 (超过20层)');
            }
        }

        return true;
    }

    async function executeScriptWithContext(scriptCode, eventName, eventData, extraContext = {}) {
        if (!scriptCode || typeof scriptCode !== 'string') return;
        try {
            preflightCheck(scriptCode);
            const sandbox = createIsolatedSandbox({
                $event: eventData,
                $utils: extraContext.$utils || SAFE_FUNCTIONS.$utils,
                contact: extraContext.contact
            });
            const varNames = Object.keys(sandbox);
            const varValues = Object.values(sandbox);
            const wrappedScript = `
                "use strict";
                return (function() {
                    ${varNames.map(name => `const ${name} = __sandbox__["${name}"];`).join('\n')}
                    ${scriptCode}
                    return {
                        onEnter: typeof onEnter === 'function' ? onEnter : undefined,
                        onSend: typeof onSend === 'function' ? onSend : undefined,
                        onMessage: typeof onMessage === 'function' ? onMessage : undefined
                    };
                })();
            `;
            const executor = new Function('__sandbox__', wrappedScript);
            let exports;

            await executeWithTimeout(() => {
                exports = executor(sandbox);
            }, 5000);

            if (!exports) return;

            const eventFunc = exports[eventName];
            if (eventFunc && typeof eventFunc === 'function') {
                const result = await executeWithTimeout(() => eventFunc(eventData), 3000);
                return result;
            }
        } catch (err) {
            console.error(`[群脚本] 执行失败:`, err);
            return undefined;
        }
    }

    function cleanupGroupScripts(groupId) {
        if (appState._groupScriptVars) {
            for (const key of appState._groupScriptVars.keys()) {
                if (key.startsWith(`${groupId}_`)) {
                    appState._groupScriptVars.delete(key);
                }
            }
        }
    }

    window.GroupScriptEngine = {
        execute: executeScriptWithContext,
        cleanup: cleanupGroupScripts,
        version: '2.2.0-security-hardened',
        preflight: preflightCheck
    };

    const originalSwitchChatWindow = window.switchChatWindow;
    if (originalSwitchChatWindow) {
        window.switchChatWindow = async function (contact) {
            await originalSwitchChatWindow(contact);
            if (contact && contact.isGroup) {
                const scriptCode = getScriptCodeFromContact(contact);
                if (scriptCode) {
                    await executeScriptWithContext(scriptCode, 'onEnter',
                        { contact: sanitizeContact(contact) },
                        { contact: sanitizeContact(contact) }
                    );
                }
            }
        };
    }

    const originalSendGroupMessage = window.sendGroupMessage;
    if (originalSendGroupMessage) {
        window.sendGroupMessage = async function (messageContent) {
            const currentContact = appState.selectedContact;
            if (currentContact?.isGroup) {
                const scriptCode = getScriptCodeFromContact(currentContact);
                if (scriptCode) {
                    const msgEvent = {
                        content: messageContent.text || messageContent.content?.text || '',
                        messageType: messageContent.messageType || 'text',
                        timestamp: Date.now(),
                        sender: {
                            userId: appState.userId,
                            name: typeof getCurrentUserName === 'function' ? getCurrentUserName() : appState.userId
                        },
                        rawMessage: messageContent
                    };
                    const shouldContinue = await executeScriptWithContext(
                        scriptCode,
                        'onSend',
                        msgEvent,
                        { contact: sanitizeContact(currentContact) }
                    );
                    if (shouldContinue === false) {
                        return;
                    }
                }
            }
            return originalSendGroupMessage(messageContent);
        };
    }

    function getScriptCodeFromContact(contact) {
        const groupSettings = contact.group_settings;
        if (!groupSettings || typeof groupSettings !== 'string') return null;
        try {
            const parsed = JSON.parse(groupSettings);
            if (parsed && typeof parsed.script === 'string') {
                return parsed.script;
            }
        } catch (e) { }
        return groupSettings;
    }

    function sanitizeContact(contact) {
        if (!contact) return null;
        const safe = {};
        const allowedFields = ['group_id', 'group_name', 'group_desc', 'is_admin', 'owner_id', 'memberCount'];
        for (const field of allowedFields) {
            if (contact[field] !== undefined) {
                safe[field] = contact[field];
            }
        }
        return safe;
    }
})();