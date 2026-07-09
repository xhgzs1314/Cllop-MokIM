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
if (!isset($data['dfid']) || !isset($data['UserId']) || !isset($data['moment_permission'])) {
    sendResponse(false, '参数不完整');
}
$friendId = $data['dfid'];          
$userIds = $data['UserId'];         
$permission = $data['moment_permission']; 
if (!in_array($permission, ['allow', 'deny'])) {
    sendResponse(false, '权限参数无效，请使用 allow 或 deny');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userIds);

if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}

if (!conbine_auth_towdouble($plaintext)) {
    sendResponse(false, '令牌验证失效');
}
$userId = $plaintext;
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$conn->begin_transaction();
try {
    $stmt = $conn->prepare("SELECT id, permission FROM mok_contact WHERE user_id = ? AND friend_id = ? AND add_status = 1");
    $stmt->bind_param("ss", $userId, $friendId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        throw new Exception("好友关系不存在或已删除");
    }
    $row = $result->fetch_assoc();
    $stmt->close();
    $currentPermission = $row['permission'];
    if ($currentPermission !== null && $currentPermission !== '') {
        $permData = json_decode($currentPermission, true);
        if (!is_array($permData)) {
            $permData = [];
        }
    } else {
        $permData = [];
    }
    $permData['view_moment'] = ($permission === 'allow');
    $permissionJson = json_encode($permData);
    $updateStmt = $conn->prepare("UPDATE mok_contact SET permission = ? WHERE user_id = ? AND friend_id = ?");
    $updateStmt->bind_param("sss", $permissionJson, $userId, $friendId);
    $updateStmt->execute();
    if ($updateStmt->affected_rows === -1) {
        throw new Exception("更新朋友圈权限失败");
    }
    $updateStmt->close();
    $conn->commit();
    sendResponse(true, $permission === 'allow' ? '已允许对方查看朋友圈' : '已拒绝对方查看朋友圈', [
        'friendId' => $friendId,
        'permission' => $permission,
        'view_moment' => $permData['view_moment']
    ]);
    
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, '操作失败: ' . $e->getMessage());
} finally {
    $conn->close();
}
?>