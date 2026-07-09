<?php
require_once 'config.php';
checkAuth();
$conn = connectDB();
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $action = $_POST['action'];
    $apply_id = intval($_POST['apply_id'] ?? 0);
    $remark = isset($_POST['remark']) ? trim($_POST['remark']) : '';
    
    if ($apply_id > 0) {
        if ($action === 'approve') {
         
            $stmt = $conn->prepare("UPDATE mok_application SET status = 2, handle_time = NOW(), remark = ? WHERE id = ?");
            $stmt->bind_param("si", $remark, $apply_id);
            if ($stmt->execute()) {
            
                $app_info = $conn->query("SELECT applicant_id, target_id, app_type FROM mok_application WHERE id = $apply_id")->fetch_assoc();
                if ($app_info && $app_info['app_type'] == 1) {
              
                    $check = $conn->query("SELECT id FROM mok_contact WHERE user_id = '{$app_info['applicant_id']}' AND friend_id = '{$app_info['target_id']}'");
                    if ($check->num_rows == 0) {
                        $conn->query("INSERT INTO mok_contact (user_id, friend_id, add_status, add_time) VALUES ('{$app_info['applicant_id']}', '{$app_info['target_id']}', 1, NOW())");
                        $conn->query("INSERT INTO mok_contact (user_id, friend_id, add_status, add_time) VALUES ('{$app_info['target_id']}', '{$app_info['applicant_id']}', 1, NOW())");
                    }
                }
                $success = '申请已同意！';
            } else {
                $error = '操作失败：' . $conn->error;
            }
        } elseif ($action === 'reject') {
            
            $stmt = $conn->prepare("UPDATE mok_application SET status = 0, handle_time = NOW(), remark = ? WHERE id = ?");
            $stmt->bind_param("si", $remark, $apply_id);
            if ($stmt->execute()) {
                $success = '申请已拒绝！';
            } else {
                $error = '操作失败：' . $conn->error;
            }
        } elseif ($action === 'batch_approve') {
            
            $ids = $_POST['ids'] ?? [];
            if (!empty($ids)) {
                $id_list = implode(',', array_map('intval', $ids));
                $conn->query("UPDATE mok_application SET status = 2, handle_time = NOW() WHERE id IN ($id_list)");
                $success = '批量同意成功！';
            }
        } elseif ($action === 'batch_reject') {
            
            $ids = $_POST['ids'] ?? [];
            if (!empty($ids)) {
                $id_list = implode(',', array_map('intval', $ids));
                $conn->query("UPDATE mok_application SET status = 0, handle_time = NOW() WHERE id IN ($id_list)");
                $success = '批量拒绝成功！';
            }
        }
    }
}

$app_type = isset($_GET['app_type']) ? intval($_GET['app_type']) : -1;
$status = isset($_GET['status']) ? intval($_GET['status']) : 1; 
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$per_page = 20;
$offset = ($page - 1) * $per_page;
$where = ["1=1"];

if ($app_type >= 0) {
    $where[] = "a.app_type = $app_type";
}
if ($status >= 0) {
    $where[] = "a.status = $status";
}
if (!empty($search)) {
    $search = $conn->real_escape_string($search);
    $where[] = "(a.applicant_id LIKE '%$search%' OR a.target_id LIKE '%$search%' OR u1.uname LIKE '%$search%' OR u2.uname LIKE '%$search%')";
}
$where_sql = implode(" AND ", $where);
$sql = "SELECT 
            a.*,
            u1.uname as applicant_name,
            u2.uname as target_name,
            CASE 
                WHEN a.app_type = 1 THEN '好友申请'
                WHEN a.app_type = 2 THEN '群聊申请'
            END as type_name,
            CASE 
                WHEN a.status = 0 THEN '已拒绝'
                WHEN a.status = 1 THEN '待处理'
                WHEN a.status = 2 THEN '已同意'
                WHEN a.status = 3 THEN '已过期'
                WHEN a.status = 4 THEN '已取消'
            END as status_name
        FROM mok_application a
        LEFT JOIN mok_user u1 ON a.applicant_id = u1.id
        LEFT JOIN mok_user u2 ON a.target_id = u2.id
        WHERE $where_sql
        ORDER BY a.apply_time DESC
        LIMIT $offset, $per_page";

