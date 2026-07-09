const message = {
    el: document.querySelector('.logger'),
    log(msg) {
      this.el.innerHTML += `<span>${new Date().toLocaleTimeString()}：${msg}</span><br/>`;
    },
    error(msg) {
      this.el.innerHTML += `<span class="error">${new Date().toLocaleTimeString()}：${msg}</span><br/>`;
    }
  };

  const target = location.search.slice(6);
  const localVideo = document.querySelector('#local-video');
  const remoteVideo = document.querySelector('#remote-video');
  const button = document.querySelector('.start-button');
  const closebutton = document.getElementById('closebutton');

  localVideo.onloadeddata = () => {
    localVideo.play();
  };
  remoteVideo.onloadeddata = () => {
    remoteVideo.play();
  };
  
  document.title = target === 'offer' ? '发起方' : '接收方';
  const userId = sessionStorage.getItem('user');
  const peerUserId = sessionStorage.getItem('typevideoth_user');
  const socket = new WebSocket(`ws://${web.websocket_connect()}:8081`);
  socket.onopen = () => {
    message.log('服务器连接成功');
    message.log('对方ID：'+peerUserId);
    if (target === 'offer') {
      message.log('请耐心等待对方加入会议...');
    }else{
      button.remove();
      socket.send(JSON.stringify({
        type: 'begin',
        userId: userId,
        toUserId: peerUserId 
      }));
    }
  };
  socket.onerror = () => message.error('服务器连接失败');
  socket.onmessage = async e => {
    const data = JSON.parse(e.data);
    if (data.toUserId !== userId) {
      return;
    }
    const { type, sdp, iceCandidate } = data;
    if (type === 'answer') {
      await peer.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
    } else if (type === 'answer_ice') {
      peer.addIceCandidate(iceCandidate);
    } else if (type === 'offer') {
      await startLive(new RTCSessionDescription({ type, sdp }));
    } else if (type === 'offer_ice') {
      peer.addIceCandidate(iceCandidate);
    }else if (type === 'begin') {
      message.log('对方已进入会议，可以开始通话了');
      button.style.display = 'block';
      document.getElementById('start-buttoni').onclick = () => {
        startLive();
      };
    }else if (type === 'close') {
      message.log('对方已退出会议');
      closebutton.remove();
      closecall2();
    }
  };
  
  const PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
  if (!PeerConnection) {
    message.error('环境异常');
    throw new Error('WebRTC not supported');
  }
  
  const peer = new PeerConnection();
  peer.ontrack = e => {
    if (e.streams) {
      remoteVideo.srcObject = e.streams[0];
    }
  };
  peer.onicecandidate = e => {
    if (e.candidate) {
      socket.send(JSON.stringify({
        type: `${target}_ice`,
        iceCandidate: e.candidate,
        userId: userId,
        toUserId: peerUserId 
      }));
    }
  };
  
  async function startLive(offerSdp) {
    closebutton.style.display = 'block';
    if (target === 'offer') {
      button.style.display = 'none';
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = stream;
    } catch (error) {
      message.error('无法获取媒体设备');
      return;
    }
    stream.getTracks().forEach(track => {
      peer.addTrack(track, stream);
    });
  
    if (!offerSdp) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.send(JSON.stringify({
        type: 'offer',
        sdp: offer.sdp,
        userId: userId,
        toUserId: peerUserId 
      }));
    } else {
      await peer.setRemoteDescription(offerSdp);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.send(JSON.stringify({
        type: 'answer',
        sdp: answer.sdp,
        userId: userId,
        toUserId: peerUserId 
      }));
    }
  }
  function closecall2(){
    if (peer) {
      peer.close();
    }
    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach(track => track.stop());
    }
    if (remoteVideo.srcObject) {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
  }
  function closeCall() {
    message.log('已结束通话');
    closebutton.remove();
    if (peer) {
      peer.close();
    }
    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach(track => track.stop());
    }
    if (remoteVideo.srcObject) {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    socket.send(JSON.stringify({
      type: 'close',
      userId: userId,
      toUserId: peerUserId
    }));
    document.title = '视频通话';
  }