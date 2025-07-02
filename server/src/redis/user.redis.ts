import { RedisManager } from "../utils/redisClient";
import { IUser as User, UserListResponse } from '../interface/IUser';


// In your userController or service layer
async function cacheUserList(users: UserListResponse[]) {
    try { 
      // Cache the entire user list with a group name 'chatUsers'
      await RedisManager.cacheDataInGroup(
        'users',           // group name
        'all',           // key
        users,                // user data
        3600,                 // TTL: 1 hour (adjust as needed)
        true                  // add to set for easy lookup
      );
  
      // abhi ke liye not necessary in future it may be used
      // for (const user of users) {
      //   await RedisManager.cacheDataInGroup(
      //     'users',
      //     `user:${user.id}`,  // individual user key
      //     user,
      //     3600,               // TTL: 1 hour
      //     true
      //   );
      // }
    } catch (error) {
      console.error('Error caching user list:', error);
    }
  }


async function getAllUsersFromCache() {
    try {
      // Try to get all users from cache
      const cachedUsers = await RedisManager.getDataFromGroup<User[]>('users', 'all'); 
      if (cachedUsers) {
        return cachedUsers;
      }
      return null;
    } catch (error) {
      console.error('Error getting users from cache:', error);
      return null;
    }
  }

// for future use
// async function getSingleUserFromCache(userId: string) {
//   try {
//     // Try to get user from cache using the same group and key pattern
//     const cachedUser = await RedisManager.getDataFromGroup<User>(
//       'users',           // same group name as used in cacheUserList
//       `user:${userId}`   // same key pattern as used in cacheUserList
//     );

//     if (cachedUser) {
//       return cachedUser;
//     }
//     return null;
//   } catch (error) {
//     console.error(`Error getting user ${userId} from cache:`, error);
//     return null;
//   }
// }

export { cacheUserList, getAllUsersFromCache }

