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
$gameId = $data['game_id'] ?? 'blackjack';
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php';
try {
    $checkSql = "SELECT spkcin FROM mok_user WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("s", $userId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    $currentData = $checkResult->fetch_assoc();
    $currentCoins = $currentData['spkcin'] ?? 0;
    $checkStmt->close();
    $diff = abs($coins - $currentCoins);
    if ($diff > 500) {
        error_log("[DICE] 异常G币差异 user:{$userId} current:{$currentCoins} client:{$coins} diff:{$diff}");
        echo json_encode([
            'success' => false,
            'message' => '数据异常，请刷新页面重试',
            'server_coins' => $currentCoins
        ]);
        exit;
    }
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
