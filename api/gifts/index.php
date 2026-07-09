<?php
require($_SERVER['DOCUMENT_ROOT'] . '/setting.php');
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
function sendResponse($success, $message, $data = null, $code = 200)
{
    http_response_code($code);
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) $response['data'] = $data;
    echo json_encode($response);
    exit;
}
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['UserId']) || !isset($data['targetId']) || !isset($data['giftId'])) {
    sendResponse(false, '参数不完整: 需要 UserId, targetId, giftId');
}

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($data['UserId']);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
if (!conbine_auth_towdouble($plaintext)) {
    sendResponse(false, '令牌验证失效');
}
$userId = $plaintext;
$targetId = $data['targetId'];
$giftId = intval($data['giftId']);
$GIFT_CONFIG = $MOKIM_GIFT_CONFIG;
$gift = $GIFT_CONFIG[$giftId] ?? null;
if (!$gift) {
    sendResponse(false, '礼物不存在');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$conn->begin_transaction();

try {
    $stmt = $conn->prepare("SELECT spkcin FROM mok_user WHERE id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    if (!$user) {
        throw new Exception('用户不存在');
    }
    $balance = intval($user['spkcin']);
    if ($balance < $gift['price']) {
        throw new Exception("G币余额不足！需要 {$gift['price']}G，当前 {$balance}G");
    }
    $newBalance = $balance - $gift['price'];
    $stmt = $conn->prepare("UPDATE mok_user SET spkcin = ? WHERE id = ?");
    $stmt->bind_param("is", $newBalance, $userId);
    $stmt->execute();
    $stmt->close();
    $intimacyValue = $gift['intimacyValue'];
    $stmt = $conn->prepare("INSERT INTO mok_intimacy (user_id, target_id, `value`, create_time) 
                           VALUES (?, ?, ?, NOW()) 
                           ON DUPLICATE KEY UPDATE `value` = `value` + ?");
    $stmt->bind_param("ssii", $userId, $targetId, $intimacyValue, $intimacyValue);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare("INSERT INTO mok_intimacy (user_id, target_id, `value`, create_time) 
                           VALUES (?, ?, ?, NOW()) 
                           ON DUPLICATE KEY UPDATE `value` = `value` + ?");
    $stmt->bind_param("ssii", $targetId, $userId, $intimacyValue, $intimacyValue);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare("SELECT `value` FROM mok_intimacy WHERE user_id = ? AND target_id = ?");
    $stmt->bind_param("ss", $userId, $targetId);
    $stmt->execute();
    $result = $stmt->get_result();
    $intimacyRow = $result->fetch_assoc();
    $newIntimacy = $intimacyRow['value'] ?? $intimacyValue;
    $stmt->close();
    $descriptions = [
        "赠送了 {$gift['name']}，亲密度 +{$intimacyValue}",
        "送出了 {$gift['name']}，友谊升温 +{$intimacyValue}",
        "献上 {$gift['name']}，心意满满",
        "赠送 {$gift['name']}，亲密度提升 {$intimacyValue}",
    ];
    $description = $descriptions[array_rand($descriptions)];
    $titles = [
        "礼物送达",
        "心意传递",
        "一份小惊喜",
        "友谊见证",
    ];
    $timelineTitle = $titles[array_rand($titles)];
    $eventDate = date('Y-m-d');
    $eventType = "gift_send";
    $timelineIcon = "fa-gift";
    $insertTimeline = $conn->prepare("INSERT INTO mok_smallworld_timeline 
    (user_id, target_id, event_type, title, `description`, icon, event_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?)");
    $insertTimeline->bind_param(
        "sssssss",
        $userId,
        $targetId,
        $eventType,
        $timelineTitle,
        $description,
        $timelineIcon,
        $eventDate
    );
    if (!$insertTimeline) {
        throw new Exception("准备时间线插入语句失败: " . $conn->error);
    }
    if (!$insertTimeline->execute()) {
        throw new Exception("执行时间线插入失败: " . $insertTimeline->error);
    }
    $insertTimeline->close();
    $conn->commit();
    $giftMessage = [
        'type' => 'gift_sent',
        'data' => [
            'fromUserId' => $userId,
            'toUserId' => $targetId,
            'giftId' => $gift['id'],
            'giftName' => $gift['name'],
            'giftIcon' => $gift['icon'],
            'intimacyChange' => $intimacyValue,
            'hasAnimation' => true,
            'animationType' => $gift['animationType'],
            'timestamp' => time() * 1000
        ]
    ];
    sendResponse(true, '礼物赠送成功', [
        'gift' => $gift,
        'newBalance' => $newBalance,
        'intimacyChange' => $intimacyValue,
        'newIntimacy' => $newIntimacy,
        'giftMessage' => $giftMessage
    ]);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, $e->getMessage());
} finally {
    $conn->close();
}
