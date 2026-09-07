import React, { useState } from 'react';
import { Bot, Send, User, X, Sparkles, BookOpen } from 'lucide-react';
import { AICopilotService, type CopilotMessage } from '../../services/aiCopilotService';

interface AICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocationId: string | null;
}

export const AICopilotModal: React.FC<AICopilotModalProps> = ({
  isOpen,
  onClose,
  selectedLocationId,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init',
      sender: 'copilot',
      text: 'Hello! I am your AI Weather Copilot. Ask me any question e.g. "Will it rain in Mumbai tomorrow?" or "Summarize today\'s storm threats".',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg: CopilotMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const copilotResponse = await AICopilotService.queryCopilot(userText, selectedLocationId);
      setMessages(prev => [...prev, copilotResponse]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 w-96 max-w-[90vw] bg-slate-950/90 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom duration-200 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-purple-200 flex items-center gap-1.5">
            AI Weather Copilot <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono">v2.0</span>
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="p-3 flex flex-col gap-3 h-80 overflow-y-auto custom-scrollbar text-xs">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1.5 p-3 rounded-xl max-w-[85%] ${
              msg.sender === 'user'
                ? 'bg-sky-600/20 border border-sky-500/30 text-sky-100 self-end'
                : 'bg-slate-900/80 border border-slate-800 text-slate-200 self-start'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-75 font-bold">
              {msg.sender === 'user' ? <User className="w-3 h-3 text-sky-400" /> : <Bot className="w-3 h-3 text-purple-400" />}
              <span>{msg.sender === 'user' ? 'You' : 'AI Copilot'}</span>
            </div>

            <p className="leading-relaxed font-sans">{msg.text}</p>

            {/* Citations */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex flex-col gap-1 text-[9px] font-mono text-purple-300">
                <span className="flex items-center gap-1 text-slate-400 font-bold">
                  <BookOpen className="w-2.5 h-2.5" /> Data Citations:
                </span>
                {msg.citations.map((c, i) => (
                  <span key={i} className="pl-1">
                    • <b>{c.label}:</b> {c.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-purple-400 font-mono text-[10px] flex items-center gap-2 self-start animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Synthesizing data-driven analysis...
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-2.5 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask AI Weather Copilot..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-purple-500 font-mono"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-all shadow-md shadow-purple-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
