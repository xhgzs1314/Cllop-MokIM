const WebSocket = require('ws');
const EventEmitter = require('events');
class GameRoom {
    constructor(roomId, hostId, gameType, maxPlayers = 4) {
        this.roomId = roomId;
        this.hostId = hostId;
        this.gameType = gameType;
        this.maxPlayers = maxPlayers;
        this.players = new Map();
        this.status = 'waiting';
        this.createdAt = Date.now();
        this.gameState = null;
        this.settings = {};
        this.betAmount = 0;        // 押注金额（G币数）
        this.betOdds = 2;          // 赔率 (1x~10x)
        this.betEnabled = false;   // 是否启用押注
    }
    setBet(betAmount = 0, betOdds = 2) {
        this.betAmount = Math.max(0, parseInt(betAmount) || 0);
        this.betOdds = Math.max(1, Math.min(10, parseInt(betOdds) || 2));
        this.betEnabled = this.betAmount > 0;
        return this;
    }
    calculateSettlement(winningPlayerId) {
        if (!this.betEnabled) return { winnerWin: 0, loserLose: 0 };
        const totalBet = this.betAmount * this.betOdds;
        return {
            winnerWin: totalBet,
            loserLose: this.betAmount,
            totalBet: totalBet,
            betAmount: this.betAmount,
            odds: this.betOdds
        };
    }
    addPlayer(playerId, ws, nickname = '') {
        if (this.players.size >= this.maxPlayers) {
            return { success: false, reason: '房间已满' };
        }
        if (this.players.has(playerId)) {
            return { success: false, reason: '玩家已在房间中' };
        }
        if (this.status !== 'waiting') {
            return { success: false, reason: '游戏已开始' };
        }

        this.players.set(playerId, {
            ws,
            nickname: nickname || `玩家${playerId}`,
            ready: false,
            score: 0,
            joinedAt: Date.now(),
            isHost: playerId === this.hostId
        });

        return { success: true };
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return false;

        this.players.delete(playerId);

        if (player.isHost && this.players.size > 0) {
            const newHost = this.players.keys().next().value;
            this.players.get(newHost).isHost = true;
            this.hostId = newHost;
        }

        return true;
    }

    setPlayerReady(playerId, ready = true) {
        const player = this.players.get(playerId);
        if (!player) return false;
        player.ready = ready;
        return true;
    }

    isAllReady() {
        if (this.players.size < 2) return false;
        for (const [playerId, player] of this.players) {
            if (playerId === this.hostId) continue;
            if (!player.ready) return false;
        }
        return true;
    }

    getPlayerIds() {
        return Array.from(this.players.keys());
    }

    getAllPlayersInfo() {
        const result = [];
        for (const [playerId, player] of this.players) {
            result.push({
                playerId,
                nickname: player.nickname,
                isHost: player.isHost,
                ready: player.ready,
                score: player.score
            });
        }
        return result;
    }

    toJSON() {
        return {
            roomId: this.roomId,
            hostId: this.hostId,
            gameType: this.gameType,
            maxPlayers: this.maxPlayers,
            players: this.getAllPlayersInfo(),
            status: this.status,
            createdAt: this.createdAt,
            settings: this.settings,
            betAmount: this.betAmount,
            betOdds: this.betOdds,
            betEnabled: this.betEnabled
        };
    }
}
class GameManager extends EventEmitter {
    constructor() {
        super();
        this.rooms = new Map();
        this.playerRoomMap = new Map();
        this.gameHandlers = new Map();
    }

    registerGame(gameType, handler) {
        this.gameHandlers.set(gameType, handler);
    }

