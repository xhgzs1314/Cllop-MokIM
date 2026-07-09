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

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['dfid'])) {
    sendResponse(false, '参数不完整');
}

if (!isset($data['announcement_id'])) {
    sendResponse(false, '公告ID不能为空');
}
$conversationId = $data['dfid'];
$announcementId = (int)$data['announcement_id'];
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($conversationId);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
if (!conbine_auth_towdouble($plaintext)) {
    sendResponse(false, '令牌验证失效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$sql = "SELECT id, group_id, title, content, creator_id, is_top, `status`, 
               publish_time, update_time, expire_time
        FROM mok_group_announcement 
        WHERE id = ? AND `status` = 1";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $announcementId);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    $stmt->close();
    sendResponse(false, '公告不存在或已删除');
}
$announcement = $result->fetch_assoc();
$stmt->close();
$checkMemberSql = "SELECT id FROM mok_group_member 
                   WHERE group_id = ? AND user_id = ? AND `status` = 1";
$checkStmt = $conn->prepare($checkMemberSql);
$checkStmt->bind_param("is", $announcement['group_id'], $plaintext);
$checkStmt->execute();
$memberResult = $checkStmt->get_result();
if ($memberResult->num_rows === 0) {
    $checkStmt->close();
    sendResponse(false, '您不是该群成员，无法查看公告');
}
$checkStmt->close();
$responseData = [
    'id' => (int)$announcement['id'],
    'group_id' => (int)$announcement['group_id'],
    'title' => $announcement['title'],
    'content' => $announcement['content'],
    'creator_id' => $announcement['creator_id'],
    'creator_name' => $creatorInfo['uname'] ?? '系统用户',
    'creator_avatar' => $creatorInfo['tximg'] ?? '',
    'creator_signature' => $creatorInfo['sayed'] ?? '',
    'is_top' => (int)$announcement['is_top'],
    'publish_time' => $announcement['publish_time'],
    'update_time' => $announcement['update_time'],
    'expire_time' => $announcement['expire_time']
];

sendResponse(true, '获取公告详情成功', $responseData);
