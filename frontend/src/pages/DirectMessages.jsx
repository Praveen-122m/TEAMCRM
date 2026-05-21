import { ChatWindow } from '../components/ChatWindow';

const DirectMessages = () => {
  const channels = [
    { id: 1, name: 'General', unread: 0 },
    { id: 2, name: 'Marketing Team', unread: 3 },
    { id: 3, name: 'Client: Stark Ind', unread: 0 },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Channel List */}
      <div className="w-64 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Messages</h2>
        <div className="glass-panel flex-1 overflow-hidden flex flex-col p-2">
          {channels.map(channel => (
            <button 
              key={channel.id}
              className="flex justify-between items-center w-full p-3 rounded-lg hover:bg-crm-border/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <span className="text-crm-textMuted group-hover:text-white">#</span>
                <span className="text-sm font-medium text-crm-text group-hover:text-white">{channel.name}</span>
              </div>
              {channel.unread > 0 && (
                <span className="bg-crm-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {channel.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 h-full">
        <ChatWindow channelName="Marketing Team" />
      </div>
    </div>
  );
};

export default DirectMessages;
