import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
const Register = () => {
  const [activeRole, setActiveRole] = useState('Admin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const { register } = useAuth();

  const redirectByRole = (role) => {
    navigate('/admin');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);

    const res = await register(
      name.trim(),
      email.trim(),
      password,
      activeRole,
      confirmPassword
    );

    if (res.success) {
      redirectByRole(res.role);
    } else {
      setError(res.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="register-page flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="register-hero-glow absolute inset-0 pointer-events-none" aria-hidden />

      <div className="relative z-10 text-center mb-8 max-w-lg">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center border border-[#3b82f6]/30">
          <Shield className="text-[#60a5fa]" size={26} strokeWidth={2} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-crm-text tracking-tight">AgencyOS</h1>
        <p className="mt-2 text-sm text-slate-400">Create your Super Admin account</p>
      </div>

      <div className="register-card w-full max-w-[560px] relative z-10 p-7 sm:p-9">
        
        <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm text-center font-medium">
          This registration page is exclusively for Super Administrators. Team members and clients will be provided their login credentials directly by the Super Admin.
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="register-grid">
            <div>
              <label className="register-label-upper" htmlFor="reg-name">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="register-input-plain"
                placeholder="John Doe"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="register-label-upper" htmlFor="reg-email">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="register-input-plain"
                placeholder="john@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="register-label-upper" htmlFor="reg-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="register-input-plain pr-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="register-label-upper" htmlFor="reg-confirm">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="register-input-plain pr-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-slate-400 leading-relaxed">
            Use 8+ characters with uppercase, lowercase, a number, and a special character.
          </p>

          <label className="mt-5 flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="register-checkbox mt-0.5"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <span className="text-xs text-slate-500 leading-relaxed">
              I agree to the{' '}
              <span className="text-[#3b82f6] font-semibold">Terms of Service</span> and{' '}
              <span className="text-[#3b82f6] font-semibold">Privacy Policy</span>.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="login-submit w-full mt-6 disabled:opacity-60"
          >
            {loading ? (
              <span className="text-slate-400">Creating account...</span>
            ) : (
              <>
                <span className="text-[#3b82f6] font-bold">Register Super Admin</span>
                <ArrowRight size={18} className="text-[#3b82f6]" strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="relative z-10 mt-8 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-[#3b82f6] font-bold hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
};

export default Register;
