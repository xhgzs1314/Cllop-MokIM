<?php
function time_elapsed_string($datetime)
{
    $now = new DateTime();
    $ago = new DateTime($datetime);
    $diff = $now->diff($ago);
    if ($diff->y > 0) return $diff->y . '年前';
    if ($diff->m > 0) return $diff->m . '个月前';
    if ($diff->d > 0) return $diff->d . '天前';
    if ($diff->h > 0) return $diff->h . '小时前';
    if ($diff->i > 0) return $diff->i . '分钟前';
    return '刚刚';
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php');
$qx_max_tmp1 = true;
$q_suname = null;
$tcodelogins = $_COOKIE[generateAutoWebsiteIdentifier((true)) . "_log"] ?? 'null';
if ($tcodelogins == 'null') {
    $qx_max_tmp1 = false;
} else {
    require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
    $decodeers = new TmdbaseauthdownyhoDecrypt(60000 * 60 * 2);
    $decodeddata = $decodeers->writebacknewwords($tcodelogins);
    if (!$decodeddata) {
        $qx_max_tmp1 = false;
    }
    $decodeddata2 = encrypt($decodeddata, 'D', generateAutoWebsiteIdentifier(true));
    if (!$decodeddata2) {
        $qx_max_tmp1 = false;
    }
    $tarray = explode('<:>', $decodeddata2);
    if (!isset($tarray[0]) || !isset($tarray[1]) || empty($tarray[0]) || empty($tarray[1]) || !isset($tarray[2]) || empty($tarray[2])) {
        $qx_max_tmp1 = false;
    }
    $q_suname = trim($tarray[2]);
}

if (!$qx_max_tmp1) {
    mokim_ttl_elegant_exit(
        '您当前未登录<a href="/use/user/">Click Me</a>',
        null,
        'error'
    );
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json');
    session_start();
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['moment_csrf_token']) {
        echo json_encode(['success' => false, 'message' => 'CSRF验证失败']);
        exit;
    }
    $current_user_id = $q_suname;
    $action = $_POST['action'];
    if ($action === 'delete_moment') {
        $moment_id = isset($_POST['moment_id']) ? intval($_POST['moment_id']) : 0;

        if ($moment_id <= 0) {
            echo json_encode(['success' => false, 'message' => '参数错误']);
            exit;
        }
        $sql = "SELECT user_id FROM mok_moment WHERE id = ? AND status = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $moment_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();

        if (!$row) {
            echo json_encode(['success' => false, 'message' => '动态不存在']);
            exit;
        }

        if ($row['user_id'] != $current_user_id) {
            echo json_encode(['success' => false, 'message' => '没有权限删除该动态']);
            exit;
        }
        $sql = "UPDATE mok_moment SET status = 0, update_time = NOW() WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $moment_id);
        if ($stmt->execute()) {
            $_SESSION['moment_csrf_token'] = bin2hex(random_bytes(32));
            echo json_encode([
                'success' => true,
                'message' => '删除成功',
                'new_csrf_token' => $_SESSION['moment_csrf_token']
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => '删除失败']);
        }
        $stmt->close();
        exit;
    }
    if ($action === 'update_visibility') {
        $moment_id = isset($_POST['moment_id']) ? intval($_POST['moment_id']) : 0;
        $visibility = isset($_POST['visibility']) ? intval($_POST['visibility']) : 1;
        if ($moment_id <= 0) {
            echo json_encode(['success' => false, 'message' => '参数错误']);
            exit;
        }
        if (!in_array($visibility, [1, 2, 3])) {
            echo json_encode(['success' => false, 'message' => '权限参数错误']);
            exit;
        }
        $sql = "SELECT user_id FROM mok_moment WHERE id = ? AND status = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $moment_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        if (!$row) {
            echo json_encode(['success' => false, 'message' => '动态不存在']);
            exit;
        }

        if ($row['user_id'] != $current_user_id) {
            echo json_encode(['success' => false, 'message' => '没有权限修改该动态']);
            exit;
        }

        $sql = "UPDATE mok_moment SET visibility = ?, update_time = NOW() WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $visibility, $moment_id);

        if ($stmt->execute()) {
            $_SESSION['moment_csrf_token'] = bin2hex(random_bytes(32));
            echo json_encode([
                'success' => true,
                'message' => '权限修改成功',
                'new_csrf_token' => $_SESSION['moment_csrf_token']
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => '修改失败']);
        }
        $stmt->close();
        exit;
    }
    if ($action === 'get_all_comments') {
        $moment_id = isset($_POST['moment_id']) ? intval($_POST['moment_id']) : 0;
        if ($moment_id <= 0) {
            echo json_encode(['success' => false, 'message' => '参数错误']);
            exit;
        }
        $sql = "SELECT id FROM mok_moment WHERE id = ? AND status = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $moment_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if (!$result->fetch_assoc()) {
            $stmt->close();
            echo json_encode(['success' => false, 'message' => '动态不存在']);
            exit;
        }
        $stmt->close();
        $comments = getComments($conn, $moment_id, 9999);
        echo json_encode([
            'success' => true,
            'comments' => $comments,
            'total' => count($comments)
        ]);
        exit;
    }
    if ($action === 'publish_moment') {
        $content = isset($_POST['content']) ? trim($_POST['content']) : '';
        $visibility = isset($_POST['visibility']) ? intval($_POST['visibility']) : 1;
        $location = isset($_POST['location']) ? trim($_POST['location']) : '';
        if (!in_array($visibility, [1, 2, 3])) {
            $visibility = 1;
        }
        if (empty($content)) {
            echo json_encode(['success' => false, 'message' => '内容不能为空']);
            exit;
        }

        if (mb_strlen($content) > 5000) {
            echo json_encode(['success' => false, 'message' => '内容不能超过5000字']);
            exit;
        }

        $sql = "INSERT INTO mok_moment (user_id, content, `location`, visibility, publish_time, update_time) 
                VALUES (?, ?, ?, ?, NOW(), NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssi", $current_user_id, $content, $location, $visibility);
        if ($stmt->execute()) {
            $moment_id = $stmt->insert_id;
            $stmt->close();
            $_SESSION['moment_csrf_token'] = bin2hex(random_bytes(32));
            echo json_encode([
                'success' => true,
                'message' => '发布成功',
                'moment_id' => $moment_id,
                'new_csrf_token' => $_SESSION['moment_csrf_token']
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => '发布失败，请稍后重试']);
        }
        exit;
    }

    if ($action === 'like_moment') {
        $moment_id = isset($_POST['moment_id']) ? intval($_POST['moment_id']) : 0;
        if ($moment_id <= 0) {
            echo json_encode(['success' => false, 'message' => '参数错误']);
            exit;
        }
        $sql = "SELECT id FROM mok_moment WHERE id = ? AND status = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $moment_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if (!$result->fetch_assoc()) {
            $stmt->close();
            echo json_encode(['success' => false, 'message' => '动态不存在']);
            exit;
        }
        $stmt->close();
        $sql = "SELECT status FROM mok_moment_interact 
            WHERE moment_id = ? AND user_id = ? AND type = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("is", $moment_id, $current_user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        if ($row) {
            $new_status = ($row['status'] == 1) ? 0 : 1;
            $sql = "UPDATE mok_moment_interact SET status = ? 
                WHERE moment_id = ? AND user_id = ? AND type = 1";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("iis", $new_status, $moment_id, $current_user_id);
            $stmt->execute();
            $stmt->close();
            $liked = ($new_status == 1);
        } else {
            $sql = "INSERT INTO mok_moment_interact (moment_id, user_id, type, status, create_time) 
                VALUES (?, ?, 1, 1, NOW())";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("is", $moment_id, $current_user_id);
            $stmt->execute();
            $stmt->close();
            $liked = true;
        }
        $sql = "SELECT COUNT(*) as cnt FROM mok_moment_interact 
            WHERE moment_id = ? AND type = 1 AND status = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $moment_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        $like_count = $row['cnt'];
        $sql = "UPDATE mok_moment SET like_count = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $like_count, $moment_id);
        $stmt->execute();
        $stmt->close();
        $_SESSION['moment_csrf_token'] = bin2hex(random_bytes(32));
        echo json_encode([
            'success' => true,
            'liked' => $liked,
            'like_count' => $like_count,
            'new_csrf_token' => $_SESSION['moment_csrf_token']
        ]);
        exit;
    }
    if ($action === 'delete_comment') {
        $comment_id = isset($_POST['comment_id']) ? intval($_POST['comment_id']) : 0;
        if ($comment_id <= 0) {
            echo json_encode(['success' => false, 'message' => '参数错误']);
            exit;
        }
        $sql = "SELECT i.id, i.user_id, i.moment_id, i.reply_to, u.uname 
            FROM mok_moment_interact i
            LEFT JOIN mok_user u ON i.user_id = u.id
            WHERE i.id = ? AND i.type = 2 AND i.status = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $comment_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $comment = $result->fetch_assoc();
        $stmt->close();

        if (!$comment) {
            echo json_encode(['success' => false, 'message' => '评论不存在或已被删除']);
            exit;
        }
        if ($comment['user_id'] != $current_user_id) {
            echo json_encode(['success' => false, 'message' => '没有权限删除该评论']);
            exit;
        }
        $sql = "UPDATE mok_moment_interact SET status = 0 WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $comment_id);
        if ($stmt->execute()) {
            $stmt->close();
            $sql = "UPDATE mok_moment_interact SET status = 0 WHERE reply_to = ? AND type = 2";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $comment_id);
            $stmt->execute();
            $stmt->close();
            $sql = "SELECT COUNT(*) as cnt FROM mok_moment_interact 
                WHERE moment_id = ? AND type = 2 AND status = 1";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $comment['moment_id']);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();
            $comment_count = $row['cnt'];
            $sql = "UPDATE mok_moment SET comment_count = ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ii", $comment_count, $comment['moment_id']);
            $stmt->execute();
            $stmt->close();
            $_SESSION['moment_csrf_token'] = bin2hex(random_bytes(32));
            echo json_encode([
                'success' => true,
                'message' => '评论已删除',
                'comment_id' => $comment_id,
                'moment_id' => $comment['moment_id'],
                'comment_count' => $comment_count,
                'new_csrf_token' => $_SESSION['moment_csrf_token']
            ]);
        } else {
            error_log("SQL Error (delete_comment): " . $stmt->error);
            echo json_encode(['success' => false, 'message' => '删除失败']);
        }
        exit;
    }
    if ($action === 'comment_moment') {
        $moment_id = isset($_POST['moment_id']) ? intval($_POST['moment_id']) : 0;
        $content = isset($_POST['content']) ? trim($_POST['content']) : '';
        $reply_to = isset($_POST['reply_to']) ? intval($_POST['reply_to']) : 0;
        if ($moment_id <= 0) {
            echo json_encode(['success' => false, 'message' => '参数错误']);
            exit;
        }
        if (empty($content)) {
            echo json_encode(['success' => false, 'message' => '评论内容不能为空']);
            exit;
        }
        if (mb_strlen($content) > 500) {
            echo json_encode(['success' => false, 'message' => '评论内容不能超过500字']);
            exit;
        }
        $sql = "SELECT id FROM mok_moment WHERE id = ? AND status = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $moment_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if (!$result->fetch_assoc()) {
            $stmt->close();
            echo json_encode(['success' => false, 'message' => '动态不存在']);
            exit;
        }
        $stmt->close();
        $reply_user_name = '';
        if ($reply_to > 0) {
            $sql = "SELECT i.user_id, u.uname 
                FROM mok_moment_interact i
                LEFT JOIN mok_user u ON i.user_id = u.id
                WHERE i.id = ? AND i.type = 2 AND i.status = 1 AND i.moment_id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ii", $reply_to, $moment_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $reply_comment = $result->fetch_assoc();
            $stmt->close();
            if (!$reply_comment) {
                echo json_encode(['success' => false, 'message' => '被回复的评论不存在']);
                exit;
            }
            $reply_user_name = $reply_comment['uname'] ?? '用户';
        }
        $sql = "INSERT INTO mok_moment_interact (moment_id, user_id, content, type, reply_to, status, create_time) 
            VALUES (?, ?, ?, 2, ?, 1, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("issi", $moment_id, $current_user_id, $content, $reply_to);
        if ($stmt->execute()) {
            $comment_id = $stmt->insert_id;
            $stmt->close();
            $sql = "UPDATE mok_moment SET comment_count = comment_count + 1 WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $moment_id);
            $stmt->execute();
            $stmt->close();
            $sql = "SELECT uname FROM mok_user WHERE id = ? AND isban = 0";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("s", $current_user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            $stmt->close();
            $_SESSION['moment_csrf_token'] = bin2hex(random_bytes(32));
            $display_content = $content;
            if ($reply_to > 0 && !empty($reply_user_name)) {
                $display_content = '<span class="reply-mention">@' . htmlspecialchars($reply_user_name) . '</span> ' . htmlspecialchars($content);
            }
            echo json_encode([
                'success' => true,
                'message' => '评论成功',
                'comment_id' => $comment_id,
                'user_name' => $user['uname'] ?? '用户',
                'content' => $display_content,
                'raw_content' => htmlspecialchars($content),
                'reply_to' => $reply_to,
                'reply_user_name' => $reply_user_name,
                'create_time' => date('Y-m-d H:i:s'),
                'new_csrf_token' => $_SESSION['moment_csrf_token']
            ]);
        } else {
            error_log("SQL Error (comment_moment - insert): " . $stmt->error);
            echo json_encode(['success' => false, 'message' => '评论失败，请稍后重试']);
        }
        exit;
    }

    echo json_encode(['success' => false, 'message' => '未知操作']);
    exit;
}
session_start();
if (!isset($_SESSION['moment_csrf_token'])) {
    $_SESSION['moment_csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['moment_csrf_token'];
$current_user_id = $q_suname;
$target_user_id = isset($_GET['guid']) ? trim($_GET['guid']) : $current_user_id;
$is_own_page = ($current_user_id == $target_user_id);
function canViewMoment($conn, $current_user_id, $target_user_id)
{
    if ($current_user_id == $target_user_id) {
        return true;
    }
    $sql = "SELECT permission FROM mok_contact 
            WHERE user_id = ? AND friend_id = ? AND add_status = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $target_user_id, $current_user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $permission = json_decode($row['permission'], true);
        if (empty($permission) || !isset($permission['view_moment'])) {
            return true;
        }
        return $permission['view_moment'] === true;
    }

    $stmt->close();
    return false;
}

if (!canViewMoment($conn, $current_user_id, $target_user_id)) {
    mokim_ttl_elegant_exit(
        '您没有权限查看对方的朋友圈',
        function () use ($conn) {
            $conn->close();
        },
        'error'
    );
}

function getUserInfo($conn, $user_id)
{
    $sql = "SELECT id, uname, tximg, sayed FROM mok_user WHERE id = ? AND isban = 0";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->fetch_assoc();
}

$target_user_info = getUserInfo($conn, $target_user_id);
if ($target_user_info['tximg'] == '(&&)::avatar.jpg') {
    $target_user_info['tximg'] = '/ast/fickp/default.png';
}
if (!$target_user_info) {
    die('用户不存在或已被封禁');
}

function getMoments($conn, $user_id, $current_user_id, $is_own_page = false)
{
    $moments = [];
    if ($is_own_page) {
        $friend_ids = [];
        $sql = "SELECT friend_id FROM mok_contact 
                WHERE user_id = ? AND add_status = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $current_user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $friend_ids[] = $row['friend_id'];
        }
        $stmt->close();
        $friend_ids[] = $current_user_id;
        if (empty($friend_ids)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($friend_ids), '?'));
        $sql = "SELECT m.id, m.user_id, m.content, m.location, m.visibility, m.like_count, m.comment_count, 
                       m.publish_time, m.update_time, 
                       u.uname, u.tximg, u.sayed
                FROM mok_moment m
                LEFT JOIN mok_user u ON m.user_id = u.id AND u.isban = 0
                WHERE m.user_id IN ($placeholders) AND m.status = 1 
                ORDER BY m.publish_time DESC";
        $stmt = $conn->prepare($sql);
        $types = str_repeat('s', count($friend_ids));
        $stmt->bind_param($types, ...$friend_ids);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            if ($row['visibility'] == 3 && $row['user_id'] != $current_user_id) {
                continue;
            }
            if ($row['visibility'] == 2 && !isFriend($conn, $current_user_id, $row['user_id'])) {
                continue;
            }
            if ($row['user_id'] != $current_user_id) {
                if (!canViewMoment($conn, $current_user_id, $row['user_id'])) {
                    continue;
                }
            }
            $row['tximg'] = (empty($row['tximg']) || $row['tximg'] == '(&&)::avatar.jpg') ? '/ast/fickp/default.png' : $row['tximg'];
            $row['is_liked'] = checkUserLiked($conn, $row['id'], $current_user_id);
            $moments[] = $row;
        }
        $stmt->close();
    } else {
        $sql = "SELECT m.id, m.user_id, m.content, m.location, m.visibility, m.like_count, m.comment_count, 
                       m.publish_time, m.update_time, 
                       u.uname, u.tximg, u.sayed
                FROM mok_moment m
                LEFT JOIN mok_user u ON m.user_id = u.id AND u.isban = 0
                WHERE m.user_id = ? AND m.status = 1 
                ORDER BY m.publish_time DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            if ($row['visibility'] == 3 && $row['user_id'] != $current_user_id) {
                continue;
            }
            if ($row['visibility'] == 2 && !isFriend($conn, $current_user_id, $row['user_id'])) {
                continue;
            }
            $row['tximg'] = (empty($row['tximg']) || $row['tximg'] == '(&&)::avatar.jpg') ? '/ast/fickp/default.png' : $row['tximg'];
            $row['is_liked'] = checkUserLiked($conn, $row['id'], $current_user_id);
            $moments[] = $row;
        }
        $stmt->close();
    }

    usort($moments, function ($a, $b) {
        return strtotime($b['publish_time']) - strtotime($a['publish_time']);
    });
    return $moments;
}

