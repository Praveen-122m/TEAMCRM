import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { instagramService } from '../services/instagramService';
import { clientService } from '../services/clientService';
import { StatCard } from '../components/StatCard';
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { 
  Instagram,
  Users,
  Eye,
  Target,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  TrendingUp,
  Download,
  ExternalLink,
  Calendar,
  Grid,
  Video,
  Award,
  Search,
  Filter,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';

const InstagramAnalytics = () => {
  const { user, activeWorkspace } = useAuth();
  const wsId = activeWorkspace || user?.workspaces?.[0];

  // States
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [profile, setProfile] = useState(null);
  const [followersHistory, setFollowersHistory] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphDays, setGraphDays] = useState('30');
  const [sortBy, setSortBy] = useState('date');
  const [gridTab, setGridTab] = useState('all'); // 'all', 'posts', 'reels'
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch list of clients
  const fetchClients = useCallback(async () => {
    if (user.role === 'Client' && user.clientProfileId) {
      setSelectedClient(user.clientProfileId);
      return;
    }
    try {
      const res = await clientService.getClients(user.role === 'Admin' ? undefined : wsId);
      const list = res.data || [];
      setClients(list);
      if (list.length > 0) {
        setSelectedClient(list[0]._id);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  }, [user.role, user.clientProfileId, wsId]);

  // Load Instagram Data
  const loadInstagramData = useCallback(async () => {
    if (!selectedClient) return;
    setLoading(true);
    setError(null);
    try {
      const [profileRes, historyRes, mediaRes] = await Promise.all([
        instagramService.getProfile(selectedClient),
        instagramService.getFollowersHistory(selectedClient, graphDays),
        instagramService.getMedia(selectedClient, undefined, sortBy)
      ]);

      setProfile(profileRes.data);
      setFollowersHistory(historyRes.data);
      setMedia(mediaRes.data);
    } catch (err) {
      console.error('Failed to fetch Instagram analytics:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch Instagram analytics';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedClient, graphDays, sortBy]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (selectedClient) {
      loadInstagramData();
    }
  }, [selectedClient, graphDays, sortBy, loadInstagramData]);

  // Trigger export
  const handleExport = (format) => {
    if (!selectedClient) return toast.error('Select a client first');
    const url = instagramService.getExportUrl(selectedClient, format);
    window.open(url, '_blank');
  };

  // Helper stats computed from media list
  const totalLikes = media.reduce((acc, item) => acc + (item.like_count || 0), 0);
  const totalComments = media.reduce((acc, item) => acc + (item.comments_count || 0), 0);
  const totalImpressions = media.reduce((acc, item) => acc + (item.insights?.impressions || 0), 0);
  const totalReach = media.reduce((acc, item) => acc + (item.insights?.reach || 0), 0);
  const totalSaved = media.reduce((acc, item) => acc + (item.insights?.saved || 0), 0);
  const totalShares = media.reduce((acc, item) => acc + (item.insights?.shares || 0), 0);
  const totalVideoViews = media.reduce((acc, item) => acc + (item.insights?.video_views || 0), 0);

  // Filter media based on search and tab selections
  const filteredMedia = media.filter(item => {
    const matchesSearch = item.caption?.toLowerCase().includes(searchTerm.toLowerCase());
    if (gridTab === 'posts') {
      return matchesSearch && (item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM');
    }
    if (gridTab === 'reels') {
      return matchesSearch && item.media_type === 'VIDEO';
    }
    return matchesSearch;
  });

  // Top Performing Posts (Sorted by Engagement = Likes + Comments + Saves)
  const topPerforming = [...media].sort((a, b) => {
    const engA = a.like_count + a.comments_count + (a.insights?.saved || 0);
    const engB = b.like_count + b.comments_count + (b.insights?.saved || 0);
    return engB - engA;
  }).slice(0, 3);

  // Separate Reels Section Data
  const reelsList = media.filter(item => item.media_type === 'VIDEO');

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-crm-border/40 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-crm-text tracking-tight flex items-center gap-2">
            <Instagram className="text-pink-500" size={32} />
            Instagram Dashboard
          </h1>
          <p className="text-crm-textMuted text-sm mt-1">
            Instagram Business profile analysis, engagement tracking, and content grid.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user.role === 'Admin' && clients.length > 0 && (
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="glass-input cursor-pointer min-w-[200px] text-sm bg-crm-darker/90 font-semibold"
            >
              {clients.map(c => (
                <option key={c._id} value={c._id}>{c.companyName || c.name}</option>
              ))}
            </select>
          )}

          {/* Export buttons */}
          <div className="flex items-center gap-1.5">
            <button 
              type="button" 
              onClick={() => handleExport('pdf')}
              className="glass-button-secondary p-2.5 text-crm-textMuted hover:text-rose-400 border border-crm-primary/5 hover:border-rose-500/20"
              title="Export Instagram Report PDF"
            >
              <FileText size={18} />
            </button>
            <button 
              type="button" 
              onClick={() => handleExport('csv')}
              className="glass-button-secondary p-2.5 text-crm-textMuted hover:text-emerald-400 border border-crm-primary/5 hover:border-emerald-500/20"
              title="Export Instagram Report CSV"
            >
              <FileSpreadsheet size={18} />
            </button>
            <button 
              type="button" 
              onClick={() => handleExport('excel')}
              className="glass-button-secondary p-2.5 text-crm-textMuted hover:text-blue-400 border border-crm-primary/5 hover:border-blue-500/20"
              title="Export Instagram Report Excel"
            >
              <FileSpreadsheet size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-40">
          <div className="animate-spin h-10 w-10 border-t-2 border-crm-primary rounded-full" />
        </div>
      ) : error ? (
        <div className="glass-panel p-8 border border-red-500/20 bg-red-500/5 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 max-w-2xl mx-auto my-12">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <Instagram size={36} />
          </div>
          <h2 className="text-xl font-bold text-crm-text">Instagram Connection Error</h2>
          <p className="text-crm-textMuted text-sm leading-relaxed">
            {error}
          </p>
          <div className="pt-4 flex gap-4">
            <button 
              onClick={loadInstagramData}
              className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-sm transition-all shadow-lg shadow-pink-600/20"
            >
              Retry Sync
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* PROFILE HEADER UI */}
          <div className="glass-panel p-6 border border-pink-500/10 bg-gradient-to-r from-pink-500/5 via-transparent to-transparent rounded-2xl flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-amber-500 p-1 flex-shrink-0">
              <div className="w-full h-full rounded-full bg-crm-card flex items-center justify-center text-crm-text overflow-hidden">
                {profile?.profile_picture_url ? (
                  <img src={profile.profile_picture_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <Instagram size={40} className="text-pink-500" />
                )}
              </div>
            </div>
            
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <h2 className="text-2xl font-black text-crm-text flex flex-col md:flex-row items-center gap-2">
                  @{profile?.username || 'instagram_business'}
                  <span className="text-xs bg-pink-500/20 text-pink-400 font-semibold py-1 px-2.5 rounded-full border border-pink-500/30">IG Business</span>
                </h2>
                {profile?.name && <p className="text-sm text-crm-textMuted font-medium mt-0.5">{profile.name}</p>}
              </div>

              {profile?.biography && (
                <p className="text-sm text-crm-text max-w-xl">{profile.biography}</p>
              )}

              {profile?.website && (
                <a 
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-pink-400 font-semibold hover:underline flex items-center justify-center md:justify-start gap-1"
                >
                  <ExternalLink size={14} /> {profile.website}
                </a>
              )}

              {/* Followers count row */}
              <div className="flex flex-wrap justify-center md:justify-start gap-8 pt-2">
                <div className="text-center md:text-left">
                  <span className="text-xl font-black text-crm-text">{(profile?.followers_count || 0).toLocaleString()}</span>
                  <p className="text-xs text-crm-textMuted font-semibold uppercase tracking-wider">Followers</p>
                </div>
                <div className="text-center md:text-left">
                  <span className="text-xl font-black text-crm-text">{(profile?.follows_count || 0).toLocaleString()}</span>
                  <p className="text-xs text-crm-textMuted font-semibold uppercase tracking-wider">Following</p>
                </div>
                <div className="text-center md:text-left">
                  <span className="text-xl font-black text-crm-text">{(profile?.media_count || 0).toLocaleString()}</span>
                  <p className="text-xs text-crm-textMuted font-semibold uppercase tracking-wider">Posts</p>
                </div>
                <div className="text-center md:text-left border-l border-crm-border/40 pl-6 hidden sm:block">
                  <span className="text-xl font-black text-pink-400">{profile?.engagement_rate || '0.00'}%</span>
                  <p className="text-xs text-crm-textMuted font-semibold uppercase tracking-wider">Engagement Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* TOP ANALYTICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Impressions" 
              value={totalImpressions.toLocaleString()} 
              icon={Eye} 
              color="indigo" 
            />
            <StatCard 
              title="Total Reach" 
              value={totalReach.toLocaleString()} 
              icon={Target} 
              color="primary" 
            />
            <StatCard 
              title="Post Likes" 
              value={totalLikes.toLocaleString()} 
              icon={Heart} 
              color="rose" 
            />
            <StatCard 
              title="Post Comments" 
              value={totalComments.toLocaleString()} 
              icon={MessageCircle} 
              color="emerald" 
            />
            <StatCard 
              title="Post Saves" 
              value={totalSaved.toLocaleString()} 
              icon={Bookmark} 
              color="amber" 
            />
            <StatCard 
              title="Shares" 
              value={totalShares.toLocaleString()} 
              icon={Share2} 
              color="violet" 
            />
            <StatCard 
              title="Profile Visits" 
              value={(profile?.profile_visits || 0).toLocaleString()} 
              icon={Users} 
              color="fuchsia" 
            />
            <StatCard 
              title="Account Engagement" 
              value={`${profile?.engagement_rate || '0.00'}%`} 
              icon={TrendingUp} 
              color="pink" 
            />
          </div>

          {/* FOLLOWER GROWTH GRAPH */}
          <div className="glass-panel p-6 border border-crm-border/30 rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-crm-text">Date-Wise Follower Growth Graph</h3>
                <p className="text-xs text-crm-textMuted mt-0.5">Chronological follower growth trends over selected days.</p>
              </div>
              <div className="flex bg-crm-darker/60 rounded-lg p-0.5 border border-crm-primary/10">
                {['7', '30', '90', '180'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setGraphDays(opt)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-200 ${
                      graphDays === opt
                        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                        : 'text-crm-textMuted hover:text-crm-text'
                    }`}
                  >
                    {opt}D
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-80">
              {followersHistory.length === 0 ? (
                <div className="flex h-full items-center justify-center text-crm-textMuted text-sm">No historical metrics configured for this client yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={followersHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v.toLocaleString()} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc' }} />
                    <Area type="monotone" dataKey="followers_count" name="Followers" stroke="#ec4899" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFollowers)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* TOP PERFORMING CONTENT SECTION */}
          <div className="glass-panel p-6 border border-crm-border/30 rounded-2xl">
            <div className="mb-6 flex items-center gap-2 text-crm-text">
              <Award className="text-amber-400" size={22} />
              <div>
                <h3 className="text-lg font-bold">Top Performing Posts</h3>
                <p className="text-xs text-crm-textMuted">Highest engagement posts sorted by interaction metrics.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topPerforming.map((post, idx) => (
                <div key={post.media_id} className="glass-card overflow-hidden hover:border-pink-500/30 transition-all group duration-300 relative">
                  <div className="absolute top-3 left-3 bg-amber-500/90 text-black font-black text-xs px-2.5 py-1 rounded-lg z-10 flex items-center gap-1">
                    <Award size={12} /> #{idx + 1}
                  </div>

                  <div className="h-44 relative bg-black/40 overflow-hidden flex items-center justify-center shrink-0">
                    <img 
                      src={post.media_url} 
                      alt={post.caption} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                      <span className="flex items-center gap-1.5 text-crm-text font-bold text-sm"><Heart size={16} className="fill-rose-500 text-rose-500" /> {post.like_count}</span>
                      <span className="flex items-center gap-1.5 text-crm-text font-bold text-sm"><MessageCircle size={16} className="fill-emerald-500 text-emerald-500" /> {post.comments_count}</span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <p className="text-xs text-crm-text leading-relaxed line-clamp-2 min-h-[32px]">{post.caption || 'No caption provided.'}</p>
                    <div className="flex justify-between items-center text-[10px] text-crm-textMuted border-t border-crm-border/40 pt-3">
                      <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                      <span className="bg-pink-500/10 text-pink-400 font-semibold px-2 py-0.5 rounded">{post.media_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MEDIA GRID & REELS CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Grid left (ColSpan 2) */}
            <div className="lg:col-span-2 glass-panel p-6 border border-crm-border/30 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-crm-text">Instagram Content Grid</h3>
                    <p className="text-xs text-crm-textMuted mt-0.5">Explore posts, carousels, and reels.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-1.5 bg-crm-darker/60 border border-crm-border px-3 py-1.5 rounded-xl">
                      <Filter size={12} className="text-crm-textMuted" />
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent border-none text-xs text-crm-text focus:outline-none cursor-pointer"
                      >
                        <option value="date" className="bg-crm-card">Date</option>
                        <option value="likes" className="bg-crm-card">Likes</option>
                        <option value="comments" className="bg-crm-card">Comments</option>
                        <option value="engagement" className="bg-crm-card">Engagement</option>
                        <option value="reach" className="bg-crm-card">Reach</option>
                      </select>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-textMuted" />
                      <input 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        type="text" 
                        placeholder="Search caption..." 
                        className="glass-input pl-8 py-1.5 text-xs w-40" 
                      />
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-crm-border/40 mb-6">
                  <button onClick={() => setGridTab('all')} className={`px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 ${gridTab === 'all' ? 'text-pink-400 border-b-2 border-pink-500' : 'text-crm-textMuted hover:text-crm-text'}`}>
                    <Grid size={14} /> All Content
                  </button>
                  <button onClick={() => setGridTab('posts')} className={`px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 ${gridTab === 'posts' ? 'text-pink-400 border-b-2 border-pink-500' : 'text-crm-textMuted hover:text-crm-text'}`}>
                    <Grid size={14} /> Posts
                  </button>
                  <button onClick={() => setGridTab('reels')} className={`px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 ${gridTab === 'reels' ? 'text-pink-400 border-b-2 border-pink-500' : 'text-crm-textMuted hover:text-crm-text'}`}>
                    <Video size={14} /> Reels
                  </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {filteredMedia.map(item => (
                    <div key={item.media_id} className="glass-card group overflow-hidden border border-crm-border hover:border-pink-500/20 transition-all flex flex-col justify-between">
                      <div className="h-36 relative bg-black/30 overflow-hidden flex items-center justify-center shrink-0">
                        <img src={item.media_url} alt={item.caption} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-lg text-crm-text">
                          {item.media_type === 'VIDEO' ? <Video size={12} /> : <Grid size={12} />}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <span className="flex items-center gap-1 text-crm-text font-bold text-xs"><Heart size={12} className="fill-rose-500 text-rose-500" /> {item.like_count}</span>
                          <span className="flex items-center gap-1 text-crm-text font-bold text-xs"><MessageCircle size={12} className="fill-emerald-500 text-emerald-500" /> {item.comments_count}</span>
                        </div>
                      </div>
                      <div className="p-3 space-y-2 flex-grow flex flex-col justify-between">
                        <p className="text-[11px] text-crm-textMuted line-clamp-2 leading-relaxed min-h-[32px]">{item.caption || 'No caption.'}</p>
                        <div className="flex justify-between items-center border-t border-crm-border/40 pt-2 text-[9px] text-crm-textMuted">
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                          <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="text-pink-400 font-semibold hover:underline flex items-center gap-0.5">
                            Permalink <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredMedia.length === 0 && (
                    <p className="col-span-3 text-center py-12 text-crm-textMuted text-xs font-semibold">No media items match filters.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Grid Right: Instagram Reels metrics panel (Views, interaction stats) */}
            <div className="glass-panel p-6 border border-crm-border/30 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-crm-text flex items-center gap-2">
                  <Video className="text-pink-500" size={20} />
                  Instagram Reels
                </h3>
                <p className="text-xs text-crm-textMuted mt-0.5">Performance statistics for Reel videos.</p>
              </div>

              <div className="space-y-4 max-h-[58vh] overflow-y-auto custom-scrollbar pr-1">
                {reelsList.map(reel => (
                  <div key={reel.media_id} className="p-3 bg-crm-darker/40 border border-crm-border/60 rounded-xl flex gap-3 hover:border-pink-500/25 transition-colors">
                    <div className="w-16 h-20 rounded-lg overflow-hidden shrink-0 bg-black/20">
                      <img src={reel.media_url} alt={reel.caption} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <p className="text-xs text-crm-text truncate font-semibold">{reel.caption || 'No caption.'}</p>
                        <span className="text-[10px] text-crm-textMuted font-medium">{new Date(reel.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 border-t border-crm-border/30 pt-1.5">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-crm-textMuted font-semibold">Views</span>
                          <span className="text-[11px] text-pink-400 font-bold">{(reel.insights?.video_views || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-crm-textMuted font-semibold">Likes</span>
                          <span className="text-[11px] text-crm-text font-bold">{reel.like_count}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-crm-textMuted font-semibold">Comments</span>
                          <span className="text-[11px] text-crm-text font-bold">{reel.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {reelsList.length === 0 && (
                  <p className="text-center py-12 text-crm-textMuted text-xs font-semibold">No video reels configured yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramAnalytics;
