---
name: calc-to-flowcal
description: Convert a calculation, formula, or arithmetic/logic expression into an importable FlowCal flow (a node graph JSON). Use when a user gives a formula like "(base + tax) * qty" or a worded calculation and wants it as a FlowCal flow, or asks to build/generate a FlowCal graph from a computation.
---

# Calculation → FlowCal flow

FlowCal is a visual node-graph calculator. A "flow" is a JSON document of **nodes**
(operations and values) wired together by **edges**. This skill turns a calculation
into that JSON so it can be imported into FlowCal (Editor → **Load**) and will
compute the right answer.

**This file is fully self-contained** — the schema, the complete node list, and two
verified example flows are all inlined below, so you need nothing else to use it.
(The same data is also available as separate files for convenience:
[`node-catalog.json`](./node-catalog.json) has every node's default `data` values, and
[`examples/`](./examples) holds the example flows as standalone `.json`.)

## The flow file format

Import/export is a single JSON object:

```json
{
  "title": "My calculation",
  "nodes": [ /* Node objects */ ],
  "edges": [ /* Edge objects */ ],
  "viewport": { "pan": { "x": 0, "y": 0 }, "scale": 1 }
}
```

`title` and `viewport` are optional. The importer validates the file, so output
**must** satisfy these rules (from `src/utils/validation.js`):

**Node** — `{ "id", "type", "position": {"x","y"}, "data": {} }`
- `id` — non-empty **string**, unique across the flow.
- `type` — non-empty **string**; one of the registry types (see catalog). Unknown
  types import but evaluate to 0.
- `position` — `{ "x": number, "y": number }` (**required**, both numbers).
- `data` — object of node-specific fields (see each node). Optional but usually needed.

**Edge** — `{ "id", "source", "target", "sourceHandle", "targetHandle" }`
- `id` — non-empty **string**, unique.
- `source` / `target` — node ids the edge connects **from** / **to** (required strings).
- `sourceHandle` — the **output** name on the source node (e.g. `"value"`).
- `targetHandle` — the **input** name on the target node (e.g. `"a"`). Required when
  the target has named inputs (see below); omit for single-input or `*` nodes.

Limits: ≤10000 nodes, ≤50000 edges, ≤10MB. Avoid `CUSTOM`/`FUNCTION` nodes (they
trigger a code-review warning on import).

## How values flow (the evaluation model)

Every node computes a value from its inputs; edges carry a source node's output to a
target node's input. A node's inputs are delivered to its `compute` in one of two shapes,
depending on how the node declares `inputs`:

1. **Named inputs** — e.g. `DIV` has `inputs: ["a","b"]`. Each incoming edge **must**
   set `targetHandle` to the input name. `compute` receives an object `{ a, b }`.
2. **Variadic inputs** — `inputs: ["*"]` (e.g. `SUM`, `MUL`). Any number of edges
   connect with **no** `targetHandle`. `compute` receives an **array** of the incoming
   values, in the order the edges appear in the `edges` array. **Order matters** for
   non-commutative ops (`SUB` reduces left→right: `a - b - c`).

`sourceHandle` is the output name of the source node (e.g. an `INPUT` outputs `"value"`).
Setting it is good practice; for single-output nodes it can be omitted.

The graph is evaluated by `evaluateGraph(nodes, edges)` (pure DFS with cycle
detection). The **answer of the calculation is the computed value of the terminal
operation node.**

## Core node reference (for calculations)

Full list in `node-catalog.json`. The nodes you need for most calculations:

### Values (sources — no inputs)
| type | output | data | meaning |
|------|--------|------|---------|
| `INPUT` | `value` | `{ "value": <number>, "label": "" }` | A number. Set `data.value`. |
| `TEXT_INPUT` | `text` | `{ "text": "" }` | A string. |
| `RANGE` | — | — | Generates `[start..end]` (inputs `start,end,step`). |

### Math
| type | inputs | meaning |
|------|--------|---------|
| `SUM` | `*` | adds all inputs |
| `SUB` | `*` | `a - b - c …` (edge order matters) |
| `MUL` | `*` | multiplies all inputs |
| `DIV` | `a, b` | `a / b` (named — set targetHandle) |
| `MIN` / `MAX` | `*` | min / max of inputs |
| `ROUND` | `val, decimals` | round `val` to `decimals` places |
| `FLOOR` / `CEIL` | `val` | floor / ceil |
| `RANDOM` | `min, max` | random in range |

There is **no exponent/power node** — express `x²` as `MUL(x, x)`, or use a `FUNCTION`
node (avoid unless necessary; it warns on import).

### Logic
| type | inputs | data | meaning |
|------|--------|------|---------|
| `COMPARE` | `a, b` | `{ "operator": ">" }` | returns `1`/`0`. operator ∈ `> < >= <= == !=` |
| `IF` | `condition, trueVal, falseVal` | — | `condition` truthy (≠0) → `trueVal`, else `falseVal` |

### Result / display
| type | inputs | meaning |
|------|--------|---------|
| `FINAL` | `val` | "Final Result" badge — **displays** its incoming value. Optional, for emphasis. |

