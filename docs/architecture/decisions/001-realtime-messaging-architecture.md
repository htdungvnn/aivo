# ADR 001: Realtime Messaging Architecture for Social Features

## Status

**Accepted** (Proposed - needs team approval)

*Date: 2025-04-27*

## Context

AIVO's social features (clubs, events, messaging) require real-time communication capabilities:

- Users need instant message delivery in club chats and direct messages
- Online/presence status must update in real-time
- Notifications need to be pushed immediately when events occur
- Gamification updates (leaderboard rank changes, streak milestones) should be visible quickly

Constraints:
- Cloudflare Workers do not have native WebSocket support in the traditional sense (they support HTTP streaming and can act as WebSocket clients, but not as WebSocket servers)
- We need a solution that works within Cloudflare's ecosystem (D1, KV, R2)
- Must handle thousands of concurrent users efficiently
- Low latency requirements (<100ms for message delivery)
- Cost considerations (Cloudflare Workers billing per request)

## Decision

We will implement a **hybrid real-time architecture** using:

1. **WebSocket Protocol** for client-to-edge communication
2. **Cloudflare Workers** as WebSocket termination points
3. **KV Namespace** for connection state and presence tracking
4. **Durable Objects** (optional) for room/broadcast coordination
5. **HTTP Long Polling Fallback** for environments where WebSocket is unavailable

### Architecture Diagram

```
Client (Web/Mobile)
      ↓ WebSocket
Cloudflare Worker (ws.aivo.website)
      ↓ Connection Registry (KV)
      ↓ Message Broadcast
      ├── Durable Object (room coordination)
      ├── D1 Database (persistence)
      └── Expo Push Notifications (mobile alerts)
```

### WebSocket Server Implementation

Use Hono's WebSocket support on Cloudflare Workers:

```typescript
// apps/api/src/routes/websocket.ts
import { Hono } from 'hono';
import { getSocket, upgradeWebSocket } from 'hono/websocket';

const wsRouter = new Hono<{ Bindings: Env }>();

wsRouter.get('/', async (c) => {
  const upgrade = c.req;
  if (!upgrade.headers.get('Upgrade')?.includes('websocket')) {
    return c.text('Upgrade required', 426);
  }

  const socket = await upgradeWebSocket(upgrade);
  
  // Authenticate immediately after connection
  socket.on('message', async (msg) => {
    const data = JSON.parse(msg);
    if (data.type === 'auth') {
      const payload = await verifyToken(data.token);
      if (payload) {
        socket.userId = payload.userId;
        socket.subscriptions = new Set();
        
        // Register connection in KV
        await c.env.KV_CONNECTIONS.put(
          `connection:${socket.id}`,
          JSON.stringify({ userId: payload.userId, connectedAt: Date.now() }),
          { expirationTtl: 300 } // 5 minutes
        );
        
        socket.send(JSON.stringify({ type: 'authenticated' }));
      }
    }
  });
  
  // Heartbeat
  socket.on('ping', () => socket.send('pong'));
  
  // Handle disconnect
  socket.onclose = async () => {
    await cleanupConnection(socket);
  };
  
  return socket;
});
```

### Connection State Management

Store connection metadata in KV:

```
Key: connection:{connectionId}
Value: {
  "userId": "user-123",
  "connectedAt": 1714214400,
  "subscriptions": ["user:user-123", "club:club-abc"],
  "ip": "203.0.113.1",
  "userAgent": "AIVO Mobile/1.0"
}
TTL: 5 minutes (auto-refresh on activity)
```

### Room System

Rooms allow broadcasting to groups:

- `user:{userId}` - Direct messages to specific user
- `club:{clubId}` - Club chat (all members)
- `event:{eventId}` - Event-specific chat
- `presence` - Global presence updates

Subscription management:

```typescript
// Subscribe to room
socket.subscribe(`club:${clubId}`);

// Broadcast to room
await broadcastToRoom(`club:${clubId}`, message, {
  exclude: [socket.id] // Optional: don't echo to sender
});
```

