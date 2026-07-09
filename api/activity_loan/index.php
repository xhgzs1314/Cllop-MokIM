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
        case 'get_status':
            getLoanStatus($userId);
            break;
        case 'apply':
            applyLoan($userId, $data);
            break;
        case 'repay':
            repayLoan($userId, $data);
            break;
        default:
            echo json_encode(['success' => false, 'message' => '无效操作']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn) && $conn) $conn->close();
}
function cangetlionmoney($credit, $gcoins)
{
    $assetRatio = $gcoins / 1000;
    $creditRatio = $credit / 100;
    $ratio = $assetRatio / $creditRatio;
    if ($ratio > 1.2) {
        $multiplier = 5.0;
    } elseif ($ratio < 0.8) {
        $multiplier = 1.5;
    } else {
        $multiplier = 0.3;
    }
    $maxLoan = max(10, round(($credit / 100) * ($gcoins * 0.5 + 100) * $multiplier));
    return $maxLoan;
}
function getLoanStatus($userId)
{
    global $conn;
    $userSql = "SELECT spkcin, credit FROM mok_user WHERE id = ?";
    $stmt = $conn->prepare($userSql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $userResult = $stmt->get_result();
    $user = $userResult->fetch_assoc();
    $stmt->close();
    $gcoins = $user['spkcin'] ?? 0;
    $credit = $user['credit'] ?? 80;
    $loanSql = "SELECT * FROM mok_loan WHERE user_id = ? AND status = 1 ORDER BY loan_time DESC LIMIT 1";
    $stmt = $conn->prepare($loanSql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $loanResult = $stmt->get_result();
    $loan = $loanResult->fetch_assoc();
    $stmt->close();
    $hasActiveLoan = $loan !== null && $loan['repaid'] < $loan['amount'];
    $maxLoan = 0;
    if (!$hasActiveLoan) {
        $maxLoan = max(10, round(($credit / 100) * ($gcoins * 0.95 + 300)));
    }
    $creditLevel = getCreditLevel($credit);
    echo json_encode([
        'success' => true,
        'gcoins' => $gcoins,
        'credit' => $credit,
        'credit_level' => $creditLevel,
        'has_active_loan' => $hasActiveLoan,
        'max_loan' => $maxLoan,
        'loan' => $loan ? [
            'id' => $loan['id'],
            'amount' => (int)$loan['amount'],
            'repaid' => (int)$loan['repaid'],
            'loan_time' => $loan['loan_time'],
            'progress' => $loan['amount'] > 0 ? round($loan['repaid'] / $loan['amount'] * 100) : 0
        ] : null
    ]);
}

function applyLoan($userId, $data)
{
    global $conn;
    $amount = intval($data['amount'] ?? 0);
    if ($amount < 10) {
        echo json_encode(['success' => false, 'message' => '借款金额不能少于10 G币']);
        return;
    }
    $userSql = "SELECT spkcin, credit FROM mok_user WHERE id = ?";
    $stmt = $conn->prepare($userSql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $gcoins = $user['spkcin'] ?? 0;
    $credit = $user['credit'] ?? 80;
    $checkSql = "SELECT * FROM mok_loan WHERE user_id = ? AND status = 1 ORDER BY loan_time DESC LIMIT 1";
    $stmt = $conn->prepare($checkSql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $activeLoan = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($activeLoan) {
        echo json_encode(['success' => false, 'message' => '请先还清当前借款']);
        return;
    }
    $historySql = "SELECT * FROM mok_loan WHERE user_id = ? AND status = 2 ORDER BY loan_time DESC LIMIT 1";
    $stmt = $conn->prepare($historySql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $historyLoan = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $maxLoan = max(10, round(($credit / 100) * ($gcoins * 0.95 + 300)));
    if ($amount > $maxLoan) {
        echo json_encode(['success' => false, 'message' => "借款额度超出限制，最高可借 {$maxLoan} G币"]);
        return;
    }
    if ($credit < 30) {
        echo json_encode(['success' => false, 'message' => '信用评分过低（<30），无法借款']);
        return;
    }
    $conn->begin_transaction();
    try {
        if ($historyLoan) {
            $updateSql = "UPDATE mok_loan SET 
                           amount = ?,
                           repaid = 0,
                           loan_time = NOW(),
                           repay_time = NULL,
                           status = 1,
                           last_repay_time = NULL
                           WHERE id = ?";
            $stmt = $conn->prepare($updateSql);
            $stmt->bind_param("ii", $amount, $historyLoan['id']);
            $stmt->execute();
            $loanId = $historyLoan['id'];
            $stmt->close();
            $message = "复用历史借款记录，借款 {$amount} G币成功，信用 -2";
        } else {
            $insertSql = "INSERT INTO mok_loan (user_id, amount, repaid, loan_time, status) VALUES (?, ?, 0, NOW(), 1)";
            $stmt = $conn->prepare($insertSql);
            $stmt->bind_param("si", $userId, $amount);
            $stmt->execute();
            $loanId = $stmt->insert_id;
            $stmt->close();

            $message = "借款 {$amount} G币成功，信用 -2";
        }
        $updateCoin = "UPDATE mok_user SET spkcin = spkcin + ? WHERE id = ?";
        $stmt = $conn->prepare($updateCoin);
        $stmt->bind_param("is", $amount, $userId);
        $stmt->execute();
        $stmt->close();
        $updateCredit = "UPDATE mok_user SET credit = GREATEST(credit - 2, 0) WHERE id = ?";
        $stmt = $conn->prepare($updateCredit);
        $stmt->bind_param("s", $userId);
        $stmt->execute();
        $stmt->close();
        $newCredit = max($credit - 2, 0);
        $conn->commit();
        echo json_encode([
            'success' => true,
            'message' => $message,
            'loan_id' => $loanId,
            'new_coins' => $gcoins + $amount,
            'new_credit' => $newCredit,
            'is_reused' => $historyLoan ? true : false
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => '借款失败: ' . $e->getMessage()]);
    }
}

function repayLoan($userId, $data)
{
    global $conn;

    $amount = intval($data['amount'] ?? 0);

    if ($amount < 1) {
        echo json_encode(['success' => false, 'message' => '还款金额至少1 G币']);
        return;
    }
    $loanSql = "SELECT * FROM mok_loan WHERE user_id = ? AND status = 1 ORDER BY loan_time DESC LIMIT 1";
    $stmt = $conn->prepare($loanSql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $loan = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$loan) {
        echo json_encode(['success' => false, 'message' => '没有需要还款的借款']);
        return;
    }
    $remaining = $loan['amount'] - $loan['repaid'];
    if ($amount > $remaining) {
        $amount = $remaining;
    }
    $userSql = "SELECT spkcin, credit FROM mok_user WHERE id = ?";
    $stmt = $conn->prepare($userSql);
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($user['spkcin'] < $amount) {
        echo json_encode([
            'success' => false,
            'message' => "G币不足，需要 {$amount} G币，当前只有 {$user['spkcin']}"
        ]);
        return;
    }

    $conn->begin_transaction();

    try {
        $updateCoin = "UPDATE mok_user SET spkcin = spkcin - ? WHERE id = ?";
        $stmt = $conn->prepare($updateCoin);
        $stmt->bind_param("is", $amount, $userId);
        $stmt->execute();
        $stmt->close();
        $newRepaid = $loan['repaid'] + $amount;
        $status = ($newRepaid >= $loan['amount']) ? 2 : 1;

        $updateSql = "UPDATE mok_loan SET 
                       repaid = ?, 
                       status = ?,
                       repay_time = " . ($status == 2 ? "NOW()" : "NULL") . ",
                       last_repay_time = NOW()
                       WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("iii", $newRepaid, $status, $loan['id']);
        $stmt->execute();
        $stmt->close();
        $creditChange = 0;
        $reason = '';
        if ($status == 2) {
            $creditChange = 5;
            $reason = '还清借款';
        } else {
            $creditChange = 1;
            $reason = '还款';
        }

        $updateCredit = "UPDATE mok_user SET credit = credit + ? WHERE id = ?";
        $stmt = $conn->prepare($updateCredit);
        $stmt->bind_param("is", $creditChange, $userId);
        $stmt->execute();
        $stmt->close();
        $conn->commit();
        echo json_encode([
            'success' => true,
            'message' => $status == 2 ? '🎉 借款已全部还清！信用 +5' : "还款 {$amount} G币成功，信用 +1",
            'repaid' => $newRepaid,
            'remaining' => $loan['amount'] - $newRepaid,
            'status' => $status,
            'credit_change' => $creditChange
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => '还款失败: ' . $e->getMessage()]);
    }
}

function getCreditLevel($credit)
{
    if ($credit >= 90) return ['label' => '优秀 🟢', 'class' => 'excellent'];
    if ($credit >= 70) return ['label' => '良好 🟡', 'class' => 'good'];
    if ($credit >= 50) return ['label' => '一般 🟠', 'class' => 'fair'];
    if ($credit >= 30) return ['label' => '较差 🔴', 'class' => 'poor'];
    return ['label' => '极差 ⚫', 'class' => 'bad'];
}
