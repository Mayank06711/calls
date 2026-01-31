import { RedisManager } from "../utils/redisClient";
import { IUser as User, UserListResponse } from '../interface/IUser';

interface PaginatedUserResponse {
  users: UserListResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

// Cache key generator helper
function generateCacheKey(page: number, userType: string, search: string): string {
  return `users:${page}:${userType}:${search || 'none'}`;
}

// Cache paginated user data
async function cacheUserList(cacheKey: string, data: PaginatedUserResponse) {
  try {
    // Cache the paginated data with the specific cache key
    await RedisManager.cacheDataInGroup(
      'users_paginated',  // group name
      cacheKey,           // unique key for this page + filters combination
      data,               // paginated user data with metadata
      3600,              // TTL: 1 hour (adjust as needed)
      true               // add to set for easy lookup
    );

    // Also cache the total count separately for quick access
    await RedisManager.cacheDataInGroup(
      'users_metadata',
      'total_count',
      data.pagination.totalUsers,
      3600,
      true
    );
  } catch (error) {
    console.error('Error caching paginated user list:', error);
  }
}

// Get paginated users from cache
async function getAllUsersFromCache(cacheKey: string): Promise<PaginatedUserResponse | null> {
  try {
    const cachedData = await RedisManager.getDataFromGroup<PaginatedUserResponse>(
      'users_paginated',
      cacheKey
    );
    return cachedData;
  } catch (error) {
    console.error('Error getting paginated users from cache:', error);
    return null;
  }
}

// Invalidate cache for specific filters
// async function invalidateUserCache(page?: number, limit?: number, userType?: string, search?: string) {
//   try {
//     if (page && limit && userType) {
//       // Invalidate specific page
//       const cacheKey = generateCacheKey(page, limit, userType, search || '');
//       await RedisManager.deleteFromGroup('users_paginated', cacheKey);
//     } else {
//       // Invalidate all cached user data
//       await RedisManager.deleteGroup('users_paginated');
//       await RedisManager.deleteGroup('users_metadata');
//     }
//   } catch (error) {
//     console.error('Error invalidating user cache:', error);
//   }
// }

// Get total users count from cache
async function getTotalUsersCount(): Promise<number | null> {
  try {
    return await RedisManager.getDataFromGroup<number>('users_metadata', 'total_count');
  } catch (error) {
    console.error('Error getting total users count from cache:', error);
    return null;
  }
}

export { 
  cacheUserList, 
  getAllUsersFromCache, 
  // invalidateUserCache,
  getTotalUsersCount,
  generateCacheKey 
};