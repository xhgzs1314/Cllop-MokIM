<?php
require_once 'config.php';
checkAuth();
$conn = connectDB();
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $action = $_POST['action'];
    
    if ($action === 'create') {
        $code = $_POST['code'] ?? '';
        $item_type = $_POST['item_type'] ?? 'gcoin';
        $reward = intval($_POST['reward'] ?? 0);
        $item_name = $_POST['item_name'] ?? 'G币';
        $use_type = intval($_POST['use_type'] ?? 1);
        $max_uses = $_POST['max_uses'] ? intval($_POST['max_uses']) : null;
        $expire_time = $_POST['expire_time'] ?? '';
        
        if (empty($code) || $reward <= 0 || empty($expire_time)) {
            $error = '请完整填写所有必填字段！';
        } else {
           
            $check = $conn->prepare("SELECT id FROM mok_cdk WHERE code = ?");
            $check->bind_param("s", $code);
            $check->execute();
            $result = $check->get_result();
            if ($result->num_rows > 0) {
                $error = '该CDK已存在，请更换！';
            } else {
                $stmt = $conn->prepare("INSERT INTO mok_cdk (code, item_type, reward, item_name, use_type, max_uses, expire_time) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("ssisiss", $code, $item_type, $reward, $item_name, $use_type, $max_uses, $expire_time);
                if ($stmt->execute()) {
                    $success = 'CDK创建成功！';
                } else {
                    $error = 'CDK创建失败：' . $conn->error;
                }
            }
        }
    }
    
 
    if ($action === 'delete') {
        $id = intval($_POST['id'] ?? 0);
        if ($id > 0) {
            $stmt = $conn->prepare("DELETE FROM mok_cdk WHERE id = ?");
            $stmt->bind_param("i", $id);
            if ($stmt->execute()) {
                $success = 'CDK删除成功！';
            } else {
                $error = '删除失败：' . $conn->error;
            }
        }
    }
    
   
    if ($action === 'toggle_status') {
        $id = intval($_POST['id'] ?? 0);
        $status = intval($_POST['status'] ?? 0);
        if ($id > 0) {
            $stmt = $conn->prepare("UPDATE mok_cdk SET status = ? WHERE id = ?");
            $stmt->bind_param("ii", $status, $id);
            if ($stmt->execute()) {
                $success = '状态更新成功！';
            } else {
                $error = '状态更新失败：' . $conn->error;
            }
        }
    }
    header("location: cdk.php");
}


$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$per_page = 20;
$offset = ($page - 1) * $per_page;


$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$status_filter = isset($_GET['status_filter']) ? intval($_GET['status_filter']) : -1;

$where_clauses = [];
$params = [];
$types = "";

if (!empty($search)) {
    $where_clauses[] = "code LIKE ?";
    $params[] = "%$search%";
    $types .= "s";
}
if ($status_filter >= 0) {
    $where_clauses[] = "status = ?";
    $params[] = $status_filter;
    $types .= "i";
}

$where_sql = !empty($where_clauses) ? "WHERE " . implode(" AND ", $where_clauses) : "";


$count_sql = "SELECT COUNT(*) as total FROM mok_cdk $where_sql";
$count_stmt = $conn->prepare($count_sql);
if (!empty($params)) {
    $count_stmt->bind_param($types, ...$params);
}
$count_stmt->execute();
$count_result = $count_stmt->get_result();
$total = $count_result->fetch_assoc()['total'];
$total_pages = ceil($total / $per_page);


$sql = "SELECT * FROM mok_cdk $where_sql ORDER BY create_time DESC LIMIT ? OFFSET ?";
$params[] = $per_page;
$params[] = $offset;
$types .= "ii";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$cdks = $stmt->get_result();


