<?php
class SilentVerify
{
    private static $config = [
        'verify_expire' => 7200,
        'pow_difficulty' => 5,
        'pow_expire' => 300,
        'pow_timeout' => 5000,
        'behavior_threshold' => 35,
        'behavior_window' => 300,
        'max_attempts' => 3,
        'block_duration' => 1800,
        'fingerprint_lifetime' => 86400,
        'prefix' => 'cf_'
    ];
    private static $initialized = false;
    private static $verified = false;
    private static $challenge = null;
    private static function init()
    {
        if (self::$initialized) return;
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        self::$initialized = true;
    }
    public static function protect($config = [])
    {
        self::init();
        self::mergeConfig($config);
        if (self::isVerified()) {
            self::$verified = true;
            return true;
        }
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (isset($_POST['_cf_verify'])) {
                self::handleVerification();
                exit;
            }
            if (isset($_POST['_cf_captcha'])) {
                self::handleCaptcha();
                exit;
            }
        }
        self::showVerifyPage();
        exit;
    }
    public static function check()
    {
        self::init();
        return self::isVerified();
    }
    public static function getInfo()
    {
        self::init();
        $prefix = self::$config['prefix'];
        return [
            'verified' => isset($_SESSION[$prefix . 'verified']) && $_SESSION[$prefix . 'verified'] > time(),
            'expire' => $_SESSION[$prefix . 'verified'] ?? 0,
            'remaining' => isset($_SESSION[$prefix . 'verified']) ? max(0, $_SESSION[$prefix . 'verified'] - time()) : 0,
            'method' => $_SESSION[$prefix . 'method'] ?? null,
            'score' => $_SESSION[$prefix . 'score'] ?? 0,
            'fingerprint' => $_SESSION[$prefix . 'fingerprint'] ?? null,
            'attempts' => $_SESSION[$prefix . 'attempts'] ?? 0
        ];
    }
    public static function logout()
    {
        self::init();
        $prefix = self::$config['prefix'];
        $keys = [
            'verified',
            'method',
            'score',
            'fingerprint',
            'attempts',
            'blocked',
            'challenge',
            'challenge_time',
            'behavior',
            'captcha_answer',
            'captcha_time',
            'retry_count',
            'first_visit'
        ];
        foreach ($keys as $key) {
            unset($_SESSION[$prefix . $key]);
        }
        return true;
    }
    private static function handleVerification()
    {
        $prefix = self::$config['prefix'];
        $response = ['success' => false, 'retry' => false];
        if (self::isBlocked()) {
            $response['blocked'] = true;
            $response['message'] = 'Too many attempts';
            echo json_encode($response);
            return;
        }
        $clientData = self::getClientData();
        $fingerprint = self::calculateFingerprint($clientData);
        $securityScore = 0;
        $checks = [];
        $behaviorScore = self::analyzeBehavior($fingerprint);
        $securityScore += $behaviorScore;
        $checks['behavior'] = $behaviorScore;
        $powValid = false;
        if (isset($_POST['pow_nonce'], $_POST['pow_challenge'])) {
            $powValid = self::verifyPoW($_POST['pow_nonce'], $_POST['pow_challenge']);
            if ($powValid) {
                $securityScore += 30;
            }
            $checks['pow'] = $powValid;
        }
        $browserScore = self::checkBrowserFeatures($clientData);
        $securityScore += $browserScore;
        $checks['browser'] = $browserScore;
        $envScore = self::checkEnvironment($clientData);
        $securityScore += $envScore;
        $checks['environment'] = $envScore;
        $timingScore = self::checkTiming();
        $securityScore += $timingScore;
        $checks['timing'] = $timingScore;
        $threshold = self::$config['behavior_threshold'];
        $isTrusted = $securityScore >= $threshold;
        self::recordAttempt($fingerprint, $isTrusted);
        if ($isTrusted) {
            $_SESSION[$prefix . 'verified'] = time() + self::$config['verify_expire'];
            $_SESSION[$prefix . 'method'] = 'silent';
            $_SESSION[$prefix . 'score'] = $securityScore;
            $_SESSION[$prefix . 'fingerprint'] = $fingerprint;
            $_SESSION[$prefix . 'first_visit'] = $_SESSION[$prefix . 'first_visit'] ?? time();
            unset($_SESSION[$prefix . 'need_captcha']);
            unset($_SESSION[$prefix . 'retry_count']);
            $response['success'] = true;
            $response['redirect'] = self::getCurrentUrl();
        } else {
            $retryCount = $_SESSION[$prefix . 'retry_count'] ?? 0;
            $retryCount++;
            $_SESSION[$prefix . 'retry_count'] = $retryCount;
            if ($retryCount <= 3) {
                $response['retry'] = true;
                $response['delay'] = $retryCount * 500;
                $response['score'] = $securityScore;
                $response['threshold'] = $threshold;
            } else {
                $_SESSION[$prefix . 'need_captcha'] = true;
                $response['need_captcha'] = true;
                $response['score'] = $securityScore;
                $response['message'] = 'Verification required';
            }
        }
        echo json_encode($response);
    }
    private static function handleCaptcha()
    {
        $prefix = self::$config['prefix'];
        if (!isset($_POST['captcha']) || !isset($_SESSION[$prefix . 'captcha_answer'])) {
            self::showError('验证码错误');
            return;
        }
        if (
            isset($_SESSION[$prefix . 'captcha_time']) &&
            time() - $_SESSION[$prefix . 'captcha_time'] > 300
        ) {
            unset($_SESSION[$prefix . 'captcha_answer']);
            unset($_SESSION[$prefix . 'captcha_time']);
            self::showError('验证码已过期，请刷新重试');
            return;
        }
        if ((int)$_POST['captcha'] === $_SESSION[$prefix . 'captcha_answer']) {
            $_SESSION[$prefix . 'verified'] = time() + self::$config['verify_expire'];
            $_SESSION[$prefix . 'method'] = 'captcha';
            $_SESSION[$prefix . 'first_visit'] = $_SESSION[$prefix . 'first_visit'] ?? time();
            unset($_SESSION[$prefix . 'captcha_answer']);
            unset($_SESSION[$prefix . 'captcha_time']);
            unset($_SESSION[$prefix . 'need_captcha']);
            unset($_SESSION[$prefix . 'retry_count']);
            header('Location: ' . self::getCurrentUrl());
            exit;
        } else {
            $question = self::generateCaptcha();
            self::showVerifyPage(true, '验证码错误，请重试', $question);
            exit;
        }
    }
    private static function getClientData()
    {
        return [
            'ip' => self::getClientIP(),
            'ua' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'accept' => $_SERVER['HTTP_ACCEPT'] ?? '',
            'accept_lang' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '',
            'accept_encoding' => $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '',
            'referer' => $_SERVER['HTTP_REFERER'] ?? '',
            'headers' => getallheaders(),
            'canvas' => $_POST['canvas_fingerprint'] ?? '',
            'webgl' => $_POST['webgl_fingerprint'] ?? '',
            'audio' => $_POST['audio_fingerprint'] ?? '',
            'font' => $_POST['font_fingerprint'] ?? '',
            'screen' => $_POST['screen_resolution'] ?? '',
            'timezone' => $_POST['timezone'] ?? '',
            'platform' => $_POST['platform'] ?? '',
            'memory' => $_POST['device_memory'] ?? '',
            'cores' => $_POST['hardware_concurrency'] ?? '',
            'touch' => $_POST['touch_support'] ?? '',
            'language' => $_POST['language'] ?? '',
            'mouse_moves' => $_POST['mouse_moves'] ?? 0,
            'clicks' => $_POST['clicks'] ?? 0,
            'scrolls' => $_POST['scrolls'] ?? 0,
            'keypress' => $_POST['keypress'] ?? 0,
            'page_load' => $_POST['page_load_time'] ?? 0,
            'request_time' => time(),
            'request_id' => $_POST['request_id'] ?? '',
            'session_id' => session_id()
        ];
    }
    private static function calculateFingerprint($data)
    {
        $components = [
            $data['ip'],
            $data['ua'],
            $data['accept'],
            $data['accept_lang'],
            $data['accept_encoding'],
            $data['screen'],
            $data['timezone'],
            $data['platform'],
            $data['canvas'],
            $data['webgl'],
            $data['audio'],
            $data['font'],
            $data['memory'],
            $data['cores'],
            $data['touch'],
            $data['language'],
            $data['session_id']
        ];
        $fingerprint = hash('sha256', implode('|', $components));
        $fingerprint .= '|' . hash('crc32', $data['ua'] . $data['screen']);
        $fingerprint .= '|' . hash('md5', $data['canvas'] . $data['webgl']);
        return hash('sha512', $fingerprint);
    }
    private static function analyzeBehavior($fingerprint)
    {
        $prefix = self::$config['prefix'];
        $key = $prefix . 'behavior_' . $fingerprint;
        if (!isset($_SESSION[$key])) {
            $_SESSION[$key] = [
                'first_seen' => time(),
                'last_seen' => time(),
                'visit_count' => 0,
                'avg_stay' => 0,
                'page_views' => 0,
                'mouse_activity' => 0,
                'clicks' => 0,
                'scroll_depth' => 0
            ];
        }
        $behavior = &$_SESSION[$key];
        $now = time();
        $behavior['visit_count']++;
        $behavior['page_views']++;
        if (isset($_POST['mouse_moves'])) {
            $behavior['mouse_activity'] += (int)$_POST['mouse_moves'];
        }
        if (isset($_POST['clicks'])) {
            $behavior['clicks'] += (int)$_POST['clicks'];
        }
        if (isset($_POST['scrolls'])) {
            $behavior['scroll_depth'] = max($behavior['scroll_depth'], (int)$_POST['scrolls']);
        }
        if ($behavior['last_seen'] > 0) {
            $stay = $now - $behavior['last_seen'];
            if ($stay > 0 && $stay < 3600) {
                $behavior['avg_stay'] = ($behavior['avg_stay'] * ($behavior['visit_count'] - 1) + $stay) / $behavior['visit_count'];
            }
        }
        $behavior['last_seen'] = $now;
        $score = 0;
        if ($behavior['visit_count'] > 1) $score += 10;
        if ($behavior['avg_stay'] > 5) $score += 15;
        if ($behavior['avg_stay'] > 30) $score += 10;
        if ($behavior['page_views'] >= 3) $score += 10;
        if ($behavior['mouse_activity'] > 10) $score += 10;
        if ($behavior['clicks'] > 2) $score += 5;
        if ($behavior['scroll_depth'] > 300) $score += 5;
        $age = $now - $behavior['first_seen'];
        if ($age > 300) $score += 10;
        if ($age > 3600) $score += 10;
        $frequency = $behavior['visit_count'] / max(1, $age / 60);
        if ($frequency < 10 && $frequency > 0.1) $score += 10;
        return min($score, 100);
    }
    private static function checkBrowserFeatures($data)
    {
        $score = 0;
        if (!empty($data['canvas']) && $data['canvas'] !== 'canvas_error') {
            $score += 15;
        }
        if (!empty($data['webgl']) && $data['webgl'] !== 'webgl_error') {
            $score += 15;
        }
        if (!empty($data['audio'])) {
            $score += 10;
        }
        if (!empty($data['font'])) {
            $score += 10;
        }
        if (!empty($data['screen']) && !empty($data['timezone']) && !empty($data['platform'])) {
            $score += 10;
        }
        $headlessPatterns = ['HeadlessChrome', 'PhantomJS', 'SlimerJS', 'Puppeteer'];
        foreach ($headlessPatterns as $pattern) {
            if (stripos($data['ua'], $pattern) !== false) {
                $score -= 50;
                break;
            }
        }
        $crawlerPatterns = ['bot', 'crawler', 'spider', 'scrape', 'curl', 'wget', 'python', 'java'];
        $isCrawler = false;
        foreach ($crawlerPatterns as $pattern) {
            if (stripos($data['ua'], $pattern) !== false) {
                $isCrawler = true;
                break;
            }
        }
        if ($isCrawler) {
            $score -= 30;
        }
        return max(0, $score);
    }
    private static function checkEnvironment($data)
    {
        $score = 0;
        $ip = $data['ip'];
        $ipHash = hash('crc32', $ip);
        $lang = $data['language'] ?? '';
        $timezone = $data['timezone'] ?? '';
        $langMap = [
            'zh' => ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei'],
            'en' => ['America/New_York', 'America/Los_Angeles', 'Europe/London'],
            'ja' => ['Asia/Tokyo'],
            'ko' => ['Asia/Seoul']
        ];
        $langPrefix = substr($lang, 0, 2);
        if (isset($langMap[$langPrefix])) {
            foreach ($langMap[$langPrefix] as $tz) {
                if (strpos($timezone, $tz) !== false) {
                    $score += 10;
                    break;
                }
            }
        }
        $requiredHeaders = ['accept', 'accept_lang', 'accept_encoding'];
        $hasAll = true;
        foreach ($requiredHeaders as $header) {
            if (empty($data[$header])) {
                $hasAll = false;
                break;
            }
        }
        if ($hasAll) $score += 10;
        if (!empty($data['referer'])) {
            $refererHost = parse_url($data['referer'], PHP_URL_HOST);
            $currentHost = $_SERVER['HTTP_HOST'];
            if ($refererHost && strpos($currentHost, $refererHost) !== false) {
                $score += 10;
            }
        }
        return $score;
    }
    private static function checkTiming()
    {
        $score = 0;
        $prefix = self::$config['prefix'];
        $lastRequest = $_SESSION[$prefix . 'last_request'] ?? 0;
        $now = time();
        if ($lastRequest > 0) {
            $interval = $now - $lastRequest;
            if ($interval >= 1 && $interval <= 600) {
                $score += 10;
            }
            if ($interval < 0.5) {
                $score -= 20;
            }
        }
        $_SESSION[$prefix . 'last_request'] = $now;
        if (isset($_POST['page_load_time'])) {
            $loadTime = (float)$_POST['page_load_time'];
            if ($loadTime > 100 && $loadTime < 5000) {
                $score += 5;
            }
        }
        return max(0, $score);
    }
    private static function verifyPoW($nonce, $challenge)
    {
        $prefix = self::$config['prefix'];
        if (
            empty($_SESSION[$prefix . 'challenge_time']) ||
            time() - $_SESSION[$prefix . 'challenge_time'] > self::$config['pow_expire']
        ) {
            return false;
        }
        if (
            empty($_SESSION[$prefix . 'challenge']) ||
            $_SESSION[$prefix . 'challenge'] !== $challenge
        ) {
            return false;
        }
        $hash = hash('sha256', $challenge . $nonce);
        $difficulty = self::$config['pow_difficulty'];
        $prefixZeros = str_repeat('0', $difficulty);
        return substr($hash, 0, $difficulty) === $prefixZeros;
    }
    private static function generateChallenge()
    {
        $prefix = self::$config['prefix'];
        $challenge = bin2hex(random_bytes(32));
        $_SESSION[$prefix . 'challenge'] = $challenge;
        $_SESSION[$prefix . 'challenge_time'] = time();
        return $challenge;
    }
    private static function generateCaptcha()
    {
        $result = null;
        $prefix = self::$config['prefix'];
        $operators = ['+', '-', '*'];
        $num1 = rand(10, 99);
        $num2 = rand(10, 99);
        $op = $operators[array_rand($operators)];
        switch ($op) {
            case '+':
                $result = $num1 + $num2;
                break;
            case '-':
                $result = $num1 - $num2;
                break;
            case '*':
                $result = $num1 * $num2;
                break;
        }
        $_SESSION[$prefix . 'captcha_answer'] = $result;
        $_SESSION[$prefix . 'captcha_time'] = time();
        return "{$num1} {$op} {$num2} = ?";
    }
    private static function isBlocked()
    {
        $prefix = self::$config['prefix'];
        if (isset($_SESSION[$prefix . 'blocked']) && $_SESSION[$prefix . 'blocked'] > time()) {
            return true;
        }
        return false;
    }
    private static function recordAttempt($fingerprint, $success)
    {
        $prefix = self::$config['prefix'];
        $key = $prefix . 'attempts_' . $fingerprint;
        if (!isset($_SESSION[$key])) {
            $_SESSION[$key] = ['total' => 0, 'failed' => 0, 'first' => time()];
        }
        $_SESSION[$key]['total']++;
        if (!$success) {
            $_SESSION[$key]['failed']++;
        }
        $window = 300;
        if (time() - $_SESSION[$key]['first'] < $window) {
            if ($_SESSION[$key]['failed'] >= self::$config['max_attempts']) {
                $_SESSION[$prefix . 'blocked'] = time() + self::$config['block_duration'];
            }
        } else {
            $_SESSION[$key] = ['total' => 0, 'failed' => 0, 'first' => time()];
        }
    }
    private static function getClientIP()
    {
        $headers = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'HTTP_CLIENT_IP',
            'REMOTE_ADDR'
        ];
        foreach ($headers as $header) {
            if (isset($_SERVER[$header]) && !empty($_SERVER[$header])) {
                $ips = explode(',', $_SERVER[$header]);
                $ip = trim($ips[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return '0.0.0.0';
    }
    private static function isVerified()
    {
        $prefix = self::$config['prefix'];
        if (self::isBlocked()) {
            return false;
        }
        if (isset($_SESSION[$prefix . 'verified']) && $_SESSION[$prefix . 'verified'] > time()) {
            return true;
        }
        return false;
    }
    private static function getCurrentUrl()
    {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'];
        $uri = $_SERVER['REQUEST_URI'];
        return $protocol . '://' . $host . $uri;
    }
    private static function mergeConfig($config)
    {
        if (!empty($config) && is_array($config)) {
            self::$config = array_merge(self::$config, $config);
        }
    }
    private static function showVerifyPage($error = false, $error_msg = '', $captcha_question = null)
    {
        $prefix = self::$config['prefix'];
        $challenge = self::generateChallenge();
        $difficulty = self::$config['pow_difficulty'];
        if ($captcha_question === null) {
            $captcha_question = self::generateCaptcha();
        }
        $needCaptcha = isset($_SESSION[$prefix . 'need_captcha']) || $error;
        $retryCount = $_SESSION[$prefix . 'retry_count'] ?? 0;
        $requestId = bin2hex(random_bytes(8));
?>
        <!DOCTYPE html>
        <html>

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>安全验证 - 请稍候</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: #f0f2f5;
                }

                .container {
                    background: white;
                    padding: 50px 40px;
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
                    max-width: 480px;
                    width: 90%;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }

                .container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, #2563eb, #7c3aed, #2563eb);
                    background-size: 200% 100%;
                    animation: gradientMove 2s linear infinite;
                }

                @keyframes gradientMove {
                    0% {
                        background-position: 0% 0%;
                    }

                    100% {
                        background-position: 200% 0%;
                    }
                }

                .icon {
                    font-size: 48px;
                    margin-bottom: 20px;
                    display: block;
                }

                h2 {
                    color: #1a1a2e;
                    font-size: 22px;
                    font-weight: 600;
                    margin-bottom: 8px;
                }

                .subtitle {
                    color: #666;
                    font-size: 14px;
                    margin-bottom: 25px;
                }

                .spinner {
                    border: 3px solid #f3f4f6;
                    border-top: 3px solid #2563eb;
                    border-radius: 50%;
                    width: 44px;
                    height: 44px;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 20px;
                }

                @keyframes spin {
                    0% {
                        transform: rotate(0deg);
                    }

                    100% {
                        transform: rotate(360deg);
                    }
                }

                .status {
                    color: #666;
                    font-size: 14px;
                    min-height: 24px;
                    margin-bottom: 15px;
                }

                .progress-bar {
                    width: 100%;
                    height: 4px;
                    background: #f0f0f0;
                    border-radius: 2px;
                    overflow: hidden;
                    margin: 20px 0;
                }

                .progress-fill {
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #2563eb, #7c3aed);
                    transition: width 0.4s ease;
                }

                .hidden {
                    display: none !important;
                }

                .error-box {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #dc2626;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    margin: 15px 0;
                }

                .captcha-box {
                    margin-top: 20px;
                    padding: 24px;
                    background: #f8fafc;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }

                .captcha-box .question {
                    background: white;
                    padding: 16px;
                    font-size: 26px;
                    font-weight: 600;
                    border-radius: 8px;
                    margin: 12px 0;
                    border: 1px solid #e2e8f0;
                    color: #1a1a2e;
                }

                .captcha-box input {
                    width: 100%;
                    padding: 12px;
                    margin: 10px 0;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 16px;
                    text-align: center;
                    transition: border-color 0.3s;
                }

                .captcha-box input:focus {
                    outline: none;
                    border-color: #2563eb;
                }

                .captcha-box button {
                    width: 100%;
                    padding: 12px;
                    background: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.3s;
                }

                .captcha-box button:hover {
                    background: #1d4ed8;
                }

                .captcha-box button:active {
                    transform: scale(0.98);
                }

                .info-text {
                    font-size: 12px;
                    color: #94a3b8;
                    margin-top: 12px;
                }

                .badge {
                    display: inline-block;
                    background: #e2e8f0;
                    color: #475569;
                    font-size: 11px;
                    padding: 4px 12px;
                    border-radius: 12px;
                    margin-top: 10px;
                }

                .retry-indicator {
                    color: #94a3b8;
                    font-size: 12px;
                    margin-top: 8px;
                }
            </style>
        </head>

        <body>
            <div class="container">
                <span class="icon">🛡️</span>
                <h2>安全验证</h2>
                <p class="subtitle">正在验证您的身份，请稍候...</p>
                <?php if ($error && $error_msg): ?>
                    <div class="error-box">❌ <?php echo htmlspecialchars($error_msg); ?></div>
                <?php endif; ?>
                <div id="verificationPanel">
                    <div class="spinner" id="spinner"></div>
                    <div class="status" id="statusText">正在初始化...</div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <div class="retry-indicator" id="retryIndicator">
                        <?php if ($retryCount > 0): ?>
                            验证中 (<?php echo $retryCount; ?>/3)
                        <?php endif; ?>
                    </div>
                </div>
                <div class="captcha-box <?php echo $needCaptcha ? '' : 'hidden'; ?>" id="captchaBox">
                    <p style="color: #475569; font-size: 14px; margin-bottom: 12px;">
                        ⚠️ 请输入验证码继续
                    </p>
                    <form method="POST" id="captchaForm">
                        <input type="hidden" name="_cf_captcha" value="1">
                        <div class="question">
                            <?php echo htmlspecialchars($captcha_question); ?>
                        </div>
                        <input type="text" name="captcha" placeholder="输入计算结果" required autocomplete="off" autofocus>
                        <button type="submit">验证</button>
                    </form>
                </div>
                <div class="badge">🔒 安全加密通道</div>
                <div class="info-text">验证通过后自动跳转</div>
            </div>
            <script>
                class FingerprintCollector {
                    constructor() {
                        this.data = {};
                    }
                    async collect() {
                        this.data.screen = `${screen.width}x${screen.height}x${screen.colorDepth}`;
                        this.data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                        this.data.platform = navigator.platform;
                        this.data.language = navigator.language;
                        this.data.device_memory = navigator.deviceMemory || 'unknown';
                        this.data.hardware_concurrency = navigator.hardwareConcurrency || 'unknown';
                        this.data.touch_support = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                        this.data.canvas_fingerprint = this.getCanvasFingerprint();
                        this.data.webgl_fingerprint = this.getWebGLFingerprint();
                        this.data.audio_fingerprint = await this.getAudioFingerprint();
                        this.data.font_fingerprint = this.getFontFingerprint();
                        this.data.page_load_time = performance.now();
                        return this.data;
                    }
                    getCanvasFingerprint() {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = 256;
                            canvas.height = 64;
                            const ctx = canvas.getContext('2d');
                            ctx.textBaseline = 'top';
                            ctx.font = '16px Arial';
                            ctx.fillStyle = '#f60';
                            ctx.fillRect(0, 0, 100, 30);
                            ctx.fillStyle = '#069';
                            ctx.fillText('Cwm fjordbank glyphs vext quiz, 😃', 5, 20);
                            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
                            ctx.fillText('Cwm fjordbank glyphs vext quiz, 😃', 8, 22);
                            ctx.beginPath();
                            ctx.arc(200, 30, 20, 0, Math.PI * 2);
                            ctx.fillStyle = '#FF6B6B';
                            ctx.fill();
                            ctx.strokeStyle = '#4ECDC4';
                            ctx.lineWidth = 3;
                            ctx.stroke();
                            return canvas.toDataURL();
                        } catch (e) {
                            return 'canvas_error';
                        }
                    }
                    getWebGLFingerprint() {
                        try {
                            const canvas = document.createElement('canvas');
                            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                            if (!gl) return 'webgl_not_supported';
                            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                            if (debugInfo) {
                                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                                return `${vendor}|||${renderer}`;
                            }
                            const params = [
                                gl.getParameter(gl.VENDOR),
                                gl.getParameter(gl.RENDERER),
                                gl.getParameter(gl.VERSION)
                            ];
                            return params.join('|||');
                        } catch (e) {
                            return 'webgl_error';
                        }
                    }
                    async getAudioFingerprint() {
                        try {
                            const audioCtx = new(window.AudioContext || window.webkitAudioContext)();
                            const oscillator = audioCtx.createOscillator();
                            const analyser = audioCtx.createAnalyser();
                            oscillator.connect(analyser);
                            analyser.connect(audioCtx.destination);
                            oscillator.frequency.value = 440;
                            oscillator.type = 'sawtooth';
                            oscillator.start(0);
                            const data = new Float32Array(analyser.frequencyBinCount);
                            analyser.getFloatFrequencyData(data);
                            oscillator.stop(0);
                            await audioCtx.close();
                            return Array.from(data.slice(0, 50)).join(',');
                        } catch (e) {
                            return 'audio_error';
                        }
                    }
                    getFontFingerprint() {
                        const fonts = [
                            'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
                            'Courier New', 'Verdana', 'Comic Sans MS', 'Trebuchet MS',
                            'Impact', 'Lucida Grande', 'Tahoma', 'Geneva', 'Palatino'
                        ];
                        const baseFonts = ['monospace', 'sans-serif', 'serif'];
                        const testString = 'abcdefghijklmnopqrstuvwxyz0123456789';
                        const testSize = '72px';
                        const canvas = document.createElement('canvas');
                        canvas.width = 400;
                        canvas.height = 100;
                        const ctx = canvas.getContext('2d');
                        let detected = [];
                        baseFonts.forEach(baseFont => {
                            ctx.font = testSize + ' ' + baseFont;
                            const baseWidth = ctx.measureText(testString).width;
                            fonts.forEach(font => {
                                ctx.font = testSize + ' ' + font + ', ' + baseFont;
                                const width = ctx.measureText(testString).width;
                                if (width !== baseWidth) {
                                    detected.push(font);
                                }
                            });
                        });
                        return detected.join(',');
                    }
                }
                class PoWCalculator {
                    constructor() {
                        this.worker = null;
                    }
                    async compute(challenge, difficulty, timeout = 5000) {
                        return new Promise((resolve) => {
                            const workerCode = `
                    self.onmessage = function(e) {
                        const challenge = e.data.challenge;
                        const difficulty = e.data.difficulty;
                        const prefix = '0'.repeat(difficulty);
                        let nonce = 0;
                        const startTime = Date.now();
                        while (true) {
                            const input = challenge + nonce;
                            let hash = 0;
                            for (let i = 0; i < input.length; i++) {
                                hash = ((hash << 5) - hash) + input.charCodeAt(i);
                                hash = hash & hash;
                            }
                            const hex = Math.abs(hash).toString(16).padStart(8, '0');
                            if (hex.startsWith(prefix)) {
                                self.postMessage({nonce: nonce, done: true});
                                return;
                            }
                            nonce++;
                            if (Date.now() - startTime > ${timeout}) {
                                self.postMessage({nonce: 0, done: true, timeout: true});
                                return;
                            }
                        }
                    };
                `;
                            try {
                                const blob = new Blob([workerCode], {
                                    type: 'application/javascript'
                                });
                                const worker = new Worker(URL.createObjectURL(blob));
                                const timeoutId = setTimeout(() => {
                                    worker.terminate();
                                    resolve(0);
                                }, timeout + 1000);
                                worker.onmessage = function(e) {
                                    clearTimeout(timeoutId);
                                    if (e.data.done) {
                                        resolve(e.data.nonce);
                                    }
                                    worker.terminate();
                                };
                                worker.postMessage({
                                    challenge: challenge,
                                    difficulty: difficulty
                                });
                            } catch (e) {
                                let nonce = 0;
                                const prefix = '0'.repeat(difficulty);
                                const startTime = Date.now();
                                while (Date.now() - startTime < 3000) {
                                    const input = challenge + nonce;
                                    let hash = 0;
                                    for (let i = 0; i < input.length; i++) {
                                        hash = ((hash << 5) - hash) + input.charCodeAt(i);
                                        hash = hash & hash;
                                    }
                                    const hex = Math.abs(hash).toString(16).padStart(8, '0');
                                    if (hex.startsWith(prefix)) {
                                        resolve(nonce);
                                        return;
                                    }
                                    nonce++;
                                }
                                resolve(0);
                            }
                        });
                    }
                }
                class BehaviorMonitor {
                    constructor() {
                        this.clicks = 0;
                        this.mouseMoves = 0;
                        this.scrolls = 0;
                        this.keypress = 0;
                        this.startTime = Date.now();
                        this.bindEvents();
                    }
                    bindEvents() {
                        document.addEventListener('click', () => this.clicks++);
                        document.addEventListener('mousemove', () => this.mouseMoves++);
                        document.addEventListener('scroll', () => this.scrolls++);
                        document.addEventListener('keydown', () => this.keypress++);
                    }
                    getData() {
                        return {
                            clicks: this.clicks,
                            mouse_moves: this.mouseMoves,
                            scrolls: this.scrolls,
                            keypress: this.keypress,
                            page_load_time: Date.now() - this.startTime
                        };
                    }
                }
                class SilentVerifier {
                    constructor() {
                        this.fingerprint = new FingerprintCollector();
                        this.pow = new PoWCalculator();
                        this.behavior = new BehaviorMonitor();
                        this.retryCount = 0;
                        this.maxRetries = 3;
                        this.verified = false;
                    }
                    async verify() {
                        const statusText = document.getElementById('statusText');
                        const progressFill = document.getElementById('progressFill');
                        const spinner = document.getElementById('spinner');
                        const retryIndicator = document.getElementById('retryIndicator');
                        try {
                            statusText.textContent = 'STEP-1...';
                            progressFill.style.width = '15%';
                            await this.sleep(200);
                            const fingerprintData = await this.fingerprint.collect();
                            statusText.textContent = 'STEP-2...';
                            progressFill.style.width = '35%';
                            await this.sleep(100);
                            const behaviorData = this.behavior.getData();
                            Object.assign(fingerprintData, behaviorData);
                            statusText.textContent = 'STEP-3...';
                            progressFill.style.width = '55%';
                            await this.sleep(100);
                            const challenge = '<?php echo $challenge; ?>';
                            const difficulty = <?php echo $difficulty; ?>;
                            const nonce = await this.pow.compute(challenge, difficulty, 5000);
                            statusText.textContent = 'STEP-4...';
                            progressFill.style.width = '80%';
                            await this.sleep(100);
                            const formData = new FormData();
                            formData.append('_cf_verify', '1');
                            formData.append('pow_nonce', nonce);
                            formData.append('pow_challenge', challenge);
                            formData.append('request_id', '<?php echo $requestId; ?>');
                            Object.keys(fingerprintData).forEach(key => {
                                formData.append(key, fingerprintData[key]);
                            });
                            formData.append('behavior_data', JSON.stringify(behaviorData));
                            const response = await fetch(window.location.href, {
                                method: 'POST',
                                body: formData
                            });
                            const result = await response.json();
                            progressFill.style.width = '100%';
                            if (result.success) {
                                statusText.textContent = '验证通过，正在跳转...';
                                spinner.style.display = 'none';
                                this.verified = true;
                                setTimeout(() => {
                                    window.location.href = result.redirect || window.location.href;
                                }, 500);
                            } else if (result.retry) {
                                this.retryCount++;
                                statusText.textContent = `验证中 (${this.retryCount}/${this.maxRetries})...`;
                                if (retryIndicator) {
                                    retryIndicator.textContent = `验证中 (${this.retryCount}/${this.maxRetries})`;
                                    retryIndicator.style.display = 'block';
                                }
                                progressFill.style.width = '0%';
                                const delay = result.delay || 1000;
                                await this.sleep(delay);
                                if (this.retryCount < this.maxRetries) {
                                    this.verify();
                                } else {
                                    statusText.textContent = '需要手动验证';
                                    spinner.style.display = 'none';
                                    document.getElementById('captchaBox').classList.remove('hidden');
                                    document.querySelector('#captchaBox input').focus();
                                }
                            } else if (result.need_captcha) {
                                statusText.textContent = '需要手动验证';
                                spinner.style.display = 'none';
                                document.getElementById('captchaBox').classList.remove('hidden');
                                document.querySelector('#captchaBox input').focus();
                            } else {
                                statusText.textContent = '验证失败，请刷新重试';
                                spinner.style.display = 'none';
                            }
                        } catch (e) {
                            console.error('验证错误:', e);
                            statusText.textContent = '验证出错，请刷新重试';
                            spinner.style.display = 'none';
                            document.getElementById('captchaBox').classList.remove('hidden');
                        }
                    }
                    sleep(ms) {
                        return new Promise(resolve => setTimeout(resolve, ms));
                    }
                }
                document.addEventListener('DOMContentLoaded', () => {
                    const verifier = new SilentVerifier();
                    verifier.verify();
                });
            </script>
        </body>

        </html>
    <?php
        exit;
    }
    private static function showError($message)
    {
    ?>
        <!DOCTYPE html>
        <html>

        <head>
            <meta charset="UTF-8">
            <title>验证失败</title>
        </head>

        <body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 50px; text-align: center;">
            <div style="color: #dc2626; font-size: 18px;"><?php echo htmlspecialchars($message); ?></div>
            <div style="margin-top: 20px;">
                <a href="javascript:location.reload()" style="color: #2563eb; text-decoration: none;">刷新重试</a>
            </div>
        </body>

        </html>
<?php
        exit;
    }
}
?>