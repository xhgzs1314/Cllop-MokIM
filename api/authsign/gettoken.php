<?php
$currentHost = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost';
$allowedOrigins = [];
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
$allowedOrigins[] = $protocol . $currentHost;
if (strpos($currentHost, 'www.') === 0) {
    $allowedOrigins[] = $protocol . substr($currentHost, 4);
} else {
    $allowedOrigins[] = $protocol . 'www.' . $currentHost;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
function isSameOriginRequest()
{
    $currentHost = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
    $validHosts = [$currentHost];
    if (strpos($currentHost, 'www.') === 0) {
        $validHosts[] = substr($currentHost, 4);
    } else {
        $validHosts[] = 'www.' . $currentHost;
    }
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if (!empty($referer)) {
        $refererHost = parse_url($referer, PHP_URL_HOST);
        if ($refererHost && in_array($refererHost, $validHosts)) {
            return true;
        }
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!empty($origin)) {
        $originHost = parse_url($origin, PHP_URL_HOST);
        if ($originHost && in_array($originHost, $validHosts)) {
            return true;
        }
    }
    $isLocalIp = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1']);
    if ($isLocalIp && empty($referer) && empty($origin)) {
        return true;
    }

    return false;
}
function isBrowserRequest()
{
    $secFetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($secFetchSite === 'cross-site') {
        return false;
    }
    if ($secFetchSite === 'same-origin') {
        $secFetchDest = $_SERVER['HTTP_SEC_FETCH_DEST'] ?? '';
        if ($secFetchDest === 'empty') {
            return true;
        }
    }
    $browserScore = 0;
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    if (!empty($accept)) {
        $browserScore++;
    }
    $acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
    if (!empty($acceptLanguage)) {
        $browserScore++;
    }
    $acceptEncoding = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '';
    if (!empty($acceptEncoding)) {
        $browserScore++;
    }
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if (!empty($userAgent)) {
        $browserScore++;
    }
    $requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    if ($requestedWith === 'XMLHttpRequest') {
        $browserScore += 2;
    }
    $hasCookies = !empty($_COOKIE);
    if ($hasCookies && $browserScore >= 4) {
        return true;
    }
    if (!empty($secFetchSite) && $secFetchSite !== 'cross-site') {
        return true;
    }

    return false;
}
$error = null;
$statusCode = 200;
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    $statusCode = 405;
    $error = 'Method not allowed';
} elseif (!isSameOriginRequest()) {
    $statusCode = 403;
    $error = 'Forbidden: Requests from same origin only';
} elseif (!isBrowserRequest()) {
    $statusCode = 403;
    $error = 'Forbidden: Invalid request source';
}
if ($error !== null) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => $error,
        'status' => 'error'
    ]);
    exit;
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/SecuritySigner.php');
try {
    $signer = SecuritySigner::instance_run();
    $forceRefresh = isset($_GET['refresh']) && $_GET['refresh'] === 'true';
    if ($forceRefresh) {
        $signer->refresh();
    }
    $signerCode = $signer->getSignerCode();
    $sessionInfo = $signer->getSessionInfo();
    $csrf_token = $signer->getCsrfToken();
    echo json_encode([
        'status' => 'ok',
        'signer' => $signerCode,
        'expire' => $sessionInfo['expire'],
        'expire_in' => $sessionInfo['expire_in'],
        'algorithm' => $sessionInfo['algorithm'],
        'timestamp' => time(),
        'csrft' => $csrf_token,
        'encrypt_key' => $signer->getEncryptKey()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage(),
        'code' => 'TK001'
    ]);
}
