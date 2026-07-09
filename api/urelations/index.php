<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/api/quot.php';
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");
function response($code = 200, $msg = "success", $data = []) {
    $result = [
        "code" => $code,
        "msg"  => $msg,
        "data" => $data
    ];
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}
try {
    $userId = isset($_REQUEST['userId']) ? trim($_REQUEST['userId']) : '';
    if (!empty($userId) && !is_string($userId)) {
        response(400, "参数错误：userId必须为字符串");
    }
    requireApiAuth();
    require($_SERVER['DOCUMENT_ROOT'].'/cofd/common.php');
    $sql = "SELECT user_id, friend_id, add_status FROM mok_contact WHERE 1=1";
    if (!empty($userId)) {
        $sql .= " AND user_id = ?";
    }
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        response(500, "预处理语句失败：" . $conn->error);
    }
    if (!empty($userId)) {
        $stmt->bind_param("s", $userId); 
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $relations = [];
    while ($row = $result->fetch_assoc()) {
        $relations[] = $row;
    }
    $stmt->close();
    $conn->close();
    response(200, "查询成功", $relations);
} catch (Exception $e) {
    response(500, "接口调用失败：" . $e->getMessage());
}