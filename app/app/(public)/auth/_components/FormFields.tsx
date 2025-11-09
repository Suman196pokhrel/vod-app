// components/auth/FormFields.tsx
import { Mail, Lock, KeyRound } from 'lucide-react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Control } from 'react-hook-form';

interface FormFieldProps {
  control: Control<any>;
  name: string;
  disabled?: boolean;
}

export function EmailFormField({ control, name, disabled }: FormFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Mail className="inline h-4 w-4 mr-1.5" />
            Email Address
          </FormLabel>
          <FormControl>
            <Input
              type="email"
              placeholder="m@example.com"
              disabled={disabled}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function OTPFormField({ control, name, disabled }: FormFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <KeyRound className="inline h-4 w-4 mr-1.5" />
            6-Digit Verification Code
          </FormLabel>
          <FormControl>
            <div className="flex justify-center">
              <InputOTP maxLength={6} disabled={disabled} {...field}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </FormControl>
          <FormDescription className="text-center">
            Enter the code sent to your email
          </FormDescription>
          <FormMessage className="text-center" />
        </FormItem>
      )}
    />
  );
}

interface PasswordFormFieldProps extends FormFieldProps {
  label?: string;
  description?: string;
  placeholder?: string;
}

export function PasswordFormField({
  control,
  name,
  disabled,
  label = 'Password',
  description,
  placeholder = 'Enter your password',
}: PasswordFormFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Lock className="inline h-4 w-4 mr-1.5" />
            {label}
          </FormLabel>
          <FormControl>
            <Input
              type="password"
              placeholder={placeholder}
              disabled={disabled}
              {...field}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}