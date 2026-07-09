const { wsCheckLimit, sendRateLimitError } = require('./rate-limiter');
const { handleGameMessage, cleanupGameRooms, gameManager } = require('./game-handler');
require('dotenv').config();
const WebSocket = require('ws');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const express = require('express');
const expressWs = require('express-ws');
const OFFLINE_MSG_DIR = path.join(__dirname, 'offline_messages');
async function ensureOfflineDir() {
  try {
    await fs.mkdir(OFFLINE_MSG_DIR, { recursive: true });
  } catch (err) {
    console.error('创建离线消息目录失败:', err);
  }
}
ensureOfflineDir();
// ======================== 配置常量 ========================
const WS_PORT = process.env.WS_PORT || 8080;
const PHP_API_BASE = process.env.PHP_API_BASE_LINK + '/api';
const VALIDATE_USER_API = process.env.PHP_VALIDATE_USER_API;
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const CONTACTS_API = process.env.PHP_CONTACTS_API;
const GROUPS_API = process.env.PHP_GROUPS_API;
const RELATION_API = process.env.PHP_RELATION_API;  //关系缓存API
const SETTINGS_API = process.env.PHP_SETTINGS_API;
const HEARTBEAT_TIMEOUT = parseInt(process.env.HEARTBEAT_TIMEOUT) * 1000;
const MAX_RECONNECT_ATTEMPTS = parseInt(process.env.MAX_RECONNECT_ATTEMPTS);
const VIDEO_PORT = process.env.VIDEO_PORT || 8081; //音视频通话端口
// ======================== 连接池管理 ========================
const connectionPool = new Map();
const relationCache = new Map();
let scheduledMessages = new Map();
let scheduleCheckInterval = null;
// ======================== 密钥管理 ========================
const SECRET_KEY = process.env.API_SECRET_KEY || 'yhwo-rkmoks-run-folk';
// ======================== 音视频通话服务 ========================
const videoApp = express();
const videoWsInstance = expressWs(videoApp);
videoApp.get('/video-nowbegain', (req, res) => {
  res.sendFile('/chat.php', { root: __dirname });
});
videoApp.ws('/', ws => {
  ws.on('message', data => {
    console.log('音视频信令:', data.toString());
    videoWsInstance.getWss().clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });
  });
});

const videoServer = videoApp.listen(VIDEO_PORT, () => {
  console.log(`音视频通话服务已启动，端口：${VIDEO_PORT}`);
});
// ======================== 定时消息管理 ========================
const SCHEDULED_MSG_DIR = path.join(__dirname, 'scheduled_messages');
const SCHEDULED_CHECK_INTERVAL = 60000;
async function ensureScheduledDir() {
  try {
    await fs.mkdir(SCHEDULED_MSG_DIR, { recursive: true });
  } catch (err) {
    console.error('创建定时消息目录失败:', err);
  }
}
ensureScheduledDir();
// ======================== 设备标识管理 ========================
const deviceSessions = new Map();
function generateDeviceId(req) {
  const userAgent = req.headers['user-agent'] || '';
  const urlParts = req.url.split('?');
  const queryString = urlParts[1] || '';
  const urlParams = new URLSearchParams(queryString);
  const deviceId = urlParams.get('deviceId') || '';
  if (!deviceId) {
    const osMatch = userAgent.match(/(Windows|Macintosh|Linux|Android|iPhone|iPad)/i);
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i);
    const os = osMatch ? osMatch[1] : 'Unknown';
    const browser = browserMatch ? browserMatch[1] : 'Unknown';
    return `${os}_${browser}_${Date.now().toString(36)}`;
  }
  return deviceId;
}
function handleDuplicateConnection(userId, newWs, newDeviceId, req) {
  const existingSession = deviceSessions.get(userId);
  if (existingSession) {
    if (existingSession.deviceId !== newDeviceId) {
      console.log(`[设备检测] 用户 [${userId}] 在不同设备上登录，踢出旧设备`);
      gameManager.leaveRoom(userId);
      if (existingSession.ws && existingSession.ws.readyState === WebSocket.OPEN) {
        const kickMessage = buildMessage('kicked_out', {
          reason: '其他设备登录',
          timestamp: Date.now(),
          newDevice: newDeviceId
        }, '您的账号在其他设备上登录');
        existingSession.ws.send(kickMessage);
        setTimeout(() => {
          if (existingSession.ws.readyState === WebSocket.OPEN) {
            existingSession.ws.close(4003, '账号在其他设备登录');
          }
        }, 500);
      }
      const conn = connectionPool.get(userId);
      if (conn && conn.ws === existingSession.ws) {
        connectionPool.delete(userId);
      }
      deviceSessions.set(userId, {
        deviceId: newDeviceId,
        ws: newWs,
        timestamp: Date.now(),
        userAgent: req.headers['user-agent'] || ''
      });

      return true;
    } else {
      console.log(`[设备检测] 用户 [${userId}] 同一设备重新连接`);
      existingSession.ws = newWs;
      existingSession.timestamp = Date.now();
      const conn = connectionPool.get(userId);
      if (conn && conn.ws !== newWs) {
        connectionPool.delete(userId);
      }

      return false;
    }
  } else {
    deviceSessions.set(userId, {
      deviceId: newDeviceId,
      ws: newWs,
      timestamp: Date.now(),
      userAgent: req.headers['user-agent'] || ''
    });
    return false;
  }
}
function clearDeviceSession(userId, ws) {
  const session = deviceSessions.get(userId);
  if (session && session.ws === ws) {
    deviceSessions.delete(userId);
  }
}
function getUserDeviceInfo(userId) {
  const session = deviceSessions.get(userId);
  if (session) {
    return {
      deviceId: session.deviceId,
      loginTime: session.timestamp,
      userAgent: session.userAgent
    };
  }
  return null;
}
// ======================== 工具函数 ========================
async function initRelationCache() {
  try {
    const allRelations = await requestPHPAPI(RELATION_API);
    allRelations.forEach(relation => {
      const { user_id, friend_id, add_status } = relation;
      if (!relationCache.has(user_id)) {
        relationCache.set(user_id, new Map());
      }
      relationCache.get(user_id).set(friend_id, add_status);
    });
    console.log(`关系缓存初始化完成，共加载 ${relationCache.size} 个用户的关系数据`);
  } catch (error) {
    console.error('关系缓存初始化失败:', error.message);
  }
}
async function refreshUserRelationCache(userId) {
  try {
    const userRelations = await requestPHPAPI(RELATION_API, { userId });
    const userRelationMap = new Map();
    userRelations.forEach(relation => {
      userRelationMap.set(relation.friend_id, relation.add_status);
    });
    relationCache.set(userId, userRelationMap);
    console.log(`已刷新用户 [${userId}] 的关系缓存`);
  } catch (error) {
    console.error(`刷新用户 [${userId}] 关系缓存失败:`, error.message);
  }
}
async function updateRelationCacheFromNotification(userId, friendId, method) {
  try {
    if (!relationCache.has(userId)) {
      relationCache.set(userId, new Map());
    }
    relationCache.get(userId).set(friendId, method);
    console.log(`已通过PHP通知更新关系缓存: 用户[${userId}] 好友[${friendId}] 状态[${method}]`);
    return true;
  } catch (error) {
    console.error('更新关系缓存失败:', error.message);
    return false;
  }
}
function checkFriendRelation(senderId, receiverId) {
  if (!relationCache.has(receiverId)) {
    return { isValid: true, tip: '' };
  }
  const receiverRelations = relationCache.get(receiverId);
  const relationStatus = receiverRelations.get(senderId);
  if (relationStatus === 0) {
    return {
      isValid: false,
      tip: '您和对方还不是朋友'
    };
  } else if (relationStatus === 2) {
    return {
      isValid: false,
      tip: '对方已选择屏蔽您，TA将无法收到您的消息'
    };
  } else if (relationStatus === 1 || relationStatus === 3) {
    return { isValid: true, tip: '' };
  } else {
    return {
      isValid: false,
      tip: '您和对方还不是朋友'
    };
  }
}
async function requestPHPAPI(path, params = {}) {
  try {
    const response = await axios({
      url: `${PHP_API_BASE}${path}`,
      method: 'GET',
      params,
      timeout: 5000,
      headers: {
        'X-API-Key': SECRET_KEY
      }
    });

    if (response.data.code !== 200) {
      throw new Error(`PHP接口返回错误: ${response.data.msg || '未知错误'}`);
    }
    return response.data.data;
  } catch (error) {
    console.error(`调用PHP接口失败 [${path}]:`, error.message);
    throw error;
  }
}

