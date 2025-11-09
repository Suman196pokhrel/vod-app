// app/(public)/verify-email/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/apis/auth.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await authAPI.verifyEmail(token);
      setStatus('success');
      setMessage(response.message || 'Email verified successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/sign-in');
      }, 3000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Failed to verify email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Email Verification</CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'Verifying your email address...'}
            {status === 'success' && 'Your email has been verified!'}
            {status === 'error' && 'Verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Please wait...</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-green-600">Success!</p>
                <p className="text-sm text-gray-600">{message}</p>
                <p className="text-xs text-gray-500">
                  Redirecting to login in 3 seconds...
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/auth/sign-in">Go to Login</Link>
              </Button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <XCircle className="h-16 w-16 text-red-600" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-red-600">Verification Failed</p>
                <p className="text-sm text-gray-600">{message}</p>
              </div>
              <div className="w-full space-y-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/sign-in">Go to Login</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/auth/sign-up">Create New Account</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}