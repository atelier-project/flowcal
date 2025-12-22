import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronRight, Undo, Redo, Palette, Grid } from 'lucide-react';
import { THEMES, applyTheme, getStoredTheme } from '../themes';

import { Node } from './flow/Node';
import { ConnectionLine } from './flow/ConnectionLine';
import { BackgroundGrid } from './flow/BackgroundGrid';
import { SelectionBox } from './flow/SelectionBox';
import { Sidebar } from './flow/Sidebar';
import { CodeEditorModal } from './ui/Modal';
import { HelpModal } from './ui/HelpModal';
import { Snowfall } from './ui/Snowfall';
import { CustomNodeModal } from './ui/CustomNodeModal';
import { FlowSettingsPanel } from './flow/FlowSettingsPanel';
import { generateId } from '../utils/ids';
import { getHandlePosition, getBezierPath } from '../utils/geometry';
import { getNodeHeight } from '../utils/layout';
import { evaluateGraph, ENGINE_SCRIPT } from '../engine/evaluator';
import { useDebounce } from '../hooks/useDebounce';
import { useHistory } from '../hooks/useHistory';
import { getCustomNodes, saveCustomNode, createCustomNodeFromGroup, instantiateCustomNode, deleteCustomNode, exportCustomNode, importCustomNode } from '../utils/customNodeStore';

// Helper to match engine resolution logic
const resolveSourceValue = (rawVal, handle, sourceType, targetType) => {
  if (targetType === 'GET_KEY' || targetType === 'GET' || targetType === 'GROUP_INPUT_LIST') return rawVal;
  if (sourceType === 'FORM' || sourceType === 'GROUP_INPUT' || sourceType === 'GROUP_INPUT_LIST') return rawVal;
  if (typeof rawVal === 'object' && rawVal !== null && handle) return rawVal[handle] ?? 0;
  if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) return Object.values(rawVal)[0] ?? 0;
  return rawVal;
};

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { flowService } from '../services/flowService';
import { Loader2, Cloud, HardDrive } from 'lucide-react';

// ... other imports ...

import { reconstructFullGraph } from '../utils/graphReconstruct';