function buildMessage(type, data = null, msg = '', code = 200) {
  return JSON.stringify({
    type,
    code,
    msg,
    data,
    timestamp: Date.now()
  });
}

function cleanConnection(ws, reason = '未知原因') {
  for (const [userId, conn] of connectionPool.entries()) {
    if (conn.ws === ws) {
      console.log(`连接断开 [${userId}]: ${reason}`);
      gameManager.leaveRoom(userId);
      clearDeviceSession(userId, ws);
      delete conn.inCall;
      connectionPool.delete(userId);
      break;
    }
  }
  if (ws.readyState === WebSocket.OPEN) {
    ws.close(1000, reason);
  }
}

// ======================== 核心业务逻辑 ========================
async function validateUserId(userId) {
  try {
    await requestPHPAPI(VALIDATE_USER_API, { userId });
    return true;
  } catch (error) {
    return false;
  }
}


async function fetchAndSendAllBaseData(userId, ws) {
  try {

    const [contacts, groups] = await Promise.all([
      requestPHPAPI(CONTACTS_API, { userId }),
      requestPHPAPI(GROUPS_API, { userId }),
    ]);
    ws.send(buildMessage('contacts_data', contacts, '联系人数据拉取成功'));
    ws.send(buildMessage('groups_data', groups, '群聊数据拉取成功'));
  } catch (error) {
    ws.send(buildMessage('error', null, `基础数据拉取失败: ${error.message}`, 400));
    cleanConnection(ws, `拉取基础数据失败: ${error.message}`);
  }
}
async function refreshContactsAndGroups(userId, ws) {
  try {
    const [contacts, groups] = await Promise.all([
      requestPHPAPI(CONTACTS_API, { userId }),
      requestPHPAPI(GROUPS_API, { userId })
    ]);
    ws.send(buildMessage('contacts_alldata', {
      contacts: contacts || [],
      groups: groups || []
    }, '数据刷新成功'));
    console.log(`合并刷新完成 [${userId}]`);
  } catch (error) {
    console.error(`合并刷新失败 [${userId}]:`, error.message);
    ws.send(buildMessage('error', null, `刷新失败: ${error.message}`, 500));
  }
}
async function refreshSpecificData(userId, ws, dataType) {
  try {
    let data, msg;
    switch (dataType) {
      case 'contacts':
        data = await requestPHPAPI(CONTACTS_API, { userId });
        msg = '联系人数据已刷新';
        ws.send(buildMessage('contacts_data', data, msg));
        break;
      case 'groups':
        data = await requestPHPAPI(GROUPS_API, { userId });
        msg = '群聊数据已刷新';
        ws.send(buildMessage('groups_data', data, msg));
        break;
      default:
        ws.send(buildMessage('error', null, `不支持的刷新类型: ${dataType}`, 400));
    }
  } catch (error) {
    ws.send(buildMessage('error', null, `刷新数据失败: ${error.message}`, 400));
  }
}
function handleReadReceipt(senderId, data, ws) {
  const { conversationId, messageIds, readerId, readTime, receiverId } = data;
  if (!conversationId || !messageIds || !messageIds.length || !readerId || !receiverId) {
    ws.send(buildMessage('error', null, '已读回执发送失败：缺少必要参数', 400));
    return;
  }
  const originalSenderConn = connectionPool.get(receiverId);
  if (originalSenderConn && originalSenderConn.ws.readyState === WebSocket.OPEN) {
    const readReceiptMsg = buildMessage('read_receipt', {
      conversationId: conversationId,
      messageIds: messageIds,
      readerId: readerId,
      readTime: readTime || Date.now()
    });
    originalSenderConn.ws.send(readReceiptMsg);
    ws.send(buildMessage('read_receipt_ack', {
      conversationId: conversationId,
      messageIds: messageIds,
      status: 'success',
      forwardedTo: receiverId
    }, '已读回执已处理'));
  }
}
function handleHeartbeat(ws, userId) {
  const conn = connectionPool.get(userId);
  if (!conn) return;
  conn.lastHeartbeat = Date.now();
  const heartbeatMsg = buildMessage('heartbeat_resp', { status: 'alive' });
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(heartbeatMsg);
  }
}
function handleRecallMessage(senderId, data, ws) {
  const { messageId, conversationId, receiverId } = data;
  if (!receiverId || !conversationId || !messageId) {
    console.error(`消息撤回失败 [${senderId}]: 缺少必要参数`);
    ws.send(buildMessage('error', null, '撤回失败：缺少必要参数', 400));
    return;
  }
  const receiverConn = connectionPool.get(receiverId);
  const isReceiverOnline = receiverConn && receiverConn.ws.readyState === WebSocket.OPEN;
  if (!isReceiverOnline) {
    ws.send(buildMessage('error', null, '撤回失败：对方不在线', 400));
    return;
  }
  const recallNotification = buildMessage('message_recalled', {
    messageId: messageId,
    conversationId: conversationId,
    senderId: senderId,
    receiverId: receiverId,
    recallTime: Date.now()
  });
  receiverConn.ws.send(recallNotification);
  ws.send(buildMessage('recall_success', {
    messageId: messageId,
    conversationId: conversationId
  }, '消息已撤回'));
}
function handleGroupMessage(senderId, message, ws) {
  const { conversationId, messageId, messageType, content, senderName, lock } = message;
  if (!conversationId || !conversationId.startsWith('group_')) {
    console.error(`群消息转发失败 [${senderId}]: 无效的群会话ID`);
    ws.send(buildMessage('error', null, '无效的群会话ID', 400));
    return;
  }
  getGroupMembers(conversationId).then(groupMembers => {
    if (!groupMembers || !Array.isArray(groupMembers) || groupMembers.length === 0) {
      console.error(`群消息转发失败 [${senderId}]: 群成员列表为空或无效`);
      ws.send(buildMessage('error', null, '无法获取群成员列表', 400));
      return;
    }
    const forwardData = {
      messageId,
      senderId,
      senderName: senderName || `用户${senderId}`,
      conversationId,
      messageType,
      content,
      sendTime: Date.now(),
      isSelf: false,
      status: 'received'
    };
    if (lock) {
      forwardData.lock = lock;
    }
    const forwardMessage = buildMessage('new_group_message', forwardData);
    const onlineMembers = [];
    const offlineMembers = [];
    for (const memberId of groupMembers) {
      if (String(memberId) === String(senderId)) continue;
      const memberConn = connectionPool.get(String(memberId));
      if (memberConn && memberConn.ws.readyState === WebSocket.OPEN) {
        memberConn.ws.send(forwardMessage);
        onlineMembers.push(memberId);
      } else {
        offlineMembers.push(memberId);
      }
    }
    if (offlineMembers.length > 0) {
      saveGroupOfflineMessages(conversationId, offlineMembers, {
        messageId,
        senderId,
        senderName: senderName || `用户${senderId}`,
        conversationId,
        messageType,
        content,
        sendTime: Date.now(),
        lock: lock ?? null
      }).catch(err => {
        console.error(`保存群离线消息失败:`, err.message);
      });
    }


    if (ws.readyState === WebSocket.OPEN) {
      ws.send(buildMessage('group_message_ack', {
        messageId,
        conversationId,
        status: 'success',
        onlineCount: onlineMembers.length,
        totalCount: groupMembers.length - 1
      }, '群消息已发送'));
    }
  }).catch(error => {
    console.error(`处理群消息失败 [${senderId}]:`, error.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(buildMessage('error', null, `群消息发送失败: ${error.message}`, 500));
    }
  });
}
const groupMemberCache = new Map();
const GROUP_CACHE_TTL = 5 * 60 * 1000;

