const CONFIG = {
    API_URL: '/api/game_status/',
    PAGE_SIZE: 10,
    CACHE_TTL: 30000,
    RATE_LIMIT_MS: 5000
};

const game_RateLimiter = {
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

    reset(key) {
        delete this._records[key];
    }
};
function checkRateLimit(action) {
    const result = game_RateLimiter.check(`api_${action}`, CONFIG.RATE_LIMIT_MS);
    if (!result.allowed) {
        throw new Error(`操作过于频繁，请等待 ${result.waitTime} 秒后再试`);
    }
    return true;
}

const Cache = {
    _store: new Map(),

    get(key) {
        const entry = this._store.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > CONFIG.CACHE_TTL) {
            this._store.delete(key);
            return null;
        }
        return entry.data;
    },

    set(key, data) {
        this._store.set(key, {
            data: JSON.parse(JSON.stringify(data)),
            timestamp: Date.now()
        });
    },

    clear(key) {
        if (key) this._store.delete(key);
        else this._store.clear();
    }
};

const StatsApi = {
    _pendingRequests: new Map(),

    async call(action, payload = {}) {
        checkRateLimit(action);
        const requestKey = `${action}_${JSON.stringify(payload)}`;
        if (this._pendingRequests.has(requestKey)) {
            return this._pendingRequests.get(requestKey);
        }

        const promise = (async () => {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ action, ...payload }),
                credentials: 'include'
            });

            const result = await response.json();
            if (result.code !== 200) {
                throw new Error(result.msg || '请求失败');
            }
            return result.data;
        })();

        this._pendingRequests.set(requestKey, promise);
        try {
            const data = await promise;
            return data;
        } finally {
            this._pendingRequests.delete(requestKey);
        }
    },

    getSummary() {
        return this.call('summary');
    },

    getList(filters) {
        return this.call('list', filters);
    },

    getDetail(matchId) {
        return this.call('detail', { matchId });
    }
};

class StatsStore {
    constructor(userId) {
        this.userId = userId;
        this.page = 1;
        this.pageSize = CONFIG.PAGE_SIZE;
        this.total = 0;
        this.records = [];
        this.summary = null;
        this.filters = {
            gameType: '',
            dateFrom: '',
            dateTo: '',
            keyword: ''
        };
        this.isLoading = false;
    }

    get totalPages() {
        return Math.ceil(this.total / this.pageSize) || 1;
    }

    get winRate() {
        const total = this.summary?.totalPlays || 0;
        const wins = this.summary?.wins || 0;
        return total > 0 ? Math.round((wins / total) * 100) : 0;
    }

    resetPage() {
        this.page = 1;
    }

    updateFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.resetPage();
    }

    getCacheKey() {
        const f = this.filters;
        return `list_${this.userId}_${f.gameType}_${f.dateFrom}_${f.dateTo}_${f.keyword}_page${this.page}`;
    }
}

class StatsRenderer {
    constructor(container) {
        this.container = container;
        this._handlers = {};
        this._elements = null;
        this._instanceId = 'default';
    }
    
    on(events) {
        this._handlers = { ...this._handlers, ...events };
        return this;
    }

    render() {
        this.container.innerHTML = this._buildHTML();
        this._elements = this._getElements();
        this._bindEvents();
        return this;
    }

    renderSummary(summary) {
        if (!this._elements) return;

        const total = summary?.totalPlays || 0;
        const wins = summary?.wins || 0;
        const losses = summary?.losses || 0;
        const rate = total > 0 ? Math.round((wins / total) * 100) : 0;

        this._elements.total.textContent = total;
        this._elements.wins.textContent = wins;
        this._elements.losses.textContent = losses;
        this._elements.rate.textContent = rate + '%';
        this._elements.gcoin.textContent = (summary?.gcoinEarned || 0) > 0
            ? '+' + summary.gcoinEarned
            : summary?.gcoinEarned || 0;
        this._elements.streak.textContent = summary?.maxStreak || 0;
        this._elements.badge.textContent = total + ' 场';
    }

