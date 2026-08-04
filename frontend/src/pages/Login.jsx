import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Key, Lock, Mail, ArrowRight, Eye, EyeOff, UserCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const ROLES = [
  { id: 'Client', label: 'Client' },
  { id: 'employee', label: 'Employee' },
  { id: 'intern', label: 'Intern' },
  { id: 'admin', label: 'Admin' },
  { id: 'super_admin', label: 'Super Admin' },
];

const STORAGE_KEY = 'luxe_login_remember';

const Login = () => {
  const [activeRole, setActiveRole] = useState('employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    else if (['employee', 'intern', 'Member'].includes(role)) navigate('/member');
    else if (['admin', 'super_admin', 'Admin', 'SuperAdmin'].includes(role)) navigate('/admin');
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
      isClient ? secretCode.trim() : null,
      activeRole
    );

    if (res.success) {
      redirectByRole(res.role);
    } else {
      setError(res.message || 'Login failed. Check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans text-slate-800">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-1 relative bg-[#090b14] overflow-hidden flex-col items-center justify-center p-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-10 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[25px] border-b-rose-500 transform -rotate-45 blur-[1px]"></div>
        <div className="absolute bottom-1/4 right-10 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[35px] border-b-indigo-500 transform rotate-12 blur-[1px]"></div>
        <div className="absolute top-12 right-12 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[25px] border-b-purple-500 transform -rotate-12 blur-[1px]"></div>

        <div className="relative z-10 flex flex-col items-center max-w-lg text-center">
          <div className="flex items-center gap-3 mb-12">
            {/* Logo placeholder */}
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
              T
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">TeamCRM</h1>
          </div>

          <div className="w-full bg-[#1e2335] rounded-xl border border-white/10 shadow-2xl overflow-hidden mb-12 transform hover:scale-105 transition-transform duration-500">
            {/* Minimalist Dashboard Mockup */}
            <div className="flex items-center gap-2 bg-[#131620] px-4 py-3 border-b border-white/5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            </div>
            <div className="p-5 flex gap-4">
              <div className="w-1/4 space-y-3">
                <div className="h-2 w-full bg-white/10 rounded"></div>
                <div className="h-2 w-3/4 bg-white/10 rounded"></div>
                <div className="h-2 w-5/6 bg-white/10 rounded"></div>
                <div className="h-2 w-full bg-white/10 rounded"></div>
              </div>
              <div className="w-3/4 space-y-4">
                <div className="flex gap-3">
                  <div className="h-16 flex-1 bg-gradient-to-br /20 /20 rounded-lg border border-crm-primary/30"></div>
                  <div className="h-16 flex-1 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-lg border border-rose-500/30"></div>
                </div>
                <div className="h-32 w-full bg-white/5 rounded-lg border border-white/5"></div>
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4">Easy to use Dashboard</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            Choose the best of products/services and manage your team efficiently at the lowest prices.
          </p>
          
          <div className="flex gap-2 mt-8">
            <div className="w-8 h-1 bg-crm-primary rounded-full"></div>
            <div className="w-8 h-1 bg-white/20 rounded-full"></div>
            <div className="w-8 h-1 bg-white/20 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-[#1a1b25] mb-2">Welcome Back</h2>
            <p className="text-slate-500 text-sm">Sign in to continue to your account.</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Role Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Role</label>
              <div className="relative">
                <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  value={activeRole}
                  onChange={(e) => setActiveRole(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-crm-primary focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                >
                  {ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {isClient ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Secret Key</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-crm-primary focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="CL-XXXXXX"
                    autoComplete="username"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-crm-primary focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-crm-primary focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Must be 8 characters at least"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={() => setRememberDevice(!rememberDevice)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5.5 rounded-full transition-colors duration-200 ease-in-out ${rememberDevice ? 'bg-crm-primary' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out absolute top-[3px] left-[3px] ${rememberDevice ? 'translate-x-[18px]' : 'translate-x-0'}`}></div>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-500">Remember device</span>
              </label>
              
              {!isClient && (
                <Link to="/forgot-password" className="text-xs font-semibold text-crm-primary hover:text-crm-primary transition-colors">
                  Reset access
                </Link>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-4 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-medium text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#6366f1] font-bold hover:underline">
              Create account
            </Link>
          </p>

          <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-400 space-y-1 font-mono">
            <div className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-2">Storage Debugger</div>
            <div className="truncate">sessionStorage: {JSON.stringify(Object.keys(sessionStorage))}</div>
            <div className="truncate">localStorage: {JSON.stringify(Object.keys(localStorage).filter(k => k.includes('token') || k.includes('userInfo') || k.includes('activeWorkspace')))}</div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
