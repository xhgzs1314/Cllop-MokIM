<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php';
$qx_max_tmp1 = true;
$q_suname = null;
$tcodelogins = $_COOKIE[generateAutoWebsiteIdentifier(true) . "_log"] ?? 'null';
if ($tcodelogins == 'null') {
    $qx_max_tmp1 = false;
} else {
    require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php';
    $decodeers = new TmdbaseauthdownyhoDecrypt(60000 * 60 * 2);
    $decodeddata = $decodeers->writebacknewwords($tcodelogins);
    if (!$decodeddata) {
        $qx_max_tmp1 = false;
    }
    $decodeddata2 = encrypt($decodeddata, 'D', generateAutoWebsiteIdentifier(true));
    if (!$decodeddata2) {
        $qx_max_tmp1 = false;
    }
    $tarray = explode('<:>', $decodeddata2);
    if (!isset($tarray[2]) || empty($tarray[2])) {
        $qx_max_tmp1 = false;
    }
    $q_suname = trim($tarray[2]);
}

if (!$qx_max_tmp1) {
    header("Location: /use/user/");
    exit;
}

require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php';
if (mokim_hasOutstandingLoan($conn, $q_suname)) {
    die('您的信誉分过低,无法与其它玩家联机');
}

$roomId = isset($_GET['room']) ? trim($_GET['room']) : '';
if (empty($roomId)) {
    die('房间号无效');
}

