const { GameManager } = require('./game');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const gameManager = new GameManager();
function loadAllGames() {
    const gamesDir = path.join(__dirname, 'games');
    if (!fs.existsSync(gamesDir)) return;

    const files = fs.readdirSync(gamesDir);
    for (const file of files) {
        if (!file.endsWith('.js')) continue;
        try {
            const GameClass = require(path.join(gamesDir, file));
            const handler = new GameClass();
            gameManager.registerGame(handler.gameType, handler);
            console.log(`已加载游戏: ${handler.gameName} (${handler.gameType})`);
        } catch (err) {
            console.error(`加载游戏 ${file} 失败:`, err.message);
        }
    }
}

loadAllGames();

function buildMessages(type, data = null, msg = '', code = 200) {
    return JSON.stringify({
        type,
        code,
        msg,
        data,
        timestamp: Date.now()
    });
}
function handleGameSurrender(userId, data, ws) {
    const roomId = gameManager.playerRoomMap.get(userId);
    if (!roomId) {
        ws.send(buildMessages('game_error', null, '你不在任何房间中', 400));
        return;
    }

    const room = gameManager.rooms.get(roomId);
    if (!room) {
        ws.send(buildMessages('game_error', null, '房间不存在', 400));
        return;
    }

    if (room.status !== 'playing') {
        ws.send(buildMessages('game_error', null, '游戏未开始或已结束', 400));
        return;
    }

    const state = room.gameState;

    if (state.surrenderPlayer) {
        ws.send(buildMessages('game_error', null, '已有玩家投降', 400));
        return;
    }

    state.surrenderPlayer = userId;
    state.surrenderTime = Date.now();

    const winnerId = state.players.find(id => id !== userId);
    state.winner = winnerId;
    state.status = 'ended';
    room.status = 'waiting';
    state.endTime = Date.now();

    const winnerName = room.players.get(winnerId)?.nickname || winnerId;
    const loserName = room.players.get(userId)?.nickname || userId;

    let settlement = { winnerWin: 0, loserLose: 0, betAmount: 0, odds: 0, totalBet: 0 };
    if (room.betEnabled && winnerId) {
        settlement = room.calculateSettlement(winnerId);
    }

    const playersData = state.players.map(id => {
        const player = room.players.get(id);
        const isWinner = id === winnerId;
        return {
            userId: id,
            nickname: player?.nickname || id,
            isWinner: isWinner,
            isSurrender: id === userId,
            gcoinChange: isWinner ? settlement.winnerWin : (id === userId ? -settlement.loserLose : 0)
        };
    });

    gameManager.broadcastToRoom(room.roomId, {
        type: 'game_over',
        code: 200,
        data: {
            winner: winnerId,
            winnerName: winnerName,
            reason: `${loserName} 选择了投降，${winnerName} 获胜！`,
            players: playersData,
            scores: Object.fromEntries(
                state.players.map(id => [id, id === winnerId ? 2 : 0])
            ),
            settlement: {
                enabled: room.betEnabled,
                betAmount: settlement.betAmount,
                odds: settlement.odds,
                totalBet: settlement.totalBet,
                winnerWin: settlement.winnerWin,
                loserLose: settlement.loserLose
            }
        },
        timestamp: Date.now()
    });

    const handler = gameManager.gameHandlers.get(room.gameType);
    if (handler && typeof handler.saveMatchResult === 'function') {
        handler.saveMatchResult(state, room, gameManager, settlement);
    }

    ws.send(buildMessages('game_surrender_ack', {
        status: 'success'
    }, '投降成功'));
    if (data && data.forceExit === true) {
        room.removePlayer(userId);
        gameManager.playerRoomMap.delete(userId);
        if (room.players.size === 0) {
            gameManager.rooms.delete(roomId);
        }
    }
}
function handleGameMessage(userId, message, ws) {
    const { type, data } = message;
    switch (type) {
        case 'game_list':
            return handleGameList(userId, data, ws);
        case 'game_create_room':
            return handleCreateRoom(userId, data, ws);
        case 'game_join_room':
            return handleJoinRoom(userId, data, ws);
        case 'game_leave_room':
            return handleLeaveRoom(userId, data, ws);
        case 'game_room_list':
            return handleRoomList(userId, data, ws);
        case 'game_room_info':
            return handleRoomInfo(userId, data, ws);
        case 'game_set_ready':
            return handleSetReady(userId, data, ws);
        case 'game_start':
            return handleStartGame(userId, data, ws);
        case 'game_action':
            return handleGameAction(userId, data, ws);
        case 'game_update_setting':
            return handleUpdateSetting(userId, data, ws);
        case 'game_surrender':
            return handleGameSurrender(userId, data, ws);
        case 'game_kick_player':
            return handleKickPlayer(userId, data, ws);
    }
    const roomId = gameManager.playerRoomMap.get(userId);
    if (!roomId) {
        ws.send(buildMessages('game_error', null, '你不在任何房间中', 400));
        return;
    }

    const room = gameManager.rooms.get(roomId);
    if (!room) {
        ws.send(buildMessages('game_error', null, '房间不存在', 400));
        return;
    }
    const handler = gameManager.gameHandlers.get(room.gameType);
    if (!handler) {
        ws.send(buildMessages('game_error', null, '游戏处理器不存在', 400));
        return;
    }
    if (handler.customHandlers && handler.customHandlers[type]) {
        handler.customHandlers[type](userId, data, ws, room, gameManager);
        return;
    }
    ws.send(buildMessages('error', null, `未知游戏消息类型: ${type}`, 400));
}
function handleUpdateSetting(userId, data, ws) {
    const { roomId, key, value } = data;
    const room = gameManager.rooms.get(roomId);
    if (!room) {
        ws.send(buildMessages('game_error', null, '房间不存在', 400));
        return;
    }
    if (room.hostId !== userId) {
        ws.send(buildMessages('game_error', null, '只有房主可以修改设置', 403));
        return;
    }
    if (room.status !== 'waiting') {
        ws.send(buildMessages('game_error', null, '游戏已开始，无法修改设置', 400));
        return;
    }

    switch (key) {
        case 'roomName':
            room.settings.roomName = String(value).substring(0, 6);
            break;
        case 'password':
            room.settings.password = String(value).substring(0, 6);
            break;
        case 'betAmount':
            room.betAmount = Math.max(0, parseInt(value) || 0);
            room.betEnabled = room.betAmount > 0;
            break;
        case 'betOdds':
            room.betOdds = Math.max(1, Math.min(10, parseInt(value) || 2));
            break;
        case 'maxPlayers':
            const newMax = Math.max(2, Math.min(8, parseInt(value) || 4));
            if (room.players.size > newMax) {
                ws.send(buildMessages('game_error', null, '当前玩家数超过新设置的最大人数', 400));
                return;
            }
            room.maxPlayers = newMax;
            break;
        default:
            ws.send(buildMessages('game_error', null, '未知设置项', 400));
            return;
    }
    gameManager.broadcastToRoom(roomId, {
        type: 'game_room_info',
        data: room.toJSON()
    });
}

