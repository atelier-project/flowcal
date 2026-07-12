import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { flowService } from '../services/flowService';
import { reconstructFullGraph } from '../utils/graphReconstruct';

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

/**
 * useCloudFlow — the editor's cloud persistence concern (issue #34 part 2):
 * loading a flow, manual + auto save with the optimistic-concurrency guard
 * (#38), stale-write conflict resolution, version save/restore, dirty-flag
 * tracking, and the leave-with-unsaved-changes guards.
 *
 * IMPORTANT (#30): loadCloudFlow / handleCloudSave / handleSaveVersion /
 * handleRestoreVersion are deliberately NOT memoized. The hook body re-runs
 * every render, so each is a fresh closure over the *current* graph and title.
 * A useCallback here (even keyed on flowId) would capture the first render's
 * state — before the flow loads — and save the initial sample graph instead.
 */
export function useCloudFlow({
    flowId,
    isSharedView,
    user,
    isAdmin,
    navigate,
    confirm,
    addToast,
    path,
    nodes,
    edges,
    pan,
    scale,
    debouncedNodes,
    debouncedEdges,
    projectTitle,
    flowSettings,
    flowOwnerId,
    setGraph,
    setProjectTitle,
    setFlowSettings,
    setFlowOwnerId,
    setFlowIsPublic,
}) {
    const [, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);
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

    // Load Cloud Flow on Mount
    useEffect(() => {
        if (flowId) {
            loadCloudFlow(flowId);
        }
        // loadCloudFlow intentionally omitted: it is a fresh closure each render;
        // this effect must only re-run when the flow being viewed changes.
    }, [flowId]);

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

    return {
        loadCloudFlow,
        handleCloudSave,
        handleSaveVersion,
        handleRestoreVersion,
        guardedNavigate,
        loadError,
        saving,
        lastSaved,
        saveError,
        isDirty,
        autosaveEnabled,
        setAutosaveEnabled,
        isOwner,
        canAutosave,
    };
}
