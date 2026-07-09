<?php
class TmdbaseauthdownyhoDecrypt
{
    private $timeWindow;
    public function __construct($timeWindow = 60000)
    {
        $this->timeWindow = $timeWindow;
    }
    private function generateTimeKey($timeBlock)
    {
        $timeSeed = mb_convert_encoding("time-seed-{$timeBlock}", 'UTF-8');
        $hkdfSalt = mb_convert_encoding('time-salt', 'UTF-8');
        $hkdfInfo = mb_convert_encoding('time-key', 'UTF-8');
        $aesKey = hash_hkdf('sha256', $timeSeed, 32, $hkdfInfo, $hkdfSalt);
        return $aesKey;
    }
    public function writebacknewwords($encryptedBase64)
    {
        try {
            $decodedBase64 = base64_decode($encryptedBase64, true);
            if ($decodedBase64 === false) {
                throw new Exception('Base64解码失败');
            }
            $data = json_decode($decodedBase64, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('JSON解析失败');
            }
            $currentTime = time() * 1000;
            $currentTimeBlock = (int)floor($currentTime / $this->timeWindow);
            $encryptTimeBlock = $data['timeBlock'];
            if (abs($currentTimeBlock - $encryptTimeBlock) > 1) {
                throw new Exception('时间块验证失败（超时/无效）');
            }
            $aesKey = $this->generateTimeKey($encryptTimeBlock);
            $iv = implode(array_map('chr', $data['iv']));
            $ciphertext = implode(array_map('chr', $data['ciphertext']));
            $tagLength = 16;
            $ciphertextRaw = substr($ciphertext, 0, -$tagLength);
            $tag = substr($ciphertext, -$tagLength);

            $decrypted = openssl_decrypt(
                $ciphertextRaw,
                'aes-256-gcm',
                $aesKey,
                OPENSSL_RAW_DATA,
                $iv,
                $tag
            );
            if ($decrypted === false) {
                throw new Exception('AES-GCM解密失败：' . openssl_error_string());
            }
            return $decrypted;
        } catch (Exception $e) {
            error_log('解密失败: ' . $e->getMessage());
            return null;
        }
    }
}
function conbine_auth_towdouble($waitingtoauthid)
{
    function generrateauthplus(bool $short = false): string
    {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
            (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
            ? 'https' : 'http';
        $domain = isset($_SERVER['HTTP_HOST']) ? rtrim(strtolower(trim($_SERVER['HTTP_HOST'])), '/') : (isset($_SERVER['SERVER_NAME']) ? rtrim(strtolower(trim($_SERVER['SERVER_NAME'])), '/') : '');
        $port = isset($_SERVER['SERVER_PORT']) ? (int)$_SERVER['SERVER_PORT'] : ($protocol === 'https' ? 443 : 80);
        $ip = getservip();
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
    function getservip(): string
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
    function mofencrypt($string, $operation, $key = '')
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
    $qx_max_tmp1 = true;
    $q_suname = null;
    $tcodelogins = $_COOKIE[generrateauthplus((true)) . "_log"] ?? 'null';
    if ($tcodelogins == 'null') {
        $qx_max_tmp1 = false;
    } else {
        $decodeers = new TmdbaseauthdownyhoDecrypt(60000 * 60 * 2);
        $decodeddata = $decodeers->writebacknewwords($tcodelogins);
        if (!$decodeddata) {
            $qx_max_tmp1 = false;
        }
        $decodeddata2 = mofencrypt($decodeddata, 'D', generrateauthplus(true));
        if (!$decodeddata2) {
            $qx_max_tmp1 = false;
        }
        $tarray = explode('<:>', $decodeddata2);
        if (!isset($tarray[0]) || !isset($tarray[1]) || empty($tarray[0]) || empty($tarray[1]) || !isset($tarray[2]) || empty($tarray[2])) {
            $qx_max_tmp1 = false;
        }
        $q_suname = trim($tarray[2]);
        if ($waitingtoauthid != $q_suname) {
            $qx_max_tmp1 = false;
        }
    }
    return $qx_max_tmp1;
}
