<?php
require_once $_SERVER['DOCUMENT_ROOT'].'/cofd/common.php';
require_once $_SERVER['DOCUMENT_ROOT'].'/api/quot.php';

requireApiAuth();

$action = $_GET['action'] ?? '';
$userId = $_GET['userId'] ?? '';

try {
    switch ($action) {
        case 'add':
            addScheduledMessage();
            break;
        case 'load':
            loadScheduledMessages();
            break;
        case 'get':
            getScheduledMessages($userId);
            break;
        case 'cancel':
            cancelScheduledMessage($userId);
            break;
        case 'update':
            updateScheduledMessage();
            break;
        case 'complete':
            completeScheduledMessage();
            break;
        case 'fail':
            failScheduledMessage();
            break;
        default:
            sendResponse(400, null, '无效的操作类型');
    }
} catch (Exception $e) {
    handleException($e);
}
function addScheduledMessage()
{
    global $conn;
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['scheduleId']) || !isset($input['senderId'])) {
        sendResponse(400, null, '缺少必要参数');
    }
    
    $sql = "INSERT INTO mok_scheduled_message 
            (schedule_id, sender_id, receiver_id, conversation_id, message_type, 
             content, schedule_time, repeat_type, repeat_days, `status`, 
             is_group, sender_name) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $t1_q1 = json_encode($input['content'], JSON_UNESCAPED_UNICODE);
    $t1_q2 = json_encode($input['repeatDays'] ?? [], JSON_UNESCAPED_UNICODE);
    $t1_q3 = 1;
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "ssssssissiis",
        $input['scheduleId'],
        $input['senderId'],
        $input['receiverId'],
        $input['conversationId'],
        $input['messageType'],
        $t1_q1,
        $input['scheduleTime'],
        $input['repeatType'],
        $t1_q2,
        $t1_q3,
        $input['isGroup'],
        $input['senderName']
    );
    
    if ($stmt->execute()) {
        sendResponse(200, ['id' => $stmt->insert_id], '定时消息添加成功');
    } else {
        sendResponse(500, null, '添加失败: ' . $stmt->error);
    }
}
function loadScheduledMessages()
{
    global $conn;
    $sql = "SELECT * FROM mok_scheduled_message WHERE `status` = 1 ORDER BY schedule_time ASC";
    $result = $conn->query($sql);
    $schedules = [];
    while ($row = $result->fetch_assoc()) {
        $schedules[] = [
            'scheduleId' => $row['schedule_id'],
            'senderId' => $row['sender_id'],
            'receiverId' => $row['receiver_id'],
            'conversationId' => $row['conversation_id'],
            'messageType' => $row['message_type'],
            'content' => json_decode($row['content'], true),
            'scheduleTime' => (int)$row['schedule_time'],
            'repeatType' => $row['repeat_type'],
            'repeatDays' => $row['repeat_days'] ? json_decode($row['repeat_days'], true) : [],
            'status' => (int)$row['status'],
            'isGroup' => (bool)$row['is_group'],
            'senderName' => $row['sender_name'],
            'sendCount' => (int)$row['send_count'],
            'lastSentTime' => $row['last_sent_time'] ? (int)$row['last_sent_time'] : null
        ];
    }
    
    sendResponse(200, $schedules, '加载成功');
}
function getScheduledMessages($userId)
{
    global $conn;
    
    if (empty($userId)) {
        sendResponse(400, null, '缺少用户ID');
    }
    
    $sql = "SELECT * FROM mok_scheduled_message 
            WHERE sender_id = ? AND status = 1 
            ORDER BY schedule_time ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $schedules = [];
    while ($row = $result->fetch_assoc()) {
        $schedules[] = [
            'scheduleId' => $row['schedule_id'],
            'receiverId' => $row['receiver_id'],
            'conversationId' => $row['conversation_id'],
            'messageType' => $row['message_type'],
            'content' => json_decode($row['content'], true),
            'scheduleTime' => (int)$row['schedule_time'],
            'repeatType' => $row['repeat_type'],
            'repeatDays' => $row['repeat_days'] ? json_decode($row['repeat_days'], true) : [],
            'sendCount' => (int)$row['send_count'],
            'isGroup' => (bool)$row['is_group']
        ];
    }
    
    sendResponse(200, $schedules, '获取成功');
}
function cancelScheduledMessage($userId)
{
    global $conn;
    $input = json_decode(file_get_contents('php://input'), true);
    if (empty($userId) || empty($input['scheduleId'])) {
        sendResponse(400, null, '缺少必要参数');
    }
    $scheduleId = $input['scheduleId'];
    $sql = "SELECT sender_id FROM mok_scheduled_message WHERE schedule_id = ? AND status = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $scheduleId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if (!$row) {
        sendResponse(404, null, '定时消息不存在');
    }
    
    if ($row['sender_id'] !== $userId) {
        sendResponse(403, null, '无权取消此定时消息');
    }
    
    $sql = "UPDATE mok_scheduled_message SET status = 3 WHERE schedule_id = ? AND status = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $scheduleId);
    $stmt->execute();
    
    sendResponse(200, ['affected' => $stmt->affected_rows], '取消成功');
}
function updateScheduledMessage()
{
    global $conn;
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['scheduleId']) || !isset($input['nextScheduleTime'])) {
        sendResponse(400, null, '缺少必要参数');
    }
    
    $sql = "UPDATE mok_scheduled_message 
            SET schedule_time = ?, send_count = send_count + 1, last_sent_time = ? 
            WHERE schedule_id = ? AND status = 1";
    $t1_q = time() * 1000;
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iis", $input['nextScheduleTime'],$t1_q , $input['scheduleId']);
    $stmt->execute();
    
    sendResponse(200, ['affected' => $stmt->affected_rows], '更新成功');
}
function completeScheduledMessage()
{
    global $conn;
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['scheduleId'])) {
        sendResponse(400, null, '缺少定时消息ID');
    }
    
    $sql = "UPDATE mok_scheduled_message SET status = 2 WHERE schedule_id = ? AND status = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $input['scheduleId']);
    $stmt->execute();
    
    sendResponse(200, ['affected' => $stmt->affected_rows], '已完成');
}
function failScheduledMessage()
{
    global $conn;
    $input = json_decode(file_get_contents('php://input'), true);
    if (empty($input['scheduleId'])) {
        sendResponse(400, null, '缺少定时消息ID');
    }
    $sql = "UPDATE mok_scheduled_message SET status = 4, error_msg = ? WHERE schedule_id = ? AND status = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $input['errorMsg'], $input['scheduleId']);
    $stmt->execute();
    sendResponse(200, ['affected' => $stmt->affected_rows], '已标记失败');
}