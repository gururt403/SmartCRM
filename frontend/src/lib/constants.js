export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Converted', 'Lost']
export const LEAD_PRIORITIES = ['Low', 'Medium', 'High']
export const COMPANY_TYPES = ['Startup', 'SMB', 'Mid-Market', 'Enterprise']
export const LEAD_SOURCES = ['Website', 'LinkedIn', 'Referral', 'Instagram', 'Event', 'Cold Call', 'Other']
export const CUSTOMER_STATUSES = ['Active', 'At Risk', 'Churned']
export const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Note', 'Task']
export const TASK_STATUSES = ['Open', 'In Progress', 'Done', 'Cancelled']

/** Which statuses the API will accept next — mirrors the server-side rule so the
 *  UI can grey out impossible moves instead of showing an error afterwards. */
export const LEAD_TRANSITIONS = {
  New: ['New', 'Contacted', 'Qualified', 'Lost'],
  Contacted: ['Contacted', 'Qualified', 'Proposal', 'Lost'],
  Qualified: ['Qualified', 'Proposal', 'Negotiation', 'Lost'],
  Proposal: ['Proposal', 'Negotiation', 'Converted', 'Lost'],
  Negotiation: ['Negotiation', 'Proposal', 'Converted', 'Lost'],
  Converted: ['Converted'],
  Lost: ['Lost', 'Contacted']
}

export const STATUS_VARIANTS = {
  New: 'info',
  Contacted: 'warning',
  Qualified: 'purple',
  Proposal: 'primary',
  Negotiation: 'warning',
  Converted: 'success',
  Lost: 'danger',
  Active: 'success',
  'At Risk': 'warning',
  Churned: 'danger',
  Open: 'info',
  'In Progress': 'warning',
  Done: 'success',
  Cancelled: 'default'
}

export const PRIORITY_VARIANTS = { Low: 'default', Medium: 'info', High: 'danger' }

/** Accessible categorical palette used across every chart. */
export const CHART_COLORS = ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d']
