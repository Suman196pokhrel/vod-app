"use client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/lib/store"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const router = useRouter()
  const signup = useAuthStore((state) => state.signup)
  
  // Form state
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Error state
  const [errors, setErrors] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string): boolean => {
    return password.length >= 8
  }

  const validateForm = (): boolean => {
    const newErrors = {
      userName: '',
      email: '',
      password: '',
      confirmPassword: '',
    }

    let isValid = true

    // Username validation
    if (!userName.trim()) {
      newErrors.userName = 'Username is required'
      isValid = false
    } else if (userName.trim().length < 3) {
      newErrors.userName = 'Username must be at least 3 characters'
      isValid = false
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required'
      isValid = false
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
      isValid = false
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required'
      isValid = false
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 8 characters'
      isValid = false
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
      isValid = false
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrors({
      userName: '',
      email: '',
      password: '',
      confirmPassword: '',
    })

    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setIsLoading(true)

    try {
      // Call signup API
      await signup(email, userName, password)
      
      // Success
      toast.success('Account created! Please check your email to verify.')
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/sign-in')
      }, 2000)
      
    } catch (error: any) {
      // Handle errors from API
      toast.error(error.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {/* Username Field */}
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={isLoading}
                className={errors.userName ? 'border-red-500' : ''}
              />
              {errors.userName && (
                <p className="text-sm text-red-600 mt-1">{errors.userName}</p>
              )}
            </Field>

            {/* Email Field */}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email ? (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              ) : (
                <FieldDescription>
                  We&apos;ll use this to contact you. We will not share your email
                  with anyone else.
                </FieldDescription>
              )}
            </Field>

            {/* Password Field */}
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password ? (
                <p className="text-sm text-red-600 mt-1">{errors.password}</p>
              ) : (
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              )}
            </Field>

            {/* Confirm Password Field */}
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirm-password"
                type="password"
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
                <FieldDescription>Please confirm your password.</FieldDescription>
              )}
            </Field>

            {/* Submit Buttons */}
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={isLoading}
                  className="w-full"
                >
                  Sign up with Google
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account?{' '}
                  <Link href="/auth/sign-in" className="text-blue-600 hover:underline">
                    Sign in
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}