// app/home/_components/video-grid.tsx
import React from 'react'
import VideoCard from './VideoCard'

const VideoGrid = () => {
  const videos = [
    {
      title: "Stranger Things: Season 4",
      thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
      duration: "2h 15m",
      views: "12.5M",
      category: "Sci-Fi Thriller",
      isNew: true
    },
    {
      title: "The Crown: Final Season",
      thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80",
      duration: "1h 45m",
      views: "8.3M",
      category: "Historical Drama",
      isNew: false
    },
    {
      title: "Breaking Bad: Complete Series",
      thumbnail: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80",
      duration: "3h 20m",
      views: "45.2M",
      category: "Crime Drama",
      isNew: false
    },
    {
      title: "Wednesday",
      thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
      duration: "1h 30m",
      views: "23.7M",
      category: "Mystery Comedy",
      isNew: true
    },
    {
      title: "The Last of Us",
      thumbnail: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800&q=80",
      duration: "2h 05m",
      views: "34.1M",
      category: "Post-Apocalyptic",
      isNew: true
    },
    {
      title: "Dark",
      thumbnail: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&q=80",
      duration: "1h 55m",
      views: "19.8M",
      category: "Mystery Sci-Fi",
      isNew: false
    },
    {
      title: "Peaky Blinders",
      thumbnail: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&q=80",
      duration: "2h 30m",
      views: "28.5M",
      category: "Period Crime",
      isNew: false
    },
    {
      title: "The Witcher",
      thumbnail: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&q=80",
      duration: "1h 50m",
      views: "41.2M",
      category: "Fantasy Adventure",
      isNew: true
    },
    {
      title: "Planet Earth III",
      thumbnail: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
      duration: "55m",
      views: "67.3M",
      category: "Nature Documentary",
      isNew: true
    },
    {
      title: "The Mandalorian",
      thumbnail: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800&q=80",
      duration: "45m",
      views: "89.4M",
      category: "Space Western",
      isNew: false
    },
    {
      title: "Squid Game",
      thumbnail: "https://images.unsplash.com/photo-1533094602577-198d3beab8ea?w=800&q=80",
      duration: "1h 10m",
      views: "142.7M",
      category: "Survival Drama",
      isNew: false
    },
    {
      title: "Succession: Final Chapter",
      thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
      duration: "1h 20m",
      views: "15.8M",
      category: "Drama",
      isNew: false
    },
    {
      title: "House of the Dragon",
      thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
      duration: "1h 15m",
      views: "52.1M",
      category: "Fantasy Epic",
      isNew: true
    },
    {
      title: "The Bear: Season 2",
      thumbnail: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
      duration: "35m",
      views: "21.6M",
      category: "Culinary Drama",
      isNew: true
    },
    {
      title: "Black Mirror: Beyond",
      thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
      duration: "1h 5m",
      views: "38.9M",
      category: "Sci-Fi Anthology",
      isNew: true
    },
    {
      title: "The Office: Complete Series",
      thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
      duration: "25m",
      views: "156.2M",
      category: "Comedy",
      isNew: false
    },
    {
      title: "Ozark",
      thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      duration: "1h 5m",
      views: "44.7M",
      category: "Crime Thriller",
      isNew: false
    },
    {
      title: "Narcos: Mexico",
      thumbnail: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&q=80",
      duration: "55m",
      views: "31.4M",
      category: "Crime Drama",
      isNew: false
    },
    {
      title: "The Night Manager",
      thumbnail: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&q=80",
      duration: "1h 0m",
      views: "18.3M",
      category: "Spy Thriller",
      isNew: false
    },
    {
      title: "Sherlock: Modern Cases",
      thumbnail: "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=800&q=80",
      duration: "1h 30m",
      views: "73.5M",
      category: "Mystery",
      isNew: false
    },
    {
      title: "Chernobyl",
      thumbnail: "https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=800&q=80",
      duration: "1h 10m",
      views: "62.8M",
      category: "Historical Drama",
      isNew: false
    },
    {
      title: "True Detective: Night Country",
      thumbnail: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80",
      duration: "1h 15m",
      views: "27.9M",
      category: "Crime Mystery",
      isNew: true
    },
    {
      title: "The Queen's Gambit",
      thumbnail: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&q=80",
      duration: "1h 0m",
      views: "83.4M",
      category: "Period Drama",
      isNew: false
    },
    {
      title: "Arcane",
      thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
      duration: "45m",
      views: "58.7M",
      category: "Animated Action",
      isNew: true
    },
  ]

  return (
<div className="w-full  mx-auto">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Browse Videos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {videos.map((video, index) => (
            <VideoCard key={index} {...video} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default VideoGrid