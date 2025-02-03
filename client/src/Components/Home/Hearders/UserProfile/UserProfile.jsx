import React from 'react'
import UserActivity from './UserActivity'
import UserInfo from './UserInfo'

function UserProfile() {
  return (
    <div className='flex w-full'>
      <UserInfo/>
      <UserActivity/>
    </div>
  )
}

export default UserProfile
