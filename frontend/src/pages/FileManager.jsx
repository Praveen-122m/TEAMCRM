import { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, Download, Trash2, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

const FileManager = () => {
  const [files, setFiles] = useState([
    { _id: '1', name: 'Q3_Performance_Report.pdf', category: 'report', size: 2450000, date: '2026-05-18' },
    { _id: '2', name: 'Summer_Campaign_Ad.jpg', category: 'image', size: 5400000, date: '2026-05-19' },
    { _id: '3', name: 'Client_Brief_v2.docx', category: 'document', size: 1200000, date: '2026-05-20' },
  ]);
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      toast.success(`Uploading ${file.name}...`);
      // In real app, call fileService.uploadFile
      setTimeout(() => {
        setFiles([{ _id: Date.now().toString(), name: file.name, category: 'other', size: file.size, date: new Date().toISOString().split('T')[0] }, ...files]);
        toast.success('File uploaded successfully');
      }, 1000);
    }
  };

  const getFileIcon = (category) => {
    switch (category) {
      case 'report': return <FileText className="text-violet-400" size={24} />;
      case 'image': return <ImageIcon className="text-emerald-400" size={24} />;
      case 'document': return <FileText className="text-blue-400" size={24} />;
      default: return <FileText className="text-crm-textMuted" size={24} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">File Manager</h1>
          <p className="text-crm-textMuted text-sm mt-1">Manage creatives, reports, and client documents.</p>
        </div>
        <div>
          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="glass-button">
            <Upload size={18} /> Upload File
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {files.map(file => (
          <div key={file._id} className="glass-card p-4 group relative">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button className="p-1.5 bg-crm-darker/80 rounded hover:text-crm-primary"><Download size={14} /></button>
              <button className="p-1.5 bg-crm-darker/80 rounded hover:text-rose-400"><Trash2 size={14} /></button>
            </div>
            
            <div className="w-12 h-12 rounded-xl bg-crm-darker/50 flex items-center justify-center mb-4">
              {getFileIcon(file.category)}
            </div>
            
            <p className="text-sm font-medium text-white truncate mb-1" title={file.name}>{file.name}</p>
            <div className="flex justify-between items-center text-xs text-crm-textMuted">
              <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              <span>{file.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileManager;
