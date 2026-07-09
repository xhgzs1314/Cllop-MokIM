<?php
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
function sendResponse($success, $message, $data = null, $code = 200)
{
    http_response_code($code);
    $response = ['success' => $success, 'error' => $message];
    if ($data !== null) $response['data'] = $data;
    echo json_encode($response);
    exit;
}

header("Content-Type: application/json");
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => '仅支持POST请求']);
    exit;
}

$postData = file_get_contents('php://input');
parse_str($postData, $params);
if (empty($params)) {
    $jsonData = json_decode($postData, true);
    if ($jsonData) {
        $params = $jsonData;
    }
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();

$akuid = $params['ak'] ?? '';
if (empty($akuid)) {
    sendResponse(false, '缺少验证令牌');
}

$plaintext = $decryptor->writebacknewwords($akuid);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}

if (!conbine_auth_towdouble($plaintext)) {
    sendResponse(false, '令牌验证失效');
}
$url = $params['url'] ?? '';
$platform = $params['platform'] ?? '';

if (empty($url)) {
    sendResponse(false, '请输入视频链接');
}

if (empty($platform)) {
    sendResponse(false, '请指定平台 (douyin / bilibili)');
}
$result = null;
switch ($platform) {
    case 'douyin':
        $result = parseDouyin($url);
        break;
    case 'bilibili':
        $result = parseBilibili($url);
        break;
    default:
        sendResponse(false, '不支持的平台: ' . $platform);
}

if ($result && isset($result['code']) && $result['code'] === 0) {
    sendResponse(true, '解析成功', $result['data']);
} else {
    $msg = $result['message'] ?? '解析失败，请检查链接是否有效';
    sendResponse(false, $msg);
}

function getDouyinDirectUrl($video_id)
{
    if (empty($video_id)) {
        return null;
    }

    $url = "https://www.douyin.com/aweme/v1/play/?video_id=" . urlencode($video_id);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15');
    curl_setopt($ch, CURLOPT_REFERER, 'https://www.douyin.com/');
    ob_start();
    $response = curl_exec($ch);
    ob_end_clean();  
    
    if (curl_errno($ch)) {
        curl_close($ch);
        return null;
    }
    
    $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    curl_close($ch);
    
    if (!empty($finalUrl) && $finalUrl !== $url) {
        return $finalUrl;
    }
    
    return null;
}

function parseDouyin($url)
{
    $headers = [
        "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language: zh-CN,zh;q=0.9",
        "Connection: keep-alive",
        "Upgrade-Insecure-Requests: 1"
    ];
    try {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $responseContent = curl_exec($ch);
        if (curl_errno($ch)) {
            throw new Exception("cURL错误: " . curl_error($ch));
        }
        $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        curl_close($ch);
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $finalUrl);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $finalResponse = curl_exec($ch);
        if (curl_errno($ch)) {
            throw new Exception("cURL错误: " . curl_error($ch));
        }
        curl_close($ch);
        $pattern = '/"video":\{"play_addr":\{"uri":"(.*?)"/';
        if (preg_match($pattern, $finalResponse, $matches)) {
            $videoUri = $matches[1];
            $directUrl = getDouyinDirectUrl($videoUri);
            $title = '抖音视频';
            if (preg_match('/<title>(.*?)<\/title>/i', $finalResponse, $titleMatches)) {
                $title = trim($titleMatches[1]);
                $title = str_replace(' - 抖音', '', $title);
                $title = str_replace(' 抖音', '', $title);
            }
            $author = '未知作者';
            if (preg_match('/"author":\{"unique_id":"([^"]+)"/i', $finalResponse, $authorMatches)) {
                $author = $authorMatches[1];
            } elseif (preg_match('/"nickname":"([^"]+)"/i', $finalResponse, $nickMatches)) {
                $author = $nickMatches[1];
            }
            
            
            $cover = '';
            if (preg_match('/"cover":"([^"]+)"/i', $finalResponse, $coverMatches)) {
                $cover = str_replace('\\/', '/', $coverMatches[1]);
            }
            
            
            $duration = 0;
            if (preg_match('/"duration":(\d+)/i', $finalResponse, $durationMatches)) {
                $duration = (int)$durationMatches[1];
            }
            
            $videoUrl = $directUrl ?: "https://www.douyin.com/aweme/v1/play/?video_id={$videoUri}";
            
            return [
                'code' => 0,
                'data' => [
                    'title' => $title,
                    'author' => $author,
                    'cover' => $cover,
                    'video_url' => $videoUrl,
                    'duration' => $duration,
                    'source_url' => $url,
                    'platform' => 'douyin',
                    'is_direct' => $directUrl ? true : false
                ]
            ];
        } else {
            return ['code' => 500, 'message' => '未找到视频URL'];
        }
        
    } catch (Exception $e) {
        return ['code' => 500, 'message' => $e->getMessage()];
    }
}

