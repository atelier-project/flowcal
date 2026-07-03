import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import {
    THEME_FIELDS,
    getAllThemes,
    saveCustomTheme,
    deleteCustomTheme,
    applyThemeColors,
    applyTheme,
    withDerivedColors,
} from '../../themes';

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * ThemeEditor — live colour editor that saves named custom themes.
 *
 * Seeds from the active theme; tweaks apply to the document immediately so the
 * whole app previews live. Cancelling reverts to the active theme; saving
 * persists a custom theme (localStorage) and selects it.
 */
export const ThemeEditor = ({ isOpen, currentThemeId, onClose, onSaved }) => {
    const allThemes = getAllThemes();
    const seed = allThemes[currentThemeId] || allThemes.dark || allThemes.light;
    const editingCustomId = seed?.custom ? currentThemeId : null;

    const [name, setName] = useState('');
    const [isDark, setIsDark] = useState(true);
    const [colors, setColors] = useState({});

    // (Re)seed whenever the editor opens or the source theme changes.
    useEffect(() => {
        if (!isOpen) return;
        setName(seed?.custom ? seed.name : `${seed?.name || 'Custom'} copy`);
        setIsDark(!!seed?.isDark);
        const next = {};
        THEME_FIELDS.forEach(f => { next[f.key] = seed?.colors?.[f.key] || '#888888'; });
        setColors(next);
    }, [isOpen, currentThemeId]);

    // Live-apply on every edit.
    useEffect(() => {
        if (!isOpen || Object.keys(colors).length === 0) return;
        applyThemeColors(withDerivedColors(colors), isDark);
    }, [colors, isDark, isOpen]);

    if (!isOpen) return null;

    const setColor = (key, value) => setColors(prev => ({ ...prev, [key]: value }));

    const revertAndClose = () => {
        applyTheme(currentThemeId); // restore the previously-active theme
        onClose();
    };

    const handleSave = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const id = editingCustomId || `custom-${slugify(trimmed) || 'theme'}`;
        saveCustomTheme(id, { name: trimmed, isDark, colors: withDerivedColors(colors) });
        applyTheme(id);
        onSaved(id);
        onClose();
    };

    const handleDelete = () => {
        if (!editingCustomId) return;
        deleteCustomTheme(editingCustomId);
        applyTheme('dark');
        onSaved('dark', editingCustomId);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={revertAndClose}>
            <div
                className="w-full max-w-md max-h-[85vh] flex flex-col rounded-xl shadow-2xl m-4 border"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                    <h2 className="text-lg font-bold">{editingCustomId ? 'Edit Theme' : 'Customize Theme'}</h2>
                    <button onClick={revertAndClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }} title="Cancel (revert)">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                    <div className="flex items-center gap-3">
                        <label className="text-sm w-16" style={{ color: 'var(--text-secondary)' }}>Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Theme"
                            className="flex-1 px-2 py-1 rounded border text-sm focus:outline-none"
                            style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-sm w-16" style={{ color: 'var(--text-secondary)' }}>Base</label>
                        <div className="flex gap-2">
                            {['light', 'dark'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setIsDark(mode === 'dark')}
                                    className="px-3 py-1 rounded text-sm border capitalize"
                                    style={{
                                        backgroundColor: (isDark === (mode === 'dark')) ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-primary)',
                                        color: (isDark === (mode === 'dark')) ? '#fff' : 'var(--text-secondary)',
                                    }}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>(controls light/dark UI elements)</span>
                    </div>

                    <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--border-primary)' }}>
                        {THEME_FIELDS.map(f => {
                            const value = colors[f.key] || '#000000';
                            const valid = HEX.test(value);
                            return (
                                <div key={f.key} className="flex items-center gap-3">
                                    <label className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                                    <input
                                        type="text"
                                        value={value}
                                        onChange={(e) => setColor(f.key, e.target.value)}
                                        spellCheck={false}
                                        className="w-24 px-2 py-1 rounded border text-xs font-mono focus:outline-none"
                                        style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: valid ? 'var(--border-primary)' : '#ef4444', color: 'var(--text-primary)' }}
                                    />
                                    <input
                                        type="color"
                                        value={valid ? value : '#000000'}
                                        onChange={(e) => setColor(f.key, e.target.value)}
                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                        title={f.label}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 p-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <div>
                        {editingCustomId && (
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-red-500 hover:bg-red-500/10"
                                title="Delete this custom theme"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={revertAndClose} className="px-3 py-1.5 rounded text-sm hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name.trim()}
                            className="px-4 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40"
                            style={{ backgroundColor: 'var(--accent-primary)' }}
                        >
                            {editingCustomId ? 'Save' : 'Save theme'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
