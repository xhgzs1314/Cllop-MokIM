<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once $_SERVER['DOCUMENT_ROOT'] . '/setting.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php';
$tcodelogins = $_COOKIE[generateAutoWebsiteIdentifier(true) . "_log"] ?? 'null';
if ($tcodelogins === 'null') {
    http_response_code(401);
    echo json_encode(['code' => 401, 'msg' => '未登录']);
    exit;
}

require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php';
$decoder = new TmdbaseauthdownyhoDecrypt(60000 * 60 * 2);
$decoded = $decoder->writebacknewwords($tcodelogins);
if (!$decoded) {
    http_response_code(401);
    echo json_encode(['code' => 401, 'msg' => '登录已过期']);
    exit;
}

$decodedData2 = encrypt($decoded, 'D', generateAutoWebsiteIdentifier(true));
if (!$decodedData2) {
    http_response_code(401);
    echo json_encode(['code' => 401, 'msg' => '解密失败']);
    exit;
}

$tarray = explode('<:>', $decodedData2);
if (!isset($tarray[0]) || !isset($tarray[1]) || empty($tarray[0]) || empty($tarray[1]) || !isset($tarray[2]) || empty($tarray[2])) {
    http_response_code(401);
    echo json_encode(['code' => 401, 'msg' => '无效凭证']);
    exit;
}

