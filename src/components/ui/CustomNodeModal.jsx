import React, { useState, useEffect } from 'react';
import { X, Save, Package, Calculator, Box, Layers, Star, Zap, Heart, Code } from 'lucide-react';

const ICON_OPTIONS = [
    { id: 'Package', icon: Package, label: 'Package' },
    { id: 'Calculator', icon: Calculator, label: 'Calculator' },
    { id: 'Box', icon: Box, label: 'Box' },
    { id: 'Layers', icon: Layers, label: 'Layers' },
    { id: 'Star', icon: Star, label: 'Star' },
    { id: 'Zap', icon: Zap, label: 'Zap' },
    { id: 'Heart', icon: Heart, label: 'Heart' },
    { id: 'Code', icon: Code, label: 'Code' },
];

export const CustomNodeModal = ({ isOpen, groupNode, onSave, onClose }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Package');

    useEffect(() => {
        if (isOpen && groupNode) {
            setName(groupNode.data?.label || 'Custom Node');
            setDescription('');
            setSelectedIcon('Package');
        }
    }, [isOpen, groupNode]);

    if (!isOpen || !groupNode) return null;

    const subGraph = groupNode.data?.subGraph || { nodes: [], edges: [] };
    const inputs = subGraph.nodes?.filter(n => n.type === 'GROUP_INPUT') || [];
    const outputs = subGraph.nodes?.filter(n => n.type === 'GROUP_OUTPUT') || [];

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({
            name: name.trim(),
            description: description.trim(),
            icon: selectedIcon
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-xl shadow-2xl m-4"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Package size={20} style={{ color: 'var(--accent-primary)' }} />
                        Save as Custom Node
                    </h2>
                    <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                            Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Custom Node"
                            className="w-full p-2 rounded border text-sm focus:outline-none"
                            style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                borderColor: 'var(--border-primary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What does this node do?"
                            rows={2}
                            className="w-full p-2 rounded border text-sm focus:outline-none resize-none"
                            style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                borderColor: 'var(--border-primary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                    {/* Icon Picker */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Icon
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {ICON_OPTIONS.map(({ id, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setSelectedIcon(id)}
                                    className={`p-2 rounded border transition-all ${selectedIcon === id ? 'ring-2 ring-blue-500' : ''}`}
                                    style={{
                                        backgroundColor: selectedIcon === id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-primary)',
                                        color: selectedIcon === id ? 'white' : 'var(--text-primary)'
                                    }}
                                    title={id}
                                >
                                    <Icon size={18} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-3 rounded border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}>
                        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Preview</p>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded bg-purple-500 text-white">
                                {React.createElement(ICON_OPTIONS.find(i => i.id === selectedIcon)?.icon || Package, { size: 18 })}
                            </div>
                            <div>
                                <p className="font-medium text-sm">{name || 'Untitled'}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {inputs.length} input{inputs.length !== 1 ? 's' : ''}, {outputs.length} output{outputs.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded text-sm font-medium hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="px-4 py-2 rounded text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save Custom Node
                    </button>
                </div>
            </div>
        </div>
    );
};
