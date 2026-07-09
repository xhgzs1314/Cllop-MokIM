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
$Alias = $data['Alias'];
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userIds);
if (!$plaintext) {
    echo json_encode(array('status' => 301, 'message' => '令牌验证失效'));
    sendResponse(false, '令牌验证失效');
    exit;
}
if (!conbine_auth_towdouble($plaintext)) {
    sendResponse(false, '令牌验证失效');
}
$userId = $plaintext;
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$conn->begin_transaction();
try {
    $stmt = $conn->prepare("SELECT id FROM mok_group_member WHERE user_id = ? AND group_id = ? AND `status` = 1");
    $friendId = processGroupText($conversationId);
    $stmt->bind_param("si", $userId, $friendId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $updateStmt = $conn->prepare("UPDATE mok_group_member SET galias = ? WHERE user_id = ? AND group_id = ?");
        $updateStmt->bind_param("ssi", $Alias, $userId, $friendId);
        $updateStmt->execute();
        if ($updateStmt->affected_rows === -1) {
            throw new Exception("更新备注名失败");
        }
        $updateStmt->close();
    } else {
        sendResponse(false, '备注更改失败，群聊中不存在此用户');
    }
    $stmt->close();
    $conn->commit();
    sendResponse(true, '备注更改成功', [
        'alias' => $Alias
    ]);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, '备注更改操作失败: ' . $e->getMessage());
} finally {
    $conn->close();
}