$result = $conn->query($sql);
if ($result === false) {
    die('SQL错误: ' . $conn->error);
}
$count_sql = "SELECT COUNT(*) as total FROM mok_application a WHERE $where_sql";
$count_result = $conn->query($count_sql);
$total = $count_result->fetch_assoc()['total'];
$total_pages = $total > 0 ? ceil($total / $per_page) : 1;
$stats = [];
$stats['pending'] = $conn->query("SELECT COUNT(*) as count FROM mok_application WHERE status = 1")->fetch_assoc()['count'];
$stats['friend'] = $conn->query("SELECT COUNT(*) as count FROM mok_application WHERE app_type = 1 AND status = 1")->fetch_assoc()['count'];
$stats['group'] = $conn->query("SELECT COUNT(*) as count FROM mok_application WHERE app_type = 2 AND status = 1")->fetch_assoc()['count'];
$stats['today'] = $conn->query("SELECT COUNT(*) as count FROM mok_application WHERE DATE(apply_time) = CURDATE() AND status = 1")->fetch_assoc()['count'];

$conn->close();
?>

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>申请管理 - MOK-IM 后台</title>
    <link rel="stylesheet" href="static/css/style.css">
    <style>
        .app-container {
            padding: 20px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .stat-card {
            background: #fff7f2;
            border-radius: 20px;
            padding: 18px 20px;
            border: 1px solid #ffe0d2;
            cursor: pointer;
            transition: 0.2s;
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
        .filter-bar input[type="text"] {
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
        .btn-success { background: #28a745; color: white; }
        .btn-success:hover { transform: scale(0.95); }
        .btn-danger { background: #dc3545; color: white; }
        .btn-danger:hover { transform: scale(0.95); }
        .btn-outline { background: transparent; border: 2px solid #f0ebe8; color: #666; }
        .btn-outline:hover { background: #f5f0ed; }
        .btn-sm { padding: 4px 12px; font-size: 12px; }
        
        .app-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .app-table th {
            background: #fff7f2;
            padding: 14px 16px;
            text-align: left;
            font-size: 13px;
            color: #666;
            font-weight: 600;
            border-bottom: 2px solid #ffe0d2;
        }
        .app-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #f5f0ed;
            font-size: 14px;
            vertical-align: middle;
        }
        .app-table tr:hover td {
            background: #fdf8f5;
        }
        .app-table tr.pending {
            background: #fffbf0;
        }
        .app-table tr.pending:hover td {
            background: #fff7e6;
        }
        
        .badge {
            display: inline-block;
            padding: 3px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-pending { background: #fff3cd; color: #856404; }
        .badge-approved { background: #d4edda; color: #155724; }
        .badge-rejected { background: #f8d7da; color: #721c24; }
        .badge-expired { background: #e2e3e5; color: #383d41; }
        .badge-cancelled { background: #e2e3e5; color: #383d41; }
        .badge-friend { background: #e3f2fd; color: #1565c0; }
        .badge-group { background: #f3e5f5; color: #6a1b9a; }
        
        .user-tag {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #4a4a4a;
            background: #f5f0ed;
            padding: 2px 8px;
            border-radius: 4px;
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
        
        .msg { 
            padding: 12px 20px;
            border-radius: 12px;
            margin-bottom: 16px;
        }
        .msg-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .msg-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        
        .reason-text {
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #888;
            font-size: 13px;
        }
        
        .action-group {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }
        
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.4);
            z-index: 999;
            justify-content: center;
            align-items: center;
        }
        .modal-overlay.show { display: flex; }
        .modal-box {
            background: white;
            border-radius: 24px;
            padding: 30px 35px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .modal-box h3 {
            margin-top: 0;
            color: #4a4a4a;
        }
        .modal-box textarea {
            width: 100%;
            padding: 10px 14px;
            border: 2px solid #f0ebe8;
            border-radius: 12px;
            font-size: 14px;
            min-height: 80px;
            resize: vertical;
            box-sizing: border-box;
        }
        .modal-box textarea:focus {
            border-color: #ff9a8b;
            outline: none;
        }
        .modal-box .btn-row {
            display: flex;
            gap: 10px;
            margin-top: 16px;
        }
        .modal-box .btn-row .btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 60px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
        }
        .modal-box .btn-row .btn:hover { transform: scale(0.97); }
        .modal-box .close-btn {
            float: right;
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #ccc;
            line-height: 1;
        }
        .modal-box .close-btn:hover { color: #666; }
        
        .checkbox-col {
            width: 40px;
            text-align: center;
        }
        .checkbox-col input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }
        
        .toolbar-right {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        @media (max-width: 768px) {
            .app-table {
                font-size: 12px;
            }
            .app-table th, .app-table td {
                padding: 8px 10px;
            }
            .filter-bar {
                flex-direction: column;
                align-items: stretch;
            }
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            .action-group {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <?php include 'templates/header.php'; ?>
    
    <div class="main-container app-container">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
            <h2>📋 申请管理</h2>
            <?php if ($stats['pending'] > 0): ?>
                <span style="background: #ff9a8b; color: white; padding: 6px 16px; border-radius: 30px; font-size: 14px;">
                    ⏳ 待处理: <?php echo $stats['pending']; ?>
                </span>
            <?php endif; ?>
        </div>
        
        <?php if (isset($success)): ?>
            <div class="msg msg-success"><?php echo htmlspecialchars($success); ?></div>
        <?php endif; ?>
        <?php if (isset($error)): ?>
            <div class="msg msg-error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        
    
        <div class="stats-grid">
            <div class="stat-card <?php echo $status == 1 ? 'active' : ''; ?>" onclick="window.location.href='?status=1'">
                <div class="num"><?php echo $stats['pending']; ?></div>
                <div class="label">⏳ 待处理</div>
                <div class="sub">今日新增 <?php echo $stats['today']; ?></div>
            </div>
            <div class="stat-card <?php echo $app_type == 1 && $status == 1 ? 'active' : ''; ?>" onclick="window.location.href='?app_type=1&status=1'">
                <div class="num"><?php echo $stats['friend']; ?></div>
                <div class="label">👤 好友申请</div>
                <div class="sub">待处理</div>
            </div>
            <div class="stat-card <?php echo $app_type == 2 && $status == 1 ? 'active' : ''; ?>" onclick="window.location.href='?app_type=2&status=1'">
                <div class="num"><?php echo $stats['group']; ?></div>
                <div class="label">👥 群聊申请</div>
                <div class="sub">待处理</div>
            </div>
            <div class="stat-card" onclick="window.location.href='?status=-1'">
                <div class="num"><?php echo $total; ?></div>
                <div class="label">📊 全部申请</div>
                <div class="sub">所有记录</div>
            </div>
        </div>
        
   
        <div class="filter-bar">
            <form method="GET" action="" style="display: flex; flex-wrap: wrap; gap: 10px; width: 100%; align-items: center;">
                <select name="app_type">
                    <option value="-1">全部类型</option>
                    <option value="1" <?php echo $app_type == 1 ? 'selected' : ''; ?>>好友申请</option>
                    <option value="2" <?php echo $app_type == 2 ? 'selected' : ''; ?>>群聊申请</option>
                </select>
                <select name="status">
                    <option value="-1">全部状态</option>
                    <option value="1" <?php echo $status == 1 ? 'selected' : ''; ?>>待处理</option>
                    <option value="2" <?php echo $status == 2 ? 'selected' : ''; ?>>已同意</option>
                    <option value="0" <?php echo $status == 0 ? 'selected' : ''; ?>>已拒绝</option>
                    <option value="3" <?php echo $status == 3 ? 'selected' : ''; ?>>已过期</option>
                    <option value="4" <?php echo $status == 4 ? 'selected' : ''; ?>>已取消</option>
                </select>
                <input type="text" name="search" placeholder="🔍 搜索用户ID或昵称..." 
                       value="<?php echo htmlspecialchars($search); ?>">
                <button type="submit" class="btn btn-primary">筛选</button>
                <?php if (!empty($search) || $app_type >= 0 || $status >= 0): ?>
                    <a href="application_manage.php" class="btn btn-outline">清除</a>
                <?php endif; ?>
            </form>
        </div>
        
      
        <?php if ($result && $result->num_rows > 0): ?>
        
        <form method="POST" action="" id="batchForm">
            <div style="display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
                <button type="button" class="btn btn-sm btn-outline" onclick="toggleAll()">全选</button>
                <button type="submit" class="btn btn-sm btn-success" onclick="return batchAction('approve')">✅ 批量同意</button>
                <button type="submit" class="btn btn-sm btn-danger" onclick="return batchAction('reject')">❌ 批量拒绝</button>
                <span style="color: #999; font-size: 13px; margin-left: 8px;">已选 <span id="selectedCount">0</span> 项</span>
            </div>
            
            <table class="app-table">
                <thead>
                    <tr>
                        <th class="checkbox-col">
                            <input type="checkbox" id="selectAll" onchange="toggleAll()">
                        </th>
                        <th>申请类型</th>
                        <th>申请人</th>
                        <th>目标对象</th>
                        <th>申请理由</th>
                        <th>状态</th>
                        <th>申请时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <?php while ($row = $result->fetch_assoc()): 
                        $is_pending = $row['status'] == 1;
                        $tr_class = $is_pending ? 'pending' : '';
                    ?>
                    <tr class="<?php echo $tr_class; ?>">
                        <td class="checkbox-col">
                            <?php if ($is_pending): ?>
                                <input type="checkbox" name="ids[]" value="<?php echo $row['id']; ?>" class="row-checkbox" onchange="updateCount()">
                            <?php endif; ?>
                        </td>
                        <td>
                            <span class="badge <?php echo $row['app_type'] == 1 ? 'badge-friend' : 'badge-group'; ?>">
                                <?php echo $row['type_name']; ?>
                            </span>
                        </td>
                        <td>
                            <div class="user-tag"><?php echo htmlspecialchars($row['applicant_id']); ?></div>
                            <?php if (!empty($row['applicant_name'])): ?>
                                <div style="font-size: 12px; color: #888;"><?php echo htmlspecialchars($row['applicant_name']); ?></div>
                            <?php endif; ?>
                        </td>
                        <td>
                            <div class="user-tag"><?php echo htmlspecialchars($row['target_id']); ?></div>
                            <?php if (!empty($row['target_name'])): ?>
                                <div style="font-size: 12px; color: #888;"><?php echo htmlspecialchars($row['target_name']); ?></div>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if (!empty($row['reason'])): ?>
                                <div class="reason-text" title="<?php echo htmlspecialchars($row['reason']); ?>">
                                    <?php echo htmlspecialchars($row['reason']); ?>
                                </div>
                            <?php else: ?>
                                <span style="color: #ccc; font-size: 12px;">无</span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php
                            $status_class = '';
                            switch ($row['status']) {
                                case 0: $status_class = 'badge-rejected'; break;
                                case 1: $status_class = 'badge-pending'; break;
                                case 2: $status_class = 'badge-approved'; break;
                                case 3: $status_class = 'badge-expired'; break;
                                case 4: $status_class = 'badge-cancelled'; break;
                            }
                            ?>
                            <span class="badge <?php echo $status_class; ?>">
                                <?php echo $row['status_name']; ?>
                            </span>
                            <?php if (!empty($row['remark']) && $row['status'] != 1): ?>
                                <div style="font-size: 11px; color: #888; margin-top: 2px;">
                                    <?php echo htmlspecialchars($row['remark']); ?>
                                </div>
                            <?php endif; ?>
                        </td>
                        <td style="font-size: 12px; color: #888; white-space: nowrap;">
                            <?php echo date('Y-m-d H:i', strtotime($row['apply_time'])); ?>
                        </td>
                        <td>
                            <?php if ($is_pending): ?>
                                <div class="action-group">
                                    <button type="button" class="btn btn-sm btn-success" onclick="handleApprove(<?php echo $row['id']; ?>)">
                                        同意
                                    </button>
                                    <button type="button" class="btn btn-sm btn-danger" onclick="handleReject(<?php echo $row['id']; ?>)">
                                        拒绝
                                    </button>
                                </div>
                            <?php else: ?>
                                <span style="color: #ccc; font-size: 12px;">已处理</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endwhile; ?>
                </tbody>
            </table>
            
            <input type="hidden" name="action" id="batchAction" value="">
            <input type="hidden" name="apply_id" id="applyId" value="">
            <input type="hidden" name="remark" id="remarkInput" value="">
        </form>
        
    
        <?php if ($total_pages > 1): ?>
        <div class="pagination">
            <?php if ($page > 1): ?>
                <a href="?page=<?php echo $page-1; ?>&app_type=<?php echo $app_type; ?>&status=<?php echo $status; ?>&search=<?php echo urlencode($search); ?>">上一页</a>
            <?php endif; ?>
            <?php 
            $start_page = max(1, $page - 2);
            $end_page = min($total_pages, $page + 2);
            for ($i = $start_page; $i <= $end_page; $i++): 
            ?>
                <?php if ($i == $page): ?>
                    <span class="current"><?php echo $i; ?></span>
                <?php else: ?>
                    <a href="?page=<?php echo $i; ?>&app_type=<?php echo $app_type; ?>&status=<?php echo $status; ?>&search=<?php echo urlencode($search); ?>"><?php echo $i; ?></a>
                <?php endif; ?>
            <?php endfor; ?>
            <?php if ($page < $total_pages): ?>
                <a href="?page=<?php echo $page+1; ?>&app_type=<?php echo $app_type; ?>&status=<?php echo $status; ?>&search=<?php echo urlencode($search); ?>">下一页</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
        
        <?php else: ?>
        <div class="empty-state">
            <div class="icon">📭</div>
            <p>暂无申请记录</p>
            <p class="text-muted">用户的好友申请和群聊申请将在这里显示</p>
        </div>
        <?php endif; ?>
        
      
        <div style="margin-top: 16px; color: #bbb; font-size: 12px; text-align: center;">
            共 <?php echo $total; ?> 条记录 | 每页显示 <?php echo $per_page; ?> 条
        </div>
    </div>
    
   
    <div class="modal-overlay" id="remarkModal">
        <div class="modal-box">
            <button class="close-btn" onclick="closeRemarkModal()">&times;</button>
            <h3 id="modalTitle">💬 处理申请</h3>
            <p style="color: #888; font-size: 14px; margin-bottom: 12px;">可选填写备注信息（如拒绝理由）</p>
            <textarea id="remarkText" placeholder="请输入备注..."></textarea>
            <div class="btn-row">
                <button class="btn btn-success" id="modalConfirmBtn" onclick="submitWithRemark()">确认</button>
                <button class="btn btn-outline" onclick="closeRemarkModal()">取消</button>
            </div>
        </div>
    </div>
    
    <script>
        let modalCallback = null;
        
        function handleApprove(id) {
            document.getElementById('applyId').value = id;
            document.getElementById('batchAction').value = 'approve';
            document.getElementById('modalTitle').textContent = '✅ 同意申请';
            document.getElementById('modalConfirmBtn').className = 'btn btn-success';
            document.getElementById('remarkText').value = '';
            document.getElementById('remarkModal').classList.add('show');
            modalCallback = 'approve';
        }
        
        function handleReject(id) {
            document.getElementById('applyId').value = id;
            document.getElementById('batchAction').value = 'reject';
            document.getElementById('modalTitle').textContent = '❌ 拒绝申请';
            document.getElementById('modalConfirmBtn').className = 'btn btn-danger';
            document.getElementById('remarkText').value = '';
            document.getElementById('remarkModal').classList.add('show');
            modalCallback = 'reject';
        }
        
        function submitWithRemark() {
            const remark = document.getElementById('remarkText').value.trim();
            document.getElementById('remarkInput').value = remark;
            document.getElementById('batchForm').submit();
        }
        
        function closeRemarkModal() {
            document.getElementById('remarkModal').classList.remove('show');
        }
        
    
        document.getElementById('remarkModal').addEventListener('click', function(e) {
            if (e.target === this) closeRemarkModal();
        });
        
        function toggleAll() {
            const checked = document.getElementById('selectAll').checked;
            document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = checked);
            updateCount();
        }
        
        function updateCount() {
            const checked = document.querySelectorAll('.row-checkbox:checked').length;
            document.getElementById('selectedCount').textContent = checked;
        }
        
        function batchAction(action) {
            const checked = document.querySelectorAll('.row-checkbox:checked');
            if (checked.length === 0) {
                alert('请至少选择一项申请！');
                return false;
            }
            
            const actionName = action === 'approve' ? '同意' : '拒绝';
            if (!confirm(`确定要批量${actionName}选中的 ${checked.length} 项申请吗？`)) {
                return false;
            }
            
            document.getElementById('batchAction').value = action === 'approve' ? 'batch_approve' : 'batch_reject';
            return true;
        }
        updateCount();
    </script>
</body>
</html>