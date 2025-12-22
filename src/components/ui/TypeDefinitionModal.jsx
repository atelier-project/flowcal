import React, { useState, useEffect } from 'react';
import { X, Save, Type, List, Box, Hash, GripVertical, Check } from 'lucide-react';
import { TYPES } from '../../utils/typeUtils';

export const TypeDefinitionModal = ({ isOpen, onClose, initialType, onSave }) => {
    const [baseType, setBaseType] = useState(TYPES.ANY);
    const [itemType, setItemType] = useState(TYPES.ANY);

    useEffect(() => {
        if (isOpen) {
            if (typeof initialType === 'string') {
                setBaseType(initialType);
                setItemType(TYPES.ANY);
            } else {
                setBaseType(initialType?.type || TYPES.ANY);
                setItemType(initialType?.itemType || TYPES.ANY);
            }
        }
    }, [isOpen, initialType]);

    const handleSave = () => {
        if (baseType === TYPES.ARRAY) {
            onSave({ type: TYPES.ARRAY, itemType });
        } else {
            onSave({ type: baseType });
        }
        onClose();
    };

    if (!isOpen) return null;

    const availableTypes = [
        { id: TYPES.ANY, label: 'Any', icon: Box, desc: 'Accepts any value' },
        { id: TYPES.STRING, label: 'String', icon: Type, desc: 'Text values' },
        { id: TYPES.NUMBER, label: 'Number', icon: Hash, desc: 'Numeric values' },
        { id: TYPES.BOOLEAN, label: 'Boolean', icon: Check, desc: 'True/False' },
        { id: TYPES.ARRAY, label: 'List (Array)', icon: List, desc: 'Collection of items' },
        { id: TYPES.OBJECT, label: 'Object', icon: Box, desc: 'Complex data structure' },
    ];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Type className="text-blue-500" size={20} />
                        Define Interface
                    </h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Base Type Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            {availableTypes.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setBaseType(t.id)}
                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left group ${baseType === t.id
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500'
                                            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                                        }`}
                                >
                                    <div className={`p-2 rounded-md ${baseType === t.id ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:text-blue-500'
                                        }`}>
                                        <t.icon size={18} />
                                    </div>
                                    <div>
                                        <div className={`font-semibold text-sm ${baseType === t.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                            {t.label}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{t.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Array Sub-Type Selection */}
                    {baseType === TYPES.ARRAY && (
                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <List size={16} className="text-purple-500" />
                                List Item Type
                            </label>
                            <select
                                value={itemType}
                                onChange={(e) => setItemType(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {availableTypes.filter(t => t.id !== TYPES.ARRAY).map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500">
                                This enforces that all items in the list match this type.
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center gap-2">
                        <Save size={16} />
                        Save Definition
                    </button>
                </div>
            </div>
        </div>
    );
};