    createRoom(hostId, gameType, maxPlayers = 4, settings = {}) {
        if (this.playerRoomMap.has(hostId)) {
            return { success: false, reason: '你已在其他房间中' };
        }

        const roomId = this.generateRoomId();
        const room = new GameRoom(roomId, hostId, gameType, maxPlayers);
        room.settings = settings;
        this.rooms.set(roomId, room);
        this.playerRoomMap.set(hostId, roomId);
        room.addPlayer(hostId, null, settings.nickname || '房主');
        const handler = this.gameHandlers.get(gameType);
        if (handler) {
            const roomConfig = handler.generateRoomConfig(settings);
            room.gameState = handler.createInitialState({
                ...settings,
                roomConfig: roomConfig
            });
        }

        this.emit('roomCreated', { roomId, hostId, gameType });
        return { success: true, roomId, room: room.toJSON() };
    }
    getAllGames() {
        const games = [];
        for (const [gameType, handler] of this.gameHandlers) {
            games.push({
                gameType: gameType,
                gameName: handler.gameName || gameType,
                minPlayers: handler.minPlayers || 2,
                maxPlayers: handler.maxPlayers || 4
            });
        }
        return games;
    }
    joinRoom(playerId, roomId, nickname = '', password = '') {
        if (this.playerRoomMap.has(playerId)) {
            return { success: false, reason: '你已在其他房间中' };
        }
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, reason: '房间不存在' };
        }
        const roomPwd = room.settings?.password || '';
        if (roomPwd && playerId !== room.hostId && password !== roomPwd) {
            return { success: false, reason: '密码错误' };
        }
        const result = room.addPlayer(playerId, null, nickname);
        if (result.success) {
            this.playerRoomMap.set(playerId, roomId);
            this.emit('playerJoined', { roomId, playerId, nickname });
        }
        return result;
    }

    leaveRoom(playerId) {
        const roomId = this.playerRoomMap.get(playerId);
        if (!roomId) {
            return { success: false, reason: '你不在任何房间中' };
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            this.playerRoomMap.delete(playerId);
            return { success: false, reason: '房间不存在' };
        }
        if (room.status === 'playing') {
            const state = room.gameState;
            if (state && !state.surrenderPlayer && !state.winner) {
                const winnerId = state.players.find(id => id !== playerId);
                if (winnerId) {
                    state.surrenderPlayer = playerId;
                    state.winner = winnerId;
                    state.status = 'ended';
                    room.status = 'waiting';
                    state.endTime = Date.now();
                    let settlement = { winnerWin: 0, loserLose: 0, betAmount: 0, odds: 0, totalBet: 0 };
                    if (room.betEnabled && winnerId) {
                        settlement = room.calculateSettlement(winnerId);
                    }
                    this.broadcastToRoom(roomId, {
                        type: 'game_over',
                        code: 200,
                        data: {
                            winner: winnerId,
                            winnerName: room.players.get(winnerId)?.nickname || winnerId,
                            reason: `${room.players.get(playerId)?.nickname || playerId} 断线投降，${room.players.get(winnerId)?.nickname || winnerId} 获胜！`,
                            players: state.players.map(id => {
                                const p = room.players.get(id);
                                const isWinner = id === winnerId;
                                return {
                                    userId: id,
                                    nickname: p?.nickname || id,
                                    isWinner: isWinner,
                                    isSurrender: id === playerId,
                                    gcoinChange: isWinner ? settlement.winnerWin : (id === playerId ? -settlement.loserLose : 0)
                                };
                            }),
                            scores: Object.fromEntries(state.players.map(id => [id, id === winnerId ? 2 : 0])),
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
                    const handler = this.gameHandlers.get(room.gameType);
                    if (handler && typeof handler.saveMatchResult === 'function') {
                        handler.saveMatchResult(state, room, this, settlement);
                    }
                }
            }
        }

        const removed = room.removePlayer(playerId);
        if (removed) {
            this.playerRoomMap.delete(playerId);
            this.emit('playerLeft', { roomId, playerId });

            if (room.players.size === 0) {
                this.rooms.delete(roomId);
                this.emit('roomDestroyed', { roomId });
            } else {
                this.broadcastToRoom(roomId, {
                    type: 'game_player_list',
                    data: {
                        players: room.getAllPlayersInfo(),
                        hostId: room.hostId,
                        status: room.status
                    }
                });
            }
        }

        return { success: removed };
    }

    setPlayerReady(playerId, ready = true) {
        const roomId = this.playerRoomMap.get(playerId);
        if (!roomId) return { success: false, reason: '你不在任何房间中' };

        const room = this.rooms.get(roomId);
        if (!room) return { success: false, reason: '房间不存在' };

        const result = room.setPlayerReady(playerId, ready);
        if (result) {
            this.broadcastToRoom(roomId, {
                type: 'game_player_ready',
                data: {
                    playerId,
                    ready,
                    allReady: room.isAllReady()
                }
            });
        }

        return { success: result };
    }

    startGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return { success: false, reason: '房间不存在' };

        if (room.status !== 'waiting') {
            return { success: false, reason: '游戏已开始或已结束' };
        }

        if (room.players.size < 2) {
            return { success: false, reason: '至少需要2名玩家' };
        }

        if (!room.isAllReady()) {
            return { success: false, reason: '并非所有玩家都已准备' };
        }

        const handler = this.gameHandlers.get(room.gameType);
        if (!handler) {
            return { success: false, reason: '不支持的遊戲类型' };
        }
        room.status = 'playing';
        room.keepAlive = true;
        room.gameState = handler.createInitialState(room.settings);
        if (room.settings.matchId) {
            room.gameState.matchId = room.settings.matchId;
        }

        if (handler.initGame) {
            handler.initGame(room.gameState, room.getPlayerIds());
        }
        room.gameState.status = 'playing';
        this.broadcastToRoom(roomId, {
            type: 'game_started',
            data: {
                gameType: room.gameType,
                players: room.getAllPlayersInfo(),
                gameState: handler.getPublicState(room.gameState),
                turn: room.gameState.currentTurn || room.getPlayerIds()[0]
            }
        });

        this.emit('gameStarted', { roomId });
        return { success: true };
    }

    handleGameAction(playerId, action, data) {
        const roomId = this.playerRoomMap.get(playerId);
        if (!roomId) {
            return { success: false, reason: '你不在任何房间中' };
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, reason: '房间不存在' };
        }

        if (room.status !== 'playing') {
            return { success: false, reason: '游戏未开始' };
        }

        const handler = this.gameHandlers.get(room.gameType);
        if (!handler) {
            return { success: false, reason: '不支持的遊戲类型' };
        }

        if (room.gameState.currentTurn && room.gameState.currentTurn !== playerId) {
            return { success: false, reason: '不是你的回合' };
        }

        const result = handler.handleAction(room.gameState, playerId, action, data);

        if (result.success) {
            this.broadcastToRoom(roomId, {
                type: 'game_state_update',
                data: {
                    action,
                    playerId,
                    gameState: handler.getPublicState(room.gameState),
                    turn: room.gameState.currentTurn,
                    ...result.data
                }
            });

            const gameResult = handler.checkGameOver(room.gameState);
            if (gameResult.over) {
                room.status = 'ended';
                this.broadcastToRoom(roomId, {
                    type: 'game_over',
                    data: {
                        winner: gameResult.winner,
                        winnerName: gameResult.winner ? room.players.get(gameResult.winner)?.nickname : null,
                        reason: gameResult.reason,
                        finalState: handler.getPublicState(room.gameState),
                        scores: this.getScores(room)
                    }
                });
                this.emit('gameOver', { roomId, winner: gameResult.winner });
            }
        }

        return result;
    }

    getScores(room) {
        const scores = {};
        for (const [playerId, player] of room.players) {
            scores[playerId] = player.score;
        }
        return scores;
    }

    broadcastToRoom(roomId, message, excludePlayerId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const msgStr = JSON.stringify(message);
        for (const [playerId, player] of room.players) {
            if (playerId === excludePlayerId) continue;
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(msgStr);
            }
        }
    }

    sendToPlayer(playerId, message) {
        const roomId = this.playerRoomMap.get(playerId);
        if (!roomId) return false;

        const room = this.rooms.get(roomId);
        if (!room) return false;

        const player = room.players.get(playerId);
        if (!player || !player.ws) return false;

        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    updatePlayerWs(playerId, ws) {
        const roomId = this.playerRoomMap.get(playerId);
        if (!roomId) return false;

        const room = this.rooms.get(roomId);
        if (!room) return false;

        const player = room.players.get(playerId);
        if (!player) return false;

        player.ws = ws;
        return true;
    }

    generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    getRoomInfo(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        return room.toJSON();
    }

    getPlayerRoom(playerId) {
        const roomId = this.playerRoomMap.get(playerId);
        if (!roomId) return null;
        return this.getRoomInfo(roomId);
    }

    getRoomList(gameType = null) {
        const result = [];
        for (const [roomId, room] of this.rooms) {
            if (gameType && room.gameType !== gameType) continue;
            if (room.status === 'ended') continue;
            result.push({
                roomId,
                hostId: room.hostId,
                gameType: room.gameType,
                playerCount: room.players.size,
                maxPlayers: room.maxPlayers,
                status: room.status,
                createdAt: room.createdAt
            });
        }
        return result;
    }

    cleanupRooms(maxAge = 3600000) {
        const now = Date.now();
        const toRemove = [];
        for (const [roomId, room] of this.rooms) {
            if (room.players.size === 0 && now - room.createdAt > maxAge) {
                toRemove.push(roomId);
            }
            if (room.status === 'ended' && now - room.createdAt > maxAge) {
                toRemove.push(roomId);
            }
        }
        for (const roomId of toRemove) {
            this.rooms.delete(roomId);
            this.emit('roomDestroyed', { roomId });
        }
        return toRemove.length;
    }
}
class GameHandler {
    constructor(gameType) {
        this.gameType = gameType;
        this.gameName = gameType;
        this.minPlayers = 2;
        this.maxPlayers = 4;
    }

    createInitialState(settings = {}) {
        throw new Error('createInitialState must be implemented');
    }

    handleAction(state, playerId, action, data) {
        throw new Error('handleAction must be implemented');
    }

    getPublicState(state) {
        return { ...state };
    }

    checkGameOver(state) {
        return { over: false, winner: null, reason: null };
    }

    initGame(state, playerIds) {
    }

}

module.exports = {
    GameManager,
    GameRoom,
    GameHandler
};