import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
    const [state, setState] = useState({
        isOpen: false,
        message: '',
        title: '',
        type: 'warning'
    });

    const resolveRef = useRef(null);

    const confirm = useCallback((message, options = {}) => {
        const { title = "Are you sure?", type = 'warning' } = options;

        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setState({
                isOpen: true,
                message,
                title,
                type
            });
        });
    }, []);

    const handleConfirm = () => {
        if (resolveRef.current) resolveRef.current(true);
        setState(prev => ({ ...prev, isOpen: false }));
    };

    const handleCancel = () => {
        if (resolveRef.current) resolveRef.current(false);
        setState(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <ConfirmDialog
                isOpen={state.isOpen}
                message={state.message}
                title={state.title}
                type={state.type}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};