async function getGroupMembers(conversationId, forceRefresh = false, ifkillno = false) {
  const groupId = conversationId.replace('group_', '');
  const killoryes = ifkillno ? 'y' : 'n';
  if (!forceRefresh) {
    const cached = groupMemberCache.get(groupId);
    if (cached && Date.now() - cached.timestamp < GROUP_CACHE_TTL) {
      return cached.members;
    }
  }
  try {
    const response = await axios({
      url: `${PHP_API_BASE}/group/members.php`,
      method: 'GET',
      params: { groupId, killoryes },
      timeout: 5000,
      headers: { 'X-API-Key': SECRET_KEY }
    });


    if (response.data && response.data.code === 200 && response.data.data) {
      const membersData = response.data.data.members;
      if (Array.isArray(membersData) && membersData.length > 0) {
        const members = membersData.map(m => String(m.user_id));
        groupMemberCache.set(groupId, {
          members,
          timestamp: Date.now()
        });
        return members;
      } else {
        console.warn(`群 [${groupId}] 没有成员或成员数据格式错误`);
        return [];
      }
    } else {
      console.warn(`获取群成员失败 [${groupId}]: API返回错误`, response.data);
      return [];
    }
  } catch (error) {
    console.error(`获取群成员失败 [${groupId}]:`, error.message);
    return [];
  }
}
async function saveGroupOfflineMessages(conversationId, memberIds, message) {
  for (const memberId of memberIds) {
    await saveOfflineMessage(memberId, {
      ...message,
      isGroupMessage: true,
      conversationId
    });
  }
}
// ======================== 音视频通话信令处理 ========================
function handleCallOffer(senderId, data, ws) {
  const { targetId, sdp, callType, callerId, timestamp } = data;
  const actualCallerId = callerId || senderId;
  const actualTargetId = targetId;
  console.log(`[通话] 用户 ${actualCallerId} 向 ${actualTargetId} 发起 ${callType || 'video'} 通话请求`);
  if (!actualTargetId) {
    console.error(`[通话] 缺少目标用户ID`);
    ws.send(buildMessage('error', null, '缺少目标用户ID', 400));
    return;
  }
  const targetConn = connectionPool.get(actualTargetId);
  if (!targetConn || targetConn.ws.readyState !== WebSocket.OPEN) {
    console.log(`[通话] 目标用户 ${actualTargetId} 不在线`);
    ws.send(buildMessage('call_reject', {
      targetId: actualCallerId,
      reason: '对方不在线'
    }, '对方不在线', 400));
    return;
  }
  if (targetConn.inCall) {
    console.log(`[通话] 目标用户 ${actualTargetId} 正在通话中`);
    ws.send(buildMessage('call_reject', {
      targetId: actualCallerId,
      reason: '对方正在通话中'
    }, '对方正在通话中', 400));
    return;
  }
  const callerConn = connectionPool.get(actualCallerId);
  if (callerConn) callerConn.inCall = true;
  targetConn.inCall = true;
  const offerMessage = buildMessage('call_offer', {
    callerId: actualCallerId,
    sdp: sdp,
    callType: callType || 'video',
    timestamp: timestamp || Date.now()
  });
  targetConn.ws.send(offerMessage);
  console.log(`[通话] 已转发通话请求从 ${actualCallerId} 到 ${actualTargetId}`);
  ws.send(buildMessage('call_ack', {
    targetId: actualTargetId,
    status: 'sent'
  }, '通话请求已发送'));
}

function handleCallAnswer(senderId, data, ws) {
  const { targetId, sdp, answererId, callType } = data;
  const actualAnswererId = answererId || senderId;
  const actualTargetId = targetId;

  console.log(`[通话] 用户 ${actualAnswererId} 应答了 ${actualTargetId} 的通话请求`);

  if (!actualTargetId) {
    console.error(`[通话] 缺少目标用户ID`);
    return;
  }

  const targetConn = connectionPool.get(actualTargetId);
  if (targetConn && targetConn.ws.readyState === WebSocket.OPEN) {
    const answerMessage = buildMessage('call_answer', {
      answererId: actualAnswererId,
      sdp: sdp,
      callType: callType || 'video'
    });
    targetConn.ws.send(answerMessage);
    console.log(`[通话] 已转发应答从 ${actualAnswererId} 到 ${actualTargetId}`);
  } else {
    console.log(`[通话] 目标用户 ${actualTargetId} 不在线，无法转发应答`);
    const answererConn = connectionPool.get(actualAnswererId);
    if (answererConn) answererConn.inCall = false;
  }
}

function handleCallIce(senderId, data, ws) {
  const { targetId, candidate, callerId, callType } = data;
  const actualSenderId = callerId || senderId;
  const actualTargetId = targetId;

  if (!actualTargetId || !candidate) {
    console.error(`[通话] ICE候选转发缺少必要参数`);
    return;
  }

  const targetConn = connectionPool.get(actualTargetId);
  if (targetConn && targetConn.ws.readyState === WebSocket.OPEN) {
    const iceMessage = buildMessage('call_ice', {
      senderId: actualSenderId,
      candidate: candidate,
      callType: callType || 'video'
    });
    targetConn.ws.send(iceMessage);
  }
}

function handleCallEnd(senderId, data, ws) {
  const { targetId, callerId, duration } = data;
  const actualCallerId = callerId || senderId;
  const actualTargetId = targetId;
  console.log(`[通话] 用户 ${actualCallerId} 结束了与 ${actualTargetId} 的通话，时长: ${duration || 0}秒`);
  const callerConn = connectionPool.get(actualCallerId);
  if (callerConn) callerConn.inCall = false;

  if (actualTargetId) {
    const targetConn = connectionPool.get(actualTargetId);
    if (targetConn && targetConn.ws.readyState === WebSocket.OPEN) {
      const endMessage = buildMessage('call_end', {
        callerId: actualCallerId,
        duration: duration || 0
      });
      targetConn.ws.send(endMessage);
      targetConn.inCall = false;
      console.log(`[通话] 已通知 ${actualTargetId} 通话结束`);
    }
  }

  ws.send(buildMessage('call_end_ack', {
    targetId: actualTargetId,
    status: 'ended'
  }, '通话已结束'));
}

