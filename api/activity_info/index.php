<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php';
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';
$authdata = $data['UserId'] ?? '';
if (empty($action) || empty($authdata)) {
    echo json_encode(['success' => false, 'message' => '数据异常']);
    exit;
}
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($authdata);
if (!$plaintext) {
    echo json_encode(['success' => false, 'message' => '身份验证异常']);
    exit;
}
if (!conbine_auth_towdouble($plaintext)) {
    echo json_encode(['success' => false, 'message' => '身份验证异常']);
    exit;
}
$userId = $plaintext;
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php';
if ($action !== 'get_info') {
    echo json_encode(['success' => false, 'message' => '无效操作']);
    exit;
}
try {
    $sql = "SELECT spkcin FROM mok_user WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $userData = $result->fetch_assoc();
    $gcoins = $userData['spkcin'] ?? 0;
    $stmt->close();
    $today = date('Y-m-d');
    $todaySql = "SELECT last_reward FROM mok_checkin WHERE user_id = ? AND last_checkin_date = ?";
    $stmt2 = $conn->prepare($todaySql);
    $stmt2->bind_param("ss", $userId, $today);
    $stmt2->execute();
    $todayResult = $stmt2->get_result();
    $todayData = $todayResult->fetch_assoc();
    $todayEarn = $todayData['last_reward'] ?? 0;
    $stmt2->close();
    echo json_encode([
        'success' => true,
        'gcoins' => (int)$gcoins,
        'today_earn' => (int)$todayEarn,
        'level' => floor($gcoins / 200)
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn) && $conn) $conn->close();
}