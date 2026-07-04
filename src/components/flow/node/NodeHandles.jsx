import React, { useMemo } from 'react';
import { Handle } from '../Handle';
import { getInputPorts, getOutputPorts } from '../../../utils/portLayout';

/**
 * useNodeHandles - Hook to calculate input and output handle positions.
 *
 * The positioning logic lives in `portLayout.js` (getInputPorts/getOutputPorts)
 * so the rendered dots here, the wire endpoints (geometry.js), and the drop
 * hit-test (Editor.jsx) all derive from ONE source and can't drift apart. This
 * hook just memoizes those pure results for rendering.
 */
export const useNodeHandles = (type, data) => {
    const inputHandles = useMemo(
        () => getInputPorts(type, data),
        [type, data.subGraph, data.inputCount, data.params, data.keys, data.inputOrder, data.collapsed, data.fields, data.showInputs]
    );

    const outputHandles = useMemo(
        () => getOutputPorts(type, data),
        [type, data.subGraph, data.keys, data.outputOrder, data.collapsed, data.width, data.height, data.showResults]
    );

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
