import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, X, Sparkles, BookOpen, MapPin, Cpu, Compass } from 'lucide-react';
import { AICopilotService, type CopilotMessage } from '../../services/aiCopilotService';
import type { ResolvedLocationResult } from '../../services/locationService';

interface AICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocationId: string | null;
  onLocationSelect?: (locationResult: ResolvedLocationResult) => void;
}

export const AICopilotModal: React.FC<AICopilotModalProps> = ({
  isOpen,
  onClose,
  selectedLocationId,
  onLocationSelect,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init',
      sender: 'copilot',
      text: 'Hello! I am **Geolith AI**, your Earth Intelligence Copilot. Grounded strictly in live telemetry from Open-Meteo, USGS, NASA FIRMS/EONET, and our GIS Storm ML engine.\n\nAsk me questions like:\n• *"What is the weather in London?"*\n• *"What is the storm risk in Mumbai?"*\n• *"Any recent earthquakes near me?"*\n• *"Are there active fires near California?"*',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendPrompt = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: CopilotMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Pass existing messages array to support chat session memory context
      const copilotResponse = await AICopilotService.queryCopilot(
        textToSend.trim(), 
        selectedLocationId, 
        messages,
        (resolvedLoc) => {
          if (onLocationSelect) {
            onLocationSelect(resolvedLoc);
          }
        },
        (status) => setStatusText(status)
      );
      setMessages(prev => [...prev, copilotResponse]);
    } finally {
      setLoading(false);
      setStatusText(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendPrompt(input);
  };

  // Simple Markdown text renderer (handles bolding, line breaks, bullet points)
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1">
        {lines.map((line, lIdx) => {
          if (!line.trim()) return <div key={lIdx} className="h-1.5" />;
          
          // Process bold markers **text**
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <div key={lIdx} className={line.startsWith('•') || line.startsWith('*') ? 'pl-2 text-slate-200' : ''}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={pIdx} className="font-semibold text-purple-200">{part.slice(2, -2)}</strong>;
                }
                return <span key={pIdx}>{part}</span>;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[420px] max-w-[92vw] bg-slate-950/95 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom duration-200 text-slate-100 flex flex-col max-h-[82vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40">
            <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-purple-200 flex items-center gap-1.5">
              Geolith AI <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono">LIVE</span>
            </h3>
            <p className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5 text-emerald-400" /> Grounded in real GIS Telemetry
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>



      {/* Messages Feed */}
      <div className="p-3.5 flex flex-col gap-3 h-[360px] overflow-y-auto custom-scrollbar text-xs grow">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1.5 p-3 rounded-2xl max-w-[88%] ${
              msg.sender === 'user'
                ? 'bg-sky-600/25 border border-sky-500/40 text-sky-100 self-end rounded-br-none'
                : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 self-start rounded-bl-none shadow-md'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono opacity-80 font-bold border-b border-slate-800/40 pb-1 mb-1">
              <div className="flex items-center gap-1.5">
                {msg.sender === 'user' ? (
                  <>
                    <User className="w-3 h-3 text-sky-400" />
                    <span className="text-sky-300">You</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-300">Geolith AI</span>
                  </>
                )}
              </div>
              {msg.location && (
                <span className="flex items-center gap-0.5 text-[9px] text-sky-300 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800/50">
                  <MapPin className="w-2.5 h-2.5" /> {msg.location.name}
                </span>
              )}
            </div>

            <div className="leading-relaxed font-sans text-xs">
              {renderFormattedText(msg.text)}
            </div>

            {/* Citations & Sources */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col gap-1 text-[9px] font-mono text-purple-300/90">
                <span className="flex items-center gap-1 text-slate-400 font-bold">
                  <BookOpen className="w-3 h-3 text-purple-400" /> Verified Data Sources:
                </span>
                {msg.citations.map((c, i) => (
                  <div key={i} className="pl-2 flex items-center justify-between gap-2 bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
                    <span className="font-bold text-slate-300">• {c.label}</span>
                    <span className="text-slate-400 text-[8px] truncate">{c.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="p-3 rounded-2xl bg-slate-900 border border-purple-500/30 text-purple-300 font-mono text-[10px] flex items-center gap-2 self-start animate-pulse shadow-lg">
            <Sparkles className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
            <span>{statusText || 'Fetching live GIS telemetry & querying Geolith AI...'}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleFormSubmit} className="p-3 border-t border-slate-800 bg-slate-950 shrink-0 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Geolith AI about weather, storms, quakes, fires..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none focus:border-purple-500 font-mono transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition-all shadow-md shadow-purple-600/30 flex items-center justify-center shrink-0"
          title="Send Question"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
