import React from 'react';
import { Sparkles, Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  part: string;
  description: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  part,
  description,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
          <p className="text-xs text-zinc-400 mt-1">{description}</p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Scheduled for {part}
        </span>
      </div>

      <div className="p-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
          <Construction className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-200">{title} Module</h3>
        <p className="text-xs text-zinc-500 max-w-md mt-2 mb-4 leading-relaxed">
          This feature will be fully built and wired in <strong>{part}</strong> according to the Lyncost roadmap.
          The database tables and underlying schemas are already prepared in SQLite.
        </p>
      </div>
    </div>
  );
};
