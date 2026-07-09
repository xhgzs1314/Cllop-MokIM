const { GameHandler } = require('../game');
const axios = require('axios');

class QuizRaceHandler extends GameHandler {
    constructor() {
        super('quiz-race');
        this.gameName = '拼图竞速';
        this.minPlayers = 2;
        this.maxPlayers = 2;
        this.difficulties = {
            easy: { rows: 3, cols: 3, label: '简单' },
            medium: { rows: 4, cols: 4, label: '中等' },
            hard: { rows: 5, cols: 5, label: '困难' }
        };
        this.defaultDifficulty = 'medium';
        this.customHandlers = {
            'puzzle_progress': this.handleProgress.bind(this),
            'puzzle_complete': this.handleComplete.bind(this),
            'puzzle_get_opponent': this.handleGetOpponent.bind(this),
            'puzzle_get_config': this.handleGetConfig.bind(this),
        };
    }

    generateRoomConfig(settings = {}) {
        const difficultyKeys = Object.keys(this.difficulties);
        const randomKey = difficultyKeys[Math.floor(Math.random() * difficultyKeys.length)];
        const difficulty = settings.difficulty || randomKey;
        const config = this.difficulties[difficulty];
        const seed = settings.seed || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const imageUrl = settings.imageUrl || `https://picsum.photos/seed/${seed}/400/400`
        return {
            difficulty: difficulty,
            rows: config.rows,
            cols: config.cols,
            imageUrl: imageUrl,
            totalPieces: config.rows * config.cols,
            generatedAt: Date.now()
        };
    }

    createInitialState(settings = {}) {
        const roomConfig = settings.roomConfig || this.generateRoomConfig(settings);
        return {
            players: [],
            status: 'waiting',        // waiting, ready, playing, ended
            roomConfig: roomConfig,   // 保存房间配置
            difficulty: roomConfig.difficulty,
            rows: roomConfig.rows,
            cols: roomConfig.cols,
            imageUrl: roomConfig.imageUrl,
            progress: {},             // playerId -> { placed: 0, total: rows*cols }
            completed: {},            // playerId -> boolean
            completedTime: {},        // playerId -> timestamp
            winner: null,
            startTime: null,
            endTime: null,
            matchId: settings.matchId || null,
            _readyPlayers: new Set(),
            playerStates: {}
        };
    }

