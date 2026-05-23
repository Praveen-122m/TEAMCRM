export const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary', onClick }) => {
  const colorMap = {
    primary: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    violet: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    sky: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  };

  const iconClasses = colorMap[color] || colorMap.primary;

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`glass-card p-6 flex flex-col h-full relative overflow-hidden group w-full text-left ${
        onClick ? 'cursor-pointer hover:border-crm-primary/40 transition-colors' : ''
      }`}
    >
      {/* Decorative gradient blob */}
      <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${colorMap[color]?.split(' ')[0]}`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className="text-crm-textMuted text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-crm-text tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl border ${iconClasses}`}>
          <Icon size={24} />
        </div>
      </div>
      
      {trend && trendValue && (
        <div className="mt-auto pt-4 border-t border-crm-border/50 relative z-10">
          <p className="text-sm flex items-center gap-2">
            <span className={`font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
              {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendValue}
            </span>
            <span className="text-crm-textMuted">vs last month</span>
          </p>
        </div>
      )}
    </Wrapper>
  );
};