function handleKickPlayer(userId, data, ws) {
    const { playerId } = data;
    const roomId = gameManager.playerRoomMap.get(userId);
    if (!roomId) {
        ws.send(buildMessages('game_error', null, '你不在任何房间中', 400));
        return;
    }
    const room = gameManager.rooms.get(roomId);
    if (!room) {
        ws.send(buildMessages('game_error', null, '房间不存在', 400));
        return;
    }
    if (room.hostId !== userId) {
        ws.send(buildMessages('game_error', null, '只有房主可以踢人', 403));
        return;
    }
    if (room.status !== 'waiting') {
        ws.send(buildMessages('game_error', null, '游戏已开始，无法踢人', 400));
        return;
    }
    if (playerId === userId) {
        ws.send(buildMessages('game_error', null, '不能踢出自己', 400));
        return;
    }
    if (playerId === room.hostId) {
        ws.send(buildMessages('game_error', null, '不能踢出房主', 400));
        return;
    }
    const player = room.players.get(playerId);
    if (!player) {
        ws.send(buildMessages('game_error', null, '玩家不在房间中', 400));
        return;
    }
    const playerWs = player.ws;
    room.removePlayer(playerId);
    gameManager.playerRoomMap.delete(playerId);
    if (playerWs && playerWs.readyState === WebSocket.OPEN) {
        playerWs.send(buildMessages('game_kicked', {
            roomId: roomId,
            reason: '你被房主踢出房间'
        }, '你被房主踢出房间', 403));
    }

    gameManager.broadcastToRoom(roomId, {
        type: 'game_player_list',
        data: {
            players: room.getAllPlayersInfo(),
            hostId: room.hostId,
            status: room.status
        }
    });

    ws.send(buildMessages('game_kick_success', {
        playerId: playerId
    }, '已踢出玩家'));
}
function handleGameList(userId, data, ws) {
    const games = gameManager.getAllGames();
    ws.send(buildMessages('game_list', {
        games: games,
        total: games.length
    }, '游戏列表获取成功'));
}
function handleCreateRoom(userId, data, ws) {
    const { gameType, maxPlayers = 4, settings = {}, nickname, betAmount = 0, betOdds = 2 } = data;
    if (!gameType) {
        ws.send(buildMessages('game_error', null, '缺少游戏类型', 400));
        return;
    }
    const validBetAmount = Math.max(0, parseInt(betAmount) || 0);
    const validBetOdds = Math.max(1, Math.min(10, parseInt(betOdds) || 2));
    const result = gameManager.createRoom(userId, gameType, maxPlayers, settings);
    if (result.success) {
        const room = gameManager.rooms.get(result.roomId);
        if (room) {
            room.setBet(validBetAmount, validBetOdds);
        }
        gameManager.updatePlayerWs(userId, ws);
        ws.send(buildMessages('game_room_created', {
            roomId: result.roomId,
            room: result.room,
            betAmount: validBetAmount,
            betOdds: validBetOdds,
            betEnabled: validBetAmount > 0
        }, '房间创建成功'));
    } else {
        ws.send(buildMessages('game_error', null, result.reason, 400));
    }
}

