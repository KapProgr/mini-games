import React from 'react';

const Card = ({
    children,
    interactive = false,
    onClick,
    className = '',
    ...props
}) => {
    const baseClass = 'card';
    const interactiveClass = interactive ? 'card-interactive' : '';

    return (
        <div
            className={`${baseClass} ${interactiveClass} ${className}`.trim()}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className = '' }) => (
    <div className={`card-header ${className}`.trim()}>
        {children}
    </div>
);

export const CardTitle = ({ children, className = '' }) => (
    <h3 className={`card-title ${className}`.trim()}>
        {children}
    </h3>
);

export const CardDescription = ({ children, className = '' }) => (
    <p className={`card-description ${className}`.trim()}>
        {children}
    </p>
);

export default Card;
