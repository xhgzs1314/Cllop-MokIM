<?php
require($_SERVER['DOCUMENT_ROOT'] . '/setting.php');
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php');
$qx_max_tmp1 = true;
$q_suname = null;
$tcodelogins = $_COOKIE[generateAutoWebsiteIdentifier((true)) . "_log"] ?? 'null';
if ($tcodelogins == 'null') {
    $qx_max_tmp1 = false;
} else {
    require($_SERVER['DOCUMENT_ROOT'] . '/cofd/tauth.php');
    $decodeers = new TmdbaseauthdownyhoDecrypt(60000 * 60 * 2); //2h验证
    $decodeddata = $decodeers->writebacknewwords($tcodelogins);
    if (!$decodeddata) {
        $qx_max_tmp1 = false;
    }
    require_once($_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php');
    $decodeddata2 = encrypt($decodeddata, 'D', generateAutoWebsiteIdentifier(true));
    if (!$decodeddata2) {
        $qx_max_tmp1 = false;
    }
    $tarray = explode('<:>', $decodeddata2);
    if (!isset($tarray[0]) || !isset($tarray[1]) || empty($tarray[0]) || empty($tarray[1]) || !isset($tarray[2]) || empty($tarray[2])) {
        $qx_max_tmp1 = false;
    }
    $q_suname = trim($tarray[2]);
}
if ($qx_max_tmp1) {
?>
   <!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>注销账号 - MOK-IM</title>
    <link rel="stylesheet" href="/ast/fontawe/css/all.min.css">
    <script src="/ast/sweetalert2.all.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: linear-gradient(145deg, #f6f9fc 0%, #eef2f5 100%);
            min-height: 100vh;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            margin: 0;
        }

        body.dark {
            background: linear-gradient(145deg, #1a1e24 0%, #0f1117 100%);
        }

     
        .revoke-container {
            width: 100%;
            min-height: 100vh;         
            margin: 0;
            padding: 2rem 2rem 3rem 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeSlideUp 0.4s ease-out;
            background: transparent;
        }

        @keyframes fadeSlideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

       
        .revoke-card {
            max-width: 900px;          
            width: 100%;
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(2px);
            border-radius: 56px;
            box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.3), 0 8px 20px rgba(0, 0, 0, 0.08);
            overflow: hidden;
            transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
            transform: scale(1);
        }

        body.dark .revoke-card {
            background: #1e232eec;
            backdrop-filter: blur(0px);
            box-shadow: 0 30px 50px -20px rgba(0, 0, 0, 0.5);
        }

    
        .card-header {
            padding: 40px 40px 24px 40px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            text-align: center;
            background: rgba(250, 252, 255, 0.5);
        }

        body.dark .card-header {
            background: rgba(20, 24, 32, 0.6);
            border-bottom-color: rgba(255, 255, 255, 0.08);
        }

        .warning-icon {
            width: 96px;
            height: 96px;
            background: #fff0ed;
            border-radius: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            color: #e5452c;
            font-size: 52px;
            box-shadow: 0 16px 28px -12px rgba(229, 69, 44, 0.25);
            transition: all 0.2s;
        }

        body.dark .warning-icon {
            background: #402f2c;
            color: #ff8c6e;
            box-shadow: 0 12px 20px -10px rgba(0, 0, 0, 0.4);
        }

        .card-header h1 {
            font-size: 36px;
            font-weight: 800;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #1f2a3e, #2d3a4e);
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
            letter-spacing: -0.3px;
        }

        body.dark .card-header h1 {
            background: linear-gradient(135deg, #eceef5, #b9c4dd);
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
        }

        .card-header .sub {
            color: #5b6a8c;
            font-size: 17px;
            font-weight: 500;
            margin-top: 6px;
        }

        body.dark .card-header .sub {
            color: #a4b0ca;
        }

        .warning-badge {
            background: #feebe8;
            color: #bc4a33;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 22px;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 700;
            margin-top: 20px;
            backdrop-filter: blur(4px);
        }

        body.dark .warning-badge {
            background: #3d2c28;
            color: #ffbcab;
        }

 
        .data-destruction {
            padding: 28px 40px 16px 40px;
            background: rgba(248, 250, 253, 0.4);
        }

        body.dark .data-destruction {
            background: rgba(22, 26, 34, 0.5);
        }

        .destruct-title {
            font-weight: 700;
            color: #1f2a3e;
            margin-bottom: 24px;
            font-size: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-left: 4px solid #e5452c;
            padding-left: 18px;
        }

        body.dark .destruct-title {
            color: #e9effa;
            border-left-color: #ff7b59;
        }

        
        .destruct-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 12px;
            background: #ffffffcc;
            border-radius: 32px;
            padding: 16px 12px;
            backdrop-filter: blur(2px);
        }

        body.dark .destruct-grid {
            background: #282e3acc;
        }

        .destruct-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.55);
            border-radius: 28px;
            font-size: 15px;
            font-weight: 500;
            color: #1f2c3e;
            transition: all 0.2s;
            backdrop-filter: blur(2px);
        }

        body.dark .destruct-item {
            background: rgba(30, 35, 48, 0.7);
            color: #cfdaee;
        }

        .destruct-item i {
            width: 32px;
            font-size: 20px;
            color: #e46745;
            text-align: center;
        }

        body.dark .destruct-item i {
            color: #ff926f;
        }

        .emphasize-text {
            font-weight: 800;
            color: #d53216;
            background: rgba(229, 69, 44, 0.12);
            padding: 2px 10px;
            border-radius: 40px;
            display: inline-block;
        }

        body.dark .emphasize-text {
            color: #ff987b;
            background: rgba(255, 100, 70, 0.2);
        }

        .info-warning-card {
            margin-top: 24px;
            background: linear-gradient(105deg, #fff6ef, #fffbf5);
            border-radius: 32px;
            padding: 16px 22px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 14px;
            border: 1px solid rgba(229, 69, 44, 0.2);
        }

        body.dark .info-warning-card {
            background: #282e3c;
            border-color: #e56a4d30;
        }

    
        .confirmation-area {
            padding: 20px 40px 40px 40px;
            background: #ffffffdd;
        }

        body.dark .confirmation-area {
            background: #191f2add;
        }

        .alert-box {
            background: #fff1e9;
            border-radius: 32px;
            padding: 20px 24px;
            margin-bottom: 30px;
            display: flex;
            gap: 16px;
            align-items: flex-start;
            font-size: 15px;
            border-left: 6px solid #e5452c;
            box-shadow: 0 8px 12px -8px rgba(0, 0, 0, 0.08);
        }

        body.dark .alert-box {
            background: #322b27;
            border-left-color: #ff7d5c;
            color: #ffe3da;
        }

        .alert-box i {
            font-size: 28px;
            color: #e5452c;
        }

        .input-verify {
            margin-bottom: 30px;
        }

        .input-verify label {
            display: block;
            font-weight: 600;
            margin-bottom: 10px;
            color: #1f2a3e;
            font-size: 15px;
        }

        body.dark .input-verify label {
            color: #dae2f0;
        }

        .input-wrapper {
            position: relative;
            width: 100%;
        }

        .input-wrapper i {
            position: absolute;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            color: #a3b3cc;
            font-size: 18px;
        }

        .input-verify input {
            width: 100%;
            padding: 16px 20px 16px 48px;
            border-radius: 60px;
            border: 1.5px solid #e2ecf5;
            background: #fff;
            font-size: 16px;
            font-weight: 500;
            transition: all 0.2s;
            outline: none;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }

        body.dark .input-verify input {
            background: #11161f;
            border-color: #363e4b;
            color: #f2f5fc;
        }

        .input-verify input:focus {
            border-color: #e5452c;
            box-shadow: 0 0 0 4px rgba(229, 69, 44, 0.2);
        }

        .checkbox-line {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 36px;
            background: #f9fbfe;
            padding: 12px 20px;
            border-radius: 100px;
        }

        body.dark .checkbox-line {
            background: #202632;
        }

        .checkbox-line input {
            width: 22px;
            height: 22px;
            cursor: pointer;
            accent-color: #e5452c;
        }

        .btn-group {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-top: 10px;
        }

        .btn {
            flex: 1;
            padding: 16px 0;
            border-radius: 80px;
            font-weight: 700;
            font-size: 17px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            background: #f0f3f8;
            color: #1e2b3c;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        body.dark .btn {
            background: #2d3440;
            color: #e3eaf5;
        }

        .btn-primary {
            background: #e5452c;
            color: white;
            box-shadow: 0 12px 18px -10px rgba(229, 69, 44, 0.5);
        }

        .btn-primary:hover:not(:disabled) {
            background: #ce3a21;
            transform: translateY(-2px);
            box-shadow: 0 18px 25px -12px rgba(229, 69, 44, 0.6);
        }

        .btn-secondary:hover {
            background: #e3e8ef;
            transform: translateY(-1px);
        }

        body.dark .btn-secondary:hover {
            background: #3c4453;
        }

        .btn-primary:disabled {
            background: #cfa79d;
            cursor: not-allowed;
            transform: none;
            opacity: 0.7;
        }

        .footer-note {
            text-align: center;
            font-size: 13px;
            color: #6a7a92;
            margin-top: 32px;
            padding-top: 8px;
            border-top: 1px solid rgba(0, 0, 0, 0.05);
        }

        body.dark .footer-note {
            color: #6e7d98;
            border-top-color: rgba(255, 255, 255, 0.05);
        }

   
        ::-webkit-scrollbar {
            display: none;
        }

        @media (max-width: 780px) {
            .revoke-container {
                padding: 1.2rem;
            }
            .card-header {
                padding: 28px 20px 20px;
            }
            .data-destruction {
                padding: 20px 22px;
            }
            .confirmation-area {
                padding: 18px 24px 32px;
            }
            .card-header h1 {
                font-size: 28px;
            }
            .destruct-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 550px) {
            .btn-group {
                flex-direction: column;
            }
            .warning-icon {
                width: 76px;
                height: 76px;
                font-size: 40px;
            }
        }

   
        .revoke-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 10% 20%, rgba(229, 69, 44, 0.03), transparent 70%);
            pointer-events: none;
            border-radius: 56px;
        }

        .revoke-card {
            position: relative;
        }
    </style>