    initGame(state, playerIds) {
        state.players = playerIds;
        state.status = 'ready';
        state.startTime = Date.now();
        state._readyPlayers = new Set();
        const totalPieces = state.rows * state.cols;
        for (const playerId of playerIds) {
            state.progress[playerId] = { placed: 0, total: totalPieces };
            state.completed[playerId] = false;
            state.completedTime[playerId] = null;
            state.playerStates[playerId] = null;
        }
        if (!state.matchId) {
            state.matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        }
        return state;
    }
    getRoomConfig(state) {
        return state.roomConfig || this.generateRoomConfig({
            difficulty: state.difficulty || this.defaultDifficulty,
            imageUrl: state.imageUrl
        });
    }
    handleGetConfig(userId, data, ws, room, gameManager) {
        const state = room.gameState;
        if (!state) {
            const config = this.generateRoomConfig(room.settings || {});
            ws.send(JSON.stringify({
                type: 'game_custom',
                code: 200,
                data: {
                    action: 'puzzle_config',
                    ...config,
                    status: 'waiting',
                    progress: { placed: 0, total: config.totalPieces }
                },
                timestamp: Date.now()
            }));
            return;
        }

        const config = this.getRoomConfig(state);
        ws.send(JSON.stringify({
            type: 'game_custom',
            code: 200,
            data: {
                action: 'puzzle_config',
                status: state.status,
                progress: state.progress[userId] || { placed: 0, total: state.rows * state.cols },
                roomConfig: config
            },
            timestamp: Date.now()
        }));
    }
    handleProgress(userId, data, ws, room, gameManager) {
        const state = room.gameState;
        if (state.status !== 'playing' && state.status !== 'ready') {
            console.log(`[拼图竞速] ⚠️ 游戏未开始, 状态: ${state.status}`);
            return;
        }

        const { placed } = data;
        const progress = state.progress[userId];
        if (!progress) {
            console.log(`[拼图竞速] ⚠️ 玩家 ${userId} 的进度不存在`);
            return;
        }
        progress.placed = Math.min(placed, progress.total);
        const publicState = this.getPublicState(state);
        const broadcastMsg = {
            type: 'game_state_update',
            data: {
                action: 'puzzle_progress',
                playerId: userId,
                gameState: publicState,
                progress: {
                    placed: progress.placed,
                    total: progress.total,
                    percentage: Math.round((progress.placed / progress.total) * 100)
                }
            },
            timestamp: Date.now()
        };
        gameManager.broadcastToRoom(room.roomId, broadcastMsg);
        const opponentId = state.players.find(id => id !== userId);
        if (opponentId) {
            const opponent = room.players.get(opponentId);
            if (opponent && opponent.ws && opponent.ws.readyState === 1) {
                const customMsg = {
                    type: 'game_custom',
                    code: 200,
                    data: {
                        action: 'puzzle_opponent_progress',
                        userId: userId,
                        progress: {
                            placed: progress.placed,
                            total: progress.total,
                            percentage: Math.round((progress.placed / progress.total) * 100)
                        }
                    },
                    timestamp: Date.now()
                };
                opponent.ws.send(JSON.stringify(customMsg));
            } else {
                console.log(`[拼图竞速] ⚠️ 对手 ${opponentId} 不在线或ws不可用`);
            }
        }
        const ackMsg = {
            type: 'game_custom',
            code: 200,
            data: {
                action: 'puzzle_progress_ack',
                userId: userId,
                progress: progress
            },
            timestamp: Date.now()
        };
        ws.send(JSON.stringify(ackMsg));
    }
    handleComplete(userId, data, ws, room, gameManager) {
        const state = room.gameState;
        if (state.status !== 'playing' && state.status !== 'ready') {
            console.log(`[拼图竞速] ⚠️ 游戏未开始, 状态: ${state.status}`);
            return;
        }

        if (state.completed[userId]) {
            console.log(`[拼图竞速] ⚠️ 玩家 ${userId} 已经完成`);
            return;
        }

        state.completed[userId] = true;
        state.completedTime[userId] = Date.now();
        state.progress[userId].placed = state.progress[userId].total;

        const opponentId = state.players.find(id => id !== userId);

        if (!state.winner) {
            state.winner = userId;

            ws.send(JSON.stringify({
                type: 'game_custom',
                code: 200,
                data: {
                    action: 'puzzle_win',
                    message: '🎉 恭喜你完成拼图，获得胜利！',
                    time: state.completedTime[userId]
                },
                timestamp: Date.now()
            }));
        }

        if (opponentId) {
            const opponent = room.players.get(opponentId);
            if (opponent && opponent.ws && opponent.ws.readyState === 1) {
                const isOpponentWinner = state.winner === opponentId;
                opponent.ws.send(JSON.stringify({
                    type: 'game_custom',
                    code: 200,
                    data: {
                        action: 'puzzle_opponent_complete',
                        userId: userId,
                        isWinner: isOpponentWinner,
                        message: isOpponentWinner ? '🎉 你已完成拼图，获得胜利！' : '对手已完成拼图，你继续加油！',
                        opponentTime: state.completedTime[userId]
                    },
                    timestamp: Date.now()
                }));
            }
        }

        gameManager.broadcastToRoom(room.roomId, {
            type: 'game_state_update',
            data: {
                action: 'puzzle_complete',
                playerId: userId,
                gameState: this.getPublicState(state),
                completed: state.completed,
                winner: state.winner
            },
            timestamp: Date.now()
        });

        const allCompleted = state.players.every(id => state.completed[id]);

        if (allCompleted) {
            if (!state.winner) {
                let fastest = null;
                let fastestTime = Infinity;
                for (const id of state.players) {
                    if (state.completedTime[id] < fastestTime) {
                        fastestTime = state.completedTime[id];
                        fastest = id;
                    }
                }
                state.winner = fastest;
            }
            this.endGame(state, room, gameManager);
        } else {
            const incomplete = state.players.filter(id => !state.completed[id]);
            if (incomplete.length === 1) {
                const remainingId = incomplete[0];
                setTimeout(() => {
                    if (state.status === 'playing' && !state.completed[remainingId]) {
                        state.completed[remainingId] = true;
                        state.completedTime[remainingId] = Date.now();
                        state.winner = state.winner || userId;
                        this.endGame(state, room, gameManager);
                    }
                }, 5 * 60 * 1000);
            }
        }
    }
    getPublicState(state) {
        return {
            status: state.status,
            players: state.players,
            difficulty: state.roomConfig.difficulty,
            rows: state.roomConfig.rows,
            cols: state.roomConfig.cols,
            imageUrl: state.roomConfig.imageUrl,
            progress: state.progress,
            completed: state.completed,
            winner: state.winner,
            startTime: state.startTime,
            endTime: state.endTime,
            totalPieces: state.roomConfig.rows * state.roomConfig.cols,
            roomConfig: state.roomConfig
        };
    }
    handleGetOpponent(userId, data, ws, room, gameManager) {
        const state = room.gameState;
        const opponentId = state.players.find(id => id !== userId);

        if (!opponentId) {
            ws.send(JSON.stringify({
                type: 'game_error',
                code: 400,
                msg: '没有对手'
            }));
            return;
        }

        const opponentProgress = state.progress[opponentId];
        ws.send(JSON.stringify({
            type: 'game_custom',
            code: 200,
            data: {
                action: 'puzzle_opponent_info',
                userId: opponentId,
                nickname: room.players.get(opponentId)?.nickname || opponentId,
                progress: {
                    placed: opponentProgress?.placed || 0,
                    total: opponentProgress?.total || state.roomConfig.rows * state.roomConfig.cols,
                    percentage: opponentProgress ? Math.round((opponentProgress.placed / opponentProgress.total) * 100) : 0
                },
                completed: state.completed[opponentId] || false
            },
            timestamp: Date.now()
        }));
    }
    endGame(state, room, gameManager) {
        if (state.status === 'ended') return;
        state.status = 'ended';
        room.status = 'waiting';
        state.endTime = Date.now();
        const winnerName = state.winner ? room.players.get(state.winner)?.nickname : null;
        let settlement = { winnerWin: 0, loserLose: 0, betAmount: 0, odds: 0, totalBet: 0 };
        let winnerId = state.winner;
        let loserId = state.players.find(id => id !== winnerId);
        if (room.betEnabled && winnerId && loserId) {
            settlement = room.calculateSettlement(winnerId);
            const winnerPlayer = room.players.get(winnerId);
            const loserPlayer = room.players.get(loserId);
        }
        const allPlayers = state.players.map(id => {
            const player = room.players.get(id);
            const isWinner = id === state.winner;
            return {
                userId: id,
                nickname: player?.nickname || id,
                completed: state.completed[id] || false,
                time: state.completedTime[id] || null,
                progress: state.progress[id] || { placed: 0, total: state.roomConfig.rows * state.roomConfig.cols },
                isWinner: isWinner,
                gcoinChange: isWinner ? settlement.winnerWin : (id === loserId ? -settlement.loserLose : 0)
            };
        });

        gameManager.broadcastToRoom(room.roomId, {
            type: 'game_over',
            code: 200,
            data: {
                winner: state.winner,
                winnerName: winnerName,
                reason: state.winner ? `${winnerName} 率先完成拼图！` : '游戏结束',
                players: allPlayers,
                scores: Object.fromEntries(
                    state.players.map(id => [id, state.completed[id] ? 2 : 0])
                ),
                matchId: state.matchId,
                gameData: {
                    rows: state.roomConfig.rows,
                    cols: state.roomConfig.cols,
                    difficulty: state.roomConfig.difficulty,
                    imageUrl: state.roomConfig.imageUrl
                },
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
        this.saveMatchResult(state, room, gameManager, settlement);
    }
    async saveMatchResult(state, room, gameManager, settlement = null) {
        try {
            if (!state.matchId) {
                console.log('[拼图竞速]结算');
                return;
            }
            const winner = state.winner;
            const loser = state.players.find(id => id !== winner);
            const scores = {};
            for (const id of state.players) {
                scores[id] = id === winner ? 2 : 0;
                if (state.completed[id] && state.completedTime[id]) {
                    const timeBonus = Math.max(0, 100 - Math.floor((state.completedTime[id] - state.startTime) / 1000));
                    scores[id] = (scores[id] || 0) + Math.floor(timeBonus / 50);
                }
            }
            for (const [playerId, player] of room.players) {
                if (playerId !== room.hostId) {
                    player.ready = false;
                }
            }
            const customMatchId = `自定义-拼图竞速`;
            const requestData = {
                matchid: customMatchId,
                matchId2: state.matchId,
                winner: winner,
                loser: loser,
                scores: Object.values(scores),
                gameData: {
                    difficulty: state.roomConfig.difficulty,
                    rows: state.roomConfig.rows,
                    cols: state.roomConfig.cols,
                    duration: state.endTime - state.startTime,
                    imageUrl: state.roomConfig.imageUrl
                },
                gcoins: settlement.totalBet
            };
            if (settlement && room.betEnabled) {
                requestData.bet = {
                    enabled: true,
                    betAmount: settlement.betAmount,
                    odds: settlement.odds,
                    totalBet: settlement.totalBet,
                    winnerWin: settlement.winnerWin,
                    loserLose: settlement.loserLose,
                    gcoinChanges: {
                        [winner]: settlement.winnerWin,
                        [loser]: -settlement.loserLose
                    }
                };
            }

            const response = await axios({
                url: `${process.env.PHP_API_BASE_LINK}/api/match_finish/f1.php`,
                method: 'POST',
                data: requestData,
                headers: {
                    'X-API-Key': process.env.API_SECRET_KEY || 'yhwo-rkmoks-run-folk'
                },
                timeout: 5000
            });
            if (response.data && response.data.code === 200) {
                if (room.betEnabled) {
                    console.log(`押注结果已下发`);
                }
            } else {
                console.error(`[拼图竞速] 比赛结算失败:`, response.data?.msg || '未知错误');
            }
        } catch (error) {
            console.error(`[拼图竞速] 保存比赛结果失败:`, error.message);
        }
    }
    checkGameOver(state) {
        if (state.status === 'ended') {
            return {
                over: true,
                winner: state.winner,
                reason: state.winner ? '拼图完成，率先完成者获胜' : '游戏结束'
            };
        }
        return { over: false };
    }
    handleAction(state, playerId, action, data) {
        return { success: false, reason: '请使用 puzzle_* 专用消息' };
    }
}

module.exports = QuizRaceHandler;