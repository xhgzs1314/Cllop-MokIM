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
$verifyMsg = $data['verify_msg'] ?? '您好，我想添加您为好友';
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($conversationId);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$friendId = $plaintext;
$checkStmt = $conn->prepare("SELECT add_status FROM mok_contact WHERE user_id = ? AND friend_id = ?");
$checkStmt->bind_param("ss", $userId, $friendId);
$checkStmt->execute();
$result = $checkStmt->get_result();
if ($result->num_rows > 0) {
    $existing = $result->fetch_assoc();
    if ($existing['add_status'] == 1) {
        $checkStmt->close();
        sendResponse(false, '已经是好友关系');
    } elseif ($existing['add_status'] == 3) {
        $checkStmt->close();
        sendResponse(false, '已发送过好友申请，请等待对方验证');
    }
}
$checkStmt->close();
$appCheckStmt = $conn->prepare("SELECT id, status FROM mok_application WHERE app_type = 1 AND applicant_id = ? AND target_id = ? AND `status` = 1");
$appCheckStmt->bind_param("ss", $userId, $friendId);
$appCheckStmt->execute();
$appResult = $appCheckStmt->get_result();
if ($appResult->num_rows > 0) {
    $appCheckStmt->close();
    sendResponse(false, '已存在未处理的好友申请，请等待对方验证');
}
$appCheckStmt->close();
$needVerify = true;
$settingStmt = $conn->prepare("SELECT setting_json FROM mok_user_setting WHERE user_id = ?");
$settingStmt->bind_param("s", $friendId);
$settingStmt->execute();
$settingResult = $settingStmt->get_result();
if ($settingResult->num_rows > 0) {
    $setting = $settingResult->fetch_assoc();
    $settingJson = $setting['setting_json'];
    if (!empty($settingJson)) {
        $settingData = json_decode($settingJson, true);
        if ($settingData !== null && isset($settingData['add_verify'])) {
            $needVerify = ($settingData['add_verify'] == 1);
        }
    }
}
$settingStmt->close();
$addTime = date('Y-m-d H:i:s');
if ($needVerify) {
    $expireTime = date('Y-m-d H:i:s', strtotime('+7 days'));
    $checkExistStmt = $conn->prepare("SELECT id, `status` FROM mok_application WHERE app_type = 1 AND applicant_id = ? AND target_id = ?");
    $checkExistStmt->bind_param("ss", $userId, $friendId);
    $checkExistStmt->execute();
    $existResult = $checkExistStmt->get_result();
    if ($existResult->num_rows > 0) {
        $existingApp = $existResult->fetch_assoc();
        $appId = $existingApp['id'];
        $updateStmt = $conn->prepare("UPDATE mok_application SET reason = ?, `status` = 1, apply_time = ?, expire_time = ?, handle_time = NULL, remark = NULL WHERE id = ?");
        $updateStmt->bind_param("sssi", $verifyMsg, $addTime, $expireTime, $appId);
        if ($updateStmt->execute()) {
            sendResponse(true, '好友申请已重新发送，等待对方验证');
        } else {
            sendResponse(false, '更新好友申请失败：' . $conn->error);
        }
        $updateStmt->close();
    } else {
        $insertStmt = $conn->prepare("INSERT INTO mok_application (app_type, applicant_id, target_id, reason, status, apply_time, expire_time) VALUES (1, ?, ?, ?, 1, ?, ?)");
        $insertStmt->bind_param("sssss", $userId, $friendId, $verifyMsg, $addTime, $expireTime);
        if ($insertStmt->execute()) {
            sendResponse(true, '好友申请已发送，等待对方验证');
        } else {
            sendResponse(false, '发送好友申请失败：' . $conn->error);
        }
        $insertStmt->close();
    }
    $checkExistStmt->close();
} else {
    $conn->begin_transaction();
    try {
        $checkContactStmt = $conn->prepare("SELECT id, add_status FROM mok_contact WHERE user_id = ? AND friend_id = ?");
        $checkContactStmt->bind_param("ss", $userId, $friendId);
        $checkContactStmt->execute();
        $userContactResult = $checkContactStmt->get_result();
        $userContactExists = $userContactResult->num_rows > 0;
        $userContactData = $userContactExists ? $userContactResult->fetch_assoc() : null;
        $checkContactStmt->bind_param("ss", $friendId, $userId);
        $checkContactStmt->execute();
        $friendContactResult = $checkContactStmt->get_result();
        $friendContactExists = $friendContactResult->num_rows > 0;
        $friendContactData = $friendContactExists ? $friendContactResult->fetch_assoc() : null;
        $checkContactStmt->close();
        if ($userContactExists) {
            $updateStmt = $conn->prepare("UPDATE mok_contact SET add_status = 1, add_time = ?, verify_msg = ? WHERE id = ?");
            $updateStmt->bind_param("ssi", $addTime, $verifyMsg, $userContactData['id']);
            $updateStmt->execute();
            $updateStmt->close();
        } else {
            $insertStmt = $conn->prepare("INSERT INTO mok_contact (user_id, friend_id, add_status, add_time, verify_msg) VALUES (?, ?, 1, ?, ?)");
            $insertStmt->bind_param("ssss", $userId, $friendId, $addTime, $verifyMsg);
            $insertStmt->execute();
            $insertStmt->close();
        }
        if ($friendContactExists) {
            $updateStmt = $conn->prepare("UPDATE mok_contact SET add_status = 1, add_time = ?, verify_msg = ? WHERE id = ?");
            $updateStmt->bind_param("ssi", $addTime, $verifyMsg, $friendContactData['id']);
            $updateStmt->execute();
            $updateStmt->close();
        } else {
            $insertStmt = $conn->prepare("INSERT INTO mok_contact (user_id, friend_id, add_status, add_time, verify_msg) VALUES (?, ?, 1, ?, ?)");
            $insertStmt->bind_param("ssss", $friendId, $userId, $addTime, $verifyMsg);
            $insertStmt->execute();
            $insertStmt->close();
        }
        $mailTitle = '新好友通知';
        $mailContent = "用户 [" . htmlspecialchars($userId) . "] 已添加您为好友。\n验证消息：" . htmlspecialchars($verifyMsg);
        $sendTime = date('Y-m-d H:i:s');
        $mailStmt = $conn->prepare("INSERT INTO mok_mail (from_id, to_id, title, content, is_read, send_time) VALUES (?, ?, ?, ?, 0, ?)");
        $mailStmt->bind_param("sssss", $userId, $friendId, $mailTitle, $mailContent, $sendTime);
        $mailStmt->execute();
        $mailStmt->close();
        $delAppStmt = $conn->prepare("UPDATE mok_application SET status = 2, handle_time = ? WHERE app_type = 1 AND applicant_id = ? AND target_id = ? AND status = 1");
        $delAppStmt->bind_param("sss", $addTime, $userId, $friendId);
        $delAppStmt->execute();
        $delAppStmt->close();
        $conn->commit();
        sendResponse(true, '添加好友成功', [
            'auto_approved' => true,
            'friend_id' => $friendId
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        sendResponse(false, '添加好友失败：' . $e->getMessage());
    }
}

$conn->close();
