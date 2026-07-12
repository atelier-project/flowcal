/**
 * Shared JSDoc typedefs for the core domain (#37).
 *
 * FlowCal stays JSX-only — this file exists purely so `checkJs` has something to
 * check *against*. That matters more than it sounds: TypeScript treats an
 * unannotated parameter in a .js file as implicitly `any` *and optional*, so an
 * untyped function is effectively unchecked — wrong shapes and even wrong arity
 * sail straight through. The checker only has teeth where JSDoc exists, so
 * annotate the core and the checks follow.
 *
 * Import these with `@import` / `import('../types').Node` — no runtime cost.
 */

/**
 * A point in canvas coordinates.
 * @typedef {{ x: number, y: number }} Point
 */

/**
 * A node's payload. Deliberately open — every node type stores its own fields
 * here (value, label, keys, subGraph, …), so this is a bag with a few
 * well-known members rather than a closed shape.
 * @typedef {Object.<string, any>} NodeData
 */

/**
 * A graph node.
 * @typedef {Object} Node
 * @property {string} id
 * @property {string} type            Node type key, e.g. 'SUM' (see NODE_LOGIC).
 * @property {Point} position         Top-left on the canvas.
 * @property {NodeData} [data]
 */

/**
 * A wire between two node ports. `sourceHandle`/`targetHandle` are port ids;
 * null means the node's single default port.
 * @typedef {Object} Edge
 * @property {string} id
 * @property {string} source
 * @property {string} target
 * @property {string|null} [sourceHandle]
 * @property {string|null} [targetHandle]
 * @property {number} [midX]          Draggable bend, orthogonal routing only.
 */

/**
 * A flow graph: what gets evaluated, saved and diffed.
 * @typedef {Object} Graph
 * @property {Node[]} nodes
 * @property {Edge[]} edges
 */

/**
 * One input or output port, positioned by getPortLayout (the single source of
 * truth shared by render, wire geometry and the drop hit-test).
 * @typedef {Object} Port
 * @property {string|null} id
 * @property {string} [label]
 * @property {number|string} top      Offset from the node's top (px, or a % string).
 * @property {'input'|'output'} side
 * @property {number} x
 */

export {};