</head>
<body>
<div class="revoke-container">
    <div class="revoke-card">
        <div class="card-header">
            <div class="warning-icon">
                <i class="fas fa-trash-alt"></i>
            </div>
            <h1>注销账号</h1>
            <div class="sub">此操作不可逆，请谨慎操作</div>
            <div class="warning-badge">
                <i class="fas fa-exclamation-triangle"></i> 高危行为 · 数据永久灭失
            </div>
        </div>

        <div class="data-destruction">
            <div class="destruct-title">
                <i class="fas fa-skull"></i> 注销后将彻底删除以下数据：
            </div>
            <div class="destruct-grid">
                <div class="destruct-item"><i class="fas fa-comment-dots"></i> 全部聊天记录 (私聊/群聊)</div>
                <div class="destruct-item"><i class="fas fa-address-book"></i> 好友列表 & 群聊关系 & 黑名单</div>
                <div class="destruct-item"><i class="fas fa-envelope"></i> 所有邮件 (收件/发件)</div>
                <div class="destruct-item"><i class="fas fa-coins"></i> G币账户余额 & 交易记录</div>
                <div class="destruct-item"><i class="fas fa-user-circle"></i> 个人资料、签名、头像、个性化设置</div>
                <div class="destruct-item"><i class="fas fa-cloud-upload-alt"></i> 云端文件/附件及离线消息缓存</div>
                <div class="destruct-item"><i class="fas fa-history"></i> 登录日志 & 设备授权信息</div>
            </div>
            <div class="info-warning-card">
                <i class="fas fa-fingerprint" style="font-size: 28px; color:#e5452c;"></i>
                <span><strong>账号ID、手机号/邮箱将释放</strong>，且<span class="emphasize-text">无法找回任何数据</span>。同一凭证不可恢复既往记录，请确认无重要资产残留。</span>
            </div>
        </div>

        <div class="confirmation-area">
            <div class="alert-box">
                <i class="fas fa-skull-crosswalk"></i>
                <span><strong>注销后即时生效</strong> —— 您将被立即登出，所有关联服务永久冻结。若您有虚拟资产或重要会话，请提前备份导出（如聊天记录导出功能）。</span>
            </div>

            <div class="input-verify">
                <label><i class="fas fa-user-shield"></i> 请输入您的登录账号以确认身份</label>
                <div class="input-wrapper">
                    <i class="fas fa-id-card"></i>
                    <input type="text" id="confirmAccount" placeholder="例如: user_123456 或 手机号/邮箱" autocomplete="off">
                </div>
                <div style="font-size: 13px; margin-top: 10px; color:#7c8aa5; display: flex; gap: 6px; align-items: center;">
                    <i class="fas fa-info-circle"></i> 为确保是本人操作，请输入您当前登录的IM账号ID
                </div>
            </div>

            <div class="checkbox-line" id="acknowledgeCheckWrapper">
                <input type="checkbox" id="understoodCheckbox">
                <span>我已阅读并了解注销的后果，确认放弃所有数据及权益，且自愿申请注销账号。</span>
            </div>

            <div class="btn-group">
                <button class="btn btn-secondary" id="cancelRevokeBtn"><i class="fas fa-arrow-left"></i> 暂不注销</button>
                <button class="btn btn-primary" id="confirmRevokeBtn" disabled><i class="fas fa-user-slash"></i> 永久注销账号</button>
            </div>
            <div class="footer-note">
                <i class="fas fa-lock"></i> 执行注销操作后，账号立即锁定且所有资料擦除
            </div>
        </div>
    </div>
