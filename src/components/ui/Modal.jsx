import React, { useState, useEffect } from 'react';
import { Code, Save, X } from 'lucide-react';

export const CodeEditorModal = ({ isOpen, initialCode, onSave, onClose }) => {
    const [code, setCode] = useState(initialCode);
    useEffect(() => { if (isOpen) setCode(initialCode || 'return inputs.reduce((a,b) => a+b, 0);'); }, [isOpen, initialCode]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col h-[80vh]">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><Code className="text-blue-600" /> Edit Custom Logic</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="flex-1 p-0 relative">
                    <textarea value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-full p-4 font-mono text-sm bg-slate-900 text-green-400 resize-none focus:outline-none" spellCheck={false} />
                </div>
                <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
                    <button onClick={() => onSave(code)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"><Save size={16} /> Save Changes</button>
                </div>
            </div>
        </div>
    );
};
