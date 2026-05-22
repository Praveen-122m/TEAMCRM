import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, Image as ImageIcon, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { fileService } from '../services/fileService';
import { downloadMediaFile } from '../utils/downloadFile';
import { resolveMediaUrl, isImageFile } from '../utils/mediaUrl';

const FileManager = () => {
  const { activeWorkspace, user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const workspaceId = activeWorkspace || user?.workspaces?.[0];

  const fetchFiles = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fileService.getFiles(workspaceId);
      setFiles(res.data || []);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) {
      if (!workspaceId) toast.error('Select a workspace first');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      await fileService.uploadFile(formData);
      toast.success('File uploaded');
      fetchFiles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = (file) => {
    const name = file.originalName || file.name;
    downloadMediaFile(file.url, name);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await fileService.deleteFile(id);
      toast.success('File deleted');
      fetchFiles();
    } catch {
      toast.error('Delete failed');
    }
  };

  const getFileIcon = (file) => {
    if (isImageFile(file.mimeType, file.url)) return <ImageIcon className="text-emerald-400" size={24} />;
    return <FileText className="text-violet-400" size={24} />;
  };

  if (!workspaceId) {
    return (
      <div className="glass-panel p-8 text-center text-crm-textMuted">
        <p>No workspace selected. Join or open a workspace first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">File Manager</h1>
          <p className="text-crm-textMuted text-sm mt-1">Manage creatives, reports, and client documents.</p>
        </div>
        <div>
          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="glass-button disabled:opacity-50">
            <Upload size={18} /> {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-10 w-10 border-t-2 border-crm-primary rounded-full" />
        </div>
      ) : files.length === 0 ? (
        <div className="glass-panel p-12 text-center text-crm-textMuted">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p>No files yet. Upload your first file.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div key={file._id} className="glass-card p-4 group relative">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <button type="button" onClick={() => handleDownload(file)} className="p-1.5 bg-crm-darker/90 rounded hover:text-crm-primary" title="Download">
                  <Download size={14} />
                </button>
                <button type="button" onClick={() => handleDelete(file._id)} className="p-1.5 bg-crm-darker/90 rounded hover:text-rose-400" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>

              {isImageFile(file.mimeType, file.url) ? (
                <img src={resolveMediaUrl(file.url)} alt="" className="w-full h-28 object-cover rounded-lg mb-3" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-crm-darker/50 flex items-center justify-center mb-4">
                  {getFileIcon(file)}
                </div>
              )}

              <p className="text-sm font-medium text-white truncate mb-1" title={file.originalName || file.name}>
                {file.originalName || file.name}
              </p>
              <div className="flex justify-between items-center text-xs text-crm-textMuted">
                <span>{((file.size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                <span>{new Date(file.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileManager;
