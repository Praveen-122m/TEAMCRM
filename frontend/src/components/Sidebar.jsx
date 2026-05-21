import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  Megaphone, 
  Target, 
  FolderOpen, 
  MessageSquare, 
  BarChart3, 
  Settings,
  X,
  Building,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || 'Guest';

  const menuItems = {
    Admin: [
      { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      { name: 'Office Workspaces', path: '/admin/office-workspaces', icon: Building },
      { name: 'Client Workspaces', path: '/admin/client-workspaces', icon: Briefcase },
      { name: 'Clients', path: '/admin/clients', icon: Users },
      { name: 'Team Members', path: '/admin/members', icon: UserSquare2 },
      { name: 'Meta Ads', path: '/meta-ads', icon: Megaphone },
      { name: 'Lead Center', path: '/leads', icon: Target },
      { name: 'Files', path: '/files', icon: FolderOpen },
      { name: 'Messages', path: '/messages', icon: MessageSquare },
      { name: 'Reports', path: '/reports', icon: BarChart3 },
      { name: 'Settings', path: '/settings', icon: Settings },
    ],
    Member: [
      { name: 'Dashboard', path: '/member', icon: LayoutDashboard },
      { name: 'Assigned Clients', path: '/member/clients', icon: Users },
      { name: 'Campaigns', path: '/meta-ads/campaigns', icon: Megaphone },
      { name: 'Leads', path: '/leads', icon: Target },
      { name: 'Messages', path: '/messages', icon: MessageSquare },
      { name: 'Files', path: '/files', icon: FolderOpen },
    ],
    Client: [
      { name: 'Dashboard', path: '/client', icon: LayoutDashboard },
      { name: 'Meta Ads', path: '/meta-ads', icon: Megaphone },
      { name: 'Campaigns', path: '/meta-ads/campaigns', icon: Target },
      { name: 'Leads', path: '/leads', icon: Users },
      { name: 'Reports', path: '/client/reports', icon: BarChart3 },
      { name: 'Files', path: '/files', icon: FolderOpen },
      { name: 'Messages', path: '/messages', icon: MessageSquare },
    ]
  };

  const items = menuItems[role] || [];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-crm-card/90 backdrop-blur-2xl border-r border-crm-border flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-crm-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crm-primary to-crm-accent flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-xl leading-none tracking-tighter">C</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-crm-textMuted">
              AgencyOS
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden text-crm-textMuted hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          <div className="mb-4 px-3">
            <p className="text-xs font-semibold text-crm-textMuted uppercase tracking-wider">
              {role} Menu
            </p>
          </div>
          
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin' || item.path === '/member' || item.path === '/client'}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                    isActive 
                      ? 'bg-crm-primary/10 text-crm-primary font-medium' 
                      : 'text-crm-text hover:bg-crm-border/30 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-crm-primary rounded-r-full"></div>
                    )}
                    <Icon size={18} className={isActive ? 'text-crm-primary' : 'text-crm-textMuted group-hover:text-white transition-colors'} />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-crm-border">
          <div className="bg-gradient-to-br from-crm-darker to-crm-card border border-crm-border rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-crm-primary/20 blur-2xl rounded-full"></div>
            <p className="text-xs text-crm-textMuted mb-2">Workspace</p>
            <p className="text-sm font-semibold text-white truncate">Main Agency</p>
          </div>
        </div>
      </aside>
    </>
  );
};
