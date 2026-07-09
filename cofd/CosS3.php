<?php
use Aws\S3\S3Client;
use Aws\S3\MultipartUploader;
use Aws\Exception\AwsException;
use Aws\ResultInterface;
class S3StorageManager
{
    private S3Client $client;
    private string $bucket;
    private string $region;
    private string $endpoint;
    private array $defaultConfig = [
        'version' => 'latest',
        'use_path_style' => true,
        'suppress_php_deprecation_warning' => true,
        'verify_ssl' => true
    ];

    /**
     * 构造函数 - 初始化S3客户端
     *
     * @param array $config 配置参数
     * 必需参数:
     *   - bucket: string 存储桶名称
     *   - region: string 区域
     *   - endpoint: string Endpoint地址
     *   - access_key_id: string 访问密钥ID
     *   - access_key_secret: string 访问密钥Secret
     * 可选参数:
     *   - use_path_style: bool 是否使用路径风格端点，默认 true
     *   - verify_ssl: bool 是否验证SSL，默认 true
     *   - version: string API版本，默认 'latest'
     */
    public function __construct(array $config)
    {
        $requiredKeys = ['bucket', 'region', 'endpoint', 'access_key_id', 'access_key_secret'];
        foreach ($requiredKeys as $key) {
            if (!isset($config[$key])) {
                throw new InvalidArgumentException("缺少必需参数: {$key}");
            }
        }

        $this->bucket = $config['bucket'];
        $this->region = $config['region'];
        $this->endpoint = $config['endpoint'];

        $clientConfig = array_merge($this->defaultConfig, [
            'region' => $this->region,
            'endpoint' => $this->endpoint,
            'credentials' => [
                'key' => $config['access_key_id'],
                'secret' => $config['access_key_secret']
            ]
        ]);
        if (isset($config['use_path_style'])) {
            $clientConfig['use_path_style_endpoint'] = $config['use_path_style'];
        }

        if (isset($config['verify_ssl']) && $config['verify_ssl'] === false) {
            $clientConfig['http'] = ['verify' => false];
        }

        if (isset($config['version'])) {
            $clientConfig['version'] = $config['version'];
        }

        $this->client = new S3Client($clientConfig);
    }
    /**
     * 获取存储桶名称
     */
    public function getBucket(): string
    {
        return $this->bucket;
    }

    /**
     * 获取原始S3客户端实例
     */
    public function getClient(): S3Client
    {
        return $this->client;
    }

    /**
     * 检查对象是否存在
     */
    public function objectExists(string $objectKey): bool
    {
        return $this->getObjectMetadata($objectKey) !== null;
    }

    /**
     * 获取对象元数据
     */
    public function getObjectMetadata(string $objectKey): ?array
    {
        try {
            $result = $this->client->headObject([
                'Bucket' => $this->bucket,
                'Key' => $objectKey
            ]);
            return $result->toArray();
        } catch (AwsException $e) {
            if ($e->getAwsErrorCode() !== 'NotFound') {
            }
            return null;
        }
    }

    /**
     * 获取对象大小（字节）
     */
    public function getObjectSize(string $objectKey): ?int
    {
        $metadata = $this->getObjectMetadata($objectKey);
        return $metadata ? (int) $metadata['ContentLength'] : null;
    }

    /**
     * 获取对象的ETag
     */
    public function getObjectEtag(string $objectKey): ?string
    {
        $metadata = $this->getObjectMetadata($objectKey);
        return $metadata ? trim($metadata['ETag'], '"') : null;
    }

    /**
     * 获取对象的最后修改时间
     */
    public function getObjectLastModified(string $objectKey): ?\DateTimeInterface
    {
        $metadata = $this->getObjectMetadata($objectKey);
        return $metadata ? new \DateTime($metadata['LastModified']) : null;
    }

