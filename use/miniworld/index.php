<?php
$u = isset($_GET['u']) ? trim($_GET['u']) : '';
$uu = isset($_GET['uu']) ? trim($_GET['uu']) : '';
$un = isset($_GET['un']) ? trim($_GET['un']) : '';
$conv = isset($_GET['conv']) ? trim($_GET['conv']) : '';
if ($u === '' || $uu === '' || $un === '' || $conv === '') {
  die('参数不能为空');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php');
$qx_max_tmp1 = true;
$q_suname = null;
$tcodelogins = $_COOKIE[generateAutoWebsiteIdentifier((true)) . "_log"] ?? 'null';
if ($tcodelogins == 'null') {
  $qx_max_tmp1 = false;
} else {
  require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
  $decodeers = new TmdbaseauthdownyhoDecrypt(60000 * 60 * 2); //2h验证
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
if (!$qx_max_tmp1 || $q_suname != $u) {
  mokim_ttl_elegant_exit(
    '您当前未登录<a href="/use/user/">Click Me</a>',
    null,
    'error'
  );
}
session_start();
if (empty($_SESSION['csrf_token'])) {
  $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];
$docRoot = isset($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] : '';
if ($docRoot === '') {
  mokim_ttl_elegant_exit(
    '服务器配置异常',
    null,
    'error'
  );
}
$commonPath = $docRoot . '/cofd/common.php';
require_once($commonPath);
if (!isset($conn) || !$conn instanceof mysqli) {
  mokim_ttl_elegant_exit(
    '数据库连接异常',
    null,
    'error'
  );
}
$conn->set_charset("utf8mb4");
if (YhMokTTisWithin180s()) {
  mokim_ttl_elegant_exit(
    '登录凭证将在约3分钟内过期,为保证数据安全和您的使用体验,此操作已被拦截',
    function () use ($conn) {
      $conn->close();
    },
    'error'
  );
}
$treehole_post_result = null;
$toast_message = '';
$toast_type = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $action = isset($_POST['action']) ? $_POST['action'] : '';
  if ($action === 'update_alias') {
    $postCsrf = isset($_POST['csrf_token']) ? $_POST['csrf_token'] : '';
    if ($postCsrf !== $_SESSION['csrf_token']) {
      $_SESSION['toast_msg'] = 'CSRF 验证失败';
      $_SESSION['toast_type'] = 'error';
    } else {
      $post_user = isset($_POST['user_id']) ? trim($_POST['user_id']) : '';
      $post_target = isset($_POST['target_id']) ? trim($_POST['target_id']) : '';
      $post_alias = isset($_POST['alias']) ? trim($_POST['alias']) : '';
      if ($post_user !== $u || $post_target !== $uu) {
        $_SESSION['toast_msg'] = '权限不足';
        $_SESSION['toast_type'] = 'error';
      } elseif (empty($post_alias) || mb_strlen($post_alias, 'UTF-8') > 5) {
        $_SESSION['toast_msg'] = '称呼不能为空且不能超过5个字符';
        $_SESSION['toast_type'] = 'error';
      } else {
        $stmt = null;
        try {
          $check_stmt = $conn->prepare("SELECT `value` FROM mok_intimacy WHERE user_id = ? AND target_id = ?");
          if ($check_stmt === false) {
            throw new Exception('预处理失败：' . $conn->error);
          }
          $check_stmt->bind_param("ss", $post_user, $post_target);
          $check_stmt->execute();
          $check_result = $check_stmt->get_result();
          $row = $check_result->fetch_assoc();
          $check_stmt->close();
          $intimacy_value = isset($row['value']) ? intval($row['value']) : 0;
          if ($intimacy_value < 500) {
            throw new Exception('亲密度达到500以上才能修改关系称呼');
          }
          $stmt = $conn->prepare("UPDATE mok_intimacy SET alias = ? WHERE user_id = ? AND target_id = ?");
          if ($stmt === false) {
            throw new Exception('预处理失败：' . $conn->error);
          }
          $stmt->bind_param("sss", $post_alias, $post_user, $post_target);

          if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
              $_SESSION['toast_msg'] = '关系称呼已更新为：' . htmlspecialchars($post_alias);
              $_SESSION['toast_type'] = 'success';
            } else {
              $stmt->close();
              $stmt = $conn->prepare("INSERT INTO mok_intimacy (user_id, target_id, alias, `value`) VALUES (?, ?, ?, ?)");
              $default_value = 0;
              $stmt->bind_param("sssi", $post_user, $post_target, $post_alias, $default_value);
              if ($stmt->execute()) {
                $_SESSION['toast_msg'] = '关系称呼已设置为：' . htmlspecialchars($post_alias);
                $_SESSION['toast_type'] = 'success';
              } else {
                throw new Exception('保存失败：' . $stmt->error);
              }
            }
          } else {
            throw new Exception('执行失败：' . $stmt->error);
          }
        } catch (Exception $e) {
          $_SESSION['toast_msg'] = '更新失败：' . $e->getMessage();
          $_SESSION['toast_type'] = 'error';
        } finally {
          if ($stmt !== null) {
            $stmt->close();
          }
        }
      }
    }
    $redirect_url = $_SERVER['REQUEST_URI'];
    header('Location: ' . $redirect_url);
    exit();
  }
  if ($action === 'delete_treehole') {
    $postCsrf = isset($_POST['csrf_token']) ? $_POST['csrf_token'] : '';
    if ($postCsrf !== $_SESSION['csrf_token']) {
      $_SESSION['toast_msg'] = 'CSRF 验证失败';
      $_SESSION['toast_type'] = 'error';
    } else {
      $delete_id = isset($_POST['delete_id']) ? intval($_POST['delete_id']) : 0;
      $delete_user = isset($_POST['user_id']) ? trim($_POST['user_id']) : '';

      if ($delete_id <= 0 || $delete_user === '') {
        $_SESSION['toast_msg'] = '参数错误';
        $_SESSION['toast_type'] = 'error';
      } else {
        $stmt = null;
        try {
          $check_stmt = $conn->prepare("SELECT user_id FROM mok_smallworld_treehole WHERE id = ?");
          if ($check_stmt === false) {
            throw new Exception('预处理失败：' . $conn->error);
          }
          $check_stmt->bind_param("i", $delete_id);
          $check_stmt->execute();
          $check_result = $check_stmt->get_result();
          $row = $check_result->fetch_assoc();
          $check_stmt->close();

          if (!$row || $row['user_id'] !== $delete_user) {
            throw new Exception('您没有权限删除此留言');
          }

          $stmt = $conn->prepare("DELETE FROM mok_smallworld_treehole WHERE id = ? AND user_id = ?");
          if ($stmt === false) {
            throw new Exception('预处理失败：' . $conn->error);
          }
          $stmt->bind_param("is", $delete_id, $delete_user);
          if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
              $_SESSION['toast_msg'] = '留言已删除';
              $_SESSION['toast_type'] = 'success';
            } else {
              throw new Exception('留言不存在或已被删除');
            }
          } else {
            throw new Exception('执行失败：' . $stmt->error);
          }
        } catch (Exception $e) {
          $_SESSION['toast_msg'] = '删除失败：' . $e->getMessage();
          $_SESSION['toast_type'] = 'error';
        } finally {
          if ($stmt !== null) {
            $stmt->close();
          }
        }
      }
    }
    $redirect_url = $_SERVER['REQUEST_URI'];
    header('Location: ' . $redirect_url);
    exit();
  }

  if ($action === 'add_treehole') {
    $postCsrf = isset($_POST['csrf_token']) ? $_POST['csrf_token'] : '';
    if ($postCsrf !== $_SESSION['csrf_token']) {
      $_SESSION['toast_msg'] = 'CSRF 验证失败';
      $_SESSION['toast_type'] = 'error';
    } else {
      $post_user = isset($_POST['user_id']) ? trim($_POST['user_id']) : '';
      $post_target = isset($_POST['target_id']) ? trim($_POST['target_id']) : '';
      $post_content = isset($_POST['content']) ? trim($_POST['content']) : '';
      $post_mood = isset($_POST['mood_icon']) ? trim($_POST['mood_icon']) : '💬';
      $errors = [];
      if ($post_user === '') $errors[] = '用户ID不能为空';
      if ($post_target === '') $errors[] = '目标ID不能为空';
      if ($post_content === '') $errors[] = '内容不能为空';
      if ($post_content !== '' && mb_strlen($post_content, 'UTF-8') > 500) {
        $errors[] = '内容不能超过500字符';
      }
      if (!empty($errors)) {
        $_SESSION['toast_msg'] = implode('；', $errors);
        $_SESSION['toast_type'] = 'error';
      } else {
        $stmt = null;
        try {
          $stmt = $conn->prepare("INSERT INTO mok_smallworld_treehole (user_id, target_id, content, mood_icon, create_time) VALUES (?, ?, ?, ?, NOW())");
          if ($stmt === false) {
            throw new Exception('预处理失败：' . $conn->error);
          }
          $stmt->bind_param("ssss", $post_user, $post_target, $post_content, $post_mood);
          if ($stmt->execute()) {
            $_SESSION['toast_msg'] = '留言发送成功';
            $_SESSION['toast_type'] = 'success';
          } else {
            throw new Exception('执行失败：' . $stmt->error);
          }
        } catch (Exception $e) {
          $_SESSION['toast_msg'] = '数据库错误：' . $e->getMessage();
          $_SESSION['toast_type'] = 'error';
        } finally {
          if ($stmt !== null) {
            $stmt->close();
          }
        }
      }
    }
    $redirect_url = $_SERVER['REQUEST_URI'];
    header('Location: ' . $redirect_url);
    exit();
  }
}
if (isset($_SESSION['toast_msg'])) {
  $toast_message = $_SESSION['toast_msg'];
  $toast_type = $_SESSION['toast_type'] ?? 'info';
  unset($_SESSION['toast_msg']);
  unset($_SESSION['toast_type']);
}
$filter_date = isset($_GET['filter_date']) ? trim($_GET['filter_date']) : '';
$filter_date_start = isset($_GET['filter_date_start']) ? trim($_GET['filter_date_start']) : '';
$filter_date_end = isset($_GET['filter_date_end']) ? trim($_GET['filter_date_end']) : '';