function parseBilibili($url)
{
    $bvid = extractBvid($url);
    if (empty($bvid)) {
        return ['code' => 500, 'message' => '无法提取BV号，请检查链接格式'];
    }
    $videoInfo = getBiliVideoInfo($bvid);
    if (!$videoInfo) {
        return ['code' => 500, 'message' => '获取视频信息失败，请检查BV号是否正确'];
    }
    $cid = getBiliCid($bvid);
    if (!$cid) {
        return ['code' => 500, 'message' => '获取视频CID失败'];
    }
    $videoUrl = getBiliPlayUrl($bvid, $cid);
    if (empty($videoUrl)) {
        return ['code' => 500, 'message' => '获取视频播放地址失败'];
    }

    return [
        'code' => 0,
        'data' => [
            'title' => $videoInfo['title'] ?? 'B站视频',
            'author' => $videoInfo['owner']['name'] ?? '未知UP主',
            'cover' => $videoInfo['pic'] ?? '',
            'video_url' => $videoUrl,
            'duration' => $videoInfo['duration'] ?? 0,
            'source_url' => $url,
            'platform' => 'bilibili',
            'bvid' => $bvid,
            'aid' => $videoInfo['aid'] ?? 0,
            'desc' => $videoInfo['desc'] ?? '',
            'is_direct' => true  
        ]
    ];
}

function extractBvid($url)
{
    if (preg_match('/^BV[a-zA-Z0-9]+$/', $url)) {
        return $url;
    }
    $patterns = [
        '/\/video\/(BV[a-zA-Z0-9]+)/i',
        '/\?v=([a-zA-Z0-9]+)/i',
        '/bvid=([a-zA-Z0-9]+)/i'
    ];

    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $url, $matches)) {
            return $matches[1];
        }
    }
    if (preg_match('/BV[a-zA-Z0-9]+/', $url, $matches)) {
        return $matches[0];
    }

    return null;
}

function getBiliVideoInfo($bvid)
{
    $url = "https://api.bilibili.com/x/web-interface/view?bvid={$bvid}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Referer: https://www.bilibili.com/',
        'Accept: application/json'
    ]);

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        curl_close($ch);
        return null;
    }
    curl_close($ch);

    $data = json_decode($response, true);
    if ($data && isset($data['code']) && $data['code'] === 0) {
        return $data['data'];
    }

    return null;
}

function getBiliCid($bvid)
{
    $url = "https://api.bilibili.com/x/player/pagelist?bvid={$bvid}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Referer: https://www.bilibili.com/'
    ]);

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        curl_close($ch);
        return null;
    }
    curl_close($ch);

    $data = json_decode($response, true);
    if ($data && isset($data['data'][0]['cid'])) {
        return $data['data'][0]['cid'];
    }

    return null;
}

function getBiliPlayUrl($bvid, $cid)
{
    $url = "https://api.bilibili.com/x/player/playurl?bvid={$bvid}&cid={$cid}&platform=html5&high_quality=1";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Referer: https://www.bilibili.com/'
    ]);

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        curl_close($ch);
        return null;
    }
    curl_close($ch);

    $data = json_decode($response, true);
    if ($data && isset($data['code']) && $data['code'] === 0) {
        $durl = $data['data']['durl'] ?? [];
        if (!empty($durl)) {
            return $durl[0]['url'] ?? null;
        }
        if (isset($data['data']['dash']['video'])) {
            $videos = $data['data']['dash']['video'];
            usort($videos, function($a, $b) {
                return ($b['bandwidth'] ?? 0) - ($a['bandwidth'] ?? 0);
            });
            if (!empty($videos)) {
                return $videos[0]['baseUrl'] ?? null;
            }
        }
    }

    return null;
}