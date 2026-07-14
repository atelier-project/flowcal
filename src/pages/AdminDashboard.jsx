import React, { useEffect, useState } from 'react';
import { backend } from '../services/backend';
import { useAuth } from '../context/AuthContext';
import { AdminSettingsPanel } from '../components/admin/AdminSettingsPanel';
import { Users, FileCode, ShieldAlert, CheckCircle2, Ban, Loader2, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
    const { profile } = useAuth();
    const [users, setUsers] = useState([]);
    const [flows, setFlows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch users from profiles table
            const userData = await backend.listAllUsers();
            setUsers(userData);

            // Fetch ALL flows (admin-only, authorization enforced by the backend)
            const flowData = await backend.listAllFlows();
            setFlows(flowData);
        } catch (err) {
            console.error('Failed to load admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleBan = async (userId, currentStatus) => {
        try {
            await backend.setUserBanned(userId, !currentStatus);
            setUsers(users.map(u => u.id === userId ? { ...u, is_banned: !currentStatus } : u));
        } catch {
            alert('Failed to update user status');
        }
    };

    const handleToggleTemplate = async (flowId, currentStatus) => {
        try {
            const updated = await backend.setFlowTemplate(flowId, !currentStatus);
            // Marking a template also publishes it (server enforces this).
            setFlows(flows.map(f => f.id === flowId
                ? { ...f, is_template: updated.is_template, is_public: updated.is_public }
                : f));
        } catch {
            alert('Failed to update template status');
        }
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredFlows = flows.filter(f =>
        f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
            {/* Nav */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ShieldAlert size={24} className="text-blue-600" />
                        Admin Panel
                    </h1>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Users</div>
                        <div className="text-3xl font-bold text-slate-800 dark:text-white">{users.length}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Flows</div>
                        <div className="text-3xl font-bold text-slate-800 dark:text-white">{flows.length}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Banned Users</div>
                        <div className="text-3xl font-bold text-red-500">{users.filter(u => u.is_banned).length}</div>
                    </div>
                </div>

                {/* Registration toggle + add-a-user */}
                <AdminSettingsPanel
                    isSuperuser={profile?.role === 'superuser'}
                    onUserCreated={loadData}
                />

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`pb-3 px-2 text-sm font-medium transition-colors relative ${activeTab === 'users' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Users size={18} className="inline mr-2" /> Users
                        {activeTab === 'users' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('flows')}
                        className={`pb-3 px-2 text-sm font-medium transition-colors relative ${activeTab === 'flows' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <FileCode size={18} className="inline mr-2" /> All Flows
                        {activeTab === 'flows' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />}
                    </button>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    {activeTab === 'users' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">User</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Role / Tier</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Joined</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800 dark:text-slate-200">{u.email}</div>
                                                <div className="text-xs text-slate-400 font-mono">{u.id.slice(0, 8)}...</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase mr-2 ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700'}`}>
                                                    {u.role}
                                                </span>
                                                <span className="text-sm text-slate-500">{u.tier}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {u.is_banned ? (
                                                    <span className="flex items-center gap-1.5 text-red-500 font-medium">
                                                        <Ban size={14} /> Banned
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-green-500 font-medium">
                                                        <CheckCircle2 size={14} /> Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleToggleBan(u.id, u.is_banned)}
                                                    className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${u.is_banned ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                                >
                                                    {u.is_banned ? 'Unban' : 'Ban User'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Flow Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Owner</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Last Updated</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Visibility</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Template</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredFlows.map(f => (
                                        <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">{f.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{f.id}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {f.profiles?.email || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {new Date(f.updated_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {f.is_public ? (
                                                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold uppercase">Public</span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 dark:bg-slate-700 text-[10px] font-bold uppercase">Private</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggleTemplate(f.id, f.is_template)}
                                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${f.is_template
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200'
                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                                    title={f.is_template ? 'Unpublish template' : 'Publish as template (makes it public)'}
                                                >
                                                    {f.is_template ? 'Template ✓' : 'Make template'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
