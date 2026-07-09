<?php
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
$groupId = processGroupText($conversationId);
try {
    $conn->begin_transaction();
    $checkMemberSql = "SELECT id, user_id, group_id, is_admin, status FROM mok_group_member 
                       WHERE group_id = ? AND user_id = ? AND `status` = 1";
    $stmt = $conn->prepare($checkMemberSql);
    $stmt->bind_param("is", $groupId, $userId);
    $stmt->execute();
    $memberResult = $stmt->get_result();
    $memberInfo = $memberResult->fetch_assoc();
    if (!$memberInfo) {
        $conn->rollback();
        sendResponse(false, '您不是该群聊的成员');
    }
    $checkOwnerSql = "SELECT id, owner_id FROM mok_group_chat WHERE id = ? AND group_status = 1";
    $stmt = $conn->prepare($checkOwnerSql);
    $stmt->bind_param("i", $groupId);
    $stmt->execute();
    $groupResult = $stmt->get_result();
    $groupInfo = $groupResult->fetch_assoc();

    if (!$groupInfo) {
        $conn->rollback();
        sendResponse(false, '群聊不存在或已被解散');
    }
    $isOwner = ($groupInfo['owner_id'] == $userId);
    $isAdmin = ($memberInfo['is_admin'] == 1);
    if (!$isOwner && !$isAdmin) {
        $conn->rollback();
        sendResponse(false, '只有群主或管理员可以执行此操作');
    }
    if (!isset($data['announcement_id'])) {
        $conn->rollback();
        sendResponse(false, '公告ID不能为空');
    }
    $announcementId = (int)$data['announcement_id'];
    $checkAnnouncementSql = "SELECT id, group_id, title, status, is_top FROM mok_group_announcement 
                             WHERE id = ? AND group_id = ? AND `status` = 1";
    $stmt = $conn->prepare($checkAnnouncementSql);
    $stmt->bind_param("ii", $announcementId, $groupId);
    $stmt->execute();
    $announcementResult = $stmt->get_result();
    $announcementInfo = $announcementResult->fetch_assoc();
    if (!$announcementInfo) {
        $conn->rollback();
        sendResponse(false, '公告不存在或已被删除');
    }
    $deleteAnnouncementSql = "UPDATE mok_group_announcement SET `status` = 0 WHERE id = ?";
    $stmt = $conn->prepare($deleteAnnouncementSql);
    $stmt->bind_param("i", $announcementId);
    $stmt->execute();
    if ($stmt->affected_rows == 0) {
        $conn->rollback();
        sendResponse(false, '删除公告失败');
    }
    $logSql = "INSERT INTO mok_group_log (group_id, user_id, `action`, action_time, remark, ip_address, user_agent) 
               VALUES (?, ?, ?, NOW(), ?, ?, ?)";
    $remark = '删除公告ID:'. $announcementId;
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    $action = 'delete_announcement';
    $stmt = $conn->prepare($logSql);
    $stmt->bind_param("isssss", $groupId, $userId, $action, $remark, $ipAddress, $userAgent);
    $stmt->execute();
    $getUpdatedSql = "SELECT id, title, is_top, publish_time, update_time FROM mok_group_announcement 
                      WHERE id = ?";
    $stmt = $conn->prepare($getUpdatedSql);
    $stmt->bind_param("i", $announcementId);
    $stmt->execute();
    $updatedAnnouncement = $stmt->get_result()->fetch_assoc();
    $conn->commit();
    sendResponse(true, $message);
    
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, '操作失败：' . $e->getMessage());
}