    renderList(records, userId) {
        if (!this._elements) return;

        if (!records || records.length === 0) {
            this._elements.list.style.display = 'none';
            this._elements.empty.style.display = 'block';
            this._elements.loading.style.display = 'none';
            return;
        }

        this._elements.list.innerHTML = records.map(r =>
            this._buildItem(r, userId)
        ).join('');

        this._elements.list.style.display = 'block';
        this._elements.empty.style.display = 'none';
        this._elements.loading.style.display = 'none';

        this._bindListEvents();
    }

    renderPagination(current, total) {
        if (!this._elements) return;

        if (total === 0) {
            this._elements.pagination.style.display = 'none';
            return;
        }

        this._elements.pagination.style.display = 'flex';
        this._elements.pageInfo.textContent = `${current} / ${total || 1}`;
        this._elements.prevBtn.disabled = current <= 1;
        this._elements.nextBtn.disabled = current >= total;
    }

    showLoading() {
        if (!this._elements) return;
        this._elements.loading.style.display = 'flex';
        this._elements.loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
        this._elements.list.style.display = 'none';
        this._elements.empty.style.display = 'none';
        this._elements.pagination.style.display = 'none';
    }

    showError(message, retryFn) {
        if (!this._elements) return;
        this._elements.loading.style.display = 'flex';
        this._elements.loading.innerHTML = `
            <i class="fas fa-circle-exclamation" style="color:#f87171;font-size:28px;"></i>
            <span>${message}</span>
            <button class="mok-stats-retry-btn-2026" data-retry>重试</button>
        `;
        this._elements.list.style.display = 'none';
        this._elements.empty.style.display = 'none';
        this._elements.pagination.style.display = 'none';

        const retryBtn = this._elements.loading.querySelector('[data-retry]');
        if (retryBtn && retryFn) {
            retryBtn.addEventListener('click', retryFn);
        }
    }
    
    getFilterValues() {
        if (!this._elements) return { gameType: '', dateFrom: '', dateTo: '', keyword: '' };
        return {
            gameType: this._elements.filterGame.value,
            dateFrom: this._elements.filterDateFrom.value,
            dateTo: this._elements.filterDateTo.value,
            keyword: this._elements.filterKeyword.value.trim()
        };
    }

    resetFilters() {
        if (!this._elements) return;
        this._elements.filterGame.value = '';
        this._elements.filterDateFrom.value = '';
        this._elements.filterDateTo.value = '';
        this._elements.filterKeyword.value = '';
    }
    
