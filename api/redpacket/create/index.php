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
if (
    !isset($data['dfid']) || !isset($data['group_id']) ||
    !isset($data['packet_no']) || !isset($data['total_amount']) || !isset($data['total_count'])
) {
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
$groupId = processGroupText($data['group_id']);
if ($groupId <= 0) {
    sendResponse(false, '群ID无效');
}
$packetNo = trim($data['packet_no']);
$totalAmount = intval($data['total_amount']);
$totalCount = intval($data['total_count']);
$blessing = isset($data['blessing']) ? trim($data['blessing']) : '恭喜发财，大吉大利';
$type = isset($data['type']) ? intval($data['type']) : 1;
if ($totalAmount < 1) {
    sendResponse(false, '红包总金额至少为 1 G币');
}
if ($totalCount < 1) {
    sendResponse(false, '红包个数至少为 1 个');
}
if ($totalCount > 100) {
    sendResponse(false, '红包个数不能超过 100 个');
}
if ($type === 2 && $totalAmount < $totalCount) {
    sendResponse(false, '平均红包每人至少 1 G币，总金额需大于等于个数');
}
if (empty($packetNo)) {
    sendResponse(false, '红包编号不能为空');
}
if (strlen($blessing) > 50) {
    sendResponse(false, '祝福语不能超过 50 个字符');
}
if (!in_array($type, [1, 2])) {
    sendResponse(false, '红包类型无效');
}
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php');
$checkUserSql = "SELECT id, spkcin FROM mok_user WHERE id = ? AND isban = 0";
$stmt = $conn->prepare($checkUserSql);
$stmt->bind_param("s", $userId);
$stmt->execute();
$userResult = $stmt->get_result();
if ($userResult->num_rows === 0) {
    $stmt->close();
    sendResponse(false, '用户不存在或已被封禁');
}
$userData = $userResult->fetch_assoc();
$currentBalance = intval($userData['spkcin']);
$stmt->close();
if ($currentBalance < $totalAmount) {
    sendResponse(false, 'G币余额不足，当前余额：' . $currentBalance . ' G币');
}
$groupCheckSql = "SELECT id FROM mok_group_member WHERE group_id = ? AND user_id = ? AND status = 1";
$stmt = $conn->prepare($groupCheckSql);
$stmt->bind_param("is", $groupId, $userId);
$stmt->execute();
$groupResult = $stmt->get_result();
if ($groupResult->num_rows === 0) {
    $stmt->close();
    sendResponse(false, '您不是该群成员或群不存在');
}
$stmt->close();
$checkNoSql = "SELECT id FROM mok_redpacket WHERE packet_no = ?";
$stmt = $conn->prepare($checkNoSql);
$stmt->bind_param("s", $packetNo);
$stmt->execute();
$noResult = $stmt->get_result();
if ($noResult->num_rows > 0) {
    $stmt->close();
    sendResponse(false, '红包编号已存在，请重新生成');
}
$stmt->close();
$expireTime = date('Y-m-d H:i:s', time() + 86400);
$conn->begin_transaction();
try {
    $updateBalanceSql = "UPDATE mok_user SET spkcin = spkcin - ? WHERE id = ? AND spkcin >= ?";
    $stmt = $conn->prepare($updateBalanceSql);
    $stmt->bind_param("isi", $totalAmount, $userId, $totalAmount);
    $stmt->execute();
    if ($stmt->affected_rows === 0) {
        throw new Exception('余额扣减失败，请重试');
    }
    $stmt->close();
    $insertSql = "INSERT INTO mok_redpacket (
        packet_no, sender_id, group_id, total_amount, total_count,
        remain_amount, remain_count, blessing, `type`, `status`, expire_time, create_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())";

    $stmt = $conn->prepare($insertSql);
    $stmt->bind_param(
        "ssiiiiisss",
        $packetNo,
        $userId,
        $groupId,
        $totalAmount,
        $totalCount,
        $totalAmount,
        $totalCount,
        $blessing,
        $type,
        $expireTime
    );
    $stmt->execute();
    $packetId = $conn->insert_id;
    $stmt->close();
    $conn->commit();
    $logSql = "INSERT INTO mok_group_log (
        group_id, user_id, `action`, action_time, old_data, new_data, remark
    ) VALUES (?, ?, 'send_redpacket', NOW(), ?, ?, ?)";
    $oldData = json_encode([
        'balance_before' => $currentBalance,
        'remark' => '发送红包'
    ]);
    $newData = json_encode([
        'packet_id' => $packetId,
        'packet_no' => $packetNo,
        'total_amount' => $totalAmount,
        'total_count' => $totalCount,
        'type' => $type,
        'blessing' => $blessing,
        'balance_after' => $currentBalance - $totalAmount,
        'expire_time' => $expireTime
    ]);
    $timenow = date("Y-m-d H:i:s");
    $remark = "用户 {$userId} 在{$timenow}发送了红包，金额 {$totalAmount} G币，个数 {$totalCount} 个";
    $logStmt = $conn->prepare($logSql);
    $logStmt->bind_param("issss", $groupId, $userId, $oldData, $newData, $remark);
    $logStmt->execute();
    $logStmt->close();
    sendResponse(true, '红包创建成功', [
        'packet_id' => $packetId,
        'packet_no' => $packetNo,
        'total_amount' => $totalAmount,
        'total_count' => $totalCount,
        'remain_amount' => $totalAmount,
        'remain_count' => $totalCount,
        'blessing' => $blessing,
        'type' => $type,
        'expire_time' => $expireTime
    ]);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, '创建红包失败：' . $e->getMessage());
}
