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
    $groupSql = "SELECT id, group_name, owner_id, group_status FROM mok_group_chat WHERE id = ?";
    $groupStmt = $conn->prepare($groupSql);
    $groupStmt->bind_param("i", $groupId);
    $groupStmt->execute();
    $groupResult = $groupStmt->get_result();
    if ($groupResult->num_rows === 0) {
        $conn->rollback();
        sendResponse(false, '群聊不存在');
    }
    $groupInfo = $groupResult->fetch_assoc();
    if ($groupInfo['group_status'] != 1) {
        $conn->rollback();
        sendResponse(false, '群聊已解散');
    }
    if ($groupInfo['owner_id'] != $userId) {
        $conn->rollback();
        sendResponse(false, '只有群主才能解散群聊');
    }
    $updateGroupSql = "UPDATE mok_group_chat SET group_status = 0 WHERE id = ? AND group_status = 1";
    $updateGroupStmt = $conn->prepare($updateGroupSql);
    $updateGroupStmt->bind_param("i", $groupId);
    if (!$updateGroupStmt->execute()) {
        $conn->rollback();
        sendResponse(false, '解散群聊失败：' . $updateGroupStmt->error);
    }
    $quitTime = date('Y-m-d H:i:s');
    $updateMembersSql = "UPDATE mok_group_member 
                         SET `status` = 0, quit_time = ? 
                         WHERE group_id = ? AND `status` = 1";
    $updateMembersStmt = $conn->prepare($updateMembersSql);
    $updateMembersStmt->bind_param("si", $quitTime, $groupId);
    if (!$updateMembersStmt->execute()) {
        $conn->rollback();
        sendResponse(false, '解散群聊失败：' . $updateMembersStmt->error);
    }
    $memberCount = $updateMembersStmt->affected_rows;
    $conn->commit();
    notifyWebSocketServer($groupId);
    sendResponse(true, '群聊解散成功');
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, '解散群聊失败：' . $e->getMessage());
} finally {
    if (isset($groupStmt)) $groupStmt->close();
    if (isset($updateGroupStmt)) $updateGroupStmt->close();
    if (isset($updateMembersStmt)) $updateMembersStmt->close();
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
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['groupId' => $groupId, 'type' => 'destory', 'ownerId' => $userId]));
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