$conn->close();
?>
<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>拼图竞速 - 对战中</title>
    <link rel="stylesheet" href="/ast/fontawe/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: #0f0f1a;
            color: #e0e0e0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px;
        }

        ::-webkit-scrollbar {
            width: 6px;
        }

        ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #667eea, #764ba2);
            border-radius: 4px;
        }

        .top-bar {
            width: 100%;
            max-width: 900px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 8px;
        }

        .top-bar .room-id {
            font-size: 16px;
            font-weight: 600;
            color: #409eff;
            background: rgba(64, 158, 255, 0.15);
            padding: 4px 14px;
            border-radius: 8px;
        }

        .top-bar .room-status {
            padding: 4px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
        }

        .room-status.playing {
            background: rgba(245, 108, 108, 0.2);
            color: #f56c6c;
        }

        .room-status.ended {
            background: rgba(144, 147, 153, 0.2);
            color: #909399;
        }

        .top-bar .exit-btn {
            padding: 6px 16px;
            border: none;
            border-radius: 8px;
            background: rgba(245, 108, 108, 0.15);
            color: #f56c6c;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.3s;
        }

        .top-bar .exit-btn:hover {
            background: rgba(245, 108, 108, 0.3);
        }

        .game-container {
            width: 100%;
            max-width: 900px;
            display: grid;
            grid-template-columns: 1fr 280px;
            gap: 16px;
            flex: 1;
        }

        .puzzle-wrapper {
            background: rgba(255, 255, 255, 0.04);
            border-radius: 16px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.06);
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .puzzle-wrapper .puzzle-title {
            font-size: 14px;
            color: #888;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            justify-content: center;
        }

        #puzzle-container {
            position: relative;
            width: 100%;
            max-width: 500px;
            aspect-ratio: 1/1;
            background: #1a1a2e;
            border-radius: 12px;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.06);
        }

        #puzzle-grid {
            position: absolute;
            inset: 0;
            display: grid;
            gap: 0;
        }

        #puzzle-pieces {
            position: absolute;
            inset: 0;
        }

        .puzzle-piece {
            position: absolute;
            background-size: var(--puzzle-size) var(--puzzle-size);
            border: 1px solid rgba(255, 255, 255, 0.2);
            cursor: grab;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
            user-select: none;
            -webkit-user-select: none;
        }

        .puzzle-piece:active {
            cursor: grabbing;
        }

        .puzzle-piece:hover:not(.placed):not(.disabled) {
            transform: scale(1.04);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            z-index: 10;
        }

        .puzzle-piece.placed {
            cursor: default;
        }

        .puzzle-piece.disabled {
            cursor: not-allowed;
            opacity: 0.6;
        }

        .puzzle-piece.correct-anim {
            animation: correctPulse 0.5s ease;
        }

        @keyframes correctPulse {

            0%,
            100% {
                transform: scale(1);
            }

            50% {
                transform: scale(1.08);
                box-shadow: 0 0 30px rgba(82, 196, 26, 0.5);
            }
        }

        .puzzle-piece.selected {
            border: 3px solid #409eff !important;
            box-shadow: 0 0 25px rgba(64, 158, 255, 0.5) !important;
            z-index: 20;
        }

        .grid-hover {
            transition: background-color 0.2s ease;
        }

        .grid-hover:hover {
            background-color: rgba(64, 158, 255, 0.08);
        }


        .overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(6px);
            z-index: 30;
            border-radius: 12px;
        }

        .overlay.hidden {
            display: none;
        }

        .overlay-bg {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 12px;
        }

        .overlay-content {
            position: relative;
            text-align: center;
            padding: 24px;
            z-index: 1;
        }

        .overlay-content .icon {
            font-size: 48px;
            margin-bottom: 12px;
        }

        .overlay-content h3 {
            font-size: 22px;
            margin-bottom: 8px;
        }

        .overlay-content p {
            color: #aaa;
            font-size: 14px;
            margin-bottom: 16px;
        }


        .side-panel {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .panel-card {
            background: rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            padding: 16px;
            border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .panel-card .panel-title {
            font-size: 13px;
            color: #888;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }


        .player-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            border-radius: 8px;
            margin-bottom: 6px;
            background: rgba(255, 255, 255, 0.04);
        }

        .player-item:last-child {
            margin-bottom: 0;
        }

        .player-item .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
            color: #fff;
            flex-shrink: 0;
        }

        .player-item .avatar.me {
            background: linear-gradient(135deg, #409eff, #3a7bd5);
        }

        .player-item .avatar.opponent {
            background: linear-gradient(135deg, #e6a23c, #d4892c);
        }

        .player-item .avatar.winner {
            background: linear-gradient(135deg, #52c41a, #389e0d);
        }

        .player-item .info {
            flex: 1;
            min-width: 0;
        }

        .player-item .info .name {
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .player-item .info .name .badge {
            font-size: 10px;
            background: rgba(64, 158, 255, 0.2);
            color: #409eff;
            padding: 0 8px;
            border-radius: 10px;
            margin-left: 4px;
        }

        .player-item .info .progress-text {
            font-size: 12px;
            color: #888;
        }

        .player-item .status-icon {
            font-size: 18px;
            flex-shrink: 0;
        }

        .progress-track {
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            margin-top: 4px;
            overflow: hidden;
        }

        .progress-track .bar {
            height: 100%;
            border-radius: 2px;
            transition: width 0.3s ease;
        }

        .progress-track .bar.me {
            background: #409eff;
        }

        .progress-track .bar.opponent {
            background: #e6a23c;
        }

        .progress-track .bar.winner {
            background: #52c41a;
        }


        .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            padding: 4px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .info-row .label {
            color: #888;
        }

        .info-row .value {
            color: #e0e0e0;
            font-weight: 500;
        }


        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .btn-primary {
            background: #409eff;
            color: #fff;
        }

        .btn-primary:hover:not(:disabled) {
            background: #66b1ff;
            box-shadow: 0 4px 20px rgba(64, 158, 255, 0.3);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: #e0e0e0;
        }

        .btn-secondary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
        }

        .btn-success {
            background: #52c41a;
            color: #fff;
        }

        .btn-success:hover:not(:disabled) {
            background: #73d13d;
            box-shadow: 0 4px 20px rgba(82, 196, 26, 0.3);
        }

        .btn-danger {
            background: #f56c6c;
            color: #fff;
        }

        .btn-danger:hover:not(:disabled) {
            background: #f78989;
        }

        .btn-block {
            width: 100%;
        }

        .btn-group {
            display: flex;
            gap: 8px;
        }

        .btn-group .btn {
            flex: 1;
        }

        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 340px;
        }

        .toast-item {
            padding: 10px 18px;
            border-radius: 10px;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            color: #fff;
            font-size: 13px;
            animation: slideIn 0.3s ease;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .toast-item.success {
            border-left: 3px solid #52c41a;
        }

        .toast-item.error {
            border-left: 3px solid #f56c6c;
        }

        .toast-item.warning {
            border-left: 3px solid #e6a23c;
        }

        .toast-item.info {
            border-left: 3px solid #409eff;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(20px);
            }

            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .connection-status {
            font-size: 12px;
            color: #666;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .connection-status .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
        }

        .connection-status .dot.online {
            background: #52c41a;
            box-shadow: 0 0 10px rgba(82, 196, 26, 0.3);
        }

        .connection-status .dot.offline {
            background: #f56c6c;
            box-shadow: 0 0 10px rgba(245, 108, 108, 0.3);
        }

        .bottom-bar {
            width: 100%;
            max-width: 900px;
            margin-top: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 20px;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.06);
        }

        @media (max-width: 700px) {
            .game-container {
                grid-template-columns: 1fr;
            }

            .side-panel {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }

            .top-bar {
                flex-direction: column;
                align-items: stretch;
                text-align: center;
            }

            .top-bar .room-info {
                justify-content: center;
                flex-wrap: wrap;
            }
        }

        @media (max-width: 500px) {
            .side-panel {
                grid-template-columns: 1fr;
            }

            body {
                padding: 10px;
            }

            .puzzle-wrapper {
                padding: 12px;
            }
        }
    </style>
</head>

<body>

    <div class="toast-container" id="toastContainer"></div>
    <div class="top-bar">
        <div class="room-info">
            <span class="room-id"><i class="fas fa-hashtag"></i> <span id="roomIdDisplay">------</span></span>
            <span class="room-status playing" id="roomStatus">🎮 对局中</span>
            <span style="font-size:13px;color:#888;" id="difficultyDisplay">🧩 中等</span>
        </div>
        <div>
            <button class="exit-btn" onclick="surrenderGame()">
                <i class="fas fa-sign-out-alt"></i> 投降
            </button>
        </div>
    </div>
    <div class="game-container">
        <div class="puzzle-wrapper">
            <div class="puzzle-title">
                <span>🧩 拼图竞速</span>
                <span style="color:#666;">|</span>
                <span id="timerDisplay" style="font-family:monospace;color:#409eff;">00:00</span>
                <span style="color:#666;">|</span>
                <span id="movesDisplay" style="color:#e6a23c;">0 步</span>
            </div>
            <div id="puzzle-container">
                <div id="puzzle-grid"></div>
                <div id="puzzle-pieces"></div>
                <div class="overlay" id="waitingOverlay">
                    <div class="overlay-bg"></div>
                    <div class="overlay-content">
                        <div class="icon">⏳</div>
                        <h3>等待对手准备...</h3>
                        <p id="waitingMsg">请等待对手进入游戏</p>
                    </div>
                </div>
                <div class="overlay hidden" id="gameOverOverlay">
                    <div class="overlay-bg"></div>
                    <div class="overlay-content">
                        <div class="icon" id="resultIcon">🏆</div>
                        <h3 id="resultTitle">游戏结束</h3>
                        <p id="resultMsg">恭喜获胜！</p>
                        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                            <button class="btn btn-primary" onclick="backToRoom()">
                                <i class="fas fa-arrow-left"></i> 返回房间
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="side-panel">
            <div class="panel-card">
                <div class="panel-title"><i class="fas fa-users"></i> 玩家</div>
                <div id="playersList">
                    <div class="player-item">
                        <div class="avatar me">你</div>
                        <div class="info">
                            <div class="name">加载中...</div>
                            <div class="progress-text">0/0</div>
                            <div class="progress-track">
                                <div class="bar me" style="width:0%"></div>
                            </div>
                        </div>
                        <div class="status-icon">⏳</div>
                    </div>
                </div>
            </div>
            <div class="panel-card">
                <div class="panel-title"><i class="fas fa-info-circle"></i> 游戏信息</div>
                <div class="info-row"><span class="label">难度</span><span class="value" id="infoDifficulty">-</span></div>
                <div class="info-row"><span class="label">拼图大小</span><span class="value" id="infoSize">-</span></div>
                <div class="info-row"><span class="label">已用时间</span><span class="value" id="infoTime">00:00</span></div>
                <div class="info-row"><span class="label">移动步数</span><span class="value" id="infoMoves">0</span></div>
                <div class="info-row"><span class="label">对手进度</span><span class="value" id="infoOpponent">0%</span></div>
            </div>
            <div class="panel-card">
                <div class="panel-title"><i class="fas fa-gamepad"></i> 操作</div>
                <div class="btn-group">
                    <button class="btn btn-secondary" id="resetPuzzleBtn" onclick="resetPuzzle()">
                        <i class="fas fa-redo"></i> 重置
                    </button>
                </div>
                <div style="margin-top:8px;font-size:12px;color:#666;text-align:center;" id="gameHint">
                    点击拼图块交换位置
                </div>
            </div>
        </div>
    </div>
    <div class="bottom-bar">
        <div class="connection-status">
            <span class="dot online" id="connectionDot"></span>
            <span id="connectionText">已连接</span>
        </div>
        <div style="font-size:12px;color:#666;">
            <i class="fas fa-user"></i> <span id="myNameDisplay">-</span>
        </div>
    </div>


    <div id="originalPreview" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:99999;align-items:center;justify-content:center;">
        <div style="background:#1a1a2e;border-radius:16px;padding:24px;max-width:90%;max-height:90%;border:1px solid rgba(255,255,255,0.06);">
            <img id="originalPreviewImg" src="" alt="原图" style="max-width:100%;max-height:70vh;border-radius:8px;object-fit:contain;">
        </div>
    </div>
    <script src="/ast/console.js"></script>
    <script src="/ast/logic/games/mokim-game-sdk.js"></script>
    <script>
        const newfuckingao = new ConsoleDetector();
        newfuckingao.startDetection();
        console.log = function() {};
        console.info = function() {};
        console.warn = function() {};
        console.error = function() {};
        const ROOM_ID = new URLSearchParams(window.location.search).get('room') || '';
        const MY_USER_ID = '<?php echo htmlspecialchars($q_suname ?? ''); ?>';
        let gameHeartbeatTimer = null;
        const channel = new MokimGameSDK.GameChannel('mokim_game_channel', 'game_puzzle_' + MY_USER_ID);
        channel.init();
        gameHeartbeatTimer = MokimGameSDK.startGameHeartbeat(channel, 12000);
        let puzzleRows = 4;
        let puzzleCols = 4;
        let puzzlePieces = [];
        let firstSelected = null;
        let isGamePlaying = false;
        let isGameCompleted = false;
        let isShowingOriginal = false;
        let originalImageData = null;
        let moves = 0;
        let timerInterval = null;
        let gameSeconds = 0;
        let myProgress = 0;
        let totalPieces = 16;
        let opponentProgress = 0;
        let opponentName = '对手';
        let gameResult = null;
        let isWaitingForGame = true;
        const GameChannel = {
            _channel: null,
            _listenerId: 'game_puzzle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            _messageHandlers: new Map(),
            _isConnected: false,

            init() {
                try {
                    this._channel = new BroadcastChannel('mokim_game_channel');
                    this._channel.onmessage = this._handleMessage.bind(this);
                    console.log('[Puzzle] 通道已连接');
                    this._registerListener();
                    setTimeout(() => {
                        this.sendGameMessage('game_room_info', {
                            roomId: ROOM_ID
                        });
                    }, 300);
                } catch (e) {
                    console.error('[Puzzle] 通道初始化失败:', e);
                    showToast('连接失败，请刷新重试', 'error');
                }
            },

            _handleMessage(event) {
                const {
                    type,
                    data,
                    listenerId
                } = event.data || {};
                if (type === 'game_message' && data) {
                    this._handleGameMessage(data);
                }
                if (type === 'game_listener_registered' && listenerId === this._listenerId) {
                    this._isConnected = true;
                    document.getElementById('connectionDot').className = 'dot online';
                    document.getElementById('connectionText').textContent = '已连接';
                }
            },

            _handleGameMessage(msg) {
                for (const handler of this._messageHandlers.values()) {
                    try {
                        handler(msg);
                    } catch (e) {
                        console.error('Handler error:', e);
                    }
                }
            },

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
            },

            onMessage(handler) {
                const id = 'handler_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
                this._messageHandlers.set(id, handler);
                return id;
            },

            offMessage(id) {
                this._messageHandlers.delete(id);
            },

            sendGameMessage(type, data = {}) {
                if (this._channel) {
                    this._channel.postMessage({
                        type: 'game_send_message',
                        data: {
                            type,
                            data
                        }
                    });
                }
            },

            isConnected() {
                return this._isConnected;
            }
        };

        function hideWaitingOverlay() {
            const overlay = document.getElementById('waitingOverlay');
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
                isWaitingForGame = false;
                console.log('[Puzzle] 等待覆盖层已隐藏');
            }
        }

        function showWaitingOverlay(message) {
            const overlay = document.getElementById('waitingOverlay');
            if (overlay) {
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
                const msgEl = document.getElementById('waitingMsg');
                if (msgEl && message) {
                    msgEl.textContent = message;
                }
                isWaitingForGame = true;
                console.log('[Puzzle] 等待覆盖层已显示:', message);
            }
        }

        function initPuzzle(rows, cols, imageUrl) {
            puzzleRows = rows;
            puzzleCols = cols;
            totalPieces = rows * cols;
            myProgress = 0;
            moves = 0;
            gameSeconds = 0;
            isGamePlaying = false;
            isGameCompleted = false;
            firstSelected = null;
            document.getElementById('movesDisplay').textContent = '0 步';
            document.getElementById('infoMoves').textContent = '0';
            document.getElementById('infoSize').textContent = `${rows}×${cols}`;
            document.getElementById('gameHint').textContent = '加载图片中...';
            showWaitingOverlay('正在加载拼图...');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                originalImageData = canvas.toDataURL('image/jpeg');
                document.getElementById('originalPreviewImg').src = originalImageData;
                renderPuzzle(originalImageData);
                document.getElementById('gameHint').textContent = '点击拼图块交换位置';
                if (isGamePlaying) {
                    hideWaitingOverlay();
                } else {
                    showWaitingOverlay('等待游戏开始...');
                }
                resetPuzzle();
            };
            img.onerror = function() {
                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 400;
                const ctx = canvas.getContext('2d');
                const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8A80', '#B39DDB', '#FFD54F'];
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        ctx.fillStyle = colors[(i + j) % colors.length];
                        ctx.fillRect(j * 400 / cols, i * 400 / rows, 400 / cols, 400 / rows);
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(j * 400 / cols, i * 400 / rows, 400 / cols, 400 / rows);
                        ctx.fillStyle = '#333';
                        ctx.font = '14px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(`${i+1},${j+1}`, j * 400 / cols + 400 / cols / 2, i * 400 / rows + 400 / rows / 2);
                    }
                }
                originalImageData = canvas.toDataURL('image/jpeg');
                document.getElementById('originalPreviewImg').src = originalImageData;
                renderPuzzle(originalImageData);
                document.getElementById('gameHint').textContent = '点击拼图块交换位置';
                if (isGamePlaying) {
                    hideWaitingOverlay();
                } else {
                    showWaitingOverlay('等待游戏开始...');
                }
            };
            img.src = imageUrl || 'https://picsum.photos/400/400?random=' + Date.now();
        }

        function shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        function renderPuzzle(imageData) {
            const container = document.getElementById('puzzle-container');
            const grid = document.getElementById('puzzle-grid');
            const piecesContainer = document.getElementById('puzzle-pieces');
            grid.innerHTML = '';
            piecesContainer.innerHTML = '';
            puzzlePieces = [];
            const containerSize = Math.min(container.clientWidth || 500, container.clientHeight || 500);
            container.style.setProperty('--puzzle-size', `${containerSize}px`);
            grid.style.gridTemplateColumns = `repeat(${puzzleCols}, 1fr)`;
            grid.style.gridTemplateRows = `repeat(${puzzleRows}, 1fr)`;
            for (let i = 0; i < puzzleRows; i++) {
                for (let j = 0; j < puzzleCols; j++) {
                    const cell = document.createElement('div');
                    cell.className = 'grid-hover';
                    cell.dataset.row = i;
                    cell.dataset.col = j;
                    grid.appendChild(cell);
                }
            }

            const pieceWidth = containerSize / puzzleCols;
            const pieceHeight = containerSize / puzzleRows;
            let pieces = [];
            for (let i = 0; i < puzzleRows; i++) {
                for (let j = 0; j < puzzleCols; j++) {
                    pieces.push({
                        correctRow: i,
                        correctCol: j,
                        currentRow: i,
                        currentCol: j
                    });
                }
            }
            let shuffled = false;
            let attempts = 0;
            while (!shuffled && attempts < 50) {
                shuffleArray(pieces);
                let mismatchCount = 0;
                for (const p of pieces) {
                    if (p.correctRow !== p.currentRow || p.correctCol !== p.currentCol) {
                        mismatchCount++;
                    }
                }
                if (mismatchCount >= 2) {
                    shuffled = true;
                }
                attempts++;
            }

            for (const p of pieces) {
                const piece = document.createElement('div');
                piece.className = 'puzzle-piece';
                piece.style.width = `${pieceWidth}px`;
                piece.style.height = `${pieceHeight}px`;
                piece.style.left = `${p.currentCol * pieceWidth}px`;
                piece.style.top = `${p.currentRow * pieceHeight}px`;
                piece.style.backgroundPosition = `-${p.correctCol * pieceWidth}px -${p.correctRow * pieceHeight}px`;
                piece.style.backgroundImage = `url(${imageData})`;
                piece.dataset.correctRow = p.correctRow;
                piece.dataset.correctCol = p.correctCol;
                piece.dataset.currentRow = p.currentRow;
                piece.dataset.currentCol = p.currentCol;
                piece.addEventListener('click', () => handlePieceClick(piece));
                puzzlePieces.push(piece);
                piecesContainer.appendChild(piece);
            }
            myProgress = countPlacedPieces();
            if (!isGamePlaying && !isGameCompleted) {
                showWaitingOverlay('等待游戏开始...');
            } else if (isGamePlaying) {
                hideWaitingOverlay();
            }
            updateProgressDisplay();
        }

        function handlePieceClick(piece) {
            if (!isGamePlaying || isGameCompleted || isShowingOriginal) return;
            if (piece.classList.contains('disabled')) return;

            if (firstSelected === null) {
                firstSelected = piece;
                piece.classList.add('selected');
            } else if (firstSelected === piece) {
                piece.classList.remove('selected');
                firstSelected = null;
            } else {
                swapPieces(firstSelected, piece);
                firstSelected.classList.remove('selected');
                firstSelected = null;
                moves++;
                document.getElementById('movesDisplay').textContent = moves + ' 步';
                document.getElementById('infoMoves').textContent = moves;
                const placed = countPlacedPieces();
                myProgress = placed;
                updateProgressDisplay();
                reportProgress(placed);
                if (placed === totalPieces) {
                    isGameCompleted = true;
                    for (const p of puzzlePieces) {
                        p.classList.add('correct-anim');
                    }
                    reportComplete();
                }
            }
        }

        function swapPieces(piece1, piece2) {
            const tempLeft = piece1.style.left;
            const tempTop = piece1.style.top;
            const tempRow = piece1.dataset.currentRow;
            const tempCol = piece1.dataset.currentCol;
            piece1.style.left = piece2.style.left;
            piece1.style.top = piece2.style.top;
            piece1.dataset.currentRow = piece2.dataset.currentRow;
            piece1.dataset.currentCol = piece2.dataset.currentCol;
            piece2.style.left = tempLeft;
            piece2.style.top = tempTop;
            piece2.dataset.currentRow = tempRow;
            piece2.dataset.currentCol = tempCol;
        }

        function countPlacedPieces() {
            let count = 0;
            for (const p of puzzlePieces) {
                if (parseInt(p.dataset.correctRow) === parseInt(p.dataset.currentRow) &&
                    parseInt(p.dataset.correctCol) === parseInt(p.dataset.currentCol)) {
                    count++;
                }
            }
            return count;
        }

        function updateProgressDisplay() {
            const pct = totalPieces > 0 ? Math.round((myProgress / totalPieces) * 100) : 0;
            const meEl = document.querySelector('.player-item .bar.me');
            if (meEl) meEl.style.width = pct + '%';
            const textEl = document.querySelector('.player-item .progress-text');
            if (textEl) textEl.textContent = `${myProgress}/${totalPieces} (${pct}%)`;
            const oppPct = totalPieces > 0 ? Math.round((opponentProgress / totalPieces) * 100) : 0;
            document.getElementById('infoOpponent').textContent = oppPct + '%';
            const oppBar = document.querySelector('.player-item .bar.opponent');
            if (oppBar) oppBar.style.width = oppPct + '%';
        }

        function reportProgress(placed) {
            channel.sendGameMessage('game_action', {
                action: 'puzzle_progress',
                actionData: {
                    placed
                }
            });
        }

        function reportComplete() {
            channel.sendGameMessage('game_action', {
                action: 'puzzle_complete',
                actionData: {}
            });
        }

        function handleGameMessage(msg) {
            switch (msg.type) {
                case 'game_room_info':
                    channel.sendGameMessage('game_action', {
                        action: 'puzzle_get_config',
                        actionData: {}
                    });
                    handleRoomInfo(msg.data);
                    break;

                case 'game_player_list':
                    handlePlayerList(msg.data);
                    break;

                case 'game_started':
                    handleGameStarted(msg.data);
                    break;

                case 'game_state_update':
                    console.log('[Puzzle] 🔄 game_state_update 收到, 数据:', msg.data);
                    handleStateUpdate(msg.data);
                    break;

                case 'game_over':
                    handleGameOver(msg.data);
                    break;

                case 'game_custom':
                    handleCustom(msg.data);
                    break;

                case 'game_error':
                    showToast(msg.msg || '操作失败', 'error');
                    break;

                case 'game_action_error':
                    console.warn('[Puzzle] ⚠️ game_action_error:', msg.msg);
                    showToast(msg.msg || '动作执行失败', 'warning');
                    break;

                case 'game_kicked':
                    showToast('你被房主踢出房间', 'error');
                    setTimeout(() => window.location.href = '/', 1500);
                    break;

                case 'game_player_left':
                    showToast(msg.data?.message || '有玩家离开了游戏', 'warning');
                    break;

                default:
                    console.log('[Puzzle] ❓ 未处理的消息类型:', msg.type);
            }
        }

        // 注册消息处理器
        channel.onMessage(handleGameMessage);

        function handleRoomInfo(data) {
            document.getElementById('roomIdDisplay').textContent = data.roomId || ROOM_ID;
            if (data.players) {
                renderPlayers(data.players);
            }
            if (data.status === 'playing') {
                hideWaitingOverlay();
                isGamePlaying = true;
                startTimer();
                document.getElementById('roomStatus').textContent = '🎮 对局中';
                document.getElementById('roomStatus').className = 'room-status playing';
            } else if (data.status === 'waiting') {
                showWaitingOverlay('等待游戏开始...');
                isGamePlaying = false;
                document.getElementById('roomStatus').textContent = '⏳ 等待中';
                document.getElementById('roomStatus').className = 'room-status waiting';
            } else if (data.status === 'ended') {
                hideWaitingOverlay();
                isGamePlaying = false;
                document.getElementById('roomStatus').textContent = '🏁 已结束';
                document.getElementById('roomStatus').className = 'room-status ended';
            }
        }

        function handlePlayerList(data) {
            renderPlayers(data.players || []);
        }

        function handleGameStarted(data) {
            hideWaitingOverlay();
            isGamePlaying = true;
            isGameCompleted = false;
            isWaitingForGame = false;
            document.getElementById('roomStatus').textContent = '🎮 对局中';
            document.getElementById('roomStatus').className = 'room-status playing';
            startTimer();
            const gs = data.gameState || {};
            console.log('[Puzzle] 🎮 game_started gameState:', gs);
            if (gs.rows && gs.cols) {
                const diffMap = {
                    easy: '简单',
                    medium: '中等',
                    hard: '困难'
                };
                document.getElementById('infoDifficulty').textContent = diffMap[gs.difficulty] || gs.difficulty;
                document.getElementById('infoSize').textContent = `${gs.rows}×${gs.cols}`;
                document.getElementById('difficultyDisplay').textContent = '🧩 ' + (diffMap[gs.difficulty] || gs.difficulty);
                const imageUrl = gs.imageUrl || 'https://picsum.photos/400/400?random=' + Date.now();
            }
            setTimeout(function() {
                hideWaitingOverlay();
            }, 300);

            showToast('游戏开始！', 'success');
        }

        function handleStateUpdate(data) {
            const gs = data.gameState || {};
            if (gs.progress) {
                console.log('[Puzzle] 🔄 遍历 progress:');
                for (const [pid, prog] of Object.entries(gs.progress)) {
                    console.log(`[Puzzle] 🔄 玩家 ${pid}:`, prog);
                    if (pid !== MY_USER_ID) {
                        console.log(`[Puzzle] 🔄 ✅ 更新对手进度: ${pid} -> ${prog.placed}/${prog.total}`);
                        opponentProgress = prog.placed || 0;
                        updateProgressDisplay();
                    } else {
                        console.log(`[Puzzle] 🔄 ⏭️ 跳过自己: ${pid}`);
                    }
                }
            } else {
                console.warn('[Puzzle] 🔄 ⚠️ gs.progress 不存在或为空');
            }
        }

        function handleGameOver(data) {
            isGamePlaying = false;
            isGameCompleted = true;
            stopTimer();
            hideWaitingOverlay();
            document.getElementById('roomStatus').textContent = '🏁 已结束';
            document.getElementById('roomStatus').className = 'room-status ended';

            const isWinner = data.winner === MY_USER_ID;
            const winnerName = data.winnerName || '对手';

            document.getElementById('resultIcon').textContent = isWinner ? '🏆' : '😊';
            document.getElementById('resultTitle').textContent = isWinner ? '🎉 恭喜获胜！' : '游戏结束';
            document.getElementById('resultMsg').textContent = isWinner ?
                `你率先完成了拼图！` :
                `${winnerName} 率先完成了拼图`;
            document.getElementById('gameOverOverlay').classList.remove('hidden');
            if (data.players) {
                renderPlayers(data.players);
            }

            showToast(isWinner ? '🎉 你赢了！' : '对手赢了，继续加油！', isWinner ? 'success' : 'info');

            if (data.scores) {
                const myScore = data.scores[MY_USER_ID] || 0;
                if (myScore > 0) {
                    showToast(`获得 ${myScore} 积分`, 'success');
                }
            }
        }

        function handleCustom(data) {
            const action = data.action;
            switch (action) {
                case 'puzzle_config': {
                    const datas = data.roomConfig;
                    hideWaitingOverlay();
                    isWaitingForGame = false;
                    const rows = datas.rows || 4;
                    const cols = datas.cols || 4;
                    const imageUrl = datas.imageUrl || 'https://picsum.photos/400/400?random=' + Date.now();
                    const diffMap = {
                        easy: '简单',
                        medium: '中等',
                        hard: '困难'
                    };
                    document.getElementById('infoDifficulty').textContent = diffMap[datas.difficulty] || datas.difficulty;
                    document.getElementById('infoSize').textContent = `${rows}×${cols}`;
                    document.getElementById('difficultyDisplay').textContent = '🧩 ' + (diffMap[datas.difficulty] || datas.difficulty);
                    initPuzzle(rows, cols, imageUrl);
                    if (data.status === 'playing') {
                        setTimeout(function() {
                            hideWaitingOverlay();
                        }, 200);
                        isGamePlaying = true;
                        document.getElementById('roomStatus').textContent = '🎮 对局中';
                        document.getElementById('roomStatus').className = 'room-status playing';
                        startTimer();
                        showToast('游戏开始！', 'success');
                    }
                    break;
                }
                case 'puzzle_game_start':
                    break;

                case 'puzzle_opponent_progress':
                    const prog = data.progress || {};
                    opponentProgress = prog.placed || 0;
                    updateProgressDisplay();
                    break;

                case 'puzzle_opponent_complete':
                    if (!data.isWinner) {
                        opponentProgress = totalPieces;
                        updateProgressDisplay();
                        showToast('对手已完成拼图！', 'warning');
                    }
                    break;

                case 'puzzle_player_ready':
                    break;

                case 'puzzle_opponent_info':
                    if (data.nickname) {
                        opponentName = data.nickname;
                    }
                    if (data.progress) {
                        opponentProgress = data.progress.placed || 0;
                        updateProgressDisplay();
                    }
                    break;

                case 'puzzle_win':
                    isGameCompleted = true;
                    for (const p of puzzlePieces) {
                        p.classList.add('correct-anim');
                    }
                    break;

                case 'puzzle_progress_ack':
                    break;

                default:
                    console.log('[Puzzle] ❓ 未处理的自定义action:', action);
            }
        }

        function renderPlayers(players) {
            const container = document.getElementById('playersList');
            let html = '';
            const me = players.find(p => p.playerId === MY_USER_ID);
            const opponent = players.find(p => p.playerId !== MY_USER_ID);
            if (me) {
                const pct = totalPieces > 0 ? Math.round((myProgress / totalPieces) * 100) : 0;
                const isWinner = gameResult && gameResult.winner === MY_USER_ID;
                html += `
                    <div class="player-item">
                        <div class="avatar me">${(me.nickname || '我').charAt(0).toUpperCase()}</div>
                        <div class="info">
                            <div class="name">${me.nickname || '我'} <span class="badge">你</span></div>
                            <div class="progress-text">${myProgress}/${totalPieces} (${pct}%)</div>
                            <div class="progress-track"><div class="bar me" style="width:${pct}%"></div></div>
                        </div>
                        <div class="status-icon">${isGameCompleted && isWinner ? '🏆' : isGamePlaying ? '🎮' : '⏳'}</div>
                    </div>
                `;
            }
            if (opponent) {
                const oppPct = totalPieces > 0 ? Math.round((opponentProgress / totalPieces) * 100) : 0;
                const isWinner = gameResult && gameResult.winner === opponent.playerId;
                const avatarClass = isWinner ? 'avatar winner' : 'avatar opponent';
                html += `
                    <div class="player-item">
                        <div class="${avatarClass}">${(opponent.nickname || '对手').charAt(0).toUpperCase()}</div>
                        <div class="info">
                            <div class="name">${opponent.nickname || '对手'}</div>
                            <div class="progress-track"><div class="bar opponent" style="width:${oppPct}%"></div></div>
                        </div>
                        <div class="status-icon">${isGameCompleted && isWinner ? '🏆' : isGamePlaying ? '🎮' : '⏳'}</div>
                    </div>
                `;
            }

            container.innerHTML = html || '<div style="color:#666;text-align:center;padding:8px;">等待玩家...</div>';

            document.getElementById('myNameDisplay').textContent = me ? (me.nickname || MY_USER_ID) : MY_USER_ID;
        }

        function startTimer() {
            stopTimer();
            gameSeconds = 0;
            timerInterval = setInterval(() => {
                gameSeconds++;
                const mins = String(Math.floor(gameSeconds / 60)).padStart(2, '0');
                const secs = String(gameSeconds % 60).padStart(2, '0');
                const timeStr = `${mins}:${secs}`;
                document.getElementById('timerDisplay').textContent = timeStr;
                document.getElementById('infoTime').textContent = timeStr;
            }, 1000);
        }

        function stopTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        function resetPuzzle() {
            if (!originalImageData || isGameCompleted) return;
            const pieces = document.querySelectorAll('.puzzle-piece');
            const containerSize = Math.min(
                document.getElementById('puzzle-container').clientWidth || 500,
                document.getElementById('puzzle-container').clientHeight || 500
            );
            const pieceWidth = containerSize / puzzleCols;
            const pieceHeight = containerSize / puzzleRows;
            pieces.forEach((piece, index) => {
                const row = Math.floor(index / puzzleCols);
                const col = index % puzzleCols;
                piece.style.left = `${col * pieceWidth}px`;
                piece.style.top = `${row * pieceHeight}px`;
                piece.dataset.currentRow = row;
                piece.dataset.currentCol = col;
                piece.classList.remove('selected', 'correct-anim', 'placed');
            });
            moves = 0;
            myProgress = 0;
            document.getElementById('movesDisplay').textContent = '0 步';
            document.getElementById('infoMoves').textContent = '0';
            updateProgressDisplay();
            reportProgress(0);
            showToast('已重置拼图', 'info');
        }
        function surrenderGame() {
            if (!isGamePlaying || isGameCompleted) {
                showToast('当前无法投降', 'warning');
                return;
            }
            if (!confirm('确认投降吗？投降将判对手获胜！')) return;
            channel.sendGameMessage('game_surrender', {});
            showToast('已投降', 'info');
        }
        function backToRoom() {
            window.location.href = `/use/activity/waiting/?room=${ROOM_ID}`;
        }

        function showToast(message, type = 'info', duration = 3000) {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast-item ${type}`;
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
        document.addEventListener('DOMContentLoaded', function() {
            if (!ROOM_ID) {
                document.getElementById('roomIdDisplay').textContent = '无效房间';
                showToast('房间号无效', 'error');
                return;
            }
            channel.sendGameMessage('game_room_info', {
                roomId: ROOM_ID
            });

            let isLeaving = false;
            window.addEventListener('beforeunload', function(e) {
                if (isGamePlaying && !isGameCompleted && !isLeaving) {
                    e.preventDefault();
                    e.returnValue = '游戏正在进行，离开将判对手获胜！';
                    return e.returnValue;
                }
            });

            window.addEventListener('unload', function() {
                isLeaving = true;
                if (isGamePlaying && !isGameCompleted) {
                    try {
                        channel.sendGameMessage('game_surrender', {
                            forceExit: true
                        });
                    } catch (e) {}
                    if (timerInterval) clearInterval(timerInterval);
                    if (gameHeartbeatTimer) {
                        clearInterval(gameHeartbeatTimer);
                        gameHeartbeatTimer = null;
                    }
                }
                channel.destroy();
            });
        });
    </script>

</body>

</html>