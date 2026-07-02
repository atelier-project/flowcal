/**
 * Collapsed-GROUP summary layout. A collapsed group lists its outputs (one row
 * each) so the flow's state is readable from the top-level canvas and each
 * outgoing wire leaves from a distinct, labelled port. The handle positions
 * (geometry.js / NodeHandles.jsx) and the rendered rows (Node.jsx) all derive
 * from these constants so they stay pixel-aligned.
 */
export const COLLAPSED_GROUP_HEADER = 40;
export const COLLAPSED_GROUP_ROW = 22;
export const collapsedGroupHandleTop = (index) =>
    COLLAPSED_GROUP_HEADER + COLLAPSED_GROUP_ROW / 2 + index * COLLAPSED_GROUP_ROW;

const groupBoundaryCounts = (node) => {
    const nodes = node.data?.subGraph?.nodes || [];
    const inputs = nodes.filter(n => n.type === 'GROUP_INPUT' || n.type === 'GROUP_INPUT_LIST').length;
    const outputs = nodes.filter(n => n.type === 'GROUP_OUTPUT' || n.type === 'GROUP_OUTPUT_LIST').length;
    return { inputs, outputs };
};

/**
 * Utility: Estimate Node Height for Hit Testing & Handle Alignment
 */
export const getNodeHeight = (node) => {
    if (!node) return 160;

    // If node is collapsed, return just the header — except a GROUP, which grows
    // to fit one summary row per boundary port (see constants above).
    if (node.data?.collapsed) {
        if (node.type === 'GROUP') {
            const { inputs, outputs } = groupBoundaryCounts(node);
            const rows = Math.max(inputs, outputs);
            if (rows > 0) return COLLAPSED_GROUP_HEADER + rows * COLLAPSED_GROUP_ROW + 8;
        }
        return 40;
    }

    if (node.type === 'GROUP') {
        const inputs = node.data.subGraph?.nodes.filter(n => n.type === 'GROUP_INPUT') || [];
        const outputs = node.data.subGraph?.nodes.filter(n => n.type === 'GROUP_OUTPUT') || [];
        const count = Math.max(inputs.length, outputs.length);
        let minHeight = Math.max(100, (count * 24) + 60);

        // Add height for results box if toggled on
        if (node.data?.showResults) {
            minHeight += 120; // Estimated height for scrollable results box
        }

        // Return the larger of user-defined height or calculated minimum
        return Math.max(minHeight, node.data?.height || 0);
    }

    if (node.type === 'COLLECTOR') {
        const count = node.data.inputCount || 2;
        return Math.max(120, (count * 24) + 60);
    }

    if (node.type === 'REPORT') {
        const count = node.data.inputCount || 2;
        // title + one row per input + add-row button
        return Math.max(160, (count * 34) + 110);
    }

    if (node.type === 'SELECT') {
        // picker rows + the per-option editor rows
        const count = node.data?.options?.length || 0;
        return Math.max(180, 110 + count * 56);
    }
    if (node.type === 'CUSTOM') return 240;
    if (node.type === 'TEMPLATE') return 220;
    if (node.type === 'FINAL') return 120;
    if (node.type === 'GAUGE' || node.type === 'LINE_CHART' || node.type === 'BAR_CHART' || node.type === 'TABLE') return 220;
    if (node.type === 'PROGRESS') return 140;
    if (node.type === 'RANGE') return 200;

    if (node.type === 'COMMENT') {
        // Header (40) + body padding (8) + content
        return Math.max(120, (node.data?.height || 80) + 50);
    }

    if (node.type === 'FORM') {
        const fields = node.data.fields || [];
        // Header (40) + Body Pad (24) + Fields (n * 30) + Add Button (30) + Output (varies, default to ~40)
        return Math.max(160, (fields.length * 30) + 140);
    }

    if (node.type === 'FUNCTION') {
        const params = node.data.params || [];
        // Header (40) + Params section (n * 30) + Code area (60) + Add button (30) + Result (40)
        return Math.max(200, (params.length * 30) + 180);
    }

    return 160;
};
