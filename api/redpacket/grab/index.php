<?php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

function sendResponse($success, $message, $data = null)
{
    $response = [
        'success' => $success,
        'message' => $message
    ];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

function processGroupText($text)
{
    $prefix = 'group_';
    if (strpos($text, $prefix) === 0) {
        $text = substr($text, strlen($prefix));
    }
    return (int)$text;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['dfid']) || !isset($data['packet_id'])) {
    sendResponse(false, '参数不完整');
}
$userIds = $data['dfid'];
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($userIds);
if (!$plaintext) {
    sendResponse(false, '令牌验证失效');
}
if (!conbine_auth_towdouble($plaintext)) {
    sendResponse(false, '令牌验证失效');
}
$userId = $plaintext;
$packetId = intval($data['packet_id']);
if ($packetId <= 0) {
    sendResponse(false, '红包ID无效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$packetSql = "SELECT id, packet_no, sender_id, group_id, total_amount, total_count,
              remain_amount, remain_count, status, type, expire_time
              FROM mok_redpacket WHERE id = ?";
$stmt = $conn->prepare($packetSql);
$stmt->bind_param("i", $packetId);
$stmt->execute();
$packetResult = $stmt->get_result();

if ($packetResult->num_rows === 0) {
    $stmt->close();
    sendResponse(false, '红包不存在');
}

$packet = $packetResult->fetch_assoc();
$stmt->close();
if ($packet['status'] != 1) {
    $statusMsg = [
        2 => '红包已被领完',
        3 => '红包已过期',
        4 => '红包已退款'
    ];
    sendResponse(false, $statusMsg[$packet['status']] ?? '红包不可用');
}
if ($packet['remain_count'] <= 0 || $packet['remain_amount'] <= 0) {
    sendResponse(false, '红包已被领完');
}
if (strtotime($packet['expire_time']) < time()) {
    $updateStatusSql = "UPDATE mok_redpacket SET status = 3 WHERE id = ?";
    $stmt = $conn->prepare($updateStatusSql);
    $stmt->bind_param("i", $packetId);
    $stmt->execute();
    $stmt->close();
    sendResponse(false, '红包已过期');
}
$checkRecordSql = "SELECT id FROM mok_redpacket_record WHERE packet_id = ? AND user_id = ?";
$stmt = $conn->prepare($checkRecordSql);
$stmt->bind_param("is", $packetId, $userId);
$stmt->execute();
$recordResult = $stmt->get_result();
if ($recordResult->num_rows > 0) {
    $stmt->close();
    sendResponse(false, '您已领取过该红包');
}
$stmt->close();
$groupCheckSql = "SELECT id FROM mok_group_member WHERE group_id = ? AND user_id = ? AND status = 1";
$stmt = $conn->prepare($groupCheckSql);
$stmt->bind_param("is", $packet['group_id'], $userId);
$stmt->execute();
$groupResult = $stmt->get_result();
if ($groupResult->num_rows === 0) {
    $stmt->close();
    sendResponse(false, '您不是该群成员，无法领取');
}
$stmt->close();
$remainCount = $packet['remain_count'];
$remainAmount = $packet['remain_amount'];
$type = $packet['type'];
if ($type == 2) {
    $amount = floor($remainAmount / $remainCount);
    if ($remainCount == 1) {
        $amount = $remainAmount;
    }
} else {
    if ($remainCount == 1) {
        $amount = $remainAmount;
    } else {
        $minAmount = 1;
        $maxAmount = $remainAmount - ($remainCount - 1) * $minAmount;
        if ($maxAmount < $minAmount) {
            $amount = $minAmount;
        } else {
            $amount = mt_rand($minAmount, $maxAmount);
            if ($remainAmount - $amount < ($remainCount - 1) * $minAmount) {
                $amount = $remainAmount - ($remainCount - 1) * $minAmount;
            }
        }
    }
}
$amount = max(1, min($amount, $remainAmount));
$conn->begin_transaction();
try {
    $newRemainAmount = $remainAmount - $amount;
    $newRemainCount = $remainCount - 1;
    $updatePacketSql = "UPDATE mok_redpacket SET 
                        remain_amount = ?, remain_count = ?, 
                        status = IF(? <= 0, 2, 1)
                        WHERE id = ?";
    $stmt = $conn->prepare($updatePacketSql);
    $stmt->bind_param("iiii", $newRemainAmount, $newRemainCount, $newRemainCount, $packetId);
    $stmt->execute();
    $stmt->close();
    $updateUserSql = "UPDATE mok_user SET spkcin = spkcin + ? WHERE id = ?";
    $stmt = $conn->prepare($updateUserSql);
    $stmt->bind_param("is", $amount, $userId);
    $stmt->execute();
    $stmt->close();
    $isLuckiest = 0;
    if ($type == 1) {
        $maxSql = "SELECT MAX(amount) as max_amount FROM mok_redpacket_record WHERE packet_id = ?";
        $stmt = $conn->prepare($maxSql);
        $stmt->bind_param("i", $packetId);
        $stmt->execute();
        $maxResult = $stmt->get_result();
        $maxData = $maxResult->fetch_assoc();
        $stmt->close();

        $currentMax = intval($maxData['max_amount'] ?? 0);
        if ($amount > $currentMax) {
            $isLuckiest = 1;
        }
        if ($currentMax == 0 && $amount > 0) {
            $isLuckiest = 1;
        }
    }
    $insertRecordSql = "INSERT INTO mok_redpacket_record (packet_id, user_id, amount, is_luckiest, receive_time)
                        VALUES (?, ?, ?, ?, NOW())";
    $stmt = $conn->prepare($insertRecordSql);
    $stmt->bind_param("isii", $packetId, $userId, $amount, $isLuckiest);
    $stmt->execute();
    $stmt->close();
    if ($newRemainCount <= 0) {
        $updateStatusSql = "UPDATE mok_redpacket SET `status` = 2 WHERE id = ?";
        $stmt = $conn->prepare($updateStatusSql);
        $stmt->bind_param("i", $packetId);
        $stmt->execute();
        $stmt->close();
    }
    $conn->commit();
    sendResponse(true, '领取成功', [
        'amount' => $amount,
        'is_luckiest' => $isLuckiest,
        'remain_count' => $newRemainCount,
        'remain_amount' => $newRemainAmount
    ]);

} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, '领取红包失败：' . $e->getMessage());
}
?>