export default function Editor() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const flowId = location.state?.flowId;

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

  const [projectTitle, setProjectTitle] = useState('Untitled Flow');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Load Cloud Flow on Mount
  useEffect(() => {
    if (flowId) {
      loadCloudFlow(flowId);
    }
  }, [flowId]);

  const loadCloudFlow = async (id) => {
    setLoading(true);
    try {
      const flow = await flowService.getFlow(id);
      setProjectTitle(flow.name);
      setFlowOwnerId(flow.owner_id);
      if (flow.data?.nodes && flow.data?.edges) {
        setGraph({ nodes: flow.data.nodes, edges: flow.data.edges });
      }
      if (flow.data?.settings) {
        setFlowSettings(flow.data.settings);
      }
      setLastSaved(new Date(flow.updated_at));
    } catch (err) {
      console.error('Failed to load flow:', err);
      alert('Could not load flow. It might have been deleted.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCloudSave = async () => {
    if (!user) {
      // Guest Mode: Only Local Save allowed (handled by sidebar normally, but check safety)
      alert("Please login to save to the cloud.");
      return;
    }
    setSaving(true);
    try {
      let currentFlowId = flowId;
      // If this is a new unsaved flow (started from /guest then logged in? rare edge case)
      // ideally we create a new flow. But here we assume flowId exists if we are in this mode.
      // Actually, what if they came from /guest -> 'New Flow' (no ID)? 
      // We need to handle Create vs Update.

      if (!currentFlowId) {
        const newFlow = await flowService.createFlow(projectTitle);
        currentFlowId = newFlow.id;
        setFlowOwnerId(user.id);
        // Update URL without reload
        navigate('/editor', { state: { flowId: newFlow.id }, replace: true });
      }

      // Reconstruct full graph if we are inside a group
      const fullGraph = reconstructFullGraph(path, nodes, edges, { pan, scale });

      await flowService.updateFlow(currentFlowId, {
        name: projectTitle,
        data: {
          ...fullGraph,
          settings: flowSettings
        }
      });
      setLastSaved(new Date());
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };


  const [dragState, setDragState] = useState(null);
  const [connectionState, setConnectionState] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [hoverGroup, setHoverGroup] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionBox, setSelectionBox] = useState(null);
  const [editor, setEditor] = useState({ isOpen: false, nodeId: null, code: '' });
  const [helpOpen, setHelpOpen] = useState(false);
  // const [projectTitle, setProjectTitle] = useState('Untitled Flow'); // Removed duplicate
  const [gridSettings, setGridSettings] = useState({ enabled: true, style: 'technical', opacity: 0.3 });
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const [customNodes, setCustomNodes] = useState([]);
  const [customNodeModal, setCustomNodeModal] = useState({ isOpen: false, groupNode: null });

  // Flow Settings & Security
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [flowSettings, setFlowSettings] = useState({ preventDownload: false, description: '' });
  const [flowOwnerId, setFlowOwnerId] = useState(null);

  const NODE_WIDTH = 256;

  // Debounced state for performance
  const debouncedNodes = useDebounce(nodes, 50);
  const debouncedEdges = useDebounce(edges, 50);

  // Theme State
  const [theme, setTheme] = useState(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Load custom nodes on mount
  useEffect(() => {
    setCustomNodes(getCustomNodes());
  }, []);

  // Handle saving a GROUP as a custom node
  const handleSaveAsCustomNode = (groupNode) => {
    setCustomNodeModal({ isOpen: true, groupNode });
  };

  const handleCustomNodeSave = (metadata) => {
    const groupNode = customNodeModal.groupNode;
    const customNode = createCustomNodeFromGroup(groupNode, metadata);
    const updated = saveCustomNode(customNode);
    setCustomNodes(updated);
    setCustomNodeModal({ isOpen: false, groupNode: null });
  };

  // Add a custom node instance to the canvas
  const addCustomNode = (customNodeId) => {
    const customNode = customNodes.find(n => n.id === customNodeId);
    if (!customNode) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (-pan.x + rect.width / 2) / scale - 100;
    const y = (-pan.y + rect.height / 2) / scale - 50;
    const newNode = instantiateCustomNode(customNode, { x, y });
    setGraph({ nodes: [...nodes, newNode], edges });
  };

  // Handle custom node file import
  const handleImportCustomNode = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const updated = importCustomNode(event.target.result);
        setCustomNodes(updated);
      } catch (err) {
        alert('Failed to import custom node: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // --- Security: Inherited Read-Only Context ---
  const isContextReadOnly = useMemo(() => {
    return path.some(frame => {
      // Find the group node in the parent's node list
      const groupNode = frame.nodes.find(n => n.id === frame.id);
      if (!groupNode) return false;

      // START SECURITY CHECK
      // 1. Explicit Read-Only
      if (groupNode.data?.readOnly) return true;

      // 2. Locked (Implicit Read-Only for non-owners)
      // If the group is locked, and we are NOT the owner/admin, 
      // then we are in a RESTRICTED context (effectively read-only).
      const isLocked = groupNode.data?.locked;
      const canBypassLock = user?.id === groupNode.data?.lockedBy || isAdmin;

      if (isLocked && !canBypassLock) return true;

      return false;
    });
  }, [path, user, isAdmin]);

  const isActionAllowed = useCallback(() => {
    if (isContextReadOnly && !user?.app_metadata?.claims_admin) {
      return false;
    }
    return true;
  }, [isContextReadOnly, user]);

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

            // Determine internal target type
            let internalTargetType = undefined;
            if (edge.targetHandle) {
              const targetNode = groupNode.data.subGraph?.nodes.find(n => n.id === edge.targetHandle);
              if (targetNode) internalTargetType = targetNode.type;
            } else {
              const firstInput = groupNode.data.subGraph?.nodes.find(n => n.type === 'GROUP_INPUT' || n.type === 'GROUP_INPUT_LIST');
              if (firstInput) internalTargetType = firstInput.type;
            }

            // Use shared helper
            const val = resolveSourceValue(rawVal, edge.sourceHandle, sourceNode?.type, internalTargetType);

            if (edge.targetHandle) {
              const targetNode = groupNode.data.subGraph?.nodes.find(n => n.id === edge.targetHandle);
              if (targetNode && targetNode.type === 'GROUP_INPUT_LIST') {
                if (!subContext[edge.targetHandle]) subContext[edge.targetHandle] = [];
                subContext[edge.targetHandle].push(val);
              } else {
                subContext[edge.targetHandle] = val;
              }
            } else {
              // Default handle logic for groups (rarely used but good for completeness)
              const firstInput = groupNode.data.subGraph?.nodes.find(n => n.type === 'GROUP_INPUT' || n.type === 'GROUP_INPUT_LIST');
              if (firstInput) {
                if (firstInput.type === 'GROUP_INPUT_LIST') {
                  if (!subContext[firstInput.id]) subContext[firstInput.id] = [];
                  subContext[firstInput.id].push(val);
                } else {
                  subContext[firstInput.id] = val;
                }
              }
            }
          });
          currentContext = subContext;
        }
      }
    }

    // Use debounced values for the heavy calculation
    const finalResults = evaluateGraph(debouncedNodes, debouncedEdges, currentContext);
    setResults(finalResults);
  }, [debouncedNodes, debouncedEdges, path]);

  // --- Duplicate Node ---
  const duplicateNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const newId = generateId();
    const newNode = {
      ...node,
      id: newId,
      position: { x: node.position.x + 30, y: node.position.y + 30 },
      data: { ...node.data }
    };
    // Deep clone subGraph for GROUP nodes
    if (node.type === 'GROUP' && node.data.subGraph) {
      newNode.data.subGraph = JSON.parse(JSON.stringify(node.data.subGraph));
    }
    setGraph({ nodes: [...nodes, newNode], edges });
    setSelectedIds(new Set([newId]));
  }, [nodes, edges, setGraph]);

  // Group selected nodes into a GROUP node
  const groupSelectedNodes = useCallback(() => {
    if (selectedIds.size < 2) return;

    // Get selected nodes (exclude FRAME nodes)
    const selectedNodesList = nodes.filter(n => selectedIds.has(n.id) && n.type !== 'FRAME');
    if (selectedNodesList.length < 2) return;

    // Calculate bounding box for positioning
    const minX = Math.min(...selectedNodesList.map(n => n.position.x));
    const minY = Math.min(...selectedNodesList.map(n => n.position.y));
    const maxX = Math.max(...selectedNodesList.map(n => n.position.x + 256));
    const maxY = Math.max(...selectedNodesList.map(n => n.position.y + 100));

    // Find external connections (edges from/to non-selected nodes)
    const selectedSet = new Set(selectedNodesList.map(n => n.id));
    const incomingEdges = edges.filter(e => !selectedSet.has(e.source) && selectedSet.has(e.target));
    const outgoingEdges = edges.filter(e => selectedSet.has(e.source) && !selectedSet.has(e.target));
    const internalEdges = edges.filter(e => selectedSet.has(e.source) && selectedSet.has(e.target));
    const externalEdges = edges.filter(e => !selectedSet.has(e.source) && !selectedSet.has(e.target));

    // Create GROUP_INPUT nodes for incoming connections
    const inputNodes = [];
    const inputEdgeMap = new Map(); // Map from original target handle to GROUP_INPUT id
    incomingEdges.forEach((edge, idx) => {
      const inputId = generateId();
      inputNodes.push({
        id: inputId,
        type: 'GROUP_INPUT',
        position: { x: 50, y: 50 + idx * 100 },
        data: { label: `Input ${idx + 1}` }
      });
      inputEdgeMap.set(`${edge.target}-${edge.targetHandle || 'default'}`, inputId);
    });

    // Create GROUP_OUTPUT nodes for outgoing connections  
    const outputNodes = [];
    const outputEdgeMap = new Map(); // Map from original source to GROUP_OUTPUT id
    outgoingEdges.forEach((edge, idx) => {
      const outputId = generateId();
      outputNodes.push({
        id: outputId,
        type: 'GROUP_OUTPUT',
        position: { x: 400, y: 50 + idx * 100 },
        data: { label: `Output ${idx + 1}` }
      });
      outputEdgeMap.set(`${edge.source}-${edge.sourceHandle || 'default'}`, outputId);
    });

    // Adjust positions of selected nodes to be relative to subgraph origin
    const adjustedNodes = selectedNodesList.map(n => ({
      ...n,
      position: { x: n.position.x - minX + 150, y: n.position.y - minY + 50 }
    }));

    // Create internal edges from GROUP_INPUT to original targets
    const inputToTargetEdges = incomingEdges.map(edge => ({
      id: generateId(),
      source: inputEdgeMap.get(`${edge.target}-${edge.targetHandle || 'default'}`),
      target: edge.target,
      targetHandle: edge.targetHandle
    }));

    // Create internal edges from original sources to GROUP_OUTPUT
    const sourceToOutputEdges = outgoingEdges.map(edge => ({
      id: generateId(),
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: outputEdgeMap.get(`${edge.source}-${edge.sourceHandle || 'default'}`)
    }));

    // Create the GROUP node
    const groupId = generateId();
    const groupNode = {
      id: groupId,
      type: 'GROUP',
      position: { x: minX, y: minY },
      data: {
        label: 'Group',
        subGraph: {
          nodes: [...inputNodes, ...adjustedNodes, ...outputNodes],
          edges: [...internalEdges, ...inputToTargetEdges, ...sourceToOutputEdges]
        }
      }
    };

    // Create new edges connecting external nodes to the GROUP
    const newIncomingEdges = incomingEdges.map(edge => ({
      id: generateId(),
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: groupId,
      targetHandle: inputEdgeMap.get(`${edge.target}-${edge.targetHandle || 'default'}`)
    }));

    const newOutgoingEdges = outgoingEdges.map(edge => ({
      id: generateId(),
      source: groupId,
      sourceHandle: outputEdgeMap.get(`${edge.source}-${edge.sourceHandle || 'default'}`),
      target: edge.target,
      targetHandle: edge.targetHandle
    }));

    // Update the graph
    const remainingNodes = nodes.filter(n => !selectedSet.has(n.id));
    setGraph({
      nodes: [...remainingNodes, groupNode],
      edges: [...externalEdges, ...newIncomingEdges, ...newOutgoingEdges]
    });
    setSelectedIds(new Set([groupId]));
  }, [nodes, edges, selectedIds, setGraph]);

  // Keyboard shortcut for Ctrl+D (duplicate) and Ctrl+G (group)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedIds.size > 0) {
        e.preventDefault();
        // Duplicate all selected nodes
        selectedIds.forEach(id => duplicateNode(id));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && selectedIds.size >= 2) {
        e.preventDefault();
        groupSelectedNodes();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, duplicateNode, groupSelectedNodes]);


  // --- IO Handlers ---

  const handleSave = () => {
    // Reconstruct full graph if we are inside a group
    const fullGraph = reconstructFullGraph(path, nodes, edges, { pan, scale });

    // Create config with FULL graph
    const config = { title: projectTitle, nodes: fullGraph.nodes, edges: fullGraph.edges, viewport: fullGraph.viewport };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Use project title for filename, sanitize for file system
    const safeTitle = projectTitle.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'flowcalc';
    link.download = `${safeTitle}.json`;
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
          if (config.title) {
            setProjectTitle(config.title);
          }
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
    // Allow selection but prevent dragging if read-only logic applies? 
    // Actually, selection is fine. Dragging should be blocked.
    // We'll block the *initiation* of drag state if action is not allowed.
    // However, we want to allow SELECTION.

    let newSelectedIds = new Set(selectedIds);
    if (e.shiftKey) {
      if (newSelectedIds.has(id)) newSelectedIds.delete(id);
      else newSelectedIds.add(id);
    } else {
      if (!newSelectedIds.has(id)) newSelectedIds = new Set([id]);
    }
    setSelectedIds(newSelectedIds);

    if (!isActionAllowed()) return; // Block dragging

    setDragState({ type: 'node', ids: Array.from(newSelectedIds), startMouse: { x: e.clientX, y: e.clientY } });
    // Commit the current state to history as a checkpoint before dragging starts
    setGraph({ nodes, edges });
  };

  const handleConnectionStart = (e, sourceId, handleId) => {
    e.stopPropagation();
    if (!isActionAllowed()) return;
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
      if (!isActionAllowed()) {
        setDragState(null);
        return;
      }
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
    if (!isActionAllowed()) return;
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
      <CodeEditorModal
        isOpen={editor.isOpen}
        initialCode={editor.code}
        inputs={editor.inputs || []}
        onClose={() => setEditor({ ...editor, isOpen: false })}
        onSave={handleSaveEditor}
        readOnly={nodes.find(n => n.id === editor.nodeId)?.data?.locked && nodes.find(n => n.id === editor.nodeId)?.data?.lockedBy !== user?.id && !user?.app_metadata?.claims_admin}
      />

      <Sidebar
        onAddNode={addNode}
        onSave={user ? handleCloudSave : handleSave} // Primary Action
        onLocalSave={handleSave} // Explicit Local Backup
        isSaving={saving}
        lastSaved={lastSaved}
        isGuest={!user}
        onLoad={handleLoad}
        onExportJS={handleExportJS}
        fileInputRef={fileInputRef}
        pathLength={path.length}
        theme={theme}
        onHelp={() => setHelpOpen(true)}
        projectTitle={projectTitle}
        onTitleChange={setProjectTitle}
        customNodes={customNodes}
        onAddCustomNode={addCustomNode}
        onImportCustomNode={handleImportCustomNode}
        onDeleteCustomNode={(id) => setCustomNodes(deleteCustomNode(id))}
        onExportCustomNode={exportCustomNode}
        onOpenSettings={() => setSettingsPanelOpen(true)}
        isRestricted={(flowSettings.preventDownload && user?.id !== flowOwnerId && !user?.app_metadata?.claims_admin) || nodes.some(n => n.data.locked && n.data.lockedBy !== user?.id && !user?.app_metadata?.claims_admin)}
      />

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ backgroundColor: 'var(--bg-primary)' }}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing transition-colors duration-200"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {gridSettings.enabled && <BackgroundGrid offset={pan} style={gridSettings.style} opacity={gridSettings.opacity} />}
        {selectionBox && (
          <SelectionBox rect={selectionBox} />
        )}

        {/* Top Bar: Breadcrumbs + Undo/Redo + Theme */}
        <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-2 py-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-sm">
            <button onClick={undo} disabled={!canUndo} className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${!canUndo ? 'text-slate-300 dark:text-slate-600' : 'text-slate-600 dark:text-slate-300'}`} title="Undo (Ctrl+Z)"><Undo size={16} /></button>
            <button onClick={redo} disabled={!canRedo} style={{ color: !canRedo ? 'var(--text-muted)' : 'var(--text-primary)' }} className="p-1 rounded hover:opacity-70" title="Redo (Ctrl+Y)"><Redo size={16} /></button>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }} className="flex items-center gap-2 backdrop-blur px-2 py-1 rounded-lg shadow-sm border text-sm">
            <Palette size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}
              className="border-none text-sm focus:outline-none cursor-pointer"
            >
              {Object.entries(THEMES).map(([id, t]) => (
                <option key={id} value={id} style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Grid Settings */}
          <div className="relative">
            <button
              onClick={() => setGridMenuOpen(!gridMenuOpen)}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: gridSettings.enabled ? 'var(--accent-primary)' : 'var(--text-muted)' }}
              className="flex items-center gap-2 backdrop-blur px-2 py-1 rounded-lg shadow-sm border text-sm hover:opacity-80"
              title="Grid Settings"
            >
              <Grid size={16} />
            </button>
            {gridMenuOpen && (
              <div
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
                className="absolute top-full left-0 mt-2 p-3 rounded-lg shadow-lg border min-w-[200px] z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">Show Grid</span>
                  <button
                    onClick={() => setGridSettings(s => ({ ...s, enabled: !s.enabled }))}
                    className={`w-10 h-5 rounded-full transition-colors ${gridSettings.enabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${gridSettings.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="mb-3">
                  <label style={{ color: 'var(--text-muted)' }} className="text-xs block mb-1">Style</label>
                  <select
                    value={gridSettings.style}
                    onChange={(e) => setGridSettings(s => ({ ...s, style: e.target.value }))}
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
                    className="w-full p-1.5 rounded border text-sm focus:outline-none"
                  >
                    <option value="dots">Dots</option>
                    <option value="lines">Lines</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label style={{ color: 'var(--text-muted)' }} className="text-xs">Opacity</label>
                    <span style={{ color: 'var(--text-muted)' }} className="text-xs">{Math.round(gridSettings.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={gridSettings.opacity}
                    onChange={(e) => setGridSettings(s => ({ ...s, opacity: parseFloat(e.target.value) }))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }} className="flex items-center gap-2 backdrop-blur px-4 py-2 rounded-full shadow-sm border text-sm">
            <button onClick={() => jumpToPath(-1)} style={{ color: path.length === 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }} className={`hover:opacity-70 ${path.length === 0 ? 'font-bold' : ''}`}>Root</button>
            {path.map((item, idx) => (
              <React.Fragment key={item.id}>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                <button onClick={() => jumpToPath(idx)} style={{ color: idx === path.length - 1 ? 'var(--accent-primary)' : 'var(--text-muted)' }} className={`hover:opacity-70 ${idx === path.length - 1 ? 'font-bold' : ''}`}>{item.label}</button>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', width: '100%', height: '100%' }} className="relative w-full h-full">
          <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
            {edges.map(edge => {
              const start = getHandlePosition(edge.source, nodes, 'output', edge.sourceHandle);
              const end = getHandlePosition(edge.target, nodes, 'input', edge.targetHandle);
              return <ConnectionLine key={edge.id} id={edge.id} start={start} end={end} onDelete={(id) => {
                if (!isActionAllowed()) return;
                setGraph({ nodes, edges: edges.filter(e => e.id !== id) });
              }} />;
            })}
            {connectionState && (
              <path d={getBezierPath(getHandlePosition(connectionState.sourceId, nodes, 'output', connectionState.sourceHandle), [connectionState.mousePos.x, connectionState.mousePos.y])} stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="5,5" className="opacity-60" />
            )}
          </svg>
          {nodes.map(node => (
            <Node
              key={node.id}
              {...node}
              inputs={edges.filter(e => e.target === node.id).map(e => {
                const sourceNode = nodes.find(n => n.id === e.source);
                return resolveSourceValue(results[e.source], e.sourceHandle, sourceNode?.type, node.type);
              })}
              result={results[node.id]}
              selected={selectedIds.has(node.id)}
              isHovered={hoverGroup === node.id}
              onDragStart={handleNodeDragStart}
              onDelete={(id) => {
                if (!isActionAllowed()) return;
                setGraph({ nodes: nodes.filter(n => n.id !== id), edges: edges.filter(e => e.source !== id && e.target !== id) });
              }}
              onDuplicate={(id) => { if (isActionAllowed()) duplicateNode(id); }}
              onUpdateData={(id, data) => {
                if (!isActionAllowed()) return;
                setGraph({ nodes: nodes.map(n => n.id === id ? { ...n, data } : n), edges });
              }}
              onStartConnect={handleConnectionStart}
              onEnterGroup={enterGroup}
              readOnly={node.data.readOnly || !isActionAllowed()}
              onOpenEditor={(id, code, inputs) => setEditor({ isOpen: true, nodeId: id, code, inputs })}
              onSaveAsCustom={handleSaveAsCustomNode}
            />
          ))}
          {selectionBox && <SelectionBox rect={selectionBox} />}
        </div>
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-2 bg-white dark:bg-slate-800 rounded shadow text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors">+</button>
          <button onClick={() => setScale(1)} className="p-2 bg-white dark:bg-slate-800 rounded shadow text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold w-12 border border-slate-200 dark:border-slate-700 transition-colors">{Math.round(scale * 100)}%</button>
          <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-2 bg-white dark:bg-slate-800 rounded shadow text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors">-</button>
        </div>
        {/* Selection Action Bar */}
        {selectedIds.size >= 2 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-slate-700">
            <span className="text-slate-300 text-sm font-medium">{selectedIds.size} nodes selected</span>
            <div className="w-px h-5 bg-slate-600" />
            <button
              onClick={groupSelectedNodes}
              className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
            >
              <span>Group</span>
              <span className="text-xs text-blue-200">(Ctrl+G)</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes dash { to { stroke-dashoffset: -20; } } .animate-dash { animation: dash 1s linear infinite; } `}</style>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <Snowfall enabled={THEMES[theme]?.hasSnow === true} />
      <CustomNodeModal
        isOpen={customNodeModal.isOpen}
        groupNode={customNodeModal.groupNode}
        onSave={handleCustomNodeSave}
        onClose={() => setCustomNodeModal({ isOpen: false, groupNode: null })}
      />
      <FlowSettingsPanel
        isOpen={settingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
        flowData={{ name: projectTitle, description: flowSettings.description, preventDownload: flowSettings.preventDownload, ...flowSettings }}
        onUpdateSettings={(newSettings) => {
          setProjectTitle(newSettings.name);
          setFlowSettings(prev => ({ ...prev, ...newSettings }));
        }}
        onLockAll={() => setGraph({ nodes: nodes.map(n => ({ ...n, data: { ...n.data, locked: true, lockedBy: user?.id } })), edges })}
        onUnlockAll={() => setGraph({ nodes: nodes.map(n => ({ ...n, data: { ...n.data, locked: false, lockedBy: null } })), edges })}
        isOwner={user?.id === flowOwnerId}
      />
    </div>
  );
}