    /**
     * 生成预签名下载URL
     *
     * @param string $objectKey 对象键名
     * @param string|int $expiry 过期时间，如 '+1 hour' 或 3600（秒）
     * @param array $params 额外参数（如 ResponseContentDisposition）
     * @return string 预签名URL
     */
    public function generatePresignedUrl(string $objectKey, $expiry = '+1 hour', array $params = []): string
    {
        try {
            $commandParams = array_merge([
                'Bucket' => $this->bucket,
                'Key' => $objectKey
            ], $params);

            $command = $this->client->getCommand('GetObject', $commandParams);
            return (string) $this->client->createPresignedRequest($command, $expiry)->getUri();
        } catch (AwsException $e) {
            throw new \RuntimeException("生成预签名URL失败: " . $e->getMessage());
        }
    }

    /**
     * 直接下载对象内容
     *
     * @param string $objectKey 对象键名
     * @return string 文件内容
     */
    public function downloadObject(string $objectKey): string
    {
        try {
            $result = $this->client->getObject([
                'Bucket' => $this->bucket,
                'Key' => $objectKey
            ]);
            return (string) $result['Body'];
        } catch (AwsException $e) {
            throw new \RuntimeException("下载对象失败: " . $e->getMessage());
        }
    }

    /**
     * 下载对象到本地文件
     *
     * @param string $objectKey 对象键名
     * @param string $localPath 本地保存路径
     * @return int 写入的字节数
     */
    public function downloadObjectToFile(string $objectKey, string $localPath): int
    {
        try {
            $result = $this->client->getObject([
                'Bucket' => $this->bucket,
                'Key' => $objectKey,
                'SaveAs' => $localPath
            ]);
            return (int) $result['@metadata']['transferStats']['download_content_length'] ?? 0;
        } catch (AwsException $e) {
            throw new \RuntimeException("下载对象到文件失败: " . $e->getMessage());
        }
    }

    /**
     * 流式下载
     *
     * @param string $objectKey 对象键名
     * @param callable $callback 回调函数，接收数据块
     */
    public function downloadObjectStream(string $objectKey, callable $callback): void
    {
        try {
            $result = $this->client->getObject([
                'Bucket' => $this->bucket,
                'Key' => $objectKey
            ]);

            $stream = $result['Body'];
            while (!$stream->eof()) {
                $callback($stream->read(8192));
            }
        } catch (AwsException $e) {
            throw new \RuntimeException("流式下载失败: " . $e->getMessage());
        }
    }
    /**
     * 上传文件（小文件使用简单上传，大文件自动切换分片上传）
     *
     * @param string $localPath 本地文件路径
     * @param string $objectKey 对象键名（目标路径）
     * @param array $metadata 自定义元数据
     * @param int $multipartThreshold 分片上传阈值（字节），默认 50MB
     * @return ResultInterface
     */
    public function uploadFile(
        string $localPath,
        string $objectKey,
        array $metadata = [],
        int $multipartThreshold = 52428800 // 50MB
    ): ResultInterface {
        if (!file_exists($localPath)) {
            throw new \InvalidArgumentException("文件不存在: {$localPath}");
        }

        $fileSize = filesize($localPath);
        if ($fileSize === false) {
            throw new \RuntimeException("无法获取文件大小: {$localPath}");
        }

        $params = [
            'Bucket' => $this->bucket,
            'Key' => $objectKey,
            'SourceFile' => $localPath
        ];

        if (!empty($metadata)) {
            $params['Metadata'] = $metadata;
        }
        if ($fileSize > $multipartThreshold) {
            return $this->uploadFileMultipart($localPath, $objectKey, $metadata);
        }
        try {
            return $this->client->putObject($params);
        } catch (AwsException $e) {
            throw new \RuntimeException("上传文件失败: " . $e->getMessage());
        }
    }

