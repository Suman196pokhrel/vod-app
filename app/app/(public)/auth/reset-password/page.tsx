// app/(public)/auth/reset-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Initialize form with Zod schema
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailFromUrl,
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Update email if URL param changes
  useEffect(() => {
    if (emailFromUrl) {
      form.setValue('email', emailFromUrl);
    }
  }, [emailFromUrl, form]);

  // Handle form submission
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

      // Set specific field errors
      if (errorMessage.toLowerCase().includes('code')) {
        form.setError('code', {
          type: 'manual',
          message: 'Invalid or expired code',
        });
      } else if (errorMessage.toLowerCase().includes('email')) {
        form.setError('email', {
          type: 'manual',
          message: 'Email not found',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend code
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

  // Show success state
  if (isSuccess) {
    return (
      <SuccessCard
        title="Password Reset!"
        description="Your password has been successfully reset"
        message="You can now log in with your new password"
        buttonText="Go to Login"
        buttonHref="/auth/sign-in"
      />
    );
  }

  // Show form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="-ml-2">
              <Link href="/auth/forgot-password">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription className="mt-1">
                Enter the code sent to your email and set a new password
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <EmailFormField
                control={form.control}
                name="email"
                disabled={isLoading}
              />

              {/* OTP Code Field */}
              <OTPFormField
                control={form.control}
                name="code"
                disabled={isLoading}
              />

              {/* New Password Field */}
              <PasswordFormField
                control={form.control}
                name="password"
                disabled={isLoading}
                label="New Password"
                description="Must be at least 8 characters long"
                placeholder="Enter new password"
              />

              {/* Confirm Password Field */}
              <PasswordFormField
                control={form.control}
                name="confirmPassword"
                disabled={isLoading}
                label="Confirm New Password"
                description="Re-enter your new password"
                placeholder="Confirm new password"
              />

              {/* Submit Button */}
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>

              {/* Resend Code */}
              <p className="text-center text-sm text-muted-foreground">
                Didn&apos;t receive the code?{' '}
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="p-0 h-auto font-medium"
                >
                  Resend Code
                </Button>
              </p>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              {/* Back to Login */}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/auth/sign-in">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}