<?php
function getServerIp(): string
{
    $ipSources = [
        'HTTP_X_REAL_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_CLIENT_IP',
        'REMOTE_ADDR'
    ];

    foreach ($ipSources as $source) {
        if (isset($_SERVER[$source]) && filter_var($_SERVER[$source], FILTER_VALIDATE_IP)) {
            $ip = $_SERVER[$source];
            if (str_contains($ip, ',')) {
                $ip = trim(explode(',', $ip)[0]);
            }
            return $ip;
        }
    }
    $localIp = gethostbyname(gethostname());
    return filter_var($localIp, FILTER_VALIDATE_IP) ? $localIp : '';
}
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
$userIds = $data['UserId'];
$group_name = isset($data['group_name']) ? trim($data['group_name']) : null;
$group_desc = isset($data['group_desc']) ? trim($data['group_desc']) : null;
$need_verify = isset($data['need_verify']) ? (int)$data['need_verify'] : null;
$group_settings = isset($data['group_settings']) ? trim($data['group_settings']) : null;

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userIds);

if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
if (!conbine_auth_towdouble($plaintext)) {
    sendResponse(false, '令牌验证失效');
}
$userId = $plaintext;
$group_id = processGroupText($conversationId);
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$conn->begin_transaction();
try {
    $checkGroupSql = "SELECT id, group_name, group_desc, verify_join, usettings, owner_id, group_status 
                      FROM mok_group_chat 
                      WHERE id = ? AND group_status = 1";
    $stmt = $conn->prepare($checkGroupSql);
    $stmt->bind_param("i", $group_id);
    $stmt->execute();
    $groupResult = $stmt->get_result();
    if ($groupResult->num_rows === 0) {
        throw new Exception('群聊不存在或已被解散');
    }
    $group = $groupResult->fetch_assoc();
    $checkMemberSql = "SELECT id, is_admin, status 
                       FROM mok_group_member 
                       WHERE group_id = ? AND user_id = ? AND status = 1";
    $stmt = $conn->prepare($checkMemberSql);
    $stmt->bind_param("is", $group_id, $userId);
    $stmt->execute();
    $memberResult = $stmt->get_result();
    if ($memberResult->num_rows === 0) {
        throw new Exception('您不是该群聊的成员');
    }
    $member = $memberResult->fetch_assoc();
    $isOwner = ($group['owner_id'] === $userId);
    $isAdmin = ($member['is_admin'] == 1);
    if (!$isOwner && !$isAdmin) {
        throw new Exception('只有群主或管理员才能修改群信息');
    }
    $updateFields = [];
    $params = [];
    $types = "";
    if ($group_name !== null) {
        $nameLength = mb_strlen($group_name, 'UTF-8');
        if ($nameLength < 1 || $nameLength > 20) {
            throw new Exception('群名称长度必须在1-20个字符之间');
        }
        $updateFields[] = "group_name = ?";
        $params[] = $group_name;
        $types .= "s";
    }
    if ($group_desc !== null) {
        $descLength = mb_strlen($group_desc, 'UTF-8');
        if ($descLength > 80) {
            throw new Exception('群介绍不能超过80个字符');
        }
        $updateFields[] = "group_desc = ?";
        $params[] = $group_desc;
        $types .= "s";
    }
    if ($need_verify !== null) {
        if ($need_verify < 0 || $need_verify > 4) {
            throw new Exception('加入方式参数无效');
        }
        $updateFields[] = "verify_join = ?";
        $params[] = $need_verify;
        $types .= "i";
    }
    if ($group_settings !== null) {
        if (strlen($group_settings) > 65535) {
            throw new Exception('群配置信息过长');
        }
        $updateFields[] = "usettings = ?";
        $params[] = $group_settings;
        $types .= "s";
    }
    if (empty($updateFields)) {
        throw new Exception('没有需要更新的信息');
    }
    $updateFields[] = "modify_time = NOW()";
    $sql = "UPDATE mok_group_chat SET " . implode(", ", $updateFields) . " WHERE id = ?";
    $params[] = $group_id;
    $types .= "i";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    if (!$stmt->execute()) {
        throw new Exception('更新群信息失败：' . $stmt->error);
    }
    $affectedRows = $stmt->affected_rows;
    $commander_ip = getServerIp();
    $logSql = "INSERT INTO mok_group_log (group_id, user_id, `action`, action_time, old_data, new_data,ip_address) 
               VALUES (?, ?, 'update_info', NOW(), ?, ?,?)";
    $oldData = json_encode([
        'group_name' => $group['group_name'],
        'group_desc' => $group['group_desc'],
        'verify_join' => $group['verify_join'],
        'usettings' => $group['usettings']
    ]);
    $newData = json_encode([
        'group_name' => $group_name ?? $group['group_name'],
        'group_desc' => $group_desc ?? $group['group_desc'],
        'verify_join' => $need_verify ?? $group['verify_join'],
        'usettings' => $group_settings ?? $group['usettings']
    ]);
    $logStmt = $conn->prepare($logSql);
    $logStmt->bind_param("issss", $group_id, $userId, $oldData, $newData, $commander_ip);
    $logStmt->execute();
    $conn->commit();
    $responseData = [
        'group_id' => $group_id,
        'updated_fields' => $updateFields
    ];
    sendResponse(true, '群信息更新成功', $responseData);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, $e->getMessage());
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($logStmt)) {
        $logStmt->close();
    }
    $conn->close();
}
