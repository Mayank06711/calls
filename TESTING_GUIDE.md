# Quick Testing Guide: Unread Messages & Read Receipts

## Prerequisites
- Redis server running on port 6379
- MongoDB running
- Node.js v18+
- 2 browsers or incognito windows

---

## Test Environment Setup

### Terminal 1: Start Server
```bash
cd server
npm run dev
```

### Terminal 2: Start Client
```bash
cd client
npm run dev
```

### Terminal 3: Monitor Redis
```bash
redis-cli
> MONITOR
```

---

## Test Case 1: Basic Read Receipt Flow (Both Online)

### Steps:
1. **Browser 1**: Login as User A
2. **Browser 2**: Login as User B
3. **Browser 1**: Send message to User B
4. **Browser 2**: Open chat with User A
5. **Browser 1**: Message status should change from "sent" to "seen" (blue tick)

### Expected Redis Operations:
```
LPUSH "read_receipts:{userA_id}" "{...receipt...}"
GET "socket:{userA_id}"
LREM "read_receipts:{userA_id}" 1 "{...receipt...}"
```

### Expected Console Logs (Browser 1):
```
Message sent: {...}
Received seen_ack: {messageId: "...", status: "seen"}
```

### Expected Console Logs (Browser 2):
```
Fetching chat history...
Marked 1 messages as read
```

---

## Test Case 2: Offline Sender Scenario (THE BUG FIX)

### Steps:
1. **Browser 1**: Login as User A
2. **Browser 1**: Send message to User B (who is offline)
3. **Browser 1**: Message shows "sent" (single gray tick)
4. **Browser 1**: Close browser / logout
5. **Browser 2**: Login as User B
6. **Browser 2**: Open chat with User A
7. **Browser 2**: Should see message
8. **Browser 1**: Login again as User A
9. **Browser 1**: Should immediately receive batch receipts
10. **Browser 1**: Message status changes to "seen" (blue double tick)

### Expected Redis Operations:
```
# When User B reads (User A offline):
LPUSH "read_receipts:{userA_id}" "{...receipt...}"
GET "socket:{userA_id}" → null (User A offline)
EXPIRE "read_receipts:{userA_id}" 604800

# When User A logs back in:
LRANGE "read_receipts:{userA_id}" 0 -1
DEL "read_receipts:{userA_id}"
```

### Expected Console Logs (Browser 1 after login):
```
Socket authenticated
Received batch receipts: {receipts: [...], count: 1}
Message status updated to seen
```

### Expected Console Logs (Browser 2):
```
Opened chat: {chatId: "...", markedCount: 1}
```

---

## Test Case 3: Unread Count Display

### Steps:
1. **Browser 1**: Login as User A
2. **Browser 2**: Login as User B
3. **Browser 1**: Send 5 messages to User B
4. **Browser 2**: Should see red badge with "5" on User A's chat
5. **Browser 2**: Click on User A's chat
6. **Browser 2**: Badge should disappear
7. **Browser 1**: All 5 messages should show "seen" status

### Expected Console Logs (Browser 2):
```
Fetched unread counts: Map(1) {"userA_id" => 5}
Chat list rendered with badges
Opened chat: {markedCount: 5}
Updated unread counts: Map(0) {}
```

### Expected UI:
```
Before opening:  [User A]  (5)  ← Red badge
After opening:   [User A]       ← No badge
```

---

## Test Case 4: Multiple Senders Unread

### Steps:
1. **Browser 1**: Login as User A
2. **Browser 2**: Login as User B
3. **Browser 3**: Login as User C
4. **Browser 2**: Send 3 messages to User A
5. **Browser 3**: Send 2 messages to User A
6. **Browser 1**: Should see:
   - User B's chat with badge "3"
   - User C's chat with badge "2"
7. **Browser 1**: Open User B's chat
8. **Browser 1**: User B's badge should clear, User C's badge remains "2"

### Expected State (Browser 1):
```javascript
unreadCounts: Map(2) {
  "userB_id" => 3,
  "userC_id" => 2
}

// After opening User B's chat:
unreadCounts: Map(1) {
  "userC_id" => 2
}
```

---

## Test Case 5: Receipt Queue TTL (7 Days)

### Manual Redis Test:
```bash
redis-cli

# Simulate queueing a receipt
> LPUSH "read_receipts:test_user" '{"messageId":"msg123","chatId":"chat456","status":"seen","timestamp":1234567890}'
> EXPIRE "read_receipts:test_user" 10

# Check TTL
> TTL "read_receipts:test_user"
# Should show ~10 seconds

# Wait 10 seconds
> GET "read_receipts:test_user"
# Should return (nil)
```

---

## Test Case 6: Batch Receipts (Multiple Messages)

