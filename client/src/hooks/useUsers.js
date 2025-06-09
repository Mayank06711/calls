// src/hooks/useUsers.js
import { useState, useEffect } from 'react';
import { useSocket } from '../socket/config';

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const fetchUsers = () => {
      socket.emit('users:get', {
        senderId: socket.id,
        timestamp: Date.now(),
        metadata: {
          isActive: true,
          lastFetched: Date.now()
        }
      }, (response) => {
        if (response.status === 'success') {
          // Filter out the current user from the list
          const filteredUsers = response.users.filter(user => 
            user.socketId !== socket.id
          );
          setUsers(filteredUsers);
        } else {
          setError(response.message || 'Failed to fetch users');
        }
        setLoading(false);
      });
    };

    // Listen for user status updates
    socket.on('user:status', (data) => {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === data.userId 
            ? { 
                ...user, 
                isActive: data.isActive,
                lastSeen: data.isActive ? Date.now() : data.lastSeen 
              }
            : user
        ).filter(user => user.socketId !== socket.id) // Always filter out current user
      );
    });

    // Listen for new user joins
    socket.on('user:joined', (newUser) => {
      if (newUser.socketId !== socket.id) {
        setUsers(prevUsers => {
          const userExists = prevUsers.some(user => user._id === newUser._id);
          if (!userExists) {
            return [...prevUsers, newUser];
          }
          return prevUsers.map(user => 
            user._id === newUser._id ? { ...user, ...newUser } : user
          );
        });
      }
    });

    // Listen for user disconnects
    socket.on('user:left', (userId) => {
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user._id === userId
            ? { ...user, isActive: false, lastSeen: Date.now() }
            : user
        )
      );
    });

    fetchUsers();

    return () => {
      socket.off('user:status');
      socket.off('user:joined');
      socket.off('user:left');
    };
  }, [socket]);

  return { users, loading, error };
};