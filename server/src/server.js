import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../client/dist')));
}

const io = new Server(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? false
            : ['http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST']
    }
});

const rooms = new Map();
const gameStates = new Map();
const battleshipGrids = new Map(); // Store player ship positions
const pictionaryGames = new Map(); // Pictionary game state
const palermoGames = new Map(); // Palermo game state

io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    socket.on('join-room', ({ roomId, username, gameType }) => {
        socket.join(roomId);

        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [],
                gameType,
                createdAt: new Date()
            });
        }

        const room = rooms.get(roomId);

        if (!room.players.find(p => p.socketId === socket.id)) {
            room.players.push({
                socketId: socket.id,
                username
            });
        }

        io.to(roomId).emit('room-update', {
            players: room.players
        });

        io.to(roomId).emit('player-joined', { username });

        console.log(`👤 ${username} joined room ${roomId}`);
    });

    socket.on('leave-room', ({ roomId }) => {
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            const player = room.players.find(p => p.socketId === socket.id);

            if (player) {
                room.players = room.players.filter(p => p.socketId !== socket.id);

                io.to(roomId).emit('player-left', { username: player.username });
                io.to(roomId).emit('room-update', {
                    players: room.players
                });

                if (room.players.length === 0) {
                    rooms.delete(roomId);
                    gameStates.delete(roomId);
                    battleshipGrids.delete(roomId);
                }
            }
        }

        socket.leave(roomId);
    });

    socket.on('chat-message', (message) => {
        io.to(message.roomId).emit('chat-message', message);
    });

    socket.on('user-typing', ({ roomId, username }) => {
        socket.to(roomId).emit('user-typing', { username });
    });

    socket.on('game-move', (data) => {
        const { roomId, gameType, ...gameData } = data;

        gameStates.set(roomId, {
            gameType,
            ...gameData,
            lastUpdate: new Date()
        });

        io.to(roomId).emit('game-state', gameData);
    });

    socket.on('battleship-ready', ({ roomId, playerIndex, grid }) => {
        // Store player's ship positions
        if (!battleshipGrids.has(roomId)) {
            battleshipGrids.set(roomId, {});
        }

        const grids = battleshipGrids.get(roomId);
        grids[playerIndex] = grid;

        io.to(roomId).emit('battleship-ready', { playerIndex });
    });

    socket.on('battleship-attack', ({ roomId, row, col, attackerIndex }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const grids = battleshipGrids.get(roomId);
        if (!grids) return;

        const defenderIndex = 1 - attackerIndex;
        const defenderGrid = grids[defenderIndex];

        // Check if there's a ship at this position
        const hit = defenderGrid && defenderGrid[row] && defenderGrid[row][col] === 'ship';

        // Send result to attacker
        socket.emit('battleship-result', { row, col, hit, sunk: false });

        // Send attack to defender
        const defender = room.players[defenderIndex];
        if (defender) {
            io.to(defender.socketId).emit('battleship-attack', { row, col, hit, sunk: false });
        }

        // Switch turns
        io.to(roomId).emit('game-state', {
            currentPlayer: defenderIndex
        });
    });

    // Air Hockey paddle updates
    socket.on('airhockey-paddle', ({ roomId, playerIndex, paddle }) => {
        // Broadcast paddle position to other player immediately
        socket.to(roomId).emit('paddle-update', { playerIndex, paddle });
    });

    // Snake direction updates
    socket.on('snake-direction', ({ roomId, playerIndex, direction }) => {
        const gameState = gameStates.get(roomId) || {};
        if (playerIndex === 0) {
            gameState.direction1 = direction;
        } else {
            gameState.direction2 = direction;
        }
        gameStates.set(roomId, gameState);
    });

    // Snake game start
    socket.on('snake-start', ({ roomId }) => {
        console.log('🐍 Snake game starting for room:', roomId);

        const GRID_SIZE = 20;
        const GAME_SPEED = 150;

        const initialState = {
            snake1: [{ x: 5, y: 10 }],
            snake2: [{ x: 15, y: 10 }],
            direction1: { x: 1, y: 0 },
            direction2: { x: -1, y: 0 },
            food: { x: 10, y: 10 },
            scores: [0, 0],
            gameOver: false,
            gameStarted: true
        };

        gameStates.set(roomId, initialState);
        console.log('📤 Emitting initial game state to room:', roomId);
        io.to(roomId).emit('game-state', initialState);

        // Start game loop
        const gameLoop = setInterval(() => {
            const state = gameStates.get(roomId);
            if (!state || state.gameOver) {
                clearInterval(gameLoop);
                return;
            }

            // Move snakes
            const head1 = state.snake1[0];
            const newHead1 = {
                x: (head1.x + state.direction1.x + GRID_SIZE) % GRID_SIZE,
                y: (head1.y + state.direction1.y + GRID_SIZE) % GRID_SIZE
            };

            const head2 = state.snake2[0];
            const newHead2 = {
                x: (head2.x + state.direction2.x + GRID_SIZE) % GRID_SIZE,
                y: (head2.y + state.direction2.y + GRID_SIZE) % GRID_SIZE
            };

            // Check collisions
            const snake1HitSelf = state.snake1.some(s => s.x === newHead1.x && s.y === newHead1.y);
            const snake2HitSelf = state.snake2.some(s => s.x === newHead2.x && s.y === newHead2.y);
            const snake1HitSnake2 = state.snake2.some(s => s.x === newHead1.x && s.y === newHead1.y);
            const snake2HitSnake1 = state.snake1.some(s => s.x === newHead2.x && s.y === newHead2.y);

            if (snake1HitSelf || snake1HitSnake2 || snake2HitSelf || snake2HitSnake1) {
                let winner = null;
                if ((snake1HitSelf || snake1HitSnake2) && !(snake2HitSelf || snake2HitSnake1)) {
                    winner = 1;
                } else if ((snake2HitSelf || snake2HitSnake1) && !(snake1HitSelf || snake1HitSnake2)) {
                    winner = 0;
                } else {
                    winner = state.scores[0] > state.scores[1] ? 0 : state.scores[1] > state.scores[0] ? 1 : 'draw';
                }

                state.gameOver = true;
                state.winner = winner;
                io.to(roomId).emit('game-state', state);
                clearInterval(gameLoop);
                return;
            }

            let newSnake1 = [newHead1, ...state.snake1];
            let newSnake2 = [newHead2, ...state.snake2];

            // Check food
            if (newHead1.x === state.food.x && newHead1.y === state.food.y) {
                state.scores[0]++;
                state.food = {
                    x: Math.floor(Math.random() * GRID_SIZE),
                    y: Math.floor(Math.random() * GRID_SIZE)
                };
            } else {
                newSnake1.pop();
            }

            if (newHead2.x === state.food.x && newHead2.y === state.food.y) {
                state.scores[1]++;
                state.food = {
                    x: Math.floor(Math.random() * GRID_SIZE),
                    y: Math.floor(Math.random() * GRID_SIZE)
                };
            } else {
                newSnake2.pop();
            }

            state.snake1 = newSnake1;
            state.snake2 = newSnake2;

            io.to(roomId).emit('game-state', state);
        }, GAME_SPEED);
    });

    // Pictionary events

    socket.on('pictionary-start-game', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        pictionaryGames.set(roomId, {
            drawerIndex: 0,
            scores: {},
            currentWord: ''
        });

        io.to(roomId).emit('pictionary-start', { drawerIndex: 0 });
    });

    socket.on('pictionary-choose-word', ({ roomId, word }) => {
        const game = pictionaryGames.get(roomId);
        if (game) {
            game.currentWord = word.toLowerCase();
            io.to(roomId).emit('pictionary-word-chosen', { wordLength: word.length });
        }
    });

    socket.on('pictionary-draw', ({ roomId, x, y, color, lineWidth, type }) => {
        socket.to(roomId).emit('pictionary-draw', { x, y, color, lineWidth, type });
    });

    socket.on('pictionary-clear', ({ roomId }) => {
        socket.to(roomId).emit('pictionary-clear');
    });

    socket.on('pictionary-guess', ({ roomId, guess }) => {
        const game = pictionaryGames.get(roomId);
        const room = rooms.get(roomId);
        if (!game || !room) {
            console.log('Pictionary guess: no game or room');
            return;
        }

        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) {
            console.log('Pictionary guess: player not found');
            return;
        }

        // Already won? Don't allow more guesses
        if (game.winner) {
            console.log('Pictionary guess: already have winner');
            return;
        }

        const guessNorm = guess.toLowerCase().trim();
        const wordNorm = (game.currentWord || '').toLowerCase().trim();
        const correct = guessNorm === wordNorm;

        console.log(`Pictionary guess: "${guessNorm}" vs "${wordNorm}" = ${correct}`);

        io.to(roomId).emit('pictionary-guess', {
            username: player.username,
            message: correct ? '✓ Correct!' : guess,
            correct
        });

        if (correct) {
            game.winner = player.username;
            game.scores[player.username] = (game.scores[player.username] || 0) + 3;
            const drawer = room.players[game.drawerIndex];
            if (drawer) {
                game.scores[drawer.username] = (game.scores[drawer.username] || 0) + 1;
            }

            // End the round after a short delay
            setTimeout(() => {
                io.to(roomId).emit('pictionary-round-end', {
                    word: game.currentWord,
                    scores: game.scores,
                    winner: player.username
                });
                game.winner = null; // Reset for next round
            }, 2000);
        }
    });

    socket.on('pictionary-timeout', ({ roomId }) => {
        const game = pictionaryGames.get(roomId);
        if (game) {
            io.to(roomId).emit('pictionary-round-end', {
                word: game.currentWord,
                scores: game.scores,
                winner: null
            });
        }
    });

    socket.on('pictionary-next-round', ({ roomId }) => {
        const game = pictionaryGames.get(roomId);
        const room = rooms.get(roomId);
        if (!game || !room) return;

        game.drawerIndex = (game.drawerIndex + 1) % room.players.length;
        game.currentWord = '';

        io.to(roomId).emit('pictionary-start', { drawerIndex: game.drawerIndex });
    });

    // Palermo (Mafia) game events

    socket.on('palermo-start', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room || room.players.length < 4) return;

        // Assign roles based on player count
        const playerCount = room.players.length;
        const mafiaCount = Math.floor(playerCount / 4) || 1;

        const roleList = [];
        for (let i = 0; i < mafiaCount; i++) roleList.push('MAFIA');
        roleList.push('DOCTOR');
        roleList.push('DETECTIVE');
        while (roleList.length < playerCount) roleList.push('VILLAGER');

        // Shuffle roles
        for (let i = roleList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roleList[i], roleList[j]] = [roleList[j], roleList[i]];
        }

        const roles = {};
        room.players.forEach((p, i) => {
            roles[p.username] = roleList[i];
        });

        palermoGames.set(roomId, {
            roles,
            alivePlayers: room.players.map(p => p.username),
            nightActions: {},
            votes: {},
            voters: {},
            phase: 'night'
        });

        io.to(roomId).emit('palermo-roles', { roles });

        setTimeout(() => {
            const game = palermoGames.get(roomId);
            if (game) {
                io.to(roomId).emit('palermo-phase', {
                    phase: 'night',
                    alivePlayers: room.players.map(p => p.username),
                    message: '🌙 Night has begun...',
                    timer: 30
                });

                // Auto-process night after 30 seconds
                setTimeout(() => {
                    const currentGame = palermoGames.get(roomId);
                    if (currentGame && currentGame.phase === 'night') {
                        processNightResult(roomId);
                    }
                }, 30000);
            }
        }, 3000);
    });

    const processNightResult = (roomId) => {
        const game = palermoGames.get(roomId);
        const room = rooms.get(roomId);
        if (!game || !room) {
            console.log('processNightResult: no game or room');
            return;
        }

        console.log('Processing night result, nightActions:', game.nightActions);

        // Process night actions
        let victim = null;
        let saved = null;
        let investigated = null;

        for (const [player, action] of Object.entries(game.nightActions)) {
            console.log(`Processing action from ${player} (${game.roles[player]}): target=${action.target}`);
            if (game.roles[player] === 'MAFIA') {
                victim = action.target;
            }
            if (game.roles[player] === 'DOCTOR') {
                saved = action.target;
            }
            if (game.roles[player] === 'DETECTIVE') {
                investigated = action.target;
            }
        }

        console.log(`Night result: victim=${victim}, saved=${saved}`);

        let publicMessage = '☀️ Day has begun. ';

        // Send private message to Mafia about their kill
        if (victim) {
            const mafiaPlayers = room.players.filter(p => game.roles[p.username] === 'MAFIA');
            mafiaPlayers.forEach(mp => {
                if (victim !== saved) {
                    io.to(mp.socketId).emit('palermo-night-result', {
                        message: `🔪 You killed ${victim}!`
                    });
                } else {
                    io.to(mp.socketId).emit('palermo-night-result', {
                        message: `🔪 You tried to kill ${victim} but they were saved!`
                    });
                }
            });
        }

        // Send private message to Doctor
        if (saved) {
            const doctorPlayer = room.players.find(p => game.roles[p.username] === 'DOCTOR');
            if (doctorPlayer) {
                if (victim === saved) {
                    io.to(doctorPlayer.socketId).emit('palermo-night-result', {
                        message: `💉 You saved ${saved} from death!`
                    });
                } else {
                    io.to(doctorPlayer.socketId).emit('palermo-night-result', {
                        message: `💉 You protected ${saved} (they were not attacked)`
                    });
                }
            }
        }

        // Public death announcement
        if (victim && victim !== saved) {
            game.alivePlayers = game.alivePlayers.filter(p => p !== victim);
            publicMessage += `💀 ${victim} was found dead!`;
            io.to(roomId).emit('palermo-death', {
                username: victim,
                role: game.roles[victim]
            });
        } else if (victim === saved) {
            publicMessage += 'Nobody died during the night!';
        } else {
            publicMessage += 'A quiet night...';
        }

        // Send private message to Detective
        if (investigated) {
            const investigatedRole = game.roles[investigated];
            const isMafia = investigatedRole === 'MAFIA';
            const detectivePlayer = room.players.find(p => game.roles[p.username] === 'DETECTIVE');
            if (detectivePlayer) {
                io.to(detectivePlayer.socketId).emit('palermo-night-result', {
                    message: `🔍 ${investigated} is ${isMafia ? '🔪 MAFIA!' : '👤 Innocent'}`
                });
            }
        }

        // Check win conditions
        const aliveMafia = game.alivePlayers.filter(p => game.roles[p] === 'MAFIA').length;
        const aliveVillagers = game.alivePlayers.length - aliveMafia;

        if (aliveMafia === 0) {
            io.to(roomId).emit('palermo-game-over', {
                winner: 'village',
                message: 'The villagers eliminated all the Mafia!'
            });
            return;
        }

        if (aliveMafia >= aliveVillagers) {
            io.to(roomId).emit('palermo-game-over', {
                winner: 'mafia',
                message: 'The Mafia has taken over the village!'
            });
            return;
        }

        game.nightActions = {};
        game.phase = 'day';

        io.to(roomId).emit('palermo-phase', {
            phase: 'day',
            alivePlayers: game.alivePlayers,
            message: publicMessage,
            timer: 30
        });

        // Auto-start voting after 30 seconds
        console.log('Setting 30s timer for Day->Voting transition');
        setTimeout(() => {
            console.log('Day->Voting timer fired');
            const currentGame = palermoGames.get(roomId);
            console.log('Current game phase:', currentGame?.phase);
            if (currentGame && currentGame.phase === 'day') {
                console.log('Starting voting...');
                startVoting(roomId);
            } else {
                console.log('NOT starting voting - phase is not day');
            }
        }, 30000);
    };

    const startVoting = (roomId) => {
        const game = palermoGames.get(roomId);
        if (!game) return;

        game.votes = {};
        game.voters = {};
        game.phase = 'voting';

        io.to(roomId).emit('palermo-phase', {
            phase: 'voting',
            alivePlayers: game.alivePlayers,
            message: '🗳️ Vote for who you want to eliminate!',
            timer: 30
        });

        // Auto-end voting after 30 seconds
        setTimeout(() => {
            const currentGame = palermoGames.get(roomId);
            if (currentGame && currentGame.phase === 'voting') {
                processVotingResult(roomId);
            }
        }, 30000);
    };

    socket.on('palermo-night-action', ({ roomId, action, target }) => {
        const game = palermoGames.get(roomId);
        const room = rooms.get(roomId);
        if (!game || !room) {
            console.log('Night action: no game or room');
            return;
        }

        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) {
            console.log('Night action: player not found');
            return;
        }

        console.log(`Night action: ${player.username} (${game.roles[player.username]}) -> ${target}`);
        game.nightActions[player.username] = { action, target };

        // Check if all alive players with night actions have acted
        const mafiaPlayers = game.alivePlayers.filter(p => game.roles[p] === 'MAFIA');
        const doctor = game.alivePlayers.find(p => game.roles[p] === 'DOCTOR');
        const detective = game.alivePlayers.find(p => game.roles[p] === 'DETECTIVE');

        const expectedActions = [...mafiaPlayers];
        if (doctor) expectedActions.push(doctor);
        if (detective) expectedActions.push(detective);

        const completedActions = Object.keys(game.nightActions);
        const allActed = expectedActions.every(p => completedActions.includes(p));

        console.log(`Expected actions: ${expectedActions.length}, Completed: ${completedActions.length}, All acted: ${allActed}`);

        if (allActed) {
            console.log('All players acted, processing night result immediately');
            processNightResult(roomId);
        }
    });

    socket.on('palermo-start-voting', ({ roomId }) => {
        const game = palermoGames.get(roomId);
        if (!game) return;

        game.votes = {};
        game.voters = {};
        game.phase = 'voting';

        io.to(roomId).emit('palermo-phase', {
            phase: 'voting',
            alivePlayers: game.alivePlayers,
            message: '🗳️ Vote for who you want to eliminate!',
            timer: 30
        });

        // Auto-end voting after 30 seconds
        setTimeout(() => {
            const currentGame = palermoGames.get(roomId);
            if (currentGame && currentGame.phase === 'voting') {
                processVotingResult(roomId);
            }
        }, 30000);
    });

    const processVotingResult = (roomId) => {
        const game = palermoGames.get(roomId);
        const room = rooms.get(roomId);
        if (!game || !room) return;

        // Find player with most votes
        let maxVotes = 0;
        let executed = null;
        for (const [player, votes] of Object.entries(game.votes)) {
            if (votes > maxVotes) {
                maxVotes = votes;
                executed = player;
            }
        }

        if (executed && maxVotes > 0) {
            game.alivePlayers = game.alivePlayers.filter(p => p !== executed);
            io.to(roomId).emit('palermo-death', {
                username: executed,
                role: game.roles[executed]
            });

            // Check win conditions
            const aliveMafia = game.alivePlayers.filter(p => game.roles[p] === 'MAFIA').length;
            const aliveVillagers = game.alivePlayers.length - aliveMafia;

            if (aliveMafia === 0) {
                io.to(roomId).emit('palermo-game-over', {
                    winner: 'village',
                    message: 'The villagers eliminated all the Mafia!'
                });
                return;
            }

            if (aliveMafia >= aliveVillagers) {
                io.to(roomId).emit('palermo-game-over', {
                    winner: 'mafia',
                    message: 'The Mafia has taken over the village!'
                });
                return;
            }
        }

        // Start new night
        game.votes = {};
        game.voters = {};
        game.phase = 'night';

        io.to(roomId).emit('palermo-phase', {
            phase: 'night',
            alivePlayers: game.alivePlayers,
            message: '🌙 Night falls...'
        });
    };

    socket.on('palermo-vote', ({ roomId, target }) => {
        const game = palermoGames.get(roomId);
        const room = rooms.get(roomId);
        if (!game || !room || game.phase !== 'voting') {
            console.log('Vote rejected: phase is', game?.phase);
            return;
        }

        const player = room.players.find(p => p.socketId === socket.id);
        if (!player || !game.alivePlayers.includes(player.username)) {
            console.log('Vote rejected: player not found or dead');
            return;
        }

        // Track who voted (prevent double voting)
        if (!game.voters) game.voters = {};
        if (game.voters[player.username]) {
            console.log('Vote rejected: already voted');
            return;
        }
        game.voters[player.username] = target;

        // Count votes for target
        if (!game.votes[target]) game.votes[target] = 0;
        game.votes[target]++;

        console.log(`Vote: ${player.username} -> ${target}, total voters: ${Object.keys(game.voters).length}/${game.alivePlayers.length}`);

        io.to(roomId).emit('palermo-vote-update', { votes: game.votes });

        // Check if all alive players have voted
        const voterCount = Object.keys(game.voters).length;
        if (voterCount >= game.alivePlayers.length) {
            console.log('All players voted, processing result');
            processVotingResult(roomId);
        }
    });

    // Air Hockey game start
    socket.on('airhockey-start', ({ roomId }) => {
        console.log('🏒 Air Hockey starting for room:', roomId);

        const CANVAS_WIDTH = 600;
        const CANVAS_HEIGHT = 400;
        const PADDLE_RADIUS = 25;
        const PUCK_RADIUS = 12;
        const GOAL_HEIGHT = 120;
        const FRICTION = 0.99;
        const MAX_SPEED = 15;
        const MIN_SPEED = 0.05;

        const initialState = {
            paddle1: { x: 100, y: CANVAS_HEIGHT / 2, prevX: 100, prevY: CANVAS_HEIGHT / 2 },
            paddle2: { x: CANVAS_WIDTH - 100, y: CANVAS_HEIGHT / 2, prevX: CANVAS_WIDTH - 100, prevY: CANVAS_HEIGHT / 2 },
            puck: {
                x: CANVAS_WIDTH / 2,
                y: CANVAS_HEIGHT / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                lastHit: null,
                hitCooldown: 0
            },
            scores: [0, 0],
            winner: null
        };

        gameStates.set(roomId, initialState);
        io.to(roomId).emit('game-state', initialState);

        // Start physics loop
        const gameLoop = setInterval(() => {
            const state = gameStates.get(roomId);
            if (!state || state.winner !== null) {
                clearInterval(gameLoop);
                return;
            }

            // Update puck
            state.puck.x += state.puck.vx;
            state.puck.y += state.puck.vy;
            state.puck.vx *= FRICTION;
            state.puck.vy *= FRICTION;

            // Stop very slow movement
            if (Math.abs(state.puck.vx) < MIN_SPEED) state.puck.vx = 0;
            if (Math.abs(state.puck.vy) < MIN_SPEED) state.puck.vy = 0;

            // Wall collisions
            if (state.puck.x - PUCK_RADIUS < 0 || state.puck.x + PUCK_RADIUS > CANVAS_WIDTH) {
                state.puck.vx *= -0.9;
                state.puck.x = Math.max(PUCK_RADIUS, Math.min(state.puck.x, CANVAS_WIDTH - PUCK_RADIUS));
            }
            if (state.puck.y - PUCK_RADIUS < 0 || state.puck.y + PUCK_RADIUS > CANVAS_HEIGHT) {
                state.puck.vy *= -0.9;
                state.puck.y = Math.max(PUCK_RADIUS, Math.min(state.puck.y, CANVAS_HEIGHT - PUCK_RADIUS));
            }

            // Paddle collisions - smooth and effective
            const checkPaddle = (paddle, paddleId) => {
                const dx = state.puck.x - paddle.x;
                const dy = state.puck.y - paddle.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = PADDLE_RADIUS + PUCK_RADIUS;

                if (dist < minDist && dist > 0) {
                    // Normalize direction
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Just push puck to edge of paddle (not far away)
                    state.puck.x = paddle.x + nx * (minDist + 1);
                    state.puck.y = paddle.y + ny * (minDist + 1);

                    // Reflect velocity and add speed
                    const dot = state.puck.vx * nx + state.puck.vy * ny;
                    state.puck.vx = state.puck.vx - 2 * dot * nx + nx * 4;
                    state.puck.vy = state.puck.vy - 2 * dot * ny + ny * 4;

                    // Ensure minimum speed
                    const speed = Math.sqrt(state.puck.vx * state.puck.vx + state.puck.vy * state.puck.vy);
                    if (speed < 6) {
                        state.puck.vx = nx * 6;
                        state.puck.vy = ny * 6;
                    }
                }
            };

            checkPaddle(state.paddle1, 1);
            checkPaddle(state.paddle2, 2);

            // Goals
            const goalY1 = (CANVAS_HEIGHT - GOAL_HEIGHT) / 2;
            const goalY2 = goalY1 + GOAL_HEIGHT;

            if (state.puck.x - PUCK_RADIUS < 10 && state.puck.y > goalY1 && state.puck.y < goalY2) {
                state.scores[1]++;
                state.puck = {
                    x: CANVAS_WIDTH / 2,
                    y: CANVAS_HEIGHT / 2,
                    vx: -4 - Math.random() * 2,
                    vy: (Math.random() - 0.5) * 4,
                    lastHit: null,
                    hitCooldown: 0
                };
                if (state.scores[1] >= 5) {
                    state.winner = 1;
                    io.to(roomId).emit('game-state', state);
                    clearInterval(gameLoop);
                    return;
                }
            }

            if (state.puck.x + PUCK_RADIUS > CANVAS_WIDTH - 10 && state.puck.y > goalY1 && state.puck.y < goalY2) {
                state.scores[0]++;
                state.puck = {
                    x: CANVAS_WIDTH / 2,
                    y: CANVAS_HEIGHT / 2,
                    vx: 4 + Math.random() * 2,
                    vy: (Math.random() - 0.5) * 4,
                    lastHit: null,
                    hitCooldown: 0
                };
                if (state.scores[0] >= 5) {
                    state.winner = 0;
                    io.to(roomId).emit('game-state', state);
                    clearInterval(gameLoop);
                    return;
                }
            }

            io.to(roomId).emit('game-state', state);
        }, 16); // ~60 FPS
    });

    socket.on('game-reset', ({ roomId, gameType }) => {
        gameStates.delete(roomId);
        if (gameType === 'battleship') {
            battleshipGrids.delete(roomId);
        }
        io.to(roomId).emit('game-reset');
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);

        rooms.forEach((room, roomId) => {
            const player = room.players.find(p => p.socketId === socket.id);

            if (player) {
                room.players = room.players.filter(p => p.socketId !== socket.id);

                io.to(roomId).emit('player-left', { username: player.username });
                io.to(roomId).emit('room-update', {
                    players: room.players
                });

                if (room.players.length === 0) {
                    rooms.delete(roomId);
                    gameStates.delete(roomId);
                    battleshipGrids.delete(roomId);
                }
            }
        });
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        rooms: rooms.size,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/room/:roomId', (req, res) => {
    const { roomId } = req.params;
    const room = rooms.get(roomId);

    if (room) {
        res.json({
            exists: true,
            gameType: room.gameType,
            players: room.players.length,
            maxPlayers: 2
        });
    } else {
        res.json({
            exists: false
        });
    }
});

if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
    });
}

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🎮 Gaming Chat Server ready!`);
});

setInterval(() => {
    const now = new Date();
    rooms.forEach((room, roomId) => {
        const hoursSinceCreation = (now - room.createdAt) / (1000 * 60 * 60);

        if (hoursSinceCreation > 24 || room.players.length === 0) {
            rooms.delete(roomId);
            gameStates.delete(roomId);
            battleshipGrids.delete(roomId);
            console.log(`🧹 Cleaned up room ${roomId}`);
        }
    });
}, 60 * 60 * 1000);
