/** Sticky client picker for Meta Ads (admin / member). */
const MetaClientNav = ({ clients, selectedClient, onSelect, loading }) => {
  if (loading) {
    return (
      <div className="glass-panel p-4 mb-6 animate-pulse h-14" />
    );
  }

  if (!clients?.length) {
    return (
      <div className="glass-panel p-4 mb-6 text-sm text-crm-textMuted">
        No clients found. Add clients from the Clients page or open a client workspace first.
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 mb-6 border border-crm-border/80 sticky top-16 z-20">
      <p className="text-[10px] font-bold uppercase tracking-wider text-crm-textMuted mb-3">
        Select client — Meta Ads dashboard
      </p>
      <div className="flex flex-wrap gap-2">
        {clients.map((client) => {
          const active = selectedClient === client._id;
          return (
            <button
              key={client._id}
              type="button"
              onClick={() => onSelect(client._id)}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all border ${
                active
                  ? 'bg-crm-primary text-white border-crm-primary shadow-glow scale-[1.02]'
                  : 'bg-crm-darker/70 border-crm-border text-crm-textMuted hover:text-white hover:border-crm-primary/50'
              }`}
            >
              {client.companyName || client.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MetaClientNav;
