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
    <title>🎯 猜数字</title>
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
            margin-bottom: 24px;
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

        .stat-value.chances {
            color: #81C784;
        }


        .bet-area {
            background: rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .bet-label {
            font-size: 14px;
            color: #aaa;
            margin-right: 4px;
        }

        .bet-input {
            flex: 1;
            min-width: 100px;
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


        .game-status {
            text-align: center;
            padding: 20px 0;
            min-height: 80px;
        }

        .game-number-display {
            font-size: 72px;
            font-weight: 900;
            color: rgba(255, 255, 255, 0.05);
            line-height: 1;
            transition: 0.5s;
            user-select: none;
        }

        .game-number-display.show {
            color: #ffd700;
        }

        .game-number-display.wrong {
            color: #ff6b6b;
        }

        .game-number-display.correct {
            color: #4CAF50;
        }

        .game-hint {
            font-size: 18px;
            margin-top: 8px;
            min-height: 30px;
            color: #aaa;
        }

        .game-hint.high {
            color: #ff6b6b;
        }

        .game-hint.low {
            color: #4FC3F7;
        }

        .game-hint.correct {
            color: #4CAF50;
        }

        .guess-area {
            display: flex;
            gap: 10px;
            margin-top: 8px;
        }

        .guess-input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            font-size: 18px;
            font-weight: 600;
            text-align: center;
            outline: none;
            transition: 0.3s;
        }

        .guess-input:focus {
            border-color: #667eea;
            background: rgba(255, 255, 255, 0.08);
        }

        .guess-input:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .guess-btn {
            padding: 12px 28px;
            border: none;
            border-radius: 10px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: #fff;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.3s;
            white-space: nowrap;
        }

        .guess-btn:hover:not(:disabled) {
            transform: scale(1.03);
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }

        .guess-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none;
        }


        .history-area {
            margin-top: 16px;
            max-height: 120px;
            overflow-y: auto;
        }

        .history-area::-webkit-scrollbar {
            width: 3px;
        }

        .history-area::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
        }

        .history-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 8px;
            font-size: 13px;
            color: #888;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .history-item .num {
            font-weight: 600;
        }

        .history-item .result-high {
            color: #ff6b6b;
        }

        .history-item .result-low {
            color: #4FC3F7;
        }

        .history-item .result-correct {
            color: #4CAF50;
        }

        .actions {
            display: flex;
            gap: 10px;
            margin-top: 16px;
        }

        .btn-reset {
            flex: 1;
            padding: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            background: transparent;
            color: #888;
            font-size: 14px;
            cursor: pointer;
            transition: 0.3s;
        }

        .btn-reset:hover {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
        }

        .btn-reset:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        .odds-table {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
            margin-top: 12px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
        }

        .odds-item {
            text-align: center;
            font-size: 11px;
            color: #666;
            padding: 4px 0;
            border-radius: 4px;
        }

        .odds-item .guess-count {
            font-weight: 600;
            color: #888;
        }

        .odds-item .multiplier {
            color: #ffd700;
            font-weight: 600;
        }

        .odds-item.active {
            background: rgba(255, 215, 0, 0.1);
        }

        @media (max-width: 480px) {
            .game-container {
                padding: 20px;
            }

            .game-stats {
                gap: 10px;
                padding: 10px 12px;
            }

            .stat-value {
                font-size: 16px;
            }

            .game-number-display {
                font-size: 48px;
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

            .guess-area {
                flex-direction: column;
            }

            .actions {
                flex-direction: column;
            }

            .odds-table {
                grid-template-columns: repeat(7, 1fr);
            }

            .odds-item .guess-count {
                display: block;
            }
        }


        .timer-area {
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: center;
            margin: 8px 0 12px;
        }

        .timer-ring {
            position: relative;
            width: 40px;
            height: 40px;
        }

        .timer-svg {
            transform: rotate(-90deg);
        }

        .timer-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 14px;
            font-weight: 700;
            color: #fff;
        }

        .timer-label {
            font-size: 12px;
            color: #888;
        }


        @keyframes shake {

            0%,
            100% {
                transform: translateX(0);
            }

            20% {
                transform: translateX(-10px);
            }

            40% {
                transform: translateX(10px);
            }

            60% {
                transform: translateX(-6px);
            }

            80% {
                transform: translateX(6px);
            }
        }

        .shake {
            animation: shake 0.4s ease;
        }


        .game-number-display.flash-red {
            color: #ff6b6b;
            animation: flashRed 0.6s ease 2;
        }

        @keyframes flashRed {

            0%,
            100% {
                opacity: 1;
            }

            50% {
                opacity: 0.2;
            }
        }

        .game-number-display.flash-gold {
            color: #ffd700;
            animation: flashGold 0.8s ease 3;
        }

        @keyframes flashGold {

            0%,
            100% {
                transform: scale(1);
            }

            50% {
                transform: scale(1.3);
            }
        }
    </style>
