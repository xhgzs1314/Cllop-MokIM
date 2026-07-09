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
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

function processGroupText($text)
{
    $prefix = 'group_';
    if (strpos($text, $prefix) === 0) {
        $text = substr($text, strlen($prefix));
    }
    return (int)$text;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['dfid']) || !isset($data['packet_id'])) {
    sendResponse(false, '参数不完整');
}
$userIds = $data['dfid'];
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

$packetId = intval($data['packet_id']);
if ($packetId <= 0) {
    sendResponse(false, '红包ID无效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$packetSql = "SELECT r.*, u.uname as sender_name 
              FROM mok_redpacket r
              LEFT JOIN mok_user u ON r.sender_id = u.id
              WHERE r.id = ?";
$stmt = $conn->prepare($packetSql);
$stmt->bind_param("i", $packetId);
$stmt->execute();
$packetResult = $stmt->get_result();

if ($packetResult->num_rows === 0) {
    $stmt->close();
    sendResponse(false, '红包不存在');
}

$packet = $packetResult->fetch_assoc();
$stmt->close();
$recordsSql = "SELECT r.*, u.uname as user_name 
               FROM mok_redpacket_record r
               LEFT JOIN mok_user u ON r.user_id = u.id
               WHERE r.packet_id = ?
               ORDER BY r.receive_time ASC";
$stmt = $conn->prepare($recordsSql);
$stmt->bind_param("i", $packetId);
$stmt->execute();
$recordsResult = $stmt->get_result();
$records = [];
while ($row = $recordsResult->fetch_assoc()) {
    $records[] = [
        'user_id' => $row['user_id'],
        'user_name' => $row['user_name'] ?? $row['user_id'],
        'amount' => intval($row['amount']),
        'is_luckiest' => intval($row['is_luckiest']),
        'receive_time' => strtotime($row['receive_time']) * 1000
    ];
}
$stmt->close();
$userGrabSql = "SELECT amount FROM mok_redpacket_record WHERE packet_id = ? AND user_id = ?";
$stmt = $conn->prepare($userGrabSql);
$stmt->bind_param("is", $packetId, $userId);
$stmt->execute();
$userGrabResult = $stmt->get_result();
$userGrabAmount = null;
$isGrab = false;
if ($userGrabResult->num_rows > 0) {
    $grabData = $userGrabResult->fetch_assoc();
    $userGrabAmount = intval($grabData['amount']);
    $isGrab = true;
}
$stmt->close();
if ($packet['status'] == 1 && strtotime($packet['expire_time']) < time()) {
    $updateSql = "UPDATE mok_redpacket SET status = 3 WHERE id = ?";
    $stmt = $conn->prepare($updateSql);
    $stmt->bind_param("i", $packetId);
    $stmt->execute();
    $stmt->close();
    $packet['status'] = 3;
}
$responseData = [
    'packet_id' => intval($packet['id']),
    'packet_no' => $packet['packet_no'],
    'sender_id' => $packet['sender_id'],
    'sender_name' => $packet['sender_name'] ?? $packet['sender_id'],
    'group_id' => intval($packet['group_id']),
    'total_amount' => intval($packet['total_amount']),
    'total_count' => intval($packet['total_count']),
    'remain_amount' => intval($packet['remain_amount']),
    'remain_count' => intval($packet['remain_count']),
    'blessing' => $packet['blessing'] ?? '恭喜发财，大吉大利',
    'type' => intval($packet['type']),
    'status' => intval($packet['status']),
    'expire_time' => strtotime($packet['expire_time']) * 1000,
    'create_time' => strtotime($packet['create_time']) * 1000,
    'records' => $records,
    'user_grab_amount' => $userGrabAmount,
    'is_grab' => $isGrab
];
sendResponse(true, '获取成功', $responseData);
?>