function handleCallReject(senderId, data, ws) {
  const { targetId, callerId, reason } = data;
  const actualCallerId = callerId || senderId;
  const actualTargetId = targetId;
  console.log(`[通话] 用户 ${actualCallerId} 拒绝了 ${actualTargetId} 的通话请求，原因: ${reason || '用户拒绝'}`);
  if (actualTargetId) {
    const targetConn = connectionPool.get(actualTargetId);
    if (targetConn) targetConn.inCall = false;
  }
  const callerConn = connectionPool.get(actualCallerId);
  if (callerConn) callerConn.inCall = false;

  if (actualTargetId) {
    const targetConn = connectionPool.get(actualTargetId);
    if (targetConn && targetConn.ws.readyState === WebSocket.OPEN) {
      const rejectMessage = buildMessage('call_reject', {
        callerId: actualCallerId,
        reason: reason || '用户拒绝接听'
      });
      targetConn.ws.send(rejectMessage);
    }
  }
}

function handleCallControl(senderId, data, ws) {
  const { targetId, action, muted, off, callType } = data;
  if (!targetId) return;
  const targetConn = connectionPool.get(targetId);
  if (targetConn && targetConn.ws.readyState === WebSocket.OPEN) {
    const controlMessage = buildMessage('call_control', {
      senderId: senderId,
      action: action,
      muted: muted,
      off: off,
      callType: callType
    });
    targetConn.ws.send(controlMessage);
    console.log(`[通话] 用户 ${senderId} ${action === 'toggle_mic' ? (muted ? '关闭' : '开启') + '麦克风' : (off ? '关闭' : '开启') + '摄像头'}`);
  }
}
async function loadScheduledMessages() {
  try {
    const files = await fs.readdir(SCHEDULED_MSG_DIR);
    let loadedCount = 0;
    let expiredCount = 0;
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(SCHEDULED_MSG_DIR, file);
      const data = await fs.readFile(filePath, 'utf8');
      const schedule = JSON.parse(data);
      if (schedule.isGroup === undefined) {
        schedule.isGroup = schedule.conversationId && schedule.conversationId.startsWith('group_');
      }
      if (schedule.status === 'pending' && schedule.repeatType === 'none') {
        if (schedule.scheduleTime < Date.now()) {
          console.log(`发现已过期的定时消息 [${schedule.scheduleId}]，计划时间: ${new Date(schedule.scheduleTime).toLocaleString()}，当前时间: ${new Date().toLocaleString()}`);
          await deleteScheduledMessageFile(schedule.scheduleId);
          expiredCount++;
          continue;
        }
      }

      if (schedule.status === 'pending') {
        scheduledMessages.set(schedule.scheduleId, schedule);
        loadedCount++;
      } else {
        await deleteScheduledMessageFile(schedule.scheduleId);
      }
    }
    console.log(`已加载 ${loadedCount} 条定时消息，清理过期消息 ${expiredCount} 条`);
    startScheduleChecker();
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('加载定时消息失败:', err.message);
    }
  }
}
async function saveScheduledMessage(schedule) {
  const filePath = path.join(SCHEDULED_MSG_DIR, `${schedule.scheduleId}.json`);
  await fs.writeFile(filePath, JSON.stringify(schedule, null, 2));
}
async function deleteScheduledMessageFile(scheduleId) {
  const filePath = path.join(SCHEDULED_MSG_DIR, `${scheduleId}.json`);
  try {
    await fs.unlink(filePath);
    console.log(`已删除定时消息文件: ${scheduleId}.json`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('删除定时消息文件失败:', err.message);
    }
  }
}

async function addScheduledMessage(scheduleData) {
  const {
    scheduleId,
    senderId,
    receiverId,
    conversationId,
    messageType,
    content,
    scheduleTime,
    repeatType = 'none',
    repeatDays = [],
    status = 'pending',
    isGroup = false,
    hasChainHash = false
  } = scheduleData;

  const schedule = {
    scheduleId,
    senderId,
    receiverId,
    conversationId,
    messageType,
    content,
    scheduleTime,
    repeatType,
    repeatDays,
    status,
    createdAt: Date.now(),
    lastSentTime: null,
    sendCount: 0,
    isGroup: isGroup,
    hasChainHash: hasChainHash
  };

  scheduledMessages.set(scheduleId, schedule);
  await saveScheduledMessage(schedule);
  console.log(`已添加定时消息 [${scheduleId}]，发送时间: ${new Date(scheduleTime).toLocaleString()}，当前时间: ${new Date().toLocaleString()}`);
  return schedule;
}

async function cancelScheduledMessage(scheduleId, userId) {
  const schedule = scheduledMessages.get(scheduleId);
  if (!schedule) {
    return { success: false, message: '定时消息不存在' };
  }
  if (schedule.senderId !== userId) {
    return { success: false, message: '无权取消此定时消息' };
  }
  await deleteScheduledMessageFile(scheduleId);
  scheduledMessages.delete(scheduleId);
  console.log(`已取消并删除定时消息 [${scheduleId}]`);
  return { success: true, message: '定时消息已取消' };
}


async function getUserScheduledMessages(userId) {
  const userSchedules = [];
  for (const schedule of scheduledMessages.values()) {
    if (schedule.senderId === userId && schedule.status === 'pending') {
      userSchedules.push({
        scheduleId: schedule.scheduleId,
        receiverId: schedule.receiverId,
        conversationId: schedule.conversationId,
        messageType: schedule.messageType,
        content: schedule.content,
        scheduleTime: schedule.scheduleTime,
        repeatType: schedule.repeatType,
        repeatDays: schedule.repeatDays,
        sendCount: schedule.sendCount,
        isGroup: schedule.isGroup || false
      });
    }
  }
  return userSchedules;
}

function calculateNextScheduleTime(schedule) {
  const now = Date.now();
  let nextTime = schedule.scheduleTime;
  if (schedule.status !== 'pending') {
    return null;
  }
  if (schedule.repeatType === 'none') {
    return nextTime;
  }
  if (now > schedule.scheduleTime) {
    const scheduleDate = new Date(schedule.scheduleTime);
    switch (schedule.repeatType) {
      case 'daily':
        nextTime = schedule.scheduleTime;
        while (nextTime <= now) {
          nextTime += 24 * 60 * 60 * 1000;
        }
        break;

      case 'weekly':
        nextTime = schedule.scheduleTime;
        while (nextTime <= now) {
          nextTime += 7 * 24 * 60 * 60 * 1000;
        }
        break;

      case 'monthly':
        nextTime = schedule.scheduleTime;
        while (nextTime <= now) {
          const date = new Date(nextTime);
          date.setMonth(date.getMonth() + 1);
          nextTime = date.getTime();
        }
        break;

      default:
        return null;
    }
  }

  return nextTime;
}

