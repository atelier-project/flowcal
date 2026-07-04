import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronRight, Undo, Redo, Palette, Grid, Wand2, Spline, Waypoints, SlidersHorizontal } from 'lucide-react';
import { THEMES, applyTheme, getStoredTheme, getCustomThemes } from '../themes';
import { ThemeEditor } from './ui/ThemeEditor';

import { Node } from './flow/Node';
import { NodeErrorBoundary } from './flow/node/NodeErrorBoundary';
import { ConnectionLine } from './flow/ConnectionLine';
import { BackgroundGrid } from './flow/BackgroundGrid';
import { SelectionBox } from './flow/SelectionBox';
import { Sidebar } from './flow/Sidebar';
import { CodeEditorModal } from './ui/Modal';
import { HelpModal } from './ui/HelpModal';
import { Snowfall } from './ui/Snowfall';
import { CustomNodeModal } from './ui/CustomNodeModal';
import { FlowSettingsPanel } from './flow/FlowSettingsPanel';
import { VersionHistoryPanel } from './flow/VersionHistoryPanel';
import { generateId } from '../utils/ids';
import { getHandlePosition, getEdgePath } from '../utils/geometry';
import { computeAutoLayout } from '../utils/autoLayout';
import { computeAlignment } from '../utils/alignment';
import { getPortLayout, resolvePortTop } from '../utils/portLayout';
import { getNodeHeight } from '../utils/layout';
import { evaluateGraph } from '../engine/evaluator';
import { getDefinition } from '../engine/nodeDefinitions';
import { useDebounce } from '../hooks/useDebounce';
import { useHistory } from '../hooks/useHistory';
import { getCustomNodes, saveCustomNode, createCustomNodeFromGroup, instantiateCustomNode, deleteCustomNode, exportCustomNode, importCustomNode } from '../utils/customNodeStore';
import { isTypeCompatible, getNodeOutputType, parseTypeDef } from '../utils/typeUtils';
import { validateFlow } from '../utils/validation';
import { copyToClipboard, prepareForPaste, hasClipboardContent, canCopyFromContext } from '../utils/clipboardStore';

// Use centralized value resolution logic (single source of truth)
import { resolveSourceValue } from '../engine/valueResolution';

import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { flowService } from '../services/flowService';
import { ensurePublicAndCopy } from '../utils/shareFlow';
import { Loader2, Cloud, HardDrive } from 'lucide-react';

// ... other imports ...

import { reconstructFullGraph } from '../utils/graphReconstruct';
import { DebugToolbar } from './debugger/DebugToolbar';
import { NodeInspector } from './debugger/NodeInspector';

// Snap grid step — matches the background grid's 20px cell so nodes land on it.
const GRID_SIZE = 20;
const snapToGrid = (v) => Math.round(v / GRID_SIZE) * GRID_SIZE;

// --- Autosave tuning ---
const AUTOSAVE_DEBOUNCE_MS = 2000;   // save this long after the last edit settles
const AUTOSAVE_MAX_WAIT_MS = 10000;  // …but never wait longer than this while dirty
const AUTOSAVE_RETRY_MS = 5000;      // backoff between failed autosave attempts
const AUTOSAVE_MAX_RETRIES = 3;
const AUTOSAVE_PREF_KEY = 'flowcal-autosave';

// A stable signature of everything a save persists. Comparing it to the last
// saved signature is how we know the flow has unsaved changes (the dirty flag).
// Viewport (pan/scale) is intentionally excluded so panning never marks dirty.
const computeSaveSignature = (name, nodes, edges, settings) =>
    JSON.stringify({ name, nodes, edges, settings });

