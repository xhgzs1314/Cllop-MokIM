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
    <title>🎲 投骰子</title>
    <link rel="stylesheet" href="/ast/fontawe/css/all.min.css">
    <link rel="stylesheet" href="/ast/sweetalert2.all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: linear-gradient(145deg, #0f0c29, #302b63, #24243e);
            min-height: 100vh;
            align-items: stretch;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #fff;
            padding: 20px;
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

        .game-container {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
            border-radius: 24px;
            padding: 32px 40px;
            max-width: 100%;
            width: 100%;
            border: 1px solid rgba(255, 255, 255, 0.06);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .game-title {
            font-size: 24px;
            font-weight: 700;
        }

        .game-title i {
            color: #ffd700;
        }

        .back-btn {
            color: #888;
            text-decoration: none;
            font-size: 14px;
            padding: 6px 14px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            transition: 0.3s;
        }

        .back-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }

        .game-stats {
            display: flex;
            gap: 20px;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 20px;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
        }

        .stat-label {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .stat-value {
            font-size: 20px;
            font-weight: 700;
            margin-top: 2px;
        }

        .stat-value.coins {
            color: #ffd700;
        }

        .stat-value.bet {
            color: #4FC3F7;
        }

        .stat-value.streak {
            color: #ff6b35;
        }

        .dice-area {
            text-align: center;
            padding: 30px 0 20px;
            min-height: 140px;
        }

        .dice-container {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-bottom: 12px;
        }

        .dice {
            width: 80px;
            height: 80px;
            background: #fff;
            border-radius: 14px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 1fr);
            padding: 14px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            transition: 0.3s;
        }

        .dice .dot {
            border-radius: 50%;
            background: #1a1a2e;
            width: 100%;
            height: 100%;
            max-width: 16px;
            max-height: 16px;
            place-self: center;
            transition: 0.3s;
        }

        .dice.rolling {
            animation: roll 0.6s ease;
        }

        @keyframes roll {
            0% {
                transform: rotate(0deg) scale(1);
            }

            25% {
                transform: rotate(90deg) scale(1.1);
            }

            50% {
                transform: rotate(180deg) scale(0.9);
            }

            75% {
                transform: rotate(270deg) scale(1.1);
            }

            100% {
                transform: rotate(360deg) scale(1);
            }
        }

        .dice-result-text {
            font-size: 20px;
            font-weight: 700;
            min-height: 34px;
            margin-top: 4px;
        }

        .dice-result-text.win {
            color: #4CAF50;
        }

        .dice-result-text.lose {
            color: #ff6b6b;
        }

        .dice-result-text.big {
            color: #ffd700;
            font-size: 26px;
        }

        .bet-area {
            background: rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            padding: 14px 18px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .bet-label {
            font-size: 14px;
            color: #aaa;
        }

        .bet-input {
            flex: 1;
            min-width: 80px;
            padding: 8px 14px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            font-size: 16px;
            font-weight: 600;
            outline: none;
            transition: 0.3s;
        }

        .bet-input:focus {
            border-color: #667eea;
            background: rgba(255, 255, 255, 0.08);
        }

        .bet-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
        }

        .bet-quick {
            display: flex;
            gap: 6px;
        }

        .bet-quick-btn {
            padding: 6px 14px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            background: transparent;
            color: #aaa;
            font-size: 13px;
            cursor: pointer;
            transition: 0.3s;
        }

        .bet-quick-btn:hover {
            background: rgba(255, 255, 255, 0.08);
            color: #fff;
        }

        .bet-quick-btn.active {
            border-color: #667eea;
            color: #667eea;
        }

        .actions {
            display: flex;
            gap: 10px;
        }

        .btn-roll {
            flex: 1;
            padding: 14px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: #fff;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            transition: 0.3s;
        }

        .btn-roll:hover:not(:disabled) {
            transform: scale(1.02);
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-roll:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none;
        }

        .btn-roll .fa-dice {
            margin-right: 8px;
        }

        .odds-table {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            margin-top: 12px;
            font-size: 11px;
        }

        .odds-item {
            text-align: center;
            padding: 4px 0;
            border-radius: 4px;
            color: #666;
        }

        .odds-item .combo {
            font-weight: 600;
            color: #aaa;
        }

        .odds-item .payout {
            color: #ffd700;
            font-weight: 600;
        }

        .history-area {
            margin-top: 10px;
            max-height: 80px;
            overflow-y: auto;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            justify-content: center;
        }

        .history-area::-webkit-scrollbar {
            width: 3px;
        }

        .history-area::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
        }

        .history-dot {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 600;
            flex-shrink: 0;
            background: rgba(255, 255, 255, 0.05);
            color: #555;
        }

        .history-dot.win {
            background: rgba(76, 175, 80, 0.25);
            color: #4CAF50;
        }

        .history-dot.lose {
            background: rgba(255, 107, 107, 0.15);
            color: #ff6b6b;
        }

        .history-dot.big {
            background: rgba(255, 215, 0, 0.2);
            color: #ffd700;
        }

        @media (max-width: 480px) {
            .game-container {
                padding: 16px;
            }

            .dice {
                width: 60px;
                height: 60px;
                padding: 10px;
            }

            .dice .dot {
                max-width: 12px;
                max-height: 12px;
            }

            .dice-container {
                gap: 16px;
            }

            .game-stats {
                gap: 8px;
                padding: 8px 10px;
            }

            .stat-value {
                font-size: 15px;
            }

            .bet-area {
                flex-direction: column;
            }

            .bet-input {
                width: 100%;
            }

            .bet-quick {
                width: 100%;
                justify-content: center;
            }

            .odds-table {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>

<body>

    <div class="game-container">
        <div class="game-header">
            <div class="game-title"><i class="fas fa-dice"></i> 投骰子</div>
            <a onclick="javascript:window.close();" class="back-btn"><i class="fas fa-times"></i> 退出</a>
        </div>
        <div class="game-stats">
            <div class="stat-item">
                <span class="stat-label">💰 G币</span>
                <span class="stat-value coins" id="gcoinDisplay"><?php echo number_format($gcoins); ?></span>
            </div>
            <div class="stat-item">
                <span class="stat-label">🎲 押注</span>
                <span class="stat-value bet" id="betDisplay">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">🔥 连胜</span>
                <span class="stat-value streak" id="streakDisplay">0</span>
            </div>
        </div>
        <div class="dice-area">
            <div class="dice-container" id="diceContainer">
                <div class="dice" id="dice1">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <div class="dice" id="dice2">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
            <div class="dice-result-text" id="resultText">🎲 点击投骰子</div>
        </div>
        <div class="bet-area" id="betArea">
            <span class="bet-label">押注：</span>
            <input type="number" class="bet-input" id="betInput" min="5" max="30" value="5" step="5">
            <div class="bet-quick">
                <button class="bet-quick-btn" data-amount="5">5</button>
                <button class="bet-quick-btn" data-amount="10">10</button>
                <button class="bet-quick-btn" data-amount="20">20</button>
                <button class="bet-quick-btn" data-amount="30">30</button>
            </div>
        </div>
        <div class="actions">
            <button class="btn-roll" id="rollBtn"><i class="fas fa-dice"></i> 投骰子</button>
        </div>
        <div class="odds-table">
            <div class="odds-item"><span class="combo">🎰 双六</span> <span class="payout">x10</span></div>
            <div class="odds-item"><span class="combo">🎰 双五</span> <span class="payout">x8</span></div>
            <div class="odds-item"><span class="combo">🎰 双四</span> <span class="payout">x6</span></div>
            <div class="odds-item"><span class="combo">🎰 双三</span> <span class="payout">x5</span></div>
            <div class="odds-item"><span class="combo">🎰 双二</span> <span class="payout">x4</span></div>
            <div class="odds-item"><span class="combo">🎰 双一</span> <span class="payout">x3</span></div>
            <div class="odds-item"><span class="combo">🌟 合计7/11</span> <span class="payout">x1.5</span></div>
            <div class="odds-item"><span class="combo">🌟 合计12</span> <span class="payout">x2</span></div>
        </div>
        <div class="history-area" id="historyArea"></div>
    </div>

    <script src="/ast/authwrite.js"></script>
    <script src="/ast/sweetalert2.all.min.js"></script>
    <script src="/ast/console.js"></script>
    <script>
        function plugin_post_requests(data, callback, options = {}) {
            const {
                url = '/api/', timeout = 10000, headers = {}, withCredentials = false
            } = options;
            const defaultHeaders = {
                'Content-Type': 'application/json',
                ...headers
            };
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            fetch(url, {
                    method: 'POST',
                    headers: defaultHeaders,
                    body: JSON.stringify(data),
                    credentials: withCredentials ? 'include' : 'same-origin',
                    signal: controller.signal
                })
                .then(async response => {
                    clearTimeout(timeoutId);
                    const contentType = response.headers.get('content-type');
                    let result = contentType && contentType.includes('application/json') ? await response.json() : await response.text();
                    if (!response.ok) throw new Error(result.message || `请求失败: ${response.status}`);
                    callback(null, result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    callback(error.name === 'AbortError' ? new Error('请求超时') : error, null);
                });
        }

        const newfuckingao = new ConsoleDetector();
        newfuckingao.startDetection();
        console.log = console.info = console.warn = console.error = function() {};
        const tmd_newcontroler = new tmdbaseauthdownyho();
        const userId = '<?php echo $q_suname; ?>';
        const initialCoins = <?php echo $gcoins; ?>;
        const state = {
            coins: initialCoins,
            bet: 5,
            streak: 0,
            isRolling: false,
            history: [],
            gameId: null
        };
        const $ = id => document.getElementById(id);
        const gcoinDisplay = $('gcoinDisplay');
        const betDisplay = $('betDisplay');
        const streakDisplay = $('streakDisplay');
        const betInput = $('betInput');
        const dice1 = $('dice1');
        const dice2 = $('dice2');
        const resultText = $('resultText');
        const rollBtn = $('rollBtn');
        const historyArea = $('historyArea');
        const betQuickBtns = document.querySelectorAll('.bet-quick-btn');
        const DOT_PATTERNS = {
            1: [
                [0, 0, 0],
                [0, 1, 0],
                [0, 0, 0]
            ],
            2: [
                [0, 0, 1],
                [0, 0, 0],
                [1, 0, 0]
            ],
            3: [
                [0, 0, 1],
                [0, 1, 0],
                [1, 0, 0]
            ],
            4: [
                [1, 0, 1],
                [0, 0, 0],
                [1, 0, 1]
            ],
            5: [
                [1, 0, 1],
                [0, 1, 0],
                [1, 0, 1]
            ],
            6: [
                [1, 0, 1],
                [1, 0, 1],
                [1, 0, 1]
            ]
        };

        function renderDice(element, value) {
            const pattern = DOT_PATTERNS[value];
            element.innerHTML = '';
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const dot = document.createElement('div');
                    dot.className = 'dot';
                    dot.style.opacity = pattern[row][col] ? '1' : '0';
                    element.appendChild(dot);
                }
            }
        }

        function randomDice() {
            return Math.floor(Math.random() * 6) + 1;
        }

        function evaluateDice(v1, v2) {
            const sum = v1 + v2;
            if (v1 === 6 && v2 === 6) return {
                type: 'double_six',
                label: '🎰 双六！',
                multiplier: 10
            };
            if (v1 === 5 && v2 === 5) return {
                type: 'double_five',
                label: '🎰 双五！',
                multiplier: 8
            };
            if (v1 === 4 && v2 === 4) return {
                type: 'double_four',
                label: '🎰 双四！',
                multiplier: 6
            };
            if (v1 === 3 && v2 === 3) return {
                type: 'double_three',
                label: '🎰 双三！',
                multiplier: 5
            };
            if (v1 === 2 && v2 === 2) return {
                type: 'double_two',
                label: '🎰 双二！',
                multiplier: 4
            };
            if (v1 === 1 && v2 === 1) return {
                type: 'double_one',
                label: '🎰 双一！',
                multiplier: 3
            };
            if (sum === 12) return {
                type: 'sum_twelve',
                label: '🌟 合计12！',
                multiplier: 2
            };
            if (sum === 7 || sum === 11) return {
                type: 'sum_seven_eleven',
                label: '🌟 合计' + sum + '！',
                multiplier: 1.5
            };
            return {
                type: 'lose',
                label: '💔 没中',
                multiplier: 0
            };
        }

        function rollDice() {
            if (state.isRolling) return;
            if (state.coins < state.bet) {
                Swal.fire({
                    icon: 'warning',
                    title: 'G币不足',
                    text: `你只有 ${state.coins} G币`
                });
                return;
            }
            state.isRolling = true;
            rollBtn.disabled = true;
            resultText.textContent = '🎲 投掷中...';
            resultText.className = 'dice-result-text';
            state.coins -= state.bet;
            updateUI();
            dice1.classList.add('rolling');
            dice2.classList.add('rolling');
            const v1 = randomDice();
            const v2 = randomDice();
            setTimeout(() => {
                dice1.classList.remove('rolling');
                dice2.classList.remove('rolling');
                renderDice(dice1, v1);
                renderDice(dice2, v2);

                const result = evaluateDice(v1, v2);
                let winnings = 0;
                let isWin = false;

                if (result.multiplier > 0) {
                    winnings = Math.round(state.bet * result.multiplier);
                    state.coins += winnings;
                    isWin = true;
                    state.streak++;
                    resultText.textContent = `${result.label} +${winnings} G币`;
                    resultText.className = 'dice-result-text win';
                    if (result.multiplier >= 5) {
                        resultText.className = 'dice-result-text big';
                        createConfetti();
                    }
                } else {
                    state.streak = 0;
                    resultText.textContent = `💔 ${v1}+${v2}=${v1+v2} 没中 -${state.bet} G币`;
                    resultText.className = 'dice-result-text lose';
                }
                let streakBonus = 0;
                if (isWin && state.streak >= 3) {
                    if (state.streak >= 7) streakBonus = 20;
                    else if (state.streak >= 5) streakBonus = 10;
                    else if (state.streak >= 3) streakBonus = 5;

                    if (streakBonus > 0) {
                        state.coins += streakBonus;
                        resultText.textContent += ` 🔥 连${state.streak}局 +${streakBonus} G币！`;
                    }
                }
                state.history.push({
                    v1,
                    v2,
                    win: isWin,
                    big: result.multiplier >= 5
                });
                if (state.history.length > 20) state.history.shift();
                renderHistory();

                updateUI();
                syncCoins(state.coins);

                state.isRolling = false;
                rollBtn.disabled = false;

            }, 600);
        }

        function updateUI() {
            gcoinDisplay.textContent = state.coins.toLocaleString();
            betDisplay.textContent = state.bet;
            streakDisplay.textContent = state.streak;

            betInput.disabled = state.isRolling;
            betQuickBtns.forEach(btn => {
                btn.disabled = state.isRolling;
                btn.classList.toggle('active', parseInt(btn.dataset.amount) === state.bet);
            });
        }

        function renderHistory() {
            historyArea.innerHTML = state.history.map(h => {
                let cls = 'history-dot';
                if (h.win) cls += ' win';
                if (h.big) cls += ' big';
                else if (!h.win) cls += ' lose';
                return `<div class="${cls}">${h.v1}${h.v2}</div>`;
            }).join('');
            historyArea.scrollTop = historyArea.scrollHeight;
        }

        function createConfetti() {
            const colors = ['#ffd700', '#ff6b6b', '#4FC3F7', '#81C784', '#ff6b35', '#ff4757'];
            for (let i = 0; i < 40; i++) {
                const el = document.createElement('div');
                el.style.cssText = `
                position: fixed;
                left: ${Math.random() * 100}vw;
                top: -10px;
                width: ${Math.random() * 8 + 4}px;
                height: ${Math.random() * 8 + 4}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
                pointer-events: none;
                z-index: 99999;
                opacity: 1;
                transition: all ${Math.random() * 2 + 1}s ease;
            `;
                document.body.appendChild(el);
                setTimeout(() => {
                    el.style.transform = `translateY(${window.innerHeight + 50}px) rotate(${Math.random() * 720}deg)`;
                    el.style.opacity = '0';
                }, 50);
                setTimeout(() => el.remove(), 3000);
            }
        }
        let syncTimer = null;

        function syncCoins(coins) {
            if (syncTimer) clearTimeout(syncTimer);
            syncTimer = setTimeout(async () => {
                try {
                    const authdata = await tmd_newcontroler.writenewwords(userId);
                    plugin_post_requests({
                        UserId: authdata,
                        coins: coins,
                        game_id: state.gameId || 'dice',
                        action: 'sync_coins'
                    }, (error) => {
                        if (error) console.warn('同步G币失败:', error);
                    }, {
                        url: '/api/game_sync/dice/',
                        timeout: 5000
                    });
                } catch (e) {
                    console.warn('同步失败:', e);
                }
            }, 1000);
        }
        betInput.addEventListener('input', function() {
            let val = parseInt(this.value) || 5;
            val = Math.max(5, Math.min(30, val));
            val = Math.round(val / 5) * 5;
            if (val < 5) val = 5;
            if (val > 30) val = 30;
            this.value = val;
            state.bet = val;
            updateUI();
        });

        betQuickBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                if (state.isRolling) return;
                const amount = parseInt(this.dataset.amount);
                betInput.value = amount;
                state.bet = amount;
                updateUI();
            });
        });

        rollBtn.addEventListener('click', rollDice);
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Space') {
                e.preventDefault();
                rollDice();
            }
        });
        renderDice(dice1, 1);
        renderDice(dice2, 1);
        state.gameId = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        updateUI();
        renderHistory();
        resultText.textContent = '🎲 按空格或点击投骰子';
    </script>
</body>

</html>