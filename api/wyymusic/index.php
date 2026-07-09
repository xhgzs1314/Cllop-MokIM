<?php
function sendResponse($success, $message, $data = null, $code = 200)
{
    http_response_code($code);
    $response = ['success' => $success, 'error' => $message];
    if ($data !== null) $response['data'] = $data;
    echo json_encode($response);
    exit;
}
header("Content-Type: application/json");
$path = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST') {
    $postData = file_get_contents('php://input');
    parse_str($postData, $params);
    require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
    $decryptor = new TmdbaseauthdownyhoDecrypt();
    if (isset($params['keyword'])) {
        $keyword = $params['keyword'];
        $akuid = $params['ak'];
        if (empty($keyword) || empty($akuid)) {
            http_response_code(400);
            echo json_encode(['error' => '缺少keyword参数']);
            exit;
        }
        $plaintext = $decryptor->writebacknewwords($params['ak']);
        if (!$plaintext) {
            sendResponse(false, '令牌验证失效');
        }
        if (!conbine_auth_towdouble($plaintext)) {
            sendResponse(false, '令牌验证失效');
        }
        $encodedKeyword = urlencode($keyword);
        $url = "https://music.163.com/api/search/get/web?csrf_token=&s={$encodedKeyword}&type=1&offset=0&total=true&limit=10";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'Referer: https://music.163.com',
            'Accept: application/json, text/plain, */*',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
            'Connection: keep-alive'
        ]);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($error) {
            http_response_code(500);
            echo json_encode([
                'error' => '服务器内部错误',
                'details' => $error
            ]);
        } else {
            http_response_code($httpCode);
            echo $response;
        }
        exit;
    }
    if (isset($params['songId'])) {
        $songId = $params['songId'];
        $akuid = $params['ak'];
        if (empty($songId) || empty($akuid)) {
            http_response_code(400);
            echo json_encode(['error' => '缺少songId参数']);
            exit;
        }
        $plaintext = $decryptor->writebacknewwords($params['ak']);
        if (!$plaintext) {
            sendResponse(false, '令牌验证失效');
        }
        if (!conbine_auth_towdouble($plaintext)) {
            sendResponse(false, '令牌验证失效');
        }
        $redirectUrl = "https://music.163.com/song/media/outer/url?id={$songId}.mp3";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $redirectUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'Referer: https://music.163.com',
            'Accept: application/json, text/plain, */*',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
        ]);

        curl_exec($ch);
        $error = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $location = curl_getinfo($ch, CURLINFO_REDIRECT_URL);
        curl_close($ch);

        if ($error) {
            http_response_code(500);
            error_log("获取歌曲链接出错: " . $error);
            echo json_encode(['error' => '服务器内部错误']);
        } else {
            $url = $location ? $location : $redirectUrl;
            echo json_encode(['url' => $url]);
        }
        exit;
    }
}
http_response_code(404);
echo json_encode(['error' => '接口不存在']);
