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
    case 'list_group_files':
        handleListGroupFiles($s3Manager);
        break;
    case 'delete_group_file':
        handleDeleteGroupFile($s3Manager);
        break;
    case 'get_group_download_url':
        handleGetGroupDownloadUrl($s3Manager);
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
        if ($targetType === 'group' && !empty($targetId)) {
            $sql = "INSERT INTO mok_group_file (
                file_id, group_id, user_id, object_key, file_name, file_size,
                file_hash, mime_type, file_extension, bucket_name, etag,
                upload_method, upload_status, metadata, upload_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, 1, ?, NOW())";

            $stmt = $conn->prepare($sql);
            $stmt->bind_param(
                'sissssssssss',
                $fileId,
                $targetId,
                $userId,
                $objectKey,
                $fileName,
                $fileSize,
                $fileHash,
                $mimeType,
                $extension,
                $bucketName,
                $etag,
                $metadataJson
            );
            if (!$stmt->execute()) {
                error_log("群文件记录失败: " . $stmt->error);
            }
            $stmt->close();
            $stmt = $conn->prepare("
                INSERT INTO mok_group_log (
                    group_id, user_id, action, action_time, old_data, new_data, remark
                ) VALUES (?, ?, 'fileupload', NOW(), ?, ?, ?)
            ");
            $oldData = ['uploading' => true];
            $newData = [
                'file_id' => $fileId,
                'file_name' => $fileName,
                'file_size' => $fileSize,
                'object_key' => $objectKey
            ];
            $remark = '上传群文件: ' . $fileName;
            $j1 = json_encode($oldData, JSON_UNESCAPED_UNICODE);
            $j2 = json_encode($newData, JSON_UNESCAPED_UNICODE);
            $stmt->bind_param(
                'issss',
                $targetId,
                $userId,
                $j1,
                $j2,
                $remark
            );
            if (!$stmt->execute()) {
                error_log("群文件上传日志写入失败: " . $stmt->error);
            }
            $stmt->close();
        }
        $periodDate = date('Y-m-01');
        $stmt = $conn->prepare("
            INSERT INTO mok_user_traffic (
                user_id, period_date, upload_bytes, upload_count, file_count, total_used_bytes
            ) VALUES (?, ?, ?, 1, 1, ?) 
            ON DUPLICATE KEY UPDATE 
                upload_bytes = upload_bytes + ?,
                upload_count = upload_count + 1,
                file_count = file_count + 1,
                total_used_bytes = total_used_bytes + ?
        ");
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
            'presigned_url' => $s3Manager->generatePresignedUrl($objectKey, '+1 hour'),
            'target_type' => $targetType,
            'target_id' => $targetId
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
function handleListGroupFiles(S3StorageManager $s3Manager)
{
    $groupId = (int)($_POST['group_id'] ?? $_GET['group_id'] ?? 0);
    $page = (int)($_POST['page'] ?? $_GET['page'] ?? 1);
    $pageSize = (int)($_POST['page_size'] ?? $_GET['page_size'] ?? 20);
    $userId = $_POST['user_id'] ?? $_POST['dfid'] ?? 'unknown';
    if ($groupId <= 0) {
        sendErrorResponse('缺少参数', 400);
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
        $stmt = $conn->prepare("SELECT 1 FROM mok_group_member WHERE group_id = ? AND user_id = ? AND status = 1");
        $stmt->bind_param('is', $groupId, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            sendErrorResponse('您不是该群成员，无法查看文件', 403);
            return;
        }
        $stmt->close();
        $countStmt = $conn->prepare("SELECT COUNT(*) as total FROM mok_group_file WHERE group_id = ? AND upload_status = 1");
        $countStmt->bind_param('i', $groupId);
        $countStmt->execute();
        $countResult = $countStmt->get_result();
        $totalRow = $countResult->fetch_assoc();
        $total = $totalRow['total'] ?? 0;
        $countStmt->close();
        $offset = ($page - 1) * $pageSize;
        $stmt = $conn->prepare("
            SELECT 
                g.file_id,
                g.file_name,
                g.file_size,
                g.upload_time,
                g.download_count,
                g.metadata,
                u.uname as uploader_name,
                u.id as uploader_id
            FROM mok_group_file g
            LEFT JOIN mok_user u ON g.user_id = u.id
            WHERE g.group_id = ? AND g.upload_status = 1
            ORDER BY g.upload_time DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->bind_param('iii', $groupId, $pageSize, $offset);
        $stmt->execute();
        $result = $stmt->get_result();

        $files = [];
        while ($row = $result->fetch_assoc()) {
            $files[] = [
                'file_id' => $row['file_id'],
                'file_name' => $row['file_name'],
                'file_size' => (int)$row['file_size'],
                'upload_time' => $row['upload_time'],
                'download_count' => (int)$row['download_count'],
                'uploader_id' => $row['uploader_id'],
                'uploader_name' => $row['uploader_name'] ?: $row['uploader_id'] ?: '未知用户'
            ];
        }
        $stmt->close();

        sendSuccessResponse([
            'files' => $files,
            'total' => $total,
            'page' => $page,
            'page_size' => $pageSize,
            'total_pages' => ceil($total / $pageSize)
        ]);
    } catch (Exception $e) {
        sendErrorResponse('获取文件列表失败: ' . $e->getMessage(), 500);
    }
}
function handleDeleteGroupFile(S3StorageManager $s3Manager)
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
        $stmt = $conn->prepare("
            SELECT g.file_id, g.object_key, g.file_size, g.group_id, g.user_id
            FROM mok_group_file g
            WHERE g.file_id = ? AND g.upload_status = 1
            FOR UPDATE
        ");
        $stmt->bind_param('s', $fileId);
        $stmt->execute();
        $result = $stmt->get_result();
        $fileRecord = $result->fetch_assoc();
        $stmt->close();
        if (!$fileRecord) {
            $conn->rollback();
            sendErrorResponse('文件不存在或已被删除', 404);
            return;
        }
        $isUploader = ($fileRecord['user_id'] === $userId);
        $stmt = $conn->prepare("SELECT owner_id FROM mok_group_chat WHERE id = ?");
        $stmt->bind_param('i', $fileRecord['group_id']);
        $stmt->execute();
        $groupResult = $stmt->get_result();
        $groupRow = $groupResult->fetch_assoc();
        $stmt->close();
        $isGroupOwner = $groupRow && $groupRow['owner_id'] === $userId;
        $stmt = $conn->prepare("SELECT is_admin FROM mok_group_member WHERE group_id = ? AND user_id = ? AND status = 1");
        $stmt->bind_param('is', $fileRecord['group_id'], $userId);
        $stmt->execute();
        $memberResult = $stmt->get_result();
        $memberRow = $memberResult->fetch_assoc();
        $stmt->close();
        $isAdmin = $memberRow && (int)$memberRow['is_admin'] === 1;
        if (!$isUploader && !$isGroupOwner && !$isAdmin) {
            $conn->rollback();
            sendErrorResponse('您没有权限删除此文件', 403);
            return;
        }
        $stmt = $conn->prepare("
            UPDATE mok_group_file 
            SET upload_status = 3, delete_time = NOW() 
            WHERE file_id = ?
        ");
        $stmt->bind_param('s', $fileId);
        $stmt->execute();
        $stmt->close();
        try {
            $s3Manager->deleteObject($fileRecord['object_key']);
        } catch (Exception $e) {
            error_log("S3删除文件失败: " . $e->getMessage() . ", object_key: " . $fileRecord['object_key']);
        }
        $fileSize = (int)$fileRecord['file_size'];
        if ($fileSize > 0) {
            $periodDate = date('Y-m-01');
            $stmt = $conn->prepare("
                UPDATE mok_user_traffic 
                SET file_count = file_count - 1, 
                    total_used_bytes = total_used_bytes - ? 
                WHERE user_id = ? AND period_date = ?
            ");
            $stmt->bind_param('iss', $fileSize, $fileRecord['user_id'], $periodDate);
            $stmt->execute();
            $stmt->close();
        }

        $conn->commit();

        sendSuccessResponse([
            'file_id' => $fileId,
            'deleted' => true,
            'message' => '文件已删除'
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        sendErrorResponse('删除文件失败: ' . $e->getMessage(), 500);
    }
}
function handleGetGroupDownloadUrl(S3StorageManager $s3Manager)
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
        $stmt = $conn->prepare("
            SELECT g.file_id, g.object_key, g.file_name, g.file_size, g.group_id, g.upload_status
            FROM mok_group_file g
            WHERE g.file_id = ? FOR UPDATE
        ");
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
        $stmt = $conn->prepare("SELECT 1 FROM mok_group_member WHERE group_id = ? AND user_id = ? AND status = 1");
        $stmt->bind_param('is', $fileRecord['group_id'], $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            $conn->rollback();
            sendErrorResponse('您不是该群成员，无法下载', 403);
            return;
        }
        $stmt->close();
        $downloadUrl = $s3Manager->generatePresignedUrl($fileRecord['object_key'], '+1 hour');
        $stmt = $conn->prepare("
            UPDATE mok_group_file 
            SET download_count = download_count + 1, last_access_time = NOW() 
            WHERE file_id = ?
        ");
        $stmt->bind_param('s', $fileId);
        $stmt->execute();
        $stmt->close();
        $periodDate = date('Y-m-01');
        $fileSize = (int)$fileRecord['file_size'];
        $stmt = $conn->prepare("
            INSERT INTO mok_user_traffic (
                user_id, period_date, download_bytes, download_count
            ) VALUES (?, ?, ?, 1) 
            ON DUPLICATE KEY UPDATE 
                download_bytes = download_bytes + ?,
                download_count = download_count + 1
        ");
        $stmt->bind_param('ssii', $userId, $periodDate, $fileSize, $fileSize);
        $stmt->execute();
        $stmt->close();

        $conn->commit();

        sendSuccessResponse([
            'file_id' => $fileId,
            'file_name' => $fileRecord['file_name'],
            'file_size' => (int)$fileRecord['file_size'],
            'download_url' => $downloadUrl,
            'expires_in' => 3600
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        sendErrorResponse('获取下载链接失败: ' . $e->getMessage(), 500);
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
