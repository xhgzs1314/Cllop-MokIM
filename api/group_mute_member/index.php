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

if (!isset($data['dfid']) || !isset($data['UserId']) || !isset($data['ban_until'])) {
    sendResponse(false, '参数不完整');
}

$conversationId = $data['dfid'];
$userId = $data['UserId'];
$bantotime = $data['ban_until'];
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
    $isPinned = true;
    $groupId = $plaintext;
    if (strpos($groupId, 'group_') === 0) {
        $groupId = substr($groupId, 6);
    }
    $checkStmt = $conn->prepare("SELECT id FROM mok_group_member WHERE group_id = ? AND user_id = ? AND status = 1");
    $checkStmt->bind_param("is", $groupId, $userId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();

    if ($checkResult->num_rows === 0) {
        throw new Exception("无法被禁言");
    }
    $checkStmt->close();
    $updateStmt = $conn->prepare("UPDATE mok_group_member SET nalsay = ? WHERE group_id = ? AND user_id = ?");
    $updateStmt->bind_param("sis", $bantotime, $groupId, $userId);
    $updateStmt->execute();

    if ($updateStmt->affected_rows === -1) {
        throw new Exception("更新禁言失败");
    }
    $updateStmt->close();

    $conn->commit();
    sendResponse(true, $isPinned ? '禁言成功' : '禁言失败', [
        'isPinned' => $bantotime,
        'type' => 'group',
        'groupId' => $groupId
    ]);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, '禁言操作失败: ' . $e->getMessage());
} finally {
    $conn->close();
}
