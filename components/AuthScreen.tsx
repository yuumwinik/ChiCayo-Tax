
import React, { useState } from 'react';
import { IconLogo, IconLock, IconUser, IconEye, IconEyeOff } from './Icons';
import { User } from '../types';
import { supabase } from '../utils/supabase';

interface AuthScreenProps {
  onLogin: (user: User, isSignup: boolean) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Aggressive sanitization (but NOT on password)
    const email = formData.email.trim().toLowerCase();
    const password = formData.password; // Do NOT trim passwords
    const name = formData.name.trim();

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No user found.");

        // Fetch User Profile from 'public.users'
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !userProfile) {
          // Fallback: If user exists in Auth but not in Table (rare edge case), recreate
          const fallbackUser: any = {
            id: authData.user.id,
            email: email,
            name: name || 'User',
            role: 'agent',
            avatar_id: 'initial',
            created_at: new Date().toISOString()
          };
          // Use upsert to avoid conflicts
          const { error: insertError } = await supabase.from('users').upsert(fallbackUser);
          if (insertError) throw insertError;

          await onLogin({
            id: fallbackUser.id,
            name: fallbackUser.name,
            email: fallbackUser.email,
            role: fallbackUser.role,
            avatarId: fallbackUser.avatar_id,
            createdAt: fallbackUser.created_at,
            hasSeenTutorial: false
          }, false);
        } else {
          // Check for Admin Role Bypass
          if (isAdmin && userProfile.role !== 'admin') {
            if (email === 'admin@communitytax.com') {
              // Auto-promote Master Admin in DB if not already
              await supabase.from('users').update({ role: 'admin', avatar_id: 'crown' }).eq('id', userProfile.id);
              userProfile.role = 'admin';
            } else {
              throw new Error("Access denied. You do not have Admin privileges.");
            }
          }
          await onLogin({
            id: userProfile.id,
            name: userProfile.name,
            email: userProfile.email,
            role: userProfile.role as 'agent' | 'admin',
            avatarId: userProfile.avatar_id,
            createdAt: userProfile.created_at,
            hasSeenTutorial: userProfile.has_seen_tutorial
          }, false);
        }

      } else {
        // --- SIGN UP FLOW ---
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Sign up failed.");

        // Check if session was created (Auto-confirm ON) or if it's pending (Confirm Email ON)
        if (!authData.session) {
          // If no session, it usually means Email Confirmation is required by Supabase settings
          throw new Error("Account created! Please check your email to confirm, or ask Admin to disable confirmation.");
        }

        // NOTE: We rely on the Supabase SQL Trigger (handle_new_user) to insert the row into public.users.
        // We do NOT manually insert here to avoid "Duplicate Key" errors.

        await onLogin({
          id: authData.user.id,
          name: name,
          email: email,
          role: 'agent',
          avatarId: 'initial',
          createdAt: new Date().toISOString(),
          hasSeenTutorial: false
        }, true);
      }

    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = 'Authentication failed.';

      // Robust error parsing
      if (err?.message) {
        msg = err.message;
      } else if (typeof err === 'string') {
        msg = err;
      } else {
        msg = JSON.stringify(err);
      }

      // Friendly messages for common issues
      if (msg.includes("User already registered")) msg = "This email is already registered. Please log in.";
      if (msg.includes("Invalid login credentials")) msg = "Incorrect email or password.";
      if (msg.includes("Email not confirmed")) msg = "Please confirm your email address before logging in.";
      if (msg.includes("is invalid")) msg = `The email "${email}" is invalid. Please check for spaces or typo.`;

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-200 dark:shadow-none">
            <IconLogo className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Community Tax</h1>
          <p className="text-slate-500 dark:text-slate-400">Appointment & Earnings Tracker</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700/50 p-8 animate-in fade-in zoom-in duration-300">

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>

            {/* Admin Toggle - Only visible on Login */}
            {isLogin && (
              <button
                type="button"
                onClick={() => setIsAdmin(!isAdmin)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isAdmin ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}
              >
                {isAdmin ? <IconLock className="w-3 h-3" /> : <IconUser className="w-3 h-3" />}
                {isAdmin ? 'Admin' : 'Agent'}
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
                placeholder="name@company.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all pr-12"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 mt-2 ${isAdmin
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 dark:shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none'
                }`}
            >
              {loading ? 'Processing...' : (isLogin ? (isAdmin ? 'Login as Admin' : 'Log In') : 'Sign Up')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setIsAdmin(false); setError(''); }}
                className="text-indigo-600 hover:text-indigo-500 font-semibold"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">© 2025 Community Tax. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