> Note on `FINAL`: it shows the value flowing into it, but (being terminal) its own
> *computed* output is 0. So the canonical answer is the **operation node feeding it**,
> not `FINAL` itself. Ending at the last operation node is also fine — every node shows
> its own value.

## Complete node list

Every node type, with its input handles (`*` = variadic array; `—` = none) and output
handles. Named inputs require a matching `targetHandle` on the edge. (Default `data`
values per node are in `node-catalog.json`.)

**Data**
- `INPUT` (in: —; out: value) · data: value, min, max, step, useSlider
- `TEXT_INPUT` (in: —; out: text) · data: text
- `DATE_INPUT` (in: —; out: timestamp) · data: date
- `RANGE` (in: start, end, step; out: —)
- `COLLECTOR` (in: —; out: —)
- `FORM` (in: —; out: —) · data: fields, showInputs
- `GET_GLOBAL` (in: —; out: value) · data: key

**Math**
- `SUM` (in: *) · sum of all inputs
- `SUB` (in: *) · `a - b - c …` (edge order matters)
- `MUL` (in: *) · product of all inputs
- `DIV` (in: a, b) · `a / b`
- `MIN` (in: *) · `MAX` (in: *)
- `ROUND` (in: val, decimals) · `FLOOR` (in: val) · `CEIL` (in: val)
- `RANDOM` (in: min, max)

**Logic**
- `COMPARE` (in: a, b) · data: operator ∈ `> < >= <= == !=` → returns `1`/`0`
- `IF` (in: condition, trueVal, falseVal)

**String**
- `STRING_CONCAT` (in: *)
- `STRING_SPLIT` (in: text, delimiter) · data: delimiter
- `STRING_REPLACE` (in: text, find, replace) · data: find, replace
- `STRING_UPPER` (in: text) · `STRING_LOWER` (in: text) · `STRING_TRIM` (in: text)
- `STRING_LENGTH` (in: text)
- `STRING_SUBSTRING` (in: text, start, end)

**Array**
- `GET` (in: array, index) · data: index
- `LENGTH` (in: array)
- `SLICE` (in: array, start, end)
- `SORT` (in: array) · data: order
- `ARRAY_FLATTEN` (in: *)

**Object**
- `GET_KEY` (in: object) · data: key
- `OBJECT_COMBINE` (in: *)
- `OBJECT_FLATTEN` (in: object)
- `OBJECT_KEYS` (in: object) · `OBJECT_VALUES` (in: object)
- `UNPACK` (in: object) · data: keys
- `PACK` (in: variadic, named by data.keys; out: object) · data: keys

**Date**
- `DATE_NOW` (in: —)
- `DATE_FORMAT` (in: timestamp) · data: format
- `DATE_PARSE` (in: text)
- `DATE_DIFF` (in: date1, date2) · data: unit

**Iterator** (each runs a `subGraph` over an input array — advanced)
- `MAP` (in: array; out: results) · data: subGraph
- `FILTER` (in: array; out: results) · data: subGraph
- `REDUCE` (in: array; out: result) · data: subGraph, initialValue
- Iterator-context nodes (used only *inside* a subGraph): `MAP_ITEM`, `MAP_INDEX`,
  `MAP_OUTPUT`, `FILTER_ITEM`, `FILTER_INDEX`, `FILTER_INCLUDE`, `REDUCE_ITEM`,
  `REDUCE_INDEX`, `REDUCE_ACCUMULATOR`, `REDUCE_OUTPUT`

**Visuals** (display the incoming value; not used as a value source)
- `GAUGE` (in: val, min, max) · `PROGRESS` (in: val, max)
- `LINE_CHART` / `BAR_CHART` / `TABLE` (in: data)
- `TEMPLATE` (in: *; out: text) · data: template
- `FINAL` (in: val) · "Final Result" badge

**Advanced** (grouping / non-linear / code — usually not needed for plain calculations)
- `GROUP`, `GROUP_INPUT`, `GROUP_INPUT_LIST`, `GROUP_OUTPUT`, `GROUP_OUTPUT_LIST` — subgraph composition
- `WARP_IN` (in: val) / `WARP_OUT` (out: value) · data: tag — non-linear skip links by tag
- `CUSTOM` / `FUNCTION` — run JS (⚠️ trigger a code-review warning on import; avoid)
- `COMMENT`, `TEXT_LABEL`, `FRAME` — annotations (no computation)

**Atelier** (topology display nodes — not for calculations)
- `ATELIER_INGRESS` (out: service), `ATELIER_SERVICE` (in: from_ingress; out: pods),
  `ATELIER_DEPLOYMENT` (in: from_service)

## Algorithm: expression → flow

1. **Parse** the expression into an operation tree (respect precedence/parentheses).
2. **Leaves → value nodes.** Each literal/variable becomes an `INPUT` (set `data.value`;
   use the variable name as `data.label`). Reuse one `INPUT` per distinct variable if it
   appears multiple times.
3. **Operators → operation nodes.** Map each operator to a node type:
   `+`→`SUM`, `-`→`SUB`, `*`→`MUL`, `/`→`DIV`, comparisons→`COMPARE`,
   ternary/if→`IF`, `min/max/round/floor/ceil`→the matching node.
