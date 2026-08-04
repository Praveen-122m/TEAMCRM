import { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { Loader2, Mail, Briefcase, Award, UserCheck, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../../utils/mediaUrl';

export const UserProfileModal = ({ isOpen, onClose, userId }) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${userId}`);
      setProfile(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load user profile');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const viewerRole = currentUser?.role?.toLowerCase();

  // Determine visibility rules:
  // Admin clicks member -> name, profile photo, designation, role, assigned clients
  // Member clicks member -> name, profile photo, designation, role (exclude clients)
  // Client clicks member -> name, role, profile photo
  const showDesignation = viewerRole === 'admin' || viewerRole === 'member';
  const showDepartment = viewerRole === 'admin' || viewerRole === 'member';
  const showAssignedClients = viewerRole === 'admin';
  const showEmail = viewerRole === 'admin' || viewerRole === 'member';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Profile" maxWidth="max-w-md">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <Loader2 className="animate-spin h-8 w-8 text-crm-primary" />
          <p className="text-sm text-crm-textMuted">Fetching profile...</p>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Avatar and basic info */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-crm-primary to-crm-accent border-4 border-crm-border flex items-center justify-center text-white text-3xl font-extrabold shadow-glow">
                {profile.profileImage ? (
                  <img src={resolveMediaUrl(profile.profileImage)} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  profile.name?.charAt(0).toUpperCase()
                )}
              </div>
              <span className={`absolute bottom-1 right-1 block h-3.5 w-3.5 rounded-full border-2 border-crm-card ${profile.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            </div>
            <div>
              <h4 className="text-xl font-bold text-crm-text tracking-tight">{profile.name}</h4>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-crm-primary/10 text-crm-primary border border-crm-primary/20">
                  {profile.role}
                </span>
                {profile.isOnline && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Online
                  </span>
                )}
              </div>
            </div>
          </div>

          <hr className="border-crm-border/60" />

          {/* Details list */}
          <div className="space-y-4">
            {showEmail && profile.email && profile.role?.toLowerCase() !== 'client' && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-crm-darker text-crm-textMuted">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-xs text-crm-textMuted font-medium">Email Address</p>
                  <p className="text-crm-text mt-0.5 font-medium">{profile.email}</p>
                </div>
              </div>
            )}

            {profile.role?.toLowerCase() === 'client' && (
              <>
                {/* Email Address */}
                {profile.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-crm-darker text-crm-textMuted">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-crm-textMuted font-medium">Email Address</p>
                      <p className="text-crm-text mt-0.5 font-medium">{profile.email}</p>
                    </div>
                  </div>
                )}

                {/* Phone Number */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 rounded-lg bg-crm-darker text-crm-textMuted">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-crm-textMuted font-medium">Phone Number</p>
                    <p className="text-crm-text mt-0.5 font-medium">{profile.phone || '—'}</p>
                  </div>
                </div>

                {/* Workspace Name */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 rounded-lg bg-crm-darker text-crm-textMuted">
                    <Briefcase size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-crm-textMuted font-medium">Workspace</p>
                    <p className="text-crm-text mt-0.5 font-medium">{profile.workspaceName || '—'}</p>
                  </div>
                </div>

                {/* Company Name */}
                {profile.companyName && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-crm-darker text-crm-textMuted">
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-crm-textMuted font-medium">Company Name</p>
                      <p className="text-crm-text mt-0.5 font-medium">{profile.companyName}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {showDesignation && profile.role?.toLowerCase() === 'member' && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-crm-darker text-crm-textMuted">
                  <Award size={16} />
                </div>
                <div>
                  <p className="text-xs text-crm-textMuted font-medium">Designation</p>
                  <p className="text-crm-text mt-0.5 font-medium">{profile.designation || 'Team Member'}</p>
                </div>
              </div>
            )}

            {showDepartment && profile.role?.toLowerCase() === 'member' && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-crm-darker text-crm-textMuted">
                  <Briefcase size={16} />
                </div>
                <div>
                  <p className="text-xs text-crm-textMuted font-medium">Department</p>
                  <p className="text-crm-text mt-0.5 font-medium">{profile.department || 'General'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Assigned Clients (Admin only) */}
          {showAssignedClients && profile.role?.toLowerCase() === 'member' && (
            <>
              <hr className="border-crm-border/60" />
              <div>
                <p className="text-xs text-crm-textMuted font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-crm-primary" />
                  Assigned Clients ({profile.assignedClients?.length || 0})
                </p>
                {profile.assignedClients && profile.assignedClients.length > 0 ? (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar text-crm-text">
                    {profile.assignedClients.map((client) => (
                      <div key={client._id} className="p-2.5 rounded-lg border border-crm-border bg-crm-darker/40 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-crm-text">{client.name}</p>
                          <p className="text-crm-textMuted mt-0.5">{client.companyName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-crm-textMuted italic py-2.5 text-center bg-crm-darker/20 rounded-lg border border-dashed border-crm-border">
                    No clients assigned to this member.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="glass-button w-full sm:w-auto text-xs py-2 px-6"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <p className="text-center py-6 text-sm text-crm-textMuted">No details found.</p>
      )}
    </Modal>
  );
};
