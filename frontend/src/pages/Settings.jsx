import { useAuth } from '../hooks/useAuth';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-crm-textMuted text-sm mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="glass-panel p-8">
        <h3 className="text-lg font-bold text-white mb-6 border-b border-crm-border pb-4">Profile Information</h3>
        
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-crm-primary to-crm-accent flex items-center justify-center text-white text-3xl font-bold shadow-glow">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <button className="glass-button-secondary text-sm">Change Avatar</button>
          </div>
        </div>

        <form className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-crm-textMuted mb-2">Full Name</label>
              <input type="text" defaultValue={user?.name} className="glass-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-textMuted mb-2">Email</label>
              <input type="email" defaultValue={user?.email} className="glass-input w-full" disabled />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-crm-textMuted mb-2">Role</label>
            <input type="text" defaultValue={user?.role} className="glass-input w-full opacity-50 cursor-not-allowed" disabled />
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="glass-button">Save Changes</button>
          </div>
        </form>
      </div>

      <div className="glass-panel p-8">
        <h3 className="text-lg font-bold text-white mb-6 border-b border-crm-border pb-4">Theme Preferences</h3>
        <p className="text-sm text-crm-textMuted">Theme is locked to Premium Dark Mode across the application.</p>
      </div>
    </div>
  );
};

export default Settings;
