import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Key, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const ROLES = [
  { id: 'Client', label: 'Client' },
  { id: 'Member', label: 'Member' },
  { id: 'Admin', label: 'Admin' },
];

const STORAGE_KEY = 'luxe_login_remember';

const Login = () => {
  const [activeRole, setActiveRole] = useState('Client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  const isClient = activeRole === 'Client';

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved.remember) {
        setRememberDevice(true);
        if (saved.role) setActiveRole(saved.role);
        if (saved.email) setEmail(saved.email);
        if (saved.secretCode) setSecretCode(saved.secretCode);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const saveRemember = () => {
    if (rememberDevice) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          remember: true,
          role: activeRole,
          email: isClient ? '' : email,
          secretCode: isClient ? secretCode : '',
        })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const redirectByRole = (role) => {
    if (role === 'Client') navigate('/client');
    else if (role === 'Member') navigate('/member');
    else if (role === 'Admin') navigate('/admin');
    else navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    if (isClient && !secretCode.trim()) {
      setError('Please enter your Client Secret Key');
      return;
    }
    if (!isClient && !email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    saveRemember();

    const res = await login(
      isClient ? null : email.trim(),
      password,
      isClient ? secretCode.trim() : null
    );

    if (res.success) {
      redirectByRole(res.role);
    } else {
      setError(res.message || 'Login failed. Check your credentials.');
      setLoading(false);
    }
  };

  const handleRequestAccess = () => {
    if (activeRole === 'Admin') {
      navigate('/register');
      return;
    }
    if (activeRole === 'Member') {
      navigate('/register');
      return;
    }
    setError('Client access is provided by your agency admin. Use the Secret Key and password they sent you.');
  };

  return (
    <div className="login-page min-h-screen flex flex-col lg:flex-row">
      {/* Left — brand story */}
      <div className="login-page-left flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 lg:py-20 relative z-10">
        <div className="max-w-xl">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 mb-6 font-semibold">
            AgencyOS · Luxury CRM
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-white leading-[1.1] tracking-tight">
            Elegance in every
            <br />
            <span className="login-gradient-text">interaction.</span>
          </h1>
          <p className="mt-6 text-slate-400 text-sm sm:text-base leading-relaxed max-w-md">
            The premier retail relationship management ecosystem designed exclusively for luxury
            brands. Experience sophisticated analytics, seamless clienteling, and effortless
            inventory mastery.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-3">
              {['S', 'M', 'A'].map((letter, i) => (
                <div
                  key={letter}
                  className="w-10 h-10 rounded-full border-2 border-[#050510] flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, hsl(${220 + i * 30}, 70%, 55%), hsl(${260 + i * 20}, 80%, 45%))`,
                  }}
                >
                  {letter}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500">
              Trusted by <span className="text-slate-300 font-medium">500+</span> luxury global
              boutiques
            </p>
          </div>
        </div>
      </div>

      {/* Right — login card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12 relative">
        <div className="login-glow absolute inset-0 pointer-events-none" aria-hidden />

        <div className="login-card w-full max-w-[420px] relative z-10 p-8 sm:p-10">
          {/* Role tabs */}
          <div className="login-role-tabs mb-8">
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  setActiveRole(role.id);
                  setError('');
                }}
                className={`login-role-tab flex-1 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                  activeRole === role.id
                    ? 'login-role-tab-active text-slate-800'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isClient ? (
              <div>
                <label className="login-label">Client Secret Key</label>
                <div className="login-input-wrap">
                  <Key className="login-input-icon" size={18} strokeWidth={2} />
                  <input
                    type="text"
                    required
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                    className="login-input"
                    placeholder="CL-XXXXXX"
                    autoComplete="username"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="login-label">Email Address</label>
                <div className="login-input-wrap">
                  <Mail className="login-input-icon" size={18} strokeWidth={2} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input"
                    placeholder="you@agency.com"
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="login-label">Password</label>
              <div className="login-input-wrap">
                <Lock className="login-input-icon" size={18} strokeWidth={2} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  placeholder="Enter your passphrase"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={rememberDevice}
                  onClick={() => setRememberDevice(!rememberDevice)}
                  className={`login-toggle ${rememberDevice ? 'login-toggle-on' : ''}`}
                >
                  <span className="login-toggle-knob" />
                </button>
                <span className="text-xs font-medium text-slate-500">Remember device</span>
              </label>
              {!isClient && (
                <Link to="/forgot-password" className="text-xs font-semibold text-[#3b82f6] hover:text-[#2563eb]">
                  Reset access
                </Link>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-submit w-full mt-2 disabled:opacity-60"
            >
              {loading ? (
                <span className="text-slate-400">Signing in...</span>
              ) : (
                <>
                  <span className="text-[#3b82f6] font-bold">Sign In</span>
                  <ArrowRight size={18} className="text-[#3b82f6]" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            New to the LUXE ecosystem?{' '}
            <button
              type="button"
              onClick={handleRequestAccess}
              className="text-[#3b82f6] font-bold hover:underline"
            >
              Request Access
            </button>
            {' · '}
            <Link to="/register" className="text-[#3b82f6] font-bold hover:underline">
              Create account
            </Link>
          </p>

          {isClient && (
            <p className="mt-3 text-center text-[10px] text-slate-400 leading-relaxed">
              Use the Secret Key and password provided by your agency administrator.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
