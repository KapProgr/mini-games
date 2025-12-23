import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import './Memory.css';

const CARD_EMOJIS = ['🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎸', '🎺'];

const Memory = ({ socket, roomId, user, players }) => {
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const [scores, setScores] = useState([0, 0]);
    const [gameStarted, setGameStarted] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const myPlayerIndex = players.findIndex(p => p.username === user.username);

    useEffect(() => {
        // Auto-start game when both players are present
        if (players.length === 2 && !gameStarted) {
            setTimeout(() => initializeGame(), 500);
        }
    }, [players.length]);

    useEffect(() => {
        if (!socket) return;

        socket.on('game-state', (state) => {
            if (state.cards) setCards(state.cards);
            if (state.flipped !== undefined) setFlipped(state.flipped);
            if (state.matched) setMatched(state.matched);
            if (state.currentPlayer !== undefined) setCurrentPlayer(state.currentPlayer);
            if (state.scores) setScores(state.scores);
            setGameStarted(true);
        });

        socket.on('game-reset', () => {
            initializeGame();
        });

        return () => {
            socket.off('game-state');
            socket.off('game-reset');
        };
    }, [socket]);

    const initializeGame = () => {
        const shuffled = [...CARD_EMOJIS, ...CARD_EMOJIS]
            .sort(() => Math.random() - 0.5)
            .map((emoji, index) => ({ id: index, emoji }));

        setCards(shuffled);
        setFlipped([]);
        setMatched([]);
        setScores([0, 0]);
        setCurrentPlayer(0);
        setGameStarted(true);
        setShowResult(false);

        // Only player 0 broadcasts initial state
        if (socket && myPlayerIndex === 0) {
            socket.emit('game-move', {
                roomId,
                gameType: 'memory',
                cards: shuffled,
                flipped: [],
                matched: [],
                currentPlayer: 0,
                scores: [0, 0]
            });
        }
    };

    const handleCardClick = (index) => {
        if (!socket) return;
        if (currentPlayer !== myPlayerIndex) return;
        if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;

        const newFlipped = [...flipped, index];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            const [first, second] = newFlipped;

            if (cards[first].emoji === cards[second].emoji) {
                // Match!
                const newMatched = [...matched, first, second];
                const newScores = [...scores];
                newScores[currentPlayer]++;

                playSound('match');

                setTimeout(() => {
                    setMatched(newMatched);
                    setFlipped([]);
                    setScores(newScores);

                    if (newMatched.length === cards.length) {
                        setShowResult(true);
                    }

                    socket.emit('game-move', {
                        roomId,
                        gameType: 'memory',
                        cards,
                        flipped: [],
                        matched: newMatched,
                        currentPlayer,
                        scores: newScores
                    });
                }, 500);
            } else {
                // No match
                playSound('flip');

                setTimeout(() => {
                    setFlipped([]);
                    setCurrentPlayer(1 - currentPlayer);

                    socket.emit('game-move', {
                        roomId,
                        gameType: 'memory',
                        cards,
                        flipped: [],
                        matched,
                        currentPlayer: 1 - currentPlayer,
                        scores
                    });
                }, 1000);
            }
        } else {
            playSound('flip');
        }
    };

    const playSound = (type) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = type === 'match' ? 600 : 400;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) { }
    };

    const handleReset = () => {
        if (socket) {
            socket.emit('game-reset', { roomId, gameType: 'memory' });
        }
    };

    const isGameOver = matched.length === cards.length && cards.length > 0;
    const isMyTurn = currentPlayer === myPlayerIndex;

    if (!gameStarted || cards.length === 0) {
        return (
            <div className="memory-game">
                <div className="game-info">
                    <h3>🎴 Memory Game</h3>
                    <p>Loading game...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="memory-game">
            <div className="game-info">
                <h3>🎴 Memory Game</h3>
                <div className="scores">
                    {players.map((player, index) => (
                        <div key={index} className={`player-score ${currentPlayer === index ? 'active' : ''}`}>
                            <span>{player.username}</span>
                            <strong>{scores[index]}</strong>
                        </div>
                    ))}
                </div>
                {!isGameOver && (
                    <div className="turn-indicator">
                        {isMyTurn ? (
                            <span className="badge badge-success">Your Turn!</span>
                        ) : (
                            <span className="badge badge-primary">Opponent's Turn</span>
                        )}
                    </div>
                )}
            </div>

            <div className="memory-board">
                {cards.map((card, index) => (
                    <div
                        key={card.id}
                        className={`memory-card ${flipped.includes(index) || matched.includes(index) ? 'flipped' : ''
                            } ${!isMyTurn && !matched.includes(index) ? 'disabled' : ''}`}
                        onClick={() => handleCardClick(index)}
                    >
                        <div className="card-inner">
                            <div className="card-front">?</div>
                            <div className="card-back">{card.emoji}</div>
                        </div>
                    </div>
                ))}
            </div>

            {isGameOver && (
                <Button variant="primary" onClick={handleReset}>
                    Play Again
                </Button>
            )}

            <Modal
                isOpen={showResult && isGameOver}
                onClose={() => setShowResult(false)}
                title="Game Over"
            >
                <div className="result-modal">
                    <div className="result-icon">
                        {scores[myPlayerIndex] > scores[1 - myPlayerIndex] ? '🏆' :
                            scores[myPlayerIndex] < scores[1 - myPlayerIndex] ? '😢' : '🤝'}
                    </div>
                    <h2>
                        {scores[0] > scores[1]
                            ? `${players[0].username} Wins!`
                            : scores[1] > scores[0]
                                ? `${players[1].username} Wins!`
                                : "It's a Draw!"}
                    </h2>
                    <p>Final Score: {scores[0]} - {scores[1]}</p>
                    <Button variant="primary" onClick={() => {
                        setShowResult(false);
                        handleReset();
                    }}>
                        Play Again
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default Memory;
