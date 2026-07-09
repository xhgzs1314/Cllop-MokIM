<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
define('MAX_FILE_SIZE', 100 * 1024 * 1024);
define('UPLOAD_DIR', dirname(__DIR__, 2) . '/temp_uploads/');
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => '请使用POST请求']);
    exit();
}
$cookie = $_POST['cookie'] ?? '';
if (empty($cookie)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $cookie = $input['cookie'] ?? '';
}

if (empty($cookie)) {
    echo json_encode(['success' => false, 'message' => '请提供Cookie']);
    exit();
}
$file = null;
if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['file'];
} elseif (isset($_FILES['upload_file']) && $_FILES['upload_file']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['upload_file'];
} elseif (isset($_FILES['upfile']) && $_FILES['upfile']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['upfile'];
}

if (!$file) {
    echo json_encode(['success' => false, 'message' => '请选择需要上传的文件']);
    exit();
}

$tmpPath = $file['tmp_name'];
$fileName = $file['name'];
$fileSize = $file['size'];
$fileType = $file['type'] ?: mime_content_type($tmpPath) ?: 'application/octet-stream';
if ($fileSize > MAX_FILE_SIZE) {
    echo json_encode(['success' => false, 'message' => '文件大小超过100MB限制']);
    exit();
}
$safeFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $fileName);
$tempFile = UPLOAD_DIR . uniqid() . '_' . $safeFileName;
if (!move_uploaded_file($tmpPath, $tempFile)) {
    echo json_encode(['success' => false, 'message' => '保存临时文件失败']);
    exit();
}
$result = upload_to_lanzou($tempFile, $fileName, $fileType, $fileSize, $cookie);
@unlink($tempFile);
if ($result['success']) {
    $direct_url = get_direct_url_from_share($result['share_url'], $result['password']);
    echo json_encode([
        'success' => true,
        'share_url' => $result['share_url'],      
        'password' => $result['password'],         
        'direct_url' => $direct_url,               
        'file_id' => $result['file_id'] ?? '',
        'message' => '上传成功'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => $result['message']
    ]);
}
function get_direct_url_from_share($share_url, $password) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $share_url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
    ]);
    $html = curl_exec($ch);
    curl_close($ch);
    $html_no_comments = preg_replace('/\/\*.*?\*\//s', '', $html);
    preg_match("/data\s*:\s*\{\s*'action'\s*:\s*'downprocess'\s*,\s*'sign'\s*:\s*'([^']+)'/", $html_no_comments, $sign_match);
    preg_match("/url\s*:\s*'\/ajaxm\.php\?file=(\d+)'/", $html_no_comments, $file_match);

    if (empty($sign_match[1]) || empty($file_match[1])) {
        return null;
    }
    $sign = $sign_match[1];
    $file_id = $file_match[1];
    $base_domain = preg_replace('/^(https?:\/\/[^\/]+).*$/', '$1', $share_url);
    $ajax_url = $base_domain . "/ajaxm.php?file=" . $file_id;
    $post_data = http_build_query([
        'action' => 'downprocess',
        'sign' => $sign,
        'kd' => 1,
        'p' => $password
    ]);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $ajax_url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $post_data,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_HTTPHEADER => [
            'Referer: ' . $share_url,
            'X-Requested-With: XMLHttpRequest',
            'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $result = json_decode($response, true);
    if ($result && ($result['zt'] == '1' || $result['zt'] == 1)) {
        $dom = $result['dom'] ?? '';
        $url_path = $result['url'] ?? '';
        return $dom . '/file/' . $url_path;
    }

    return null;
}
function get_file_password($fileId, $cookie)
{
    $url = 'https://pc.woozooo.com/doupload.php';
    $postData = [
        'task' => '22',
        'file_id' => $fileId
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($postData),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_HTTPHEADER => [
            'Cookie: ' . $cookie,
            'Content-Type: application/x-www-form-urlencoded',
            'X-Requested-With: XMLHttpRequest',
            'User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36'
        ],
        CURLOPT_TIMEOUT => 30
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $result = json_decode($response, true);
    if ($result && $result['zt'] == 1 && isset($result['info']['pwd'])) {
        return $result['info']['pwd'];
    }
    return '';
}
function upload_to_lanzou($filePath, $fileName, $fileType, $fileSize, $cookie)
{
    $uploadParams = get_upload_params($cookie);
    if (!$uploadParams['success']) {
        return ['success' => false, 'message' => '获取上传参数失败：' . $uploadParams['message']];
    }
    $uploadUrl = 'https://pc.woozooo.com/html5up.php';
    $uniqueId = 'WU_FILE_' . time();
    $lastModified = filemtime($filePath);
    $lastModifiedDate = date('D M d Y H:i:s e+0800 (T)', $lastModified);
    $postFields = [
        'task' => '1',
        'vie' => '2',
        've' => '2',
        'id' => $uniqueId,
        'name' => $fileName,
        'type' => $fileType,
        'lastModifiedDate' => $lastModifiedDate,
        'size' => (string)$fileSize,
        'folder_id_bb_n' => '-1',
        'upload_file' => new CURLFile($filePath, $fileType, $fileName)
    ];

    $ch = curl_init();
    if ($ch === false) {
        return ['success' => false, 'message' => '初始化CURL失败'];
    }

    curl_setopt_array($ch, [
        CURLOPT_URL => $uploadUrl,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_HTTPHEADER => [
            'Cookie: ' . $cookie,
            'User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
            'Accept: */*',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
            'Origin: https://pc.woozooo.com',
            'Referer: https://pc.woozooo.com/mydisk.php'
        ],
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 300,
        CURLOPT_VERBOSE => false
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errno = curl_errno($ch);
    curl_close($ch);

    if ($errno !== 0) {
        return ['success' => false, 'message' => 'CURL错误: ' . $errno];
    }

    if ($httpCode !== 200) {
        return ['success' => false, 'message' => 'HTTP错误: ' . $httpCode];
    }
    $result = json_decode($response, true);
    if ($result) {
        if (isset($result['zt']) && $result['zt'] == 1) {
            $fileId = $result['text'][0]['id'] ?? '';
            $domain = $result['text'][0]['is_newd'] ?? '';
            $fid = $result['text'][0]['f_id'] ?? '';
            $password = get_file_password($fileId, $cookie);
            $share_url = $domain . '/' . $fid;
            return [
                'success' => true,
                'share_url' => $share_url,
                'password' => $password,
                'file_id' => $fileId,
                'message' => '上传成功'
            ];
        } else {
            $errorMsg = $result['info'] ?? $result['message'] ?? '上传失败';
            return ['success' => false, 'message' => $errorMsg];
        }
    }
    return ['success' => false, 'message' => '未知错误：' . substr($response, 0, 200)];
}
function get_upload_params($cookie)
{
    $url = 'https://pc.woozooo.com/mydisk.php';

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_HTTPHEADER => [
            'Cookie: ' . $cookie,
            'User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36',
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        ],
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode == 200 && !empty($response)) {
        if (strpos($response, 'logout') !== false || strpos($response, 'user_name') !== false) {
            return ['success' => true, 'data' => $response];
        }
    }

    return ['success' => false, 'message' => 'Cookie无效或已过期'];
}
function parse_cookie_string($cookieString)
{
    $cookies = [];
    $pairs = explode(';', $cookieString);
    foreach ($pairs as $pair) {
        $pair = trim($pair);
        if (strpos($pair, '=') !== false) {
            list($key, $value) = explode('=', $pair, 2);
            $cookies[trim($key)] = trim($value);
        }
    }
    return $cookies;
}
