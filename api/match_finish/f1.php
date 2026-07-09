<?php
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(405, null, '只支持 POST 请求');
}
require_once $_SERVER['DOCUMENT_ROOT'] . '/api/quot.php';
requireApiAuth();
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    sendResponse(400, null, '无效的请求数据');
}
$requiredFields = ['matchid', 'winner', 'loser', 'scores'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field])) {
        sendResponse(400, null, "缺少必要字段: {$field}");
    }
}
$matchId = trim($input['matchid']);
$matchId2 = trim($input['matchId2']);
$winnerId = trim($input['winner']);
$loserId = trim($input['loser']);
$scores = $input['scores'];
$gameData = $input['gameData'] ?? [];
$betInfo = $input['bet'] ?? null;
$gcoins = isset($input['gcoins']) ? intval($input['gcoins']) : 0;
$winnerScore = isset($scores[0]) ? intval($scores[0]) : 0;
$loserScore = isset($scores[1]) ? intval($scores[1]) : 0;
$betEnabled = false;
$betAmount = 0;
$betOdds = 2;
$betTotal = 0;
$winnerGcoinChange = 0;
$loserGcoinChange = 0;
if ($betInfo && isset($betInfo['enabled']) && $betInfo['enabled'] === true) {
    $betEnabled = true;
    $betAmount = isset($betInfo['betAmount']) ? intval($betInfo['betAmount']) : 0;
    $betOdds = isset($betInfo['odds']) ? intval($betInfo['odds']) : 2;
    $betTotal = isset($betInfo['totalBet']) ? intval($betInfo['totalBet']) : ($betAmount * $betOdds);
    $winnerGcoinChange = isset($betInfo['winnerWin']) ? intval($betInfo['winnerWin']) : $betTotal;
    $loserGcoinChange = isset($betInfo['loserLose']) ? intval($betInfo['loserLose']) : $betAmount;
}
$startTime = isset($gameData['startTime']) ? date('Y-m-d H:i:s', intval($gameData['startTime']) / 1000) : date('Y-m-d H:i:s');
$endTime = isset($gameData['endTime']) ? date('Y-m-d H:i:s', intval($gameData['endTime']) / 1000) : date('Y-m-d H:i:s');
$duration = isset($gameData['duration']) ? intval($gameData['duration'] / 1000) : 0;
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php';
try {
    $conn->autocommit(false);
    $checkStmt = $conn->prepare("SELECT id FROM mok_match_record WHERE id = ?");
    $checkStmt->bind_param("s", $matchId2);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    if ($checkResult->num_rows > 0) {
        $conn->rollback();
        sendResponse(409, null, "比赛记录已存在，请勿重复提交");
    }
    $checkStmt->close();
    $userStmt = $conn->prepare("SELECT id, spkcin FROM mok_user WHERE id = ? FOR UPDATE");
    $userStmt->bind_param("s", $winnerId);
    $userStmt->execute();
    $winnerResult = $userStmt->get_result();
    $winner = $winnerResult->fetch_assoc();
    if (!$winner) {
        $conn->rollback();
        sendResponse(404, null, "胜者用户不存在: {$winnerId}");
    }
    $userStmt->bind_param("s", $loserId);
    $userStmt->execute();
    $loserResult = $userStmt->get_result();
    $loser = $loserResult->fetch_assoc();
    if (!$loser) {
        $conn->rollback();
        sendResponse(404, null, "败者用户不存在: {$loserId}");
    }
    $userStmt->close();
    $winnerOldGcoin = intval($winner['spkcin']);
    $loserOldGcoin = intval($loser['spkcin']);
    $winnerNewGcoin = $winnerOldGcoin + $winnerGcoinChange;
    $loserNewGcoin = max(0, $loserOldGcoin - $loserGcoinChange);
    $updateStmt = $conn->prepare("UPDATE mok_user SET spkcin = ? WHERE id = ?");
    $updateStmt->bind_param("is", $winnerNewGcoin, $winnerId);
    $updateStmt->execute();
    $updateStmt->bind_param("is", $loserNewGcoin, $loserId);
    $updateStmt->execute();
    $updateStmt->close();
    $gameType = $gameData['gameType'] ?? 'quiz-race';
    $gameDataJson = json_encode($gameData, JSON_UNESCAPED_UNICODE);
    $insertSql = "
        INSERT INTO mok_match_record (
            game_name, game_type, winner_id, loser_id,
            winner_score, loser_score,
            bet_enabled, bet_amount, bet_odds, bet_total,
            winner_gcoin_change, loser_gcoin_change,
            game_data, start_time, end_time, duration
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?
        )
    ";
    $betEnabledInt = $betEnabled ? 1 : 0;
    $insertStmt = $conn->prepare($insertSql);
    $insertStmt->bind_param(
        "ssssiiiiiiiisssi",
        $matchId,
        $gameType,
        $winnerId,
        $loserId,
        $winnerScore,
        $loserScore,
        $betEnabledInt,
        $betAmount,
        $betOdds,
        $betTotal,
        $winnerGcoinChange,
        $loserGcoinChange,
        $gameDataJson,
        $startTime,
        $endTime,
        $duration
    );
    $betEnabledInt = $betEnabled ? 1 : 0;
    $insertStmt->execute();
    $recordId = $conn->insert_id;
    $insertStmt->close();
    $friendCheckSql = "
    SELECT COUNT(*) as cnt 
    FROM mok_contact 
    WHERE user_id = ? AND friend_id = ? AND add_status = 1
";
    $friendStmt = $conn->prepare($friendCheckSql);
    $friendStmt->bind_param("ss", $winnerId, $loserId);
    $friendStmt->execute();
    $friendResult = $friendStmt->get_result();
    $friendRow = $friendResult->fetch_assoc();
    $friendStmt->close();
    if ($friendRow['cnt'] > 0) {
        $intimacyIncrement = rand(5, 15);
        $intimacySql = "
        INSERT INTO mok_intimacy (user_id, target_id, value, create_time) 
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            value = value + ?
    ";
        $intimacyStmt = $conn->prepare($intimacySql);
        $intimacyStmt->bind_param("ssii", $winnerId, $loserId, $intimacyIncrement, $intimacyIncrement);
        $intimacyStmt->execute();
        $intimacyStmt->bind_param("ssii", $loserId, $winnerId, $intimacyIncrement, $intimacyIncrement);
        $intimacyStmt->execute();
        $intimacyStmt->close();
        $nickStmt = $conn->prepare("SELECT uname FROM mok_user WHERE id = ?");
        $nickStmt->bind_param("s", $winnerId);
        $nickStmt->execute();
        $winnerData = $nickStmt->get_result()->fetch_assoc();
        $nickStmt->close();
        $nickStmt = $conn->prepare("SELECT uname FROM mok_user WHERE id = ?");
        $nickStmt->bind_param("s", $loserId);
        $nickStmt->execute();
        $loserData = $nickStmt->get_result()->fetch_assoc();
        $nickStmt->close();
        $winnerName = $winnerData['uname'] ?? $winnerId;
        $loserName = $loserData['uname'] ?? $loserId;
        $durationMinutes = floor($duration / 60);
        $durationSeconds = $duration % 60;
        $timeStr = $durationMinutes . " 分 " . $durationSeconds . " 秒";
        $gameMode = str_replace('自定义-', '', $matchId);
        $description = "{$winnerName} 在 {$gameMode} 中战胜了 {$loserName}，比赛用时 {$timeStr};亲密度增加(+" . $intimacyIncrement . ")";
        if ($betEnabled && $betAmount > 0) {
            $description .= ";押注 {$betAmount} G币，赔率 {$betOdds}，赢得 {$winnerGcoinChange} G币。";
        }
        $timelineSql = "
        INSERT INTO mok_smallworld_timeline (
            user_id, target_id, event_type, title, description, icon, event_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ";
        $eventType = 'game_match';
        $icon = 'fa-chess-queen';
        $title = '羁绊显现-致以我们的友谊-游戏对决';
        $eventDate = date('Y-m-d');
        $timelineStmt = $conn->prepare($timelineSql);
        $timelineStmt->bind_param("sssssss", $winnerId, $loserId, $eventType, $title, $description, $icon, $eventDate);
        $timelineStmt->execute();
        $timelineStmt->close();
    }
    $conn->commit();
    sendResponse(200, [
        'record_id' => $recordId,
        'match_id' => $matchId,
        'winner' => [
            'user_id' => $winnerId,
            'old_gcoin' => $winnerOldGcoin,
            'change' => $winnerGcoinChange,
            'new_gcoin' => $winnerNewGcoin
        ],
        'loser' => [
            'user_id' => $loserId,
            'old_gcoin' => $loserOldGcoin,
            'change' => -$loserGcoinChange,
            'new_gcoin' => $loserNewGcoin
        ],
        'bet' => [
            'enabled' => $betEnabled,
            'bet_amount' => $betAmount,
            'odds' => $betOdds,
            'total' => $betTotal
        ]
    ], '比赛结算成功');
} catch (Exception $e) {
    if (isset($conn) && $conn->errno) {
        $conn->rollback();
        $conn->autocommit(true);
    }
    error_log("比赛结算错误: " . $e->getMessage());
    sendResponse(500, null, "服务器错误: " . $e->getMessage());
}