**Implementation with Durable Objects** (recommended for scale):

```typescript
// Room coordination DO
export class RoomDo extends DurableObject {
  private subscribers: Set<string> = new Set();
  
  async fetch(request: Request) {
    const ws = getSocket(this, request);
    ws.on('message', (msg) => {
      const { type, payload } = JSON.parse(msg);
      if (type === 'subscribe') {
        this.subscribers.add(ws.id);
      }
      // Broadcast to all subscribers
      this.subscribers.forEach(subId => {
        const sub = getSocketById(subId);
        sub?.send(JSON.stringify(payload));
      });
    });
    return ws;
  }
}
```

### Message Persistence

All messages must be persisted to D1:

```typescript
// When receiving message via WebSocket
const messageId = generateId();
await db.insert(messages).values({
  id: messageId,
  senderId: socket.userId,
  receiverId, // or clubId, eventId
  content,
  messageType: 'text',
  createdAt: Math.floor(Date.now() / 1000),
});

// Broadcast to recipients
await broadcastToRoom(target, {
  type: 'message',
  id: messageId,
  senderId: socket.userId,
  content,
  createdAt,
});
```

### Presence System

Real-time online status:

```typescript
// Update presence on connection
await c.env.KV_PRESENCE.put(
  `presence:${userId}`,
  JSON.stringify({
    status: 'online',
    lastSeen: Date.now(),
    connectionId: socket.id,
    currentClubId,
  }),
  { expirationTtl: 300 } // 5 min
);

// Heartbeat every 30 seconds from client
socket.on('ping', async () => {
  await c.env.KV_PRESENCE.put(`presence:${userId}`, ..., { expirationTtl: 300 });
});
```

### Fallback: HTTP Long Polling

For clients that cannot use WebSocket (some corporate networks, older browsers):

```typescript
// POST /api/notifications/poll
router.post('/notifications/poll', async (c) => {
  const userId = await authenticate(c);
  const lastSeen = c.req.query('lastSeen'); // timestamp of last notification
  
  // Long poll up to 30 seconds
  const timeout = setTimeout(() => c.json([]), 30000);
  
  const newNotifications = await waitForNotifications(userId, lastSeen);
  clearTimeout(timeout);
  
  return c.json(newNotifications);
});
```

### Mobile Push Notifications

For mobile clients, use Expo Push Notifications:

```typescript
import { Expo, ExpoPushMessage } from 'expo-notifications';

async function sendPushNotification(userId: string, title: string, body: string) {
  // Get user's Expo push token from DB
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  if (!user.expoPushToken) return;
  
  const message: ExpoPushMessage = {
    to: user.expoPushToken,
    sound: 'default',
    title,
    body,
    data: { type: 'message', roomId: '...' },
  };
  
  await Expo.sendPushNotificationAsync(message);
}
```

## Alternatives Considered

### Alternative 1: Server-Sent Events (SSE)

**Description**: Use SSE for server→client streaming.

**Pros**:
- Simpler than WebSocket (HTTP-based)
- Built-in reconnection
- Works with standard HTTP infrastructure

**Cons**:
- Unidirectional (server→client only)
- Requires separate POST for client→server messages
- No binary support (not needed for AIVO)
- Cloudflare Workers have SSE support but less mature than WebSocket

**Why rejected**: Messages need bidirectional real-time (chat requires both directions). SSE would require separate POST endpoint, adding latency.

---

### Alternative 2: Polling (Short Interval)

**Description**: Client polls `/api/notifications/poll` every 2 seconds.

**Pros**:
- Simple to implement
- Works everywhere HTTP works
- No WebSocket infrastructure needed

**Cons**:
- High overhead (many empty requests)
- Latency up to poll interval
- Poor scaling (N users × polling frequency requests)
- Battery drain on mobile

