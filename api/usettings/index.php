<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/api/quot.php';
header('Content-Type: application/json; charset=utf-8');
$response = [
    'code' => 200,
    'msg' => 'success',
    'data' => null
];

try {
    $userId = isset($_GET['userId']) ?? '';
    if (empty($userId)) {
        throw new Exception('用户ID不合法', 400);
    }
    requireApiAuth();
    require($_SERVER['DOCUMENT_ROOT'].'/cofd/common.php');
    $sql = "SELECT setting_json, create_time, update_time 
            FROM mok_user_setting 
            WHERE user_id = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('SQL预编译失败: ' . $conn->error, 500);
    }
    $stmt->bind_param('s', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $settingData = $result->fetch_assoc();
    if ($settingData) {
        $settingData['setting_json'] = json_decode($settingData['setting_json'], true);
        $response['data'] = $settingData;
    } else {
        $response['data'] = [
            'setting_json' => [],
            'create_time' => '',
            'update_time' => ''
        ];
        $response['msg'] = '用户暂无个性化配置，返回默认值';
    }
    $stmt->close();
    $conn->close();
} catch (Exception $e) {
    $response['code'] = $e->getCode() ?: 500;
    $response['msg'] = $e->getMessage();
    $response['data'] = null;
}
echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>