<?php
require_once 'config.php';
checkAuth();
$success = '';
$error = '';
$settingPhpPath = $_SERVER['DOCUMENT_ROOT'] . '/setting.php';
$envPath = $_SERVER['DOCUMENT_ROOT'] . '/ws-server/.env';
$setting_mail_array = [];
$index_array = [];
$cosforall_oss = [];
$MOKIM_GIFT_CONFIG = [];
if (file_exists($settingPhpPath)) {
    include $settingPhpPath;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
   
    $config = loadFullConfig($settingPhpPath);
    
    if (isset($_POST['save_smtp'])) {
        $config['mail'] = [
            'valid' => 0,
            'smtp_host' => $_POST['smtp_host'] ?? '',
            'smtp_port' => intval($_POST['smtp_port'] ?? 465),
            'smtp_secure' => $_POST['smtp_secure'] ?? 'ssl',
            'smtp_user' => $_POST['smtp_user'] ?? '',
            'smtp_pass' => $_POST['smtp_pass'] ?? '',
        ];
        $success = '邮箱配置保存成功';
    }

    if (isset($_POST['save_site'])) {
        $config['site'] = [
            'title' => $_POST['title'] ?? 'GMOK-在线聊天',
            'beian' => $_POST['beian'] ?? '',
            'keyword' => $_POST['keyword'] ?? 'GMOK',
            'call' => $_POST['call'] ?? '',
        ];
        $success = '站点配置保存成功';
    }

    if (isset($_POST['save_cos'])) {
        $config['cos'] = [
            'access_key' => $_POST['cos_access_key'] ?? '',
            'access_key_secret' => $_POST['cos_access_key_secret'] ?? '',
            'bucket' => $_POST['cos_bucket'] ?? '',
            'endpoint' => $_POST['cos_endpoint'] ?? '',
            'region' => $_POST['cos_region'] ?? '',
            'max_upload_size' => $_POST['cos_max_upload_size'] ?? '50MB',
        ];
        $success = 'COS 配置保存成功';
    }

    if (isset($_POST['save_gifts'])) {
        $giftConfig = getGiftConfigFromPost();
        $config['gifts'] = $giftConfig;
        $success = '礼物配置保存成功';
    }

    if (isset($_POST['save_env'])) {
        $envConfig = [
            'WS_PORT' => $_POST['WS_PORT'] ?? '8080',
            'PHP_API_BASE_LINK' => $_POST['PHP_API_BASE_LINK'] ?? 'http://localhost',
            'WS_LINKING_ADDRESS' => $_POST['WS_LINKING_ADDRESS'] ?? 'ws://localhost:8080/ws',
            'PHP_VALIDATE_USER_API' => $_POST['PHP_VALIDATE_USER_API'] ?? '/validate-user/index.php',
            'PHP_CONTACTS_API' => $_POST['PHP_CONTACTS_API'] ?? '/get-contacts/index.php',
            'PHP_GROUPS_API' => $_POST['PHP_GROUPS_API'] ?? '/groups/index.php',
            'PHP_SETTINGS_API' => $_POST['PHP_SETTINGS_API'] ?? '/usettings/index.php',
            'PHP_RELATION_API' => $_POST['PHP_RELATION_API'] ?? '/urelations/index.php',
            'API_SECRET_KEY' => $_POST['API_SECRET_KEY'] ?? '',
            'HEARTBEAT_TIMEOUT' => $_POST['HEARTBEAT_TIMEOUT'] ?? '30',
            'MAX_RECONNECT_ATTEMPTS' => $_POST['MAX_RECONNECT_ATTEMPTS'] ?? '5',
            'VIDEO_PORT' => $_POST['VIDEO_PORT'] ?? '8081',
            'HTTP_PORT' => $_POST['HTTP_PORT'] ?? '3000',
        ];

        $envContent = "";
        $keys = array_keys($envConfig);
        $lastKey = end($keys);
        foreach ($envConfig as $key => $value) {
            $envContent .= "$key=$value";
            if ($key !== $lastKey) {
                $envContent .= "\n";
            }
        }
        $envDir = dirname($envPath);
        if (!is_dir($envDir)) {
            mkdir($envDir, 0755, true);
        }

        if (file_put_contents($envPath, $envContent)) {
            $success = 'WebSocket 配置保存成功';
        } else {
            $error = 'WebSocket 配置保存失败，请检查文件权限';
        }
        
    
        header('location: ./settings_manage.php');
        exit;
    }

    
    if (!isset($_POST['save_env'])) {
        $content = buildConfigFileContent($config);
        if (file_put_contents($settingPhpPath, $content)) {
       
        } else {
            $error = '配置保存失败，请检查文件权限';
        }
        header('location: ./settings_manage.php');
        exit;
    }
}


