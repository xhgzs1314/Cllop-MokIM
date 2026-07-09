<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/SecuritySigner.php';
$signer = SecuritySigner::instance_run();
$verification = $signer->verifyRequest(null, true);
if (!$verification['valid']) {
    http_response_code(403);
    echo json_encode(array('status' => 403, 'message' => '签名验证失败: ' . $verification['error']));
    exit;
}

$input = [];
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') !== false) {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
} else {
    $input = $_POST;
}

$password = $input['password'] ?? '';
$authdata = $input['authdata'] ?? '';
$email = $input['email'] ?? '';
if (empty($authdata) || empty($password) || empty($email)) {
    echo json_encode(array('status' => 300, 'message' => '无效的数据'));
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(array('status' => 305, 'message' => '邮箱格式无效'));
    exit;
}

require_once($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($authdata);
if (!$plaintext) {
    echo json_encode(array('status' => 301, 'message' => '令牌验证失效'));
    exit;
}
$username = $plaintext;
require_once($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$checkUserStmt = $conn->prepare("SELECT id FROM mok_user WHERE username = ?");
$checkUserStmt->bind_param("s", $username);
$checkUserStmt->execute();
$checkUserStmt->store_result();
if ($checkUserStmt->num_rows > 0) {
    $checkUserStmt->close();
    echo json_encode(array('status' => 303, 'message' => '用户名已存在，无法创建账号'));
    exit;
}
$checkUserStmt->close();
$checkEmailStmt = $conn->prepare("SELECT id FROM mok_user WHERE bdmail = ?");
$checkEmailStmt->bind_param("s", $email);
$checkEmailStmt->execute();
$checkEmailStmt->store_result();
if ($checkEmailStmt->num_rows > 0) {
    $checkEmailStmt->close();
    echo json_encode(array('status' => 306, 'message' => '该邮箱已被注册'));
    exit;
}
$checkEmailStmt->close();

function generate8DigitID()
{
    global $conn;
    do {
        $id = "u" . (string)mt_rand(10000000, 99999999);
        $checkStmt = $conn->prepare("SELECT id FROM mok_user WHERE id = ?");
        $checkStmt->bind_param("s", $id);
        $checkStmt->execute();
        $checkStmt->store_result();
        $exists = $checkStmt->num_rows > 0;
        $checkStmt->close();
    } while ($exists);
    return $id;
}

function generateRandomNickname()
{
    $prefixes = ['清风', '星河', '暖阳', '晚风', '星辰', '云朵', '小鹿', '柠檬', '奶茶', '芝士'];
    $suffixes = ['01', '99', '88', '吖', '酱', '子', '儿', '喵', '汪', '兔'];
    $nickname = $prefixes[array_rand($prefixes)] . $suffixes[array_rand($suffixes)];
    $length = mt_rand(6, 12);
    while (mb_strlen($nickname, 'UTF-8') < $length) {
        $nickname .= mt_rand(0, 9);
    }
    if (mb_strlen($nickname, 'UTF-8') > $length) {
        $nickname = mb_substr($nickname, 0, $length, 'UTF-8');
    }
    return $nickname;
}

$id = generate8DigitID();
$uname = generateRandomNickname();
$tximg = '(&&)::avatar.jpg';
$sayed = '这个用户很懒，什么也没写';
$qddate = "1990-01-01 00:00:00";
$bdmail = 'null';
$credit = 80;
$spkcin = 0;
$regtime = date('Y-m-d H:i:s');
$hashed_password = password_hash($password, PASSWORD_DEFAULT);
require_once $_SERVER['DOCUMENT_ROOT'] . '/setting.php';
$mail_enabled = isset($setting_mail_array['valid']) && $setting_mail_array['valid'] == 1;
$conn->begin_transaction();
try {
    $stmt = $conn->prepare("INSERT INTO mok_user (id, username, `password`, tximg, uname, sayed, qddate, bdmail, credit, spkcin, regtime,isban) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)");
    $stmt->bind_param("ssssssssiisi", $id, $username, $hashed_password, $tximg, $uname, $sayed, $qddate, $bdmail, $credit, $spkcin, $regtime, $spkcin);
    $stmt->execute();
    $stmt->close();
    if ($mail_enabled) {
        $verify_token = bin2hex(random_bytes(32));
        $verify_expire = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $verifyStmt = $conn->prepare("INSERT INTO mok_email_verify (user_id, email, token, expire_time, status) VALUES (?, ?, ?, ?, 0)");
        $verifyStmt->bind_param("ssss", $id, $email, $verify_token, $verify_expire);
        $verifyStmt->execute();
        $verifyStmt->close();
    }
    $conn->commit();
    $email_sent = false;
    if ($mail_enabled) {
        $email_sent = sendVerificationEmail($email, $uname, $id, $verify_token);
    }
    require_once($_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php');
    $userpasscombine = $username . '<:>' . $password . '<:>' . $id . '<:>' . $email;
    $getrunenc = encrypt($userpasscombine, 'E', generateAutoWebsiteIdentifier(true));
    echo json_encode(array(
        'status' => 200,
        'message' => '账号创建成功' . ($email_sent ? '，验证邮件已发送，请查收邮箱完成验证' : ''),
        'data' => [
            'nickname' => $uname,
            'regtime' => $regtime,
            'usercode' => $getrunenc,
            'need_verify' => $email_sent
        ]
    ));
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(array('status' => 302, 'message' => '账号创建失败: ' . $e->getMessage()));
}
$conn->close();
function sendVerificationEmail($email, $nickname, $userId, $token)
{
    global $setting_mail_array;
    $smtp_host = $setting_mail_array['smtp_host'] ?? '';
    $smtp_port = $setting_mail_array['smtp_port'] ?? 465;
    $smtp_secure = $setting_mail_array['smtp_secure'] ?? 'ssl';
    $smtp_username = $setting_mail_array['smtp_user'] ?? '';
    $smtp_password = $setting_mail_array['smtp_pass'] ?? '';
    if (empty($smtp_host) || empty($smtp_username) || empty($smtp_password)) {
        return false;
    }
    $site_name = $_SERVER['SERVER_NAME'] ?? '我们的平台';
    $scheme = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $site_url = $scheme . '://' . $_SERVER['HTTP_HOST'];
    $from_email = $smtp_username;
    $from_name = $site_name;
    $verify_url = $site_url . '/use/user/verify_email.php?uid=' . urlencode($userId) . '&token=' . urlencode($token) . '&ts=' . time();
    $subject = '[' . $site_name . '] 邮箱验证';
    $htmlContent = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>邮箱验证</title>
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
                max-width: 560px;
                width: 100%;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.10);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px 30px;
                text-align: center;
            }
            .header .icon {
                font-size: 48px;
                margin-bottom: 10px;
                display: block;
            }
            .header h1 {
                color: #ffffff;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }
            .header p {
                color: rgba(255,255,255,0.85);
                font-size: 14px;
                margin-top: 6px;
            }
            .body-content {
                padding: 35px 30px 30px;
            }
            .greeting {
                font-size: 16px;
                color: #1a1a2e;
                margin-bottom: 16px;
                line-height: 1.6;
            }
            .greeting strong {
                color: #667eea;
            }
            .info-box {
                background: #f8f9ff;
                border-left: 4px solid #667eea;
                padding: 14px 18px;
                border-radius: 8px;
                margin: 18px 0 22px;
            }
            .info-box p {
                font-size: 14px;
                color: #4a4a6a;
                line-height: 1.5;
            }
            .info-box .highlight {
                color: #764ba2;
                font-weight: 600;
            }
            .btn-wrapper {
                text-align: center;
                margin: 28px 0 20px;
            }
            .btn {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #ffffff !important;
                text-decoration: none;
                padding: 14px 44px;
                font-size: 16px;
                font-weight: 600;
                border-radius: 50px;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.35);
                transition: all 0.25s ease;
                letter-spacing: 0.3px;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.45);
            }
            .btn:active {
                transform: translateY(0);
            }
            .fallback-link {
                text-align: center;
                margin: 16px 0 8px;
                font-size: 13px;
                color: #8e8ea0;
            }
            .fallback-link a {
                color: #667eea;
                word-break: break-all;
                text-decoration: none;
            }
            .fallback-link a:hover {
                text-decoration: underline;
            }
            .expire-notice {
                background: #fff8e1;
                border-radius: 8px;
                padding: 14px 18px;
                margin: 20px 0 10px;
                font-size: 13px;
                color: #6d5a2b;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .expire-notice .emoji {
                font-size: 18px;
            }
            .footer {
                background: #fafafa;
                padding: 20px 30px;
                text-align: center;
                border-top: 1px solid #eee;
            }
            .footer p {
                font-size: 12px;
                color: #b0b0c8;
                line-height: 1.6;
            }
            .footer .site-name {
                color: #667eea;
                font-weight: 500;
            }
            @media (max-width: 480px) {
                .header { padding: 28px 20px 24px; }
                .header h1 { font-size: 20px; }
                .body-content { padding: 24px 18px 20px; }
                .btn { padding: 12px 30px; font-size: 15px; }
                .fallback-link { font-size: 12px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="icon">📧</span>
                <h1>邮箱验证</h1>
                <p>请确认这是您的邮箱地址</p>
            </div>

            <div class="body-content">
                <div class="greeting">
                    你好 <strong>' . htmlspecialchars($nickname) . '</strong> 👋
                </div>
                <p style="color:#4a4a6a; font-size:15px; line-height:1.7; margin-bottom:6px;">
                    感谢你注册 <strong>' . htmlspecialchars($site_name) . '</strong>！
                </p>
                <p style="color:#4a4a6a; font-size:15px; line-height:1.7; margin-bottom:6px;">
                    为了保障账号安全，请点击下方按钮验证你的邮箱：
                </p>

                <div class="info-box">
                    <p>
                        📬 <span class="highlight">' . htmlspecialchars($email) . '</span>
                        <span style="display:block; margin-top:4px; font-size:13px; color:#8e8ea0;">
                            此链接将在 <strong>15 分钟</strong> 后失效
                        </span>
                    </p>
                </div>

                <div class="btn-wrapper">
                    <a href="' . htmlspecialchars($verify_url) . '" class="btn" target="_blank">
                        ✅ 立即验证邮箱
                    </a>
                </div>

                <div class="fallback-link">
                    如果按钮无法点击，请复制以下链接到浏览器打开：<br>
                    <a href="' . htmlspecialchars($verify_url) . '">' . htmlspecialchars($verify_url) . '</a>
                </div>

                <div class="expire-notice">
                    <span class="emoji">⏰</span>
                    <span>验证链接有效期为 <strong>15 分钟</strong>，请尽快完成验证。</span>
                </div>
                <div style="margin-top:8px; font-size:13px; color:#8e8ea0; text-align:center;">
                    如果没有注册过账号，请忽略此邮件。
                </div>
            </div>

            <div class="footer">
                <p>
                    © ' . date('Y') . ' <span class="site-name">' . htmlspecialchars($site_name) . '</span>
                    <br>这是一封系统自动发送的邮件，请勿直接回复。
                </p>
            </div>
        </div>
    </body>
    </html>';

    $textContent = "邮箱验证\n\n";
    $textContent .= "你好 {$nickname}，\n\n";
    $textContent .= "感谢你注册 {$site_name}！\n";
    $textContent .= "请点击以下链接验证你的邮箱（有效期15分钟）：\n\n";
    $textContent .= $verify_url . "\n\n";
    $textContent .= "如果你没有注册账号，请忽略此邮件。";
    return sendMail($email, $subject, $htmlContent, $textContent, $smtp_host, $smtp_port, $smtp_secure, $smtp_username, $smtp_password, $from_email, $from_name);
}
function sendMail($to, $subject, $htmlBody, $textBody, $host, $port, $secure, $username, $password, $fromEmail, $fromName)
{
    try {
        require_once $_SERVER['DOCUMENT_ROOT'] . '/phpmailer/src/PHPMailer.php';
        require_once $_SERVER['DOCUMENT_ROOT'] . '/phpmailer/src/SMTP.php';
        require_once $_SERVER['DOCUMENT_ROOT'] . '/phpmailer/src/Exception.php';
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $host;
        $mail->Port = $port;
        $mail->SMTPAuth = true;
        $mail->Username = $username;
        $mail->Password = $password;
        $mail->SMTPAutoTLS = false;
        if ($secure === 'ssl') {
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($secure === 'tls') {
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        }
        $mail->setFrom($fromEmail, $fromName);
        $mail->addAddress($to);
        $mail->Subject = $subject;
        $mail->CharSet = 'UTF-8';
        $mail->isHTML(true);
        $mail->Body = $htmlBody;
        $mail->AltBody = $textBody;
        return $mail->send();
    } catch (Exception $e) {
        error_log('邮件发送失败: ' . $e->getMessage());
        return false;
    }
}
