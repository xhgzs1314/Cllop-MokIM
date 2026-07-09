<?php
require($_SERVER['DOCUMENT_ROOT'] . '/config.php');
define('DB_CHARSET', 'utf8mb4');
ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Lax');
session_start();
function connectDB()
{
    global $db_host, $db_user, $db_pass, $db_name;
    $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
    if ($conn->connect_error) {
        die("数据库连接失败: " . $conn->connect_error);
    }
    $conn->set_charset(DB_CHARSET);
    return $conn;
}
function checkAuth()
{
    if (!isset($_SESSION['admin_login']) || $_SESSION['admin_login'] !== true || !isset($_SESSION['admin_username'])) {
        header('Location: templates/login.php');
        exit();
    }
}
function encryptPwd($password)
{
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
}
function verifyPwd($password, $hash)
{
    return password_verify($password, $hash);
}
