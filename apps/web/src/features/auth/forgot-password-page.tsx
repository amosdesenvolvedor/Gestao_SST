import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/alert'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { Input } from '@/components/input'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ccfbf1_0,transparent_35%),radial-gradient(circle_at_bottom_right,#e2e8f0_0,transparent_40%),#f0fdfa] px-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden overflow-hidden bg-slate-900 p-8 text-white lg:block">
          <div className="absolute -left-16 top-10 h-48 w-48 rounded-full bg-brand-500/30 blur-2xl" aria-hidden="true" />
          <div className="absolute right-0 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-amber-300/25 blur-2xl" aria-hidden="true" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-200">GESTAO SST</p>
              <h1 className="mt-5 text-3xl font-bold leading-tight">Recuperacao de acesso</h1>
              <p className="mt-4 max-w-sm text-sm text-slate-300">
                Informe seu email para receber orientacoes de redefinicao de senha com seguranca.
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm">
              <p className="font-semibold text-brand-200">Fluxo protegido</p>
              <p className="text-slate-300">Por seguranca, sempre exibimos uma mensagem neutra para evitar enumeracao de usuarios.</p>
            </div>
          </div>
        </section>

        <section className="p-5 sm:p-8">
          <Card>
            <div className="mb-7 text-center lg:text-left">
              <p className="text-xs uppercase tracking-wide text-brand-700">GESTAO SST</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Esqueceu sua senha?</h2>
              <p className="mt-1 text-sm text-slate-600">Digite seu email para solicitar a recuperacao de acesso.</p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                setSubmitted(true)
              }}
              className="space-y-4"
              noValidate
            >
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seuemail@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              {submitted ? (
                <Alert>
                  Se o email estiver cadastrado, voce recebera as instrucoes de redefinicao em instantes.
                </Alert>
              ) : null}

              <Button type="submit" className="w-full">
                Enviar instrucoes
              </Button>
            </form>

            <div className="mt-4 text-center lg:text-left">
              <Link to="/login" className="text-sm font-medium text-brand-700 transition hover:text-brand-900">
                Voltar para o login
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
