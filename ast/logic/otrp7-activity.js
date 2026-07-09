(function () {
    const RateLimit = {
        _records: {},
        check(key, interval) {
            const now = Date.now();
            const last = this._records[key] || 0;
            const elapsed = now - last;

            if (elapsed < interval) {
                return {
                    allowed: false,
                    waitTime: Math.ceil((interval - elapsed) / 1000)
                };
            }

            this._records[key] = now;
            return { allowed: true, waitTime: 0 };
        },
        reset(key) {
            delete this._records[key];
        }
    };
    const userId = window.qmok_userid_id;
    const ActivityController = {
        open() {
            const modal = document.getElementById('activityModal');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            this.loadData();
        },
        close() {
            const modal = document.getElementById('activityModal');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        },
        async loadData() {
            const key = `info_${userId}`;
            const result = RateLimit.check(key, 15000);
            if (!result.allowed) {
                console.log(`请等待 ${result.waitTime} 秒后刷新`);
                return null;
            }
            await this.loadUserInfo();
            await this.loadCheckinStatus();
            await this.loadCdkHistory();
        },
        async loadUserInfo() {
            try {
                const authdata = await tmd_newcontroler.writenewwords(userId);
                const result = await new Promise((resolve, reject) => {
                    plugin_post_requests({
                        UserId: authdata,
                        action: 'get_info'
                    }, (error, response) => {
                        if (error) reject(error);
                        else resolve(response);
                    }, {
                        url: '/api/activity_info/',
                        timeout: 5000
                    });
                });

                if (result.success) {
                    const coins = result.gcoins || 0;
                    const level = Math.floor(coins / 200);
                    document.getElementById('actCoinAmount').textContent = coins.toLocaleString();
                    document.getElementById('actUserLevel').textContent = `Lv.${level}`;
                    document.getElementById('actExpFill').style.width = `${(coins % 200) / 2}%`;
                    document.getElementById('actExpText').textContent = `${coins % 200} / 200`;
                }
            } catch (error) {
                console.error('加载用户信息失败:', error);
            }
        },
        async loadCheckinStatus() {
            try {
                const authdata = await new tmdbaseauthdownyho().writenewwords(userId);
                const result = await new Promise((resolve, reject) => {
                    plugin_post_requests({
                        UserId: authdata,
                        action: 'checkin_status'
                    }, (error, response) => {
                        if (error) reject(error);
                        else resolve(response);
                    }, {
                        url: '/api/activity_checkin/',
                        timeout: 5000
                    });
                });

                if (!result.success) {
                    console.warn('加载签到状态失败:', result.message);
                    return;
                }
                const { checked_in, streak, bonus_today, history } = result;
                document.getElementById('actStreak').textContent = `${streak} 天`;
                const btn = document.getElementById('actCheckinBtn');
                if (checked_in) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-check-circle"></i> 已签到';
                } else {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check"></i> 签到';
                }
                const bonusTip = document.getElementById('actBonusTip');
                if (bonus_today && !checked_in) {
                    bonusTip.style.display = 'block';
                    bonusTip.textContent = `🎉 连签${streak}天额外 +10 G币！`;
                } else {
                    bonusTip.style.display = 'none';
                }
                this._renderCheckinHistory(streak);
            } catch (error) {
                console.warn('加载签到状态失败:', error.message);
            }
        },
        _renderCheckinHistory(streak) {
            const container = document.getElementById('actCheckinHistory');
            if (!container) return;
            container.innerHTML = '';
            const days = ['一', '二', '三', '四', '五', '六', '日'];
            const today = new Date().getDay() || 7;
            for (let i = 6; i >= 0; i--) {
                const day = document.createElement('div');
                day.className = 'checkin-day';
                const date = new Date();
                date.setDate(date.getDate() - i);
                const isToday = (i === 0);
                const isDone = (streak > 0 && i < streak);
                if (isToday) day.classList.add('today');
                if (isDone) day.classList.add('done');
                day.innerHTML = `
            <span class="day-date">${date.getDate()}</span>
            <span class="day-name">${days[(today - i + 6) % 7]}</span>
        `;
                container.appendChild(day);
            }
        },
        async loadCdkHistory() {
            try {
                const authdata = await tmd_newcontroler.writenewwords(userId);
                const result = await new Promise((resolve, reject) => {
                    plugin_post_requests({
                        UserId: authdata,
                        action: 'cdk_history'
                    }, (error, response) => {
                        if (error) reject(error);
                        else resolve(response);
                    }, {
                        url: '/api/activity_cdk/',
                        timeout: 5000
                    });
                });

                const container = document.getElementById('actCdkHistory');
                if (result.success && result.data && result.data.length > 0) {
                    container.innerHTML = result.data.map(item => `
                    <div class="cdk-history-item">
                        <span>${item.code}</span>
                        <span class="cdk-reward">+${item.reward} ${item.item_name}</span>
                        <span style="font-size:11px;color:#555;">${item.use_time}</span>
                    </div>
                `).join('');
                } else {
                    container.innerHTML = '<div style="text-align:center;color:#555;padding:10px;font-size:13px;">暂无兑换记录</div>';
                }
            } catch (error) {
                console.error('加载CDK历史失败:', error);
            }
        },
        async doCheckin() {
            const btn = document.getElementById('actCheckinBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 签到中...';
            try {
                const authdata = await tmd_newcontroler.writenewwords(userId);
                const result = await new Promise((resolve, reject) => {
                    plugin_post_requests({
                        UserId: authdata,
                        action: 'do_checkin'
                    }, (error, response) => {
                        if (error) reject(error);
                        else resolve(response);
                    }, {
                        url: '/api/activity_checkin/',
                        timeout: 10000
                    });
                });

                if (result.success) {
                    let prizeHtml = '';
                    if (result.prize) {
                        prizeHtml = `<p style="color:#ff6b35;font-size:18px;font-weight:bold;margin:6px 0;">${result.prize}</p>`;
                    }
                    Swal.fire({
                        icon: 'success',
                        title: '签到成功！',
                        html: `
            <div style="font-size:48px;margin:10px 0;">🎉</div>
            ${prizeHtml}
            <p>获得 <strong style="color:#ffd700;">+${result.reward} G币</strong></p>
            ${result.bonus > 0 ? `<p style="font-size:13px;color:#888;">连签奖励 +${result.bonus} G币</p>` : ''}
            <p style="font-size:14px;color:#888;">已连续签到 ${result.streak} 天</p>
        `,
                        confirmButtonText: '太棒了'
                    });
                    await this.loadUserInfo();
                    await this.loadCheckinStatus();
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: '签到失败',
                        text: result.message || '未知错误'
                    });
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check"></i> 签到';
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: '网络错误',
                    text: error.message || '请稍后重试'
                });
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> 签到';
            }
        },
        async doRedeemCdk() {
            const input = document.getElementById('actCdkInput');
            const code = input.value.trim().toUpperCase();
            if (!code) {
                Swal.fire({ icon: 'warning', title: '请输入激活码' });
                input.focus();
                return;
            }
            const key = `cdk_${userId}`;
            const result = RateLimit.check(key, 30000);
            if (!result.allowed) {
                Swal.fire({
                    icon: 'warning',
                    title: '操作频繁',
                    text: `请等待 ${result.waitTime} 秒后再试`,
                    timer: 2000,
                    showConfirmButton: false
                });
                return;
            }
            const btn = document.getElementById('actCdkBtn');
            btn.disabled = true;
            btn.textContent = '兑换中...';
            try {
                const authdata = await tmd_newcontroler.writenewwords(userId);
                const result = await new Promise((resolve, reject) => {
                    plugin_post_requests({
                        UserId: authdata,
                        code: code,
                        action: 'redeem'
                    }, (error, response) => {
                        if (error) reject(error);
                        else resolve(response);
                    }, {
                        url: '/api/activity_cdk/',
                        timeout: 10000
                    });
                });

                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '🎉 兑换成功！',
                        html: `
                        <div style="font-size:48px;margin:10px 0;">🎁</div>
                        <p>获得 <strong style="color:#ffd700;">+${result.reward} ${result.item_name}</strong></p>
                    `,
                        confirmButtonText: '太好了'
                    });

                    input.value = '';
                    await this.loadUserInfo();
                    await this.loadCdkHistory();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: '兑换失败',
                        text: result.message || '激活码无效或已使用'
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: '网络错误',
                    text: error.message || '请稍后重试'
                });
            } finally {
                btn.disabled = false;
                btn.textContent = '兑换';
            }
        },
        openGame(gameType) {
            const gameNames = {
                guess: '猜数字',
                dice: '掷骰子',
                blackjack: '21点',
                stock: '竞技答题'
            };
            const currentCoins = parseInt(document.getElementById('actCoinAmount').textContent.replace(/,/g, ''));
            if (currentCoins < 10) {
                Swal.fire({
                    icon: 'warning',
                    title: 'G币不足',
                    text: '至少需要10 G币才能玩游戏，先去签到赚点吧！'
                });
                return;
            }
            if (gameType === 'stock') {
                Swal.fire({
                    icon: 'info',
                    title: '关于',
                    text: '理性娱乐！<游戏联机>仅可在单个会话中发起;支持下注!'
                });
                return false;
            }
            if (YhMokTTisWithin180s(window.qmok_userid_expire)) {
                Swal.fire({
                    icon: 'warning',
                    title: '系统警告',
                    text: '登录凭证将在约3分钟内过期,为保证数据安全和您的使用体验,此操作已被拦截'
                });
                return false;
            }
            Swal.fire({
                title: `进入「${gameNames[gameType]}」`,
                html: `
                <p>当前G币: <strong style="color:#ffd700;">${currentCoins.toLocaleString()}</strong></p>
                <p style="font-size:14px;color:#888;margin-top:8px;">⚠️ 游戏含下注，请理性娱乐</p>
            `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: '进入游戏 🎮',
                cancelButtonText: '再想想'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.open(`/use/activity/games/${gameType}/`, '_blank');
                }
            });
        }
    };
    const LoanController = {
        async loadStatus(t = true) {
            if (t) {
                const key = `mloan_${userId}`;
                const result = RateLimit.check(key, 15000);
                if (!result.allowed) {
                    console.log(`请等待 ${result.waitTime} 秒后刷新`);
                    return null;
                }
            }
            try {
                const authdata = await tmd_newcontroler.writenewwords(userId);
                const result = await new Promise((resolve, reject) => {
                    plugin_post_requests({
                        UserId: authdata,
                        action: 'get_status'
                    }, (error, response) => {
                        if (error) reject(error);
                        else resolve(response);
                    }, {
                        url: '/api/activity_loan/',
                        timeout: 5000
                    });
                });
                if (!result.success) {
                    console.warn('加载借款状态失败:', result.message);
                    return;
                }
                document.getElementById('creditScore').textContent = result.credit;
                document.getElementById('creditLevel').textContent = result.credit_level.label;
                document.getElementById('creditLevel').className = 'credit-level ' + result.credit_level.class;
                document.getElementById('loanAvailable').textContent = result.max_loan;
                if (result.has_active_loan && result.loan) {
                    document.getElementById('loanEmpty').style.display = 'none';
                    document.getElementById('loanActive').style.display = 'block';
                    const loan = result.loan;
                    document.getElementById('loanTotal').textContent = loan.amount;
                    document.getElementById('loanRepaid').textContent = loan.repaid;
                    document.getElementById('loanTime').textContent = loan.loan_time;
                    document.getElementById('loanProgressFill').style.width = loan.progress + '%';
                    document.getElementById('loanProgressText').textContent = loan.progress + '%';
                    const statusEl = document.getElementById('loanStatus');
                    if (loan.repaid >= loan.amount) {
                        statusEl.textContent = '✅ 已还清';
                        statusEl.style.color = '#4CAF50';
                    } else {
                        statusEl.textContent = '🟢 进行中';
                        statusEl.style.color = '#4CAF50';
                    }
                } else {
                    document.getElementById('loanEmpty').style.display = 'block';
                    document.getElementById('loanActive').style.display = 'none';
                }
                document.getElementById('actCoinAmount').textContent = (result.gcoins || 0).toLocaleString();

            } catch (error) {
                console.warn('加载借款状态失败:', error.message);
            }
        },

        async applyLoan() {
            const input = document.getElementById('loanAmountInput');
            const amount = parseInt(input.value);
            if (!amount || amount < 10) {
                Swal.fire({ icon: 'warning', title: '请输入有效的借款金额 (最少10 G币)' });
                input.focus();
                return;
            }
            const key = `mloan_apply_${userId}`;
            const result = RateLimit.check(key, 30000);
            if (!result.allowed) {
                Swal.fire({
                    icon: 'warning',
                    title: '操作频繁',
                    text: `请等待 ${result.waitTime} 秒后再试`,
                    timer: 2000,
                    showConfirmButton: false
                });
                return null;
            }
            const btn = document.getElementById('loanBtn');
            btn.disabled = true;
            btn.textContent = '申请中...';
            try {
                const authdata = await tmd_newcontroler.writenewwords(userId);
                const result = await new Promise((resolve, reject) => {
                    plugin_post_requests({
                        UserId: authdata,
                        amount: amount,
                        action: 'apply'
                    }, (error, response) => {
                        if (error) reject(error);
                        else resolve(response);
                    }, {
                        url: '/api/activity_loan/',
                        timeout: 10000
                    });
                });

                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '💰 借款成功！',
                        html: `
                            <div style="font-size:48px;margin:10px 0;">💳</div>
                            <p>借款 <strong style="color:#ffd700;">${amount} G币</strong></p>
                            <p style="font-size:13px;color:#888;">信用 -2，当前信用 ${result.new_credit}</p>
                            <p style="font-size:12px;color:#666;margin-top:8px;">按时还款可提升信用</p>
                        `,
                        confirmButtonText: '知道了'
                    });

                    input.value = '';
                    await this.loadStatus(false);
                    await ActivityController.loadUserInfo();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: '借款失败',
                        text: result.message
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: '网络错误',
                    text: error.message || '请稍后重试'
                });
            } finally {
                btn.disabled = false;
                btn.textContent = '申请借款';
            }
        },

        async repayLoan() {
            const input = document.getElementById('repayAmountInput');
            const amount = parseInt(input.value);
            if (!amount || amount < 1) {
                Swal.fire({ icon: 'warning', title: '请输入还款金额 (最少1 G币)' });
                input.focus();
                return;
            }
            const key = `mloan_repay_${userId}`;
            const result = RateLimit.check(key, 30000);
            if (!result.allowed) {
                Swal.fire({
                    icon: 'warning',
                    title: '操作频繁',
                    text: `请等待 ${result.waitTime} 秒后再试`,
                    timer: 2000,
                    showConfirmButton: false
                });
                return null;
            }
            const btn = document.getElementById('repayBtn');
            btn.disabled = true;
            btn.textContent = '还款中...';
            try {
                const authdata = await tmd_newcontroler.writenewwords(userId);
                const result = await new Promise((resolve, reject) => {
                    plugin_post_requests({
                        UserId: authdata,
                        amount: amount,
                        action: 'repay'
                    }, (error, response) => {
                        if (error) reject(error);
                        else resolve(response);
                    }, {
                        url: '/api/activity_loan/',
                        timeout: 10000
                    });
                });

                if (result.success) {
                    const icon = result.status === 2 ? 'success' : 'info';
                    Swal.fire({
                        icon: icon,
                        title: result.status === 2 ? '🎉 借款已还清！' : '还款成功',
                        html: `
                            <p>${result.message}</p>
                            ${result.status === 2 ? '<p style="font-size:48px;margin:10px 0;">🎊</p>' : ''}
                            ${result.remaining > 0 ? `<p style="font-size:13px;color:#888;">剩余还款: ${result.remaining} G币</p>` : ''}
                        `,
                        confirmButtonText: '确定'
                    });

                    input.value = '';
                    await this.loadStatus();
                    await ActivityController.loadUserInfo();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: '还款失败',
                        text: result.message
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: '网络错误',
                    text: error.message || '请稍后重试'
                });
            } finally {
                btn.disabled = false;
                btn.textContent = '还款';
            }
        }
    };
    document.getElementById('activityCenterBtn').addEventListener('click', () => {
        ActivityController.open();
    });
    document.getElementById('closeActivityBtn').addEventListener('click', () => {
        ActivityController.close();
    });
    document.getElementById('activityModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            ActivityController.close();
        }
    });
    document.querySelectorAll('.activity-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.activity-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const tabName = this.dataset.tab;
            document.querySelectorAll('.activity-pane').forEach(p => p.classList.remove('active'));
            document.getElementById(`pane-${tabName}`).classList.add('active');
            if (tabName === 'loan') {
                LoanController.loadStatus();
            }
        });
    });
    document.getElementById('actCheckinBtn').addEventListener('click', () => {
        ActivityController.doCheckin();
    });
    document.getElementById('actCdkBtn').addEventListener('click', () => {
        ActivityController.doRedeemCdk();
    });
    document.getElementById('actCdkInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            ActivityController.doRedeemCdk();
        }
    });
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function () {
            ActivityController.openGame(this.dataset.game);
        });
    });
    document.getElementById('loanBtn').addEventListener('click', () => {
        LoanController.applyLoan();
    });

    document.getElementById('repayBtn').addEventListener('click', () => {
        LoanController.repayLoan();
    });

    document.getElementById('loanAmountInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            LoanController.applyLoan();
        }
    });

    document.getElementById('repayAmountInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            LoanController.repayLoan();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
            e.preventDefault();
            const modal = document.getElementById('activityModal');
            if (modal.style.display === 'flex') {
                ActivityController.close();
            } else {
                ActivityController.open();
            }
        }
    });
})();