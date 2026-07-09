<?php
function mokim_ttl_elegant_exit($content, $callback = null, $type = 'info')
{
    if ($callback !== null && is_callable($callback)) {
        call_user_func($callback);
    }
    if (ob_get_level()) {
        ob_end_clean();
    }
    $colors = $type === 'error' ? [
        'bg' => '#fef2f2',
        'border' => '#fecaca',
        'icon' => '#dc2626',
        'icon_bg' => '#fee2e2',
        'title' => '#991b1b'
    ] : [
        'bg' => '#eff6ff',
        'border' => '#bfdbfe',
        'icon' => '#2563eb',
        'icon_bg' => '#dbeafe',
        'title' => '#1e40af'
    ];

    header('Content-Type: text/html; charset=utf-8');
    http_response_code($type === 'error' ? 403 : 200);
    echo <<<HTML
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>提示</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;padding:20px}
        .exit-box{max-width:520px;width:100%;background:#fff;border-radius:20px;padding:48px 40px 40px;box-shadow:0 20px 60px rgba(0,0,0,0.08);text-align:center;border:1px solid {$colors['border']};animation:fadeUp .4s ease}
        .exit-icon{width:72px;height:72px;border-radius:50%;background:{$colors['icon_bg']};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;color:{$colors['icon']}}
        .exit-title{font-size:20px;font-weight:600;color:{$colors['title']};margin-bottom:12px}
        .exit-content{font-size:15px;color:#334155;line-height:1.8;white-space:pre-wrap;word-break:break-word}
        .exit-content a{color:{$colors['icon']};text-decoration:none;font-weight:500}
        .exit-content a:hover{text-decoration:underline}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:480px){.exit-box{padding:32px 20px 28px}}
    </style>
</head>
<body>
    <div class="exit-box">
        <div class="exit-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></div>
        <div class="exit-title">提示</div>
        <div class="exit-content">{$content}</div>
    </div>
</body>
</html>
HTML;
    exit;
}
function x_real_ip()
{
    $ip = $_SERVER['REMOTE_ADDR'];
    if (isset($_SERVER['HTTP_X_FORWARDED_FOR']) && preg_match_all('#\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}#s', $_SERVER['HTTP_X_FORWARDED_FOR'], $matches)) {
        foreach ($matches[0] as $xip) {
            if (!preg_match('#^(10|172\\.16|192\\.168)\\.#', $xip)) {
                $ip = $xip;
            } else {
                continue;
            }
        }
    } else {
        if (isset($_SERVER['HTTP_CLIENT_IP']) && preg_match('/^([0-9]{1,3}\\.){3}[0-9]{1,3}$/', $_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } else {
            if (isset($_SERVER['HTTP_CF_CONNECTING_IP']) && preg_match('/^([0-9]{1,3}\\.){3}[0-9]{1,3}$/', $_SERVER['HTTP_CF_CONNECTING_IP'])) {
                $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
            } else {
                if ((isset($_SERVER['HTTP_X_REAL_IP']) && preg_match('/^([0-9]{1,3}\\.){3}[0-9]{1,3}$/', $_SERVER['HTTP_X_REAL_IP']))) {
                    $ip = $_SERVER['HTTP_X_REAL_IP'];
                }
            }
        }
    }
    return $ip;
}
/**
 * 加密函数
 * @param string $string 需要加密的字串
 * @param string $operation 操作类型,E:加密,D:解密
 * @param string $key 加密密钥
 * @return string
 */
function encrypt($string, $operation, $key = '')
{
    $key = md5($key);
    $key_length = strlen($key);
    $string = $operation == 'D' ? base64_decode($string) : substr(md5($string . $key), 0, 8) . $string;
    $string_length = strlen($string);
    $rndkey = $box = array();
    $result = '';
    for ($i = 0; $i <= 255; $i++) {
        $rndkey[$i] = ord($key[$i % $key_length]);
        $box[$i] = $i;
    }
    for ($j = $i = 0; $i < 256; $i++) {
        $j = ($j + $box[$i] + $rndkey[$i]) % 256;
        $tmp = $box[$i];
        $box[$i] = $box[$j];
        $box[$j] = $tmp;
    }
    for ($a = $j = $i = 0; $i < $string_length; $i++) {
        $a = ($a + 1) % 256;
        $j = ($j + $box[$a]) % 256;
        $tmp = $box[$a];
        $box[$a] = $box[$j];
        $box[$j] = $tmp;
        $result .= chr(ord($string[$i]) ^ ($box[($box[$a] + $box[$j]) % 256]));
    }
    if ($operation == 'D') {
        if (substr($result, 0, 8) == substr(md5(substr($result, 8) . $key), 0, 8)) {
            return substr($result, 8);
        } else {
            return '';
        }
    } else {
        return str_replace('=', '', base64_encode($result));
    }
}
function generateAutoWebsiteIdentifier(bool $short = false): string
{
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
        (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
        ? 'https' : 'http';
    $domain = isset($_SERVER['HTTP_HOST']) ? rtrim(strtolower(trim($_SERVER['HTTP_HOST'])), '/') : (isset($_SERVER['SERVER_NAME']) ? rtrim(strtolower(trim($_SERVER['SERVER_NAME'])), '/') : '');
    $port = isset($_SERVER['SERVER_PORT']) ? (int)$_SERVER['SERVER_PORT'] : ($protocol === 'https' ? 443 : 80);
    $ip = getServerIp();
    $websiteInfo = [
        'protocol' => $protocol,
        'domain'   => $domain,
        'port'     => $port,
        'ip'       => $ip
    ];
    if (empty($websiteInfo['domain']) && empty($websiteInfo['ip'])) {
        throw new RuntimeException('无法自动获取网站的核心标识信息（域名/IP），请检查运行环境');
    }
    $featureString = implode('|', [
        $websiteInfo['protocol'],
        $websiteInfo['domain'],
        $websiteInfo['ip'],
        (string)$websiteInfo['port']
    ]);
    $hash = hash('sha256', $featureString);
    if ($short) {
        $hash = substr($hash, 0, 8);
    }

    return $hash;
}
function getServerIp(): string
{
    $ipSources = [
        'HTTP_X_REAL_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_CLIENT_IP',
        'REMOTE_ADDR'
    ];

    foreach ($ipSources as $source) {
        if (isset($_SERVER[$source]) && filter_var($_SERVER[$source], FILTER_VALIDATE_IP)) {
            $ip = $_SERVER[$source];
            if (str_contains($ip, ',')) {
                $ip = trim(explode(',', $ip)[0]);
            }
            return $ip;
        }
    }
    $localIp = gethostbyname(gethostname());
    return filter_var($localIp, FILTER_VALIDATE_IP) ? $localIp : '';
}