    _buildHTML() {
        return `
            <div class="mok-stats-wrap-2026">
                <div class="mok-stats-header-2026">
                    <div class="mok-stats-title-wrap-2026">
                        <span class="mok-stats-title-icon-2026"><i class="fas fa-trophy"></i></span>
                        <h3 class="mok-stats-title-2026">我的战绩</h3>
                        <span class="mok-stats-badge-2026" data-el="badge">0 场</span>
                    </div>
                    <button class="mok-stats-refresh-btn-2026" data-el="refresh" title="刷新">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>

                <div class="mok-stats-filter-bar-2026">
                    <select class="mok-stats-filter-select-2026" data-el="filterGame">
                        <option value=""><i class="fas fa-gamepad"></i> 全部</option>
                        <option value="quiz-race"><i class="fas fa-puzzle-piece"></i> 拼图竞速</option>
                    </select>
                    <input type="date" class="mok-stats-filter-input-2026" data-el="filterDateFrom" placeholder="开始">
                    <input type="date" class="mok-stats-filter-input-2026" data-el="filterDateTo" placeholder="结束">
                    <input type="text" class="mok-stats-filter-input-2026 mok-stats-filter-search-2026" data-el="filterKeyword" placeholder="搜索对手/对局名...">
                    <button class="mok-stats-filter-btn-2026 mok-stats-filter-go-2026" data-el="btnSearch">
                        <i class="fas fa-search"></i> 查询
                    </button>
                    <button class="mok-stats-filter-btn-2026 mok-stats-filter-reset-2026" data-el="btnReset">
                        <i class="fas fa-undo"></i>
                    </button>
                </div>

                <div class="mok-stats-cards-2026">
                    <div class="mok-stats-card-2026"><span class="mok-stats-card-icon-2026"><i class="fas fa-flag-checkered"></i></span><div><span class="mok-stats-card-num-2026" data-el="total">0</span><span class="mok-stats-card-label-2026">总场次</span></div></div>
                    <div class="mok-stats-card-2026 mok-stats-card-win-2026"><span class="mok-stats-card-icon-2026"><i class="fas fa-check-circle"></i></span><div><span class="mok-stats-card-num-2026" data-el="wins">0</span><span class="mok-stats-card-label-2026">胜场</span></div></div>
                    <div class="mok-stats-card-2026 mok-stats-card-loss-2026"><span class="mok-stats-card-icon-2026"><i class="fas fa-times-circle"></i></span><div><span class="mok-stats-card-num-2026" data-el="losses">0</span><span class="mok-stats-card-label-2026">败场</span></div></div>
                    <div class="mok-stats-card-2026 mok-stats-card-rate-2026"><span class="mok-stats-card-icon-2026"><i class="fas fa-chart-line"></i></span><div><span class="mok-stats-card-num-2026" data-el="rate">0%</span><span class="mok-stats-card-label-2026">胜率</span></div></div>
                    <div class="mok-stats-card-2026 mok-stats-card-gcoin-2026"><span class="mok-stats-card-icon-2026"><i class="fas fa-coins"></i></span><div><span class="mok-stats-card-num-2026" data-el="gcoin">0</span><span class="mok-stats-card-label-2026">G币净赚</span></div></div>
                    <div class="mok-stats-card-2026 mok-stats-card-streak-2026"><span class="mok-stats-card-icon-2026"><i class="fas fa-fire"></i></span><div><span class="mok-stats-card-num-2026" data-el="streak">0</span><span class="mok-stats-card-label-2026">最高连胜</span></div></div>
                </div>

                <div class="mok-stats-list-wrap-2026">
                    <div class="mok-stats-loading-2026" data-el="loading"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>
                    <div class="mok-stats-list-2026" data-el="list"></div>
                    <div class="mok-stats-empty-2026" data-el="empty">
                        <i class="fas fa-gamepad"></i>
                        <p>暂无战绩</p>
                        <span>去玩一局吧！</span>
                    </div>
                </div>

                <div class="mok-stats-pagination-2026" data-el="pagination">
                    <button class="mok-stats-page-btn-2026" data-el="prevBtn"><i class="fas fa-chevron-left"></i></button>
                    <span class="mok-stats-page-info-2026" data-el="pageInfo">1 / 1</span>
                    <button class="mok-stats-page-btn-2026" data-el="nextBtn"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
        `;
    }

    _getElements() {
        const els = {};
        const map = {
            total: 'total',
            wins: 'wins',
            losses: 'losses',
            rate: 'rate',
            gcoin: 'gcoin',
            streak: 'streak',
            badge: 'badge',
            loading: 'loading',
            list: 'list',
            empty: 'empty',
            pagination: 'pagination',
            pageInfo: 'pageInfo',
            prevBtn: 'prevBtn',
            nextBtn: 'nextBtn',
            filterGame: 'filterGame',
            filterDateFrom: 'filterDateFrom',
            filterDateTo: 'filterDateTo',
            filterKeyword: 'filterKeyword',
            btnSearch: 'btnSearch',
            btnReset: 'btnReset',
            refresh: 'refresh'
        };

        for (const [key, name] of Object.entries(map)) {
            const el = this.container.querySelector(`[data-el="${name}"]`);
            if (el) els[key] = el;
        }

        return els;
    }

