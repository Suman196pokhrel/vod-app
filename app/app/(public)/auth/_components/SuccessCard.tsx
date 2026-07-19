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
        <div className="rounded-md border border-border bg-card px-8 py-10 text-center">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-md bg-accent">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <path d="M5 14l6 6L23 8" className="stroke-primary" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="text-xl text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>

          {/* Message banner */}
          <div className="mt-5 rounded-md bg-muted px-4 py-3">
            <p className="text-sm font-medium text-foreground">{message}</p>
          </div>

          {/* CTA */}
          <Link
            href={buttonHref}
            className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity duration-(--duration-base) hover:opacity-90"
          >
            {buttonText}
          </Link>
        </div>
      </div>
    </AuthPageShell>
  );
}
