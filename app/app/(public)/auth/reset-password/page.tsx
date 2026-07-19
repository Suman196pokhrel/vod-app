// app/(public)/auth/reset-password/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import { Form } from '@/components/ui/form';
import { toast } from 'sonner';

import {
  EmailFormField,
  OTPFormField,
  PasswordFormField,
} from '../_components/FormFields';
import { SuccessCard } from '../_components/SuccessCard';
import { authAPI } from '@/lib/apis/auth.api';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/lib/schemas/auth.schema';
import { AuthPageShell } from '../_components/AuthPageShell';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailFromUrl,
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (emailFromUrl) {
      form.setValue('email', emailFromUrl);
    }
  }, [emailFromUrl, form]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setIsLoading(true);

    try {
      await authAPI.resetPassword(values.email, values.code, values.password);
      setIsSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || 'Failed to reset password';
      toast.error(errorMessage);

      if (errorMessage.toLowerCase().includes('code')) {
        form.setError('code', { type: 'manual', message: 'Invalid or expired code' });
      } else if (errorMessage.toLowerCase().includes('email')) {
        form.setError('email', { type: 'manual', message: 'Email not found' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast.error('Please enter your email first');
      return;
    }
    try {
      await authAPI.forgotPassword(email);
      toast.success('New code sent to your email!');
    } catch (error) {
      toast.error('Failed to resend code');
    }
  };

  if (isSuccess) {
    return <SuccessCard
      title="Password Reset!"
      description="Your password has been successfully reset"
      message="You can now log in with your new password"
      buttonText="Go to Login"
      buttonHref="/auth/sign-in"
    />;
  }

  return (
    <AuthPageShell>
      <div className="w-full max-w-sm animate-fade-in-scale">
        <div className="rounded-md border border-border bg-card px-8 py-9">
          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-foreground">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="5" y="9" width="10" height="8" rx="1.5" style={{ stroke: "var(--background)" }} strokeWidth="1.5"/>
                <path d="M7 9V6a3 3 0 1 1 6 0v3" style={{ stroke: "var(--background)" }} strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="10" cy="13" r="1.2" style={{ fill: "var(--background)" }}/>
              </svg>
            </div>
            <h1 className="text-xl text-foreground">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the code sent to your email and choose a new password.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <EmailFormField control={form.control} name="email" disabled={isLoading} />
              <OTPFormField control={form.control} name="code" disabled={isLoading} />
              <PasswordFormField
                control={form.control}
                name="password"
                disabled={isLoading}
                label="New Password"
                description="Must be at least 8 characters long"
                placeholder="Enter new password"
              />
              <PasswordFormField
                control={form.control}
                name="confirmPassword"
                disabled={isLoading}
                label="Confirm New Password"
                description="Re-enter your new password"
                placeholder="Confirm new password"
              />

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity duration-(--duration-base) hover:opacity-90 disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Resetting...
                  </span>
                ) : (
                  'Reset password'
                )}
              </button>

              {/* Resend code */}
              <p className="text-center text-xs text-muted-foreground">
                Didn&apos;t receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground disabled:opacity-60"
                >
                  Resend code
                </button>
              </p>
            </form>
          </Form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <Link
              href="/auth/sign-in"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </AuthPageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