function isFriend($conn, $user_id, $friend_id)
{
    $sql = "SELECT id FROM mok_contact 
            WHERE user_id = ? AND friend_id = ? AND add_status = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $user_id, $friend_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $is_friend = $result->num_rows > 0;
    $stmt->close();
    return $is_friend;
}
function checkUserLiked($conn, $moment_id, $user_id)
{
    $sql = "SELECT id FROM mok_moment_interact 
            WHERE moment_id = ? AND user_id = ? AND type = 1 AND status = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $moment_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $liked = $result->num_rows > 0;
    $stmt->close();
    return $liked;
}
function parseMomentContent($content)
{
    $content = htmlspecialchars($content, ENT_QUOTES, 'UTF-8');
    $images = [];
    $content = preg_replace_callback(
        '/!\[\]\(([^)]+)\)/',
        function ($m) use (&$images) {
            $src = trim($m[1]);
            if (filter_var($src, FILTER_VALIDATE_URL) && preg_match('/^https?:\/\//i', $src)) {
                $images[] = $src;
                return '{{IMAGE_PLACEHOLDER}}';
            }
            return '';
        },
        $content
    );
    if (!empty($images)) {
        $gridHtml = '<div class="moment-images-grid">';
        foreach ($images as $src) {
            $gridHtml .= '<div class="moment-image-wrapper" data-src="' . $src . '">
                            <div class="image-loading">
                                <i class="fas fa-spinner fa-spin"></i>
                                <span>加载中...</span>
                            </div>
                            <img class="moment-image" alt="图片" loading="lazy">
                            <div class="image-error" style="display:none;">
                                <i class="fas fa-image"></i>
                                <span>加载失败</span>
                            </div>
                        </div>';
        }
        $gridHtml .= '</div>';
        $content = preg_replace('/\{\{IMAGE_PLACEHOLDER\}\}/', $gridHtml, $content, 1);
        $content = str_replace('{{IMAGE_PLACEHOLDER}}', '', $content);
    }
    $content = preg_replace_callback(
        '/\[([^\]]+)\]\(([^)]+)\)/',
        function ($matches) {
            $text = htmlspecialchars($matches[1], ENT_QUOTES, 'UTF-8');
            $url = htmlspecialchars(trim($matches[2]), ENT_QUOTES, 'UTF-8');
            if (preg_match('/^https?:\/\/.+/i', $url)) {
                return '<a href="' . $url . '" target="_blank" rel="noopener noreferrer">' . $text . '</a>';
            }
            return $text;
        },
        $content
    );
    $content = preg_replace_callback(
        '/#([^\s]+)/',
        function ($matches) {
            return '<span class="highlight">#' . htmlspecialchars($matches[1], ENT_QUOTES, 'UTF-8') . '</span>';
        },
        $content
    );
    $content = preg_replace_callback(
        '/@([^\s]+)/',
        function ($matches) {
            return '<span class="mention">@' . htmlspecialchars($matches[1], ENT_QUOTES, 'UTF-8') . '</span>';
        },
        $content
    );

    return nl2br($content);
}
function getComments($conn, $moment_id, $limit = 5)
{
    $comments = [];
    $sql = "SELECT i.id, i.user_id, i.content, i.reply_to, i.create_time, u.uname 
            FROM mok_moment_interact i
            LEFT JOIN mok_user u ON i.user_id = u.id AND u.isban = 0
            WHERE i.moment_id = ? AND i.type = 2 AND i.status = 1 
            ORDER BY i.create_time ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $moment_id);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $row['user_name'] = $row['uname'] ?: '用户';
        $row['reply_user_name'] = '';
        $comments[] = $row;
    }
    $stmt->close();
    $tree = [];
    $map = [];
    foreach ($comments as $comment) {
        $map[$comment['id']] = $comment;
        $map[$comment['id']]['children'] = [];
    }
    foreach ($map as $id => &$comment) {
        if ($comment['reply_to'] > 0 && isset($map[$comment['reply_to']])) {
            $comment['reply_user_name'] = $map[$comment['reply_to']]['user_name'];
            $map[$comment['reply_to']]['children'][] = &$comment;
        } else {
            $tree[] = &$comment;
        }
    }
    if ($limit > 0 && $limit < count($tree)) {
        $tree = array_slice($tree, 0, $limit);
    }
    return $tree;
}

