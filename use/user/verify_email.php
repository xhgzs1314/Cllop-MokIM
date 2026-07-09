<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php';
$userId = $_GET['uid'] ?? '';
$token = $_GET['token'] ?? '';
if (empty($userId) || empty($token)) {
    showResult(false, '无效的验证请求', '参数不完整');
    exit;
}
$conn->begin_transaction();
try {
    $stmt = $conn->prepare("SELECT id, user_id, email, token, expire_time, status FROM mok_email_verify WHERE user_id = ? AND token = ?");
    $stmt->bind_param("ss", $userId, $token);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        showResult(false, '验证失败', '验证令牌不存在或已失效');
        $stmt->close();
        $conn->rollback();
        $conn->close();
        exit;
    }

    $record = $result->fetch_assoc();
    $stmt->close();
    if ($record['status'] == 1) {
        showResult(true, '邮箱已验证', '该邮箱已完成验证，无需重复操作');
        $conn->rollback();
        $conn->close();
        exit;
    }
    $now = date('Y-m-d H:i:s');
    if ($now > $record['expire_time']) {
        showResult(false, '验证链接已过期', '验证链接有效期为15分钟，请重新注册获取新的验证邮件');
        $conn->rollback();
        $conn->close();
        exit;
    }
    $updateUserStmt = $conn->prepare("UPDATE mok_user SET bdmail = ? WHERE id = ?");
    $updateUserStmt->bind_param("ss", $record['email'], $userId);
    $updateUserStmt->execute();
    $updateUserStmt->close();
    $deleteStmt = $conn->prepare("DELETE FROM mok_email_verify WHERE user_id = ? AND token = ?");
    $deleteStmt->bind_param("ss", $userId, $token);
    $deleteStmt->execute();
    $deleteStmt->close();
    $conn->commit();
    showResult(true, '🎉 邮箱验证成功！', '您的邮箱 ' . htmlspecialchars($record['email']) . ' 已成功验证');
} catch (Exception $e) {
    $conn->rollback();
    showResult(false, '验证失败', '系统错误，请稍后重试');
}

$conn->close();

function showResult($success, $title, $message)
{
    $statusClass = $success ? 'success' : 'error';
    $icon = $success ? '✅' : '❌';
    
    echo '<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>' . $title . '</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                background: #f0f2f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                max-width: 480px;
                width: 100%;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.10);
                padding: 48px 36px 40px;
                text-align: center;
            }
            .icon-big {
                font-size: 64px;
                margin-bottom: 16px;
                display: block;
            }
            .title {
                font-size: 24px;
                font-weight: 700;
                color: #1a1a2e;
                margin-bottom: 10px;
            }
            .title.success { color: #22c55e; }
            .title.error { color: #ef4444; }
            .message {
                font-size: 16px;
                color: #4a4a6a;
                line-height: 1.7;
                margin: 8px 0 20px;
            }
            .btn {
                display: inline-block;
                background: #667eea;
                color: #ffffff;
                text-decoration: none;
                padding: 12px 40px;
                font-size: 15px;
                font-weight: 600;
                border-radius: 50px;
                transition: background 0.2s;
                border: none;
                cursor: pointer;
            }
            .btn:hover { background: #5a6fd6; }
            .btn-secondary {
                background: #e8eaf0;
                color: #4a4a6a;
            }
            .btn-secondary:hover { background: #d5d8e0; }
            .divider {
                height: 1px;
                background: #eee;
                margin: 24px 0;
            }
            .footer-text {
                font-size: 13px;
                color: #b0b0c8;
            }
            @media (max-width: 480px) {
                .container { padding: 32px 20px 28px; }
                .title { font-size: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <span class="icon-big">' . $icon . '</span>
            <h1 class="title ' . $statusClass . '">' . htmlspecialchars($title) . '</h1>
            <p class="message">' . nl2br(htmlspecialchars($message)) . '</p>
            <div style="margin-top: 24px;">
                <a href="/use/user/" class="btn">前往登录</a>
            </div>
            <div class="divider"></div>
            <p class="footer-text">' . ($success ? '欢迎加入！' : '如有问题请联系客服') . '</p>
        </div>
    </body>
    </html>';
}