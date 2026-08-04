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
    <div className="glass-panel p-4 mb-6 border border-crm-border/80 sticky top-16 z-20 flex items-center justify-between">
      <div className="flex flex-col">
        <p className="text-[10px] font-bold uppercase tracking-wider text-crm-textMuted mb-1">
          Select client — Meta Ads dashboard
        </p>
        <p className="text-sm text-crm-text">View analytics for a specific client</p>
      </div>
      <div className="min-w-[250px]">
        <select
          value={selectedClient}
          onChange={(e) => onSelect(e.target.value)}
          className="glass-input w-full cursor-pointer bg-crm-darker/90 border-crm-primary/30 focus:border-crm-primary text-crm-text font-medium"
        >
          {clients.map((client) => (
            <option key={client._id} value={client._id} className="bg-crm-darker text-crm-text">
              {client.companyName || client.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default MetaClientNav;
