import { LoginForm } from '@/components/signin-form'
import { AuthPageShell } from '../_components/AuthPageShell'

export default function Login() {
  return (
    <AuthPageShell>
      <LoginForm />
    </AuthPageShell>
  )
}
