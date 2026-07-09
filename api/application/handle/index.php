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
if (!isset($data['UserId']) || !isset($data['request_id']) || !isset($data['app_type']) || !isset($data['action'])) {
    sendResponse(false, '参数不完整');
}
$userId_enc = $data['UserId'];
$requestId = (int)$data['request_id'];
$appType = (int)$data['app_type'];
$action = $data['action'];
$targetId = $data['target_id'] ?? '';
$applicantId = $data['applicant_id'] ?? '';
$remark = $data['remark'] ?? '';

if (!in_array($action, ['accept', 'reject'])) {
    sendResponse(false, '无效的操作类型');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userId_enc);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$userid = $plaintext;
$conn->begin_transaction();
try {
    $checkSql = "SELECT 
                    a.id, 
                    a.app_type, 
                    a.applicant_id, 
                    a.target_id, 
                    a.status,
                    a.expire_time,
                    a.reason
                FROM mok_application a
                WHERE a.id = ? AND a.status = 1";

    $stmt = $conn->prepare($checkSql);
    $stmt->bind_param('i', $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $application = $result->fetch_assoc();
    $stmt->close();

    if (!$application) {
        throw new Exception('申请不存在或已被处理');
    }

    if ($application['expire_time'] && strtotime($application['expire_time']) < time()) {
        $expireSql = "UPDATE mok_application SET `status` = 3, handle_time = NOW(), remark = '申请已过期' WHERE id = ?";
        $stmt = $conn->prepare($expireSql);
        $stmt->bind_param('i', $requestId);
        $stmt->execute();
        $stmt->close();
        throw new Exception('申请已过期');
    }

    if ($appType == 1) {
        if ($application['target_id'] != $userid) {
            throw new Exception('无权处理此申请');
        }
    } else if ($appType == 2) {
        $checkAdminSql = "SELECT COUNT(*) as cnt FROM mok_group_member 
                          WHERE group_id = ? AND user_id = ? AND `status` = 1 AND (is_admin = 1 OR user_id = ?)";
        $stmt = $conn->prepare($checkAdminSql);
        $groupId = $application['target_id'];
        $stmt->bind_param('iss', $groupId, $userid, $userid);
        $stmt->execute();
        $result = $stmt->get_result();
        $adminCheck = $result->fetch_assoc();
        $stmt->close();
        if ($adminCheck['cnt'] == 0) {
            throw new Exception('您没有权限处理此群聊申请');
        }
    } else {
        throw new Exception('无效的申请类型');
    }
    $applicantInfo = [];
    $userInfo = [];
    $applicantName = '';
    $targetName = '';
    if ($appType == 1) {
        $userInfoSql = "SELECT id, uname FROM mok_user WHERE id IN (?, ?)";
        $stmt = $conn->prepare($userInfoSql);
        $applicantId = $application['applicant_id'];
        $targetId = $application['target_id'];
        $stmt->bind_param('ss', $applicantId, $targetId);
        $stmt->execute();
        $userInfoResult = $stmt->get_result();
        while ($row = $userInfoResult->fetch_assoc()) {
            if ($row['id'] == $applicantId) {
                $applicantInfo = $row;
                $applicantName = $row['uname'] ?: $row['id'];
            } else {
                $userInfo = $row;
                $targetName = $row['uname'] ?: $row['id'];
            }
        }
        $stmt->close();
    } else {
        $groupInfoSql = "SELECT id, group_name FROM mok_group_chat WHERE id = ?";
        $stmt = $conn->prepare($groupInfoSql);
        $groupId = $application['target_id'];
        $stmt->bind_param('i', $groupId);
        $stmt->execute();
        $groupResult = $stmt->get_result();
        $groupInfo = $groupResult->fetch_assoc();
        $stmt->close();
        $operatorInfoSql = "SELECT id, uname FROM mok_user WHERE id = ?";
        $stmt = $conn->prepare($operatorInfoSql);
        $stmt->bind_param('s', $userid);
        $stmt->execute();
        $operatorResult = $stmt->get_result();
        $operatorInfo = $operatorResult->fetch_assoc();
        $stmt->close();
        $applicantInfoSql = "SELECT id, uname FROM mok_user WHERE id = ?";
        $stmt = $conn->prepare($applicantInfoSql);
        $applicantId = $application['applicant_id'];
        $stmt->bind_param('s', $applicantId);
        $stmt->execute();
        $applicantResult = $stmt->get_result();
        $applicantInfo = $applicantResult->fetch_assoc();
        $stmt->close();
        $applicantName = $applicantInfo['uname'] ?: $application['applicant_id'];
        $targetName = $groupInfo['group_name'] ?? $groupId;
        $operatorName = $operatorInfo['uname'] ?: $userid;
    }

    if ($action == 'accept') {
        $responseData = [];
        if ($appType == 1) {
            $checkFriendSql = "SELECT COUNT(*) as cnt FROM mok_contact 
                           WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)";
            $stmt = $conn->prepare($checkFriendSql);
            $stmt->bind_param('ssss', $userid, $applicantId, $applicantId, $userid);
            $stmt->execute();
            $result = $stmt->get_result();
            $friendCheck = $result->fetch_assoc();
            $stmt->close();

            if ($friendCheck['cnt'] == 0) {
                $now = date('Y-m-d H:i:s');
                $insertSql = "INSERT INTO mok_contact (user_id, friend_id, add_time, add_status, friend_group) 
                          VALUES (?, ?, ?, 1, '默认分组'),
                                 (?, ?, ?, 1, '默认分组')";
                $stmt = $conn->prepare($insertSql);
                $stmt->bind_param('ssssss', $userid, $applicantId, $now, $applicantId, $userid, $now);
                $stmt->execute();
                $stmt->close();
            }

            $message = '已添加好友';
            $mailTitle = '好友申请已通过';
            $mailContent = "您好 {$applicantName}，\n\n您发送给 {$targetName} 的好友申请已被同意。现在你们已经是好友了，可以开始聊天啦！\n\n处理时间：" . date('Y-m-d H:i:s');
            $insertMailSql = "INSERT INTO mok_mail (from_id, to_id, title, content, is_read, is_delete, send_time) 
                          VALUES (?, ?, ?, ?, 0, 0, NOW())";
            $stmt = $conn->prepare($insertMailSql);
            $stmt->bind_param('ssss', $userid, $applicantId, $mailTitle, $mailContent);
            $stmt->execute();
            $stmt->close();
            $userSql = "SELECT id, uname, tximg, sayed, isban FROM mok_user WHERE id = ?";
            $stmt = $conn->prepare($userSql);
            $stmt->bind_param('s', $applicantId);
            $stmt->execute();
            $userResult = $stmt->get_result();
            $userInfo = $userResult->fetch_assoc();
            $stmt->close();

            $responseData = [];
            if ($userInfo) {
                $responseData = [
                    'contactId' => $userInfo['id'],
                    'uname' => $userInfo['uname'],
                    'tximg' => $userInfo['tximg'],
                    'sayed' => $userInfo['sayed'],
                    'isban' => $userInfo['isban']
                ];
            }
        } else if ($appType == 2) {
            $groupId = $application['target_id'];
            $applicantId = $application['applicant_id'];

            $checkMemberSql = "SELECT COUNT(*) as cnt FROM mok_group_member WHERE group_id = ? AND user_id = ? AND status = 1";
            $stmt = $conn->prepare($checkMemberSql);
            $stmt->bind_param('is', $groupId, $applicantId);
            $stmt->execute();
            $result = $stmt->get_result();
            $memberCheck = $result->fetch_assoc();
            $stmt->close();

            if ($memberCheck['cnt'] == 0) {
                $groupSql = "SELECT max_member FROM mok_group_chat WHERE id = ?";
                $stmt = $conn->prepare($groupSql);
                $stmt->bind_param('i', $groupId);
                $stmt->execute();
                $result = $stmt->get_result();
                $groupInfo = $result->fetch_assoc();
                $stmt->close();

                $memberCountSql = "SELECT COUNT(*) as cnt FROM mok_group_member WHERE group_id = ? AND status = 1";
                $stmt = $conn->prepare($memberCountSql);
                $stmt->bind_param('i', $groupId);
                $stmt->execute();
                $result = $stmt->get_result();
                $memberCount = $result->fetch_assoc();
                $stmt->close();

                if ($memberCount['cnt'] >= $groupInfo['max_member']) {
                    throw new Exception('群聊成员数量已达上限');
                }

                $now = date('Y-m-d H:i:s');
                $insertSql = "INSERT INTO mok_group_member (group_id, user_id, join_time, status, join_type) 
                          VALUES (?, ?, ?, 1, 1)";
                $stmt = $conn->prepare($insertSql);
                $stmt->bind_param('iss', $groupId, $applicantId, $now);
                $stmt->execute();
                $stmt->close();
            }

            $message = '已同意加入群聊';
            $mailTitle = '群聊加入申请已通过';
            $mailContent = "您好 {$applicantName}，\n\n您申请加入群聊「{$targetName}」的请求已被 {$operatorName} 同意。\n\n处理时间：" . date('Y-m-d H:i:s');

            $insertMailSql = "INSERT INTO mok_mail (from_id, to_id, title, content, is_read, is_delete, send_time) 
                          VALUES (?, ?, ?, ?, 0, 0, NOW())";
            $stmt = $conn->prepare($insertMailSql);
            $stmt->bind_param('ssss', $userid, $applicantId, $mailTitle, $mailContent);
            $stmt->execute();
            $stmt->close();
            $groupSql = "SELECT id, group_name, group_desc, searnum, owner_id, max_member, create_time, group_avatar FROM mok_group_chat WHERE id = ?";
            $stmt = $conn->prepare($groupSql);
            $stmt->bind_param('i', $groupId);
            $stmt->execute();
            $groupResult = $stmt->get_result();
            $groupInfoData = $groupResult->fetch_assoc();
            $stmt->close();
            if ($groupInfoData) {
                $countSql = "SELECT COUNT(*) as cnt FROM mok_group_member WHERE group_id = ? AND `status` = 1";
                $stmt = $conn->prepare($countSql);
                $stmt->bind_param('i', $groupId);
                $stmt->execute();
                $countResult = $stmt->get_result();
                $countData = $countResult->fetch_assoc();
                $stmt->close();
                $roleSql = "SELECT is_admin FROM mok_group_member WHERE group_id = ? AND user_id = ? AND `status` = 1";
                $stmt = $conn->prepare($roleSql);
                $stmt->bind_param('is', $groupId, $applicantId);
                $stmt->execute();
                $roleResult = $stmt->get_result();
                $roleData = $roleResult->fetch_assoc();
                $stmt->close();
                $responseData = [
                    'group_id' => $groupInfoData['id'],
                    'group_name' => $groupInfoData['group_name'],
                    'group_desc' => $groupInfoData['group_desc'],
                    'searnum' => $groupInfoData['searnum'],
                    'owner_id' => $groupInfoData['owner_id'],
                    'max_member' => $groupInfoData['max_member'],
                    'create_time' => $groupInfoData['create_time'],
                    'group_avatar' => $groupInfoData['group_avatar'],
                    'memberCount' => $countData['cnt'] ?? 0,
                    'is_admin' => $roleData['is_admin'] ?? 0,
                ];
            }
        }

        $updateSql = "UPDATE mok_application 
                  SET `status` = 2, handle_time = NOW(), remark = ? 
                  WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $updateRemark = $remark ?: '同意';
        $stmt->bind_param('si', $updateRemark, $requestId);
        $stmt->execute();
        $stmt->close();
        if ($appType == 2) {
            $logSql = "INSERT INTO mok_group_log (group_id, user_id, `action`, action_time, remark) 
                   VALUES (?, ?, 'add_member', NOW(), ?)";
            $stmt = $conn->prepare($logSql);
            $groupId = $application['target_id'];
            $logRemark = "同意用户 {$applicantId} 加入群聊";
            $stmt->bind_param('iss', $groupId, $userid, $logRemark);
            $stmt->execute();
            $stmt->close();
        }
        $conn->commit();
        sendResponse(true, $message, $responseData);
    } else if ($action == 'reject') {
        $updateSql = "UPDATE mok_application
                      SET `status` = 0, handle_time = NOW(), remark = ? 
                      WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $rejectRemark = $remark ?: '拒绝申请';
        $stmt->bind_param('si', $rejectRemark, $requestId);
        $stmt->execute();
        $stmt->close();
        if ($appType == 1) {
            $mailTitle = '好友申请已被拒绝';
            $mailContent = "您好 {$applicantName}，\n\n您发送给 {$targetName} 的好友申请已被拒绝。\n";
            if ($remark) {
                $mailContent .= "拒绝理由：{$remark}\n";
            }
            $mailContent .= "\n处理时间：" . date('Y-m-d H:i:s');

            $insertMailSql = "INSERT INTO mok_mail (from_id, to_id, title, content, is_read, is_delete, send_time) 
                              VALUES (?, ?, ?, ?, 0, 0, NOW())";
            $stmt = $conn->prepare($insertMailSql);
            $stmt->bind_param('ssss', $userid, $applicantId, $mailTitle, $mailContent);
            $stmt->execute();
            $stmt->close();
        } else {
            $groupId = $application['target_id'];
            $applicantId = $application['applicant_id'];
            $operatorInfoSql = "SELECT id, uname FROM mok_user WHERE id = ?";
            $stmt = $conn->prepare($operatorInfoSql);
            $stmt->bind_param('s', $userid);
            $stmt->execute();
            $operatorResult = $stmt->get_result();
            $operatorInfo = $operatorResult->fetch_assoc();
            $stmt->close();
            $operatorName = $operatorInfo['uname'] ?: $userid;
            $mailTitle = '群聊加入申请已被拒绝';
            $mailContent = "您好 {$applicantName}，\n\n您申请加入群聊「{$targetName}」的请求已被 {$operatorName} 拒绝。\n";
            if ($remark) {
                $mailContent .= "拒绝理由：{$remark}\n";
            }
            $mailContent .= "\n处理时间：" . date('Y-m-d H:i:s');
            $insertMailSql = "INSERT INTO mok_mail (from_id, to_id, title, content, is_read, is_delete, send_time) 
                              VALUES (?, ?, ?, ?, 0, 0, NOW())";
            $stmt = $conn->prepare($insertMailSql);
            $stmt->bind_param('ssss', $userid, $applicantId, $mailTitle, $mailContent);
            $stmt->execute();
            $stmt->close();
        }
        $conn->commit();
        sendResponse(true, '已拒绝申请');
    }
} catch (Exception $e) {
    $conn->rollback();
    error_log("处理申请失败: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}
