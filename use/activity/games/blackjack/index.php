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
    <title>♠️ 21点</title>
    <link rel="stylesheet" href="/ast/fontawe/css/all.min.css">
    <link rel="stylesheet" href="/ast/sweetalert2.all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: linear-gradient(145deg, #0a0a12, #1a1a2e, #0f0c29);
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
            background: rgba(255,255,255,0.04);
            backdrop-filter: blur(12px);
            border-radius: 24px;
            padding: 32px 40px;
            max-width: 100%;
            width: 100%;
            border: 1px solid rgba(255,255,255,0.06);
            box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        }
        .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .game-title { font-size: 24px; font-weight: 700; }
        .game-title i { color: #ffd700; }
        .back-btn {
            color: #888;
            text-decoration: none;
            font-size: 14px;
            padding: 6px 14px;
            border-radius: 8px;
            background: rgba(255,255,255,0.05);
            transition: 0.3s;
        }
        .back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .game-stats {
            display: flex;
            gap: 20px;
            background: rgba(255,255,255,0.04);
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
        .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
        .stat-value.coins { color: #ffd700; }
        .stat-value.bet { color: #4FC3F7; }
        .stat-value.result { color: #81C784; }

        
        .table-area {
            background: radial-gradient(ellipse at center, #1a6b3c, #0d3b22);
            border-radius: 100px 100px 20px 20px;
            padding: 24px 30px 30px;
            margin-bottom: 16px;
            min-height: 260px;
            position: relative;
            border: 2px solid rgba(255,215,0,0.15);
            box-shadow: inset 0 0 60px rgba(0,0,0,0.5);
        }

        .hand-section {
            display: flex;
            flex-direction: column;
            margin-bottom: 12px;
        }
        .hand-section:last-child { margin-bottom: 0; }

        .hand-label {
            font-size: 12px;
            color: rgba(255,255,255,0.5);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .hand-label .hand-total {
            font-size: 18px;
            font-weight: 700;
            color: #fff;
        }
        .hand-label .hand-total.bust { color: #ff6b6b; }
        .hand-label .hand-total.blackjack { color: #ffd700; }

        .hand-cards {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            min-height: 70px;
        }

      
        .card {
            width: 58px;
            height: 80px;
            border-radius: 8px;
            background: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 18px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.4);
            transition: 0.3s;
            position: relative;
            flex-shrink: 0;
            user-select: none;
        }
        .card .rank { font-size: 20px; line-height: 1; }
        .card .suit { font-size: 22px; line-height: 1; margin-top: 2px; }
        .card.red { color: #d32f2f; }
        .card.black { color: #1a1a1a; }

        .card.card-back {
            background: linear-gradient(135deg, #1a237e, #0d1442);
            border: 2px solid rgba(255,255,255,0.1);
        }
        .card.card-back::after {
            content: '♠';
            font-size: 28px;
            color: rgba(255,255,255,0.15);
        }
        .card.card-back .rank,
        .card.card-back .suit { display: none; }

        .card.card-small {
            width: 46px;
            height: 64px;
            font-size: 14px;
        }
        .card.card-small .rank { font-size: 16px; }
        .card.card-small .suit { font-size: 18px; }

    
        .bet-area {
            background: rgba(255,255,255,0.04);
            border-radius: 12px;
            padding: 14px 18px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        .bet-label { font-size: 14px; color: #aaa; }
        .bet-input {
            flex: 1;
            min-width: 100px;
            padding: 8px 14px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            background: rgba(255,255,255,0.05);
            color: #fff;
            font-size: 16px;
            font-weight: 600;
            outline: none;
            transition: 0.3s;
        }
        .bet-input:focus { border-color: #667eea; background: rgba(255,255,255,0.08); }
        .bet-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .bet-quick { display: flex; gap: 6px; }
        .bet-quick-btn {
            padding: 6px 14px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            background: transparent;
            color: #aaa;
            font-size: 13px;
            cursor: pointer;
            transition: 0.3s;
        }
        .bet-quick-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .bet-quick-btn.active { border-color: #667eea; color: #667eea; }

  
        .actions-area {
            display: flex;
            gap: 10px;
            margin-bottom: 14px;
        }
        .action-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.3s;
        }
        .action-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
            transform: none !important;
        }
        .action-btn.hit {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: #fff;
        }
        .action-btn.hit:hover:not(:disabled) {
            transform: scale(1.03);
            box-shadow: 0 4px 20px rgba(102,126,234,0.4);
        }
        .action-btn.stand {
            background: rgba(255,255,255,0.08);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .action-btn.stand:hover:not(:disabled) {
            background: rgba(255,255,255,0.15);
        }
        .action-btn.double {
            background: linear-gradient(135deg, #f7971e, #ffd200);
            color: #1a1a2e;
        }
        .action-btn.double:hover:not(:disabled) {
            transform: scale(1.03);
            box-shadow: 0 4px 20px rgba(255,215,0,0.3);
        }
        .action-btn.reset-game {
            background: transparent;
            color: #888;
            border: 1px solid rgba(255,255,255,0.06);
        }
        .action-btn.reset-game:hover:not(:disabled) {
            background: rgba(255,255,255,0.05);
            color: #fff;
        }

    
        .message-area {
            text-align: center;
            min-height: 30px;
            font-size: 16px;
            color: #888;
            margin-bottom: 8px;
        }
        .message-area.win { color: #4CAF50; }
        .message-area.lose { color: #ff6b6b; }
        .message-area.blackjack { color: #ffd700; font-size: 20px; font-weight: 700; }

      
        .odds-info {
            display: flex;
            gap: 12px;
            justify-content: center;
            font-size: 12px;
            color: #666;
            padding: 6px 0;
            border-top: 1px solid rgba(255,255,255,0.04);
            margin-top: 4px;
        }
        .odds-info span { display: flex; align-items: center; gap: 4px; }
        .odds-info .highlight { color: #ffd700; }

      
        @media (max-width: 480px) {
            .game-container { padding: 16px; }
            .table-area { padding: 16px; border-radius: 40px 40px 12px 12px; min-height: 200px; }
            .card { width: 44px; height: 62px; font-size: 14px; }
            .card .rank { font-size: 15px; }
            .card .suit { font-size: 16px; }
            .card.card-small { width: 36px; height: 50px; font-size: 11px; }
            .card.card-small .rank { font-size: 12px; }
            .card.card-small .suit { font-size: 14px; }
            .game-stats { gap: 8px; padding: 8px 10px; }
            .stat-value { font-size: 15px; }
            .bet-area { flex-direction: column; }
            .bet-input { width: 100%; }
            .bet-quick { width: 100%; justify-content: center; }
            .actions-area { flex-wrap: wrap; }
            .action-btn { min-width: 70px; flex: 1; }
            .hand-cards { gap: 6px; }
            .hand-label .hand-total { font-size: 14px; }
            .odds-info { flex-wrap: wrap; gap: 4px 12px; }
        }
    </style>
</head>
<body>

<div class="game-container">
    <div class="game-header">
        <div class="game-title"><i class="fas fa-crown"></i> 21点</div>
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
            <span class="stat-label">📊 结果</span>
            <span class="stat-value result" id="resultDisplay">-</span>
        </div>
    </div>
    <div class="table-area" id="tableArea">
        <div class="hand-section">
            <div class="hand-label">
                <span>🏦 庄家</span>
                <span class="hand-total" id="dealerTotal">?</span>
            </div>
            <div class="hand-cards" id="dealerCards"></div>
        </div>
        <div class="hand-section">
            <div class="hand-label">
                <span>🧑 玩家</span>
                <span class="hand-total" id="playerTotal">?</span>
            </div>
            <div class="hand-cards" id="playerCards"></div>
        </div>
    </div>
    <div class="message-area" id="messageArea">下注后点击"发牌"开始</div>
    <div class="bet-area" id="betArea">
        <span class="bet-label">押注：</span>
        <input type="number" class="bet-input" id="betInput" min="20" max="200" value="20" step="10">
        <div class="bet-quick">
            <button class="bet-quick-btn" data-amount="20">20</button>
            <button class="bet-quick-btn" data-amount="50">50</button>
            <button class="bet-quick-btn" data-amount="100">100</button>
            <button class="bet-quick-btn" data-amount="200">200</button>
        </div>
    </div>
    <div class="actions-area">
        <button class="action-btn hit" id="hitBtn" disabled>要牌</button>
        <button class="action-btn stand" id="standBtn" disabled>停牌</button>
        <button class="action-btn double" id="doubleBtn" disabled>加倍</button>
        <button class="action-btn reset-game" id="dealBtn">🔄 发牌</button>
    </div>
    <div class="odds-info">
        <span>🏆 普通赢 <span class="highlight">x1.5</span></span>
        <span>♠️ 黑杰克 <span class="highlight">x2.0</span></span>
        <span>🌟 五龙 <span class="highlight">x2.5</span></span>
    </div>
</div>

<script src="/ast/authwrite.js"></script>
<script src="/ast/sweetalert2.all.min.js"></script>
<script src="/ast/console.js"></script>
<script>
    function plugin_post_requests(data, callback, options = {}) {
        const { url = '/api/', timeout = 10000, headers = {}, withCredentials = false } = options;
        const defaultHeaders = { 'Content-Type': 'application/json', ...headers };
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
        bet: 20,
        isPlaying: false,
        isFinished: false,
        deck: [],
        playerHand: [],
        dealerHand: [],
        playerTotal: 0,
        dealerTotal: 0,
        hasBlackjack: false,
        isDoubled: false,
        gameId: null
    };
    const $ = id => document.getElementById(id);
    const gcoinDisplay = $('gcoinDisplay');
    const betDisplay = $('betDisplay');
    const resultDisplay = $('resultDisplay');
    const betInput = $('betInput');
    const dealerCards = $('dealerCards');
    const playerCards = $('playerCards');
    const dealerTotal = $('dealerTotal');
    const playerTotal = $('playerTotal');
    const messageArea = $('messageArea');
    const hitBtn = $('hitBtn');
    const standBtn = $('standBtn');
    const doubleBtn = $('doubleBtn');
    const dealBtn = $('dealBtn');
    const betQuickBtns = document.querySelectorAll('.bet-quick-btn');
    const SUITS = ['♠', '♥', '♦', '♣'];
    const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    function createDeck() {
        const deck = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                deck.push({ rank, suit, value: getCardValue(rank) });
            }
        }
        return shuffle(deck);
    }

    function shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    function getCardValue(rank) {
        if (rank === 'A') return 11;
        if (['J', 'Q', 'K'].includes(rank)) return 10;
        return parseInt(rank);
    }

    function getHandTotal(hand) {
        let total = hand.reduce((sum, c) => sum + c.value, 0);
        let aces = hand.filter(c => c.rank === 'A').length;
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return total;
    }

    function isBlackjack(hand) {
        return hand.length === 2 && getHandTotal(hand) === 21;
    }
    function isBust(total) { return total > 21; }
    function isFiveCard(hand) { return hand.length >= 5 && getHandTotal(hand) <= 21; }
    function renderCard(card, hidden = false) {
        if (hidden) {
            return `<div class="card card-back"></div>`;
        }
        const isRed = card.suit === '♥' || card.suit === '♦';
        const rankDisplay = card.rank;
        return `
            <div class="card ${isRed ? 'red' : 'black'}">
                <span class="rank">${rankDisplay}</span>
                <span class="suit">${card.suit}</span>
            </div>
        `;
    }

    function renderHand(container, hand, hideFirst = false) {
        container.innerHTML = hand.map((card, i) => {
            if (hideFirst && i === 0) return renderCard(card, true);
            return renderCard(card);
        }).join('');
    }

    function updateUI() {
        gcoinDisplay.textContent = state.coins.toLocaleString();
        betDisplay.textContent = state.bet;
        const dealerHide = state.isPlaying && !state.isFinished;
        renderHand(dealerCards, state.dealerHand, dealerHide);
        renderHand(playerCards, state.playerHand, false);
        const dealerShow = state.isFinished || !state.isPlaying;
        dealerTotal.textContent = dealerShow ? getHandTotal(state.dealerHand) : '?';
        dealerTotal.className = 'hand-total' + (dealerShow && isBust(getHandTotal(state.dealerHand)) ? ' bust' : '');
        const playerTotalVal = getHandTotal(state.playerHand);
        playerTotal.textContent = playerTotalVal;
        playerTotal.className = 'hand-total' + (isBust(playerTotalVal) ? ' bust' : '');
        const canAct = state.isPlaying && !state.isFinished && !isBust(playerTotalVal);
        hitBtn.disabled = !canAct;
        standBtn.disabled = !canAct;
        doubleBtn.disabled = !canAct || state.playerHand.length !== 2 || state.isDoubled;

        betInput.disabled = state.isPlaying;
        betQuickBtns.forEach(btn => {
            btn.disabled = state.isPlaying;
            btn.classList.toggle('active', parseInt(btn.dataset.amount) === state.bet);
        });

        dealBtn.textContent = state.isPlaying ? '🔄 重开' : '🔄 发牌';
    }

    function setMessage(text, className = '') {
        messageArea.textContent = text;
        messageArea.className = 'message-area ' + className;
    }
    function setResult(text) {
        resultDisplay.textContent = text;
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
                    game_id: state.gameId || 'blackjack',
                    action: 'sync_coins'
                }, (error) => {
                    if (error) console.warn('同步G币失败:', error);
                }, { url: '/api/game_sync/blackjack/', timeout: 5000 });
            } catch (e) { console.warn('同步失败:', e); }
        }, 1000);
    }
    function startGame(bet) {
        if (bet > state.coins) {
            Swal.fire({ icon: 'warning', title: 'G币不足', text: `你只有 ${state.coins} G币` });
            return;
        }
        state.bet = bet;
        state.isPlaying = true;
        state.isFinished = false;
        state.isDoubled = false;
        state.hasBlackjack = false;
        state.gameId = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        state.coins -= bet;
        updateUI();
        state.deck = createDeck();
        state.playerHand = [drawCard(), drawCard()];
        state.dealerHand = [drawCard(), drawCard()];
        const playerTotalVal = getHandTotal(state.playerHand);
        if (isBlackjack(state.playerHand)) {
            state.hasBlackjack = true;
            state.isFinished = true;
            const winnings = Math.round(bet * 2.0);
            state.coins += winnings;
            updateUI();
            setMessage('♠️ 黑杰克！ +' + winnings + ' G币', 'blackjack');
            setResult('🏆 黑杰克');
            renderHand(dealerCards, state.dealerHand, false);
            dealerTotal.textContent = getHandTotal(state.dealerHand);
            syncCoins(state.coins);
            updateUI();
            return;
        }
        if (isBlackjack(state.dealerHand)) {
            state.isFinished = true;
            setMessage('😅 庄家黑杰克，你输了', 'lose');
            setResult('💔 败');
            renderHand(dealerCards, state.dealerHand, false);
            dealerTotal.textContent = getHandTotal(state.dealerHand);
            syncCoins(state.coins);
            updateUI();
            return;
        }
        setMessage(`🎯 你的点数是 ${playerTotalVal}，继续要牌还是停牌？`);
        setResult('⏳ 进行中');
        updateUI();
    }

    function drawCard() {
        return state.deck.pop();
    }

    function hit() {
        if (!state.isPlaying || state.isFinished) return;
        const card = drawCard();
        state.playerHand.push(card);
        const total = getHandTotal(state.playerHand);
        if (isFiveCard(state.playerHand) && total <= 21) {
            state.isFinished = true;
            const winnings = Math.round(state.bet * 2.5);
            state.coins += winnings;
            setMessage('🌟 五龙！ +' + winnings + ' G币', 'win');
            setResult('🏆 五龙');
            dealerPlay();
            syncCoins(state.coins);
            updateUI();
            return;
        }

        if (isBust(total)) {
            state.isFinished = true;
            setMessage(`💔 爆牌了！点数为 ${total}`, 'lose');
            setResult('💔 败');
            dealerPlay();
            syncCoins(state.coins);
            updateUI();
            return;
        }

        setMessage(`🎯 你的点数是 ${total}，继续要牌还是停牌？`);
        updateUI();
    }

    function stand() {
        if (!state.isPlaying || state.isFinished) return;
        state.isFinished = true;
        dealerPlay();
        updateUI();
    }

    function doubleDown() {
        if (!state.isPlaying || state.isFinished || state.isDoubled) return;
        if (state.playerHand.length !== 2) {
            setMessage('只能在开局时加倍', '');
            return;
        }
        const doubleBet = state.bet;
        if (doubleBet > state.coins) {
            Swal.fire({ icon: 'warning', title: 'G币不足', text: `加倍需要 ${doubleBet} G币` });
            return;
        }
        state.coins -= doubleBet;
        state.bet += doubleBet;
        state.isDoubled = true;
        const card = drawCard();
        state.playerHand.push(card);
        const total = getHandTotal(state.playerHand);

        if (isBust(total)) {
            state.isFinished = true;
            setMessage(`💔 爆牌了！点数为 ${total}`, 'lose');
            setResult('💔 败');
            dealerPlay();
            syncCoins(state.coins);
            updateUI();
            return;
        }

        state.isFinished = true;
        dealerPlay();
        updateUI();
    }

    function dealerPlay() {
        renderHand(dealerCards, state.dealerHand, false);
        let total = getHandTotal(state.dealerHand);
        while (total < 17) {
            const card = drawCard();
            state.dealerHand.push(card);
            total = getHandTotal(state.dealerHand);
            renderHand(dealerCards, state.dealerHand, false);
        }
        dealerTotal.textContent = total;
        dealerTotal.className = 'hand-total' + (isBust(total) ? ' bust' : '');
        const playerTotalVal = getHandTotal(state.playerHand);
        const dealerTotalVal = total;
        if (isBust(playerTotalVal)) {
            setMessage(`💔 你爆牌了 (${playerTotalVal})`, 'lose');
            setResult('💔 败');
            syncCoins(state.coins);
            return;
        }
        if (isBust(dealerTotalVal)) {
            const multiplier = state.hasBlackjack ? 2.0 : 1.5;
            const winnings = Math.round(state.bet * multiplier);
            state.coins += winnings;
            setMessage(`🎉 庄家爆牌！你赢了 +${winnings} G币`, 'win');
            setResult('🏆 胜');
            syncCoins(state.coins);
            return;
        }
        if (playerTotalVal > dealerTotalVal) {
            const multiplier = state.hasBlackjack ? 2.0 : (isFiveCard(state.playerHand) ? 2.5 : 1.5);
            const winnings = Math.round(state.bet * multiplier);
            state.coins += winnings;
            setMessage(`🎉 你赢了！${playerTotalVal} > ${dealerTotalVal} +${winnings} G币`, 'win');
            setResult('🏆 胜');
        } else if (playerTotalVal < dealerTotalVal) {
            setMessage(`💔 你输了 ${playerTotalVal} < ${dealerTotalVal}`, 'lose');
            setResult('💔 败');
        } else {
            state.coins += state.bet;
            setMessage(`🤝 平局！${playerTotalVal} = ${dealerTotalVal}，退还押注`, '');
            setResult('🤝 平');
        }

        syncCoins(state.coins);
        updateUI();
    }

    function resetGame() {
        if (state.isPlaying && !state.isFinished) {
            state.coins += state.bet;
            syncCoins(state.coins);
        }
        state.isPlaying = false;
        state.isFinished = false;
        state.isDoubled = false;
        state.hasBlackjack = false;
        state.playerHand = [];
        state.dealerHand = [];
        state.deck = [];

        setMessage('下注后点击"发牌"开始', '');
        setResult('-');
        renderHand(dealerCards, [], false);
        renderHand(playerCards, [], false);
        dealerTotal.textContent = '?';
        dealerTotal.className = 'hand-total';
        playerTotal.textContent = '?';
        playerTotal.className = 'hand-total';

        dealBtn.textContent = '🔄 发牌';
        updateUI();
    }

   

    betInput.addEventListener('input', function() {
        let val = parseInt(this.value) || 20;
        val = Math.max(20, Math.min(200, val));
        val = Math.round(val / 10) * 10;
        if (val < 20) val = 20;
        if (val > 200) val = 200;
        this.value = val;
        state.bet = val;
        updateUI();
    });

    betInput.addEventListener('blur', function() {
        let val = parseInt(this.value) || 20;
        val = Math.max(20, Math.min(200, val));
        val = Math.round(val / 10) * 10;
        if (val < 20) val = 20;
        if (val > 200) val = 200;
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

    dealBtn.addEventListener('click', function() {
        if (state.isPlaying) {
            if (!state.isFinished) {
                Swal.fire({
                    title: '确定要重新开始吗？',
                    text: '当前对局将作废',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '重新开始',
                    cancelButtonText: '继续'
                }).then(result => {
                    if (result.isConfirmed) resetGame();
                });
                return;
            }
            resetGame();
            return;
        }
        const bet = parseInt(betInput.value) || 20;
        startGame(bet);
    });

    hitBtn.addEventListener('click', hit);
    standBtn.addEventListener('click', stand);
    doubleBtn.addEventListener('click', doubleDown);

    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'h' || e.key === 'H') { if (!hitBtn.disabled) hit(); }
        if (e.key === 's' || e.key === 'S') { if (!standBtn.disabled) stand(); }
        if (e.key === 'd' || e.key === 'D') { if (!doubleBtn.disabled) doubleDown(); }
        if (e.key === 'Enter' && !state.isPlaying) { dealBtn.click(); }
    });

   
    resetGame();
    updateUI();
    setMessage('💰 下注后点击"发牌"开始', '');
</script>
</body>
</html>