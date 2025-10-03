import React from 'react';

interface ToastNotificationProps {
    message: string;
    show: boolean;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ message, show }) => {
    if (!show) return null;

    return (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
            <div className="bg-white border border-warm-200 rounded-lg px-4 py-3 max-w-md shadow-sm">
                <p className="text-sm text-warm-700">{message}</p>
            </div>
        </div>
    );
};

export default ToastNotification;
