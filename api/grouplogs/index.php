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
    echo json_encode($response);
    exit;
}
$input = file_get_contents('php://input');
$data = json_decode($input, true);
if (!isset($data['dfid']) || !isset($data['UserId'])) {
    sendResponse(false, '参数不完整');
}
$conversationId = $data['dfid'];
$userId = $data['UserId'];
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($conversationId);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$groupId = processGroupText($plaintext);
$page = isset($data['page']) ? max(1, intval($data['page'])) : 1;
$pageSize = isset($data['page_size']) ? min(50, max(1, intval($data['page_size']))) : 15;
$actionFilter = isset($data['action']) ? trim($data['action']) : '';
$offset = ($page - 1) * $pageSize;
try {
    $checkGroupSql = "SELECT id, group_name, owner_id, group_status FROM mok_group_chat WHERE id = ?";
    $stmt = $conn->prepare($checkGroupSql);
    $stmt->bind_param("i", $groupId);
    $stmt->execute();
    $groupResult = $stmt->get_result();
    if ($groupResult->num_rows === 0) {
        sendResponse(false, '群聊不存在或已被解散');
    }
    $groupInfo = $groupResult->fetch_assoc();
    if ($groupInfo['group_status'] == 0) {
        sendResponse(false, '群聊已被解散');
    }
    if ($groupInfo['group_status'] == 2) {
        sendResponse(false, '群聊已被封禁');
    }
    $checkMemberSql = "SELECT id, user_id, is_admin, `status` FROM mok_group_member 
                       WHERE group_id = ? AND user_id = ? AND status = 1";
    $stmt = $conn->prepare($checkMemberSql);
    $stmt->bind_param("is", $groupId, $userId);
    $stmt->execute();
    $memberResult = $stmt->get_result();
    if ($memberResult->num_rows === 0) {
        sendResponse(false, '您不是该群聊的成员，无法查看操作日志');
    }
    $memberInfo = $memberResult->fetch_assoc();
    $isAdmin = ($memberInfo['is_admin'] == 1);
    $isOwner = ($groupInfo['owner_id'] == $userId);
    $whereConditions = ["group_id = ?"];
    $params = [$groupId];
    $types = "i";
    if (!empty($actionFilter)) {
        $whereConditions[] = "action = ?";
        $params[] = $actionFilter;
        $types .= "s";
    }
    $whereClause = implode(" AND ", $whereConditions);
    $countSql = "SELECT COUNT(*) as total FROM mok_group_log WHERE {$whereClause}";
    $stmt = $conn->prepare($countSql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $countResult = $stmt->get_result();
    $total = $countResult->fetch_assoc()['total'];
    $logSql = "SELECT id, group_id, user_id, action, action_time, old_data, new_data, 
                      ip_address, user_agent, remark 
               FROM mok_group_log 
               WHERE {$whereClause} 
               ORDER BY action_time DESC 
               LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($logSql);
    $params[] = $pageSize;
    $params[] = $offset;
    $types .= "ii";
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $logResult = $stmt->get_result();
    $logs = [];
    while ($row = $logResult->fetch_assoc()) {
        $operatorName = getUserNickname($conn, $row['user_id']);
        $processedRow = [
            'id' => $row['id'],
            'group_id' => $row['group_id'],
            'user_id' => $row['user_id'],
            'operator_name' => $operatorName,
            'action' => $row['action'],
            'action_time' => $row['action_time'],
            'remark' => $row['remark']
        ];
        if ($row['old_data']) {
            $processedRow['old_data'] = json_decode($row['old_data'], true) ?: [];
        } else {
            $processedRow['old_data'] = null;
        }
        
        if ($row['new_data']) {
            $processedRow['new_data'] = json_decode($row['new_data'], true) ?: [];
        } else {
            $processedRow['new_data'] = null;
        }
        if ($isOwner) {
            $processedRow['ip_address'] = $row['ip_address'];
            $processedRow['user_agent'] = $row['user_agent'];
        } elseif ($isAdmin) {
            $processedRow['ip_address'] = $row['ip_address'] ? maskIpAddress($row['ip_address']) : null;
            $processedRow['user_agent'] = null; 
        } else {
            $processedRow['ip_address'] = null;
            $processedRow['user_agent'] = null;
            $processedRow = filterSensitiveDataForMember($processedRow, $row);
        }
        
        $logs[] = $processedRow;
    }
    $conn->commit();
    sendResponse(true, '获取成功', [
        'list' => $logs,
        'total' => $total,
        'page' => $page,
        'page_size' => $pageSize,
        'total_pages' => ceil($total / $pageSize),
        'permissions' => [
            'is_owner' => $isOwner,
            'is_admin' => $isAdmin,
            'can_view_ip' => $isOwner,
            'can_view_details' => ($isOwner || $isAdmin)
        ]
    ]);
    
} catch (Exception $e) {
    $conn->rollback();
    error_log("获取群聊日志失败: " . $e->getMessage());
    sendResponse(false, '获取日志失败，请稍后重试');
}
function getUserNickname($conn, $userId)
{
    $sql = "SELECT uname FROM mok_user WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        return $row['uname'] ?: $userId;
    }
    return $userId;
}
function maskIpAddress($ip)
{
    if (empty($ip)) return null;
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $parts = explode('.', $ip);
        if (count($parts) >= 2) {
            return $parts[0] . '.' . $parts[1] . '.***.***';
        }
        return $ip;
    }
    
    
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
        $parts = explode(':', $ip);
        if (count($parts) >= 2) {
            return $parts[0] . ':' . $parts[1] . ':****:****:****:****:****:****';
        }
        return $ip;
    }
    
    return '***.***.***.***';
}
function filterSensitiveDataForMember($processedRow, $originalRow)
{
    $sensitiveActions = ['add_admin', 'remove_admin', 'kick_member', 'ban_member', 'unban_member'];
    if (in_array($originalRow['action'], $sensitiveActions)) {
        if (isset($processedRow['new_data']) && is_array($processedRow['new_data'])) {
            foreach ($processedRow['new_data'] as $key => $value) {
                if (strpos($key, 'user') !== false || strpos($key, 'member') !== false) {
                    $processedRow['new_data'][$key] = '***';
                }
            }
        }
        
        if (isset($processedRow['old_data']) && is_array($processedRow['old_data'])) {
            foreach ($processedRow['old_data'] as $key => $value) {
                if (strpos($key, 'user') !== false || strpos($key, 'member') !== false) {
                    $processedRow['old_data'][$key] = '***';
                }
            }
        }
    }
    
    return $processedRow;
}