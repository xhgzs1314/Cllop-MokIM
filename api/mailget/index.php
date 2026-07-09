<?php
require_once('../../setting.php');
require_once('../../cofd/functions.php');
$tcodelogins = $_COOKIE[generateAutoWebsiteIdentifier(true) . "_log"] ?? 'null';
if ($tcodelogins == 'null') {
    http_response_code(401);
    echo json_encode(['code' => 401, 'msg' => '未登录']);
    exit;
}

require_once('../../cofd/tauth.php');
$decodeers = new TmdbaseauthdownyhoDecrypt(60000 * 60 * 2);
$decodeddata = $decodeers->writebacknewwords($tcodelogins);
if (!$decodeddata) {
    http_response_code(401);
    echo json_encode(['code' => 401, 'msg' => '登录验证失败']);
    exit;
}

$decodeddata2 = encrypt($decodeddata, 'D', generateAutoWebsiteIdentifier(true));
if (!$decodeddata2) {
    http_response_code(401);
    echo json_encode(['code' => 401, 'msg' => '数据解密失败']);
    exit;
}

$tarray = explode('<:>', $decodeddata2);
if (!isset($tarray[0]) || !isset($tarray[1]) || empty($tarray[0]) || empty($tarray[1]) || !isset($tarray[2]) || empty($tarray[2])) {
    http_response_code(401);
    echo json_encode(['code' => 401, 'msg' => '用户信息不完整']);
    exit;
}

$user_id = trim($tarray[2]);

