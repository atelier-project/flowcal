
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, Undo, Redo, Moon, Sun } from 'lucide-react';

import { Node } from './components/flow/Node';
import { ConnectionLine } from './components/flow/ConnectionLine';
import { BackgroundGrid } from './components/flow/BackgroundGrid';
import { SelectionBox } from './components/flow/SelectionBox';
import { Sidebar } from './components/flow/Sidebar';
import { CodeEditorModal } from './components/ui/Modal';

import { generateId } from './utils/ids';
import { getHandlePosition, getBezierPath } from './utils/geometry';
import { getNodeHeight } from './utils/layout';
import { evaluateGraph, ENGINE_SCRIPT } from './engine/evaluator';
import { useDebounce } from './hooks/useDebounce';
import { useHistory } from './hooks/useHistory';

export default function NodeCalcApp() {

  // Initial Data
  const initialNodes = [
    { id: '1', type: 'INPUT', position: { x: 50, y: 50 }, data: { value: 10, label: 'Base Price' } },
    { id: '2', type: 'INPUT', position: { x: 50, y: 350 }, data: { value: 20, label: 'Tax Rate' } },
    { id: '3', type: 'SUM', position: { x: 400, y: 200 }, data: { label: 'Subtotal' } },
    { id: '4', type: 'MUL', position: { x: 750, y: 200 }, data: { value: 2, label: 'Final Total' } },
  ];
  const initialEdges = [
    { id: 'e1-3', source: '1', target: '3' },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e3-4', source: '3', target: '4' },
  ];

  // --- State ---
  // History manages nodes and edges together
  const { state: graphState, set: setGraph, update: updateGraph, undo, redo, canUndo, canRedo } = useHistory({
    nodes: initialNodes,
    edges: initialEdges
  });
  const { nodes, edges } = graphState;

  const [path, setPath] = useState([]);
  const [results, setResults] = useState({});
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const [dragState, setDragState] = useState(null);
  const [connectionState, setConnectionState] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [hoverGroup, setHoverGroup] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionBox, setSelectionBox] = useState(null);
  const [editor, setEditor] = useState({ isOpen: false, nodeId: null, code: '' });

  const NODE_WIDTH = 256;

  // Debounced state for performance
  const debouncedNodes = useDebounce(nodes, 50);
  const debouncedEdges = useDebounce(edges, 50);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flowcal-theme');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('flowcal-theme', JSON.stringify(true));
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('flowcal-theme', JSON.stringify(false));
    }
  }, [darkMode]);

  // --- Engine Integration ---
  useEffect(() => {
    // Reuse evaluateGraph logic for consistent results
    let currentContext = {};
    if (path.length > 0) {
      // Re-evaluate path stack to get context for current level
      // Note: We use the immediate path, not debounced, assuming path change is infrequent/instant
      for (let i = 0; i < path.length; i++) {
        const frame = path[i];
        const frameResults = evaluateGraph(frame.nodes, frame.edges, currentContext);
        const groupId = frame.id;
        const groupNode = frame.nodes.find(n => n.id === groupId);

        if (groupNode) {
          const subContext = {};
          const connectedEdges = frame.edges.filter(e => e.target === groupId);
          connectedEdges.forEach(edge => {
            const rawVal = frameResults[edge.source];
            const sourceNode = frame.nodes.find(n => n.id === edge.source);
            let val = rawVal;
            if (sourceNode?.type === 'FORM' || sourceNode?.type === 'GROUP_INPUT') {
              val = rawVal;
            } else if (typeof rawVal === 'object' && rawVal !== null && edge.sourceHandle) {
              val = rawVal[edge.sourceHandle];
            } else if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
              val = Object.values(rawVal)[0];
            }
            if (edge.targetHandle) subContext[edge.targetHandle] = val;
          });
          currentContext = subContext;
        }
      }
    }

    // Use debounced values for the heavy calculation
    const finalResults = evaluateGraph(debouncedNodes, debouncedEdges, currentContext);
    setResults(finalResults);
  }, [debouncedNodes, debouncedEdges, path]);


  // --- IO Handlers ---

  const handleSave = () => {
    const config = { nodes, edges, viewport: { pan, scale } };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flowcalc - ${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoad = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target.result);
        if (Array.isArray(config.nodes) && Array.isArray(config.edges)) {
          setGraph({ nodes: config.nodes, edges: config.edges }); // Commit to history
          if (config.viewport) {
            setPan(config.viewport.pan || { x: 0, y: 0 });
            setScale(config.viewport.scale || 1);
          }
        }
      } catch (err) {
        console.error("Failed to load config", err);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleExportJS = () => {
    if (path.length > 0) {
      alert("Please return to Root level to export the full application.");
      return;
    }
    const graphData = { nodes, edges };
    const fileContent = `
${ENGINE_SCRIPT}
const graphData = ${JSON.stringify(graphData, null, 2)};
console.log("Starting Calculation...");
const results = evaluateGraph(graphData.nodes, graphData.edges);
console.log("Final Results:", results);
if (typeof module !== 'undefined') module.exports = { evaluateGraph, graphData };
`;
    const blob = new Blob([fileContent], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flowcalc - runner.js`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Helpers ---

  const enterGroup = (groupId) => {
    const groupNode = nodes.find(n => n.id === groupId);
    if (!groupNode || groupNode.type !== 'GROUP') return;
    const subGraph = groupNode.data.subGraph || { nodes: [], edges: [] };

    // Push current level to path
    setPath(prev => [...prev, { id: groupId, label: groupNode.data.label || 'Group', nodes, edges, viewport: { pan, scale } }]);

    // We set the graph state to the subgraph, but we need to handle history carefully.
    // For simplicity: History is cleared/reset when entering a group (new context).
    // A full nested history implementation is complex. 
    // We will just adopt the subgraph as the new "present" root.
    // LIMITATION: Undo stack is reset on group enter/exit.
    setGraph({ nodes: subGraph.nodes, edges: subGraph.edges });

    setPan({ x: 0, y: 0 });
    setScale(1);
    setConnectionState(null);
    setSelectedIds(new Set());
  };

  const jumpToPath = (index) => {
    const unwind = (targetIdx) => {
      // When leaving a group, we need to save the current state BACK into the parent node
      const currentSubGraph = { nodes, edges };

      // We need to traverse back up the stack
      // This is tricky because `path` has the *snapshot* from when we entered.
      // But we modified the current level.

      // Reconstruct the stack from top to target
      let currentLevelData = currentSubGraph;

      // We are currently at path.length level (not in array).
      // path[path.length-1] is the immediate parent.

      // NOTE: For this refactor, improving the group save logic is out of scope of "History".
      // but we must ensure we don't lose work.
      // As originally implemented, `jumpToPath` unwinds and updates mutable state.
      // We need to replicate that logic but using our state setters.

      // Ideally: We should have one giant Global State including all subgraphs, but that's a huge change.
      // Compromise: We behave like original: Save checks out.

      let currN = nodes;
      let currE = edges;
      const stack = [...path];

      // We have to walk back up.
      // However, `useHistory` only tracks the CURRENT view.
      // When we go up, we are essentially doing a "Load" of the parent, but we must UPDATE the child node in that parent.

      // Loop from top (current context) up to target
      // Actually, the original implementation's `unwind` logic was:
      // stored frames in `path`. Pop frame. Update frame's node with current data.

      // This works if `path` stores the CURRENT state of parents? No, `path` stores the state *at entry time*.
      // So we take current `nodes, edges`, pop a frame `parent`. Find `groupNode` in `parent`. Update it with `nodes, edges`. 
      // `parent` becomes `current`. Repeat.

      while (stack.length > targetIdx + 1) {
        const frame = stack.pop(); // Parent context
        const groupId = frame.id;

        // Update the group node in the parent context with the current level's data
        const updatedNodes = frame.nodes.map(n =>
          n.id === groupId ? { ...n, data: { ...n.data, subGraph: { nodes: currN, edges: currE } } } : n
        );

        currN = updatedNodes;
        currE = frame.edges;
      }

      setGraph({ nodes: currN, edges: currE }); // Commit the result of exiting

      if (stack.length === 0) { setPan({ x: 0, y: 0 }); setScale(1); }
      setPath(stack);
      setSelectedIds(new Set());
    };
    unwind(index);
  };

  // --- Handlers (Mouse/Key) ---

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleWheel = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const zoomSensitivity = 0.001;
    const minScale = 0.1; const maxScale = 3;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(minScale, scale + delta), maxScale);
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const scaleRatio = newScale / scale;
    const newPan = { x: mouseX - (mouseX - pan.x) * scaleRatio, y: mouseY - (mouseY - pan.y) * scaleRatio };
    setScale(newScale); setPan(newPan);
  }, [scale, pan]);

  // Fix for "Unable to preventDefault inside passive event listener"
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e) => handleWheel(e);
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [handleWheel]);

  const handleMouseDown = (e) => {
    if (e.button === 0 && e.target === containerRef.current) {
      if (!e.shiftKey) setSelectedIds(new Set());
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / scale;
      const y = (e.clientY - rect.top - pan.y) / scale;
      setSelectionBox({ start: { x, y }, current: { x, y } });
      if (!e.shiftKey) {
        setSelectionBox(null);
        setDragState({ type: 'pan', startPan: { ...pan }, startMouse: { x: e.clientX, y: e.clientY } });
      }
    }
  };

  const handleNodeDragStart = (e, id) => {
    e.stopPropagation();
    let newSelectedIds = new Set(selectedIds);
    if (e.shiftKey) {
      if (newSelectedIds.has(id)) newSelectedIds.delete(id);
      else newSelectedIds.add(id);
    } else {
      if (!newSelectedIds.has(id)) newSelectedIds = new Set([id]);
    }
    setSelectedIds(newSelectedIds);
    setDragState({ type: 'node', ids: Array.from(newSelectedIds), startMouse: { x: e.clientX, y: e.clientY } });
    // Commit the current state to history as a checkpoint before dragging starts
    setGraph({ nodes, edges });
  };

  const handleConnectionStart = (e, sourceId, handleId) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / scale;
    const y = (e.clientY - rect.top - pan.y) / scale;
    setConnectionState({ sourceId, sourceHandle: handleId, mousePos: { x, y } });
  };

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / scale;
    const y = (e.clientY - rect.top - pan.y) / scale;

    if (selectionBox) {
      setSelectionBox(prev => ({ ...prev, current: { x, y } }));
      const startX = Math.min(selectionBox.start.x, x);
      const endX = Math.max(selectionBox.start.x, x);
      const startY = Math.min(selectionBox.start.y, y);
      const endY = Math.max(selectionBox.start.y, y);
      const selected = new Set();
      nodes.forEach(n => {
        const nh = getNodeHeight(n);
        const overlap = (n.position.x < endX && n.position.x + NODE_WIDTH > startX && n.position.y < endY && n.position.y + nh > startY);
        if (overlap) selected.add(n.id);
      });
      setSelectedIds(selected);
    }

    if (dragState) {
      if (dragState.type === 'node') {
        const dx = (e.clientX - dragState.startMouse.x) / scale;
        const dy = (e.clientY - dragState.startMouse.y) / scale;

        // Use updateGraph (no commit) for smooth dragging
        const newNodes = nodes.map(n => {
          if (dragState.ids.includes(n.id)) {
            return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } };
          }
          return n;
        });
        updateGraph({ nodes: newNodes, edges });

        setDragState(prev => ({ ...prev, startMouse: { x: e.clientX, y: e.clientY } }));

        if (dragState.ids.length === 1) {
          const draggingNode = nodes.find(n => n.id === dragState.ids[0]);
          if (draggingNode && draggingNode.type !== 'GROUP_INPUT' && draggingNode.type !== 'GROUP_OUTPUT') {
            const targetGroup = nodes.find(n =>
              n.id !== draggingNode.id && n.type === 'GROUP' &&
              x >= n.position.x && x <= n.position.x + NODE_WIDTH &&
              y >= n.position.y && y <= n.position.y + getNodeHeight(n)
            );
            setHoverGroup(targetGroup ? targetGroup.id : null);
          }
        }
      } else if (dragState.type === 'pan') {
        setPan({ x: dragState.startPan.x + (e.clientX - dragState.startMouse.x), y: dragState.startPan.y + (e.clientY - dragState.startMouse.y) });
      }
    }
    if (connectionState) setConnectionState(prev => ({ ...prev, mousePos: { x, y } }));
  }, [dragState, connectionState, pan, scale, nodes, edges, selectionBox, updateGraph]);

  const handleMouseUp = (e) => {
    // If we were dragging, we should now COMMIT the final state to history
    if (dragState?.type === 'node' && hoverGroup && dragState.ids.length === 1) {
      const draggedNode = nodes.find(n => n.id === dragState.ids[0]);
      const targetGroupNode = nodes.find(n => n.id === hoverGroup);
      if (draggedNode && targetGroupNode) {
        const remainingNodes = nodes.filter(n => n.id !== draggedNode.id);
        const remainingEdges = edges.filter(e => e.source !== draggedNode.id && e.target !== draggedNode.id);
        const subGraph = targetGroupNode.data.subGraph || { nodes: [], edges: [] };
        const newNode = { ...draggedNode, position: { x: 50 + (subGraph.nodes.length * 20), y: 50 + (subGraph.nodes.length * 20) } };
        const newSubGraph = { ...subGraph, nodes: [...subGraph.nodes, newNode] };

        setGraph({ // Commit move to group
          nodes: remainingNodes.map(n => n.id === hoverGroup ? { ...n, data: { ...n.data, subGraph: newSubGraph } } : n),
          edges: remainingEdges
        });
        setSelectedIds(new Set());
      }
    }

    if (connectionState) {
      const rect = containerRef.current.getBoundingClientRect();
      const mx = (e.clientX - rect.left - pan.x) / scale;
      const my = (e.clientY - rect.top - pan.y) / scale;
      const targetNode = [...nodes].reverse().find(n => {
        const height = getNodeHeight(n);
        return mx >= n.position.x - 20 && mx <= n.position.x + NODE_WIDTH + 20 && my >= n.position.y - 20 && my <= n.position.y + height + 20;
      });

      if (targetNode && targetNode.id !== connectionState.sourceId) {
        let targetHandle = null;
        // Determine Target Handle based on drop position
        if (targetNode.type === 'GROUP') {
          const handles = targetNode.data.subGraph?.nodes.filter(n => n.type === 'GROUP_INPUT') || [];
          let minDist = 1000;
          handles.forEach((h, i) => {
            const hy = targetNode.position.y + 40 + (i * 24);
            const dist = Math.abs(my - hy);
            if (dist < 20 && dist < minDist) { minDist = dist; targetHandle = h.id; }
          });
          if (!targetHandle && handles.length > 0) targetHandle = handles[0].id;
        } else if (targetNode.type === 'COLLECTOR') {
          const count = targetNode.data.inputCount || 2;
          let minDist = 1000;
          for (let i = 0; i < count; i++) {
            const hy = targetNode.position.y + 40 + (i * 24);
            const dist = Math.abs(my - hy);
            if (dist < 20 && dist < minDist) { minDist = dist; targetHandle = `in_${i} `; }
          }
        } else if (targetNode.type === 'RANGE') {
          if (Math.abs(my - (targetNode.position.y + 40)) < 20) targetHandle = 'start';
          else if (Math.abs(my - (targetNode.position.y + 64)) < 20) targetHandle = 'end';
          else targetHandle = 'step';
        } else if (targetNode.type === 'GAUGE') {
          if (Math.abs(my - (targetNode.position.y + 40)) < 20) targetHandle = 'val';
          else if (Math.abs(my - (targetNode.position.y + 64)) < 20) targetHandle = 'min';
          else targetHandle = 'max';
        } else if (targetNode.type === 'PROGRESS') {
          if (Math.abs(my - (targetNode.position.y + 40)) < 20) targetHandle = 'val';
          else targetHandle = 'max';
        } else if (targetNode.type === 'FORM' && targetNode.data.showInputs) {
          const fields = targetNode.data.fields || [];
          let minDist = 1000;
          fields.forEach((_, i) => {
            const hy = targetNode.position.y + 48 + (i * 30);
            const dist = Math.abs(my - hy);
            if (dist < 20 && dist < minDist) { minDist = dist; targetHandle = `field_${i}`; }
          });
        }

        const exists = edges.some(edge =>
          edge.source === connectionState.sourceId &&
          edge.target === targetNode.id &&
          edge.targetHandle === targetHandle &&
          edge.sourceHandle === connectionState.sourceHandle
        );

        if (!exists) {
          setGraph({ // Commit connection
            nodes,
            edges: [...edges, { id: `e - ${generateId()} `, source: connectionState.sourceId, target: targetNode.id, targetHandle, sourceHandle: connectionState.sourceHandle }]
          });
        }
      }
    }
    setDragState(null);
    setConnectionState(null);
    setSelectionBox(null);
    setHoverGroup(null);
  };

  const addNode = (type) => {
    const id = generateId();
    const rect = containerRef.current.getBoundingClientRect();
    const x = (-pan.x + rect.width / 2) / scale - 100;
    const y = (-pan.y + rect.height / 2) / scale - 50;
    setGraph({
      nodes: [...nodes, { id, type, position: { x, y }, data: { value: 0, label: '', subGraph: { nodes: [], edges: [] } } }],
      edges
    });
  };

  const handleSaveEditor = (newCode) => {
    setGraph({
      nodes: nodes.map(n => n.id === editor.nodeId ? { ...n, data: { ...n.data, func: newCode } } : n),
      edges
    });
    setEditor({ isOpen: false, nodeId: null, code: '' });
  };

  return (
    <div className="flex w-full h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <CodeEditorModal isOpen={editor.isOpen} initialCode={editor.code} onClose={() => setEditor({ ...editor, isOpen: false })} onSave={handleSaveEditor} />

      <Sidebar
        onAddNode={addNode}
        onSave={handleSave}
        onLoad={handleLoad}
        onExportJS={handleExportJS}
        fileInputRef={fileInputRef}
        pathLength={path.length}
      />

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-900 cursor-grab active:cursor-grabbing transition-colors duration-200"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <BackgroundGrid offset={pan} />
        {selectionBox && (
          <SelectionBox rect={selectionBox} />
        )}

        {/* Top Bar: Breadcrumbs + Undo/Redo + Theme */}
        <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-2 py-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-sm">
            <button onClick={undo} disabled={!canUndo} className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${!canUndo ? 'text-slate-300 dark:text-slate-600' : 'text-slate-600 dark:text-slate-300'}`} title="Undo (Ctrl+Z)"><Undo size={16} /></button>
            <button onClick={redo} disabled={!canRedo} className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${!canRedo ? 'text-slate-300 dark:text-slate-600' : 'text-slate-600 dark:text-slate-300'}`} title="Redo (Ctrl+Y)"><Redo size={16} /></button>
          </div>

          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-2 py-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-sm">
            <button onClick={() => setDarkMode(!darkMode)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" title="Toggle Theme">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 text-sm">
            <button onClick={() => jumpToPath(-1)} className={`hover:text-blue-600 dark:hover:text-blue-400 ${path.length === 0 ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>Root</button>
            {path.map((item, idx) => (
              <React.Fragment key={item.id}>
                <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                <button onClick={() => jumpToPath(idx)} className={`hover:text-blue-600 dark:hover:text-blue-400 ${idx === path.length - 1 ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>{item.label}</button>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', width: '100%', height: '100%' }} className="relative w-full h-full">
          <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
            {edges.map(edge => {
              const start = getHandlePosition(edge.source, nodes, 'output', edge.sourceHandle);
              const end = getHandlePosition(edge.target, nodes, 'input', edge.targetHandle);
              return <ConnectionLine key={edge.id} id={edge.id} start={start} end={end} onDelete={(id) => setGraph({ nodes, edges: edges.filter(e => e.id !== id) })} />;
            })}
            {connectionState && (
              <path d={getBezierPath(getHandlePosition(connectionState.sourceId, nodes, 'output', connectionState.sourceHandle), [connectionState.mousePos.x, connectionState.mousePos.y])} stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="5,5" className="opacity-60" />
            )}
          </svg>
          {nodes.map(node => (
            <Node
              key={node.id}
              {...node}
              inputs={edges.filter(e => e.target === node.id).map(e => results[e.source] || 0)}
              result={results[node.id]}
              selected={selectedIds.has(node.id)}
              isHovered={hoverGroup === node.id}
              onDragStart={handleNodeDragStart}
              onDelete={(id) => { setGraph({ nodes: nodes.filter(n => n.id !== id), edges: edges.filter(e => e.source !== id && e.target !== id) }); }}
              onUpdateData={(id, data) => setGraph({ nodes: nodes.map(n => n.id === id ? { ...n, data } : n), edges })}
              onStartConnect={handleConnectionStart}
              onEnterGroup={enterGroup}
              onOpenEditor={(id, code) => setEditor({ isOpen: true, nodeId: id, code })}
            />
          ))}
        </div>
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-2 bg-white dark:bg-slate-800 rounded shadow text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors">+</button>
          <button onClick={() => setScale(1)} className="p-2 bg-white dark:bg-slate-800 rounded shadow text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold w-12 border border-slate-200 dark:border-slate-700 transition-colors">{Math.round(scale * 100)}%</button>
          <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-2 bg-white dark:bg-slate-800 rounded shadow text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors">-</button>
        </div>
      </div>
      <style>{`@keyframes dash { to { stroke - dashoffset: -20; } } .animate - dash { animation: dash 1s linear infinite; } `}</style>
    </div>
  );
}