$moments = getMoments($conn, $target_user_id, $current_user_id, $is_own_page);
?>
<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>朋友圈</title>
    <link rel="stylesheet" href="/ast/fontawe/css/all.min.css">
    <link rel="stylesheet" href="/ast/painting/friendmans.css">
</head>

<body>
    <div class="moment-container">
        <aside class="moment-sidebar">
            <div class="sidebar-user">
                <div class="sidebar-avatar" style="background-image: url('<?php echo htmlspecialchars($target_user_info['tximg'] ?: '/ast/fickp/default.png'); ?>');" onerror="this.style.backgroundImage='url(/ast/fickp/default.png)'"></div>
                <div>
                    <div class="sidebar-name"><?php echo htmlspecialchars($target_user_info['uname']); ?></div>
                    <div class="sidebar-sig"><?php echo htmlspecialchars($target_user_info['sayed'] ?: '这个用户很懒，什么也没写'); ?></div>
                </div>
            </div>
            <div class="sidebar-menu">
                <div class="sidebar-menu-item active" data-filter="all">
                    <i class="fas fa-rss"></i> 动态
                </div>
                <div class="sidebar-menu-item active" data-filter="image">
                    <i class="fas fa-image"></i> 图文
                </div>
                <div class="sidebar-menu-item" data-filter="liked">
                    <i class="fas fa-heart"></i> 赞过的
                </div>
                <div class="sidebar-menu-item" data-filter="commented">
                    <i class="fas fa-comment"></i> 评论过的
                </div>
                <div class="sidebar-menu-divider"></div>
                <div class="sidebar-menu-item" data-filter="friends">
                    <i class="fas fa-user-friends"></i> 好友动态
                </div>
                <div class="sidebar-menu-item" data-filter="recommended">
                    <i class="fas fa-globe"></i> 推荐
                </div>
            </div>
            <div class="sidebar-bottom">
                <button class="sidebar-btn <?php echo $is_own_page ? '' : 'publish-btn-hidden'; ?>" id="publishBtn">
                    <i class="fas fa-plus-circle"></i> 发布动态
                </button>
            </div>
        </aside>
        <main class="moment-main">
            <div class="nav-bar">
                <script>
                    function mokim_navback_smartGoBack() {
                        if (window.opener && !window.opener.closed) {
                            window.close();
                            return;
                        }
                        if (document.referrer) {
                            history.back();
                            return;
                        }
                        try {
                            if (history.length > 1) {
                                history.back();
                            } else {
                                window.location.href = '/';
                            }
                        } catch (e) {
                            window.location.href = '/';
                        }
                    }
                </script>
                <div class="nav-back" onclick="mokim_navback_smartGoBack();">
                    <i class="fas fa-chevron-left"></i> <span>返回</span>
                </div>
                <div class="nav-title">朋友圈</div>
                <div class="nav-actions">
                    <i style="visibility: hidden;" class="fas fa-search" title="搜索"></i>
                    <i class="fas fa-camera <?php echo $is_own_page ? '' : 'publish-btn-hidden'; ?>" id="publishIcon" title="发布"></i>
                </div>
            </div>
            <div class="feed-scroll">
                <div class="publish-overlay" id="publishOverlay">
                    <div class="publish-header">
                        <span class="back-btn" id="closePublishBtn">
                            <i class="fas fa-chevron-left"></i>
                        </span>
                        <span class="publish-title">发表动态</span>
                        <button class="publish-submit" id="submitPublishBtn">发布</button>
                    </div>
                    <div class="publish-body">
                        <textarea id="publishContent" placeholder="分享你的想法...&#10;&#10;支持 Markdown 语法：&#10;![]() 插入图片&#10;[](链接) 插入链接&#10;#话题 @用户&#10;今天天气真好！☀️
