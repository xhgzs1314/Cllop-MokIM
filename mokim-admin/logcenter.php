<?php
require_once 'config.php';
checkAuth();
$conn = connectDB();
$conn->set_charset("utf8mb4");
$log_type = isset($_GET['log_type']) ? $_GET['log_type'] : 'all';
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$date_from = isset($_GET['date_from']) ? $_GET['date_from'] : '';
$date_to = isset($_GET['date_to']) ? $_GET['date_to'] : '';
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$per_page = 30;
$offset = ($page - 1) * $per_page;
$logs = [];
$total = 0;

switch ($log_type) {
    case 'group_log':
    
        $sql = "SELECT 
                    id,
                    'group_log' as source,
                    group_id as target_id,
                    user_id,
                    action as event_type,
                    action_time as log_time,
                    CONCAT('群操作: ', action) as description,
                    remark,
                    NULL as detail
                FROM mok_group_log";
        
        if (!empty($search)) {
            $sql .= " WHERE user_id LIKE '%" . $conn->real_escape_string($search) . "%' 
                     OR group_id LIKE '%" . $conn->real_escape_string($search) . "%'";
        }
        if (!empty($date_from)) {
            $sql .= (strpos($sql, 'WHERE') === false ? ' WHERE ' : ' AND ') . 
                    "action_time >= '" . $conn->real_escape_string($date_from) . " 00:00:00'";
        }
        if (!empty($date_to)) {
            $sql .= (strpos($sql, 'WHERE') === false ? ' WHERE ' : ' AND ') . 
                    "action_time <= '" . $conn->real_escape_string($date_to) . " 23:59:59'";
        }
        
        $sql .= " ORDER BY action_time DESC LIMIT $offset, $per_page";
        $count_sql = "SELECT COUNT(*) as total FROM mok_group_log";
        if (!empty($search) || !empty($date_from) || !empty($date_to)) {
            $count_sql .= " WHERE ";
            $conditions = [];
            if (!empty($search)) {
                $conditions[] = "user_id LIKE '%" . $conn->real_escape_string($search) . "%' 
                               OR group_id LIKE '%" . $conn->real_escape_string($search) . "%'";
            }
            if (!empty($date_from)) {
                $conditions[] = "action_time >= '" . $conn->real_escape_string($date_from) . " 00:00:00'";
            }
            if (!empty($date_to)) {
                $conditions[] = "action_time <= '" . $conn->real_escape_string($date_to) . " 23:59:59'";
            }
            $count_sql .= implode(" AND ", $conditions);
        }
        break;
        
    case 'redpacket':
      
        $sql = "SELECT 
                    id,
                    'redpacket' as source,
                    group_id as target_id,
                    sender_id as user_id,
                    CASE 
                        WHEN status = 1 THEN '发送红包'
                        WHEN status = 2 THEN '红包抢完'
                        WHEN status = 3 THEN '红包过期'
                        WHEN status = 4 THEN '红包退款'
                        ELSE '红包状态'
                    END as event_type,
                    create_time as log_time,
                    CONCAT('红包 ', packet_no) as description,
                    CONCAT('总金额:', total_amount, 'G币, 总个数:', total_count) as remark,
                    CONCAT('祝福语: ', blessing) as detail
                FROM mok_redpacket";
        
        if (!empty($search)) {
            $sql .= " WHERE sender_id LIKE '%" . $conn->real_escape_string($search) . "%' 
                     OR packet_no LIKE '%" . $conn->real_escape_string($search) . "%'";
        }
        if (!empty($date_from)) {
            $sql .= (strpos($sql, 'WHERE') === false ? ' WHERE ' : ' AND ') . 
                    "create_time >= '" . $conn->real_escape_string($date_from) . " 00:00:00'";
        }
        if (!empty($date_to)) {
            $sql .= (strpos($sql, 'WHERE') === false ? ' WHERE ' : ' AND ') . 
                    "create_time <= '" . $conn->real_escape_string($date_to) . " 23:59:59'";
        }
        
        $sql .= " ORDER BY create_time DESC LIMIT $offset, $per_page";
        
 
        $count_sql = "SELECT COUNT(*) as total FROM mok_redpacket";
        if (!empty($search) || !empty($date_from) || !empty($date_to)) {
            $count_sql .= " WHERE ";
            $conditions = [];
            if (!empty($search)) {
                $conditions[] = "sender_id LIKE '%" . $conn->real_escape_string($search) . "%' 
                               OR packet_no LIKE '%" . $conn->real_escape_string($search) . "%'";
            }
            if (!empty($date_from)) {
                $conditions[] = "create_time >= '" . $conn->real_escape_string($date_from) . " 00:00:00'";
            }
            if (!empty($date_to)) {
                $conditions[] = "create_time <= '" . $conn->real_escape_string($date_to) . " 23:59:59'";
            }
            $count_sql .= implode(" AND ", $conditions);
        }
        break;
        
    case 'cdk_usage':
     
        $sql = "SELECT 
                    u.id,
                    'cdk_usage' as source,
                    u.cdk_id as target_id,
                    u.user_id,
                    '使用CDK' as event_type,
                    u.use_time as log_time,
                    CONCAT('使用CDK: ', c.code) as description,
                    CONCAT('获得 ', c.reward, ' ', c.item_name) as remark,
                    CONCAT('CDK类型: ', c.item_type) as detail
                FROM mok_cdk_usage u
                LEFT JOIN mok_cdk c ON u.cdk_id = c.id";
        
        if (!empty($search)) {
            $sql .= " WHERE u.user_id LIKE '%" . $conn->real_escape_string($search) . "%' 
                     OR c.code LIKE '%" . $conn->real_escape_string($search) . "%'";
        }
        if (!empty($date_from)) {
            $sql .= (strpos($sql, 'WHERE') === false ? ' WHERE ' : ' AND ') . 
                    "u.use_time >= '" . $conn->real_escape_string($date_from) . " 00:00:00'";
        }
        if (!empty($date_to)) {
            $sql .= (strpos($sql, 'WHERE') === false ? ' WHERE ' : ' AND ') . 
                    "u.use_time <= '" . $conn->real_escape_string($date_to) . " 23:59:59'";
        }
        
        $sql .= " ORDER BY u.use_time DESC LIMIT $offset, $per_page";
        
   
        $count_sql = "SELECT COUNT(*) as total FROM mok_cdk_usage u LEFT JOIN mok_cdk c ON u.cdk_id = c.id";
        if (!empty($search) || !empty($date_from) || !empty($date_to)) {
            $count_sql .= " WHERE ";
            $conditions = [];
            if (!empty($search)) {
                $conditions[] = "u.user_id LIKE '%" . $conn->real_escape_string($search) . "%' 
                               OR c.code LIKE '%" . $conn->real_escape_string($search) . "%'";
            }
            if (!empty($date_from)) {
                $conditions[] = "u.use_time >= '" . $conn->real_escape_string($date_from) . " 00:00:00'";
            }
            if (!empty($date_to)) {
                $conditions[] = "u.use_time <= '" . $conn->real_escape_string($date_to) . " 23:59:59'";
            }
            $count_sql .= implode(" AND ", $conditions);
        }
        break;
        
    case 'traffic':

        $sql = "SELECT 
                    id,
                    'traffic' as source,
                    user_id as target_id,
                    user_id,
                    '流量统计' as event_type,
                    update_time as log_time,
                    CONCAT('流量统计 (', period_date, ')') as description,
                    CONCAT('上传: ', ROUND(upload_bytes/1024/1024, 2), 'MB, 下载: ', ROUND(download_bytes/1024/1024, 2), 'MB') as remark,
                    CONCAT('文件数: ', file_count, ', 总大小: ', ROUND(total_used_bytes/1024/1024, 2), 'MB') as detail
                FROM mok_user_traffic";
        
        if (!empty($search)) {
            $sql .= " WHERE user_id LIKE '%" . $conn->real_escape_string($search) . "%'";
        }
        if (!empty($date_from)) {
            $sql .= (strpos($sql, 'WHERE') === false ? ' WHERE ' : ' AND ') . 
                    "update_time >= '" . $conn->real_escape_string($date_from) . " 00:00:00'";
        }
        if (!empty($date_to)) {
            $sql .= (strpos($sql, 'WHERE') === false ? ' WHERE ' : ' AND ') . 
                    "update_time <= '" . $conn->real_escape_string($date_to) . " 23:59:59'";
        }
        
        $sql .= " ORDER BY update_time DESC LIMIT $offset, $per_page";
        
     
        $count_sql = "SELECT COUNT(*) as total FROM mok_user_traffic";
        if (!empty($search) || !empty($date_from) || !empty($date_to)) {
            $count_sql .= " WHERE ";
            $conditions = [];
            if (!empty($search)) {
                $conditions[] = "user_id LIKE '%" . $conn->real_escape_string($search) . "%'";
            }
            if (!empty($date_from)) {
                $conditions[] = "update_time >= '" . $conn->real_escape_string($date_from) . " 00:00:00'";
            }
            if (!empty($date_to)) {
                $conditions[] = "update_time <= '" . $conn->real_escape_string($date_to) . " 23:59:59'";
            }
            $count_sql .= implode(" AND ", $conditions);
        }
        break;
        
    default:
        $all_logs = []; 
        $sql1 = "SELECT 
                    id,
                    'group_log' as source,
                    group_id as target_id,
                    user_id,
                    action as event_type,
                    action_time as log_time,
                    CONCAT('群操作: ', action) as description,
                    remark,
                    NULL as detail
                FROM mok_group_log";
        $result1 = $conn->query($sql1);
        if ($result1) {
            while ($row = $result1->fetch_assoc()) {
                $all_logs[] = $row;
            }
        }
        
  
        $sql2 = "SELECT 
                    id,
                    'redpacket' as source,
                    group_id as target_id,
                    sender_id as user_id,
                    CASE 
                        WHEN status = 1 THEN '发送红包'
                        WHEN status = 2 THEN '红包抢完'
                        WHEN status = 3 THEN '红包过期'
                        WHEN status = 4 THEN '红包退款'
                        ELSE '红包状态'
                    END as event_type,
                    create_time as log_time,
                    CONCAT('红包 ', packet_no) as description,
                    CONCAT('总金额:', total_amount, 'G币, 总个数:', total_count) as remark,
                    CONCAT('祝福语: ', blessing) as detail
                FROM mok_redpacket";
        $result2 = $conn->query($sql2);
        if ($result2) {
            while ($row = $result2->fetch_assoc()) {
                $all_logs[] = $row;
            }
        }
        
     
        $sql3 = "SELECT 
                    u.id,
                    'cdk_usage' as source,
                    u.cdk_id as target_id,
                    u.user_id,
                    '使用CDK' as event_type,
                    u.use_time as log_time,
                    CONCAT('使用CDK: ', c.code) as description,
                    CONCAT('获得 ', c.reward, ' ', c.item_name) as remark,
                    CONCAT('CDK类型: ', c.item_type) as detail
                FROM mok_cdk_usage u
                LEFT JOIN mok_cdk c ON u.cdk_id = c.id";
        $result3 = $conn->query($sql3);
        if ($result3) {
            while ($row = $result3->fetch_assoc()) {
                $all_logs[] = $row;
            }
        }
        
      
        $sql4 = "SELECT 
                    id,
                    'traffic' as source,
                    user_id as target_id,
                    user_id,
                    '流量统计' as event_type,
                    update_time as log_time,
                    CONCAT('流量统计 (', period_date, ')') as description,
                    CONCAT('上传: ', ROUND(upload_bytes/1024/1024, 2), 'MB, 下载: ', ROUND(download_bytes/1024/1024, 2), 'MB') as remark,
                    CONCAT('文件数: ', file_count, ', 总大小: ', ROUND(total_used_bytes/1024/1024, 2), 'MB') as detail
                FROM mok_user_traffic";
        $result4 = $conn->query($sql4);
        if ($result4) {
            while ($row = $result4->fetch_assoc()) {
                $all_logs[] = $row;
            }
        }
        
   
        usort($all_logs, function($a, $b) {
            return strtotime($b['log_time']) - strtotime($a['log_time']);
        });
        
      
        if (!empty($search)) {
            $all_logs = array_filter($all_logs, function($item) use ($search) {
                return stripos($item['user_id'], $search) !== false || 
                       stripos($item['target_id'], $search) !== false ||
                       stripos($item['description'], $search) !== false;
            });
        }
        if (!empty($date_from)) {
            $all_logs = array_filter($all_logs, function($item) use ($date_from) {
                return strtotime($item['log_time']) >= strtotime($date_from . " 00:00:00");
            });
        }
        if (!empty($date_to)) {
            $all_logs = array_filter($all_logs, function($item) use ($date_to) {
                return strtotime($item['log_time']) <= strtotime($date_to . " 23:59:59");
            });
        }
        
    
        $all_logs = array_values($all_logs);
        $total = count($all_logs);
        
    
        $logs = array_slice($all_logs, $offset, $per_page);
        
   
        $stats = [];
        $stats['group_log'] = $conn->query("SELECT COUNT(*) as count FROM mok_group_log")->fetch_assoc()['count'];
        $stats['redpacket'] = $conn->query("SELECT COUNT(*) as count FROM mok_redpacket")->fetch_assoc()['count'];
        $stats['cdk_usage'] = $conn->query("SELECT COUNT(*) as count FROM mok_cdk_usage")->fetch_assoc()['count'];
        $stats['traffic'] = $conn->query("SELECT COUNT(*) as count FROM mok_user_traffic")->fetch_assoc()['count'];
        $stats['total'] = array_sum($stats);
        
      
        $today = date('Y-m-d');
        $today_stats = [];
        $today_stats['group_log'] = $conn->query("SELECT COUNT(*) as count FROM mok_group_log WHERE DATE(action_time) = '$today'")->fetch_assoc()['count'];
        $today_stats['redpacket'] = $conn->query("SELECT COUNT(*) as count FROM mok_redpacket WHERE DATE(create_time) = '$today'")->fetch_assoc()['count'];
        $today_stats['cdk_usage'] = $conn->query("SELECT COUNT(*) as count FROM mok_cdk_usage WHERE DATE(use_time) = '$today'")->fetch_assoc()['count'];
        
        $conn->close();
        outputPage($log_type, $logs, $total, $page, $per_page, $stats, $today_stats, $search, $date_from, $date_to);
        exit;
}

