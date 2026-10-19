import { zodResolver } from '@hookform/resolvers/zod'
import { loginInputSchema } from '@gestao-sst/shared'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
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
  const [showPassword, setShowPassword] = useState(false)

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
    return <Navigate to="/" replace />
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const user = await login(values)
      navigate(user.role === 'CLIENT' ? '/portal' : '/dashboard')
    } catch {
      setError('root', { message: 'Credenciais invalidas.' })
    }
  })

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ccfbf1_0,transparent_35%),radial-gradient(circle_at_bottom_right,#e2e8f0_0,transparent_40%),#f0fdfa] px-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden overflow-hidden bg-slate-900 p-8 text-white lg:block">
          <div className="absolute -left-16 top-10 h-48 w-48 rounded-full bg-brand-500/30 blur-2xl" aria-hidden="true" />
          <div className="absolute right-0 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-amber-300/25 blur-2xl" aria-hidden="true" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-200">GESTAO SST</p>
              <h2 className="mt-5 text-3xl font-bold leading-tight">Plataforma Integrada de Saude e Seguranca do Trabalho</h2>
              <p className="mt-4 max-w-sm text-sm text-slate-300">
                Controle clientes, contratos, servicos e financeiro em um fluxo unico com governanca e auditoria.
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm">
              <p className="font-semibold text-brand-200">Ambiente seguro</p>
              <p className="text-slate-300">Acesso protegido por sessao em cookie httpOnly e autorizacao por permissoes.</p>
            </div>
          </div>
        </section>

        <section className="p-5 sm:p-8">
          <Card>
            <div className="mb-7 text-center lg:text-left">
              <p className="text-xs uppercase tracking-wide text-brand-700">GESTAO SST</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Acesso ao sistema</h1>
              <p className="mt-1 text-sm text-slate-600">Entre com seu email e senha para continuar.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <Input id="email" type="email" autoComplete="email" placeholder="seuemail@empresa.com" {...register('email')} />
                {errors.email?.message ? <p className="mt-1 text-xs text-red-700">{errors.email.message}</p> : null}
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className="pr-20"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((state) => !state)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {errors.password?.message ? <p className="mt-1 text-xs text-red-700">{errors.password.message}</p> : null}
                <div className="mt-2 text-right">
                  <Link
                    to="/recuperar-senha"
                    className="text-xs font-medium text-brand-700 transition hover:text-brand-900"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
              </div>

              {errors.root?.message ? <Alert type="error">{errors.root.message}</Alert> : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </Card>
        </section>
      </div>
    </div>
  )
}