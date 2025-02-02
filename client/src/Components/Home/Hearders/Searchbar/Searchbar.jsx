import { Search } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import React from 'react'

function Searchbar({isDarkMode}) {
  return (
    <div className="flex items-center flex-1 mx-4">
          <div className={`flex items-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full px-4 py-2 w-full max-w-md`}>
            <IconButton size="small">
              <Search className="text-gray-500" />
            </IconButton>
            <input
              type="text"
              placeholder="Search..."
              className={`ml-2 bg-transparent border-none outline-none w-full ${isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
            />
          </div>
        </div>
  )
}

export default Searchbar
