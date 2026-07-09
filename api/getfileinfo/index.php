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
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$url = $input['url'] ?? '';
$fileType = $input['fileType'] ?? '';

if (empty($url) || empty($fileType)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'URL and file type are required']);
    exit();
}

if (!filter_var($url, FILTER_VALIDATE_URL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid URL format']);
    exit();
}

$imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
$fileExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'zip', 'rar', 'txt', 'mp4', 'mp3'];

$ext = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));

if ($fileType === 'image' && !in_array($ext, $imageExts)) {
    echo json_encode(['success' => false, 'message' => 'Unsupported image format']);
    exit();
}

if ($fileType === 'file' && !in_array($ext, $fileExts)) {
    echo json_encode(['success' => false, 'message' => 'Unsupported file format']);
    exit();
}

try {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($response === false) {
        throw new Exception('Failed to fetch file: ' . curl_error($ch));
    }
    
    if ($httpCode >= 400) {
        throw new Exception('File access failed (HTTP ' . $httpCode . ')');
    }
    
    $fileSize = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
    $fileName = '';
    $contentDisposition = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $headers = substr($response, 0, $headerSize);
    
    if (preg_match('/Content-Disposition:.*filename=["\']?([^"\'\s]+)["\']?/i', $headers, $matches)) {
        $fileName = $matches[1];
    } else {
        $path = parse_url($url, PHP_URL_PATH);
        $fileName = basename($path);
        $fileName = urldecode($fileName);
    }
    
    
    $fileName = preg_replace('/[^\w\-\.\x{4e00}-\x{9fa5}]/u', '_', $fileName);
    
    if (empty($fileName)) {
        $fileName = 'unknown.' . $ext;
    }
    
    //curl_close($ch);
    
    $maxSize = $fileType === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if ($fileSize > $maxSize) {
        $sizeLimit = $fileType === 'image' ? '10MB' : '100MB';
        echo json_encode([
            'success' => false,
            'message' => 'File too large (max ' . $sizeLimit . ')'
        ]);
        exit();
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'fileName' => $fileName,
            'fileSize' => (int)$fileSize,
            'isBroken' => false,
            'contentType' => curl_getinfo($ch, CURLINFO_CONTENT_TYPE)
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => true,
        'data' => [
            'fileName' => 'unknown.' . $ext,
            'fileSize' => 0,
            'isBroken' => true,
            'error' => $e->getMessage()
        ]
    ]);
}
?>