export default function Editor() {
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  // A /guest/:flowId link opens the flow as a read-only sandbox. URL param wins
  // over location.state so a pasted share link works when opened cold.
  const sharedFlowId = params.flowId || null;
  const isSharedView = !!sharedFlowId;
  const flowId = sharedFlowId || location.state?.flowId;

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

  // Ref for stable access in callbacks without re-creating functions
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const [path, setPath] = useState([]);
  const [results, setResults] = useState({});
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const [projectTitle, setProjectTitle] = useState('Untitled Flow');
  const [, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [flowIsPublic, setFlowIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(() => {
    try { return localStorage.getItem(AUTOSAVE_PREF_KEY) === '1'; } catch { return false; }
  });
  const [retryTick, setRetryTick] = useState(0);
  // Signature of the last persisted state; null until a flow is loaded/saved.
  const lastSavedSigRef = useRef(null);
  // The flow's updated_at as we last loaded/saved it — the base for the
  // optimistic-concurrency guard (#38). If the server's value has moved on,
  // another tab/device saved and we must not clobber it.
  const baseUpdatedAtRef = useRef(null);
  // True while the stale-write conflict dialog is open, so background autosaves
  // don't stack more dialogs or clobber while the user is deciding.
  const conflictOpenRef = useRef(false);
  const dirtySinceRef = useRef(null); // when the current unsaved streak began
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);
  const [editingEdgeId, setEditingEdgeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Load Cloud Flow on Mount
  useEffect(() => {
    if (flowId) {
      loadCloudFlow(flowId);
    }
  }, [flowId]);

  // Persist the autosave preference (per-browser).
  useEffect(() => {
    try { localStorage.setItem(AUTOSAVE_PREF_KEY, autosaveEnabled ? '1' : '0'); } catch { /* ignore */ }
  }, [autosaveEnabled]);

  const loadCloudFlow = async (id) => {
    setLoading(true);
    try {
      const flow = await flowService.getFlow(id);
      const loadedNodes = flow.data?.nodes || [];
      const loadedEdges = flow.data?.edges || [];
      const loadedSettings = flow.data?.settings || { preventDownload: false, description: '' };
      setProjectTitle(flow.name);
      setFlowOwnerId(flow.owner_id);
      setFlowIsPublic(!!flow.is_public);
      if (flow.data?.nodes && flow.data?.edges) {
        setGraph({ nodes: loadedNodes, edges: loadedEdges });
      }
      setFlowSettings(loadedSettings);
      // Record the loaded state as the clean baseline for dirty detection.
      lastSavedSigRef.current = computeSaveSignature(flow.name, loadedNodes, loadedEdges, loadedSettings);
      setIsDirty(false);
      setSaveError(false);
      setLastSaved(new Date(flow.updated_at));
      baseUpdatedAtRef.current = flow.updated_at;
    } catch (err) {
      console.error('Failed to load flow:', err);
      // A shared link may point at a flow that isn't public (or no longer exists).
      // Show an inline message instead of bouncing a guest to the login page.
      if (isSharedView) {
        setLoadError("This flow isn't available. It may be private or no longer exist.");
      } else {
        alert('Could not load flow. It might have been deleted.');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloudSave = async ({ auto = false, force = false } = {}) => {
    if (!user) {
      // Guest Mode: Only Local Save allowed (handled by sidebar normally, but check safety)
      if (!auto) alert("Please login to save to the cloud.");
      return;
    }
    // Autosave never creates a flow — it only persists an already-saved one.
    if (auto && !flowId) return;
    // While the conflict dialog is up, don't start more saves (autosave keeps
    // firing on the dirty flow); the user's choice will resume things.
    if (conflictOpenRef.current) return;

    setSaving(true);
    setSaveError(false);
    try {
      let currentFlowId = flowId;
      // Manual save of a brand-new unsaved flow: create it first.
      if (!currentFlowId) {
        const newFlow = await flowService.createFlow(projectTitle);
        currentFlowId = newFlow.id;
        baseUpdatedAtRef.current = newFlow.updated_at;
        setFlowOwnerId(user.id);
        // Update URL without reload
        navigate('/editor', { state: { flowId: newFlow.id }, replace: true });
      }

      // Reconstruct full graph if we are inside a group
      const fullGraph = reconstructFullGraph(path, nodes, edges, { pan, scale });

      const payload = {
        name: projectTitle,
        data: {
          ...fullGraph,
          settings: flowSettings
        }
      };
      // Optimistic-concurrency guard (#38): send the version we based this edit
      // on so the server refuses to clobber a newer save — unless the user has
      // explicitly chosen to overwrite.
      if (!force && baseUpdatedAtRef.current) {
        payload.baseUpdatedAt = baseUpdatedAtRef.current;
      }

      const saved = await flowService.updateFlow(currentFlowId, payload);

      // Advance our base to what we just wrote, so the next save guards against it.
      if (saved?.updated_at) baseUpdatedAtRef.current = saved.updated_at;
      // Mark this exact state as the clean baseline. If the user edited during the
      // async save, the live signature will differ and isDirty flips back to true.
      lastSavedSigRef.current = computeSaveSignature(projectTitle, fullGraph.nodes, fullGraph.edges, flowSettings);
      retryCountRef.current = 0;
      setIsDirty(false);
      setLastSaved(saved?.updated_at ? new Date(saved.updated_at) : new Date());
    } catch (err) {
      // A stale-write conflict (another tab/device saved first) is not a
      // transient failure — don't retry-loop it; ask the user how to resolve.
      if (err?.status === 409) {
        if (!conflictOpenRef.current) {
          conflictOpenRef.current = true;
          handleSaveConflict();
        }
        return;
      }
      setSaveError(true);
      if (!auto) {
        alert('Failed to save: ' + err.message);
      } else if (retryCountRef.current < AUTOSAVE_MAX_RETRIES) {
        // Backoff and retry by bumping retryTick (the autosave effect re-fires).
        retryCountRef.current += 1;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => setRetryTick(t => t + 1), AUTOSAVE_RETRY_MS);
      } else {
        addToast('Autosave failed. Your changes are unsaved — try saving manually.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // Resolve a stale-write conflict: reload the other tab's version (discarding
  // local edits) or overwrite it with ours. Either choice clears the conflict.
  const handleSaveConflict = async () => {
    const reload = await confirm(
      'Another tab or device saved this flow after you opened it. Reload their version (your unsaved changes here will be lost), or overwrite it with your version?',
      { title: 'Flow changed elsewhere', type: 'danger', confirmText: 'Reload', cancelText: 'Overwrite' }
    );
    conflictOpenRef.current = false;
    if (reload) {
      if (flowId) await loadCloudFlow(flowId);
    } else {
      await handleCloudSave({ force: true });
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
  const [gridSettings, setGridSettings] = useState(() => {
    const defaults = { enabled: true, style: 'technical', opacity: 0.3, snap: false, alignNodes: false };
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('flowcal-grid-settings') || '{}') }; }
    catch { return defaults; }
  });
  useEffect(() => {
    localStorage.setItem('flowcal-grid-settings', JSON.stringify(gridSettings));
  }, [gridSettings]);
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const [alignmentGuides, setAlignmentGuides] = useState([]);
  const [customNodes, setCustomNodes] = useState([]);
  const [customNodeModal, setCustomNodeModal] = useState({ isOpen: false, groupNode: null });

  // Flow Settings & Security
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [flowSettings, setFlowSettings] = useState({ preventDownload: false, description: '' });
  const [flowOwnerId, setFlowOwnerId] = useState(null);

  const NODE_WIDTH = 256;

  // Debounced state for performance
  const debouncedNodes = useDebounce(nodes, 50);
  const debouncedEdges = useDebounce(edges, 50);

  // Compute type warnings for edges connected to GROUP nodes with typed inputs
  const typeWarnings = useMemo(() => {
    const warnings = {};
    edges.forEach(edge => {
      const targetNode = nodes.find(n => n.id === edge.target);
      if (!targetNode) return;

      // For GROUP nodes, check if the input has a type defined
      if (targetNode.type === 'GROUP' && targetNode.data.subGraph) {
        const inputNode = targetNode.data.subGraph.nodes.find(n => n.id === edge.targetHandle);
        if (inputNode && inputNode.data?.typeDef && inputNode.data.typeDef !== 'any') {
          // Get source type
          const sourceNode = nodes.find(n => n.id === edge.source);
          let sourceType;

          if (sourceNode?.type === 'GROUP') {
            // For GROUP nodes, get the output node's type
            const outputNode = sourceNode.data.subGraph?.nodes.find(n => n.id === edge.sourceHandle);
            sourceType = outputNode?.data?.typeDef || 'any';
          } else if (sourceNode?.data?.typeDef && sourceNode.data.typeDef !== 'any') {
            // For nodes with explicit type definitions (FORM, PACK), use that
            sourceType = sourceNode.data.typeDef;
          } else {
            // Fall back to built-in type map
            sourceType = getNodeOutputType(sourceNode?.type);
          }

          // Parse both type definitions to get the actual types
          const { inputType: sourceInputType } = parseTypeDef(sourceType);
          const { inputType: targetInputType } = parseTypeDef(inputNode.data.typeDef);

          // Use the parsed input types for comparison
          const actualSourceType = sourceInputType || sourceType;
          const actualTargetType = targetInputType || inputNode.data.typeDef;


          // Check compatibility using parsed types
          if (!isTypeCompatible(actualSourceType, actualTargetType)) {
            const warningKey = `${edge.target}:${edge.targetHandle}`;
            warnings[warningKey] = true;
          }
        }
      }
    });
    return warnings;
  }, [nodes, edges]);

  // Theme State
  const [theme, setTheme] = useState(() => getStoredTheme());
  const [customThemes, setCustomThemes] = useState(() => getCustomThemes());
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    setCustomNodes(getCustomNodes());
  }, []);

  // Keyboard shortcuts for Copy/Cut/Paste
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Check for Ctrl+C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      // Check for Ctrl+V (Paste)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }
      // Check for Ctrl+X (Cut)
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        handleCut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, selectedIds, path, isAdmin]);

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

  // Structural edits (add/delete/move/connect/paste/duplicate) are additionally
  // blocked in a shared view. Node *value* edits still flow through
  // isActionAllowed(), so viewers can tweak unlocked inputs to explore results.
  const canModifyStructure = useCallback(() => {
    return isActionAllowed() && !isSharedView;
  }, [isActionAllowed, isSharedView]);

  // Make the current flow public (if needed) and copy its share link.
  const handleShare = useCallback(async () => {
    if (!flowId) return;
    try {
      await ensurePublicAndCopy(flowId, { is_public: flowIsPublic });
      setFlowIsPublic(true);
      addToast('Share link copied to clipboard', 'success');
    } catch (err) {
      addToast('Failed to create share link: ' + err.message, 'error');
    }
  }, [flowId, flowIsPublic, addToast]);

  // Deliberately NOT memoized: these must close over the *current* graph each
  // render. A useCallback (even keyed on flowId) would capture handleCloudSave
  // from the first render — before the flow loads — and snapshot the initial
  // sample graph instead of the real one.
  // Save the current editor state, then snapshot it as a named version.
  const handleSaveVersion = async (label) => {
    if (!flowId) return;
    await handleCloudSave();
    await flowService.createVersion(flowId, label || null);
  };

  // Restore a version server-side (non-destructive), then reload it into the editor.
  const handleRestoreVersion = async (versionId) => {
    if (!flowId) return;
    await flowService.restoreVersion(flowId, versionId);
    await loadCloudFlow(flowId);
  };

  // --- Autosave & unsaved-changes tracking ---
  // Owner of an already-saved flow (not a shared/guest view) may autosave.
  const isOwner = !!user && (user.id === flowOwnerId || isAdmin);
  const canAutosave = isOwner && !!flowId && !isSharedView;

  // Live signature of what a save would persist. Debounced graph keeps this cheap;
  // reconstructFullGraph makes it invariant to which nesting level is being viewed.
  const dirtySignature = useMemo(() => {
    const full = reconstructFullGraph(path, debouncedNodes, debouncedEdges);
    return computeSaveSignature(projectTitle, full.nodes, full.edges, flowSettings);
  }, [path, debouncedNodes, debouncedEdges, projectTitle, flowSettings]);

  // Compare against the last saved baseline to drive the dirty flag.
  useEffect(() => {
    setIsDirty(!!flowId && lastSavedSigRef.current !== null && dirtySignature !== lastSavedSigRef.current);
  }, [dirtySignature, flowId]);

  // Track when the current unsaved streak began (for the max-wait flush) and
  // give each fresh streak a full retry budget.
  useEffect(() => {
    if (isDirty && !dirtySinceRef.current) { dirtySinceRef.current = Date.now(); retryCountRef.current = 0; }
    if (!isDirty) dirtySinceRef.current = null;
  }, [isDirty]);

  // Debounced autosave: fire AUTOSAVE_DEBOUNCE_MS after edits settle, but never
  // wait longer than AUTOSAVE_MAX_WAIT_MS while continuously editing.
  useEffect(() => {
    if (!autosaveEnabled || !isDirty || !canAutosave || saving) return;
    const elapsed = dirtySinceRef.current ? Date.now() - dirtySinceRef.current : 0;
    const delay = elapsed >= AUTOSAVE_MAX_WAIT_MS ? 0 : AUTOSAVE_DEBOUNCE_MS;
    const t = setTimeout(() => { handleCloudSave({ auto: true }); }, delay);
    return () => clearTimeout(t);
    // handleCloudSave intentionally omitted; the effect re-runs on every edit
    // (dirtySignature), retry (retryTick), and when a save finishes (saving),
    // capturing a fresh closure each time.
  }, [dirtySignature, autosaveEnabled, isDirty, canAutosave, saving, retryTick]);

  // Warn before leaving with unsaved changes (tab close / reload). Autosave keeps
  // isDirty false most of the time, so this only fires when something is genuinely
  // pending. Browsers control the dialog text.
  useEffect(() => {
    const handler = (e) => {
      if (isDirty && !isSharedView) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, isSharedView]);

  // Clean up a pending retry timer on unmount.
  useEffect(() => () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); }, []);

  // Guarded in-app navigation: confirm before leaving the editor with unsaved work.
  const guardedNavigate = useCallback(async (to) => {
    if (isDirty && !isSharedView) {
      const ok = await confirm('You have unsaved changes. Leave without saving?', {
        title: 'Unsaved changes', type: 'danger'
      });
      if (!ok) return;
    }
    navigate(to);
  }, [isDirty, isSharedView, confirm, navigate]);

  // --- Copy/Paste Handlers ---
  const handleCopy = useCallback(() => {
    if (selectedIds.size === 0) return;

    // Check read-only permission
    if (isContextReadOnly && !canCopyFromContext(isContextReadOnly, isAdmin)) {
      alert('Cannot copy from this read-only context.');
      return;
    }

    const selectedNodes = nodes.filter(n => selectedIds.has(n.id));
    const sourceLevel = path.length > 0 ? path[path.length - 1].id : 'root';
    copyToClipboard(selectedNodes, edges, sourceLevel);
  }, [nodes, edges, selectedIds, path, isContextReadOnly, isAdmin]);

  const handlePaste = useCallback(() => {
    if (!hasClipboardContent()) return;
    if (isSharedView) return;

    // Check if action is allowed in current context
    if (isContextReadOnly && !isAdmin) {
      alert('Cannot paste in this read-only context.');
      return;
    }

    const { nodes: pastedNodes, edges: pastedEdges } = prepareForPaste({ x: 30, y: 30 });

    if (pastedNodes.length === 0) return;

    // Add pasted nodes and edges to graph
    setGraph({
      nodes: [...nodes, ...pastedNodes],
      edges: [...edges, ...pastedEdges]
    });

    // Select the newly pasted nodes
    setSelectedIds(new Set(pastedNodes.map(n => n.id)));
  }, [nodes, edges, isContextReadOnly, isAdmin, isSharedView, setGraph]);

  const handleCut = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (isSharedView) return;

    // Check if action is allowed
    if (isContextReadOnly && !isAdmin) {
      alert('Cannot cut from this read-only context.');
      return;
    }

    // Copy first
    handleCopy();

    // Then delete selected nodes and their edges
    const newNodes = nodes.filter(n => !selectedIds.has(n.id));
    const newEdges = edges.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target));

    setGraph({ nodes: newNodes, edges: newEdges });
    setSelectedIds(new Set());
  }, [nodes, edges, selectedIds, isContextReadOnly, isAdmin, isSharedView, handleCopy, setGraph]);

  // --- Engine Integration ---
  useEffect(() => {
    // Reuse evaluateGraph logic for consistent results
    let currentContext = {};
    if (path.length > 0) {
      // Re-evaluate path stack to get context for current level
      // Note: We use the immediate path, not debounced, assuming path change is infrequent/instant
      for (let i = 0; i < path.length; i++) {
        const frame = path[i];
        const frameResults = evaluateGraph(frame.nodes, frame.edges, currentContext, flowSettings.globals || []);
        const groupId = frame.id;
        const groupNode = frame.nodes.find(n => n.id === groupId);

        if (groupNode) {
          const subContext = {};
          const connectedEdges = frame.edges.filter(e => e.target === groupId);

          // Handle GROUP nodes
          if (groupNode.type === 'GROUP') {
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
          }
          // Handle Iterator nodes (MAP, FILTER, REDUCE) - use first array item for preview
          else if (groupNode.type === 'MAP' || groupNode.type === 'FILTER' || groupNode.type === 'REDUCE') {
            // Get the input array from edges
            let inputArray = [];
            connectedEdges.forEach(edge => {
              const rawVal = frameResults[edge.source];
              if (Array.isArray(rawVal)) {
                inputArray = rawVal;
              } else if (rawVal && typeof rawVal === 'object') {
                // Try to get from handle or first value
                const sourceNode = frame.nodes.find(n => n.id === edge.source);
                const val = resolveSourceValue(rawVal, edge.sourceHandle, sourceNode?.type, groupNode.type);
                if (Array.isArray(val)) {
                  inputArray = val;
                }
              }
            });

            // Use first item as preview
            const previewItem = inputArray.length > 0 ? inputArray[0] : null;
            const previewIndex = 0;

            // Find context nodes in the CURRENT subgraph (debouncedNodes), not the stale path data
            // This is critical because user may have added context nodes AFTER entering the iterator
            const subNodes = debouncedNodes;
            if (groupNode.type === 'MAP') {
              const mapItemNode = subNodes.find(n => n.type === 'MAP_ITEM');
              const mapIndexNode = subNodes.find(n => n.type === 'MAP_INDEX');
              if (mapItemNode) subContext[mapItemNode.id] = previewItem;
              if (mapIndexNode) subContext[mapIndexNode.id] = previewIndex;
            } else if (groupNode.type === 'FILTER') {
              const filterItemNode = subNodes.find(n => n.type === 'FILTER_ITEM');
              const filterIndexNode = subNodes.find(n => n.type === 'FILTER_INDEX');
              if (filterItemNode) subContext[filterItemNode.id] = previewItem;
              if (filterIndexNode) subContext[filterIndexNode.id] = previewIndex;
            } else if (groupNode.type === 'REDUCE') {
              const reduceItemNode = subNodes.find(n => n.type === 'REDUCE_ITEM');
              const reduceIndexNode = subNodes.find(n => n.type === 'REDUCE_INDEX');
              const reduceAccNode = subNodes.find(n => n.type === 'REDUCE_ACCUMULATOR');
              if (reduceItemNode) subContext[reduceItemNode.id] = previewItem;
              if (reduceIndexNode) subContext[reduceIndexNode.id] = previewIndex;
              if (reduceAccNode) subContext[reduceAccNode.id] = groupNode.data.initialValue ?? 0;
            }
          }

          currentContext = subContext;
        }
      }
    }

    // Use debounced values for the heavy calculation
    const finalResults = evaluateGraph(debouncedNodes, debouncedEdges, currentContext, flowSettings.globals || []);
    setResults(finalResults);
  }, [debouncedNodes, debouncedEdges, path, flowSettings.globals]);

  // --- Memoized Inputs & Handlers ---

  const nodeInputs = useMemo(() => {
    const inputs = {};
    const nodeMap = new Map(debouncedNodes.map(n => [n.id, n]));

    // Initialize
    debouncedNodes.forEach(n => inputs[n.id] = []);

    debouncedEdges.forEach(e => {
      if (inputs[e.target]) {
        const sourceNode = nodeMap.get(e.source);
        const targetNode = nodeMap.get(e.target);
        const val = resolveSourceValue(results[e.source], e.sourceHandle, sourceNode?.type, targetNode?.type);
        inputs[e.target].push(val);
      }
    });

    return inputs;
  }, [debouncedNodes, debouncedEdges, results]);

  // For dynamic-input nodes (e.g. REPORT), map each input handle index (in_N) to
  // the connected source node's label, so rows can auto-label from their connections.
  const nodeInputSources = useMemo(() => {
    const map = {};
    const nodeMap = new Map(debouncedNodes.map(n => [n.id, n]));
    debouncedNodes.forEach(n => { map[n.id] = {}; });
    debouncedEdges.forEach(e => {
      if (!map[e.target]) return;
      const m = /^in_(\d+)$/.exec(e.targetHandle || '');
      if (!m) return;
      const src = nodeMap.get(e.source);
      map[e.target][parseInt(m[1], 10)] = src?.data?.label || getDefinition(src?.type)?.label || src?.type || '';
    });
    return map;
  }, [debouncedNodes, debouncedEdges]);

  const handleNodeDelete = useCallback((id) => {
    if (!canModifyStructure()) return;
    setGraph(graph => ({
      nodes: graph.nodes.filter(n => n.id !== id),
      edges: graph.edges.filter(e => e.source !== id && e.target !== id)
    }));
  }, [canModifyStructure, setGraph]);

  const handleNodeUpdate = useCallback((id, data) => {
    if (!isActionAllowed()) return;
    setGraph(graph => ({
      ...graph,
      nodes: graph.nodes.map(n => n.id === id ? { ...n, data } : n)
    }));
  }, [isActionAllowed, setGraph]);

  const handleOpenEditor = useCallback((id, code, inputs) => {
    setEditor({ isOpen: true, nodeId: id, code, inputs });
  }, []);

  // --- Duplicate Node ---
  const duplicateNode = useCallback((nodeId) => {
    if (!canModifyStructure()) return;

    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;

    const newId = generateId();

    // Deep clone data to avoid shared references (like inputOrder arrays)
    const newData = JSON.parse(JSON.stringify(node.data));

    // If it's a GROUP, we MUST regenerate internal IDs to ensure uniqueness
    // and prevent signal crossover or ID collisions.
    if (node.type === 'GROUP' && newData.subGraph) {
      const idMap = new Map();

      // 1. Assign new IDs to all internal nodes
      newData.subGraph.nodes = newData.subGraph.nodes.map(n => {
        const newInnerId = generateId();
        idMap.set(n.id, newInnerId);
        return { ...n, id: newInnerId };
      });

      // 2. Update edges to point to new node IDs
      newData.subGraph.edges = newData.subGraph.edges.map(e => ({
        ...e,
        id: generateId(),
        source: idMap.get(e.source) || e.source,
        target: idMap.get(e.target) || e.target
      }));

      // 3. Update inputOrder/outputOrder to match new IDs
      if (newData.inputOrder) {
        newData.inputOrder = newData.inputOrder.map(id => idMap.get(id)).filter(Boolean);
      }
      if (newData.outputOrder) {
        newData.outputOrder = newData.outputOrder.map(id => idMap.get(id)).filter(Boolean);
      }
    }

    const newNode = {
      ...node,
      id: newId,
      position: { x: node.position.x + 30, y: node.position.y + 30 },
      data: newData
    };

    setGraph(graph => ({ nodes: [...graph.nodes, newNode], edges: graph.edges }));
    setSelectedIds(new Set([newId]));
  }, [setGraph, canModifyStructure]);

  // Group selected nodes into a GROUP node
  const groupSelectedNodes = useCallback(() => {
    if (selectedIds.size < 2) return;

    // Get selected nodes (exclude FRAME nodes)
    const selectedNodesList = nodes.filter(n => selectedIds.has(n.id) && n.type !== 'FRAME');
    if (selectedNodesList.length < 2) return;

    // Calculate bounding box for positioning
    const minX = Math.min(...selectedNodesList.map(n => n.position.x));
    const minY = Math.min(...selectedNodesList.map(n => n.position.y));

    // Find external connections (edges from/to non-selected nodes)
    const selectedSet = new Set(selectedNodesList.map(n => n.id));
    const incomingEdges = edges.filter(e => !selectedSet.has(e.source) && selectedSet.has(e.target));
    const outgoingEdges = edges.filter(e => selectedSet.has(e.source) && !selectedSet.has(e.target));
    const internalEdges = edges.filter(e => selectedSet.has(e.source) && selectedSet.has(e.target));
    const externalEdges = edges.filter(e => !selectedSet.has(e.source) && !selectedSet.has(e.target));

    // Derive readable boundary-port names from the connections themselves, so
    // that inside the group (and on the group's outer ports) each port says
    // what it wires to rather than a meaningless "Input 1 / Output 2".
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const nodeName = (n) => n?.data?.label || getDefinition(n?.type)?.label || n?.type || 'Node';
    const prettyHandle = (h) => {
      if (!h || h === 'default') return '';
      if (/^in_\d+$/.test(h)) return `#${h.slice(3)}`; // collector ports: in_0 -> #0
      return h.charAt(0).toUpperCase() + h.slice(1);
    };

    // Create GROUP_INPUT nodes for incoming connections.
    // Label = the internal node/port it feeds; description = the external source.
    const inputNodes = [];
    const inputEdgeMap = new Map(); // Map from original target handle to GROUP_INPUT id
    incomingEdges.forEach((edge, idx) => {
      const inputId = generateId();
      const target = nodeById.get(edge.target);
      const handle = prettyHandle(edge.targetHandle);
      const source = nodeById.get(edge.source);
      inputNodes.push({
        id: inputId,
        type: 'GROUP_INPUT',
        position: { x: 50, y: 50 + idx * 100 },
        data: {
          label: handle ? `${nodeName(target)} · ${handle}` : nodeName(target),
          description: source ? `from ${nodeName(source)}` : ''
        }
      });
      inputEdgeMap.set(`${edge.target}-${edge.targetHandle || 'default'}`, inputId);
    });

    // Create GROUP_OUTPUT nodes for outgoing connections.
    // Label = the internal node/port it comes from; description = the external consumer.
    const outputNodes = [];
    const outputEdgeMap = new Map(); // Map from original source to GROUP_OUTPUT id
    outgoingEdges.forEach((edge, idx) => {
      const outputId = generateId();
      const source = nodeById.get(edge.source);
      const multiOut = (getDefinition(source?.type)?.outputs?.length || 0) > 1;
      const handle = multiOut ? prettyHandle(edge.sourceHandle) : '';
      const consumer = nodeById.get(edge.target);
      outputNodes.push({
        id: outputId,
        type: 'GROUP_OUTPUT',
        position: { x: 400, y: 50 + idx * 100 },
        data: {
          label: handle ? `${nodeName(source)} · ${handle}` : nodeName(source),
          description: consumer ? `to ${nodeName(consumer)}` : ''
        }
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
        const fileSize = event.target.result.length;
        const config = JSON.parse(event.target.result);

        // Validate and sanitize the imported flow
        const validation = validateFlow(config, fileSize);
        if (!validation.valid) {
          alert(`Import failed: ${validation.error}`);
          return;
        }

        // Warn about code nodes
        if (validation.warnings && validation.warnings.length > 0) {
          const proceed = window.confirm(
            `Warning:\n${validation.warnings.join('\n')}\n\nDo you want to continue?`
          );
          if (!proceed) return;
        }

        setGraph(validation.data); // Commit validated data to history
        if (config.title) {
          setProjectTitle(config.title);
        }
        if (config.viewport) {
          setPan(config.viewport.pan || { x: 0, y: 0 });
          setScale(config.viewport.scale || 1);
        }
      } catch (err) {
        alert(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };



  // --- Helpers ---

  // Node types that have subGraphs (can be entered by double-click)
  const SUBGRAPH_NODE_TYPES = ['GROUP', 'MAP', 'FILTER', 'REDUCE'];

  const enterGroup = (groupId) => {
    const groupNode = nodes.find(n => n.id === groupId);
    if (!groupNode || !SUBGRAPH_NODE_TYPES.includes(groupNode.type)) return;
    const subGraph = groupNode.data.subGraph || { nodes: [], edges: [] };

    // Push current level to path
    setPath(prev => [...prev, { id: groupId, label: groupNode.data.label || groupNode.type, nodes, edges, viewport: { pan, scale } }]);

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
      // We need to traverse back up the stack
      // This is tricky because `path` has the *snapshot* from when we entered.
      // But we modified the current level.

      // Reconstruct the stack from top to target
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
      if (e.key === 'Escape') {
        setSelectedEdgeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // Track spacebar for pan mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && !e.target.closest('input, textarea, [contenteditable="true"]')) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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
    // Middle mouse button (button 1) always pans from anywhere
    if (e.button === 1) {
      e.preventDefault();
      setDragState({ type: 'pan', startPan: { ...pan }, startMouse: { x: e.clientX, y: e.clientY } });
      return;
    }

    // Left click (button 0)
    if (e.button === 0) {
      // Spacebar held + left click: pan from anywhere
      if (e.target.closest && spacePressed) {
        e.preventDefault();
        setDragState({ type: 'pan', startPan: { ...pan }, startMouse: { x: e.clientX, y: e.clientY } });
        return;
      }

      // Normal left click on canvas container only
      if (e.target === containerRef.current) {
        setSelectedEdgeId(null); // clicking empty canvas clears any highlighted wire
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

    if (!canModifyStructure()) return; // Block dragging

    // Capture each dragged node's starting position so the move is computed
    // absolutely (origin + total delta) — required for clean grid snapping.
    const ids = Array.from(newSelectedIds);
    const origins = {};
    nodes.forEach(n => { if (ids.includes(n.id)) origins[n.id] = { ...n.position }; });
    setDragState({ type: 'node', ids, startMouse: { x: e.clientX, y: e.clientY }, origins });
    // Commit the current state to history as a checkpoint before dragging starts
    setGraph({ nodes, edges });
  };

  const handleConnectionStart = (e, sourceId, handleId) => {
    e.stopPropagation();
    // Stop the mousedown from starting a native text selection as you drag the
    // wire across the canvas (which otherwise highlights every node's text).
    e.preventDefault();
    if (!canModifyStructure()) return;
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
      if (dragState.type === 'node' && dragState.origins) {
        // Total delta from drag start, applied to captured origins (absolute).
        const totalDx = (e.clientX - dragState.startMouse.x) / scale;
        const totalDy = (e.clientY - dragState.startMouse.y) / scale;

        // Compute the offset for the anchor (first dragged node); the whole
        // selection then moves rigidly by it. Per axis: alignment to a
        // neighbouring node wins, else grid snap (if on), else free.
        const anchorOrigin = dragState.origins[dragState.ids[0]];
        let offsetX = totalDx, offsetY = totalDy;
        let alignedX = false, alignedY = false;
        let guides = [];

        if (gridSettings.alignNodes) {
          const anchorNode = nodes.find(n => n.id === dragState.ids[0]);
          const tentative = {
            x: anchorOrigin.x + totalDx, y: anchorOrigin.y + totalDy,
            w: anchorNode?.data?.width || NODE_WIDTH, h: getNodeHeight(anchorNode),
          };
          const others = nodes
            .filter(n => !dragState.ids.includes(n.id))
            .map(n => ({ x: n.position.x, y: n.position.y, w: n.data?.width || NODE_WIDTH, h: getNodeHeight(n) }));
          const align = computeAlignment(tentative, others);
          alignedX = align.hasX; alignedY = align.hasY;
          if (align.hasX) offsetX = totalDx + align.dx;
          if (align.hasY) offsetY = totalDy + align.dy;
          guides = align.guides;
        }
        if (gridSettings.snap) {
          if (!alignedX) offsetX = snapToGrid(anchorOrigin.x + totalDx) - anchorOrigin.x;
          if (!alignedY) offsetY = snapToGrid(anchorOrigin.y + totalDy) - anchorOrigin.y;
        }
        if (gridSettings.alignNodes) setAlignmentGuides(guides);

        // Use updateGraph (no commit) for smooth dragging
        const newNodes = nodes.map(n => {
          const origin = dragState.origins[n.id];
          if (origin) {
            return { ...n, position: { x: origin.x + offsetX, y: origin.y + offsetY } };
          }
          return n;
        });
        updateGraph({ nodes: newNodes, edges });

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
  }, [dragState, connectionState, pan, scale, nodes, edges, selectionBox, updateGraph, gridSettings.snap, gridSettings.alignNodes]);

  const handleMouseUp = (e) => {
    // If we were dragging, we should now COMMIT the final state to history
    if (dragState?.type === 'node' && hoverGroup && dragState.ids.length === 1) {
      if (!canModifyStructure()) {
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
        // Pick the input port whose position (from the shared getPortLayout
        // source of truth) is nearest the drop point. Render, wire geometry and
        // this hit-test therefore always agree on where each port sits.
        let targetHandle = null;
        const targetInputs = getPortLayout(targetNode).inputs;
        let minDist = Infinity;
        targetInputs.forEach((p) => {
          const hy = targetNode.position.y + resolvePortTop(targetNode, p.top);
          const dist = Math.abs(my - hy);
          if (dist < minDist) { minDist = dist; targetHandle = p.id; }
        });

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
    setAlignmentGuides([]);
  };

  const addNode = (type) => {
    if (!canModifyStructure()) return;
    const id = generateId();
    const rect = containerRef.current.getBoundingClientRect();
    const x = (-pan.x + rect.width / 2) / scale - 100;
    const y = (-pan.y + rect.height / 2) / scale - 50;
    setGraph({
      nodes: [...nodes, { id, type, position: { x, y }, data: { value: 0, label: '', subGraph: { nodes: [], edges: [] } } }],
      edges
    });
  };

  const applyAutoLayout = useCallback(() => {
    if (!canModifyStructure()) return;
    const positions = computeAutoLayout(nodes, edges);
    if (Object.keys(positions).length === 0) return;
    setGraph({
      nodes: nodes.map(n => positions[n.id] ? { ...n, position: positions[n.id] } : n),
      edges
    });
  }, [nodes, edges, canModifyStructure, setGraph]);

  const toggleRouting = useCallback(() => {
    setFlowSettings(prev => ({
      ...prev,
      routingMode: prev.routingMode === 'orthogonal' ? 'bezier' : 'orthogonal'
    }));
  }, []);

  const handleSaveEditor = (newCode) => {
    setGraph({
      nodes: nodes.map(n => n.id === editor.nodeId ? { ...n, data: { ...n.data, func: newCode } } : n),
      edges
    });
    setEditor({ isOpen: false, nodeId: null, code: '' });
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Flow unavailable</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">{loadError}</p>
        <Link to="/" className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          Go to FlowCal
        </Link>
      </div>
    );
  }

  const canShare = !!user && !!flowId && (user.id === flowOwnerId || isAdmin);

  return (
    <div className="flex w-full h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <CodeEditorModal
        isOpen={editor.isOpen}
        initialCode={editor.code}
        inputs={editor.inputs || []}
        onClose={() => setEditor({ ...editor, isOpen: false })}
        onSave={handleSaveEditor}
        readOnly={isSharedView || (nodes.find(n => n.id === editor.nodeId)?.data?.locked && nodes.find(n => n.id === editor.nodeId)?.data?.lockedBy !== user?.id && !user?.app_metadata?.claims_admin)}
      />

      <Sidebar
        onAddNode={addNode}
        onSave={user ? handleCloudSave : handleSave} // Primary Action
        onLocalSave={handleSave} // Explicit Local Backup
        isSaving={saving}
        lastSaved={lastSaved}
        isGuest={!user}
        isSharedView={isSharedView}
        canShare={canShare}
        onShare={handleShare}
        isDirty={isDirty}
        saveError={saveError}
        canAutosave={canAutosave}
        autosaveEnabled={autosaveEnabled}
        onToggleAutosave={() => setAutosaveEnabled(v => !v)}
        onGuardedNavigate={guardedNavigate}
        canVersions={canShare}
        onOpenVersions={() => setVersionPanelOpen(true)}
        onLoad={handleLoad}
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
        currentIterator={path.length > 0 ? (() => {
          // Determine which iterator type we're currently inside (if any)
          const lastFrame = path[path.length - 1];
          const groupNode = lastFrame.nodes.find(n => n.id === lastFrame.id);
          if (groupNode && ['MAP', 'FILTER', 'REDUCE'].includes(groupNode.type)) {
            return groupNode.type;
          }
          return null;
        })() : null}
      />

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ backgroundColor: 'var(--bg-primary)' }}
        className={`flex-1 relative overflow-hidden transition-colors duration-200 ${spacePressed ? 'cursor-grab' : ''
          } ${dragState?.type === 'pan' ? 'cursor-grabbing' : ''} ${connectionState || dragState ? 'select-none' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {gridSettings.enabled && <BackgroundGrid offset={pan} scale={scale} style={gridSettings.style} opacity={gridSettings.opacity} />}
        {selectionBox && (
          <SelectionBox rect={selectionBox} />
        )}

        {/* Top Bar: Breadcrumbs + Undo/Redo + Theme */}
        <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-2 py-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-sm">
            <button onClick={undo} disabled={!canUndo} className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${!canUndo ? 'text-slate-300 dark:text-slate-600' : 'text-slate-600 dark:text-slate-300'}`} title="Undo (Ctrl+Z)"><Undo size={16} /></button>
            <button onClick={redo} disabled={!canRedo} style={{ color: !canRedo ? 'var(--text-muted)' : 'var(--text-primary)' }} className="p-1 rounded hover:opacity-70" title="Redo (Ctrl+Y)"><Redo size={16} /></button>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }} className="flex items-center gap-1 backdrop-blur px-2 py-1 rounded-lg shadow-sm border text-sm">
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
              {Object.keys(customThemes).length > 0 && (
                <optgroup label="Custom">
                  {Object.entries(customThemes).map(([id, t]) => (
                    <option key={id} value={id} style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{t.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              onClick={() => setThemeEditorOpen(true)}
              className="p-0.5 rounded hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
              title="Customize theme"
            >
              <SlidersHorizontal size={15} />
            </button>
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
                <div className="flex items-center justify-between mb-3">
                  <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium" title="Align nodes to the grid as you drag">Snap to grid</span>
                  <button
                    onClick={() => setGridSettings(s => ({ ...s, snap: !s.snap }))}
                    className={`w-10 h-5 rounded-full transition-colors ${gridSettings.snap ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${gridSettings.snap ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium" title="Show guides and snap when a node lines up with another">Align to nodes</span>
                  <button
                    onClick={() => setGridSettings(s => ({ ...s, alignNodes: !s.alignNodes }))}
                    className={`w-10 h-5 rounded-full transition-colors ${gridSettings.alignNodes ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${gridSettings.alignNodes ? 'translate-x-5' : 'translate-x-0.5'}`} />
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

          {/* Tidy layout + wire routing */}
          <button
            onClick={applyAutoLayout}
            disabled={!canModifyStructure()}
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}
            className="flex items-center gap-2 backdrop-blur px-2 py-1 rounded-lg shadow-sm border text-sm hover:opacity-80 disabled:opacity-40"
            title="Tidy layout (auto-arrange nodes left → right by dependency)"
          >
            <Wand2 size={16} />
          </button>
          <button
            onClick={toggleRouting}
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}
            className="flex items-center gap-2 backdrop-blur px-2 py-1 rounded-lg shadow-sm border text-sm hover:opacity-80"
            title={flowSettings.routingMode === 'orthogonal' ? 'Wire routing: orthogonal (click for curved)' : 'Wire routing: curved (click for orthogonal)'}
          >
            {flowSettings.routingMode === 'orthogonal' ? <Waypoints size={16} /> : <Spline size={16} />}
          </button>

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
            {/* Render the highlighted wire last so it paints on top of crossings */}
            {(selectedEdgeId ? [...edges].sort((a, b) => (a.id === selectedEdgeId ? 1 : 0) - (b.id === selectedEdgeId ? 1 : 0)) : edges).map(edge => {
              const start = getHandlePosition(edge.source, nodes, 'output', edge.sourceHandle);
              const end = getHandlePosition(edge.target, nodes, 'input', edge.targetHandle);
              return <ConnectionLine key={edge.id} id={edge.id} start={start} end={end}
                label={edge.label}
                routing={flowSettings.routingMode}
                selected={selectedEdgeId === edge.id}
                dimmed={selectedEdgeId !== null && selectedEdgeId !== edge.id}
                color={edge.color}
                onSetColor={(id, c) => {
                  if (!canModifyStructure()) return;
                  setGraph({
                    nodes,
                    edges: edges.map(e => e.id === id
                      ? (c ? { ...e, color: c } : (() => { const { color: _omit, ...rest } = e; return rest; })())
                      : e)
                  });
                }}
                onSelect={(id) => setSelectedEdgeId(prev => prev === id ? null : id)}
                isEditing={editingEdgeId === edge.id}
                canEdit={canModifyStructure()}
                onDelete={(id) => {
                  if (!canModifyStructure()) return;
                  setGraph({ nodes, edges: edges.filter(e => e.id !== id) });
                }}
                onStartEditLabel={(id) => { if (canModifyStructure()) setEditingEdgeId(id); }}
                onCommitLabel={(id, value, cancelled) => {
                  setEditingEdgeId(null);
                  if (cancelled || !canModifyStructure()) return;
                  setGraph({
                    nodes,
                    edges: edges.map(e => e.id === id
                      ? (value ? { ...e, label: value } : (() => { const { label: _omit, ...rest } = e; return rest; })())
                      : e)
                  });
                }}
                onMouseEnter={(e) => {
                  if (debugMode) {
                    setHoveredEdgeId(edge.id);
                    setCursorPos({ x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseLeave={() => setHoveredEdgeId(null)}
                disableTitle={debugMode}
              />;
            })}
            {connectionState && (
              <path d={getEdgePath(getHandlePosition(connectionState.sourceId, nodes, 'output', connectionState.sourceHandle), [connectionState.mousePos.x, connectionState.mousePos.y], flowSettings.routingMode)} stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="5,5" className="opacity-60" />
            )}
            {/* Alignment guides while dragging */}
            {alignmentGuides.map((g, i) => (
              <line key={i} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="#ec4899" strokeWidth="1" strokeDasharray="4 3" className="pointer-events-none" />
            ))}
          </svg>
          {nodes.map(node => (
            <NodeErrorBoundary
              key={node.id}
              id={node.id}
              type={node.type}
              position={node.position}
              data={node.data}
              onDelete={handleNodeDelete}
            >
              <Node
                {...node}
                inputs={nodeInputs[node.id] || []}
                inputSources={nodeInputSources[node.id] || {}}
                result={results[node.id]}
                selected={selectedIds.has(node.id)}
                isHovered={hoverGroup === node.id}
                onDragStart={handleNodeDragStart}
                onDelete={handleNodeDelete}
                onDuplicate={duplicateNode}
                onUpdateData={handleNodeUpdate}
                onStartConnect={handleConnectionStart}
                onEnterGroup={enterGroup}
                readOnly={node.data.readOnly || !isActionAllowed()}
                onOpenEditor={handleOpenEditor}
                onSaveAsCustom={handleSaveAsCustomNode}
                typeWarnings={typeWarnings}
                availableGlobals={flowSettings.globals || []}
              />
            </NodeErrorBoundary>
          ))}
          {selectionBox && <SelectionBox rect={selectionBox} />}
        </div>
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-2 bg-white dark:bg-slate-800 rounded shadow text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors">+</button>
          <button onClick={() => setScale(1)} className="p-2 bg-white dark:bg-slate-800 rounded shadow text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold w-12 border border-slate-200 dark:border-slate-700 transition-colors">{Math.round(scale * 100)}%</button>
          <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-2 bg-white dark:bg-slate-800 rounded shadow text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors">-</button>
        </div>

        {/* Debug Logic */}
        <div className="absolute bottom-4 right-48 flex gap-2">
          <DebugToolbar isEnabled={debugMode} onToggle={() => setDebugMode(!debugMode)} />
        </div>

        {/* Node Inspector */}
        {debugMode && selectedIds.size === 1 && (
          <NodeInspector
            node={nodes.find(n => n.id === [...selectedIds][0])}
            result={results[[...selectedIds][0]]}
            onClose={() => setDebugMode(false)}
          />
        )}

        {/* Edge Hover Tooltip */}
        {debugMode && hoveredEdgeId && (
          (() => {
            const edge = edges.find(e => e.id === hoveredEdgeId);
            if (!edge) return null;
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            const val = resolveSourceValue(results[edge.source], edge.sourceHandle, sourceNode?.type, targetNode?.type);

            // Position based on cursor
            const left = cursorPos.x;
            const top = cursorPos.y;

            return (
              <div
                className="fixed z-[9999] pointer-events-none mb-2 bg-slate-900 border border-slate-600 text-white text-xs p-2 rounded shadow-xl font-mono whitespace-nowrap"
                style={{ left: left + 16, top: top - 16 }}
              >
                <div className="text-slate-400 text-[10px] mb-1">Value on wire</div>
                {typeof val === 'object' ? (
                  <pre className="text-[10px] leading-tight max-h-64 max-w-xs overflow-hidden text-left bg-black/30 p-1 rounded whitespace-pre-wrap break-all">
                    {JSON.stringify(val, null, 2)}
                  </pre>
                ) : (
                  String(val)
                )}
              </div>
            );
          })()
        )}
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
      <ThemeEditor
        isOpen={themeEditorOpen}
        currentThemeId={theme}
        onClose={() => setThemeEditorOpen(false)}
        onSaved={(id) => { setCustomThemes(getCustomThemes()); setTheme(id); }}
      />
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

      <VersionHistoryPanel
        isOpen={versionPanelOpen}
        onClose={() => setVersionPanelOpen(false)}
        flowId={flowId}
        onSaveVersion={handleSaveVersion}
        onRestore={handleRestoreVersion}
      />
    </div>
  );
}