$treehole_messages = [];
$stmt = null;
try {
  $date_condition = '';
  $bind_params = [];
  $bind_types = '';

  if (!empty($filter_date)) {
    $date_condition = " AND DATE(create_time) = ?";
    $bind_params[] = $filter_date;
    $bind_types .= 's';
  } else {
    if (!empty($filter_date_start)) {
      $date_condition .= " AND DATE(create_time) >= ?";
      $bind_params[] = $filter_date_start;
      $bind_types .= 's';
    }
    if (!empty($filter_date_end)) {
      $date_condition .= " AND DATE(create_time) <= ?";
      $bind_params[] = $filter_date_end;
      $bind_types .= 's';
    }
  }

  $treehole_sql = "SELECT * FROM mok_smallworld_treehole 
                     WHERE ((user_id = ? AND target_id = ?) 
                        OR (user_id = ? AND target_id = ?)) 
                        $date_condition
                     ORDER BY create_time DESC LIMIT 10";
  $stmt = $conn->prepare($treehole_sql);
  if ($stmt === false) {
    throw new Exception('预处理失败：' . $conn->error);
  }
  $params = [$u, $uu, $uu, $u];
  $types = 'ssss';
  foreach ($bind_params as $p) {
    $params[] = $p;
    $types .= 's';
  }

  $stmt->bind_param($types, ...$params);

  if (!$stmt->execute()) {
    throw new Exception('执行失败：' . $stmt->error);
  }

  $treehole_result = $stmt->get_result();
  while ($row = $treehole_result->fetch_assoc()) {
    $treehole_messages[] = $row;
  }
} catch (Exception $e) {
  error_log('树洞查询错误：' . $e->getMessage());
} finally {
  if ($stmt !== null) {
    $stmt->close();
  }
}

$timeline_events = [];
$stmt = null;
try {
  $timeline_sql = "SELECT * FROM mok_smallworld_timeline 
                     WHERE (user_id = ? AND target_id = ?) 
                        OR (user_id = ? AND target_id = ?) 
                     ORDER BY event_date ASC, create_time ASC LIMIT 10";
  $stmt = $conn->prepare($timeline_sql);
  if ($stmt === false) {
    throw new Exception('预处理失败：' . $conn->error);
  }
  $stmt->bind_param("ssss", $u, $uu, $uu, $u);
  if (!$stmt->execute()) {
    throw new Exception('执行失败：' . $stmt->error);
  }
  $timeline_result = $stmt->get_result();
  while ($row = $timeline_result->fetch_assoc()) {
    $timeline_events[] = $row;
  }
} catch (Exception $e) {
  error_log('时间线查询错误：' . $e->getMessage());
} finally {
  if ($stmt !== null) {
    $stmt->close();
  }
}
$intimacy_value = 0;
$intimacy_alias = null;
$stmt = null;
try {
  $intimacy_sql = "SELECT `value`, alias FROM mok_intimacy WHERE user_id = ? AND target_id = ?";
  $stmt = $conn->prepare($intimacy_sql);
  if ($stmt === false) {
    throw new Exception('预处理失败：' . $conn->error);
  }

  $stmt->bind_param("ss", $u, $uu);

  if (!$stmt->execute()) {
    throw new Exception('执行失败：' . $stmt->error);
  }

  $intimacy_result = $stmt->get_result();
  if ($row = $intimacy_result->fetch_assoc()) {
    $intimacy_value = isset($row['value']) ? intval($row['value']) : 0;
    $intimacy_alias = isset($row['alias']) ? $row['alias'] : null;
  }
} catch (Exception $e) {
  error_log('亲密度查询错误：' . $e->getMessage());
} finally {
  if ($stmt !== null) {
    $stmt->close();
  }
}
$days = 0;
$stmt = null;
try {
  $days_sql = "SELECT add_time FROM mok_contact 
                 WHERE (user_id = ? AND friend_id = ?) 
                    OR (user_id = ? AND friend_id = ?) 
                 ORDER BY add_time ASC LIMIT 1";
  $stmt = $conn->prepare($days_sql);
  if ($stmt === false) {
    throw new Exception('预处理失败：' . $conn->error);
  }
  $stmt->bind_param("ssss", $u, $uu, $uu, $u);
  if (!$stmt->execute()) {
    throw new Exception('执行失败：' . $stmt->error);
  }
  $days_result = $stmt->get_result();
  if ($row = $days_result->fetch_assoc()) {
    if (!empty($row['add_time'])) {
      try {
        $first = new DateTime($row['add_time']);
        $now = new DateTime();
        $diff = $first->diff($now);
        $days = $diff !== false ? $diff->days : 0;
      } catch (Exception $e) {
        error_log('日期计算错误：' . $e->getMessage());
        $days = 0;
      }
    }
  }
} catch (Exception $e) {
  error_log('天数查询错误：' . $e->getMessage());
} finally {
  if ($stmt !== null) {
    $stmt->close();
  }
}

