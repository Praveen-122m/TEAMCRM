import { useState } from 'react';
import { Search, Settings, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { resolveMediaUrl } from '../utils/mediaUrl';
import NotificationBell from './NotificationBell';

export const TopNav = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const avatarUrl = user?.profileImage ? resolveMediaUrl(user.profileImage) : null;
  const isEffectiveSuperAdmin = ['super_admin', 'SuperAdmin', 'superadmin'].includes(
    user?.role ? user.role.toLowerCase().replace(/[\s_]+/g, '') : ''
  ) || (user?.name && user.name.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin'));
  const displayRole = isEffectiveSuperAdmin ? 'Super Admin' : (user?.role || 'Guest');

  return (
    <header className="h-16 border-b border-crm-border bg-crm-card backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-crm-textMuted hover:text-crm-text hover:bg-crm-border/30 transition-colors"
        >
          <Menu size={20} />
        </button>


      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1 pl-3 pr-1 rounded-full border border-crm-border hover:border-crm-primary transition-colors bg-crm-darker"
          >
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-medium text-crm-text">{user?.name || 'User'}</span>
              <span className="text-xs text-crm-textMuted">{displayRole}</span>
            </div>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-crm-border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-crm-primary to-crm-accent flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-crm-card backdrop-blur-xl border border-crm-border shadow-glass p-5 z-50 transform origin-top-right transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col items-center text-center pb-4 border-b border-crm-border">
                <div className="relative mb-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-crm-primary shadow-glow" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-crm-primary to-crm-accent flex items-center justify-center text-white font-bold text-2xl border-2 border-crm-primary shadow-glow">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-crm-card" />
                </div>
                <h4 className="text-base font-bold text-crm-text leading-tight">{user?.name}</h4>
                <p className="text-xs text-crm-textMuted mt-1 mb-2">{user?.email}</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isEffectiveSuperAdmin
                      ? 'bg-purple-500 text-purple-100 border border-purple-500'
                      : user?.role === 'Admin' 
                      ? 'bg-rose-500 text-rose-100 border border-rose-500' 
                      : user?.role === 'Client'
                      ? 'bg-amber-500 text-amber-100 border border-amber-500'
                      : 'bg-crm-primary text-crm-primary-text border border-crm-primary'
                  }`}>
                    {displayRole}
                  </span>
                  {user?.department && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-crm-border text-crm-textMuted border border-crm-border">
                      {user.department}
                    </span>
                  )}
                </div>
              </div>
              <div className="pt-3 space-y-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-crm-textMuted hover:text-crm-text hover:bg-crm-border rounded-xl flex items-center gap-3 transition-all"
                >
                  <Settings size={16} className="text-crm-textMuted" />
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-400 hover:text-rose-100 hover:bg-rose-500 rounded-xl flex items-center gap-3 transition-all"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
