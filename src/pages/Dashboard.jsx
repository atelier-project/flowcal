import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Plus, Folder, Loader2, Clock, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { flowService } from '../services/flowService';

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [flows, setFlows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadFlows();
    }, []);

    const loadFlows = async () => {
        try {
            const data = await flowService.listFlows();
            setFlows(data);
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
            alert('Failed to create flow: ' + err.message);
            setCreating(false);
        }
    };

    const handleOpenFlow = (flowId) => {
        navigate('/editor', { state: { flowId } });
    };

    const handleDeleteFlow = async (e, id) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this flow?')) return;
        try {
            await flowService.deleteFlow(id);
            setFlows(flows.filter(f => f.id !== id));
        } catch (err) {
            alert('Failed to delete flow');
        }
    };

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
                    <button
                        onClick={handleCreateFlow}
                        disabled={creating}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {creating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                        New Flow
                    </button>
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

                    {/* Flow Cards */}
                    {flows.map(flow => (
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

                            {/* Delete Button (visible on hover) */}
                            <button
                                onClick={(e) => handleDeleteFlow(e, flow.id)}
                                className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-slate-800/90 rounded-lg text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
