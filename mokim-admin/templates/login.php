<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>MOK-IM 后台登录</title>
    <link rel="stylesheet" href="../static/css/style.css">
</head>
<body>
    <div class="login-container">
        <h2>MOK-IM 后台管理系统</h2>
        <?php if (isset($_GET['error'])): ?>
            <div class="error"><?php echo htmlspecialchars($_GET['error']); ?></div>
        <?php endif; ?>
        <form action="logins.php" method="POST" id="loginForm">
            <div class="form-item">
                <label>用户名：</label>
                <input type="text" name="username" required placeholder="请输入管理员账号">
            </div>
            <div class="form-item">
                <label>密码：</label>
                <input type="password" name="password" required placeholder="请输入管理员密码">
            </div>
            <div class="form-item">
                <button type="submit">登录</button>
            </div>
        </form>
    </div>
    <script src="static/js/main.js"></script>
</body>
</html>