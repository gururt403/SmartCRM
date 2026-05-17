import { useState } from 'react'
import api from '../services/api'

const resultBox = 'rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur'

export default function Predictions() {
  const [leadForm, setLeadForm] = useState({
    budget: 50000,
    interaction_count: 10,
    company_type: 'Enterprise',
    response_rate: 0.7,
    previous_purchases: 2
  })
  const [sentimentText, setSentimentText] = useState('We are very happy with the service and would like to continue.')
  const [churnForm, setChurnForm] = useState({
    engagement_score: 0.75,
    support_tickets: 1,
    days_since_last_purchase: 20
  })
  const [emailMessage, setEmailMessage] = useState('I want pricing details.')
  const [leadResult, setLeadResult] = useState(null)
  const [sentimentResult, setSentimentResult] = useState(null)
  const [churnResult, setChurnResult] = useState(null)
  const [emailResult, setEmailResult] = useState([])

  const [loading, setLoading] = useState({})

  const setPanelLoading = (panel, value) => setLoading((current) => ({ ...current, [panel]: value }))

  const handleLeadScore = async (event) => {
    event.preventDefault()
    setPanelLoading('lead', true)
    try {
      const response = await api.post('/predictions/lead-score', leadForm)
      setLeadResult(response.data)
    } finally {
      setPanelLoading('lead', false)
    }
  }

  const handleSentiment = async (event) => {
    event.preventDefault()
    setPanelLoading('sentiment', true)
    try {
      const response = await api.post('/predictions/sentiment', { text: sentimentText })
      setSentimentResult(response.data)
    } finally {
      setPanelLoading('sentiment', false)
    }
  }

  const handleChurn = async (event) => {
    event.preventDefault()
    setPanelLoading('churn', true)
    try {
      const response = await api.post('/predictions/churn', churnForm)
      setChurnResult(response.data)
    } finally {
      setPanelLoading('churn', false)
    }
  }

  const handleEmail = async (event) => {
    event.preventDefault()
    setPanelLoading('email', true)
    try {
      const response = await api.post('/predictions/email-suggestions', { message: emailMessage })
      setEmailResult(response.data.suggestions)
    } finally {
      setPanelLoading('email', false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={handleLeadScore} className={resultBox}>
        <h3 className="text-lg font-semibold text-white">AI Lead Scoring</h3>
        <p className="mt-1 text-sm text-slate-400">RandomForestClassifier output for conversion prediction.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <input className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" type="number" value={leadForm.budget} onChange={(e) => setLeadForm({ ...leadForm, budget: Number(e.target.value) })} placeholder="Budget" />
          <input className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" type="number" value={leadForm.interaction_count} onChange={(e) => setLeadForm({ ...leadForm, interaction_count: Number(e.target.value) })} placeholder="Interactions" />
          <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" value={leadForm.company_type} onChange={(e) => setLeadForm({ ...leadForm, company_type: e.target.value })}>
            {['Startup', 'SMB', 'Mid-Market', 'Enterprise'].map((option) => <option key={option}>{option}</option>)}
          </select>
          <input className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" type="number" step="0.01" value={leadForm.response_rate} onChange={(e) => setLeadForm({ ...leadForm, response_rate: Number(e.target.value) })} placeholder="Response rate" />
          <input className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white sm:col-span-2" type="number" value={leadForm.previous_purchases} onChange={(e) => setLeadForm({ ...leadForm, previous_purchases: Number(e.target.value) })} placeholder="Previous purchases" />
        </div>
        <button className="mt-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white" type="submit">
          {loading.lead ? 'Predicting...' : 'Predict Conversion'}
        </button>
        {leadResult ? (
          <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            <p>Lead Score: {leadResult.percentage}%</p>
            <p>Result: {leadResult.label}</p>
            <p>Conversion Badge: {leadResult.badge}</p>
          </div>
        ) : null}
      </form>

      <form onSubmit={handleSentiment} className={resultBox}>
        <h3 className="text-lg font-semibold text-white">Customer Sentiment Analysis</h3>
        <p className="mt-1 text-sm text-slate-400">TextBlob-powered sentiment detection.</p>
        <textarea
          rows="8"
          value={sentimentText}
          onChange={(e) => setSentimentText(e.target.value)}
          className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
        />
        <button className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 font-semibold text-white" type="submit">
          {loading.sentiment ? 'Analyzing...' : 'Analyze Sentiment'}
        </button>
        {sentimentResult ? (
          <div className={`mt-4 rounded-2xl p-4 text-sm ${sentimentResult.label === 'Positive' ? 'bg-emerald-500/10 text-emerald-100' : sentimentResult.label === 'Negative' ? 'bg-rose-500/10 text-rose-100' : 'bg-slate-500/10 text-slate-100'}`}>
            <p>Sentiment: {sentimentResult.label}</p>
            <p>Score: {sentimentResult.score}</p>
            <p>Confidence: {sentimentResult.confidence}%</p>
          </div>
        ) : null}
      </form>

      <form onSubmit={handleChurn} className={resultBox}>
        <h3 className="text-lg font-semibold text-white">Customer Churn Prediction</h3>
        <p className="mt-1 text-sm text-slate-400">Logistic Regression estimates churn risk.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <input className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" type="number" step="0.01" value={churnForm.engagement_score} onChange={(e) => setChurnForm({ ...churnForm, engagement_score: Number(e.target.value) })} placeholder="Engagement score" />
          <input className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" type="number" value={churnForm.support_tickets} onChange={(e) => setChurnForm({ ...churnForm, support_tickets: Number(e.target.value) })} placeholder="Support tickets" />
          <input className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white sm:col-span-2" type="number" value={churnForm.days_since_last_purchase} onChange={(e) => setChurnForm({ ...churnForm, days_since_last_purchase: Number(e.target.value) })} placeholder="Days since last purchase" />
        </div>
        <button className="mt-4 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-3 font-semibold text-white" type="submit">
          {loading.churn ? 'Predicting...' : 'Predict Churn'}
        </button>
        {churnResult ? (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
            <p>Churn Probability: {churnResult.percentage}%</p>
            <p>Risk Level: {churnResult.risk_level}</p>
          </div>
        ) : null}
      </form>

      <form onSubmit={handleEmail} className={resultBox}>
        <h3 className="text-lg font-semibold text-white">Smart Email Reply Suggestions</h3>
        <p className="mt-1 text-sm text-slate-400">Keyword-based professional response templates.</p>
        <textarea
          rows="4"
          value={emailMessage}
          onChange={(e) => setEmailMessage(e.target.value)}
          className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
        />
        <button className="mt-4 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-3 font-semibold text-white" type="submit">
          {loading.email ? 'Generating...' : 'Generate Replies'}
        </button>
        <div className="mt-4 space-y-3">
          {emailResult.map((suggestion) => (
            <div key={suggestion} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              {suggestion}
            </div>
          ))}
        </div>
      </form>
    </div>
  )
}
