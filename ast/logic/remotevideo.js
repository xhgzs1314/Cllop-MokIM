(function () {
    async function updateConversationLastMessageFromCall(message) {
        const { conversationId, content, sendTime } = message;
        let lastMessagePreview = content.callType === 'video' ? '[视频通话]' : '[语音通话]';

        if (content.callStatus === 'canceled') {
            lastMessagePreview = content.isIncoming ? '[未接来电]' : '[已取消通话]';
        } else if (content.callDuration > 0) {
            const mins = Math.floor(content.callDuration / 60);
            const secs = content.callDuration % 60;
            lastMessagePreview = `${lastMessagePreview} (${mins}:${secs.toString().padStart(2, '0')})`;
        }
        if (appState.contacts) {
            appState.contacts = appState.contacts.map(contact => {
                if (contact.conversationId === conversationId) {
                    return {
                        ...contact,
                        lastMessage: lastMessagePreview,
                        lastInteractTime: sendTime
                    };
                }
                return contact;
            });
        }
        if (appState.groups) {
            appState.groups = appState.groups.map(group => {
                if (group.conversationId === conversationId) {
                    return {
                        ...group,
                        lastMessage: lastMessagePreview,
                        lastInteractTime: sendTime
                    };
                }
                return group;
            });
        }
    }
    let modal = null;
    let remoteVideo = null;
    let localVideo = null;
    let toggleMicBtn = null;
    let toggleCameraBtn = null;
    let endCallBtn = null;
    let durationSpan = null;
    let remotePlaceholder = null;
    let localStream = null;
    let remoteStream = null;
    let peerConnection = null;
    let callStartTime = null;
    let timerInterval = null;
    let isMicMuted = false;
    let isCameraOff = false;
    let isCallActive = false;
    let currentCallTarget = null;
    let currentCallType = null;
    let answerStartTime = null;
    let callTimeoutTimer = null;
    let hasSavedCallRecord = false;
    let hasEnded = false;
    function resetCallState() {
        hasSavedCallRecord = false;
        hasEnded = false;
        callStartTime = null;
        answerStartTime = null;
        if (callTimeoutTimer) {
            clearTimeout(callTimeoutTimer);
            callTimeoutTimer = null;
        }
    }
    async function saveCallRecordIfNeeded(targetId, callType, duration, isIncoming, wasAnswered, endReason = 'normal') {
        if (hasSavedCallRecord) {
            console.log('通话记录已保存，跳过重复保存');
            return;
        }
        if (hasEnded && !isCallActive) {
            console.log('通话已结束，跳过记录');
            return;
        }
        try {
            let conversationId = targetId;
            let receiverId = targetId;
            if (!appState.selectedContact?.isGroup) {
                const contact = appState.contacts?.find(c => c.contactId === targetId || c.conversationId === targetId);
                if (contact) {
                    conversationId = contact.conversationId || targetId;
                    receiverId = contact.contactId || targetId;
                }
            } else {
                conversationId = appState.selectedContact.conversationId;
                receiverId = appState.selectedContact.contactId;
            }
            let callStatus = 'finished';
            let displayText = '';
            if (!wasAnswered) {
                callStatus = 'canceled';
                displayText = isIncoming ? '未接来电' : '已取消';
            } else if (endReason === 'rejected') {
                callStatus = 'canceled';
                displayText = '对方拒绝';
            } else if (endReason === 'timeout') {
                callStatus = 'canceled';
                displayText = '无人接听';
            } else {
                callStatus = 'finished';
                displayText = '通话结束';
            }
            let actualDuration = duration;
            if (wasAnswered && duration === 0 && callStartTime) {
                actualDuration = Math.floor((Date.now() - callStartTime) / 1000);
            }

            const message = {
                messageId: generateUniqueId(),
                conversationId: conversationId,
                senderId: appState.userId,
                receiverId: receiverId,
                messageType: 'call',
                content: {
                    callType: callType,
                    callStatus: callStatus,
                    callDuration: actualDuration || 0,
                    isIncoming: isIncoming,
                    wasAnswered: wasAnswered,
                    displayText: displayText,
                    timestamp: Date.now()
                },
                sendTime: Date.now(),
                isSelf: !isIncoming,
                status: 'sent',
                read: false
            };
            if (appState.selectedContact?.isGroup) {
                message.isGroup = true;
                message.senderName = getCurrentUserName();
            }

            await saveMessageToDB(message);
            await updateConversationLastMessageFromCall(message);
            if (appState.selectedContact?.conversationId === conversationId) {
                refreshChatWindow(message);
            }
            hasSavedCallRecord = true;
        } catch (error) {
            console.error('保存通话记录失败:', error);
        }
    }
    function getModalElements() {
        modal = document.getElementById('remotevioModal');
        if (!modal) {
            return false;
        }
        remoteVideo = document.getElementById('remotio_pas_remoteVideo');
        localVideo = document.getElementById('remotio_pas_localVideo');
        toggleMicBtn = document.getElementById('remotio_pas_toggleMic');
        toggleCameraBtn = document.getElementById('remotio_pas_toggleCamera');
        endCallBtn = document.getElementById('remotio_pas_endCall');
        durationSpan = document.getElementById('remotio_pas_duration');
        remotePlaceholder = document.getElementById('remotio_pas_remotePlaceholder');
        return true;
    }


    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }


    function updateTimer() {
        if (!callStartTime || !isCallActive) return;
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        if (durationSpan) durationSpan.innerText = formatDuration(elapsed);
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        callStartTime = Date.now();
        updateTimer();
        timerInterval = setInterval(() => {
            if (isCallActive && callStartTime) {
                updateTimer();
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        callStartTime = null;
        if (durationSpan) durationSpan.innerText = '00:00';
    }


    function updateMicButtonUI() {
        if (!toggleMicBtn) return;
        const icon = toggleMicBtn.querySelector('i');
        if (isMicMuted) {
            icon.className = 'fas fa-microphone-slash';
            toggleMicBtn.classList.add('remotio_pas_muted');
            toggleMicBtn.title = '麦克风已关闭，点击开启';
        } else {
            icon.className = 'fas fa-microphone';
            toggleMicBtn.classList.remove('remotio_pas_muted');
            toggleMicBtn.title = '麦克风已开启，点击关闭';
        }
    }

    function updateCameraButtonUI() {
        if (!toggleCameraBtn) return;
        const icon = toggleCameraBtn.querySelector('i');
        if (isCameraOff) {
            icon.className = 'fas fa-video-slash';
            toggleCameraBtn.classList.add('remotio_pas_video_off');
            toggleCameraBtn.title = '摄像头已关闭，点击开启';
        } else {
            icon.className = 'fas fa-video';
            toggleCameraBtn.classList.remove('remotio_pas_video_off');
            toggleCameraBtn.title = '摄像头已开启，点击关闭';
        }
    }


    async function setMicMute(mute) {
        if (!localStream) return;
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length) {
            audioTracks.forEach(track => {
                track.enabled = !mute;
            });
        }
        isMicMuted = mute;
        updateMicButtonUI();
        if (isCallActive && currentCallTarget && appState.ws) {
            sendWsMessage({
                type: 'call_control',
                data: {
                    action: 'toggle_mic',
                    muted: mute,
                    targetId: currentCallTarget,
                    callType: currentCallType
                }
            });
        }
    }


    async function setCameraState(off) {
        if (!localStream) return;
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length) {
            videoTracks.forEach(track => {
                track.enabled = !off;
            });
        }
        isCameraOff = off;
        updateCameraButtonUI();
        if (isCallActive && currentCallTarget && appState.ws) {
            sendWsMessage({
                type: 'call_control',
                data: {
                    action: 'toggle_camera',
                    off: off,
                    targetId: currentCallTarget,
                    callType: currentCallType
                }
            });
        }
    }

    async function acquireLocalMedia(isVideo = true) {
        if (localStream) {
            localStream.getTracks().forEach(track => {
                track.stop();
            });
            localStream = null;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
            const constraints = {
                audio: true,
                video: isVideo ? {
                    width: { ideal: 320 },
                    height: { ideal: 240 },
                    frameRate: { ideal: 15 }
                } : false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            return stream;
        } catch (err) {
            console.error('获取媒体设备失败:', err);
            if (err.name === 'NotAllowedError') {
                alertMsg('无法获取摄像头/麦克风权限，请检查浏览器权限设置。');
            } else if (err.name === 'NotFoundError') {
                alertMsg('未检测到摄像头或麦克风设备。');
            } else if (err.name === 'NotReadableError') {
                alertMsg('摄像头或麦克风正在被其他程序占用，请关闭其他使用摄像头的应用后重试。');
            } else if (err.name === 'OverconstrainedError') {
                alertMsg('没有符合要求的摄像头设备。');
            } else {
                alertMsg('媒体设备初始化失败: ' + err.message);
            }
            return null;
        }
    }
    function releaseMediaDevices() {
        if (localStream) {
            localStream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            localStream = null;
        }
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => {
                track.stop();
            });
            remoteStream = null;
        }
        if (localVideo) {
            localVideo.srcObject = null;
        }
        if (remoteVideo) {
            remoteVideo.srcObject = null;
        }
    }
    function closePeerConnection() {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
    }


    async function createPeerConnection(targetId, isOffer) {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        peerConnection = new RTCPeerConnection(configuration);
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && appState.ws) {
                sendWsMessage({
                    type: 'call_ice',
                    data: {
                        candidate: event.candidate,
                        targetId: targetId,
                        callerId: appState.userId,
                        callType: currentCallType
                    }
                });
            }
        };
        peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0] && remoteVideo) {
                remoteStream = event.streams[0];
                remoteVideo.srcObject = remoteStream;
                if (remotePlaceholder) remotePlaceholder.style.display = 'none';
                remoteVideo.onloadedmetadata = () => {
                    remoteVideo.play().catch(e => console.warn);
                };
            }
        };

        peerConnection.onconnectionstatechange = () => {
            console.log('连接状态:', peerConnection.connectionState);
            if (peerConnection.connectionState === 'disconnected' ||
                peerConnection.connectionState === 'failed' ||
                peerConnection.connectionState === 'closed') {
                if (isCallActive) {
                    endCall();
                }
            }
        };

        return peerConnection;
    }



    async function startCall(targetId, callType = 'video') {
        if (!appState?.isConnected) {
            alertMsg('请先连接到服务器');
            return;
        }

        if (!targetId) {
            alertMsg('请选择通话对象');
            return;
        }

        releaseMediaDevices();
        closePeerConnection();
        resetCallState();
        if (callTimeoutTimer) {
            clearTimeout(callTimeoutTimer);
            callTimeoutTimer = null;
        }

        currentCallTarget = targetId;
        currentCallType = callType;

        const stream = await acquireLocalMedia(callType === 'video');
        if (!stream) {
            alertMsg('无法获取摄像头/麦克风权限');
            return;
        }

        localStream = stream;
        if (localVideo) {
            localVideo.srcObject = localStream;
            localVideo.onloadedmetadata = () => localVideo.play().catch(e => console.warn);
        }
        isMicMuted = false;
        isCameraOff = false;
        updateMicButtonUI();
        updateCameraButtonUI();

        if (modal) {
            modal.classList.add('remotio_pas_show');
        }

        await createPeerConnection(targetId, true);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        sendWsMessage({
            type: 'call_offer',
            data: {
                targetId: targetId,
                sdp: offer.sdp,
                callerId: appState.userId,
                callType: callType,
                timestamp: Date.now()
            }
        });

        isCallActive = true;
        startTimer();

        if (remotePlaceholder) {
            remotePlaceholder.style.display = 'flex';
        }

        callTimeoutTimer = setTimeout(() => {
            if (isCallActive && currentCallTarget === targetId && !hasSavedCallRecord && !hasEnded) {
                saveCallRecordIfNeeded(targetId, callType, 0, false, false, 'timeout');
                alertMsg('对方未接听，通话已超时');
                endCall(false);
            }
            callTimeoutTimer = null;
        }, 60000);
    }

    async function answerCall(offerData) {
        const { sdp, callerId, callType } = offerData;
        resetCallState();
        releaseMediaDevices();
        closePeerConnection();
        currentCallTarget = callerId;
        currentCallType = callType;
        const stream = await acquireLocalMedia(callType === 'video');
        if (!stream) {
            alertMsg('无法获取摄像头/麦克风权限');
            sendWsMessage({
                type: 'call_reject',
                data: {
                    targetId: callerId,
                    callerId: appState.userId,
                    reason: '无法获取媒体设备'
                }
            });
            saveCallRecordIfNeeded(callerId, callType, 0, true, false, 'rejected');
            endCall(true);
            return;
        }

        localStream = stream;
        if (localVideo) {
            localVideo.srcObject = localStream;
            localVideo.onloadedmetadata = () => localVideo.play().catch(e => console.warn);
        }
        isMicMuted = false;
        isCameraOff = false;
        updateMicButtonUI();
        updateCameraButtonUI();

        if (modal) {
            modal.classList.add('remotio_pas_show');
        }

        await createPeerConnection(callerId, false);
        await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        sendWsMessage({
            type: 'call_answer',
            data: {
                targetId: callerId,
                sdp: answer.sdp,
                answererId: appState.userId,
                callType: callType
            }
        });

        isCallActive = true;
        startTimer();
        answerStartTime = Date.now();

        if (remotePlaceholder) {
            remotePlaceholder.style.display = 'none';
        }
    }
    function handleIceCandidate(data) {
        if (!peerConnection) return;
        const { candidate } = data;
        if (candidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                .catch(err => console.error('添加ICE候选失败:', err));
        }
    }
    async function handleAnswer(data) {
        if (!peerConnection) return;
        const { sdp } = data;
        await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
        if (remotePlaceholder) {
            remotePlaceholder.style.display = 'none';
        }
    }

    function endCall(fromRemote = false) {
        if (hasEnded) {
            console.log('通话已结束，跳过重复结束');
            return;
        }
        hasEnded = true;
        let duration = 0;
        let wasAnswered = true;
        let endReason = 'normal';

        if (callStartTime && isCallActive) {
            duration = Math.floor((Date.now() - callStartTime) / 1000);
            wasAnswered = duration > 0;
        } else {
            wasAnswered = false;
            endReason = 'canceled';
        }
        if (!hasSavedCallRecord && currentCallTarget && currentCallType) {
            const isIncoming = fromRemote && !appState.selectedContact?.isGroup;
            saveCallRecordIfNeeded(
                currentCallTarget,
                currentCallType,
                duration,
                isIncoming,
                wasAnswered,
                endReason
            );
        }
        isCallActive = false;
        stopTimer();
        if (!fromRemote && currentCallTarget && appState?.ws && appState.ws.readyState === WebSocket.OPEN) {
            sendWsMessage({
                type: 'call_end',
                data: {
                    targetId: currentCallTarget,
                    callerId: appState.userId,
                    duration: duration,
                    timestamp: Date.now()
                }
            });
        }

        releaseMediaDevices();
        closePeerConnection();
        isMicMuted = false;
        isCameraOff = false;
        currentCallTarget = null;
        currentCallType = null;
        closeModal();

        if (typeof window.onRemoteCallEnded === 'function') {
            window.onRemoteCallEnded();
        }
    }
    function closeModal() {
        if (modal) {
            modal.classList.remove('remotio_pas_show');
        }
        releaseMediaDevices();
        closePeerConnection();
        if (timerInterval) clearInterval(timerInterval);
        isCallActive = false;
    }


    function rejectCall(callerId) {
        sendWsMessage({
            type: 'call_reject',
            data: {
                targetId: callerId,
                callerId: appState.userId,
                reason: '用户拒绝接听'
            }
        });
    }




    function sendWsMessage(data) {
        if (appState.isConnected && appState.ws?.readyState === WebSocket.OPEN) {
            appState.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket未连接，消息发送失败:', data);
        }
    }


    function handleCallMessage(message) {
        const { type, data } = message;
        switch (type) {
            case 'call_offer':
                resetCallState();
                if (isCallActive) {
                    rejectCall(data.callerId);
                } else {
                    showIncomingCallModal(data);
                }
                break;
            case 'call_answer':
                if (callTimeoutTimer) {
                    clearTimeout(callTimeoutTimer);
                    callTimeoutTimer = null;
                }
                handleAnswer(data);
                break;

            case 'call_ice':
                handleIceCandidate(data);
                break;
            case 'call_end':
                if (isCallActive) {
                    if (currentCallTarget && currentCallType && !hasSavedCallRecord) {
                        const duration = data.duration || 0;
                        const wasAnswered = duration > 0 || (callStartTime && Date.now() - callStartTime > 0);

                        saveCallRecordIfNeeded(
                            currentCallTarget,
                            currentCallType,
                            duration,
                            true,
                            wasAnswered,
                            'normal'
                        );
                    }
                    setTimeout(() => {
                        alertMsg('对方已结束通话');
                    }, 100);
                    endCall(true);
                }
                break;
            case 'call_reject':
                if (callTimeoutTimer) {
                    clearTimeout(callTimeoutTimer);
                    callTimeoutTimer = null;
                }

                if (isCallActive && !hasSavedCallRecord) {
                    if (currentCallTarget && currentCallType) {
                        saveCallRecordIfNeeded(
                            currentCallTarget,
                            currentCallType,
                            0,
                            false,
                            false,
                            'rejected'
                        );
                    }
                    alertMsg('对方拒绝了通话请求');
                } else {
                    alertMsg('对方拒绝了通话请求');
                }
                endCall(true);
                break;

            case 'call_control':
                const { action, muted, off } = data;
                if (action === 'toggle_mic') {
                    console.log('对方麦克风状态:', muted ? '关闭' : '开启');
                } else if (action === 'toggle_camera') {
                    console.log('对方摄像头状态:', off ? '关闭' : '开启');
                }
                break;
        }
    }
    function showIncomingCallModal(callData) {
        const { callerId, callType, timestamp } = callData;
        let callerName = callerId;
        if (appState?.contacts) {
            const contact = appState.contacts.find(c => c.contactId === callerId);
            if (contact) callerName = contact.friendAlias || contact.uname || callerId;
        }
        let ringtone = null;
        Swal.fire({
            title: `${callType === 'video' ? '视频' : '语音'}通话请求`,
            html: `
            <div style="text-align: center;">
                <i class="fas fa-${callType === 'video' ? 'video' : 'phone'}" style="font-size: 48px; color: #409eff; margin-bottom: 15px;"></i>
                <p>${escapeHtml(callerName)} 邀请您进行${callType === 'video' ? '视频' : '语音'}通话</p>
            </div>
        `,
            showCancelButton: true,
            confirmButtonText: '接听',
            cancelButtonText: '拒绝',
            confirmButtonColor: '#409eff',
            cancelButtonColor: '#f56c6c',
            allowOutsideClick: false,
            didOpen: (popup) => {
                try {
                    ringtone = new Audio('/ast/sounds/video.mp3');
                    ringtone.loop = true;
                    ringtone.volume = 0.5;
                    ringtone.play().catch(e => console.warn('播放铃声失败:', e));
                    popup.dataset.ringtoneId = Date.now();
                    window._currentRingtone = ringtone;
                } catch (e) {
                    console.warn('创建音频对象失败:', e);
                }
            },
            willClose: () => {
                try {
                    if (window._currentRingtone) {
                        window._currentRingtone.pause();
                        window._currentRingtone = null;
                    }
                } catch (e) {
                    console.warn('停止铃声失败:', e);
                }
            }
        }).then((result) => {
            if (window._currentRingtone) {
                window._currentRingtone.pause();
                window._currentRingtone = null;
            }

            if (result.isConfirmed) {
                answerCall(callData);
            } else {
                rejectCall(callerId);
            }
        }).catch((error) => {
            if (window._currentRingtone) {
                window._currentRingtone.pause();
                window._currentRingtone = null;
            }
        });
    }


    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    function initButtonEvents() {
        const videoCallBtn = document.getElementById('videoCallBtn_intact_remote');
        if (videoCallBtn) {
            videoCallBtn.addEventListener('click', function () {
                if (!appState.selectedContact) {
                    alertMsg('请先选择一个联系人');
                    return;
                }
                const contact = appState.selectedContact;
                if (contact.isGroup) {
                    alertMsg('暂不支持群聊视频通话');
                    return;
                }

                const targetId = contact.contactId;
                startCall(targetId, 'video');
            });
        }
    }
    function initModalEvents() {
        if (!getModalElements()) return;
        if (toggleMicBtn) {
            toggleMicBtn.addEventListener('click', () => {
                if (!isCallActive) return;
                setMicMute(!isMicMuted);
            });
        }
        if (toggleCameraBtn) {
            toggleCameraBtn.addEventListener('click', () => {
                if (!isCallActive) return;
                setCameraState(!isCameraOff);
            });
        }
        if (endCallBtn) {
            endCallBtn.addEventListener('click', () => {
                if (isCallActive) {
                    endCall();
                } else {
                    closeModal();
                }
            });
        }
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal && isCallActive) {
                    endCall();
                } else if (e.target === modal) {
                    closeModal();
                }
            });
        }
    }
    function setupWsMessageListener() {
        const checkInterval = setInterval(() => {
            if (appState.ws) {
                clearInterval(checkInterval);
                const originalOnMessage = appState.ws.onmessage;
                appState.ws.onmessage = function (event) {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type && message.type.startsWith('call_')) {
                            handleCallMessage(message);
                        }
                        if (originalOnMessage) {
                            originalOnMessage.call(appState.ws, event);
                        }
                    } catch (error) {
                        if (originalOnMessage) {
                            originalOnMessage.call(appState.ws, event);
                        }
                    }
                };
            }
        }, 100);
    }
    window.remoteVideoCall = {
        startCall: startCall,
        endCall: endCall,
        answerCall: answerCall,
        rejectCall: rejectCall,
        isCallActive: () => isCallActive
    };
    function init() {
        initModalEvents();
        initButtonEvents();
        setupWsMessageListener();
    }
    window.addEventListener('beforeunload', () => {
        releaseMediaDevices();
        if (peerConnection) {
            peerConnection.close();
        }
        resetCallState();
    });
    init();
})();