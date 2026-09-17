import { useState } from 'react'
import { Copy, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Meter } from '@/components/ui/misc'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/states'
import { Field, SelectField } from '@/components/leads/LeadForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { useLeads, usePrediction, usePredictionHistory } from '@/hooks/use-crm'
import { COMPANY_TYPES } from '@/lib/constants'
import { formatPercent, formatRelative } from '@/lib/utils'

export default function Predictions() {
  return (
    <div className="notion-page animate-fade-in">
      <PageHeader
        icon={Sparkles}
        title="AI Studio"
        description="Score leads, estimate churn, read sentiment and draft replies. Results are saved against the lead."
      />
      <Tabs defaultValue="score">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="score">Lead scoring</TabsTrigger>
          <TabsTrigger value="churn">Churn risk</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="email">Reply drafts</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="score"><LeadScoring /></TabsContent>
        <TabsContent value="churn"><ChurnRisk /></TabsContent>
        <TabsContent value="sentiment"><Sentiment /></TabsContent>
        <TabsContent value="email"><EmailDrafts /></TabsContent>
        <TabsContent value="history"><History /></TabsContent>
      </Tabs>
    </div>
  )
}

function useLeadOptions() {
  const { data } = useLeads({ page: 1, page_size: 50, sort_by: 'updated_at', sort_dir: 'desc' })
  return [{ value: '', label: 'Not linked to a lead' }].concat(
    (data?.data || []).map((lead) => ({ value: String(lead.id), label: `${lead.name} — ${lead.company}` }))
  )
}

function ResultPanel({ result, children }) {
  if (!result) return null
  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-4">
      {children}
      {result.source ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Computed by the {result.source === 'heuristic' || result.source === 'lexicon' ? 'built-in fallback' : 'trained model'}.
        </p>
      ) : null}
    </div>
  )
}

function LeadScoring() {
  const leadOptions = useLeadOptions()
  const prediction = usePrediction('lead-score')
  const [form, setForm] = useState({ lead_id: '', budget: 25000, interaction_count: 5, company_type: 'SMB', response_rate: 0.4, previous_purchases: 0 })
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = (event) => {
    event.preventDefault()
    prediction.mutate({
      lead_id: form.lead_id ? Number(form.lead_id) : undefined,
      budget: Number(form.budget),
      interaction_count: Number(form.interaction_count),
      company_type: form.company_type,
      response_rate: Number(form.response_rate),
      previous_purchases: Number(form.previous_purchases)
    })
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Lead" value={form.lead_id} onChange={set('lead_id')} options={leadOptions} className="sm:col-span-2" />
        <Field label="Budget (USD)"><Input type="number" min="0" value={form.budget} onChange={(e) => set('budget')(e.target.value)} /></Field>
        <SelectField label="Company type" value={form.company_type} onChange={set('company_type')} options={COMPANY_TYPES} />
        <Field label="Interactions"><Input type="number" min="0" value={form.interaction_count} onChange={(e) => set('interaction_count')(e.target.value)} /></Field>
        <Field label="Response rate (0–1)"><Input type="number" min="0" max="1" step="0.05" value={form.response_rate} onChange={(e) => set('response_rate')(e.target.value)} /></Field>
        <Field label="Previous purchases"><Input type="number" min="0" value={form.previous_purchases} onChange={(e) => set('previous_purchases')(e.target.value)} /></Field>
      </div>
      <Button type="submit" className="mt-4" loading={prediction.isPending}>
        <Sparkles className="h-4 w-4" />Score lead
      </Button>

      <ResultPanel result={prediction.data}>
        <p className="text-sm text-muted-foreground">Conversion probability</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatPercent(prediction.data?.probability, 1)}</p>
        <Meter value={prediction.data?.probability} tone="success" className="mt-2" />
        <Badge variant="primary" className="mt-3">{prediction.data?.label}</Badge>
      </ResultPanel>
    </form>
  )
}

