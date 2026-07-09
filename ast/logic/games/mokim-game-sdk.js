(function (global) {
    'use strict';
    function _genId(prefix) {
        return (prefix || 'id') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }
    const RateLimit = {
        _records: {},
        check(key, interval) {
            const now = Date.now();
            const last = this._records[key] || 0;
            const elapsed = now - last;
            if (elapsed < interval) {
                return { allowed: false, waitTime: Math.ceil((interval - elapsed) / 1000) };
            }
            this._records[key] = now;
            return { allowed: true, waitTime: 0 };
        },
        reset(key) { delete this._records[key]; }
    };

    class GameChannel {
        constructor(channelName = 'mokim_game_channel', listenerId = null) {
            this._channelName = channelName;
            this._listenerId = listenerId || _genId('listener');
            this._channel = null;
            this._messageHandlers = new Map();
            this._pendingRequests = new Map();
            this._isConnected = false;
        }

        init() {
            try {
                this._channel = new BroadcastChannel(this._channelName);
                this._channel.onmessage = this._handleMessage.bind(this);
                this._registerListener();
                return true;
            } catch (e) {
                console.error('[GameChannel] 初始化失败:', e);
                return false;
            }
        }

        _handleMessage(event) {
            if (!event || !event.data) return;
            const { type, data, messageId, listenerId } = event.data;
            if (!type) return;

            if (type === 'game_response') {
                if (messageId && this._pendingRequests.has(messageId)) {
                    const req = this._pendingRequests.get(messageId);
                    this._pendingRequests.delete(messageId);
                    if (req.timer) clearTimeout(req.timer);
                    req.resolve(data);
                }
                return;
            }

            if (type === 'game_message') {
                if (data) {
                    this._handleGameMessage(data);
                }
                return;
            }

            if (type === 'game_listener_registered') {
                if (listenerId && listenerId === this._listenerId) {
                    this._isConnected = true;
                    console.log('[GameChannel] 监听器注册成功');
                }
                return;
            }
            if (type === 'game_heartbeat') {
                return;
            }

            if (type === 'heartbeat_resp') {
                return;
            }

            console.log('[GameChannel] 未知消息类型:', type);
        }

        _handleGameMessage(msg) {
            for (const handler of this._messageHandlers.values()) {
                try {
                    handler(msg);
                } catch (e) {
                    console.error('[GameChannel] 消息处理器错误:', e);
                }
            }
        }

        _registerListener() {
            if (this._channel) {
                this._channel.postMessage({
                    type: 'game_register_listener',
                    data: {
                        listenerId: this._listenerId,
                        filter: 'game_*'
                    }
                });
            }
        }
        sendRequest(type, data, timeout = 10000) {
            return new Promise((resolve, reject) => {
                const messageId = _genId('req');
                const timer = setTimeout(() => {
                    if (this._pendingRequests.has(messageId)) {
                        this._pendingRequests.delete(messageId);
                        reject(new Error('请求超时'));
                    }
                }, timeout);
                this._pendingRequests.set(messageId, { resolve, reject, timer });
                if (this._channel) {
                    this._channel.postMessage({
                        type: 'game_request',
                        data: data,
                        messageId: messageId
                    });
                } else {
                    reject(new Error('通道未初始化'));
                }
            });
        }
        sendGameMessage(type, data = {}) {
            if (!this._channel) {
                console.warn('[GameChannel] 通道未初始化，消息未发送');
                return;
            }
            this._channel.postMessage({
                type: 'game_send_message',
                data: {
                    type: type,
                    data: data
                }
            });
        }
        onMessage(handler) {
            const id = _genId('handler');
            this._messageHandlers.set(id, handler);
            return id;
        }
        offMessage(id) {
            this._messageHandlers.delete(id);
        }

        get isConnected() {
            return this._isConnected;
        }

        setConnected(online) {
            this._isConnected = online;
        }

        destroy() {
            if (this._channel) {
                this._channel.close();
                this._channel = null;
            }
            this._messageHandlers.clear();
            this._pendingRequests.clear();
            this._isConnected = false;
        }
    }

    


    function startGameHeartbeat(channel, interval = 12000) {
        if (!(channel instanceof GameChannel)) {
            console.warn('[Heartbeat] 无效的通道对象');
            return null;
        }
        return setInterval(() => {
            if (channel._channel) {
                channel._channel.postMessage({
                    type: 'game_heartbeat',
                    data: { timestamp: Date.now() }
                });
            }
        }, interval);
    }

    const MokimGameSDK = {
        GameChannel,
        RateLimit,
        startGameHeartbeat,
        VERSION: '1.0.0'
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MokimGameSDK;
    } else {
        global.MokimGameSDK = MokimGameSDK;
    }

})(typeof window !== 'undefined' ? window : this);