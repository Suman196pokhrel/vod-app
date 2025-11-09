// components/auth/SuccessCard.tsx
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <p className="text-sm text-green-800">✓ {message}</p>
          </div>
          <Button className="w-full" asChild>
            <Link href={buttonHref}>{buttonText}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}