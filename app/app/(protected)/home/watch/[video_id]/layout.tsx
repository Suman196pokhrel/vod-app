import React from 'react'

interface VideoPageLayoutProps {
    children:React.ReactNode
}

const VideoPageLayout = ({children}:VideoPageLayoutProps) => {
  return (
    <div>
        <h2>VideoPageLayout</h2>
        {children}
    </div>
  )
}

export default VideoPageLayout