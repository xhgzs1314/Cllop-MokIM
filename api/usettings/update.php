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
    echo json_encode($response);
    exit;
}
$input = file_get_contents('php://input');
$data = json_decode($input, true);
if (!isset($data['require_verify']) || !isset($data['UserId'])) {
    sendResponse(false, '参数不完整');
}
$require_verify = (int)$data['require_verify']; 
$userId_enc = $data['UserId'];
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userId_enc);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$userId = $plaintext;
$conn->begin_transaction();
try {
    $checkSql = "SELECT id, setting_json FROM mok_user_setting WHERE user_id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param('s', $userId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    if ($result->num_rows === 0) {
        $defaultSettings = json_encode([
            'theme' => 'light',
            'fontSize' => 14,
            'language' => 'zh-CN',
            'notify_sound' => true,
            'sound_select' => 'default',
            'read_receipt' => true,
            'typing_status' => true,
            'add_verify' => 1, 
            'enter_send' => true,
            'show_timestamp' => true
        ]);
        $insertSql = "INSERT INTO mok_user_setting (user_id, setting_json, create_time, update_time) VALUES (?, ?, NOW(), NOW())";
        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->bind_param('ss', $userId, $defaultSettings);
        if (!$insertStmt->execute()) {
            throw new Exception('创建用户设置失败: ' . $insertStmt->error);
        }
        $settingId = $conn->insert_id;
        $settingJson = $defaultSettings;
        $insertStmt->close();
    } else {
        $row = $result->fetch_assoc();
        $settingJson = $row['setting_json'];
    }
    $checkStmt->close();
    $settings = [];
    if (!empty($settingJson)) {
        $settings = json_decode($settingJson, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $settings = [];
        }
    }
    $settings['add_verify'] = $require_verify;
    $newSettingJson = json_encode($settings, JSON_UNESCAPED_UNICODE);
    $updateSql = "UPDATE mok_user_setting SET setting_json = ?, update_time = NOW() WHERE user_id = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param('ss', $newSettingJson, $userId);
    if (!$updateStmt->execute()) {
        throw new Exception('更新用户设置失败: ' . $updateStmt->error);
    }
    $conn->commit();
    $updateStmt->close();
    sendResponse(true, '设置更新成功', [
        'require_verify' => $require_verify,
        'user_id' => $userId
    ]);
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("update.php error: " . $e->getMessage());
    sendResponse(false, '更新失败: ' . $e->getMessage());
}

$conn->close();
?>