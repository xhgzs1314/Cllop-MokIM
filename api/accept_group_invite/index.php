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

if (!isset($data['group_id']) || !isset($data['UserId'])) {
    sendResponse(false, '参数不完整');
}

$encryptedGroupId = $data['group_id'];
$userId = $data['UserId'];
if (empty($userId) || !is_string($userId)) {
    sendResponse(false, '用户ID无效');
}

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$groupId = $decryptor->writebacknewwords($encryptedGroupId);

if (!$groupId || !is_numeric($groupId)) {
    sendResponse(false, '令牌验证失效或群聊ID无效');
}
$groupId = (int)$groupId;
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
if (!isset($conn) || !$conn) {
    sendResponse(false, '数据库连接失败');
}
$conn->begin_transaction();
try {
    $checkGroupSql = "SELECT id, group_name, owner_id, max_member, verify_join, group_status FROM mok_group_chat WHERE id = ?";
    $checkGroupStmt = $conn->prepare($checkGroupSql);
    if (!$checkGroupStmt) {
        throw new Exception('数据库查询准备失败: ' . $conn->error);
    }
    $checkGroupStmt->bind_param("i", $groupId);
    $checkGroupStmt->execute();
    $groupResult = $checkGroupStmt->get_result();
    if ($groupResult->num_rows === 0) {
        $conn->rollback();
        sendResponse(false, '群聊不存在');
    }
    $group = $groupResult->fetch_assoc();
    if ($group['group_status'] != 1) {
        $statusMsg = [
            0 => '群聊已解散',
            2 => '群聊已被封禁',
            3 => '群聊仅群主可发言，暂不支持加入'
        ];
        $conn->rollback();
        sendResponse(false, $statusMsg[$group['group_status']] ?? '群聊状态异常，无法加入');
    }
    $checkMemberSql = "SELECT id, `status` FROM mok_group_member WHERE group_id = ? AND user_id = ?";
    $checkMemberStmt = $conn->prepare($checkMemberSql);
    if (!$checkMemberStmt) {
        throw new Exception('数据库查询准备失败: ' . $conn->error);
    }
    $checkMemberStmt->bind_param("is", $groupId, $userId);
    $checkMemberStmt->execute();
    $memberResult = $checkMemberStmt->get_result();
    $existingMember = $memberResult->fetch_assoc();

    if ($existingMember) {
        if ($existingMember['status'] == 1) {
            $conn->rollback();
            sendResponse(false, '您已经是该群聊的成员了');
        } elseif ($existingMember['status'] == 2) {
            $conn->rollback();
            sendResponse(false, '您已被禁言，暂时无法加入');
        }
    }
    $countMemberSql = "SELECT COUNT(*) as current_count FROM mok_group_member WHERE group_id = ? AND status = 1";
    $countMemberStmt = $conn->prepare($countMemberSql);
    $countMemberStmt->bind_param("i", $groupId);
    $countMemberStmt->execute();
    $countResult = $countMemberStmt->get_result();
    $currentMemberCount = $countResult->fetch_assoc()['current_count'];

    if ($currentMemberCount >= $group['max_member']) {
        $conn->rollback();
        sendResponse(false, '群聊成员已满（' . $group['max_member'] . '人），无法加入');
    }
    if ($existingMember) {
        $updateMemberSql = "UPDATE mok_group_member 
                            SET status = 1, 
                                join_time = NOW(), 
                                quit_time = NULL,
                                join_type = 0,
                                last_active_time = NOW()
                            WHERE group_id = ? AND user_id = ?";
        $updateMemberStmt = $conn->prepare($updateMemberSql);
        $updateMemberStmt->bind_param("is", $groupId, $userId);
        if (!$updateMemberStmt->execute()) {
            throw new Exception('更新群成员失败: ' . $updateMemberStmt->error);
        }
    } else {
        $joinTypeValue = $hasValidInvite ? 0 : 1;
        $insertMemberSql = "INSERT INTO mok_group_member 
                            (group_id, user_id, is_admin, join_time, join_type, status, last_active_time) 
                            VALUES (?, ?, 0, NOW(), ?, 1, NOW())";
        $insertMemberStmt = $conn->prepare($insertMemberSql);
        $insertMemberStmt->bind_param("isi", $groupId, $userId, $joinTypeValue);

        if (!$insertMemberStmt->execute()) {
            throw new Exception('加入群聊失败: ' . $insertMemberStmt->error);
        }
    }
    $logSql = "INSERT INTO mok_group_log 
               (group_id, user_id, action, action_time, remark) 
               VALUES (?, ?, 'join_group', NOW(), ?)";
    $logStmt = $conn->prepare($logSql);
    $logRemark = "用户 {$userId} 加入了群聊";
    $logStmt->bind_param("iss", $groupId, $userId, $logRemark);
    $logStmt->execute();

    $conn->commit();

    sendResponse(true, '成功加入群聊', [
        'group_id' => $groupId,
        'group_name' => $group['group_name'],
        'member_count' => $newMemberCount
    ]);
} catch (Exception $e) {
    $conn->rollback();
    error_log('Accept group invite error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    sendResponse(false, '加入群聊失败：' . $e->getMessage());
}