$result = $conn->query($sql);
if ($result === false) {
    die('SQL错误: ' . $conn->error . ' SQL: ' . $sql);
}
$logs = $result;


$count_result = $conn->query($count_sql);
if ($count_result === false) {
    die('SQL错误: ' . $conn->error . ' SQL: ' . $count_sql);
}
$total = $count_result->fetch_assoc()['total'];

$total_pages = $total > 0 ? ceil($total / $per_page) : 1;


$stats = [];
$stats['group_log'] = $conn->query("SELECT COUNT(*) as count FROM mok_group_log")->fetch_assoc()['count'];
$stats['redpacket'] = $conn->query("SELECT COUNT(*) as count FROM mok_redpacket")->fetch_assoc()['count'];
$stats['cdk_usage'] = $conn->query("SELECT COUNT(*) as count FROM mok_cdk_usage")->fetch_assoc()['count'];
$stats['traffic'] = $conn->query("SELECT COUNT(*) as count FROM mok_user_traffic")->fetch_assoc()['count'];
$stats['total'] = array_sum($stats);


$today = date('Y-m-d');
$today_stats = [];
$today_stats['group_log'] = $conn->query("SELECT COUNT(*) as count FROM mok_group_log WHERE DATE(action_time) = '$today'")->fetch_assoc()['count'];
$today_stats['redpacket'] = $conn->query("SELECT COUNT(*) as count FROM mok_redpacket WHERE DATE(create_time) = '$today'")->fetch_assoc()['count'];
$today_stats['cdk_usage'] = $conn->query("SELECT COUNT(*) as count FROM mok_cdk_usage WHERE DATE(use_time) = '$today'")->fetch_assoc()['count'];

