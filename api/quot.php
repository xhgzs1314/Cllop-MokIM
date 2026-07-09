<?php
require $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable($_SERVER['DOCUMENT_ROOT'].'/ws-server/');
$dotenv->load();
define('API_SECRET_KEY_mokim', $_ENV['API_SECRET_KEY'] ?? 'yhwo-rkmoks-run-folk');
function validateApiKey() {
    $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
    return $apiKey == API_SECRET_KEY_mokim;
}
function requireApiAuth()
{
    if (!validateApiKey()) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode([
            'code' => 401,
            'msg' => '未知的API调用者',
            'data' => null
        ]);
        exit;
    }
}
function sendResponse($code = 200, $data = null, $msg = "成功")
{
    header("Content-Type: application/json; charset=utf-8");
    header("Cache-Control: no-cache, no-store, must-revalidate");
    header("Pragma: no-cache");
    header("Expires: 0");
    $response = [
        "code" => $code,
        "msg" => $msg,
        "data" => $data
    ];
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}
function handleException($e)
{
    error_log("接口异常: " . $e->getMessage());
    sendResponse(500, null, "服务器内部错误: " . $e->getMessage());
}
set_exception_handler("handleException");
