import React from 'react';

export function DatePicker({
  value,
  onChange,
  className = '',
  minDate,
  maxDate,
  includeTime = false
}) {
  return (
    <input
      type={includeTime ? "datetime-local" : "date"}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-[#f8fafc] dark:bg-crm-card border border-crm-border rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-crm-primary/50 text-crm-text transition-colors ${className}`}
      min={minDate ? new Date(minDate).toISOString().slice(0, includeTime ? 16 : 10) : undefined}
      max={maxDate ? new Date(maxDate).toISOString().slice(0, includeTime ? 16 : 10) : undefined}
    />
  );
}
