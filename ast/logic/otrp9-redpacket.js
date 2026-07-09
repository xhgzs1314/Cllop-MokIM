(function () {
    'use strict';
    let loan_active_is_fucking = false;
    const RedPacketRateLimiter = (function () {
        const lastRequestTime = new Map();
        const RATE_LIMIT_INTERVAL = 5000;
        let isRequesting = false;
        return {
            canRequest(key) {
                const now = Date.now();
                const lastTime = lastRequestTime.get(String(key));
                if (lastTime && (now - lastTime) < RATE_LIMIT_INTERVAL) {
                    const waitSeconds = Math.ceil((RATE_LIMIT_INTERVAL - (now - lastTime)) / 1000);
                    return { allowed: false, waitSeconds, message: `操作过于频繁，请等待 ${waitSeconds} 秒后重试` };
                }
                return { allowed: true };
            },
            recordRequest(key) {
                lastRequestTime.set(String(key), Date.now());
            },
            acquireLock() {
                if (isRequesting) return false;
                isRequesting = true;
                return true;
            },
            releaseLock() {
                isRequesting = false;
            },
            isLocked() {
                return isRequesting;
            },
            cleanup(maxAge = 60000) {
                const now = Date.now();
                for (const [key, time] of lastRequestTime.entries()) {
                    if (now - time > maxAge) {
                        lastRequestTime.delete(key);
                    }
                }
            }
        };
    })();
    setInterval(() => {
        RedPacketRateLimiter.cleanup();
    }, 60000);
    const SEND_MODAL_ID = 'rpSendModal';
    const DETAIL_MODAL_ID = 'rpDetailModal';
    let sendModal = null;
    let detailModal = null;
    let currentDetailPacketId = null;
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatTime(time) {
        if (!time) return '未知时间';
        const date = new Date(time);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (targetDay.getTime() === today.getTime()) {
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        if (targetDay.getTime() === yesterday.getTime()) {
            return '昨天';
        }
        return date.toLocaleDateString('zh-CN');
    }

    function generatePacketNo() {
        const now = new Date();
        const dateStr = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const timeStr = String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0');
        return `RP${dateStr}${timeStr}${random}`;
    }


    function createSendModal() {
        if (document.getElementById(SEND_MODAL_ID)) {
            return document.getElementById(SEND_MODAL_ID);
        }
        return null;
    }

    function initSendModalEvents() {
        const modal = document.getElementById(SEND_MODAL_ID);
        if (!modal) return;
        const closeBtn = modal.querySelector('#rpSendCloseBtn');
        const cancelBtn = modal.querySelector('#rpSendCancelBtn');
        const confirmBtn = modal.querySelector('#rpSendConfirmBtn');
        const hideModal = () => {
            modal.style.display = 'none';
        };
        closeBtn.addEventListener('click', hideModal);
        cancelBtn.addEventListener('click', hideModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal();
            }
        });
        const typeBtns = modal.querySelectorAll('.rp-send-type-btn');
        typeBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                typeBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                updateSendModalHint();
            });
        });
        const blessingInput = modal.querySelector('#rpBlessing');
        const counter = modal.querySelector('#rpBlessingCounter');
        if (blessingInput && counter) {
            blessingInput.addEventListener('input', function () {
                const len = this.value.length;
                counter.textContent = `${len}/30`;
                if (len > 30) {
                    counter.style.color = '#f56c6c';
                } else {
                    counter.style.color = '#94a3b8';
                }
            });
            blessingInput.addEventListener('blur', function () {
                if (this.value.length > 30) {
                    this.value = this.value.substring(0, 30);
                    counter.textContent = `30/30`;
                    counter.style.color = '#94a3b8';
                }
            });
        }
        confirmBtn.addEventListener('click', handleSendRedPacket);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                hideModal();
            }
        });
    }

    function updateSendModalHint() {
        const modal = document.getElementById(SEND_MODAL_ID);
        if (!modal) return;
        const activeType = modal.querySelector('.rp-send-type-btn.active');
        const type = activeType ? activeType.dataset.type : 'random';
        const hint = modal.querySelector('.rp-send-hint');
        if (hint) {
            if (type === 'random') {
                hint.textContent = '拼手气红包，每人领取金额随机';
            } else {
                hint.textContent = '平均红包，每人领取金额相同';
            }
        }
    }

    async function handleSendRedPacket() {
        const modal = document.getElementById(SEND_MODAL_ID);
        if (!modal) return;
        const confirmBtn = modal.querySelector('#rpSendConfirmBtn');
        const amountInput = modal.querySelector('#rpTotalAmount');
        const countInput = modal.querySelector('#rpTotalCount');
        const blessingInput = modal.querySelector('#rpBlessing');
        const activeType = modal.querySelector('.rp-send-type-btn.active');
        const amount = parseInt(amountInput.value);
        const count = parseInt(countInput.value);
        const blessing = blessingInput.value.trim() || '恭喜发财，大吉大利';
        if (!amount || amount < 1) {
            alertMsg('请输入有效的红包总金额（至少 1 G币）');
            amountInput.focus();
            return;
        }

        if (!count || count < 1) {
            alertMsg('请输入有效的红包个数（至少 1 个）');
            countInput.focus();
            return;
        }

        if (count > 100) {
            alertMsg('红包个数不能超过 100 个');
            countInput.focus();
            return;
        }
        const type = activeType ? activeType.dataset.type : 'random';
        if (type === 'average' && amount < count) {
            alertMsg(`平均红包每人至少 1 G币，总金额至少 ${count} G币`);
            amountInput.focus();
            return;
        }
        if (!appState.selectedContact || !appState.selectedContact.isGroup) {
            alertMsg('请在群聊中发送红包');
            return;
        }
        if (loan_active_is_fucking) {
            alertMsg("您的信誉分过低,暂不支持发红包");
            return;
        }
        const limitKey = `send_${appState.userId}`;
        const check = RedPacketRateLimiter.canRequest(limitKey);
        if (!check.allowed) {
            alertMsg(check.message);
            return;
        }

        if (!RedPacketRateLimiter.acquireLock()) {
            alertMsg('正在处理中，请稍后...');
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 发送中...';

        try {
            RedPacketRateLimiter.recordRequest(limitKey);
            const packetNo = generatePacketNo();
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            const result = await new Promise((resolve, reject) => {
                plugin_post_requests({
                    dfid: authdatas,
                    group_id: appState.selectedContact.group_id || appState.selectedContact.contactId,
                    packet_no: packetNo,
                    total_amount: amount,
                    total_count: count,
                    blessing: blessing,
                    type: type === 'random' ? 1 : 2
                }, (error, response) => {
                    if (error) {
                        reject(error);
                    } else if (response && response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response?.message || '发送红包失败'));
                    }
                }, {
                    url: '/api/redpacket/create/',
                    timeout: 15000
                });
            });
            const messageContent = {
                messageType: 'redpacket',
                content: {
                    text: `🧧 ${blessing}`,
                    packetId: result.packet_id,
                    packetNo: packetNo,
                    totalAmount: amount,
                    totalCount: count,
                    blessing: blessing,
                    type: type
                }
            };
            if (typeof sendGroupMessage === 'function') {
                await sendGroupMessage(messageContent);
            } else {
                alertMsg('红包发送失败！客户端异常');
            }
            await updateUserBalance();
            modal.style.display = 'none';
            const animate_sendredpacket = function (gcoinsset) {
                mokim_AnimationEngine.play('redpacket', null, {
                    type: 'both',
                    coinAmount: gcoinsset,
                    intimacyAmount: 9,
                    duration: 1500,
                    coinColor: '#FF2D2D',
                    intimacyColor: '#FFD700'
                });
            };
            Swal.fire({
                icon: 'success',
                title: '🎉 红包已发送！',
                html: `
        <div style="text-align: center; padding: 10px 0;">
            <div style="font-size: 14px; color: #666;">🧧 ${escapeHtml(blessing)}</div>
            <div style="font-size: 18px; font-weight: 600; color: #f43f5e; margin-top: 6px;">
                ${amount} G币 × ${count} 个
            </div>
            <div style="font-size: 12px; color: #999; margin-top: 6px;">
                ${type === 'random' ? '🎲 拼手气红包' : '📊 平均红包'}
            </div>
        </div>
    `,
                confirmButtonText: '好的',
                confirmButtonColor: '#f43f5e',
                timer: 3000,
                timerProgressBar: true
            }).then((result) => {
                if (result.isConfirmed) {
                    animate_sendredpacket(amount);
                } else if (result.dismiss === Swal.DismissReason.timer) {
                    animate_sendredpacket(amount);
                }
            });

        } catch (error) {
            alertMsg(`发送红包失败：${error.message}`);
            console.error('发送红包失败:', error);
        } finally {
            RedPacketRateLimiter.releaseLock();
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-hand-holding-heart"></i> 塞钱进红包';
        }
    }

    async function updateUserBalance() {
        const balanceEl = document.getElementById('rpUserBalance');
        if (!balanceEl) return;
        try {
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            const result = await new Promise((resolve, reject) => {
                plugin_post_requests({
                    dfid: authdatas
                }, (error, response) => {
                    if (error) {
                        reject(error);
                    } else if (response && response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response?.message || '获取余额失败'));
                    }
                }, {
                    url: '/api/redpacket/get_gcoin_balance/',
                    timeout: 10000
                });
            });

            const balance = result.balance || 0;
            loan_active_is_fucking = result.loan_active || false;
            if (loan_active_is_fucking) {
                alertMsg('您的信誉分过低,暂时无法发送红包');
            }
            balanceEl.textContent = `${balance} G币`;
            balanceEl.style.color = balance >= 10 ? '#ffd700' : '#f56c6c';

        } catch (error) {
            console.error('获取余额失败:', error);
            balanceEl.textContent = '获取失败';
            balanceEl.style.color = '#f56c6c';
        }
    }


    function createDetailModal() {
        if (document.getElementById(DETAIL_MODAL_ID)) {
            return document.getElementById(DETAIL_MODAL_ID);
        }
        return null;
    }

    function initDetailModalEvents() {
        const modal = document.getElementById(DETAIL_MODAL_ID);
        if (!modal) return;

        const closeBtn = modal.querySelector('#rpDetailCloseBtn');
        const grabBtn = modal.querySelector('#rpDetailGrabBtn');

        const hideModal = () => {
            modal.style.display = 'none';
            currentDetailPacketId = null;
        };

        closeBtn.addEventListener('click', hideModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal();
            }
        });
        grabBtn.addEventListener('click', handleGrabRedPacket);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                hideModal();
            }
        });
    }
    window.mokim_openRedPacketDetail = async function (packetId, messageData) {
        if (!packetId) {
            console.error('红包ID不能为空');
            return;
        }
        const limitKey = `detail_${packetId}`;
        const check = RedPacketRateLimiter.canRequest(limitKey);
        if (!check.allowed) {
            alertMsg(check.message);
            return;
        }
        if (RedPacketRateLimiter.isLocked()) {
            alertMsg('正在处理中，请稍后...');
            return;
        }
        RedPacketRateLimiter.recordRequest(limitKey);
        RedPacketRateLimiter.acquireLock();
        try {
            const modal = document.getElementById(DETAIL_MODAL_ID);
            if (!modal) return;
            currentDetailPacketId = packetId;
            const statusEl = modal.querySelector('#rpDetailStatus');
            const grabBtn = modal.querySelector('#rpDetailGrabBtn');
            const grabResult = modal.querySelector('#rpDetailGrabResult');
            const recordsList = modal.querySelector('#rpDetailRecordsList');
            if (statusEl) {
                statusEl.textContent = '⏳ 加载红包信息...';
                statusEl.className = 'rp-detail-status';
            }
            grabBtn.disabled = true;
            grabBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 加载中...';
            grabResult.style.display = 'none';
            recordsList.innerHTML = '<div class="rp-detail-empty-records"><i class="fas fa-spinner fa-pulse"></i> 加载中...</div>';
            modal.style.display = 'flex';
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            const result = await new Promise((resolve, reject) => {
                plugin_post_requests({
                    dfid: authdatas,
                    packet_id: packetId
                }, (error, response) => {
                    if (error) {
                        reject(error);
                    } else if (response && response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response?.message || '获取红包信息失败'));
                    }
                }, {
                    url: '/api/redpacket/detail/',
                    timeout: 15000
                });
            });
            renderRedPacketDetail(result, modal);
        } catch (error) {
            console.error('获取红包详情失败:', error);
            alertMsg(`加载失败：${error.message}`);
            const modal = document.getElementById(DETAIL_MODAL_ID);
            if (modal) {
                modal.style.display = 'none';
            }
        } finally {
            RedPacketRateLimiter.releaseLock();
        }
    };

    function renderRedPacketDetail(data, modal) {
        if (!modal) modal = document.getElementById(DETAIL_MODAL_ID);
        if (!modal || !data) return;
        const {
            packet_id,
            packet_no,
            sender_name,
            sender_id,
            blessing,
            total_amount,
            total_count,
            remain_amount,
            remain_count,
            type,
            status,
            expire_time,
            create_time,
            records = [],
            user_grab_amount,
            is_grab
        } = data;
        const blessingEl = modal.querySelector('#rpDetailBlessing');
        const senderEl = modal.querySelector('#rpDetailSenderName');
        const totalAmountEl = modal.querySelector('#rpDetailTotalAmount');
        const totalCountEl = modal.querySelector('#rpDetailTotalCount');
        const remainCountEl = modal.querySelector('#rpDetailRemainCount');
        const statusEl = modal.querySelector('#rpDetailStatus');
        const recordsCountEl = modal.querySelector('#rpDetailRecordsCount');
        const recordsListEl = modal.querySelector('#rpDetailRecordsList');
        if (blessingEl) blessingEl.textContent = blessing || '恭喜发财，大吉大利';
        if (senderEl) senderEl.textContent = sender_name || sender_id || '未知用户';
        if (totalAmountEl) totalAmountEl.textContent = `${total_amount} G币`;
        if (totalCountEl) totalCountEl.textContent = `${total_count} 个`;
        if (remainCountEl) remainCountEl.textContent = `${remain_count} 个`;
        const statusMap = {
            1: { text: '🟢 有效，等待领取', class: '' },
            2: { text: '🎉 已全部领完', class: 'success' },
            3: { text: '⏰ 已过期', class: 'expired' },
            4: { text: '↩️ 已退款', class: 'expired' }
        };
        const statusInfo = statusMap[status] || statusMap[1];
        if (statusEl) {
            statusEl.textContent = statusInfo.text;
            statusEl.className = `rp-detail-status ${statusInfo.class}`;
        }
        const hasGrabbed = is_grab === true || (user_grab_amount !== null && user_grab_amount !== undefined);
        const grabBtn = modal.querySelector('#rpDetailGrabBtn');
        const grabResult = modal.querySelector('#rpDetailGrabResult');
        const grabAmountEl = modal.querySelector('#rpDetailGrabAmount');
        if (hasGrabbed && user_grab_amount !== undefined && user_grab_amount !== null) {
            grabBtn.textContent = '✅ 已领取';
            grabBtn.disabled = true;
            grabBtn.className = 'rp-detail-grab-btn grabbed';
            grabResult.style.display = 'inline-flex';
            if (grabAmountEl) grabAmountEl.textContent = user_grab_amount;
        } else if (status === 2) {
            grabBtn.textContent = '🎯 已抢完';
            grabBtn.disabled = true;
            grabBtn.className = 'rp-detail-grab-btn expired';
            grabResult.style.display = 'none';
        } else if (status === 3 || status === 4) {
            grabBtn.textContent = '⏰ 已过期';
            grabBtn.disabled = true;
            grabBtn.className = 'rp-detail-grab-btn expired';
            grabResult.style.display = 'none';
        } else if (remain_count <= 0) {
            grabBtn.textContent = '🎯 已抢完';
            grabBtn.disabled = true;
            grabBtn.className = 'rp-detail-grab-btn expired';
            grabResult.style.display = 'none';
        } else {
            grabBtn.textContent = '🧧 抢红包';
            grabBtn.disabled = false;
            grabBtn.className = 'rp-detail-grab-btn';
            grabBtn.dataset.packetId = packet_id;
            grabResult.style.display = 'none';
        }
        if (recordsCountEl) {
            recordsCountEl.textContent = `${records.length} 人已领`;
        }

        if (recordsListEl) {
            if (records.length === 0) {
                recordsListEl.innerHTML = `
                    <div class="rp-detail-empty-records">
                        <i class="fas fa-inbox"></i>
                        <span>还没有人领取</span>
                    </div>
                `;
            } else {
                let html = '';
                const sortedRecords = [...records].sort((a, b) => a.receive_time - b.receive_time);
                sortedRecords.forEach(record => {
                    const isLuckiest = record.is_luckiest === 1;
                    const avatarText = (record.user_name || record.user_id || 'U').charAt(0).toUpperCase();
                    const timeStr = formatTime(record.receive_time);

                    html += `
                        <div class="rp-detail-record-item">
                            <div class="rp-detail-record-user">
                                <div class="rp-detail-record-avatar">${escapeHtml(avatarText)}</div>
                                <span class="rp-detail-record-name">${escapeHtml(record.user_name || record.user_id || '未知用户')}</span>
                            </div>
                            <span class="rp-detail-record-amount ${isLuckiest ? 'luckiest' : ''}">
                                ${isLuckiest ? '👑 ' : ''}+${record.amount} G币
                            </span>
                        </div>
                    `;
                });
                recordsListEl.innerHTML = html;
            }
        }
        if (hasGrabbed && user_grab_amount !== undefined && user_grab_amount !== null) {
            grabResult.style.display = 'inline-flex';
            if (grabAmountEl) grabAmountEl.textContent = user_grab_amount;
        }
    }
    async function handleGrabRedPacket() {
        const modal = document.getElementById(DETAIL_MODAL_ID);
        if (!modal) return;
        const grabBtn = modal.querySelector('#rpDetailGrabBtn');
        const packetId = currentDetailPacketId;
        if (!packetId) {
            alertMsg('红包信息无效');
            return;
        }
        if (loan_active_is_fucking) {
            alertMsg("您的信誉分过低,暂不支持领取红包");
            return;
        }
        const limitKey = `grab_${packetId}`;
        const check = RedPacketRateLimiter.canRequest(limitKey);
        if (!check.allowed) {
            alertMsg(check.message);
            return;
        }
        if (RedPacketRateLimiter.isLocked()) {
            alertMsg('正在处理中，请稍后...');
            return;
        }
        RedPacketRateLimiter.recordRequest(limitKey);
        RedPacketRateLimiter.acquireLock();
        grabBtn.disabled = true;
        grabBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 抢红包中...';
        try {
            const authdatas = await tmd_newcontroler.writenewwords(appState.userId);
            const result = await new Promise((resolve, reject) => {
                plugin_post_requests({
                    dfid: authdatas,
                    packet_id: packetId
                }, (error, response) => {
                    if (error) {
                        reject(error);
                    } else if (response && response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response?.message || '领取红包失败'));
                    }
                }, {
                    url: '/api/redpacket/grab/',
                    timeout: 15000
                });
            });
            const grabResult = modal.querySelector('#rpDetailGrabResult');
            const grabAmountEl = modal.querySelector('#rpDetailGrabAmount');
            if (grabResult && grabAmountEl) {
                grabResult.style.display = 'inline-flex';
                grabAmountEl.textContent = result.amount || 0;
            }
            grabBtn.textContent = '已领取';
            grabBtn.className = 'rp-detail-grab-btn grabbed';
            grabBtn.disabled = true;
            setTimeout(async () => {
                try {
                    const newAuth = await tmd_newcontroler.writenewwords(appState.userId);
                    const newResult = await new Promise((resolve, reject) => {
                        plugin_post_requests({
                            dfid: newAuth,
                            packet_id: packetId
                        }, (error, response) => {
                            if (error) {
                                reject(error);
                            } else if (response && response.success) {
                                resolve(response.data);
                            } else {
                                reject(new Error(response?.message || '刷新失败'));
                            }
                        }, {
                            url: '/api/redpacket/detail/',
                            timeout: 10000
                        });
                    });
                    renderRedPacketDetail(newResult, modal);
                } catch (e) {
                    console.warn('刷新红包详情失败:', e);
                }
            }, 500);
            const amount = result.amount || 0;
            const isLuckiest = result.is_luckiest === 1;
            const animate_sendredpacket = function (gcoinsset, conts) {
                mokim_AnimationEngine.play('redpacket', conts, {
                    type: 'both',
                    coinAmount: gcoinsset,
                    intimacyAmount: 9,
                    duration: 1500,
                    coinColor: '#FF2D2D',
                    intimacyColor: '#FFD700'
                });
            };
            Swal.fire({
                icon: 'success',
                title: isLuckiest ? '👑 手气最佳！' : '🧧 恭喜抢到红包！',
                html: `
                    <div style="text-align: center; padding: 10px 0;">
                        <div style="font-size: 48px; margin-bottom: 10px;">${isLuckiest ? '👑' : '🧧'}</div>
                        <div style="font-size: 36px; font-weight: 700; color: #f43f5e;">
                            +${amount} G币
                        </div>
                        ${isLuckiest ? '<div style="font-size: 14px; color: #ffd700; margin-top: 6px;">🌟 手气最佳，运气爆棚！</div>' : ''}
                    </div>
                `,
                confirmButtonText: '太棒了！',
                confirmButtonColor: '#f43f5e',
                timer: 3000,
                timerProgressBar: true
            }).then((result) => {
                if (result.isConfirmed) {
                    animate_sendredpacket(amount, document.getElementById(DETAIL_MODAL_ID));
                } else if (result.dismiss === Swal.DismissReason.timer) {
                    animate_sendredpacket(amount, document.getElementById(DETAIL_MODAL_ID));
                }
            });

        } catch (error) {
            alertMsg(`领取红包失败：${error.message}`);
            grabBtn.disabled = false;
            grabBtn.textContent = '🧧 抢红包';
            grabBtn.className = 'rp-detail-grab-btn';
        } finally {
            RedPacketRateLimiter.releaseLock();
        }
    }
    window.mokim_renderRedPacketMessage = function (msg, bubble) {
        if (!bubble) return;
        const content = msg.content?.text || {};
        const packetId = content.packetId || content.packet_id;
        const blessing = content.blessing || '恭喜发财，大吉大利';
        const totalAmount = content.totalAmount || content.total_amount || 0;
        const totalCount = content.totalCount || content.total_count || 0;
        const type = content.type || 1;
        const isSelf = msg.isSelf || false;
        const typeText = type === 1 ? '拼手气' : '平均';
        const statusText = msg.isSelf ? '已发送' : '点击领取';
        bubble.innerHTML = `
            <div class="message-redpacket" data-packet-id="${packetId}" style="cursor: pointer;">
                <div class="rp-message-card" style="
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 12px 18px;
                    min-width: 200px;
                    max-width: 280px;
                    background: ${isSelf ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' : 'linear-gradient(135deg, #fff5f5, #fee8e8)'};
                    border-radius: 14px;
                    border: 1px solid ${isSelf ? '#fca5a5' : '#fecaca'};
                    box-shadow: 0 2px 12px rgba(244, 63, 94, 0.15);
                    transition: all 0.25s ease;
                ">
                    <div style="font-size: 36px; flex-shrink: 0; line-height: 1;">
                        🧧
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 15px; color: #1e293b;">
                            ${escapeHtml(blessing)}
                        </div>
                        <div style="font-size: 13px; color: #f43f5e; font-weight: 500;">
                            💰 ${totalAmount} G币 × ${totalCount} 个
                        </div>
                        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                            ${isSelf ? '📤 已发送' : '📥 点击领取'}
                            · ${typeText}
                        </div>
                    </div>
                    <div style="font-size: 14px; color: #f43f5e; flex-shrink: 0;">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
        `;
        const card = bubble.querySelector('.message-redpacket');
        if (card && packetId) {
            card.addEventListener('click', function (e) {
                e.stopPropagation();
                if (window.mokim_openRedPacketDetail) {
                    window.mokim_openRedPacketDetail(packetId, msg);
                } else {
                    alertMsg('红包功能未加载，请刷新页面');
                }
            });
            const innerCard = card.querySelector('.rp-message-card');
            if (innerCard) {
                innerCard.addEventListener('mouseenter', function () {
                    this.style.transform = 'scale(1.02)';
                    this.style.boxShadow = '0 4px 20px rgba(244, 63, 94, 0.25)';
                });
                innerCard.addEventListener('mouseleave', function () {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = '0 2px 12px rgba(244, 63, 94, 0.15)';
                });
            }
        }
    };
    function init() {
        sendModal = createSendModal();
        detailModal = createDetailModal();
        initSendModalEvents();
        initDetailModalEvents();
        const redPacketBtn = document.querySelector('.redpacket-btn');
        if (redPacketBtn) {
            redPacketBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!appState.selectedContact || !appState.selectedContact.isGroup) {
                    alertMsg('请在群聊中发送红包');
                    return;
                }
                const modal = document.getElementById(SEND_MODAL_ID);
                if (modal) {
                    updateUserBalance();
                    updateSendModalHint();
                    modal.style.display = 'flex';
                    const amountInput = modal.querySelector('#rpTotalAmount');
                    if (amountInput) {
                        setTimeout(() => amountInput.focus(), 100);
                    }
                }
            });
        }
    }
    function updateRedPacketButtonVisibility(contact) {
        const btn = document.querySelector('.redpacket-btn');
        if (!btn) return;
        const isGroup = contact?.isGroup || false;
        if (isGroup) {
            btn.style.display = 'inline-flex';
        } else {
            btn.style.display = 'none';
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();