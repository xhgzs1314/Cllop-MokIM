function initSettingsModal() {
    const settingsBtn = document.querySelector('#setting-btn-index-idget');
    settingsBtn.onmouseenter = () => settingsBtn.style.color = '#409eff';
    settingsBtn.onmouseleave = () => settingsBtn.style.color = '#16191f';
    const settingsModal = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeSettingsBtn');
    const cancelBtn = document.getElementById('cancelSettingsBtn');
    const saveBtn = document.getElementById('saveSettingsBtn');
    const resetBtn = document.getElementById('resetSettingsBtn');
    const navItems = document.querySelectorAll('.settings-nav-item');
    const languageSelect = document.querySelector('.settings-select');
    if (!settingsBtn || !settingsModal) return;
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
    });

    const closeModal = () => {
        settingsModal.style.display = 'none';
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeModal();
        }
    });

    saveBtn.addEventListener('click', () => {
        saveSettings();
        loadSettings();
        closeModal();
        alertMsg('设置已保存');
    });

    resetBtn.addEventListener('click', () => {
        resetToDefault();
        loadSettings();
        alertMsg('已恢复默认设置');
    });

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.dataset.tab;
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.settings-tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            themeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            applyTheme(option.classList.contains('light') ? 'light' :
                option.classList.contains('dark') ? 'dark' : 'auto');
        });
    });

    const fontSizeSlider = document.getElementById('fontSizeSlider');
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', (e) => {
            const fontSize = e.target.value;
            document.querySelectorAll('*').forEach(el => {
                if (!el.hasAttribute('fuck-now')) {
                    el.style.setProperty('font-size', `${fontSize}px`, 'important');
                }
            });
        });
    }
    const lockSwitch = document.getElementById('messageLockSwitch');
    if (lockSwitch) {
        lockSwitch.addEventListener('change', function () {
            const settings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
            settings.messageLockEnabled = this.checked;
            localStorage.setItem('mok_chatSettings', JSON.stringify(settings));
            updateLockButtonState(this.checked);
        });
    }

}
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
    const theme = settings.theme || 'light';
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.classList.contains(theme)) {
            opt.classList.add('active');
        }
    });
    const fontSize = settings.fontSize || 16;
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    if (fontSizeSlider) {
        fontSizeSlider.value = fontSize;
    }
    document.querySelectorAll('*').forEach(el => {
        if (el.id !== 'fas-dot-im-dot' && el.id !== 'chat-file-fjslsend') {
            if (!el.hasAttribute('fuck-now')) {
                el.style.setProperty('font-size', `${fontSize}px`, 'important');
            }
        }
    });
    const language = settings.language || 'zh-CN';
    const languageSelect = document.querySelector('.settings-select');
    if (languageSelect) {
        languageSelect.value = language;
    }
    document.getElementById('notifySound') && (document.getElementById('notifySound').checked = settings.notifySound ?? true);
    document.getElementById('soundSelect') && (document.getElementById('soundSelect').value = settings.soundSelect || 'default');
    document.getElementById('readReceipt') && (document.getElementById('readReceipt').checked = settings.readReceipt ?? true);
    document.getElementById('typingStatus') && (document.getElementById('typingStatus').checked = settings.typingStatus ?? true);
    document.getElementById('friendVerify') && (document.getElementById('friendVerify').checked = settings.friendVerify ?? true);
    document.getElementById('enterSend') && (document.getElementById('enterSend').checked = settings.enterSend ?? true);
    document.getElementById('showTimestamp') && (document.getElementById('showTimestamp').checked = settings.showTimestamp ?? true);
    document.getElementById('desktopNotify') &&
        (document.getElementById('desktopNotify').checked = settings.desktopNotify ?? true);
    const lockSwitch = document.getElementById('messageLockSwitch');
    if (lockSwitch) {
        lockSwitch.checked = settings.messageLockEnabled ?? true;
        updateLockButtonState(lockSwitch.checked);
    }
    applyTheme(theme);
    document.documentElement.style.setProperty('--chat-font-size', `${fontSize}px`);
    const currentSettings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
    const languageChanged = currentSettings.language !== settings.language;
    if (languageChanged && settings.language && typeof translate !== 'undefined' && translate.changeLanguage) {
        translate.changeLanguage(settings.language === 'zh-CN' ? 'chinese' : 'english');
    }
}