    _bindEvents() {
        const els = this._elements;
        if (!els) return;
        els.btnSearch?.addEventListener('click', () => this._handlers.onSearch?.());
        els.btnReset?.addEventListener('click', () => this._handlers.onReset?.());
        els.refresh?.addEventListener('click', () => this._handlers.onRefresh?.());
        els.prevBtn?.addEventListener('click', () => this._handlers.onPrev?.());
        els.nextBtn?.addEventListener('click', () => this._handlers.onNext?.());
        els.filterKeyword?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handlers.onSearch?.();
        });
        els.filterDateFrom?.addEventListener('change', function () {
            const to = this.closest('.mok-stats-filter-bar-2026')?.querySelector('[data-el="filterDateTo"]');
            if (to?.value && this.value > to.value) to.value = this.value;
        });
        els.filterDateTo?.addEventListener('change', function () {
            const from = this.closest('.mok-stats-filter-bar-2026')?.querySelector('[data-el="filterDateFrom"]');
            if (from?.value && this.value < from.value) from.value = this.value;
        });
    }

    _bindListEvents() {
        const els = this._elements;
        if (!els) return;
        const newList = els.list.cloneNode(true);
        els.list.parentNode.replaceChild(newList, els.list);
        els.list = newList;
        const self = this;
        els.list.addEventListener('click', function (e) {
            const item = e.target.closest('.mok-stats-item-2026');
            if (!item) return;
            if (e.target.closest('.mok-stats-detail-btn-2026')) return;
            const matchId = item.dataset.matchid;
            if (matchId) {
                const detailBtn = item.querySelector('.mok-stats-detail-btn-2026');
                if (detailBtn) {
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true
                    });
                    detailBtn.dispatchEvent(clickEvent);
                }
            }
        });
        
        els.list.addEventListener('click', function (e) {
            const btn = e.target.closest('.mok-stats-detail-btn-2026');
            if (!btn) return;

            e.stopPropagation();
            e.preventDefault();

            const matchId = btn.dataset.matchid;
            if (matchId) {
                const instanceEventName = `stats:detail_${self._instanceId || 'default'}`;
                document.dispatchEvent(new CustomEvent(instanceEventName, { detail: { matchId } }));
            }
        });
    }

    _buildItem(record, userId) {
        const isWin = record.is_win;
        const gcoinText = isWin
            ? (record.winner_gcoin_change > 0 ? '+' + record.winner_gcoin_change : '0')
            : (record.loser_gcoin_change < 0 ? record.loser_gcoin_change : '0');
        let myScore, opponentScore;
        if (record.winner_id === userId) {
            myScore = record.winner_score;
            opponentScore = record.loser_score;
        } else {
            myScore = record.loser_score;
            opponentScore = record.winner_score;
        }
        const opponentDisplay = record.opponent_name
            ? `${record.opponent_name} <span style="font-size:11px;color:rgba(255,255,255,0.25);font-weight:400;">(${record.opponent_id})</span>`
            : record.opponent_id;
        const displayGameName = record.game_name || record.game_type;
        return `
    <div class="mok-stats-item-2026 ${isWin ? 'mok-stats-item-win-2026' : 'mok-stats-item-loss-2026'}" data-matchid="${record.match_id}">
        <div class="mok-stats-item-left-2026">
            <span class="mok-stats-item-icon-2026"><i class="${isWin ? 'fas fa-trophy' : 'fas fa-heart-broken'}"></i></span>
            <div>
                <div class="mok-stats-item-game-2026">
                    <span>${displayGameName}</span>
                    <span class="mok-stats-item-badge-2026 ${isWin ? 'mok-stats-badge-win-2026' : 'mok-stats-badge-loss-2026'}">${isWin ? '胜利' : '失败'}</span>
                </div>
                <div class="mok-stats-item-meta-2026">
                    <span><i class="fas fa-user"></i> 我 <span style="font-size:11px;color:rgba(255,255,255,0.15);">vs</span> ${opponentDisplay}</span>
                    <span><i class="far fa-clock"></i> ${record.end_time?.slice(5, 16) || '-'}</span>
                    ${record.bet_enabled ? `<span><i class="fas fa-coins"></i> ${gcoinText} G币</span>` : ''}
                </div>
            </div>
        </div>
        <div class="mok-stats-item-right-2026">
            <div class="mok-stats-item-score-2026">
                <span class="${isWin ? 'mok-stats-score-win-2026' : 'mok-stats-score-loss-2026'}">${myScore}</span>
                <span>:</span>
                <span class="${isWin ? 'mok-stats-score-loss-2026' : 'mok-stats-score-win-2026'}">${opponentScore}</span>
            </div>
            <button class="mok-stats-detail-btn-2026" data-matchid="${record.match_id}">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    </div>
`;
    }
}