async function executeScheduledMessage(schedule) {
  const {
    senderId,
    receiverId,
    conversationId,
    messageType,
    content,
    scheduleId,
    isGroup = false
  } = schedule;
  if (isGroup || conversationId.startsWith('group_')) {
    return await executeGroupScheduledMessage(schedule);
  }
  return await executePrivateScheduledMessage(schedule);
}
async function executePrivateScheduledMessage(schedule) {
  const { senderId, receiverId, conversationId, messageType, content, scheduleId } = schedule;

  const relationCheck = checkFriendRelation(senderId, receiverId);
  if (!relationCheck.isValid) {
    console.log(`定时消息 [${scheduleId}] 发送失败: ${relationCheck.tip}`);
    const senderConn = connectionPool.get(senderId);
    if (senderConn && senderConn.ws.readyState === WebSocket.OPEN) {
      senderConn.ws.send(buildMessage('scheduled_message_failed', {
        scheduleId,
        reason: relationCheck.tip
      }, '定时消息发送失败'));
    }
    await deleteScheduledMessageFile(scheduleId);
    scheduledMessages.delete(scheduleId);
    return false;
  }

  const messageId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  const messageData = {
    messageId,
    senderId,
    receiverId,
    conversationId,
    messageType: messageType || 'text',
    content: content,
    sendTime: Date.now(),
    isScheduled: true,
    scheduleId
  };
  if (content.chain_hash) {
    messageData.chain_prev_hash = content.chain_prev_hash;
    messageData.chain_hash = content.chain_hash;
  }

  const receiverConn = connectionPool.get(receiverId);
  const isReceiverOnline = receiverConn && receiverConn.ws.readyState === WebSocket.OPEN;

  if (isReceiverOnline) {
    const forwardMessage = buildMessage('new_message', {
      ...messageData,
      isSelf: false,
      status: 'received'
    });
    receiverConn.ws.send(forwardMessage);
    console.log(`定时消息 [${scheduleId}] 已发送到 [${receiverId}]`);
  } else {
    await saveOfflineMessage(receiverId, {
      ...messageData,
      isGroupMessage: false
    });
    console.log(`定时消息 [${scheduleId}] 已保存为离线消息`);
  }

  const senderConn = connectionPool.get(senderId);
  if (senderConn && senderConn.ws.readyState === WebSocket.OPEN) {
    const ackMsg = buildMessage('scheduled_message_sent', {
      scheduleId,
      messageId,
      sendTime: Date.now(),
      isGroup: false
    }, '定时消息已发送');
    senderConn.ws.send(ackMsg);
  }

  if (schedule.repeatType !== 'none') {
    const nextTime = calculateNextScheduleTime(schedule);
    if (nextTime) {
      schedule.scheduleTime = nextTime;
      schedule.lastSentTime = Date.now();
      schedule.sendCount = (schedule.sendCount || 0) + 1;
      await saveScheduledMessage(schedule);
      console.log(`定时消息 [${scheduleId}] 下次发送时间: ${new Date(nextTime).toLocaleString()}`);
      return true;
    } else {
      schedule.status = 'completed';
      await saveScheduledMessage(schedule);
      await deleteScheduledMessageFile(scheduleId);
      scheduledMessages.delete(scheduleId);
      return true;
    }
  } else {
    await deleteScheduledMessageFile(scheduleId);
    scheduledMessages.delete(scheduleId);
  }

  return true;
}
async function executeGroupScheduledMessage(schedule) {
  const {
    senderId,
    conversationId,
    messageType,
    content,
    scheduleId,
    senderName
  } = schedule;

  const members = await getGroupMembers(conversationId);
  if (!members || members.length === 0) {
    console.log(`群定时消息 [${scheduleId}] 发送失败: 群成员列表为空`);
    const senderConn = connectionPool.get(senderId);
    if (senderConn && senderConn.ws.readyState === WebSocket.OPEN) {
      senderConn.ws.send(buildMessage('scheduled_message_failed', {
        scheduleId,
        reason: '群成员列表为空'
      }, '定时消息发送失败'));
    }
    await deleteScheduledMessageFile(scheduleId);
    scheduledMessages.delete(scheduleId);
    return false;
  }

  if (!members.includes(String(senderId))) {
    console.log(`群定时消息 [${scheduleId}] 发送失败: 发送者已不在群内`);
    const senderConn = connectionPool.get(senderId);
    if (senderConn && senderConn.ws.readyState === WebSocket.OPEN) {
      senderConn.ws.send(buildMessage('scheduled_message_failed', {
        scheduleId,
        reason: '您已不在该群聊中'
      }, '定时消息发送失败'));
    }
    await deleteScheduledMessageFile(scheduleId);
    scheduledMessages.delete(scheduleId);
    return false;
  }

  const messageId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  const senderNameDisplay = senderName || `用户${senderId}`;

  const forwardData = {
    messageId,
    senderId,
    senderName: senderNameDisplay,
    conversationId,
    messageType: messageType || 'text',
    content,
    sendTime: Date.now(),
    isScheduled: true,
    scheduleId,
    isSelf: false,
    status: 'received'
  };

  const forwardMessage = buildMessage('new_group_message', forwardData);

  let onlineCount = 0;
  let offlineMembers = [];

  for (const memberId of members) {
    if (String(memberId) === String(senderId)) continue;

    const memberConn = connectionPool.get(String(memberId));
    if (memberConn && memberConn.ws.readyState === WebSocket.OPEN) {
      memberConn.ws.send(forwardMessage);
      onlineCount++;
    } else {
      offlineMembers.push(memberId);
    }
  }

  if (offlineMembers.length > 0) {
    await saveGroupOfflineMessages(conversationId, offlineMembers, {
      ...forwardData,
      isGroupMessage: true
    });
  }

  console.log(`群定时消息 [${scheduleId}] 已发送，在线 ${onlineCount} 人，离线 ${offlineMembers.length} 人`);

  const senderConn = connectionPool.get(senderId);
  if (senderConn && senderConn.ws.readyState === WebSocket.OPEN) {
    const ackMsg = buildMessage('scheduled_message_sent', {
      scheduleId,
      messageId,
      sendTime: Date.now(),
      onlineCount,
      offlineCount: offlineMembers.length,
      isGroup: true
    }, '群定时消息已发送');
    senderConn.ws.send(ackMsg);
  }

  if (schedule.repeatType !== 'none') {
    const nextTime = calculateNextScheduleTime(schedule);
    if (nextTime) {
      schedule.scheduleTime = nextTime;
      schedule.lastSentTime = Date.now();
      schedule.sendCount = (schedule.sendCount || 0) + 1;
      await saveScheduledMessage(schedule);
      console.log(`群定时消息 [${scheduleId}] 下次发送时间: ${new Date(nextTime).toLocaleString()}`);
      return true;
    } else {
      schedule.status = 'completed';
      await saveScheduledMessage(schedule);
      await deleteScheduledMessageFile(scheduleId);
      scheduledMessages.delete(scheduleId);
      return true;
    }
  } else {
    await deleteScheduledMessageFile(scheduleId);
    scheduledMessages.delete(scheduleId);
  }

  return true;
}

