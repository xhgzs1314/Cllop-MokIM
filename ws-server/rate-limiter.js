class SimpleRateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 60 * 1000;
        this.maxRequests = options.maxRequests || 100;
        this.blockDuration = options.blockDuration || 5 * 60 * 1000;
        this.store = new Map();
        this.whitelist = new Set(options.whitelist || []);
        this.blacklist = new Set(options.blacklist || []);
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
    key(id, type = 'user') { return `${type}:${id}`; }
    isWhitelisted(id) { return this.whitelist.has(String(id)); }
    isBlacklisted(id) { return this.blacklist.has(String(id)); }
    cleanup() {
        const now = Date.now();
        for (const [key, data] of this.store) {
            if (data.blockedUntil && data.blockedUntil < now) {
                this.store.delete(key);
            } else if (!data.blockedUntil && data.resetTime < now) {
                this.store.delete(key);
            }
        }
    }
    check(id, type = 'user', maxRequests = null) {
        if (this.isWhitelisted(id)) {
            return { ok: true };
        }
        if (this.isBlacklisted(id)) {
            return { ok: false, reason: 'blacklisted', retryAfter: -1 };
        }

        const now = Date.now();
        const key = this.key(id, type);
        const limit = maxRequests || this.maxRequests;
        let data = this.store.get(key);
        if (!data) {
            this.store.set(key, { count: 1, resetTime: now + this.windowMs });
            return { ok: true, remaining: limit - 1 };
        }
        if (data.blockedUntil && data.blockedUntil > now) {
            return {
                ok: false,
                reason: 'blocked',
                retryAfter: Math.ceil((data.blockedUntil - now) / 1000)
            };
        }
        if (data.resetTime < now) {
            data.count = 1;
            data.resetTime = now + this.windowMs;
            data.blockedUntil = null;
            this.store.set(key, data);
            return { ok: true, remaining: limit - 1 };
        }
        if (data.count >= limit) {
            data.blockedUntil = now + this.blockDuration;
            data.count = 0;
            this.store.set(key, data);
            return {
                ok: false,
                reason: 'rate_limited',
                retryAfter: Math.ceil(this.blockDuration / 1000)
            };
        }
        data.count++;
        this.store.set(key, data);
        return {
            ok: true,
            remaining: limit - data.count,
            resetIn: Math.ceil((data.resetTime - now) / 1000)
        };
    }
    reset(id, type = 'user') {
        this.store.delete(this.key(id, type));
    }
}
const rateLimiter = new SimpleRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 300,
    blockDuration: 10 * 60 * 1000,
    whitelist: ['127.0.0.1'],
    blacklist: []
});
function wsCheckLimit(ws, userId, messageType) {
    const ip = ws._socket?.remoteAddress || 'unknown';
    const ipCheck = rateLimiter.check(ip, 'ip', 1000);
    if (!ipCheck.ok) return ipCheck;
    const userCheck = rateLimiter.check(userId, 'user', 300);
    if (!userCheck.ok) return userCheck;
    const typeLimits = {
        'new_message': 50,              // 私聊消息：每分钟最多50条（平均1条/秒）
        'new_group_message': 100,       // 群聊消息：每分钟最多100条
        'recall_message': 10,           // 消息撤回：每分钟最多10次
        'read_receipt': 30,             // 已读回执：每分钟最多30次
        'typing_status': 20,            // 输入状态通知：每分钟最多20次
        'heartbeat': 60,                // 心跳：每分钟最多60次（正常约1次/10秒）
        'ping': 60,                     // Ping：每分钟最多60次
        'refresh_contacts': 40,         // 刷新联系人：每分钟最多40次
        'refresh_groups': 40,           // 刷新群组：每分钟最多40次
        'refresh_groupsandusers': 20,   // 刷新联系人+群组
        'refresh_relation': 10,         // 刷新关系缓存：每分钟最多10次
        'add_scheduled_message': 5,     // 添加定时消息：每分钟最多5条
        'get_scheduled_messages': 10,   // 获取定时消息列表：每分钟最多10次
        'cancel_scheduled_message': 10, // 取消定时消息：每分钟最多10次
        'call_offer': 5,                // 发起通话：每30秒最多5次
        'call_answer': 5,               // 接听通话：每30秒最多5次
        'call_ice': 50,                 // ICE候选交换：每30秒最多50次
        'game_create_room': 10,      // 创建房间：每分钟最多10次
        'game_join_room': 20,        // 加入房间：每分钟最多20次
        'game_room_list': 15,        // 获取房间列表：每分钟最多15次
        'game_action': 50,           // 游戏动作：每分钟最多50次
        'game_set_ready': 20,        // 准备状态：每分钟最多20次
        'game_start': 10,            // 开始游戏：每分钟最多10次
        'default': 100                  // 未明确分类的消息类型：每分钟最多100次
    };

    const limit = typeLimits[messageType] || typeLimits.default;
    const typeCheck = rateLimiter.check(`${userId}:${messageType}`, 'type', limit);
    if (!typeCheck.ok) return typeCheck;

    return { ok: true };
}
function sendRateLimitError(ws, retryAfter = 60) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'rate_limit_error',
            code: 429,
            msg: '请求过于频繁，请稍后再试',
            data: { retryAfter },
            timestamp: Date.now()
        }));
    }
}
module.exports = {
    rateLimiter,
    wsCheckLimit,
    sendRateLimitError
};