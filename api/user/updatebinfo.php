<?php
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['code' => 405, 'message' => 'Method Not Allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$userIds = $input['user_id'] ?? '';

if (empty($userIds)) {
    echo json_encode(['code' => 401, 'message' => '用户未登录']);
    exit();
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userIds);
if (!$plaintext) {
    echo json_encode(['code' => 301, 'message' => '令牌验证失效']);
    exit;
}
if (!conbine_auth_towdouble($plaintext)) {
    echo json_encode(['code' => 302, 'message' => '令牌验证失败']);
    exit;
}
$userId = $plaintext;
function xss_clean($data) {
    if (is_null($data)) return null;
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}
$allowedFields = ['uname', 'username', 'sayed', 'bdmail', 'tximg'];
$updateFields = [];
$params = [];
$types = '';
foreach ($allowedFields as $field) {
    if (isset($input[$field]) && $input[$field] !== '') {
        $cleanValue = xss_clean($input[$field]);
        if ($field === 'tximg') {
            if (!filter_var($cleanValue, FILTER_VALIDATE_URL)) {
                echo json_encode(['code' => 400, 'message' => '头像链接格式不正确，请输入有效的URL']);
                exit();
            }
            if (mb_strlen($cleanValue) > 200) {
                echo json_encode(['code' => 400, 'message' => '头像链接不能超过200个字符']);
                exit();
            }
            $scheme = parse_url($cleanValue, PHP_URL_SCHEME);
            if (!in_array($scheme, ['http', 'https'])) {
                echo json_encode(['code' => 400, 'message' => '头像链接只支持http或https协议']);
                exit();
            }
        }
        
        $updateFields[] = "$field = ?";
        $params[] = $cleanValue;
        $types .= 's';
    }
}
if (empty($updateFields)) {
    echo json_encode(['code' => 400, 'message' => '没有需要更新的字段']);
    exit();
}
if (isset($input['bdmail']) && !empty($input['bdmail'])) {
    $cleanEmail = xss_clean($input['bdmail']);
    if (!filter_var($cleanEmail, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['code' => 400, 'message' => '邮箱格式不正确']);
        exit();
    }
}
if (isset($input['uname']) && !empty($input['uname'])) {
    $cleanUname = xss_clean($input['uname']);
    if (mb_strlen($cleanUname) > 30) {
        echo json_encode(['code' => 400, 'message' => '昵称不能超过30个字符']);
        exit();
    }
}
if (isset($input['sayed']) && !empty($input['sayed'])) {
    $cleanSayed = xss_clean($input['sayed']);
    if (mb_strlen($cleanSayed) > 50) {
        echo json_encode(['code' => 400, 'message' => '签名不能超过50个字符']);
        exit();
    }
}
if (isset($input['username']) && !empty($input['username'])) {
    $cleanUsername = xss_clean($input['username']);
    if (!preg_match('/^[\w\x{4e00}-\x{9fa5}]+$/u', $cleanUsername)) {
        echo json_encode(['code' => 400, 'message' => '用户名只能包含字母、数字、下划线或中文']);
        exit();
    }
    if (mb_strlen($cleanUsername) > 255) {
        echo json_encode(['code' => 400, 'message' => '用户名不能超过255个字符']);
        exit();
    }
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$sql = "UPDATE mok_user SET " . implode(', ', $updateFields) . " WHERE id = ?";
$params[] = $userId;
$types .= 's';

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    echo json_encode(['code' => 200, 'message' => '更新成功']);
} else {
    echo json_encode(['code' => 500, 'message' => '更新失败：' . $stmt->error]);
}

$stmt->close();
$conn->close();