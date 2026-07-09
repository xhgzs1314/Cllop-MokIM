<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php';
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';
$authdata = $data['UserId'] ?? '';
if (empty($action) || empty($authdata)) {
    echo json_encode(['success' => false, 'message' => '数据异常']);
    exit;
}
$decryptor = new TmdbaseauthdownyhoDecrypt();
$plaintext = $decryptor->writebacknewwords($authdata);
if (!$plaintext) {
    echo json_encode(['success' => false, 'message' => '身份验证异常']);
    exit;
}
if (!conbine_auth_towdouble($plaintext)) {
    echo json_encode(['success' => false, 'message' => '身份验证异常']);
    exit;
}
$userId = $plaintext;
require_once $_SERVER['DOCUMENT_ROOT'] . '/cofd/common.php';
try {
    switch ($action) {
        case 'cdk_history':
            getCdkHistory($userId);
            break;
        case 'redeem':
            redeemCdk($userId, $data['code'] ?? '');
            break;
        default:
            echo json_encode(['success' => false, 'message' => '无效操作']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn) && $conn) $conn->close();
}

function getCdkHistory($userId) {
    global $conn;
    
    $stmt = null;
    
    try {
        $sql = "SELECT c.code, c.reward, c.item_name, u.use_time 
                FROM mok_cdk_usage u 
                JOIN mok_cdk c ON u.cdk_id = c.id 
                WHERE u.user_id = ? 
                ORDER BY u.use_time DESC LIMIT 10";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        $stmt->close();
        
        echo json_encode(['success' => true, 'data' => $data]);
        
    } catch (Exception $e) {
        if ($stmt) $stmt->close();
        throw $e;
    }
}

function redeemCdk($userId, $code) {
    global $conn;
    $stmt = null;
    $stmt2 = null;
    $stmt3 = null;
    $stmt4 = null;
    $stmt5 = null;
    try {
        if (empty($code)) {
            echo json_encode(['success' => false, 'message' => '请输入激活码']);
            return;
        }
        $cdkSql = "SELECT * FROM mok_cdk WHERE code = ? AND status = 1 AND expire_time > NOW()";
        $stmt = $conn->prepare($cdkSql);
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            $stmt->close();
            echo json_encode(['success' => false, 'message' => '激活码无效或已过期']);
            return;
        }
        $cdk = $result->fetch_assoc();
        $stmt->close();
        $canUse = false;
        $message = '';
        switch ($cdk['use_type']) {
            case 1: 
                $checkSql = "SELECT id FROM mok_cdk_usage WHERE cdk_id = ? AND user_id = ?";
                $stmt2 = $conn->prepare($checkSql);
                $stmt2->bind_param("is", $cdk['id'], $userId);
                $stmt2->execute();
                if ($stmt2->get_result()->num_rows > 0) {
                    $message = '您已使用过此激活码';
                } else {
                    $canUse = true;
                }
                $stmt2->close();
                break;
                
            case 2: 
                if ($cdk['used_count'] >= $cdk['max_uses']) {
                    $message = '激活码已使用完毕';
                } else {
                    $checkSql = "SELECT id FROM mok_cdk_usage WHERE cdk_id = ? AND user_id = ?";
                    $stmt3 = $conn->prepare($checkSql);
                    $stmt3->bind_param("is", $cdk['id'], $userId);
                    $stmt3->execute();
                    if ($stmt3->get_result()->num_rows > 0) {
                        $message = '您已使用过此激活码';
                    } else {
                        $canUse = true;
                    }
                    $stmt3->close();
                }
                break;
                
            case 3: 
                $canUse = true;
                break;
        }
        
        if (!$canUse) {
            echo json_encode(['success' => false, 'message' => $message ?: '无法使用此激活码']);
            return;
        }
        $conn->begin_transaction();
        $insertSql = "INSERT INTO mok_cdk_usage (cdk_id, user_id) VALUES (?, ?)";
        $stmt4 = $conn->prepare($insertSql);
        $stmt4->bind_param("is", $cdk['id'], $userId);
        $stmt4->execute();
        $stmt4->close();
        $updateSql = "UPDATE mok_cdk SET used_count = used_count + 1 WHERE id = ?";
        $stmt5 = $conn->prepare($updateSql);
        $stmt5->bind_param("i", $cdk['id']);
        $stmt5->execute();
        $stmt5->close();
        if ($cdk['item_type'] === 'gcoin') {
            $updateCoin = "UPDATE mok_user SET spkcin = spkcin + ? WHERE id = ?";
            $stmt6 = $conn->prepare($updateCoin);
            $stmt6->bind_param("is", $cdk['reward'], $userId);
            $stmt6->execute();
            $stmt6->close();
        }
        $conn->commit();
        echo json_encode([
            'success' => true,
            'reward' => $cdk['reward'],
            'item_name' => $cdk['item_name'],
            'message' => '兑换成功'
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        if ($stmt) $stmt->close();
        if ($stmt2) $stmt2->close();
        if ($stmt3) $stmt3->close();
        if ($stmt4) $stmt4->close();
        if ($stmt5) $stmt5->close();
        echo json_encode(['success' => false, 'message' => '兑换失败，请稍后重试']);
    }
}
?>