4. **Wire edges.** For each operation node, add an edge from each operand's node to it.
   - Named-input nodes (`DIV`, `ROUND`, `COMPARE`, `IF`, …): set `targetHandle` to the
     correct input name, and order doesn't matter.
   - `*` nodes (`SUM`, `MUL`, `SUB`, `MIN`, `MAX`): omit `targetHandle`; for `SUB`, list
     the edges in left-to-right operand order.
   - Set `sourceHandle` to the source's output (`"value"` for `INPUT`).
5. **Terminate.** The root operation node holds the answer. Optionally add a `FINAL` node
   and one edge (`targetHandle: "val"`) into it for a labeled result display.
6. **Lay out & id.** Give every node a unique string `id`, a sensible `position` (spread
   left→right by depth, e.g. x = depth·300, y staggered to avoid overlap), and every edge
   a unique `id`.

## Worked examples (verified — they import and compute)

### 1. Arithmetic: `(base + tax) * quantity` with base=100, tax=20, qty=2 → **240**
`INPUT(100) + INPUT(20)` → `SUM` → `MUL` ← `INPUT(2)` → `FINAL`. The `MUL` node computes
240; `FINAL` displays it.

```json
{
  "title": "(base + tax) * quantity",
  "nodes": [
    {"id":"base","type":"INPUT","position":{"x":50,"y":50},"data":{"value":100,"label":"Base"}},
    {"id":"tax","type":"INPUT","position":{"x":50,"y":200},"data":{"value":20,"label":"Tax"}},
    {"id":"sum","type":"SUM","position":{"x":350,"y":120},"data":{"label":"Subtotal"}},
    {"id":"qty","type":"INPUT","position":{"x":350,"y":320},"data":{"value":2,"label":"Quantity"}},
    {"id":"mul","type":"MUL","position":{"x":650,"y":200},"data":{"label":"Total"}},
    {"id":"result","type":"FINAL","position":{"x":950,"y":200},"data":{"label":"Result"}}
  ],
  "edges": [
    {"id":"e1","source":"base","target":"sum","sourceHandle":"value"},
    {"id":"e2","source":"tax","target":"sum","sourceHandle":"value"},
    {"id":"e3","source":"sum","target":"mul"},
    {"id":"e4","source":"qty","target":"mul","sourceHandle":"value"},
    {"id":"e5","source":"mul","target":"result","targetHandle":"val"}
  ]
}
```

### 2. Conditional: `(total / count >= 50) ? 1 : 0` with total=240, count=4 → **1**
Shows **named handles**: `DIV` (`a`=total, `b`=count), `COMPARE` (`a`=div, `b`=threshold,
`operator: ">="`), `IF` (`condition`=compare, `trueVal`=INPUT(1), `falseVal`=INPUT(0)).

```json
{
  "title": "pass = (total/count >= 50) ? 1 : 0",
  "nodes": [
    {"id":"total","type":"INPUT","position":{"x":50,"y":50},"data":{"value":240}},
    {"id":"count","type":"INPUT","position":{"x":50,"y":200},"data":{"value":4}},
    {"id":"div","type":"DIV","position":{"x":350,"y":120},"data":{}},
    {"id":"thresh","type":"INPUT","position":{"x":350,"y":320},"data":{"value":50}},
    {"id":"cmp","type":"COMPARE","position":{"x":650,"y":200},"data":{"operator":">="}},
    {"id":"yes","type":"INPUT","position":{"x":650,"y":380},"data":{"value":1}},
    {"id":"no","type":"INPUT","position":{"x":650,"y":500},"data":{"value":0}},
    {"id":"iff","type":"IF","position":{"x":950,"y":300},"data":{}},
    {"id":"result","type":"FINAL","position":{"x":1250,"y":300},"data":{}}
  ],
  "edges": [
    {"id":"e1","source":"total","target":"div","targetHandle":"a","sourceHandle":"value"},
    {"id":"e2","source":"count","target":"div","targetHandle":"b","sourceHandle":"value"},
    {"id":"e3","source":"div","target":"cmp","targetHandle":"a"},
    {"id":"e4","source":"thresh","target":"cmp","targetHandle":"b","sourceHandle":"value"},
    {"id":"e5","source":"cmp","target":"iff","targetHandle":"condition"},
    {"id":"e6","source":"yes","target":"iff","targetHandle":"trueVal","sourceHandle":"value"},
    {"id":"e7","source":"no","target":"iff","targetHandle":"falseVal","sourceHandle":"value"},
    {"id":"e8","source":"iff","target":"result","targetHandle":"val"}
  ]
}
```

## Validate your output

- Every node: unique string `id`, valid `type`, numeric `position`.
- Every edge: unique `id`, real `source`/`target` ids, and a `targetHandle` for every
  named-input target.
- No cycles. Exactly one logical "answer" node.
- Mentally (or actually) run `evaluateGraph` and check the terminal node's value matches
  the expected result. The examples here were verified against FlowCal's real evaluator.
