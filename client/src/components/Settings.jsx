import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import ThemeToggle from './ThemeToggle';
import soundManager from '../utils/soundManager';
import './Settings.css';

const Settings = ({ isOpen, onClose }) => {
    const [volume, setVolume] = useState(0.5);
    const [notificationsEnabled, setNotificationsEnabled] = useState(
        localStorage.getItem('notificationsEnabled') !== 'false'
    );

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        // Update sound manager volume if needed
    };

    const handleNotificationsToggle = () => {
        const newState = !notificationsEnabled;
        setNotificationsEnabled(newState);
        localStorage.setItem('notificationsEnabled', newState);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="⚙️ Settings">
            <div className="settings-panel">
                <div className="setting-group">
                    <label className="setting-label">Theme</label>
                    <div className="setting-control">
                        <ThemeToggle />
                        <span className="setting-hint">Toggle dark/light mode</span>
                    </div>
                </div>

                <div className="setting-group">
                    <label className="setting-label">Sound Volume</label>
                    <div className="setting-control">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="volume-slider"
                        />
                        <span className="volume-value">{Math.round(volume * 100)}%</span>
                    </div>
                </div>

                <div className="setting-group">
                    <label className="setting-label">Notifications</label>
                    <div className="setting-control">
                        <button
                            className={`toggle-btn ${notificationsEnabled ? 'active' : ''}`}
                            onClick={handleNotificationsToggle}
                        >
                            {notificationsEnabled ? 'ON' : 'OFF'}
                        </button>
                        <span className="setting-hint">Player join/leave alerts</span>
                    </div>
                </div>

                <div className="settings-actions">
                    <Button variant="primary" onClick={onClose}>Done</Button>
                </div>
            </div>
        </Modal>
    );
};

export default Settings;
