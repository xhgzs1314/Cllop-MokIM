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

if (!isset($data['dfid'])) {
    sendResponse(false, '参数不完整');
}
$userIds = $data['dfid'];
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
$sql = "SELECT spkcin FROM mok_user WHERE id = ? AND isban = 0";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $userId);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    $stmt->close();
    sendResponse(false, '用户不存在或已被封禁');
}
$userData = $result->fetch_assoc();
$balance = intval($userData['spkcin']);
$stmt->close();
$hasLoan = mokim_hasOutstandingLoan($conn, $userId);
$conn->close();
sendResponse(true, '获取成功', [
    'balance' => $balance,
    'loan_active' => $hasLoan ? 1 : 0
]);