import { LoginForm } from '@/components/signin-form'
import { Button } from '@/components/ui/button'
import { MoveLeft } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const Login = () => {
  return (
    <div className='text-7xl flex gap-5 mt-20 justify-center font-extrabold w-screen'>
        <div className=''>
          <Link href={"/"}>
          <Button variant={"outline"}>
            <MoveLeft />
          </Button>
          </Link>
        </div>
        <div className='w-2/6'>
          <LoginForm />
        </div>
    </div>
  )
}

export default Login