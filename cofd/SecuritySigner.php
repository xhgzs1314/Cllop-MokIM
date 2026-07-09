<?php
require_once($_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php');

use Octha\Obfuscator\Factory;

/**
 * 安全签名器 - 集成签名验证与CSRF保护 + Header加密解密
 * 性能偏弱,不推荐所有接口使用,建议只在核心接口中使用
 * Session无法在分布式环境下使用，推荐将Session换成Redis
 */
class SecuritySigner
{
    private static $instance = null;
    private $dynamicSecret;
    private $dynamicSalt;
    private $secretExpire;
    private $allowedDomains;
    private $algorithm;
    private $csrfTokenLifetime = 120;
    private $deviceFingerprint;
    private const HEADER_ENCRYPT_SALT = 'yhmolk_header_encrypt_v1';
    private const PROTOCOL_VERSION = 1;
    private const AES_GCM_TAG_LENGTH = 16;
    private $supportedAlgorithms = [
        'hmac_sha256' => 'sha256',
        'hmac_sha384' => 'sha384',
        'hmac_sha512' => 'sha512',
    ];

    private function __construct()
    {
        $this->loadOrGenerateSecrets();
        $this->cleanupExpiredNonces();
        $this->deviceFingerprint = $this->generateDeviceFingerprint();
    }
    public function getEncryptKey()
    {
        return hash('sha256', $this->dynamicSecret . self::HEADER_ENCRYPT_SALT);
    }
    private static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public static function instance_run()
    {
        session_start();
        return self::getInstance();
    }

    private function loadOrGenerateSecrets()
    {
        if (isset($_SESSION['dynamic_secret']) && isset($_SESSION['secret_expire']) && $_SESSION['secret_expire'] > time()) {
            $this->dynamicSecret = $_SESSION['dynamic_secret'];
            $this->dynamicSalt = $_SESSION['dynamic_salt'];
            $this->secretExpire = $_SESSION['secret_expire'];
            $this->allowedDomains = $_SESSION['allowed_domains'] ?? [];
            $this->algorithm = $_SESSION['algorithm'] ?? 'hmac_sha256';
            $this->csrfTokenLifetime = $_SESSION['csrf_lifetime'] ?? 30;
        } else {
            $this->regenerateSecrets();
        }
    }

    private function regenerateSecrets()
    {
        $this->dynamicSecret = bin2hex(random_bytes(32));
        $this->dynamicSalt = bin2hex(random_bytes(8));
        $this->secretExpire = time() + 90;
        $algoKeys = array_keys($this->supportedAlgorithms);
        $randomIndex = mt_rand(0, count($algoKeys) - 1);
        $this->algorithm = $algoKeys[$randomIndex];
        $currentDomain = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost';
        $this->allowedDomains = [$currentDomain];
        if (strpos($currentDomain, 'www.') === 0) {
            $this->allowedDomains[] = substr($currentDomain, 4);
        } else {
            $this->allowedDomains[] = 'www.' . $currentDomain;
        }

        $_SESSION['dynamic_secret'] = $this->dynamicSecret;
        $_SESSION['dynamic_salt'] = $this->dynamicSalt;
        $_SESSION['secret_expire'] = $this->secretExpire;
        $_SESSION['allowed_domains'] = $this->allowedDomains;
        $_SESSION['algorithm'] = $this->algorithm;
        $_SESSION['csrf_lifetime'] = $this->csrfTokenLifetime;
    }

    private function cleanupExpiredNonces()
    {
        if (!isset($_SESSION['used_nonces'])) {
            $_SESSION['used_nonces'] = [];
        }

        $now = time();
        foreach ($_SESSION['used_nonces'] as $key => $expireTime) {
            if ($expireTime < $now) {
                unset($_SESSION['used_nonces'][$key]);
            }
        }
    }

    private function storeNonce($nonce, $ttl = 300)
    {
        $nonceKey = md5($nonce);
        $_SESSION['used_nonces'][$nonceKey] = time() + $ttl;
    }

    private function isNonceUsed($nonce)
    {
        $nonceKey = md5($nonce);
        return isset($_SESSION['used_nonces'][$nonceKey]);
    }

    private function getClientIP()
    {
        $ipHeaders = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        foreach ($ipHeaders as $header) {
            if (!empty($_SERVER[$header])) {
                $ips = explode(',', $_SERVER[$header]);
                $ip = trim($ips[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return '0.0.0.0';
    }

    private function getDeviceSessionKey($deviceCredential)
    {
        return 'device_session_' . md5($deviceCredential);
    }

    private function generateDeviceFingerprint()
    {
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $ip = $this->getClientIP();
        $acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
        $acceptEncoding = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '';
        return md5($userAgent . $ip . $acceptLanguage . $acceptEncoding);
    }

    private function generateRangeCode($timeSlot = null)
    {
        if ($timeSlot === null) {
            $currentTime = time();
            $timeSlot = floor($currentTime / $this->csrfTokenLifetime);
        }
        return chr(65 + ($timeSlot % 26));
    }

    private function getRangeCodeForTimeSlot($timeSlot)
    {
        return chr(65 + ($timeSlot % 26));
    }

    private function getTimeSlotFromRangeCode($rangeCode)
    {
        $currentTime = time();
        $currentTimeSlot = floor($currentTime / $this->csrfTokenLifetime);

        $offset = ord($rangeCode) - 65;
        $possibleSlots = [$currentTimeSlot, $currentTimeSlot - 1];
        foreach ($possibleSlots as $slot) {
            if (($slot % 26) == $offset) {
                return $slot;
            }
        }

        return null;
    }

    private function generateCoreTokenForTimeSlot($timeSlot)
    {
        $tokenData = $this->deviceFingerprint . $timeSlot . $this->dynamicSecret;
        return hash_hmac('sha256', $tokenData, $this->dynamicSecret);
    }

    public function generateCsrfToken()
    {
        $currentTime = time();
        $timeSlot = floor($currentTime / $this->csrfTokenLifetime);
        $coreToken = $this->generateCoreTokenForTimeSlot($timeSlot);
        $rangeCode = $this->generateRangeCode($timeSlot);
        $token = $coreToken . $rangeCode;
        return $token;
    }

    public function validateCsrfToken($token)
    {
        if (empty($token) || strlen($token) < 2) {
            return false;
        }
        $rangeCode = substr($token, -1);
        $coreToken = substr($token, 0, -1);
        $currentTime = time();
        $currentTimeSlot = floor($currentTime / $this->csrfTokenLifetime);
        $currentRangeCode = $this->getRangeCodeForTimeSlot($currentTimeSlot);
        $previousRangeCode = $this->getRangeCodeForTimeSlot($currentTimeSlot - 1);
        if ($rangeCode !== $currentRangeCode && $rangeCode !== $previousRangeCode) {
            return false;
        }
        $timeSlot = $this->getTimeSlotFromRangeCode($rangeCode);
        if ($timeSlot === null) {
            return false;
        }
        $expectedCoreToken = $this->generateCoreTokenForTimeSlot($timeSlot);
        return hash_equals($expectedCoreToken, $coreToken);
    }

    public function verifyCsrfRequest($inputSource = 'auto', $paramName = 'csrf_token')
    {
        $token = null;

        switch ($inputSource) {
            case 'post':
                $token = $_POST[$paramName] ?? null;
                break;
            case 'get':
                $token = $_GET[$paramName] ?? null;
                break;
            case 'header':
                $headers = getallheaders();
                $token = $headers['X-CSRF-Token'] ?? $headers['x-csrf-token'] ?? null;
                break;
            case 'auto':
            default:
                $token = $_POST[$paramName] ?? null;
                if (!$token) {
                    $headers = getallheaders();
                    $token = $headers['X-CSRF-Token'] ?? $headers['x-csrf-token'] ?? null;
                }
                if (!$token) {
                    $token = $_GET[$paramName] ?? null;
                }
                break;
        }

        return $this->validateCsrfToken($token);
    }

    public function getCsrfFormField($paramName = 'csrf_token')
    {
        $token = $this->generateCsrfToken();
        return '<input type="hidden" name="' . htmlspecialchars($paramName) . '" value="' . htmlspecialchars($token) . '">';
    }

    public function getCsrfToken()
    {
        return $this->generateCsrfToken();
    }

    public function setCsrfLifetime($lifetime)
    {
        $this->csrfTokenLifetime = (int)$lifetime;
        $_SESSION['csrf_lifetime'] = $this->csrfTokenLifetime;
        return $this;
    }

    public function getCsrfInfo()
    {
        $currentTime = time();
        $timeSlot = floor($currentTime / $this->csrfTokenLifetime);
        return [
            'lifetime' => $this->csrfTokenLifetime,
            'current_time_slot' => $timeSlot,
            'current_range_code' => $this->getRangeCodeForTimeSlot($timeSlot),
            'previous_range_code' => $this->getRangeCodeForTimeSlot($timeSlot - 1),
            'device_fingerprint' => $this->deviceFingerprint
        ];
    }
    private function deriveEncryptionKey()
    {
        return hash('sha256', $this->dynamicSecret . self::HEADER_ENCRYPT_SALT, true);
    }
    private function decryptAndRestoreHeaders()
    {
        $encryptedPayload = $_SERVER['HTTP_X_SECURE_PAYLOAD'] ?? '';
        $protocolVersion = $_SERVER['HTTP_X_PROTOCOL_VERSION'] ?? '';

        if (empty($encryptedPayload)) {
            return ['success' => false, 'error' => 'MISSING_ENCRYPTED_PAYLOAD', 'code' => 'HE001'];
        }

        if ($protocolVersion != self::PROTOCOL_VERSION) {
            return ['success' => false, 'error' => 'PROTOCOL_VERSION_MISMATCH', 'code' => 'HE002'];
        }
        try {
            $combined = base64_decode($encryptedPayload);
            if ($combined === false) {
                return ['success' => false, 'error' => 'INVALID_BASE64_ENCODING', 'code' => 'HE003'];
            }
            if (strlen($combined) < 12) {
                return ['success' => false, 'error' => 'PAYLOAD_TOO_SHORT', 'code' => 'HE004'];
            }
            $iv = substr($combined, 0, 12);
            $ciphertext = substr($combined, 12);
            $key = $this->deriveEncryptionKey(); 
            $tagLength = 16;
            if (strlen($ciphertext) < $tagLength) {
                return ['success' => false, 'error' => 'CIPHERTEXT_TOO_SHORT', 'code' => 'HE009'];
            }
            $tag = substr($ciphertext, -$tagLength);
            $ciphertextWithoutTag = substr($ciphertext, 0, -$tagLength);
            $decrypted = openssl_decrypt(
                $ciphertextWithoutTag,
                'aes-256-gcm',
                $key,
                OPENSSL_RAW_DATA,
                $iv,
                $tag
            );
            if ($decrypted === false) {
                return ['success' => false, 'error' => 'HEADER_DECRYPT_FAILED', 'code' => 'HE005'];
            }
            $payload = json_decode($decrypted, true);
            if ($payload === null || !isset($payload['headers']) || !isset($payload['meta'])) {
                return ['success' => false, 'error' => 'INVALID_PAYLOAD_STRUCTURE', 'code' => 'HE006'];
            }
            if (($payload['version'] ?? 0) != self::PROTOCOL_VERSION) {
                return ['success' => false, 'error' => 'PAYLOAD_VERSION_MISMATCH', 'code' => 'HE007'];
            }
            $restoredHeaders = $this->restoreHeaders(
                $payload['headers'],
                $payload['meta']
            );
            foreach ($restoredHeaders as $key => $value) {
                $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $key));
                $_SERVER[$serverKey] = $value;
            }

            if (isset($payload['meta']['userHeaders'])) {
                foreach ($payload['meta']['userHeaders'] as $key => $value) {
                    $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $key));
                    if (!isset($_SERVER[$serverKey])) {
                        $_SERVER[$serverKey] = $value;
                    }
                }
            }

            return [
                'success' => true,
                'headers' => $restoredHeaders,
                'meta' => $payload['meta']
            ];
        } catch (Exception $e) {
            return ['success' => false, 'error' => 'DECRYPTION_EXCEPTION: ' . $e->getMessage(), 'code' => 'HE008'];
        }
    }
    private function restoreHeaders($obfuscatedHeaders, $meta)
    {
        $restored = [];
        $fieldMap = $meta['fieldMap'] ?? [];
        $shuffleOrder = $meta['shuffleOrder'] ?? [];
        $originalKeys = $meta['originalKeys'] ?? [];
        $reverseMap = [];
        foreach ($fieldMap as $newKey => $originalKey) {
            $reverseMap[$newKey] = $originalKey;
        }
        $values = [];
        $keyOrder = array_keys($obfuscatedHeaders);
        foreach ($keyOrder as $key) {
            if (isset($obfuscatedHeaders[$key])) {
                $values[] = $obfuscatedHeaders[$key];
            }
        }
        $restoredValues = $values;
        if (!empty($shuffleOrder)) {
            $reversedOrder = array_reverse($shuffleOrder);
            foreach ($reversedOrder as $swap) {
                $from = $swap['from'];
                $to = $swap['to'];
                $temp = $restoredValues[$from];
                $restoredValues[$from] = $restoredValues[$to];
                $restoredValues[$to] = $temp;
            }
        }
        foreach ($originalKeys as $index => $key) {
            if (isset($restoredValues[$index])) {
                $restored[$key] = $restoredValues[$index];
            }
        }

        return $restored;
    }
    private function verifyDeviceCredential()
    {
        $deviceCredential = $_SERVER['HTTP_X_DEVICE_CREDENTIAL'] ?? '';
        $deviceTimestamp = $_SERVER['HTTP_X_DEVICE_TIMESTAMP'] ?? '';
        $deviceExpires = $_SERVER['HTTP_X_DEVICE_EXPIRES'] ?? '';
        $deviceFingerprint = $_SERVER['HTTP_X_DEVICE_FINGERPRINT'] ?? '';
        if (empty($deviceCredential)) {
            return ['valid' => false, 'error' => 'MISSING_DEVICE_CREDENTIAL', 'code' => 'DC001'];
        }
        if (empty($deviceTimestamp)) {
            return ['valid' => false, 'error' => 'MISSING_DEVICE_TIMESTAMP', 'code' => 'DC002'];
        }
        if (empty($deviceExpires)) {
            return ['valid' => false, 'error' => 'MISSING_DEVICE_EXPIRES', 'code' => 'DC003'];
        }
        if (!is_numeric($deviceTimestamp) || !is_numeric($deviceExpires)) {
            return ['valid' => false, 'error' => 'INVALID_DEVICE_TIMESTAMP_FORMAT', 'code' => 'DC004'];
        }
        $deviceTimestampInt = (int)$deviceTimestamp;
        $deviceExpiresInt = (int)$deviceExpires;
        $currentTime = time() * 1000;
        if ($currentTime > $deviceExpiresInt) {
            return ['valid' => false, 'error' => 'DEVICE_CREDENTIAL_EXPIRED', 'code' => 'DC005'];
        }

        $timeDiff = abs($currentTime - $deviceTimestampInt);
        if ($timeDiff > 600000) {
            return ['valid' => false, 'error' => 'DEVICE_TIMESTAMP_TOO_OLD', 'code' => 'DC006', 'diff' => $timeDiff];
        }

        $sessionKey = $this->getDeviceSessionKey($deviceCredential);
        $clientIP = $this->getClientIP();

        if (isset($_SESSION[$sessionKey])) {
            $sessionData = $_SESSION[$sessionKey];
            if ($sessionData['ip'] !== $clientIP && $sessionData['last_seen'] > time() - 60) {
                if ($sessionData['last_seen'] > time() - 10) {
                    return ['valid' => false, 'error' => 'DEVICE_IP_MISMATCH', 'code' => 'DC007'];
                }
            }
            $_SESSION[$sessionKey] = [
                'ip' => $clientIP,
                'last_seen' => time(),
                'fingerprint' => $deviceFingerprint,
                'first_seen' => $sessionData['first_seen'] ?? time()
            ];
        } else {
            $_SESSION[$sessionKey] = [
                'ip' => $clientIP,
                'last_seen' => time(),
                'fingerprint' => $deviceFingerprint,
                'first_seen' => time()
            ];
        }

        $rateKey = 'device_rate_' . md5($deviceCredential);
        $currentSecond = time();
        if (!isset($_SESSION[$rateKey])) {
            $_SESSION[$rateKey] = ['count' => 1, 'reset_at' => $currentSecond + 60];
        } else {
            $rateData = $_SESSION[$rateKey];
            if ($rateData['reset_at'] < $currentSecond) {
                $_SESSION[$rateKey] = ['count' => 1, 'reset_at' => $currentSecond + 60];
            } else {
                $rateData['count']++;
                $_SESSION[$rateKey] = $rateData;
                if ($rateData['count'] > 60) {
                    return ['valid' => false, 'error' => 'DEVICE_RATE_LIMIT_EXCEEDED', 'code' => 'DC008'];
                }
            }
        }

        return ['valid' => true, 'error' => null, 'code' => 'DC000'];
    }

    public function getSignerCode()
    {
        $signFuncCode = $this->generateAlgorithmCode();
        return $this->obfuscateCode($signFuncCode);
    }

    private function generateAlgorithmCode()
    {
        $algoHeader = $this->algorithm;
        switch ($this->algorithm) {
            case 'hmac_sha384':
                $code = $this->generateHmacCode('SHA-384', $algoHeader);
                break;
            case 'hmac_sha512':
                $code = $this->generateHmacCode('SHA-512', $algoHeader);
                break;
            case 'hmac_sha256':
                $code = $this->generateHmacCode('SHA-256', $algoHeader);
                break;
            default:
                $code = $this->generateHmacCode('SHA-256', $algoHeader);
                break;
        }
        return $code;
    }

    private function generateHmacCode($hashAlgorithm, $algoHeader)
    {
        $secret = addslashes($this->dynamicSecret);
        $salt = addslashes($this->dynamicSalt);

        return '
(function() {
    const _s = "' . $secret . '";
    const _salt = "' . $salt . '";
    const _algo = "' . $hashAlgorithm . '";
    const _algoHeader = "' . $algoHeader . '";
    
    return async function(p, extraHeaders = {}) {
        const _k = Object.keys(p || {}).sort();
        const _str = _k.map(k => k + "=" + encodeURIComponent(p[k])).join("&") + _salt;
        const _key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(_s),
            { name: "HMAC", hash: _algo },
            false,
            ["sign"]
        );
        const _signature = await crypto.subtle.sign(
            "HMAC",
            _key,
            new TextEncoder().encode(_str)
        );
        const _sig = Array.from(new Uint8Array(_signature))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
        return {
            signature: _sig,
            algorithm: _algoHeader
        };
    };
})()';
    }

    private function obfuscateCode($code)
    {
        try {
            $factory = new Factory($code, false);
            $factory->addDomain($this->allowedDomains);
            $factory->setExpiration($this->secretExpire);
            return $factory->obfuscate();
        } catch (\Exception $e) {
            return $this->basicLock($code);
        }
    }

    private function basicLock($code)
    {
        $domainCheck = '';
        if (!empty($this->allowedDomains)) {
            $domainConditions = array_map(function ($domain) {
                return "window.location.hostname==='" . addslashes($domain) . "'";
            }, $this->allowedDomains);
            $domainCheck = 'if(' . implode('||', $domainConditions) . '){';
        }

        $timeCheck = 'if((Math.round(+new Date()/1000))<' . $this->secretExpire . '){';

        $locked = $domainCheck . $timeCheck . $code . '}else{throw new Error("Expired")};';
        if ($domainCheck) $locked .= '}else{throw new Error("Invalid domain");};';

        return $locked;
    }
    public function verifyRequest($data = null, $verifyCsrf = false, $csrfParam = 'csrf_token')
    {
        if (empty($this->dynamicSecret) || $this->secretExpire < time()) {
            return [
                'valid' => false,
                'error' => 'SESSION_EXPIRED',
                'code' => 'VS001',
                'message' => '签名会话已过期，请刷新页面重试'
            ];
        }
        $decryptResult = $this->decryptAndRestoreHeaders();
        if (!$decryptResult['success']) {
            return [
                'valid' => false,
                'error' => $decryptResult['error'],
                'code' => $decryptResult['code'],
                'message' => 'Header解密失败'
            ];
        }
        $deviceVerify = $this->verifyDeviceCredential();
        if (!$deviceVerify['valid']) {
            return $deviceVerify;
        }
        $signature = $_SERVER['HTTP_X_API_SIGNATURE'] ?? '';
        $algorithm = $_SERVER['HTTP_X_API_ALGORITHM'] ?? '';
        $timestamp = $_SERVER['HTTP_X_API_TIMESTAMP'] ?? '';
        $nonce = $_SERVER['HTTP_X_API_NONCE'] ?? '';
        if (empty($timestamp)) {
            return ['valid' => false, 'error' => 'MISSING_TIMESTAMP', 'code' => 'VS002'];
        }
        if (empty($signature)) {
            return ['valid' => false, 'error' => 'MISSING_SIGNATURE', 'code' => 'VS003'];
        }
        if (empty($nonce)) {
            return ['valid' => false, 'error' => 'MISSING_NONCE', 'code' => 'VS004'];
        }
        if (!is_numeric($timestamp)) {
            return ['valid' => false, 'error' => 'INVALID_TIMESTAMP_FORMAT', 'code' => 'VS005'];
        }
        $timestampInt = (int)$timestamp;
        $currentTime = time();
        $timeDiff = abs($currentTime - $timestampInt);
        if ($timeDiff > 60) {
            return [
                'valid' => false,
                'error' => 'SIGNATURE_EXPIRED',
                'code' => 'VS006',
                'diff' => $timeDiff,
                'server_time' => $currentTime,
                'client_time' => $timestampInt
            ];
        }
        $nonceKey = 'nonce_' . md5($nonce . $this->getClientIP());
        if ($this->isNonceUsed($nonceKey)) {
            return ['valid' => false, 'error' => 'REPLAY_ATTACK_DETECTED', 'code' => 'VS007'];
        }
        $this->storeNonce($nonceKey, 300);
        if ($data === null) {
            $data = file_get_contents('php://input');
        }

        $params = [];
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== false) {
            $jsonData = json_decode($data, true);
            if ($jsonData !== null && is_array($jsonData)) {
                $params = $jsonData;
            }
        } elseif (strpos($contentType, 'application/x-www-form-urlencoded') !== false) {
            parse_str($data, $params);
        } elseif (!empty($_POST)) {
            $params = $_POST;
        } elseif (!empty($data)) {
            $jsonData = json_decode($data, true);
            if ($jsonData !== null && is_array($jsonData)) {
                $params = $jsonData;
            } else {
                parse_str($data, $params);
            }
        }

        if (empty($params)) {
            return ['valid' => false, 'error' => 'EMPTY_REQUEST_DATA', 'code' => 'VS008'];
        }
        if ($verifyCsrf) {
            $csrfToken = null;
            if (isset($params[$csrfParam])) {
                $csrfToken = $params[$csrfParam];
                unset($params[$csrfParam]);
            } elseif (isset($_POST[$csrfParam])) {
                $csrfToken = $_POST[$csrfParam];
            } else {
                $csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
            }
            if (!$this->validateCsrfToken($csrfToken)) {
                return ['valid' => false, 'error' => 'INVALID_CSRF_TOKEN', 'code' => 'VS010'];
            }
        }
        ksort($params);
        $paramPairs = [];
        foreach ($params as $key => $value) {
            if (is_array($value)) {
                $value = json_encode($value);
            }
            $paramPairs[] = $key . "=" . urlencode((string)$value);
        }
        $signatureData = implode("&", $paramPairs) . $this->dynamicSalt;

        $validated = false;
        if ($algorithm && isset($this->supportedAlgorithms[$algorithm])) {
            $algo = $this->supportedAlgorithms[$algorithm];
            $expectedSig = hash_hmac($algo, $signatureData, $this->dynamicSecret);
            if (hash_equals($expectedSig, $signature)) {
                $validated = true;
            }
        }
        if (!$validated) {
            $currentAlgo = $this->supportedAlgorithms[$this->algorithm] ?? 'sha256';
            $expectedSig = hash_hmac($currentAlgo, $signatureData, $this->dynamicSecret);
            if (hash_equals($expectedSig, $signature)) {
                $validated = true;
            }
        }

        if (!$validated) {
            return [
                'valid' => false,
                'error' => 'INVALID_SIGNATURE',
                'code' => 'VS009'
            ];
        }

        return [
            'valid' => true,
            'error' => null,
            'code' => 'VS000',
            'data' => $params
        ];
    }
    public function refresh()
    {
        $this->regenerateSecrets();
        return $this;
    }

    public function getSessionInfo()
    {
        return [
            'expire' => $this->secretExpire,
            'expire_in' => max(0, $this->secretExpire - time()),
            'domains' => $this->allowedDomains,
            'algorithm' => $this->algorithm,
            'csrf' => $this->getCsrfInfo()
        ];
    }

    public function getCurrentAlgorithm()
    {
        return $this->algorithm;
    }

    public function issueVisa($userId, $payload = [])
    {
        $data = [
            'uid' => $userId,
            'exp' => time() + 7200,
            'iat' => time(),
            'pld' => $payload
        ];

        $json = json_encode($data);
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($json, 'AES-256-CBC', $this->dynamicSecret, 0, $iv);
        $signature = hash_hmac('sha256', $iv . $encrypted, $this->dynamicSecret);
        return base64_encode($iv . $encrypted . $signature);
    }

    private function getBearerToken()
    {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s+(.+)/', $auth, $matches)) {
            return $matches[1];
        }
        return $_SERVER['HTTP_X_TOKEN'] ?? null;
    }

    public function verifyVisa()
    {
        $token = $this->getBearerToken();
        if (!$token) {
            return false;
        }

        $decoded = base64_decode($token);
        if (strlen($decoded) < 48) {
            return false;
        }

        $iv = substr($decoded, 0, 16);
        $signature = substr($decoded, -32);
        $encrypted = substr($decoded, 16, -32);
        if (!hash_equals($signature, hash_hmac('sha256', $iv . $encrypted, $this->dynamicSecret))) {
            return false;
        }

        $json = @openssl_decrypt($encrypted, 'AES-256-CBC', $this->dynamicSecret, 0, $iv);
        if (!$json) {
            return false;
        }

        $data = json_decode($json, true);
        if (!$data || $data['exp'] < time()) {
            return false;
        }
        return $data;
    }

    public function getCurrentSecret()
    {
        return $this->dynamicSecret;
    }

    public function getCurrentSalt()
    {
        return $this->dynamicSalt;
    }

    public function clearDeviceSession($deviceCredential)
    {
        $sessionKey = $this->getDeviceSessionKey($deviceCredential);
        if (isset($_SESSION[$sessionKey])) {
            unset($_SESSION[$sessionKey]);
            return true;
        }
        return false;
    }
}