function loadFullConfig($path) {
    $config = [
        'mail' => [],
        'site' => [],
        'cos' => [],
        'gifts' => []
    ];
    
    if (file_exists($path)) {
        include $path;
        
       
        if (isset($setting_mail_array)) {
            $config['mail'] = $setting_mail_array;
        }
     
        if (isset($index_array)) {
            $config['site'] = $index_array;
        }
  
        if (isset($cosforall_oss)) {
            $config['cos'] = $cosforall_oss;
        }
     
        if (isset($MOKIM_GIFT_CONFIG)) {
            $config['gifts'] = $MOKIM_GIFT_CONFIG;
        }
    }
    
    return $config;
}
function buildConfigFileContent($config) {
    $mail = $config['mail'] ?? [];
    $site = $config['site'] ?? [];
    $cos = $config['cos'] ?? [];
    $gifts = $config['gifts'] ?? [];
    $content = "<?php\n";
    $content .= "\$setting_mail_array = array( //邮箱配置\n";
    $content .= "    'valid' => " . ($mail['valid'] ?? 0) . ", //是否启用\n";
    $content .= "    'smtp_host' => '" . addslashes($mail['smtp_host'] ?? 'smtp.qq.com') . "', //smtp服务器\n";
    $content .= "    'smtp_port' => " . ($mail['smtp_port'] ?? 465) . ", //端口号,25|465\n";
    $content .= "    'smtp_secure' => '" . addslashes($mail['smtp_secure'] ?? 'ssl') . "', //允许 TLS 或者ssl协议\n";
    $content .= "    'smtp_user' => '" . addslashes($mail['smtp_user'] ?? '') . "', //邮箱用户\n";
    $content .= "    'smtp_pass' => '" . addslashes($mail['smtp_pass'] ?? '') . "', //邮箱授权码\n";
    $content .= ");\n/**-----------------------------------------------*/\n";
    $content .= "\$index_array = array( //主体配置\n";
    $content .= "    'title' => '" . addslashes($site['title'] ?? 'GMOK-在线聊天') . "', //标题\n";
    $content .= "    'beian' => '" . addslashes($site['beian'] ?? '') . "', //备案号\n";
    $content .= "    'keyword' => '" . addslashes($site['keyword'] ?? 'GMOK') . "', //关键字\n";
    $content .= "    'call' => '" . addslashes($site['call'] ?? '') . "', //联系方式\n";
    $content .= ");\n/**------------------------------------------------ */\n";
    $content .= "\$cosforall_oss = array(\n";
    $content .= "    'access_key' => '" . addslashes($cos['access_key'] ?? '') . "',\n";
    $content .= "    'access_key_secret' => '" . addslashes($cos['access_key_secret'] ?? '') . "',\n";
    $content .= "    'bucket' => '" . addslashes($cos['bucket'] ?? '') . "',\n";
    $content .= "    'endpoint' => '" . addslashes($cos['endpoint'] ?? '') . "',\n";
    $content .= "    'region' => '" . addslashes($cos['region'] ?? '') . "',\n";
    $content .= "    'max_upload_size' => '" . addslashes($cos['max_upload_size'] ?? '50MB') . "',\n";
    $content .= ");\n/**----------------------------------------------------- */\n";
    if (!empty($gifts)) {
        $content .= "\$MOKIM_GIFT_CONFIG = [\n";
        foreach ($gifts as $id => $gift) {
            $content .= "    $id => [\n";
            $content .= "        'id' => $id,\n";
            $content .= "        'name' => '" . addslashes($gift['name'] ?? '') . "',\n";
            $content .= "        'description' => '" . addslashes($gift['description'] ?? '') . "',\n";
            $content .= "        'price' => " . intval($gift['price'] ?? 0) . ",\n";
            $content .= "        'intimacyValue' => " . intval($gift['intimacyValue'] ?? 0) . ",\n";
            $content .= "        'icon' => '" . addslashes($gift['icon'] ?? '🎁') . "',\n";
            $content .= "        'hasAnimation' => " . (isset($gift['hasAnimation']) && $gift['hasAnimation'] ? 'true' : 'false') . ",\n";
            $content .= "        'animationType' => '" . addslashes($gift['animationType'] ?? 'none') . "',\n";
            $content .= "        'category' => '" . addslashes($gift['category'] ?? 'daily') . "'\n";
            $content .= "    ],\n";
        }
        $content .= "];\n";
    } else {
        $content .= "\$MOKIM_GIFT_CONFIG = [];\n";
    }
    
    return $content;
}

