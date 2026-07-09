<?php
require $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable($_SERVER['DOCUMENT_ROOT'] . '/ws-server/');
$dotenv->load();
define('API_SECRET_KEY_mokim', $_ENV['API_SECRET_KEY'] ?? 'yhwo-rkmoks-run-folk');
define('API_LINKINGURL', $_ENV['PHP_API_BASE_LINK'] . ':' . $_ENV['HTTP_PORT']);
function processGroupText($text)
{
    $prefix = 'group_';
    if (strpos($text, $prefix) === 0) {
        $text = substr($text, strlen($prefix));
    }
    return (int)$text;
}
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

function sendResponse($success, $message, $data = null)
{
    $response = [
        'success' => $success,
        'message' => $message
    ];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['dfid']) || !isset($data['UserId'])) {
    sendResponse(false, '参数不完整');
}

$conversationId = $data['dfid'];
$userIds = $data['UserId'];

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userIds);

if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
if (!conbine_auth_towdouble($plaintext)) {
    sendResponse(false, '令牌验证失效');
}
$userId = $plaintext;
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
try {
    $groupId = processGroupText($conversationId);
    $conn->begin_transaction();
    $checkSql = "SELECT id, user_id, is_admin, `status`, join_time 
                 FROM mok_group_member 
                 WHERE group_id = ? AND user_id = ? AND `status` = 1";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("is", $groupId, $userId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();

    if ($result->num_rows === 0) {
        $conn->rollback();
        sendResponse(false, '您不在该群聊中或已退出');
    }

    $memberInfo = $result->fetch_assoc();
    $isAdmin = $memberInfo['is_admin'];
    $joinTime = $memberInfo['join_time'];
    $ownerSql = "SELECT owner_id FROM mok_group_chat WHERE id = ? AND group_status = 1";
    $ownerStmt = $conn->prepare($ownerSql);
    $ownerStmt->bind_param("i", $groupId);
    $ownerStmt->execute();
    $ownerResult = $ownerStmt->get_result();

    if ($ownerResult->num_rows === 0) {
        $conn->rollback();
        sendResponse(false, '群聊不存在或已解散');
    }
    $ownerInfo = $ownerResult->fetch_assoc();
    $ownerId = $ownerInfo['owner_id'];
    if ($ownerId === $userId) {
        $conn->rollback();
        sendResponse(false, '群主不能退出群聊，请先解散群聊');
    }
    $updateSql = "UPDATE mok_group_member 
                  SET `status` = 0, quit_time = NOW() 
                  WHERE group_id = ? AND user_id = ? AND `status` = 1";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param("is", $groupId, $userId);
    if (!$updateStmt->execute()) {
        $conn->rollback();
        sendResponse(false, '退出群聊失败：' . $updateStmt->error);
    }
    $quitTime = date('Y-m-d H:i:s');
    $title = "【系统通知】群成员退出通知";
    $userSql = "SELECT uname FROM mok_user WHERE id = ?";
    $userStmt = $conn->prepare($userSql);
    $userStmt->bind_param("s", $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    $userName = $userResult->fetch_assoc()['uname'] ?? $userId;
    $groupSql = "SELECT group_name FROM mok_group_chat WHERE id = ?";
    $groupStmt = $conn->prepare($groupSql);
    $groupStmt->bind_param("i", $groupId);
    $groupStmt->execute();
    $groupResult = $groupStmt->get_result();
    $groupName = $groupResult->fetch_assoc()['group_name'] ?? '未知群聊';
    $content = "用户 {$userName}（ID: {$userId}）已于 {$quitTime} 退出群聊《{$groupName}》。\n";
    $content .= "退出方式：主动退出\n";
    $content .= "加入时间：" . date('Y-m-d H:i:s', strtotime($joinTime)) . "\n";
    $adminSql = "SELECT user_id FROM mok_group_member 
                 WHERE group_id = ? AND is_admin = 1 AND `status` = 1 AND user_id != ?";
    $adminStmt = $conn->prepare($adminSql);
    $adminStmt->bind_param("is", $groupId, $ownerId);
    $adminStmt->execute();
    $adminResult = $adminStmt->get_result();
    $recipients = [$ownerId];
    while ($admin = $adminResult->fetch_assoc()) {
        $recipients[] = $admin['user_id'];
    }
    $mailSql = "INSERT INTO mok_mail (from_id, to_id, title, content, is_read, send_time) 
                VALUES (?, ?, ?, ?, 0, NOW())";
    $mailStmt = $conn->prepare($mailSql);
    $systemId = 'system';
    foreach ($recipients as $recipientId) {
        $mailStmt->bind_param("ssss", $systemId, $recipientId, $title, $content);
        if (!$mailStmt->execute()) {
            error_log("发送退出通知邮件失败: 收件人 {$recipientId}, 错误: " . $mailStmt->error);
        }
    }
    $conn->commit();
    notifyWebSocketServer($groupId);
    sendResponse(true, '退出群聊成功', [
        'group_id' => $groupId,
        'group_name' => $groupName,
        'quit_time' => $quitTime
    ]);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, '退出群聊失败：' . $e->getMessage());
} finally {
    if (isset($checkStmt)) $checkStmt->close();
    if (isset($ownerStmt)) $ownerStmt->close();
    if (isset($updateStmt)) $updateStmt->close();
    if (isset($userStmt)) $userStmt->close();
    if (isset($groupStmt)) $groupStmt->close();
    if (isset($adminStmt)) $adminStmt->close();
    if (isset($mailStmt)) $mailStmt->close();
    $conn->close();
}
function notifyWebSocketServer($groupId)
{
    global $userId;
    $wsServerUrl = API_LINKINGURL . '/api/refresh-group-cache';
    $secretKey = API_SECRET_KEY_mokim;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $wsServerUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['groupId' => $groupId, 'type' => 'quit', 'ownerId' => $userId]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-API-Key: ' . $secretKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($httpCode !== 200) {
        error_log("通知WebSocket服务器失败: HTTP {$httpCode}");
    }
    //curl_close($ch);
}
