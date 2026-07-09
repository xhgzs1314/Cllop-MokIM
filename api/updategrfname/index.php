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
$grname = $data['grname'];
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
    $stmt = $conn->prepare("SELECT id FROM mok_contact WHERE user_id = ? AND friend_id = ? AND add_status = 1");
    $friendId = $plaintext;
    $stmt->bind_param("ss", $userId, $friendId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $updateStmt = $conn->prepare("UPDATE mok_contact SET friend_group = ? WHERE user_id = ? AND friend_id = ?");
        $updateStmt->bind_param("sss", $grname, $userId, $friendId);
        $updateStmt->execute();
        if ($updateStmt->affected_rows === -1) {
            throw new Exception("更新组别失败");
        }
        $updateStmt->close();
    }
    $stmt->close();
    $conn->commit();
    sendResponse(true, '组别更改成功', [
        'ggr' => $grname
    ]);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, '组别名更改操作失败: ' . $e->getMessage());
} finally {
    $conn->close();
}