    /**
     * 上传文件内容（字符串）
     *
     * @param string $content 文件内容
     * @param string $objectKey 对象键名
     * @param array $metadata 自定义元数据
     * @return ResultInterface
     */
    public function uploadContent(string $content, string $objectKey, array $metadata = []): ResultInterface
    {
        try {
            $params = [
                'Bucket' => $this->bucket,
                'Key' => $objectKey,
                'Body' => $content
            ];

            if (!empty($metadata)) {
                $params['Metadata'] = $metadata;
            }

            return $this->client->putObject($params);
        } catch (AwsException $e) {
            throw new \RuntimeException("上传内容失败: " . $e->getMessage());
        }
    }

    /**
     * 使用分片上传大文件
     *
     * @param string $localPath 本地文件路径
     * @param string $objectKey 对象键名
     * @param array $metadata 自定义元数据
     * @param int $partSize 分片大小，默认 20MB
     * @param int $concurrency 并发数，默认 3
     * @return ResultInterface
     */
    public function uploadFileMultipart(
        string $localPath,
        string $objectKey,
        array $metadata = [],
        int $partSize = 20971520, // 20MB
        int $concurrency = 3
    ): ResultInterface {
        if (!file_exists($localPath)) {
            throw new \InvalidArgumentException("文件不存在: {$localPath}");
        }

        try {
            $uploader = new MultipartUploader($this->client, $localPath, [
                'bucket' => $this->bucket,
                'key' => $objectKey,
                'part_size' => $partSize,
                'concurrency' => $concurrency,
                'metadata' => $metadata
            ]);

            return $uploader->upload();
        } catch (AwsException $e) {
            throw new \RuntimeException("分片上传失败: " . $e->getMessage());
        }
    }

