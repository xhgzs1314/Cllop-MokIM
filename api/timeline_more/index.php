<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
function jsonError($message, $code = 400)
{
    http_response_code($code);
    echo json_encode([
        'code' => $code,
        'message' => $message,
        'events' => []
    ]);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('请求方法错误，请使用POST', 405);
}
$action = isset($_POST['action']) ? trim($_POST['action']) : '';
$userId = isset($_POST['user_id']) ? trim($_POST['user_id']) : '';
$targetId = isset($_POST['target_id']) ? trim($_POST['target_id']) : '';
$offset = isset($_POST['offset']) ? intval($_POST['offset']) : 0;
$csrfToken = isset($_POST['csrf_token']) ? trim($_POST['csrf_token']) : '';
if ($action !== 'get_timeline') {
    jsonError('无效的操作类型', 400);
}

if (empty($userId) || empty($targetId)) {
    jsonError('用户ID不能为空', 400);
}

if ($offset < 0) {
    jsonError('偏移量无效', 400);
}
$docRoot = isset($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] : '';
if (empty($docRoot)) {
    jsonError('服务器配置错误', 500);
}
require_once($docRoot . '/cofd/functions.php');
require_once($docRoot . '/cofd/common.php');
if (!isset($conn) || !$conn instanceof mysqli) {
    jsonError('数据库连接异常', 500);
}
session_start();
if (empty($csrfToken) || $csrfToken !== $_SESSION['csrf_token']) {
    jsonError('CSRF 验证失败', 403);
}
$tcodelogins = $_COOKIE[generateAutoWebsiteIdentifier(true) . "_log"] ?? 'null';
if ($tcodelogins === 'null') {
    jsonError('未登录或会话已过期', 401);
}

require_once($docRoot . '/cofd/tauth.php');
$decodeers = new TmdbaseauthdownyhoDecrypt(60000 * 60 * 2);
$decodeddata = $decodeers->writebacknewwords($tcodelogins);

if (!$decodeddata) {
    jsonError('身份验证失败', 401);
}

$decodeddata2 = encrypt($decodeddata, 'D', generateAutoWebsiteIdentifier(true));
if (!$decodeddata2) {
    jsonError('身份验证失败', 401);
}

$tarray = explode('<:>', $decodeddata2);
if (!isset($tarray[0]) || !isset($tarray[1]) || empty($tarray[0]) || empty($tarray[1]) || !isset($tarray[2]) || empty($tarray[2])) {
    jsonError('身份验证失败', 401);
}

$loginUser = trim($tarray[2]);
if ($loginUser !== $userId) {
    jsonError('权限不足', 403);
}
$conn->set_charset("utf8mb4");
$limit = 10;
try {
    $sql = "SELECT id, user_id, target_id, title, `description`, event_date, icon, create_time 
            FROM mok_smallworld_timeline 
            WHERE (user_id = ? AND target_id = ?) OR (user_id = ? AND target_id = ?)
            ORDER BY event_date DESC, create_time DESC 
            LIMIT ? OFFSET ?";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception('预处理失败: ' . $conn->error);
    }
    $stmt->bind_param("ssssii", $userId, $targetId, $targetId, $userId, $limit, $offset);
    if (!$stmt->execute()) {
        throw new Exception('查询执行失败: ' . $stmt->error);
    }
    $result = $stmt->get_result();
    $events = [];
    while ($row = $result->fetch_assoc()) {
        $events[] = [
            'id' => intval($row['id']),
            'user_id' => $row['user_id'],
            'target_id' => $row['target_id'],
            'title' => $row['title'],
            'description' => $row['description'],
            'event_date' => date('Y.m.d', strtotime($row['event_date'])),
            'icon' => !empty($row['icon']) ? $row['icon'] : 'fa-star',
            'create_time' => $row['create_time']
        ];
    }
    if ($stmt !== null) {
        $stmt->close();
        $stmt = null; 
    }
    echo json_encode([
        'code' => 200,
        'message' => 'success',
        'events' => $events,
        'offset' => $offset,
        'has_more' => count($events) === $limit
    ]);
} catch (Exception $e) {
    error_log('时间线加载更多错误: ' . $e->getMessage());
    jsonError('服务器内部错误: ' . $e->getMessage(), 500);
} finally {
    if ($stmt !== null) {
        $stmt->close();
    }
}
