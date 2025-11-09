// app/(public)/auth/reset-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authAPI } from '@/lib/apis/auth.api';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Key, Lock, Mail } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [errors, setErrors] = useState({
    email: '',
    code: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [emailFromUrl]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors = {
      email: '',
      code: '',
      password: '',
      confirmPassword: '',
    };
    let isValid = true;

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    }

    // Code validation (6 digits)
    if (!code.trim()) {
      newErrors.code = 'Reset code is required';
      isValid = false;
    } else if (!/^\d{6}$/.test(code)) {
      newErrors.code = 'Code must be exactly 6 digits';
      isValid = false;
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear errors
    setErrors({
      email: '',
      code: '',
      password: '',
      confirmPassword: '',
    });

    // Validate
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.resetPassword(email, code, password);
      setIsSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to reset password';
      toast.error(errorMessage);
      
      // Handle specific errors
      if (errorMessage.includes('code')) {
        setErrors(prev => ({ ...prev, code: 'Invalid or expired code' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input (only allow digits, max 6)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 6) {
      setCode(value);
    }
  };

  // Success State
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Password Reset!</CardTitle>
            <CardDescription className="text-base">
              Your password has been successfully reset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="text-sm text-green-800">
                ✓ You can now log in with your new password
              </p>
            </div>

            <Button className="w-full" asChild>
              <Link href="/auth/sign-in">
                Go to Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form State
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
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
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {/* Email Field */}
              <Field>
                <FieldLabel htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email Address
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
              </Field>

              {/* 6-Digit Code Field */}
              <Field>
                <FieldLabel htmlFor="code">
                  <Key className="inline h-4 w-4 mr-1" />
                  6-Digit Code
                </FieldLabel>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={handleCodeChange}
                  disabled={isLoading}
                  className={`text-center text-2xl tracking-widest font-mono ${
                    errors.code ? 'border-red-500' : ''
                  }`}
                  maxLength={6}
                  autoComplete="off"
                />
                {errors.code ? (
                  <p className="text-sm text-red-600 mt-1">{errors.code}</p>
                ) : (
                  <FieldDescription>
                    Enter the code sent to your email
                  </FieldDescription>
                )}
              </Field>

              {/* New Password Field */}
              <Field>
                <FieldLabel htmlFor="password">
                  <Lock className="inline h-4 w-4 mr-1" />
                  New Password
                </FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password ? (
                  <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                ) : (
                  <FieldDescription>
                    Must be at least 8 characters long
                  </FieldDescription>
                )}
              </Field>

              {/* Confirm Password Field */}
              <Field>
                <FieldLabel htmlFor="confirm-password">
                  <Lock className="inline h-4 w-4 mr-1" />
                  Confirm New Password
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                {errors.confirmPassword ? (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.confirmPassword}
                  </p>
                ) : (
                  <FieldDescription>Re-enter your new password</FieldDescription>
                )}
              </Field>

              {/* Submit Button */}
              <Field>
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
              </Field>

              {/* Resend Code */}
              <FieldDescription className="text-center">
                Didn&apos;t receive the code?{' '}
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      toast.error('Please enter your email');
                      return;
                    }
                    try {
                      await authAPI.forgotPassword(email);
                      toast.success('New code sent!');
                    } catch (error) {
                      toast.error('Failed to resend code');
                    }
                  }}
                  className="text-blue-600 hover:underline font-medium"
                  disabled={isLoading}
                >
                  Resend Code
                </button>
              </FieldDescription>

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

              <Button variant="outline" className="w-full" asChild>
                <Link href="/auth/sign-in">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}