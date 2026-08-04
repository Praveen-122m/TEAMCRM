import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Bell, Smartphone, Volume2, CheckSquare, MessageCircle, FileText, ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationSettings = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    soundEnabled: true,
    taskNotifications: true,
    mentionNotifications: true,
    fileNotifications: true,
    messageNotifications: true,
    emailNotifications: true,
  });

  useEffect(() => {
    if (user?.settings) {
      setSettings(prev => ({
        ...prev,
        ...user.settings
      }));
    }
  }, [user]);

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await api.put('/users/settings', settings);
      // Update local context
      if (res.data) {
        // Just merge settings into current user context object
        const updatedUser = { ...user, settings: res.data.settings };
        // Assuming we can re-trigger a fetch or update local state manually. For safety, just toast.
        toast.success('Notification settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-crm-bg custom-scrollbar text-crm-text p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-crm-textMuted hover:text-crm-text mb-6 transition-colors">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Notification Settings</h1>
            <p className="text-sm text-crm-textMuted mt-1">Manage how and when you want to be notified.</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-crm-primary hover:bg-crm-primaryHover text-crm-primary-text rounded-xl font-medium transition-colors shadow-md disabled:opacity-70"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
            <span>Save Changes</span>
          </button>
        </div>



        <div className="bg-crm-card border border-crm-border rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-crm-border/50 bg-crm-darker/30">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Bell className="text-crm-accent" size={20} />
              Delivery Methods
            </h2>
          </div>
          <div className="p-5 space-y-6">
            


            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Volume2 className="text-emerald-500" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Notification Sounds</h3>
                  <p className="text-xs text-crm-textMuted mt-0.5">Play a short ping sound when a new in-app notification arrives.</p>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('soundEnabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.soundEnabled ? 'bg-crm-primary' : 'bg-crm-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${settings.soundEnabled ? 'translate-x-6 bg-crm-primary-text' : 'translate-x-1 bg-white'}`} />
              </button>
            </div>

          </div>
        </div>

        <div className="bg-crm-card border border-crm-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-crm-border/50 bg-crm-darker/30">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CheckSquare className="text-crm-accent" size={20} />
              Notification Categories
            </h2>
          </div>
          <div className="p-5 space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-crm-primary/10 flex items-center justify-center shrink-0">
                  <CheckSquare className="text-crm-primary" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Task Updates</h3>
                  <p className="text-xs text-crm-textMuted mt-0.5">Alert me when I'm assigned a task or its status changes.</p>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('taskNotifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.taskNotifications ? 'bg-crm-primary' : 'bg-crm-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${settings.taskNotifications ? 'translate-x-6 bg-crm-primary-text' : 'translate-x-1 bg-white'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="text-amber-500" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Mentions & Messages</h3>
                  <p className="text-xs text-crm-textMuted mt-0.5">Alert me when someone mentions me or sends a direct message.</p>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('mentionNotifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.mentionNotifications ? 'bg-crm-primary' : 'bg-crm-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${settings.mentionNotifications ? 'translate-x-6 bg-crm-primary-text' : 'translate-x-1 bg-white'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                  <FileText className="text-rose-500" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">File Sharing</h3>
                  <p className="text-xs text-crm-textMuted mt-0.5">Alert me when a file is uploaded to my channels.</p>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('fileNotifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.fileNotifications ? 'bg-crm-primary' : 'bg-crm-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${settings.fileNotifications ? 'translate-x-6 bg-crm-primary-text' : 'translate-x-1 bg-white'}`} />
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default NotificationSettings;
