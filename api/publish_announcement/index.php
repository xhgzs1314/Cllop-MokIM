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
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}
$input = file_get_contents('php://input');
$data = json_decode($input, true);
if (!isset($data['dfid']) || !isset($data['UserId'])  || !isset($data['title']) || !isset($data['content'])) {
    sendResponse(false, '参数不完整，缺少必要字段');
}
$userIds = $data['UserId'];
$groupId = $data['dfid'];
$title = trim($data['title']);
$content = trim($data['content']);
$isTop = isset($data['is_top']) ? (int)$data['is_top'] : 0;
if (empty($title)) {
    sendResponse(false, '公告标题不能为空');
}
if (mb_strlen($title, 'UTF-8') > 30) {
    sendResponse(false, '公告标题不能超过30个字');
}
if (empty($content)) {
    sendResponse(false, '公告内容不能为空');
}
if (mb_strlen($content, 'UTF-8') > 300) {
    sendResponse(false, '公告内容不能超过300个字');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userIds);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效，请刷新页面后重试');
}
if (!conbine_auth_towdouble($plaintext)) {
    sendResponse(false, '令牌验证失效');
}
$userId = $plaintext;
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$conn->begin_transaction();
try {
    $checkGroupSql = "SELECT id, owner_id, group_status FROM mok_group_chat WHERE id = ? AND group_status = 1";
    $checkGroupStmt = $conn->prepare($checkGroupSql);
    $checkGroupStmt->bind_param("i", $groupId);
    $checkGroupStmt->execute();
    $groupResult = $checkGroupStmt->get_result();
    if ($groupResult->num_rows === 0) {
        throw new Exception('群聊不存在或已被解散');
    }
    $groupInfo = $groupResult->fetch_assoc();
    $ownerId = $groupInfo['owner_id'];
    $checkMemberSql = "SELECT id, is_admin, `status` FROM mok_group_member 
                       WHERE group_id = ? AND user_id = ? AND `status` = 1";
    $checkMemberStmt = $conn->prepare($checkMemberSql);
    $checkMemberStmt->bind_param("is", $groupId, $userId);
    $checkMemberStmt->execute();
    $memberResult = $checkMemberStmt->get_result();
    if ($memberResult->num_rows === 0) {
        throw new Exception('您不是该群聊的成员，无法发布公告');
    }
    $memberInfo = $memberResult->fetch_assoc();
    $isAdmin = (bool)$memberInfo['is_admin'];
    if ($userId != $ownerId && !$isAdmin) {
        throw new Exception('只有群主或管理员可以发布公告');
    }
    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $publishTime = date('Y-m-d H:i:s');
    $insertSql = "INSERT INTO mok_group_announcement 
                  (group_id, title, content, creator_id, is_top, `status`, publish_time, update_time) 
                  VALUES (?, ?, ?, ?, ?, 1, ?, ?)";
    $insertStmt = $conn->prepare($insertSql);
    $insertStmt->bind_param("isssiss", $groupId, $title, $content, $userId, $isTop, $publishTime, $publishTime);

    if (!$insertStmt->execute()) {
        throw new Exception('发布公告失败：' . $insertStmt->error);
    }

    $announcementId = $insertStmt->insert_id;
    $action = 'publish_announcement';
    $newData = json_encode([
        'announcement_id' => $announcementId,
        'title' => $title,
        'content' => $content,
        'is_top' => $isTop
    ], JSON_UNESCAPED_UNICODE);

    $logSql = "INSERT INTO mok_group_log 
               (group_id, user_id, `action`, action_time, new_data, ip_address, user_agent) 
               VALUES (?, ?, ?, ?, ?, ?, ?)";
    $logStmt = $conn->prepare($logSql);
    $actionTime = date('Y-m-d H:i:s');
    $logStmt->bind_param("issssss", $groupId, $userId, $action, $actionTime, $newData, $ipAddress, $userAgent);
    $logStmt->execute();
    $conn->commit();
    $announcementData = [
        'id' => $announcementId,
        'group_id' => $groupId,
        'title' => $title,
        'content' => $content,
        'creator_id' => $userId,
        'creator_name' => getCreatorName($conn, $userId),
        'is_top' => $isTop,
        'publish_time' => $publishTime,
        'summary' => mb_strlen($content, 'UTF-8') > 80 ? mb_substr($content, 0, 80, 'UTF-8') . '...' : $content
    ];

    sendResponse(true, '公告发布成功', $announcementData);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, $e->getMessage());
}
function getCreatorName($conn, $userId)
{
    $sql = "SELECT uname FROM mok_user WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        return $row['uname'] ?: $userId;
    }
    return $userId;
}
