import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Smile, MoreVertical, CheckCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const ChatWindow = ({ channelName = "General", channelId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Mock Messages
    setMessages([
      { _id: '1', senderId: 'user1', senderName: 'Alice Admin', text: 'Has the new campaign been approved?', time: '10:30 AM', isMine: false },
      { _id: '2', senderId: user?._id, senderName: user?.name, text: 'Yes, just got the green light from the client.', time: '10:32 AM', isMine: true },
      { _id: '3', senderId: 'user1', senderName: 'Alice Admin', text: 'Great, I will push it live now.', time: '10:35 AM', isMine: false },
    ]);
  }, [channelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setMessages([...messages, {
      _id: Date.now().toString(),
      senderId: user?._id,
      senderName: user?.name,
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true
    }]);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-crm-card/50 backdrop-blur-md rounded-2xl border border-crm-border overflow-hidden shadow-glass">
      {/* Chat Header */}
      <div className="h-16 px-6 border-b border-crm-border flex justify-between items-center bg-crm-darker/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-crm-primary/20 flex items-center justify-center text-crm-primary font-bold">
            #
          </div>
          <div>
            <h3 className="font-semibold text-crm-text">{channelName}</h3>
            <p className="text-xs text-crm-textMuted flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 3 online
            </p>
          </div>
        </div>
        <button className="text-crm-textMuted hover:text-crm-text transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-crm-dark/20">
        {messages.map((msg) => (
          <div key={msg._id} className={`flex w-full mb-2 ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start gap-2 max-w-[75%]`}>
              {!msg.isMine && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-crm-primary to-crm-accent flex items-center justify-center text-crm-primary-text text-xs font-bold shrink-0 mt-0.5 shadow-sm">
                  {msg.senderName?.charAt(0) || 'U'}
                </div>
              )}
              
              <div className={`flex flex-col relative ${msg.isMine ? 'items-end' : 'items-start'}`}>
                {!msg.isMine && (
                  <span className="text-[10px] font-bold text-crm-textMuted mb-0.5 ml-1">{msg.senderName}</span>
                )}
                <div 
                  className={`px-3 py-1.5 rounded-xl break-words relative shadow-sm text-[14px] ${
                    msg.isMine 
                      ? 'bg-crm-primary text-crm-primary-text rounded-tr-sm' 
                      : 'dark:bg-[#222738] bg-slate-200 text-crm-text rounded-tl-sm'
                  }`}
                >
                  <div className="flex flex-wrap items-end gap-x-3 gap-y-0.5">
                    <p className="leading-snug min-w-[20px]">{msg.text}</p>
                    <div className={`flex items-center gap-1 text-[9px] opacity-70 ml-auto shrink-0 pb-0.5 translate-y-[2px] ${msg.isMine ? 'text-crm-primary-text' : 'text-crm-textMuted'}`}>
                      <span>{msg.time}</span>
                      {msg.isMine && <CheckCheck size={13} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-crm-border bg-crm-darker/30">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button type="button" className="p-2 text-crm-textMuted hover:text-crm-text transition-colors rounded-lg hover:bg-crm-border/30">
            <ImageIcon size={20} />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-crm-dark/50 border border-crm-border rounded-xl px-4 py-2.5 text-sm text-crm-text placeholder-crm-textMuted focus:outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary transition-all"
          />
          
          <button type="button" className="p-2 text-crm-textMuted hover:text-crm-text transition-colors rounded-lg hover:bg-crm-border/30">
            <Smile size={20} />
          </button>
          
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="p-2.5 bg-crm-primary text-crm-primary-text rounded-xl hover:bg-crm-primaryHover transition-colors disabled:opacity-50 disabled:hover:bg-crm-primary ml-1"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
