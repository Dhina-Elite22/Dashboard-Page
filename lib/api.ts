// ─── Intellizence API Service ─────────────────────────────────────────────────
//
//  All browser calls go through Next.js proxy rewrites (next.config.mjs):
//    /proxy/account/*  →  https://account-api.intellizence.com/*
//
//  API Endpoints:
//  1. POST /api/auth/request-code          → Send OTP to email
//  2. POST /api/auth/validate-code         → Validate OTP → Bearer Token
//  3. GET  /api/my/subscriptions           → User config (companyDomains + triggers)
//  4. POST /api/company-news/user/Business-Custom → Latest news articles
//
import { TRIGGER_MAP } from './triggers';

const ACCOUNT_BASE = '/proxy/account';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.message || body?.error || body?.msg || fallback;
  } catch {
    return fallback;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. AUTH — Request OTP
//    POST https://account-api.intellizence.com/api/auth/request-code
//    Body: { email }
// ═════════════════════════════════════════════════════════════════════════════

export async function requestOtp(email: string): Promise<void> {
  const res = await fetch(`${ACCOUNT_BASE}/api/auth/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const msg = await extractError(res, `Failed to send OTP (${res.status})`);
    throw new Error(msg);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 1b. AUTH — Register New User
//    POST https://account-api.intellizence.com/api/auth/register
//    Body: { name, email, companyName, phoneNumber? }
// ═════════════════════════════════════════════════════════════════════════════

export async function registerUser(payload: {
  name: string;
  email: string;
  company?: string;
  phoneNumber?: string;
}): Promise<void> {
  const res = await fetch(`${ACCOUNT_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await extractError(res, `Registration failed (${res.status})`);
    throw new Error(msg);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. AUTH — Validate OTP → Bearer Token
//    POST https://account-api.intellizence.com/api/auth/validate-code
//    Body: { email, code }
//    Returns: Bearer Token string
// ═════════════════════════════════════════════════════════════════════════════

export async function validateOtp(email: string, code: string): Promise<string> {
  const res = await fetch(`${ACCOUNT_BASE}/api/auth/validate-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) {
    const msg = await extractError(res, `OTP validation failed (${res.status})`);
    throw new Error(msg);
  }
  const data = await res.json();

  // Try every common key the API might use for the bearer token
  const token =
    data?.token ||
    data?.accessToken ||
    data?.access_token ||
    data?.bearerToken ||
    data?.idToken ||
    data?.data?.token ||
    data?.data?.accessToken ||
    data?.data?.access_token;

  if (!token) {
    console.error('[Intellizence] validate-code full response:', data);
    throw new Error('Sign-in succeeded but no token was returned. Please contact support.');
  }
  return token as string;
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. MY SUBSCRIPTIONS — Fetch user config (companies + triggers)
//    GET https://account-api.intellizence.com/api/my/subscriptions
//
//    Actual response shape:
//      response.config.companyDomains  → string[]  e.g. ["openai.com", "nvidia.com"]
//      response.config.triggers        → string[]  e.g. ["KW_527", "KW_514"]
// ═════════════════════════════════════════════════════════════════════════════

export interface SubscriptionCompany {
  name: string;   // display label (same as domain when no separate name is available)
  domain: string; // sent as-is in the companies[] filter body
}

export interface SubscriptionTrigger {
  code: string;   // e.g. "KW_527" — sent in the triggers[] filter body
  label: string;  // human-readable label shown in the UI
}

export interface UserSubscription {
  companies: SubscriptionCompany[];
  triggers: SubscriptionTrigger[];
}

const COMPANY_PRETTIFIER: Record<string, string> = {
  'reeltime.com': 'ReelTime',
  'openai.com': 'OpenAI',
  'nvidia.com': 'Nvidia',
  'microsoft.com': 'Microsoft',
  'google.com': 'Google',
  'alphabet.com': 'Alphabet',
  'meta.com': 'Meta Platforms',
  'palantir.com': 'Palantir',
  'anthropic.com': 'Anthropic',
  'xai.com': 'xAI',
  'luma.com': 'Luma AI',
};

export async function fetchSubscriptions(token: string): Promise<UserSubscription> {
  const res = await fetch(`${ACCOUNT_BASE}/api/my/subscriptions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const msg = await extractError(res, `Failed to load subscriptions (${res.status})`);
    throw new Error(msg);
  }
  const data = await res.json();
  console.log('[Intellizence] Subscriptions raw response:', data);

  // Extremely permissive config detection (handles various Intellizence response formats)
  const config =
    data?.config ??
    data?.data?.config ??
    data?.subscriptions ??
    data?.data?.subscriptions ??
    data ??
    {};

  // ── Company domains ────────────────────────────────────────────────────────
  const rawDomains: any[] =
    config?.companyDomains ??
    config?.domains ??
    config?.trackedCompanies ??
    config?.companies ??
    data?.companyDomains ??
    data?.domains ??
    data?.trackedCompanies ??
    [];

  const companies: SubscriptionCompany[] = rawDomains
    .map((d: any) => {
      // Domain might be a string or { domain: "...", name: "..." }
      const domain = (typeof d === 'string' ? d : (d?.domain || d?.id || d?.companyDomain || '')).trim();
      const nameGuess = COMPANY_PRETTIFIER[domain.toLowerCase()] || (
        typeof d === 'string'
          ? d.split('.')[0].charAt(0).toUpperCase() + d.split('.')[0].slice(1)
          : (d?.name || d?.label || d?.companyName || domain)
      );
      return { domain, name: nameGuess };
    })
    .filter((c) => c.domain);

  // ── Trigger codes ──────────────────────────────────────────────────────────
  const rawTriggers: any[] =
    config?.triggers ??
    config?.triggerCodes ??
    data?.triggers ??
    data?.triggerCodes ??
    [];

  const triggers: SubscriptionTrigger[] = rawTriggers
    .map((t: any) => {
      const code = (typeof t === 'string' ? t : (t?.code || t?.triggerCode || t?.id || '')).trim();
      const label = TRIGGER_MAP[code] || (
        typeof t === 'string' ? t : (t?.label || t?.triggerName || t?.name || code)
      );
      return { code, label };
    })
    .filter((t) => t.code);

  return { companies, triggers };
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. COMPANY NEWS — Business-Custom endpoint (up to 100 latest articles)
//    POST https://account-api.intellizence.com/api/company-news/user/Business-Custom
//
//    Request body:
//      { companies: string[], triggers: string[] }
//      companies → domain strings   e.g. ["openai.com"]
//      triggers  → trigger codes    e.g. ["KW_527"]
//
//    Actual article fields in API response:
//      publisher, title, url, desc, companyNames, triggerNames, publishDate
// ═════════════════════════════════════════════════════════════════════════════

export interface NewsArticle {
  id: string;
  title: string;
  publisher: string;
  url: string;
  desc: string;
  companyNames: string[];  // may contain multiple companies per article
  triggerNames: string[];  // may contain multiple triggers per article
  publishDate: string;
}

export async function fetchCompanyNews(
  token: string,
  filters: { companies: string[]; triggers: string[] } = { companies: [], triggers: [] }
): Promise<NewsArticle[]> {
  const res = await fetch(`${ACCOUNT_BASE}/api/company-news/user/Business-Custom`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      companies: filters.companies,
      triggers: filters.triggers,
    }),
  });
  if (!res.ok) {
    const msg = await extractError(res, `Failed to load company news (${res.status})`);
    throw new Error(msg);
  }
  const data = await res.json();
  console.log('[Intellizence] Company news raw response:', data);

  // Accept top-level array or common wrapper keys
  const rawArticles: any[] =
    Array.isArray(data) ? data :
      data?.news ||
      data?.articles ||
      data?.data ||
      data?.items ||
      data?.results ||
      [];

  return rawArticles.map((a: any, idx: number): NewsArticle => ({
    id: a.id || a._id || String(idx),
    title: a.title || a.headline || 'Untitled',
    publisher: a.publisher || a.source || a.sourceName || '',
    url: a.url || a.sourceUrl || a.link || '#',
    desc: a.desc || a.description || a.summary || a.snippet || '',
    companyNames: Array.isArray(a.companyNames)
      ? a.companyNames
      : a.companyName ? [a.companyName] : [],
    triggerNames: Array.isArray(a.triggerNames)
      ? a.triggerNames
      : a.triggerName ? [a.triggerName] : [],
    publishDate: a.publishDate || a.publishedAt || a.published_at || a.date || a.newsDate || '',
  }));
}