### Steps:
1. **Browser 1**: Login as User A, send 20 messages to User B
2. **Browser 1**: Logout
3. **Browser 2**: Login as User B, open chat with User A
4. **Browser 1**: Login again
5. **Browser 1**: Should receive 1 batch event with 20 receipts (not 20 individual events)

### Expected Console (Browser 1):
```
Received batch receipts: {
  receipts: [
    {messageId: "msg1", status: "seen", ...},
    {messageId: "msg2", status: "seen", ...},
    // ... 18 more
  ],
  count: 20
}
```

### Performance Check:
- Should see **1** `receipts:batch` event, not 20 `seen_ack` events
- UI should update smoothly without flickering

---

## Test Case 7: Real-Time Updates While Viewing Chat

### Steps:
1. **Browser 1**: Login as User A
2. **Browser 2**: Login as User B
3. **Browser 1**: Send message to User B
4. **Browser 2**: Already viewing User A's chat
5. Message should arrive in Browser 2
6. **Browser 2**: Should auto-mark as read (no manual action)
7. **Browser 1**: Should see "seen" status immediately

### Expected Behavior:
- Unread badge never appears (chat is already open)
- Receipt delivered immediately (no queue)
- No delay between message arrival and read receipt

---

## Debugging Commands

### Check Redis Queue for User
```bash
redis-cli LRANGE "read_receipts:{userId}" 0 -1
```

### Check Socket ID Mapping
```bash
redis-cli GET "socket:{userId}"
```

### Check TTL
```bash
redis-cli TTL "read_receipts:{userId}"
```

### Count Queued Receipts
```bash
redis-cli LLEN "read_receipts:{userId}"
```

### Clear Queue Manually
```bash
redis-cli DEL "read_receipts:{userId}"
```

### Monitor All Redis Commands
```bash
redis-cli MONITOR
```

---

## MongoDB Queries for Debugging

### Check Message Status
```javascript
db.messages.find({
  chatId: ObjectId("..."),
  status: "sent"
}).pretty()
```

### Count Unread Messages
```javascript
db.messages.countDocuments({
  receiverId: ObjectId("..."),
  status: "sent"
})
```

### Find All Chats with Unread
```javascript
db.messages.aggregate([
  { $match: { receiverId: ObjectId("...") } },
  {
    $group: {
      _id: "$chatId",
      unreadCount: {
        $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] }
      }
    }
  },
  { $match: { unreadCount: { $gt: 0 } } }
])
```

---

## Common Issues & Fixes

### Issue: Receipts Not Delivered
```bash
# Check if Redis is running
redis-cli ping
# Expected: PONG

# Check if socket ID exists
redis-cli GET "socket:{userId}"
# Expected: "socketId123..."
```

### Issue: Unread Count Not Showing
1. Open DevTools → Network → WS (WebSocket)
2. Filter for `chat:list`
3. Check response payload:
   ```json
   {
     "status": "success",
     "chats": [
       {
         "chatId": "...",
         "unreadCount": 5,  ← Should be > 0
         "userId": "..."
       }
     ]
   }
   ```

### Issue: Badge Not Clearing
1. Open DevTools → Console
2. Type: `console.log(unreadCounts)`
3. Should show empty Map after opening chat
4. If not, check `handleUserSelect` function

---

## Performance Benchmarks

### Acceptable Latencies:
- Send message → Receive (same user): < 50ms
- Mark as read → Receipt delivery: < 100ms
- Open chat → Bulk mark-as-read: < 200ms (for 100 messages)
- Batch receipt delivery: < 50ms (for 50 receipts)

### Redis Performance:
```bash
redis-cli --latency
# Expected: avg < 1ms

redis-cli --latency-history
# Expected: 99th percentile < 5ms
```

---

## Success Criteria

✅ **Test Case 1**: Both online users see immediate read receipts  
✅ **Test Case 2**: Offline sender receives receipts when logging back in  
✅ **Test Case 3**: Unread badges display correctly  
✅ **Test Case 4**: Multiple senders have independent unread counts  
✅ **Test Case 5**: Redis TTL expires correctly after 7 days  
✅ **Test Case 6**: Batch delivery works for multiple messages  
✅ **Test Case 7**: Auto mark-as-read when viewing chat  

---

## Next Steps After Testing

1. ✅ Verify all test cases pass
2. ⏳ Monitor Redis memory usage in production
3. ⏳ Set up alerts for queue size > 10,000
4. ⏳ Add analytics to track read receipt delivery rates
5. ⏳ Consider implementing delivery receipts (two gray ticks)
6. ⏳ Add push notifications for mobile offline users

---

**Ready to Test!** 🚀

Start with Test Case 2 (the bug fix scenario) to verify the main issue is resolved.
