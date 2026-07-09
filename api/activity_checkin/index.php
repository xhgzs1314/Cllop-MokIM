<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php';
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';
$authdata = $data['UserId'] ?? '';
if (empty($action) || empty($authdata)) {
    echo json_encode(['success' => false, 'message' => '数据异常']);
    exit;
}
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($authdata);
if (!$plaintext) {
    echo json_encode(['success' => false, 'message' => '身份验证异常']);
    exit;
}
if (!conbine_auth_towdouble($plaintext)) {
    echo json_encode(['success' => false, 'message' => '身份验证异常']);
    exit;
}
$userId = $plaintext;
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php';
try {
    switch ($action) {
        case 'checkin_status':
            getCheckinStatus($userId);
            break;
        case 'do_checkin':
            doCheckin($userId);
            break;
        default:
            echo json_encode(['success' => false, 'message' => '无效操作']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn) && $conn) $conn->close();
}

function getCheckinStatus($userId) {
    global $conn;
    $today = date('Y-m-d');
    $sql = "SELECT last_checkin_date, streak, total_days, last_reward FROM mok_checkin WHERE user_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    if (!$row) {
        echo json_encode([
            'success' => true,
            'checked_in' => false,
            'streak' => 0,
            'bonus_today' => false,
            'history' => []  
        ]);
        return;
    }
    
    $checkedIn = ($row['last_checkin_date'] === $today);
    $streak = (int)$row['streak'];
    $bonusToday = ($streak > 0 && $streak % 7 == 0);
    $history = [];
    echo json_encode([
        'success' => true,
        'checked_in' => $checkedIn,
        'streak' => $streak,
        'bonus_today' => $bonusToday,
        'history' => $history
    ]);
}

function doCheckin($userId) {
    global $conn;
    $today = date('Y-m-d');
    
    $sql = "SELECT last_checkin_date, streak FROM mok_checkin WHERE user_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    
    if ($row && $row['last_checkin_date'] === $today) {
        echo json_encode(['success' => false, 'message' => '今天已签到']);
        return;
    }
    
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    if ($row && $row['last_checkin_date'] === $yesterday) {
        $streak = $row['streak'] + 1;
    } else {
        $streak = 1;
    }
    $baseReward = 10;
    $streakBonus = floor($streak / 7) * 3;  
    $prize = rollPrize();
    $totalReward = $baseReward + $streakBonus;
    if ($prize['type'] === 'multiplier') {
        $totalReward = round($totalReward * $prize['multiplier']);
    } elseif ($prize['type'] === 'fixed') {
        $totalReward += $prize['extra'];
    }
    if ($row) {
        $updateSql = "UPDATE mok_checkin SET 
                       last_checkin_date = ?, 
                       streak = ?, 
                       total_days = total_days + 1,
                       last_reward = ?,
                       update_time = NOW()
                       WHERE user_id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("siss", $today, $streak, $totalReward, $userId);
    } else {
        $insertSql = "INSERT INTO mok_checkin (user_id, last_checkin_date, streak, total_days, last_reward) 
                       VALUES (?, ?, ?, 1, ?)";
        $stmt = $conn->prepare($insertSql);
        $stmt->bind_param("ssii", $userId, $today, $streak, $totalReward);
    }
    $stmt->execute();
    $stmt->close();
    
    $updateCoin = "UPDATE mok_user SET spkcin = spkcin + ? WHERE id = ?";
    $stmt = $conn->prepare($updateCoin);
    $stmt->bind_param("is", $totalReward, $userId);
    $stmt->execute();
    $stmt->close();
    echo json_encode([
        'success' => true,
        'reward' => $totalReward,
        'streak' => $streak,
        'bonus' => $streakBonus,
        'prize' => $prize['label']
    ]);
}
function rollPrize() {
    $rand = mt_rand(1, 10000);
    
    if ($rand <= 1) {
        return [
            'type' => 'multiplier',
            'multiplier' => 10,
            'label' => '🎉 一等奖 x10！'
        ];
    } elseif ($rand <= 21) {
        return [
            'type' => 'multiplier',
            'multiplier' => 3,
            'label' => '⭐ 二等奖 x3！'
        ];
    } elseif ($rand <= 100) {
        return [
            'type' => 'fixed',
            'extra' => 20,
            'label' => '🍀 三等奖 +20G币！'
        ];
    } else {
        return [
            'type' => 'none',
            'label' => ''
        ];
    }
}