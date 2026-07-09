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

if (!isset($data['dfid']) || !isset($data['UserId'])) {
    sendResponse(false, '参数不完整');
}

$conversationId = $data['dfid'];
$userId = $data['UserId'];
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($conversationId);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$searchId = $plaintext;
$stmt = $conn->prepare("SELECT id, username, uname, sayed, tximg, credit, regtime,isban FROM mok_user WHERE id = ?");
$stmt->bind_param("s", $searchId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    sendResponse(false, '用户不存在');
}

$userInfo = $result->fetch_assoc();
if($userInfo['isban'] == 2){
    sendResponse(false, '用户账号已注销');
}
$checkFriendStmt = $conn->prepare("SELECT add_status FROM mok_contact WHERE user_id = ? AND friend_id = ?");
$checkFriendStmt->bind_param("ss", $userId, $searchId);
$checkFriendStmt->execute();
$friendResult = $checkFriendStmt->get_result();
$isFriend = false;
$friendStatus = null;
if ($friendResult->num_rows > 0) {
    $friendData = $friendResult->fetch_assoc();
    $friendStatus = $friendData['add_status'];
    $isFriend = ($friendStatus == 1);
}
$hasPendingRequest = false;
if ($friendStatus == 3) {
    $hasPendingRequest = true;
}

sendResponse(true, '获取用户信息成功', [
    'contactId' => $userInfo['id'],
    'uname' => $userInfo['uname'] ?: $userInfo['username'],
    'username' => $userInfo['username'],
    'sayed' => $userInfo['sayed'] ?: '暂无签名',
    'tximg' => $userInfo['tximg'],
    'credit' => $userInfo['credit'],
    'regtime' => $userInfo['regtime'],
    'isFriend' => $isFriend,
    'friendStatus' => $friendStatus,
    'hasPendingRequest' => $hasPendingRequest
]);

$stmt->close();
$checkFriendStmt->close();
$conn->close();
