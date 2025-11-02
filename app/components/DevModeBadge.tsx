"use client";

import { Code2, Github, Sparkles } from "lucide-react";
import { useState } from "react";

export function DevModeBadge() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className="relative"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Collapsed Badge */}
        <div className="flex items-center gap-2 bg-linear-to-r from-purple-600 to-blue-600 text-white px-4 py-2.5 rounded-full shadow-lg border border-white/20 backdrop-blur-sm cursor-pointer hover:scale-105 transition-transform">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Preview Mode</span>
        </div>

        {/* Expanded Info Card */}
        {isExpanded && (
          <div className="absolute bottom-full right-0 mb-3 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Code2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Frontend Showcase</h4>
                <p className="text-xs text-gray-500 mt-0.5">Interactive Demo</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              This is a <span className="font-semibold">frontend demonstration</span> showcasing 
              UI/UX design and interactions. All data is for preview purposes only.
            </p>
            {/* <a
              href="https://github.com/yourusername/your-repo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 pt-2 border-t border-gray-100 font-medium transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>View source code →</span>
            </a> */}
          </div>
        )}
      </div>
    </div>
  );
}