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
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['UserId'])) {
    sendResponse(false, '参数不完整');
}

$userId_enc = $data['UserId'];
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userId_enc);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$userid = $plaintext;
try {
    $friendRequests = [];
    $friendSql = "SELECT 
                    a.id,
                    a.applicant_id,
                    a.reason,
                    a.apply_time,
                    a.expire_time,
                    u.uname AS applicant_name,
                    u.sayed AS applicant_sayed,
                    u.credit AS applicant_credit
                FROM mok_application a
                LEFT JOIN mok_user u ON a.applicant_id = u.id
                WHERE a.target_id = ? 
                    AND a.app_type = 1
                    AND a.status = 1
                    AND (a.expire_time IS NULL OR a.expire_time > NOW())
                ORDER BY a.apply_time DESC";
    
    $stmt = $conn->prepare($friendSql);
    $stmt->bind_param('s', $userid);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $friendRequests[] = [
            'id' => (int)$row['id'],
            'applicant_id' => $row['applicant_id'],
            'applicant_name' => $row['applicant_name'] ?? $row['applicant_id'],
            'applicant_sayed' => $row['applicant_sayed'] ?? '',
            'applicant_credit' => (int)($row['applicant_credit'] ?? 0),
            'reason' => $row['reason'] ?? '',
            'apply_time' => $row['apply_time']
        ];
    }
    $stmt->close();
    $groupRequests = [];
    $groupSql = "SELECT 
                    a.id,
                    a.applicant_id,
                    a.target_id,
                    a.reason,
                    a.apply_time,
                    a.expire_time,
                    u.uname AS applicant_name,
                    g.group_name,
                    g.group_desc,
                    g.searnum
                FROM mok_application a
                LEFT JOIN mok_user u ON a.applicant_id = u.id
                INNER JOIN mok_group_chat g ON a.target_id = g.id
                WHERE a.target_id IN (
                    SELECT group_id FROM mok_group_member 
                    WHERE user_id = ? AND status = 1 AND (is_admin = 1 OR user_id = ?)
                )
                    AND a.app_type = 2
                    AND a.status = 1
                    AND (a.expire_time IS NULL OR a.expire_time > NOW())
                ORDER BY a.apply_time DESC";
    
    $stmt = $conn->prepare($groupSql);
    $stmt->bind_param('ss', $userid, $userid);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $groupRequests[] = [
            'id' => (int)$row['id'],
            'applicant_id' => $row['applicant_id'],
            'applicant_name' => $row['applicant_name'] ?? $row['applicant_id'],
            'target_id' => $row['target_id'],
            'group_name' => $row['group_name'] ?? '群聊',
            'group_desc' => $row['group_desc'] ?? '',
            'searnum' => $row['searnum'] ?? '',
            'reason' => $row['reason'] ?? '',
            'apply_time' => $row['apply_time']
        ];
    }
    $stmt->close();
    
    sendResponse(true, '获取成功', [
        'friend_requests' => $friendRequests,
        'group_requests' => $groupRequests
    ]);
    
} catch (Exception $e) {
    error_log("获取申请列表失败: " . $e->getMessage());
    sendResponse(false, '系统错误，请稍后重试');
}