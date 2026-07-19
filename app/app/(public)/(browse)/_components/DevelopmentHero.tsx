"use client"
import { Sparkles, Play } from "lucide-react";

export function DevelopmentHero() {
  return (
    <div className="relative overflow-hidden bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 border border-purple-200 rounded-2xl px-8 py-4 mb-4">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200 rounded-full blur-3xl opacity-30" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-30" />
      
      <div className="relative">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-4">
          <div className="px-3 py-1 bg-linear-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold rounded-full shadow-sm">
            In Development
          </div>
          <div className="px-3 py-1 bg-white/60 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-full border border-purple-200">
            Interactive Preview
          </div>
        </div>
        
        {/* Main Content */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-purple-600" />
          Next-Gen Video Streaming Platform
        </h2>
        <p className="text-gray-600 max-w-3xl mb-6 text-sm md:text-base">
          Experience a modern <span className="font-semibold text-purple-600">video-on-demand platform</span> built 
          with cutting-edge web technologies. Explore the intuitive interface, smooth animations, and premium design 
          that sets new standards for streaming experiences.
        </p>
        
        {/* Feature Highlights */}
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-purple-200">
            <Play className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Seamless Playback</span>
          </div>
          {/* <div className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Modern UI/UX</span>
          </div> */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-pink-200">
            <Sparkles className="w-4 h-4 text-pink-600" />
            <span className="text-sm font-medium text-gray-700">Admin Dashboard</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          {/* <button
            onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            Explore Platform
          </button> */}
          <a
            href="https://github.com/Suman196pokhrel/vod-app"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 transition-colors"
          >
            View on GitHub
          </a>
        </div>
        
        {/* Subtle note */}
        <p className="text-xs text-gray-500 mt-4 italic">
          ✨ Interactive demo with sample content for showcase purposes
        </p>
      </div>
    </div>
  );
}