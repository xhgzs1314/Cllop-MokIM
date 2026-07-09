<?php
function unicodeDecode($unicode_str)
{
    $json = '{"str":"' . $unicode_str . '"}';
    $arr = json_decode($json, true);
    if (empty($arr)) return '';
    return $arr['str'];
}
function update($updateurl)
{
    $tempFile = 'update.zip';
    $data = file_get_contents($updateurl);
    if ($data !== false) {
        file_put_contents($tempFile, $data);
    } else {
        echo json_encode(['status' => 0, 'msg' => '更新失败'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (file_exists($tempFile)) {
        $zip = new ZipArchive();
        if ($zip->open($tempFile) === true) {
            $zip->extractTo('..');
            $zip->close();
            if (unlink($tempFile)) {
            } else {
                echo json_encode(['status' => 0, 'msg' => '解压异常'], JSON_UNESCAPED_UNICODE);
                exit;
            }
        } else {
            echo json_encode(['status' => 0, 'msg' => '更新包异常'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        echo json_encode(['status' => 1, 'msg' => '更新成功'], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['status' => 0, 'msg' => '更新包未找到'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
function check_sq($version)
{
    $apiUrl = 'https://share.weiyun.com/wyHVLW6T';
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');
    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        echo json_encode(['status' => 0, 'msg' => '意外错误'], JSON_UNESCAPED_UNICODE);
    }
    curl_close($ch);
    $pattern = '/"html_content":"((?:[^"\\\]++|\\\.)*)"/';
    preg_match($pattern, $response, $matches);
    if (isset($matches[1])) {
        $html_content = $matches[1];
        $convertedString = unicodeDecode($html_content);
        $convertedString2 = strip_tags($convertedString);
        $items = explode('|', $convertedString2);
    }
    if ($version >= $items[0]) {
        echo json_encode(['status' => 1, 'msg' => '暂无更新'], JSON_UNESCAPED_UNICODE);
    } else {
        update($items[1]);
    }
}
$version = $_GET['version'];
check_sq($version);