function ChurnRisk() {
  const leadOptions = useLeadOptions()
  const prediction = usePrediction('churn')
  const [form, setForm] = useState({ lead_id: '', engagement_score: 0.5, support_tickets: 1, days_since_last_purchase: 30 })
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = (event) => {
    event.preventDefault()
    prediction.mutate({
      lead_id: form.lead_id ? Number(form.lead_id) : undefined,
      engagement_score: Number(form.engagement_score),
      support_tickets: Number(form.support_tickets),
      days_since_last_purchase: Number(form.days_since_last_purchase)
    })
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Lead" value={form.lead_id} onChange={set('lead_id')} options={leadOptions} className="sm:col-span-2" />
        <Field label="Engagement score (0–1)"><Input type="number" min="0" max="1" step="0.05" value={form.engagement_score} onChange={(e) => set('engagement_score')(e.target.value)} /></Field>
        <Field label="Support tickets"><Input type="number" min="0" value={form.support_tickets} onChange={(e) => set('support_tickets')(e.target.value)} /></Field>
        <Field label="Days since last purchase"><Input type="number" min="0" value={form.days_since_last_purchase} onChange={(e) => set('days_since_last_purchase')(e.target.value)} /></Field>
      </div>
      <Button type="submit" className="mt-4" loading={prediction.isPending}><Sparkles className="h-4 w-4" />Estimate churn</Button>

      <ResultPanel result={prediction.data}>
        <p className="text-sm text-muted-foreground">Churn probability</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatPercent(prediction.data?.probability, 1)}</p>
        <Meter value={prediction.data?.probability} tone="danger" className="mt-2" />
        <Badge variant="danger" className="mt-3">{prediction.data?.risk_level}</Badge>
      </ResultPanel>
    </form>
  )
}

function Sentiment() {
  const leadOptions = useLeadOptions()
  const prediction = usePrediction('sentiment')
  const [leadId, setLeadId] = useState('')
  const [text, setText] = useState('')

  const submit = (event) => {
    event.preventDefault()
    if (!text.trim()) return
    prediction.mutate({ lead_id: leadId ? Number(leadId) : undefined, text: text.trim() })
  }

  const tone = { Positive: 'success', Neutral: 'default', Negative: 'danger' }[prediction.data?.label] || 'default'

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-4">
      <SelectField label="Lead" value={leadId} onChange={setLeadId} options={leadOptions} className="mb-4" />
      <Field label="Message from the customer">
        <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste an email or call note…" className="min-h-[120px]" />
      </Field>
      <Button type="submit" className="mt-4" loading={prediction.isPending} disabled={!text.trim()}>
        <Sparkles className="h-4 w-4" />Analyse sentiment
      </Button>

      <ResultPanel result={prediction.data}>
        <Badge variant={tone}>{prediction.data?.label}</Badge>
        <p className="mt-2 text-sm text-muted-foreground">
          Polarity {prediction.data?.score} · confidence {prediction.data?.confidence}%
        </p>
      </ResultPanel>
    </form>
  )
}

function EmailDrafts() {
  const prediction = usePrediction('email')
  const [message, setMessage] = useState('')

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Your browser blocked clipboard access')
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (message.trim()) prediction.mutate({ message: message.trim() })
      }}
      className="rounded-lg border bg-card p-4"
    >
      <Field label="Their message">
        <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Could you send pricing for 20 seats?" className="min-h-[120px]" />
      </Field>
      <Button type="submit" className="mt-4" loading={prediction.isPending} disabled={!message.trim()}>
        <Sparkles className="h-4 w-4" />Suggest replies
      </Button>

      {prediction.data ? (
        <ul className="mt-4 space-y-2">
          {prediction.data.suggestions.map((suggestion) => (
            <li key={suggestion} className="group flex items-start gap-2 rounded-lg border p-3">
              <p className="flex-1 text-sm">{suggestion}</p>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(suggestion)} aria-label="Copy reply">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  )
}

function History() {
  const { data, isLoading } = usePredictionHistory()
  if (isLoading) return <p className="py-6 text-sm text-muted-foreground">Loading…</p>
  if (!data?.length) return <EmptyState title="Nothing scored yet" description="Run a prediction and it will be recorded here." className="rounded-lg border" />

  return (
    <ul className="divide-y rounded-lg border bg-card">
      {data.map((row) => (
        <li key={row.id} className="flex items-center gap-3 px-4 py-2.5">
          <Badge variant="outline">{row.prediction_type.replace('_', ' ')}</Badge>
          <span className="min-w-0 flex-1 truncate text-sm">{row.lead_name || 'Unlinked'}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(row.created_at)}</span>
        </li>
      ))}
    </ul>
  )
}