function startScheduleChecker() {
  if (scheduleCheckInterval) {
    clearInterval(scheduleCheckInterval);
  }

  scheduleCheckInterval = setInterval(async () => {
    const now = Date.now();
    const toSend = [];

    for (const [scheduleId, schedule] of scheduledMessages.entries()) {
      if (schedule.status !== 'pending') continue;
      if (schedule.scheduleTime <= now) {
        toSend.push(schedule);
      }
    }
    for (const schedule of toSend) {
      console.log(`执行定时消息 [${schedule.scheduleId}], 计划时间: ${new Date(schedule.scheduleTime).toLocaleString()}`);
      await executeScheduledMessage(schedule);
    }
  }, SCHEDULED_CHECK_INTERVAL);
  setTimeout(() => {
    const now = Date.now();
    const toSend = [];
    for (const [scheduleId, schedule] of scheduledMessages.entries()) {
      if (schedule.status === 'pending' && schedule.scheduleTime <= now) {
        toSend.push(schedule);
      }
    }
    for (const schedule of toSend) {
      executeScheduledMessage(schedule);
    }
  }, 5000);
}
function handleAddScheduledMessage(senderId, data, ws) {
  const {
    receiverId,
    conversationId,
    messageType,
    content,
    scheduleTime,
    repeatType = 'none',
    repeatDays = []
  } = data;

  if (!conversationId || !scheduleTime) {
    ws.send(buildMessage('error', null, '缺少必要参数', 400));
    return;
  }

  const isGroup = conversationId.startsWith('group_');

  if (isGroup && !receiverId) {
    ws.send(buildMessage('error', null, '群聊定时消息需要指定群ID', 400));
    return;
  }

  if (!isGroup && !receiverId) {
    ws.send(buildMessage('error', null, '缺少接收者ID', 400));
    return;
  }

  const minScheduleTime = Date.now() + 3 * 60 * 1000;
  if (scheduleTime < minScheduleTime) {
    ws.send(buildMessage('error', null, '定时发送时间至少要在3分钟后', 400));
    return;
  }

  if (!['none', 'daily', 'weekly', 'monthly'].includes(repeatType)) {
    ws.send(buildMessage('error', null, '不支持的重复类型', 400));
    return;
  }
  if (isGroup) {
    getGroupMembers(conversationId).then(members => {
      if (!members || !members.includes(String(senderId))) {
        ws.send(buildMessage('error', null, '您不在该群聊中，无法设置定时消息', 403));
        return;
      }
      doAddScheduledMessage(senderId, receiverId, conversationId, messageType, content, scheduleTime, repeatType, repeatDays, ws, true);
    }).catch(err => {
      ws.send(buildMessage('error', null, `验证群成员失败: ${err.message}`, 500));
    });
    return;
  }

  doAddScheduledMessage(senderId, receiverId, conversationId, messageType, content, scheduleTime, repeatType, repeatDays, ws, false);
}