function handleJoinRoom(userId, data, ws) {
    const { roomId, nickname, password = '' } = data;
    if (!roomId) {
        ws.send(buildMessages('game_error', null, '缺少房间ID', 400));
        return;
    }
    const result = gameManager.joinRoom(userId, roomId, nickname, password);
    if (result.success) {
        gameManager.updatePlayerWs(userId, ws);
        const roomInfo = gameManager.getRoomInfo(roomId);
        ws.send(buildMessages('game_room_joined', {
            roomId,
            room: roomInfo
        }, '加入房间成功'));
        gameManager.broadcastToRoom(roomId, {
            type: 'game_player_list',
            data: {
                players: roomInfo.players,
                hostId: roomInfo.hostId,
                status: roomInfo.status
            }
        }, null);
    } else {
        ws.send(buildMessages('game_error', null, result.reason, 400));
    }
}

function handleLeaveRoom(userId, data, ws) {
    const result = gameManager.leaveRoom(userId);
    if (result.success) {
        ws.send(buildMessages('game_room_left', null, '已离开房间'));
    } else {
        ws.send(buildMessages('game_error', null, result.reason, 400));
    }
}

function handleRoomList(userId, data, ws) {
    const { gameType } = data || {};
    const rooms = gameManager.getRoomList(gameType);
    ws.send(buildMessages('game_room_list', {
        rooms,
        total: rooms.length
    }, '房间列表获取成功'));
}

function handleRoomInfo(userId, data, ws) {
    const { roomId, password = '' } = data || {};
    if (roomId) {
        var roomInfo = gameManager.getRoomInfo(roomId);
        if (!roomInfo) {
            ws.send(buildMessages('game_error', null, '房间不存在', 404));
            return;
        }
        const currentRoomId = gameManager.playerRoomMap.get(userId);
        if (currentRoomId !== roomId) {
            const joinResult = gameManager.joinRoom(userId, roomId, '', password);
            if (joinResult.success) {
                gameManager.updatePlayerWs(userId, ws);
                const updatedRoomInfo = gameManager.getRoomInfo(roomId);
                gameManager.broadcastToRoom(roomId, {
                    type: 'game_player_list',
                    data: {
                        players: updatedRoomInfo.players,
                        hostId: updatedRoomInfo.hostId,
                        status: updatedRoomInfo.status
                    }
                }, null);
                ws.send(buildMessages('game_room_info', updatedRoomInfo, '已自动加入房间'));
                return;
            } else {
                roomInfo['epasswd'] = '无效的密码凭证';
            }
        }
        ws.send(buildMessages('game_room_info', roomInfo, '房间信息获取成功'));
    } else {
        const currentRoom = gameManager.getPlayerRoom(userId);
        if (currentRoom) {
            ws.send(buildMessages('game_room_info', currentRoom, '房间信息获取成功'));
        } else {
            ws.send(buildMessages('game_error', null, '你不在任何房间中', 404));
        }
    }
}

