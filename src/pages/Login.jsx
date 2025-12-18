import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({ email: '', password: '' });

    const from = location.state?.from?.pathname || '/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = isLogin
                ? await signIn(formData)
                : await signUp(formData);

            if (error) throw error;
            if (isLogin) navigate(from, { replace: true });
            else alert('Check your email for confirmation link!');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-slate-200 dark:border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">FlowCal</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {isLogin ? 'Welcome back! Login to continue.' : 'Create an account to start building.'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={18} />}
                        {isLogin ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>

                    <div className="my-4 border-t border-slate-200 dark:border-slate-700"></div>

                    <button
                        onClick={() => navigate('/guest')}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
                    >
                        Try as Guest (No Account)
                    </button>
                </div>
            </div>
        </div>
    );
}
