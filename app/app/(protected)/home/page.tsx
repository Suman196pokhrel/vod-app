import React from 'react'
import VideoGrid from './_components/VideoGrid'

const Home = () => {
  return (
    <div className="flex flex-col w-full items-start py-2">
        <div className='w-full'>
          {/* # Mock  */}
            <VideoGrid />
        </div>
    </div>
  )
}

export default Home