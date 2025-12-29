import React from 'react';
import { X, MousePointer, Link, Trash2, Copy, Undo, Redo, Download, Upload, FileJson, Palette, HelpCircle } from 'lucide-react';

export const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl shadow-2xl m-4"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between p-4 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <HelpCircle size={24} style={{ color: 'var(--accent-primary)' }} />
                        FlowCalc Help
                    </h2>
                    <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Getting Started */}
                    <section>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>Getting Started</h3>
                        <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
                            FlowCalc is a visual node-based calculator. Create flows by connecting nodes to perform calculations, manipulate data, and visualize results.
                        </p>
                    </section>

                    {/* Basic Operations */}
                    <section>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>Basic Operations</h3>
                        <ul className="space-y-2" style={{ color: 'var(--text-secondary)' }}>
                            <li className="flex items-start gap-2">
                                <MousePointer size={16} className="mt-1 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                                <span><strong>Add Nodes:</strong> Click any node button in the sidebar to add it to the canvas.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Link size={16} className="mt-1 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                                <span><strong>Connect Nodes:</strong> Drag from an output handle (right side) to an input handle (left side).</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Trash2 size={16} className="mt-1 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                                <span><strong>Delete:</strong> Click the trash icon on a node, or double-click a connection line.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Copy size={16} className="mt-1 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                                <span><strong>Duplicate:</strong> Select a node and press <kbd className="px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Ctrl+D</kbd> or click the copy icon.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Navigation */}
                    <section>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>Navigation</h3>
                        <ul className="space-y-2" style={{ color: 'var(--text-secondary)' }}>
                            <li><strong>Pan:</strong> Click and drag on the canvas background.</li>
                            <li><strong>Zoom:</strong> Use the +/- buttons in the bottom right, or scroll wheel.</li>
                            <li><strong>Select Multiple:</strong> Hold Shift and drag to create a selection box.</li>
                        </ul>
                    </section>

                    {/* Toolbar */}
                    <section>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>Toolbar Buttons</h3>
                        <ul className="space-y-2" style={{ color: 'var(--text-secondary)' }}>
                            <li className="flex items-center gap-2">
                                <Download size={16} style={{ color: 'var(--accent-primary)' }} />
                                <span><strong>Save:</strong> Download your flow as a JSON file.</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Upload size={16} style={{ color: 'var(--accent-primary)' }} />
                                <span><strong>Load:</strong> Open a previously saved flow.</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <FileJson size={16} style={{ color: 'var(--accent-primary)' }} />
                                <span><strong>Export JS:</strong> Generate standalone JavaScript code.</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Undo size={16} style={{ color: 'var(--accent-primary)' }} />
                                <Redo size={16} style={{ color: 'var(--accent-primary)' }} />
                                <span><strong>Undo/Redo:</strong> Reverse or repeat recent changes.</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Palette size={16} style={{ color: 'var(--accent-primary)' }} />
                                <span><strong>Themes:</strong> Choose from multiple visual themes.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Node Categories */}
                    <section>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>Node Categories</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <div><strong>Data:</strong> Inputs, forms, arrays</div>
                            <div><strong>String:</strong> Text manipulation</div>
                            <div><strong>Date:</strong> Date/time operations</div>
                            <div><strong>Array:</strong> List operations</div>
                            <div><strong>Object:</strong> Object manipulation</div>
                            <div><strong>Logic:</strong> Conditions, comparisons</div>
                            <div><strong>Math:</strong> Calculations</div>
                            <div><strong>Iterator:</strong> MAP, FILTER, REDUCE</div>
                            <div><strong>Visuals:</strong> Charts, tables, output</div>
                            <div><strong>Advanced:</strong> Custom code, groups</div>
                        </div>
                    </section>

                    {/* Iterator Nodes */}
                    <section>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>Iterator Nodes (MAP, FILTER, REDUCE)</h3>
                        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Process arrays item-by-item with custom logic. Similar to JavaScript's <code>.map()</code>, <code>.filter()</code>, and <code>.reduce()</code>.
                        </p>
                        <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <li>
                                <strong style={{ color: 'var(--accent-primary)' }}>MAP:</strong> Transform each item in an array.
                                <ol className="ml-4 mt-1 list-decimal space-y-1">
                                    <li>Add a MAP node and connect an array to its input</li>
                                    <li>Click the gear icon to enter the MAP</li>
                                    <li>Add <strong>Current Item</strong> and <strong>Map Output</strong> nodes from Iterator Context</li>
                                    <li>Build your transformation logic between them</li>
                                    <li>Exit back - output is the transformed array</li>
                                </ol>
                            </li>
                            <li>
                                <strong style={{ color: 'var(--accent-primary)' }}>FILTER:</strong> Keep only items that match a condition.
                                <ol className="ml-4 mt-1 list-decimal space-y-1">
                                    <li>Add a FILTER node and enter it</li>
                                    <li>Use <strong>Current Item</strong> and <strong>Include Item</strong> nodes</li>
                                    <li>Connect a boolean (true/false) to Include Item</li>
                                    <li>Only items where Include is true are kept</li>
                                </ol>
                            </li>
                            <li>
                                <strong style={{ color: 'var(--accent-primary)' }}>REDUCE:</strong> Accumulate items into a single value.
                                <ol className="ml-4 mt-1 list-decimal space-y-1">
                                    <li>Set the initial value in the REDUCE node's data</li>
                                    <li>Enter and use <strong>Current Item</strong>, <strong>Accumulator</strong>, and <strong>New Accumulator</strong></li>
                                    <li>Connect your reduction logic (e.g., SUM of Accumulator + Item)</li>
                                    <li>Output is the final accumulated value</li>
                                </ol>
                            </li>
                        </ul>
                    </section>

                    {/* Tips */}
                    <section>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>Tips</h3>
                        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <li>• Hover over node buttons to see descriptions.</li>
                            <li>• Use the <strong>Final Result</strong> node to display your flow's output.</li>
                            <li>• Create <strong>Groups</strong> to organize complex flows into reusable components.</li>
                            <li>• Add <strong>Comments</strong> to document your flow.</li>
                            <li>• Use the search bar to quickly find nodes.</li>
                        </ul>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-4 border-t text-center text-sm" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}>
                    Press <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Esc</kbd> or click outside to close
                </div>
            </div>
        </div>
    );
};
