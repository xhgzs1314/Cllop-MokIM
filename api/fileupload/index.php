<?php
function parseSizeToBytes($size): int
{
    if (is_numeric($size)) {
        return (int)$size;
    }
    $size = strtoupper(trim($size));
    $units = [
        'GB' => 1073741824,
        'G' => 1073741824,
        'MB' => 1048576,
        'M' => 1048576,
        'KB' => 1024,
        'K' => 1024,
        'B' => 1
    ];

    foreach ($units as $unit => $bytes) {
        if (strpos($size, $unit) !== false) {
            $number = (float)str_replace($unit, '', $size);
            return (int)($number * $bytes);
        }
    }

    return (int)$size ?: 104857600;
}
function formatBytes($bytes, $precision = 2): string
{
    if ($bytes === 0) return '0 B';
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $i = (int)floor(log($bytes, 1024));
    return number_format($bytes / pow(1024, $i), $precision) . ' ' . $units[$i];
}
function checkFileSize($fileSize, $maxSize, $fileType = 'file'): ?string
{
    if ($maxSize <= 0) {
        return null;
    }
    if ($fileSize > $maxSize) {
        $maxSizeStr = formatBytes($maxSize);
        $fileSizeStr = formatBytes($fileSize);
        return "文件大小 ({$fileSizeStr}) 超过最大限制 ({$maxSizeStr})";
    }
    return null;
}
require_once $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/CosS3.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
require($_SERVER['DOCUMENT_ROOT'] . '/setting.php');
$requiredKeys = ['bucket', 'region', 'endpoint', 'access_key', 'access_key_secret'];
foreach ($requiredKeys as $key) {
    if (empty($cosforall_oss[$key])) {
        sendErrorResponse('服务端配置检测异常!功能暂时关闭', 501);
        exit;
    }
}
$s3Config = [
    'bucket' => $cosforall_oss['bucket'] ?: 'fuckno',
    'region' => $cosforall_oss['region'] ?: 'rainyun',
    'endpoint' => $cosforall_oss['endpoint'] ?: 'https://s3.amazonaws.com',
    'access_key_id' => $cosforall_oss['access_key'] ?: 'access-key',
    'access_key_secret' => $cosforall_oss['access_key_secret'] ?: 'secret-key',
    'use_path_style' => true,
    'verify_ssl' => false,
];
$maxUploadSize = parseSizeToBytes($cosforall_oss['max_upload_size'] ?? '100MB');
try {
    $s3Manager = new S3StorageManager($s3Config);
} catch (Exception $e) {
    sendErrorResponse('S3初始化失败: ' . $e->getMessage(), 500);
    exit();
}
$action = $_POST['action'] ?? $_GET['action'] ?? 'upload';
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php');
$qx_max_tmp1 = true;
$q_suname = null;
$tcodelogins = $_COOKIE[generateAutoWebsiteIdentifier((true)) . "_log"] ?? 'null';
if ($tcodelogins == 'null') {
    $qx_max_tmp1 = false;
} else {
    require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
    $decodeers = new TmdbaseauthdownyhoDecrypt(60000 * 60 * 2); //2h验证
    $decodeddata = $decodeers->writebacknewwords($tcodelogins);
    if (!$decodeddata) {
        $qx_max_tmp1 = false;
    }
    $decodeddata2 = encrypt($decodeddata, 'D', generateAutoWebsiteIdentifier(true));
    if (!$decodeddata2) {
        $qx_max_tmp1 = false;
    }
    $tarray = explode('<:>', $decodeddata2);
    if (!isset($tarray[0]) || !isset($tarray[1]) || empty($tarray[0]) || empty($tarray[1]) || !isset($tarray[2]) || empty($tarray[2])) {
        $qx_max_tmp1 = false;
    }
    $q_suname = trim($tarray[2]);
}
if (!$qx_max_tmp1) {
    sendErrorResponse('您当前暂未登录', 502);
    exit();
}
switch ($action) {
    case 'upload':
        handleUpload($s3Manager);
        break;
    case 'upload_url':
        handleUploadFromUrl($s3Manager);
        break;
    case 'presigned':
        handlePresignedUrl($s3Manager);
        break;
    case 'initiate_multipart':
        handleInitiateMultipart($s3Manager);
        break;
    case 'presigned_part_url':
        handlePresignedPartUrl($s3Manager);
        break;
    case 'complete_multipart':
        handleCompleteMultipart($s3Manager);
        break;
    case 'abort_multipart':
        handleAbortMultipart($s3Manager);
        break;
    case 'list':
        handleListObjects($s3Manager);
        break;
    case 'delete':
        handleDeleteObject($s3Manager);
        break;
    case 'get_download_url':
        handleGetDownloadUrl($s3Manager);
        break;
    default:
        sendErrorResponse('未知操作: ' . $action, 400);
}
function handleInitiateMultipart(S3StorageManager $s3Manager)
{
    global $maxUploadSize;
    $fileName = $_POST['file_name'] ?? '';
    $fileSize = (int)($_POST['file_size'] ?? 0);
    $userId = $_POST['user_id'] ?? $_POST['dfid'] ?? 'unknown';
    $targetType = $_POST['target_type'] ?? 'user';
    $targetId = $_POST['target_id'] ?? '';
    if (!$fileName) {
        sendErrorResponse('缺少 file_name 参数', 400);
        return;
    }
    $sizeCheck = checkFileSize($fileSize, $maxUploadSize, 'upload');
    if ($sizeCheck !== null) {
        sendErrorResponse($sizeCheck, 413);
        return;
    }
    global $q_suname;
    if ($userId !== $q_suname) {
        sendErrorResponse('您当前未登录', 414);
        return;
    }
    try {
        $fileId = 'file_' . date('YmdHis') . '_' . uniqid();
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $datePath = date('Y/m/d');
        $objectKey = "uploads/{$datePath}/{$fileId}." . ($extension ?: 'bin');
        $metadata = [
            'user_id' => $userId,
            'file_id' => $fileId,
            'original_name' => $fileName,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'upload_time' => date('Y-m-d H:i:s')
        ];
        $uploadId = $s3Manager->initiateMultipartUpload($objectKey, $metadata);
        sendSuccessResponse([
            'file_id' => $fileId,
            'object_key' => $objectKey,
            'upload_id' => $uploadId,
            'file_name' => $fileName,
            'file_size' => $fileSize,
            'part_size' => 20971520,
            'total_parts' => ceil($fileSize / 20971520)
        ]);
    } catch (Exception $e) {
        sendErrorResponse('初始化分片上传失败: ' . $e->getMessage(), 500);
    }
}
function handlePresignedPartUrl(S3StorageManager $s3Manager)
{
    $objectKey = $_POST['object_key'] ?? '';
    $uploadId = $_POST['upload_id'] ?? '';
    $partNumber = (int)($_POST['part_number'] ?? 0);
    $partSize = (int)($_POST['part_size'] ?? 20971520);
    $expiry = $_POST['expiry'] ?? '+1 hour';

    if (!$objectKey || !$uploadId || $partNumber < 1) {
        sendErrorResponse('缺少必要参数: object_key, upload_id, part_number', 400);
        return;
    }

    try {
        $commandParams = [
            'Bucket' => $s3Manager->getBucket(),
            'Key' => $objectKey,
            'UploadId' => $uploadId,
            'PartNumber' => $partNumber
        ];

        $command = $s3Manager->getClient()->getCommand('UploadPart', $commandParams);
        $presignedUrl = (string) $s3Manager->getClient()->createPresignedRequest($command, $expiry)->getUri();

        sendSuccessResponse([
            'part_number' => $partNumber,
            'presigned_url' => $presignedUrl,
            'expires_in' => 3600
        ]);
    } catch (Exception $e) {
        sendErrorResponse('生成分片预签名URL失败: ' . $e->getMessage(), 500);
    }
}

