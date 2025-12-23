import React from 'react';
import './PlayerCount.css';

const PlayerCount = ({ count = 0, onClick }) => {
    return (
        <button
            className="player-count-badge"
            onClick={onClick}
            title="View online players"
        >
            <span className="player-icon">👥</span>
            <span className="player-text">{count} online</span>
        </button>
    );
};

export default PlayerCount;
