import React, { useState } from 'react';
import { Code2, Cloud, Terminal, Copy, Check, X } from 'lucide-react';

interface DeveloperPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperPortalModal: React.FC<DeveloperPortalModalProps> = ({ isOpen, onClose }) => {
  const [copiedLang, setCopiedLang] = useState<string | null>(null);

  if (!isOpen) return null;

  const pythonSnippet = `import requests

url = "http://localhost:8000/api/v1/ai/risk/assess"
payload = {
    "temperature": 28.5,
    "humidity": 65,
    "pressure": 1010,
    "wind_speed": 22.4,
    "rainfall": 1.5
}
headers = {"Authorization": "Bearer at_live_987x..."}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

  const jsSnippet = `const response = await fetch('http://localhost:8000/api/v1/ai/risk/assess', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer at_live_987x...'
  },
  body: JSON.stringify({
    temperature: 28.5,
    humidity: 65,
    pressure: 1010,
    wind_speed: 22.4,
    rainfall: 1.5
  })
});
const data = await response.json();
console.log(data);`;

  const copySnippet = (text: string, lang: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLang(lang);
    setTimeout(() => setCopiedLang(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide font-mono">
              Developer Platform & Multi-Cloud Architecture SDK
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-5 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs">
          {/* SDK Snippets */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between font-mono">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Terminal className="w-4 h-4 text-purple-400" /> Python REST SDK Snippet
              </span>
              <button
                onClick={() => copySnippet(pythonSnippet, 'py')}
                className="text-[10px] text-purple-300 hover:text-white flex items-center gap-1 font-mono"
              >
                {copiedLang === 'py' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Python
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-purple-200 font-mono text-[11px] overflow-x-auto">
              {pythonSnippet}
            </pre>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between font-mono">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Code2 className="w-4 h-4 text-sky-400" /> JavaScript / Node.js SDK Snippet
              </span>
              <button
                onClick={() => copySnippet(jsSnippet, 'js')}
                className="text-[10px] text-sky-300 hover:text-white flex items-center gap-1 font-mono"
              >
                {copiedLang === 'js' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy JS
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sky-200 font-mono text-[11px] overflow-x-auto">
              {jsSnippet}
            </pre>
          </div>

          {/* Cloud Architecture Blueprint */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
            <span className="font-bold text-white font-mono flex items-center gap-1.5 text-xs">
              <Cloud className="w-4 h-4 text-emerald-400" /> Multi-Cloud Enterprise Deployment Blueprint
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Native support for containerized deployment across AWS EKS, Google Cloud Run, and Azure AKS with HPA auto-scaling rules and Redis tile caching.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
