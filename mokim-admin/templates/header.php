<header class="admin-header">
    <div class="header-left">MOK-IM 后台管理系统</div>
    <div class="header-right">
        <span>当前登录：<?php echo htmlspecialchars($_SESSION['admin_username']); ?></span>
        <a href="logout.php" class="logout-btn">退出登录</a>
    </div>
    <nav class="admin-nav">
        <ul>
            <li><a href="index.php">仪表盘</a></li>
            <li><a href="user_manage.php">用户管理</a></li>
            <li><a href="group_manage.php">群聊管理</a></li>
            <li><a href="cdk.php">CDK管理</a></li>
            <li><a href="application_manage.php">申请管理</a></li>
            <li><a href="settings_manage.php">站点配置</a></li>
            <li><a href="logcenter.php">日志中心</a></li>
        </ul>
    </nav>
</header>