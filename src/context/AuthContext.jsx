import React, { createContext, useContext, useEffect, useState } from 'react';
import { backend } from '../services/backend';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId) => {
        if (!userId) {
            setProfile(null);
            return;
        }
        const data = await backend.getProfile(userId);
        if (data) {
            setProfile(data);
        }
    };

    useEffect(() => {
        // Get initial session
        backend.getSession().then((session) => {
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) fetchProfile(currentUser.id);
            setLoading(false);
        });

        // Listen for changes
        const unsubscribe = backend.onAuthStateChange((session) => {
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) fetchProfile(currentUser.id);
            else setProfile(null);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        signUp: (data) => backend.signUp(data),
        signIn: (data) => backend.signIn(data),
        signOut: () => backend.signOut(),
        user,
        profile,
        isAdmin: profile?.role === 'admin' || profile?.role === 'superuser',
        role: profile?.role || 'user',
        session,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
