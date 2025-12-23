import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import './Battleship.css';

const GRID_SIZE = 10;
const SHIPS = [
    { name: 'Carrier', size: 5, icon: '🚢' },
    { name: 'Battleship', size: 4, icon: '⛴️' },
    { name: 'Cruiser', size: 3, icon: '🛥️' },
    { name: 'Submarine', size: 3, icon: '🚤' },
    { name: 'Destroyer', size: 2, icon: '⛵' }
];

const Battleship = ({ socket, roomId, user, players }) => {
    const [myGrid, setMyGrid] = useState([]);
    const [opponentGrid, setOpponentGrid] = useState([]);
    const [placementPhase, setPlacementPhase] = useState(true);
    const [currentShipIndex, setCurrentShipIndex] = useState(0);
    const [isHorizontal, setIsHorizontal] = useState(true);
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const [winner, setWinner] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [ready, setReady] = useState(false);
    const [opponentReady, setOpponentReady] = useState(false);

    const myPlayerIndex = players.findIndex(p => p.username === user.username);
    const isMyTurn = currentPlayer === myPlayerIndex;

    useEffect(() => {
        initializeGrids();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('battleship-ready', ({ playerIndex }) => {
            if (playerIndex !== myPlayerIndex) {
                setOpponentReady(true);
            }
        });

        socket.on('battleship-attack', ({ row, col, hit, sunk }) => {
            // Update my grid when opponent attacks
            const newGrid = [...myGrid];
            if (hit) {
                newGrid[row][col] = 'hit';
                playSound('hit');
            } else {
                newGrid[row][col] = 'miss';
                playSound('miss');
            }
            setMyGrid(newGrid);
        });

        socket.on('battleship-result', ({ row, col, hit, sunk }) => {
            // Update opponent grid with my attack result
            const newGrid = [...opponentGrid];
            newGrid[row][col] = hit ? 'hit' : 'miss';
            setOpponentGrid(newGrid);

            if (hit) {
                playSound('hit');
            } else {
                playSound('miss');
            }
        });

        socket.on('game-state', (state) => {
            if (state.winner) {
                setWinner(state.winner);
                setShowResult(true);
                playSound('win');
            }
            setCurrentPlayer(state.currentPlayer);
        });

        socket.on('game-reset', () => {
            resetGame();
        });

        return () => {
            socket.off('battleship-ready');
            socket.off('battleship-attack');
            socket.off('battleship-result');
            socket.off('game-state');
            socket.off('game-reset');
        };
    }, [socket, myGrid, opponentGrid, myPlayerIndex]);

    const initializeGrids = () => {
        const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        setMyGrid(grid);
        setOpponentGrid(grid.map(row => [...row]));
    };

    const canPlaceShip = (row, col, size, horizontal) => {
        if (horizontal) {
            if (col + size > GRID_SIZE) return false;
            for (let i = 0; i < size; i++) {
                if (myGrid[row][col + i]) return false;
            }
        } else {
            if (row + size > GRID_SIZE) return false;
            for (let i = 0; i < size; i++) {
                if (myGrid[row + i][col]) return false;
            }
        }
        return true;
    };

    const placeShip = (row, col) => {
        if (!placementPhase || currentShipIndex >= SHIPS.length) return;

        const ship = SHIPS[currentShipIndex];
        if (!canPlaceShip(row, col, ship.size, isHorizontal)) return;

        const newGrid = myGrid.map(r => [...r]);

        if (isHorizontal) {
            for (let i = 0; i < ship.size; i++) {
                newGrid[row][col + i] = 'ship';
            }
        } else {
            for (let i = 0; i < ship.size; i++) {
                newGrid[row + i][col] = 'ship';
            }
        }

        setMyGrid(newGrid);
        setCurrentShipIndex(currentShipIndex + 1);
        playSound('place');

        if (currentShipIndex + 1 >= SHIPS.length) {
            // All ships placed
            setTimeout(() => {
                setReady(true);
                socket.emit('battleship-ready', {
                    roomId,
                    playerIndex: myPlayerIndex,
                    grid: newGrid
                });

                if (opponentReady) {
                    setPlacementPhase(false);
                }
            }, 500);
        }
    };

    useEffect(() => {
        if (ready && opponentReady && placementPhase) {
            setPlacementPhase(false);
        }
    }, [ready, opponentReady]);

    const handleAttack = (row, col) => {
        if (placementPhase || !isMyTurn || winner || opponentGrid[row][col]) return;

        socket.emit('battleship-attack', {
            roomId,
            row,
            col,
            attackerIndex: myPlayerIndex
        });
    };

    const playSound = (type) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const sounds = {
                place: 300,
                hit: 600,
                miss: 200,
                win: 800
            };

            oscillator.frequency.value = sounds[type] || 400;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.15);
        } catch (e) { }
    };

    const resetGame = () => {
        initializeGrids();
        setPlacementPhase(true);
        setCurrentShipIndex(0);
        setCurrentPlayer(0);
        setWinner(null);
        setShowResult(false);
        setReady(false);
        setOpponentReady(false);
    };

    const handleReset = () => {
        if (socket) {
            socket.emit('game-reset', { roomId, gameType: 'battleship' });
        }
    };

    return (
        <div className="battleship-game">
            <div className="game-info">
                <h3>🚢 Battleship</h3>
                {placementPhase ? (
                    <div className="placement-info">
                        {currentShipIndex < SHIPS.length ? (
                            <>
                                <p>Place your {SHIPS[currentShipIndex].name} ({SHIPS[currentShipIndex].size} cells)</p>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsHorizontal(!isHorizontal)}
                                >
                                    {isHorizontal ? 'Horizontal ↔️' : 'Vertical ↕️'}
                                </Button>
                            </>
                        ) : (
                            <p>Waiting for opponent... {ready && '✓'}</p>
                        )}
                    </div>
                ) : (
                    <div className="turn-indicator">
                        {isMyTurn ? (
                            <span className="badge badge-success">Your Turn - Attack!</span>
                        ) : (
                            <span className="badge badge-primary">Opponent's Turn</span>
                        )}
                    </div>
                )}
            </div>

            <div className="battleship-boards">
                <div className="board-container">
                    <h4>Your Fleet</h4>
                    <div className="battleship-grid">
                        {myGrid.map((row, rowIndex) => (
                            <div key={rowIndex} className="grid-row">
                                {row.map((cell, colIndex) => (
                                    <div
                                        key={colIndex}
                                        className={`grid-cell ${cell || ''} ${placementPhase ? 'placement' : ''}`}
                                        onClick={() => placementPhase && placeShip(rowIndex, colIndex)}
                                    >
                                        {cell === 'ship' && '🟦'}
                                        {cell === 'hit' && '💥'}
                                        {cell === 'miss' && '💨'}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="board-container">
                    <h4>Enemy Waters</h4>
                    <div className="battleship-grid">
                        {opponentGrid.map((row, rowIndex) => (
                            <div key={rowIndex} className="grid-row">
                                {row.map((cell, colIndex) => (
                                    <div
                                        key={colIndex}
                                        className={`grid-cell ${cell || ''} ${!placementPhase && isMyTurn && !cell ? 'attackable' : ''}`}
                                        onClick={() => handleAttack(rowIndex, colIndex)}
                                    >
                                        {cell === 'hit' && '💥'}
                                        {cell === 'miss' && '💨'}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={showResult}
                onClose={() => setShowResult(false)}
                title="Game Over"
            >
                <div className="result-modal">
                    <div className="result-icon">
                        {winner === myPlayerIndex ? '🏆' : '😢'}
                    </div>
                    <h2>{winner === myPlayerIndex ? 'Victory!' : 'Defeated!'}</h2>
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

export default Battleship;