function getGiftConfigFromPost() {
    $giftConfig = [];
    $giftIds = $_POST['gift_ids'] ?? [];
    foreach ($giftIds as $id) {
        $giftConfig[$id] = [
            'name' => $_POST['gift_name_' . $id] ?? '',
            'description' => $_POST['gift_description_' . $id] ?? '',
            'price' => $_POST['gift_price_' . $id] ?? 0,
            'intimacyValue' => $_POST['gift_intimacy_' . $id] ?? 0,
            'icon' => $_POST['gift_icon_' . $id] ?? '🎁',
            'hasAnimation' => isset($_POST['gift_animation_' . $id]),
            'animationType' => $_POST['gift_animation_type_' . $id] ?? 'none',
            'category' => $_POST['gift_category_' . $id] ?? 'daily',
        ];
    }
    return $giftConfig;
}
$setting_mail_array = [];
$index_array = [];
$cosforall_oss = [];
$MOKIM_GIFT_CONFIG = [];

if (file_exists($settingPhpPath)) {
    include $settingPhpPath;
}

$envConfig = [];
if (file_exists($envPath)) {
    $envLines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($envLines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $envConfig[trim($key)] = trim($value);
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <title>站点配置 - MOK-IM 后台</title>
    <link rel="stylesheet" href="static/css/style.css">
    <style>
        .config-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
            border-bottom: 2px solid #ffe0d2;
            padding-bottom: 10px;
            flex-wrap: wrap;
        }

        .tab-btn {
            background: none;
            border: none;
            padding: 10px 25px;
            font-size: 16px;
            cursor: pointer;
            border-radius: 30px;
            transition: 0.2s;
            color: #ff8f7c;
            font-weight: 600;
        }

        .tab-btn.active {
            background: #ffb7b0;
            color: white;
        }

        .tab-btn:hover:not(.active) {
            background: #ffe6dd;
        }

        .tab-pane {
            display: none;
        }

        .tab-pane.active {
            display: block;
        }

        .config-form {
            max-width: 800px;
        }

        .form-row {
            margin-bottom: 20px;
        }

        .form-row label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #ff8b79;
        }

        .form-row input,
        .form-row textarea,
        .form-row select {
            width: 100%;
            padding: 12px 18px;
            border-radius: 60px;
            border: 1px solid #ffcdc0;
            background: #fffaf7;
            outline: none;
            transition: 0.2s;
        }

        .form-row input:focus,
        .form-row textarea:focus,
        .form-row select:focus {
            border-color: #ff9a88;
            box-shadow: 0 0 0 3px rgba(255, 154, 136, 0.1);
        }

        .form-row small {
            display: block;
            margin-top: 5px;
            color: #bbb;
            font-size: 12px;
        }

        .form-actions {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ffe0d2;
        }

        .btn-save {
            background: linear-gradient(145deg, #ffb7b2, #ff9a8b);
            color: white;
            border: none;
            padding: 12px 32px;
            border-radius: 60px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
        }

        .btn-save:hover {
            transform: scale(0.96);
        }

        .btn-danger {
            background: linear-gradient(145deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 60px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
            font-size: 12px;
        }

        .btn-danger:hover {
            transform: scale(0.96);
        }

        .btn-add {
            background: linear-gradient(145deg, #74b9ff, #0984e3);
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 60px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
        }

        .btn-add:hover {
            transform: scale(0.96);
        }

        .info-note {
            background: #fff5ef;
            padding: 15px 20px;
            border-radius: 24px;
            margin-bottom: 25px;
            border-left: 4px solid #ffb7b0;
            font-size: 14px;
            color: #666;
        }

        .info-note code {
            background: #ffe6dd;
            padding: 2px 8px;
            border-radius: 20px;
            font-family: monospace;
        }

        .gift-item {
            background: #fffaf7;
            border: 1px solid #ffcdc0;
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .gift-item .gift-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #ffe0d2;
            padding-bottom: 10px;
        }

        .gift-item .gift-header .gift-id {
            font-weight: 600;
            color: #ff8b79;
        }

        .gift-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        @media (max-width: 600px) {
            .gift-grid {
                grid-template-columns: 1fr;
            }

            .config-tabs .tab-btn {
                font-size: 14px;
                padding: 8px 16px;
            }
        }
    </style>
</head>

<body>
    <?php include 'templates/header.php'; ?>
    <div class="main-container">
        <h3>⚙️ 站点配置</h3>

        <?php if ($success): ?>
            <div class="success"><?php echo htmlspecialchars($success); ?></div>
        <?php endif; ?>
        <?php if ($error): ?>
            <div class="error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <div class="config-tabs">
            <button class="tab-btn active" onclick="showTab('site')">🏠 站点设置</button>
            <button class="tab-btn" onclick="showTab('smtp')">📧 邮箱配置</button>
            <button class="tab-btn" onclick="showTab('cos')">☁️ COS配置</button>
            <button class="tab-btn" onclick="showTab('gifts')">🎁 礼物配置</button>
            <button class="tab-btn" onclick="showTab('ws')">🔌 WebSocket 配置</button>
        </div>


        <div id="tab-site" class="tab-pane active">
            <div class="info-note">
                💡 站点基本信息配置
            </div>
            <form method="POST" class="config-form">
                <div class="form-row">
                    <label>网站标题</label>
                    <input type="text" name="title" value="<?php echo htmlspecialchars($index_array['title'] ?? 'GMOK-在线聊天'); ?>" placeholder="例如：MOK-IM 聊天系统">
                </div>
                <div class="form-row">
                    <label>ICP备案号</label>
                    <input type="text" name="beian" value="<?php echo htmlspecialchars($index_array['beian'] ?? ''); ?>" placeholder="例如：沪ICP备xxxxxx号">
                    <small>网站底部显示的备案信息</small>
                </div>
                <div class="form-row">
                    <label>网站关键词</label>
                    <input type="text" name="keyword" value="<?php echo htmlspecialchars($index_array['keyword'] ?? 'GMOK'); ?>" placeholder="SEO关键词">
                </div>
                <div class="form-row">
                    <label>联系方式</label>
                    <input type="text" name="call" value="<?php echo htmlspecialchars($index_array['call'] ?? ''); ?>" placeholder="例如：admin@example.com">
                </div>
                <div class="form-actions">
                    <button type="submit" name="save_site" class="btn-save">保存站点设置</button>
                </div>
            </form>
        </div>


        <div id="tab-smtp" class="tab-pane">
            <div class="info-note">
                💡 SMTP 邮件服务配置，用于发送邮件通知。<br>
                常用邮箱 SMTP：QQ邮箱(<code>smtp.qq.com:465</code>)、163邮箱(<code>smtp.163.com:465</code>)、Gmail(<code>smtp.gmail.com:587</code>)
            </div>
            <form method="POST" class="config-form">
                <div class="form-row">
                    <label>SMTP 服务器</label>
                    <input type="text" name="smtp_host" value="<?php echo htmlspecialchars($setting_mail_array['smtp_host'] ?? 'smtp.qq.com'); ?>" placeholder="例如：smtp.qq.com">
                </div>
                <div class="form-row">
                    <label>端口</label>
                    <input type="number" name="smtp_port" value="<?php echo htmlspecialchars($setting_mail_array['smtp_port'] ?? 465); ?>" placeholder="465 或 587">
                    <small>QQ/163邮箱使用465(SSL)，Gmail使用587(TLS)</small>
                </div>
                <div class="form-row">
                    <label>加密方式</label>
                    <select name="smtp_secure">
                        <option value="ssl" <?php echo (isset($setting_mail_array['smtp_secure']) && $setting_mail_array['smtp_secure'] == 'ssl') ? 'selected' : ''; ?>>SSL</option>
                        <option value="tls" <?php echo (isset($setting_mail_array['smtp_secure']) && $setting_mail_array['smtp_secure'] == 'tls') ? 'selected' : ''; ?>>TLS</option>
                    </select>
                </div>
                <div class="form-row">
                    <label>邮箱账号</label>
                    <input type="email" name="smtp_user" value="<?php echo htmlspecialchars($setting_mail_array['smtp_user'] ?? ''); ?>" placeholder="your-email@example.com">
                </div>
                <div class="form-row">
                    <label>邮箱授权码</label>
                    <input type="password" name="smtp_pass" value="<?php echo htmlspecialchars($setting_mail_array['smtp_pass'] ?? ''); ?>" placeholder="邮箱授权码（非登录密码）">
                    <small>QQ邮箱需要在设置中获取授权码</small>
                </div>
                <div class="form-actions">
                    <button type="submit" name="save_smtp" class="btn-save">保存邮箱配置</button>
                </div>
            </form>
        </div>


        <div id="tab-cos" class="tab-pane">
            <div class="info-note">
                ☁️ 对象存储配置，用于上传文件、图片等。<br>
                支持 AWS S3 兼容的存储服务（如 Rainyun、阿里云OSS、腾讯云COS等）
            </div>
            <form method="POST" class="config-form">
                <div class="form-row">
                    <label>Access Key</label>
                    <input type="text" name="cos_access_key" value="<?php echo htmlspecialchars($cosforall_oss['access_key'] ?? ''); ?>" placeholder="请输入 Access Key">
                </div>
                <div class="form-row">
                    <label>Access Key Secret</label>
                    <input type="password" name="cos_access_key_secret" value="<?php echo htmlspecialchars($cosforall_oss['access_key_secret'] ?? ''); ?>" placeholder="请输入 Access Key Secret">
                </div>
                <div class="form-row">
                    <label>Bucket 名称</label>
                    <input type="text" name="cos_bucket" value="<?php echo htmlspecialchars($cosforall_oss['bucket'] ?? ''); ?>" placeholder="例如：my-bucket">
                </div>
                <div class="form-row">
                    <label>Endpoint 地址</label>
                    <input type="text" name="cos_endpoint" value="<?php echo htmlspecialchars($cosforall_oss['endpoint'] ?? ''); ?>" placeholder="例如：https://cn-nb1.rains3.com">
                    <small>存储服务的访问地址</small>
                </div>
                <div class="form-row">
                    <label>Region 区域</label>
                    <input type="text" name="cos_region" value="<?php echo htmlspecialchars($cosforall_oss['region'] ?? ''); ?>" placeholder="例如：rainyun">
                    <small>存储服务所在区域</small>
                </div>
                <div class="form-row">
                    <label>最大上传大小</label>
                    <input type="text" name="cos_max_upload_size" value="<?php echo htmlspecialchars($cosforall_oss['max_upload_size'] ?? '50MB'); ?>" placeholder="例如：50MB">
                    <small>支持单位：B, KB, MB, GB</small>
                </div>
                <div class="form-actions">
                    <button type="submit" name="save_cos" class="btn-save">保存 COS 配置</button>
                </div>
            </form>
        </div>


        <div id="tab-gifts" class="tab-pane">
            <div class="info-note">
                🎁 礼物配置，用于直播/聊天中的礼物打赏功能。
            </div>
            <form method="POST" class="config-form" id="giftForm">
                <div id="giftList">
                    <?php
                    $giftCount = 0;
                    if (!empty($MOKIM_GIFT_CONFIG)):
                        foreach ($MOKIM_GIFT_CONFIG as $id => $gift):
                            $giftCount++;
                    ?>
                            <div class="gift-item" data-id="<?php echo $id; ?>">
                                <div class="gift-header">
                                    <span class="gift-id">🎁 礼物 #<?php echo $id; ?></span>
                                    <button type="button" class="btn-danger" onclick="removeGift(this)">✕ 删除</button>
                                </div>
                                <input type="hidden" name="gift_ids[]" value="<?php echo $id; ?>">
                                <div class="gift-grid">
                                    <div class="form-row">
                                        <label>名称</label>
                                        <input type="text" name="gift_name_<?php echo $id; ?>" value="<?php echo htmlspecialchars($gift['name']); ?>" placeholder="礼物名称">
                                    </div>
                                    <div class="form-row">
                                        <label>图标 (Emoji)</label>
                                        <input type="text" name="gift_icon_<?php echo $id; ?>" value="<?php echo htmlspecialchars($gift['icon']); ?>" placeholder="🎁">
                                    </div>
                                    <div class="form-row">
                                        <label>描述</label>
                                        <input type="text" name="gift_description_<?php echo $id; ?>" value="<?php echo htmlspecialchars($gift['description']); ?>" placeholder="礼物描述">
                                    </div>
                                    <div class="form-row">
                                        <label>分类</label>
                                        <select name="gift_category_<?php echo $id; ?>">
                                            <option value="flowers" <?php echo ($gift['category'] == 'flowers') ? 'selected' : ''; ?>>🌺 鲜花</option>
                                            <option value="luxury" <?php echo ($gift['category'] == 'luxury') ? 'selected' : ''; ?>>💎 奢侈</option>
                                            <option value="daily" <?php echo ($gift['category'] == 'daily') ? 'selected' : ''; ?>>🎈 日常</option>
                                            <option value="special" <?php echo ($gift['category'] == 'special') ? 'selected' : ''; ?>>✨ 特殊</option>
                                        </select>
                                    </div>
                                    <div class="form-row">
                                        <label>价格 (积分)</label>
                                        <input type="number" name="gift_price_<?php echo $id; ?>" value="<?php echo htmlspecialchars($gift['price']); ?>" placeholder="100">
                                    </div>
                                    <div class="form-row">
                                        <label>亲密度值</label>
                                        <input type="number" name="gift_intimacy_<?php echo $id; ?>" value="<?php echo htmlspecialchars($gift['intimacyValue']); ?>" placeholder="60">
                                    </div>
                                    <div class="form-row">
                                        <label>动画效果</label>
                                        <select name="gift_animation_type_<?php echo $id; ?>">
                                            <option value="none" <?php echo ($gift['animationType'] == 'none') ? 'selected' : ''; ?>>无动画</option>
                                            <option value="hearts" <?php echo ($gift['animationType'] == 'hearts') ? 'selected' : ''; ?>>❤️ 爱心</option>
                                            <option value="sparkle" <?php echo ($gift['animationType'] == 'sparkle') ? 'selected' : ''; ?>>✨ 闪耀</option>
                                            <option value="cake" <?php echo ($gift['animationType'] == 'cake') ? 'selected' : ''; ?>>🎂 蛋糕</option>
                                            <option value="celebration" <?php echo ($gift['animationType'] == 'celebration') ? 'selected' : ''; ?>>🎉 庆祝</option>
                                            <option value="fireworks" <?php echo ($gift['animationType'] == 'fireworks') ? 'selected' : ''; ?>>🎆 烟花</option>
                                            <option value="stars" <?php echo ($gift['animationType'] == 'stars') ? 'selected' : ''; ?>>⭐ 星星</option>
                                        </select>
                                    </div>
                                    <div class="form-row" style="display: flex; align-items: center; gap: 15px;">
                                        <label style="margin: 0;">启用动画</label>
                                        <input type="checkbox" name="gift_animation_<?php echo $id; ?>" <?php echo ($gift['hasAnimation']) ? 'checked' : ''; ?> style="width: 20px; height: 20px;">
                                    </div>
                                </div>
                            </div>
                    <?php
                        endforeach;
                    endif;
                    ?>
                </div>

                <div style="margin-bottom: 20px;">
                    <button type="button" class="btn-add" onclick="addGift()">➕ 添加礼物</button>
                </div>

                <div class="form-actions">
                    <button type="submit" name="save_gifts" class="btn-save">保存礼物配置</button>
                </div>
            </form>
        </div>


        <div id="tab-ws" class="tab-pane">
            <div class="info-note">
                ⚠️ 修改 WebSocket 配置后，需要重启 WebSocket 服务才能生效。<br>
            </div>
            <form method="POST" class="config-form">
                <div class="form-row">
                    <label>WebSocket 端口</label>
                    <input type="number" name="WS_PORT" value="<?php echo htmlspecialchars($envConfig['WS_PORT'] ?? '8080'); ?>">
                    <small>WebSocket 服务监听端口</small>
                </div>
                <div class="form-row">
                    <label>HTTP 端口</label>
                    <input type="number" name="HTTP_PORT" value="<?php echo htmlspecialchars($envConfig['HTTP_PORT'] ?? '3000'); ?>">
                    <small>HTTP 服务监听端口</small>
                </div>
                <div class="form-row">
                    <label>视频通话端口</label>
                    <input type="number" name="VIDEO_PORT" value="<?php echo htmlspecialchars($envConfig['VIDEO_PORT'] ?? '8081'); ?>">
                    <small>WebRTC 视频通话端口</small>
                </div>
                <div class="form-row">
                    <label>PHP API 地址</label>
                    <input type="text" name="PHP_API_BASE_LINK" value="<?php echo htmlspecialchars($envConfig['PHP_API_BASE_LINK'] ?? 'http://localhost'); ?>" placeholder="http://localhost">
                </div>
                <div class="form-row">
                    <label>WebSocket 连接地址</label>
                    <input type="text" name="WS_LINKING_ADDRESS" value="<?php echo htmlspecialchars($envConfig['WS_LINKING_ADDRESS'] ?? 'ws://localhost:8080/ws'); ?>" placeholder="ws://your-domain:8080/ws">
                </div>
                <div class="form-row">
                    <label>API Secret Key</label>
                    <input type="text" name="API_SECRET_KEY" value="<?php echo htmlspecialchars($envConfig['API_SECRET_KEY'] ?? ''); ?>" placeholder="用于API认证的密钥">
                </div>
                <div class="form-row">
                    <label>心跳超时（秒）</label>
                    <input type="number" name="HEARTBEAT_TIMEOUT" value="<?php echo htmlspecialchars($envConfig['HEARTBEAT_TIMEOUT'] ?? '30'); ?>">
                </div>
                <div class="form-row">
                    <label>最大重连次数</label>
                    <input type="number" name="MAX_RECONNECT_ATTEMPTS" value="<?php echo htmlspecialchars($envConfig['MAX_RECONNECT_ATTEMPTS'] ?? '5'); ?>">
                </div>
                <div class="form-actions">
                    <button type="submit" name="save_env" class="btn-save">保存 WebSocket 配置</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        let giftCounter = <?php echo $giftCount + 1; ?>;

        function showTab(tabName) {
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById('tab-' + tabName).classList.add('active');
            event.target.classList.add('active');
        }

        function addGift() {
            const id = giftCounter++;
            const container = document.getElementById('giftList');
            const div = document.createElement('div');
            div.className = 'gift-item';
            div.dataset.id = id;
            div.innerHTML = `
                <div class="gift-header">
                    <span class="gift-id">🎁 礼物 #${id}</span>
                    <button type="button" class="btn-danger" onclick="removeGift(this)">✕ 删除</button>
                </div>
                <input type="hidden" name="gift_ids[]" value="${id}">
                <div class="gift-grid">
                    <div class="form-row">
                        <label>名称</label>
                        <input type="text" name="gift_name_${id}" placeholder="礼物名称">
                    </div>
                    <div class="form-row">
                        <label>图标 (Emoji)</label>
                        <input type="text" name="gift_icon_${id}" placeholder="🎁">
                    </div>
                    <div class="form-row">
                        <label>描述</label>
                        <input type="text" name="gift_description_${id}" placeholder="礼物描述">
                    </div>
                    <div class="form-row">
                        <label>分类</label>
                        <select name="gift_category_${id}">
                            <option value="flowers">🌺 鲜花</option>
                            <option value="luxury">💎 奢侈</option>
                            <option value="daily" selected>🎈 日常</option>
                            <option value="special">✨ 特殊</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <label>价格 (积分)</label>
                        <input type="number" name="gift_price_${id}" placeholder="100">
                    </div>
                    <div class="form-row">
                        <label>亲密度值</label>
                        <input type="number" name="gift_intimacy_${id}" placeholder="60">
                    </div>
                    <div class="form-row">
                        <label>动画效果</label>
                        <select name="gift_animation_type_${id}">
                            <option value="none">无动画</option>
                            <option value="hearts">❤️ 爱心</option>
                            <option value="sparkle">✨ 闪耀</option>
                            <option value="cake">🎂 蛋糕</option>
                            <option value="celebration">🎉 庆祝</option>
                            <option value="fireworks">🎆 烟花</option>
                            <option value="stars">⭐ 星星</option>
                        </select>
                    </div>
                    <div class="form-row" style="display: flex; align-items: center; gap: 15px;">
                        <label style="margin: 0;">启用动画</label>
                        <input type="checkbox" name="gift_animation_${id}" style="width: 20px; height: 20px;">
                    </div>
                </div>
            `;
            container.appendChild(div);
        }

        function removeGift(btn) {
            if (confirm('确定要删除这个礼物配置吗？')) {
                const item = btn.closest('.gift-item');
                item.remove();
            }
        }
    </script>
</body>

</html>