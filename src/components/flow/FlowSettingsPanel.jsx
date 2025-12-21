import React, { useState, useEffect } from 'react';
import { X, Save, Shield, Lock, Download, AlertTriangle, Unlock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const FlowSettingsPanel = ({ isOpen, onClose, flowData, onUpdateSettings, onLockAll, onUnlockAll, isOwner }) => {
    const { isAdmin } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [preventDownload, setPreventDownload] = useState(false);

    // Initialize state from flowData
    useEffect(() => {
        if (isOpen && flowData) {
            setName(flowData.name || 'Untitled Flow');
            setDescription(flowData.description || '');
            // Check for flow-level security flag
            setPreventDownload(flowData.preventDownload || false);
        }
    }, [isOpen, flowData]);

    const handleSave = () => {
        onUpdateSettings({
            name,
            description,
            preventDownload
        });
        onClose();
    };

    if (!isOpen) return null;

    const canManageSecurity = isOwner || isAdmin;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 border-l border-slate-200 dark:border-slate-700 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Shield className="text-purple-500" size={20} />
                    Flow Settings
                </h2>
                <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* General Settings */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">General</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Flow Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={!canManageSecurity}
                            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white disabled:opacity-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={!canManageSecurity}
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white resize-none disabled:opacity-50"
                        />
                    </div>
                </div>

                {/* Security Settings */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Security
                        {!canManageSecurity && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded text-slate-500">Read Only</span>}
                    </h3>

                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded">
                                    <Download size={16} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">Prevent Download</h4>
                                    <p className="text-xs text-slate-500">Disable "Export JSON" for non-owners.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => canManageSecurity && setPreventDownload(!preventDownload)}
                                disabled={!canManageSecurity}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${preventDownload ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${preventDownload ? 'translate-x-4.5' : 'translate-x-1'}`} style={{ transform: preventDownload ? 'translateX(18px)' : 'translateX(2px)' }} />
                            </button>
                        </div>
                        {preventDownload && (
                            <div className="mt-2 flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-2 rounded">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <p>Only you (and admins) will be able to download this flow.</p>
                            </div>
                        )}
                    </div>

                    {/* Global Actions */}
                    {canManageSecurity && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={onLockAll}
                                className="flex flex-col items-center justify-center gap-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500 rounded-lg transition-colors group"
                            >
                                <Lock size={20} className="text-slate-400 group-hover:text-red-500 mb-1" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Lock All Nodes</span>
                            </button>
                            <button
                                onClick={onUnlockAll}
                                className="flex flex-col items-center justify-center gap-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-lg transition-colors group"
                            >
                                <Unlock size={20} className="text-slate-400 group-hover:text-blue-500 mb-1" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Unlock All Nodes</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={!canManageSecurity && (name === flowData?.name)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                    <Save size={16} />
                    Save Settings
                </button>
            </div>
        </div>
    );
};
