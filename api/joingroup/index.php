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

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($conversationId);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$searchKeyword = $plaintext;
$stmt = $conn->prepare("SELECT id, group_name, group_avatar, group_desc, owner_id, max_member, create_time, verify_join, searnum 
                        FROM mok_group_chat 
                        WHERE searnum = ? OR id = ? OR group_name LIKE ?");
$likeKeyword = "%{$searchKeyword}%";
$stmt->bind_param("sss", $searchKeyword, $searchKeyword, $likeKeyword);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    sendResponse(false, '群聊不存在');
}

$groupInfo = $result->fetch_assoc();
$groupId = $groupInfo['id'];
$checkMemberStmt = $conn->prepare("SELECT id, status FROM mok_group_member WHERE group_id = ? AND user_id = ?");
$checkMemberStmt->bind_param("is", $groupId, $userId);
$checkMemberStmt->execute();
$memberResult = $checkMemberStmt->get_result();
$isMember = false;
$memberStatus = null;
if ($memberResult->num_rows > 0) {
    $memberData = $memberResult->fetch_assoc();
    $memberStatus = $memberData['status'];
    $isMember = ($memberStatus == 1);
}
$hasPendingRequest = false;
$pendingRequestId = null;
if (!$isMember) {
    $checkAppStmt = $conn->prepare("SELECT id FROM mok_application WHERE app_type = 2 AND applicant_id = ? AND target_id = ? AND status = 1");
    $checkAppStmt->bind_param("ss", $userId, $groupId);
    $checkAppStmt->execute();
    $appResult = $checkAppStmt->get_result();
    if ($appResult->num_rows > 0) {
        $hasPendingRequest = true;
        $pendingData = $appResult->fetch_assoc();
        $pendingRequestId = $pendingData['id'];
    }
    $checkAppStmt->close();
}
$ownerStmt = $conn->prepare("SELECT uname FROM mok_user WHERE id = ?");
$ownerStmt->bind_param("s", $groupInfo['owner_id']);
$ownerStmt->execute();
$ownerResult = $ownerStmt->get_result();
$ownerName = $groupInfo['owner_id'];
if ($ownerResult->num_rows > 0) {
    $ownerData = $ownerResult->fetch_assoc();
    $ownerName = $ownerData['uname'] ?: $groupInfo['owner_id'];
}
$ownerStmt->close();
$memberCountStmt = $conn->prepare("SELECT COUNT(*) as count FROM mok_group_member WHERE group_id = ? AND status = 1");
$memberCountStmt->bind_param("i", $groupId);
$memberCountStmt->execute();
$memberCountResult = $memberCountStmt->get_result();
$memberCount = 0;
if ($memberCountResult->num_rows > 0) {
    $countData = $memberCountResult->fetch_assoc();
    $memberCount = $countData['count'];
}
$memberCountStmt->close();
$verifyJoin = $groupInfo['verify_join'];
$needVerify = true;
$canJoinDirectly = false;
$joinTypeDesc = '';
switch ($verifyJoin) {
    case 0:
        $joinTypeDesc = '该群聊禁止搜索';
        $needVerify = false;
        $canJoinDirectly = false;
        break;
    case 1:
        $joinTypeDesc = '该群聊禁止加入';
        $needVerify = false;
        $canJoinDirectly = false;
        break;
    case 2:
        $joinTypeDesc = '可直接加入';
        $needVerify = false;
        $canJoinDirectly = true;
        break;
    case 3:
        $joinTypeDesc = '需群主或管理员验证';
        $needVerify = true;
        $canJoinDirectly = false;
        break;
    case 4:
        $joinTypeDesc = '仅限邀请加入';
        $needVerify = false;
        $canJoinDirectly = false;
        break;
    default:
        $joinTypeDesc = '需验证';
        $needVerify = true;
        $canJoinDirectly = false;
}

sendResponse(true, '获取群聊信息成功', [
    'groupId' => $groupId,
    'groupName' => $groupInfo['group_name'],
    'groupAvatar' => $groupInfo['group_avatar'],
    'groupDesc' => $groupInfo['group_desc'] ?: '暂无群介绍',
    'ownerId' => $groupInfo['owner_id'],
    'ownerName' => $ownerName,
    'maxMember' => $groupInfo['max_member'],
    'memberCount' => $memberCount,
    'createTime' => $groupInfo['create_time'],
    'searnum' => $groupInfo['searnum'],
    'verifyJoin' => $verifyJoin,
    'joinTypeDesc' => $joinTypeDesc,
    'needVerify' => $needVerify,
    'canJoinDirectly' => $canJoinDirectly,
    'isMember' => $isMember,
    'hasPendingRequest' => $hasPendingRequest,
    'pendingRequestId' => $pendingRequestId
]);

$stmt->close();
$checkMemberStmt->close();
$conn->close();
