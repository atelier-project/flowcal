import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { LogOut, Plus, Folder, Loader2, Clock, Trash2, Shield, Copy, User as UserIcon, Share2, LayoutTemplate } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { flowService } from '../services/flowService';
import { ensurePublicAndCopy } from '../utils/shareFlow';

export default function Dashboard() {
    const { user, signOut, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [flows, setFlows] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        loadFlows();
    }, []);

    const loadFlows = async () => {
        try {
            const [data, tpl] = await Promise.all([
                flowService.listFlows(),
                flowService.listTemplates().catch(() => []),
            ]);
            setFlows(data);
            setTemplates(tpl);
        } catch (err) {
            console.error('Failed to load flows:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFlow = async () => {
        setCreating(true);
        try {
            const newFlow = await flowService.createFlow();
            navigate('/editor', { state: { flowId: newFlow.id } });
        } catch (err) {
            addToast('Failed to create flow: ' + err.message, 'error');
            setCreating(false);
        }
    };

    const handleOpenFlow = (flowId) => {
        navigate('/editor', { state: { flowId } });
    };

    const handleDeleteFlow = async (e, id) => {
        e.stopPropagation();
        const confirmed = await confirm('Are you sure you want to delete this flow? This action cannot be undone.', { title: 'Delete Flow', type: 'danger' });
        if (!confirmed) return;

        try {
            await flowService.deleteFlow(id);
            setFlows(flows.filter(f => f.id !== id));
            addToast('Flow deleted successfully', 'success');
        } catch {
            addToast('Failed to delete flow', 'error');
        }
    };

    const handleShareFlow = async (e, flow) => {
        e.stopPropagation();
        try {
            await ensurePublicAndCopy(flow.id, flow);
            // Reflect the new public state locally so the icon stays accurate.
            setFlows(flows.map(f => f.id === flow.id ? { ...f, is_public: true } : f));
            addToast('Share link copied to clipboard', 'success');
        } catch (err) {
            addToast('Failed to create share link: ' + err.message, 'error');
        }
    };

    const handleDuplicateFlow = async (e, id) => {
        e.stopPropagation();
        try {
            const newFlow = await flowService.duplicateFlow(id);
            // Add new flow to list (at top)
            setFlows([newFlow, ...flows]);
            addToast('Flow duplicated successfully', 'success');
        } catch (err) {
            addToast('Failed to duplicate flow: ' + err.message, 'error');
        }
    };

    const handleUseTemplate = async (e, id) => {
        e.stopPropagation();
        try {
            const newFlow = await flowService.duplicateFlow(id);
            addToast('Started a new flow from the template', 'success');
            navigate('/editor', { state: { flowId: newFlow.id } });
        } catch (err) {
            addToast('Failed to use template: ' + err.message, 'error');
        }
    };

    // Filter flows. Templates are surfaced in their own gallery, so keep them out
    // of "Shared with Me" even though they're public.
    const myFlows = flows.filter(f => f.owner_id === user?.id);
    const sharedFlows = flows.filter(f => f.owner_id !== user?.id && !f.is_template);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <header className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">My Flows</h1>
                    <p className="text-slate-500 dark:text-slate-400">Welcome back, {user?.email}</p>
                </div>
                <div className="flex gap-4">
                    {isAdmin && (
                        <Link
                            to="/admin"
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                            <Shield size={18} />
                            Admin Panel
                        </Link>
                    )}
                    <button
                        onClick={handleCreateFlow}
                        disabled={creating}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {creating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                        New Flow
                    </button>
                    <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-slate-600 dark:text-slate-300 rounded-lg transition-all"
                    >
                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <span className="hidden md:inline">Profile</span>
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-500 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* Create New Card */}
                    <div
                        onClick={handleCreateFlow}
                        className="aspect-video bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 group transition-colors"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 mb-3 transition-colors">
                            <Plus size={24} />
                        </div>
                        <span className="font-medium text-slate-600 dark:text-slate-300">Create New Flow</span>
                    </div>

                    {/* Flow Cards (My Flows) */}
                    {myFlows.map(flow => (
                        <div
                            key={flow.id}
                            onClick={() => handleOpenFlow(flow.id)}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group relative"
                        >
                            <div className="h-32 bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                                <Folder className="text-slate-300 dark:text-slate-600" size={48} />
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-slate-800 dark:text-white mb-1 truncate">{flow.name}</h3>
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock size={12} />
                                    <span>{new Date(flow.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => handleShareFlow(e, flow)}
                                    className={`p-2 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-sm ${flow.is_public ? 'text-purple-500' : 'text-slate-400 hover:text-purple-500'}`}
                                    title={flow.is_public ? 'Public — copy share link' : 'Share (make public & copy link)'}
                                >
                                    <Share2 size={16} />
                                </button>
                                <button
                                    onClick={(e) => handleDuplicateFlow(e, flow.id)}
                                    className="p-2 bg-white/90 dark:bg-slate-800/90 rounded-lg text-slate-400 hover:text-blue-500 shadow-sm"
                                    title="Duplicate"
                                >
                                    <Copy size={16} />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteFlow(e, flow.id)}
                                    className="p-2 bg-white/90 dark:bg-slate-800/90 rounded-lg text-slate-400 hover:text-red-500 shadow-sm"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Templates Gallery */}
            {!loading && templates.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                        <LayoutTemplate className="text-emerald-500" size={24} />
                        Templates
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Start a new flow from a ready-made template.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {templates.map(tpl => (
                            <div
                                key={tpl.id}
                                onClick={(e) => handleUseTemplate(e, tpl.id)}
                                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500 transition-all cursor-pointer group relative"
                            >
                                <div className="h-32 bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                    <LayoutTemplate className="text-emerald-300 dark:text-emerald-600" size={48} />
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-slate-800 dark:text-white mb-1 truncate">{tpl.name}</h3>
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <UserIcon size={12} />
                                        <span className="truncate">
                                            {tpl.profiles?.full_name || tpl.profiles?.email || 'FlowCal'}
                                        </span>
                                    </div>
                                </div>
                                <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium shadow-sm">
                                        <Copy size={14} /> Use template
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Shared Flows Section */}
            {!loading && sharedFlows.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <UserIcon className="text-purple-500" size={24} />
                        Shared with Me
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {sharedFlows.map(flow => (
                            <div
                                key={flow.id}
                                onClick={() => handleOpenFlow(flow.id)}
                                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group relative"
                            >
                                <div className="h-32 bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                                    <Folder className="text-purple-300 dark:text-purple-600" size={48} />
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-slate-800 dark:text-white mb-1 truncate">{flow.name}</h3>
                                    <div className="flex flex-col gap-1 text-xs text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Clock size={12} />
                                            <span>{new Date(flow.updated_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                                            <UserIcon size={12} />
                                            <span className="truncate">
                                                {flow.profiles?.full_name || flow.profiles?.email || 'Unknown User'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions (Duplicate Only for Shared) */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleDuplicateFlow(e, flow.id)}
                                        className="p-2 bg-white/90 dark:bg-slate-800/90 rounded-lg text-slate-400 hover:text-blue-500 shadow-sm"
                                        title="Duplicate to My Flows"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
