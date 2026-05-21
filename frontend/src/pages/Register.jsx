import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Mail, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await register(name, email, password, 'Admin');

    if (res.success) {
      navigate('/admin');
    } else {
      setError(res.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-crm-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-crm-primary/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-crm-accent/20 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md z-10">
        <div className="glass-panel p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-bl from-crm-primary to-crm-accent rounded-2xl flex items-center justify-center shadow-glow mb-4">
              <span className="text-white text-3xl font-bold">C</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Create Workspace</h2>
            <p className="text-crm-textMuted">Start managing your agency</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-crm-textMuted mb-2">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-textMuted" size={20} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full pl-10"
                  placeholder="John Doe"
                />
              </div>
            </div>
            
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
              <p className="text-xs text-crm-textMuted mt-2">Must be at least 8 characters long</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-button h-12 text-lg disabled:opacity-50 mt-4"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-crm-textMuted">
            Already have an account?{' '}
            <Link to="/login" className="text-crm-primary hover:text-crm-primaryHover font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
