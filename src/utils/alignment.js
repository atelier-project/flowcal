/**
 * Alignment guides: while dragging a node, detect when its edges or centre line
 * up with a neighbouring node and snap to that alignment (showing a guide line).
 *
 * Boxes are { x, y, w, h } in canvas coordinates. Pure and side-effect free.
 */

// The three snap lines on each axis: near edge, centre, far edge.
const xLines = (b) => [b.x, b.x + b.w / 2, b.x + b.w];
const yLines = (b) => [b.y, b.y + b.h / 2, b.y + b.h];

/**
 * @param anchor  tentative box of the dragged node (already at origin + delta)
 * @param others  boxes of the static nodes to align against
 * @param threshold  max gap (canvas px) that still counts as aligned
 * @returns {{dx: number, dy: number, hasX: boolean, hasY: boolean, guides: Array<{x1: number, y1: number, x2: number, y2: number}>}}
 *          dx/dy are the extra offset to apply to the anchor; guides are line
 *          segments to render.
 */
export function computeAlignment(anchor, others, threshold = 6) {
    let dx = 0, dy = 0, bestX = threshold + 1, bestY = threshold + 1;
    let candX = null, candY = null, lineX = 0, lineY = 0;

    const ax = xLines(anchor), ay = yLines(anchor);
    for (const o of others) {
        const ox = xLines(o), oy = yLines(o);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const gx = Math.abs(ax[i] - ox[j]);
                if (gx < bestX) { bestX = gx; dx = ox[j] - ax[i]; lineX = ox[j]; candX = o; }
                const gy = Math.abs(ay[i] - oy[j]);
                if (gy < bestY) { bestY = gy; dy = oy[j] - ay[i]; lineY = oy[j]; candY = o; }
            }
        }
    }

    const guides = [];
    const PAD = 10;
    if (candX) {
        const a = { ...anchor, x: anchor.x + dx };
        guides.push({
            x1: lineX, x2: lineX,
            y1: Math.min(a.y, candX.y) - PAD,
            y2: Math.max(a.y + a.h, candX.y + candX.h) + PAD,
        });
    }
    if (candY) {
        const a = { ...anchor, y: anchor.y + dy };
        guides.push({
            y1: lineY, y2: lineY,
            x1: Math.min(a.x, candY.x) - PAD,
            x2: Math.max(a.x + a.w, candY.x + candY.w) + PAD,
        });
    }

    return { dx: candX ? dx : 0, dy: candY ? dy : 0, hasX: !!candX, hasY: !!candY, guides };
}
