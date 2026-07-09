<?php
require_once 'config.php';
checkAuth();
$conn = connectDB();
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_status') {
    $groupId = intval($_POST['group_id']);
    $status = intval($_POST['status']);
    $stmt = $conn->prepare("UPDATE mok_group_chat SET group_status = ? WHERE id = ?");
    $stmt->bind_param("ii", $status, $groupId);
    $stmt->execute();
    $stmt->close();
    header('Location: group_manage.php?success=群状态修改成功');
    exit();
}
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_group') {
    $groupId = intval($_POST['group_id']);
    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("UPDATE mok_group_chat SET group_status = 0 WHERE id = ?");
        $stmt->bind_param("i", $groupId);
        $stmt->execute();
        $stmt->close();
        $stmt2 = $conn->prepare("UPDATE mok_group_member SET status = 0, quit_time = NOW() WHERE group_id = ?");
        $stmt2->bind_param("i", $groupId);
        $stmt2->execute();
        $stmt2->close();
        $conn->commit();
        header('Location: group_manage.php?success=群组已解散');
    } catch (Exception $e) {
        $conn->rollback();
        header('Location: group_manage.php?error=操作失败');
    }
    exit();
}
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$limit = 10;
$offset = ($page - 1) * $limit;
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$where = "";
$params = [];
$types = "";
if (!empty($search)) {
    $where = "WHERE g.group_name LIKE ? OR g.id LIKE ?";
    $like = "%$search%";
    $params = [$like, $like];
    $types = "ss";
}
$countSql = "SELECT COUNT(*) AS total FROM mok_group_chat g $where";
$stmt = $conn->prepare($countSql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$totalResult = $stmt->get_result();
$totalRow = $totalResult->fetch_assoc();
$total = $totalRow['total'];
$totalPages = ceil($total / $limit);
$stmt->close();
$sql = "SELECT g.*, u.uname as owner_name 
        FROM mok_group_chat g 
        LEFT JOIN mok_user u ON g.owner_id = u.id 
        $where 
        ORDER BY g.create_time DESC 
        LIMIT ? OFFSET ?";
$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types . "ii", ...array_merge($params, [$limit, $offset]));
} else {
    $stmt->bind_param("ii", $limit, $offset);
}
$stmt->execute();
$groupList = $stmt->get_result();
$stmt->close();
$statsResult = $conn->query("
    SELECT 
        COUNT(*) as total_groups,
        SUM(CASE WHEN group_status = 1 THEN 1 ELSE 0 END) as normal_groups,
        (SELECT COUNT(*) FROM mok_group_member WHERE status = 1) as total_members
    FROM mok_group_chat
");
$stats = $statsResult->fetch_assoc();
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>群组管理 - MOK-IM 后台</title>
    <link rel="stylesheet" href="static/css/style.css">
    <style>
        .status-select {
            padding: 8px 24px 8px 12px;
            border-radius: 60px;
            background: #fff0ea;
            border: 1px solid #ffcdc0;
            color: #4a4a4a;
            font-size: 14px;
            cursor: pointer;
            outline: none;
            transition: all 0.2s;
            appearance: none;
            -webkit-appearance: none;
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ff8a7a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>");
            background-repeat: no-repeat;
            background-position: right 10px center;
        }
        .status-select:hover {
            background-color: #ffe1d6;
            border-color: #ffb7a8;
        }
        .delete-btn {
            background: #ffe0db;
            border: none;
            color: #ff6b6b;
            padding: 6px 14px;
            border-radius: 30px;
            cursor: pointer;
            font-weight: 600;
            transition: 0.2s;
            margin-left: 10px;
        }
        .delete-btn:hover {
            background: #ffb7b0;
            color: white;
        }
        .pagination {
            margin-top: 30px;
            display: flex;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        .pagination a, .pagination span {
            display: inline-block;
            padding: 8px 14px;
            background: #fff5ef;
            border-radius: 40px;
            text-decoration: none;
            color: #ff8f7c;
            font-weight: 500;
            transition: 0.2s;
            border: 1px solid #ffe0d2;
        }
        .pagination a:hover {
            background: #ffe3d9;
            transform: translateY(-2px);
        }
        .pagination .active {
            background: #ffb7b0;
            color: white;
            border-color: #ffa38f;
        }
        .search-bar {
            margin-bottom: 25px;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }
        .search-bar input {
            padding: 10px 18px;
            border-radius: 60px;
            border: 1px solid #ffcdc0;
            background: #fffaf7;
            width: 250px;
            outline: none;
            transition: 0.2s;
        }
        .search-bar input:focus {
            border-color: #ff9a88;
            box-shadow: 0 0 0 3px rgba(255, 154, 136, 0.1);
        }
        .search-bar button {
            background: #ffb7b0;
            border: none;
            padding: 8px 22px;
            border-radius: 60px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
        }
        .search-bar button:hover {
            background: #ff9a88;
            transform: translateY(-2px);
        }
        .stats {
            display: flex;
            gap: 20px;
            margin: 20px 0 30px;
            flex-wrap: wrap;
        }
        .stat-item {
            padding: 18px 28px;
            background: #fff7f2;
            border-radius: 48px;
            font-size: 15px;
            font-weight: 600;
            color: #ff8b79;
            box-shadow: 0 6px 14px rgba(250, 170, 140, 0.12);
            border: 1px solid #ffe0d2;
            display: inline-flex;
            align-items: center;
            gap: 12px;
        }
        .stat-item:first-child::before {
            content: "👥";
            font-size: 20px;
        }
        .stat-item:nth-child(2)::before {
            content: "✅";
            font-size: 20px;
        }
        .stat-item:last-child::before {
            content: "💬";
            font-size: 20px;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 30px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-normal { background: #e8f5e9; color: #4caf50; }
        .badge-banned { background: #ffebee; color: #f44336; }
        .badge-dismiss { background: #eeeeee; color: #757575; }
        .badge-silence { background: #fff3e0; color: #ff9800; }
    </style>
</head>
<body>
    <?php include 'templates/header.php'; ?>
    <div class="main-container">
        <h3>📢 群组管理</h3>
        
        <?php if (isset($_GET['success'])): ?>
            <div class="success"><?php echo htmlspecialchars($_GET['success']); ?></div>
        <?php endif; ?>
        <?php if (isset($_GET['error'])): ?>
            <div class="error"><?php echo htmlspecialchars($_GET['error']); ?></div>
        <?php endif; ?>

 
        <div class="stats">
            <div class="stat-item">总群组数：<?php echo $stats['total_groups']; ?></div>
            <div class="stat-item">正常群组：<?php echo $stats['normal_groups']; ?></div>
            <div class="stat-item">总成员数：<?php echo $stats['total_members']; ?></div>
        </div>

   
        <div class="search-bar">
            <form method="GET" style="display: flex; gap: 10px;">
                <input type="text" name="search" placeholder="搜索群ID或群名称..." value="<?php echo htmlspecialchars($search); ?>">
                <button type="submit">🔍 搜索</button>
                <?php if (!empty($search)): ?>
                    <a href="group_manage.php" style="background: #ffe0db; padding: 8px 18px; border-radius: 60px; text-decoration: none; color: #ff6b6b;">清除</a>
                <?php endif; ?>
            </form>
        </div>

        <table class="data-table">
            <thead>
                <tr>
                    <th>群ID</th>
                    <th>群名称</th>
                    <th>群主</th>
                    <th>群简介</th>
                    <th>创建时间</th>
                    <th>成员数</th>
                    <th>状态</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                <?php if ($groupList && $groupList->num_rows > 0): ?>
                    <?php while ($row = $groupList->fetch_assoc()): 
                   
                        $memberCount = 0;
                        $memberQuery = $conn->query("SELECT COUNT(*) as cnt FROM mok_group_member WHERE group_id = " . intval($row['id']) . " AND status = 1");
                        if ($memberQuery) {
                            $memberCount = $memberQuery->fetch_assoc()['cnt'];
                        }
                        
                        
                        $statusMap = [
                            0 => ['text' => '已解散', 'class' => 'badge-dismiss'],
                            1 => ['text' => '正常', 'class' => 'badge-normal'],
                            2 => ['text' => '封禁', 'class' => 'badge-banned'],
                            3 => ['text' => '全员禁言', 'class' => 'badge-silence']
                        ];
                        $currentStatus = $statusMap[$row['group_status']] ?? ['text' => '未知', 'class' => ''];
                    ?>
                    <tr>
                        <td><?php echo htmlspecialchars($row['id']); ?></td>
                        <td><?php echo htmlspecialchars($row['group_name']); ?></td>
                        <td><?php echo htmlspecialchars($row['owner_name'] ?? $row['owner_id']); ?></td>
                        <td><?php echo htmlspecialchars($row['group_desc'] ?? '暂无'); ?></td>
                        <td><?php echo htmlspecialchars($row['create_time']); ?></td>
                        <td><?php echo $memberCount; ?>/<?php echo $row['max_member']; ?></td>
                        <td><span class="badge <?php echo $currentStatus['class']; ?>"><?php echo $currentStatus['text']; ?></span></td>
                        <td>
                            <form method="POST" style="display: inline;" onsubmit="return confirm('修改群组状态？')">
                                <input type="hidden" name="group_id" value="<?php echo $row['id']; ?>">
                                <input type="hidden" name="action" value="update_status">
                                <select name="status" class="status-select" onchange="this.form.submit()">
                                    <option value="1" <?php if ($row['group_status'] == 1) echo 'selected'; ?>>正常</option>
                                    <option value="2" <?php if ($row['group_status'] == 2) echo 'selected'; ?>>封禁</option>
                                    <option value="0" <?php if ($row['group_status'] == 0) echo 'selected'; ?>>解散</option>
                                    <option value="3" <?php if ($row['group_status'] == 3) echo 'selected'; ?>>全员禁言</option>
                                </select>
                            </form>
                            <?php if ($row['group_status'] != 0): ?>
                            <form method="POST" onsubmit="return confirm('确定要解散该群组吗？解散后群成员将被移除！');" style="display: inline;">
                                <input type="hidden" name="group_id" value="<?php echo $row['id']; ?>">
                                <input type="hidden" name="action" value="delete_group">
                                <button type="submit" class="delete-btn">解散</button>
                            </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endwhile; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="8" style="text-align: center;">暂无群组数据</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>

     
        <?php if ($totalPages > 1): ?>
        <div class="pagination">
            <?php if ($page > 1): ?>
                <a href="?page=1<?php echo !empty($search) ? '&search=' . urlencode($search) : ''; ?>">首页</a>
                <a href="?page=<?php echo $page-1; ?><?php echo !empty($search) ? '&search=' . urlencode($search) : ''; ?>">上一页</a>
            <?php endif; ?>

            <?php
            $start = max(1, $page - 2);
            $end = min($totalPages, $page + 2);
            for ($i = $start; $i <= $end; $i++):
            ?>
                <?php if ($i == $page): ?>
                    <span class="active"><?php echo $i; ?></span>
                <?php else: ?>
                    <a href="?page=<?php echo $i; ?><?php echo !empty($search) ? '&search=' . urlencode($search) : ''; ?>"><?php echo $i; ?></a>
                <?php endif; ?>
            <?php endfor; ?>

            <?php if ($page < $totalPages): ?>
                <a href="?page=<?php echo $page+1; ?><?php echo !empty($search) ? '&search=' . urlencode($search) : ''; ?>">下一页</a>
                <a href="?page=<?php echo $totalPages; ?><?php echo !empty($search) ? '&search=' . urlencode($search) : ''; ?>">尾页</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>