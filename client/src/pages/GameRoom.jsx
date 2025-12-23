import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/Toast';
import soundManager from '../utils/soundManager';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ChatDrawer from '../components/ChatDrawer';

// Game imports
import TicTacToe from '../games/TicTacToe';
import Snake from '../games/Snake';
import AirHockey from '../games/AirHockey';
import Memory from '../games/Memory';
import Backgammon from '../games/Backgammon';
import ConnectFour from '../games/ConnectFour';
import Battleship from '../games/Battleship';
import Checkers from '../games/Checkers';
import Pictionary from '../games/Pictionary';
import Palermo from '../games/Palermo';

import './GameRoom.css';

const GAME_COMPONENTS = {
    tictactoe: TicTacToe,
    snake: Snake,
    airhockey: AirHockey,
    memory: Memory,
    backgammon: Backgammon,
    connectfour: ConnectFour,
    battleship: Battleship,
    checkers: Checkers,
    pictionary: Pictionary,
    palermo: Palermo
};

const GameRoom = ({ user, onLogout }) => {
    const { gameType, roomId } = useParams();
    const navigate = useNavigate();
    const { socket, connected } = useSocket();
    const { toasts, addToast, removeToast, ToastContainer } = useToast();
    const [players, setPlayers] = useState([]);
    const [showRoomCode, setShowRoomCode] = useState(true);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!socket || !connected) return;

        // Join the room
        socket.emit('join-room', { roomId, username: user.username, gameType });

        // Listen for room updates
        socket.on('room-update', ({ players: updatedPlayers }) => {
            setPlayers(updatedPlayers);
        });

        socket.on('player-joined', ({ username }) => {
            console.log(`${username} joined the room`);
            if (username !== user.username) {
                addToast(`${username} joined!`, 'info');
                soundManager.playNotification();
            }
        });

        socket.on('player-left', ({ username }) => {
            console.log(`${username} left the room`);
            if (username !== user.username) {
                addToast(`${username} left`, 'warning');
            }
        });

        return () => {
            socket.emit('leave-room', { roomId });
            socket.off('room-update');
            socket.off('player-joined');
            socket.off('player-left');
        };
    }, [socket, connected, roomId, user.username, gameType]);

    const handleCopyRoomCode = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLeaveRoom = () => {
        navigate('/lobby');
    };

    const GameComponent = GAME_COMPONENTS[gameType];

    if (!GameComponent) {
        return (
            <div className="game-room-error">
                <h2>Game not found</h2>
                <Button onClick={() => navigate('/lobby')}>Back to Lobby</Button>
            </div>
        );
    }

    return (
        <>
            <div className="game-room">
                <div className="game-room-header">
                    <div className="room-info">
                        <h2>Room: {roomId}</h2>
                        <div className="players-info">
                            <span className="badge badge-primary">
                                {players.length} Players
                            </span>
                            {players.map((player, index) => (
                                <span key={index} className="player-badge">
                                    {player.username}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="room-actions">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCopyRoomCode}
                        >
                            {copied ? '✓ Copied!' : '📋 Copy Code'}
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setShowLeaveConfirm(true)}
                        >
                            Leave Room
                        </Button>
                    </div>
                </div>

                <div className="game-room-content">
                    <div className="game-area">
                        {players.length < 2 && gameType !== 'pictionary' && gameType !== 'palermo' ? (
                            <div className="waiting-screen">
                                <div className="waiting-content">
                                    <div className="waiting-icon animate-bounce">⏳</div>
                                    <h2>Waiting for opponent...</h2>
                                    <p>Share the room code with your friend:</p>
                                    <div className="room-code-display" onClick={handleCopyRoomCode}>
                                        <span className="room-code">{roomId}</span>
                                        <span className="copy-hint">Click to copy</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <GameComponent
                                socket={socket}
                                roomId={roomId}
                                user={user}
                                players={players}
                            />
                        )}
                    </div>
                </div>

                {/* Room Code Modal */}
                <Modal
                    isOpen={showRoomCode && players.length < 2}
                    onClose={() => setShowRoomCode(false)}
                    title="Share Room Code"
                >
                    <div className="modal-content">
                        <p className="text-secondary mb-lg">
                            Share this code with your friend to join:
                        </p>
                        <div className="room-code-modal" onClick={handleCopyRoomCode}>
                            <div className="room-code-large">{roomId}</div>
                            <Button variant="primary">
                                {copied ? '✓ Copied!' : 'Copy Code'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Leave Confirmation Modal */}
                <Modal
                    isOpen={showLeaveConfirm}
                    onClose={() => setShowLeaveConfirm(false)}
                    title="Leave Room?"
                >
                    <div className="modal-content">
                        <p className="text-secondary mb-lg">
                            Are you sure you want to leave? The game will end for all players.
                        </p>
                        <div className="flex gap-md">
                            <Button
                                variant="secondary"
                                onClick={() => setShowLeaveConfirm(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleLeaveRoom}
                            >
                                Leave Room
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>

            {/* Chat Drawer for mobile and desktop */}
            <ChatDrawer
                socket={socket}
                roomId={roomId}
                username={user.username}
            />
        </>
    );
};

export default GameRoom;
