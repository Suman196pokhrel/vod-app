// app/(public)/auth/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { authAPI } from '@/lib/apis/auth.api';
import { toast } from 'sonner';
import { AuthPageShell } from '../_components/AuthPageShell';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.forgotPassword(email);
      toast.success('Reset code sent to your email!');
      router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      toast.error('Failed to send reset code');
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <div className="w-full max-w-sm animate-fade-in-scale">
        <div className="rounded-2xl bg-white px-8 py-9 shadow-[0_24px_80px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/70">
          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 shadow-[0_4px_14px_rgba(99,75,229,0.38)]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M2.5 6.5l7.5 5 7.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="1" y="4" width="18" height="12" rx="2" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Forgot your password?</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email and we&apos;ll send a 6-digit reset code.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoFocus
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/20"
              />
              {error && (
                <p className="text-xs text-rose-600">{error}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.38)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(79,70,229,0.5)] disabled:opacity-60 disabled:hover:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                "Send reset code"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-slate-500">
            <Link
              href="/auth/sign-in"
              className="flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-700"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to sign in
            </Link>
            <span>
              No account?{' '}
              <Link href="/auth/sign-up" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Sign up free
              </Link>
            </span>
          </div>
        </div>
      </div>
    </AuthPageShell>
  );
}
