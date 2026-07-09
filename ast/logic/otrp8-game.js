(function () {
    'use strict';
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
    const userId = window.qmok_userid_id;
    const GameState = {
        gameList: [],              // 所有游戏列表
        gameListCacheTime: 0,      // 缓存时间
        CACHE_DURATION: 5 * 60 * 1000, // 缓存5分钟
        currentTab: 'create',
        searchTimer: null,
        searchCooldown: false,
        SEARCH_COOLDOWN_MS: 2000,  //搜索冷却
    };
    let modalOverlay = null;
    let modalContainer = null;
    function getGameList(forceRefresh = false) {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            if (!forceRefresh && GameState.gameList.length > 0 &&
                (now - GameState.gameListCacheTime) < GameState.CACHE_DURATION) {
                resolve(GameState.gameList);
                return;
            }
            if (!appState.ws || appState.ws.readyState !== 1) {
                reject(new Error('服务器未连接'));
                return;
            }
            const handler = function (event) {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'game_list') {
                        appState.ws.removeEventListener('message', handler);
                        GameState.gameList = msg.data.games || [];
                        GameState.gameListCacheTime = Date.now();
                        resolve(GameState.gameList);
                    }
                } catch (e) {
                }
            };
            appState.ws.addEventListener('message', handler);
            const timeout = setTimeout(() => {
                appState.ws.removeEventListener('message', handler);
                reject(new Error('获取游戏列表超时'));
            }, 10000);
            appState.ws.send(JSON.stringify({
                type: 'game_list',
                data: {}
            }));
            setTimeout(() => clearTimeout(timeout), 10000);
        });
    }
    function createRoom(gameType, roomName, password, maxPlayers = 4, settings = {}, betAmount = 0, betOdds = 2) {
        return new Promise((resolve, reject) => {
            if (!appState.ws || appState.ws.readyState !== 1) {
                reject(new Error('服务器未连接'));
                return;
            }

            const handler = function (event) {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'game_room_created') {
                        appState.ws.removeEventListener('message', handler);
                        resolve(msg.data);
                    } else if (msg.type === 'game_error') {
                        appState.ws.removeEventListener('message', handler);
                        reject(new Error(msg.msg || msg.data?.reason || '创建房间失败'));
                    }
                } catch (e) { }
            };

            appState.ws.addEventListener('message', handler);
            appState.ws.send(JSON.stringify({
                type: 'game_create_room',
                data: {
                    gameType: gameType,
                    maxPlayers: maxPlayers,
                    settings: {
                        roomName: roomName,
                        password: password || '',
                        ...settings
                    },
                    nickname: window.qmok_userid_id || '玩家',
                    betAmount: betAmount,
                    betOdds: betOdds
                }
            }));
            setTimeout(() => {
                appState.ws.removeEventListener('message', handler);
                reject(new Error('创建房间超时'));
            }, 15000);
        });
    }
    function joinRoom(roomId, password, nickname) {
        return new Promise((resolve, reject) => {
            if (!appState.ws || appState.ws.readyState !== 1) {
                reject(new Error('服务器未连接'));
                return;
            }
            const handler = function (event) {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'game_room_joined') {
                        appState.ws.removeEventListener('message', handler);
                        resolve(msg.data);
                    } else if (msg.type === 'game_error') {
                        appState.ws.removeEventListener('message', handler);
                        reject(new Error(msg.msg || msg.data?.reason || '加入房间失败'));
                    }
                } catch (e) {
                }
            };
            appState.ws.addEventListener('message', handler);
            appState.ws.send(JSON.stringify({
                type: 'game_join_room',
                data: {
                    roomId: roomId,
                    nickname: nickname || window.qmok_userid_id || '玩家'
                }
            }));
            setTimeout(() => {
                appState.ws.removeEventListener('message', handler);
                reject(new Error('加入房间超时'));
            }, 15000);
        });
    }
    function searchRooms(gameType) {
        return new Promise((resolve, reject) => {
            if (!appState.ws || appState.ws.readyState !== 1) {
                reject(new Error('服务器未连接'));
                return;
            }
            const handler = function (event) {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'game_room_list') {
                        appState.ws.removeEventListener('message', handler);
                        resolve(msg.data.rooms || []);
                    }
                } catch (e) {
                }
            };
            appState.ws.addEventListener('message', handler);
            appState.ws.send(JSON.stringify({
                type: 'game_room_list',
                data: {
                    gameType: gameType || null
                }
            }));
            setTimeout(() => {
                appState.ws.removeEventListener('message', handler);
                reject(new Error('搜索房间超时'));
            }, 10000);
        });
    }
    function canSearch() {
        if (GameState.searchCooldown) return false;
        GameState.searchCooldown = true;
        setTimeout(() => {
            GameState.searchCooldown = false;
        }, GameState.SEARCH_COOLDOWN_MS);
        return true;
    }
    function createModal() {
        if (modalOverlay) {
            modalOverlay.remove();
            modalOverlay = null;
            modalContainer = null;
        }

        modalOverlay = document.createElement('div');
        modalOverlay.className = 'game-hall-modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: gameModalFadeIn 0.3s ease;
        `;
        modalContainer = document.createElement('div');
        modalContainer.className = 'game-hall-modal';
        modalContainer.innerHTML = `
            <div class="game-hall-modal-header">
                <h2><i class="fas fa-gamepad"></i> 游戏大厅</h2>
                <button class="game-hall-modal-close" id="gameModalClose">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="game-hall-tabs">
                <div class="game-hall-tab active" data-tab="create">
                    <i class="fas fa-plus-circle"></i> 创建房间
                </div>
                <div class="game-hall-tab" data-tab="lobby">
                    <i class="fas fa-list"></i> 房间大厅
                </div>
                 <div class="game-hall-tab" data-tab="stats">
                <i class="fas fa-trophy" style="color:#ffd700;"></i> 战绩
            </div>
            </div>
            <div class="game-hall-body">
                <div class="game-hall-tab-content active" id="tab-create">
                </div>
                <div class="game-hall-tab-content" id="tab-lobby">
                </div>
                 <div class="game-hall-tab-content" id="tab-stats">
            </div>
            </div>
        `;
        modalOverlay.appendChild(modalContainer);
        modalOverlay.addEventListener('click', function (e) {
            if (e.target === this) {
                closeModal();
            }
        });
        modalContainer.querySelector('#gameModalClose').addEventListener('click', closeModal);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modalOverlay) {
                closeModal();
            }
        });
        modalContainer.querySelectorAll('.game-hall-tab').forEach(tab => {
            tab.addEventListener('click', function () {
                const tabName = this.dataset.tab;
                switchTab(tabName);
            });
        });
        document.body.appendChild(modalOverlay);
        renderCreateTab();
    }
    function switchTab(tabName) {
        GameState.currentTab = tabName;
        const tabs = modalContainer.querySelectorAll('.game-hall-tab');
        tabs.forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        const contents = modalContainer.querySelectorAll('.game-hall-tab-content');
        contents.forEach(c => c.classList.remove('active'));
        if (tabName === 'create') {
            document.getElementById('tab-create').classList.add('active');
            renderCreateTab();
        } else if (tabName === 'lobby') {
            document.getElementById('tab-lobby').classList.add('active');
            renderLobbyTab();
        } else if (tabName === 'stats') {
            const container = document.getElementById('tab-stats');
            container.classList.add('active');
            if (container && typeof YhMokTTCreateStatsModule === 'function') {
                if (!container._statsInited) {
                    try {
                        YhMokTTCreateStatsModule(window.qmok_userid_id, container);
                        container._statsInited = true;
                    } catch (e) {
                        console.error('[Stats] 初始化失败:', e);
                        container.innerHTML = `
                        <div style="text-align:center;padding:40px;color:#f56c6c;">
                            <i class="fas fa-exclamation-circle" style="font-size:32px;"></i>
                            <p>战绩模块加载失败</p>
                            <button onclick="location.reload()" style="padding:6px 20px;border:none;border-radius:4px;background:#409eff;color:#fff;cursor:pointer;">刷新重试</button>
                        </div>
                    `;
                    }
                }
            } else if (container && typeof YhMokTTCreateStatsModule !== 'function') {
                container.innerHTML = `
                <div style="text-align:center;padding:40px;color:#909399;">
                    <i class="fas fa-trophy" style="font-size:32px;color:#ffd700;"></i>
                    <p>战绩模块未加载</p>
                </div>
            `;
            }
        }
    }
    let selectedGameType = null;
    let isCreating = false;
    function renderCreateTab() {
        const container = document.getElementById('tab-create');
        if (!container) return;

        container.innerHTML = `
            <div class="game-form-group">
                <label>选择游戏 <span class="required">*</span></label>
                <div id="gameSelectGrid" class="game-select-grid">
                    <div class="game-loading-text"><i class="fas fa-spinner fa-pulse"></i> 加载游戏中...</div>
                </div>
                <div class="form-hint">请选择一个游戏类型</div>
            </div>
            <div class="game-form-group">
                <label>房间名称 <span class="required">*</span></label>
                <input type="text" class="game-form-control" id="gameRoomName" 
                       placeholder="请输入房间名称" maxlength="20">
            </div>
            <div class="game-form-row">
                <div class="game-form-group">
                    <label>房间密码</label>
                    <input type="password" class="game-form-control" id="gameRoomPassword" 
                           placeholder="留空表示无密码" maxlength="16">
                </div>
                <div class="game-form-group">
                    <label>最大人数</label>
                    <select class="game-form-control" id="gameMaxPlayers">
                        <option value="2">2人</option>
                        <option value="3">3人</option>
                        <option value="4" selected>4人</option>
                        <option value="6">6人</option>
                        <option value="8">8人</option>
                    </select>
                </div>
            </div>
            <div class="game-form-group bet-section" style="border:1px solid #e8e8e8;border-radius:8px;padding:12px;margin:10px 0;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <label style="margin:0;cursor:pointer;">
                    <input type="checkbox" id="gameBetEnable" style="margin-right:6px;">
                    🎲 启用押注
                </label>
                <span style="font-size:12px;color:#999;">(赢家获得 押注金 × 赔率)</span>
            </div>
            <div id="betSettingsRow" style="display:none;">
                <div class="game-form-row">
                    <div class="game-form-group">
                        <label>押注金额 (G币)</label>
                        <input type="number" class="game-form-control" id="gameBetAmount" 
                               placeholder="0" min="0" step="10" value="10">
                    </div>
                    <div class="game-form-group">
                        <label>赔率</label>
                        <select class="game-form-control" id="gameBetOdds">
                            <option value="1">1x</option>
                            <option value="2" selected>2x</option>
                            <option value="3">3x</option>
                            <option value="4">4x</option>
                            <option value="5">5x</option>
                            <option value="6">6x</option>
                            <option value="7">7x</option>
                            <option value="8">8x</option>
                            <option value="9">9x</option>
                            <option value="10">10x</option>
                        </select>
                    </div>
                </div>
                <div style="font-size:12px;color:#666;margin-top:4px;">
                    💰 赢家获得: <span id="betWinAmount">20</span> G币
                </div>
            </div>
        </div>
            <button class="game-btn game-btn-primary game-btn-block" id="gameCreateBtn" disabled>
                <i class="fas fa-plus"></i> 创建房间
            </button>
        `;
        const betEnable = document.getElementById('gameBetEnable');
        const betSettings = document.getElementById('betSettingsRow');
        const betAmount = document.getElementById('gameBetAmount');
        const betOdds = document.getElementById('gameBetOdds');
        const betWin = document.getElementById('betWinAmount');

        function updateBetPreview() {
            const amount = parseInt(betAmount?.value) || 0;
            const odds = parseInt(betOdds?.value) || 2;
            if (betWin) betWin.textContent = amount * odds;
        }

        if (betEnable) {
            betEnable.addEventListener('change', function () {
                betSettings.style.display = this.checked ? 'block' : 'none';
                updateBetPreview();
            });
        }
        if (betAmount) betAmount.addEventListener('input', updateBetPreview);
        if (betOdds) betOdds.addEventListener('change', updateBetPreview);

        loadGameListForSelect();

        const nameInput = document.getElementById('gameRoomName');
        const createBtn = document.getElementById('gameCreateBtn');
        nameInput.addEventListener('input', function () {
            updateCreateBtn();
        });
        createBtn.addEventListener('click', handleCreateRoom);
    }

    function loadGameListForSelect() {
        const grid = document.getElementById('gameSelectGrid');
        if (!grid) return;
        getGameList()
            .then(games => {
                if (!games || games.length === 0) {
                    grid.innerHTML = `<div class="game-empty-text">暂无可用游戏</div>`;
                    return;
                }
                grid.innerHTML = games.map(game => `
                    <div class="game-select-item" data-game="${game.gameType}">
                        <span class="game-icon">🎮</span>
                        <div class="game-name">${game.gameName || game.gameType}</div>
                        <div class="game-players">${game.minPlayers || 2}-${game.maxPlayers || 4}人</div>
                    </div>
                `).join('');
                grid.querySelectorAll('.game-select-item').forEach(item => {
                    item.addEventListener('click', function () {
                        grid.querySelectorAll('.game-select-item').forEach(el => el.classList.remove('selected'));
                        this.classList.add('selected');
                        selectedGameType = this.dataset.game;
                        updateCreateBtn();
                    });
                });
                const first = grid.querySelector('.game-select-item');
                if (first) {
                    first.classList.add('selected');
                    selectedGameType = first.dataset.game;
                    updateCreateBtn();
                }
            })
            .catch(err => {
                grid.innerHTML = `<div class="game-empty-text">加载失败: ${err.message}</div>`;
                showToast('加载游戏列表失败', 'error');
            });
    }

    function updateCreateBtn() {
        const btn = document.getElementById('gameCreateBtn');
        const nameInput = document.getElementById('gameRoomName');
        if (!btn || !nameInput) return;

        const name = nameInput.value.trim();
        btn.disabled = !selectedGameType || !name || isCreating;
    }
    async function handleCreateRoom() {
        if (isCreating) return;
        if(YhMokTTisWithin180s(window.qmok_userid_expire)){
            showToast('登录凭证将在约3分钟内过期,为保证数据安全和您的使用体验,此操作已被拦截', 'error');
            return false;
        }
        const nameInput = document.getElementById('gameRoomName');
        const passwordInput = document.getElementById('gameRoomPassword');
        const maxPlayersSelect = document.getElementById('gameMaxPlayers');
        const betEnableCheckbox = document.getElementById('gameBetEnable');
        const betAmountInput = document.getElementById('gameBetAmount');
        const betOddsSelect = document.getElementById('gameBetOdds');
        const roomName = nameInput.value.trim();
        const password = passwordInput.value.trim();
        const maxPlayers = parseInt(maxPlayersSelect.value) || 4;
        const betEnabled = betEnableCheckbox?.checked || false;
        const betAmount = betEnabled ? Math.max(0, parseInt(betAmountInput?.value) || 0) : 0;
        const betOdds = betEnabled ? Math.max(1, Math.min(10, parseInt(betOddsSelect?.value) || 2)) : 2;
        if (!selectedGameType) {
            showToast('请选择游戏类型', 'warning');
            return;
        }
        if (!roomName) {
            showToast('请输入房间名称', 'warning');
            nameInput.focus();
            return;
        }
        if (roomName.length > 6) {
            showToast('房间名称请控制在6个字以内', 'warning');
            return;
        }
        if (password) {
            if (password.length > 6) {
                showToast('房间密码请控制在6个字符以内', 'warning');
                return;
            }
        }
        if (betEnabled && betAmount <= 0) {
            showToast('请设置有效的押注金额', 'warning');
            betAmountInput?.focus();
            return;
        }

        isCreating = true;
        const btn = document.getElementById('gameCreateBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 创建中...';
        try {
            const result = await createRoom(
                selectedGameType,
                roomName,
                password,
                maxPlayers,
                {
                    roomName: roomName,
                    password: password,
                    betAmount: betAmount,
                    betOdds: betOdds
                },
                betAmount,
                betOdds
            );

            const roomId = result.roomId;
            const gameName = '经典游戏';
            const betText = betAmount > 0
                ? `🎲 押注: ${betAmount} G币 × ${betOdds}x (赢家获得 ${betAmount * betOdds} G币)`
                : '🎲 无押注 (娱乐模式)';
            const inviteContent = {
                text: `🎮 邀请你加入游戏！\n${betText}`,
                messageType: 'game',
                otherpastxfuks: {
                    roomId: roomId,
                    gameType: selectedGameType,
                    gameName: gameName,
                    betAmount: betAmount,
                    betOdds: betOdds,
                    betEnabled: betAmount > 0,
                    roomName: roomName || roomId
                }
            };
            if (appState.selectedContact) {
                const isGroup = appState.selectedContact.isGroup || false;
                if (isGroup) {
                    if (typeof sendGroupMessage === 'function') {
                        sendGroupMessage({
                            text: inviteContent.text,
                            messageType: 'game',
                            otherpastxfuks: inviteContent.otherpastxfuks
                        });
                    } else {
                        console.warn('sendGroupMessage 未定义');
                    }
                } else {
                    if (typeof sendMessage === 'function') {
                        sendMessage({
                            text: inviteContent.text,
                            messageType: 'game',
                            otherpastxfuks: inviteContent.otherpastxfuks
                        });
                    } else {
                        console.warn('sendMessage 未定义');
                    }
                }
            }
            showToast(`房间创建成功！${betEnabled ? `押注: ${betAmount} G币 × ${betOdds}x` : ''}`, 'success');
            setTimeout(() => {
                window.open(`/use/activity/waiting/?room=${roomId}`, '_blank');
            }, 500);
            setTimeout(() => {
                closeModal();
            }, 1500);
        } catch (err) {
            showToast(err.message || '创建房间失败', 'error');
        } finally {
            isCreating = false;
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus"></i> 创建房间';
            updateCreateBtn();
        }
    }
    let isSearching = false;
    let lobbyRooms = [];
    function renderLobbyTab() {
        const container = document.getElementById('tab-lobby');
        if (!container) return;

        container.innerHTML = `
            <div class="game-search-box">
                <input type="text" class="game-form-control" id="gameSearchInput" 
                       placeholder="输入房间号搜索..." maxlength="10">
                <button class="game-btn game-btn-primary" id="gameSearchBtn">
                    <i class="fas fa-search"></i> 搜索
                </button>
                <button class="game-btn game-btn-success" id="gameRefreshBtn">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <div id="gameRoomListContainer">
                <div class="game-room-loading"><i class="fas fa-spinner fa-pulse"></i> 加载房间列表...</div>
            </div>
        `;
        const searchInput = document.getElementById('gameSearchInput');
        const searchBtn = document.getElementById('gameSearchBtn');
        const refreshBtn = document.getElementById('gameRefreshBtn');
        searchBtn.addEventListener('click', function () {
            handleSearchRoom();
        });
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchRoom();
            }
        });
        refreshBtn.addEventListener('click', function () {
            const key = `wsroomss_${userId}`;
            const result = RateLimit.check(key, 30000);
            if (!result.allowed) {
                showToast('搜索过于频繁，请稍后再试', 'warning');
                return;
            }
            loadRoomList();
        });
        loadRoomList();
    }

    function handleSearchRoom() {
        if (!canSearch()) {
            showToast('搜索过于频繁，请稍后再试', 'warning');
            return;
        }
        const key = `wsrooms_${userId}`;
        const result = RateLimit.check(key, 30000);
        if (!result.allowed) {
            showToast('搜索过于频繁，请稍后再试', 'warning');
            return;
        }
        const input = document.getElementById('gameSearchInput');
        const roomId = input.value.trim().toUpperCase();
        if (!roomId) {
            loadRoomList();
            return;
        }
        showToast(`正在查找房间 ${roomId}...`, 'info');
        loadRoomList(roomId);
    }

    async function loadRoomList(filterRoomId = null) {
        const container = document.getElementById('gameRoomListContainer');
        if (!container) return;
        container.innerHTML = `<div class="game-room-loading"><i class="fas fa-spinner fa-pulse"></i> 加载房间列表中...</div>`;
        try {
            const rooms = await searchRooms(null);
            lobbyRooms = rooms;
            let filtered = rooms;
            if (filterRoomId) {
                filtered = rooms.filter(r => r.roomId.toUpperCase().includes(filterRoomId.toUpperCase()));
            }
            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="game-room-empty">
                        <i class="fas fa-door-open"></i>
                        <p>${filterRoomId ? '未找到匹配的房间' : '暂无可用房间'}</p>
                        <p style="font-size:13px;color:#aaa;">${filterRoomId ? '请检查房间号是否正确' : '去创建第一个房间吧！'}</p>
                    </div>
                `;
                return;
            }
            container.innerHTML = `
                <div class="game-room-list">
                    ${filtered.map(room => `
                        <div class="game-room-item" data-roomid="${room.roomId}">
                            <div class="room-info">
                                <div>
                                    <span class="room-id">${room.roomId}</span>
                                    <span class="room-game">🎮 ${room.gameType}</span>
                                    ${room.hasPassword ? '<span class="room-lock"><i class="fas fa-lock"></i></span>' : ''}
                                </div>
                                <div class="room-meta">
                                    <i class="fas fa-users"></i> ${room.playerCount || 0}/${room.maxPlayers || 4} 人
                                    <span style="margin-left:12px;">
                                        <span class="room-status ${room.status || 'waiting'}">${room.status === 'playing' ? '游戏中' : room.status === 'ended' ? '已结束' : '等待中'}</span>
                                    </span>
                                </div>
                            </div>
                            <div class="room-actions">
                                <button class="game-btn game-btn-success game-join-btn" data-roomid="${room.roomId}" 
                                        ${room.status === 'playing' || room.status === 'ended' ? 'disabled' : ''}>
                                    <i class="fas fa-sign-in-alt"></i> 加入
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.querySelectorAll('.game-join-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const roomId = this.dataset.roomid;
                    handleJoinRoom(roomId);
                });
            });
        } catch (err) {
            container.innerHTML = `
                <div class="game-room-error">
                    <i class="fas fa-exclamation-circle"></i> 加载失败: ${err.message}
                    <button class="game-btn game-btn-primary" style="margin-top:10px;padding:4px 16px;" onclick="loadRoomList()">
                        重试
                    </button>
                </div>
            `;
        }
    }
    async function handleJoinRoom(roomId) {
        if(YhMokTTisWithin180s(window.qmok_userid_expire)){
            showToast('登录凭证将在约3分钟内过期,为保证数据安全和您的使用体验,此操作已被拦截', 'error');
            return false;
        }
        const room = lobbyRooms.find(r => r.roomId === roomId);
        const hasPassword = room?.hasPassword || false;
        try {
            if (hasPassword) {
                const password = await showPasswordDialog(roomId);
                if (password === null) return;
                const result = await joinRoom(roomId, password);
                showToast('加入房间成功！', 'success');
                setTimeout(() => {
                    window.open(`/use/activity/waiting/?room=${roomId}`, '_blank');
                }, 500);
                setTimeout(closeModal, 1500);
            } else {
                const result = await joinRoom(roomId, '');
                showToast('加入房间成功！', 'success');
                setTimeout(() => {
                    window.open(`/use/activity/waiting/?room=${roomId}`, '_blank');
                }, 500);
                setTimeout(closeModal, 1500);
            }
        } catch (err) {
            showToast(err.message || '加入房间失败', 'error');
        }
    }
    function showPasswordDialog(roomId) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'game-password-overlay';
            overlay.innerHTML = `
                <div class="game-password-box">
                    <h3><i class="fas fa-lock" style="color:#e6a23c;"></i> 房间已加密</h3>
                    <p>房间 <strong>${roomId}</strong> 需要密码才能加入</p>
                    <div class="game-form-group">
                        <input type="password" class="game-form-control" id="gamePasswordInput" 
                               placeholder="请输入房间密码" maxlength="16" autofocus>
                    </div>
                    <div class="game-form-row">
                        <button class="game-btn" id="gamePasswordCancel">取消</button>
                        <button class="game-btn game-btn-primary" id="gamePasswordConfirm">
                            <i class="fas fa-sign-in-alt"></i> 加入
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const input = overlay.querySelector('#gamePasswordInput');
            const confirmBtn = overlay.querySelector('#gamePasswordConfirm');
            const cancelBtn = overlay.querySelector('#gamePasswordCancel');
            const cleanup = () => {
                overlay.remove();
            };
            const handleConfirm = () => {
                const password = input.value.trim();
                if (!password) {
                    showToast('请输入房间密码', 'warning');
                    input.focus();
                    return;
                }
                cleanup();
                resolve(password);
            };

            const handleCancel = () => {
                cleanup();
                resolve(null);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);

            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                }
                if (e.key === 'Escape') {
                    handleCancel();
                }
            });
            overlay.addEventListener('click', function (e) {
                if (e.target === this) {
                    handleCancel();
                }
            });
            setTimeout(() => input.focus(), 100);
        });
    }
    function showToast(message, type = 'info', duration = 3000) {
        const existing = document.querySelector('.game-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = `game-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    function closeModal() {
        if (modalOverlay) {
            modalOverlay.style.opacity = '0';
            modalOverlay.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (modalOverlay) {
                    modalOverlay.remove();
                    modalOverlay = null;
                    modalContainer = null;
                }
            }, 300);
        }
    }
    function openGameHall() {
        createModal();
    }
    window.MokimGameHall = {
        open: openGameHall,
        close: closeModal,
        getGameList: getGameList,
        createRoom: createRoom,
        joinRoom: joinRoom,
        searchRooms: searchRooms
    };
    document.addEventListener('DOMContentLoaded', function () {
        const checkInterval = setInterval(() => {
            const btn = document.getElementById('gamecenter_linkingyoume');
            if (btn) {
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    openGameHall();
                });
                clearInterval(checkInterval);
            }
        }, 500);
        setTimeout(() => clearInterval(checkInterval), 10000);
    });
    const existingBtn = document.getElementById('gamecenter_linkingyoume');
    if (existingBtn) {
        existingBtn.addEventListener('click', function (e) {
            e.preventDefault();
            openGameHall();
        });
    }
})();