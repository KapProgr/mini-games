import React from 'react';
import Modal from './Modal';
import './OnlinePlayers.css';

const OnlinePlayers = ({ isOpen, onClose, players = [] }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="👥 Online Players">
            <div className="online-players-list">
                {players.length === 0 ? (
                    <div className="no-players">
                        <p>No players online</p>
                    </div>
                ) : (
                    players.map((player, index) => (
                        <div key={index} className="player-item">
                            <span className="player-avatar">{player.avatar || '😀'}</span>
                            <span className="player-name">{player.username}</span>
                            <span className="player-status">🟢</span>
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
};

export default OnlinePlayers;
