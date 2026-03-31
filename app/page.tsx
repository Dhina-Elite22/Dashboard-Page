'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  requestOtp,
  validateOtp,
  registerUser,
  fetchSubscriptions,
  fetchCompanyNews,
  type NewsArticle,
  type SubscriptionCompany,
  type SubscriptionTrigger,
} from '@/lib/api';
import { getTriggerLabel, getTriggerColor } from '@/lib/triggers';
import {
  Mail,
  Shield,
  Loader2,
  X,
  ChevronDown,
  Crown,
  Star,
  Filter,
  RefreshCw,
  ExternalLink,
  Building2,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Zap,
  Calendar,
  Globe,
  Tag,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  ArrowLeft,
  Phone,
  User,
  Briefcase,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardScreen = 'login-email' | 'login-otp' | 'register' | 'verify-email' | 'dashboard' | 'subscription' | 'profile' | 'payment';

// ─── Constants ────────────────────────────────────────────────────────────────

const ARTICLES_PER_PAGE = 12;

// Sentinel — replaced once subscription API responds
const EMPTY_COMPANIES: SubscriptionCompany[] = [];
const EMPTY_TRIGGERS: SubscriptionTrigger[] = [];





// ─── MultiSelect Dropdown ────────────────────────────────────────────────────

function MultiSelect({
  label, options, selected, onToggle, getLabel,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  getLabel?: (val: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 hover:border-blue-500 transition-colors"
      >
        <span className="text-slate-600 font-medium truncate">
          Select{selected.length > 0 && (
            <span className="ml-2 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {selected.length}
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">No options</p>
          ) : options.map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm group">
              <span className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors
                ${selected.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                {selected.includes(opt) && (
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-slate-700 leading-tight text-xs">{getLabel ? getLabel(opt) : opt}</span>
              <input type="checkbox" className="sr-only" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── News Card ────────────────────────────────────────────────────────────────



// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function CompanyNewsDashboard() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<DashboardScreen>('login-email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  // "not registered" flag — shown on login page
  const [emailNotRegistered, setEmailNotRegistered] = useState(false);
  // Store the logged-in user's email to display on dashboard
  const [loggedInEmail, setLoggedInEmail] = useState('');

  // ── Registration form ─────────────────────────────────────────────────────
  const [regName, setRegName] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTerms, setRegTerms] = useState(false);
  const [regError, setRegError] = useState('');

  // ── Subscription / filter data (managed via Subscriptions API) ──────────
  const [filterCompanies, setFilterCompanies] = useState<SubscriptionCompany[]>(EMPTY_COMPANIES);
  const [filterTriggers, setFilterTriggers]  = useState<SubscriptionTrigger[]>(EMPTY_TRIGGERS);
  const [subLoading, setSubLoading] = useState(false);
  const [subError,   setSubError]   = useState('');

  const [selectedCompanyNames, setSelectedCompanyNames] = useState<string[]>([]);
  const [selectedTriggerCodes, setSelectedTriggerCodes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // ── News feed ─────────────────────────────────────────────────────────────
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError,   setNewsError]   = useState('');
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [newsFetched,   setNewsFetched]  = useState(false);

  const [hasMounted, setHasMounted] = useState(false);
  
  // ── Subscription Details ──────────────────────────────────────────────────
  const [userPlan, setUserPlan] = useState<'Silver' | 'Gold' | 'Platinum'>('Silver');
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<'Silver' | 'Gold' | 'Platinum' | null>(null);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState(false);

  // ── Sync Subscription Data (Companies + Triggers) ─────────────────────────
  // We now derive these primarily from news cards, but we can still load them 
  // initially or as a fallback.
  const loadSubscriptions = useCallback(async (token: string) => {
    setSubLoading(true); setSubError('');
    try {
      const { companies, triggers } = await fetchSubscriptions(token);
      // We set these initially, but they will be augmented/replaced by news card data
      setFilterCompanies(companies);
      setFilterTriggers(triggers);
      setIsSubscribed(companies.length > 0 || triggers.length > 0);
    } catch (err: any) {
      setSubError(err.message || 'Failed to load subscription details');
    } finally {
      setSubLoading(false);
    }
  }, []);

  // ── On page load, restore session if token exists ──────────────────────────
  // Check for existing token and restore session to keep user logged in
  useEffect(() => {
    setHasMounted(true);
    const storedToken = localStorage.getItem('iz_token');
    const storedEmail = localStorage.getItem('iz_email');
    
    if (storedToken) {
      setBearerToken(storedToken);
      if (storedEmail) {
        setLoggedInEmail(storedEmail);
      }
      setScreen('dashboard');
      loadSubscriptions(storedToken);
    }
  }, [loadSubscriptions]);

  // ── Fetch news (called on mount and when Apply Filters is clicked) ─────────
  const loadNews = useCallback(async (token: string, companyDomains: string[], triggerCodes: string[]) => {
    setNewsLoading(true); setNewsError(''); setCurrentPage(1);
    try {
      const data = await fetchCompanyNews(token, { companies: companyDomains, triggers: triggerCodes });
      setArticles(data);
      setNewsFetched(true);
    } catch (err: any) {
      setNewsError(err.message || 'Failed to load news');
    } finally {
      setNewsLoading(false);
    }
  }, []);

  // ── Sync Filters with News Cards ──────────────────────────────────────────
  // Extract unique Company and Trigger names from articles to populate filters
  useEffect(() => {
    if (articles.length > 0) {
      // 1. Extract unique company names
      const allCompanyNames = articles.flatMap(a => a.companyNames || []);
      const uniqueCompanyNames = Array.from(new Set(allCompanyNames)).sort();
      
      // Update filterCompanies state using these names
      setFilterCompanies(uniqueCompanyNames.map(name => ({
        name: name,
        domain: name // Using name as "domain" ID for matching
      })));

      // 2. Extract unique trigger names
      const allTriggerNames = articles.flatMap(a => a.triggerNames || []);
      const uniqueTriggerNames = Array.from(new Set(allTriggerNames))
        .map(name => name.trim())
        .filter(name => !!name)
        .map(name => name.charAt(0).toUpperCase() + name.slice(1))
        .sort((a, b) => a.localeCompare(b));

      // Update filterTriggers state using these names
      setFilterTriggers(uniqueTriggerNames.map(name => ({
        label: name,
        code: name // Using name as "code" ID for matching
      })));
    }
  }, [articles]);

  // Auto-load news on login
  useEffect(() => {
    if (bearerToken && screen === 'dashboard' && !newsFetched && !newsLoading && !newsError) {
      loadNews(bearerToken, [], []);
    }
  }, [bearerToken, screen, newsFetched, newsLoading, newsError, loadNews]);

  // ── OTP countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const t = setTimeout(() => setOtpResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendCountdown]);

  // ── Lock background scroll when filter drawer is open ─────────────────────
  useEffect(() => {
    if (filterDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [filterDrawerOpen]);





  // ─────────────────────────────────────────────────────────────────────────
  // AUTH HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleRequestOtp = async () => {
    if (!email.trim()) { setAuthError('Please enter your email address'); return; }
    setAuthLoading(true); setAuthError(''); setEmailNotRegistered(false);
    try {
      await requestOtp(email.trim());
      setOtpResendCountdown(60);
      setScreen('login-otp');
    } catch (err: any) {
      // ANY error from the API means this email can't be logged into.
      // Most likely the user is not registered with this email address.
      setEmailNotRegistered(true);
      setAuthError(
        'This email is not registered. Please check your email address or create a new account.'
      );
    } finally { setAuthLoading(false); }
  };

  // ── Registration handler ──────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!regName.trim())    { setRegError('Please enter your full name'); return; }
    if (!regEmail.trim())   { setRegError('Please enter your email address'); return; }
    if (!regTerms)          { setRegError('Please accept the Terms of Service and Privacy Policy'); return; }
    setAuthLoading(true); setRegError('');
    try {
      await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        company: regCompany.trim() || 'Individual',
        ...(regPhone.trim() ? { phoneNumber: regPhone.trim() } : {}),
      });
      // After registration the API sends an OTP — go straight to verify
      setEmail(regEmail.trim());
      setOtpResendCountdown(60);
      setScreen('verify-email');
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Please try again.');
    } finally { setAuthLoading(false); }
  };

  // ── Verify and Start (post-registration OTP) ──────────────────────────────
  const handleVerifyAndStart = async () => {
    if (!otp.trim()) { setAuthError('Please enter the 6-digit verification code'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const token = await validateOtp(email.trim(), otp.trim());
      localStorage.setItem('iz_token', token);
      localStorage.setItem('iz_email', email.trim()); // Persist email for session restore
      setBearerToken(token);
      setLoggedInEmail(email.trim()); // Store logged-in email for display
      setScreen('dashboard');
      loadSubscriptions(token);
    } catch (err: any) {
      setAuthError(err.message || 'Invalid verification code. Please try again.');
    } finally { setAuthLoading(false); }
  };

  // ── Resend OTP (registration verification) ────────────────────────────────
  const handleResendVerifyOtp = async () => {
    if (otpResendCountdown > 0) return;
    setAuthLoading(true); setAuthError('');
    try {
      await requestOtp(email.trim());
      setOtpResendCountdown(60);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to resend code');
    } finally { setAuthLoading(false); }
  };

  const handleValidateOtp = async () => {
    if (!otp.trim()) { setAuthError('Please enter the OTP'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const token = await validateOtp(email.trim(), otp.trim());
      localStorage.setItem('iz_token', token);
      localStorage.setItem('iz_email', email.trim()); // Persist email for session restore
      setBearerToken(token);
      setLoggedInEmail(email.trim()); // Store logged-in email for display
      setScreen('dashboard');
      loadSubscriptions(token);
    } catch (err: any) {
      setAuthError(err.message || 'Invalid OTP. Please try again.');
    } finally { setAuthLoading(false); }
  };

  const handleResendOtp = async () => {
    if (otpResendCountdown > 0) return;
    setAuthLoading(true); setAuthError('');
    try {
      await requestOtp(email.trim());
      setOtpResendCountdown(60);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to resend OTP');
    } finally { setAuthLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('iz_token');
    localStorage.removeItem('iz_email'); // Clear stored email on logout
    setBearerToken('');
    setSelectedCompanyNames([]); setSelectedTriggerCodes([]);
    setFilterCompanies(EMPTY_COMPANIES); setFilterTriggers(EMPTY_TRIGGERS);
    setArticles([]); setNewsError(''); setSubError('');
    setEmail(''); setOtp(''); setAuthError('');
    setLoggedInEmail(''); // Clear logged-in email on logout
    setNewsFetched(false);
    setScreen('login-email');
  };

  // ── Subscription Handlers ─────────────────────────────────────────────────
  const handleUpgradeSelect = (plan: 'Silver' | 'Gold' | 'Platinum') => {
    setSelectedPlanForUpgrade(plan);
    setScreen('payment');
  };

  const handlePaymentComplete = () => {
    if (selectedPlanForUpgrade) {
      setAuthLoading(true);
      setTimeout(() => {
        setUserPlan(selectedPlanForUpgrade);
        setAuthLoading(false);
        setPaymentSuccessToast(true);
        setTimeout(() => setPaymentSuccessToast(false), 5000);
        setScreen('profile');
      }, 1500); // Simulate processing delay
    }
  };







  // ── Derived logic: Filtered & Paged Articles ─────────────────────────────
  
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      // 1. Company Filter (Matches any of the selected company names)
      if (selectedCompanyNames.length > 0) {
        const matches = (article.companyNames || []).some(name => selectedCompanyNames.includes(name));
        if (!matches) return false;
      }

      // 2. Trigger Filter (Matches any of the selected names)
      if (selectedTriggerCodes.length > 0) {
        const matches = (article.triggerNames || []).some(name => 
          selectedTriggerCodes.some(selected => selected.toLowerCase() === name.toLowerCase())
        );
        if (!matches) return false;
      }

      // 3. Date Range Filter
      if (startDate || endDate) {
        if (!article.publishDate) return false;
        const pubDate = new Date(article.publishDate);
        if (startDate && pubDate < new Date(startDate)) return false;
        if (endDate) {
          const endAt = new Date(endDate);
          endAt.setHours(23, 59, 59, 999);
          if (pubDate > endAt) return false;
        }
      }

      return true;
    });
  }, [articles, selectedCompanyNames, selectedTriggerCodes, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));
  const pagedArticles = filteredArticles.slice((currentPage - 1) * ARTICLES_PER_PAGE, currentPage * ARTICLES_PER_PAGE);

  // ── Filter toggle helpers ─────────────────────────────────────────────────
  const toggleCompanyDomain = (d: string) => setSelectedCompanyNames(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const toggleTrigger       = (c: string) => setSelectedTriggerCodes(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  // ── Apply filters handler ─────────────────────────────────────────────────
  const handleApplyFilters = () => {
    loadNews(bearerToken, selectedCompanyNames, selectedTriggerCodes);
    setFilterDrawerOpen(false);
  };

  // ── Format date helper ────────────────────────────────────────────────────
  const fmtDate = (raw: string) => {
    if (!raw) return '';
    try { return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return raw; }
  };



  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Login – Email
  // ═══════════════════════════════════════════════════════════════════════════

  if (!hasMounted) return null;

  if (screen === 'login-email') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-100 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 shadow-xl mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Intellizence</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Intellizence Live News</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Sign in</h2>
          <p className="text-slate-500 text-sm mb-6">Enter your email to receive a one-time code</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setAuthError(''); setEmailNotRegistered(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleRequestOtp()}
                  placeholder="you@company.com" autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-900 transition-all font-medium" />
              </div>
            </div>
            {authError && (
              <div className="flex flex-col gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700 leading-snug font-medium">{authError}</p>
                </div>
                <button
                  id="login-create-account-btn"
                  onClick={() => {
                    setRegEmail(email);
                    setAuthError('');
                    setEmailNotRegistered(false);
                    setScreen('register');
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all duration-200 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Create New Account
                </button>
              </div>
            )}
            <button id="login-send-otp-btn" onClick={handleRequestOtp} disabled={authLoading}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {authLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending Code…</> : 'Continue'}
            </button>
            <div className="text-center text-sm text-slate-500 pt-1">
              Don&apos;t have an account?{' '}
              <button
                id="login-goto-register-btn"
                onClick={() => { setRegEmail(email); setAuthError(''); setScreen('register'); }}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Create account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Register
  // ═══════════════════════════════════════════════════════════════════════════

  if (screen === 'register') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-100 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 shadow-xl mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Intellizence</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Intellizence Live News</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-6">
            <button
              id="register-back-btn"
              onClick={() => { setRegError(''); setScreen('login-email'); }}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Back to login"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create Account</h2>
              <p className="text-slate-500 text-xs font-medium">Fill in your details to get started</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">Full Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-name"
                  type="text"
                  value={regName}
                  onChange={e => { setRegName(e.target.value); setRegError(''); }}
                  placeholder="Jane Doe"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-900 transition-all font-medium"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">Email Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={e => { setRegEmail(e.target.value); setRegError(''); }}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-900 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">
                Company Name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-company"
                  type="text"
                  value={regCompany}
                  onChange={e => { setRegCompany(e.target.value); setRegError(''); }}
                  placeholder="Acme Corporation"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-900 transition-all font-medium"
                />
              </div>
            </div>

            {/* Phone (optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-phone"
                  type="tel"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-900 transition-all font-medium"
                />
              </div>
            </div>

            {/* Terms */}
            <label htmlFor="reg-terms" className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  id="reg-terms"
                  checked={regTerms}
                  onChange={e => { setRegTerms(e.target.checked); setRegError(''); }}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 ${
                  regTerms
                    ? 'bg-violet-600 border-violet-600'
                    : 'border-slate-500 bg-white/5 group-hover:border-violet-400'
                }`}>
                  {regTerms && (
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-slate-500 leading-snug font-medium">
                I agree to the{' '}
                <span className="text-blue-600 hover:underline">Terms of Service</span>
                {' '}and{' '}
                <span className="text-blue-600 hover:underline">Privacy Policy</span>
              </span>
            </label>

            {/* Error */}
            {regError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300 leading-snug">{regError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="reg-submit-btn"
              onClick={handleRegister}
              disabled={authLoading}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {authLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending Code…</>
                : <><Mail className="w-4 h-4" /> Create Account</>}
            </button>

            <div className="text-center text-sm text-slate-500 pt-1">
              Already have an account?{' '}
              <button
                id="reg-signin-link"
                onClick={() => { setRegError(''); setScreen('login-email'); }}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Verify Email (post-registration OTP)
  // ═══════════════════════════════════════════════════════════════════════════

  if (screen === 'verify-email') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-100 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 shadow-xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Intellizence</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Company News Signal Intelligence</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-slate-900" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Verify Your Email</h2>
            <p className="text-slate-500 text-sm">We&apos;ve sent a verification code to</p>
            <p className="text-slate-900 font-bold text-sm mt-0.5 break-all">{email}</p>
          </div>

          {/* Helpful hints */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 text-xs text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-300 mb-1">Haven&apos;t received the code?</p>
            <p>• Check your spam/junk folder</p>
            <p>• Make sure <span className="text-blue-300 font-medium">{email}</span> is correct</p>
            <p>• Wait a few minutes for delivery</p>
          </div>

          <div className="space-y-4">
            {/* 6-digit OTP input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">Verification Code</label>
              <input
                id="verify-otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setAuthError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleVerifyAndStart()}
                placeholder="_ _ _ _ _ _"
                autoFocus
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xl focus:outline-none focus:border-slate-900 transition-all tracking-[0.4em] font-mono text-center font-bold"
              />
            </div>

            {/* Resend */}
            <div className="flex justify-end">
              <button
                id="verify-resend-btn"
                onClick={handleResendVerifyOtp}
                disabled={otpResendCountdown > 0 || authLoading}
                className="text-sm text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                {otpResendCountdown > 0 ? `Resend in ${otpResendCountdown}s` : 'Resend'}
              </button>
            </div>

            {/* Error */}
            {authError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300 leading-snug">{authError}</p>
              </div>
            )}

            {/* Back / Verify buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                id="verify-back-btn"
                onClick={() => { setOtp(''); setAuthError(''); setScreen('register'); }}
                className="flex items-center gap-2 flex-1 py-3 px-4 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold rounded-xl transition-all duration-200 justify-center text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                id="verify-start-btn"
                onClick={handleVerifyAndStart}
                disabled={authLoading || otp.length < 6}
                className="flex items-center gap-2 flex-[2] py-3 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed justify-center text-sm"
              >
                {authLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                  : <><CheckCircle2 className="w-4 h-4" /> Verify and Start</>}
              </button>
            </div>

            <div className="text-center text-sm text-slate-500 pt-1">
              Already have an account?{' '}
              <button
                id="verify-signin-link"
                onClick={() => { setOtp(''); setAuthError(''); setScreen('login-email'); }}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Login – OTP
  // ═══════════════════════════════════════════════════════════════════════════

  if (screen === 'login-otp') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-100 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 shadow-xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Intellizence</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Company News Signal Intelligence</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Enter OTP</h2>
          <p className="text-slate-500 text-sm mb-1">We sent a one-time code to</p>
          <p className="text-slate-900 text-sm font-bold mb-6">{email}</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">One-Time Password</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" inputMode="numeric" maxLength={8} value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setAuthError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleValidateOtp()}
                  placeholder="Enter OTP" autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-slate-900 transition-all tracking-widest font-mono text-center font-bold" />
              </div>
            </div>
            {authError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{authError}</p>
              </div>
            )}
            <button onClick={handleValidateOtp} disabled={authLoading}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {authLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <><CheckCircle2 className="w-4 h-4" /> Verify & Sign In</>}
            </button>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => { setScreen('login-email'); setAuthError(''); setOtp(''); }} className="text-sm text-slate-400 hover:text-white transition-colors">← Change email</button>
              <button onClick={handleResendOtp} disabled={otpResendCountdown > 0 || authLoading}
                className="text-sm text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors">
                {otpResendCountdown > 0 ? `Resend in ${otpResendCountdown}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Subscription Plans
  // ═══════════════════════════════════════════════════════════════════════════

  if (screen === 'subscription') return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <button onClick={() => setScreen('dashboard')} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Intellizence</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Choose Your Plan</h2>
          <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto">
            Get unlimited access to real-time company news signals and intelligence.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Silver Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Silver</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">$29</span>
                <span className="ml-1 text-xl font-semibold text-slate-500">/mo</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {['Up to 50 Companies', 'All Signal Triggers', 'Standard Support', 'Daily Email Alerts'].map((f) => (
                <li key={f} className="flex items-start gap-3 text-slate-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleUpgradeSelect('Silver')}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl transition-colors"
            >
              Get Started
            </button>
          </div>

          {/* Gold Plan (Featured) */}
          <div className="bg-white rounded-2xl border-2 border-blue-600 p-8 shadow-xl relative overflow-hidden flex flex-col md:scale-105 z-10">
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-4 rounded-bl-xl">
              Most Popular
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Gold</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">$99</span>
                <span className="ml-1 text-xl font-semibold text-slate-500">/mo</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {['Up to 500 Companies', 'Priority Real-time News', 'Advanced Filters', 'Premium Support', 'API Access (Limited)'].map((f) => (
                <li key={f} className="flex items-start gap-3 text-slate-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleUpgradeSelect('Gold')}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/30"
            >
              Upgrade Now
            </button>
          </div>

          {/* Platinum Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Platinum</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">$249</span>
                <span className="ml-1 text-xl font-semibold text-slate-500">/mo</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {['Unlimited Companies', 'Team Collaboration', 'Custom Triggers', 'Dedicated Account Manager', 'Full API Access'].map((f) => (
                <li key={f} className="flex items-start gap-3 text-slate-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleUpgradeSelect('Platinum')}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors"
            >
              Contact Sales
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-20 text-center">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-6">Secure Payment Methods</p>
          <div className="flex flex-wrap items-center justify-center gap-8 grayscale opacity-60">
            {/* Mock payment icons using divs/labels for simplicity */}
            <div className="flex flex-col items-center gap-1">
              <Shield className="w-8 h-8 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500">VISA</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Shield className="w-8 h-8 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500">MASTERCARD</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Shield className="w-8 h-8 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500">PAYPAL</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Shield className="w-8 h-8 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500">STRIPE</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Shield className="w-8 h-8 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500">AMEX</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Profile (Subscription Details)
  // ═══════════════════════════════════════════════════════════════════════════

  if (screen === 'profile') return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <button onClick={() => setScreen('dashboard')} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Intellizence</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 md:py-12">
        {paymentSuccessToast && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-bold text-emerald-800">Your subscription has been successfully updated to {userPlan}!</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Subscription Details</h2>
                  <p className="text-slate-500 text-sm font-medium">Manage your plan and billing information</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                  userPlan === 'Platinum' ? 'bg-violet-100 text-violet-700' : 
                  userPlan === 'Gold' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  Current: {userPlan}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-8 border-t border-slate-50 pt-8">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">User Account</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{loggedInEmail}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-sm font-bold text-slate-900">Active</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Next Billing Date</p>
                  <p className="text-sm font-bold text-slate-900">May 15, 2026</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Method</p>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-900">•••• 4242</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6">Plan Features</h3>
              <ul className="grid sm:grid-cols-2 gap-4">
                {(userPlan === 'Platinum' ? [
                  'Unlimited Companies', 'Team Collaboration', 'Custom Triggers', 'Dedicated Account Manager', 'Full API Access', 'Priority Support'
                ] : userPlan === 'Gold' ? [
                  'Up to 500 Companies', 'Priority Real-time News', 'Advanced Filters', 'Premium Support', 'API Access (Limited)'
                ] : [
                  'Up to 50 Companies', 'All Signal Triggers', 'Standard Support', 'Daily Email Alerts'
                ]).map((f) => (
                  <li key={f} className="flex items-start gap-3 text-slate-600 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-6 h-6 text-amber-400" />
                <h3 className="font-bold">Upgrade Available</h3>
              </div>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Unlock more companies, custom signals, and API access with a higher tier.
              </p>
              <button 
                onClick={() => setScreen('subscription')}
                className="w-full py-3 px-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-50 transition-colors text-sm"
              >
                Explore Plans
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Payment (Order Summary)
  // ═══════════════════════════════════════════════════════════════════════════

  if (screen === 'payment') return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <button onClick={() => setScreen('subscription')} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">Checkout</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8 md:py-16">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 text-center">Complete Your Purchase</h2>
            <p className="text-slate-500 text-sm text-center font-medium">Safe and secure payment</p>
          </div>

          <div className="p-8 space-y-8">
            <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-widest">Selected Plan</span>
                <span className="bg-blue-600 text-white text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">{selectedPlanForUpgrade}</span>
              </div>
              <div className="flex items-baseline justify-between pt-2 border-t border-slate-200">
                <span className="text-base sm:text-lg font-bold text-slate-900">{selectedPlanForUpgrade} Plan</span>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {selectedPlanForUpgrade === 'Platinum' ? '$249' : selectedPlanForUpgrade === 'Gold' ? '$99' : '$29'}
                  </span>
                  <span className="text-slate-400 font-bold text-xs sm:text-sm">/mo</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 ml-1">Card Information</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Card Number •••• •••• •••• 4242" 
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-slate-900 transition-all font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <input type="text" placeholder="MM / YY" 
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-slate-900 transition-all font-mono" />
                </div>
                <div className="relative">
                  <input type="text" placeholder="CVC" 
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-slate-900 transition-all font-mono" />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handlePaymentComplete}
                disabled={authLoading}
                className="w-full py-4 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all duration-200 shadow-xl flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {authLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</> : <><Shield className="w-5 h-5 text-emerald-400" /> Secure Payment</>}
              </button>
              <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                <AlertCircle className="w-3 h-3" />
                No commitments. Cancel anytime.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Dashboard
  // ═════════════���═════════════════════════════════════════════════════════════

  const activeFiltersCount = (selectedCompanyNames.length > 0 ? 1 : 0) + (selectedTriggerCodes.length > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16 gap-3 sm:gap-4 text-slate-900 font-bold">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-100">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs sm:text-base tracking-tight leading-none uppercase sm:normal-case">Intellizence</span>
              <span className="hidden xs:inline text-slate-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">Live News</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <button onClick={() => setFilterDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all active:scale-95">
              <Filter className="w-3.5 h-3.5" /><span className="hidden xs:inline sm:inline">Filters</span>
            </button>
            {loggedInEmail && <span className="text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-100 truncate max-w-[120px] sm:max-w-[150px] lg:max-w-[180px]">{loggedInEmail}</span>}
            <button 
              onClick={() => setScreen('profile')}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-100 rounded-lg sm:rounded-xl transition-all"
            >
              <Crown className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="hidden sm:inline">Subscription</span>
            </button>
            <button onClick={handleLogout} title="Sign out"
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg sm:rounded-xl transition-all active:scale-95">
              <LogOut className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full">
        <>
          {filterDrawerOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" onClick={() => setFilterDrawerOpen(false)} />}
          <aside className={`fixed top-0 left-0 h-full w-[280px] sm:w-72 bg-white border-r border-slate-200 z-50 flex flex-col flex-shrink-0 overflow-y-auto transition-transform duration-300 ease-in-out ${filterDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-900" />
                <span className="font-bold text-slate-900 text-sm">Filters</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { 
                    setSelectedCompanyNames([]); setSelectedTriggerCodes([]); 
                    setStartDate(''); setEndDate('');
                    if (bearerToken) loadNews(bearerToken, [], []);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  title="Refresh news and filters"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${newsLoading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setFilterDrawerOpen(false)} className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-3 space-y-5 overflow-y-auto bg-white">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Companies
                    <span className="normal-case font-normal text-slate-500">({filterCompanies.length})</span>
                  </span>
                </div>
                <MultiSelect
                  label="Companies"
                  options={filterCompanies.map(c => c.domain)}
                  selected={selectedCompanyNames}
                  onToggle={toggleCompanyDomain}
                  getLabel={domain => filterCompanies.find(c => c.domain === domain)?.name || domain}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-violet-600" />
                    Triggers
                    <span className="normal-case font-normal text-slate-500">({filterTriggers.length})</span>
                  </span>
                </div>
                <MultiSelect
                  label="Triggers"
                  options={filterTriggers.map(t => t.code)}
                  selected={selectedTriggerCodes}
                  onToggle={toggleTrigger}
                  getLabel={code => filterTriggers.find(t => t.code === code)?.label || getTriggerLabel(code)}
                />
              </div>

              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-cyan-600" />Date Range
                </span>
                <div className="space-y-2">
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium" />
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:border-blue-500 transition-all font-medium" />
                </div>
              </div>

              <div className="pt-4 mt-2">
                {subLoading && (
                  <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1 mb-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading your subscription…
                  </p>
                )}
                {subError && (
                  <p className="text-xs text-red-500 text-center mb-2">{subError}</p>
                )}
                <button
                  onClick={handleApplyFilters}
                  disabled={newsLoading}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest disabled:opacity-60"
                >
                  {newsLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</> : 'Apply Filters'}
                </button>
              </div>
            </div>
          </aside>
        </>

        <main className="flex-1 flex flex-col min-w-0 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Intellizence Live News</h1>
              {articles.length > 0 && (
                <p className="text-sm text-slate-500 mt-0.5">
                  {filteredArticles.length < articles.length 
                    ? `Showing ${filteredArticles.length} of ${articles.length} articles` 
                    : `${articles.length} articles found`}
                </p>
              )}
            </div>
            <button
              onClick={() => loadNews(bearerToken, [], [])}
              disabled={newsLoading}
              title="Refresh"
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${newsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Loading state */}
          {newsLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin" />
              <p className="font-medium text-sm">Fetching latest news…</p>
            </div>
          )}

          {/* Error state */}
          {!newsLoading && newsError && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="font-semibold text-slate-700">Could not load news</p>
              <p className="text-sm text-slate-500 max-w-sm">{newsError}</p>
              <button onClick={() => loadNews(bearerToken, [], [])} className="mt-2 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-colors">
                Retry
              </button>
            </div>
          )}

          {/* Zero Results For Filters */}
          {!newsLoading && !newsError && articles.length > 0 && filteredArticles.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 py-20 bg-white/50 rounded-3xl border border-dashed border-slate-200 mt-4">
              <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                <Filter className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-900">No matching news found</p>
                <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or date range.</p>
              </div>
              <button 
                onClick={() => { setSelectedCompanyNames([]); setSelectedTriggerCodes([]); setStartDate(''); setEndDate(''); }}
                className="text-sm font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4"
              >
                Clear all filters
              </button>
            </div>
          )}

          {!newsLoading && !newsError && articles.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-6 py-20">
              <div className="flex flex-col items-center text-center gap-5 max-w-sm">
                <div className="w-20 h-20 rounded-full bg-blue-100/50 flex items-center justify-center">
                  <Crown className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Subscription Required</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    Please subscribe to a news plan to view company news.
                  </p>
                </div>
                <button 
                  onClick={() => setScreen('subscription')}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200"
                >
                  View Plans
                </button>
              </div>
            </div>
          )}

          {/* News cards */}
          {!newsLoading && articles.length > 0 && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 px-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Newspaper className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Latest News Signals
                    <span className="ml-2 text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {articles.length} Total
                    </span>
                  </h2>
                </div>
                <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Showing {Math.min(articles.length, (currentPage - 1) * ARTICLES_PER_PAGE + 1)}–{Math.min(articles.length, currentPage * ARTICLES_PER_PAGE)} of {articles.length}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {pagedArticles.map((article: NewsArticle) => (
                  <article
                    key={article.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3"
                  >
                    {/* Company names row */}
                    {article.companyNames.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {article.companyNames.map((cn: string) => (
                          <span key={cn} className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                            <Building2 className="w-3 h-3 text-blue-600 flex-shrink-0" />
                            {cn}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Trigger badges */}
                    {article.triggerNames.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {article.triggerNames.map((tn: string) => (
                          <span key={tn} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getTriggerColor(tn)}`}>
                            {tn}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-3 flex-1">
                      {article.title}
                    </h2>

                    {/* Description */}
                    {article.desc && (
                      <p className="text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">{article.desc}</p>
                    )}

                    {/* Footer: date + publisher + read link */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-wrap">
                        {article.publishDate && (
                          <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            {fmtDate(article.publishDate)}
                          </span>
                        )}
                        {article.publisher && (
                          <span className="flex items-center gap-1 text-xs text-slate-400 truncate max-w-[140px]">
                            <Globe className="w-3 h-3 flex-shrink-0" />
                            {article.publisher}
                          </span>
                        )}
                      </div>
                      {article.url && article.url !== '#' && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
                        >
                          Read <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-4 mt-12 mb-8">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                        // Show first, last, current, and pages around current
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => { setCurrentPage(pageNum); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                        // Handle ellipsis
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Next Page"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Page {currentPage} of {totalPages}
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

