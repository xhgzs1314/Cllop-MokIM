<?php
function unicodeDecode($unicode_str)
{
    $json = '{"str":"' . $unicode_str . '"}';
    $arr = json_decode($json, true);
    if (empty($arr)) return '';
    return $arr['str'];
}
$fmc_l = __DIR__ . '/../config.php';
require $fmc_l;
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    die("连接失败: " . $conn->connect_error);
}
$currentVersion = phpversion();
if (version_compare($currentVersion, '7.2.0') >= 0) {
} else {
    echo 'php版本必须是7.2及以上';
    exit;
}
function mokim_hasOutstandingLoan($conn, $userId)
{
    $sql = "SELECT id FROM mok_loan WHERE user_id = ? AND status = 1 AND repaid < amount LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $has = $result->num_rows > 0;
    $stmt->close();
    return $has;
}
function YhMokTTisWithin180s($targetTimestamp = null)
{
    if ($targetTimestamp === null) {
        $targetTimestamp = $_COOKIE['mokim_log_expire'] ?? null;
    }
    if ($targetTimestamp === null) {
        return false;
    }
    $now = time();
    return $targetTimestamp >= $now && ($targetTimestamp - $now) <= 180;
}
function MokIMTG_ddebug($data, $config_show=false, $callback = null, ...$args)
{
    if (is_callable($callback)) {
        call_user_func_array($callback, $args);
    }
    $content = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    $time = date('Y-m-d H:i:s');
    if ($config_show) {
        $call_btntos = '<a style="color:white;" href="/logout.php">重新登录</a>
    <a style="color:white;" href="javascript"  onclick="javascript:window.close();">返回</a>';
    } else {
        $call_btntos = '';
    }
    header('Content-Type: text/html; charset=UTF-8');
    echo <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{margin:0;padding:20px;background:#1a1a2e;font-family:'Courier New',monospace;display:flex;justify-content:center;align-items:center;min-height:100vh;}
.container{max-width:1000px;width:100%;background:#16213e;border-radius:12px;padding:30px;box-shadow:0 10px 40px rgba(0,0,0,0.5);border:1px solid #0f3460;}
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:15px;border-bottom:2px solid #00d2ff;margin-bottom:20px;}
.title{color:#00d2ff;font-size:22px;font-weight:bold;}
.meta{color:white;font-size:13px;text-align:right;}
.meta div{margin:3px 0;}
.meta strong{color:#e6f1ff;}
.content{background:#0a0a1a;border-radius:8px;padding:20px;overflow-x:auto;color:#e6f1ff;font-size:14px;line-height:1.8;max-height:500px;overflow-y:auto;border:1px solid #233554;white-space:pre-wrap;word-break:break-all;}
.footer{margin-top:15px;padding-top:12px;border-top:1px solid #233554;color:#495670;font-size:12px;display:flex;justify-content:space-between;}
.content::-webkit-scrollbar{width:6px;height:6px;}
.content::-webkit-scrollbar-track{background:#0a0a1a;}
.content::-webkit-scrollbar-thumb{background:#00d2ff;border-radius:3px;}
</style>
</head>
<body>
<div class="container">
<div class="header">
<div class="title">Notification</div>
<div class="meta">
    {$call_btntos}
</div>
</div>
<div class="content">{$content}</div>
<div class="footer">
<span>{$time}</span>
</div>
</div>
</body>
</html>
HTML;
    exit;
}
