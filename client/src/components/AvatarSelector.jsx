import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import './AvatarSelector.css';

const AVATARS = [
    '😀', '😎', '🤖', '👾', '🐱', '🐶', '🦊', '🐼',
    '🦁', '🐯', '🐸', '🐙', '🦄', '🐲', '👻', '🎃',
    '⭐', '🔥', '💎', '🎮', '🎯', '🎨', '🎭', '🎪'
];

const AvatarSelector = ({ currentAvatar, onSelect, onClose }) => {
    const [selected, setSelected] = useState(currentAvatar || AVATARS[0]);

    const handleConfirm = () => {
        onSelect(selected);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Choose Your Avatar">
            <div className="avatar-selector">
                <div className="avatar-grid">
                    {AVATARS.map((avatar) => (
                        <button
                            key={avatar}
                            className={`avatar-option ${selected === avatar ? 'selected' : ''}`}
                            onClick={() => setSelected(avatar)}
                        >
                            {avatar}
                        </button>
                    ))}
                </div>
                <div className="avatar-preview">
                    <span className="preview-label">Selected:</span>
                    <span className="preview-avatar">{selected}</span>
                </div>
                <div className="flex gap-md">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
                </div>
            </div>
        </Modal>
    );
};

export default AvatarSelector;
