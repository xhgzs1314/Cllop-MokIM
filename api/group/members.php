<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['code' => 405, 'msg' => 'Method Not Allowed', 'data' => null]);
    exit();
}
require($_SERVER['DOCUMENT_ROOT'] . '/api/quot.php');
requireApiAuth();
$groupId = isset($_GET['groupId']) ? intval($_GET['groupId']) : 0;
$killoryes = isset($_GET['killoryes']) ?? 'n';
if ($groupId <= 0) {
    echo json_encode(['code' => 400, 'msg' => 'Invalid groupId', 'data' => null]);
    exit();
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
try {
    $stmt = $conn->prepare("
        SELECT id, group_name, owner_id, group_status 
        FROM mok_group_chat 
        WHERE id = ?
    ");
    $stmt->bind_param('i', $groupId);
    $stmt->execute();
    $groupResult = $stmt->get_result();
    if ($groupResult->num_rows === 0) {
        echo json_encode(['code' => 404, 'msg' => 'Group not found', 'data' => null]);
        $stmt->close();
        $conn->close();
        exit();
    }

    $groupInfo = $groupResult->fetch_assoc();
    $stmt->close();
    $killnumc = $killoryes == 'n' ? 1 : 0;
    $stmt = $conn->prepare("
        SELECT 
            gm.user_id,
            u.uname as user_name,
            u.tximg as avatar,
            gm.is_admin,
            gm.join_time,
            gm.status as member_status,
            gm.last_active_time
        FROM mok_group_member gm
        LEFT JOIN mok_user u ON gm.user_id = u.id
        WHERE gm.group_id = ? AND gm.status = ?
        ORDER BY 
            gm.is_admin DESC,  
            gm.join_time ASC   
    ");
    $stmt->bind_param('ii', $groupId, $killnumc);
    $stmt->execute();
    $result = $stmt->get_result();
    $members = [];
    while ($row = $result->fetch_assoc()) {
        $members[] = [
            'user_id' => (string)$row['user_id'],
            'user_name' => $row['user_name'] ?: '未知用户',
            'avatar' => $row['avatar'] ?: 'default.jpg',
            'is_admin' => (bool)$row['is_admin'],
            'join_time' => $row['join_time'],
            'member_status' => (int)$row['member_status'],
            'last_active' => $row['last_active_time']
        ];
    }
    $stmt->close();
    echo json_encode([
        'code' => 200,
        'msg' => 'success',
        'data' => [
            'group_id' => $groupId,
            'group_name' => $groupInfo['group_name'],
            'owner_id' => (string)$groupInfo['owner_id'],
            'total_members' => count($members),
            'members' => $members
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'code' => 500,
        'msg' => 'Internal server error: ' . $e->getMessage(),
        'data' => null
    ]);
} finally {
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