require($_SERVER['DOCUMENT_ROOT'].'/cofd/common.php');
$action = $_GET['action'] ?? 'list'; 
$mail_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
switch ($action) {
    case 'list':
        $type = $_GET['type'] ?? 'inbox'; 

        $sql = "SELECT m.*, 
                (SELECT uname FROM mok_user WHERE id = m.from_id) as from_name,
                (SELECT tximg FROM mok_user WHERE id = m.from_id) as from_avatar
                FROM mok_mail m 
                WHERE m.to_id = ? AND m.is_delete = 0 
                ORDER BY m.send_time DESC";

        if ($type === 'unread') {
            $sql = "SELECT m.*, 
                    (SELECT uname FROM mok_user WHERE id = m.from_id) as from_name,
                    (SELECT tximg FROM mok_user WHERE id = m.from_id) as from_avatar
                    FROM mok_mail m 
                    WHERE m.to_id = ? AND m.is_delete = 0 AND m.is_read = 0 
                    ORDER BY m.send_time DESC";
        }

        $stmt = $conn->prepare($sql);
        $stmt->bind_param('s', $user_id);
        $stmt->execute();
        $result = $stmt->get_result();

        $mails = [];
        while ($row = $result->fetch_assoc()) {
            $send_time = strtotime($row['send_time']);
            $now = time();
            $diff = $now - $send_time;

            if ($diff < 60) {
                $time_str = '刚刚';
            } elseif ($diff < 3600) {
                $time_str = floor($diff / 60) . '分钟前';
            } elseif ($diff < 86400) {
                $time_str = floor($diff / 3600) . '小时前';
            } elseif ($diff < 2592000) {
                $time_str = floor($diff / 86400) . '天前';
            } else {
                $time_str = date('m-d', $send_time);
            }
            $from_name = $row['from_name'] ?? $row['from_id'];
            $from_initial = mb_substr($from_name, 0, 1, 'utf-8');

            $mails[] = [
                'id' => intval($row['id']),
                'sender' => $from_name,
                'sender_initial' => $from_initial,
                'sender_id' => $row['from_id'],
                'avatar_color' => getAvatarColor($row['from_id']),
                'title' => $row['title'],
                'desc' => mb_substr(strip_tags($row['content']), 0, 50) . (mb_strlen(strip_tags($row['content'])) > 50 ? '...' : ''),
                'content' => $row['content'],
                'time' => $time_str,
                'time_raw' => $row['send_time'],
                'unread' => $row['is_read'] == 0,
                'is_read' => intval($row['is_read'])
            ];
        }
        $unread_stmt = $conn->prepare("SELECT COUNT(*) as unread_count FROM mok_mail WHERE to_id = ? AND is_read = 0 AND is_delete = 0");
        $unread_stmt->bind_param('s', $user_id);
        $unread_stmt->execute();
        $unread_result = $unread_stmt->get_result();
        $unread_count = $unread_result->fetch_assoc()['unread_count'];

        echo json_encode([
            'code' => 200,
            'msg' => 'success',
            'data' => [
                'list' => $mails,
                'unread_count' => intval($unread_count)
            ]
        ]);
        break;

    case 'read':
        if (!$mail_id) {
            http_response_code(400);
            echo json_encode(['code' => 400, 'msg' => '参数错误']);
            exit;
        }
        $check_stmt = $conn->prepare("SELECT id FROM mok_mail WHERE id = ? AND to_id = ? AND is_delete = 0");
        $check_stmt->bind_param('is', $mail_id, $user_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();

        if ($check_result->num_rows === 0) {
            http_response_code(403);
            echo json_encode(['code' => 403, 'msg' => '无权操作该邮件']);
            exit;
        }

        $update_stmt = $conn->prepare("UPDATE mok_mail SET is_read = 1, read_time = NOW() WHERE id = ? AND to_id = ?");
        $update_stmt->bind_param('is', $mail_id, $user_id);

        if ($update_stmt->execute()) {
            echo json_encode(['code' => 200, 'msg' => '已标记为已读']);
        } else {
            echo json_encode(['code' => 500, 'msg' => '操作失败']);
        }
        break;

    case 'delete':
        if (!$mail_id) {
            http_response_code(400);
            echo json_encode(['code' => 400, 'msg' => '参数错误']);
            exit;
        }
        $check_stmt = $conn->prepare("SELECT id FROM mok_mail WHERE id = ? AND to_id = ? AND is_delete = 0");
        $check_stmt->bind_param('is', $mail_id, $user_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();

        if ($check_result->num_rows === 0) {
            http_response_code(403);
            echo json_encode(['code' => 403, 'msg' => '无权操作该邮件']);
            exit;
        }

        $update_stmt = $conn->prepare("UPDATE mok_mail SET is_delete = 1 WHERE id = ? AND to_id = ?");
        $update_stmt->bind_param('is', $mail_id, $user_id);

        if ($update_stmt->execute()) {
            echo json_encode(['code' => 200, 'msg' => '删除成功']);
        } else {
            echo json_encode(['code' => 500, 'msg' => '删除失败']);
        }
        break;

    case 'send':
        $input = json_decode(file_get_contents('php://input'), true);
        $to_id = $input['to_id'] ?? '';
        $title = $input['title'] ?? '';
        $content = $input['content'] ?? '';

        if (empty($to_id) || empty($title) || empty($content)) {
            http_response_code(400);
            echo json_encode(['code' => 400, 'msg' => '参数不完整']);
            exit;
        }
        $user_stmt = $conn->prepare("SELECT id FROM mok_user WHERE id = ?");
        $user_stmt->bind_param('s', $to_id);
        $user_stmt->execute();
        $user_result = $user_stmt->get_result();

        if ($user_result->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['code' => 404, 'msg' => '收件人不存在']);
            exit;
        }

        $insert_stmt = $conn->prepare("INSERT INTO mok_mail (from_id, to_id, title, content, send_time) VALUES (?, ?, ?, ?, NOW())");
        $insert_stmt->bind_param('ssss', $user_id, $to_id, $title, $content);

        if ($insert_stmt->execute()) {
            echo json_encode([
                'code' => 200,
                'msg' => '发送成功',
                'data' => ['id' => $insert_stmt->insert_id]
            ]);
        } else {
            echo json_encode(['code' => 500, 'msg' => '发送失败']);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode(['code' => 400, 'msg' => '无效的操作']);
}

$conn->close();
function getAvatarColor($user_id)
{
    $colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#9b59b6', '#ff7f50', '#2ecc71'];
    $index = abs(crc32($user_id)) % count($colors);
    return $colors[$index];
}