$conn->close();

outputPage($log_type, $logs, $total, $page, $per_page, $stats, $today_stats, $search, $date_from, $date_to);

function outputPage($log_type, $logs, $total, $page, $per_page, $stats, $today_stats, $search, $date_from, $date_to) {
    $total_pages = $total > 0 ? ceil($total / $per_page) : 1;
    $offset = ($page - 1) * $per_page;
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>日志中心 - MOK-IM 后台</title>
    <link rel="stylesheet" href="static/css/style.css">
    <style>
        .logs-container {
            padding: 20px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .stat-card {
            background: #fff7f2;
            border-radius: 20px;
            padding: 18px 20px;
            border: 1px solid #ffe0d2;
            transition: 0.2s;
            cursor: pointer;
        }
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(255, 150, 120, 0.12);
        }
        .stat-card .num {
            font-size: 28px;
            font-weight: 700;
            color: #4a4a4a;
        }
        .stat-card .label {
            color: #ff9a88;
            font-size: 13px;
        }
        .stat-card .sub {
            color: #bbb;
            font-size: 12px;
            margin-top: 4px;
        }
        .stat-card.active {
            border-color: #ff9a8b;
            background: #fff0ea;
        }
        
        .filter-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 20px;
            align-items: center;
            background: white;
            padding: 16px 20px;
            border-radius: 16px;
            border: 1px solid #f0ebe8;
        }
        .filter-bar select,
        .filter-bar input[type="text"],
        .filter-bar input[type="date"] {
            padding: 8px 14px;
            border: 2px solid #f0ebe8;
            border-radius: 30px;
            font-size: 14px;
            background: white;
            transition: 0.2s;
        }
        .filter-bar select:focus,
        .filter-bar input:focus {
            border-color: #ff9a8b;
            outline: none;
        }
        .filter-bar .btn {
            padding: 8px 20px;
            border: none;
            border-radius: 30px;
            cursor: pointer;
            font-size: 14px;
            transition: 0.2s;
        }
        .btn-primary { background: #ff9a8b; color: white; }
        .btn-primary:hover { transform: scale(0.95); }
        .btn-outline { background: transparent; border: 2px solid #f0ebe8; color: #666; }
        .btn-outline:hover { background: #f5f0ed; }
        
        .logs-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .logs-table th {
            background: #fff7f2;
            padding: 14px 16px;
            text-align: left;
            font-size: 13px;
            color: #666;
            font-weight: 600;
            border-bottom: 2px solid #ffe0d2;
        }
        .logs-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #f5f0ed;
            font-size: 14px;
            vertical-align: middle;
        }
        .logs-table tr:hover td {
            background: #fdf8f5;
        }
        
        .badge-source {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        .badge-group { background: #e3f2fd; color: #1565c0; }
        .badge-redpacket { background: #fce4ec; color: #c62828; }
        .badge-cdk { background: #e8f5e9; color: #2e7d32; }
        .badge-traffic { background: #fff3e0; color: #e65100; }
        
        .text-muted { color: #999; font-size: 12px; }
        .log-detail { 
            color: #666; 
            font-size: 13px;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .log-detail:hover {
            white-space: normal;
            overflow: visible;
        }
        
        .pagination {
            display: flex;
            gap: 6px;
            margin-top: 18px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .pagination a, .pagination span {
            padding: 6px 14px;
            border-radius: 20px;
            border: 1px solid #eee;
            text-decoration: none;
            color: #555;
            font-size: 13px;
        }
        .pagination a:hover { background: #ff9a8b; color: white; border-color: #ff9a8b; }
        .pagination .current { background: #ff9a8b; color: white; border-color: #ff9a8b; }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #bbb;
        }
        .empty-state .icon { font-size: 48px; margin-bottom: 12px; }
        
        .timestamp {
            font-size: 12px;
            color: #888;
            white-space: nowrap;
        }
        
        .user-id {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #4a4a4a;
            background: #f5f0ed;
            padding: 2px 8px;
            border-radius: 4px;
        }
        
        .event-badge {
            display: inline-block;
            padding: 3px 12px;
            border-radius: 20px;
            font-size: 12px;
            background: #f0ebe8;
            color: #666;
        }
        
        @media (max-width: 768px) {
            .logs-table {
                font-size: 12px;
            }
            .logs-table th, .logs-table td {
                padding: 8px 10px;
            }
            .filter-bar {
                flex-direction: column;
                align-items: stretch;
            }
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <?php include 'templates/header.php'; ?>
    
    <div class="main-container logs-container">
        <h2>📋 日志中心</h2>
        
     
        <div class="stats-grid">
            <div class="stat-card <?php echo $log_type == 'all' ? 'active' : ''; ?>" onclick="window.location.href='?log_type=all'">
                <div class="num"><?php echo $stats['total']; ?></div>
                <div class="label">📊 全部日志</div>
                <div class="sub">今日新增 <?php echo array_sum($today_stats); ?></div>
            </div>
            <div class="stat-card <?php echo $log_type == 'group_log' ? 'active' : ''; ?>" onclick="window.location.href='?log_type=group_log'">
                <div class="num"><?php echo $stats['group_log']; ?></div>
                <div class="label">👥 群操作日志</div>
                <div class="sub">今日 <?php echo $today_stats['group_log']; ?></div>
            </div>
            <div class="stat-card <?php echo $log_type == 'redpacket' ? 'active' : ''; ?>" onclick="window.location.href='?log_type=redpacket'">
                <div class="num"><?php echo $stats['redpacket']; ?></div>
                <div class="label">🧧 红包记录</div>
                <div class="sub">今日 <?php echo $today_stats['redpacket']; ?></div>
            </div>
            <div class="stat-card <?php echo $log_type == 'cdk_usage' ? 'active' : ''; ?>" onclick="window.location.href='?log_type=cdk_usage'">
                <div class="num"><?php echo $stats['cdk_usage']; ?></div>
                <div class="label">🎫 CDK使用记录</div>
                <div class="sub">今日 <?php echo $today_stats['cdk_usage']; ?></div>
            </div>
            <div class="stat-card <?php echo $log_type == 'traffic' ? 'active' : ''; ?>" onclick="window.location.href='?log_type=traffic'">
                <div class="num"><?php echo $stats['traffic']; ?></div>
                <div class="label">📡 流量统计</div>
                <div class="sub">月度数据</div>
            </div>
        </div>
        
    
        <div class="filter-bar">
            <form method="GET" action="" style="display: flex; flex-wrap: wrap; gap: 10px; width: 100%; align-items: center;">
                <input type="hidden" name="log_type" value="<?php echo htmlspecialchars($log_type); ?>">
                
                <input type="text" name="search" placeholder="🔍 搜索用户/群组/CDK..." 
                       value="<?php echo htmlspecialchars($search); ?>">
                
                <input type="date" name="date_from" value="<?php echo htmlspecialchars($date_from); ?>" 
                       placeholder="开始日期">
                <input type="date" name="date_to" value="<?php echo htmlspecialchars($date_to); ?>" 
                       placeholder="结束日期">
                
                <button type="submit" class="btn btn-primary">筛选</button>
                <?php if (!empty($search) || !empty($date_from) || !empty($date_to) || $log_type != 'all'): ?>
                    <a href="logs_center.php" class="btn btn-outline">清除</a>
                <?php endif; ?>
            </form>
        </div>
        
   
        <?php 
        $has_data = false;
        if (is_object($logs) && $logs->num_rows > 0) {
            $has_data = true;
        } elseif (is_array($logs) && count($logs) > 0) {
            $has_data = true;
        }
        
        if ($has_data): 
        ?>
        <table class="logs-table">
            <thead>
                <tr>
                    <th style="width:50px;">#</th>
                    <th style="width:80px;">来源</th>
                    <th>事件</th>
                    <th>用户</th>
                    <th>详情</th>
                    <th style="width:160px;">时间</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $counter = $offset + 1;
            
                $rows = is_object($logs) ? $logs : $logs;
                foreach ($rows as $row):
                    $source_badge = '';
                    switch ($row['source']) {
                        case 'group_log':
                            $source_badge = '<span class="badge-source badge-group">👥 群操作</span>';
                            break;
                        case 'redpacket':
                            $source_badge = '<span class="badge-source badge-redpacket">🧧 红包</span>';
                            break;
                        case 'cdk_usage':
                            $source_badge = '<span class="badge-source badge-cdk">🎫 CDK</span>';
                            break;
                        case 'traffic':
                            $source_badge = '<span class="badge-source badge-traffic">📡 流量</span>';
                            break;
                        default:
                            $source_badge = '<span class="badge-source">📋 其他</span>';
                    }
                ?>
                <tr>
                    <td><?php echo $counter++; ?></td>
                    <td><?php echo $source_badge; ?></td>
                    <td>
                        <span class="event-badge"><?php echo htmlspecialchars($row['event_type']); ?></span>
                        <div class="text-muted" style="margin-top:2px;">
                            <?php echo htmlspecialchars($row['description']); ?>
                        </div>
                    </td>
                    <td>
                        <span class="user-id"><?php echo htmlspecialchars($row['user_id']); ?></span>
                        <?php if (!empty($row['target_id']) && $row['target_id'] != $row['user_id']): ?>
                            <div class="text-muted">目标: <?php echo htmlspecialchars($row['target_id']); ?></div>
                        <?php endif; ?>
                    </td>
                    <td>
                        <div class="log-detail">
                            <?php if (!empty($row['remark'])): ?>
                                <div><?php echo htmlspecialchars($row['remark']); ?></div>
                            <?php endif; ?>
                            <?php if (!empty($row['detail'])): ?>
                                <div class="text-muted"><?php echo htmlspecialchars($row['detail']); ?></div>
                            <?php endif; ?>
                        </div>
                    </td>
                    <td>
                        <div class="timestamp">
                            <?php echo date('Y-m-d H:i:s', strtotime($row['log_time'])); ?>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    
        <?php if ($total_pages > 1): ?>
        <div class="pagination">
            <?php if ($page > 1): ?>
                <a href="?page=<?php echo $page-1; ?>&log_type=<?php echo urlencode($log_type); ?>&search=<?php echo urlencode($search); ?>&date_from=<?php echo urlencode($date_from); ?>&date_to=<?php echo urlencode($date_to); ?>">上一页</a>
            <?php endif; ?>
            <?php 
            $start_page = max(1, $page - 2);
            $end_page = min($total_pages, $page + 2);
            for ($i = $start_page; $i <= $end_page; $i++): 
            ?>
                <?php if ($i == $page): ?>
                    <span class="current"><?php echo $i; ?></span>
                <?php else: ?>
                    <a href="?page=<?php echo $i; ?>&log_type=<?php echo urlencode($log_type); ?>&search=<?php echo urlencode($search); ?>&date_from=<?php echo urlencode($date_from); ?>&date_to=<?php echo urlencode($date_to); ?>"><?php echo $i; ?></a>
                <?php endif; ?>
            <?php endfor; ?>
            <?php if ($page < $total_pages): ?>
                <a href="?page=<?php echo $page+1; ?>&log_type=<?php echo urlencode($log_type); ?>&search=<?php echo urlencode($search); ?>&date_from=<?php echo urlencode($date_from); ?>&date_to=<?php echo urlencode($date_to); ?>">下一页</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
        
        <?php else: ?>
        <div class="empty-state">
            <div class="icon">📭</div>
            <p>暂无日志记录</p>
            <p class="text-muted">系统运行后将自动记录各类操作</p>
        </div>
        <?php endif; ?>
        
       
        <div style="margin-top: 16px; color: #bbb; font-size: 12px; text-align: center;">
            共 <?php echo $total; ?> 条记录 | 每页显示 <?php echo $per_page; ?> 条
        </div>
    </div>
</body>
</html>
<?php
}
?>