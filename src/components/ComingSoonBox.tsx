import React from 'react';
import { Clock, Sparkles } from 'lucide-react';

interface ComingSoonBoxProps {
  title?: string;
  categoryName?: string;
}

export default function ComingSoonBox({
  title = "Coming Soon......"
}: ComingSoonBoxProps) {
  return (
    <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-xs my-4 animate-in fade-in duration-300 flex flex-col items-center justify-center space-y-4">
      {/* Icon Badge */}
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100/80 shadow-xs">
        <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
      </div>

      {/* Stylish English Text */}
      <h3 className="text-3xl sm:text-4xl font-black italic tracking-wide font-serif bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
        {title}
      </h3>
    </div>
  );
}
