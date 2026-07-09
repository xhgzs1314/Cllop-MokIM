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

if (!isset($data['dfid']) || !isset($data['UserId']) || !isset($data['group_code'])) {
    sendResponse(false, '参数不完整');
}

$conversationId = $data['dfid'];
$userId = $data['UserId'];
$groupCode = $data['group_code'];
$reason = $data['reason'] ?? '我想加入群聊';

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($conversationId);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$groupStmt = $conn->prepare("SELECT id, group_name, owner_id, max_member, verify_join FROM mok_group_chat WHERE searnum = ? OR id = ?");
$groupStmt->bind_param("ss", $groupCode, $groupCode);
$groupStmt->execute();
$groupResult = $groupStmt->get_result();
if ($groupResult->num_rows === 0) {
    sendResponse(false, '群聊不存在');
}

$groupInfo = $groupResult->fetch_assoc();
$groupId = $groupInfo['id'];
$groupName = $groupInfo['group_name'];
$ownerId = $groupInfo['owner_id'];
$maxMember = $groupInfo['max_member'];
$verifyJoin = $groupInfo['verify_join'];
$groupStmt->close();
$statusStmt = $conn->prepare("SELECT group_status FROM mok_group_chat WHERE id = ?");
$statusStmt->bind_param("i", $groupId);
$statusStmt->execute();
$statusResult = $statusStmt->get_result();
if ($statusResult->num_rows > 0) {
    $statusData = $statusResult->fetch_assoc();
    if ($statusData['group_status'] != 1) {
        sendResponse(false, '群聊已解散或已被封禁');
    }
}
$statusStmt->close();
$checkMemberStmt = $conn->prepare("SELECT id, status FROM mok_group_member WHERE group_id = ? AND user_id = ?");
$checkMemberStmt->bind_param("is", $groupId, $userId);
$checkMemberStmt->execute();
$memberResult = $checkMemberStmt->get_result();

if ($memberResult->num_rows > 0) {
    $memberData = $memberResult->fetch_assoc();
    if ($memberData['status'] == 1) {
        sendResponse(false, '您已在群聊中');
    } elseif ($memberData['status'] == 2) {
        sendResponse(false, '您已被禁言，无法加入');
    } elseif ($memberData['status'] == 3) {
        sendResponse(false, '您已被踢出群聊，无法重新加入');
    }
}
$checkMemberStmt->close();
$countStmt = $conn->prepare("SELECT COUNT(*) as count FROM mok_group_member WHERE group_id = ? AND status = 1");
$countStmt->bind_param("i", $groupId);
$countStmt->execute();
$countResult = $countStmt->get_result();
$currentCount = 0;
if ($countResult->num_rows > 0) {
    $countData = $countResult->fetch_assoc();
    $currentCount = $countData['count'];
}
$countStmt->close();

if ($currentCount >= $maxMember) {
    sendResponse(false, '群聊人数已满');
}
$checkAppStmt = $conn->prepare("SELECT id, status FROM mok_application WHERE app_type = 2 AND applicant_id = ? AND target_id = ? AND status = 1");
$checkAppStmt->bind_param("ss", $userId, $groupId);
$checkAppStmt->execute();
$appResult = $checkAppStmt->get_result();

if ($appResult->num_rows > 0) {
    sendResponse(false, '已存在待处理的入群申请，请等待验证');
}
$checkAppStmt->close();
$now = date('Y-m-d H:i:s');
if ($verifyJoin == 2) {
    $conn->begin_transaction();
    try {
        $insertStmt = $conn->prepare("INSERT INTO mok_group_member (group_id, user_id, join_time, join_type, status, last_active_time) VALUES (?, ?, ?, 1, 1, ?)");
        $insertStmt->bind_param("isss", $groupId, $userId, $now, $now);
        $insertStmt->execute();
        $insertStmt->close();
        $logStmt = $conn->prepare("INSERT INTO mok_group_log (group_id, user_id, action, action_time, remark) VALUES (?, ?, 'join_group', ?, '直接加入')");
        $logStmt->bind_param("iss", $groupId, $userId, $now);
        $logStmt->execute();
        $logStmt->close();
        $conn->commit();
        sendResponse(true, '成功加入群聊', ['auto_approved' => true]);
    } catch (Exception $e) {
        $conn->rollback();
        sendResponse(false, '加入群聊失败：' . $e->getMessage());
    }
} elseif ($verifyJoin == 3) {
    $expireTime = date('Y-m-d H:i:s', strtotime('+7 days'));
    $checkOldStmt = $conn->prepare("SELECT id FROM mok_application WHERE app_type = 2 AND applicant_id = ? AND target_id = ? AND status = 0");
    $checkOldStmt->bind_param("ss", $userId, $groupId);
    $checkOldStmt->execute();
    $oldResult = $checkOldStmt->get_result();
    if ($oldResult->num_rows > 0) {
        $oldData = $oldResult->fetch_assoc();
        $updateStmt = $conn->prepare("UPDATE mok_application SET reason = ?, status = 1, apply_time = ?, expire_time = ?, handle_time = NULL WHERE id = ?");
        $updateStmt->bind_param("sssi", $reason, $now, $expireTime, $oldData['id']);
        if ($updateStmt->execute()) {
            sendResponse(true, '入群申请已重新发送，请等待群主/管理员验证');
        } else {
            sendResponse(false, '发送申请失败：' . $conn->error);
        }
        $updateStmt->close();
    } else {
        $insertStmt = $conn->prepare("INSERT INTO mok_application (app_type, applicant_id, target_id, reason, status, apply_time, expire_time) VALUES (2, ?, ?, ?, 1, ?, ?)");
        $insertStmt->bind_param("sssss", $userId, $groupId, $reason, $now, $expireTime);
        if ($insertStmt->execute()) {
            sendResponse(true, '入群申请已发送，请等待群主/管理员验证');
        } else {
            sendResponse(false, '发送申请失败：' . $conn->error);
        }
        $insertStmt->close();
    }
    $checkOldStmt->close();
} else {
    $joinTypeDesc = '';
    switch ($verifyJoin) {
        case 0:
            $joinTypeDesc = '禁止搜索';
            break;
        case 1:
            $joinTypeDesc = '禁止加入';
            break;
        case 4:
            $joinTypeDesc = '仅限邀请加入';
            break;
        default:
            $joinTypeDesc = '无法加入';
    }
    sendResponse(false, '该群聊' . $joinTypeDesc);
}

$conn->close();
