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

if (!isset($data['group_name']) || !isset($data['UserId'])) {
    sendResponse(false, '参数不完整');
}

$userId_e = $data['UserId'];
$group_name = trim($data['group_name'] ?? '');
$group_desc = trim($data['group_desc'] ?? '');
if (empty($group_name)) {
    sendResponse(false, '群聊名称不能为空');
}
if (mb_strlen($group_name) > 30) {
    sendResponse(false, '群聊名称不能超过30个字符');
}
if (mb_strlen($group_desc) > 100) {
    sendResponse(false, '群聊描述不能超过100个字符');
}

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userId_e);

if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
if (!conbine_auth_towdouble($plaintext)) {
    sendResponse(false, '令牌验证失效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$userId = $plaintext;
$checkUserSql = "SELECT id, uname FROM mok_user WHERE id = ? AND isban != 1";
$checkStmt = $conn->prepare($checkUserSql);
$checkStmt->bind_param("s", $userId);
$checkStmt->execute();
$userResult = $checkStmt->get_result();
if ($userResult->num_rows === 0) {
    $checkStmt->close();
    sendResponse(false, '用户不存在或已被封禁');
}
$userInfo = $userResult->fetch_assoc();
$checkStmt->close();
function generateGroupSearnum($conn)
{
    $searnum = rand(10000000, 99999999);
    $checkSql = "SELECT id FROM mok_group_chat WHERE searnum = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $searnum);
    $checkStmt->execute();
    $checkStmt->store_result();
    if ($checkStmt->num_rows > 0) {
        $checkStmt->close();
        return generateGroupSearnum($conn);
    }
    $checkStmt->close();
    return $searnum;
}

$conn->begin_transaction();

try {
    $searnum = generateGroupSearnum($conn);
    $createTime = date('Y-m-d H:i:s');
    $modifyTime = $createTime;
    $insertGroupSql = "INSERT INTO mok_group_chat 
    (group_name, group_desc, owner_id, group_status, max_member, create_time, modify_time, verify_join, searnum) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $insertStmt = $conn->prepare($insertGroupSql);
    $group_status = 1;
    $max_member = 200;
    $verify_join = 3;
    $insertStmt->bind_param(
        "sssiisssi",
        $group_name,
        $group_desc,
        $userId,
        $group_status,
        $max_member,
        $createTime,
        $modifyTime,
        $verify_join,
        $searnum
    );
    if (!$insertStmt->execute()) {
        throw new Exception('创建群聊失败：' . $insertStmt->error);
    }
    $groupId = $conn->insert_id;
    $insertStmt->close();
    $joinTime = $createTime;
    $insertMemberSql = "INSERT INTO mok_group_member 
        (group_id, user_id, is_admin, join_time, join_type, `status`, isPinned,last_active_time) 
        VALUES (?, ?, ?, ?, ?, ?, ?,?)";
    $pin = 0;
    $memberStmt = $conn->prepare($insertMemberSql);
    $memberStmt->bind_param("isisiiis", $groupId, $userId, $group_status, $joinTime, $group_status, $group_status, $pin, $joinTime);

    if (!$memberStmt->execute()) {
        throw new Exception('添加群成员失败：' . $memberStmt->error);
    }
    $memberStmt->close();
    $conn->commit();
    $groupData = [
        'group_id' => $groupId,
        'group_name' => $group_name,
        'group_desc' => $group_desc,
        'searnum' => $searnum,
        'owner_id' => $userId,
        'owner_name' => $userInfo['uname'],
        'create_time' => $createTime,
        'is_owner' => true,
        'is_admin' => true,
        'memberCount' => 1
    ];
    sendResponse(true, '群聊创建成功', $groupData);
} catch (Exception $e) {
    $conn->rollback();
    error_log('创建群聊错误：' . $e->getMessage());
    sendResponse(false, $e->getMessage());
}
