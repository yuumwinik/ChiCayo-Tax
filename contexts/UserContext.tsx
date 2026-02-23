import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { supabase } from '../utils/supabase';

interface UserContextType {
    user: User | null;
    loadingAuth: boolean;
    setUser: (user: User | null) => void;
    refreshUser: () => Promise<void>;
    updateProfile: (name: string, avatarId: any, notificationSettings: any, preferredDialer: string, showFailedSection?: boolean) => Promise<void>;
    isAdmin: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log("🔐 UserContext: Session found, fetching profile...", session.user.id);
                const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
                if (profile) {
                    setUser({
                        id: profile.id,
                        name: profile.name,
                        email: profile.email,
                        role: profile.role,
                        avatarId: profile.avatar_id,
                        createdAt: profile.created_at,
                        hasSeenTutorial: profile.has_seen_tutorial,
                        notificationSettings: profile.notification_settings,
                        preferredDialer: profile.preferred_dialer,
                        dismissedCycleIds: profile.dismissed_cycle_ids || [],
                        showFailedSection: profile.show_failed_section ?? true
                    });
                } else {
                    console.error("❌ UserContext: Session valid but NO profile found in 'users' table for ID:", session.user.id);
                    setUser(null);
                }
            } else {
                console.log("🔐 UserContext: No active session found.");
                setUser(null);
            }
        } catch (error) {
            console.error("Auth check failed", error);
        } finally {
            console.log("🔐 UserContext: Auth loading complete.");
            setLoadingAuth(false);
        }
    }, []);

    const updateProfile = async (name: string, avatarId: any, notificationSettings: any, preferredDialer: string, showFailedSection?: boolean) => {
        if (!user) return;
        console.log("🛠️ updateProfile called with:", { name, showFailedSection, current: user.showFailedSection });

        // Optimistic update for immediate UI feedback
        const optimisticUser = {
            ...user,
            name,
            avatarId,
            notificationSettings,
            preferredDialer,
            showFailedSection: showFailedSection !== undefined ? showFailedSection : user.showFailedSection
        };
        console.log("🛠️ Applying optimistic user:", optimisticUser);
        setUser(optimisticUser);

        const { data, error } = await supabase.from('users').update({
            name,
            avatar_id: avatarId,
            notification_settings: notificationSettings,
            preferred_dialer: preferredDialer,
            show_failed_section: showFailedSection
        }).eq('id', user.id).select().single();

        if (error) {
            console.error("❌ updateProfile failed:", error);
            // Revert optimistic update if needed, but for now we just log
        } else if (data) {
            console.log("✅ updateProfile success, DB confirmed:", data);
            setUser({
                ...user,
                name: data.name,
                avatarId: data.avatar_id,
                notificationSettings: data.notification_settings,
                preferredDialer: data.preferred_dialer,
                showFailedSection: data.show_failed_section ?? true
            });
        }
    };

    useEffect(() => {
        refreshUser();

        // Listen for auth changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) setUser(null);
            else refreshUser();
        });

        return () => subscription.unsubscribe();
    }, [refreshUser]);

    return (
        <UserContext.Provider value={{
            user,
            loadingAuth,
            setUser,
            refreshUser,
            updateProfile,
            isAdmin: user?.role === 'admin'
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
