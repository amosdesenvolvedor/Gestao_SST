import { zodResolver } from '@hookform/resolvers/zod'
import { loginInputSchema } from '@gestao-sst/shared'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Alert } from '@/components/alert'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { Input } from '@/components/input'
import { useAuth } from './auth-context'

type LoginFormData = z.infer<typeof loginInputSchema>

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values)
      navigate('/dashboard')
    } catch {
      setError('root', { message: 'Credenciais invalidas.' })
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-wide text-brand-700">GESTAO SST</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Acesso ao sistema</h1>
            <p className="mt-1 text-sm text-slate-600">Plataforma Integrada de Saude e Seguranca do Trabalho</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email?.message ? <p className="mt-1 text-xs text-red-700">{errors.email.message}</p> : null}
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Senha
              </label>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password?.message ? <p className="mt-1 text-xs text-red-700">{errors.password.message}</p> : null}
            </div>

            {errors.root?.message ? <Alert type="error">{errors.root.message}</Alert> : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}