class StatsDetailDialog {
    constructor(instanceId = 'default') {
        this._overlay = null;
        this._isLoading = false;
        this._instanceId = instanceId;
        this._eventHandler = null;
    }

    showLoading() {
        if (this._overlay) {
            return;
        }

        this._isLoading = true;
        this._overlay = document.createElement('div');
        this._overlay.className = 'mok-stats-dialog-overlay-2026';
        this._overlay.dataset.instance = this._instanceId;
        this._overlay.innerHTML = `
            <div class="mok-stats-dialog-box-2026">
                <div class="mok-stats-dialog-header-2026">
                    <span><i class="fas fa-spinner fa-spin"></i> 加载详情...</span>
                    <button class="mok-stats-dialog-close-2026" data-close><i class="fas fa-times"></i></button>
                </div>
                <div style="text-align:center;padding:30px;color:rgba(255,255,255,0.3);">
                    <i class="fas fa-spinner fa-spin" style="font-size:32px;color:#ffd700;"></i>
                </div>
            </div>
        `;
        document.body.appendChild(this._overlay);

        const closeBtn = this._overlay.querySelector('[data-close]');
        closeBtn?.addEventListener('click', () => this._close());

        this._overlay.addEventListener('click', (e) => {
            if (e.target === this._overlay) this._close();
        });
    }

    showError(message) {
        this._isLoading = false;
        if (!this._overlay) {
            this._overlay = document.createElement('div');
            this._overlay.className = 'mok-stats-dialog-overlay-2026';
            this._overlay.dataset.instance = this._instanceId;
            document.body.appendChild(this._overlay);
        }

        this._overlay.innerHTML = `
            <div class="mok-stats-dialog-box-2026">
                <div class="mok-stats-dialog-header-2026">
                    <span><i class="fas fa-circle-exclamation" style="color:#f87171;"></i> 加载失败</span>
                    <button class="mok-stats-dialog-close-2026" data-close><i class="fas fa-times"></i></button>
                </div>
                <div class="mok-stats-dialog-body-2026">
                    <p style="color:#f87171;">${message}</p>
                </div>
            </div>
        `;

        this._overlay.querySelector('[data-close]')?.addEventListener('click', () => this._close());
        this._overlay.addEventListener('click', (e) => {
            if (e.target === this._overlay) this._close();
        });
    }

    isOpen() {
        return this._overlay !== null;
    }

