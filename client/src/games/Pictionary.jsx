import React, { useState, useEffect, useRef } from 'react';
import Button from '../components/Button';
import './Pictionary.css';

const WORDS = {
    easy: ['house', 'dog', 'cat', 'sun', 'tree', 'car', 'flower', 'fish', 'bird', 'heart',
        'star', 'moon', 'rain', 'snow', 'beach', 'ball', 'book', 'phone', 'chair', 'table'],
    medium: ['piano', 'football', 'butterfly', 'umbrella', 'rainbow', 'firefighter',
        'doctor', 'teacher', 'chef', 'pirate', 'robot', 'airplane', 'guitar', 'camera'],
    hard: ['freedom', 'imagination', 'music', 'time', 'happiness', 'adventure',
        'jealousy', 'electricity', 'gravity', 'democracy']
};

const COLORS = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
const ROUND_TIME = 60;

const Pictionary = ({ socket, roomId, user, players }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [currentWord, setCurrentWord] = useState('');
    const [wordOptions, setWordOptions] = useState([]);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [drawerIndex, setDrawerIndex] = useState(0);
    const [guess, setGuess] = useState('');
    const [guesses, setGuesses] = useState([]);
    const [scores, setScores] = useState({});
    const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
    const [gamePhase, setGamePhase] = useState('waiting');
    const [roundWinner, setRoundWinner] = useState(null);
    const [hasGuessed, setHasGuessed] = useState(false);

    const myPlayerIndex = players.findIndex(p => p.username === user.username);
    const drawer = players[drawerIndex];

    // Initialize canvas on mount
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('pictionary-start', ({ drawerIndex: di }) => {
            setDrawerIndex(di);
            setGamePhase('choosing');
            setHasGuessed(false);
            setRoundWinner(null);
            setGuesses([]);
            setTimeLeft(ROUND_TIME);
            clearCanvas();

            if (di === myPlayerIndex) {
                const options = [
                    WORDS.easy[Math.floor(Math.random() * WORDS.easy.length)],
                    WORDS.medium[Math.floor(Math.random() * WORDS.medium.length)],
                    WORDS.hard[Math.floor(Math.random() * WORDS.hard.length)]
                ];
                setWordOptions(options);
                setIsMyTurn(true);
            } else {
                setIsMyTurn(false);
                setWordOptions([]);
            }
        });

        socket.on('pictionary-word-chosen', ({ wordLength }) => {
            setGamePhase('drawing');
            setTimeLeft(ROUND_TIME);
            setCurrentWord('_'.repeat(wordLength));
        });

        socket.on('pictionary-draw', ({ x, y, color: c, lineWidth: lw, type }) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            if (type === 'start') {
                ctx.beginPath();
                ctx.moveTo(x, y);
            } else if (type === 'draw') {
                ctx.strokeStyle = c;
                ctx.lineWidth = lw;
                ctx.lineCap = 'round';
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        });

        socket.on('pictionary-clear', () => {
            clearCanvas();
        });

        socket.on('pictionary-guess', ({ username, message, correct }) => {
            setGuesses(prev => [...prev, { username, message, correct }]);

            if (correct) {
                setRoundWinner(username);
                if (username === user.username) {
                    setHasGuessed(true);
                }
            }
        });

        socket.on('pictionary-round-end', ({ word, scores: newScores, winner }) => {
            setGamePhase('roundEnd');
            setCurrentWord(word);
            setScores(newScores || {});
            if (winner) setRoundWinner(winner);
        });

        socket.on('pictionary-scores', ({ scores: newScores }) => {
            setScores(newScores || {});
        });

        socket.on('game-reset', () => {
            setGamePhase('waiting');
            setScores({});
            setDrawerIndex(0);
            setCurrentWord('');
            setGuesses([]);
            setHasGuessed(false);
            setRoundWinner(null);
            clearCanvas();
        });

        return () => {
            socket.off('pictionary-start');
            socket.off('pictionary-word-chosen');
            socket.off('pictionary-draw');
            socket.off('pictionary-clear');
            socket.off('pictionary-guess');
            socket.off('pictionary-round-end');
            socket.off('pictionary-scores');
            socket.off('game-reset');
        };
    }, [socket, myPlayerIndex, user.username]);

    // Timer
    useEffect(() => {
        if (gamePhase !== 'drawing' || roundWinner) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (isMyTurn && socket) {
                        socket.emit('pictionary-timeout', { roomId });
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gamePhase, isMyTurn, socket, roomId, roundWinner]);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDrawing = (e) => {
        if (!isMyTurn || gamePhase !== 'drawing') return;
        e.preventDefault();

        const { x, y } = getCanvasCoords(e);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);

        socket.emit('pictionary-draw', { roomId, x, y, color, lineWidth, type: 'start' });
    };

    const draw = (e) => {
        if (!isDrawing || !isMyTurn) return;
        e.preventDefault();

        const { x, y } = getCanvasCoords(e);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();

        socket.emit('pictionary-draw', { roomId, x, y, color, lineWidth, type: 'draw' });
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const handleClear = () => {
        clearCanvas();
        socket.emit('pictionary-clear', { roomId });
    };

    const chooseWord = (word) => {
        setCurrentWord(word);
        setGamePhase('drawing');
        setTimeLeft(ROUND_TIME);
        socket.emit('pictionary-choose-word', { roomId, word });
    };

    const handleGuess = (e) => {
        e.preventDefault();
        if (!guess.trim() || hasGuessed || isMyTurn || roundWinner) return;

        socket.emit('pictionary-guess', { roomId, guess: guess.trim() });
        setGuess('');
    };

    const startGame = () => {
        if (players.length < 2) {
            alert('Need at least 2 players!');
            return;
        }
        socket.emit('pictionary-start-game', { roomId });
    };

    const nextRound = () => {
        socket.emit('pictionary-next-round', { roomId });
    };

    return (
        <div className="pictionary-game">
            <div className="game-header">
                <h3>🎨 Pictionary</h3>
                <div className="scores-bar">
                    {players.map((p, i) => (
                        <span key={i} className={drawerIndex === i ? 'drawer' : ''}>
                            {p.username}: {scores[p.username] || 0}
                        </span>
                    ))}
                </div>
            </div>

            {gamePhase === 'waiting' && (
                <div className="waiting-screen">
                    <h2>Waiting for players...</h2>
                    <p>{players.length} players in room</p>
                    <Button variant="primary" onClick={startGame}>
                        Start Game
                    </Button>
                </div>
            )}

            {gamePhase === 'choosing' && isMyTurn && (
                <div className="word-selection">
                    <h2>Choose a word to draw:</h2>
                    <div className="word-options">
                        {wordOptions.map((word, i) => (
                            <button key={i} className="word-btn" onClick={() => chooseWord(word)}>
                                {word}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {gamePhase === 'choosing' && !isMyTurn && (
                <div className="waiting-screen">
                    <h2>{drawer?.username} is choosing a word...</h2>
                </div>
            )}

            {(gamePhase === 'drawing' || gamePhase === 'roundEnd') && (
                <>
                    <div className="game-status">
                        <span className="drawer-name">
                            🎨 {drawer?.username} is drawing
                        </span>
                        <span className="word-display">{currentWord}</span>
                        <span className="timer">{timeLeft}s</span>
                    </div>

                    <div className="game-area">
                        <div className="canvas-section">
                            <canvas
                                ref={canvasRef}
                                width={500}
                                height={400}
                                className="drawing-canvas"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />

                            {isMyTurn && gamePhase === 'drawing' && (
                                <div className="drawing-tools">
                                    <div className="colors">
                                        {COLORS.map(c => (
                                            <button
                                                key={c}
                                                className={`color-btn ${color === c ? 'active' : ''}`}
                                                style={{ backgroundColor: c }}
                                                onClick={() => setColor(c)}
                                            />
                                        ))}
                                    </div>
                                    <div className="sizes">
                                        {[2, 5, 10, 20].map(size => (
                                            <button
                                                key={size}
                                                className={`size-btn ${lineWidth === size ? 'active' : ''}`}
                                                onClick={() => setLineWidth(size)}
                                            >
                                                <span style={{ width: size, height: size }} />
                                            </button>
                                        ))}
                                    </div>
                                    <Button variant="secondary" onClick={handleClear}>
                                        Clear
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="chat-section">
                            <div className="guesses-list">
                                {guesses.map((g, i) => (
                                    <div key={i} className={`guess ${g.correct ? 'correct' : ''}`}>
                                        <strong>{g.username}:</strong> {g.message}
                                        {g.correct && ' ✓'}
                                    </div>
                                ))}
                            </div>

                            {!isMyTurn && gamePhase === 'drawing' && !hasGuessed && !roundWinner && (
                                <form onSubmit={handleGuess} className="guess-form">
                                    <input
                                        type="text"
                                        value={guess}
                                        onChange={(e) => setGuess(e.target.value)}
                                        placeholder="Type your guess..."
                                        autoComplete="off"
                                    />
                                    <Button type="submit" variant="primary">Guess</Button>
                                </form>
                            )}

                            {roundWinner && gamePhase === 'drawing' && (
                                <div className="winner-message">
                                    🎉 {roundWinner} guessed correctly!
                                </div>
                            )}
                        </div>
                    </div>

                    {gamePhase === 'roundEnd' && (
                        <div className="round-end">
                            <h2>The word was: {currentWord}</h2>
                            {roundWinner && <p>🏆 {roundWinner} guessed first!</p>}
                            <Button variant="primary" onClick={nextRound}>
                                Next Round
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Pictionary;
