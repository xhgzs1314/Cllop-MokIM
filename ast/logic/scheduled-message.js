(function () {
    let scheduledMessageModal = null;
    let currentScheduleId = null;
    async function showScheduledMessageDialog() {
        if (!appState.selectedContact) {
            alertMsg('请先选择一个联系人');
            return;
        }
        const { contactId, uname, friendAlias, conversationId } = appState.selectedContact;
        const displayName = friendAlias || uname || '该联系人';
        const minDateTime = new Date(Date.now() + 5 * 60 * 1000);
        const minDateTimeStr = minDateTime.toISOString().slice(0, 16);
        const modalHtml = `
            <div id="scheduledMsgModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 10001; display: flex; align-items: center; justify-content: center;">
                <div style="background: #fff; border-radius: 28px; width: 90%; max-width: 500px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 25px 45px -12px rgba(0,0,0,0.25); animation: modalFadeIn 0.2s ease-out;">
                    <style>
                        @keyframes modalFadeIn {
                            from { opacity: 0; transform: scale(0.96); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    </style>
                    <div style="padding: 20px 24px; border-bottom: 1px solid #f0f2f5; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b;">
                            <i class="fas fa-clock" style="margin-right: 10px; color: #10b981; font-size: 18px;"></i>
                            定时发送消息
                        </h3>
                        <button id="closeScheduledModalBtn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#f1f5f9'; this.style.color='#1e293b';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='#94a3b8';">&times;</button>
                    </div>
                    <div style="flex: 1; overflow-y: auto; padding: 20px 24px;"
     id="scheduledMsgScrollArea">
    <style>
        #scheduledMsgScrollArea::-webkit-scrollbar {
            width: 6px;
        }
        #scheduledMsgScrollArea::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
        }
        #scheduledMsgScrollArea::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
        }
        #scheduledMsgScrollArea::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
    </style>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px; color: #334155;">发送给</label>
                            <div style="padding: 12px 16px; background: #f8fafc; border-radius: 16px; color: #1e293b; font-weight: 500; border: 1px solid #e2e8f0;">
                                <i class="fas fa-user" style="margin-right: 8px; color: #10b981; font-size: 13px;"></i>
                                ${escapeHtml(displayName)}
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px; color: #334155;">消息内容 <span style="color: #ef4444;">*</span></label>
                            <textarea id="scheduledMsgContent" placeholder="请输入要定时发送的消息内容" rows="4" style="width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 16px; font-size: 14px; font-family: inherit; resize: vertical; transition: all 0.2s; background: #fff;" onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.1)';" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';"></textarea>
                            <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">最多500个字</div>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px; color: #334155;">发送时间 <span style="color: #ef4444;">*</span></label>
                            <input type="datetime-local" id="scheduledMsgTime" min="${minDateTimeStr}" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 16px; font-size: 14px; font-family: inherit; transition: all 0.2s;" onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.1)';" onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';">
                            <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">至少3分钟后</div>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px; color: #334155;">重复发送</label>
                            <select id="scheduledMsgRepeat" style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 16px; font-size: 14px; font-family: inherit; background: #fff; cursor: pointer;">
                                <option value="none">不重复（单次发送）</option>
                                <option value="daily">每天</option>
                                <option value="weekly">每周</option>
                                <option value="monthly">每月</option>
                            </select>
                        </div>
                        
                        <div id="weeklyDaysContainer" style="display: none; margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 10px; font-weight: 500; font-size: 14px; color: #334155;">选择每周重复的日期</label>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <label style="display: flex; align-items: center; gap: 6px; background: #f8fafc; padding: 6px 14px; border-radius: 40px; border: 1px solid #e2e8f0; font-size: 13px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#10b981';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0';"><input type="checkbox" value="1" style="margin: 0; accent-color: #10b981;"> 周一</label>
                                <label style="display: flex; align-items: center; gap: 6px; background: #f8fafc; padding: 6px 14px; border-radius: 40px; border: 1px solid #e2e8f0; font-size: 13px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#10b981';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0';"><input type="checkbox" value="2" style="margin: 0; accent-color: #10b981;"> 周二</label>
                                <label style="display: flex; align-items: center; gap: 6px; background: #f8fafc; padding: 6px 14px; border-radius: 40px; border: 1px solid #e2e8f0; font-size: 13px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#10b981';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0';"><input type="checkbox" value="3" style="margin: 0; accent-color: #10b981;"> 周三</label>
                                <label style="display: flex; align-items: center; gap: 6px; background: #f8fafc; padding: 6px 14px; border-radius: 40px; border: 1px solid #e2e8f0; font-size: 13px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#10b981';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0';"><input type="checkbox" value="4" style="margin: 0; accent-color: #10b981;"> 周四</label>
                                <label style="display: flex; align-items: center; gap: 6px; background: #f8fafc; padding: 6px 14px; border-radius: 40px; border: 1px solid #e2e8f0; font-size: 13px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#10b981';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0';"><input type="checkbox" value="5" style="margin: 0; accent-color: #10b981;"> 周五</label>
                                <label style="display: flex; align-items: center; gap: 6px; background: #f8fafc; padding: 6px 14px; border-radius: 40px; border: 1px solid #e2e8f0; font-size: 13px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#10b981';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0';"><input type="checkbox" value="6" style="margin: 0; accent-color: #10b981;"> 周六</label>
                                <label style="display: flex; align-items: center; gap: 6px; background: #f8fafc; padding: 6px 14px; border-radius: 40px; border: 1px solid #e2e8f0; font-size: 13px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#10b981';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0';"><input type="checkbox" value="7" style="margin: 0; accent-color: #10b981;"> 周日</label>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 16px 24px; border-top: 1px solid #f0f2f5; display: flex; justify-content: flex-end; gap: 12px;">
                        <button id="cancelScheduledBtn" style="padding: 8px 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 40px; font-size: 14px; font-weight: 500; cursor: pointer; color: #475569; transition: all 0.2s;" onmouseover="this.style.background='#f8fafc'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.background='#fff'; this.style.borderColor='#e2e8f0';">取消</button>
                        <button id="confirmScheduledBtn" style="padding: 8px 20px; background: #10b981; color: #fff; border: none; border-radius: 40px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" onmouseover="this.style.background='#059669'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(16,185,129,0.3)';" onmouseout="this.style.background='#10b981'; this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)';">确认添加</button>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('scheduledMsgModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('scheduledMsgModal');
        const closeBtn = document.getElementById('closeScheduledModalBtn');
        const cancelBtn = document.getElementById('cancelScheduledBtn');
        const confirmBtn = document.getElementById('confirmScheduledBtn');
        const repeatSelect = document.getElementById('scheduledMsgRepeat');
        const weeklyContainer = document.getElementById('weeklyDaysContainer');

        modal.style.display = 'flex';

        const closeModal = () => {
            modal.style.display = 'none';
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });


        repeatSelect.addEventListener('change', (e) => {
            weeklyContainer.style.display = e.target.value === 'weekly' ? 'block' : 'none';
        });

        confirmBtn.addEventListener('click', async () => {
            const content = document.getElementById('scheduledMsgContent').value.trim();
            const scheduleTimeStr = document.getElementById('scheduledMsgTime').value;
            const repeatType = repeatSelect.value;
            if (!content) {
                alertMsg('请输入消息内容');
                return;
            }
            if (content.length > 500) {
                alertMsg('消息内容不能超过500个字');
                return;
            }
            if (!scheduleTimeStr) {
                alertMsg('请选择发送时间');
                return;
            }

            const scheduleTime = new Date(scheduleTimeStr).getTime();
            const minTime = Date.now() + 3 * 60 * 1000;
            if (scheduleTime < minTime) {
                alertMsg('发送时间至少要在3分钟后');
                return;
            }
            let repeatDays = [];
            if (repeatType === 'weekly') {
                document.querySelectorAll('#weeklyDaysContainer input[type="checkbox"]:checked').forEach(cb => {
                    repeatDays.push(parseInt(cb.value));
                });
                if (repeatDays.length === 0) {
                    alertMsg('请选择至少一个重复日期');
                    return;
                }
            }
            if (!appState.isConnected || !appState.ws || appState.ws.readyState !== WebSocket.OPEN) {
                alertMsg('连接已断开，请刷新页面重试');
                return;
            }
            const isGroup = conversationId.startsWith('group_');
            let finalContent = content;
            let chainHash = null;
            let chainPrevHash = null;
            if (!isGroup) {
                const tempMessage = {
                    messageId: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 10)}`,
                    conversationId: conversationId,
                    senderId: appState.userId,
                    receiverId: contactId,
                    messageType: 'text',
                    content: { text: content },
                    sendTime: Date.now()
                };

                try {
                    const hashed = await hashy_addHashToMessage(tempMessage);
                    chainHash = hashed.chain_hash;
                    chainPrevHash = hashed.chain_prev_hash;
                    finalContent = {
                        text: content,
                        chain_prev_hash: chainPrevHash,
                        chain_hash: chainHash
                    };
                } catch (error) {
                    console.error('计算哈希链失败:', error);
                    finalContent = { text: content };
                }
            } else {
                finalContent = { text: content };
            }

            const messageData = {
                type: 'add_scheduled_message',
                data: {
                    receiverId: contactId,
                    conversationId: conversationId,
                    messageType: 'text',
                    content: finalContent,
                    scheduleTime: scheduleTime,
                    repeatType: repeatType,
                    repeatDays: repeatDays,
                    hasChainHash: !isGroup && chainHash !== null
                }
            };

            Loading.show('正在添加定时消息...');
            appState.ws.send(JSON.stringify(messageData));
            const handleResponse = async (event) => {
                try {
                    const response = JSON.parse(event.data);
                    if (response.type === 'scheduled_message_added') {
                        Loading.hide();
                        alertMsg('定时消息已添加成功');
                        const scheduleId = response.data.scheduleId;
                        const localMessage = {
                            messageId: scheduleId,
                            conversationId: conversationId,
                            senderId: appState.userId,
                            receiverId: contactId,
                            messageType: 'text',
                            content: {
                                text: content,
                                isScheduled: true,
                                scheduleTime: scheduleTime,
                                repeatType: repeatType,
                                repeatDays: repeatDays
                            },
                            sendTime: Date.now(),
                            isSelf: true,
                            status: 'sent',
                            scheduleStatus: 'pending'
                        };
                        if (!isGroup && chainHash) {
                            localMessage.chain_prev_hash = chainPrevHash;
                            localMessage.chain_hash = chainHash;
                            localMessage.content.chain_prev_hash = chainPrevHash;
                            localMessage.content.chain_hash = chainHash;
                        }
                        let hashed = localMessage;
                        if (!isGroup && !chainHash) {
                            hashed = await hashy_addHashToMessage(localMessage);
                        }
                        await saveMessageToDB(hashed);
                        if (appState.selectedContact?.conversationId === conversationId) {
                            refreshChatWindow(localMessage);
                        }
                        await renderContacts();
                        closeModal();
                        appState.ws.removeEventListener('message', handleResponse);
                    } else if (response.type === 'error' && response.msg?.includes('定时')) {
                        Loading.hide();
                        alertMsg(response.msg);
                        appState.ws.removeEventListener('message', handleResponse);
                    }
                } catch (e) {
                    console.error('处理定时消息响应失败:', e);
                }
            };

            appState.ws.addEventListener('message', handleResponse);
            setTimeout(() => {
                Loading.hide();
                appState.ws.removeEventListener('message', handleResponse);
            }, 5000);
        });
    }


    async function showScheduledMessageList() {
        if (!appState.isConnected || !appState.ws || appState.ws.readyState !== WebSocket.OPEN) {
            alertMsg('连接已断开，请刷新页面重试');
            return;
        }
        Loading.show('正在加载定时消息列表...');
        appState.ws.send(JSON.stringify({
            type: 'get_scheduled_messages',
            data: {}
        }));

        const handleListResponse = (event) => {
            try {
                const response = JSON.parse(event.data);
                if (response.type === 'scheduled_message_list') {
                    Loading.hide();
                    renderScheduledMessageList(response.data.messages);
                    appState.ws.removeEventListener('message', handleListResponse);
                } else if (response.type === 'error') {
                    Loading.hide();
                    alertMsg('获取列表失败：' + response.msg);
                    appState.ws.removeEventListener('message', handleListResponse);
                }
            } catch (e) { }
        };

        appState.ws.addEventListener('message', handleListResponse);
        setTimeout(() => {
            Loading.hide();
            appState.ws.removeEventListener('message', handleListResponse);
        }, 5000);
    }


    function renderScheduledMessageList(messages) {
        const modalHtml = `
            <div id="scheduledListModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 10001; display: flex; align-items: center; justify-content: center;">
                <div style="background: #fff; border-radius: 28px; width: 90%; max-width: 680px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 25px 45px -12px rgba(0,0,0,0.25); animation: listFadeIn 0.2s ease-out;">
                    <style>
                        @keyframes listFadeIn {
                            from { opacity: 0; transform: scale(0.96); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    </style>
                    <div style="padding: 20px 24px; border-bottom: 1px solid #f0f2f5; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b;">
                            <i class="fas fa-list" style="margin-right: 10px; color: #10b981; font-size: 18px;"></i>
                            我的定时消息
                        </h3>
                        <button id="closeListModalBtn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#f1f5f9'; this.style.color='#1e293b';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='#94a3b8';">&times;</button>
                    </div>
                    <div style="flex: 1; overflow-y: auto; padding: 20px 24px;" id="scheduledListContainer">
                    <style>
        #scheduledListContainer::-webkit-scrollbar {
            width: 6px;
        }
        #scheduledListContainer::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
        }
        #scheduledListContainer::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
        }
        #scheduledListContainer::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
    </style>
                        ${messages.length === 0 ? `
                            <div style="text-align: center; padding: 48px 20px;">
                                <i class="fas fa-inbox" style="font-size: 52px; color: #cbd5e1;"></i>
                                <p style="margin-top: 16px; color: #94a3b8; font-size: 14px;">暂无定时消息</p>
                            </div>
                        ` : `
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                ${messages.map(msg => {
            const sendTime = new Date(msg.scheduleTime);
            const repeatText = {
                'none': '单次',
                'daily': '每天',
                'weekly': '每周',
                'monthly': '每月'
            }[msg.repeatType] || '单次';

            return `
                                        <div class="scheduled-item" data-id="${msg.scheduleId}" style="padding: 16px; border: 1px solid #edf2f7; border-radius: 20px; transition: all 0.2s; background: #fff;" onmouseover="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.03)'; this.style.transform='translateY(-1px)';" onmouseout="this.style.borderColor='#edf2f7'; this.style.boxShadow='none'; this.style.transform='translateY(0)';">
                                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                                <div style="flex: 1;">
                                                    <div style="font-size: 13px; color: #64748b; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                                                        <i class="far fa-clock" style="font-size: 12px;"></i> 发送时间：${sendTime.toLocaleString()}
                                                    </div>
                                                    <div style="font-size: 13px; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                                        <i class="fas fa-repeat" style="font-size: 12px;"></i> 重复：${repeatText}
                                                    </div>
                                                    <div style="font-size: 14px; color: #1e293b; background: #f8fafc; padding: 10px 14px; border-radius: 16px; margin-top: 8px; word-break: break-word; line-height: 1.45;">
                                                        ${escapeHtml(msg.content.text || msg.content)}
                                                    </div>
                                                </div>
                                                <button class="cancel-schedule-btn" data-id="${msg.scheduleId}" style="background: #fee2e2; color: #dc2626; border: none; border-radius: 40px; padding: 6px 14px; cursor: pointer; font-size: 12px; font-weight: 500; margin-left: 12px; transition: all 0.2s;" onmouseover="this.style.background='#fecaca'; this.style.color='#b91c1c';" onmouseout="this.style.background='#fee2e2'; this.style.color='#dc2626';">取消</button>
                                            </div>
                                        </div>
                                    `;
        }).join('')}
                            </div>
                        `}
                    </div>
                    <div style="padding: 16px 24px; border-top: 1px solid #f0f2f5; display: flex; justify-content: flex-end;">
                        <button id="closeListModalFooterBtn" style="padding: 8px 20px; background: #10b981; color: #fff; border: none; border-radius: 40px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#059669'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#10b981'; this.style.transform='translateY(0)';">关闭</button>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('scheduledListModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('scheduledListModal');
        const closeBtn = document.getElementById('closeListModalBtn');
        const closeFooterBtn = document.getElementById('closeListModalFooterBtn');

        modal.style.display = 'flex';

        const closeModal = () => {
            modal.style.display = 'none';
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        closeFooterBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });


        document.querySelectorAll('.cancel-schedule-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const scheduleId = btn.dataset.id;
                const confirmResult = await Swal.fire({
                    title: '确认取消',
                    text: '确定要取消这条定时消息吗？',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: '确定取消',
                    cancelButtonText: '返回'
                });
                if (!confirmResult.isConfirmed) return;
                if (!appState.isConnected || !appState.ws || appState.ws.readyState !== WebSocket.OPEN) {
                    alertMsg('连接已断开，请刷新页面重试');
                    return;
                }
                appState.ws.send(JSON.stringify({
                    type: 'cancel_scheduled_message',
                    data: { scheduleId }
                }));
                const handleCancelResponse = async (event) => {
                    try {
                        const response = JSON.parse(event.data);
                        if (response.type === 'scheduled_message_cancelled') {
                            alertMsg('定时消息已取消');
                            await deleteMessageFromDB(scheduleId);
                            await renderContacts();
                            showScheduledMessageList();
                            appState.ws.removeEventListener('message', handleCancelResponse);
                        } else if (response.type === 'error' && response.msg?.includes('定时')) {
                            alertMsg(response.msg);
                            appState.ws.removeEventListener('message', handleCancelResponse);
                        }
                    } catch (e) { }
                };

                appState.ws.addEventListener('message', handleCancelResponse);
                setTimeout(() => {
                    appState.ws.removeEventListener('message', handleCancelResponse);
                }, 5000);
            });
        });
    }


    function addScheduledMessageButton() {
        const chatInputArea = document.querySelector('.chat-input-area');
        if (!chatInputArea) return;
        const scheduledBtn = document.getElementById('scheduledMsgBtn');
        scheduledBtn.onmouseenter = () => scheduledBtn.style.color = '#409eff';
        scheduledBtn.onmouseleave = () => scheduledBtn.style.color = '#909399';
        scheduledBtn.addEventListener('click', showScheduledMessageDialog);
    }
    function addScheduledMessageMenuItem() {
        const manageBtn = document.getElementById('scheduledManageBtn');
        manageBtn.addEventListener('click', showScheduledMessageList);
        manageBtn.addEventListener('mouseenter', () => {
            manageBtn.style.color = '#409eff';
        });
        manageBtn.addEventListener('mouseleave', () => {
            manageBtn.style.color = '#16191f';
        });
    }


    function initScheduledMessage() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                addScheduledMessageButton();
                addScheduledMessageMenuItem();
            });
        } else {
            addScheduledMessageButton();
            addScheduledMessageMenuItem();
        }
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('contactSelected', () => {
                const btn = document.getElementById('scheduledMsgBtn');
                if (btn) {
                    btn.style.opacity = appState.selectedContact ? '1' : '0.5';
                }
            });
        }
    }
    if (typeof appState !== 'undefined') {
        initScheduledMessage();
    }
})();