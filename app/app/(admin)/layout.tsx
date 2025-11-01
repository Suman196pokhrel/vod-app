import React from 'react'

type AdminLayoutProps = {
    children : React.ReactNode
}


const AdminLayout = ({children}:AdminLayoutProps) => {
  return (
    <div>AdminLayout
        <div>
            {children}
        </div>
    </div>
  )
}

export default AdminLayout