![](https://picsum.photos/400/300)"></textarea>
                    </div>
                    <div class="publish-toolbar">
                        <span class="tool-hint">
                            <i class="fas fa-info-circle"></i>
                            ![]()图片 &nbsp;|&nbsp; [](链接) &nbsp;|&nbsp; #话题 &nbsp;|&nbsp; @用户
                        </span>
                        <input type="text" class="location-input" id="publishLocation" placeholder="添加位置" maxlength="50">
                        <select class="visibility-select" id="publishVisibility">
                            <option value="1">公开</option>
                            <option value="2">好友可见</option>
                            <option value="3">仅自己</option>
                        </select>
                        <span class="publish-char-count" id="charCount">0 / 5000</span>
                    </div>
                </div>
                <?php if (empty($moments)): ?>
                    <div class="no-moments">
                        <i class="fas fa-image"></i>
                        <p>还没有动态</p>
                    </div>
                <?php else: ?>
                    <?php foreach ($moments as $moment):
                        $user_name = $moment['uname'] ?: '用户';
                        $avatar = $moment['tximg'] ?: '/ast/fickp/default.png';
                        $comments = getComments($conn, $moment['id']);
                        $total_comments = $moment['comment_count'];
                        $is_owner = ($moment['user_id'] == $current_user_id);
                        $is_liked = $moment['is_liked'] ?? false;
                    ?>
                        <div class="feed-item" data-moment-id="<?php echo $moment['id']; ?>" data-user-id="<?php echo htmlspecialchars($moment['user_id']); ?>">
                            <div class="feed-header">
                                <div class="feed-avatar" style="background-image: url('<?php echo htmlspecialchars($avatar); ?>');"></div>
                                <?php if ($is_owner || $target_user_id == $moment['user_id']): ?>
                                    <span class="feed-name"><?php echo htmlspecialchars($user_name); ?></span>
                                <?php else: ?>
                                    <span class="feed-name"
                                        title="点我访问对方朋友圈"
                                        onclick="window.location.href='?guid=<?php echo urlencode($moment['user_id']); ?>'"
                                        style="cursor: pointer; 
             text-decoration: underline; 
             text-underline-offset: 3px;
             color: #555; 
             font-weight: 500;
             padding: 2px 4px;
             border-radius: 3px;
             transition: all 0.2s ease;
             display: inline-block;"
                                        onmouseover="this.style.color='#1a73e8'; this.style.backgroundColor='#f0f4f9'; this.style.transform='scale(1.02)';"
                                        onmouseout="this.style.color='#555'; this.style.backgroundColor='transparent'; this.style.transform='scale(1)';">
                                        <?php echo htmlspecialchars($user_name); ?>
                                    </span>
                                <?php endif; ?>
                                <span class="feed-time">
                                    <?php echo time_elapsed_string($moment['publish_time']); ?>
                                    <?php if ($moment['visibility'] == 2): ?>
                                        <span class="moment-visibility"><i class="fas fa-user-friends"></i></span>
                                    <?php elseif ($moment['visibility'] == 3): ?>
                                        <span class="moment-visibility"><i class="fas fa-lock"></i></span>
                                    <?php endif; ?>
                                </span>
                            </div>
                            <div class="feed-text">
                                <?php echo parseMomentContent($moment['content']); ?>
                            </div>
                            <div class="feed-actions">
                                <div class="action-left">
                                    <span class="action-btn like-btn <?php echo $is_liked ? 'liked' : ''; ?>" data-moment-id="<?php echo $moment['id']; ?>">
                                        <i class="<?php echo $is_liked ? 'fas' : 'far'; ?> fa-heart"></i>
                                        <span class="count"><?php echo $moment['like_count']; ?></span>
                                    </span>
                                    <span class="action-btn comment-btn" data-moment-id="<?php echo $moment['id']; ?>">
                                        <i class="far fa-comment"></i>
                                        <span class="count"><?php echo $moment['comment_count']; ?></span>
                                    </span>
                                </div>
                                <?php if ($is_owner): ?>
                                    <div class="action-more-wrapper">
                                        <span class="action-more" data-moment-id="<?php echo $moment['id']; ?>">
                                            <i class="fas fa-ellipsis-h"></i>
                                        </span>
                                        <div class="more-dropdown" data-moment-id="<?php echo $moment['id']; ?>">
                                            <div class="dropdown-item has-submenu" data-action="change-visibility">
                                                <i class="fas fa-eye"></i> 修改权限
                                                <div class="visibility-submenu">
                                                    <div class="dropdown-item" data-visibility="1">
                                                        公开
                                                    </div>
                                                    <div class="dropdown-item" data-visibility="2">
                                                        好友可见
                                                    </div>
                                                    <div class="dropdown-item" data-visibility="3">
                                                        仅自己
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="dropdown-divider"></div>
                                            <div class="dropdown-item danger" data-action="delete">
                                                <i class="fas fa-trash"></i> 删除
                                            </div>
                                        </div>
                                    </div>
                                <?php endif; ?>
                            </div>
                            <div class="comment-section" data-moment-id="<?php echo $moment['id']; ?>">
                                <?php if (!empty($comments)): ?>
                                    <?php foreach ($comments as $comment): ?>
                                        <div class="comment-item" data-comment-id="<?php echo $comment['id']; ?>" data-user-id="<?php echo $comment['user_id']; ?>">
                                            <span class="comment-name"><?php echo htmlspecialchars($comment['user_name']); ?>：</span>
                                            <span class="comment-content">
                                                <?php
                                                if ($comment['reply_to'] > 0) {
                                                    echo '<span class="reply-mention">@' . htmlspecialchars($comment['reply_user_name'] ?? '用户') . '</span> ';
                                                }
                                                echo htmlspecialchars($comment['content']);
                                                ?>
                                            </span>
                                            <span class="comment-reply-btn" data-comment-id="<?php echo $comment['id']; ?>" data-user-name="<?php echo htmlspecialchars($comment['user_name']); ?>">
                                                <i class="fas fa-reply"></i> 回复
                                            </span>
                                            <?php if ($comment['user_id'] == $current_user_id): ?>
                                                <span class="comment-delete-btn" data-comment-id="<?php echo $comment['id']; ?>" data-moment-id="<?php echo $moment['id']; ?>">
                                                    <i class="fas fa-trash-alt"></i>
                                                </span>
                                            <?php endif; ?>
                                        </div>
                                        <?php if (!empty($comment['children'])): ?>
                                            <div class="comment-children" style="padding-left: 20px; border-left: 2px solid #e8ecf0; margin-left: 8px;">
                                                <?php foreach ($comment['children'] as $child): ?>
                                                    <div class="comment-item" data-comment-id="<?php echo $child['id']; ?>" data-user-id="<?php echo $child['user_id']; ?>">
                                                        <span class="comment-name"><?php echo htmlspecialchars($child['user_name']); ?>：</span>
                                                        <span class="comment-content">
                                                            <span class="reply-mention">@<?php echo htmlspecialchars($comment['user_name']); ?></span>
                                                            <?php echo htmlspecialchars($child['content']); ?>
                                                        </span>
                                                        <span class="comment-reply-btn" data-comment-id="<?php echo $child['id']; ?>" data-user-name="<?php echo htmlspecialchars($child['user_name']); ?>">
                                                            <i class="fas fa-reply"></i> 回复
                                                        </span>
                                                        <?php if ($child['user_id'] == $current_user_id): ?>
                                                            <span class="comment-delete-btn" data-comment-id="<?php echo $child['id']; ?>" data-moment-id="<?php echo $moment['id']; ?>">
                                                                <i class="fas fa-trash-alt"></i>
                                                            </span>
                                                        <?php endif; ?>
                                                    </div>
                                                <?php endforeach; ?>
                                            </div>
                                        <?php endif; ?>
                                    <?php endforeach; ?>
                                    <?php if ($total_comments > count($comments)): ?>
                                        <div class="comment-more" onclick="loadMoreComments(<?php echo $moment['id']; ?>, this)">
                                            查看全部 <?php echo $total_comments; ?> 条评论
                                        </div>
                                    <?php endif; ?>
                                <?php endif; ?>
                                <div class="comment-input-area" data-moment-id="<?php echo $moment['id']; ?>">
                                    <textarea placeholder="写下你的评论..." maxlength="500"></textarea>
                                    <button class="comment-submit-btn">发送</button>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
                <div class="footer-tip"><i class="fas fa-minus" style="opacity:0.3; margin-right: 8px;"></i> 没有更多动态 <i class="fas fa-minus" style="opacity:0.3; margin-left: 8px;"></i></div>
            </div>
        </main>
    </div>
    <div id="modalOverlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:999999; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
        <div style="background:#fff; border-radius:16px; padding:24px 28px; max-width:380px; width:90%; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="text-align:center; margin-bottom:16px;">
                <div id="modalIcon" style="font-size:40px; margin-bottom:8px;"></div>
                <div id="modalTitle" style="font-size:17px; font-weight:600; color:#1c1c1e;"></div>
                <div id="modalMessage" style="font-size:14px; color:#6c6c72; margin-top:4px; line-height:1.6; word-break:break-word;"></div>
            </div>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="modalCancelBtn" style="padding:8px 24px; border:none; border-radius:30px; font-size:14px; font-weight:500; background:#f0f2f5; color:#3a3a40; cursor:pointer; display:none;">取消</button>
                <button id="modalConfirmBtn" style="padding:8px 24px; border:none; border-radius:30px; font-size:14px; font-weight:500; background:#409eff; color:#fff; cursor:pointer;">确定</button>
            </div>
        </div>
    </div>
    <script src="/ast/console.js"></script>
    <script>
        const newfuckingao = new ConsoleDetector();
        newfuckingao.startDetection();
        console.log = function() {};
        console.info = function() {};
        console.warn = function() {};
        console.error = function() {};
        let csrfToken = '<?php echo $csrf_token; ?>';

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        const Modal = {
            _overlay: document.getElementById('modalOverlay'),
            _icon: document.getElementById('modalIcon'),
            _title: document.getElementById('modalTitle'),
            _message: document.getElementById('modalMessage'),
            _confirmBtn: document.getElementById('modalConfirmBtn'),
            _cancelBtn: document.getElementById('modalCancelBtn'),
            _resolve: null,

            show(opts) {
                return new Promise((resolve) => {
                    this._resolve = resolve;
                    this._icon.textContent = opts.icon || '💡';
                    this._icon.style.display = opts.icon ? '' : 'none';
                    this._title.textContent = opts.title || '提示';
                    this._message.textContent = opts.message || '';
                    this._confirmBtn.textContent = opts.confirmText || '确定';
                    this._cancelBtn.textContent = opts.cancelText || '取消';
                    this._cancelBtn.style.display = opts.showCancel ? '' : 'none';
                    this._overlay.style.display = 'flex';
                    this._confirmBtn.onclick = () => {
                        this.hide();
                        resolve(true);
                    };
                    this._cancelBtn.onclick = () => {
                        this.hide();
                        resolve(false);
                    };
                });
            },

            hide() {
                this._overlay.style.display = 'none';
            },

            alert(msg, title = '提示') {
                return this.show({
                    icon: '💡',
                    title,
                    message: msg
                });
            },

            confirm(msg, title = '确认') {
                return this.show({
                    icon: '❓',
                    title,
                    message: msg,
                    confirmText: '确定',
                    cancelText: '取消',
                    showCancel: true
                });
            },

            success(msg, title = '成功') {
                return this.show({
                    icon: '✅',
                    title,
                    message: msg
                });
            },

            error(msg, title = '错误') {
                return this.show({
                    icon: '❌',
                    title,
                    message: msg
                });
            }
        };
        (function() {
            function loadImage(wrapper) {
                const img = wrapper.querySelector('.moment-image');
                const src = wrapper.dataset.src;
                const loading = wrapper.querySelector('.image-loading');
                const error = wrapper.querySelector('.image-error');
                if (!src || !img) return;
                if (img.dataset.loaded === 'true' || img.dataset.loading === 'true') return;
                if (loading) {
                    loading.style.display = 'flex';
                    loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>加载中...</span>';
                }
                if (error) error.style.display = 'none';
                wrapper.classList.remove('loaded', 'error');

                img.dataset.loading = 'true';

                const tempImg = new Image();
                tempImg.crossOrigin = 'anonymous';

                tempImg.onload = function() {
                    img.src = src;
                    img.style.display = 'block';
                    img.dataset.loaded = 'true';
                    img.dataset.loading = 'false';

                    if (loading) loading.style.display = 'none';
                    if (error) error.style.display = 'none';
                    wrapper.classList.add('loaded');
                };

                tempImg.onerror = function() {
                    img.dataset.loading = 'false';

                    if (loading) loading.style.display = 'none';
                    if (error) {
                        error.style.display = 'flex';
                        wrapper.classList.add('error');
                    }

                    let retryCount = parseInt(wrapper.dataset.retryCount || '0');
                    if (retryCount < 2) {
                        wrapper.dataset.retryCount = retryCount + 1;
                        if (loading) {
                            loading.style.display = 'flex';
                            loading.innerHTML = `
                    <i class="fas fa-sync fa-spin"></i>
                    <span>重试中 (${retryCount + 1}/2)...</span>
                `;
                        }
                        setTimeout(() => {
                            loadImage(wrapper);
                        }, 1500 * (retryCount + 1));
                    }
                };

                tempImg.src = src;
            }

            function initImageLoading() {
                const wrappers = document.querySelectorAll('.moment-image-wrapper:not(.initialized)');

                wrappers.forEach(wrapper => {
                    wrapper.classList.add('initialized');
                    const loading = wrapper.querySelector('.image-loading');
                    if (loading) {
                        loading.style.display = 'flex';
                        loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>加载中...</span>';
                    }
                    const error = wrapper.querySelector('.image-error');
                    if (error) error.style.display = 'none';
                    wrapper.classList.remove('loaded', 'error');
                    const img = wrapper.querySelector('.moment-image');
                    if (img) img.style.display = 'none';

                    if ('IntersectionObserver' in window) {
                        const observer = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                if (entry.isIntersecting) {
                                    loadImage(wrapper);
                                    observer.unobserve(wrapper);
                                }
                            });
                        }, {
                            rootMargin: '200px'
                        });
                        observer.observe(wrapper);
                    } else {
                        loadImage(wrapper);
                    }
                });
            }
            initImageLoading();
            const observer = new MutationObserver(() => {
                initImageLoading();
            });
            const feedScroll = document.querySelector('.feed-scroll');
            if (feedScroll) {
                observer.observe(feedScroll, {
                    childList: true,
                    subtree: true
                });
            }
        })();
        (function() {
            const currentUserId = '<?php echo $current_user_id; ?>';

            function getLikedIds() {
                const ids = new Set();
                document.querySelectorAll('.like-btn.liked').forEach(btn => {
                    ids.add(parseInt(btn.dataset.momentId));
                });
                return ids;
            }

            function getCommentedIds() {
                const ids = new Set();
                document.querySelectorAll('.comment-item[data-user-id="' + currentUserId + '"]').forEach(el => {
                    const feedItem = el.closest('.feed-item');
                    if (feedItem) ids.add(parseInt(feedItem.dataset.momentId));
                });
                return ids;
            }

            function applyFilter(filter) {
                const items = document.querySelectorAll('.feed-item');
                const noMoments = document.querySelector('.no-moments');
                let visible = 0;
                const likedIds = (filter === 'liked' || filter === 'recommended') ? getLikedIds() : new Set();
                const commentedIds = (filter === 'commented' || filter === 'recommended') ? getCommentedIds() : new Set();
                items.forEach(item => {
                    const userId = item.dataset.userId;
                    const momentId = parseInt(item.dataset.momentId);
                    let show = false;

                    switch (filter) {
                        case 'all':
                            show = true;
                            break;
                        case 'liked':
                            show = likedIds.has(momentId);
                            break;
                        case 'commented':
                            show = commentedIds.has(momentId);
                            break;
                        case 'image':
                            const imageWrappers = item.querySelectorAll('.moment-image-wrapper');
                            show = imageWrappers.length > 0;
                            break;
                        case 'friends':
                            show = userId !== currentUserId;
                            break;
                        case 'recommended':
                            const likeCnt = parseInt(item.querySelector('.like-btn .count')?.textContent || 0);
                            const cmtCnt = parseInt(item.querySelector('.comment-btn .count')?.textContent || 0);
                            show = userId !== currentUserId && !likedIds.has(momentId) && !commentedIds.has(momentId) && (likeCnt > 3 || cmtCnt > 2);
                            break;
                    }

                    item.style.display = show ? '' : 'none';
                    if (show) visible++;
                });
                document.querySelectorAll('.sidebar-menu-item[data-filter]').forEach(el => {
                    el.classList.toggle('active', el.dataset.filter === filter);
                });
                if (noMoments) {
                    if (items.length === 0 || visible === 0) {
                        noMoments.style.display = 'block';
                        const msgs = {
                            'liked': '还没有赞过的动态',
                            'commented': '还没有评论过的动态',
                            'friends': '好友还没有发布动态',
                            'recommended': '暂无推荐内容'
                        };
                        const p = noMoments.querySelector('p');
                        if (p && msgs[filter]) p.textContent = msgs[filter];
                    } else {
                        noMoments.style.display = 'none';
                    }
                }
            }
            document.querySelectorAll('.sidebar-menu-item[data-filter]').forEach(item => {
                item.addEventListener('click', function() {
                    applyFilter(this.dataset.filter);
                });
            });

            applyFilter('all');
        })();
        (function() {
            const overlay = document.getElementById('publishOverlay');
            const contentTextarea = document.getElementById('publishContent');
            const submitBtn = document.getElementById('submitPublishBtn');
            const closeBtn = document.getElementById('closePublishBtn');
            const publishBtn = document.getElementById('publishBtn');
            const publishIcon = document.getElementById('publishIcon');
            const charCount = document.getElementById('charCount');
            const locationInput = document.getElementById('publishLocation');
            const visibilitySelect = document.getElementById('publishVisibility');
            const feedScroll = document.querySelector('.feed-scroll');
            const MAX_CHARS = 5000;

            function openPublish() {
                overlay.classList.add('active');
                contentTextarea.focus();
                feedScroll.dataset.scrollPos = feedScroll.scrollTop;
            }

            function closePublish() {
                overlay.classList.remove('active');
                contentTextarea.value = '';
                charCount.textContent = '0 / ' + MAX_CHARS;
                locationInput.value = '';
                visibilitySelect.value = '1';
                submitBtn.disabled = false;
                submitBtn.textContent = '发布';
                if (feedScroll.dataset.scrollPos) {
                    feedScroll.scrollTop = parseInt(feedScroll.dataset.scrollPos);
                }
            }

            function updateCharCount() {
                const len = contentTextarea.value.length;
                charCount.textContent = len + ' / ' + MAX_CHARS;
                charCount.className = 'publish-char-count';
                if (len > MAX_CHARS * 0.9) {
                    charCount.classList.add('warning');
                }
                if (len > MAX_CHARS) {
                    charCount.classList.add('danger');
                }
            }

            async function submitPublish() {
                const content = contentTextarea.value.trim();
                if (!content) {
                    await Modal.alert('请输入内容');
                    contentTextarea.focus();
                    return;
                }
                if (content.length > MAX_CHARS) {
                    await Modal.alert('内容不能超过 ' + MAX_CHARS + ' 字');
                    contentTextarea.focus();
                    return;
                }
                submitBtn.disabled = true;
                submitBtn.textContent = '发布中...';
                const formData = new FormData();
                formData.append('action', 'publish_moment');
                formData.append('content', content);
                formData.append('visibility', visibilitySelect.value);
                formData.append('location', locationInput.value.trim());
                formData.append('csrf_token', csrfToken);

                try {
                    const response = await fetch(window.location.href, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.success) {
                        if (data.new_csrf_token) csrfToken = data.new_csrf_token;
                        await Modal.success('发布成功！');
                        location.reload();
                    } else {
                        await Modal.error(data.message || '发布失败，请稍后重试');
                        submitBtn.disabled = false;
                        submitBtn.textContent = '发布';
                    }
                } catch (err) {
                    await Modal.error('网络错误，请稍后重试');
                    submitBtn.disabled = false;
                    submitBtn.textContent = '发布';
                }
            }

            if (publishBtn) publishBtn.addEventListener('click', openPublish);
            if (publishIcon) publishIcon.addEventListener('click', openPublish);
            closeBtn.addEventListener('click', closePublish);
            submitBtn.addEventListener('click', submitPublish);
            contentTextarea.addEventListener('input', updateCharCount);
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) closePublish();
            });
            window.closePublishMoment = closePublish;
        })();
        (function() {
            document.querySelectorAll('.like-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const momentId = this.dataset.momentId;
                    const countSpan = this.querySelector('.count');
                    const icon = this.querySelector('i');
                    if (this.dataset.loading === 'true') return;
                    this.dataset.loading = 'true';
                    const formData = new FormData();
                    formData.append('action', 'like_moment');
                    formData.append('moment_id', momentId);
                    formData.append('csrf_token', csrfToken);
                    try {
                        const response = await fetch(window.location.href, {
                            method: 'POST',
                            body: formData
                        });
                        const data = await response.json();
                        if (data.success) {
                            if (data.new_csrf_token) csrfToken = data.new_csrf_token;
                            countSpan.textContent = data.like_count;
                            if (data.liked) {
                                this.classList.add('liked');
                                icon.className = 'fas fa-heart';
                                icon.style.animation = 'none';
                                setTimeout(() => icon.style.animation = 'likeAnim 0.3s ease', 10);
                            } else {
                                this.classList.remove('liked');
                                icon.className = 'far fa-heart';
                            }
                        } else {
                            await Modal.error(data.message || '操作失败');
                        }
                    } catch (err) {
                        await Modal.error('网络错误，请稍后重试');
                    }
                    this.dataset.loading = 'false';
                });
            });
        })();
        (function() {
            document.querySelectorAll('.comment-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const momentId = this.dataset.momentId;
                    const inputArea = document.querySelector(`.comment-input-area[data-moment-id="${momentId}"]`);
                    if (inputArea) {
                        inputArea.classList.toggle('active');
                        if (inputArea.classList.contains('active')) {
                            const textarea = inputArea.querySelector('textarea');
                            setTimeout(() => textarea.focus(), 100);
                        }
                    }
                });
            });

            document.addEventListener('click', async function(e) {
                if (e.target.closest('.comment-reply-btn')) {
                    const btn = e.target.closest('.comment-reply-btn');
                    const commentId = btn.dataset.commentId;
                    const userName = btn.dataset.userName;
                    const feedItem = btn.closest('.feed-item');
                    const momentId = feedItem.dataset.momentId;
                    const inputArea = feedItem.querySelector('.comment-input-area');
                    const textarea = inputArea.querySelector('textarea');
                    inputArea.classList.add('active');
                    textarea.focus();
                    textarea.placeholder = '回复 @' + userName + '...';
                    inputArea.dataset.replyTo = commentId;
                    inputArea.dataset.replyUserName = userName;
                }
                const deleteBtn = e.target.closest('.comment-delete-btn');
                if (deleteBtn) {
                    e.stopPropagation();
                    const commentId = deleteBtn.dataset.commentId;
                    const momentId = deleteBtn.dataset.momentId;
                    const confirmed = await Modal.confirm('确定要删除这条评论吗？', '删除评论');
                    if (!confirmed) return;
                    const formData = new FormData();
                    formData.append('action', 'delete_comment');
                    formData.append('comment_id', commentId);
                    formData.append('csrf_token', csrfToken);

                    try {
                        const response = await fetch(window.location.href, {
                            method: 'POST',
                            body: formData
                        });
                        const data = await response.json();
                        if (data.success) {
                            if (data.new_csrf_token) csrfToken = data.new_csrf_token;
                            const feedItem = document.querySelector(`.feed-item[data-moment-id="${momentId}"]`);
                            if (feedItem) {
                                const countSpan = feedItem.querySelector('.comment-btn .count');
                                if (countSpan) {
                                    countSpan.textContent = data.comment_count;
                                }
                            }
                            const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
                            if (commentItem) {
                                const parentContainer = commentItem.parentElement;
                                const childrenContainer = parentContainer.querySelector('.comment-children');

                                if (childrenContainer && childrenContainer.previousElementSibling === commentItem) {
                                    childrenContainer.remove();
                                }
                                commentItem.remove();
                            }

                            await Modal.success('评论已删除');
                        } else {
                            await Modal.error(data.message || '删除失败');
                        }
                    } catch (err) {
                        await Modal.error('网络错误，请稍后重试');
                    }
                }
            });
            document.querySelectorAll('.comment-submit-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const inputArea = this.closest('.comment-input-area');
                    const momentId = inputArea.dataset.momentId;
                    const textarea = inputArea.querySelector('textarea');
                    const content = textarea.value.trim();
                    const replyTo = inputArea.dataset.replyTo || 0;
                    if (!content) {
                        await Modal.alert('请输入评论内容');
                        textarea.focus();
                        return;
                    }
                    if (content.length > 500) {
                        await Modal.alert('评论不能超过500字');
                        textarea.focus();
                        return;
                    }

                    this.disabled = true;
                    this.textContent = '发送中...';
                    const formData = new FormData();
                    formData.append('action', 'comment_moment');
                    formData.append('moment_id', momentId);
                    formData.append('content', content);
                    formData.append('reply_to', replyTo);
                    formData.append('csrf_token', csrfToken);
                    const response = await fetch(window.location.href, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.success) {
                        if (data.new_csrf_token) csrfToken = data.new_csrf_token;
                        const feedItem = document.querySelector(`.feed-item[data-moment-id="${momentId}"]`);
                        if (feedItem) {
                            const countSpan = feedItem.querySelector('.comment-btn .count');
                            if (countSpan) {
                                const current = parseInt(countSpan.textContent) || 0;
                                countSpan.textContent = current + 1;
                            }
                            let commentSection = feedItem.querySelector('.comment-section');
                            if (!commentSection) {
                                commentSection = document.createElement('div');
                                commentSection.className = 'comment-section';
                                commentSection.dataset.momentId = momentId;
                                const feedActions = feedItem.querySelector('.feed-actions');
                                if (feedActions) {
                                    feedActions.after(commentSection);
                                } else {
                                    feedItem.appendChild(commentSection);
                                }
                            }
                            const newComment = document.createElement('div');
                            newComment.className = 'comment-item';
                            let contentHtml = escapeHtml(data.raw_content || content);
                            if (data.reply_to > 0 && data.reply_user_name) {
                                contentHtml = '<span class="reply-mention">@' + escapeHtml(data.reply_user_name) + '</span> ' + contentHtml;
                            }

                            newComment.innerHTML = `
                        <span class="comment-name">${escapeHtml(data.user_name || '我')}：</span>
                        <span class="comment-content">${contentHtml}</span>
                        <span class="comment-reply-btn" data-comment-id="${data.comment_id}" data-user-name="${escapeHtml(data.user_name || '我')}">
                            <i class="fas fa-reply"></i> 回复
                        </span>
                    `;
                            const inputAreaInSection = commentSection.querySelector('.comment-input-area');
                            const firstComment = commentSection.querySelector('.comment-item');
                            if (firstComment) {
                                commentSection.insertBefore(newComment, firstComment);
                            } else if (inputAreaInSection) {
                                commentSection.insertBefore(newComment, inputAreaInSection);
                            } else {
                                commentSection.appendChild(newComment);
                            }
                            const more = commentSection.querySelector('.comment-more');
                            if (more) more.remove();
                        }
                        textarea.value = '';
                        textarea.placeholder = '写下你的评论...';
                        inputArea.dataset.replyTo = 0;
                        inputArea.dataset.replyUserName = '';
                        inputArea.classList.remove('active');
                        await Modal.success('评论成功');
                    } else {
                        await Modal.error(data.message || '评论失败');
                    }

                    this.disabled = false;
                    this.textContent = '发送';
                });
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    document.querySelectorAll('.comment-input-area.active').forEach(area => {
                        const textarea = area.querySelector('textarea');
                        textarea.placeholder = '写下你的评论...';
                        area.dataset.replyTo = 0;
                        area.dataset.replyUserName = '';
                        area.classList.remove('active');
                    });
                }
            });
            document.querySelectorAll('.comment-input-area textarea').forEach(textarea => {
                textarea.addEventListener('keydown', function(e) {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        const btn = this.closest('.comment-input-area').querySelector('.comment-submit-btn');
                        if (btn) btn.click();
                    }
                });
            });
        })();

        async function loadMoreComments(momentId, element) {
            const feedItem = element.closest('.feed-item');
            const commentSection = feedItem.querySelector('.comment-section');
            const originalText = element.innerHTML;
            element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
            element.style.pointerEvents = 'none';
            const formData = new FormData();
            formData.append('action', 'get_all_comments');
            formData.append('moment_id', momentId);
            formData.append('csrf_token', csrfToken);

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    const inputArea = commentSection.querySelector('.comment-input-area');
                    const moreElement = commentSection.querySelector('.comment-more');
                    commentSection.querySelectorAll('.comment-item').forEach(el => el.remove());
                    commentSection.querySelectorAll('.comment-children').forEach(el => el.remove());
                    if (data.comments && data.comments.length > 0) {
                        renderCommentsTree(commentSection, data.comments);
                    }
                    if (!commentSection.querySelector('.comment-input-area')) {
                        commentSection.appendChild(inputArea);
                    }
                    if (moreElement) moreElement.remove();
                    const collapseBtn = document.createElement('div');
                    collapseBtn.className = 'comment-more';
                    collapseBtn.style.cursor = 'pointer';
                    collapseBtn.style.color = '#8e8e93';
                    collapseBtn.style.fontSize = '13px';
                    collapseBtn.style.padding = '4px 0';
                    collapseBtn.innerHTML = '<i class="fas fa-chevron-up"></i> 收起评论';
                    collapseBtn.onclick = function() {
                        const allComments = commentSection.querySelectorAll('.comment-item');
                        const childrenDivs = commentSection.querySelectorAll('.comment-children');
                        allComments.forEach((el, index) => {
                            if (index >= 3) {
                                el.style.display = 'none';
                            } else {
                                el.style.display = '';
                            }
                        });
                        childrenDivs.forEach(el => {
                            const parentItem = el.closest('.comment-item');
                            if (parentItem && parentItem.style.display === 'none') {
                                el.style.display = 'none';
                            } else {
                                el.style.display = '';
                            }
                        });
                        const showMoreBtn = document.createElement('div');
                        showMoreBtn.className = 'comment-more';
                        showMoreBtn.dataset.momentId = momentId;
                        showMoreBtn.style.cursor = 'pointer';
                        showMoreBtn.style.color = '#8e8e93';
                        showMoreBtn.style.fontSize = '13px';
                        showMoreBtn.style.padding = '4px 0';
                        showMoreBtn.innerHTML = '<i class="fas fa-chevron-down"></i> 查看全部 ' + data.comments.length + ' 条评论';
                        showMoreBtn.onclick = function() {
                            loadMoreComments(momentId, this);
                        };
                        const oldMore = commentSection.querySelector('.comment-more');
                        if (oldMore) oldMore.remove();
                        const inputArea2 = commentSection.querySelector('.comment-input-area');
                        if (inputArea2) {
                            commentSection.insertBefore(showMoreBtn, inputArea2);
                        } else {
                            commentSection.appendChild(showMoreBtn);
                        }

                        this.remove();
                    };
                    const inputArea2 = commentSection.querySelector('.comment-input-area');
                    if (inputArea2) {
                        commentSection.insertBefore(collapseBtn, inputArea2);
                    } else {
                        commentSection.appendChild(collapseBtn);
                    }

                } else {
                    await Modal.error(data.message || '加载失败');
                    element.innerHTML = originalText;
                    element.style.pointerEvents = '';
                }
            } catch (err) {
                await Modal.error('网络错误，请稍后重试');
                element.innerHTML = originalText;
                element.style.pointerEvents = '';
            }
        }

        function renderCommentsTree(container, comments, level = 0) {
            const currentUserId = '<?php echo $current_user_id; ?>';

            comments.forEach(comment => {
                const div = document.createElement('div');
                div.className = 'comment-item';
                div.dataset.commentId = comment.id;
                div.dataset.userId = comment.user_id;

                let contentHtml = escapeHtml(comment.content);
                if (comment.reply_to > 0 && comment.reply_user_name) {
                    contentHtml = '<span class="reply-mention">@' + escapeHtml(comment.reply_user_name) + '</span> ' + contentHtml;
                }

                let deleteHtml = '';
                if (comment.user_id === currentUserId) {
                    deleteHtml = `<span class="comment-delete-btn" data-comment-id="${comment.id}" data-moment-id="${comment.moment_id || ''}">
                <i class="fas fa-trash-alt"></i>
            </span>`;
                }

                div.innerHTML = `
            <span class="comment-name">${escapeHtml(comment.user_name)}：</span>
            <span class="comment-content">${contentHtml}</span>
            <span class="comment-reply-btn" data-comment-id="${comment.id}" data-user-name="${escapeHtml(comment.user_name)}">
                <i class="fas fa-reply"></i> 回复
            </span>
            ${deleteHtml}
        `;

                container.appendChild(div);

                if (comment.children && comment.children.length > 0) {
                    const childrenContainer = document.createElement('div');
                    childrenContainer.className = 'comment-children';
                    childrenContainer.style.paddingLeft = '20px';
                    childrenContainer.style.borderLeft = '2px solid #e8ecf0';
                    childrenContainer.style.marginLeft = '8px';
                    renderCommentsTree(childrenContainer, comment.children, level + 1);
                    container.appendChild(childrenContainer);
                }
            });
        }
        (function() {
            document.querySelectorAll('.action-more').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const momentId = this.dataset.momentId;
                    const dropdown = document.querySelector(`.more-dropdown[data-moment-id="${momentId}"]`);
                    document.querySelectorAll('.more-dropdown.active').forEach(d => {
                        if (d !== dropdown) d.classList.remove('active');
                    });
                    dropdown.classList.toggle('active');
                });
            });

            document.addEventListener('click', function() {
                document.querySelectorAll('.more-dropdown.active').forEach(d => d.classList.remove('active'));
                document.querySelectorAll('.visibility-submenu.active').forEach(s => s.classList.remove('active'));
            });
            document.querySelectorAll('.has-submenu').forEach(item => {
                item.addEventListener('mouseenter', function() {
                    const submenu = this.querySelector('.visibility-submenu');
                    if (submenu) {
                        document.querySelectorAll('.visibility-submenu.active').forEach(s => {
                            if (s !== submenu) s.classList.remove('active');
                        });
                        submenu.classList.add('active');
                    }
                });
                item.addEventListener('mouseleave', function(e) {
                    const submenu = this.querySelector('.visibility-submenu');
                    if (submenu) {
                        setTimeout(() => submenu.classList.remove('active'), 200);
                    }
                });
            });

            document.querySelectorAll('.visibility-submenu').forEach(sub => {
                sub.addEventListener('mouseenter', function() {
                    this.classList.add('active');
                });
                sub.addEventListener('mouseleave', function() {
                    this.classList.remove('active');
                });
            });
            document.querySelectorAll('.dropdown-item[data-action="delete"]').forEach(item => {
                item.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    const dropdown = this.closest('.more-dropdown');
                    const momentId = dropdown.dataset.momentId;
                    const confirmed = await Modal.confirm('确定要删除这条动态吗？', '删除确认');
                    if (!confirmed) return;

                    const formData = new FormData();
                    formData.append('action', 'delete_moment');
                    formData.append('moment_id', momentId);
                    formData.append('csrf_token', csrfToken);

                    try {
                        const response = await fetch(window.location.href, {
                            method: 'POST',
                            body: formData
                        });
                        const data = await response.json();
                        if (data.success) {
                            if (data.new_csrf_token) csrfToken = data.new_csrf_token;
                            const feedItem = document.querySelector(`.feed-item[data-moment-id="${momentId}"]`);
                            if (feedItem) {
                                feedItem.classList.add('deleting');
                                setTimeout(() => feedItem.remove(), 300);
                            }
                            await Modal.success('删除成功');
                        } else {
                            await Modal.error(data.message || '删除失败');
                        }
                    } catch (err) {
                        await Modal.error('网络错误，请稍后重试');
                    }
                });
            });
            document.querySelectorAll('.visibility-submenu .dropdown-item').forEach(item => {
                item.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    const visibility = this.dataset.visibility;
                    const submenu = this.closest('.visibility-submenu');
                    const hasSubmenu = submenu.closest('.has-submenu');
                    const dropdown = hasSubmenu.closest('.more-dropdown');
                    const momentId = dropdown.dataset.momentId;

                    const visibilityMap = {
                        '1': '公开',
                        '2': '好友可见',
                        '3': '仅自己'
                    };

                    const confirmed = await Modal.confirm(`确定要将权限修改为「${visibilityMap[visibility]}」吗？`, '修改权限');
                    if (!confirmed) return;

                    const formData = new FormData();
                    formData.append('action', 'update_visibility');
                    formData.append('moment_id', momentId);
                    formData.append('visibility', visibility);
                    formData.append('csrf_token', csrfToken);

                    try {
                        const response = await fetch(window.location.href, {
                            method: 'POST',
                            body: formData
                        });
                        const data = await response.json();
                        if (data.success) {
                            if (data.new_csrf_token) csrfToken = data.new_csrf_token;
                            const feedItem = document.querySelector(`.feed-item[data-moment-id="${momentId}"]`);
                            if (feedItem) {
                                const timeSpan = feedItem.querySelector('.feed-time');
                                const existingVis = timeSpan.querySelector('.moment-visibility');
                                if (existingVis) existingVis.remove();
                                if (visibility !== '1') {
                                    const visSpan = document.createElement('span');
                                    visSpan.className = 'moment-visibility';
                                    const iconMap = {
                                        '2': 'fa-user-friends',
                                        '3': 'fa-lock'
                                    };
                                    visSpan.innerHTML = `<i class="fas ${iconMap[visibility]}"></i>`;
                                    timeSpan.appendChild(visSpan);
                                }
                            }
                            await Modal.success('权限修改成功');
                        } else {
                            await Modal.error(data.message || '修改失败');
                        }
                    } catch (err) {
                        await Modal.error('网络错误，请稍后重试');
                    }
                });
            });
        })();
        window.alert = Modal.alert;
        window.confirm = Modal.confirm;
    </script>
</body>

</html>