</div>

<script>
    window.qmok_userid_id = <?php echo json_encode($q_suname); ?>;
    let currentUserId = null;
    let originalUserId = null;
    let isChecked = false;
    let currentInputAccount = '';

    function getCurrentLoginUserId() {
        return window.qmok_userid_id;
    }

    async function callRevokeAPI(userId, revokeToken = null) {
        const apiUrl = '/api/user/revoke.php';
        const requestBody = {
            user_id: userId,
            confirm_action: true,
            timestamp: Date.now()
        };
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                let errorMsg = `请求失败 (${response.status})`;
                try {
                    const errData = await response.json();
                    errorMsg = errData.message || errData.msg || errorMsg;
                } catch (e) {}
                throw new Error(errorMsg);
            }
            const result = await response.json();
            return result;
        } catch (err) {
            console.error('[Revoke API Error]', err);
            throw err;
        }
    }

    async function performRevoke(userId) {
        try {
            const resp = await callRevokeAPI(userId);
            if (resp && (resp.success === true || resp.code === 200 || resp.status === 'success')) {
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                    document.cookie.split(";").forEach(c => {
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                    });
                } catch (e) {}
                await Swal.fire({
                    title: '账号已注销',
                    text: resp.message || '您的账号已永久注销，所有数据已清除。即将跳转到登录页。',
                    icon: 'success',
                    confirmButtonText: '确定',
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'revoke-swal-popup'
                    },
                    didOpen: () => {
                        const container = Swal.getContainer();
                        if (container) container.style.zIndex = '999999999';
                    }
                });
                window.location.href = '/logout.php';
                return;
            } else {
                throw new Error(resp.message || resp.msg || '注销请求未获服务器确认');
            }
        } catch (error) {
            await Swal.fire({
                title: '注销失败',
                text: error.message || '网络异常或权限不足，请稍后重试。如问题持续，请联系客服。',
                icon: 'error',
                confirmButtonText: '知道了'
            });
        }
    }

    async function finalRevokeConfirmation(userId, inputAccount) {
        if (!inputAccount || inputAccount.trim() === '') {
            await Swal.fire({
                title: '身份验证失败',
                text: '请输入您的完整账号ID以确认操作。',
                icon: 'warning',
                confirmButtonText: '重新输入'
            });
            return false;
        }
        if (inputAccount.trim() !== userId) {
            await Swal.fire({
                title: '账号不匹配',
                text: `输入的账号与当前登录账号 ${userId} 不一致，请重新输入。`,
                icon: 'error',
                confirmButtonText: '重新核对'
            });
            return false;
        }
        const result = await Swal.fire({
            title: '⚠️ 永久注销警告',
            html: `<div style="text-align:left; padding:4px;"><p style="font-weight:bold; font-size:1.1rem;">您正在申请注销账号 <strong style="color:#e5452c;">${userId}</strong></p>
                   <p>· 所有聊天数据、好友关系、群组、G币<strong>永久销毁且不可恢复</strong>。</p>
                   <p>· 与该账号绑定的任何第三方授权将失效。</p>
                   <p>· 注销后立即无法登录，不可撤销。</p></div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e5452c',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '是的，永久注销账户',
            cancelButtonText: '我再想想',
            reverseButtons: true,
            dangerMode: true,
            customClass: {
                popup: 'revoke-swal-popup'
            }
        });
        return result.isConfirmed;
    }

    function updateRevokeButtonState() {
        const confirmBtn = document.getElementById('confirmRevokeBtn');
        const accountInput = document.getElementById('confirmAccount');
        if (!confirmBtn) return;
        const inputValue = accountInput ? accountInput.value.trim() : '';
        const isAccountValid = (currentUserId && inputValue === currentUserId);
        const canEnable = isChecked && isAccountValid;
        confirmBtn.disabled = !canEnable;
    }

    (async function initRevokePage() {
        const checkDarkMode = () => {
            const isDark = localStorage.getItem('theme') === 'dark' ||
                (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && localStorage.getItem('theme') !== 'light');
            if (isDark) {
                document.body.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
            }
        };
        checkDarkMode();
        window.addEventListener('storage', checkDarkMode);
        const userId = await getCurrentLoginUserId();
        if (!userId || userId === 'null' || userId === '') {
            await Swal.fire({
                title: '未登录或会话失效',
                text: '请先登录账户再进行注销操作。',
                icon: 'info',
                confirmButtonText: '去登录',
                allowOutsideClick: false
            });
            window.location.href = '/use/user/';
            return;
        }
        currentUserId = userId;
        originalUserId = userId;
        const accountInput = document.getElementById('confirmAccount');
        if (accountInput) {
            accountInput.placeholder = `输入 ${currentUserId} 确认注销`;
        }
        const alertBox = document.querySelector('.alert-box');
        if (alertBox && currentUserId) {
            let hintSpan = alertBox.querySelector('.dynamic-user-hint');
            if (!hintSpan) {
                hintSpan = document.createElement('div');
                hintSpan.className = 'dynamic-user-hint';
                hintSpan.style.marginTop = '12px';
                hintSpan.style.fontSize = '13px';
                hintSpan.style.fontWeight = '500';
                hintSpan.style.background = 'rgba(0,0,0,0.03)';
                hintSpan.style.padding = '6px 12px';
                hintSpan.style.borderRadius = '60px';
                hintSpan.style.display = 'inline-flex';
                hintSpan.style.alignItems = 'center';
                hintSpan.style.gap = '8px';
                hintSpan.innerHTML = `<i class="fas fa-user-circle"></i> 当前登录账号：<strong>${currentUserId}</strong>`;
                alertBox.appendChild(hintSpan);
            } else {
                hintSpan.innerHTML = `<i class="fas fa-user-circle"></i> 当前登录账号：<strong>${currentUserId}</strong>`;
            }
        }

        const checkBox = document.getElementById('understoodCheckbox');
        if (checkBox) {
            checkBox.addEventListener('change', (e) => {
                isChecked = e.target.checked;
                updateRevokeButtonState();
            });
        }
        if (accountInput) {
            accountInput.addEventListener('input', (e) => {
                currentInputAccount = e.target.value.trim();
                updateRevokeButtonState();
            });
        }
        const cancelBtn = document.getElementById('cancelRevokeBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                Swal.fire({
                    title: '取消注销',
                    text: '您已安全返回，账号未受影响。',
                    icon: 'info',
                    confirmButtonText: '回到主页',
                    timer: 2000,
                    showConfirmButton: true
                }).then(() => {
                    window.history.back();
                });
            });
        }
        const revokeBtn = document.getElementById('confirmRevokeBtn');
        if (revokeBtn) {
            revokeBtn.addEventListener('click', async () => {
                if (!isChecked) {
                    await Swal.fire('提示', '请先勾选“我已阅读并了解注销的后果”', 'warning');
                    return;
                }
                const inputVal = document.getElementById('confirmAccount').value.trim();
                if (!currentUserId || inputVal !== currentUserId) {
                    await Swal.fire('身份验证错误', `请输入准确的账号 ${currentUserId} 以确认身份`, 'error');
                    return;
                }
                const confirmed = await finalRevokeConfirmation(currentUserId, inputVal);
                if (confirmed) {
                    Swal.fire({
                        title: '正在执行注销',
                        text: '请稍后，正在清除资产与数据...',
                        icon: 'info',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        willOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    await performRevoke(currentUserId);
                }
            });
        }
        updateRevokeButtonState();
    })();
</script>
</body>
</html>
<?php
} else {
    http_response_code(403);
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>访问受限</title><style>body{background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;}</style></head><body><div style="text-align:center"><h2>⛔ 未登录或授权过期</h2><p>请先登录后再访问注销页面。</p><a href="/use/user/" style="color:#e5452c;">前往登录 →</a></div></body></html>';
}
?>