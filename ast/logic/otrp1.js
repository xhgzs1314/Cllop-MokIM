(function () {
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let recordingTimer = null;
    let recordingStartTime = 0;
    let stream = null;
    let recordingTimeout = null;
    let recognition = null;
    let isUsingSpeechRecognition = false;
    const MAX_RECORDING_DURATION = 60;
    const audioBtn = document.getElementById('chat-toolbar-audiototext');
    const chatInput = document.querySelector('.chat-input');
    
    if (!audioBtn || !chatInput) {
        return;
    }
    
    function isSpeechRecognitionSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }
    
    function initSpeechRecognition() {
        if (!isSpeechRecognitionSupported()) {
            console.warn('当前浏览器不支持 Web Speech API');
            return null;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'zh-CN';
        recognitionInstance.maxAlternatives = 1;
        return recognitionInstance;
    }
    
    async function startBrowserRecording() {
        if (isRecording) return;
        if (!recognition) {
            recognition = initSpeechRecognition();
            if (!recognition) {
                return startMediaRecorderRecording();
            }
        }
        isUsingSpeechRecognition = true;
        isRecording = true;
        recordingStartTime = Date.now();
        const existingText = chatInput.value || '';
        let fullText = existingText;  
        recognition.onstart = () => {
            audioBtn.style.color = '#f56c6c';
            audioBtn.style.backgroundColor = 'rgba(245, 108, 108, 0.1)';
            audioBtn.style.borderRadius = '50%';
            showRecordingTip();
            startRecordingTimer();
            recordingTimeout = setTimeout(() => {
                if (isRecording) {
                    stopRecording(false);
                    alertMsg('录音已达到60秒上限，自动结束');
                }
            }, MAX_RECORDING_DURATION * 1000);
        };

        recognition.onresult = (event) => {
            let currentInterim = '';
            let currentFinal = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;
                if (result.isFinal) {
                    currentFinal += transcript;
                } else {
                    currentInterim += transcript;
                }
            }
            if (currentFinal) {
                fullText = existingText + ' ' + currentFinal;
                if (currentInterim) {
                    chatInput.value = fullText + ' ' + currentInterim;
                } else {
                    chatInput.value = fullText;
                }
            } else if (currentInterim) {
                chatInput.value = fullText ? fullText + ' ' + currentInterim : existingText + ' ' + currentInterim;
            }
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        };

        recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            let errorMsg = '语音识别失败';
            switch (event.error) {
                case 'no-speech':
                    errorMsg = '未检测到语音，请重试';
                    break;
                case 'audio-capture':
                    errorMsg = '无法获取麦克风权限';
                    break;
                case 'not-allowed':
                    errorMsg = '请允许麦克风权限后重试';
                    break;
                case 'network':
                    errorMsg = '网络错误，请检查网络连接';
                    break;
                default:
                    errorMsg = `识别失败: ${event.error}`;
            }
            alertMsg(errorMsg);
            stopRecording(true);
        };

        recognition.onend = () => {
            if (isRecording) {
                if (!chatInput.value.trim()) {
                    alertMsg('未识别到语音内容，请重试');
                } else {
                    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            cleanup();
        };
        
        try {
            recognition.start();
        } catch (error) {
            console.error('启动识别失败:', error);
            alertMsg('启动录音失败，请重试');
            cleanup();
        }
    }
    
    function appendToInput(text) {
        const currentText = chatInput.value;
        const newText = currentText ? currentText + ' ' + text : text;
        chatInput.value = newText;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    }
    
    async function startMediaRecorderRecording() {
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            stream = await navigator.mediaDevices.getUserMedia(constraints);
            audioChunks = [];

            const mimeType = getSupportedMimeType();
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 32000
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                await processAudioToText();
            };

            mediaRecorder.start(1000);
            isRecording = true;
            recordingStartTime = Date.now();
            audioBtn.style.color = '#f56c6c';
            audioBtn.style.backgroundColor = 'rgba(245, 108, 108, 0.1)';
            audioBtn.style.borderRadius = '50%';
            showRecordingTip();
            startRecordingTimer();
            recordingTimeout = setTimeout(() => {
                if (isRecording) {
                    stopRecording(false);
                    alertMsg('录音已达到60秒上限，自动结束');
                }
            }, MAX_RECORDING_DURATION * 1000);

        } catch (error) {
            console.error('获取麦克风失败:', error);
            let errorMsg = '无法访问麦克风';
            if (error.name === 'NotAllowedError') {
                errorMsg = '请允许麦克风权限后重试';
            } else if (error.name === 'NotFoundError') {
                errorMsg = '未检测到麦克风设备';
            }
            alertMsg(errorMsg);
        }
    }
    
    async function processAudioToText() {
        if (audioChunks.length === 0) {
            return;
        }
        chatInput.placeholder = '语音识别需要浏览器支持...';
        alertMsg('当前浏览器不支持语音识别API，如需使用请升级浏览器');
        chatInput.placeholder = '输入消息...';
        audioChunks = [];
    }
    
    function getSupportedMimeType() {
        const types = [
            'audio/webm',
            'audio/mp4',
            'audio/ogg',
            'audio/wav'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return '';
    }
    
    function stopRecording(isManual = true) {
        if (!isRecording) return;
        if (recordingTimeout) {
            clearTimeout(recordingTimeout);
            recordingTimeout = null;
        }
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }

        if (isUsingSpeechRecognition && recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.warn('停止识别失败:', e);
                cleanup();
            }
        } else if (mediaRecorder && mediaRecorder.state === 'recording') {
            try {
                mediaRecorder.stop();
            } catch (e) {
                console.warn('停止录音失败:', e);
                cleanup();
            }
        }
        isRecording = false;
        audioBtn.style.color = '';
        audioBtn.style.backgroundColor = '';
        audioBtn.style.borderRadius = '';
        hideRecordingTip();
        chatInput.placeholder = '输入消息...';
    }
    
    let tipElement = null;
    let timerElement = null;
    
    function showRecordingTip() {
        if (tipElement) return;

        tipElement = document.createElement('div');
        tipElement.id = 'recording-tip';
        tipElement.style.cssText = `
            position: fixed;
            bottom: 150px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            color: #fff;
            padding: 12px 24px;
            border-radius: 40px;
            font-size: 14px;
            z-index: 10001;
            display: flex;
            align-items: center;
            gap: 12px;
            backdrop-filter: blur(8px);
            pointer-events: none;
            font-family: monospace;
        `;

        tipElement.innerHTML = `
            <span style="display: flex; align-items: center; gap: 6px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #f56c6c; border-radius: 50%; animation: pulse 1s infinite;"></span>
                <span>${isUsingSpeechRecognition ? '语音识别中' : '录音中'}...</span>
            </span>
            <span id="recording-timer" style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 20px; font-weight: bold;">00:00</span>
            <span style="font-size: 12px; opacity: 0.7;">(最长60秒)</span>
        `;

        const style = document.createElement('style');
        style.id = 'recording-tip-style';
        if (!document.querySelector('#recording-tip-style')) {
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(tipElement);
        timerElement = document.getElementById('recording-timer');
    }

    function startRecordingTimer() {
        if (recordingTimer) clearInterval(recordingTimer);

        recordingTimer = setInterval(() => {
            if (!isRecording) return;
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const remaining = MAX_RECORDING_DURATION - elapsed;
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;

            if (timerElement) {
                timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
            if (remaining <= 10 && remaining > 0 && tipElement) {
                const warningSpan = tipElement.querySelector('.warning-tip');
                if (!warningSpan) {
                    const warn = document.createElement('span');
                    warn.className = 'warning-tip';
                    warn.style.cssText = 'color: #f56c6c; font-weight: bold; margin-left: 8px;';
                    warn.textContent = `⚠️ ${remaining}秒后结束`;
                    tipElement.appendChild(warn);
                    setTimeout(() => {
                        if (warn && warn.parentNode) warn.remove();
                    }, 1000);
                }
            }
            if (elapsed >= MAX_RECORDING_DURATION) {
                stopRecording(false);
            }
        }, 1000);
    }

    function hideRecordingTip() {
        if (tipElement) {
            tipElement.remove();
            tipElement = null;
            timerElement = null;
        }
    }
    
    function cleanup() {
        if (recordingTimeout) {
            clearTimeout(recordingTimeout);
            recordingTimeout = null;
        }
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }

        if (recognition) {
            try {
                recognition.abort();
            } catch (e) { }
        }

        if (mediaRecorder && mediaRecorder.state === 'recording') {
            try {
                mediaRecorder.stop();
            } catch (e) { }
        }

        if (stream) {
            stream.getTracks().forEach(track => {
                if (track.readyState === 'live') {
                    track.stop();
                }
            });
            stream = null;
        }

        audioChunks = [];
        mediaRecorder = null;
        isRecording = false;
        isUsingSpeechRecognition = false;

        if (audioBtn) {
            audioBtn.style.color = '';
            audioBtn.style.backgroundColor = '';
            audioBtn.style.borderRadius = '';
        }

        hideRecordingTip();
    }
    
    function alertMsg(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
                position: fixed;
                bottom: 200px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                z-index: 10002;
                white-space: nowrap;
            `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    async function onAudioBtnClick() {
        if (isRecording) {
            stopRecording(true);
        } else {
            await startBrowserRecording();
        }
    }
    
    audioBtn.addEventListener('click', onAudioBtnClick);
    
    window.addEventListener('beforeunload', () => {
        if (isRecording) {
            if (recognition) {
                try {
                    recognition.abort();
                } catch (e) { }
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        }
    });
})();