function doAddScheduledMessage(senderId, receiverId, conversationId, messageType, content, scheduleTime, repeatType, repeatDays, ws, isGroup) {
  const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 10)}`;
  const contentObj = typeof content === 'string' ? { text: content } : content;
  const scheduleData = {
    scheduleId,
    senderId,
    receiverId: isGroup ? conversationId : receiverId,
    conversationId,
    messageType: messageType || 'text',
    content: contentObj,
    scheduleTime,
    repeatType,
    repeatDays,
    status: 'pending',
    isGroup: isGroup,
    createdAt: Date.now(),
    hasChainHash: contentObj.chain_hash ? true : false
  };

  addScheduledMessage(scheduleData).then(() => {
    ws.send(buildMessage('scheduled_message_added', {
      scheduleId,
      scheduleTime,
      repeatType,
      isGroup
    }, '定时消息已添加'));
  }).catch(err => {
    ws.send(buildMessage('error', null, `添加定时消息失败: ${err.message}`, 500));
  });
}


function handleCancelScheduledMessage(senderId, data, ws) {
  const { scheduleId } = data;
  if (!scheduleId) {
    ws.send(buildMessage('error', null, '缺少定时消息ID', 400));
    return;
  }
  cancelScheduledMessage(scheduleId, senderId).then(result => {
    if (result.success) {
      ws.send(buildMessage('scheduled_message_cancelled', {
        scheduleId
      }, result.message));
    } else {
      ws.send(buildMessage('error', null, result.message, 400));
    }
  }).catch(err => {
    ws.send(buildMessage('error', null, `取消失败: ${err.message}`, 500));
  });
}
function handleGetScheduledMessages(senderId, data, ws) {
  getUserScheduledMessages(senderId).then(messages => {
    ws.send(buildMessage('scheduled_message_list', {
      messages,
      total: messages.length
    }, '获取定时消息列表成功'));
  }).catch(err => {
    ws.send(buildMessage('error', null, `获取列表失败: ${err.message}`, 500));
  });
}
function handleClientMessage(rawMessage, ws, userId) {
  try {
    const message = JSON.parse(rawMessage);
    const limit = wsCheckLimit(ws, userId, message.type);
    if (!limit.ok) {
      sendRateLimitError(ws, limit.retryAfter);
      return;
    }
    switch (message.type) {
      case 'heartbeat':
        handleHeartbeat(ws, userId);
        break;
      case 'ping':
        ws.send(buildMessage('pong', null, '连接正常'));
        break;
      case 'system_i_msg':
        handleSystemMessage(userId, message.data, ws);
        break;
      case 'refresh_contacts':
        refreshSpecificData(userId, ws, 'contacts');
        break;
      case 'call_offer':
        handleCallOffer(userId, message.data, ws);
        break;
      case 'call_answer':
        handleCallAnswer(userId, message.data, ws);
        break;
      case 'call_ice':
        handleCallIce(userId, message.data, ws);
        break;
      case 'call_end':
        handleCallEnd(userId, message.data, ws);
        break;
      case 'call_reject':
        handleCallReject(userId, message.data, ws);
        break;
      case 'call_control':
        handleCallControl(userId, message.data, ws);
        break;
      case 'refresh_groups':
        refreshSpecificData(userId, ws, 'groups');
        break;
      case 'refresh_groupsandusers':
        refreshContactsAndGroups(userId, ws);
        break;
      case 'add_scheduled_message':
        handleAddScheduledMessage(userId, message.data, ws);
        break;
      case 'cancel_scheduled_message':
        handleCancelScheduledMessage(userId, message.data, ws);
        break;
      case 'get_scheduled_messages':
        handleGetScheduledMessages(userId, message.data, ws);
        break;
      case 'refresh_relation':
        refreshUserRelationCache(userId);
        ws.send(buildMessage('success', null, '关系缓存已刷新'));
        break;
      case 'new_message':
        handleNewMessageFromClient(userId, message.data, ws);
        ws.send(buildMessage('message_ack', {
          messageId: message.data.messageId,
          status: 'success'
        }));
        break;
      case 'offline_message_ack':
        console.log(`用户 [${userId}] 确认收到离线消息: ${message.data.messageId}`);
        break;
      case 'new_group_message':
        try {
          handleGroupMessage(userId, message.data, ws);
        } catch (error) {
          console.error(`处理群消息失败 [${userId}]:`, error);
          ws.send(buildMessage('error', null, '群消息处理失败', 500));
        }
        break;
      case 'recall_message':
        handleRecallMessage(userId, message.data, ws);
        break;
      case 'typing_status':
        handleTypingStatus(userId, message.data, ws);
        break;
      case 'online':
        break;
      case 'read_receipt':
        handleReadReceipt(userId, message.data, ws);
        break;
      case 'game_create_room':
      case 'game_update_setting':
      case 'game_kick_player':
      case 'game_join_room':
      case 'game_list':
      case 'game_leave_room':
      case 'game_room_list':
      case 'game_room_info':
      case 'game_set_ready':
      case 'game_start':
      case 'game_surrender':
      case 'game_action':
        handleGameMessage(userId, message, ws);
        break;
      default:
        console.log(`未知消息类型 [${userId}]:`, message.type);
        ws.send(buildMessage('error', null, `未知消息类型: ${message.type}`, 400));
    }
  } catch (error) {
    console.error(`解析客户端消息失败 [${userId}]:`, error.message);
    ws.send(buildMessage('error', null, '消息格式错误', 400));
  }
}
function handleSystemMessage(senderId, data, ws) {
  const { receiverId, messageType, content } = data;

  if (!receiverId) {
    console.error(`系统消息转发失败 [${senderId}]: 缺少receiverId`);
    return;
  }

  const receiverConn = connectionPool.get(receiverId);

  if (receiverConn && receiverConn.ws.readyState === WebSocket.OPEN) {
    const systemMsg = buildMessage('system_message_i', {
      receiverId: receiverId,
      messageType: messageType,
      content: content.systemText,
      sendTime: Date.now()
    });
    receiverConn.ws.send(systemMsg);
  } else {
    saveOfflineMessage(receiverId, {
      messageId: `system_${Date.now()}`,
      senderId: senderId,
      receiverId: receiverId,
      messageType: 'system',
      content: content,
      sendTime: Date.now(),
      isSystem: true
    }).catch(err => {
      console.error(`保存系统离线消息失败:`, err.message);
    });
  }
}
function handleTypingStatus(senderId, data, ws) {
  const { conversationId, receiverId, status, timestamp } = data;

  if (!conversationId || !receiverId || !status) {
    console.error(`输入状态处理失败 [${senderId}]: 缺少必要参数`);
    return;
  }
  const receiverConn = connectionPool.get(receiverId);
  if (receiverConn && receiverConn.ws.readyState === WebSocket.OPEN) {
    const typingMsg = buildMessage('typing_status', {
      conversationId: conversationId,
      senderId: senderId,
      status: status,
      timestamp: timestamp || Date.now()
    });
    receiverConn.ws.send(typingMsg);
  }
}
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
function handleNewMessageFromClient(senderId, message, ws) {
  const { receiverId, conversationId, messageId, messageType, content, lock } = message;
  if (!conversationId.startsWith('group_')) {
    const relationCheck = checkFriendRelation(senderId, receiverId);
    if (!relationCheck.isValid) {
      const forwardData = {
        messageId,
        senderId,
        receiverId,
        conversationId,
        messageType,
        content,
        sendTime: Date.now(),
        isSelf: false,
        status: 'received'
      };
      if (lock) {
        forwardData.lock = lock;
      }
      const systemMsg = buildMessage('new_message', forwardData);
      ws.send(systemMsg);
      return;
    }
  }
  if (!receiverId || !conversationId) {
    console.error(`消息转发失败 [${senderId}]: 缺少receiverId或conversationId`);
    return;
  }
  if (!connectionPool.has(receiverId)) {
    saveOfflineMessage(receiverId, {
      messageId,
      senderId,
      receiverId,
      conversationId,
      messageType,
      content,
      sendTime: Date.now(),
      lock: lock ?? null
    }).catch(err => {
      console.error(`保存离线消息失败 [${receiverId}]:`, err.message);
    });
    return;
  }

  let isReceiverOnline = false;
  const conn = connectionPool.get(receiverId);
  if (conn && conn.ws.readyState === WebSocket.OPEN) {
    const forwardMessage = buildMessage('new_message', {
      messageId,
      senderId,
      receiverId,
      conversationId,
      messageType,
      content,
      sendTime: Date.now(),
      isSelf: false,
      status: 'received',
      lock: lock ?? null
    });
    conn.ws.send(forwardMessage);
    isReceiverOnline = true;
  }

  if (!isReceiverOnline) {
    saveOfflineMessage(receiverId, {
      messageId,
      senderId,
      receiverId,
      conversationId,
      messageType,
      content,
      sendTime: Date.now(),
      lock: lock ?? null
    }).catch(err => {
      console.error(`保存离线消息失败 [${receiverId}]:`, err.message);
    });
  }
}
async function saveOfflineMessage(userId, message) {
  const userDir = path.join(OFFLINE_MSG_DIR, userId);
  try {
    await fs.mkdir(userDir, { recursive: true });
  } catch (err) {
  }
  const filePath = path.join(userDir, `${message.senderId}.json`);
  try {
    let messages = [];
    try {
      const data = await fs.readFile(filePath, 'utf8');
      messages = JSON.parse(data);
    } catch (err) {
    }
    messages.push(message);
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2));
    console.log(`已保存离线消息：用户 [${userId}] 来自 [${message.senderId}]`);
  } catch (err) {
    throw new Error(`保存离线消息失败: ${err.message}`);
  }
}

async function sendOfflineMessages(userId, ws) {
  const userDir = path.join(OFFLINE_MSG_DIR, userId);
  try {
    const files = await fs.readdir(userDir).catch(err => {
      if (err.code === 'ENOENT') return [];
      throw err;
    });
    if (files.length === 0) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(buildMessage('offline_messages_complete', {
          totalCount: 0,
          message: '无离线消息'
        }));
      }
      return;
    }
    const allMessages = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(userDir, file);
      try {
        const data = await fs.readFile(filePath, 'utf8');
        const messages = JSON.parse(data);
        allMessages.push(...messages);
      } catch (err) {
        console.error(`读取离线消息文件失败 [${file}]:`, err.message);
      }
    }

    if (allMessages.length > 0) {
      allMessages.sort((a, b) => a.sendTime - b.sendTime);
      const messageQueue = [...allMessages];
      let sentCount = 0;
      let failedMessages = [];
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(buildMessage('offline_messages_start', {
          totalCount: allMessages.length,
          message: `开始同步 ${allMessages.length} 条离线消息`
        }));
      }

      const sendNextMessage = async () => {
        if (messageQueue.length === 0) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(buildMessage('offline_messages_complete', {
              totalCount: allMessages.length,
              successCount: sentCount,
              failedCount: failedMessages.length,
              message: '离线消息同步完成'
            }));
          }

          if (failedMessages.length > 0) {
            const failedDir = path.join(OFFLINE_MSG_DIR, `${userId}_failed`);
            await fs.mkdir(failedDir, { recursive: true });

            for (const failedMsg of failedMessages) {
              const failedPath = path.join(failedDir, `${failedMsg.senderId}_${Date.now()}.json`);
              await fs.writeFile(failedPath, JSON.stringify([failedMsg], null, 2));
            }
            console.log(`已将 ${failedMessages.length} 条失败消息保存到 ${failedDir}`);
          }


          setTimeout(async () => {
            try {
              await fs.rm(userDir, { recursive: true, force: true });
              console.log(`已删除离线消息目录: ${userDir}`);
            } catch (rmError) {
              console.error(`删除离线消息目录失败:`, rmError);
            }
          }, 5000);

          return;
        }

        if (ws.readyState !== WebSocket.OPEN) {
          console.log(`WebSocket已关闭，停止发送离线消息`);
          failedMessages.push(...messageQueue);
          return;
        }

        const msg = messageQueue.shift();

        try {
          ws.send(buildMessage('new_message_oine', {
            ...msg,
            isSelf: false,
            status: 'offline',
            totalCount: allMessages.length,
            currentIndex: sentCount + 1
          }));

          console.log(`发送离线消息 ${sentCount + 1}/${allMessages.length}: ${msg.messageId}`);
          sentCount++;
          const delay = allMessages.length > 100 ? 200 : 300;
          setTimeout(sendNextMessage, delay);

        } catch (error) {
          console.error(`发送离线消息失败:`, error);
          failedMessages.push(msg);
          setTimeout(sendNextMessage, 500);
        }
      };

      sendNextMessage();
    } else {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(buildMessage('offline_messages_complete', {
          totalCount: 0,
          message: '无离线消息'
        }));
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`处理离线消息失败 [${userId}]:`, err.message);
    }
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(buildMessage('offline_messages_complete', {
        totalCount: 0,
        error: err.message,
        message: '离线消息处理完成（部分可能失败）'
      }));
    }
  }
}
async function handleNewConnection(ws, req) {
  const urlParts = req.url.split('?');
  const queryString = urlParts[1] || '';
  const urlParams = new URLSearchParams(queryString);
  const userId = String(urlParams.get('userId'));
  if (!userId) {
    ws.send(buildMessage('validate_result', null, '缺少用户ID', 400));
    ws.close(4001, '缺少用户ID');
    return;
  }
  const isValid = await validateUserId(userId);
  if (!isValid) {
    ws.send(buildMessage('validate_result', null, '用户ID不存在或已失效', 400));
    ws.close(4002, '用户ID不合法');
    return;
  }
  const deviceId = generateDeviceId(req);
  const isNewDevice = handleDuplicateConnection(userId, ws, deviceId, req);
  if (isNewDevice) {
    console.log(`[设备检测] 用户 [${userId}] 在新设备登录，设备ID: ${deviceId}`);
  }
  console.log(`用户 [${userId}] 连接成功`);
  ws.send(buildMessage('validate_result', { userId }, '用户校验通过'));
  const existingConn = connectionPool.get(userId);
  if (existingConn && existingConn.ws !== ws && existingConn.ws.readyState === WebSocket.OPEN) {
    console.log(`[设备检测] 发现已存在的连接 [${userId}]，准备关闭`);
    const kickMessage = buildMessage('kicked_out', {
      reason: '其他设备登录',
      timestamp: Date.now()
    }, '您的账号在其他设备上登录');
    existingConn.ws.send(kickMessage);
    setTimeout(() => {
      if (existingConn.ws.readyState === WebSocket.OPEN) {
        existingConn.ws.close(4003, '账号在其他设备登录');
      }
    }, 500);
    connectionPool.delete(userId);
  }
  connectionPool.set(userId, {
    ws,
    lastHeartbeat: Date.now(),
    reconnectAttempts: 0,
    deviceId: deviceId
  });
  await sendOfflineMessages(userId, ws);
  await fetchAndSendAllBaseData(userId, ws);
  ws.on('message', (rawMessage) => {
    handleClientMessage(rawMessage.toString(), ws, userId);
  });

  ws.on('close', (code, reason) => {
    cleanConnection(ws, `连接关闭 [${code}]: ${reason.toString()}`);
  });

  ws.on('error', (error) => {
    cleanConnection(ws, `连接错误: ${error.message}`);
  });
}
setInterval(() => {
  const now = Date.now();
  for (const [groupId, cache] of groupMemberCache.entries()) {
    if (now - cache.timestamp > GROUP_CACHE_TTL) {
      groupMemberCache.delete(groupId);
    }
  }
}, GROUP_CACHE_TTL);
// ========================HTTP服务器 ========================
const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Method Not Allowed' }));
    return;
  }


  if (req.url === '/api/refresh-group-cache') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { groupId, type, ownerId } = data;
        if (groupId && type) {
          if (type === 'quit') {
            groupMemberCache.delete(groupId);
            await getGroupMembers(`group_${groupId}`, true);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: '群缓存已刷新'
            }));
          } else if (type === 'destory') {
            const groupMembers = await getGroupMembers(`group_${groupId}`, true, true);
            if (groupMembers && Array.isArray(groupMembers) && groupMembers.length > 0) {
              const destroyMessage = buildMessage('group_destroyed', {
                groupId: groupId,
                message: '群聊已被解散',
                disbandTime: Date.now()
              });
              let notifiedCount = 0;
              for (const memberId of groupMembers) {
                if (ownerId && String(memberId) === String(ownerId)) {
                  continue;
                }
                const memberConn = connectionPool.get(String(memberId));
                if (memberConn && memberConn.ws.readyState === WebSocket.OPEN) {
                  memberConn.ws.send(destroyMessage);
                  notifiedCount++;
                }
              }
              groupMemberCache.delete(groupId);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: '群聊已解散，通知已发送',
                data: {
                  groupId: groupId,
                  notifiedCount: notifiedCount,
                  totalMembers: groupMembers.length
                }
              }));
            } else {
              groupMemberCache.delete(groupId);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: '群聊已解散（无成员）'
              }));
            }
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: '无效的类型'
            }));
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: '缺少元素ID及类型'
          }));
        }
      } catch (error) {
        console.error('处理刷新群缓存请求失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: error.message
        }));
      }
    });
    return;
  }
  if (req.url === '/api/notify-relation-update') {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== SECRET_KEY) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Unauthorized' }));
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { type, userId, friendId, method } = data;

        if (type !== 'relation_updated' || !userId || !friendId || method === undefined) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid request data' }));
          return;
        }
        await updateRelationCacheFromNotification(userId, friendId, method);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Relation cache updated successfully'
        }));
      } catch (error) {
        console.error('处理PHP通知失败:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Internal server error: ' + error.message
        }));
      }
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, message: 'Not Found' }));
});

// ======================== 服务器启动 ========================
loadScheduledMessages().then(() => {
  for (const [id, schedule] of scheduledMessages.entries()) {
    if (schedule.status === 'pending') {
      console.log(`待发送定时消息 [${id}]: ${new Date(schedule.scheduleTime).toLocaleString()}`);
    }
  }
});
setInterval(() => {
  let cleanedCount = 0;
  for (const [scheduleId, schedule] of scheduledMessages.entries()) {
    if (schedule.status !== 'pending') {
      scheduledMessages.delete(scheduleId);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    console.log(`清理内存中的非待发消息: ${cleanedCount} 条`);
  }
}, 60 * 60 * 1000);
initRelationCache().then(() => {
  const wss = new WebSocket.Server({ port: WS_PORT });
  wss.on('connection', handleNewConnection);
  setInterval(cleanupGameRooms, 5 * 60 * 1000);
  httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP服务器已启动，监听端口：${HTTP_PORT}`);
  });
  setInterval(() => {
    const now = Date.now();
    for (const [userId, conn] of connectionPool.entries()) {
      if (now - conn.lastHeartbeat > HEARTBEAT_TIMEOUT) {
        console.log(`心跳超时 [${userId}]，断开连接`);
        cleanConnection(conn.ws, '心跳超时');
      }
    }
  }, HEARTBEAT_TIMEOUT / 2);
  console.log(`Ws服务器已启动，监听端口：${WS_PORT}`);
});
process.on('SIGINT', () => {
  console.log('\n正在关闭WebSocket服务器...');
  for (const [userId, conn] of connectionPool.entries()) {
    conn.ws.close(1000, '服务器关闭');
  }
  deviceSessions.clear();
  if (scheduleCheckInterval) {
    clearInterval(scheduleCheckInterval);
  }
  httpServer.close(() => {
    console.log('HTTP服务器已关闭');
  });
  videoServer.close(() => {
    console.log('音视频服务已关闭');
  });
  wss.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});