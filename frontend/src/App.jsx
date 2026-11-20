import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api/client';

const websiteTypes = [
  'Business website',
  'E-commerce store',
  'Portfolio',
  'Landing page',
  'Blog / publication',
  'Education / e-learning',
  'Community / membership',
  'Booking / services',
  'Web application',
  'Other',
];
const initialProjectForm = { title: '', description: '', level: 'Basic', websiteType: websiteTypes[0], offerAmount: '', offerNotes: '' };
const formatCurrency = amount => Number(amount).toLocaleString('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});
const formatRequestedAt = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Request date unavailable'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};
const USER_CACHE_KEY = 'txo-session-user';

function readCachedUser() {
  try {
    const cachedUser = JSON.parse(window.sessionStorage.getItem(USER_CACHE_KEY));
    return cachedUser && typeof cachedUser.name === 'string' &&
      ['client', 'admin', 'developer'].includes(cachedUser.role)
      ? cachedUser
      : null;
  } catch {
    return null;
  }
}

function cacheUser(user) {
  try {
    window.sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    return;
  }
}

function clearCachedUser() {
  try {
    window.sessionStorage.removeItem(USER_CACHE_KEY);
  } catch {
    return;
  }
}

function Skeleton({ className = '' }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

function ProjectDetailSkeleton() {
  return (
    <div className="detailSkeleton" aria-label="Loading project details" aria-busy="true">
      <div className="skeletonProjectHeading">
        <Skeleton className="skeletonEyebrow" />
        <Skeleton className="skeletonTitle" />
        <Skeleton className="skeletonDescription" />
      </div>
      <div className="skeletonSectionHeading"><Skeleton className="skeletonSubheading" /><Skeleton className="skeletonCount" /></div>
      <div className="skeletonFeatureGrid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeletonFeature" key={index}><Skeleton className="skeletonCircle" /><div><Skeleton className="skeletonFeatureTitle" /><Skeleton className="skeletonFeatureText" /></div></div>
        ))}
      </div>
      <div className="skeletonSectionHeading"><Skeleton className="skeletonSubheading" /></div>
      <Skeleton className="skeletonHistory" />
      <Skeleton className="skeletonHistory" />
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = useRef(location.pathname);
  const profileCloseTimer = useRef(null);
  currentPath.current = location.pathname;
  const [user, setUser] = useState(readCachedUser);
  const [authLoading, setAuthLoading] = useState(() => user === null);
  const [showSplash, setShowSplash] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [authChallenge, setAuthChallenge] = useState(null);
  const [otpDigits, setOtpDigits] = useState(() => Array(6).fill(''));
  const [resendSeconds, setResendSeconds] = useState(0);
  const [authNotice, setAuthNotice] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpResending, setOtpResending] = useState(false);
  const otpInputRefs = useRef([]);
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [counterOfferForm, setCounterOfferForm] = useState({ amount: '', notes: '' });
  const [clientCounterOfferForm, setClientCounterOfferForm] = useState({ amount: '', notes: '' });
  const [showClientBudgetResponse, setShowClientBudgetResponse] = useState(false);
  const [feature, setFeature] = useState({ title: '', description: '' });
  const [featureMutationInProgress, setFeatureMutationInProgress] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [quotation, setQuotation] = useState({ developerCost: '0', otherCosts: '0', notes: '' });
  const [selectedQuotationVersion, setSelectedQuotationVersion] = useState('');
  const [quotationSending, setQuotationSending] = useState(false);
  const [quotationError, setQuotationError] = useState('');
  const [developers, setDevelopers] = useState([]);
  const [developersLoading, setDevelopersLoading] = useState(false);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState('');
  const [developerAssignmentLoading, setDeveloperAssignmentLoading] = useState(false);
  const [developerError, setDeveloperError] = useState('');
  const [message, setMessage] = useState('');
  const [budgetMessage, setBudgetMessage] = useState('');
  const [budgetMessageSuggestions, setBudgetMessageSuggestions] = useState([]);
  const [budgetSuggestionsLoading, setBudgetSuggestionsLoading] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const otp = otpDigits.join('');

  async function loadProjects() {
    const { data } = await api.get('/projects');
    setProjects(data);
  }

  async function loadDetail(id) {
    setShowClientBudgetResponse(false);
    setQuotationError('');
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/projects/${id}`);
      setSelected(id);
      setDetail(data);
      setSelectedDeveloperId(data.project.developer?._id || '');
      setSelectedQuotationVersion(String(data.versions.find(version => version.confirmed)?.version || ''));
      setCounterOfferForm({ amount: '', notes: '' });
      setClientCounterOfferForm({ amount: '', notes: '' });
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function updateProjectDetail(projectId, update) {
    setDetail(current => current?.project._id === projectId ? update(current) : current);
  }

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then(r => {
        if (active) {
          setUser(r.data.user);
          cacheUser(r.data.user);
        }
      })
      .catch(error => {
        if (!active) return;
        if (error.response?.status === 401) {
          clearCachedUser();
          setUser(null);
          if (currentPath.current !== '/register') navigate('/login', { replace: true });
        } else if (!user && currentPath.current !== '/register') {
          navigate('/login', { replace: true });
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const timer = window.setTimeout(() => setShowSplash(false), reducedMotion ? 0 : 850);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user && ['/login', '/register', '/verify-otp'].includes(location.pathname)) navigate('/', { replace: true });
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setResendSeconds(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (!user && !authLoading && location.pathname === '/verify-otp' && !authChallenge) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, authChallenge, location.pathname, navigate]);

  useEffect(() => {
    setPasswordVisible(false);
  }, [location.pathname]);

  useEffect(() => {
    window.clearTimeout(profileCloseTimer.current);
    if (!profileMenuOpen) return undefined;
    profileCloseTimer.current = window.setTimeout(() => setProfileMenuOpen(false), 1000);
    return () => window.clearTimeout(profileCloseTimer.current);
  }, [profileMenuOpen]);

  useEffect(() => {
    function handleUnauthorized() {
      clearCachedUser();
      setUser(null);
      setProjects([]);
      setSelected(null);
      setDetail(null);
      navigate('/login', { replace: true });
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setProjectsLoading(true);
    loadProjects()
      .catch(e => {
        if (active) setError(e.response?.data?.message || e.message);
      })
      .finally(() => {
        if (active) setProjectsLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setDevelopers([]);
      return undefined;
    }
    let active = true;
    setDevelopersLoading(true);
    setDeveloperError('');
    api.get('/projects/developers')
      .then(({ data }) => {
        if (active) setDevelopers(data);
      })
      .catch(e => {
        if (active) setDeveloperError(e.response?.data?.message || e.message);
      })
      .finally(() => {
        if (active) setDevelopersLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    let inFlight = false;
    const refreshProjects = async () => {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const { data } = await api.get('/projects');
        if (active) setProjects(data);
      } catch (e) {
        if (active) setError(e.response?.data?.message || e.message);
      } finally {
        inFlight = false;
      }
    };
    const interval = window.setInterval(refreshProjects, 5000);
    window.addEventListener('focus', refreshProjects);
    document.addEventListener('visibilitychange', refreshProjects);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshProjects);
      document.removeEventListener('visibilitychange', refreshProjects);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !selected || creatingProject) return undefined;
    let active = true;
    let inFlight = false;
    const refreshSelectedProject = async () => {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const { data } = await api.get(`/projects/${selected}`);
        if (active) {
          setDetail(current => current?.project._id === selected ? data : current);
        }
      } catch (e) {
        if (active) setError(e.response?.data?.message || e.message);
      } finally {
        inFlight = false;
      }
    };
    const interval = window.setInterval(refreshSelectedProject, 5000);
    window.addEventListener('focus', refreshSelectedProject);
    document.addEventListener('visibilitychange', refreshSelectedProject);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshSelectedProject);
      document.removeEventListener('visibilitychange', refreshSelectedProject);
    };
  }, [user, selected, creatingProject]);

  useEffect(() => {
    if (!user || user.role !== 'client') return;
    let active = true;
    setSuggestionsLoading(true);
    api.get(`/projects/suggestions/${projectForm.level}`)
      .then(({ data }) => {
        if (active) setSuggestions(data);
      })
      .catch(e => {
        if (active) setError(e.response?.data?.message || e.message);
      })
      .finally(() => {
        if (active) setSuggestionsLoading(false);
      });
    return () => { active = false; };
  }, [user, projectForm.level]);

  useEffect(() => {
    if (!user || user.role !== 'client' || !selected) {
      setBudgetMessageSuggestions([]);
      setBudgetSuggestionsLoading(false);
      return;
    }
    let active = true;
    setBudgetMessageSuggestions([]);
    setBudgetSuggestionsLoading(true);
    api.get(`/projects/${selected}/budget-suggestions`)
      .then(({ data }) => {
        if (active) setBudgetMessageSuggestions(data);
      })
      .catch(e => {
        if (active) setError(e.response?.data?.message || e.message);
      })
      .finally(() => {
        if (active) setBudgetSuggestionsLoading(false);
      });
    return () => { active = false; };
  }, [
    user,
    selected,
    detail?.project?.budgetNegotiation?.agreedAt,
    detail?.project?.budgetNegotiation?.currentOffer?.submittedByRole,
    Boolean(detail?.project?.counterOffer),
    Boolean(detail?.project?.clientCounterOffer),
  ]);

  function clearOtpInput() {
    setOtpDigits(Array(6).fill(''));
  }

  function changeOtpDigit(index, value) {
    const digits = value.replace(/\D/g, '').slice(0, 6 - index).split('');
    if (digits.length === 0) {
      setOtpDigits(current => current.map((digit, position) => position === index ? '' : digit));
      return;
    }
    setOtpDigits(current => {
      const next = [...current];
      digits.forEach((digit, offset) => { next[index + offset] = digit; });
      return next;
    });
    otpInputRefs.current[Math.min(index + digits.length, 5)]?.focus();
  }

  function pasteOtp(index, e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6 - index);
    if (!pasted) return;
    e.preventDefault();
    setOtpDigits(current => {
      const next = [...current];
      pasted.split('').forEach((digit, offset) => { next[index + offset] = digit; });
      return next;
    });
    otpInputRefs.current[Math.min(index + pasted.length, 5)]?.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'ArrowLeft' && index > 0) otpInputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpInputRefs.current[index + 1]?.focus();
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpInputRefs.current[index - 1]?.focus();
  }

  async function register(e) {
    e.preventDefault();
    setError('');
    setAuthNotice('');
    setAuthSubmitting(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setAuthChallenge({ email: data.email || form.email.trim(), purpose: data.purpose || 'verify-email', challengeToken: data.challengeToken, source: '/register' });
      clearOtpInput();
      setResendSeconds(60);
      setForm(current => ({ ...current, password: '' }));
      setAuthNotice(data.message);
      navigate('/verify-otp');
    } catch (x) {
      const response = x.response?.data;
      if (response?.verificationRequired && response.email) {
        setAuthChallenge({ email: response.email, purpose: response.purpose || 'verify-email', challengeToken: response.challengeToken, source: '/register' });
        clearOtpInput();
        setResendSeconds(60);
        setForm(current => ({ ...current, password: '' }));
        setAuthNotice(response.message);
        navigate('/verify-otp');
      } else {
        setError(response?.message || x.message);
      }
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function login(e) {
    e.preventDefault();
    setError('');
    setAuthNotice('');
    setAuthSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', { email: form.email, password: form.password });
      if (data.user) {
        setUser(data.user);
        cacheUser(data.user);
        setAuthChallenge(null);
        clearOtpInput();
        setResendSeconds(0);
        setForm(current => ({ ...current, password: '' }));
        navigate('/', { replace: true });
        return;
      }
      setAuthChallenge({ email: data.email || form.email.trim(), purpose: data.purpose || 'login', challengeToken: data.challengeToken, source: '/login' });
      clearOtpInput();
      setResendSeconds(60);
      setForm(current => ({ ...current, password: '' }));
      setAuthNotice(data.message);
      navigate('/verify-otp');
    } catch (x) {
      const response = x.response?.data;
      if (response?.verificationRequired && response.email) {
        setAuthChallenge({ email: response.email, purpose: response.purpose || 'login', challengeToken: response.challengeToken, source: '/login' });
        clearOtpInput();
        setResendSeconds(60);
        setForm(current => ({ ...current, password: '' }));
        setAuthNotice(response.message);
        navigate('/verify-otp');
      } else {
        setError(response?.message || x.message);
      }
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    if (!authChallenge) return;
    setError('');
    setOtpSubmitting(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        email: authChallenge.email,
        otp,
        challengeToken: authChallenge.challengeToken,
      });
      setUser(data.user);
      cacheUser(data.user);
      setAuthChallenge(null);
      clearOtpInput();
      setResendSeconds(0);
      setAuthNotice('');
      navigate('/', { replace: true });
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    } finally {
      setOtpSubmitting(false);
    }
  }

  async function resendOtp() {
    if (!authChallenge) return;
    setError('');
    setOtpResending(true);
    try {
      const { data } = await api.post('/auth/resend-otp', {
        email: authChallenge.email,
        challengeToken: authChallenge.challengeToken,
      });
      setAuthChallenge(current => ({ ...current, challengeToken: data.challengeToken }));
      clearOtpInput();
      setResendSeconds(60);
      setAuthNotice(data.message);
    } catch (x) {
      const response = x.response?.data;
      if (response?.challengeToken && authChallenge) {
        setAuthChallenge(current => ({
          ...current,
          email: response.email || current.email,
          purpose: response.purpose || current.purpose,
          challengeToken: response.challengeToken,
        }));
        setResendSeconds(response.retryAfterSeconds || 0);
        setAuthNotice(response.message);
      } else {
        setError(response?.message || x.message);
        setResendSeconds(response?.retryAfterSeconds || 0);
      }
    } finally {
      setOtpResending(false);
    }
  }

  function cancelAuthChallenge() {
    const returnPath = authChallenge?.source === '/register' ? '/register' : '/login';
    setAuthChallenge(null);
    clearOtpInput();
    setResendSeconds(0);
    setAuthNotice('');
    setError('');
    setForm(current => ({ ...current, password: '' }));
    navigate(returnPath, { replace: true });
  }

  async function logout() {
    await api.post('/auth/logout');
    setProfileMenuOpen(false);
    clearCachedUser();
    setUser(null);
    setProjects([]);
    setSelected(null);
    setDetail(null);
    navigate('/login', { replace: true });
  }

  async function createProject(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/projects', {
        ...projectForm,
        selectedFeatures: selectedSuggestions,
      });
      setProjectForm(initialProjectForm);
      setSelectedSuggestions([]);
      setCreatingProject(false);
      await loadProjects();
      await loadDetail(data.project._id);
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    }
  }

  async function addFeature(e) {
    e.preventDefault();
    const projectId = selected;
    setFeatureMutationInProgress(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/features`, feature);
      setFeature({ title: '', description: '' });
      updateProjectDetail(projectId, current => ({ ...current, features: [...current.features, data] }));
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    } finally {
      setFeatureMutationInProgress(false);
    }
  }

  async function saveVersion() {
    const projectId = selected;
    setSavingVersion(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/versions`, { note: 'Admin requirement update' });
      updateProjectDetail(projectId, current => ({
        ...current,
        project: { ...current.project, currentVersion: data.version, status: 'discussion' },
        versions: [data, ...current.versions],
      }));
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    } finally {
      setSavingVersion(false);
    }
  }

  async function confirmVersion(id) {
    const projectId = selected;
    try {
      const { data } = await api.post(`/projects/${projectId}/versions/${id}/confirm`);
      updateProjectDetail(projectId, current => ({
        ...current,
        project: { ...current.project, status: 'confirmed' },
        versions: current.versions.map(version => version._id === id ? data.version : version),
      }));
      setSelectedQuotationVersion(String(data.version.version));
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    }
  }

  function renderRequirementVersion(version, isCurrent = false) {
    return (
      <article className="version" key={version._id}>
        <div className="inline versionTitle"><b>Version {version.version}</b><span className={version.confirmed ? 'confirmed' : 'status'}>{version.confirmed ? 'CONFIRMED' : 'PENDING'}</span></div>
        <div className="versionChanges">
          {version.changes.map((change, index) => (
            <div className={`versionChange ${change.tag.toLowerCase()}`} key={`${change.featureId || 'change'}-${index}`}>
              <span className="versionChangeIcon" aria-hidden="true">{change.tag === 'ADDED' ? '+' : change.tag === 'REMOVED' ? '−' : '↻'}</span>
              <div className="versionChangeBody">
                <span className={`tag ${change.tag.toLowerCase()}`}>{change.tag === 'ADDED' ? 'NEW REQUIREMENT' : change.tag}</span>
                <b className="versionChangeTitle">{change.title}</b>
                {change.description && <p>{change.description}</p>}
                {change.previous && <small>Previously: {change.previous.title}</small>}
              </div>
            </div>
          ))}
        </div>
        <details className="versionSnapshot" open={isCurrent}>
          <summary>
            <span>Features included in this version</span>
            <span className="snapshotCount">{version.snapshot?.length || 0}</span>
          </summary>
          {version.snapshot?.length ? (
            <div className="versionSnapshotList">
              {version.snapshot.map(feature => (
                <div className="versionSnapshotFeature" key={feature.featureId}>
                  <span aria-hidden="true">✓</span>
                  <div><b>{feature.title}</b>{feature.description && <small>{feature.description}</small>}</div>
                </div>
              ))}
            </div>
          ) : <p className="muted smallText">No feature snapshot was recorded for this version.</p>}
        </details>
        {user.role === 'admin' && !version.confirmed && <button onClick={() => confirmVersion(version._id)}>Confirm this version</button>}
      </article>
    );
  }

  async function sendQuotation() {
    const projectId = selected;
    setQuotationError('');
    if (!selectedQuotationVersion) {
      setQuotationError('Select a confirmed requirement version before sending the quotation.');
      return;
    }
    const developerCost = Number(quotation.developerCost);
    const otherCosts = Number(quotation.otherCosts);
    if (!Number.isFinite(developerCost) || developerCost < 0 ||
      !Number.isFinite(otherCosts) || otherCosts < 0) {
      setQuotationError('Enter valid non-negative developer and other costs.');
      return;
    }
    const total = developerCost + otherCosts;
    const agreedBudget = detail?.project?.budgetNegotiation?.agreedAmount;
    if (Number.isFinite(agreedBudget) && total >= agreedBudget) {
      setQuotationError(`Quotation total must be less than the agreed budget of ${formatCurrency(agreedBudget)}.`);
      return;
    }
    setQuotationSending(true);
    try {
      const { data } = await api.post(`/projects/${projectId}/quotation`, {
        items: [
          { description: 'Developer cost', amount: developerCost },
          { description: 'Other costs', amount: otherCosts },
        ],
        notes: quotation.notes,
        version: Number(selectedQuotationVersion),
      });
      updateProjectDetail(projectId, current => ({ ...current, quotation: data.quotation }));
    } catch (x) {
      if (x.response?.data?.quotation) {
        updateProjectDetail(projectId, current => ({ ...current, quotation: x.response.data.quotation }));
      }
      setQuotationError(x.response?.data?.message || x.message || 'Could not send the quotation.');
    } finally {
      setQuotationSending(false);
    }
  }

  async function assignDeveloper() {
    const projectId = selected;
    if (!projectId || !selectedDeveloperId) {
      setDeveloperError('Select a developer to assign to this project.');
      return;
    }
    setDeveloperAssignmentLoading(true);
    setDeveloperError('');
    try {
      const { data } = await api.post(`/projects/${projectId}/developer`, {
        developerId: selectedDeveloperId,
      });
      updateProjectDetail(projectId, current => ({
        ...current,
        project: { ...current.project, developer: data.developer },
      }));
      setProjects(current => current.map(project => project._id === projectId
        ? { ...project, developer: data.developer }
        : project));
    } catch (e) {
      setDeveloperError(e.response?.data?.message || e.message);
    } finally {
      setDeveloperAssignmentLoading(false);
    }
  }

  async function sendCounterOffer(e) {
    e.preventDefault();
    const projectId = selected;
    try {
      const { data } = await api.patch(`/projects/${projectId}/counter-offer`, {
        amount: Number(counterOfferForm.amount),
        notes: counterOfferForm.notes,
      });
      updateProjectDetail(projectId, current => ({
        ...current,
        project: {
          ...current.project,
          counterOffer: data.project.counterOffer,
          budgetNegotiation: data.project.budgetNegotiation,
        },
      }));
      setCounterOfferForm({ amount: '', notes: '' });
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    }
  }

  async function sendClientCounterOffer(e) {
    e.preventDefault();
    const projectId = selected;
    try {
      const { data } = await api.patch(`/projects/${projectId}/client-counter-offer`, {
        amount: Number(clientCounterOfferForm.amount),
        notes: clientCounterOfferForm.notes,
      });
      updateProjectDetail(projectId, current => ({
        ...current,
        project: {
          ...current.project,
          clientCounterOffer: data.project.clientCounterOffer,
          budgetNegotiation: data.project.budgetNegotiation,
        },
      }));
      setClientCounterOfferForm({ amount: '', notes: '' });
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    }
  }

  function toggleClientBudgetResponse() {
    if (showClientBudgetResponse) setClientCounterOfferForm({ amount: '', notes: '' });
    setShowClientBudgetResponse(!showClientBudgetResponse);
  }

  async function confirmBudgetOffer() {
    const projectId = selected;
    try {
      const { data } = await api.post(`/projects/${projectId}/budget/confirm`);
      updateProjectDetail(projectId, current => ({
        ...current,
        project: { ...current.project, budgetNegotiation: data.project.budgetNegotiation },
      }));
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    }
  }

  async function postDiscussionMessage(projectId, content) {
    const { data } = await api.post(`/projects/${projectId}/discussions`, { message: content });
    updateProjectDetail(projectId, current => ({
      ...current,
      discussions: [...current.discussions, { ...data, sender: { name: user.name, role: user.role } }],
    }));
  }

  async function sendDiscussion(e) {
    e.preventDefault();
    const projectId = selected;
    try {
      await postDiscussionMessage(projectId, message);
      setMessage('');
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    }
  }

  async function sendBudgetMessage(e) {
    e.preventDefault();
    const projectId = selected;
    try {
      await postDiscussionMessage(projectId, budgetMessage);
      setBudgetMessage('');
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    }
  }

  async function editFeature(feature) {
    const title = prompt('Updated feature title', feature.title);
    if (!title?.trim() || title.trim() === feature.title) return;
    const projectId = selected;
    setFeatureMutationInProgress(true);
    try {
      const { data } = await api.patch(`/projects/${projectId}/features/${feature._id}`, { title: title.trim() });
      updateProjectDetail(projectId, current => ({
        ...current,
        features: current.features.map(item => item._id === feature._id ? data.feature : item),
      }));
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    } finally {
      setFeatureMutationInProgress(false);
    }
  }

  async function removeFeature(featureId) {
    const projectId = selected;
    setFeatureMutationInProgress(true);
    try {
      await api.delete(`/projects/${projectId}/features/${featureId}`);
      updateProjectDetail(projectId, current => ({
        ...current,
        features: current.features.filter(item => item._id !== featureId),
      }));
    } catch (x) {
      setError(x.response?.data?.message || x.message);
    } finally {
      setFeatureMutationInProgress(false);
    }
  }

  function changeProjectLevel(level) {
    setProjectForm({ ...projectForm, level });
    setSelectedSuggestions([]);
  }

  function toggleSuggestion(title) {
    setSelectedSuggestions(current => current.includes(title)
      ? current.filter(item => item !== title)
      : [...current, title]);
  }

  const budgetNegotiation = detail?.project?.budgetNegotiation;
  const activeBudgetOffer = budgetNegotiation?.currentOffer ||
    detail?.project?.counterOffer || detail?.project?.clientOffer;
  const offerProposerRole = activeBudgetOffer?.submittedByRole ||
    (detail?.project?.counterOffer ? 'admin' : 'client');
  const clientConfirmed = budgetNegotiation?.confirmedByClient ?? (offerProposerRole === 'client');
  const adminConfirmed = budgetNegotiation?.confirmedByAdmin ?? (offerProposerRole === 'admin');
  const budgetAgreed = Boolean(budgetNegotiation?.agreedAt);
  const canAdminCounter = Boolean(!budgetAgreed && activeBudgetOffer && offerProposerRole === 'client');
  const canClientCounter = Boolean(!budgetAgreed && activeBudgetOffer && offerProposerRole === 'admin');
  const isInfoPage = ['/service', '/contact', '/about'].includes(location.pathname);
  const requirementBusy = featureMutationInProgress || savingVersion;
  const suggestedClientMessages = detail ? [
    'Could you clarify the requirements for this idea?',
    'Can we discuss the features I selected?',
    'What is the estimated timeline for this idea?'
  ] : [];

  function resetProfileCloseTimer() {
    if (!profileMenuOpen) return;
    window.clearTimeout(profileCloseTimer.current);
    profileCloseTimer.current = window.setTimeout(() => setProfileMenuOpen(false), 1000);
  }

  function renderOtpVerificationForm() {
    const purposeText = authChallenge?.purpose === 'verify-email' ? 'verify your email address' : 'complete your sign-in';
    return (
      <>
        <p className="otpPrompt">We’re sending a 6-digit code to <b>{authChallenge?.email}</b> to {purposeText}. It may take a few moments to arrive.</p>
        <form className="otpForm" onSubmit={verifyOtp}>
          <p className="otpLabel" id="otp-label">Verification code</p>
          <div className="otpDigitGroup" role="group" aria-labelledby="otp-label">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={element => { otpInputRefs.current[index] = element; }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${index + 1} of 6`}
                maxLength={index === 0 ? 6 : 1}
                autoFocus={index === 0}
                value={digit}
                onChange={e => changeOtpDigit(index, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(index, e)}
                onPaste={e => pasteOtp(index, e)}
                required
              />
            ))}
          </div>
          <p className="otpExpiryHint">Code expires in 10 minutes.</p>
          <button className="wideButton" disabled={otpSubmitting || otpResending || otp.length !== 6}>{otpSubmitting ? 'Verifying...' : 'Verify and continue'}</button>
          <button type="button" className="secondary" onClick={resendOtp} disabled={otpResending || otpSubmitting || resendSeconds > 0}>
            {otpResending ? 'Sending code...' : resendSeconds > 0 ? `Resend code in ${Math.floor(resendSeconds / 60)}:${String(resendSeconds % 60).padStart(2, '0')}` : 'Resend code'}
          </button>
          <button type="button" className="authTextButton" onClick={cancelAuthChallenge}>Use a different email</button>
        </form>
        {authNotice && <p className="authNotice" role="status">{authNotice}</p>}
      </>
    );
  }

  if (showSplash) {
    return (
      <main className="splashScreen" role="status" aria-label="Loading TXO portal">
        <div className="splashContent">
          <div className="splashLogo">TX</div>
          <p className="splashEyebrow">TXO COMPANY</p>
          <span className="splashProgress" />
        </div>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className="shell loadingShell" aria-live="polite" aria-busy="true">
        <header className="appHeader">
          <div className="brand"><Skeleton className="skeletonLogo" /><div className="skeletonBrand"><Skeleton className="skeletonEyebrow" /><Skeleton className="skeletonBrandTitle" /></div></div>
          <Skeleton className="skeletonUser" />
        </header>
        <div className="layout">
          <aside className="panel sidebar">
            <div className="sectionTitle"><Skeleton className="skeletonSubheading" /><Skeleton className="skeletonCount" /></div>
            <div className="projectSkeletonList">{Array.from({ length: 3 }, (_, index) => <div className="projectSkeleton" key={index}><Skeleton className="skeletonCircle" /><div><Skeleton className="skeletonFeatureTitle" /><Skeleton className="skeletonFeatureText" /></div></div>)}</div>
          </aside>
          <section className="panel content"><ProjectDetailSkeleton /></section>
        </div>
      </main>
    );
  }

  if (!user && location.pathname === '/verify-otp' && authChallenge) {
    return (
      <main className="auth">
        <section className="panel authPanel otpPage">
          <div className="otpShield" aria-hidden="true">✓</div>
          <p className="eyebrow">SECURE VERIFICATION</p>
          <h1>{authChallenge.purpose === 'verify-email' ? 'Verify your email' : 'Confirm it’s you'}</h1>
          <p className="muted">{authChallenge.purpose === 'verify-email' ? 'Verify your email to activate your TXO account.' : 'Enter the one-time code to safely sign in to your account.'}</p>
          {renderOtpVerificationForm()}
          {error && <p className="error" role="alert">{error}</p>}
        </section>
      </main>
    );
  }

  if (!user && location.pathname === '/register') {
    return (
      <main className="auth">
        <section className="panel authPanel">
          <div className="brandMark">TX</div>
          <p className="eyebrow">TXO COMPANY</p>
          <h1>{authChallenge ? (authChallenge.purpose === 'verify-email' ? 'Verify your email' : 'Verify your sign-in') : 'Create your account'}</h1>
          <p className="muted">{authChallenge ? 'Enter the code we emailed you to continue.' : 'Set up a client account to start planning your idea.'}</p>
          {authChallenge ? renderOtpVerificationForm() : (
            <>
              <form onSubmit={register}>
                <label>Full name<input placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
                <label>Email<input placeholder="you@example.com" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
                <label>Password
                  <span className="passwordField">
                    <input placeholder="At least 8 characters" type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} minLength="8" required />
                    <button type="button" className="passwordToggle" aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible(visible => !visible)}>{passwordVisible ? 'Hide' : 'Show'}</button>
                  </span>
                </label>
                <button className="wideButton" disabled={authSubmitting}>{authSubmitting ? 'Sending code...' : 'Create account'}</button>
              </form>
              {authNotice && <p className="authNotice" role="status">{authNotice}</p>}
              <p className="authSwitch">Already have an account? <Link to="/login">Sign in</Link></p>
            </>
          )}
          {error && <p className="error" role="alert">{error}</p>}
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth">
        <section className="panel authPanel">
          <div className="brandMark">TX</div>
          <p className="eyebrow">TXO COMPANY</p>
          <h1>{authChallenge ? (authChallenge.purpose === 'verify-email' ? 'Verify your email' : 'Verify your sign-in') : 'Project Requirement Portal'}</h1>
          <p className="muted">{authChallenge ? 'Enter the code we emailed you to continue.' : 'A clear place to shape, discuss, and track your next project.'}</p>
          {!authChallenge && location.state?.notice && <p className="authNotice">{location.state.notice}</p>}
          {authChallenge ? renderOtpVerificationForm() : (
            <>
              <form onSubmit={login}>
                <label>Email<input placeholder="you@example.com" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
                <label>Password
                  <span className="passwordField">
                    <input placeholder="Enter your password" type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                    <button type="button" className="passwordToggle" aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible(visible => !visible)}>{passwordVisible ? 'Hide' : 'Show'}</button>
                  </span>
                </label>
                <button className="wideButton" disabled={authSubmitting}>{authSubmitting ? 'Sending code...' : 'Sign in'}</button>
              </form>
              {authNotice && <p className="authNotice" role="status">{authNotice}</p>}
              <p className="authSwitch">New to TXO? <Link to="/register">Create a client account</Link></p>
            </>
          )}
          {error && <p className="error" role="alert">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="appHeader">
        <div className="brand">
          <div className="brandMark">TX</div>
          <div><p className="eyebrow">TXO COMPANY</p><h1>Requirement Workspace</h1></div>
        </div>
        <div className="user">
          <div className="profileMenuWrap" onPointerMove={resetProfileCloseTimer} onPointerDown={resetProfileCloseTimer} onFocusCapture={resetProfileCloseTimer} onKeyDown={resetProfileCloseTimer}>
            <button type="button" className="profileTrigger" aria-expanded={profileMenuOpen} aria-haspopup="true" onClick={() => setProfileMenuOpen(open => !open)}>
              <span className="userAvatar">{user.name?.charAt(0)?.toUpperCase()}</span>
              <span className="userMeta"><b>{user.name}</b><small>{user.role}</small></span>
              <span className="profileChevron" aria-hidden="true">⌄</span>
            </button>
            {profileMenuOpen && (
              <div className="profileDropdown">
                <div className="profileDropdownHead">
                  <span className="profileDropdownAvatar">{user.name?.charAt(0)?.toUpperCase()}</span>
                  <span><b>{user.name}</b><small>{user.role} account</small></span>
                </div>
                <p className="profileDropdownLabel">EXPLORE TXO</p>
                <nav aria-label="Profile menu">
                  <Link to="/service" onClick={() => setProfileMenuOpen(false)}><span className="profileItemIcon">S</span><span>Services</span><span className="profileItemArrow">›</span></Link>
                  <Link to="/contact" onClick={() => setProfileMenuOpen(false)}><span className="profileItemIcon">C</span><span>Contact</span><span className="profileItemArrow">›</span></Link>
                  <Link to="/about" onClick={() => setProfileMenuOpen(false)}><span className="profileItemIcon">A</span><span>About</span><span className="profileItemArrow">›</span></Link>
                  <button type="button" className="profileLogout" onClick={logout}><span className="profileItemIcon">↪</span><span>Sign out</span></button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </header>

      {error && <p className="error notice" role="alert">{error}<button className="dismiss" onClick={() => setError('')} aria-label="Dismiss error">×</button></p>}

      {isInfoPage ? (
        <section className="panel infoPage">
          <Link className="infoBackLink" to="/">← <span>Back to workspace</span></Link>
          {location.pathname === '/service' && (
            <>
              <div className="infoHero">
                <div className="infoHeroMark">S</div>
                <div><p className="eyebrow">TXO SERVICES</p><h2>Project planning and support</h2><p className="muted">Shape your idea, agree on scope, and keep every project decision in one place.</p></div>
              </div>
              <div className="infoCardGrid">
                <article className="infoCard"><span className="infoCardIndex">01</span><h3>Requirement planning</h3><p>Choose features and review updates to the project scope.</p></article>
                <article className="infoCard"><span className="infoCardIndex">02</span><h3>Budget discussion</h3><p>Submit offers, discuss counter-offers, and confirm the agreed amount.</p></article>
                <article className="infoCard"><span className="infoCardIndex">03</span><h3>Project tracking</h3><p>Follow requirement history, team messages, and quotations in your workspace.</p></article>
              </div>
            </>
          )}
          {location.pathname === '/contact' && (
            <>
              <div className="infoHero">
                <div className="infoHeroMark">C</div>
                <div><p className="eyebrow">CONTACT TXO</p><h2>We’re here to help</h2><p className="muted">For project-specific help, message the TXO team through your project workspace.</p></div>
              </div>
              <div className="contactCard">
                <span className="contactIcon" aria-hidden="true">☎</span>
                <div><p className="contactLabel">DEMO CONTACT</p><h3>+91 00000 00000</h3><small>Sample placeholder only — replace with your official contact number.</small></div>
              </div>
            </>
          )}
          {location.pathname === '/about' && (
            <>
              <div className="infoHero">
                <div className="infoHeroMark">TX</div>
                <div><p className="eyebrow">ABOUT TXO</p><h2>Requirement &amp; Quotation Portal</h2><p className="muted">A shared workspace for clients and the TXO team to plan requirements, discuss budgets, and track decisions.</p></div>
              </div>
              <div className="aboutDetails">
                <div className="aboutBrandMark">TXO</div>
                <div className="aboutMeta">
                  <p><span>App version</span><b>1.0.0</b></p>
                  <p><span>Produced by</span><b>TXO Team</b></p>
                </div>
              </div>
            </>
          )}
        </section>
      ) : (
      <div className="layout">
        <aside className="panel sidebar">
          <div className="sectionTitle"><div><p className="eyebrow">OVERVIEW</p><h2>{user.role === 'client' ? 'Ideas' : 'Your projects'}</h2></div><span className="countBadge">{projects.length}</span></div>
          {projectsLoading && projects.length === 0 ? (
            <div className="projectSkeletonList" aria-label={user.role === 'client' ? 'Loading ideas' : 'Loading projects'} aria-busy="true">
              {Array.from({ length: 3 }, (_, index) => <div className="projectSkeleton" key={index}><Skeleton className="skeletonCircle" /><div><Skeleton className="skeletonFeatureTitle" /><Skeleton className="skeletonFeatureText" /></div></div>)}
            </div>
          ) : projects.length === 0 ? <p className="muted smallText">{user.role === 'client' ? 'Your ideas will appear here.' : 'Your projects will appear here.'}</p> : null}
          <nav className="projectNav" aria-label={user.role === 'client' ? 'Ideas' : 'Projects'}>
            {projects.map(p => (
              <button className={`projectLink ${selected === p._id && !creatingProject ? 'active' : ''}`} key={p._id} onClick={() => { setCreatingProject(false); loadDetail(p._id); }}>
                <span className="projectIcon">{p.title?.charAt(0)?.toUpperCase()}</span>
                <span className="projectLinkText">{p.title}<small>{p.level} <i>·</i> {p.status}</small><small className="requestedAt">Requested {formatRequestedAt(p.createdAt)}</small></span>
                <span className="projectChevron">›</span>
              </button>
            ))}
          </nav>
          {user.role === 'client' && <button className="wideButton newProjectButton" onClick={() => setCreatingProject(true)}>＋ New idea</button>}
        </aside>

        <section className="panel content">
          {detailLoading ? <ProjectDetailSkeleton /> : user.role === 'client' && (creatingProject || !detail) ? (
            <div className="projectSetup">
              <div className="setupIntro">
                <p className="eyebrow">GET STARTED</p>
                <h2>Tell us about your idea</h2>
                <p className="muted">Choose a website type and the features that match your goals. You can update these requirements later.</p>
              </div>
              <form onSubmit={createProject} className="setupForm">
                <div className="setupFields">
                  <label>Idea name<input placeholder="e.g. Customer portal" value={projectForm.title} onChange={e => setProjectForm({ ...projectForm, title: e.target.value })} required /></label>
                  <label>Website type
                    <select value={projectForm.websiteType} onChange={e => setProjectForm({ ...projectForm, websiteType: e.target.value })}>
                      {websiteTypes.map(type => <option key={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="setupDescription">What are you building?<textarea placeholder="Share a few details about your idea..." value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} /></label>
                  <label>Idea scope
                    <select value={projectForm.level} onChange={e => changeProjectLevel(e.target.value)}>
                      <option>Basic</option><option>Medium</option><option>Advanced</option>
                    </select>
                  </label>
                  <label>Your budget offer (₹)<input type="number" min="0" step="0.01" value={projectForm.offerAmount} onChange={e => setProjectForm({ ...projectForm, offerAmount: e.target.value })} placeholder="Enter your budget offer" required /></label>
                  <label className="setupDescription">Offer note (optional)<textarea maxLength="1000" placeholder="Add context for your proposed budget..." value={projectForm.offerNotes} onChange={e => setProjectForm({ ...projectForm, offerNotes: e.target.value })} /></label>
                </div>
                <div className="suggestionHeader setupSuggestionHeader">
                  <div><b>Choose your features</b><small>Select the suggestions you want included in your idea</small></div>
                  <span>{selectedSuggestions.length} selected</span>
                </div>
                <div className="suggestionList setupSuggestionList">
                  {suggestionsLoading ? Array.from({ length: 6 }, (_, index) => (
                    <div className="suggestionSkeleton" key={index}><Skeleton className="skeletonCheck" /><Skeleton className="skeletonSuggestionText" /></div>
                  )) : suggestions.map(feature => (
                    <label className={`suggestionOption ${selectedSuggestions.includes(feature.title) ? 'checked' : ''}`} key={feature.title}>
                      <input type="checkbox" checked={selectedSuggestions.includes(feature.title)} onChange={() => toggleSuggestion(feature.title)} />
                      <span className="customCheck" aria-hidden="true">{selectedSuggestions.includes(feature.title) ? '✓' : ''}</span>
                      <span className="suggestionCopy"><b>{feature.title}</b><small>{feature.description}</small></span>
                    </label>
                  ))}
                </div>
                <p className="selectionHint">Select at least one feature. The TXO team can help refine your requirements later.</p>
                <div className="setupActions">
                  {projects.length > 0 && <button type="button" className="secondary" onClick={() => { setCreatingProject(false); setDetail(null); }}>Cancel</button>}
                  <button className="wideButton" disabled={suggestionsLoading || selectedSuggestions.length === 0}>Create idea <span aria-hidden="true">→</span></button>
                </div>
              </form>
            </div>
          ) : !detail ? (
            <div className="empty">
              <div className="emptyIcon">✦</div>
              <p className="eyebrow">YOUR WORKSPACE</p>
              <h2>Bring your next idea to life</h2>
              <p>Select a project to view requirements and conversations, or start a project from the panel.</p>
            </div>
          ) : (
            <>
              <div className="projectHeading">
                <div>
                  <p className="eyebrow">{detail.project.level} {user.role === 'client' ? 'IDEA' : 'PROJECT'} <span className="headingDot">·</span> REQUIREMENTS</p>
                  <h2>{detail.project.title}</h2>
                  <p className="typeLabel">{detail.project.websiteType || 'General website'}</p>
                  <p className="projectDescription">{detail.project.description || `No ${user.role === 'client' ? 'idea' : 'project'} description provided.`}</p>
                </div>
                <span className="status">{detail.project.status}</span>
              </div>

              <section className="workspaceSection">
                <div className="sectionTitle"><div><p className="eyebrow">PROJECT SCOPE</p><h3>Current features</h3></div><span className="countBadge">{detail.features.length}</span></div>
                <div className="featureList">
                  {detail.features.length === 0 && <p className="muted smallText">No features have been added yet.</p>}
                  {detail.features.map(f => (
                    <article className="featureCard" key={f._id}>
                      <span className="featureCheck">✓</span><div className="featureCopy"><b>{f.title}</b><p>{f.description}</p></div>
                      {user.role === 'admin' && <div className="inline featureActions"><button className="secondary" disabled={requirementBusy} onClick={() => editFeature(f)}>Edit</button><button className="danger" disabled={requirementBusy} onClick={() => removeFeature(f._id)}>Remove</button></div>}
                    </article>
                  ))}
                </div>
                {user.role === 'admin' && (
                  <>
                    <form className="inline featureForm" onSubmit={addFeature}>
                      <input placeholder="Add a feature title" value={feature.title} onChange={e => setFeature({ ...feature, title: e.target.value })} disabled={requirementBusy} required />
                      <input placeholder="Short description (optional)" value={feature.description} onChange={e => setFeature({ ...feature, description: e.target.value })} disabled={requirementBusy} />
                      <button disabled={requirementBusy}>{featureMutationInProgress ? 'Saving feature...' : 'Add feature'}</button>
                    </form>
                    {featureMutationInProgress && <p className="muted smallText" role="status">Saving requirement changes...</p>}
                    <button onClick={saveVersion} disabled={requirementBusy}>{savingVersion ? 'Saving version...' : 'Save new requirement version'}</button>
                  </>
                )}
              </section>

              {user.role !== 'developer' && (
                <section className="offerPanel">
                  <div className="sectionTitle">
                    <div><p className="eyebrow">BUDGET DISCUSSION</p><h3>Client offer &amp; counter offer</h3></div>
                  </div>
                  {budgetAgreed ? (
                    <div className="dealDone">
                      <span className="dealBadge">DEAL AGREED</span>
                      <strong>{formatCurrency(budgetNegotiation.agreedAmount)}</strong>
                      <p>Both the client and admin confirmed this amount.</p>
                      <small>Agreed {formatRequestedAt(budgetNegotiation.agreedAt)}</small>
                    </div>
                  ) : (
                    <>
                      <div className="offerCards">
                        <article className="offerCard">
                          <span>Client offer</span>
                          <strong>{detail.project.clientOffer ? formatCurrency(detail.project.clientOffer.amount) : 'Not provided'}</strong>
                          {detail.project.clientOffer?.notes && <p>{detail.project.clientOffer.notes}</p>}
                        </article>
                        <article className={`offerCard ${detail.project.counterOffer ? 'counterOfferCard' : ''}`}>
                          <span>Admin counter offer</span>
                          <strong>{detail.project.counterOffer ? formatCurrency(detail.project.counterOffer.amount) : 'Awaiting response'}</strong>
                          {detail.project.counterOffer?.notes && <p>{detail.project.counterOffer.notes}</p>}
                        </article>
                        {detail.project.clientCounterOffer && (
                          <article className="offerCard clientReCounterCard">
                            <span>Client re-counter offer</span>
                            <strong>{formatCurrency(detail.project.clientCounterOffer.amount)}</strong>
                            {detail.project.clientCounterOffer.notes && <p>{detail.project.clientCounterOffer.notes}</p>}
                          </article>
                        )}
                      </div>
                      {activeBudgetOffer && (
                        <div className="activeOffer">
                          <div className="activeOfferHeading">
                            <div><span>Current offer</span><strong>{formatCurrency(activeBudgetOffer.amount)}</strong></div>
                            <small>Proposed by {offerProposerRole}</small>
                          </div>
                          <div className="offerConfirmations">
                            <span className={clientConfirmed ? 'offerConfirmed' : 'offerPending'}>{clientConfirmed ? '✓ Client confirmed' : 'Waiting for client'}</span>
                            <span className={adminConfirmed ? 'offerConfirmed' : 'offerPending'}>{adminConfirmed ? '✓ Admin confirmed' : 'Waiting for admin'}</span>
                          </div>
                          {user.role === 'client' && !clientConfirmed && <button onClick={confirmBudgetOffer}>Agree to this amount</button>}
                          {user.role === 'admin' && !adminConfirmed && <button onClick={confirmBudgetOffer}>Agree to this amount</button>}
                        </div>
                      )}
                      {user.role === 'admin' && detail.project.clientOffer && canAdminCounter && (
                        <form className="counterOfferForm" onSubmit={sendCounterOffer}>
                          <label>Counter offer (₹)<input type="number" min="0" step="0.01" value={counterOfferForm.amount} onChange={e => setCounterOfferForm({ ...counterOfferForm, amount: e.target.value })} placeholder="Enter counter offer" required /></label>
                          <label>Message to client<textarea maxLength="1000" value={counterOfferForm.notes} onChange={e => setCounterOfferForm({ ...counterOfferForm, notes: e.target.value })} placeholder="Explain the counter offer (optional)" /></label>
                          <button>{detail.project.counterOffer ? 'Update counter offer' : 'Send counter offer'}</button>
                        </form>
                      )}
                      {user.role === 'admin' && detail.project.clientOffer && !canAdminCounter && (
                        <p className="muted smallText">Waiting for the client to respond to the current offer.</p>
                      )}
                      {user.role === 'client' && detail.project.clientOffer && (
                        <>
                          <button type="button" className="secondary" disabled={!showClientBudgetResponse && !canClientCounter} onClick={toggleClientBudgetResponse}>
                            {showClientBudgetResponse ? 'Close budget response' : canClientCounter ? 'Re-counter offer' : 'Waiting for admin counter offer'}
                          </button>
                          {showClientBudgetResponse && canClientCounter && (
                            <form className="counterOfferForm" onSubmit={sendClientCounterOffer}>
                              <label>Re-counter offer (₹)<input type="number" min="0" step="0.01" value={clientCounterOfferForm.amount} onChange={e => setClientCounterOfferForm({ ...clientCounterOfferForm, amount: e.target.value })} placeholder="Enter your re-counter offer" required /></label>
                              <label>Message to admin<textarea maxLength="1000" value={clientCounterOfferForm.notes} onChange={e => setClientCounterOfferForm({ ...clientCounterOfferForm, notes: e.target.value })} placeholder="Explain your re-counter offer (optional)" /></label>
                              <button>{detail.project.clientCounterOffer ? 'Update re-counter offer' : 'Send re-counter offer'}</button>
                            </form>
                          )}
                        </>
                      )}
                    </>
                  )}
                  {user.role === 'client' && !budgetAgreed && showClientBudgetResponse && (
                    <form className="budgetMessageForm" onSubmit={sendBudgetMessage}>
                      {budgetSuggestionsLoading ? (
                        <p className="muted smallText">Loading budget suggestions...</p>
                      ) : budgetMessageSuggestions.length > 0 && (
                        <div className="suggestedMessages budgetSuggestedMessages">
                          <p>Suggested budget messages to admin</p>
                          <div className="suggestedMessageList">
                            {budgetMessageSuggestions.map(suggestion => (
                              <button className="messageSuggestion" type="button" key={suggestion} onClick={() => setBudgetMessage(suggestion)}>{suggestion}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <label>Message to admin about this budget
                        <textarea maxLength="1000" value={budgetMessage} onChange={e => setBudgetMessage(e.target.value)} placeholder="Ask a question or share a note about the offer..." required />
                      </label>
                      <button>Send message to admin</button>
                      <p className="muted smallText">This message will also appear in the team discussion.</p>
                    </form>
                  )}
                </section>
              )}

              <section className="workspaceSection">
                <div className="sectionTitle"><div><p className="eyebrow">CURRENT VERSION</p><h3>{detail.versions[0] ? `Version ${detail.versions[0].version}` : 'Requirements'}</h3></div></div>
                {detail.versions.length === 0 ? <p className="muted smallText">No versions have been saved yet.</p> : renderRequirementVersion(detail.versions[0], true)}
                {detail.versions.length > 1 && (
                  <details className="requirementHistory">
                    <summary><span>History</span><span className="snapshotCount">{detail.versions.length - 1}</span></summary>
                    {detail.versions.slice(1).map(version => renderRequirementVersion(version))}
                  </details>
                )}
              </section>

              {user.role === 'admin' && (
                <section className="subpanel">
                  <p className="eyebrow">TEAM</p>
                  <h3>Assign developer</h3>
                  {developersLoading ? <p className="muted smallText">Loading developers...</p> : developers.length === 0 ? (
                    <p className="muted smallText">No developer accounts found. Create a user with the developer role first.</p>
                  ) : (
                    <>
                      <label htmlFor="project-developer">Developer</label>
                      <select id="project-developer" value={selectedDeveloperId} onChange={e => setSelectedDeveloperId(e.target.value)}>
                        <option value="">Select a developer</option>
                        {developers.map(developer => (
                          <option key={developer._id} value={developer._id}>{developer.name} ({developer.email})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={assignDeveloper}
                        disabled={developerAssignmentLoading || !selectedDeveloperId || selectedDeveloperId === (detail.project.developer?._id || '')}
                      >
                        {developerAssignmentLoading ? 'Assigning developer...' : detail.project.developer?._id ? 'Update developer' : 'Assign developer'}
                      </button>
                    </>
                  )}
                  {detail.project.developer && <p className="muted smallText">Assigned: {detail.project.developer.name} ({detail.project.developer.email})</p>}
                  {developerError && <p className="error" role="alert">{developerError}</p>}
                </section>
              )}
              {user.role === 'admin' && <section className="subpanel"><p className="eyebrow">PRICING</p><h3>Quotation</h3><label htmlFor="quotation-version">Requirement version</label><select id="quotation-version" value={selectedQuotationVersion} onChange={e => setSelectedQuotationVersion(e.target.value)}><option value="">Select a confirmed version</option>{detail.versions.filter(version => version.confirmed).map(version => <option key={version._id} value={version.version}>Version {version.version}</option>)}</select>{!detail.versions.some(version => version.confirmed) && <p className="muted smallText">Confirm a requirement version before sending a quotation.</p>}<div className="quotationFields"><label>Developer cost (₹)<input type="number" min="0" step="0.01" value={quotation.developerCost} onChange={e => setQuotation({ ...quotation, developerCost: e.target.value })} /></label><label>Other costs (₹)<input type="number" min="0" step="0.01" value={quotation.otherCosts} onChange={e => setQuotation({ ...quotation, otherCosts: e.target.value })} /></label></div><p className="muted smallText">Quotation total: {formatCurrency(Number(quotation.developerCost || 0) + Number(quotation.otherCosts || 0))}{Number.isFinite(detail.project.budgetNegotiation?.agreedAmount) ? ` · Agreed budget: ${formatCurrency(detail.project.budgetNegotiation.agreedAmount)}` : ''}</p><textarea placeholder="Quotation notes" value={quotation.notes} onChange={e => setQuotation({ ...quotation, notes: e.target.value })} /><button onClick={sendQuotation} disabled={quotationSending || !selectedQuotationVersion}>{quotationSending ? 'Sending quotation...' : 'Email quotation to client & developer'}</button>{quotationError && <p className="error" role="alert">{quotationError}</p>}</section>}
              {detail.quotation && <p className={detail.quotation.sentAt ? 'success' : 'error'}>Quotation total: ₹{detail.quotation.total} · {detail.quotation.sentAt ? `Mail server accepted for ${detail.quotation.sentTo?.join(' and ')}. Check spam/junk if missing.` : detail.quotation.sentTo?.length ? `Mail server accepted for ${detail.quotation.sentTo.join(' and ')}; another recipient was not accepted.` : 'Email was not accepted by the mail server.'}</p>}

              <section className="workspaceSection discussionSection">
                <p className="eyebrow">TEAM MESSAGES</p><h3>Discussion</h3>
                {detail.discussions.length === 0 && <p className="muted smallText">No messages yet. Start the conversation.</p>}
                {detail.discussions.map(d => <p className="chat" key={d._id}><b>{d.sender.name} <span>({d.sender.role})</span></b>{d.message}</p>)}
                {user.role === 'client' && (
                  <div className="suggestedMessages">
                    <p>Suggested messages to admin</p>
                    <div className="suggestedMessageList">
                      {suggestedClientMessages.map(suggestion => (
                        <button className="messageSuggestion" type="button" key={suggestion} onClick={() => setMessage(suggestion)}>{suggestion}</button>
                      ))}
                    </div>
                  </div>
                )}
                <form className="inline discussionForm" onSubmit={sendDiscussion}><input placeholder="Write a message..." value={message} onChange={e => setMessage(e.target.value)} required /><button aria-label="Send message">Send <span aria-hidden="true">→</span></button></form>
                {user.role === 'developer' && <p className="hint">Developer access is read-only for requirements. Discuss changes with the admin.</p>}
              </section>
            </>
          )}
        </section>
      </div>
      )}
    </main>
  );
}