$userId = trim($tarray[2]);
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $input['action'] ?? $_GET['action'] ?? '';
require_once($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$conn->set_charset('utf8mb4');
try {
    switch ($action) {
        case 'summary':
            getStatsSummary($conn, $userId);
            break;
        case 'list':
            getStatsList($conn, $userId, $input);
            break;
        case 'detail':
            getMatchDetail($conn, $userId, $input);
            break;
        default:
            http_response_code(400);
            echo json_encode(['code' => 400, 'msg' => '未知操作']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['code' => 500, 'msg' => $e->getMessage()]);
} finally {
    $conn->close();
}

function getStatsSummary($conn, $userId)
{
    $totalSql = "SELECT COUNT(*) as total FROM mok_match_record WHERE winner_id = ? OR loser_id = ?";
    $stmt = $conn->prepare($totalSql);
    $stmt->bind_param('ss', $userId, $userId);
    $stmt->execute();
    $totalResult = $stmt->get_result();
    $total = $totalResult->fetch_assoc()['total'] ?? 0;
    $stmt->close();

    $winSql = "SELECT COUNT(*) as wins FROM mok_match_record WHERE winner_id = ?";
    $stmt = $conn->prepare($winSql);
    $stmt->bind_param('s', $userId);
    $stmt->execute();
    $winResult = $stmt->get_result();
    $wins = $winResult->fetch_assoc()['wins'] ?? 0;
    $stmt->close();

    $losses = $total - $wins;

    $gcoinSql = "SELECT 
        COALESCE(SUM(CASE WHEN winner_id = ? THEN winner_gcoin_change ELSE 0 END), 0) as earned,
        COALESCE(SUM(CASE WHEN loser_id = ? THEN loser_gcoin_change ELSE 0 END), 0) as lost
        FROM mok_match_record WHERE winner_id = ? OR loser_id = ?";
    $stmt = $conn->prepare($gcoinSql);
    $stmt->bind_param('ssss', $userId, $userId, $userId, $userId);
    $stmt->execute();
    $gcoinResult = $stmt->get_result();
    $gcoinData = $gcoinResult->fetch_assoc();
    $gcoinEarned = ($gcoinData['earned'] ?? 0) - ($gcoinData['lost'] ?? 0);
    $stmt->close();

    $streakSql = "SELECT MAX(streak) as max_streak FROM (
    SELECT 
        @streak := IF(result = 'win', @streak + 1, 0) as streak
    FROM (
        SELECT 
            CASE WHEN winner_id = ? THEN 'win' ELSE 'loss' END as result,
            end_time
        FROM mok_match_record 
        WHERE winner_id = ? OR loser_id = ?
        ORDER BY end_time ASC
    ) as matches,
    (SELECT @streak := 0) as init
) as streaks";
    $stmt = $conn->prepare($streakSql);
    $stmt->bind_param('sss', $userId, $userId, $userId);
    $stmt->execute();
    $streakResult = $stmt->get_result();
    $maxStreak = $streakResult->fetch_assoc()['max_streak'] ?? 0;
    $stmt->close();

    echo json_encode([
        'code' => 200,
        'data' => [
            'totalPlays' => (int)$total,
            'wins' => (int)$wins,
            'losses' => (int)$losses,
            'gcoinEarned' => (int)$gcoinEarned,
            'maxStreak' => (int)$maxStreak
        ]
    ]);
}

function getStatsList($conn, $userId, $params)
{
    $page = max(1, (int)($params['page'] ?? 1));
    $pageSize = min(50, max(1, (int)($params['pageSize'] ?? 10)));
    $offset = ($page - 1) * $pageSize;

    $gameType = $params['gameType'] ?? '';
    $dateFrom = $params['dateFrom'] ?? '';
    $dateTo = $params['dateTo'] ?? '';
    $keyword = trim($params['keyword'] ?? '');

    $where = "WHERE (r.winner_id = ? OR r.loser_id = ?)";
    $bindParams = [$userId, $userId];
    $types = 'ss';

    if (!empty($gameType)) {
        $where .= " AND r.game_type = ?";
        $bindParams[] = $gameType;
        $types .= 's';
    }

    if (!empty($dateFrom)) {
        $where .= " AND DATE(r.end_time) >= ?";
        $bindParams[] = $dateFrom;
        $types .= 's';
    }

    if (!empty($dateTo)) {
        $where .= " AND DATE(r.end_time) <= ?";
        $bindParams[] = $dateTo;
        $types .= 's';
    }
    if (!empty($keyword)) {
        $where .= " AND (r.game_name LIKE ? OR r.winner_id LIKE ? OR r.loser_id LIKE ?)";
        $like = '%' . $keyword . '%';
        $bindParams[] = $like;
        $bindParams[] = $like;
        $bindParams[] = $like;
        $types .= 'sss';
    }

    $countSql = "SELECT COUNT(*) as total FROM mok_match_record r $where";
    error_log("=== getStatsList Debug ===");
    error_log("Count SQL: " . $countSql);
    error_log("Types: " . $types);
    error_log("Bind Params: " . print_r($bindParams, true));
    
    $stmt = $conn->prepare($countSql);
    if (!$stmt) {
        error_log("Count SQL Prepare Error: " . $conn->error);
        throw new Exception('SQL准备失败(count): ' . $conn->error);
    }
    $stmt->bind_param($types, ...$bindParams);
    $stmt->execute();
    $countResult = $stmt->get_result();
    $total = $countResult->fetch_assoc()['total'] ?? 0;
    $stmt->close();
    $listSql = "SELECT 
        r.id as match_id,
        IFNULL(r.game_name, r.game_type) as game_name,
        r.game_type, 
        r.winner_id, r.loser_id, 
        r.winner_score, r.loser_score,
        r.bet_enabled, r.bet_amount, r.bet_odds, r.bet_total,
        r.winner_gcoin_change, r.loser_gcoin_change,
        r.end_time, r.duration,
        COALESCE(w.uname, w.id) AS winner_name,
        COALESCE(l.uname, l.id) AS loser_name
        FROM mok_match_record r
        LEFT JOIN mok_user w ON r.winner_id = w.id
        LEFT JOIN mok_user l ON r.loser_id = l.id
        $where 
        ORDER BY r.end_time DESC 
        LIMIT ? OFFSET ?";

    error_log("List SQL: " . $listSql);
    
    $stmt = $conn->prepare($listSql);
    if (!$stmt) {
        error_log("List SQL Prepare Error (first attempt): " . $conn->error);
        $listSql = "SELECT 
            r.id as match_id,
            r.game_type as game_name,
            r.game_type, 
            r.winner_id, r.loser_id, 
            r.winner_score, r.loser_score,
            r.bet_enabled, r.bet_amount, r.bet_odds, r.bet_total,
            r.winner_gcoin_change, r.loser_gcoin_change,
            r.end_time, r.duration,
            COALESCE(w.uname, w.id) AS winner_name,
            COALESCE(l.uname, l.id) AS loser_name
            FROM mok_match_record r
            LEFT JOIN mok_user w ON r.winner_id = w.id
            LEFT JOIN mok_user l ON r.loser_id = l.id
            $where 
            ORDER BY r.end_time DESC 
            LIMIT ? OFFSET ?";
        
        error_log("List SQL (fallback): " . $listSql);
        
        $stmt = $conn->prepare($listSql);
        if (!$stmt) {
            error_log("List SQL Prepare Error (fallback): " . $conn->error);
            throw new Exception('SQL准备失败(list): ' . $conn->error);
        }
    }
    
    $types .= 'ii';
    $bindParams[] = $pageSize;
    $bindParams[] = $offset;
    
    error_log("Final Types: " . $types);
    error_log("Final Bind Params: " . print_r($bindParams, true));
    
    $stmt->bind_param($types, ...$bindParams);
    $stmt->execute();
    $result = $stmt->get_result();

    $records = [];
    while ($row = $result->fetch_assoc()) {
        $isWin = $row['winner_id'] === $userId;
        $opponentId = $isWin ? $row['loser_id'] : $row['winner_id'];
        $opponentName = $isWin ? $row['loser_name'] : $row['winner_name'];
        $records[] = [
            'match_id' => $row['match_id'],
            'game_name' => $row['game_name'] ?: $row['game_type'],
            'game_type' => $row['game_type'],
            'winner_id' => $row['winner_id'],
            'loser_id' => $row['loser_id'],
            'winner_name' => $row['winner_name'],
            'loser_name' => $row['loser_name'],
            'winner_score' => (int)$row['winner_score'],
            'loser_score' => (int)$row['loser_score'],
            'bet_enabled' => (bool)$row['bet_enabled'],
            'bet_amount' => (int)$row['bet_amount'],
            'bet_odds' => (int)$row['bet_odds'],
            'bet_total' => (int)$row['bet_total'],
            'winner_gcoin_change' => (int)$row['winner_gcoin_change'],
            'loser_gcoin_change' => (int)$row['loser_gcoin_change'],
            'end_time' => $row['end_time'],
            'duration' => (int)$row['duration'],
            'is_win' => $isWin,
            'opponent_id' => $opponentId,
            'opponent_name' => $opponentName
        ];
    }
    $stmt->close();

    echo json_encode([
        'code' => 200,
        'data' => [
            'records' => $records,
            'total' => (int)$total,
            'page' => $page,
            'pageSize' => $pageSize
        ]
    ]);
}

function getMatchDetail($conn, $userId, $params)
{
    $matchId = $params['matchId'] ?? '';
    if (empty($matchId)) {
        http_response_code(400);
        echo json_encode(['code' => 400, 'msg' => '缺少比赛ID']);
        return;
    }
    $sql = "SELECT 
        r.id as match_id,
        IFNULL(r.game_name, r.game_type) as game_name,
        r.game_type, 
        r.winner_id, r.loser_id, 
        r.winner_score, r.loser_score,
        r.bet_enabled, r.bet_amount, r.bet_odds, r.bet_total,
        r.winner_gcoin_change, r.loser_gcoin_change,
        r.game_data, r.start_time, r.end_time, r.duration,
        COALESCE(w.uname, w.id) AS winner_name,
        COALESCE(l.uname, l.id) AS loser_name
        FROM mok_match_record r
        LEFT JOIN mok_user w ON r.winner_id = w.id
        LEFT JOIN mok_user l ON r.loser_id = l.id
        WHERE r.id = ? AND (r.winner_id = ? OR r.loser_id = ?)";
    
    error_log("=== getMatchDetail Debug ===");
    error_log("MatchId: " . $matchId);
    error_log("UserId: " . $userId);
    error_log("SQL: " . $sql);
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $sql = "SELECT 
            r.id as match_id,
            r.game_type as game_name,
            r.game_type, 
            r.winner_id, r.loser_id, 
            r.winner_score, r.loser_score,
            r.bet_enabled, r.bet_amount, r.bet_odds, r.bet_total,
            r.winner_gcoin_change, r.loser_gcoin_change,
            r.game_data, r.start_time, r.end_time, r.duration,
            COALESCE(w.uname, w.id) AS winner_name,
            COALESCE(l.uname, l.id) AS loser_name
            FROM mok_match_record r
            LEFT JOIN mok_user w ON r.winner_id = w.id
            LEFT JOIN mok_user l ON r.loser_id = l.id
            WHERE r.id = ? AND (r.winner_id = ? OR r.loser_id = ?)";
        
        error_log("SQL (fallback): " . $sql);
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            error_log("SQL Prepare Error: " . $conn->error);
            throw new Exception('SQL准备失败: ' . $conn->error);
        }
    }
    $stmt->bind_param('sss', $matchId, $userId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        $isWin = $row['winner_id'] === $userId;
        echo json_encode([
            'code' => 200,
            'data' => [
                'match_id' => $row['match_id'],
                'game_name' => $row['game_name'] ?: $row['game_type'],
                'game_type' => $row['game_type'],
                'winner_id' => $row['winner_id'],
                'loser_id' => $row['loser_id'],
                'winner_name' => $row['winner_name'],
                'loser_name' => $row['loser_name'],
                'winner_score' => (int)$row['winner_score'],
                'loser_score' => (int)$row['loser_score'],
                'bet_enabled' => (bool)$row['bet_enabled'],
                'bet_amount' => (int)$row['bet_amount'],
                'bet_odds' => (int)$row['bet_odds'],
                'bet_total' => (int)$row['bet_total'],
                'winner_gcoin_change' => (int)$row['winner_gcoin_change'],
                'loser_gcoin_change' => (int)$row['loser_gcoin_change'],
                'game_data' => json_decode($row['game_data'] ?? '{}', true),
                'start_time' => $row['start_time'],
                'end_time' => $row['end_time'],
                'duration' => (int)$row['duration'],
                'is_win' => $isWin
            ]
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['code' => 404, 'msg' => '比赛不存在或无权限']);
    }
    $stmt->close();
}