<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/api/quot.php';
requireApiAuth();
$action = $_GET['action'] ?? '';
$userId = $_GET['userId'] ?? '';
try {
    switch ($action) {
        case 'save':
            saveOfflineMessage();
            break;
        case 'get':
            getOfflineMessages($userId);
            break;
        case 'delete':
            deleteOfflineMessages($userId);
            break;
        case 'cleanup':
            cleanupOfflineMessages();
            break;
        default:
            sendResponse(400, null, '无效的操作类型');
    }
} catch (Exception $e) {
    handleException($e);
}
function saveOfflineMessage()
{
    global $conn;
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['userId']) || !isset($input['senderId'])) {
        sendResponse(400, null, '缺少必要参数');
    }

    $sql = "INSERT INTO mok_offline_message 
            (user_id, sender_id, conversation_id, message_id, message_type, 
             content, is_group, is_system, is_scheduled, schedule_id, 
             send_time, lock_data, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);
    $q1_t = json_encode($input['content'], JSON_UNESCAPED_UNICODE);
    $q2_t = json_encode($input['lock'] ?? null, JSON_UNESCAPED_UNICODE);
    $q3_t = $input['status'] ?? 1;
    $stmt->bind_param(
        "ssssssiiisssi",
        $input['userId'],
        $input['senderId'],
        $input['conversationId'],
        $input['messageId'],
        $input['messageType'],
        $q1_t,
        $input['isGroup'],
        $input['isSystem'],
        $input['isScheduled'],
        $input['scheduleId'],
        $input['sendTime'],
        $q2_t,
        $q3_t
    );

    if ($stmt->execute()) {
        sendResponse(200, ['id' => $stmt->insert_id], '离线消息保存成功');
    } else {
        sendResponse(500, null, '保存失败: ' . $stmt->error);
    }
}
function getOfflineMessages($userId)
{
    global $conn;

    if (empty($userId)) {
        sendResponse(400, null, '缺少用户ID');
    }

    $sql = "SELECT * FROM mok_offline_message 
            WHERE user_id = ? AND status = 1 
            ORDER BY send_time ASC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $messages[] = [
            'messageId' => $row['message_id'],
            'senderId' => $row['sender_id'],
            'receiverId' => $row['user_id'],
            'conversationId' => $row['conversation_id'],
            'messageType' => $row['message_type'],
            'content' => json_decode($row['content'], true),
            'sendTime' => (int)$row['send_time'],
            'isGroupMessage' => (bool)$row['is_group'],
            'isSystem' => (bool)$row['is_system'],
            'isScheduled' => (bool)$row['is_scheduled'],
            'scheduleId' => $row['schedule_id'],
            'lock' => $row['lock_data'] ? json_decode($row['lock_data'], true) : null
        ];
    }
    if (!empty($messageIds)) {
        $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
        $types = str_repeat('s', count($messageIds));
        $sql = "UPDATE mok_offline_message 
                SET status = 2, sent_time = ? 
                WHERE user_id = ? AND message_id IN ($placeholders) AND status = 1";
        $stmt = $conn->prepare($sql);
        $params = array_merge([time() * 1000, $userId], $messageIds);
        $stmt->bind_param("is" . $types, ...$params);
        $stmt->execute();

        error_log("[离线消息] 用户 {$userId} 已获取 " . count($messageIds) . " 条消息，已标记为已发送");
    }

    sendResponse(200, $messages, '获取成功');
}
function deleteOfflineMessages($userId)
{
    global $conn;
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($userId) || empty($input['messageIds']) || !is_array($input['messageIds'])) {
        sendResponse(400, null, '缺少必要参数');
    }

    $messageIds = $input['messageIds'];
    $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
    $types = str_repeat('s', count($messageIds));

    $sql = "UPDATE mok_offline_message 
            SET status = 2, sent_time = ? 
            WHERE user_id = ? AND message_id IN ($placeholders) AND status = 1";

    $stmt = $conn->prepare($sql);
    $params = array_merge([time() * 1000, $userId], $messageIds);
    $stmt->bind_param("is" . $types, ...$params);
    $stmt->execute();

    sendResponse(200, ['affected' => $stmt->affected_rows], '删除成功');
}
function cleanupOfflineMessages()
{
    global $conn;
    $expireTime = time() * 1000 - 7 * 24 * 3600 * 1000;
    $sql = "DELETE FROM mok_offline_message WHERE `status` = 2 AND sent_time < ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $expireTime);
    $stmt->execute();
    $deleted = $stmt->affected_rows;
    error_log("[离线消息清理] 物理删除 {$deleted} 条已发送超过7天的消息");
    sendResponse(200, ['deleted' => $deleted], '清理完成');
}