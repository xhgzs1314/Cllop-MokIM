<?php
require_once 'config.php';
checkAuth();
$conn = connectDB();
$stats = [];
$result = $conn->query("
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN isban = 0 THEN 1 ELSE 0 END) as normal,
        SUM(CASE WHEN isban = 1 THEN 1 ELSE 0 END) as banned,
        SUM(CASE WHEN isban = 2 THEN 1 ELSE 0 END) as deleted
    FROM mok_user
");
$stats['users'] = $result->fetch_assoc();
$result = $conn->query("
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN group_status = 1 THEN 1 ELSE 0 END) as normal,
        SUM(CASE WHEN group_status = 2 THEN 1 ELSE 0 END) as banned,
        SUM(CASE WHEN group_status = 0 THEN 1 ELSE 0 END) as dismissed
    FROM mok_group_chat
");
$stats['groups'] = $result->fetch_assoc();
$result = $conn->query("SELECT COUNT(*) as count FROM mok_user WHERE DATE(regtime) = CURDATE()");
$stats['today_users'] = $result->fetch_assoc()['count'];
$result = $conn->query("SELECT COUNT(*) as count FROM mok_group_chat WHERE DATE(create_time) = CURDATE()");
$stats['today_groups'] = $result->fetch_assoc()['count'];
$result = $conn->query("SELECT COUNT(*) as count FROM mok_application WHERE status = 1");
$stats['pending_apps'] = $result->fetch_assoc()['count'];
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password_new'])) {
    $password_new = $_POST['password_new'] ?? null;
    if ($password_new === null) {
        echo "<script>alert('密码不能为空！');</script>";
    } else {
        $password_wr = encryptPwd($password_new);
        $sql = "UPDATE mok_admin SET `password`= ? WHERE id=1";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("s", $password_wr);
            if ($stmt->execute()) {
                echo "<script>alert('密码修改成功！');</script>";
            } else {
                echo "<script>alert('密码修改失败！');</script>";
            }
        }
    }
}
$conn->close();
?>
<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <title>仪表盘 - MOK-IM 后台</title>
    <link rel="stylesheet" href="static/css/style.css">
    <style>
        .dashboard-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: #fff7f2;
            border-radius: 32px;
            padding: 24px 20px;
            border: 1px solid #ffe0d2;
            transition: 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(255, 150, 120, 0.15);
        }

        .stat-card h3 {
            color: #ff9a88;
            font-size: 14px;
            margin-bottom: 12px;
        }

        .stat-card .number {
            font-size: 36px;
            font-weight: 700;
            color: #4a4a4a;
        }

        .stat-card .sub {
            color: #bbb;
            font-size: 12px;
            margin-top: 8px;
        }

        .quick-actions {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-top: 30px;
        }

        .quick-btn {
            background: linear-gradient(145deg, #ffb7b2, #ff9a8b);
            padding: 12px 28px;
            border-radius: 60px;
            color: white;
            text-decoration: none;
            font-weight: 600;
            transition: 0.2s;
        }

        .quick-btn:hover {
            transform: scale(0.96);
        }

        input {
            width: 100%;
            padding: 12px;
            margin-bottom: 10px;
            border: none;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>

<body>
    <?php include 'templates/header.php'; ?>
    <div class="main-container">
        <h3>数据仪表盘</h3>

        <div class="dashboard-stats">
            <div class="stat-card">
                <h3> 用户总数</h3>
                <div class="number"><?php echo $stats['users']['total']; ?></div>
                <div class="sub">正常 <?php echo $stats['users']['normal']; ?> / 封禁 <?php echo $stats['users']['banned']; ?></div>
            </div>
            <div class="stat-card">
                <h3> 群组总数</h3>
                <div class="number"><?php echo $stats['groups']['total']; ?></div>
                <div class="sub">正常 <?php echo $stats['groups']['normal']; ?> / 封禁 <?php echo $stats['groups']['banned']; ?></div>
            </div>
            <div class="stat-card">
                <h3> 今日新增</h3>
                <div class="number"> <?php echo $stats['today_users']; ?>/<?php echo $stats['today_groups']; ?></div>
                <div class="sub">今日注册用户 / 今日创建群组</div>
            </div>
            <div class="stat-card">
                <h3> 待处理申请</h3>
                <div class="number"><?php echo $stats['pending_apps']; ?></div>
                <div class="sub">好友申请 + 群申请</div>
            </div>
            <form method="post" action="./index.php">
                <input name="password_new" placeholder="情输入新的登录密码" type="text">
                <button type="submit" class="quick-btn">修改登录密码</button>
            </form>
        </div>
    </div>
</body>

</html>