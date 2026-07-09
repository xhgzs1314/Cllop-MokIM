<?php
require_once '../config.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);
    $conn = connectDB();
    $stmt = $conn->prepare("SELECT `password` FROM mok_admin WHERE username = ? LIMIT 1");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 1) {
        $row = $result->fetch_assoc();
        if (verifyPwd($password, $row['password'])) {
            $_SESSION['admin_login'] = true;
            $_SESSION['admin_username'] = $username;
            $_SESSION['login_time'] = time();
            $_SESSION['session_token'] = bin2hex(random_bytes(16));
            header('Location: ../index.php');
            exit();
        } else {
            header('Location: login.php?error=密码错误，请重新输入');
            exit();
        }
    } else {
        header('Location: login.php?error=用户名不存在');
        exit();
    }
    $stmt->close();
    $conn->close();
} else {
    include 'templates/login.html';
}
