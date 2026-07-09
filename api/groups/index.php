<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/api/quot.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php';
try {
    $userId = $_GET['userId'] ?? '';
    if (empty($userId) || !is_string($userId)) {
        throw new Exception('用户ID不合法', 400);
    }
    requireApiAuth();
    $sql = "
        SELECT 
            gc.id AS group_id,
            gc.group_name,
            gc.group_avatar,
            gc.owner_id,
            gc.group_desc,
            gc.group_status,
            gc.max_member,
            UNIX_TIMESTAMP(gc.create_time) AS create_time,
            gc.verify_join,
            gc.usettings AS group_settings,
            gc.searnum,
            gm.is_admin,
            UNIX_TIMESTAMP(gm.join_time) AS join_time,
            gm.isPinned,
            gm.galias,
            gm.nalsay,
            gm.status AS member_status,
            UNIX_TIMESTAMP(gm.last_active_time) AS last_active_time
        FROM mok_group_member gm FORCE INDEX (idx_user_status)
        INNER JOIN mok_group_chat gc FORCE INDEX (PRIMARY)
            ON gm.group_id = gc.id
        WHERE 
            gm.user_id = ? 
            AND gm.status = 1  
            AND gc.group_status = 1  
        ORDER BY gm.join_time DESC
    ";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('SQL预处理失败', 500);
    }
    
    $stmt->bind_param('s', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $groupList = [];
    while ($row = $result->fetch_assoc()) {
        $row['create_time'] = date('Y-m-d H:i:s', $row['create_time']);
        $row['join_time'] = date('Y-m-d H:i:s', $row['join_time']);
        $row['last_active_time'] = $row['last_active_time'] 
            ? date('Y-m-d H:i:s', $row['last_active_time']) 
            : null;
        $row['is_admin'] = (bool)$row['is_admin'];
        
        $groupList[] = $row;
    }
    $result->free();
    $stmt->close();
    $conn->close();
    $response = [
        'code' => 200,
        'msg' => 'success',
        'data' => $groupList,
        'total' => count($groupList)  
    ];
} catch (Exception $e) {
    $response = [
        'code' => $e->getCode() ?: 500,
        'msg' => $e->getMessage(),
        'data' => []
    ];
}
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
exit;