import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password')
})

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters')
})

export default function Auth() {
  const navigate = useNavigate()
  const { login, register: registerUser } = useAuth()
  const [tab, setTab] = useState('login')

  return (
    <div className="flex min-h-screen">
      {/* Marketing panel — hidden on small screens so the form gets the space. */}
      <aside className="hidden w-1/2 flex-col justify-between bg-[linear-gradient(140deg,#eff6ff_0%,#ede9fe_55%,#fdf2f8_100%)] p-10 lg:flex dark:bg-[linear-gradient(140deg,#111827_0%,#1e1b2e_55%,#2a1f2b_100%)]">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-sm font-bold text-primary-foreground">S</span>
          <span className="font-semibold">SmartCRM</span>
        </div>
        <div className="max-w-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border bg-background/70 shadow-sm">
            <LayoutGrid className="h-6 w-6 text-primary" aria-hidden />
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">One workspace for leads, deals and follow-ups.</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Track the whole journey — lead, qualification, deal, close — with scoring and churn signals built in.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Runs entirely on your machine. No external services.</p>
      </aside>

      <main className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            {tab === 'login' ? 'Sign in to SmartCRM' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === 'login' ? 'Welcome back.' : 'New accounts start with the salesperson role.'}
          </p>

          <Tabs value={tab} onValueChange={setTab} className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Sign in</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <AuthForm
                schema={loginSchema}
                fields={[
                  { name: 'email', label: 'Email', type: 'email', placeholder: 'you@company.com', autoComplete: 'email' },
                  { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' }
                ]}
                submitLabel="Sign in"
                mutation={login}
                onDone={() => navigate('/home', { replace: true })}
              />
              <div className="mt-6 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Demo accounts</p>
                <p className="mt-1">admin@smartcrm.local · admin123</p>
                <p>sales@smartcrm.local · sales123</p>
                <p className="mt-1.5">Seeded only in development, and configurable via environment variables.</p>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <AuthForm
                schema={registerSchema}
                fields={[
                  { name: 'name', label: 'Full name', placeholder: 'Jane Cooper', autoComplete: 'name' },
                  { name: 'email', label: 'Email', type: 'email', placeholder: 'you@company.com', autoComplete: 'email' },
                  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', hint: 'At least 8 characters' }
                ]}
                submitLabel="Create account"
                mutation={registerUser}
                onDone={() => setTab('login')}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

function AuthForm({ schema, fields, submitLabel, mutation, onDone }) {
  const { register, handleSubmit, setError, formState } = useForm({ resolver: zodResolver(schema), mode: 'onBlur' })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
      onDone()
    } catch (error) {
      const fieldErrors = error.fieldErrors || {}
      if (Object.keys(fieldErrors).length) {
        Object.entries(fieldErrors).forEach(([field, message]) => setError(field, { message }))
      } else {
        setError('root', { message: error.message })
      }
    }
  })

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
      {fields.map((field) => (
        <div key={field.name}>
          <Label htmlFor={field.name} className="mb-1.5 block">{field.label}</Label>
          <Input
            id={field.name}
            type={field.type || 'text'}
            placeholder={field.placeholder}
            autoComplete={field.autoComplete}
            invalid={!!formState.errors[field.name]}
            {...register(field.name)}
          />
          {formState.errors[field.name] ? (
            <p className="mt-1 text-xs text-destructive" role="alert">{formState.errors[field.name].message}</p>
          ) : field.hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>
          ) : null}
        </div>
      ))}

      {formState.errors.root ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {formState.errors.root.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full" loading={mutation.isPending}>{submitLabel}</Button>
    </form>
  )
}
