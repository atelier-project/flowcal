import React, { useState, useEffect, useCallback } from 'react';
import { X, History, RotateCcw, Trash2, Save, Loader2, Clock } from 'lucide-react';
import { flowService } from '../../services/flowService';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

/**
 * Right-hand drawer listing a flow's saved versions. Save/list/restore/delete;
 * saving and restoring touch editor state, so those go through the parent
 * (onSaveVersion / onRestore); listing and deletion are pure data.
 */
export const VersionHistoryPanel = ({ isOpen, onClose, flowId, onSaveVersion, onRestore }) => {
    const { addToast } = useToast();
    const { confirm } = useConfirm();
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [label, setLabel] = useState('');

    const load = useCallback(async () => {
        if (!flowId) return;
        setLoading(true);
        try {
            setVersions(await flowService.listVersions(flowId));
        } catch (e) {
            addToast('Failed to load versions: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [flowId, addToast]);

    useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

    const handleSave = async () => {
        setBusy(true);
        try {
            await onSaveVersion(label.trim());
            setLabel('');
            await load();
            addToast('Version saved', 'success');
        } catch (e) {
            addToast('Failed to save version: ' + e.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleRestore = async (v) => {
        const ok = await confirm(
            'Restore this version? Your current state is snapshotted as a "Before restore" version first, so nothing is lost.',
            { title: 'Restore version', type: 'warning' }
        );
        if (!ok) return;
        setBusy(true);
        try {
            await onRestore(v.id);
            await load();
            addToast('Version restored', 'success');
        } catch (e) {
            addToast('Failed to restore: ' + e.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (v) => {
        const ok = await confirm('Delete this version permanently?', { title: 'Delete version', type: 'danger' });
        if (!ok) return;
        setBusy(true);
        try {
            await flowService.deleteVersion(flowId, v.id);
            await load();
            addToast('Version deleted', 'success');
        } catch (e) {
            addToast('Failed to delete: ' + e.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    if (!isOpen) return null;

    const authorName = (a) => a?.full_name || a?.email || 'Unknown';

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 border-l border-slate-200 dark:border-slate-700 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <History className="text-blue-500" size={20} />
                    Version History
                </h2>
                <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                    <X size={20} />
                </button>
            </div>

            {/* Save a new version */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-2">
                <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Version label (optional)"
                    maxLength={200}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
                <button
                    onClick={handleSave}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                >
                    {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    Save version
                </button>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Saves the flow, then snapshots it. Keeps the newest 50.</p>
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
                ) : versions.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No versions yet. Save one above.</p>
                ) : (
                    versions.map((v) => (
                        <div key={v.id} className="group p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
                                    {v.label || (v.origin === 'auto' ? 'Before restore' : 'Untitled version')}
                                    {v.origin === 'auto' && (
                                        <span className="text-[9px] uppercase tracking-wide px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">auto</span>
                                    )}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Clock size={10} />
                                    <span className="truncate">{new Date(v.created_at).toLocaleString()} · {authorName(v.author)}</span>
                                </div>
                            </div>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleRestore(v)}
                                    disabled={busy}
                                    title="Restore this version"
                                    className="p-1.5 rounded text-slate-400 hover:text-blue-500 disabled:opacity-40"
                                >
                                    <RotateCcw size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(v)}
                                    disabled={busy}
                                    title="Delete this version"
                                    className="p-1.5 rounded text-slate-400 hover:text-red-500 disabled:opacity-40"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
