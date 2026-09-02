'use client';

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface BreakingNewsItem {
  id: string;
  title: string;
  timestamp: Date;
}

export default function BreakingNews() {
  const [breakingNews, setBreakingNews] = useState<BreakingNewsItem[]>([
    { id: '1', title: 'Últimas informações sobre economia global chegam à RBN', timestamp: new Date() }
  ]);

  return (
    <div className="bg-[#991B1B] text-white py-3 sticky top-[120px] z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="w-5 h-5 animate-pulse" />
          <span className="font-bold uppercase text-sm tracking-wider">ÚLTIMA HORA</span>
        </div>
        
        <div className="flex gap-8 overflow-x-auto scrollbar-hide pb-2">
          {breakingNews.map((item) => (
            <div key={item.id} className="flex-shrink-0 whitespace-nowrap hover:opacity-80 transition cursor-pointer">
              <p className="text-sm font-semibold">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
