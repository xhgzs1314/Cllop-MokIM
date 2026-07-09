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
    mokim_ttl_elegant_exit(
        '您当前未登录<a href="/use/user/">Click Me</a>',
        null,
        'error'
    );
}
$roomId = isset($_GET['room']) ? trim($_GET['room']) : '';
if (empty($roomId)) {
    mokim_ttl_elegant_exit(
        '房间号无效',
        null,
        'error'
    );
}
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php';
if (mokim_hasOutstandingLoan($conn, $q_suname)) {
    mokim_ttl_elegant_exit(
        '您的信誉分过低，无法与其它玩家进行联机',
        function () use ($conn) {
            $conn->close();
        },
        'error'
    );
}
if (YhMokTTisWithin180s()) {
    mokim_ttl_elegant_exit(
        '登录凭证将在约3分钟内过期,为保证数据安全和您的使用体验,此操作已被拦截',
        function () use ($conn) {
            $conn->close();
        },
        'error'
    );
}
$stmt = $conn->prepare("SELECT spkcin FROM mok_user WHERE id = ?");
$stmt->bind_param("s", $q_suname);
$stmt->execute();
$result = $stmt->get_result();
$userData = $result->fetch_assoc();
$gcoins = $userData['spkcin'] ?? 0;
$conn->close();
?>
<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>游戏准备室 - <?php echo htmlspecialchars($roomId); ?></title>
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
            padding: 20px;
        }

        .top-bar {
            width: 100%;
            max-width: 1200px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            margin-bottom: 24px;
        }

        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #667eea, #764ba2);
            border-radius: 4px;
            border: 2px solid transparent;
            background-clip: padding-box;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #764ba2, #667eea);
        }

        .top-bar .room-info {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .top-bar .room-id {
            font-size: 18px;
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

        .room-status.waiting {
            background: rgba(64, 158, 255, 0.2);
            color: #409eff;
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
            padding: 8px 20px;
            border: none;
            border-radius: 10px;
            background: rgba(245, 108, 108, 0.15);
            color: #f56c6c;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }

        .top-bar .exit-btn:hover {
            background: rgba(245, 108, 108, 0.3);
        }

        .main-layout {
            width: 100%;
            max-width: 1200px;
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 24px;
            flex: 1;
        }

        .players-grid-section {
            background: rgba(255, 255, 255, 0.04);
            border-radius: 16px;
            padding: 24px;
            border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .players-grid-section .section-title {
            font-size: 16px;
            font-weight: 500;
            color: #aaa;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .players-grid-section .section-title .count {
            color: #409eff;
            font-weight: 600;
        }

        .players-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 16px;
        }

        .player-card {
            background: rgba(255, 255, 255, 0.06);
            border-radius: 14px;
            padding: 20px 16px;
            text-align: center;
            transition: all 0.3s ease;
            border: 2px solid transparent;
            position: relative;
            min-height: 140px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .player-card:hover {
            background: rgba(255, 255, 255, 0.09);
            transform: translateY(-2px);
        }

        .player-card.is-host {
            border-color: #e6a23c;
            background: rgba(230, 162, 60, 0.08);
        }

        .player-card.is-self {
            border-color: #409eff;
            background: rgba(64, 158, 255, 0.08);
        }

        .player-card.is-ready {
            border-color: #52c41a;
            background: rgba(82, 196, 26, 0.08);
        }

        .player-card .avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #409eff, #3a7bd5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 10px;
            user-select: none;
            flex-shrink: 0;
        }

        .player-card .avatar.host-avatar {
            background: linear-gradient(135deg, #e6a23c, #d4892c);
        }

        .player-card .player-name {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 4px;
            word-break: break-all;
            max-width: 100%;
        }

        .player-card .player-status {
            font-size: 12px;
            padding: 2px 12px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.06);
        }

        .player-card .player-status.ready {
            color: #52c41a;
            background: rgba(82, 196, 26, 0.15);
        }

        .player-card .player-status.not-ready {
            color: #909399;
            background: rgba(144, 147, 153, 0.1);
        }

        .player-card .player-status.playing {
            color: #f56c6c;
            background: rgba(245, 108, 108, 0.15);
        }

        .player-card .host-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            font-size: 11px;
            background: rgba(230, 162, 60, 0.2);
            color: #e6a23c;
            padding: 2px 10px;
            border-radius: 10px;
        }

        .player-card .kick-btn {
            margin-top: 8px;
            padding: 4px 12px;
            border: none;
            border-radius: 6px;
            background: rgba(245, 108, 108, 0.15);
            color: #f56c6c;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s;
            display: none;
        }

        .player-card .kick-btn:hover {
            background: rgba(245, 108, 108, 0.3);
        }

        .player-card.is-host .kick-btn {
            display: none;
        }

        .player-card.is-self .kick-btn {
            display: none;
        }

        .player-card.show-kick .kick-btn {
            display: inline-block;
        }

        .player-card .empty-slot {
            color: #555;
            font-size: 13px;
        }

        .player-card.show-kick:hover {
            border-color: rgba(245, 108, 108, 0.4);
            box-shadow: 0 0 20px rgba(245, 108, 108, 0.05);
            cursor: default;
        }

        .player-card.show-kick .kick-btn {
            opacity: 0;
            transform: translateY(4px);
            transition: all 0.3s ease;
        }

        .player-card.show-kick:hover .kick-btn {
            opacity: 1;
            transform: translateY(0);
        }

        .player-card .empty-slot i {
            font-size: 32px;
            display: block;
            margin-bottom: 8px;
            opacity: 0.3;
        }

        .control-panel {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .control-panel .panel-card {
            background: rgba(255, 255, 255, 0.04);
            border-radius: 16px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .panel-card .panel-title {
            font-size: 14px;
            font-weight: 500;
            color: #aaa;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .panel-card .form-group {
            margin-bottom: 12px;
        }

        .panel-card .form-group label {
            display: block;
            font-size: 13px;
            color: #999;
            margin-bottom: 4px;
        }

        .panel-card .form-group input,
        .panel-card .form-group select {
            width: 100%;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.06);
            color: #e0e0e0;
            font-size: 14px;
            transition: all 0.3s;
            outline: none;
        }

        .panel-card .form-group input:focus,
        .panel-card .form-group select:focus {
            border-color: #409eff;
            background: rgba(255, 255, 255, 0.08);
        }

        .panel-card .form-group input:disabled,
        .panel-card .form-group select:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .panel-card .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .btn {
            padding: 10px 24px;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
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
            transform: translateY(-1px);
            box-shadow: 0 4px 20px rgba(64, 158, 255, 0.3);
        }

        .btn-success {
            background: #52c41a;
            color: #fff;
        }

        .btn-success:hover:not(:disabled) {
            background: #73d13d;
            transform: translateY(-1px);
            box-shadow: 0 4px 20px rgba(82, 196, 26, 0.3);
        }

        .btn-danger {
            background: #f56c6c;
            color: #fff;
        }

        .btn-danger:hover:not(:disabled) {
            background: #f78989;
            transform: translateY(-1px);
        }

        .btn-warning {
            background: #e6a23c;
            color: #fff;
        }

        .btn-warning:hover:not(:disabled) {
            background: #ebb563;
            transform: translateY(-1px);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: #e0e0e0;
        }

        .btn-secondary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
        }

        .btn-block {
            width: 100%;
        }

        .btn-group {
            display: flex;
            gap: 10px;
            margin-top: 4px;
        }

        .btn-group .btn {
            flex: 1;
        }

        .btn-ready {
            background: #52c41a;
            color: #fff;
        }

        .btn-ready:hover:not(:disabled) {
            background: #73d13d;
            box-shadow: 0 4px 20px rgba(82, 196, 26, 0.3);
        }

        .btn-unready {
            background: #f56c6c;
            color: #fff;
        }

        .btn-unready:hover:not(:disabled) {
            background: #f78989;
        }

        .bottom-bar {
            width: 100%;
            max-width: 1200px;
            margin-top: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .bottom-bar .connection-status {
            font-size: 13px;
            color: #888;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .bottom-bar .connection-status .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }

        .bottom-bar .connection-status .dot.online {
            background: #52c41a;
            box-shadow: 0 0 10px rgba(82, 196, 26, 0.3);
        }

        .bottom-bar .connection-status .dot.offline {
            background: #f56c6c;
            box-shadow: 0 0 10px rgba(245, 108, 108, 0.3);
        }

        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            z-index: 99999;
            display: none;
            align-items: center;
            justify-content: center;
        }

        .modal-overlay.active {
            display: flex;
        }

        .modal-box {
            background: #1a1a2e;
            border-radius: 20px;
            padding: 32px;
            max-width: 400px;
            width: 90%;
            border: 1px solid rgba(255, 255, 255, 0.06);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .modal-box h3 {
            font-size: 20px;
            margin-bottom: 12px;
        }

        .modal-box p {
            color: #aaa;
            font-size: 15px;
            margin-bottom: 20px;
            line-height: 1.6;
        }

        .modal-box .modal-btns {
            display: flex;
            gap: 12px;
        }

        .modal-box .modal-btns .btn {
            flex: 1;
        }

        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 360px;
        }

        .toast-item {
            padding: 12px 20px;
            border-radius: 12px;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            color: #fff;
            font-size: 14px;
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

        @media (max-width: 900px) {
            .main-layout {
                grid-template-columns: 1fr;
            }

            .top-bar {
                flex-direction: column;
                gap: 12px;
                align-items: stretch;
                text-align: center;
            }

            .top-bar .room-info {
                justify-content: center;
                flex-wrap: wrap;
            }

            .players-grid {
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            }
        }

        @media (max-width: 500px) {
            .players-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .player-card {
                padding: 14px 10px;
                min-height: 110px;
            }

            .player-card .avatar {
                width: 40px;
                height: 40px;
                font-size: 18px;
            }

            .panel-card .form-row {
                grid-template-columns: 1fr;
            }

            .btn-group {
                flex-direction: column;
            }
        }

        .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-top: 2px solid #409eff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
    </style>
</head>

<body>
    <div class="toast-container" id="toastContainer"></div>
    <div class="top-bar">
        <div class="room-info">
            <span class="room-id"><i class="fas fa-hashtag"></i> <?php echo htmlspecialchars($roomId); ?></span>
            <span class="room-status waiting" id="roomStatus">⏳ 等待中</span>
            <span style="font-size:13px;color:#888;" id="gameTypeDisplay">🎮 加载中...</span>
        </div>
        <div>
            <button class="exit-btn" onclick="leaveRoom()">
                <i class="fas fa-sign-out-alt"></i> 离开房间
            </button>
        </div>
    </div>
    <div class="main-layout">
        <div class="players-grid-section">
            <div class="section-title">
                <i class="fas fa-users"></i> 玩家列表
                <span class="count" id="playerCount">(0/4)</span>
                <span style="margin-left:auto;font-size:13px;color:#666;" id="betDisplay"></span>
            </div>
            <div class="players-grid" id="playersGrid">
            </div>
        </div>
        <div class="control-panel">
            <div class="panel-card" id="settingsPanel">
                <div class="panel-title"><i class="fas fa-cog"></i> 房间设置</div>
                <div class="form-group">
                    <label>房间名称</label>
                    <input type="text" id="roomNameInput" maxlength="6" placeholder="最多6个字">
                </div>
                <div class="form-group">
                    <label>房间密码</label>
                    <input type="text" id="roomPasswordInput" maxlength="6" placeholder="最多6个字符">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>押注金额 (G币)</label>
                        <input type="number" id="betAmountInput" min="0" step="10" value="0">
                    </div>
                    <div class="form-group">
                        <label>赔率</label>
                        <select id="betOddsSelect">
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
                <div class="form-group">
                    <label>最大人数</label>
                    <select id="maxPlayersSelect">
                        <option value="2">2人</option>
                        <option value="3">3人</option>
                        <option value="4" selected>4人</option>
                        <option value="6">6人</option>
                        <option value="8">8人</option>
                    </select>
                </div>
            </div>
            <div class="panel-card">
                <div class="panel-title"><i class="fas fa-gamepad"></i> 操作</div>
                <div class="btn-group">
                    <button class="btn btn-ready" id="readyBtn">
                        <i class="fas fa-check"></i> 准备
                    </button>
                    <button class="btn btn-primary" id="startBtn" disabled>
                        <i class="fas fa-play"></i> 开始游戏
                    </button>
                </div>
                <div style="margin-top:10px;font-size:12px;color:#666;text-align:center;" id="readyHint">
                    请所有玩家准备后开始游戏
                </div>
            </div>
        </div>
    </div>

    <div class="bottom-bar">
        <div class="connection-status">
            <span class="dot online" id="connectionDot"></span>
            <span id="connectionText">已连接</span>
        </div>
        <div style="font-size:13px;color:#666;">
            <i class="fas fa-user"></i> <span id="myNameDisplay">加载中...</span>
        </div>
    </div>


    <div class="modal-overlay" id="modalOverlay">
        <div class="modal-box">
            <h3 id="modalTitle">提示</h3>
            <p id="modalContent">内容</p>
            <div class="modal-btns">
                <button class="btn btn-secondary" id="modalCancelBtn">取消</button>
                <button class="btn btn-primary" id="modalConfirmBtn">确定</button>
            </div>
        </div>
    </div>



    <script src="/ast/console.js"></script>
    <script src="/ast/logic/games/mokim-game-sdk.js"></script>
    <script>
        function showModal2(title, content, confirmText = '确定', onConfirm = null) {
            return new Promise((resolve) => {
                const existingOverlay = document.getElementById('modalOverlayFullscreen');
                if (existingOverlay) {
                    existingOverlay.remove();
                }
                const overlay = document.createElement('div');
                overlay.id = 'modalOverlayFullscreen';
                overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;
                const modalBox = document.createElement('div');
                modalBox.style.cssText = `
            background: #1a1a2e;
            border-radius: 20px;
            padding: 40px 48px;
            max-width: 440px;
            width: 90%;
            border: 1px solid rgba(255, 255, 255, 0.06);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
            text-align: center;
            animation: scaleIn 0.3s ease;
        `;
                const icon = document.createElement('div');
                icon.style.cssText = `
            font-size: 48px;
            margin-bottom: 16px;
            color: #e6a23c;
        `;
                icon.innerHTML = '⚠️';
                const titleEl = document.createElement('h3');
                titleEl.style.cssText = `
            font-size: 22px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 12px;
        `;
                titleEl.textContent = title;
                const contentEl = document.createElement('p');
                contentEl.style.cssText = `
            color: #aaa;
            font-size: 15px;
            margin-bottom: 28px;
            line-height: 1.8;
        `;
                contentEl.textContent = content;
                const btnWrapper = document.createElement('div');
                btnWrapper.style.cssText = `
            display: flex;
            justify-content: center;
        `;
                const confirmBtn = document.createElement('button');
                confirmBtn.style.cssText = `
            padding: 12px 40px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #e6a23c;
            color: #fff;
            min-width: 120px;
        `;
                confirmBtn.textContent = confirmText;
                confirmBtn.onmouseenter = () => {
                    confirmBtn.style.background = '#ebb563';
                    confirmBtn.style.transform = 'translateY(-1px)';
                    confirmBtn.style.boxShadow = '0 4px 20px rgba(230, 162, 60, 0.3)';
                };
                confirmBtn.onmouseleave = () => {
                    confirmBtn.style.background = '#e6a23c';
                    confirmBtn.style.transform = 'translateY(0)';
                    confirmBtn.style.boxShadow = 'none';
                };
                btnWrapper.appendChild(confirmBtn);
                modalBox.appendChild(icon);
                modalBox.appendChild(titleEl);
                modalBox.appendChild(contentEl);
                modalBox.appendChild(btnWrapper);
                overlay.appendChild(modalBox);
                document.body.appendChild(overlay);
                if (!document.getElementById('modalFullscreenStyles')) {
                    const styleSheet = document.createElement('style');
                    styleSheet.id = 'modalFullscreenStyles';
                    styleSheet.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `;
                    document.head.appendChild(styleSheet);
                }
                const handleConfirm = () => {
                    overlay.remove();
                    resolve(true);
                    if (typeof onConfirm === 'function') {
                        onConfirm();
                    }
                };

                confirmBtn.onclick = handleConfirm;
            });
        }

        function showToast(message, type = 'info', duration = 3000) {
            const container = document.getElementById('toastContainer');
            if (!container) {
                const tempToast = document.createElement('div');
                tempToast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 12px;
            background: rgba(0,0,0,0.85);
            color: #fff;
            z-index: 999999;
            font-size: 14px;
            border-left: 3px solid ${type === 'error' ? '#f56c6c' : type === 'success' ? '#52c41a' : type === 'warning' ? '#e6a23c' : '#409eff'};
            max-width: 360px;
            animation: slideIn 0.3s ease;
        `;
                tempToast.textContent = message;
                document.body.appendChild(tempToast);
                setTimeout(() => {
                    tempToast.style.opacity = '0';
                    tempToast.style.transition = 'opacity 0.3s';
                    setTimeout(() => tempToast.remove(), 300);
                }, duration);
                return;
            }

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

        function showModal(title, content, confirmText = '确定', cancelText = '取消') {
            return new Promise((resolve) => {
                const overlay = document.getElementById('modalOverlay');
                if (!overlay) {
                    resolve(confirm(content));
                    return;
                }
                document.getElementById('modalTitle').textContent = title;
                document.getElementById('modalContent').textContent = content;
                document.getElementById('modalConfirmBtn').textContent = confirmText;
                document.getElementById('modalCancelBtn').textContent = cancelText;
                overlay.classList.add('active');

                const confirm = () => {
                    overlay.classList.remove('active');
                    resolve(true);
                };
                const cancel = () => {
                    overlay.classList.remove('active');
                    resolve(false);
                };

                document.getElementById('modalConfirmBtn').onclick = confirm;
                document.getElementById('modalCancelBtn').onclick = cancel;
                overlay.onclick = (e) => {
                    if (e.target === overlay) cancel();
                };
            });
        }

        function showPasswordModal(epasswd) {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.id = 'passwordModalOverlay';
                overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;

                const modalBox = document.createElement('div');
                modalBox.style.cssText = `
            background: #1a1a2e;
            border-radius: 20px;
            padding: 40px 48px;
            max-width: 420px;
            width: 90%;
            border: 1px solid rgba(255, 255, 255, 0.06);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
            text-align: center;
            animation: scaleIn 0.3s ease;
        `;

                const icon = document.createElement('div');
                icon.style.cssText = `
            font-size: 48px;
            margin-bottom: 16px;
            color: #409eff;
        `;
                icon.innerHTML = '🔒';

                const titleEl = document.createElement('h3');
                titleEl.style.cssText = `
            font-size: 20px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 8px;
        `;
                titleEl.textContent = '请输入房间密码';

                const descEl = document.createElement('p');
                descEl.style.cssText = `
            color: #888;
            font-size: 14px;
            margin-bottom: 24px;
            line-height: 1.6;
        `;
                descEl.textContent = '此房间设有密码，请输入后进入';

                const inputWrapper = document.createElement('div');
                inputWrapper.style.cssText = `
            margin-bottom: 24px;
        `;

                const input = document.createElement('input');
                input.type = 'password';
                input.maxLength = 6;
                input.placeholder = '请输入房间密码（最多6个字符）';
                input.autofocus = true;
                input.style.cssText = `
            width: 100%;
            padding: 12px 16px;
            border-radius: 12px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.06);
            color: #e0e0e0;
            font-size: 16px;
            text-align: center;
            letter-spacing: 4px;
            transition: all 0.3s;
            outline: none;
            box-sizing: border-box;
        `;
                input.onfocus = function() {
                    this.style.borderColor = '#409eff';
                    this.style.background = 'rgba(255, 255, 255, 0.08)';
                };
                input.onblur = function() {
                    this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    this.style.background = 'rgba(255, 255, 255, 0.06)';
                };
                const errorMsg = document.createElement('div');
                errorMsg.style.cssText = `
            color: #f56c6c;
            font-size: 13px;
            margin-top: 8px;
            min-height: 20px;
            display: none;
        `;
                errorMsg.id = 'passwordErrorMsg';

                const btnWrapper = document.createElement('div');
                btnWrapper.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: center;
        `;

                const cancelBtn = document.createElement('button');
                cancelBtn.style.cssText = `
            padding: 12px 28px;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.08);
            color: #aaa;
            flex: 1;
        `;
                cancelBtn.textContent = '取消';
                cancelBtn.onmouseenter = () => {
                    cancelBtn.style.background = 'rgba(255, 255, 255, 0.15)';
                };
                cancelBtn.onmouseleave = () => {
                    cancelBtn.style.background = 'rgba(255, 255, 255, 0.08)';
                };

                const confirmBtn = document.createElement('button');
                confirmBtn.style.cssText = `
            padding: 12px 28px;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #409eff;
            color: #fff;
            flex: 1;
        `;
                confirmBtn.textContent = '提交';
                confirmBtn.onmouseenter = () => {
                    confirmBtn.style.background = '#66b1ff';
                    confirmBtn.style.transform = 'translateY(-1px)';
                    confirmBtn.style.boxShadow = '0 4px 20px rgba(64, 158, 255, 0.3)';
                };
                confirmBtn.onmouseleave = () => {
                    confirmBtn.style.background = '#409eff';
                    confirmBtn.style.transform = 'translateY(0)';
                    confirmBtn.style.boxShadow = 'none';
                };

                inputWrapper.appendChild(input);
                inputWrapper.appendChild(errorMsg);
                btnWrapper.appendChild(cancelBtn);
                btnWrapper.appendChild(confirmBtn);
                modalBox.appendChild(icon);
                modalBox.appendChild(titleEl);
                modalBox.appendChild(descEl);
                modalBox.appendChild(inputWrapper);
                modalBox.appendChild(btnWrapper);
                overlay.appendChild(modalBox);
                document.body.appendChild(overlay);
                if (!document.getElementById('modalFullscreenStyles')) {
                    const styleSheet = document.createElement('style');
                    styleSheet.id = 'modalFullscreenStyles';
                    styleSheet.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `;
                    document.head.appendChild(styleSheet);
                }
                setTimeout(() => input.focus(), 100);
                const cleanup = () => {
                    overlay.remove();
                };
                const handleConfirm = () => {
                    const pwd = input.value.trim();
                    if (pwd.length === 0) {
                        errorMsg.textContent = '⚠️ 请输入房间密码';
                        errorMsg.style.display = 'block';
                        input.style.borderColor = '#f56c6c';
                        return;
                    }
                    if (pwd.length > 6) {
                        errorMsg.textContent = '⚠️ 密码不能超过6个字符';
                        errorMsg.style.display = 'block';
                        input.style.borderColor = '#f56c6c';
                        return;
                    }
                    cleanup();
                    resolve(pwd);
                };
                const handleCancel = () => {
                    cleanup();
                    resolve(null);
                };
                confirmBtn.onclick = handleConfirm;
                cancelBtn.onclick = handleCancel;
                input.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirm();
                    }
                };
                input.oninput = () => {
                    errorMsg.style.display = 'none';
                    input.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                };
            });
        }
    </script>
    <script>
        const newfuckingao = new ConsoleDetector();
        newfuckingao.startDetection();
        console.log = function() {};
        console.info = function() {};
        console.warn = function() {};
        console.error = function() {};
        const ROOM_ID = '<?php echo htmlspecialchars($roomId); ?>';
        const MY_USER_ID = '<?php echo htmlspecialchars($q_suname); ?>';
        const MY_USED_LOK_MONEY = <?php echo htmlspecialchars($gcoins); ?>;
        const urlParams = new URLSearchParams(window.location.search);
        const ROOM_PASSWORD = urlParams.get('password') || '';
        let gameHeartbeatTimer = null;
        const channel = new MokimGameSDK.GameChannel('mokim_game_channel', 'game_waiting_' + MY_USER_ID);
        channel.init();
        gameHeartbeatTimer = MokimGameSDK.startGameHeartbeat(channel, 12000);
        const state = {
            isHost: false,
            isReady: false,
            gameStarted: false,
            players: [],
            roomData: null,
            _initialized: false,
            _wasHost: false,
        };
        let previousIsHost = false;

        function updateRoomData(data) {

            state.roomData = data;
            const wasHost = state.isHost;
            state.isHost = data.hostId === MY_USER_ID;

            console.log('[调试] 房主状态变化', {
                wasHost: wasHost,
                isHost: state.isHost,
                hostId: data.hostId,
                myUserId: MY_USER_ID
            });
            if (state._initialized && state.isHost && !wasHost) {
                showToast('👑 你已成为房主', 'success');
            } else {
                console.log('[调试] 不触发房主提示', {
                    initialized: state._initialized,
                    isHost: state.isHost,
                    wasHost: wasHost
                });
            }
            state._initialized = true;

            document.getElementById('gameTypeDisplay').textContent = '🎮 ' + (data.gameType || '未知游戏');
            const settings = data.settings || {};
            const nameInput = document.getElementById('roomNameInput');
            const passwordInput = document.getElementById('roomPasswordInput');
            const betAmountInput = document.getElementById('betAmountInput');
            const betOddsSelect = document.getElementById('betOddsSelect');
            const maxPlayersSelect = document.getElementById('maxPlayersSelect');

            console.log('[调试] 设置面板权限', {
                isHost: state.isHost
            });

            if (state.isHost) {
                nameInput.disabled = false;
                passwordInput.disabled = false;
                betAmountInput.disabled = false;
                betOddsSelect.disabled = false;
                maxPlayersSelect.disabled = false;
                nameInput.value = settings.roomName || '';
                passwordInput.value = settings.password || '';
                betAmountInput.value = data.betAmount || 0;
                betOddsSelect.value = data.betOdds || 2;
                maxPlayersSelect.value = data.maxPlayers || 4;
                nameInput.onchange = () => updateRoomSetting('roomName', nameInput.value);
                passwordInput.onchange = () => updateRoomSetting('password', passwordInput.value);
                betAmountInput.onchange = () => updateRoomSetting('betAmount', parseInt(betAmountInput.value) || 0);
                betOddsSelect.onchange = () => updateRoomSetting('betOdds', parseInt(betOddsSelect.value) || 2);
                maxPlayersSelect.onchange = () => updateRoomSetting('maxPlayers', parseInt(maxPlayersSelect.value) || 4);
            } else {
                nameInput.disabled = true;
                passwordInput.disabled = true;
                betAmountInput.disabled = true;
                betOddsSelect.disabled = true;
                maxPlayersSelect.disabled = true;
                nameInput.value = settings.roomName || '';
                passwordInput.value = '********';
                betAmountInput.value = data.betAmount || 0;
                betOddsSelect.value = data.betOdds || 2;
                maxPlayersSelect.value = data.maxPlayers || 4;
            }

            const betDisplay = document.getElementById('betDisplay');
            if (data.betAmount > 0) {
                if (data.betAmount > MY_USED_LOK_MONEY) {
                    showModal2('温馨提醒', `您的现有G币不足以支撑本局游戏的押注！若您输给对方,您将扣掉此局的${data.betAmount}G币(若余额不足将强制清零)！理性娱乐,请三思而后行！`, `确认`);
                }
                betDisplay.textContent = `💰 押注 ${data.betAmount} G币 × ${data.betOdds}x (赢+${data.betAmount * data.betOdds})`;
                betDisplay.style.color = '#e6a23c';
            } else {
                betDisplay.textContent = '🎯 娱乐模式 (无押注)';
                betDisplay.style.color = '#666';
            }

            if (data.players) {
                updatePlayers(data.players);
            }
            updateRoomStatus(data.status);
        }

        function updatePlayers(players) {
            state.players = players || [];
            const grid = document.getElementById('playersGrid');
            const maxPlayers = state.roomData?.maxPlayers || 4;
            const hostPlayer = state.players.find(p => p.isHost);
            if (hostPlayer) {
                const wasHost = state.isHost;
                const newIsHost = hostPlayer.playerId === MY_USER_ID;
                state.isHost = newIsHost;
            }

            document.getElementById('playerCount').textContent = `(${state.players.length}/${maxPlayers})`;
            const nonHostPlayers = state.players.filter(p => p.playerId !== state.roomData?.hostId);
            const allReady = nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.ready);
            const startBtn = document.getElementById('startBtn');
            if (state.isHost && !state.gameStarted) {
                startBtn.disabled = !allReady || state.players.length < 2;
            }
            let html = '';
            const selfPlayer = state.players.find(p => p.playerId === MY_USER_ID);
            for (let i = 0; i < maxPlayers; i++) {
                const player = state.players[i] || null;
                const isSelf = player && player.playerId === MY_USER_ID;
                const isHost = player && player.isHost;
                const isReady = player && player.ready;
                const showKick = state.isHost && !isSelf && !isHost && !state.gameStarted && player !== null;
                let cardClasses = 'player-card';
                if (isHost) cardClasses += ' is-host';
                if (isSelf) cardClasses += ' is-self';
                if (isReady) cardClasses += ' is-ready';
                if (showKick) cardClasses += ' show-kick';

                html += `<div class="${cardClasses}">`;

                if (player) {
                    const avatarChar = (player.nickname || '玩家').charAt(0).toUpperCase();
                    const avatarClass = isHost ? 'avatar host-avatar' : 'avatar';
                    html += `<div class="${avatarClass}">${avatarChar}</div>`;
                    html += `<div class="player-name">${player.nickname || '玩家'}</div>`;
                    html += `<div class="player-status ${isReady ? 'ready' : 'not-ready'}">${isReady ? '✅ 已准备' : '⏳ 未准备'}</div>`;
                    if (isHost) {
                        html += `<div class="host-badge">👑 房主</div>`;
                    }
                    if (showKick) {
                        html += `<button class="kick-btn" onclick="kickPlayer('${player.playerId}')"><i class="fas fa-user-slash"></i> 踢出</button>`;
                    }
                } else {
                    html += `<div class="empty-slot"><i class="fas fa-user-plus"></i>空位</div>`;
                }

                html += `</div>`;
            }

            grid.innerHTML = html;

            if (selfPlayer) {
                state.isReady = selfPlayer.ready;
                updateReadyButton();
            }

            if (selfPlayer) {
                document.getElementById('myNameDisplay').textContent = selfPlayer.nickname || MY_USER_ID;
            }

            updateReadyHint();
        }

        function handleGameMessage(msg) {
            switch (msg.type) {
                case 'game_room_info':
                    console.log('[调试] 处理 game_room_info');
                    if (msg.data.epasswd) {
                        showPasswordModal(msg.data.epasswd).then((password) => {
                            const key = `wsroomrss_${MY_USER_ID}`;
                            const result = MokimGameSDK.RateLimit.check(key, 10000);
                            if (!result.allowed) {
                                showToast('请求过于频繁，请稍后再试', 'error');
                                return;
                            }
                            if (password !== null) {
                                channel.sendGameMessage('game_room_info', {
                                    roomId: ROOM_ID,
                                    password: password
                                });
                            } else {
                                showToast('需要密码才能进入房间', 'error');
                                setTimeout(() => window.close(), 1000);
                            }
                        });
                    } else {
                        updateRoomData(msg.data);
                    }
                    break;

                case 'game_player_list':
                    console.log('[调试] 处理 game_player_list', msg.data);
                    const oldHostId = state.roomData?.hostId;
                    const newHostId = msg.data.hostId;
                    if (state.roomData) {
                        state.roomData.hostId = newHostId;
                        state.roomData.players = msg.data.players;
                        state.roomData.status = msg.data.status;
                    }
                    updatePlayers(msg.data.players);
                    updateRoomStatus(msg.data.status);
                    if (state._initialized && oldHostId && newHostId && newHostId !== oldHostId && newHostId === MY_USER_ID) {
                        showToast('👑 你已成为房主', 'success');
                        state.isHost = true;
                        updateRoomData(state.roomData);
                    }
                    break;

                case 'game_player_ready':
                    console.log('[调试] 处理 game_player_ready', msg.data);
                    updatePlayerReady(msg.data.playerId, msg.data.ready);
                    updateReadyHint();
                    break;

                case 'game_started':
                    console.log('[调试] 游戏开始');
                    state.gameStarted = true;
                    document.getElementById('roomStatus').textContent = '🎮 对局中';
                    document.getElementById('roomStatus').className = 'room-status playing';
                    document.getElementById('readyBtn').disabled = true;
                    document.getElementById('startBtn').disabled = true;
                    showToast('游戏已开始！正在跳转...', 'success');
                    setTimeout(() => {
                        const gameType = state.roomData?.gameType || 'default';
                        window.location.href = `/use/activity/g2g/${gameType}/?room=${ROOM_ID}`;
                    }, 1500);
                    break;

                case 'game_kicked':
                    showToast('你被房主踢出房间', 'error');
                    setTimeout(() => window.close(), 1500);
                    break;

                case 'game_over':
                    showToast('游戏已结束', 'info');
                    document.getElementById('roomStatus').textContent = '🏁 已结束';
                    document.getElementById('roomStatus').className = 'room-status ended';
                    break;

                case 'game_error':
                    if ((msg.msg || msg.data?.reason) === '房间不存在') {
                        showModal2('警告', msg.msg || msg.data?.reason || '操作失败', '离开', () => window.close());
                    } else {
                        showToast(msg.msg || msg.data?.reason || '操作失败', 'error');
                    }
                    break;

                case 'heartbeat_resp':
                    break;

                default:
                    console.log('未知消息类型:', msg.type);
            }
        }
        channel.onMessage(handleGameMessage);



        function updateRoomSetting(key, value) {
            if (!state.isHost) return;
            channel.sendGameMessage('game_update_setting', {
                roomId: ROOM_ID,
                key: key,
                value: value
            });
        }



        function updateReadyHint() {
            const nonHostPlayers = state.players.filter(p => p.playerId !== state.roomData?.hostId);
            const allReady = nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.ready);

            if (state.gameStarted) {
                document.getElementById('readyHint').textContent = '🎮 游戏进行中...';
                document.getElementById('readyHint').style.color = '#f56c6c';
            } else if (allReady && state.players.length >= 2) {
                document.getElementById('readyHint').textContent = '✅ 所有玩家已准备，房主可开始游戏！';
                document.getElementById('readyHint').style.color = '#52c41a';
            } else {
                const need = Math.max(2 - state.players.length, 0);
                const notReady = nonHostPlayers.filter(p => !p.ready).length;
                if (need > 0) {
                    document.getElementById('readyHint').textContent = `需要 ${need} 名以上玩家`;
                } else if (notReady > 0) {
                    document.getElementById('readyHint').textContent = `还有 ${notReady} 名玩家未准备`;
                } else {
                    document.getElementById('readyHint').textContent = '请所有玩家准备后开始游戏';
                }
                document.getElementById('readyHint').style.color = '#666';
            }
        }

        function updatePlayerReady(playerId, ready) {
            const player = state.players.find(p => p.playerId === playerId);
            if (player) {
                player.ready = ready;
                updatePlayers(state.players);
            }
        }

        function updateRoomStatus(status) {
            const statusEl = document.getElementById('roomStatus');
            if (status === 'waiting') {
                statusEl.textContent = '⏳ 等待中';
                statusEl.className = 'room-status waiting';
            } else if (status === 'playing') {
                statusEl.textContent = '🎮 对局中';
                statusEl.className = 'room-status playing';
                state.gameStarted = true;
                document.getElementById('readyBtn').disabled = true;
                document.getElementById('startBtn').disabled = true;
            } else if (status === 'ended') {
                statusEl.textContent = '🏁 已结束';
                statusEl.className = 'room-status ended';
            }
        }

        function updateReadyButton() {
            const btn = document.getElementById('readyBtn');
            if (state.gameStarted) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 游戏中';
                btn.className = 'btn btn-secondary';
                return;
            }
            if (state.isReady) {
                btn.innerHTML = '<i class="fas fa-times"></i> 取消准备';
                btn.className = 'btn btn-unready';
            } else {
                btn.innerHTML = '<i class="fas fa-check"></i> 准备';
                btn.className = 'btn btn-ready';
            }
        }

        function toggleReady() {
            if (state.gameStarted) {
                showToast('游戏已开始，无法更改准备状态', 'warning');
                return;
            }
            if (state.isHost) {
                showToast('房主无需准备，直接开始游戏即可', 'info');
                return;
            }
            const newReady = !state.isReady;
            channel.sendGameMessage('game_set_ready', {
                ready: newReady
            });
        }

        function startGame() {
            if (!state.isHost) {
                showToast('只有房主可以开始游戏', 'warning');
                return;
            }
            if (state.gameStarted) {
                showToast('游戏已开始', 'warning');
                return;
            }
            const nonHostPlayers = state.players.filter(p => p.playerId !== state.roomData?.hostId);
            if (nonHostPlayers.length < 1) {
                showToast('至少需要2名玩家才能开始', 'warning');
                return;
            }
            if (!nonHostPlayers.every(p => p.ready)) {
                showToast('有玩家尚未准备', 'warning');
                return;
            }
            showModal('开始游戏', '确认所有玩家已准备，开始游戏？', '开始', '取消').then((confirmed) => {
                if (confirmed) {
                    channel.sendGameMessage('game_start', {});
                }
            });
        }

        function kickPlayer(playerId) {
            if (!state.isHost) {
                showToast('只有房主可以踢人', 'warning');
                return;
            }
            if (state.gameStarted) {
                showToast('游戏已开始，无法踢出玩家', 'warning');
                return;
            }
            const player = state.players.find(p => p.playerId === playerId);
            if (!player) {
                showToast('玩家不存在', 'error');
                return;
            }
            if (player.playerId === MY_USER_ID) {
                showToast('不能踢自己', 'warning');
                return;
            }
            if (player.isHost) {
                showToast('不能踢房主', 'warning');
                return;
            }
            showModal2('⚠️ 踢出玩家', `确定要踢出 "${player.nickname || '玩家'}" 吗？`, '确认踢出').then((confirmed) => {
                if (confirmed) {
                    const key = `kick_${ROOM_ID}_${MY_USER_ID}`;
                    const result = MokimGameSDK.RateLimit.check(key, 3000);
                    if (!result.allowed) {
                        showToast(`操作过于频繁，请等待 ${result.waitTime} 秒`, 'warning');
                        return;
                    }
                    channel.sendGameMessage('game_kick_player', {
                        playerId: playerId
                    });
                    showToast(`已踢出 ${player.nickname || '玩家'}`, 'success');
                }
            });
        }

        function leaveRoom() {
            if (state.gameStarted) {
                showModal('离开房间', '游戏正在进行中，离开将视为弃权，确定吗？', '确定离开', '继续游戏').then((confirmed) => {
                    if (confirmed) doLeaveRoom();
                });
            } else {
                showModal('离开房间', '确定要离开房间吗？', '确定', '取消').then((confirmed) => {
                    if (confirmed) doLeaveRoom();
                });
            }
        }

        function doLeaveRoom() {
            channel.sendGameMessage('game_leave_room', {});
            showToast('已离开房间', 'success');
            setTimeout(() => window.close(), 500);
        }
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('readyBtn').addEventListener('click', toggleReady);
            document.getElementById('startBtn').addEventListener('click', startGame);
            channel.sendGameMessage('game_room_info', {
                roomId: ROOM_ID
            });
            window.addEventListener('beforeunload', function() {
                if (gameHeartbeatTimer) {
                    clearInterval(gameHeartbeatTimer);
                    gameHeartbeatTimer = null;
                }
                channel.destroy();
            });
        });
    </script>
</body>

</html>