function saveSettings() {
    const oldSettings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
    const oldFriendVerify = oldSettings.friendVerify ?? true;
    const settings = {
        theme: document.querySelector('.theme-option.active')?.classList.contains('light') ? 'light' :
            document.querySelector('.theme-option.active')?.classList.contains('dark') ? 'dark' : 'auto',
        fontSize: document.getElementById('fontSizeSlider')?.value,
        language: document.querySelector('.settings-select')?.value || 'zh-CN',
        notifySound: document.getElementById('notifySound')?.checked,
        soundSelect: document.getElementById('soundSelect')?.value,
        desktopNotify: document.getElementById('desktopNotify')?.checked,
        readReceipt: document.getElementById('readReceipt')?.checked,
        typingStatus: document.getElementById('typingStatus')?.checked,
        friendVerify: document.getElementById('friendVerify')?.checked,
        enterSend: document.getElementById('enterSend')?.checked,
        showTimestamp: document.getElementById('showTimestamp')?.checked,
        messageLockEnabled: document.getElementById('messageLockSwitch')?.checked ?? true,
    };

    const currentSettings = JSON.parse(localStorage.getItem('mok_chatSettings') || '{}');
    const languageChanged = currentSettings.language !== settings.language;
    localStorage.setItem('mok_chatSettings', JSON.stringify(settings));
    if (oldFriendVerify !== settings.friendVerify) {
        updateFriendVerifySetting(settings.friendVerify);
    }

    if (languageChanged && settings.language && typeof translate !== 'undefined' && translate.changeLanguage) {
        translate.changeLanguage(settings.language === 'zh-CN' ? 'chinese' : 'english');
    }
}
function updateLockButtonState(enabled) {
    const lockIcon = document.querySelector('#chat-message-lockedadded');
    if (lockIcon) {
        if (enabled) {
            lockIcon.classList.remove('fa-lock');
            lockIcon.classList.add('fa-unlock-alt');
            lockIcon.style.color = '#409eff';
            lockIcon.title = '消息上锁已启用';
        } else {
            lockIcon.classList.remove('fa-unlock-alt');
            lockIcon.classList.add('fa-lock');
            lockIcon.style.color = '#999';
            lockIcon.title = '消息上锁已禁用';
        }
    }
}
async function updateFriendVerifySetting(requireVerify) {
    const authdatas = await tmd_newcontroler.writenewwords(window.qmok_userid_id);
    const data = {
        require_verify: requireVerify ? 1 : 0,
        UserId: authdatas || 'u1000'
    };
    plugin_post_requests(data, (error, result) => {
        if (error) {
            console.error('更新设置失败:', error);
        } else {
            console.log('好友验证设置更新成功:', result);
            if (!result.success) {
                alertMsg('设置更新失败: ' + result.message);
            }
        }
    }, {
        url: '/api/usettings/update.php',
        timeout: 10000
    });
}

function resetToDefault() {
    const defaultSettings = {
        theme: 'light',
        fontSize: 14,
        language: 'zh-CN',
        notifySound: true,
        soundSelect: 'default',
        readReceipt: true,
        typingStatus: true,
        friendVerify: true,
        desktopNotify: true,
        enterSend: true,
        showTimestamp: true,
        messageLockEnabled: true,
    };
    localStorage.setItem('mok_chatSettings', JSON.stringify(defaultSettings));
    if (typeof translate !== 'undefined' && translate.changeLanguage) {
        translate.changeLanguage('chinese');
    }
}

function applyTheme(theme) {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'light') {
        root.classList.add('light');
    } else if (theme === 'dark') {
        root.classList.add('dark');
    } else if (theme === 'auto') {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            root.classList.add('dark');
        } else {
            root.classList.add('light');
        }
    }
}