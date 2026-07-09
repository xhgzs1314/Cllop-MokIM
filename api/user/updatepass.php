<?php
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['code' => 405, 'message' => 'Method Not Allowed']);
    exit();
}
$input = json_decode(file_get_contents('php://input'), true);
$userIds = $input['user_id'] ?? '';
$oldPassword = $input['old_password'] ?? '';
$newPassword = $input['new_password'] ?? '';
if (empty($userIds)) {
    echo json_encode(['code' => 401, 'message' => '用户未登录']);
    exit();
}

if (empty($oldPassword) || empty($newPassword)) {
    echo json_encode(['code' => 400, 'message' => '请完整填写密码信息']);
    exit();
}

if (strlen($newPassword) < 6) {
    echo json_encode(['code' => 400, 'message' => '新密码至少6位']);
    exit();
}
$newPassword_hashed = password_hash($newPassword, PASSWORD_DEFAULT);
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userIds);
if (!$plaintext) {
    echo json_encode(array('code' => 301, 'message' => '令牌验证失效'));
    exit;
}
if (!conbine_auth_towdouble($plaintext)) {
    echo json_encode(array('code' => 302, 'message' => '令牌验证失败'));
    exit;
}
$userId = $plaintext;
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$sql = "SELECT `password` FROM mok_user WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('s', $userId);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();
if (!$user) {
    echo json_encode(['code' => 404, 'message' => '用户不存在']);
    $conn->close();
    exit();
}
if (!password_verify($oldPassword, $user['password'])) {
    echo json_encode(['code' => 401, 'message' => '原密码错误']);
    $conn->close();
    exit();
}
$updateSql = "UPDATE mok_user SET `password` = ? WHERE id = ?";
$updateStmt = $conn->prepare($updateSql);
$updateStmt->bind_param('ss', $newPassword_hashed, $userId);
if ($updateStmt->execute()) {
    echo json_encode(['code' => 200, 'message' => '密码修改成功']);
} else {
    echo json_encode(['code' => 500, 'message' => '修改失败']);
}
$updateStmt->close();
$conn->close();
