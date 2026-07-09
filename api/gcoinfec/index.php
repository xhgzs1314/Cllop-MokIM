<?php
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

if (!isset($data['dfid']) || !isset($data['UserId']) || !isset($data['gcoin'])) {
    sendResponse(false, '参数不完整');
}

$conversationId = $data['dfid'];
$userId = $data['UserId'];
$gcoin = intval($data['gcoin']);
$gcointext = $data['gcointext'] ?? '无';
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($conversationId);

if (!$plaintext) {
    echo json_encode(array('status' => 301, 'message' => '令牌验证失效'));
    sendResponse(false, '令牌验证失效');
    exit;
}

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$conn->begin_transaction();

try {
    $friendId = $plaintext;
    $stmt = $conn->prepare("SELECT id, spkcin, credit FROM mok_user WHERE id IN (?, ?)");
    $stmt->bind_param("ss", $userId, $friendId);
    $stmt->execute();
    $result = $stmt->get_result();

    $userData = [];
    while ($row = $result->fetch_assoc()) {
        $userData[$row['id']] = [
            'spkcin' => $row['spkcin'],
            'credit' => $row['credit']
        ];
    }
    $stmt->close();
    if (!isset($userData[$userId])) {
        throw new Exception("当前用户不存在");
    }
    if (!isset($userData[$friendId])) {
        throw new Exception("接收方用户不存在");
    }
    if ($userData[$userId]['spkcin'] < $gcoin) {
        throw new Exception("余额不足");
    }
    if ($gcoin <= 0) {
        throw new Exception("转账金额必须大于0");
    }
    if ($userData[$friendId]['credit'] < 70) {
        throw new Exception("对方信誉分过低,功能已受限，无法接受转账");
    }
    $updateSender = $conn->prepare("UPDATE mok_user SET spkcin = spkcin - ? WHERE id = ?");
    $updateSender->bind_param("is", $gcoin, $userId);
    $updateSender->execute();
    if ($updateSender->affected_rows === -1) {
        throw new Exception("更新发送方余额失败");
    }
    $updateSender->close();
    $updateReceiver = $conn->prepare("UPDATE mok_user SET spkcin = spkcin + ? WHERE id = ?");
    $updateReceiver->bind_param("is", $gcoin, $friendId);
    $updateReceiver->execute();
    if ($updateReceiver->affected_rows === -1) {
        throw new Exception("更新接收方余额失败");
    }
    $updateReceiver->close();
    $title = "转账通知";
    $content = "对方向您转账 " . $gcoin . " G币</br>留言：" . $gcointext;
    $sendTime = date('Y-m-d H:i:s');
    $insertMail = $conn->prepare("INSERT INTO mok_mail (from_id, to_id, title, content, is_read, is_delete, send_time) VALUES (?, ?, ?, ?, 0, 0, ?)");
    $insertMail->bind_param("sssss", $userId, $friendId, $title, $content, $sendTime);
    $insertMail->execute();
    if ($insertMail->affected_rows === -1) {
        throw new Exception("插入邮件记录失败");
    }
    $mailId = $insertMail->insert_id;
    $insertMail->close();
    $transferMessages = [
        "悄悄塞给你 %d 个G币，记得查收哦",
        "送你 %d 个G币，今天也要开心呀",
        "叮！%d 个G币已送达，请注意查收",
        "用 %d 个G币兑换了一份心意，请签收",
        "今天是个好日子，送你 %d 个G币",
        "嘘...偷偷给你转了 %d 个G币，别告诉别人",
        "%d 个G币已发射，请接收这份小惊喜",
        "你的G币余额又多了 %d，开心吗？",
    ];
    $randomIndex = array_rand($transferMessages);
    $messageTemplate = $transferMessages[$randomIndex];
    $messageWithAmount = sprintf($messageTemplate, $gcoin);
    $description = $messageWithAmount;
    if ($gcointext !== '无' && !empty($gcointext)) {
        $description .= "（留言：" . $gcointext . "）";
    }
    $titles = [
        "心意送达",
        "惊喜来了",
        "小温暖",
        "今日份美好",
        "一份礼物",
        "星光传递",
    ];
    $timelineTitle = $titles[array_rand($titles)];
    $eventDate = date('Y-m-d');
    $eventType = "transfer";
    $insertTimeline = $conn->prepare("INSERT INTO mok_smallworld_timeline 
    (user_id, target_id, event_type, title, `description`, icon, event_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?)");
    $timelineIcon = "fa-gift";
    $insertTimeline->bind_param(
        "sssssss",
        $userId,
        $friendId,
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

    if ($insertTimeline->affected_rows === -1) {
        throw new Exception("时间线插入受影响行数为 -1，插入失败。错误信息: " . $insertTimeline->error);
    }

    if ($insertTimeline->affected_rows === 0) {
        throw new Exception("时间线插入未影响任何行，可能数据格式有误。user_id: {$userId}, target_id: {$friendId}, event_type: {$eventType}");
    }
    $insertTimeline->close();
    $conn->commit();
    $stmt = $conn->prepare("SELECT spkcin FROM mok_user WHERE id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $newBalance = 0;
    if ($row = $result->fetch_assoc()) {
        $newBalance = $row['spkcin'];
    }
    $stmt->close();
    sendResponse(true, '转账成功', [
        'new_balance' => $newBalance,
        'transfer_amount' => $gcoin,
        'mail_id' => $mailId,
        'to_user' => $friendId
    ]);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, $e->getMessage());
} finally {
    $conn->close();
}
