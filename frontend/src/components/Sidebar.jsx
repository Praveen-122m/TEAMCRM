import { useState, useEffect, useContext } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  Megaphone, 
  Target, 
  FolderOpen, 
  MessageSquare, 
  Settings,
  X,
  Building,
  Briefcase,
  MessageCircle,
  ChevronsLeft,
  FileText
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { SocketContext } from '../context/SocketContext';
import { ThemeToggle } from './ThemeToggle';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, activeWorkspace } = useAuth();
  const { totalUnread } = useContext(SocketContext) || { totalUnread: 0 };
  const rawRole = user?.role || 'Guest';
  
  const isEffectiveSuperAdmin = ['SuperAdmin', 'super_admin', 'superadmin'].includes(rawRole.toLowerCase().replace(/[\s_]+/g, '')) || 
                                (user?.name && user.name.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin'));
  
  let role = rawRole;
  if (isEffectiveSuperAdmin) role = 'SuperAdmin';
  else if (['admin', 'Admin'].includes(rawRole)) role = 'Admin';
  else if (['employee', 'intern'].includes(rawRole)) role = 'Member';

  const location = useLocation();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  // Primary categories configuration with sub-items or direct links
  const categories = {
    SuperAdmin: [
      {
        id: 'home',
        label: 'Home',
        icon: LayoutDashboard,
        items: [
          { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
          { name: 'Admin Tasks', path: '/admin/tasks', icon: Target },
          { name: 'My Tasks', path: '/my-tasks', icon: Target },
        ]
      },
      {
        id: 'workspaces',
        label: 'Workspaces',
        icon: Building,
        items: [
          { name: 'Office Workspaces', path: '/admin/office-workspaces', icon: Building },
          { name: 'Client Workspaces', path: '/admin/client-workspaces', icon: Briefcase },
        ]
      },
      {
        id: 'directory',
        label: 'Directory',
        icon: Users,
        items: [
          { name: 'Clients', path: '/admin/clients', icon: Users },
          { name: 'Team Members', path: '/admin/members', icon: UserSquare2 }
        ]
      },
      {
        id: 'channels',
        label: 'Team Chat',
        icon: MessageSquare,
        path: '/channels'
      },
      {
        id: 'messages',
        label: 'Direct Messages',
        icon: MessageCircle,
        path: '/messages'
      },
      {
        id: 'meta-ads',
        label: 'Meta Ads',
        icon: Megaphone,
        path: '/meta-ads'
      },
      {
        id: 'files',
        label: 'Files',
        icon: FolderOpen,
        path: '/files'
      }
    ],
    Admin: [
      {
        id: 'home',
        label: 'Home',
        icon: LayoutDashboard,
        items: [
          { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
          { name: 'Admin Tasks', path: '/admin/tasks', icon: Target },
          { name: 'My Tasks', path: '/my-tasks', icon: Target },
        ]
      },
      {
        id: 'workspaces',
        label: 'My Assigned Workspaces',
        icon: Building,
        items: [
          { name: 'Office Workspaces', path: '/admin/office-workspaces', icon: Building },
          { name: 'Client Workspaces', path: '/admin/client-workspaces', icon: Briefcase },
        ]
      },
      {
        id: 'directory',
        label: 'Directory',
        icon: Users,
        items: [
          { name: 'Clients', path: '/admin/clients', icon: Users },
          { name: 'Team Members', path: '/admin/members', icon: UserSquare2 },
        ]
      },
      {
        id: 'channels',
        label: 'Team Chat',
        icon: MessageSquare,
        path: '/channels'
      },
      {
        id: 'messages',
        label: 'Direct Messages',
        icon: MessageCircle,
        path: '/messages'
      },
      {
        id: 'files',
        label: 'Files',
        icon: FolderOpen,
        path: '/files'
      }
    ],
    Member: [
      {
        id: 'home',
        label: 'Home',
        icon: LayoutDashboard,
        items: [
          { name: 'Dashboard', path: '/member', icon: LayoutDashboard },
          { name: 'My Tasks', path: '/my-tasks', icon: Target },
        ]
      },
      {
        id: 'workspaces',
        label: 'Workspaces',
        icon: Building,
        items: [
          { name: 'My Workspaces', path: '/member/workspaces', icon: Building },
        ]
      },
      ...(activeWorkspace ? [
        {
          id: 'channels',
          label: 'Team Chat',
          icon: MessageSquare,
          path: '/channels'
        },
        {
          id: 'messages',
          label: 'Direct Messages',
          icon: MessageCircle,
          path: '/messages'
        },
        {
          id: 'files',
          label: 'Files',
          icon: FolderOpen,
          path: '/files'
        }
      ] : [])
    ],
    Client: [
      {
        id: 'home',
        label: 'Home',
        icon: LayoutDashboard,
        items: [
          { name: 'Dashboard', path: '/client', icon: LayoutDashboard },
        ]
      },
      ...(activeWorkspace ? [
        {
          id: 'channels',
          label: 'Team Chat',
          icon: MessageSquare,
          path: '/channels'
        },
        {
          id: 'messages',
          label: 'Direct Messages',
          icon: MessageCircle,
          path: '/messages'
        },
        {
          id: 'meta-ads',
          label: 'Meta Ads',
          icon: Megaphone,
          path: '/meta-ads'
        },
        {
          id: 'files',
          label: 'Files',
          icon: FolderOpen,
          path: '/files'
        }
      ] : [])
    ]
  };

  const roleCategories = categories[role] || [];
  const currentPath = location.pathname;

  // Determine active category based on current pathname matches
  const matchedCategory = roleCategories.find(cat => {
    if (cat.path) {
      return currentPath.startsWith(cat.path);
    }
    return cat.items?.some(item => {
      if (item.path === '/' || item.path === '/admin' || item.path === '/member' || item.path === '/client') {
        return currentPath === item.path;
      }
      return currentPath.startsWith(item.path);
    }) || false;
  });

  const [activeCategoryId, setActiveCategoryId] = useState(matchedCategory?.id || roleCategories[0]?.id || 'home');

  // Sync active category when path changes (e.g. user navigates)
  useEffect(() => {
    if (matchedCategory) {
      setActiveCategoryId(matchedCategory.id);
    }
  }, [currentPath, matchedCategory]);

  const activeCategory = roleCategories.find(c => c.id === activeCategoryId);
  const hasSubmenu = activeCategory && activeCategory.items && activeCategory.items.length > 0 && !activeCategory.path && !isCollapsed;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar - Dual-tier Slim Navigation */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-crm-card border-r border-crm-border flex transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${hasSubmenu ? 'w-[250px]' : 'w-[64px]'}`}
      >
        {/* Tier 1: Slim Category Icon Column */}
        <div className="w-[64px] bg-transparent flex flex-col items-center py-4 border-r border-crm-border shrink-0 justify-between h-full select-none">
          <div className="flex flex-col items-center gap-6 w-full">
            {/* Main Application Logo */}
            <div className="w-8 h-8 rounded-md bg-crm-text flex items-center justify-center shadow-sm">
              <span className="text-crm-card font-bold text-sm leading-none tracking-tighter">C</span>
            </div>
            
            <div className="w-5 h-[1px] bg-crm-border/60" />

            {/* Menu Category Icons */}
            <nav className="flex flex-col gap-3 items-center w-full px-2">
              {roleCategories.filter(cat => cat.id !== 'settings').map(cat => {
                const Icon = cat.icon;
                const isActive = activeCategoryId === cat.id;

                if (cat.path) {
                  return (
                    <NavLink
                      key={cat.id}
                      to={cat.path}
                      onClick={() => window.innerWidth < 1024 && onClose()}
                      className={({ isActive: linkActive }) =>
                        `w-9 h-9 rounded-md flex items-center justify-center transition-all group relative ${
                          linkActive
                            ? 'bg-crm-text text-crm-card shadow-sm'
                            : 'text-crm-textMuted hover:text-crm-text hover:bg-crm-border/40'
                        }`
                      }
                    >
                      <Icon size={16} className="transition-transform duration-200" />
                      <div className="absolute left-full ml-3 px-2 py-1 rounded bg-crm-text text-crm-card text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-5px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-150 z-50">
                        {cat.label}
                      </div>
                    </NavLink>
                  );
                }

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategoryId(cat.id);
                      if (cat.items && cat.items.length > 0) {
                        navigate(cat.items[0].path);
                      }
                    }}
                    className={`w-9 h-9 rounded-md flex items-center justify-center transition-all group relative ${
                      isActive
                        ? 'bg-crm-text text-crm-card shadow-sm'
                        : 'text-crm-textMuted hover:text-crm-text hover:bg-crm-border/40'
                    }`}
                  >
                    <Icon size={16} className="transition-transform duration-200" />
                    <div className="absolute left-full ml-3 px-2 py-1 rounded bg-crm-text text-crm-card text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-5px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-150 z-50">
                      {cat.label}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Actions */}
          <div className="w-full flex flex-col items-center gap-3 mb-2 shrink-0 px-2">
            {/* Collapse Toggle */}
            {activeCategory?.items && activeCategory.items.length > 0 && !activeCategory.path && (
              <button
                type="button"
                onClick={toggleCollapse}
                className="w-9 h-9 rounded-md flex items-center justify-center text-crm-textMuted hover:text-crm-text hover:bg-crm-border/40 transition-all group relative"
              >
                <ChevronsLeft 
                  size={16} 
                  className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
                />
                <div className="absolute left-full ml-3 px-2 py-1 rounded bg-crm-text text-crm-card text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-5px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-150 z-50">
                  {isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                </div>
              </button>
            )}

            <div className="w-5 h-[1px] bg-crm-border/60" />

            <div className="relative group w-9 h-9 flex items-center justify-center">
              <ThemeToggle className="w-9 h-9" />
              <div className="absolute left-full ml-3 px-2 py-1 rounded bg-crm-text text-crm-card text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-5px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-150 z-50">
                Theme
              </div>
            </div>

            <NavLink
              to="/settings"
              onClick={() => window.innerWidth < 1024 && onClose()}
              className={({ isActive }) =>
                `w-9 h-9 rounded-md flex items-center justify-center transition-all group relative ${
                  isActive
                    ? 'bg-crm-text text-crm-card shadow-sm'
                    : 'text-crm-textMuted hover:text-crm-text hover:bg-crm-border/40'
                }`
              }
            >
              <Settings size={16} className="transition-transform duration-200" />
              <div className="absolute left-full ml-3 px-2 py-1 rounded bg-crm-text text-crm-card text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 scale-95 translate-x-[-5px] pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-150 z-50">
                Settings
              </div>
            </NavLink>
          </div>
        </div>

        {/* Tier 2: Sub-menu Pane */}
        {hasSubmenu && (
          <div className="flex-1 flex flex-col h-full bg-transparent">
            {/* Sub-menu Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-crm-border select-none">
              <span className="text-[11px] font-semibold text-crm-textMuted tracking-wider uppercase truncate">
                {activeCategory?.label || 'Menu'}
              </span>
              <button onClick={onClose} className="lg:hidden text-crm-textMuted hover:text-crm-text">
                <X size={16} />
              </button>
            </div>

            {/* Sub-menu Items Scroll */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
              {activeCategory?.items.map((item) => {
                const SubIcon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin' || item.path === '/member' || item.path === '/client'}
                    onClick={() => window.innerWidth < 1024 && onClose()}
                    className={({ isActive }) => 
                      `flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150 group ${
                        isActive 
                          ? 'bg-crm-border/50 text-crm-text font-medium' 
                          : 'text-crm-textMuted hover:bg-crm-border/30 hover:text-crm-text'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <SubIcon size={15} className={isActive ? 'text-crm-text' : 'text-crm-textMuted group-hover:text-crm-text transition-colors'} />
                        <span className="text-sm truncate">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </aside>
    </>
  );
};
