import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, MessageCircle, LogOut, Settings, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { ThemeToggle } from './ThemeToggle';

export const SlimSidebar = ({ workspaceInitial = 'W', workspaceName = 'Workspace', members = [], onlineUsers = [] }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const avatarUrl = user?.profileImage ? resolveMediaUrl(user.profileImage) : null;
  const directMembers = members.filter(m => m._id !== user?._id);

  const paths = ['/channels', '/messages'];
  const activeIndex = paths.findIndex(path => location.pathname.startsWith(path));

  return (
    <div className="w-[70px] bg-crm-darker border-r border-crm-border flex flex-col items-center py-4 justify-between h-full shrink-0 select-none">
      {/* Top: Logo & Navigation */}
      <div className="flex flex-col items-center gap-6 w-full flex-1 min-h-0">
        <div 
          className="w-11 h-11 rounded-xl bg-gradient-to-br  to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-glow cursor-pointer hover:scale-105 transition-transform group relative shrink-0"
        >
          {workspaceInitial}
          <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-crm-card/95 border border-crm-border/60 text-crm-text text-[11px] font-bold shadow-glass tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-200 z-50">
            {workspaceName}
          </div>
        </div>
        
        <div className="w-8 h-[1px] bg-crm-border/60 shrink-0" />

        {/* Center: Navigation Links */}
        <nav className="flex flex-col gap-5 items-center w-full relative shrink-0">
          {/* Sliding active indicator capsule on the left border */}
          <div 
            className="absolute left-0 w-[4px] bg-crm-primary rounded-r-full transition-all duration-300 ease-out pointer-events-none"
            style={{
              height: hoveredIndex !== null ? '28px' : '20px',
              top: `${(hoveredIndex !== null ? hoveredIndex : (activeIndex !== -1 ? activeIndex : 0)) * 64 + (hoveredIndex !== null ? 8 : 12)}px`,
              opacity: activeIndex !== -1 || hoveredIndex !== null ? 1 : 0,
              transform: activeIndex !== -1 || hoveredIndex !== null ? 'scaleY(1)' : 'scaleY(0)',
              transitionProperty: 'top, height, opacity, transform',
            }}
          />

          <NavLink
            to="/channels"
            onMouseEnter={() => setHoveredIndex(0)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={({ isActive }) =>
              `w-11 h-11 rounded-xl flex items-center justify-center transition-all group relative ${
                isActive
                  ? 'bg-crm-primary/20 text-crm-primary border border-crm-primary/30 shadow-glow'
                  : 'text-crm-textMuted hover:text-crm-text hover:bg-crm-border/30'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <MessageSquare size={20} className="transition-transform duration-200 group-hover:scale-110" />
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-crm-card/95 border border-crm-border/60 text-crm-text text-[11px] font-bold shadow-glass tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-200 z-50">
                  Team Chat
                </div>
              </>
            )}
          </NavLink>

          <NavLink
            to="/messages"
            onMouseEnter={() => setHoveredIndex(1)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={({ isActive }) =>
              `w-11 h-11 rounded-xl flex items-center justify-center transition-all group relative ${
                isActive
                  ? 'bg-crm-primary/20 text-crm-primary border border-crm-primary/30 shadow-glow'
                  : 'text-crm-textMuted hover:text-crm-text hover:bg-crm-border/30'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <MessageCircle size={20} className="transition-transform duration-200 group-hover:scale-110" />
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-crm-card/95 border border-crm-border/60 text-crm-text text-[11px] font-bold shadow-glass tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-200 z-50">
                  Direct Messages
                </div>
              </>
            )}
          </NavLink>
        </nav>

        {/* Divider before members */}
        {directMembers.length > 0 && (
          <div className="w-8 h-[1px] bg-crm-border/60 shrink-0" />
        )}

        {/* Scrollable Members List */}
        {directMembers.length > 0 && (
          <div className="flex-1 w-full overflow-y-auto custom-scrollbar flex flex-col items-center gap-4 py-1 min-h-0">
            {directMembers.map((member) => {
              const isOnline = onlineUsers.includes(member._id);
              return (
                <button
                  key={member._id}
                  onClick={() => navigate('/messages', { state: { selectUserId: member._id } })}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-all group relative hover:bg-crm-border/30 shrink-0"
                >
                  <div className="relative shrink-0 w-9 h-9">
                    {member.profileImage ? (
                      <img 
                        src={resolveMediaUrl(member.profileImage)} 
                        alt="" 
                        className="w-full h-full rounded-xl object-cover border border-crm-border/50 group-hover:border-crm-primary/50 transition-colors" 
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-tr /20 to-violet-600/20 border border-crm-border/50 group-hover:border-crm-primary/50 text-crm-primary flex items-center justify-center text-xs font-bold transition-colors">
                        {member.name?.charAt(0)}
                      </div>
                    )}
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0f111a]" />
                    )}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-crm-card/95 border border-crm-border/60 text-crm-text text-[11px] font-bold shadow-glass tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-200 z-50">
                    {member.name}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom: Theme, Settings & Profile Avatar */}
      <div className="flex flex-col items-center gap-4 relative mt-auto pt-4 pb-2 shrink-0">
        
        <div className="relative group flex items-center justify-center w-11 h-11">
          <ThemeToggle />
          <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-crm-card/95 border border-crm-border/60 text-crm-text text-[11px] font-bold shadow-glass tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-200 z-50">
            Theme
          </div>
        </div>

        <NavLink
          to="/settings/notifications"
          className={({ isActive }) =>
            `w-11 h-11 rounded-xl flex items-center justify-center transition-all group relative ${
              isActive
                ? 'bg-crm-primary/20 text-crm-primary border border-crm-primary/30 shadow-glow'
                : 'text-crm-textMuted hover:text-crm-text hover:bg-crm-border/30'
            }`
          }
        >
          <Bell size={20} className="transition-transform duration-200 group-hover:scale-110" />
          <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-crm-card/95 border border-crm-border/60 text-crm-text text-[11px] font-bold shadow-glass tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-200 z-50">
            Notifications
          </div>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `w-11 h-11 rounded-xl flex items-center justify-center transition-all group relative ${
              isActive
                ? 'bg-crm-primary/20 text-crm-primary border border-crm-primary/30 shadow-glow'
                : 'text-crm-textMuted hover:text-crm-text hover:bg-crm-border/30'
            }`
          }
        >
          <Settings size={20} className="transition-transform duration-200 group-hover:scale-110" />
          <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-crm-card/95 border border-crm-border/60 text-crm-text text-[11px] font-bold shadow-glass tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-200 z-50">
            Settings
          </div>
        </NavLink>

        <div className="relative group">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="relative block w-10 h-10 rounded-full border border-crm-border hover:border-crm-primary/60 transition-colors shrink-0 overflow-hidden"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-crm-primary to-crm-accent flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
          </button>
          
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-crm-card/95 border border-crm-border/60 text-crm-text text-[11px] font-bold shadow-glass tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-200 z-50">
            Profile: {user?.name}
          </div>

          {showProfileMenu && (
            <div className="absolute left-[50px] bottom-0 w-64 rounded-2xl bg-crm-card/95 backdrop-blur-xl border border-crm-border/60 shadow-glass p-4 z-50 transform origin-bottom-left animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col items-center text-center pb-3 border-b border-crm-border/40">
                <div className="relative mb-2 shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-crm-primary/50 shadow-glow" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-crm-primary to-crm-accent flex items-center justify-center text-white font-bold text-lg border border-crm-primary/50 shadow-glow">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-crm-card" />
                </div>
                <h4 className="text-sm font-bold text-crm-text leading-tight">{user?.name}</h4>
                <p className="text-[10px] text-crm-textMuted mt-0.5 truncate max-w-[200px]">{user?.email}</p>
              </div>
              <div className="pt-2.5 space-y-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-crm-textMuted hover:text-crm-text hover:bg-crm-border/30 rounded-lg flex items-center gap-2.5 transition-all"
                >
                  <Settings size={14} className="text-crm-textMuted" />
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg flex items-center gap-2.5 transition-all border-t border-crm-border/20 pt-2"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
