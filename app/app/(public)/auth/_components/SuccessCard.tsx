// components/auth/SuccessCard.tsx
import Link from 'next/link';
import { AuthPageShell } from './AuthPageShell';

interface SuccessCardProps {
  title: string;
  description: string;
  message: string;
  buttonText?: string;
  buttonHref?: string;
}

export function SuccessCard({
  title,
  description,
  message,
  buttonText = 'Go to Login',
  buttonHref = '/auth/sign-in',
}: SuccessCardProps) {
  return (
    <AuthPageShell>
      <div className="w-full max-w-sm animate-fade-in-scale">
        <div className="rounded-2xl bg-white px-8 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/70">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 shadow-[0_4px_14px_rgba(16,185,129,0.38)]">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <path d="M5 14l6 6L23 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>

          {/* Message banner */}
          <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200/70">
            <p className="text-sm font-medium text-emerald-700">{message}</p>
          </div>

          {/* CTA */}
          <Link
            href={buttonHref}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.38)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(79,70,229,0.5)]"
          >
            {buttonText}
          </Link>
        </div>
      </div>
    </AuthPageShell>
  );
}
