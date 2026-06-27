---
name: calc-to-flowcal
description: Convert a calculation, formula, or arithmetic/logic expression into an importable FlowCal flow (a node graph JSON). Use when a user gives a formula like "(base + tax) * qty" or a worded calculation and wants it as a FlowCal flow, or asks to build/generate a FlowCal graph from a computation.
---

# Calculation → FlowCal flow

FlowCal is a visual node-graph calculator. A "flow" is a JSON document of **nodes**
(operations and values) wired together by **edges**. This skill turns a calculation
into that JSON so it can be imported into FlowCal (Editor → **Load**) and will
compute the right answer.

The instructions below are self-contained — any LLM can follow them. The complete,
machine-readable list of node types is in [`node-catalog.json`](./node-catalog.json);
two verified, importable examples are in [`examples/`](./examples).

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

(For array-producing sources like `RANGE`, and string/array/object/date nodes, see
`node-catalog.json`.)

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

**Edge cases** (so generated flows don't surprise you): `DIV` by zero returns `0` (not
`NaN`/`Infinity`); an empty/unconnected `SUM` returns `0`; an empty `MUL` returns `1`.

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

For strings, arrays, objects, dates, and visuals (`GAUGE`, `BAR_CHART`, …), see
`node-catalog.json`.

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
     the edges in left-to-right operand order. (Edge array order **is** preserved through
     import/evaluation. If you'd rather not depend on it, rewrite `a - b` as
     `SUM(a, MUL(b, -1))` — `SUM` is commutative, so order no longer matters.)
   - Set `sourceHandle` to the source's output (`"value"` for `INPUT`).
5. **Terminate.** The root operation node holds the answer. Optionally add a `FINAL` node
   and one edge (`targetHandle: "val"`) into it for a labeled result display.
6. **Lay out & id.** Give every node a unique string `id`, a sensible `position` (spread
   left→right by depth, e.g. x = depth·300, y staggered to avoid overlap), and every edge
   a unique `id`.

## Worked examples (verified — they import and compute)

### 1. Arithmetic: `(base + tax) * quantity` with base=100, tax=20, qty=2 → **240**
See [`examples/arithmetic.json`](./examples/arithmetic.json). Shape:
`INPUT(100) + INPUT(20)` → `SUM` → `MUL` ← `INPUT(2)` → `FINAL`. The `MUL` node computes
240; `FINAL` displays it.

### 2. Conditional: `(total / count >= 50) ? 1 : 0` with total=240, count=4 → **1**
See [`examples/conditional.json`](./examples/conditional.json). Shows **named handles**:
`DIV` (`a`=total, `b`=count), `COMPARE` (`a`=div, `b`=threshold, `operator: ">="`),
`IF` (`condition`=compare, `trueVal`=INPUT(1), `falseVal`=INPUT(0)).

### 3. Reused variable / fan-out: `x*x + x` with x=5 → **30**
See [`examples/reuse.json`](./examples/reuse.json). One `INPUT(x)` feeds **multiple**
targets — both inputs of `MUL` (giving `x*x`) **and** the `SUM` (`x*x + x`). Use a single
`INPUT` per distinct variable and add an edge from it for each place it appears.

## Grouping: bundle a sub-calculation into a reusable block

A key FlowCal feature is the **GROUP** node — it wraps a chunk of a calculation into a
single tidy "function" block with its own inputs and outputs. Reach for it when a
calculation has a logically distinct part, a repeated sub-formula, or just gets big enough
that collapsing a section keeps the canvas readable.

A `GROUP` node holds a nested flow in `data.subGraph` (`{ nodes, edges }`). Inside the
subgraph, the boundary is marked by special nodes:

- **`GROUP_INPUT`** — one per input the block accepts. External edges feed these.
- **`GROUP_OUTPUT`** (`inputs: ["val"]`) — one per value the block returns.
- (`GROUP_INPUT_LIST` / `GROUP_OUTPUT_LIST` are the array-valued variants.)

**Wiring rules** (the boundary nodes are addressed by their `id`, which is the gotcha):

- **Edge into the group:** `targetHandle` = the **id of the `GROUP_INPUT` node** it
  feeds. Inside the subgraph, that `GROUP_INPUT` then connects to the inner node(s).
- **Edge out of the group:** the group's value is an object keyed by output-node id
  (`{ "<GROUP_OUTPUT id>": value, … }`), so set the downstream edge's `sourceHandle` =
  the **id of the `GROUP_OUTPUT` node** whose value you want.
- **Inside the subgraph:** wire `GROUP_INPUT.id` → inner node inputs, and inner node
  output → the `GROUP_OUTPUT` node (its single `val` input). The subgraph uses the exact
  same node/edge schema as a top-level flow.

### 4. Group example: `doubleSum(a, b) = (a + b) * 2`, with a=10, b=5 → **30**
See [`examples/group.json`](./examples/group.json). A `GROUP` named `doubleSum` takes two
inputs (`gi_a`, `gi_b`), computes `(a+b)*2` internally, and exposes one output (`go`).
Outer edges connect `INPUT(a) → group[targetHandle:"gi_a"]`, `INPUT(b) →
group[targetHandle:"gi_b"]`, and `group[sourceHandle:"go"] → FINAL`. The group evaluates
to `{ "go": 30 }`; the `"go"` handle extracts `30`.

## Validate your output

- Every node: unique string `id`, valid `type`, numeric `position`.
- Every edge: unique `id`, real `source`/`target` ids, and a `targetHandle` for every
  named-input target.
- No cycles. Exactly one logical "answer" node.
- Mentally (or actually) run `evaluateGraph` and check the terminal node's value matches
  the expected result. The examples here were verified against FlowCal's real evaluator.
