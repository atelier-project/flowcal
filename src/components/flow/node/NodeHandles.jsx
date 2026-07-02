import React, { useMemo } from 'react';
import { Handle } from '../Handle';
import { getDefinition } from '../../../engine/nodeDefinitions';
import { getNodeHeight, collapsedGroupHandleTop } from '../../../utils/layout';

/**
 * useNodeHandles - Hook to calculate input and output handle positions
 * 
 * This hook encapsulates all the logic for determining which handles a node should have
 * and where they should be positioned based on the node type and data.
 */
export const useNodeHandles = (type, data) => {
    const def = getDefinition(type);
    const minHeight = getNodeHeight({ type, data });

    const inputHandles = useMemo(() => {
        let handles = [];
        if (type === 'GROUP' && data.subGraph && data.subGraph.nodes) {
            handles = data.subGraph.nodes
                .filter(n => n.type === 'GROUP_INPUT' || n.type === 'GROUP_INPUT_LIST')
                .map((n, idx) => ({
                    id: n.id,
                    label: n.data.label || `Input ${idx + 1}`,
                    description: n.data.description || ''
                }));
        } else if (type === 'FORM') {
            const fields = data.fields || [];
            if (data.showInputs) {
                handles = fields.map((field, i) => ({
                    id: `field_${i}`,
                    label: '',
                    top: 48 + (i * 30)
                }));
            } else {
                handles = [];
            }
        } else if (type === 'FUNCTION') {
            const params = data.params || [];
            handles = params.map((param, i) => ({
                id: `param_${i}`,
                label: param.name || `p${i}`,
                top: 80 + (i * 30)
            }));
        } else if (type === 'PACK') {
            const keys = data.keys || [];
            if (data.collapsed) {
                handles = keys.map((key) => ({ id: key, label: key, top: 20 }));
            } else {
                handles = keys.map((key, idx) => ({
                    id: key,
                    label: key,
                    top: 48 + (idx * 24)
                }));
            }
        } else if (type === 'REPORT') {
            // Align each input handle with its row (rows are min-h-[28px], below the
            // title). Explicit tops here are preserved by the assignment step below.
            const count = data.inputCount || 2;
            const ROW_H = 28;
            const FIRST_ROW_TOP = 100; // ≈ header + body padding + title + gap
            // No numeric label — each row already shows its own (auto-)label.
            handles = Array.from({ length: count }).map((_, i) => ({ id: `in_${i}`, label: '', top: FIRST_ROW_TOP + i * ROW_H }));
        } else if (type === 'COLLECTOR' || (def && def.dynamicInputs)) {
            const count = data.inputCount || 2;
            handles = Array.from({ length: count }).map((_, i) => ({ id: `in_${i}`, label: `${i}` }));
        } else if (type === 'UNPACK') {
            handles = [{ id: 'object', label: 'Object', top: data.collapsed ? 20 : 110 }];
        } else if (type === 'CUSTOM') {
            handles = [{ id: null, top: data.collapsed ? 20 : 100 }];
        } else if (type === 'GROUP_OUTPUT' || type === 'GROUP_OUTPUT_LIST') {
            const height = getNodeHeight({ type, data });
            handles = [{ id: null, top: height / 2 }];
        } else if (def && def.inputs && !def.inputs.includes('*')) {
            handles = def.inputs.map((name) => ({
                id: name,
                label: name.charAt(0).toUpperCase() + name.slice(1),
            }));
        } else if (type === 'TEMPLATE') {
            handles = [{ id: null, top: 60 }];
        } else if (type !== 'INPUT' && type !== 'GROUP_INPUT') {
            handles = [{ id: null, top: '50%' }];
        }

        // Apply custom order if exists
        if (data.inputOrder && Array.isArray(data.inputOrder) && handles.length > 0) {
            handles.sort((a, b) => {
                const idxA = data.inputOrder.indexOf(a.id);
                const idxB = data.inputOrder.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
        }

        // Assign positions
        if (data.collapsed) {
            // Collapsed groups spread their ports into rows; everything else
            // stacks at the header.
            if (type === 'GROUP') {
                return handles.map((h, i) => ({ ...h, top: collapsedGroupHandleTop(i) }));
            }
            return handles.map((h) => ({ ...h, top: 20 }));
        }
        // REPORT sets its own per-row tops (above) to line up with its rows.
        if (type === 'REPORT') return handles;
        if (handles.length === 1 && handles[0].top) return handles;
        return handles.map((h, i) => ({ ...h, top: 40 + (i * 24) }));

    }, [type, data.subGraph, data.inputCount, data.params, data.keys, def, data.inputOrder, data.collapsed, data.fields, data.showInputs]);

    const outputHandles = useMemo(() => {
        let handles = [];
        if (type === 'GROUP' && data.subGraph && data.subGraph.nodes) {
            handles = data.subGraph.nodes
                .filter(n => n.type === 'GROUP_OUTPUT' || n.type === 'GROUP_OUTPUT_LIST')
                .map((n, idx) => ({
                    id: n.id,
                    label: n.data.label || `Output ${idx + 1}`,
                    description: n.data.description || ''
                }));
        } else if (type === 'TEMPLATE') {
            handles = [{ id: 'text', label: 'Text', top: 60 }];
        } else if (type === 'UNPACK') {
            const keys = data.keys || [];
            if (data.collapsed) {
                handles = keys.map((key) => ({ id: key, label: key, top: 20 }));
            } else {
                handles = keys.map((key, idx) => ({
                    id: key,
                    label: key,
                    top: 80 + (idx * 32)
                }));
            }
        } else if (def && def.outputs) {
            handles = def.outputs.map((name) => ({
                id: name,
                label: name.charAt(0).toUpperCase() + name.slice(1),
            }));
        } else if (!['GROUP_OUTPUT', 'GROUP_OUTPUT_LIST', 'FINAL', 'GAUGE', 'PROGRESS', 'LINE_CHART', 'BAR_CHART', 'TABLE'].includes(type) && def.category !== 'Visuals' && type !== 'FINAL') {
            if (type === 'FORM') {
                handles = [{ id: null, top: minHeight / 2 }];
            } else if (type === 'GROUP_INPUT') {
                handles = [{ id: null, top: minHeight / 2 }];
            } else if (type === 'CUSTOM') {
                handles = [{ id: null, top: data.collapsed ? 20 : 100 }];
            } else {
                handles = [{ id: null, top: '50%' }];
            }
        }

        // Apply custom order
        if (data.outputOrder && Array.isArray(data.outputOrder) && handles.length > 0) {
            handles.sort((a, b) => {
                const idxA = data.outputOrder.indexOf(a.id);
                const idxB = data.outputOrder.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
        }

        if (data.collapsed && type !== 'UNPACK') {
            if (type === 'GROUP') {
                return handles.map((h, i) => ({ ...h, top: collapsedGroupHandleTop(i) }));
            }
            return handles.map((h) => ({ ...h, top: 20 }));
        }

        if (handles.length === 1 && handles[0].top) return handles;
        return handles.map((h, i) => h.top ? h : { ...h, top: 40 + (i * 24) });
    }, [type, data.subGraph, data.keys, def, data.outputOrder, minHeight, data.collapsed]);

    return { inputHandles, outputHandles };
};

/**
 * NodeHandles - Renders input and output handles for a node
 */
export const NodeHandles = ({
    id,
    type,
    data,
    inputHandles,
    outputHandles,
    typeWarnings,
    onStartConnect
}) => {
    return (
        <>
            {inputHandles.map(h => {
                const handleKey = h.id || 'default';
                const warning = typeWarnings && typeWarnings[`${id}:${handleKey}`];
                let handleTypeDef = null;
                if (type === 'GROUP' && data.subGraph) {
                    const inputNode = data.subGraph.nodes.find(n => n.id === h.id);
                    if (inputNode && inputNode.data) {
                        handleTypeDef = inputNode.data.typeDef;
                    }
                }
                return (
                    <Handle
                        key={handleKey}
                        type="input"
                        id={h.id}
                        position={{ y: typeof h.top === 'number' ? `${h.top}px` : h.top }}
                        onMouseDown={() => { }}
                        isValid={!warning}
                        description={h.description}
                        typeWarning={warning}
                        typeDef={handleTypeDef}
                    />
                );
            })}

            {outputHandles.map(h => {
                let handleTypeDef = null;
                if (type === 'GROUP' && data.subGraph) {
                    const outputNode = data.subGraph.nodes.find(n => n.id === h.id);
                    if (outputNode && outputNode.data) {
                        handleTypeDef = outputNode.data.typeDef;
                    }
                }
                return (
                    <Handle
                        key={h.id || 'default'}
                        type="output"
                        id={h.id}
                        position={{ y: typeof h.top === 'number' ? `${h.top}px` : h.top }}
                        onMouseDown={(e) => onStartConnect(e, id, h.id)}
                        isValid={true}
                        description={h.label}
                        typeDef={handleTypeDef}
                    />
                );
            })}
        </>
    );
};