</head>

<body>

    <div class="game-container">
        <div class="game-header">
            <div class="game-title">
                <i class="fas fa-dice"></i> 猜数字
            </div>
            <a onclick="javascript:window.close();" class="back-btn">
                <i class="fas fa-times"></i> 退出
            </a>
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
                <span class="stat-label">🎯 剩余次数</span>
                <span class="stat-value chances" id="chancesDisplay">7</span>
            </div>
        </div>
        <div class="timer-area" id="timerArea" style="display:none;">
            <div class="timer-ring">
                <svg viewBox="0 0 36 36" class="timer-svg">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#ffd700" stroke-width="2"
                        stroke-dasharray="100" stroke-dashoffset="100" id="timerCircle" />
                </svg>
                <span class="timer-text" id="timerText">10</span>
            </div>
            <span class="timer-label">⏱️ 倒计时</span>
        </div>
        <div class="bet-area" id="betArea">
            <span class="bet-label">押注：</span>
            <input type="number" class="bet-input" id="betInput" min="10" max="50" value="10" step="5">
            <div class="bet-quick">
                <button class="bet-quick-btn" data-amount="10">10</button>
                <button class="bet-quick-btn" data-amount="20">20</button>
                <button class="bet-quick-btn" data-amount="30">30</button>
                <button class="bet-quick-btn" data-amount="50">50</button>
            </div>
        </div>
        <div class="game-status" id="gameStatus">
            <div class="game-number-display" id="numberDisplay">?</div>
            <div class="game-hint" id="hintText">输入数字开始游戏</div>
        </div>
        <div class="guess-area">
            <input type="number" class="guess-input" id="guessInput" placeholder="1-100" min="1" max="100" disabled>
            <button class="guess-btn" id="guessBtn" disabled>猜</button>
        </div>
        <div class="odds-table" id="oddsTable">
            <div class="odds-item" data-guess="1"><span class="guess-count">1</span> <span class="multiplier">x5.0</span></div>
            <div class="odds-item" data-guess="2"><span class="guess-count">2</span> <span class="multiplier">x3.0</span></div>
            <div class="odds-item" data-guess="3"><span class="guess-count">3</span> <span class="multiplier">x2.0</span></div>
            <div class="odds-item" data-guess="4"><span class="guess-count">4</span> <span class="multiplier">x1.5</span></div>
            <div class="odds-item" data-guess="5"><span class="guess-count">5</span> <span class="multiplier">x1.2</span></div>
            <div class="odds-item" data-guess="6"><span class="guess-count">6</span> <span class="multiplier">x1.0</span></div>
            <div class="odds-item" data-guess="7"><span class="guess-count">7</span> <span class="multiplier">x0.8</span></div>
        </div>
        <div class="history-area" id="historyArea"></div>
        <div class="actions">
            <button class="btn-reset" id="resetBtn">重新开始</button>
        </div>
    </div>

    <script src="/ast/authwrite.js"></script>
    <script src="/ast/sweetalert2.all.min.js"></script>
    <script src="/ast/console.js"></script>
    <script>
        function plugin_post_requests(data, callback, options = {}) {
            const {
                url = '/api/',
                    timeout = 10000,
                    headers = {},
                    withCredentials = false
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
                    let result;

                    if (contentType && contentType.includes('application/json')) {
                        result = await response.json();
                    } else {
                        result = await response.text();
                    }

                    if (!response.ok) {
                        throw new Error(result.message || `请求失败: ${response.status}`);
                    }

                    callback(null, result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);

                    if (error.name === 'AbortError') {
                        callback(new Error('请求超时'), null);
                    } else {
                        callback(error, null);
                    }
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
        const tmd_newcontroler = new tmdbaseauthdownyho();
        const userId = '<?php echo $q_suname; ?>';
        const initialCoins = <?php echo $gcoins; ?>;
        const state = {
            targetNumber: 0,
            chances: 7,
            maxChances: 7,
            bet: 10,
            guessCount: 0,
            history: [],
            isPlaying: false,
            isFinished: false,
            coins: initialCoins,
            gameId: null
        };
        const $ = id => document.getElementById(id);
        const gcoinDisplay = $('gcoinDisplay');
        const betDisplay = $('betDisplay');
        const chancesDisplay = $('chancesDisplay');
        const betInput = $('betInput');
        const numberDisplay = $('numberDisplay');
        const hintText = $('hintText');
        const guessInput = $('guessInput');
        const guessBtn = $('guessBtn');
        const resetBtn = $('resetBtn');
        const historyArea = $('historyArea');
        const oddsItems = document.querySelectorAll('.odds-item');
        const betQuickBtns = document.querySelectorAll('.bet-quick-btn');
        const ODDS = {
            1: 5.0,
            2: 3.0,
            3: 2.0,
            4: 1.5,
            5: 1.2,
            6: 1.0,
            7: 0.8
        };
        state.timer = null;
        state.timerCount = 10;

        function startTimer() {
            const timerArea = document.getElementById('timerArea');
            timerArea.style.display = 'flex';
            state.timerCount = 10;
            updateTimerDisplay();
            if (state.timer) clearInterval(state.timer);
            state.timer = setInterval(() => {
                state.timerCount--;
                updateTimerDisplay();
                if (state.timerCount <= 0) {
                    clearInterval(state.timer);
                    const randomGuess = Math.floor(Math.random() * 100) + 1;
                    guessInput.value = randomGuess;
                    makeGuess();
                    Swal.fire({
                        icon: 'info',
                        title: '⏰ 时间到！',
                        text: `系统帮你随机猜了 ${randomGuess}`,
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            }, 1000);
        }

        function stopTimer() {
            if (state.timer) {
                clearInterval(state.timer);
                state.timer = null;
            }
            document.getElementById('timerArea').style.display = 'none';
        }

        function updateTimerDisplay() {
            const circle = document.getElementById('timerCircle');
            const text = document.getElementById('timerText');
            const pct = (state.timerCount / 10) * 100;
            circle.style.strokeDashoffset = 100 - pct;
            circle.style.stroke = state.timerCount <= 3 ? '#ff6b6b' : '#ffd700';
            text.textContent = state.timerCount;
            text.style.color = state.timerCount <= 3 ? '#ff6b6b' : '#fff';
        }

        function updateUI() {
            gcoinDisplay.textContent = state.coins.toLocaleString();
            betDisplay.textContent = state.bet;
            chancesDisplay.textContent = state.chances;
            guessInput.disabled = !state.isPlaying || state.isFinished;
            guessBtn.disabled = !state.isPlaying || state.isFinished;
            oddsItems.forEach(item => {
                const guess = parseInt(item.dataset.guess);
                item.classList.toggle('active', guess === state.guessCount + 1 && state.isPlaying);
            });
            betInput.disabled = state.isPlaying;
            betQuickBtns.forEach(btn => {
                btn.disabled = state.isPlaying;
                btn.classList.toggle('active', parseInt(btn.dataset.amount) === state.bet);
            });
        }

        function renderHistory() {
            historyArea.innerHTML = state.history.map(h =>
                `<div class="history-item">
                <span>第 ${h.guess} 次</span>
                <span class="num">${h.number}</span>
                <span class="result-${h.result}">${h.result === 'correct' ? '✅ 正确！' : h.result === 'high' ? '⬆️ 大了' : '⬇️ 小了'}</span>
            </div>`
            ).join('');
            historyArea.scrollTop = historyArea.scrollHeight;
        }

        function setHint(text, className = '') {
            hintText.textContent = text;
            hintText.className = 'game-hint ' + className;
        }

        function setNumberDisplay(text, className = '') {
            numberDisplay.textContent = text;
            numberDisplay.className = 'game-number-display ' + className;
        }

        function startGame(bet) {
            state.targetNumber = Math.floor(Math.random() * 100) + 1;
            state.chances = 7;
            state.maxChances = 7;
            state.guessCount = 0;
            state.history = [];
            state.isPlaying = true;
            state.isFinished = false;
            state.bet = bet;
            state.coins -= bet;
            updateCoinDisplay();
            setNumberDisplay('?', '');
            setHint(`🎯 猜一个 1-100 的数字，你有 7 次机会`, '');
            guessInput.value = '';
            guessInput.focus();
            historyArea.innerHTML = '';
            renderHistory();
            updateUI();
            startTimer();
            state.gameId = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        }

        function makeGuess() {
            if (!state.isPlaying || state.isFinished) return;
            if (state.timer) {
                clearInterval(state.timer);
                state.timer = null;
                document.getElementById('timerArea').style.display = 'none';
            }
            const input = parseInt(guessInput.value);
            if (isNaN(input) || input < 1 || input > 100) {
                setHint('⚠️ 请输入 1-100 之间的数字', '');
                guessInput.value = '';
                guessInput.focus();
                return;
            }
            state.guessCount++;
            state.chances--;
            const diff = input - state.targetNumber;
            let result = '';
            let hintClass = '';
            if (diff === 0) {
                setNumberDisplay(state.targetNumber, 'flash-gold');
                result = 'correct';
                hintClass = 'correct';
                setHint(`🎉 恭喜！就是 ${state.targetNumber}！`, 'correct');
                setNumberDisplay(state.targetNumber, 'correct');
                const multiplier = ODDS[state.guessCount] || 1.0;
                const winnings = Math.round(state.bet * multiplier);
                state.coins += winnings;
                updateCoinDisplay();
                state.isFinished = true;
                Swal.fire({
                    icon: 'success',
                    title: '🎉 猜中了！',
                    html: `
                    <div style="font-size:64px;margin:10px 0;">🎯</div>
                    <p>数字就是 <strong style="color:#ffd700;font-size:24px;">${state.targetNumber}</strong></p>
                    <p>第 <strong>${state.guessCount}</strong> 次猜中，赔率 <strong>x${multiplier}</strong></p>
                    <p style="font-size:20px;color:#ffd700;">+${winnings} G币</p>
                `,
                    confirmButtonText: '继续'
                });

            } else if (diff > 0) {
                result = 'high';
                hintClass = 'high';
                setHint(`⬆️ ${input} 大了，还有 ${state.chances} 次机会`, 'high');
                setNumberDisplay('⬆️', 'wrong');
                startTimer();
            } else {
                result = 'low';
                hintClass = 'low';
                setHint(`⬇️ ${input} 小了，还有 ${state.chances} 次机会`, 'low');
                setNumberDisplay('⬇️', 'wrong');
                startTimer();
            }
            state.history.push({
                guess: state.guessCount,
                number: input,
                result: result
            });
            renderHistory();
            if (state.chances === 0 && result !== 'correct') {
                state.isFinished = true;
                setHint(`💔 没猜中，正确答案是 ${state.targetNumber}`, '');
                setNumberDisplay(state.targetNumber, 'wrong');
                Swal.fire({
                    icon: 'error',
                    title: '😅 没猜中',
                    html: `
                    <div style="font-size:48px;margin:10px 0;">💔</div>
                    <p>正确答案是 <strong style="color:#ff6b6b;font-size:24px;">${state.targetNumber}</strong></p>
                    <p>损失 <strong style="color:#ff6b6b;">${state.bet} G币</strong></p>
                `,
                    confirmButtonText: '再来一次'
                });
            }

            guessInput.value = '';
            guessInput.focus();
            updateUI();
        }

        function resetGame() {
            if (state.isPlaying && !state.isFinished) {
                state.coins += state.bet;
                updateCoinDisplay();
            }
            state.isPlaying = false;
            state.isFinished = false;
            state.chances = 7;
            state.guessCount = 0;
            state.history = [];
            state.targetNumber = 0;
            setNumberDisplay('?', '');
            setHint('💰 下注后开始游戏', '');
            guessInput.value = '';
            historyArea.innerHTML = '';
            updateUI();
            betInput.disabled = false;
            betQuickBtns.forEach(btn => btn.disabled = false);
            if (state.timer) {
                clearInterval(state.timer);
                state.timer = null;
            }
            document.getElementById('timerArea').style.display = 'none';
        }

        function updateCoinDisplay() {
            gcoinDisplay.textContent = state.coins.toLocaleString();
            syncCoins(state.coins);
        }
        let syncTimer = null;

        function syncCoins(coins) {
            if (syncTimer) {
                clearTimeout(syncTimer);
            }
            syncTimer = setTimeout(async () => {
                try {
                    const authdata = await tmd_newcontroler.writenewwords(userId);
                    plugin_post_requests({
                        UserId: authdata,
                        coins: coins,
                        game_id: state.gameId || 'guess',
                        action: 'sync_coins'
                    }, (error, response) => {
                        if (error) {
                            console.warn('同步G币失败:', error);
                        }
                    }, {
                        url: '/api/game_sync/guess/',
                        timeout: 5000
                    });
                } catch (e) {
                    console.warn('同步失败:', e);
                }
            }, 1000);
        }
        betInput.addEventListener('input', function() {
            let val = parseInt(this.value) || 10;
            val = Math.max(10, Math.min(50, val));
            val = Math.round(val / 5) * 5;
            if (val < 10) val = 10;
            if (val > 50) val = 50;
            this.value = val;
            state.bet = val;
            updateUI();
        });

        betInput.addEventListener('blur', function() {
            let val = parseInt(this.value) || 10;
            val = Math.max(10, Math.min(50, val));
            val = Math.round(val / 5) * 5;
            if (val < 10) val = 10;
            if (val > 50) val = 50;
            this.value = val;
            state.bet = val;
            updateUI();
        });
        betQuickBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                if (state.isPlaying) return;
                const amount = parseInt(this.dataset.amount);
                betInput.value = amount;
                state.bet = amount;
                updateUI();
            });
        });
        guessBtn.addEventListener('click', makeGuess);
        guessInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                makeGuess();
            }
        });
        resetBtn.addEventListener('click', function() {
            if (state.isPlaying && !state.isFinished) {
                Swal.fire({
                    title: '确定要重新开始吗？',
                    text: '当前对局将作废，押注会退还',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '重新开始',
                    cancelButtonText: '继续游戏'
                }).then(result => {
                    if (result.isConfirmed) {
                        resetGame();
                    }
                });
            } else {
                resetGame();
            }
        });
        updateUI();
        setHint('💰 下注后点击"开始"或按回车开始游戏', '');
        betInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !state.isPlaying && !state.isFinished) {
                e.preventDefault();
                const bet = parseInt(this.value) || 10;
                if (bet > state.coins) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'G币不足',
                        text: `你只有 ${state.coins} G币，最多下注 ${Math.min(state.coins, 50)}`
                    });
                    return;
                }
                if (bet < 10 || bet > 50) {
                    Swal.fire({
                        icon: 'warning',
                        title: '押注范围',
                        text: '押注范围 10-50 G币'
                    });
                    return;
                }
                startGame(bet);
            }
        });
        document.querySelector('.game-status').addEventListener('click', function() {
            if (!state.isPlaying && !state.isFinished) {
                const bet = parseInt(betInput.value) || 10;
                if (bet > state.coins) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'G币不足',
                        text: `你只有 ${state.coins} G币，最多下注 ${Math.min(state.coins, 50)}`
                    });
                    return;
                }
                startGame(bet);
            }
        });
    </script>
</body>

</html>