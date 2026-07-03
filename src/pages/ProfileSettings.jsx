import React, { useEffect, useState } from 'react';
import { backend } from '../services/backend';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { User, Shield, AlertTriangle, Save, Loader2, ArrowLeft, Trash2, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function ProfileSettings() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    // Form State
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [supportAccess, setSupportAccess] = useState(false);

    // Deletion State
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        if (user) loadProfile();
    }, [user]);

    const loadProfile = async () => {
        try {
            const data = await backend.getProfileSettings(user.id);

            if (data) {
                setFullName(data.full_name || '');
                setAvatarUrl(data.avatar_url || '');
                setSupportAccess(data.support_access_granted || false);
            }
        } catch (err) {
            console.error('Error loading profile:', err);
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await backend.updateProfile(user.id, {
                full_name: fullName,
                avatar_url: avatarUrl,
            });

            addToast('Profile updated successfully!', 'success');
            // Ideally refresh AuthContext profile here if needed
        } catch (err) {
            addToast('Failed to update profile: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSupportToggle = async (newValue) => {
        setSupportAccess(newValue); // Optimistic update
        try {
            await backend.setSupportAccess(user.id, newValue);
        } catch {
            setSupportAccess(!newValue); // Revert
            addToast('Failed to toggle support access', 'error');
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = await confirm(
            "Are you sure? This will schedule your account for deletion. You have 24 hours to contact support if this was a mistake.",
            { title: "Delete Account", type: "danger" }
        );
        if (!confirmed) return;

        setDeleteLoading(true);
        try {
            await backend.scheduleAccountDeletion();

            await signOut();
            navigate('/login');
        } catch (err) {
            addToast('Failed to delete account: ' + err.message, 'error');
            setDeleteLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/dashboard" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Profile & Settings</h1>
                        <p className="text-slate-500 dark:text-slate-400">Manage your personal information and privacy</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* 1. Public Profile */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <User size={20} className="text-blue-500" />
                            Public Profile
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                <input
                                    type="text"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-slate-400 mt-1">Email cannot be changed directly.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g. John Doe"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Avatar URL</label>
                                <input
                                    type="text"
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="https://example.com/me.jpg"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 dark:text-white"
                                />
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 2. Support & Privacy */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Shield size={20} className="text-purple-500" />
                            Support & Privacy
                        </h2>

                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-sm font-medium text-slate-800 dark:text-white">Grant Support Access</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                                    Allow FlowCal administrators to temporarily view your private flows to diagnose technical issues. You can revoke this at any time.
                                </p>
                            </div>
                            <button
                                onClick={() => handleSupportToggle(!supportAccess)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${supportAccess ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${supportAccess ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    {/* 3. Danger Zone */}
                    <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/30 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                            <AlertTriangle size={20} />
                            Danger Zone
                        </h2>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium text-slate-800 dark:text-white">Delete Account</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Schedule your account for deletion. Data is retained for a 24-hour grace period.
                                </p>
                            </div>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                            >
                                {deleteLoading ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