function handleCompleteMultipart(S3StorageManager $s3Manager)
{
    $objectKey = $_POST['object_key'] ?? '';
    $uploadId = $_POST['upload_id'] ?? '';
    $fileId = $_POST['file_id'] ?? '';
    $fileName = $_POST['file_name'] ?? '';
    $fileSize = (int)($_POST['file_size'] ?? 0);
    $userId = $_POST['user_id'] ?? $_POST['dfid'] ?? 'unknown';
    $targetType = $_POST['target_type'] ?? 'user';
    $targetId = $_POST['target_id'] ?? '';
    $parts = [];
    if (isset($_POST['parts'])) {
        $parts = is_string($_POST['parts']) ? json_decode($_POST['parts'], true) : $_POST['parts'];
    }
    if (!$objectKey || !$uploadId || !$fileId || empty($parts)) {
        sendErrorResponse('缺少必要参数', 400);
        return;
    }
    global $q_suname;
    if ($userId !== $q_suname) {
        sendErrorResponse('您当前未登录', 414);
        return;
    }
    require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
    $conn->set_charset('utf8mb4');
    try {
        $result = $s3Manager->completeMultipartUpload($objectKey, $uploadId, $parts);
        $etag = trim($result['ETag'] ?? '', '"');
        $fileHash = $_POST['file_hash'] ?? '';
        $mimeType = $_POST['mime_type'] ?? 'application/octet-stream';
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $bucketName = $s3Manager->getBucket();
        $metadata = [
            'user_id' => $userId,
            'file_id' => $fileId,
            'original_name' => $fileName,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'upload_time' => date('Y-m-d H:i:s')
        ];
        $metadataJson = json_encode($metadata);
        $expireTime = date('Y-m-d H:i:s', strtotime('+3 days'));
        $sql = "INSERT INTO mok_file_archive (
            file_id, user_id, object_key, file_name, file_size, 
            file_hash, mime_type, file_extension, bucket_name, etag, 
            upload_method, upload_status, metadata, expire_time, upload_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, 1, ?, ?, NOW())";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param(
            'ssssisssssss',
            $fileId,
            $userId,
            $objectKey,
            $fileName,
            $fileSize,
            $fileHash,
            $mimeType,
            $extension,
            $bucketName,
            $etag,
            $metadataJson,
            $expireTime
        );

        if (!$stmt->execute()) {
            error_log("归档文件记录失败: " . $stmt->error);
        }
        $stmt->close();
        $periodDate = date('Y-m-01');
        $stmt = $conn->prepare("INSERT INTO mok_user_traffic (
            user_id, period_date, upload_bytes, upload_count, file_count, total_used_bytes
        ) VALUES (?, ?, ?, 1, 1, ?) 
        ON DUPLICATE KEY UPDATE 
            upload_bytes = upload_bytes + ?,
            upload_count = upload_count + 1,
            file_count = file_count + 1,
            total_used_bytes = total_used_bytes + ?");
        $stmt->bind_param('ssiiii', $userId, $periodDate, $fileSize, $fileSize, $fileSize, $fileSize);
        if (!$stmt->execute()) {
            error_log("更新流量表失败: " . $stmt->error);
        }
        $stmt->close();
        sendSuccessResponse([
            'file_id' => $fileId,
            'object_key' => $objectKey,
            'file_name' => $fileName,
            'file_size' => $fileSize,
            'etag' => $etag,
            'public_url' => $s3Manager->getPublicUrl($objectKey),
            'presigned_url' => $s3Manager->generatePresignedUrl($objectKey, '+1 hour')
        ]);
    } catch (Exception $e) {
        sendErrorResponse('完成分片上传失败: ' . $e->getMessage(), 500);
    }
}
function handleAbortMultipart(S3StorageManager $s3Manager)
{
    $objectKey = $_POST['object_key'] ?? '';
    $uploadId = $_POST['upload_id'] ?? '';
    if (!$objectKey || !$uploadId) {
        sendErrorResponse('缺少必要参数: object_key, upload_id', 400);
        return;
    }
    try {
        $success = $s3Manager->abortMultipartUpload($objectKey, $uploadId);
        sendSuccessResponse([
            'aborted' => $success,
            'object_key' => $objectKey,
            'upload_id' => $uploadId
        ]);
    } catch (Exception $e) {
        sendErrorResponse('取消分片上传失败: ' . $e->getMessage(), 500);
    }
}
function handleUpload(S3StorageManager $s3Manager)
{
    global $maxUploadSize;
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errorMsg = $_FILES['file']['error'] ?? '未上传文件';
        sendErrorResponse('文件上传失败: ' . getUploadErrorMessage($errorMsg), 400);
        return;
    }
    $file = $_FILES['file'];
    $fileSize = $file['size'];
    $sizeCheck = checkFileSize($fileSize, $maxUploadSize, 'upload');
    if ($sizeCheck !== null) {
        sendErrorResponse($sizeCheck, 413);
        return;
    }
    require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
    $conn->set_charset('utf8mb4');
    $userId = $_POST['user_id'] ?? $_POST['dfid'] ?? 'unknown';
    $targetType = $_POST['target_type'] ?? 'user';
    $targetId = $_POST['target_id'] ?? '';
    $customFileName = $_POST['file_name'] ?? '';
    $fileId = 'file_' . date('YmdHis') . '_' . uniqid();
    $originalName = $customFileName ?: $file['name'];
    $fileSize = $file['size'];
    $fileHash = hash_file('sha256', $file['tmp_name']);
    $mimeType = mime_content_type($file['tmp_name']) ?: 'application/octet-stream';
    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
    $datePath = date('Y/m/d');
    $objectKey = "uploads/{$datePath}/{$fileId}.{$extension}";
    $metadata = [
        'user_id' => $userId,
        'file_id' => $fileId,
        'original_name' => $originalName,
        'target_type' => $targetType,
        'target_id' => $targetId,
        'upload_time' => date('Y-m-d H:i:s')
    ];

    try {
        $result = $s3Manager->uploadFile(
            $file['tmp_name'],
            $objectKey,
            $metadata,
            52428800
        );
        $stmt = $conn->prepare("INSERT INTO mok_file_archive (
            file_id, user_id, object_key, file_name, file_size, 
            file_hash, mime_type, file_extension, bucket_name, etag, 
            upload_method, upload_status, metadata, upload_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())");

        $uploadMethod = $fileSize > 52428800 ? 2 : 1;
        $bucketName = $s3Manager->getBucket();
        $etag = trim($result['ETag'] ?? '', '"');
        $metadataJson = json_encode($metadata);

        $stmt->bind_param(
            'ssssisssssss',
            $fileId,
            $userId,
            $objectKey,
            $originalName,
            $fileSize,
            $fileHash,
            $mimeType,
            $extension,
            $bucketName,
            $etag,
            $uploadMethod,
            $metadataJson
        );

        if (!$stmt->execute()) {
            error_log("归档文件记录失败: " . $stmt->error);
        }
        $stmt->close();
        $periodDate = date('Y-m-01');
        $stmt = $conn->prepare("INSERT INTO mok_user_traffic (
            user_id, period_date, upload_bytes, upload_count, file_count, total_used_bytes
        ) VALUES (?, ?, ?, 1, 1, ?) 
        ON DUPLICATE KEY UPDATE 
            upload_bytes = upload_bytes + ?,
            upload_count = upload_count + 1,
            file_count = file_count + 1,
            total_used_bytes = total_used_bytes + ?");

        $stmt->bind_param('ssiiii', $userId, $periodDate, $fileSize, $fileSize, $fileSize, $fileSize);
        if (!$stmt->execute()) {
            error_log("更新流量表失败: " . $stmt->error);
        }
        $stmt->close();

        sendSuccessResponse([
            'file_id' => $fileId,
            'object_key' => $objectKey,
            'file_name' => $originalName,
            'file_size' => $fileSize,
            'bucket' => $bucketName,
            'etag' => $etag,
            'public_url' => $s3Manager->getPublicUrl($objectKey),
            'presigned_url' => $s3Manager->generatePresignedUrl($objectKey, '+1 hour')
        ]);
    } catch (Exception $e) {
        sendErrorResponse('上传失败: ' . $e->getMessage(), 500);
    }
}
function handleUploadFromUrl(S3StorageManager $s3Manager)
{
    $sourceUrl = $_POST['source_url'] ?? null;
    $userId = $_POST['user_id'] ?? $_POST['dfid'] ?? 'unknown';
    $targetType = $_POST['target_type'] ?? 'user';
    $targetId = $_POST['target_id'] ?? '';
    $customFileName = $_POST['file_name'] ?? '';
    if (!$sourceUrl) {
        sendErrorResponse('缺少 source_url 参数', 400);
        return;
    }
    $fileId = 'file_' . date('YmdHis') . '_' . uniqid();
    $originalName = $customFileName ?: basename(parse_url($sourceUrl, PHP_URL_PATH)) ?: 'file_from_url';
    $datePath = date('Y/m/d');
    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
    $objectKey = "uploads/{$datePath}/{$fileId}." . ($extension ?: 'bin');
    $metadata = [
        'user_id' => $userId,
        'file_id' => $fileId,
        'original_name' => $originalName,
        'source_url' => $sourceUrl,
        'target_type' => $targetType,
        'target_id' => $targetId
    ];
    require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
    $conn->set_charset('utf8mb4');
    try {
        $result = $s3Manager->uploadFromUrl($sourceUrl, $objectKey, $metadata);
        $ch = curl_init($sourceUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_exec($ch);
        $fileSize = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD) ?: 0;
        curl_close($ch);

        $fileHash = hash('sha256', $sourceUrl);
        $mimeType = 'application/octet-stream';
        $stmt = $conn->prepare("INSERT INTO mok_file_archive (
            file_id, user_id, object_key, file_name, file_size, 
            file_hash, mime_type, file_extension, bucket_name, etag, 
            upload_method, upload_status, metadata, upload_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, NOW())");

        $bucketName = $s3Manager->getBucket();
        $etag = trim($result['ETag'] ?? '', '"');
        $metadataJson = json_encode($metadata);

        $stmt->bind_param(
            'ssssisssssss',
            $fileId,
            $userId,
            $objectKey,
            $originalName,
            $fileSize,
            $fileHash,
            $mimeType,
            $extension,
            $bucketName,
            $etag,
            $metadataJson
        );
        $stmt->execute();
        $stmt->close();
        $periodDate = date('Y-m-01');
        $stmt = $conn->prepare("INSERT INTO mok_user_traffic (
            user_id, period_date, upload_bytes, upload_count, file_count, total_used_bytes
        ) VALUES (?, ?, ?, 1, 1, ?) 
        ON DUPLICATE KEY UPDATE 
            upload_bytes = upload_bytes + ?,
            upload_count = upload_count + 1,
            file_count = file_count + 1,
            total_used_bytes = total_used_bytes + ?");

        $stmt->bind_param('ssiiii', $userId, $periodDate, $fileSize, $fileSize, $fileSize, $fileSize);
        $stmt->execute();
        $stmt->close();

        sendSuccessResponse([
            'file_id' => $fileId,
            'object_key' => $objectKey,
            'file_name' => $originalName,
            'file_size' => $fileSize,
            'public_url' => $s3Manager->getPublicUrl($objectKey),
            'presigned_url' => $s3Manager->generatePresignedUrl($objectKey, '+1 hour')
        ]);
    } catch (Exception $e) {
        sendErrorResponse('从URL上传失败: ' . $e->getMessage(), 500);
    }
}
function handleGetDownloadUrl(S3StorageManager $s3Manager)
{
    $fileId = $_POST['file_id'] ?? $_GET['file_id'] ?? null;
    $userId = $_POST['user_id'] ?? $_POST['dfid'] ?? 'unknown';
    if (!$fileId) {
        sendErrorResponse('缺少 file_id 参数', 400);
        return;
    }
    global $q_suname;
    if ($userId !== $q_suname) {
        sendErrorResponse('您当前未登录', 414);
        return;
    }
    require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
    $conn->set_charset('utf8mb4');
    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("SELECT object_key, file_name, file_size, upload_status, expire_time FROM mok_file_archive WHERE file_id = ? FOR UPDATE");
        $stmt->bind_param('s', $fileId);
        $stmt->execute();
        $result = $stmt->get_result();
        $fileRecord = $result->fetch_assoc();
        $stmt->close();
        if (!$fileRecord) {
            $conn->rollback();
            sendErrorResponse('文件不存在', 404);
            return;
        }
        if ($fileRecord['upload_status'] == 3) {
            $conn->rollback();
            sendErrorResponse('文件已被删除', 404);
            return;
        }
        $expireTime = $fileRecord['expire_time'];
        $now = date('Y-m-d H:i:s');
        if ($expireTime && $expireTime < $now) {
            if ($fileRecord['upload_status'] == 1) {
                try {
                    $stmt2 = $conn->prepare("UPDATE mok_file_archive SET upload_status = 3, delete_time = NOW() WHERE file_id = ? AND upload_status = 1");
                    $stmt2->bind_param('s', $fileId);
                    $stmt2->execute();
                    if ($stmt2->affected_rows > 0) {
                        $s3Manager->deleteObject($fileRecord['object_key']);
                        $fileSize = (int)$fileRecord['file_size'];
                        if ($fileSize > 0) {
                            $periodDate = date('Y-m-01');
                            $stmt3 = $conn->prepare("UPDATE mok_user_traffic 
                                SET file_count = file_count - 1, 
                                    total_used_bytes = total_used_bytes - ? 
                                WHERE user_id = ? AND period_date = ?");
                            $stmt3->bind_param('iss', $fileSize, $userId, $periodDate);
                            $stmt3->execute();
                            $stmt3->close();
                        }
                    }
                    $stmt2->close();
                    
                    $conn->commit();
                    sendErrorResponse('文件已过期，已自动清理', 410);
                    return;
                    
                } catch (Exception $e) {
                    $conn->rollback();
                    error_log("删除过期文件失败: " . $e->getMessage());
                    sendErrorResponse('文件已过期，但清理失败: ' . $e->getMessage(), 410);
                    return;
                }
            } else {
                $conn->commit();
                sendErrorResponse('文件已过期，已自动清理', 410);
                return;
            }
        }
        $downloadUrl = $s3Manager->generatePresignedUrl($fileRecord['object_key'], '+1 hour');
        $stmt = $conn->prepare("UPDATE mok_file_archive SET download_count = download_count + 1, last_access_time = NOW() WHERE file_id = ?");
        $stmt->bind_param('s', $fileId);
        $stmt->execute();
        $stmt->close();
        if ($userId !== 'unknown') {
            $periodDate = date('Y-m-01');
            $fileSize = (int)($fileRecord['file_size'] ?? 0);
            $stmt = $conn->prepare("INSERT INTO mok_user_traffic (
                user_id, period_date, download_bytes, download_count
            ) VALUES (?, ?, ?, 1) 
            ON DUPLICATE KEY UPDATE 
                download_bytes = download_bytes + ?,
                download_count = download_count + 1");

            $stmt->bind_param('ssii', $userId, $periodDate, $fileSize, $fileSize);
            $stmt->execute();
            $stmt->close();
        }
        $conn->commit();
        sendSuccessResponse([
            'file_id' => $fileId,
            'file_name' => $fileRecord['file_name'],
            'file_size' => (int)$fileRecord['file_size'],
            'download_url' => $downloadUrl,
            'expires_in' => 3600,
            'expire_time' => $expireTime
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        sendErrorResponse('获取下载链接失败: ' . $e->getMessage(), 500);
    }
}
function handleDeleteObject(S3StorageManager $s3Manager)
{
    $objectKey = $_POST['object_key'] ?? $_GET['object_key'] ?? null;
    $fileId = $_POST['file_id'] ?? $_GET['file_id'] ?? null;
    if (!$objectKey && !$fileId) {
        sendErrorResponse('缺少 object_key 或 file_id 参数', 400);
        return;
    }
    require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
    $conn->set_charset('utf8mb4');
    try {
        if ($fileId && !$objectKey) {
            $stmt = $conn->prepare("SELECT object_key, file_size, user_id FROM mok_file_archive WHERE file_id = ? AND upload_status = 1");
            $stmt->bind_param('s', $fileId);
            $stmt->execute();
            $result = $stmt->get_result();
            $record = $result->fetch_assoc();
            $stmt->close();
            if (!$record) {
                sendErrorResponse('文件不存在或已被删除', 404);
                return;
            }
            $objectKey = $record['object_key'];
            $fileSize = (int)$record['file_size'];
            $userId = $record['user_id'];
        }
        if ($fileId) {
            $stmt = $conn->prepare("UPDATE mok_file_archive SET upload_status = 3, delete_time = NOW() WHERE file_id = ?");
            $stmt->bind_param('s', $fileId);
            $stmt->execute();
            $stmt->close();
            if (isset($userId) && isset($fileSize)) {
                $periodDate = date('Y-m-01');
                $stmt = $conn->prepare("UPDATE mok_user_traffic 
                    SET file_count = file_count - 1, 
                        total_used_bytes = total_used_bytes - ? 
                    WHERE user_id = ? AND period_date = ?");
                $stmt->bind_param('iss', $fileSize, $userId, $periodDate);
                $stmt->execute();
                $stmt->close();
            }
        }
        $s3Manager->deleteObject($objectKey);
        sendSuccessResponse([
            'object_key' => $objectKey,
            'file_id' => $fileId,
            'deleted' => true
        ]);
    } catch (Exception $e) {
        sendErrorResponse('删除失败: ' . $e->getMessage(), 500);
    }
}
function handlePresignedUrl(S3StorageManager $s3Manager)
{
    $objectKey = $_POST['object_key'] ?? $_GET['object_key'] ?? null;
    $expiry = $_POST['expiry'] ?? $_GET['expiry'] ?? '+1 hour';
    $metadata = $_POST['metadata'] ?? [];
    if (!$objectKey) {
        sendErrorResponse('缺少 object_key 参数', 400);
        return;
    }
    if (is_string($metadata)) {
        $metadata = json_decode($metadata, true) ?: [];
    }
    if (!empty($_POST['prefix'])) {
        $objectKey = rtrim($_POST['prefix'], '/') . '/' . ltrim($objectKey, '/');
    }
    try {
        $params = [];
        if (!empty($metadata)) {
            $params['Metadata'] = $metadata;
        }

        $url = $s3Manager->generatePresignedUploadUrl($objectKey, $expiry, $params);

        sendSuccessResponse([
            'object_key' => $objectKey,
            'bucket' => $s3Manager->getBucket(),
            'presigned_url' => $url,
            'expiry' => $expiry,
            'public_url' => $s3Manager->getPublicUrl($objectKey)
        ]);
    } catch (Exception $e) {
        sendErrorResponse('生成预签名URL失败: ' . $e->getMessage(), 500);
    }
}

function handleListObjects(S3StorageManager $s3Manager)
{
    $prefix = $_POST['prefix'] ?? $_GET['prefix'] ?? '';
    $limit = isset($_POST['limit']) ? (int)$_POST['limit'] : (isset($_GET['limit']) ? (int)$_GET['limit'] : 100);
    $onlyKeys = isset($_POST['only_keys']) ? filter_var($_POST['only_keys'], FILTER_VALIDATE_BOOLEAN) : false;

    try {
        $objects = $s3Manager->listObjects($prefix, $onlyKeys, $limit);

        sendSuccessResponse([
            'prefix' => $prefix,
            'count' => count($objects),
            'objects' => $objects
        ]);
    } catch (Exception $e) {
        sendErrorResponse('列出对象失败: ' . $e->getMessage(), 500);
    }
}

function sendSuccessResponse(array $data)
{
    echo json_encode([
        'success' => true,
        'data' => $data
    ]);
    exit();
}

function sendErrorResponse(string $message, int $code = 400)
{
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message
    ]);
    exit();
}

function getUploadErrorMessage($error)
{
    $messages = [
        UPLOAD_ERR_INI_SIZE => '文件大小超过 php.ini 限制',
        UPLOAD_ERR_FORM_SIZE => '文件大小超过表单限制',
        UPLOAD_ERR_PARTIAL => '文件只上传了一部分',
        UPLOAD_ERR_NO_FILE => '没有文件被上传',
        UPLOAD_ERR_NO_TMP_DIR => '找不到临时文件夹',
        UPLOAD_ERR_CANT_WRITE => '文件写入失败',
        UPLOAD_ERR_EXTENSION => 'PHP扩展阻止了文件上传',
    ];
    return $messages[$error] ?? '未知错误';
}