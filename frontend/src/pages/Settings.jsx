import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../utils/mediaUrl';

const Settings = () => {
  const { user, setUser, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setDepartment(user.department || '');
      setAvatarPreview(user.profileImage || '');
    }
  }, [user?._id, user?.name, user?.profileImage, user?.bio, user?.department]);

  const avatarUrl = avatarPreview ? resolveMediaUrl(avatarPreview) : null;

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const up = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarPreview(up.data.url);
      toast.success('Avatar uploaded — click Save Changes');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Avatar upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile', {
        name: name.trim(),
        bio: bio || '',
        department: department || '',
        profileImage: avatarPreview || user?.profileImage || '',
      });
      const updated = {
        ...user,
        ...data,
        profileImage: data.profileImage || avatarPreview || '',
      };
      setUser(updated);
      localStorage.setItem('userInfo', JSON.stringify(updated));
      setAvatarPreview(updated.profileImage || '');
      await refreshUser();
      toast.success('Profile saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-crm-textMuted text-sm mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="glass-panel p-8">
        <h3 className="text-lg font-bold text-white mb-6 border-b border-crm-border pb-4">Profile Information</h3>

        <div className="flex items-center gap-6 mb-8">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-crm-primary/40 shadow-glow" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-crm-primary to-crm-accent flex items-center justify-center text-white text-3xl font-bold shadow-glow">
              {name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="glass-button-secondary text-sm disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Change Avatar'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-crm-textMuted mb-2">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="glass-input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-textMuted mb-2">Email</label>
              <input type="email" value={user?.email || ''} className="glass-input w-full opacity-50 cursor-not-allowed" disabled readOnly />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-crm-textMuted mb-2">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="glass-input w-full min-h-[80px]" placeholder="Short bio..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-crm-textMuted mb-2">Department</label>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="glass-input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-textMuted mb-2">Role</label>
              <input type="text" value={user?.role || ''} className="glass-input w-full opacity-50 cursor-not-allowed" disabled readOnly />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={saving || uploading} className="glass-button disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
