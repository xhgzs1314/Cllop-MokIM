<?php
require_once 'config.php';
checkAuth();
$conn = connectDB();
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_status') {
    $userId = ($_POST['user_id']);
    $status = intval($_POST['status']);
    $stmt = $conn->prepare("UPDATE mok_user SET isban = ? WHERE id = ?");
    $stmt->bind_param("is", $status, $userId);
    $stmt->execute();
    $stmt->close();
    header('Location: user_manage.php?success=状态修改成功');
    exit();
}
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_user') {
    $userId = ($_POST['user_id']);
    $stmt = $conn->prepare("DELETE FROM mok_user WHERE id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $stmt->close();
    header('Location: user_manage.php?success=用户已删除');
    exit();
}
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$limit = 10;
$offset = ($page - 1) * $limit;
$totalResult = $conn->query("SELECT COUNT(*) AS total FROM mok_user");
$totalRow = $totalResult->fetch_assoc();
$total = $totalRow['total'];
$totalPages = ceil($total / $limit);
$stmt = $conn->prepare("SELECT * FROM mok_user ORDER BY regtime DESC LIMIT ? OFFSET ?");
$stmt->bind_param("ii", $limit, $offset);
$stmt->execute();
$userList = $stmt->get_result();
$stmt->close();
$conn->close();
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>用户管理 - MOK-IM 后台</title>
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
    </style>
</head>
<body>
    <?php include 'templates/header.php'; ?>
    <div class="main-container">
        <h3>用户管理</h3>
        <?php if (isset($_GET['success'])): ?>
            <div class="success"><?php echo htmlspecialchars($_GET['success']); ?></div>
        <?php endif; ?>
        <table class="data-table">
            <thead>
                <tr>
                    <th>用户ID</th>
                    <th>用户名</th>
                    <th>昵称</th>
                    <th>注册时间</th>
                    <th>状态</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                <?php while ($row = $userList->fetch_assoc()): ?>
                <tr>
                    <td><?php echo htmlspecialchars($row['id']); ?></td>
                    <td><?php echo htmlspecialchars($row['username']); ?></td>
                    <td><?php echo htmlspecialchars($row['uname']); ?></td>
                    <td><?php echo htmlspecialchars($row['regtime']); ?></td>
                    <td>
                        <form method="POST" style="display: inline;" onsubmit="return confirm('修改用户状态？')">
                            <input type="hidden" name="user_id" value="<?php echo $row['id']; ?>">
                            <input type="hidden" name="action" value="update_status">
                            <select name="status" class="status-select" onchange="this.form.submit()">
                                <option value="0" <?php if ($row['isban'] == 0) echo 'selected'; ?>>正常</option>
                                <option value="1" <?php if ($row['isban'] == 1) echo 'selected'; ?>>封禁</option>
                                <option value="2" <?php if ($row['isban'] == 2) echo 'selected'; ?>>注销</option>
                            </select>
                        </form>
                    </td>
                    <td>
                        <form method="POST" onsubmit="return confirm('确定要删除该用户吗？此操作不可恢复！');" style="display: inline;">
                            <input type="hidden" name="user_id" value="<?php echo $row['id']; ?>">
                            <input type="hidden" name="action" value="delete_user">
                            <button type="submit" class="delete-btn">删除</button>
                        </form>
                    </td>
                </tr>
                <?php endwhile; ?>
                <?php if ($userList->num_rows == 0): ?>
                <tr>
                    <td colspan="6" style="text-align: center;">暂无用户数据</td>
                </tr>
                <?php endif; ?>
            </tbody>
        </table>
        <?php if ($totalPages > 1): ?>
        <div class="pagination">
            <?php if ($page > 1): ?>
                <a href="?page=1">首页</a>
                <a href="?page=<?php echo $page-1; ?>">上一页</a>
            <?php endif; ?>

            <?php
            $start = max(1, $page - 2);
            $end = min($totalPages, $page + 2);
            for ($i = $start; $i <= $end; $i++):
            ?>
                <?php if ($i == $page): ?>
                    <span class="active"><?php echo $i; ?></span>
                <?php else: ?>
                    <a href="?page=<?php echo $i; ?>"><?php echo $i; ?></a>
                <?php endif; ?>
            <?php endfor; ?>

            <?php if ($page < $totalPages): ?>
                <a href="?page=<?php echo $page+1; ?>">下一页</a>
                <a href="?page=<?php echo $totalPages; ?>">尾页</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>