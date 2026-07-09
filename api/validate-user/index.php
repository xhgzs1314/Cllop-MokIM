<?php
require_once $_SERVER['DOCUMENT_ROOT'].'/api/quot.php';
$userId = isset($_GET['userId']) ? trim($_GET['userId']) : '';
if (empty($userId)) {
    sendResponse(400, null, "用户ID不能为空");
}
requireApiAuth();
require($_SERVER['DOCUMENT_ROOT'].'/cofd/common.php');

try {
    $sql = "SELECT id FROM mok_user WHERE id = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("预处理语句创建失败：" . $conn->error);
    }
    $stmt->bind_param('s', $userId);
    $stmt->execute();
    $stmt->bind_result($userIdResult);
    $userExists = $stmt->fetch();
    if ($userExists) {
        sendResponse(200, true, "用户ID校验通过");
    } else {
        sendResponse(404, false, "用户ID不存在");
    }
    $stmt->close();
} catch (Exception $e) {
    handleException($e);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>