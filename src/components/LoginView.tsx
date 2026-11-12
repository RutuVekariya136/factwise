import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginViewProps {
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message);
      } else {
        onSuccess?.();
      }
    } catch {
      setError('Unable to sign in. Please verify your network and Supabase config.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] px-4">
      <div className="w-full max-w-sm rounded-lg border border-[#E3E9EF] bg-white p-6">
        <div className="flex items-center gap-2.5 border-b border-[#E3E9EF] pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#172B43] text-white">
            <ShieldCheck className="h-5 w-5 text-[#087F8C]" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-[#192B3D]">CareOps</h1>
            <p className="text-[11px] text-[#718096]">
              Clinical Ward Operations · Unit A
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#192B3D]">
              Staff Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@careops.org"
              className="mt-1 h-9 w-full rounded-md border border-[#E3E9EF] bg-[#F6F8FA] px-3 text-[13px] text-[#192B3D] focus:border-[#087F8C] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#192B3D]">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 h-9 w-full rounded-md border border-[#E3E9EF] bg-[#F6F8FA] px-3 text-[13px] text-[#192B3D] focus:border-[#087F8C] focus:bg-white focus:outline-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-[#C23B3B]/30 bg-[#C23B3B]/5 px-3 py-2 text-[12px] text-[#C23B3B]">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#087F8C] text-[13px] font-medium text-white transition-colors hover:bg-[#066B76] disabled:opacity-60 cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-[#718096]">
          Role &amp; permissions are enforced via Supabase Auth &amp; PostgreSQL RLS.
        </p>
      </div>
    </div>
  );
};

