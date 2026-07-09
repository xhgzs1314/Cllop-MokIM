<?php
function processGroupText($text)
{
    $prefix = 'group_';
    if (strpos($text, $prefix) === 0) {
        $text = substr($text, strlen($prefix));
    }
    return (int)$text;
}

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
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['dfid']) || !isset($data['UserId'])) {
    sendResponse(false, '参数不完整');
}

$conversationId = $data['dfid'];
$userId = $data['UserId'];
$page_size = isset($data['page_size']) ? (int)$data['page_size'] : 5;
$page = isset($data['page']) ? (int)$data['page'] : 1;
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($conversationId);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$groupId = processGroupText($plaintext);
$checkMemberSql = "SELECT id FROM mok_group_member 
                   WHERE group_id = ? AND user_id = ? AND `status` = 1";
$checkStmt = $conn->prepare($checkMemberSql);
$checkStmt->bind_param("is", $groupId, $userId);
$checkStmt->execute();
$memberResult = $checkStmt->get_result();
if ($memberResult->num_rows === 0) {
    $checkStmt->close();
    sendResponse(false, '您不是该群成员，无法查看公告');
}
$checkStmt->close();
$offset = ($page - 1) * $page_size;
$sql = "SELECT id, group_id, title, content, creator_id, is_top, status, 
               publish_time, update_time, expire_time
        FROM mok_group_announcement 
        WHERE group_id = ? AND status = 1 
        AND (expire_time IS NULL OR expire_time > NOW())
        ORDER BY is_top DESC, publish_time DESC
        LIMIT ? OFFSET ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("iii", $groupId, $page_size, $offset);
$stmt->execute();
$result = $stmt->get_result();
$announcements = [];
while ($row = $result->fetch_assoc()) {
    $creatorSql = "SELECT uname, tximg FROM mok_user WHERE id = ?";
    $creatorStmt = $conn->prepare($creatorSql);
    $creatorStmt->bind_param("s", $row['creator_id']);
    $creatorStmt->execute();
    $creatorResult = $creatorStmt->get_result();
    $creatorInfo = $creatorResult->fetch_assoc();
    $creatorStmt->close();
    $plainContent = strip_tags($row['content']);
    $summary = mb_strlen($plainContent) > 80 ? mb_substr($plainContent, 0, 80) . '...' : $plainContent;
    $announcements[] = [
        'id' => (int)$row['id'],
        'group_id' => (int)$row['group_id'],
        'title' => $row['title'],
        'summary' => $summary,
        'creator_id' => $row['creator_id'],
        'creator_name' => $creatorInfo['uname'] ?? '系统用户',
        'creator_avatar' => $creatorInfo['tximg'] ?? '',
        'is_top' => (int)$row['is_top'],
        'publish_time' => $row['publish_time'],
        'update_time' => $row['update_time'],
        'expire_time' => $row['expire_time']
    ];
}
$stmt->close();
$countSql = "SELECT COUNT(*) as total FROM mok_group_announcement 
             WHERE group_id = ? AND `status` = 1 
             AND (expire_time IS NULL OR expire_time > NOW())";
$countStmt = $conn->prepare($countSql);
$countStmt->bind_param("i", $groupId);
$countStmt->execute();
$countResult = $countStmt->get_result();
$total = $countResult->fetch_assoc()['total'];
$countStmt->close();
sendResponse(true, '获取公告列表成功', [
    'list' => $announcements,
    'total' => (int)$total,
    'page' => $page,
    'page_size' => $page_size,
    'total_pages' => ceil($total / $page_size)
]);
