import { useEffect, useState } from 'react'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const blankLead = {
  name: '',
  email: '',
  phone: '',
  company: '',
  budget: '',
  lead_source: 'Website',
  status: 'New',
  last_contact_date: '',
  company_type: 'SMB',
  interaction_count: 0,
  response_rate: 0,
  previous_purchases: 0,
  sentiment_label: 'Neutral'
}

const statusColors = {
  New: 'bg-sky-500/20 text-sky-200',
  Contacted: 'bg-amber-500/20 text-amber-200',
  Negotiation: 'bg-fuchsia-500/20 text-fuchsia-200',
  Converted: 'bg-emerald-500/20 text-emerald-200',
  Lost: 'bg-rose-500/20 text-rose-200'
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [form, setForm] = useState(blankLead)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchLeads = async (query = search, status = statusFilter) => {
    setLoading(true)
    try {
      const response = await api.get('/leads', { params: { search: query, status } })
      setLeads(response.data.leads)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads('', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startEdit = (lead) => {
    setEditingId(lead.id)
    setForm({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      budget: lead.budget ?? '',
      lead_source: lead.lead_source || 'Website',
      status: lead.status || 'New',
      last_contact_date: lead.last_contact_date || '',
      company_type: lead.company_type || 'SMB',
      interaction_count: lead.interaction_count || 0,
      response_rate: lead.response_rate || 0,
      previous_purchases: lead.previous_purchases || 0,
      sentiment_label: lead.sentiment_label || 'Neutral'
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(blankLead)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/leads/${editingId}`, form)
      } else {
        await api.post('/leads', form)
      }
      resetForm()
      await fetchLeads()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (leadId) => {
    if (!window.confirm('Delete this lead?')) {
      return
    }
    await api.delete(`/leads/${leadId}`)
    fetchLeads()
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    fetchLeads(search, statusFilter)
  }

  if (loading) {
    return <LoadingSpinner label="Loading leads..." />
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{editingId ? 'Edit Lead' : 'Add Lead'}</h3>
            {editingId ? (
              <button type="button" onClick={resetForm} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
                Cancel
              </button>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['name', 'Name'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['company', 'Company'],
              ['budget', 'Budget'],
              ['last_contact_date', 'Last Contact Date']
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-2 block text-sm text-slate-300">{label}</label>
                <input
                  type={key === 'budget' ? 'number' : key === 'last_contact_date' ? 'date' : 'text'}
                  value={form[key]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                />
              </div>
            ))}
            <div>
              <label className="mb-2 block text-sm text-slate-300">Lead Source</label>
              <select
                value={form.lead_source}
                onChange={(event) => setForm({ ...form, lead_source: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                {['Website', 'LinkedIn', 'Referral', 'Instagram', 'Event', 'Cold Call'].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Status</label>
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                {['New', 'Contacted', 'Negotiation', 'Converted', 'Lost'].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Company Type</label>
              <select
                value={form.company_type}
                onChange={(event) => setForm({ ...form, company_type: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                {['Startup', 'SMB', 'Mid-Market', 'Enterprise'].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            {[
              ['interaction_count', 'Interaction Count'],
              ['response_rate', 'Response Rate'],
              ['previous_purchases', 'Previous Purchases']
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-2 block text-sm text-slate-300">{label}</label>
                <input
                  type="number"
                  step={key === 'response_rate' ? '0.01' : '1'}
                  value={form[key]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="mb-2 block text-sm text-slate-300">Sentiment Label</label>
            <select
              value={form.sentiment_label}
              onChange={(event) => setForm({ ...form, sentiment_label: event.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
            >
              {['Positive', 'Neutral', 'Negative'].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : editingId ? 'Update Lead' : 'Create Lead'}
          </button>
        </form>

        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur">
          <form onSubmit={handleSearch} className="mb-4 grid gap-3 md:grid-cols-[1.3fr_0.7fr_auto]">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, company..."
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
            >
              <option value="">All Statuses</option>
              {['New', 'Contacted', 'Negotiation', 'Converted', 'Lost'].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <button type="submit" className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950">
              Search
            </button>
          </form>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="max-h-[760px] overflow-auto">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    {['Lead', 'Company', 'Status', 'Budget', 'AI Scores', 'Actions'].map((heading) => (
                      <th key={heading} className="px-4 py-3 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{lead.name}</p>
                        <p className="text-xs text-slate-400">{lead.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{lead.company}</p>
                        <p className="text-xs text-slate-400">{lead.lead_source}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[lead.status] || 'bg-white/10 text-slate-200'}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">${Number(lead.budget || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        <p>Conversion: {Math.round((lead.conversion_probability || 0) * 100)}%</p>
                        <p>Churn: {Math.round((lead.churn_probability || 0) * 100)}%</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(lead)} className="rounded-xl border border-cyan-500/30 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(lead.id)} className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/10">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!leads.length ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-slate-400">
                        No leads found. Add one using the form.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
