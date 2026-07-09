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
    echo json_encode(array('code' => 301, 'message' => '令牌验证失效'));
    exit;
}
if (!conbine_auth_towdouble($plaintext)) {
    echo json_encode(array('code' => 302, 'message' => '令牌验证失败'));
    exit;
}
$userId = $plaintext;
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$sql = "SELECT 
            id, username, uname, sayed, bdmail, 
            credit, spkcin, regtime, qddate, tximg, isban 
        FROM mok_user WHERE id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param('s', $userId);
$stmt->execute();
$result = $stmt->get_result();
if ($row = $result->fetch_assoc()) {
    echo json_encode([
        'code' => 200,
        'data' => [
            'id' => $row['id'],
            'username' => $row['username'],
            'uname' => $row['uname'] ?? '',
            'sayed' => $row['sayed'] ?? '',
            'bdmail' => $row['bdmail'] ?? '',
            'credit' => (int)$row['credit'],
            'spkcin' => (int)$row['spkcin'],
            'regtime' => $row['regtime'],
            'qddate' => $row['qddate'],
            'tximg' => $row['tximg'] ?? '',
            'isban' => (int)($row['isban'] ?? 0)
        ]
    ]);
} else {
    echo json_encode(['code' => 404, 'message' => '用户不存在']);
}

$stmt->close();
$conn->close();
