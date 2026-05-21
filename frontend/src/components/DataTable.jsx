import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

export const DataTable = ({ 
  columns, 
  data, 
  searchable = true,
  searchPlaceholder = 'Search...',
  onRowClick,
  actions
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search logic
  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    return columns.some(col => {
      if (!col.searchable) return false;
      const val = typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor];
      return String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  // Sort logic
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const col = columns.find(c => c.accessor === sortConfig.key || c.id === sortConfig.key);
    
    let aVal = typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor];
    let bVal = typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor];

    if (aVal === null || aVal === undefined) aVal = '';
    if (bVal === null || bVal === undefined) bVal = '';

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const currentData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="glass-panel overflow-hidden flex flex-col h-full">
      {/* Toolbar */}
      {(searchable || actions) && (
        <div className="p-4 border-b border-crm-border flex flex-col sm:flex-row justify-between items-center gap-4">
          {searchable ? (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-textMuted" size={18} />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input pl-10 w-full text-sm"
              />
            </div>
          ) : <div></div>}
          
          {actions && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-crm-darker/50 border-b border-crm-border">
              {columns.map((col, idx) => (
                <th 
                  key={col.id || col.accessor || idx}
                  className={`p-4 text-xs font-semibold text-crm-text uppercase tracking-wider ${col.sortable !== false ? 'cursor-pointer hover:bg-crm-border/30' : ''}`}
                  onClick={() => col.sortable !== false && requestSort(col.id || col.accessor)}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable !== false && sortConfig.key === (col.id || col.accessor) && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-crm-border">
            {currentData.length > 0 ? (
              currentData.map((row, rowIdx) => (
                <tr 
                  key={row._id || row.id || rowIdx} 
                  className={`group hover:bg-crm-border/20 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col, colIdx) => (
                    <td key={col.id || col.accessor || colIdx} className="p-4 text-sm whitespace-nowrap">
                      {col.cell ? col.cell(row) : (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-crm-textMuted">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sortedData.length > itemsPerPage && (
        <div className="p-4 border-t border-crm-border flex items-center justify-between bg-crm-darker/30">
          <p className="text-sm text-crm-textMuted">
            Showing <span className="font-medium text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> of <span className="font-medium text-white">{sortedData.length}</span> results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-crm-card border border-crm-border text-crm-textMuted hover:text-white disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-crm-card border border-crm-border text-crm-textMuted hover:text-white disabled:opacity-50 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