    _close() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
        this._isLoading = false;
    }

    showDetail(detail, userId) {
        if (!this._overlay) return;
        const isWin = detail.is_win;
        const box = this._overlay.querySelector('.mok-stats-dialog-box-2026');
        let myScore, opponentScore;
        if (detail.winner_id === userId) {
            myScore = detail.winner_score;
            opponentScore = detail.loser_score;
        } else {
            myScore = detail.loser_score;
            opponentScore = detail.winner_score;
        }
        const winnerDisplay = detail.winner_id === userId
            ? '我'
            : (detail.winner_name
                ? `${detail.winner_name} <span style="font-size:12px;color:rgba(255,255,255,0.2);">(${detail.winner_id})</span>`
                : detail.winner_id);

        const loserDisplay = detail.loser_id === userId
            ? '我'
            : (detail.loser_name
                ? `${detail.loser_name} <span style="font-size:12px;color:rgba(255,255,255,0.2);">(${detail.loser_id})</span>`
                : detail.loser_id);

        box.innerHTML = `
        <div class="mok-stats-dialog-header-2026">
            <span><i class="fas fa-chart-simple"></i> 比赛详情</span>
            <button class="mok-stats-dialog-close-2026" data-close><i class="fas fa-times"></i></button>
        </div>
        <div class="mok-stats-dialog-body-2026">
            <div class="mok-stats-dialog-result-2026 ${isWin ? 'mok-stats-dialog-win-2026' : 'mok-stats-dialog-loss-2026'}">
                <div style="font-size:40px;">
                    <i class="${isWin ? 'fas fa-trophy' : 'fas fa-heart-broken'}"></i>
                </div>
                <div style="font-size:22px;font-weight:700;color:#e4e6ed;">${isWin ? '胜利！' : '失败...'}</div>
                <div style="font-size:28px;font-weight:700;margin-top:4px;color:#fff;">
                    <span style="color:${isWin ? '#4ade80' : '#f87171'};">${myScore}</span>
                    <span style="color:rgba(255,255,255,0.15);margin:0 8px;">:</span>
                    <span style="color:${isWin ? '#f87171' : '#4ade80'};">${opponentScore}</span>
                </div>
            </div>
            ${this._buildRows(detail, winnerDisplay, loserDisplay)}
        </div>
    `;

        const closeBtn = this._overlay.querySelector('[data-close]');
        closeBtn?.addEventListener('click', () => this._close());
        this._overlay.addEventListener('click', (e) => {
            if (e.target === this._overlay) this._close();
        });
    }

    _buildRows(detail, winnerDisplay, loserDisplay) {
        const displayGameName = detail.game_name || detail.game_type;
        const rows = [
            { label: '<i class="fas fa-gamepad"></i> 玩法', value: displayGameName },
            { label: '<i class="fas fa-user-check" style="color:#4ade80;"></i> 胜者', value: winnerDisplay, style: 'color:#4ade80;' },
            { label: '<i class="fas fa-user-slash" style="color:#f87171;"></i> 败者', value: loserDisplay, style: 'color:#f87171;' }
        ];
        if (detail.bet_enabled) {
            rows.push({
                label: '<i class="fas fa-coins"></i> 押注',
                value: `${detail.bet_amount} G币 × ${detail.bet_odds}x = <strong style="color:#ffd700;">${detail.bet_total} G币</strong>`
            });
            rows.push({
                label: '<i class="fas fa-arrow-trend-up"></i> G币变化',
                value: detail.is_win ? '+' + detail.winner_gcoin_change : detail.loser_gcoin_change,
                style: `color:${detail.is_win ? '#4ade80' : '#f87171'};font-weight:700;font-size:18px;`
            });
            rows.push({ label: '<i class="fas fa-gamepad"></i> 模式', value: '竞技模式', style: 'color:rgba(255,255,255,0.3);' });
        } else {
            rows.push({ label: '<i class="fas fa-gamepad"></i> 模式', value: '娱乐模式', style: 'color:rgba(255,255,255,0.3);' });
        }
        rows.push(
            { label: '<i class="fas fa-stopwatch"></i> 时长', value: (detail.duration || 0) + ' 秒' },
            { label: '<i class="far fa-calendar"></i> 时间', value: detail.end_time?.replace('T', ' ') || '-' }
        );
        return rows.map(row => `
    <div class="mok-stats-detail-row-2026">
        <span>${row.label}</span>
        <span style="${row.style || ''}">${row.value}</span>
    </div>
`).join('');
    }
}

