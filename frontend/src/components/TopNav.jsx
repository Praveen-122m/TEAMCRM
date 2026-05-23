import { useState } from 'react';
import { Search, Settings, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { resolveMediaUrl } from '../utils/mediaUrl';
import NotificationBell from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

export const TopNav = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const avatarUrl = user?.profileImage ? resolveMediaUrl(user.profileImage) : null;

  return (
    <header className="h-16 border-b border-crm-border bg-crm-card/50 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-crm-textMuted hover:text-white hover:bg-crm-border/30 transition-colors"
        >
          <Menu size={20} />
        </button>


      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <NotificationBell />

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1 pl-3 pr-1 rounded-full border border-crm-border hover:border-crm-primary/50 transition-colors bg-crm-darker/30"
          >
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-medium text-crm-text">{user?.name || 'User'}</span>
              <span className="text-xs text-crm-textMuted">{user?.role || 'Guest'}</span>
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
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-crm-card border border-crm-border shadow-xl py-1 z-50">
              <div className="px-4 py-2 border-b border-crm-border mb-1 sm:hidden">
                <p className="text-sm font-medium text-crm-text">{user?.name}</p>
                <p className="text-xs text-crm-textMuted">{user?.role}</p>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/settings');
                }}
                className="w-full text-left px-4 py-2 text-sm text-crm-textMuted hover:text-crm-text hover:bg-crm-border/30 flex items-center gap-2 transition-colors"
              >
                <Settings size={16} />
                Settings
              </button>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
