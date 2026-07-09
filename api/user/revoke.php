<?php
require($_SERVER['DOCUMENT_ROOT'] . '/setting.php');
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'code' => 405,
        'message' => '请求方法不允许，请使用POST'
    ]);
    exit;
}
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'code' => 400,
        'message' => '无效的请求参数'
    ]);
    exit;
}
$userId = $input['user_id'] ?? '';
$confirmAction = $input['confirm_action'] ?? false;
$timestamp = $input['timestamp'] ?? 0;

if (empty($userId) || $confirmAction !== true) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'code' => 400,
        'message' => '参数不完整：请提供user_id并确认confirm_action'
    ]);
    exit;
}
$qx_max_tmp = true;
$q_suname = null;
$tcodelogins = $_COOKIE[generateAutoWebsiteIdentifier(true) . "_log"] ?? 'null';
if ($tcodelogins == 'null') {
    $qx_max_tmp = false;
} else {
    require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
    $decodeers = new TmdbaseauthdownyhoDecrypt(60000 * 60 * 2); 
    $decodeddata = $decodeers->writebacknewwords($tcodelogins);
    if (!$decodeddata) {
        $qx_max_tmp = false;
    }
    require_once($_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php');
    $decodeddata2 = encrypt($decodeddata, 'D', generateAutoWebsiteIdentifier(true));
    if (!$decodeddata2) {
        $qx_max_tmp = false;
    }
    $tarray = explode('<:>', $decodeddata2);
    if (!isset($tarray[0]) || !isset($tarray[1]) || empty($tarray[0]) || empty($tarray[1]) || !isset($tarray[2]) || empty($tarray[2])) {
        $qx_max_tmp = false;
    }
    $q_suname = trim($tarray[2]);
}
if (!$qx_max_tmp) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'code' => 401,
        'message' => '未登录或登录已过期，请重新登录'
    ]);
    exit;
}
if ($q_suname != $userId) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'code' => 403,
        'message' => '无权注销其他账号，只能注销当前登录的账号'
    ]);
    exit;
}

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$conn->begin_transaction();
try {
    $stmt = $conn->prepare("SELECT id FROM mok_user WHERE id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        throw new Exception('用户不存在');
    }
    $stmt->close();
    $stmt = $conn->prepare("DELETE FROM mok_contact WHERE user_id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare("DELETE FROM mok_contact WHERE friend_id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare("DELETE FROM mok_mail WHERE from_id = ? OR to_id = ?");
    $stmt->bind_param("ss", $userId, $userId);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare("SELECT id FROM mok_group_chat WHERE owner_id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $ownedGroups = [];
    while ($row = $result->fetch_assoc()) {
        $ownedGroups[] = $row['id'];
    }
    $stmt->close();
    foreach ($ownedGroups as $groupId) {
        $stmt = $conn->prepare("
            SELECT user_id FROM mok_group_member 
            WHERE group_id = ? AND user_id != ? AND status = 1 
            ORDER BY is_admin DESC, join_time ASC 
            LIMIT 1
        ");
        $stmt->bind_param("is", $groupId, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $newOwner = $result->fetch_assoc();
        $stmt->close();
        if ($newOwner) {
            $newOwnerId = $newOwner['user_id'];
            $stmt = $conn->prepare("UPDATE mok_group_chat SET owner_id = ? WHERE id = ?");
            $stmt->bind_param("si", $newOwnerId, $groupId);
            $stmt->execute();
            $stmt->close();
            $action = 'transfer_ownership';
            $remark = "原群主 {$userId} 注销账号，群主权限转让给 {$newOwnerId}";
            $stmt = $conn->prepare("
                INSERT INTO mok_group_log (group_id, user_id, action, action_time, remark) 
                VALUES (?, ?, ?, NOW(), ?)
            ");
            $stmt->bind_param("isss", $groupId, $newOwnerId, $action, $remark);
            $stmt->execute();
            $stmt->close();
        } else {
            $stmt = $conn->prepare("UPDATE mok_group_chat SET group_status = 0 WHERE id = ?");
            $stmt->bind_param("i", $groupId);
            $stmt->execute();
            $stmt->close();
            $action = 'dismiss_group';
            $remark = "群主 {$userId} 注销账号，群内无其他成员，群聊自动解散";
            $stmt = $conn->prepare("
                INSERT INTO mok_group_log (group_id, user_id, action, action_time, remark) 
                VALUES (?, ?, ?, NOW(), ?)
            ");
            $stmt->bind_param("isss", $groupId, $userId, $action, $remark);
            $stmt->execute();
            $stmt->close();
        }
    }
    $stmt = $conn->prepare("
        UPDATE mok_group_member SET status = 0, quit_time = NOW() 
        WHERE user_id = ? AND status = 1
    ");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare("
        UPDATE mok_group_announcement SET status = 0 
        WHERE creator_id = ?
    ");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare("DELETE FROM mok_application WHERE applicant_id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare("DELETE FROM mok_application WHERE target_id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $stmt->close();
    $stmt = $conn->prepare("DELETE FROM mok_user_setting WHERE user_id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $stmt->close();
    $anonymousName = '已注销_' . substr(md5($userId . time()), 0, 8);
    $stmt = $conn->prepare("
        UPDATE mok_user SET 
            username = NULL,
            password = NULL,
            tximg = NULL,
            uname = ?,
            sayed = '该用户已注销',
            bdmail = NULL,
            credit = 0,
            spkcin = 0,
            isban = 2
        WHERE id = ?
    ");
    $stmt->bind_param("ss", $anonymousName, $userId);
    $stmt->execute();
    $stmt->close();
    $conn->commit();
    $cookieName = generateAutoWebsiteIdentifier(true) . "_log";
    setcookie($cookieName, '', time() - 3600, '/');
    echo json_encode([
        'success' => true,
        'code' => 200,
        'message' => '账号已永久注销，所有相关数据已清除'
    ]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'code' => 500,
        'message' => '注销失败：' . $e->getMessage()
    ]);
}
$conn->close();
exit;
