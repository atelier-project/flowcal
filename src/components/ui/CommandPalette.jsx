import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { NODE_LOGIC } from '../../engine/nodeDefinitions';
import { getUI } from '../flow/nodeUIMap';

// Insertable nodes for the palette. Iterator-context nodes (Item/Index/…) are
// only valid inside an iterator's sub-flow, so they're excluded here — matching
// the top-level sidebar.
const PALETTE_NODES = Object.values(NODE_LOGIC)
    .filter((def) => def.category !== 'Iterator Context')
    .map((def) => ({ type: def.type, label: def.label || def.type, category: def.category || '' }));

/**
 * Command palette (Cmd/Ctrl-K): fuzzy-search the node catalog by label, type or
 * category and insert the chosen node at the cursor. Keyboard-driven — arrows to
 * move, Enter to insert, Esc to close.
 */
export function CommandPalette({ isOpen, onClose, onSelect }) {
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const listRef = useRef(null);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = !q
            ? PALETTE_NODES
            : PALETTE_NODES.filter((n) =>
                n.label.toLowerCase().includes(q) ||
                n.type.toLowerCase().includes(q) ||
                n.category.toLowerCase().includes(q));
        return list.slice(0, 60);
    }, [query]);

    // Reset each time it opens; keep the active row in range as results change.
    useEffect(() => { if (isOpen) { setQuery(''); setActive(0); } }, [isOpen]);
    useEffect(() => { setActive(0); }, [query]);
    useEffect(() => {
        const el = listRef.current?.children[active];
        el?.scrollIntoView?.({ block: 'nearest' });
    }, [active]);

    if (!isOpen) return null;

    const choose = (n) => { if (n) { onSelect(n.type); onClose(); } };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
        else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
            onMouseDown={onClose}
        >
            <div
                className="w-full max-w-lg mx-4 rounded-xl shadow-2xl border overflow-hidden"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 px-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                    <Search size={16} className="opacity-50 shrink-0" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Search nodes to insert…"
                        className="flex-1 bg-transparent py-3 text-sm focus:outline-none"
                        style={{ color: 'var(--text-primary)' }}
                    />
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded border opacity-50" style={{ borderColor: 'var(--border-primary)' }}>esc</kbd>
                </div>
                <ul ref={listRef} className="max-h-80 overflow-y-auto py-1">
                    {results.length === 0 && (
                        <li className="px-4 py-6 text-center text-sm opacity-50" style={{ color: 'var(--text-primary)' }}>
                            No nodes match “{query}”
                        </li>
                    )}
                    {results.map((n, i) => {
                        const Icon = getUI(n.type).icon;
                        return (
                            <li
                                key={n.type}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => choose(n)}
                                className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm ${i === active ? 'bg-blue-500/15' : ''}`}
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {Icon && <Icon size={15} className="opacity-70 shrink-0" />}
                                <span className="truncate flex-1">{n.label}</span>
                                <span className="text-[10px] opacity-40 shrink-0">{n.category}</span>
                            </li>
                        );
                    })}
                </ul>
                <div className="px-3 py-1.5 border-t text-[10px] opacity-50 flex gap-3" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}>
                    <span>↑↓ navigate</span><span>↵ insert</span><span>esc close</span>
                </div>
            </div>
        </div>
    );
}
