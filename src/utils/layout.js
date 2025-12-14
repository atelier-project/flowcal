/**
 * Utility: Estimate Node Height for Hit Testing & Handle Alignment
 */
export const getNodeHeight = (node) => {
    if (!node) return 160;

    // If node is collapsed, return just header height
    if (node.data?.collapsed) return 40;

    if (node.type === 'GROUP') {
        const inputs = node.data.subGraph?.nodes.filter(n => n.type === 'GROUP_INPUT') || [];
        const outputs = node.data.subGraph?.nodes.filter(n => n.type === 'GROUP_OUTPUT') || [];
        const count = Math.max(inputs.length, outputs.length);
        return Math.max(100, (count * 24) + 60);
    }

    if (node.type === 'COLLECTOR') {
        const count = node.data.inputCount || 2;
        return Math.max(120, (count * 24) + 60);
    }

    if (node.type === 'CUSTOM') return 240;
    if (node.type === 'TEMPLATE') return 220;
    if (node.type === 'FINAL') return 120;
    if (node.type === 'GAUGE' || node.type === 'LINE_CHART' || node.type === 'BAR_CHART' || node.type === 'TABLE') return 220;
    if (node.type === 'PROGRESS') return 140;
    if (node.type === 'RANGE') return 200;

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
