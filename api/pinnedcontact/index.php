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

if (!isset($data['dfid']) || !isset($data['UserId']) || !isset($data['Pinned'])) {
    sendResponse(false, '参数不完整');
}

$conversationId = $data['dfid'];
$userIds = $data['UserId'];
$isPinned = $data['Pinned'];
$type = isset($data['type']) ? $data['type'] : 'friend'; 
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
    if ($type === 'group') {
        $groupId = $conversationId;
        if (strpos($groupId, 'group_') === 0) {
            $groupId = substr($groupId, 6);
        }
        $checkStmt = $conn->prepare("SELECT id FROM mok_group_member WHERE group_id = ? AND user_id = ? AND status = 1");
        $checkStmt->bind_param("is", $groupId, $userId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            throw new Exception("您不是该群聊的成员，无法进行置顶操作");
        }
        $checkStmt->close();
        $updateStmt = $conn->prepare("UPDATE mok_group_member SET isPinned = ? WHERE group_id = ? AND user_id = ?");
        $updateStmt->bind_param("iis", $isPinned, $groupId, $userId);
        $updateStmt->execute();
        
        if ($updateStmt->affected_rows === -1) {
            throw new Exception("更新群聊置顶失败");
        }
        $updateStmt->close();
        
        $conn->commit();
        sendResponse(true, $isPinned ? '群聊置顶成功' : '取消置顶成功', [
            'isPinned' => $isPinned,
            'type' => 'group',
            'groupId' => $groupId
        ]);
        
    } else {
        $friendId = $conversationId;
        $stmt = $conn->prepare("SELECT id FROM mok_contact WHERE user_id = ? AND friend_id = ? AND add_status = 1");
        $stmt->bind_param("ss", $userId, $friendId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            throw new Exception("好友关系不存在或已删除");
        }
        $stmt->close();
        $updateStmt = $conn->prepare("UPDATE mok_contact SET ispin = ? WHERE user_id = ? AND friend_id = ?");
        $updateStmt->bind_param("iss", $isPinned, $userId, $friendId);
        $updateStmt->execute();
        if ($updateStmt->affected_rows === -1) {
            throw new Exception("更新好友置顶失败");
        }
        $updateStmt->close();
        $conn->commit();
        sendResponse(true, $isPinned ? '好友置顶成功' : '取消置顶成功', [
            'isPinned' => $isPinned,
            'type' => 'friend',
            'friendId' => $friendId
        ]);
    }
    
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, '置顶操作失败: ' . $e->getMessage());
} finally {
    $conn->close();
}
?>