**Why rejected**: Inefficient at scale, poor user experience, incompatible with Cloudflare Workers billing model (excessive requests).

---

### Alternative 3: Third-Party Realtime Service (Pusher, Ably)

**Description**: Use managed realtime service.

**Pros**:
- Handles scaling automatically
- SDKs for all platforms
- Built-in presence, history, etc.
- Minimal infrastructure to manage

**Cons**:
- Vendor lock-in
- Cost at scale (per connection/month)
- Data privacy (messages go through third party)
- Less control over implementation

**Why rejected**: We can implement this ourselves on Cloudflare with similar scale and better cost/control. We have the expertise.

---

### Alternative 4: Durable Objects Only

**Description**: Put all real-time logic in Durable Objects, no separate WebSocket router.

**Pros**:
- Single abstraction
- Built-in state management
- Automatic scaling

**Cons**:
- Higher latency (DO activation)
- More complex for simple broadcast
- Limited to single DO per room (may not scale to thousands of rooms)

**Why rejected**: Durable Objects are great for coordination but we still need the WebSocket upgrade handler in Workers. This is a hybrid approach, not an alternative.

---

## Implementation Plan

**Phase 1: WebSocket Infrastructure** (Week 1)
- Create WebSocket route in API
- Implement authentication handshake
- Setup KV namespaces for connection/presence
- Basic connection lifecycle management

**Phase 2: Messaging** (Week 2)
- Implement direct message rooms
- Persist messages to D1
- Implement read receipts
- Mobile client integration (Expo WebSocket)

**Phase 3: Club/Event Chat** (Week 3)
- Implement room subscriptions
- Broadcast messaging
- Message history pagination
- @mentions and notifications

**Phase 4: Presence & Notifications** (Week 4)
- Real-time presence updates
- Push notification integration
- Typing indicators
- Online/offline status

**Phase 5: Testing & Optimization** (Week 4)
- Load testing (1000 concurrent connections)
- Latency optimization
- Error handling and reconnection
- Monitoring and alerting

## Consequences

### Positive

- Low-latency real-time communication (<100ms)
- Scales automatically with Cloudflare Workers (millions of connections)
- Cost-effective (pay-per-use, no persistent servers)
- Full control over implementation
- Works across web and mobile with same API
- KV provides durable connection state across Worker instances

### Negative

- WebSocket connections count toward Cloudflare Workers request quota
- Need to implement reconnection logic on client
- KV TTL management required to avoid stale connections
- Durable Objects have activation latency (~10-50ms)
- More complex than managed service
- Need to handle connection state recovery after Worker restarts

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| WebSocket connection limits (per account) | Request quota increase from Cloudflare; implement connection pooling |
| KV operations slow (read/write latency) | Cache connection state in memory within DO; batch writes |
| Durable Object single-thread bottleneck | Use one DO per room/cluster; fan-out through multiple DOs |
| Mobile backgrounding kills WebSocket | Use Expo push notifications for offline delivery |
| Memory leaks from unclosed connections | Aggressive TTL cleanup (5 min); monitor connection count |
| Scaling to 10K+ concurrent connections | Load test early; use multiple Worker instances; optimize DO usage |

## Monitoring

- Active WebSocket connections (Grafana dashboard)
- Message delivery latency (p50, p95, p99)
- KV read/write latency
- Durable Object activation count
- Connection churn rate (connect/disconnect per minute)
- Message throughput (messages/second)
- Failed WebSocket upgrades (4xx rate)

Alerts:
- Active connections > 80% of quota
- Message latency p95 > 200ms
- KV latency p95 > 50ms
- Error rate > 1%

## Related Decisions

- ADR-002: Database Schema for Social Features
- ADR-003: Leaderboard Caching Strategy
- ADR-005: Push Notification Architecture

---

**Reviewers**: @senior-hono @senior-devops  
**Approvers**: @tech-lead @senior-cloudflare
