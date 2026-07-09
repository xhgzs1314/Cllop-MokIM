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
    $stmt = $conn->prepare("SELECT id FROM mok_contact WHERE user_id = ? AND friend_id = ? AND add_status = 1");
    $friendId = $conversationId;
    $stmt->bind_param("ss", $userId, $friendId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $updateStmt = $conn->prepare("UPDATE mok_contact SET friend_alias = ? WHERE user_id = ? AND friend_id = ?");
        $updateStmt->bind_param("sss", $Alias, $userId, $friendId);
        $updateStmt->execute();
        if ($updateStmt->affected_rows === -1) {
            throw new Exception("更新备注名失败");
        }
        $updateStmt->close();
    } else {
        sendResponse(false, '好友不存在');
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
