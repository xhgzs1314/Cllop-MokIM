<?php
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/SilentVerify.php');
SilentVerify::protect();
?>
<?php
require($_SERVER['DOCUMENT_ROOT'] . '/cofd/functions.php');
$cookie_name = generateAutoWebsiteIdentifier(true) . "_log";
$tcodelogins = isset($_COOKIE[$cookie_name]) ?
    htmlspecialchars($_COOKIE[$cookie_name], ENT_QUOTES, 'UTF-8') : 'null';
$qx_max_tmp1 = true;
if ($tcodelogins == 'null') {
    $qx_max_tmp1 = false;
}
if ($qx_max_tmp1) {
    header('Location: /');
    exit();
}
?>
<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GMOK-IM-START</title>
    <style>
        :root {
            --primary: #2563eb;
            --primary-light: #3b82f6;
            --primary-hover: #1d4ed8;
            --neutral-50: #f9fafb;
            --neutral-100: #f3f4f6;
            --neutral-200: #e5e7eb;
            --neutral-300: #d1d5db;
            --neutral-700: #374151;
            --neutral-800: #1f2937;
            --neutral-900: #111827;
            --radius: 8px;
            --radius-lg: 12px;
            --transition: all 0.2s ease;
            --transition-lg: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-focus: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: "Inter", system-ui, -apple-system, sans-serif;
        }


        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        ::-webkit-scrollbar-track {
            background: var(--neutral-100);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--neutral-300);
            border-radius: 4px;
            transition: var(--transition);
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--neutral-700);
        }


        html {
            scrollbar-width: thin;
            scrollbar-color: var(--neutral-300) var(--neutral-100);
        }

        body {
            min-height: 100vh;
            background-color: var(--neutral-50);
            color: var(--neutral-800);
            overflow-x: hidden;
        }

        .login-wrapper {
            display: flex;
            min-height: 100vh;
            max-width: 1440px;
            margin: 0 auto;
            box-shadow: 0 0 40px rgba(0, 0, 0, 0.05);
        }


        .brand-section {
            flex: 0 0 55%;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 64px 80px;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
        }


        .brand-section::before {
            content: "";
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
            border-radius: 50%;
            z-index: 1;
            animation: brand-bg-pulse 8s infinite ease-in-out;
        }


        @keyframes brand-bg-pulse {

            0%,
            100% {
                transform: scale(1);
                opacity: 0.8;
            }

            50% {
                transform: scale(1.05);
                opacity: 1;
            }
        }


        .brand-header {
            position: relative;
            z-index: 2;
        }

        .brand-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 80px;
            transition: var(--transition);
        }

        .brand-logo:hover {
            transform: translateX(4px);
        }

        .logo-icon {
            width: 40px;
            height: 40px;
            background-color: white;
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: var(--primary);
            font-size: 18px;
            box-shadow: var(--shadow-md);
        }

        .logo-text {
            font-size: 24px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }


        .brand-content {
            position: relative;
            z-index: 2;
            animation: brand-content-fade 1s ease-out;
        }


        @keyframes brand-content-fade {
            from {
                opacity: 0;
                transform: translateY(20px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .brand-title {
            font-size: 48px;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 24px;
        }

        .brand-desc {
            font-size: 18px;
            line-height: 1.6;
            opacity: 0.9;
            max-width: 480px;
        }


        .brand-footer {
            position: relative;
            z-index: 2;
            font-size: 14px;
            opacity: 0.7;
            transition: var(--transition);
        }

        .brand-footer:hover {
            opacity: 1;
        }


        .form-section {
            flex: 0 0 45%;
            background-color: white;
            padding: 80px 64px;
            flex-direction: column;
            justify-content: center;
            height: 100vh;
            overflow-y: scroll;
            position: relative;
        }


        .form-header {
            margin-bottom: 48px;
            animation: form-header-fade 1s ease-out 0.2s both;
        }

        @keyframes form-header-fade {
            from {
                opacity: 0;
                transform: translateY(10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .form-title {
            font-size: 32px;
            font-weight: 600;
            color: var(--neutral-900);
            margin-bottom: 8px;
        }

        .form-subtitle {
            font-size: 16px;
            color: var(--neutral-700);
            line-height: 1.5;
        }


        .tab-nav {
            display: flex;
            gap: 32px;
            margin-bottom: 40px;
            border-bottom: 1px solid var(--neutral-200);
            padding-bottom: 12px;
            position: relative;
        }


        .tab-nav::after {
            content: "";
            position: absolute;
            bottom: -1px;
            left: 0;
            width: 0;
            height: 2px;
            background-color: var(--primary);
            border-radius: 1px;
            transition: var(--transition-lg);
            z-index: 1;
        }

        .tab-nav.active-login::after {
            width: 40px;
            left: 0;
        }

        .tab-nav.active-register::after {
            width: 48px;
            left: calc(32px + 40px);
        }

        .tab-nav.active-retrieve::after {
            width: 48px;
            left: calc(32px*2 + 40px + 48px);
        }

        .tab-item {
            font-size: 18px;
            font-weight: 500;
            color: var(--neutral-700);
            cursor: pointer;
            padding-bottom: 12px;
            border-bottom: 2px solid transparent;
            transition: var(--transition-lg);
            position: relative;
            z-index: 2;
            opacity: 0.8;
        }

        .tab-item.active {
            color: var(--primary);
            opacity: 1;
            transform: translateY(-2px);
        }

        .tab-item:hover:not(.active) {
            color: var(--primary-light);
            opacity: 0.9;
            transform: translateY(-1px);
        }


        .form-item {
            margin-bottom: 24px;
            position: relative;
        }

        .form-item label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: var(--neutral-800);
            margin-bottom: 8px;
            transition: var(--transition);
        }

        .form-item input {
            width: 100%;
            height: 48px;
            padding: 0 16px;
            border: 1px solid var(--neutral-200);
            border-radius: var(--radius-lg);
            font-size: 16px;
            transition: var(--transition-lg);
            outline: none;
            background-color: var(--neutral-50);
            box-shadow: var(--shadow-sm);
        }

        .form-item input:focus {
            border-color: var(--primary);
            box-shadow: var(--shadow-focus);
            background-color: white;
            transform: translateY(-1px);
        }

        .form-item input::placeholder {
            color: var(--neutral-400);
            transition: var(--transition);
        }

        .form-item input:focus::placeholder {
            color: var(--neutral-300);
            opacity: 0.8;
        }

        .captcha-wrap {
            display: flex;
            gap: 16px;
        }

        .captcha-input {
            flex: 1;
        }

        .captcha-img {
            width: 120px;
            height: 48px;
            border: 1px solid var(--neutral-200);
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            letter-spacing: 6px;
            background-color: var(--neutral-100);
            cursor: pointer;
            user-select: none;
            transition: var(--transition-lg);
            box-shadow: var(--shadow-sm);
            position: relative;
            overflow: hidden;
        }

        .captcha-img::before {
            content: "";
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: var(--transition-lg);
        }

        .captcha-img:hover {
            border-color: var(--primary-light);
            background-color: var(--neutral-50);
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }

        .captcha-img:hover::before {
            left: 100%;
        }


        .submit-btn {
            width: 100%;
            height: 52px;
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: var(--radius-lg);
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition-lg);
            margin-top: 8px;
            box-shadow: var(--shadow-sm);
            position: relative;
            overflow: hidden;
        }

        .submit-btn::before {
            content: "";
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            transition: var(--transition-lg);
        }

        .submit-btn:hover {
            background-color: var(--primary-hover);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        .submit-btn:hover::before {
            left: 100%;
        }

        .submit-btn:active {
            transform: translateY(0);
            box-shadow: var(--shadow-sm);
        }


        .form-panel {
            display: none;
            animation: form-panel-fade-out 0.3s ease-in-out both;
        }

        .form-panel.active {
            display: block;
            animation: form-panel-fade-in 0.4s ease-out both;
        }


        @keyframes form-panel-fade-out {
            from {
                opacity: 1;
                transform: translateX(0) scale(1);
            }

            to {
                opacity: 0;
                transform: translateX(10px) scale(0.98);
            }
        }


        @keyframes form-panel-fade-in {
            0% {
                opacity: 0;
                transform: translateX(-10px) scale(0.98);
            }

            50% {
                opacity: 0.5;
                transform: translateX(2px) scale(0.99);
            }

            100% {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
        }


        @media (max-width: 992px) {
            .login-wrapper {
                flex-direction: column;
            }

            .brand-section {
                flex: 0 0 auto;
                padding: 48px 40px;
                min-height: 40vh;
            }

            .brand-logo {
                margin-bottom: 40px;
            }

            .brand-title {
                font-size: 32px;
            }

            .form-section {
                flex: 1;
                padding: 48px 40px;
            }

            .tab-nav.active-register::after {
                left: calc(24px + 40px);
            }

            .tab-nav.active-retrieve::after {
                left: calc(24px*2 + 40px + 48px);
            }
        }

        @media (max-width: 480px) {
            .brand-section {
                padding: 32px 24px;
            }

            .form-section {
                padding: 32px 24px;
            }

            .tab-nav {
                gap: 24px;
            }

            .captcha-img {
                width: 100px;
                font-size: 18px;
                letter-spacing: 4px;
            }
        }

        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transition: var(--transition-lg);
        }

        .modal.active {
            opacity: 1;
            visibility: visible;
        }

        .modal-content {
            background-color: white;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            width: 90%;
            max-width: 450px;
            padding: 24px;
            transform: translateY(-20px) scale(0.95);
            transition: var(--transition-lg);
        }

        .modal.active .modal-content {
            transform: translateY(0) scale(1);
        }


        .alert-modal .modal-header {
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--neutral-200);
        }

        .alert-modal .modal-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--neutral-800);
        }

        .alert-modal .modal-body {
            margin-bottom: 24px;
            font-size: 16px;
            color: var(--neutral-700);
            line-height: 1.6;
        }

        .alert-modal .modal-footer {
            display: flex;
            justify-content: flex-end;
        }


        .data-modal .modal-header {
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--neutral-200);
        }

        .data-modal .modal-title {
            font-size: 20px;
            font-weight: 600;
            color: var(--neutral-800);
        }

        .data-modal .modal-body {
            margin-bottom: 24px;
            max-height: 60vh;
            overflow-y: auto;
            padding-right: 8px;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .data-table th,
        .data-table td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid var(--neutral-200);
        }

        .data-table th {
            width: 30%;
            background-color: var(--neutral-50);
            font-weight: 600;
            color: var(--neutral-800);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .data-table td {
            width: 70%;
            word-break: break-all;
            white-space: pre-wrap;
        }

        .data-table tr:last-child td {
            border-bottom: none;
        }

        .data-modal .modal-content {
            background-color: white;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            width: 90%;
            max-width: 550px;
            max-height: 80vh;
            padding: 24px;
            transform: translateY(-20px) scale(0.95);
            transition: var(--transition-lg);
            overflow: hidden;
        }


        .modal-btn {
            padding: 8px 16px;
            border-radius: var(--radius);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            border: none;
        }

        .primary-btn {
            background-color: var(--primary);
            color: white;
        }

        .primary-btn:hover {
            background-color: var(--primary-hover);
        }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>

<body>
    <div class="login-wrapper">

        <div class="brand-section">
            <div class="brand-header">
                <div class="brand-logo">
                    <div class="logo-icon">IM</div>
                    <div class="logo-text">GMOK</div>
                </div>
            </div>

            <div class="brand-content">
                <h1 class="brand-title">
                    随时畅聊，<br>从这里开始
                </h1>
                <p class="brand-desc">
                    在线畅聊，即时分享，<br>跨过山海距离
                </p>
            </div>

            <div class="brand-footer">
                © 2026 GMOK-IM. All rights reserved.
            </div>
        </div>


        <div class="form-section">
            <div class="form-header">
                <h2 class="form-title">欢迎回来</h2>
                <p class="form-subtitle">请登录您的账号，继续体验高效协作</p>
            </div>


            <div class="tab-nav active-login">
                <div class="tab-item active" data-tab="login">登录</div>
                <div class="tab-item" data-tab="register">注册</div>
                <div class="tab-item" data-tab="retrieve">找回</div>
            </div>


            <div class="form-panel active" id="login-panel">
                <div class="form-item">
                    <label for="auth-code">身份验证码</label>
                    <input type="text" id="auth-code" placeholder="请输入您的身份验证码">
                </div>
                <div class="form-item">
                    <label>图形验证码</label>
                    <div class="captcha-wrap">
                        <input type="text" class="captcha-input" id="login-captcha" placeholder="请输入4位验证码">
                        <div class="captcha-img" id="login-captcha-img"></div>
                    </div>
                </div>
                <button class="submit-btn" id="login-btn">登录</button>
            </div>


            <div class="form-panel" id="register-panel">
                <div class="form-item">
                    <label for="username">用户名</label>
                    <input type="text" id="username" placeholder="请输入6-20位用户名（字母/数字/下划线）">
                </div>
                <div class="form-item">
                    <label for="password">密码</label>
                    <input type="text" id="password" placeholder="请输入8-12位密码（字母/数字/下划线）">
                </div>
                <div class="form-item">
                    <label for="emailbd">邮箱</label>
                    <input type="text" id="emailbd" placeholder="请输入您的邮箱(xxx@xxx.com)">
                </div>
                <div class="form-item">
                    <label>图形验证码</label>
                    <div class="captcha-wrap">
                        <input type="text" class="captcha-input" id="register-captcha" placeholder="请输入4位验证码">
                        <div class="captcha-img" id="register-captcha-img"></div>
                    </div>
                </div>
                <button class="submit-btn" id="register-btn">注册</button>
            </div>


            <div class="form-panel" id="retrieve-panel">
                <div class="form-item">
                    <label for="retrieve-username">用户名</label>
                    <input type="text" id="retrieve-username" placeholder="请输入您的用户名">
                </div>
                <div class="form-item">
                    <label for="retrieve-password">密码</label>
                    <input type="text" id="retrieve-password" placeholder="请输入您的密码">
                </div>
                <div class="form-item">
                    <label for="emailbd2">邮箱</label>
                    <input type="text" id="emailbd2" placeholder="请输入您的邮箱(xxx@xxx.com)">
                </div>
                <div class="form-item">
                    <label>图形验证码</label>
                    <div class="captcha-wrap">
                        <input type="text" class="captcha-input" id="retrieve-captcha" placeholder="请输入4位验证码">
                        <div class="captcha-img" id="retrieve-captcha-img"></div>
                    </div>
                </div>
                <button class="submit-btn" id="retrieve-btn">找回</button>
            </div>
        </div>
    </div>
    <div class="modal alert-modal" id="alertModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">提示</h3>
            </div>
            <div class="modal-body" id="alertModalContent">
            </div>
            <div class="modal-footer">
                <button class="modal-btn primary-btn" id="alertModalConfirm">确定</button>
            </div>
        </div>
    </div>


    <div class="modal data-modal" id="dataModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">操作成功！以下是账号信息(请妥善保管好账号数据)</h3>
            </div>
            <div class="modal-body">
                <table class="data-table" id="dataTable">
                    <thead>
                        <tr>
                            <th>信息</th>
                            <th>值</th>
                        </tr>
                    </thead>
                    <tbody id="dataTableBody">
                    </tbody>
                </table>
            </div>
            <div class="modal-footer">
                <button class="modal-btn primary-btn" id="dataModalConfirm">关闭</button>
            </div>
        </div>
    </div>
    <script>
        function showAlert(message) {
            const modal = document.getElementById('alertModal');
            const content = document.getElementById('alertModalContent');
            content.textContent = message;
            modal.classList.add('active');
            const confirmBtn = document.getElementById('alertModalConfirm');
            confirmBtn.onclick = function() {
                modal.classList.remove('active');
            };


            modal.onclick = function(e) {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            };
        }


        function showDataModal(...dataList) {
            const modal = document.getElementById('dataModal');
            const tableBody = document.getElementById('dataTableBody');
            tableBody.innerHTML = '';
            dataList.forEach(item => {
                if (Array.isArray(item) && item.length === 2) {
                    const tr = document.createElement('tr');
                    const thTd = document.createElement('td');
                    const valTd = document.createElement('td');
                    thTd.textContent = item[0];
                    valTd.textContent = item[1];
                    tr.appendChild(thTd);
                    tr.appendChild(valTd);
                    tableBody.appendChild(tr);
                }
            });
            modal.classList.add('active');
            const confirmBtn = document.getElementById('dataModalConfirm');
            confirmBtn.onclick = function() {
                modal.classList.remove('active');
            };


            modal.onclick = function(e) {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            };
        }
    </script>
    <script src="../../ast/console.js"></script>
    <script src="../../ast/authwrite.js"></script>
    <script src="../../ast/YHMOLKFETCH_SDK.js"></script>
    <script>
        console.log = function() {};
        console.info = function() {};
        console.warn = function() {};
        console.error = function() {};
        const newfuckingao = new ConsoleDetector();
        newfuckingao.startDetection();
        sessionStorage.removeItem('kicked_out');
        const newcontroler = new tmdbaseauthdownyho();
        const newcontroler2 = new tmdbaseauthdownyho(60000 * 60 * 2);
        const tabNav = document.querySelector('.tab-nav');
        const tabItems = document.querySelectorAll('.tab-item');
        const formPanels = document.querySelectorAll('.form-panel');
        tabItems.forEach(item => {
            item.addEventListener('click', () => {
                tabItems.forEach(tab => tab.classList.remove('active'));
                formPanels.forEach(panel => panel.classList.remove('active'));
                item.classList.add('active');
                const tabId = item.dataset.tab;
                document.getElementById(`${tabId}-panel`).classList.add('active');
                tabNav.className = 'tab-nav';
                tabNav.classList.add(`active-${tabId}`);
                const formTitle = document.querySelector('.form-title');
                const formSubtitle = document.querySelector('.form-subtitle');
                if (tabId === 'login') {
                    formTitle.textContent = '欢迎回来';
                    formSubtitle.textContent = '请登录您的账号，继续交流';
                } else if (tabId === 'register') {
                    formTitle.textContent = '创建账号';
                    formSubtitle.textContent = '注册新账号，开启畅聊';
                } else if (tabId === 'retrieve') {
                    formTitle.textContent = '找回账号';
                    formSubtitle.textContent = '验证账号信息，找回您的账号';
                }
            });
        });

        function generateCaptcha(elementId) {
            const captchaEl = document.getElementById(elementId);
            const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
            let captchaCode = '';
            for (let i = 0; i < 4; i++) {
                captchaCode += chars[Math.floor(Math.random() * chars.length)];
            }
            captchaEl.textContent = captchaCode;
            captchaEl.setAttribute('data-code', captchaCode);
            const inputId = elementId.replace('-img', '');
            document.getElementById(inputId).value = '';
        }
        generateCaptcha('login-captcha-img');
        generateCaptcha('register-captcha-img');
        generateCaptcha('retrieve-captcha-img');
        document.getElementById('login-captcha-img').addEventListener('click', () => {
            generateCaptcha('login-captcha-img');
        });
        document.getElementById('register-captcha-img').addEventListener('click', () => {
            generateCaptcha('register-captcha-img');
        });
        document.getElementById('retrieve-captcha-img').addEventListener('click', () => {
            generateCaptcha('retrieve-captcha-img');
        });


        document.getElementById('login-btn').addEventListener('click', () => {
            const authCode = document.getElementById('auth-code').value.trim();
            const inputCaptcha = document.getElementById('login-captcha').value.trim().toUpperCase();
            const realCaptcha = document.getElementById('login-captcha-img').getAttribute('data-code').toUpperCase();

            if (!authCode) {
                showAlert('请输入身份验证代码！');
                generateCaptcha('login-captcha-img');
                document.getElementById('auth-code').focus();
                return;
            }
            if (!inputCaptcha) {
                showAlert('请输入图形验证码！');
                generateCaptcha('login-captcha-img');
                document.getElementById('login-captcha').focus();
                return;
            }
            if (inputCaptcha !== realCaptcha) {
                showAlert('图形验证码错误，请重新输入！');
                generateCaptcha('login-captcha-img');
                document.getElementById('login-captcha').focus();
                return;
            }

            async function sendRequest() {
                try {
                    const xnewdata = await newcontroler.writenewwords(authCode);
                    const xnewdata2 = await newcontroler2.writenewwords(authCode);
                    const result = await yhmolk_fetchpull('logs/getlog.php', {
                        authdata: xnewdata,
                        authdata2: xnewdata2
                    });
                    if (result.status === 200) {
                        showAlert('登录成功！本页面将在3秒后关闭...');
                        setTimeout(() => {
                            location.href = '../../chat.php';
                        }, 3000);
                    } else {
                        showAlert(result.message);
                        generateCaptcha('login-captcha-img');
                    }
                } catch (error) {
                    generateCaptcha('login-captcha-img');
                    showAlert('请求失败，请稍后重试！');
                }
            }
            sendRequest();
        });
        document.getElementById('register-btn').addEventListener('click', () => {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const emailget = document.getElementById('emailbd').value.trim();
            const inputCaptcha = document.getElementById('register-captcha').value.trim().toUpperCase();
            const realCaptcha = document.getElementById('register-captcha-img').getAttribute('data-code').toUpperCase();
            const usernameReg = /^[a-zA-Z0-9_]{6,20}$/;
            const passwordReg = /^[a-zA-Z0-9_]{8,12}$/;
            const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
            if (!username) {
                showAlert('请输入用户名！');
                generateCaptcha('register-captcha-img');
                document.getElementById('username').focus();
                return;
            }
            if (!password) {
                showAlert('请输入密码！');
                generateCaptcha('register-captcha-img');
                document.getElementById('password').focus();
                return;
            }
            if (!emailget) {
                showAlert('请输入邮箱！');
                generateCaptcha('register-captcha-img');
                document.getElementById('emailbd').focus();
                return;
            }
            if (!usernameReg.test(username)) {
                showAlert('用户名需为6-20位字母、数字或下划线！');
                generateCaptcha('register-captcha-img');
                document.getElementById('username').focus();
                return;
            }
            if (!passwordReg.test(password)) {
                showAlert('密码需为8-12位字母、数字或下划线！');
                generateCaptcha('register-captcha-img');
                document.getElementById('password').focus();
                return;
            }
            if (!emailPattern.test(emailget)) {
                showAlert('邮箱格式错误！');
                generateCaptcha('register-captcha-img');
                document.getElementById('emailbd').focus();
                return;
            }
            if (!inputCaptcha) {
                showAlert('请输入图形验证码！');
                generateCaptcha('register-captcha-img');
                document.getElementById('register-captcha').focus();
                return;
            }
            if (inputCaptcha !== realCaptcha) {
                showAlert('图形验证码错误，请重新输入！');
                generateCaptcha('register-captcha-img');
                document.getElementById('register-captcha').focus();
                return;
            }
            async function sendRequest() {
                try {
                    const xnewdata = await newcontroler.writenewwords(username);
                    const result = await yhmolk_fetchpull('logs/getreg.php', {
                        password: password,
                        email: emailget,
                        authdata: xnewdata
                    });
                    if (result.status === 200) {
                        showDataModal(
                            ['身份验证码', result.data['usercode']],
                            ['用户名', username],
                            ['密码', password],
                            ['注册时间', result.data['regtime']],
                            ['昵称', result.data['nickname']]
                        );
                        generateCaptcha('register-captcha-img');
                    } else {
                        showAlert(result.message);
                        generateCaptcha('register-captcha-img');
                    }
                } catch (error) {
                    generateCaptcha('register-captcha-img');
                    showAlert('注册请求失败，请稍后重试！');
                }
            }
            sendRequest();
        });
        document.getElementById('retrieve-btn').addEventListener('click', () => {
            const username = document.getElementById('retrieve-username').value.trim();
            const password = document.getElementById('retrieve-password').value.trim();
            const emailget = document.getElementById('emailbd2').value.trim();
            const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
            const inputCaptcha = document.getElementById('retrieve-captcha').value.trim().toUpperCase();
            const realCaptcha = document.getElementById('retrieve-captcha-img').getAttribute('data-code').toUpperCase();
            if (!username) {
                showAlert('请输入用户名！');
                generateCaptcha('retrieve-captcha-img');
                document.getElementById('retrieve-username').focus();
                return;
            }
            if (!password) {
                showAlert('请输入密码！');
                generateCaptcha('retrieve-captcha-img');
                document.getElementById('retrieve-password').focus();
                return;
            }
            if (!emailget) {
                showAlert('请输入邮箱！');
                generateCaptcha('retrieve-captcha-img');
                document.getElementById('emailbd2').focus();
                return;
            }
            if (!emailPattern.test(emailget)) {
                showAlert('邮箱格式错误！');
                generateCaptcha('retrieve-captcha-img');
                document.getElementById('emailbd2').focus();
                return;
            }
            if (!inputCaptcha) {
                showAlert('请输入图形验证码！');
                generateCaptcha('retrieve-captcha-img');
                document.getElementById('retrieve-captcha').focus();
                return;
            }
            if (inputCaptcha !== realCaptcha) {
                showAlert('图形验证码错误，请重新输入！');
                generateCaptcha('retrieve-captcha-img');
                document.getElementById('retrieve-captcha').focus();
                return;
            }

            async function sendRequest() {
                try {
                    const xnewdata = await newcontroler.writenewwords(username);
                    const result = await yhmolk_fetchpull('logs/getretrieve.php', {
                        password: password,
                        authdata: xnewdata,
                        email:emailget
                    });
                    if (result.status === 200) {
                        showDataModal(
                            ['身份验证码', result.data['usercode']],
                            ['用户名', username],
                            ['找回时间', result.data['retrievetime']],
                            ['提示', result.data['tips']]
                        );
                        generateCaptcha('retrieve-captcha-img');
                    } else {
                        showAlert(result.message);
                        generateCaptcha('retrieve-captcha-img');
                    }
                } catch (error) {
                    showAlert('找回请求失败，请稍后重试！');
                    generateCaptcha('retrieve-captcha-img');
                }
            }
            sendRequest();
        });
    </script>
</body>

</html>