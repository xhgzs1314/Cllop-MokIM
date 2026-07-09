<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => '请使用POST请求']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = trim($input['password'] ?? '');

if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => '账号和密码不能为空']);
    exit();
}
$result = lanzou_login_with_debug($username, $password);
echo json_encode($result);
function lanzou_login_with_debug($username, $password) {
    $debug = ['steps' => [], 'success' => false, 'cookie' => null, 'message' => ''];
    $debug['steps'][] = ['step' => 'init', 'status' => 'start', 'message' => '初始化CURL'];
    $ch = curl_init();
    if ($ch === false) {
        $debug['steps'][] = ['step' => 'init', 'status' => 'error', 'message' => 'CURL初始化失败'];
        $debug['message'] = 'CURL初始化失败';
        return $debug;
    }
    $debug['steps'][] = ['step' => 'init', 'status' => 'success', 'message' => 'CURL初始化成功'];
    $debug['steps'][] = ['step' => 'get_arg1', 'status' => 'start', 'message' => '正在获取反爬参数...'];
    $loginUrl = 'https://pc.woozooo.com/account.php';
    curl_setopt_array($ch, [
        CURLOPT_URL => $loginUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_HEADER => true,
        CURLOPT_NOBODY => false,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_COOKIEJAR => '',
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        CURLOPT_TIMEOUT => 30,
        CURLOPT_ENCODING => 'gzip, deflate'  
    ]);
    
    $response = curl_exec($ch);
    $errno = curl_errno($ch);
    
    if ($errno !== 0) {
        $debug['steps'][] = ['step' => 'get_arg1', 'status' => 'error', 'message' => 'CURL错误: ' . curl_error($ch)];
        $debug['message'] = '网络请求失败';
        curl_close($ch);
        return $debug;
    }
    
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $debug['steps'][] = ['step' => 'get_arg1', 'status' => 'info', 'message' => "HTTP状态码: $httpCode"];
    $arg1 = extract_arg1($response);
    if ($arg1) {
        $debug['steps'][] = ['step' => 'get_arg1', 'status' => 'success', 'message' => "获取到arg1: $arg1"];
        $acwValue = generate_acw_sc_v2($arg1);
        $debug['steps'][] = ['step' => 'get_arg1', 'status' => 'info', 'message' => "计算得到acw_sc__v2: $acwValue"];
        curl_setopt($ch, CURLOPT_COOKIE, "acw_sc__v2=$acwValue");
        $debug['steps'][] = ['step' => 'get_arg1', 'status' => 'info', 'message' => '携带acw_sc__v2重新请求...'];
        $response2 = curl_exec($ch);
        $response = $response2;
    }
    $formhash = extract_formhash($response);
    if (!$formhash) {
        $bodyStart = strpos($response, "\r\n\r\n");
        $body = '';
        if ($bodyStart !== false) {
            $body = substr($response, $bodyStart + 4);
            $body = strlen($body) > 1000 ? substr($body, 0, 1000) : $body;
        }
        
        $debug['steps'][] = [
            'step' => 'get_formhash', 
            'status' => 'error', 
            'message' => '无法从页面提取formhash',
            'html_preview' => htmlspecialchars($body)
        ];
        $debug['message'] = '无法获取formhash';
        curl_close($ch);
        return $debug;
    }
    
    $debug['steps'][] = ['step' => 'get_formhash', 'status' => 'success', 'message' => "获取到formhash: $formhash"];
    $debug['steps'][] = ['step' => 'login', 'status' => 'start', 'message' => '提交登录请求...'];
    
    $postUrl = 'https://pc.woozooo.com/account.php';
    $postData = [
        'action' => 'login',
        'task' => 'login',
        'ref' => '/mydisk.php',
        'formhash' => $formhash,
        'username' => $username,
        'password' => $password
    ];
    
    curl_setopt_array($ch, [
        CURLOPT_URL => $postUrl,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($postData),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/x-www-form-urlencoded',
            'Referer: https://pc.woozooo.com/account.php'
        ],
        CURLOPT_HEADER => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true
    ]);
    
    $loginResponse = curl_exec($ch);
    $loginErrno = curl_errno($ch);
    
    if ($loginErrno !== 0) {
        $debug['steps'][] = ['step' => 'login', 'status' => 'error', 'message' => '登录请求失败: ' . curl_error($ch)];
        $debug['message'] = '登录请求失败';
        curl_close($ch);
        return $debug;
    }
    $cookie = extract_cookies($loginResponse);
    $debug['steps'][] = ['step' => 'login', 'status' => 'info', 'message' => "提取到的授权凭证: " . ($cookie ?: '无')];
    if (strpos($cookie, 'ylogin=') !== false) {
        $debug['steps'][] = ['step' => 'login', 'status' => 'success', 'message' => '登录成功！'];
        $debug['success'] = true;
        $debug['cookie'] = $cookie;
        $debug['message'] = '获取授权凭证成功';
    } else {
        $bodyStart = strpos($loginResponse, "\r\n\r\n");
        if ($bodyStart !== false) {
            $body = substr($loginResponse, $bodyStart + 4);
            if (strpos($body, '密码') !== false || stripos($body, 'password') !== false) {
                $debug['steps'][] = ['step' => 'login', 'status' => 'error', 'message' => '密码错误'];
                $debug['message'] = '密码错误';
            } elseif (strpos($body, '用户') !== false || stripos($body, 'username') !== false) {
                $debug['steps'][] = ['step' => 'login', 'status' => 'error', 'message' => '用户名错误'];
                $debug['message'] = '用户名错误';
            } else {
                $debug['steps'][] = ['step' => 'login', 'status' => 'error', 'message' => '登录失败，原因未知', 'body_preview' => htmlspecialchars(substr($body, 0, 500))];
                $debug['message'] = '登录失败';
            }
        } else {
            $debug['steps'][] = ['step' => 'login', 'status' => 'error', 'message' => '登录失败，未获取到ylogin'];
            $debug['message'] = '账号或密码错误';
        }
    }
    
    curl_close($ch);
    return $debug;
}
function extract_arg1($response) {
    $patterns = [
        "/arg1='([A-F0-9]+)'/i",
        '/arg1="([A-F0-9]+)"/i',
        "/var arg1='([A-F0-9]+)'/i",
        "/arg1\s*=\s*'([A-F0-9]+)'/i"
    ];
    
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $response, $matches)) {
            return $matches[1];
        }
    }
    
    return false;
}
function generate_acw_sc_v2($arg1) {
    $posList = [15, 35, 29, 24, 33, 16, 1, 38, 10, 9, 19, 31, 40, 27, 22, 23,
                25, 13, 6, 11, 39, 18, 20, 8, 14, 21, 32, 26, 2, 30, 7, 4, 17,
                5, 3, 28, 34, 37, 12, 36];
    $mask = "3000176000856006061501533003690027800375";
    $rearranged = '';
    for ($i = 0; $i < count($posList); $i++) {
        $pos = $posList[$i] - 1;
        if ($pos < strlen($arg1)) {
            $rearranged .= $arg1[$pos];
        }
    }
    $result = '';
    for ($i = 0; $i < strlen($rearranged); $i += 2) {
        if ($i + 1 < strlen($rearranged) && $i + 1 < strlen($mask)) {
            $dataByte = hexdec(substr($rearranged, $i, 2));
            $maskByte = hexdec(substr($mask, $i, 2));
            $xorResult = $dataByte ^ $maskByte;
            $result .= str_pad(dechex($xorResult), 2, '0', STR_PAD_LEFT);
        }
    }
    
    return strtolower($result);
}
function extract_formhash($html) {
    $patterns = [
        '/<input type="hidden" name="formhash" value="([a-f0-9]+)"/i',
        '/name="formhash"\s+value="([a-f0-9]+)"/i',
        '/formhash\s*=\s*"([a-f0-9]+)"/i',
        '/var\s+formhash\s*=\s*"([a-f0-9]+)"/i',
        '/formhash\s*:\s*"([a-f0-9]+)"/i'
    ];
    
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $html, $matches)) {
            return $matches[1];
        }
    }
    
    return false;
}
function extract_cookies($response) {
    $cookies = [];
    $lines = explode("\n", $response);
    
    foreach ($lines as $line) {
        if (preg_match('/^Set-Cookie:\s*([^;]+)/i', $line, $matches)) {
            $cookiePair = trim($matches[1]);
            $parts = explode('=', $cookiePair, 2);
            if (count($parts) === 2) {
                $cookies[$parts[0]] = $parts[1];
            }
        }
    }
    
    $cookieStr = '';
    $keepKeys = ['ylogin', 'PHPSESSID', 'phpdisk_info', 'acw_sc__v2'];
    
    foreach ($keepKeys as $key) {
        if (isset($cookies[$key])) {
            $cookieStr .= $key . '=' . $cookies[$key] . '; ';
        }
    }
    
    return rtrim($cookieStr, '; ');
}