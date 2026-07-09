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
$coins = intval($data['coins'] ?? 0);
$gameId = $data['game_id'] ?? 'unknown';
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php';
try {
    $sql = "UPDATE mok_user SET spkcin = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $coins, $userId);
    $stmt->execute();
    $stmt->close();
    echo json_encode([
        'success' => true,
        'coins' => $coins,
        'message' => '同步成功'
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn) && $conn) $conn->close();
}