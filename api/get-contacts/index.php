<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/api/quot.php';
$userId = isset($_GET['userId']) ? trim($_GET['userId']) : '';
if (empty($userId)) {
    sendResponse(400, null, "用户ID不能为空");
}

requireApiAuth();
function extract_numbers($str)
{
    return (int)preg_replace('/[^0-9]/', '', (string)$str);
}
function hash_session_id($friendid, $userId)
{
    $friend_num = extract_numbers($friendid);
    $user_num = extract_numbers($userId);
    return md5($friend_num + $user_num);
}

require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');

try {
    $sql = "SELECT 
                c.id AS contact_id,
                c.user_id,
                c.friend_id,
                c.friend_alias,
                c.add_status,
                c.add_time,
                c.friend_group,
                c.ispin,
                u.isban,
                COALESCE(u.uname, '未知用户') AS uname,
                COALESCE(u.tximg, '/static/default-avatar.png') AS tximg,
                COALESCE(u.sayed, '暂无个性签名') AS sayed,
                i.value AS intimacy_value,
                i.alias AS intimacy_alias
            FROM mok_contact c FORCE INDEX (idx_user_status)
            LEFT JOIN mok_user u ON c.friend_id = u.id
            LEFT JOIN mok_intimacy i ON c.user_id = i.user_id AND c.friend_id = i.target_id
            WHERE c.user_id = ? AND c.add_status = 1
            ORDER BY c.ispin DESC, c.add_time DESC";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("预处理语句失败: " . $conn->error);
    }

    $stmt->bind_param('s', $userId);
    $stmt->execute();
    $resultSet = $stmt->get_result();
    $result = [];
    $needInsert = [];
    
    while ($contact = $resultSet->fetch_assoc()) {
        if ($contact['intimacy_value'] === null) {
            $needInsert[] = [
                'user_id' => $contact['user_id'],
                'target_id' => $contact['friend_id']
            ];
            $intimacyValue = 0;
            $intimacyAlias = null;
        } else {
            $intimacyValue = (int)$contact['intimacy_value'];
            $intimacyAlias = $contact['intimacy_alias'];
        }
        
        $friendAlias = !empty($contact['friend_alias']) ? $contact['friend_alias'] : $contact['uname'];
        $friendGroup = !empty($contact['friend_group']) ? $contact['friend_group'] : "默认分类";
        $result[] = [
            "id" => (int)$contact['contact_id'],
            "userId" => $contact['user_id'],
            "friendId" => $contact['friend_id'],
            "friendAlias" => $friendAlias,
            "friend_group" => $friendGroup,
            "status" => (int)$contact['add_status'],
            "createTime" => $contact['add_time'],
            "uname" => $contact['uname'],
            "tximg" => $contact['tximg'],
            "sayed" => $contact['sayed'],
            "isPinned" => (int)($contact['ispin'] ?? 0),
            "unreadCount" => 0,
            "conversationId" => hash_session_id($contact['friend_id'], $userId),
            "contactId" => $contact['friend_id'],
            'account_status' => $contact['isban'],
            'intimacy' => [
                'value' => $intimacyValue,
                'alias' => $intimacyAlias
            ]
        ];
    }
    $resultSet->free();
    $stmt->close();
    if (!empty($needInsert)) {
        $insertSql = "INSERT IGNORE INTO mok_intimacy (user_id, target_id, value, create_time) VALUES (?, ?, 0, NOW())";
        $insertStmt = $conn->prepare($insertSql);
        if ($insertStmt) {
            foreach ($needInsert as $item) {
                $insertStmt->bind_param('ss', $item['user_id'], $item['target_id']);
                $insertStmt->execute();
            }
            $insertStmt->close();
        }
    }
    
    sendResponse(200, $result, "联系人数据拉取成功");
} catch (Exception $e) {
    handleException($e);
} finally {
    if (isset($conn) && $conn) {
        $conn->close();
    }
}