import React, { useEffect } from 'react';
import Button from './Button';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    showCloseButton = true,
    className = ''
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal ${className}`.trim()}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="flex justify-between items-center mb-lg">
                        <h2>{title}</h2>
                        {showCloseButton && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onClose}
                            >
                                ✕
                            </Button>
                        )}
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};

export default Modal;