class StatsController {
    constructor(userId, container) {
        this.userId = userId;
        this._instanceId = `stats_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        this.store = new StatsStore(userId);
        this.renderer = new StatsRenderer(container);
        this.renderer._instanceId = this._instanceId;
        this.dialog = new StatsDetailDialog(this._instanceId);
        this._initialized = false;
        this._eventHandler = null;
    }

    init() {
        if (this._initialized) return this;

        this.renderer
            .on({
                onSearch: () => this.search(),
                onReset: () => this.reset(),
                onRefresh: () => this.refresh(),
                onPrev: () => this.prevPage(),
                onNext: () => this.nextPage()
            })
            .render();
        const instanceEventName = `stats:detail_${this._instanceId}`;
        if (this._eventHandler) {
            document.removeEventListener(instanceEventName, this._eventHandler);
        }
        
        this._eventHandler = (e) => {
            this.showDetail(e.detail.matchId);
        };
        document.addEventListener(instanceEventName, this._eventHandler);

        this._initialized = true;
        return this;
    }
    destroy() {
        const instanceEventName = `stats:detail_${this._instanceId}`;
        if (this._eventHandler) {
            document.removeEventListener(instanceEventName, this._eventHandler);
            this._eventHandler = null;
        }
        if (this.dialog.isOpen()) {
            this.dialog._close();
        }
        this._initialized = false;
    }

    async load() {
        this.renderer.showLoading();

        try {
            await Promise.all([
                this._loadSummary(),
                this._loadList()
            ]);
        } catch (err) {
            this.renderer.showError(err.message, () => this.load());
        }
    }

    async refresh() {
        Cache.clear();
        this.store.resetPage();
        await this.load();
    }

    async search() {
        const values = this.renderer.getFilterValues();
        this.store.updateFilters(values);
        await this.load();
    }

    reset() {
        this.renderer.resetFilters();
        this.store.updateFilters({ gameType: '', dateFrom: '', dateTo: '', keyword: '' });
        this.load();
    }

    prevPage() {
        if (this.store.page > 1) {
            this.store.page--;
            this._loadList();
        }
    }

    nextPage() {
        if (this.store.page < this.store.totalPages) {
            this.store.page++;
            this._loadList();
        }
    }
    async showDetail(matchId) {
        if (this.dialog.isOpen()) {
            return;
        }
        this.dialog.showLoading();
        try {
            const detail = await StatsApi.getDetail(matchId);
            this.dialog.showDetail(detail, this.userId);
        } catch (err) {
            this.dialog.showError(err.message);
        }
    }
    
    async _loadSummary() {
        const cacheKey = `summary_${this.userId}`;
        let summary = Cache.get(cacheKey);

        if (!summary) {
            summary = await StatsApi.getSummary();
            Cache.set(cacheKey, summary);
        }

        this.store.summary = summary;
        this.renderer.renderSummary(summary);
    }

    async _loadList() {
        const filters = {
            ...this.store.filters,
            page: this.store.page,
            pageSize: this.store.pageSize
        };

        const cacheKey = this.store.getCacheKey();
        let result = Cache.get(cacheKey);

        if (!result) {
            result = await StatsApi.getList(filters);
            Cache.set(cacheKey, result);
        }

        this.store.records = result.records || [];
        this.store.total = result.total || 0;

        this.renderer.renderList(this.store.records, this.userId);
        this.renderer.renderPagination(this.store.page, this.store.totalPages);
    }
}
const _instances = new Map();
export function YhMokTTCreateStatsModule(userId, container) {
    for (const [key, instance] of _instances) {
        if (instance.renderer.container === container) {
            instance.destroy();
            _instances.delete(key);
            break;
        }
    }
    const controller = new StatsController(userId, container);
    controller.init();
    const instanceKey = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    _instances.set(instanceKey, controller);
    return controller;
}

export function YhMokTTisWithin180s(targetTimestamp) {
    const now = Math.floor(Date.now() / 1000);
    return targetTimestamp >= now && targetTimestamp - now <= 180;
}