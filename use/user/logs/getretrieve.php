<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/SecuritySigner.php';
$signer = SecuritySigner::instance_run();
$verification = $signer->verifyRequest(null, true);
if (!$verification['valid']) {
    http_response_code(403);
    echo json_encode(array('status' => 403, 'message' => '签名验证失败: ' . $verification['error']));
    exit;
}
$input = [];
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') !== false) {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
} else {
    $input = $_POST;
}
$password = $input['password'] ?? '';
$authdata = $input['authdata'] ?? '';
$email = $input['email'] ?? '';
if (empty($authdata) || empty($password) || empty($email)) {
    echo json_encode(array('status' => 300, 'message' => '无效的数据'));
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(array('status' => 305, 'message' => '邮箱格式无效'));
    exit;
}
require_once($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($authdata);
if (!$plaintext) {
    echo json_encode(array('status' => 301, 'message' => '令牌验证失效'));
    exit;
}
$username = $plaintext;
require_once($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$checkStmt = $conn->prepare("SELECT id, `password` FROM mok_user WHERE username = ?");
$checkStmt->bind_param("s", $username);
$checkStmt->execute();
$result = $checkStmt->get_result();
$user = $result->fetch_assoc();
$checkStmt->close();
if (!$user) {
    echo json_encode(array('status' => 303, 'message' => '用户名不存在或密码错误'));
    exit;
}

if (!password_verify($password, $user['password'])) {
    echo json_encode(array('status' => 303, 'message' => '用户名不存在或密码错误'));
    exit;
}
$userId = $user['id'];
require_once($_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php');
$userpasscombine = $username . '<:>' . $password . '<:>' . $userId . '<:>' . $email;
$usercode = encrypt($userpasscombine, 'E', generateAutoWebsiteIdentifier(true));
$retrievetime = date('Y-m-d H:i:s');
$tips = '身份验证码已重新生成，请妥善保管';
echo json_encode(array(
    'status' => 200,
    'message' => '身份验证码找回成功',
    'data' => [
        'usercode' => $usercode,
        'username' => $username,
        'retrievetime' => $retrievetime,
        'tips' => $tips
    ]
));
$conn->close();
