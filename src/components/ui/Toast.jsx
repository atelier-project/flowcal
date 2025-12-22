import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export const Toast = ({ id, message, type = 'info', duration = 3000, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            setIsVisible(false);
            // Wait for exit animation to finish before removing
            setTimeout(() => onClose(id), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, id, onClose]);

    const styles = {
        success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200',
        error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200',
        info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200'
    };

    const icons = {
        success: <CheckCircle size={20} className="text-green-500 dark:text-green-400" />,
        error: <AlertCircle size={20} className="text-red-500 dark:text-red-400" />,
        info: <Info size={20} className="text-blue-500 dark:text-blue-400" />
    };

    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm w-full transition-all duration-300 transform
                ${styles[type]}
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
            `}
        >
            <div className="shrink-0">
                {icons[type]}
            </div>
            <p className="text-sm font-medium flex-1">{message}</p>
            <button
                onClick={() => { setIsVisible(false); setTimeout(() => onClose(id), 300); }}
                className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
};
