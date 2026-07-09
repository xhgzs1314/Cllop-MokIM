<?php
require $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable($_SERVER['DOCUMENT_ROOT'] . '/ws-server/');
$dotenv->load();
define('API_SECRET_KEY_mokim', $_ENV['API_SECRET_KEY'] ?? 'yhwo-rkmoks-run-folk');
define('API_LINKINGURL',$_ENV['PHP_API_BASE_LINK'].':'.$_ENV['HTTP_PORT']);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
function notifyWebSocketServer($userId, $friendId, $method)
{
    $wsServerUrl = API_LINKINGURL;
    $secretKey = API_SECRET_KEY_mokim;
    $data = [
        'type' => 'relation_updated',
        'userId' => $userId,
        'friendId' => $friendId,
        'method' => $method,
        'timestamp' => time()
    ];

    $ch = curl_init($wsServerUrl . '/api/notify-relation-update');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-API-Key: ' . $secretKey
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    //curl_close($ch);
    if ($httpCode !== 200) {
        error_log("通知WebSocket服务器失败: HTTP {$httpCode}, 响应: " . $response);
    }
}

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

if (!isset($data['dfid']) || !isset($data['UserId'])) {
    sendResponse(false, '参数不完整');
}

$conversationId = $data['dfid'];
$userIds = $data['UserId'];
$method = intval($data['method']);

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userIds);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
    exit;
}
if (!conbine_auth_towdouble($plaintext)) {
    sendResponse(false, '令牌验证失效');
}
$userId = $plaintext;
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$conn->begin_transaction();

try {
    $stmt = $conn->prepare("SELECT id FROM mok_contact WHERE user_id = ? AND friend_id = ? AND add_status = 1");
    $friendId = $conversationId;
    $stmt->bind_param("ss", $userId, $friendId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $updateStmt = $conn->prepare("UPDATE mok_contact SET add_status = ? WHERE user_id = ? AND friend_id = ?");
        $updateStmt->bind_param("iss", $method, $userId, $friendId);
        $updateStmt->execute();

        if ($updateStmt->affected_rows === -1) {
            throw new Exception("更新好友状态失败");
        }
        $updateStmt->close();
    }
    $stmt->close();
    $conn->commit();
    notifyWebSocketServer($userId, $friendId, $method);

    sendResponse(true, '状态成功', [
        'sss' => $method
    ]);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, '状态更改操作失败: ' . $e->getMessage());
} finally {
    $conn->close();
}
