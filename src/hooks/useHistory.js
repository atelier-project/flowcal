import { useState, useCallback } from 'react';

export function useHistory(initialState) {
    const [history, setHistory] = useState({
        past: [],
        present: initialState,
        future: []
    });

    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;

    // Commit a new state to history
    const set = useCallback((newState) => {
        setHistory(curr => {
            if (curr.present === newState) return curr;
            return {
                past: [...curr.past, curr.present],
                present: newState,
                future: []
            };
        });
    }, []);

    // Update state WITHOUT committing to history (e.g., intermediate drag steps)
    const update = useCallback((newState) => {
        setHistory(curr => ({
            ...curr,
            present: newState
        }));
    }, []);

    const undo = useCallback(() => {
        setHistory(curr => {
            if (curr.past.length === 0) return curr;
            const previous = curr.past[curr.past.length - 1];
            const newPast = curr.past.slice(0, curr.past.length - 1);
            return {
                past: newPast,
                present: previous,
                future: [curr.present, ...curr.future]
            };
        });
    }, []);

    const redo = useCallback(() => {
        setHistory(curr => {
            if (curr.future.length === 0) return curr;
            const next = curr.future[0];
            const newFuture = curr.future.slice(1);
            return {
                past: [...curr.past, curr.present],
                present: next,
                future: newFuture
            };
        });
    }, []);

    return {
        state: history.present,
        set,
        update,
        undo,
        redo,
        canUndo,
        canRedo
    };
}
