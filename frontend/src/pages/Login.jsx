import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Key } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [useSecretCode, setUseSecretCode] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await login(
      useSecretCode ? null : email,
      password,
      useSecretCode ? secretCode : null
    );

    if (res.success) {
      // The Layout component will handle role-based redirection
      navigate('/');
    } else {
      setError(res.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-crm-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crm-primary/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-crm-accent/20 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md z-10">
        <div className="glass-panel p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-crm-primary to-crm-accent rounded-2xl flex items-center justify-center shadow-glow mb-4">
              <span className="text-white text-3xl font-bold">C</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-crm-textMuted">Sign in to AgencyOS</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!useSecretCode ? (
              <div>
                <label className="block text-sm font-medium text-crm-textMuted mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-textMuted" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input w-full pl-10"
                    placeholder="you@agency.com"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-crm-textMuted mb-2">Secret Code</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-textMuted" size={20} />
                  <input
                    type="text"
                    required
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                    className="glass-input w-full pl-10"
                    placeholder="Enter your secret ID"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-crm-textMuted mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-textMuted" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setUseSecretCode(!useSecretCode)}
                className="text-crm-primary hover:text-crm-primaryHover transition-colors"
              >
                {useSecretCode ? 'Use Email instead' : 'Use Secret Code instead'}
              </button>
              <Link to="/forgot-password" className="text-crm-textMuted hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-button h-12 text-lg disabled:opacity-50 mt-4"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-crm-textMuted">
            Don't have an account?{' '}
            <Link to="/register" className="text-crm-primary hover:text-crm-primaryHover font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