    /**
     * 从URL上传文件到S3
     *
     * @param string $sourceUrl 源文件URL
     * @param string $objectKey 目标对象键名
     * @param array $metadata 自定义元数据
     * @return ResultInterface
     */
    public function uploadFromUrl(string $sourceUrl, string $objectKey, array $metadata = []): ResultInterface
    {
        $ch = curl_init($sourceUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $content = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($content === false || $httpCode !== 200) {
            throw new \RuntimeException("从URL获取文件失败: {$sourceUrl}, HTTP状态码: {$httpCode}");
        }

        return $this->uploadContent($content, $objectKey, $metadata);
    }

    /**
     * 复制对象
     *
     * @param string $sourceKey 源对象键名
     * @param string $destinationKey 目标对象键名
     * @param string|null $sourceBucket 源存储桶（默认当前存储桶）
     * @return ResultInterface
     */
    public function copyObject(string $sourceKey, string $destinationKey, ?string $sourceBucket = null): ResultInterface
    {
        $sourceBucket = $sourceBucket ?: $this->bucket;

        try {
            return $this->client->copyObject([
                'Bucket' => $this->bucket,
                'Key' => $destinationKey,
                'CopySource' => "{$sourceBucket}/{$sourceKey}"
            ]);
        } catch (AwsException $e) {
            throw new \RuntimeException("复制对象失败: " . $e->getMessage());
        }
    }

    /**
     * 移动对象（复制后删除源）
     *
     * @param string $sourceKey 源对象键名
     * @param string $destinationKey 目标对象键名
     * @param string|null $sourceBucket 源存储桶（默认当前存储桶）
     * @return bool
     */
    public function moveObject(string $sourceKey, string $destinationKey, ?string $sourceBucket = null): bool
    {
        $this->copyObject($sourceKey, $destinationKey, $sourceBucket);
        return $this->deleteObject($sourceKey);
    }

    /**
     * 删除单个对象
     *
     * @param string $objectKey 对象键名
     * @return bool
     */
    public function deleteObject(string $objectKey): bool
    {
        try {
            $this->client->deleteObject([
                'Bucket' => $this->bucket,
                'Key' => $objectKey
            ]);
            return true;
        } catch (AwsException $e) {
            return false;
        }
    }

    /**
     * 批量删除对象
     *
     * @param array $objectKeys 对象键名数组
     * @return array 返回删除结果 ['success' => [...], 'failed' => [...]]
     */
    public function deleteObjects(array $objectKeys): array
    {
        if (empty($objectKeys)) {
            return ['success' => [], 'failed' => []];
        }

        $result = ['success' => [], 'failed' => []];
        foreach (array_chunk($objectKeys, 1000) as $chunk) {
            try {
                $deleteResult = $this->client->deleteObjects([
                    'Bucket' => $this->bucket,
                    'Delete' => [
                        'Objects' => array_map(function ($key) {
                            return ['Key' => $key];
                        }, $chunk)
                    ]
                ]);

                if (isset($deleteResult['Deleted'])) {
                    foreach ($deleteResult['Deleted'] as $deleted) {
                        $result['success'][] = $deleted['Key'];
                    }
                }

                if (isset($deleteResult['Errors'])) {
                    foreach ($deleteResult['Errors'] as $error) {
                        $result['failed'][] = [
                            'key' => $error['Key'],
                            'code' => $error['Code'],
                            'message' => $error['Message']
                        ];
                    }
                }
            } catch (AwsException $e) {
                foreach ($chunk as $key) {
                    if ($this->deleteObject($key)) {
                        $result['success'][] = $key;
                    } else {
                        $result['failed'][] = ['key' => $key, 'message' => $e->getMessage()];
                    }
                }
            }
        }

        return $result;
    }

    /**
     * 删除存储桶内所有对象
     *
     * @param string $prefix 前缀过滤，只删除匹配前缀的对象
     * @return int 删除的对象数量
     */
    public function deleteAllObjects(string $prefix = ''): int
    {
        $count = 0;
        $keys = $this->listObjects($prefix, true);

        foreach (array_chunk($keys, 1000) as $chunk) {
            $this->deleteObjects($chunk);
            $count += count($chunk);
        }

        return $count;
    }

    /**
     * 列出对象
     *
     * @param string $prefix 前缀
     * @param bool $onlyKeys 仅返回键名列表
     * @param int $limit 限制数量（0表示全部）
     * @return array
     */
    public function listObjects(string $prefix = '', bool $onlyKeys = false, int $limit = 0): array
    {
        $objects = [];
        $params = [
            'Bucket' => $this->bucket,
            'Prefix' => $prefix
        ];

        try {
            do {
                $result = $this->client->listObjectsV2($params);

                if (!isset($result['Contents'])) {
                    break;
                }

                foreach ($result['Contents'] as $object) {
                    if ($onlyKeys) {
                        $objects[] = $object['Key'];
                    } else {
                        $objects[] = [
                            'key' => $object['Key'],
                            'size' => (int) $object['Size'],
                            'last_modified' => $object['LastModified'],
                            'etag' => trim($object['ETag'], '"')
                        ];
                    }

                    if ($limit > 0 && count($objects) >= $limit) {
                        break 2;
                    }
                }

                $params['ContinuationToken'] = $result['NextContinuationToken'] ?? null;
            } while ($params['ContinuationToken']);

            return $objects;
        } catch (AwsException $e) {
            throw new \RuntimeException("列出对象失败: " . $e->getMessage());
        }
    }

    /**
     * 获取存储桶使用情况
     *
     * @param string $prefix 前缀过滤
     * @return array ['total_size' => 总大小(字节), 'total_count' => 文件总数]
     */
    public function getBucketUsage(string $prefix = ''): array
    {
        $totalSize = 0;
        $totalCount = 0;
        $params = [
            'Bucket' => $this->bucket,
            'Prefix' => $prefix
        ];

        try {
            do {
                $result = $this->client->listObjectsV2($params);

                if (isset($result['Contents'])) {
                    foreach ($result['Contents'] as $object) {
                        $totalSize += (int) $object['Size'];
                        $totalCount++;
                    }
                }

                $params['ContinuationToken'] = $result['NextContinuationToken'] ?? null;
            } while ($params['ContinuationToken']);

            return [
                'total_size' => $totalSize,
                'total_count' => $totalCount
            ];
        } catch (AwsException $e) {
            throw new \RuntimeException("获取存储桶使用情况失败: " . $e->getMessage());
        }
    }
    /**
     * 生成预签名上传URL
     *
     * @param string $objectKey 对象键名
     * @param string|int $expiry 过期时间
     * @param array $params 额外参数
     * @return string
     */
    public function generatePresignedUploadUrl(string $objectKey, $expiry = '+1 hour', array $params = []): string
    {
        try {
            $commandParams = array_merge([
                'Bucket' => $this->bucket,
                'Key' => $objectKey
            ], $params);

            $command = $this->client->getCommand('PutObject', $commandParams);
            return (string) $this->client->createPresignedRequest($command, $expiry)->getUri();
        } catch (AwsException $e) {
            throw new \RuntimeException("生成预签名上传URL失败: " . $e->getMessage());
        }
    }

    /**
     * 获取对象的公共URL（需要存储桶公开）
     *
     * @param string $objectKey 对象键名
     * @return string
     */
    public function getPublicUrl(string $objectKey): string
    {
        return rtrim($this->endpoint, '/') . '/' . $this->bucket . '/' . ltrim($objectKey, '/');
    }

    /**
     * 设置对象元数据
     *
     * @param string $objectKey 对象键名
     * @param array $metadata 元数据
     * @return ResultInterface
     */
    public function setObjectMetadata(string $objectKey, array $metadata): ResultInterface
    {
        try {
            $head = $this->client->headObject([
                'Bucket' => $this->bucket,
                'Key' => $objectKey
            ])->toArray();
            return $this->client->copyObject([
                'Bucket' => $this->bucket,
                'Key' => $objectKey,
                'CopySource' => "{$this->bucket}/{$objectKey}",
                'Metadata' => array_merge($head['Metadata'] ?? [], $metadata),
                'MetadataDirective' => 'REPLACE'
            ]);
        } catch (AwsException $e) {
            throw new \RuntimeException("设置对象元数据失败: " . $e->getMessage());
        }
    }

    /**
     * 获取对象的访问控制列表
     *
     * @param string $objectKey 对象键名
     * @return array
     */
    public function getObjectAcl(string $objectKey): array
    {
        try {
            $result = $this->client->getObjectAcl([
                'Bucket' => $this->bucket,
                'Key' => $objectKey
            ]);
            return $result->toArray();
        } catch (AwsException $e) {
            throw new \RuntimeException("获取对象ACL失败: " . $e->getMessage());
        }
    }

    /**
     * 设置对象的访问控制列表（ACL）
     *
     * @param string $objectKey 对象键名
     * @param string $acl ACL策略 ('private', 'public-read', 'public-read-write', 'authenticated-read')
     * @return ResultInterface
     */
    public function setObjectAcl(string $objectKey, string $acl): ResultInterface
    {
        try {
            return $this->client->putObjectAcl([
                'Bucket' => $this->bucket,
                'Key' => $objectKey,
                'ACL' => $acl
            ]);
        } catch (AwsException $e) {
            throw new \RuntimeException("设置对象ACL失败: " . $e->getMessage());
        }
    }

    /**
     * 生成分片上传ID（用于断点续传）
     *
     * @param string $objectKey 对象键名
     * @param array $metadata 元数据
     * @return string 上传ID
     */
    public function initiateMultipartUpload(string $objectKey, array $metadata = []): string
    {
        try {
            $params = [
                'Bucket' => $this->bucket,
                'Key' => $objectKey
            ];

            if (!empty($metadata)) {
                $params['Metadata'] = $metadata;
            }

            $result = $this->client->createMultipartUpload($params);
            return $result['UploadId'];
        } catch (AwsException $e) {
            throw new \RuntimeException("初始化分片上传失败: " . $e->getMessage());
        }
    }

    /**
     * 上传分片
     *
     * @param string $objectKey 对象键名
     * @param string $uploadId 上传ID
     * @param int $partNumber 分片编号
     * @param string $content 分片内容
     * @return array ['ETag' => '...', 'PartNumber' => 1]
     */
    public function uploadPart(string $objectKey, string $uploadId, int $partNumber, string $content): array
    {
        try {
            $result = $this->client->uploadPart([
                'Bucket' => $this->bucket,
                'Key' => $objectKey,
                'UploadId' => $uploadId,
                'PartNumber' => $partNumber,
                'Body' => $content
            ]);

            return [
                'ETag' => trim($result['ETag'], '"'),
                'PartNumber' => $partNumber
            ];
        } catch (AwsException $e) {
            throw new \RuntimeException("上传分片失败: " . $e->getMessage());
        }
    }

    /**
     * 完成分片上传
     *
     * @param string $objectKey 对象键名
     * @param string $uploadId 上传ID
     * @param array $parts 分片列表 [['ETag' => '...', 'PartNumber' => 1], ...]
     * @return ResultInterface
     */
    public function completeMultipartUpload(string $objectKey, string $uploadId, array $parts): ResultInterface
    {
        try {
            return $this->client->completeMultipartUpload([
                'Bucket' => $this->bucket,
                'Key' => $objectKey,
                'UploadId' => $uploadId,
                'MultipartUpload' => [
                    'Parts' => $parts
                ]
            ]);
        } catch (AwsException $e) {
            throw new \RuntimeException("完成分片上传失败: " . $e->getMessage());
        }
    }

    /**
     * 取消分片上传
     *
     * @param string $objectKey 对象键名
     * @param string $uploadId 上传ID
     * @return bool
     */
    public function abortMultipartUpload(string $objectKey, string $uploadId): bool
    {
        try {
            $this->client->abortMultipartUpload([
                'Bucket' => $this->bucket,
                'Key' => $objectKey,
                'UploadId' => $uploadId
            ]);
            return true;
        } catch (AwsException $e) {
            return false;
        }
    }

    /**
     * 列出进行中的分片上传
     *
     * @param string $prefix 前缀过滤
     * @return array
     */
    public function listMultipartUploads(string $prefix = ''): array
    {
        try {
            $result = $this->client->listMultipartUploads([
                'Bucket' => $this->bucket,
                'Prefix' => $prefix
            ]);

            return $result['Uploads'] ?? [];
        } catch (AwsException $e) {
            throw new \RuntimeException("列出分片上传失败: " . $e->getMessage());
        }
    }

    /**
     * 列出已上传的分片
     *
     * @param string $objectKey 对象键名
     * @param string $uploadId 上传ID
     * @return array
     */
    public function listParts(string $objectKey, string $uploadId): array
    {
        try {
            $result = $this->client->listParts([
                'Bucket' => $this->bucket,
                'Key' => $objectKey,
                'UploadId' => $uploadId
            ]);

            return $result['Parts'] ?? [];
        } catch (AwsException $e) {
            throw new \RuntimeException("列出分片失败: " . $e->getMessage());
        }
    }

    /**
     * 生成签名URL，支持自定义HTTP方法
     *
     * @param string $method HTTP方法 (GET, PUT, DELETE, HEAD)
     * @param string $objectKey 对象键名
     * @param string|int $expiry 过期时间
     * @param array $params 额外参数
     * @return string
     */
    public function generatePresignedRequest(string $method, string $objectKey, $expiry = '+1 hour', array $params = []): string
    {
        $commandMap = [
            'GET' => 'GetObject',
            'PUT' => 'PutObject',
            'DELETE' => 'DeleteObject',
            'HEAD' => 'HeadObject'
        ];

        $commandName = $commandMap[strtoupper($method)] ?? 'GetObject';

        try {
            $commandParams = array_merge([
                'Bucket' => $this->bucket,
                'Key' => $objectKey
            ], $params);

            $command = $this->client->getCommand($commandName, $commandParams);
            return (string) $this->client->createPresignedRequest($command, $expiry)->getUri();
        } catch (AwsException $e) {
            throw new \RuntimeException("生成预签名请求失败: " . $e->getMessage());
        }
    }
}