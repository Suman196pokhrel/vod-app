import React from 'react'

interface VideoPageLayoutProps {
    children:React.ReactNode
}

const VideoPageLayout = ({children}:VideoPageLayoutProps) => {
  return (
    <div>
        {children}
    </div>
  )
}

export default VideoPageLayout