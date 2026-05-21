import { useState, useEffect } from 'react';
import { DataTable } from '../components/DataTable';
import { Download, Mail, Phone, Calendar } from 'lucide-react';
import { formatDate } from '../utils/formatters';

const MetaAdsLeads = () => {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    // Mock Data
    setLeads([
      { _id: '1', name: 'John Smith', email: 'john@example.com', phone: '+1 234-567-8900', status: 'new', campaign: 'Summer Sale', platform: 'Facebook', date: '2026-05-18T10:30:00Z' },
      { _id: '2', name: 'Sarah Connor', email: 'sarah@example.com', phone: '+1 987-654-3210', status: 'contacted', campaign: 'Brand Q3', platform: 'Instagram', date: '2026-05-19T14:20:00Z' },
      { _id: '3', name: 'Bruce Wayne', email: 'bruce@wayne.com', phone: '+1 555-019-2838', status: 'converted', campaign: 'Lead Gen B2B', platform: 'Facebook', date: '2026-05-20T09:15:00Z' },
    ]);
  }, []);

  const columns = [
    { 
      header: 'Lead Name', 
      accessor: 'name',
      cell: (row) => (
        <div className="font-medium text-white">{row.name}</div>
      )
    },
    { 
      header: 'Contact Info', 
      accessor: 'email',
      cell: (row) => (
        <div>
          <p className="text-sm text-crm-text flex items-center gap-2">
            <Mail size={14} className="text-crm-textMuted" /> {row.email}
          </p>
          <p className="text-xs text-crm-textMuted flex items-center gap-2 mt-1">
            <Phone size={14} /> {row.phone}
          </p>
        </div>
      )
    },
    { header: 'Campaign', accessor: 'campaign' },
    { 
      header: 'Date', 
      accessor: 'date',
      cell: (row) => (
        <div className="flex items-center gap-2 text-crm-textMuted">
          <Calendar size={14} /> {formatDate(row.date)}
        </div>
      )
    },
    { 
      header: 'Status', 
      accessor: 'status',
      cell: (row) => {
        let classes = 'badge-inactive';
        if (row.status === 'new') classes = 'badge-primary bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-full text-xs font-medium';
        if (row.status === 'contacted') classes = 'badge-warning';
        if (row.status === 'converted') classes = 'badge-active';
        return <span className={classes}>{row.status.toUpperCase()}</span>
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lead Center</h1>
          <p className="text-crm-textMuted text-sm mt-1">Manage leads generated from your ad campaigns.</p>
        </div>
        <button className="glass-button-secondary">
          <Download size={18} /> Export Leads
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={leads} 
        searchPlaceholder="Search leads..."
      />
    </div>
  );
};

export default MetaAdsLeads;