function handleSetReady(userId, data, ws) {
    const { ready = true } = data || {};
    const result = gameManager.setPlayerReady(userId, ready);
    if (!result.success) {
        ws.send(buildMessages('game_error', null, result.reason, 400));
    }
}
function handleStartGame(userId, data, ws) {
    const roomInfo = gameManager.getPlayerRoom(userId);
    if (!roomInfo) {
        ws.send(buildMessages('game_error', null, '你不在任何房间中', 400));
        return;
    }
    if (roomInfo.hostId !== userId) {
        ws.send(buildMessages('game_error', null, '只有房主可以开始游戏', 403));
        return;
    }
    const result = gameManager.startGame(roomInfo.roomId);
    if (!result.success) {
        ws.send(buildMessages('game_error', null, result.reason, 400));
    }
}


function handleGameAction(userId, data, ws) {
    const { action, actionData } = data;
    if (!action) {
        ws.send(buildMessages('game_error', null, '缺少动作类型', 400));
        return;
    }

    const roomId = gameManager.playerRoomMap.get(userId);
    if (!roomId) {
        ws.send(buildMessages('game_error', null, '你不在任何房间中', 400));
        return;
    }

    const room = gameManager.rooms.get(roomId);
    if (!room) {
        ws.send(buildMessages('game_error', null, '房间不存在', 400));
        return;
    }
    if (room.status !== 'playing') {
        ws.send(buildMessages('game_error', null, '游戏未开始', 400));
        return;
    }

    const handler = gameManager.gameHandlers.get(room.gameType);
    if (!handler) {
        ws.send(buildMessages('game_error', null, '游戏处理器不存在', 400));
        return;
    }
    const customHandler = handler.customHandlers && handler.customHandlers[action];
    if (customHandler) {
        customHandler(userId, actionData, ws, room, gameManager);
        return;
    }
    if (room.gameState.currentTurn && room.gameState.currentTurn !== userId) {
        ws.send(buildMessages('game_error', null, '不是你的回合', 400));
        return;
    }

    const result = handler.handleAction(room.gameState, userId, action, actionData);
    if (!result.success) {
        ws.send(buildMessages('game_action_error', {
            action,
            reason: result.reason
        }, result.reason, 400));
        return;
    }

    if (result.success) {
        gameManager.broadcastToRoom(roomId, {
            type: 'game_state_update',
            data: {
                action,
                playerId: userId,
                gameState: handler.getPublicState(room.gameState),
                turn: room.gameState.currentTurn,
                ...result.data
            }
        });

        const gameResult = handler.checkGameOver(room.gameState);
        if (gameResult.over) {
            room.status = 'ended';
            if (gameResult.winner) {
                const winnerPlayer = room.players.get(gameResult.winner);
                if (winnerPlayer) {
                    winnerPlayer.score = (winnerPlayer.score || 0) + 1;
                }
            }
            gameManager.broadcastToRoom(roomId, {
                type: 'game_over',
                data: {
                    winner: gameResult.winner,
                    winnerName: gameResult.winner ? room.players.get(gameResult.winner)?.nickname : null,
                    reason: gameResult.reason,
                    finalState: handler.getPublicState(room.gameState),
                    scores: gameManager.getScores(room),
                    roomKept: true,
                    canReturn: true
                }
            });
            gameManager.emit('gameOver', { roomId, winner: gameResult.winner });
        }
    }
}
function cleanupGameRooms() {
    const cleaned = gameManager.cleanupRooms();
    if (cleaned > 0) {
        console.log(`清理了 ${cleaned} 个过期游戏房间`);
    }
}
module.exports = {
    gameManager,
    handleGameMessage,
    cleanupGameRooms
};