$stats_result = $conn->query("
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as inactive,
        SUM(used_count) as total_used
    FROM mok_cdk
");
$stats = $stats_result->fetch_assoc();

$conn->close();
?>

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>CDK管理 - MOK-IM 后台</title>
    <link rel="stylesheet" href="static/css/style.css">
    <style>
        .cdk-container {
            padding: 20px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }
        .stat-mini {
            background: #fff7f2;
            border-radius: 20px;
            padding: 18px 20px;
            border: 1px solid #ffe0d2;
        }
        .stat-mini .num {
            font-size: 28px;
            font-weight: 700;
            color: #4a4a4a;
        }
        .stat-mini .label {
            color: #ff9a88;
            font-size: 13px;
        }
        .cdk-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .cdk-table th {
            background: #fff7f2;
            padding: 14px 16px;
            text-align: left;
            font-size: 13px;
            color: #666;
            font-weight: 600;
            border-bottom: 2px solid #ffe0d2;
        }
        .cdk-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #f5f0ed;
            font-size: 14px;
        }
        .cdk-table tr:hover td {
            background: #fdf8f5;
        }
        .badge {
            display: inline-block;
            padding: 3px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-active { background: #d4edda; color: #155724; }
        .badge-inactive { background: #f8d7da; color: #721c24; }
        .badge-expired { background: #fff3cd; color: #856404; }
        .badge-type { background: #e8f0fe; color: #1a73e8; font-size: 11px; }
        .btn {
            padding: 6px 16px;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-size: 13px;
            transition: 0.2s;
            text-decoration: none;
            display: inline-block;
        }
        .btn-primary { background: #ff9a8b; color: white; }
        .btn-primary:hover { transform: scale(0.95); }
        .btn-danger { background: #dc3545; color: white; }
        .btn-danger:hover { transform: scale(0.95); }
        .btn-sm { padding: 4px 12px; font-size: 12px; }
        .btn-outline { background: transparent; border: 1px solid #ddd; color: #666; }
        .btn-outline:hover { background: #f5f0ed; }
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
            max-width: 520px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .modal-box h3 {
            margin-top: 0;
            color: #4a4a4a;
            font-size: 20px;
        }
        .modal-box label {
            display: block;
            margin: 12px 0 4px;
            font-weight: 600;
            font-size: 13px;
            color: #555;
        }
        .modal-box input, .modal-box select {
            width: 100%;
            padding: 10px 14px;
            border: 2px solid #f0ebe8;
            border-radius: 12px;
            font-size: 14px;
            transition: 0.2s;
            box-sizing: border-box;
        }
        .modal-box input:focus, .modal-box select:focus {
            border-color: #ff9a8b;
            outline: none;
        }
        .modal-box .row2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        .modal-box .btn-submit {
            width: 100%;
            padding: 12px;
            background: linear-gradient(145deg, #ffb7b2, #ff9a8b);
            border: none;
            border-radius: 60px;
            color: white;
            font-weight: 700;
            font-size: 16px;
            cursor: pointer;
            margin-top: 16px;
            transition: 0.2s;
        }
        .modal-box .btn-submit:hover { transform: scale(0.97); }
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
        .toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 18px;
            align-items: center;
        }
        .toolbar .btn { padding: 10px 24px; }
        .toolbar form { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .toolbar input[type="text"] {
            padding: 9px 16px;
            border: 2px solid #f0ebe8;
            border-radius: 30px;
            font-size: 14px;
            min-width: 180px;
        }
        .toolbar select {
            padding: 9px 14px;
            border: 2px solid #f0ebe8;
            border-radius: 30px;
            font-size: 14px;
            background: white;
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
            padding: 40px 20px;
            color: #bbb;
        }
        .empty-state .icon { font-size: 48px; margin-bottom: 12px; }
        .code-text {
            font-family: 'Courier New', monospace;
            font-weight: 600;
            color: #4a4a4a;
            background: #f5f0ed;
            padding: 2px 10px;
            border-radius: 6px;
            font-size: 13px;
        }
        .msg { 
            padding: 12px 20px;
            border-radius: 12px;
            margin-bottom: 16px;
        }
        .msg-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .msg-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .mt-2 { margin-top: 10px; }
        .text-muted { color: #999; font-size: 12px; }
        .flex-between { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .used-info { font-size: 12px; color: #888; }
    </style>
</head>
<body>
    <?php include 'templates/header.php'; ?>
    
    <div class="main-container cdk-container">
        <div class="flex-between">
            <h2>🎫 CDK 管理</h2>
            <button class="btn btn-primary" onclick="openModal()">+ 新建CDK</button>
        </div>
        
        <?php if (isset($success)): ?>
            <div class="msg msg-success"><?php echo htmlspecialchars($success); ?></div>
        <?php endif; ?>
        <?php if (isset($error)): ?>
            <div class="msg msg-error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

   
        <div class="stats-grid">
            <div class="stat-mini"><div class="num"><?php echo $stats['total']; ?></div><div class="label">📦 总数</div></div>
            <div class="stat-mini"><div class="num"><?php echo $stats['active']; ?></div><div class="label">✅ 有效</div></div>
            <div class="stat-mini"><div class="num"><?php echo $stats['inactive']; ?></div><div class="label">⛔ 无效</div></div>
            <div class="stat-mini"><div class="num"><?php echo $stats['total_used']; ?></div><div class="label">🔁 总使用次数</div></div>
        </div>

     
        <div class="toolbar">
            <form method="GET" action="">
                <input type="text" name="search" placeholder="🔍 搜索CDK码..." value="<?php echo htmlspecialchars($search); ?>">
                <select name="status_filter">
                    <option value="-1">全部状态</option>
                    <option value="1" <?php echo $status_filter === 1 ? 'selected' : ''; ?>>有效</option>
                    <option value="0" <?php echo $status_filter === 0 ? 'selected' : ''; ?>>无效</option>
                </select>
                <button type="submit" class="btn btn-primary btn-sm">筛选</button>
                <?php if (!empty($search) || $status_filter >= 0): ?>
                    <a href="cdk.php" class="btn btn-outline btn-sm">清除</a>
                <?php endif; ?>
            </form>
        </div>

      
        <?php if ($cdks->num_rows > 0): ?>
        <table class="cdk-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>CDK码</th>
                    <th>奖励</th>
                    <th>类型</th>
                    <th>状态</th>
                    <th>使用次数</th>
                    <th>过期时间</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                <?php while ($row = $cdks->fetch_assoc()): 
                    $is_expired = strtotime($row['expire_time']) < time();
                    $status_badge = '';
                    if ($row['status'] == 0) {
                        $status_badge = '<span class="badge badge-inactive">无效</span>';
                    } elseif ($is_expired) {
                        $status_badge = '<span class="badge badge-expired">已过期</span>';
                    } else {
                        $status_badge = '<span class="badge badge-active">有效</span>';
                    }
                ?>
                <tr>
                    <td>#<?php echo $row['id']; ?></td>
                    <td><span class="code-text"><?php echo htmlspecialchars($row['code']); ?></span></td>
                    <td>
                        <strong><?php echo htmlspecialchars($row['reward']); ?></strong>
                        <span class="badge badge-type"><?php echo htmlspecialchars($row['item_name']); ?></span>
                    </td>
                    <td>
                        <?php 
                            $type_map = [1 => '单人单次', 2 => '范围次数', 3 => '全服无限'];
                            echo $type_map[$row['use_type']] ?? '未知';
                        ?>
                        <?php if ($row['use_type'] == 2 && $row['max_uses']): ?>
                            <span class="text-muted">(上限 <?php echo $row['max_uses']; ?>)</span>
                        <?php endif; ?>
                    </td>
                    <td><?php echo $status_badge; ?></td>
                    <td>
                        <?php echo $row['used_count']; ?>
                        <?php if ($row['use_type'] == 2 && $row['max_uses']): ?>
                            <span class="used-info">/ <?php echo $row['max_uses']; ?></span>
                        <?php endif; ?>
                    </td>
                    <td><?php echo date('Y-m-d H:i', strtotime($row['expire_time'])); ?></td>
                    <td>
                        <?php if ($row['status'] == 1 && !$is_expired): ?>
                            <button class="btn btn-sm btn-outline" onclick="toggleStatus(<?php echo $row['id']; ?>, 0)">禁用</button>
                        <?php elseif ($row['status'] == 0): ?>
                            <button class="btn btn-sm btn-outline" onclick="toggleStatus(<?php echo $row['id']; ?>, 1)">启用</button>
                        <?php endif; ?>
                        <button class="btn btn-sm btn-danger" onclick="deleteCdk(<?php echo $row['id']; ?>)">删除</button>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>

   
        <?php if ($total_pages > 1): ?>
        <div class="pagination">
            <?php if ($page > 1): ?>
                <a href="?page=<?php echo $page-1; ?>&search=<?php echo urlencode($search); ?>&status_filter=<?php echo $status_filter; ?>">上一页</a>
            <?php endif; ?>
            <?php for ($i = 1; $i <= $total_pages; $i++): ?>
                <?php if ($i == $page): ?>
                    <span class="current"><?php echo $i; ?></span>
                <?php else: ?>
                    <a href="?page=<?php echo $i; ?>&search=<?php echo urlencode($search); ?>&status_filter=<?php echo $status_filter; ?>"><?php echo $i; ?></a>
                <?php endif; ?>
            <?php endfor; ?>
            <?php if ($page < $total_pages): ?>
                <a href="?page=<?php echo $page+1; ?>&search=<?php echo urlencode($search); ?>&status_filter=<?php echo $status_filter; ?>">下一页</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <?php else: ?>
        <div class="empty-state">
            <div class="icon">🎫</div>
            <p>暂无CDK数据</p>
            <p class="text-muted">点击右上角「新建CDK」开始创建</p>
        </div>
        <?php endif; ?>
    </div>

   
    <div class="modal-overlay" id="createModal">
        <div class="modal-box">
            <button class="close-btn" onclick="closeModal()">&times;</button>
            <h3>✨ 新建CDK</h3>
            <form method="POST" action="">
                <input type="hidden" name="action" value="create">
                
                <label>CDK码 *</label>
                <input type="text" name="code" placeholder="例如: VIP2026ABCDE" required>
                
                <label>奖励类型</label>
                <select name="item_type">
                    <option value="gcoin">G币</option>
                    <option value="item">道具</option>
                </select>
                
                <div class="row2">
                    <div>
                        <label>奖励数量 *</label>
                        <input type="number" name="reward" placeholder="100" min="1" required>
                    </div>
                    <div>
                        <label>奖励名称</label>
                        <input type="text" name="item_name" placeholder="G币" value="G币">
                    </div>
                </div>
                
                <label>使用类型</label>
                <select name="use_type" id="use_type" onchange="toggleMaxUses()">
                    <option value="1">单人单次</option>
                    <option value="2">范围次数</option>
                    <option value="3">全服无限</option>
                </select>
                
                <div id="max_uses_group" style="display:none;">
                    <label>最大使用次数</label>
                    <input type="number" name="max_uses" placeholder="100" min="1">
                </div>
                
                <label>过期时间 *</label>
                <input type="datetime-local" name="expire_time" required>
                
                <button type="submit" class="btn-submit">🚀 创建CDK</button>
            </form>
        </div>
    </div>

  
    <form id="deleteForm" method="POST" style="display:none;">
        <input type="hidden" name="action" value="delete">
        <input type="hidden" name="id" id="delete_id">
    </form>

   
    <form id="toggleForm" method="POST" style="display:none;">
        <input type="hidden" name="action" value="toggle_status">
        <input type="hidden" name="id" id="toggle_id">
        <input type="hidden" name="status" id="toggle_status">
    </form>

    <script>
        function openModal() {
            document.getElementById('createModal').classList.add('show');
        }
        function closeModal() {
            document.getElementById('createModal').classList.remove('show');
        }
        document.getElementById('createModal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        function toggleMaxUses() {
            const val = document.getElementById('use_type').value;
            document.getElementById('max_uses_group').style.display = val == '2' ? 'block' : 'none';
        }

        function deleteCdk(id) {
            if (confirm('确定要删除这个CDK吗？此操作不可撤销！')) {
                document.getElementById('delete_id').value = id;
                document.getElementById('deleteForm').submit();
            }
        }

        function toggleStatus(id, status) {
            document.getElementById('toggle_id').value = id;
            document.getElementById('toggle_status').value = status;
            document.getElementById('toggleForm').submit();
        }
    </script>
</body>
</html>