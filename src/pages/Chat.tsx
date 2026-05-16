import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, Loader2, Video, Phone, Search, MoreVertical, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
}

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  profile_image: string | null;
  email: string;
  designation_name: string | null;
}

export default function Chat() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<number, string>>({});
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const otherTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeContactRef = useRef<number | null>(null);

  useEffect(() => {
    activeContactRef.current = selectedContact?.id || null;
  }, [selectedContact]);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      try {
        const empRes = await fetch('/api/employees/me', { headers });
        const empData = await empRes.json();
        if (empData.success) {
          const myId = empData.data.id;
          setEmployeeId(myId);
          
          if (!socketRef.current) {
            console.log("Connecting to socket...");
            socketRef.current = io();
            
            socketRef.current.on('connect', () => {
              console.log("Socket connected! ID:", socketRef.current?.id);
              socketRef.current?.emit('identify', myId);
            });

            socketRef.current.on('connect_error', (err) => {
              console.error("Socket connection error:", err);
            });
            
            socketRef.current.on('receive-private-message', (message: Message) => {
              console.log("Received message:", message);
              setMessages(prev => {
                const isRelevant = 
                  (message.sender_id === myId && message.receiver_id === activeContactRef.current) ||
                  (message.sender_id === activeContactRef.current && message.receiver_id === myId);
                
                if (isRelevant) return [...prev, message];
                return prev;
              });
            });

            socketRef.current.on('status-update', (data: { employeeId: number, status: string }) => {
              setUserStatuses(prev => ({ ...prev, [data.employeeId]: data.status }));
            });

            socketRef.current.on('user-typing', (data: { sender_id: number, isTyping: boolean }) => {
              if (data.sender_id === activeContactRef.current) {
                setIsOtherTyping(data.isTyping);
                
                // Safety timeout to clear typing if they never send a 'false' event
                if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
                if (data.isTyping) {
                  otherTypingTimeoutRef.current = setTimeout(() => {
                    setIsOtherTyping(false);
                  }, 3000);
                }
              }
            });

            socketRef.current.on('online-users', (ids: number[]) => {
              setUserStatuses(prev => {
                const newStatuses = { ...prev };
                ids.forEach(id => {
                  if (!newStatuses[id]) newStatuses[id] = 'Active';
                });
                Object.keys(newStatuses).forEach(idKey => {
                  const id = parseInt(idKey);
                  if (!ids.includes(id)) newStatuses[id] = 'Offline';
                });
                return newStatuses;
              });
            });
          } else {
            // Already connected, just re-identify in case myId changed
            socketRef.current.emit('identify', myId);
          }
        }

        const contRes = await fetch('/api/chat/contacts', { headers });
        const contData = await contRes.json();
        if (contData.success) setContacts(contData.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    
    if (user?.id) init();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user?.id]);

  useEffect(() => {
    setIsOtherTyping(false);
    if (selectedContact && employeeId) {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      fetch(`/api/messages/${selectedContact.id}`, { headers })
        .then(res => res.json())
        .then(data => {
          if (data.success) setMessages(data.data);
        });
    }
  }, [selectedContact, employeeId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = contacts.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !employeeId || !selectedContact) return;

    socketRef.current?.emit('send-private-message', {
      sender_id: employeeId,
      receiver_id: selectedContact.id,
      content: input
    });
    
    // Stop typing when message is sent
    socketRef.current?.emit('typing', {
      sender_id: employeeId,
      receiver_id: selectedContact.id,
      isTyping: false
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    if (!employeeId || !selectedContact) return;

    // Send typing event
    socketRef.current?.emit('typing', {
      sender_id: employeeId,
      receiver_id: selectedContact.id,
      isTyping: true
    });

    // Reset timeout to send 'stopped typing'
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', {
        sender_id: employeeId,
        receiver_id: selectedContact.id,
        isTyping: false
      });
    }, 2000);
  };

  const [calling, setCalling] = useState<{ type: 'video' | 'phone'; active: boolean }>({ type: 'video', active: false });

  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startCall = (type: 'video' | 'phone') => {
    setCalling({ type, active: true });
    socketRef.current?.emit('call-status', { employeeId, status: 'In a call' });
    
    callTimeoutRef.current = setTimeout(() => {
      stopCall();
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} call feature requires a dedicated STUN/TURN server. This is a UI demonstration.`);
    }, 4000);
  };

  const stopCall = () => {
    setCalling(prev => ({ ...prev, active: false }));
    socketRef.current?.emit('call-status', { employeeId, status: 'Active' });
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500';
      case 'In a call': return 'bg-blue-500';
      case 'Offline': return 'bg-slate-300';
      default: return 'bg-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-160px)] flex bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500 relative">
      {/* Sidebar - Contacts */}
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/20">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Search people..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => {
              const status = userStatuses[contact.id] || 'Offline';
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all",
                    selectedContact?.id === contact.id ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "hover:bg-white hover:shadow-sm"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-slate-200 overflow-hidden border-2 border-white/20">
                      {contact.profile_image ? (
                        <img src={contact.profile_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500 bg-slate-100">
                          {contact.first_name[0]}{contact.last_name[0]}
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white",
                      getStatusColor(status)
                    )} />
                  </div>
                  <div className="text-left overflow-hidden flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm truncate">{contact.first_name} {contact.last_name}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={cn("text-[10px] truncate font-medium uppercase tracking-wider", selectedContact?.id === contact.id ? "text-blue-100" : "text-slate-400")}>
                        {contact.designation_name || 'Member'}
                      </p>
                      <span className={cn("text-[8px] font-bold uppercase ml-2", selectedContact?.id === contact.id ? "text-blue-100" : "text-slate-400")}>
                        {status}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 mt-12">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Users size={20} />
              </div>
              <p className="text-sm font-bold text-slate-500">No other employees found</p>
              <p className="text-[10px] mt-1 leading-relaxed">
                Add more employees in the "Employees" tab to start chatting with your team.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                    {selectedContact.profile_image ? (
                      <img src={selectedContact.profile_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                        {selectedContact.first_name[0]}{selectedContact.last_name[0]}
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
                    getStatusColor(userStatuses[selectedContact.id] || 'Offline')
                  )} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedContact.first_name} {selectedContact.last_name}</h3>
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      (userStatuses[selectedContact.id] === 'Active' || userStatuses[selectedContact.id] === 'In a call') ? "text-emerald-500" : "text-slate-400"
                    )}>
                      {userStatuses[selectedContact.id] || 'Offline'}
                    </p>
                    {isOtherTyping && (
                      <span className="text-[10px] font-bold text-blue-600 animate-pulse">
                        is typing...
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => startCall('video')}
                  className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <Video size={20} />
                </button>
                <button 
                  onClick={() => startCall('phone')}
                  className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <Phone size={20} />
                </button>
                <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[70%]",
                    msg.sender_id === employeeId ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                    msg.sender_id === employeeId 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input 
                  value={input}
                  onChange={handleInputChange}
                  placeholder={`Message ${selectedContact.first_name}...`}
                  className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                />
                <button 
                  type="submit"
                  disabled={!input.trim()}
                  className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <User size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Select a connection</h3>
            <p className="text-sm max-w-xs mt-2">Choose someone from the left to start a private encrypted conversation.</p>
          </div>
        )}

        {/* Calling Overlay */}
        <AnimatePresence>
          {calling.active && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white"
            >
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/50 animate-pulse">
                  {calling.type === 'video' ? <Video size={48} /> : <Phone size={48} />}
                </div>
                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
              </div>
              <h2 className="text-3xl font-bold mb-2">Connecting...</h2>
              <p className="text-slate-400 font-medium">{selectedContact?.first_name} {selectedContact?.last_name}</p>
              
              <div className="mt-12 flex gap-4">
                <button 
                  onClick={stopCall}
                  className="px-8 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all active:scale-95"
                >
                  End Call
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
