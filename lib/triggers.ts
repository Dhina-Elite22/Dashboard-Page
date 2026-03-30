// ─── Intellizence Trigger Name Mapping ──────────────────────────────────────────
// Updated triggers requested by user.

export interface TriggerEntry {
  code: string;
  label: string;
}

export const ALL_TRIGGERS: TriggerEntry[] = [
  { code: 'Alliance & Partnership', label: 'Alliance & Partnership' },
  { code: 'Alliance & Partnership Termination', label: 'Alliance & Partnership Termination' },
  { code: 'Awards & Recognition', label: 'Awards & Recognition' },
  { code: 'Business Expansion', label: 'Business Expansion' },
  { code: 'Business Outlook & Projections', label: 'Business Outlook & Projections' },
  { code: 'Business Shut-Down', label: 'Business Shut-Down' },
  { code: 'Class Action', label: 'Class Action' },
  { code: 'Cost Cutting', label: 'Cost Cutting' },
  { code: 'Customer Acquisition/Growth', label: 'Customer Acquisition/Growth' },
  { code: 'Divestment', label: 'Divestment' },
  { code: 'Employee Benefit', label: 'Employee Benefit' },
  { code: 'Events & Conferences', label: 'Events & Conferences' },
  { code: 'Executive Appointment', label: 'Executive Appointment' },
  { code: 'Executive Statement', label: 'Executive Statement' },
  { code: 'Experiments/Trials/Pilots', label: 'Experiments/Trials/Pilots' },
  { code: 'Fundraising', label: 'Fundraising' },
  { code: 'Hiring', label: 'Hiring' },
  { code: 'Initial Public Offering', label: 'Initial Public Offering' },
  { code: 'Investment', label: 'Investment' },
  { code: 'Investment Exit', label: 'Investment Exit' },
  { code: 'Joint Venture', label: 'Joint Venture' },
  { code: 'Law Suit/Judgement/Settlement', label: 'Law Suit/Judgement/Settlement' },
  { code: 'Legislation & Regulation', label: 'Legislation & Regulation' },
  { code: 'Merger & Acquisition', label: 'Merger & Acquisition' },
  { code: 'Miscellaneous', label: 'Miscellaneous' },
  { code: 'New Initiatives And Programs', label: 'New Initiatives And Programs' },
  { code: 'New Product Launch', label: 'New Product Launch' },
  { code: 'New Service Launch', label: 'New Service Launch' },
  { code: 'Outage', label: 'Outage' },
  { code: 'Product Reviews', label: 'Product Reviews' },
  { code: 'Product Shutdown', label: 'Product Shutdown' },
  { code: 'Project And Operations Status', label: 'Project And Operations Status' },
  { code: 'Promotion & Sale', label: 'Promotion & Sale' },
  { code: 'Re-Branding/Re-Naming', label: 'Re-Branding/Re-Naming' },
  { code: 'Redemption Controversy', label: 'Redemption Controversy' },
  { code: 'Regulator Alert And Bulletin', label: 'Regulator Alert And Bulletin' },
  { code: 'Regulatory Alert And Bulletin', label: 'Regulatory Alert And Bulletin' },
  { code: 'Regulatory Approval', label: 'Regulatory Approval' },
  { code: 'Regulatory Ban & Enforcement', label: 'Regulatory Ban & Enforcement' },
  { code: 'Regulatory Filing', label: 'Regulatory Filing' },
  { code: 'Regulatory Investigation', label: 'Regulatory Investigation' },
  { code: 'Regulatory Outlook', label: 'Regulatory Outlook' },
  { code: 'Research And Publications', label: 'Research And Publications' },
  { code: 'Scandals & Frauds', label: 'Scandals & Frauds' },
  { code: 'Security Breach & Vulnerability', label: 'Security Breach & Vulnerability' },
  { code: 'Outage', label: 'Outage' },
];

export const TRIGGER_MAP: Record<string, string> = {
  ...Object.fromEntries(ALL_TRIGGERS.map((t) => [t.code, t.label])),
  'KW_527': 'Business Expansion',
};

export function getTriggerLabel(code: string): string {
  return TRIGGER_MAP[code] || code;
}

const TRIGGER_COLORS: Record<string, string> = {
  'Merger & Acquisition':        'bg-blue-100 text-blue-800',
  'Executive Appointment':       'bg-orange-100 text-orange-800',
  'Fundraising':                 'bg-emerald-100 text-emerald-800',
  'Investment':                  'bg-emerald-100 text-emerald-800',
  'Business Expansion':           'bg-cyan-100 text-cyan-800',
  'Business Outlook & Projections': 'bg-yellow-100 text-yellow-800',
  'New Product Launch':           'bg-pink-100 text-pink-800',
  'New Service Launch':           'bg-pink-100 text-pink-800',
  'Alliance & Partnership':      'bg-indigo-100 text-indigo-800',
  'Cost Cutting':                'bg-red-100 text-red-800',
  'Business Shut-Down':          'bg-red-200 text-red-900',
  'Awards & Recognition':        'bg-amber-100 text-amber-800',
  'Customer Acquisition/Growth':  'bg-teal-100 text-teal-800',
  'Law Suit/Judgement/Settlement': 'bg-slate-200 text-slate-800',
  'Regulatory Approval':          'bg-slate-100 text-slate-700',
  'Research And Publications':    'bg-sky-100 text-sky-800',
  'Scandals & Frauds':           'bg-red-100 text-red-700',
  'Security Breach & Vulnerability': 'bg-red-100 text-red-800',
  'Outage':                      'bg-red-100 text-red-800',
};

export function getTriggerColor(label: string): string {
  return TRIGGER_COLORS[label] || 'bg-slate-100 text-slate-700';
}
