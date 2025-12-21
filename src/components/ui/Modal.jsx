import React, { useState, useEffect } from 'react';
import { Code, Save, X } from 'lucide-react';

export const CodeEditorModal = ({ isOpen, initialCode, inputs = [], onSave, onClose, readOnly = false }) => {
    const [code, setCode] = useState(initialCode);
    const [output, setOutput] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setCode(initialCode || 'return inputs.reduce((a,b) => a+b, 0);');
            setOutput('');
            setError(null);
        }
    }, [isOpen, initialCode]);

    // Live Execution
    useEffect(() => {
        if (!isOpen) return;
        try {
            // Create a safe-ish function environment (similar to engine)
            const fn = new Function('inputs', code);
            const res = fn(inputs);

            // Format output safely
            if (res === undefined) setOutput('undefined');
            else if (res === null) setOutput('null');
            else if (typeof res === 'object') setOutput(JSON.stringify(res, null, 2));
            else setOutput(String(res));

            setError(null);
        } catch (err) {
            setError(err.message);
            setOutput('');
        }
    }, [code, inputs, isOpen]);

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col h-[85vh]">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <Code className="text-blue-600" />
                        {readOnly ? 'View Custom Logic' : 'Edit Custom Logic'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>

                {/* Editor Area */}
                <div className="flex-1 p-0 relative min-h-0 flex flex-col">
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                                e.preventDefault();
                                const start = e.target.selectionStart;
                                const end = e.target.selectionEnd;
                                const spaces = '  ';
                                setCode(code.substring(0, start) + spaces + code.substring(end));
                                // Defer cursor move to after render
                                setTimeout(() => {
                                    e.target.selectionStart = e.target.selectionEnd = start + spaces.length;
                                }, 0);
                            }
                        }}
                        className={`w-full h-full p-4 font-mono text-sm bg-slate-900 text-green-400 resize-none focus:outline-none flex-1 ${readOnly ? 'cursor-not-allowed opacity-90' : ''}`}
                        spellCheck={false}
                        readOnly={readOnly}
                    />

                    {/* Output Preview Area */}
                    <div className="h-32 bg-slate-100 border-t border-slate-300 p-2 flex flex-col font-mono text-xs overflow-auto">
                        <div className="text-slate-500 font-bold mb-1">Preview Output (based on current inputs):</div>
                        {error ? (
                            <div className="text-red-600 bg-red-50 p-2 rounded border border-red-200">{error}</div>
                        ) : (
                            <pre className="text-slate-700 whitespace-pre-wrap break-words">{output}</pre>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Close</button>
                    {!readOnly && (
                        <button onClick={() => onSave(code)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"><Save size={16} /> Save Changes</button>
                    )}
                </div>
            </div>
        </div>
    );
};