function getIntimacyLevel($value, $alias = null)
{
  if (!empty($alias)) {
    return $alias;
  }
  $value = intval($value);
  if ($value >= 5000) return '死党';
  if ($value >= 3000) return '挚友';
  if ($value >= 1000) return '好友';
  if ($value >= 500) return '朋友';
  if ($value >= 100) return '认识';
  return '陌生人';
}
$intimacy_level = getIntimacyLevel($intimacy_value, $intimacy_alias);
$intimacy_percent = $intimacy_value > 0 ? min(100, intval($intimacy_value / 100)) : 0;

function safeHtml($str)
{
  return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

function safeJs($str)
{
  return addslashes($str);
}
function truncateText($text, $length = 30)
{
  if (mb_strlen($text, 'UTF-8') <= $length) {
    return $text;
  }
  return mb_substr($text, 0, $length, 'UTF-8') . '……';
}
?>
<!DOCTYPE html>
<html lang="zh-CN">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>小世界 · MiniWorld</title>
  <link rel="stylesheet" href="/ast/fontawe/css/all.min.css">
  <link rel="stylesheet" href="/ast/painting/miniworld.css">
</head>

<body>
  <?php if (!empty($toast_message)): ?>
    <div class="toast-msg <?php echo $toast_type; ?>" id="toastMsg">
      <?php echo htmlspecialchars($toast_message); ?>
    </div>
    <script>
      (function() {
        var el = document.getElementById('toastMsg');
        if (!el) return;
        setTimeout(function() {
          el.classList.add('hide');
          setTimeout(function() {
            if (el.parentNode) el.parentNode.removeChild(el);
          }, 600);
        }, 3000);
      })();
    </script>
  <?php endif; ?>

  <div class="small-world">
    <header class="top-nav">
      <div class="nav-left">
        <span class="brand"><i class="fas fa-leaf"></i> 小世界</span>
        <span class="partner"><i class="fas fa-user-astronaut"></i> 与 <?php echo htmlspecialchars($un); ?></span>
      </div>
      <div class="nav-right">
        <span class="relation-badge"><i class="fas fa-feather-alt"></i> <?php echo htmlspecialchars($intimacy_level); ?></span>
        <span class="intimacy">
          <i class="fas fa-heart heart"></i>
          <span class="score"><?php echo $intimacy_percent; ?></span>
          <span style="color: var(--text-muted); font-size: 0.7rem; font-weight: 400;">/ 100</span>
        </span>
      </div>
    </header>

    <div class="main-area">
      <aside class="tree-hole">
        <div class="tree-hole-header">
          <h3><i class="fas fa-tree"></i> 树洞留言</h3>
          <span class="mood-today"><i class="fas fa-sun"></i> 心情 · 晴</span>
        </div>
        <div class="tree-hole-filter">
          <span class="filter-label"><i class="fas fa-calendar-alt"></i> 筛选</span>
          <div class="date-range">
            <input type="date" id="filterDateStart" value="<?php echo htmlspecialchars($filter_date_start); ?>" placeholder="开始日期">
            <span>至</span>
            <input type="date" id="filterDateEnd" value="<?php echo htmlspecialchars($filter_date_end); ?>" placeholder="结束日期">
          </div>
          <input type="date" id="filterDateSingle" value="<?php echo htmlspecialchars($filter_date); ?>" placeholder="指定日期" style="display:none;">
          <button class="filter-btn" onclick="applyFilter()"><i class="fas fa-search"></i> 筛选</button>
          <button class="filter-btn clear-btn" onclick="clearFilter()"><i class="fas fa-times"></i> 清除</button>
          <label style="font-size:0.75rem;color:var(--text-muted);display:flex;align-items:center;gap:4px;cursor:pointer;">
            <input type="checkbox" id="toggleDateMode" onchange="toggleDateMode()"> 单日
          </label>
        </div>

        <div class="tree-hole-messages" id="treeMessages">
          <?php if (empty($treehole_messages)): ?>
            <div class="tree-msg" style="color: #bbb; text-align: center; background: transparent; cursor: default;">
              <span style="font-size: 32px; display: block; margin-bottom: 8px;">🕊️</span>
              还没有树洞留言，写一句悄悄话吧~
            </div>
          <?php else: ?>
            <?php foreach ($treehole_messages as $msg):
              $mood = !empty($msg['mood_icon']) ? $msg['mood_icon'] : '💬';
              $time = date('Y.m.d H:i', strtotime($msg['create_time']));
              $display_time = (date('Y-m-d', strtotime($msg['create_time'])) == date('Y-m-d'))
                ? '今天 ' . date('H:i', strtotime($msg['create_time']))
                : $time;
              $isMe = ($msg['user_id'] === $u);
              $senderLabel = $isMe ? '我' : '对方';
              $senderClass = $isMe ? 'me' : 'other';
              $content = $msg['content'];
              $truncatedContent = truncateText($content, 30);
              $needTruncate = ($truncatedContent !== $content);
              $msgId = $msg['id'];
            ?>
              <div class="tree-msg fade-in"
                data-id="<?php echo $msgId; ?>"
                data-full-content="<?php echo htmlspecialchars($content, ENT_QUOTES, 'UTF-8'); ?>"
                data-sender="<?php echo $senderLabel; ?>"
                data-sender-class="<?php echo $senderClass; ?>"
                data-time="<?php echo $display_time; ?>"
                data-is-me="<?php echo $isMe ? 'true' : 'false'; ?>"
                onclick="openModal(this)">
                <?php if ($isMe): ?>
                  <button class="delete-btn" onclick="event.stopPropagation(); confirmDelete(<?php echo $msgId; ?>)" title="删除留言">
                    <i class="fas fa-trash"></i>
                  </button>
                <?php endif; ?>
                <span class="mood-icon"><?php echo htmlspecialchars($mood); ?></span>
                <span class="msg-sender <?php echo $senderClass; ?>"><?php echo $senderLabel; ?></span>
                <span class="msg-content-wrapper">
                  <span class="msg-content <?php echo $needTruncate ? 'truncated' : ''; ?>">
                    <?php echo htmlspecialchars($truncatedContent); ?>
                  </span>
                </span>
                <span class="time"><?php echo $display_time; ?></span>
              </div>
            <?php endforeach; ?>
          <?php endif; ?>
        </div>

        <form method="POST" action="" class="tree-hole-input-area" id="treeholeForm">
          <input type="hidden" name="action" value="add_treehole">
          <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
          <input type="hidden" name="user_id" value="<?php echo htmlspecialchars($u); ?>">
          <input type="hidden" name="target_id" value="<?php echo htmlspecialchars($uu); ?>">
          <input type="hidden" name="mood_icon" value="💬">
          <input type="text" name="content" placeholder="写一句悄悄话…" maxlength="500" required id="treeholeInput">
          <button type="submit"><i class="fas fa-paper-plane"></i></button>
        </form>
      </aside>

      <section class="timeline">
        <div class="timeline-header">
          <h3><i class="fas fa-clock-rotate-left"></i> 回忆时间线</h3>
          <span class="load-more" id="loadMoreBtn"><i class="fas fa-plus-circle"></i> 加载更多</span>
        </div>
        <div class="timeline-river-wrapper">
          <div class="river-line"></div>
          <div class="river-source">
            <div class="source-icon">🌱</div>
            <span>初识</span>
          </div>
          <div class="river-mouth">
            <div class="mouth-icon">🏁</div>
            <span>现在</span>
          </div>
          <div id="timelineList" class="timeline-nodes">
            <?php if (empty($timeline_events)): ?>
              <div class="empty-timeline">
                <i class="fas fa-water"></i>
                <span>还没有回忆，一起创造吧</span>
              </div>
              <?php else:
              $colors = ['#6C5CE7', '#FD79A8', '#00CEC9', '#FDCB6E', '#0984E3', '#E17055', '#00B894', '#A29BFE'];
              $total = count($timeline_events);

              foreach ($timeline_events as $index => $event):
                $isTop = $index % 2 === 0;
                $color = $colors[$index % count($colors)];
                $isFirst = $index === 0;
                $isLast = $index === $total - 1;
              ?>
                <div class="timeline-node <?php echo $isTop ? 'top' : 'bottom'; ?> 
                     <?php echo $isFirst ? 'first' : ''; ?> 
                     <?php echo $isLast ? 'last' : ''; ?>"
                  style="--node-color: <?php echo $color; ?>;"
                  onclick="openTimelineModal(this)">
                  <div class="node-dot" style="background: <?php echo $color; ?>;">
                    <div class="node-pulse" style="background: <?php echo $color; ?>;"></div>
                  </div>
                  <div class="node-line" style="background: <?php echo $color; ?>;"></div>
                  <div class="node-card" style="border-color: <?php echo $color; ?>;">
                    <div class="node-card-inner">
                      <div class="node-icon"><i class="fas <?php echo !empty($event['icon']) ? htmlspecialchars($event['icon']) : '✦'; ?>"></i></div>
                      <div class="node-title"><?php echo htmlspecialchars($event['title']); ?></div>
                      <div class="node-date"><?php echo date('Y.m.d', strtotime($event['event_date'])); ?></div>
                      <?php if (!empty($event['description'])): ?>
                        <div class="node-desc"><?php echo htmlspecialchars($event['description']); ?></div>
                      <?php endif; ?>
                    </div>
                    <div class="node-glow" style="background: <?php echo $color; ?>;"></div>
                  </div>
                </div>
              <?php endforeach; ?>
            <?php endif; ?>
            <span style="display: none;" class="load-more" id="loadMoreBtns"><i class="fas fa-plus-circle"></i> 加载更多</span>
          </div>
        </div>
      </section>
    </div>

    <div class="bottom-banners">
      <div class="banner-row">
        <div class="banner-card music-banner">
          <div class="cover"><i class="fas fa-music"></i></div>
          <div class="music-info">
            <div class="title text-ellipsis">晴天</div>
            <div class="artist">周杰伦</div>
            <div class="music-progress">
              <input type="range" id="music-progress-bar" min="0" max="100" value="0">
              <span class="time">0:00 / 0:00</span>
            </div>
          </div>
          <div class="music-actions">
            <span class="sync-badge"><i class="fas fa-sync-alt fa-fw fa-spin"></i> 网易云</span>
            <button id="search-wyybtn-start"><i class="fas fa-cloud"></i> 搜索</button>
            <button id="search-wyybtn-glocont"><i class="fas fa-pause"></i> 暂停</button>
          </div>
        </div>
        <div class="banner-card memorial-banner">
          <div class="icon"><i class="fas fa-gem"></i></div>
          <div class="memorial-stats">
            <div class="stat"><span class="num" id="daysCount"><?php echo $days; ?></span><span class="label">相识(天)</span></div>
            <div class="divider"></div>
            <div class="stat"><span class="num" id="msgCount">加载中...</span><span class="label">已互发(消息)</span></div>
            <div class="divider"></div>
            <div class="stat"><span class="num">❤️</span><span class="label">亲密度 <?php echo intval($intimacy_value); ?></span></div>
            <div class="divider"></div>
            <div class="stat">
              <div class="relation-alias">
                <span class="alias-display <?php echo $intimacy_value >= 500 ? 'editable' : 'locked'; ?>"
                  id="relationAliasDisplay"
                  onclick="<?php echo $intimacy_value >= 500 ? 'openAliasEditor()' : ''; ?>">
                  <?php if ($intimacy_value >= 500) echo htmlspecialchars($intimacy_alias ?? '朋友'); ?>
                  <?php if ($intimacy_value >= 500): ?>
                    <i id="fasopeneditrelatf" class="fas fa-pen edit-icon"></i>
                  <?php endif; ?>
                </span>
                <span class="alias-label">
                  <i class="fas fa-heart" style="color:#e74c3c;font-size:0.5rem;"></i>
                  关系称呼
                  <?php if ($intimacy_value < 500): ?>
                    <span class="unlock-hint">
                      <i class="fas fa-lock" style="font-size:0.45rem;"></i>
                      亲密度达500可编辑
                    </span>
                  <?php endif; ?>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>


  <div class="context-menu" id="contextMenu">
    <button class="menu-item" onclick="contextViewDetail()"><i class="fas fa-eye"></i> 查看详情</button>
    <div class="menu-divider"></div>
    <button class="menu-item danger" id="contextDeleteBtn" onclick="contextDelete()"><i class="fas fa-trash"></i> 删除留言</button>
  </div>
  <div class="music-drawer-overlay" id="musicDrawerOverlay">
    <div class="music-drawer" id="musicDrawer">
      <div class="drawer-search-area">
        <div class="drawer-search-box">
          <input type="text" id="drawerSearchInput" placeholder="搜索歌曲、歌手..." />
          <button id="drawerSearchBtn"><i class="fas fa-search"></i></button>
        </div>
      </div>
      <div class="drawer-list-wrap">
        <div class="drawer-list" id="drawerSongList">
          <div class="drawer-empty"><i class="fas fa-music"></i> 搜索你喜欢的音乐</div>
        </div>
      </div>
      <div class="drawer-handle" onclick="closeMusicDrawer()"></div>
    </div>
  </div>
  <div id="modalContainer"></div>
  <div class="alias-edit-overlay" id="aliasEditOverlay" style="display:none;">
    <div class="alias-edit-box">
      <div class="edit-header">
        <h3><i class="fas fa-heart"></i> 修改关系称呼</h3>
        <button class="edit-close" onclick="closeAliasEditor()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="edit-body">
        <div class="hint-text">
          <i class="fas fa-info-circle"></i>
          为你们的关系起一个专属称呼吧，双方可见
        </div>
        <div class="input-wrapper">
          <i class="fas fa-tag input-icon"></i>
          <input type="text"
            id="aliasInput"
            value="<?php echo htmlspecialchars($intimacy_alias ?? '情侣'); ?>"
            maxlength="10"
            placeholder="输入关系称呼（如：宝贝、老公、闺蜜）"
            oninput="updateCharCount()">
        </div>
        <div class="char-count" id="charCount">0 / 5</div>
        <div class="preview-row">
          <span class="preview-label"><i class="fas fa-eye"></i> 预览</span>
          <span class="preview-value" id="aliasPreview">
            <?php echo htmlspecialchars($intimacy_alias ?? '情侣'); ?>
          </span>
        </div>
      </div>
      <div class="edit-footer">
        <button class="btn-cancel" onclick="closeAliasEditor()">取消</button>
        <button class="btn-confirm" onclick="saveAlias()">
          <i class="fas fa-check"></i> 确认修改
        </button>
      </div>
    </div>
  </div>
  <script src="/ast/console.js"></script>
  <script src="/ast/authwrite.js"></script>
  <script>
    const newfuckingao = new ConsoleDetector();
    newfuckingao.startDetection();
    console.log = function() {};
    console.info = function() {};
    console.warn = function() {};
    console.error = function() {};
    const newcontroler = new tmdbaseauthdownyho();
    class CustomAlert { //自定义弹窗类
      static show(options) {
        const config = Object.assign({
          title: '提示',
          content: '',
          cancelText: '取消',
          confirmText: '确定',
          onCancel: () => {},
          onConfirm: () => {}
        }, options);
        this.destroy();
        const mask = document.createElement('div');
        mask.className = 'custom-alert-mask';
        mask.innerHTML = `
      <div class="custom-alert-box">
        <div class="custom-alert-header">
          <span>${config.title}</span>
          <span class="custom-alert-close"><i class="fas fa-times"></i></span>
        </div>
        <div class="custom-alert-body">${config.content}</div>
        <div class="custom-alert-footer">
          <button class="custom-alert-btn custom-alert-btn-cancel">${config.cancelText}</button>
          <button class="custom-alert-btn custom-alert-btn-confirm">${config.confirmText}</button>
        </div>
      </div>
    `;
        document.body.appendChild(mask);
        const closeBtn = mask.querySelector('.custom-alert-close');
        const cancelBtn = mask.querySelector('.custom-alert-btn-cancel');
        const confirmBtn = mask.querySelector('.custom-alert-btn-confirm');
        const destroy = () => {
          mask.remove();
        };
        closeBtn.addEventListener('click', () => {
          config.onCancel();
          destroy();
        });
        cancelBtn.addEventListener('click', () => {
          config.onCancel();
          destroy();
        });
        confirmBtn.addEventListener('click', () => {
          config.onConfirm();
          destroy();
        });
        mask.addEventListener('click', (e) => {
          if (e.target === mask) {
            config.onCancel();
            destroy();
          }
        });
      }
      static destroy() {
        const oldMask = document.querySelector('.custom-alert-mask');
        if (oldMask) oldMask.remove();
      }
    }

    function alertMsg(content, confirmCallback) {
      CustomAlert.show({
        content: content,
        cancelText: '关闭',
        confirmText: '确定',
        onConfirm: confirmCallback || (() => {})
      });
    }
  </script>
  <script>
    (function() {
      const userId = '<?php echo htmlspecialchars($u); ?>';
      const overlay = document.getElementById('musicDrawerOverlay');
      const drawer = document.getElementById('musicDrawer');
      const searchInput = document.getElementById('drawerSearchInput');
      const searchBtn = document.getElementById('drawerSearchBtn');
      const listContainer = document.getElementById('drawerSongList');
      let currentAudio = null;
      let currentSongInfo = {
        name: '晴天',
        artist: '周杰伦'
      };
      let isPlaying = false;
      let progressInterval = null;
      class NeteaseMusicParser {
        async getNeteaseSong(songName) {
          if (!songName) return {
            code: 400,
            text: '请输入歌名'
          };
          try {
            const searchResults = await this.searchSong(songName);
            if (!searchResults || !searchResults.result || !searchResults.result.songs) {
              return {
                code: 404,
                text: '未找到匹配歌曲'
              };
            }
            const songs = searchResults.result.songs;
            const formatted = await Promise.all(
              songs.map(async song => ({
                id: song.id,
                name: song.name,
                artist: song.artists[0].name,
                album: song.album.name,
                url: await this.getSongUrl(song.id)
              }))
            );
            return {
              code: 200,
              text: '成功',
              data: formatted
            };
          } catch (e) {
            console.error(e);
            return {
              code: 500,
              text: '网络错误或代理异常'
            };
          }
        }
        async searchSong(keyword) {
          const authdata = await newcontroler.writenewwords(userId);
          const resp = await fetch(`/api/wyymusic/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `keyword=${encodeURIComponent(keyword)}&ak=${authdata}`
          });
          if (!resp.ok) throw new Error('搜索失败');
          return resp.json();
        }

        async getSongUrl(songId) {
          try {
            const authdata = await newcontroler.writenewwords(userId);
            const resp = await fetch(`/api/wyymusic/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `songId=${songId}&ak=${authdata}`
            });
            if (!resp.ok) throw new Error('获取链接失败');
            const data = await resp.json();
            return data.url || `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
          } catch {
            return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
          }
        }
      }
      const parser = new NeteaseMusicParser();

      function formatTime(seconds) {
        if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
      }

      function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
      }

      function showDrawerToast(msg, type) {
        let toast = document.querySelector('.drawer-toast');
        if (!toast) {
          toast = document.createElement('div');
          toast.className = 'drawer-toast';
          toast.style.cssText = `
        position: sticky; bottom: 10px; left: 0; right: 0;
        margin: 8px 0; padding: 10px 16px; border-radius: 30px;
        background: var(--bg-card-solid, #fff); color: var(--text-primary, #1e1e2f);
        box-shadow: 0 4px 16px rgba(0,0,0,0.08); text-align: center;
        font-size: 0.9rem; border: 1px solid var(--border, #ddd);
        backdrop-filter: blur(8px); z-index: 10;
        transition: 0.3s; opacity: 0; transform: translateY(10px);
      `;
          document.querySelector('.drawer-list-wrap')?.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        const colors = {
          error: '#e74c3c',
          info: '#3498db',
          success: '#2ecc71'
        };
        toast.style.borderLeftColor = colors[type] || '#6C5CE7';
        toast.style.borderLeftWidth = '5px';
        toast.style.borderLeftStyle = 'solid';
        clearTimeout(toast._hide);
        toast._hide = setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(10px)';
        }, 3000);
      }

      function updateProgress() {
        const timeLabel = document.querySelector('.music-progress .time');
        const progressBar = document.getElementById('music-progress-bar');
        if (!currentAudio) {
          if (timeLabel) timeLabel.textContent = '0:00 / 0:00';
          if (progressBar) progressBar.value = 0;
          return;
        }
        if (currentAudio.duration && isFinite(currentAudio.duration)) {
          const pct = (currentAudio.currentTime / currentAudio.duration) * 100;
          if (progressBar) progressBar.value = pct;
          if (timeLabel) {
            timeLabel.textContent = formatTime(currentAudio.currentTime) + ' / ' + formatTime(currentAudio.duration);
          }
        } else {
          if (timeLabel) timeLabel.textContent = '加载中...';
        }
      }

      function startProgressLoop() {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        updateProgress();
        progressInterval = setInterval(updateProgress, 500);
      }

      function stopProgressLoop() {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
      }

      function updateMainPlayerUI(name, artist) {
        const titleEl = document.querySelector('.music-info .title');
        const artistEl = document.querySelector('.music-info .artist');
        if (titleEl) {
          titleEl.textContent = name || '未选择歌曲';
          titleEl.title = name || '未选择歌曲';
        }
        if (artistEl) {
          artistEl.textContent = artist || '未知歌手';
          artistEl.title = artist || '未知歌手';
        }
        currentSongInfo = {
          name: name || '未选择歌曲',
          artist: artist || '未知歌手'
        };
      }

      function togglePlay() {
        if (!currentAudio) {
          alertMsg("音频数据归档错误");
          return;
        }

        const playBtn = document.querySelector('#search-wyybtn-glocont');
        if (currentAudio.paused) {
          currentAudio.play().then(() => {
            isPlaying = true;
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停';
            startProgressLoop();
          }).catch(err => {
            console.warn('播放失败:', err);
            showDrawerToast('播放失败，请重试', 'error');
          });
        } else {
          currentAudio.pause();
          isPlaying = false;
          if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i> 播放';
          stopProgressLoop();
        }
      }

      function playAudio(url, name, artist) {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }
        stopProgressLoop();
        const audio = new Audio(url);
        audio.volume = parseFloat(document.getElementById('music-volume-bar')?.value || 0.8);
        let loadTimeout = setTimeout(() => {
          if (audio.readyState < 2) {
            showDrawerToast('加载超时，请重试', 'error');
            audio.src = '';
          }
        }, 15000);

        audio.addEventListener('canplaythrough', function onReady() {
          clearTimeout(loadTimeout);
          this.removeEventListener('canplaythrough', onReady);
        });

        audio.play().then(() => {
          currentAudio = audio;
          isPlaying = true;
          updateMainPlayerUI(name, artist);
          startProgressLoop();

          const playBtn = document.querySelector('#search-wyybtn-glocont');
          if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停';
          closeMusicDrawer();
          audio.addEventListener('ended', function onEnd() {
            isPlaying = false;
            stopProgressLoop();
            const btn = document.querySelector('#search-wyybtn-glocont');
            if (btn) btn.innerHTML = '<i class="fas fa-play"></i> 播放';
            updateProgress();
            this.removeEventListener('ended', onEnd);
          });
          audio.addEventListener('error', function onError() {
            showDrawerToast('播放出错，请重试', 'error');
            isPlaying = false;
            stopProgressLoop();
            const btn = document.querySelector('#search-wyybtn-glocont');
            if (btn) btn.innerHTML = '<i class="fas fa-play"></i> 播放';
            this.removeEventListener('error', onError);
          });

        }).catch(err => {
          clearTimeout(loadTimeout);
          console.warn('播放失败:', err);
          showDrawerToast('无法播放该歌曲', 'error');
          isPlaying = false;
          const playBtn = document.querySelector('#search-wyybtn-glocont');
          if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i> 播放';
        });
      }

      function handlePlayFromDrawer(item) {
        const url = item.dataset.url;
        const name = item.dataset.name;
        const artist = item.dataset.artist;
        if (!url) {
          showDrawerToast('无法获取播放链接', 'error');
          return;
        }
        playAudio(url, name, artist);
      }

      function renderSongList(songs) {
        listContainer.innerHTML = '';
        songs.forEach(song => {
          const item = document.createElement('div');
          item.className = 'drawer-song-item';
          item.dataset.url = song.url;
          item.dataset.name = song.name;
          item.dataset.artist = song.artist;
          item.innerHTML = `
        <div class="info">
          <div class="name">${escapeHtml(song.name)}</div>
          <div class="artist">${escapeHtml(song.artist)}</div>
        </div>
        <div class="play-icon"><i class="fas fa-play"></i></div>
      `;
          item.addEventListener('click', function(e) {
            e.stopPropagation();
            handlePlayFromDrawer(this);
          });
          listContainer.appendChild(item);
        });
      }
      async function performSearch() {
        const keyword = searchInput.value.trim();
        if (!keyword) {
          showDrawerToast('请输入歌曲名称', 'info');
          return;
        }
        listContainer.innerHTML = `<div class="drawer-empty"><i class="fas fa-spinner fa-pulse"></i> 搜索中...</div>`;
        const result = await parser.getNeteaseSong(keyword);
        if (result.code !== 200 || !result.data || result.data.length === 0) {
          listContainer.innerHTML = `<div class="drawer-empty"><i class="fas fa-search-minus"></i> 未找到相关歌曲</div>`;
          return;
        }
        renderSongList(result.data);
      }
      window.openMusicDrawer = function() {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => searchInput.focus(), 200);
        if (!listContainer.children.length) {
          listContainer.innerHTML = `<div class="drawer-empty"><i class="fas fa-music"></i> 搜索你喜欢的音乐</div>`;
        }
      };

      window.closeMusicDrawer = function() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      };

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeMusicDrawer();
      });
      searchBtn.addEventListener('click', performSearch);
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') performSearch();
      });
      document.querySelector('#search-wyybtn-start')?.addEventListener('click', function(e) {
        e.stopPropagation();
        openMusicDrawer();
      });
      document.querySelector('#search-wyybtn-glocont')?.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePlay();
      });
      const volumeBar = document.getElementById('music-volume-bar');
      if (volumeBar) {
        volumeBar.addEventListener('input', function() {
          if (currentAudio) currentAudio.volume = parseFloat(this.value);
        });
      }
      const progressBar = document.getElementById('music-progress-bar');
      if (progressBar) {
        progressBar.addEventListener('input', function() {
          if (currentAudio && currentAudio.duration && isFinite(currentAudio.duration)) {
            const pct = parseFloat(this.value) / 100;
            currentAudio.currentTime = pct * currentAudio.duration;
            updateProgress();
          }
        });
      }
      document.addEventListener('visibilitychange', function() {
        if (!document.hidden && currentAudio && !currentAudio.paused) {
          startProgressLoop();
        }
      });
    })();
  </script>
  <script>
    <?php if ($intimacy_value >= 500): ?>
        (function() {
          function openAliasEditor() {
            const overlay = document.getElementById('aliasEditOverlay');
            if (overlay) {
              overlay.style.display = 'flex';
              const input = document.getElementById('aliasInput');
              const preview = document.getElementById('aliasPreview');
              const currentAlias = '<?php echo htmlspecialchars($intimacy_alias ?? '情侣'); ?>';
              input.value = currentAlias;
              preview.textContent = currentAlias;
              updateCharCount();
              setTimeout(() => input.focus(), 100);
            }
          }

          function closeAliasEditor() {
            const overlay = document.getElementById('aliasEditOverlay');
            if (overlay) {
              overlay.style.display = 'none';
            }
          }

          function updateCharCount() {
            const input = document.getElementById('aliasInput');
            const count = document.getElementById('charCount');
            const preview = document.getElementById('aliasPreview');
            if (input && count && preview) {
              const len = input.value.length;
              count.textContent = len + ' / 5';
              preview.textContent = input.value || '未填写';
            }
          }

          function saveAlias() {
            const input = document.getElementById('aliasInput');
            const alias = input.value.trim();

            if (alias === '') {
              showToast('关系称呼不能为空', 'error');
              return;
            }

            if (alias.length > 5) {
              showToast('关系称呼不能超过5个字符', 'error');
              return;
            }
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = window.location.href;
            const fields = {
              'action': 'update_alias',
              'user_id': '<?php echo htmlspecialchars($u); ?>',
              'target_id': '<?php echo htmlspecialchars($uu); ?>',
              'alias': alias,
              'csrf_token': '<?php echo htmlspecialchars($csrf_token); ?>'
            };

            for (const key in fields) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = fields[key];
              form.appendChild(input);
            }

            document.body.appendChild(form);
            form.submit();
          }

          function showToast(message, type = 'info') {
            const existing = document.querySelector('.toast-msg');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = 'toast-msg ' + type;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
              toast.classList.add('hide');
              setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
              }, 600);
            }, 3000);
          }

          const overlay = document.getElementById('aliasEditOverlay');
          if (overlay) {
            overlay.addEventListener('click', function(e) {
              if (e.target === overlay) {
                closeAliasEditor();
              }
            });
          }
          const overlaybtn = document.getElementById('fasopeneditrelatf');
          overlaybtn.addEventListener('click', function() {
            openAliasEditor();
          });
          window.openAliasEditor = openAliasEditor;
          window.closeAliasEditor = closeAliasEditor;
          window.updateCharCount = updateCharCount;
          window.saveAlias = saveAlias;
          window.showToast = showToast;
        })();
    <?php endif ?>
    /*****------------------------------------------- */
    var contextMsgId = null;
    var contextMsgElement = null;
    var contextIsMe = false;

    function toggleDateMode() {
      var single = document.getElementById('filterDateSingle');
      var start = document.getElementById('filterDateStart');
      var end = document.getElementById('filterDateEnd');
      var checked = document.getElementById('toggleDateMode').checked;
      if (checked) {
        single.style.display = 'inline-block';
        start.style.display = 'none';
        end.style.display = 'none';
      } else {
        single.style.display = 'none';
        start.style.display = 'inline-block';
        end.style.display = 'inline-block';
      }
    }

    function applyFilter() {
      var params = new URLSearchParams(window.location.search);
      var single = document.getElementById('filterDateSingle');
      var start = document.getElementById('filterDateStart');
      var end = document.getElementById('filterDateEnd');
      params.delete('filter_date');
      params.delete('filter_date_start');
      params.delete('filter_date_end');

      var checked = document.getElementById('toggleDateMode').checked;
      if (checked) {
        if (single.value) {
          params.set('filter_date', single.value);
        }
      } else {
        if (start.value) {
          params.set('filter_date_start', start.value);
        }
        if (end.value) {
          params.set('filter_date_end', end.value);
        }
      }

      window.location.href = '?' + params.toString();
    }

    function clearFilter() {
      var params = new URLSearchParams(window.location.search);
      params.delete('filter_date');
      params.delete('filter_date_start');
      params.delete('filter_date_end');
      document.getElementById('filterDateSingle').value = '';
      document.getElementById('filterDateStart').value = '';
      document.getElementById('filterDateEnd').value = '';
      window.location.href = '?' + params.toString();
    }
    (function() {
      var params = new URLSearchParams(window.location.search);
      var singleDate = params.get('filter_date');
      var startDate = params.get('filter_date_start');
      var endDate = params.get('filter_date_end');

      if (singleDate) {
        document.getElementById('toggleDateMode').checked = true;
        toggleDateMode();
        document.getElementById('filterDateSingle').value = singleDate;
      } else {
        if (startDate) document.getElementById('filterDateStart').value = startDate;
        if (endDate) document.getElementById('filterDateEnd').value = endDate;
      }
    })();

    function confirmDelete(id) {
      var overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-box">
          <div class="confirm-title"><i class="fas fa-exclamation-triangle"></i> 确认删除</div>
          <div class="confirm-text">确定要删除这条留言吗？<br><small style="color:var(--text-muted);">此操作不可撤销</small></div>
          <div class="confirm-actions">
            <button class="btn-cancel" onclick="this.closest('.confirm-overlay').remove()">取消</button>
            <button class="btn-confirm" onclick="deleteMessage(${id})">确认删除</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
      });
    }

    function deleteMessage(id) {
      var form = document.createElement('form');
      form.method = 'POST';
      form.action = window.location.href;

      var inputs = {
        'action': 'delete_treehole',
        'delete_id': id,
        'user_id': '<?php echo htmlspecialchars($u); ?>',
        'csrf_token': '<?php echo htmlspecialchars($csrf_token); ?>'
      };

      for (var key in inputs) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = inputs[key];
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    }
    document.addEventListener('contextmenu', function(e) {
      var msgEl = e.target.closest('.tree-msg');
      if (!msgEl) {
        document.getElementById('contextMenu').style.display = 'none';
        return;
      }

      e.preventDefault();
      var isMe = msgEl.dataset.isMe === 'true';
      contextMsgId = msgEl.dataset.id;
      contextMsgElement = msgEl;
      contextIsMe = isMe;

      var menu = document.getElementById('contextMenu');
      var deleteBtn = document.getElementById('contextDeleteBtn');

      if (isMe) {
        deleteBtn.style.display = 'flex';
      } else {
        deleteBtn.style.display = 'none';
      }

      menu.style.display = 'block';
      menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
      menu.style.top = Math.min(e.clientY, window.innerHeight - 120) + 'px';
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.context-menu')) {
        document.getElementById('contextMenu').style.display = 'none';
      }
    });

    function contextViewDetail() {
      if (contextMsgElement) {
        openModal(contextMsgElement);
      }
      document.getElementById('contextMenu').style.display = 'none';
    }

    function contextDelete() {
      if (contextMsgId && contextIsMe) {
        confirmDelete(contextMsgId);
      }
      document.getElementById('contextMenu').style.display = 'none';
    }

    function openModal(el) {
      var fullContent = el.dataset.fullContent || '';
      var sender = el.dataset.sender || '对方';
      var senderClass = el.dataset.senderClass || 'other';
      var time = el.dataset.time || '';
      var container = document.getElementById('modalContainer');
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-box">
          <button class="modal-close" onclick="closeModal(this)">✕</button>
          <div class="modal-sender ${senderClass}">${sender}</div>
          <div class="modal-content">${escapeHtml(fullContent)}</div>
          <div class="modal-time">${time}</div>
        </div>
      `;
      container.innerHTML = '';
      container.appendChild(overlay);
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          closeModal(overlay);
        }
      });
      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
          closeModal(document.querySelector('.modal-overlay'));
          document.removeEventListener('keydown', escHandler);
        }
      });
    }

    function closeModal(el) {
      var overlay = el.closest ? el.closest('.modal-overlay') : el;
      if (!overlay) {
        overlay = document.querySelector('.modal-overlay');
      }
      if (overlay) {
        overlay.classList.add('hide-modal');
        setTimeout(function() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 350);
      }
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
    (function() {
      const userId = '<?php echo htmlspecialchars($u); ?>';
      const targetId = '<?php echo htmlspecialchars($uu); ?>';
      const conversationId = '<?php echo htmlspecialchars($conv); ?>';

      function getMessageCount() {
        return new Promise((resolve) => {
          const request = indexedDB.open('ChatDB_' + userId, 1);
          request.onerror = function() {
            resolve(0);
          };
          request.onsuccess = function(e) {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('messages')) {
              db.close();
              resolve(0);
              return;
            }
            const transaction = db.transaction('messages', 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('conversationId');
            const req = index.getAll(conversationId);
            req.onsuccess = function(ev) {
              const msgs = ev.target.result || [];
              const count = msgs.filter(m => m.messageType !== 'system').length;
              db.close();
              resolve(count);
            };
            req.onerror = function() {
              db.close();
              resolve(0);
            };
          };
        });
      }

      getMessageCount().then(function(count) {
        const el = document.getElementById('msgCount');
        if (el) el.textContent = count > 0 ? count.toLocaleString() : '0';
      });

      setInterval(function() {
        getMessageCount().then(function(count) {
          const el = document.getElementById('msgCount');
          if (el) el.textContent = count > 0 ? count.toLocaleString() : '0';
        });
      }, 30000);
    })();
    (function() {
      const loadMoreBtn = document.getElementById('loadMoreBtn');
      const loadMoreBtns = document.getElementById('loadMoreBtns');
      const timelineList = document.getElementById('timelineList');
      let offset = <?php echo count($timeline_events); ?>;
      let isLoading = false;
      let hasMore = true;
      if (!loadMoreBtn || !timelineList) {
        console.error('加载更多元素不存在');
        return;
      }

      loadMoreBtn.addEventListener('click', function() {
        if (isLoading || !hasMore) return;

        isLoading = true;
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
        loadMoreBtn.style.opacity = '0.7';
        loadMoreBtn.style.pointerEvents = 'none';

        const userId = '<?php echo htmlspecialchars($u); ?>';
        const targetId = '<?php echo htmlspecialchars($uu); ?>';
        const csrfToken = '<?php echo htmlspecialchars($csrf_token); ?>';

        fetch('/api/timeline_more/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'action=get_timeline&' +
              'user_id=' + encodeURIComponent(userId) +
              '&target_id=' + encodeURIComponent(targetId) +
              '&offset=' + encodeURIComponent(offset) +
              '&csrf_token=' + encodeURIComponent(csrfToken)
          })
          .then(function(response) {
            if (!response.ok) {
              throw new Error('网络请求失败: ' + response.status);
            }
            return response.json();
          })
          .then(function(data) {
            if (data.code === 200 && data.events && data.events.length > 0) {
              const colors = ['#6C5CE7', '#FD79A8', '#00CEC9', '#FDCB6E', '#0984E3', '#E17055', '#00B894', '#A29BFE'];
              const existingNodes = timelineList.querySelectorAll('.timeline-node').length;
              data.events.forEach(function(event, index) {
                const totalIndex = existingNodes + index;
                const isTop = totalIndex % 2 === 0;
                const color = colors[(offset + index) % colors.length];
                const node = document.createElement('div');
                node.className = 'timeline-node ' + (isTop ? 'top' : 'bottom') + ' fade-in';
                node.style.setProperty('--node-color', color);
                node.style.animationDelay = (index * 60) + 'ms';
                node.setAttribute('onclick', 'openTimelineModal(this)');
                const icon = event.icon || 'fa-star';
                const title = escapeHtml(event.title);
                const date = escapeHtml(event.event_date);
                const desc = event.description ? escapeHtml(event.description) : '';
                node.innerHTML = `
                <div class="node-dot" style="background: ${color};">
                    <div class="node-pulse" style="background: ${color};"></div>
                </div>
                <div class="node-line" style="background: ${color};"></div>
                <div class="node-card" style="border-color: ${color};">
                    <div class="node-card-inner">
                        <div class="node-icon"><i class="fas ${icon}"></i></div>
                        <div class="node-title">${title}</div>
                        <div class="node-date">${date}</div>
                        ${desc ? '<div class="node-desc">' + desc + '</div>' : ''}
                    </div>
                    <div class="node-glow" style="background: ${color};"></div>
                </div>
            `;
                timelineList.insertBefore(node, loadMoreBtns);
                offset += data.events.length;
              });
              loadMoreBtn.innerHTML = '<i class="fas fa-plus-circle"></i> 加载更多';
              loadMoreBtn.style.opacity = '1';
              loadMoreBtn.style.pointerEvents = 'auto';

              if (data.events.length < 10) {
                hasMore = false;
                loadMoreBtn.innerHTML = '<i class="fas fa-check-circle"></i> 已全部加载';
                loadMoreBtn.style.opacity = '0.5';
                loadMoreBtn.style.pointerEvents = 'none';
                loadMoreBtn.style.cursor = 'default';
              }
            }
          })
          .catch(function(error) {
            console.error('加载更多失败:', error);
            loadMoreBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> 加载失败，点击重试';
            loadMoreBtn.style.opacity = '1';
            loadMoreBtn.style.pointerEvents = 'auto';
            showToast('加载更多失败: ' + error.message, 'error');
          })
          .finally(function() {
            isLoading = false;
          });
      });

      function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }

      function showToast(message, type) {
        const existing = document.querySelector('.toast-msg');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-msg ' + (type || 'info');
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function() {
          toast.classList.add('hide');
          setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
          }, 600);
        }, 3000);
      }

      function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }

      function showToast(message, type) {
        const existing = document.querySelector('.toast-msg');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-msg ' + (type || 'info');
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function() {
          toast.classList.add('hide');
          setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
          }, 600);
        }, 3000);
      }
    })();
    (function() {
      const moodLabels = ['☀️ 晴', '⛅ 多云', '🌤️ 微晴', '🌧️ 雨', '❄️ 雪', '🌈 彩虹'];
      const moodSpan = document.querySelector('.mood-today');
      if (moodSpan) {
        let idx = 0;
        setInterval(function() {
          idx = (idx + 1) % moodLabels.length;
          moodSpan.innerHTML = '<i class="fas fa-smile"></i> 心情 · ' + moodLabels[idx].slice(2);
        }, 8000);
      }
    })();
    (function() {
      const syncBadge = document.querySelector('.sync-badge i');
      if (syncBadge) {
        setInterval(function() {
          syncBadge.classList.toggle('fa-spin');
        }, 2800);
      }
    })();
    (function() {
      const form = document.getElementById('treeholeForm');
      if (form) {
        form.addEventListener('submit', function() {
          const btn = form.querySelector('button[type="submit"]');
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            setTimeout(function() {
              btn.disabled = false;
              btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            }, 5000);
          }
        });
      }
    })();
  </script>
  <script>
    function openTimelineModal(el) {
      const card = el.querySelector('.node-card');
      const title = card?.querySelector('.node-title')?.textContent || '';
      const desc = card?.querySelector('.node-desc')?.textContent || '';
      const date = card?.querySelector('.node-date')?.textContent || '';
      const dummy = document.createElement('div');
      dummy.dataset.fullContent = title + (desc ? '\n' + desc : '');
      dummy.dataset.sender = '✦ 回忆';
      dummy.dataset.senderClass = 'other';
      dummy.dataset.time = date;

      if (typeof openModal === 'function') {
        openModal(dummy);
      }
    }
  </script>
</body>

</html>