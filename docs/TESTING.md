# Testing Strategy

Comprehensive testing guide for the AIVO monorepo.

## Testing Philosophy

AIVO follows a multi-layered testing strategy:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between modules and external services
- **End-to-End Tests**: Test complete user workflows across the stack
- **Performance Tests**: Ensure WASM compute functions meet performance targets
- **Accessibility Tests**: Verify WCAG 2.1 AA compliance

## Test Distribution by Package

| Package | Unit | Integration | E2E | Performance | Accessibility |
|---------|------|-------------|-----|-------------|----------------|
| `@aivo/aivo-compute` | ✅ 90%+ | - | - | ✅ Required | - |
| `@aivo/db` | ✅ 100% | ✅ Schema tests | - | - | - |
| `@aivo/memory-service` | ✅ 85%+ | ✅ Vector search | - | - | - |
| `@aivo/api` | ✅ 85%+ | ✅ Hono routes | - | ✅ Latency <50ms | - |
| `@aivo/web` | ✅ 85%+ | ✅ API mocking | ✅ Playwright | ✅ Lighthouse | ✅ Axe |
| `@aivo/mobile` | ✅ 85%+ | ✅ Expo modules | ✅ Detox | - | - |

## Running Tests

### All Packages

```bash
# Run all tests across the monorepo
pnpm run test

# Run tests in watch mode (development)
pnpm run test:watch

# Run tests with coverage report
pnpm run test:coverage
```

### Package-Specific

```bash
# Database package
pnpm --filter @aivo/db run test

# API
cd apps/api && pnpm run test

# Web app
cd apps/web && pnpm run test

# Mobile app
cd apps/mobile && pnpm run test

# WASM compute
cd packages/aivo-compute && pnpm run test
```

## Package Testing Details

### 1. Database (`@aivo/db`)

**Framework**: Vitest with Drizzle test utilities

**Test Types**:
- Schema validation tests
- Migration tests
- Query correctness tests
- Relationship integrity tests

**Example Test**:

```typescript
import { describe, it, expect } from 'vitest';
import { db } from './db';
import { users } from './schema';

describe('Users Table', () => {
  it('should create a user with valid data', async () => {
    const user = await db.insert(users).values({
      email: 'test@example.com',
      name: 'Test User',
      provider: 'google',
    }).returning();

    expect(user[0]).toHaveProperty('id');
    expect(user[0].email).toBe('test@example.com');
  });

  it('should enforce unique email constraint', async () => {
    await expect(
      db.insert(users).values({
        email: 'test@example.com',
        name: 'Another User',
        provider: 'google',
      })
    ).rejects.toThrow();
  });
});
```

**Running with Local D1**:

```bash
# Start local D1 database
pnpm --filter @aivo/db exec wrangler d1 execute aivo-db --local --command "CREATE TABLE ..."

# Run tests against local database
D1_DATABASE=local pnpm --filter @aivo/db run test
```

### 2. API (`apps/api`)

**Framework**: Vitest with Hono test utilities

**Test Structure**:
- Route handler unit tests
- Middleware tests (auth, CORS, rate limiting)
- Integration tests with mock services
- OAuth flow tests

**Example Test**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createAuthMiddleware } from '../src/middleware/auth';
import { Hono } from 'hono';

describe('Auth Middleware', () => {
  it('should reject requests without token', async () => {
    const app = new Hono();
    app.use('/protected', createAuthMiddleware());
    app.get('/protected', (c) => c.text('OK'));

    const res = await fetch('http://localhost/protected');
    expect(res.status).toBe(401);
  });

  it('should accept valid JWT token', async () => {
    const token = generateTestToken({ userId: 'user-123' });

    const app = new Hono();
    app.use('/protected', createAuthMiddleware());
    app.get('/protected', (c) => c.text('OK'));

    const res = await fetch('http://localhost/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });
});
```

**Testing External Services**:

- Mock OpenAI API with `msw` (Mock Service Worker)
- Mock Google OAuth with test tokens
- Use environment variable `NODE_ENV=test` to skip real API calls

### 3. Web (`apps/web`)

**Framework**: Vitest + React Testing Library + Playwright

**Unit/Integration Tests**:

```typescript
import { render, screen } from '@testing-library/react';
import { LoginButton } from '../components/LoginButton';

describe('LoginButton', () => {
  it('renders Google login option', () => {
    render(<LoginButton provider="google" />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('calls onLogin when clicked', () => {
    const mockLogin = vi.fn();
    render(<LoginButton provider="google" onLogin={mockLogin} />);
    screen.getByRole('button').click();
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
});
```

**E2E Tests (Playwright)**:

```typescript
import { test, expect } from '@playwright/test';

test('user can login and view dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.click('[data-testid="google-login"]');
  // Mock OAuth callback in test environment
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toHaveText('Welcome');
});
```

**Accessibility Testing**:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';

expect.extend(toHaveNoViolations);

describe('LoginPage accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<LoginPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 4. Mobile (`apps/mobile`)

**Framework**: Jest + React Native Testing Library + Detox

**Unit Tests**:

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { LoginScreen } from '../screens/LoginScreen';

describe('LoginScreen', () => {
  it('renders login options', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Continue with Google')).toBeTruthy();
    expect(getByText('Continue with Facebook')).toBeTruthy();
  });

  it('shows error when OAuth fails', async () => {
    mockOAuthFailure();
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continue with Google'));
    await waitFor(() => {
      expect(getByText('Authentication failed')).toBeTruthy();
    });
  });
});
```

**E2E Tests (Detox)**:

```javascript
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should show login screen on fresh install', async () => {
    await expect(element(by.id('login_screen'))).toBeVisible();
  });

  it('should navigate to home after successful login', async () => {
    await element(by.id('google_login_button')).tap();
    // Mock deep linking for test
    await device.urlContains('home');
    await expect(element(by.id('home_screen'))).toBeVisible();
  });
});
```

### 5. WASM Compute (`@aivo/compute`)

**Framework**: Rust built-in test + wasm-bindgen-test

**Rust Unit Tests**:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bmi_calculation() {
        let bmi = calculate_bmi(180.0, 80.0); // 5'10", 176 lbs
        assert!(bmi > 24.0 && bmi < 25.0);
    }

    #[test]
    fn test_one_rm_estimation() {
        let one_rm = estimate_one_rm(225.0, 10); // 225 lbs for 10 reps
        assert!(one_rm > 300.0);
    }
}
```

**JavaScript Integration Tests**:

```typescript
import { describe, it, expect } from 'vitest';
import { init, calculate_bmi } from '@aivo/compute';

describe('WASM Compute Functions', () => {
  it('calculates BMI correctly', async () => {
    const wasm = await init();
    const bmi = wasm.calculate_bmi(180, 80);
    expect(bmi).toBeCloseTo(24.7, 1);
  });

  it('handles edge cases', async () => {
    const wasm = await init();
    expect(() => wasm.calculate_bmi(0, 0)).not.toThrow();
  });
});
```

**Performance Benchmarks**:

```bash
# Run benchmarks (requires cargo-criterion)
cargo criterion

# Compare WASM vs native
cargo build --release --target wasm32-unknown-unknown
wasmtime target/wasm32-unknown-unknown/release/aivo_compute.wasm
```

**Performance Requirements**:
- BMI calculation: < 1ms
- 1RM estimation: < 2ms
- Metabolic rate: < 5ms
- Vector similarity search: < 10ms for 10k vectors

### 6. Real-Time Features (Social & Gamification)

**Framework**: Vitest + WebSocket test client + MSW

Real-time features include WebSocket messaging, presence, notifications, and gamification updates. These require integration testing across API, WebSocket server, and client components.

#### Test Types

**WebSocket Connection Tests**:
- Connection establishment and authentication
- Disconnection handling and cleanup
- Reconnection logic
- Room subscription (club, event, user rooms)
- Heartbeat/ping-pong

**Message Delivery Tests**:
- Direct message delivery
- Club chat broadcast
- Event chat delivery
- Message persistence to database
- Read receipt handling
- Typing indicators

**Presence Tests**:
- Online status updates
- Idle timeout (5-minute TTL)
- Presence in club/event context
- KV cleanup of stale sessions

**Notification Tests**:
- Push notification triggering (Expo)
- In-app notification delivery
- Email digest generation
- Notification preferences respect

**Gamification Real-Time**:
- Leaderboard rank updates (hourly)
- Streak milestone push notifications
- Badge earned events
- Club challenge progress updates

#### Example Test: WebSocket Message

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { createTestClient } from '../test-utils';
import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/websocket';

describe('WebSocket Messaging', () => {
  let server: Hono;
  let client: WebSocket;

  beforeEach(async () => {
    server = createTestApp();
    const serverInstance = serve(server.fetch);
    const url = `ws://localhost:${serverInstance.server.address().port}/ws`;
    client = new WebSocket(url);
    await new Promise((resolve) => client.onopen = resolve);
    
    // Authenticate
    client.send(JSON.stringify({
      type: 'auth',
      token: generateTestToken({ userId: 'user-123' }),
    }));
    await waitForMessage(client, 'authenticated');
  });

  afterEach(() => {
    client.close();
    serverInstance.close();
  });

  it('should send direct message to another user', async () => {
    // Setup receiver client
    const receiver = new WebSocket(url);
    // ... auth receiver, subscribe to user room
    
    // Sender sends message
    client.send(JSON.stringify({
      type: 'message',
      to: { type: 'user', userId: 'user-456' },
      content: 'Hello!',
    }));
    
    // Receiver gets message
    const msg = await waitForMessage(receiver);
    expect(msg.type).toBe('message');
    expect(msg.content).toBe('Hello!');
    expect(msg.senderId).toBe('user-123');
  });

  it('should broadcast message to club members', async () => {
    const member1 = connectToClub('club-123');
    const member2 = connectToClub('club-123');
    
    client.send(JSON.stringify({
      type: 'message',
      to: { type: 'club', clubId: 'club-123' },
      content: 'Club announcement!',
    }));
    
    // Both members receive
    await Promise.all([
      expect(waitForMessage(member1)).resolves.toMatchObject({ content: 'Club announcement!' }),
      expect(waitForMessage(member2)).resolves.toMatchObject({ content: 'Club announcement!' }),
    });
  });

  it('should update presence when user connects', async () => {
    const presenceCheck = new WebSocket(url);
    // Auth and subscribe to presence room
    
    // Check presence update
    const presenceMsg = await waitForMessage(presenceCheck, 'presence_update');
    expect(presenceMsg.userId).toBe('user-123');
    expect(presenceMsg.status).toBe('online');
  });
});
```

#### Example Test: Notification Trigger

```typescript
describe('Gamification Notifications', () => {
  it('should send push notification when user levels up', async () => {
    // Arrange: User at 90 XP, needs 10 XP to level up
    const userId = 'user-123';
    await setupGamificationProfile(userId, { level: 2, currentXp: 90 });
    
    // Act: Award 10 XP via workout completion
    await completeWorkout(userId, { points: 10 });
    
    // Assert: Notification sent
    const notifications = await getNotifications(userId);
    const levelUp = notifications.find(n => n.type === 'level_up');
    expect(levelUp).toBeDefined();
    expect(levelUp.title).toContain('Level Up!');
    expect(levelUp.data.newLevel).toBe(3);
    
    // Check push ticket (mocked Expo)
    expect(levelUp.expoPushTicket).toBeDefined();
  });

  it('should send streak milestone notification at 7 days', async () => {
    const userId = 'user-123';
    // Setup 6-day streak
    await setStreak(userId, 6);
    
    // Simulate day 7 check-in
    await dailyCheckin(userId);
    
    const notifications = await getNotifications(userId);
    const streakNotif = notifications.find(n => n.type === 'streak_milestone');
    expect(streakNotif).toBeDefined();
    expect(streakNotif.body).toContain('7-day streak');
  });
});
```

#### Integration Tests: Real-Time + Database

Test that real-time events correctly persist to database:

```typescript
it('should persist club chat messages to database', async () => {
  // Send message via WebSocket
  client.send(JSON.stringify({
    type: 'message',
    to: { type: 'club', clubId: 'test-club' },
    content: 'Test message',
  }));
  
  // Wait for ack
  const ack = await waitForMessage(client, 'message_ack');
  expect(ack.messageId).toBeDefined();
  
  // Verify in database
  const message = await db.query.messages.findFirst({
    where: eq(messages.id, ack.messageId),
  });
  expect(message).not.toBeNull();
  expect(message.content).toBe('Test message');
  expect(message.clubId).toBe('test-club');
});

it('should update member count when user joins club', async () => {
  const initialCount = await getClubMemberCount('test-club');
  
  client.send(JSON.stringify({
    type: 'club_join',
    clubId: 'test-club',
  }));
  
  // Verify count incremented
  const newCount = await getClubMemberCount('test-club');
  expect(newCount).toBe(initialCount + 1);
});
```

#### Load Testing Real-Time

Use `autobahn-testsuite` or custom WebSocket load test:

```javascript
// scripts/ws-load-test.js
const WebSocket = require('ws');
const autocannon = require('autobahn');

const CONNECTIONS = 100;
const DURATION = 30; // seconds

async function runLoadTest() {
  const clients = [];
  
  // Connect all clients
  for (let i = 0; i < CONNECTIONS; i++) {
    const ws = new WebSocket('ws://localhost:8787/ws');
    await new Promise(resolve => ws.onopen = resolve);
    ws.send(JSON.stringify({ type: 'auth', token: generateToken(i) }));
    clients.push(ws);
  }
  
  // Send messages
  const start = Date.now();
  let messagesSent = 0;
  let messagesReceived = 0;
  
  const interval = setInterval(() => {
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    randomClient.send(JSON.stringify({
      type: 'message',
      to: { type: 'club', clubId: 'stress-test' },
      content: `Msg ${messagesSent++}`,
    }));
  }, 10);
  
  // Collect metrics
  setTimeout(() => {
    clearInterval(interval);
    console.log({
      connections: CONNECTIONS,
      messagesSent,
      messagesReceived,
      duration: (Date.now() - start) / 1000,
    });
    clients.forEach(ws => ws.close());
  }, DURATION * 1000);
}
```

**Performance Budgets**:
- WebSocket connection establishment: < 500ms
- Message delivery latency: < 100ms (p99)
- Broadcast to 100-club room: < 200ms
- Presence update propagation: < 1 second
- Notification to Expo push: < 2 seconds

#### Testing with Mock Services

Use `msw` to mock external push notification service (Expo):

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.post('https://api.expo.dev/v2/push/send', (req, res, ctx) => {
    const { data } = req.body as { data: PushMessage };
    // Validate push message structure
    expect(data.to).toBeDefined();
    expect(data.title).toBeDefined();
    return res(ctx.json({ status: 'ok' }));
  })
);
```

#### E2E: Real-Time Social Interaction (Playwright)

```typescript
test('users can chat in club', async ({ page }) => {
  // User A creates club
  await page.goto('/login');
  await login(page, 'user-a@example.com');
  await page.click('[data-testid="create-club"]');
  await page.fill('[name="clubName"]', 'Test Runners');
  await page.click('[data-testid="submit"]');
  
  // User B joins club
  const pageB = await browser.newPage();
  await pageB.goto('/login');
  await login(pageB, 'user-b@example.com');
  await pageB.goto('/clubs/test-runners');
  await pageB.click('[data-testid="join-club"]');
  
  // User A sends message
  await page.click('[data-testid="club-chat"]');
  await page.fill('[data-testid="message-input"]', 'Hello runners!');
  await page.click('[data-testid="send"]');
  
  // User B receives (real-time)
  await expect(pageB.locator('[data-testid="message"]:has-text("Hello runners!")]')).toBeVisible({ timeout: 2000 });
});
```

## Test Coverage Requirements

| Package | Minimum Coverage | Critical Paths |
|---------|-----------------|----------------|
| `@aivo/aivo-compute` | 95% | All public functions |
| `@aivo/db` | 100% | Schema, migrations |
| `@aivo/memory-service` | 90% | Search, indexing |
| `@aivo/api` | 85% | Auth, AI endpoints |
| `@aivo/web` | 85% | Auth flow, chat UI |
| `@aivo/mobile` | 85% | OAuth, API calls |

**Enforcement**: Pre-commit hook runs coverage check; CI fails below thresholds.

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/test.yml` runs on every PR:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm run type-check
      - run: pnpm run lint
      - run: pnpm run test:coverage
      - run: pnpm run build
      - uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

### Coverage Reporting

- Codecov integration for coverage tracking
- Coverage badge in README
- Coverage reports published as artifacts
- Regression detection (coverage must not decrease)

## Performance Testing

### API Performance

Use `autocannon` or `k6` for load testing:

```bash
# Install autocannon
npm install -g autocannon

# Run load test
autocannon -c 100 -d 30 http://localhost:8787/health
```

**Performance Budgets**:
- API latency p95: < 100ms (excluding AI)
- AI chat response: < 2s (including AI provider latency)
- Database queries: < 50ms
- Memory search: < 20ms

### WASM Performance

Benchmark scripts in `packages/aivo-compute/benches/`:

```bash
cargo bench --target wasm32-unknown-unknown
wasm-bench compare --before baseline.wasm --after new.wasm
```

## Accessibility Testing

### Automated (Axe)

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';

expect.extend(toHaveNoViolations);

describe('LoginPage accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<LoginPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Manual Testing

- Keyboard navigation (Tab, Enter, Space)
- Screen reader (VoiceOver, NVDA, JAWS)
- Zoom to 200%
- Reduced motion preference
- High contrast mode

See [design-system/accessibility-guidelines.md](./design-system/accessibility-guidelines.md) for full checklist.

## Mock Data for Testing

The mock data system provides a complete fake dataset for UI/UX and API testing.

### Admin User Profile

- **Email**: `admin@aivo.ai`
- **User ID**: `admin-user-001`
- **Profile**: 28yo male, 180cm, 82.5kg, intermediate fitness level
- **Workout History**: 4 weeks of completed workouts (4 days/week upper/lower split)
- **Body Metrics**: 30 days of daily measurements with trends
- **Gamification**: Level 12, 2850 points, 7-day streak
- **Memories**: 8 extracted memory nodes with relationships
- **Conversations**: 15 chat messages with AI coach
- **Goals**: 3 active fitness goals
- **Nutrition**: Food logs and daily summaries
- **Sleep**: 30 days of sleep tracking
- **Badges**: 3 earned badges

### Quick Setup

```bash
# Navigate to db package
cd packages/db

# Apply migrations to local D1 database
pnpm exec wrangler d1 migrations apply aivo-db --local

# Seed with mock data
pnpm run seed:mock
```

Expected output:
```
🌱 Starting database seeding...

📝 Inserting admin user...
   ✅ Created user: admin@aivo.ai
📝 Inserting OAuth session...
   ✅ Created session for provider: google
📝 Inserting gamification profile...
   ✅ Profile: Level 12, 2850 points
📝 Inserting 31 body metrics records...
   ✅ Body metrics history populated (31 days)
...
✅ Database seeding completed successfully!

📊 Summary:
   - User: admin@aivo.ai
   - Workouts: 16 completed
   - Memories: 8 stored
   - Conversations: 15 messages
   - Gamification: Level 12, 2850 points
   - Streak: 7 days current, 21 days best
```

### Admin API Endpoints (Dev Only)

Available at `/api/admin/test/*` when `NODE_ENV !== "production"`:

| Endpoint | Description |
|----------|-------------|
| `GET /health-check` | API health status |
| `GET /stats` | Dashboard overview statistics |
| `GET /user/:userId` | Detailed user profile with all related data |
| `GET /workouts` | All workouts (filterable by type) |
| `GET /conversations` | Chat history |
| `GET /memories` | Memory nodes (filterable by type/confidence) |
| `GET /body-metrics` | Body measurement history |
| `GET /recovery` | Recovery and fatigue data |
| `GET /gamification` | Points, badges, streaks |
| `GET /ai-activity` | AI interactions summary |

#### Example Usage

```bash
# Get user profile with everything
curl http://localhost:8787/api/admin/test/user/admin-user-001

# Get workout history
curl "http://localhost:8787/api/admin/test/workouts?limit=20"

# Get memory analytics
curl "http://localhost:8787/api/admin/test/memories?minConfidence=0.8"

# Get recovery trends
curl http://localhost:8787/api/admin/test/recovery
```

### Data Characteristics

#### Workout Pattern
- 4 days/week (Mon, Tue, Thu, Fri)
- Upper/Lower split
- Progressive overload (weights increase over weeks)
- Heavy deadlift day on Friday

#### Body Metrics Trends
- Weight: starts at 83kg, trending down to ~81kg
- Body fat: 18.5% → 15% over 30 days
- Muscle mass: slowly increasing
- BMI: 25.4 → 24.7

#### Recovery Patterns
- Recovery score higher on non-workout days (90+)
- Lower recovery on heavy workout days (70-80)
- Sleep quality: consistent 7-8 hours
- Soreness pattern matches workout schedule (legs sore after lower days)

#### Memory Types Distributed
- fact: 3 (profile info, injury history, goal)
- preference: 1 (morning workout preference)
- event: 1 (PR achievement)
- constraint: 1 (4 days/week limitation)
- emotional: 1 (motivation pattern)
- entity: 1 (gym location)

### Testing Scenarios

1. **Dashboard Overview** - Use `/stats` endpoint to test dashboard cards
2. **Profile Page** - Use `/user/:userId` to test complete profile view
3. **Workout History** - Use `/workouts` to test workout list and filters
4. **AI Chat Integration** - Use `/conversations` to test chat history display
5. **Analytics Charts** - Use `/body-metrics` and `/recovery` for chart data
6. **Gamification** - Use `/gamification` to test widgets and badges

### Resetting Data

To reset the mock data:

```bash
# Clear all tables for the admin user
# Or delete the local database and reapply migrations:

cd packages/db
rm -rf .wrangler/state  # Clears local D1 database
pnpm exec wrangler d1 migrations apply aivo-db --local
pnpm run seed:mock
```

### Extending Mock Data

Add new data to `packages/db/src/__tests__/mock-data.ts`:

```typescript
// Add to mockData object
mockData.newTable = [
  {
    id: generateId(),
    userId: adminUser.id,
    // ... your fields
  },
];
```

## Code Coverage

### Generate Coverage Report

```bash
# All packages
pnpm run coverage

# Individual
cd packages/memory-service
pnpm test --coverage --coverageReporters=lcov
```

Coverage targets:

| Package | Target |
|---------|--------|
| `@aivo/memory-service` | 90% |
| `@aivo/api` | 80% |
| `@aivo/web` | 75% |
| `@aivo/mobile` | 70% |

## Writing Good Tests

### AAA Pattern

```typescript
it('creates a workout session', async () => {
  // Arrange
  const userId = 'user-123';
  const routine = await createTestRoutine(userId);

  // Act
  const result = await logWorkoutCompletion({
    routineId: routine.id,
    date: '2025-04-27',
    completedExercises: [...],
  });

  // Assert
  expect(result).toHaveProperty('id');
  expect(result.completionRate).toBe(1.0);
});
```

### Test Naming

`should [expected behavior] when [scenario]`

```typescript
it('should return 401 when token is missing');
it('should return 403 when user lacks permission');
it('should calculate correct BMI for metric units');
```

## Mocking Strategy

### API Mocking (Web/Mobile)

Use `msw` (Mock Service Worker) for HTTP mocking:

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.post('/api/ai/chat', (req, res, ctx) => {
    return res(
      ctx.json({
        message: 'Mock AI response',
        tokensUsed: 100,
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Database Mocking

Create test database with SQLite in memory:

```typescript
import { drizzle } from 'drizzle-orm/sqlite';
import { Database } from 'sqlite3';

const sqlite = new Database(':memory:');
const db = drizzle(sqlite);
```

### OAuth Mocking

Provide test tokens in `apps/api/.env.test`:

```
TEST_GOOGLE_TOKEN=valid-test-token
TEST_FACEBOOK_TOKEN=valid-test-token
```

Test tokens decode to known user IDs for deterministic tests.

## Test Data Management

### Seeding

```typescript
// packages/db/scripts/seed.ts
async function seed() {
  // Create test user
  await db.insert(users).values({
    id: "user-test",
    email: "test@aivo.ai",
    name: "Test User",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Create routine
  await db.insert(workoutRoutines).values({ /* ... */ });
}
```

### Cleanup

```bash
# Reset test database
rm -rf packages/db/.wrangler/state/d1
wrangler d1 migrations apply aivo-db --local
```

## Debugging Tests

### Vitest

```bash
# Verbose
pnpm test --verbose

# Only specific test
pnpm test -t "extractFacts"

# Debug with node inspect
node --inspect-brk node_modules/.bin/vitest --runInBand

# List all tests
pnpm test --reporter=json > tests.json
```

### Rust/WASM

```bash
# Run with logging
RUST_LOG=debug pnpm test

# Single test
cargo test test_name -- --nocapture

# Show output
cargo test -- --nocapture
```

### Playwright

```bash
# UI mode
pnpm exec playwright test --ui

# Debug
pnpm exec playwright test --debug

# Trace on failure
pnpm exec playwright test --trace on
```

### Detox

```bash
# List devices
detox list

# Test specific device
detox test -c ios.simulator

# With logs
detox test -c ios.simulator --loglevel trace
```

## Pre-merge Checklist

- [ ] All unit tests pass locally
- [ ] Integration tests pass
- [ ] E2E tests pass (if affected)
- [ ] Coverage thresholds met (no decrease > 2%)
- [ ] Accessibility tests pass (UI components)
- [ ] Performance benchmarks within budget (if changed)
- [ ] No flaky tests identified (multiple runs stable)
- [ ] Test new features with >85% coverage
- [ ] All mocks properly configured
- [ ] Test data cleanup verified

## Troubleshooting

### Tests Timeout

```bash
# Increase timeout in vitest.config.ts
export default defineConfig({
  test: {
    timeout: 10000, // 10 seconds
  },
});
```

### Flaky Tests

- Identify non-deterministic tests with `--reporter=json`
- Use `vi.useFakeTimers()` for time-dependent tests
- Ensure proper cleanup in `afterEach` hooks
- Check for shared state between tests

### Memory Leaks

```bash
# Run with heap snapshot
node --heapsnapshot-signal=SIGUSR2 node_modules/.bin/vitest run
```

### E2E Tests Fail on CI

- Ensure services are running before tests
- Use `waitOn` package to wait for URLs
- Increase CI timeout

```yaml
- name: Wait for API
  run: npx wait-on http://localhost:8787/health --timeout 60000
```

### WASM Tests Fail

```bash
# Clean and rebuild
pnpm run clean
pnpm run build:wasm
pnpm run test

# Check wasm-pack installation
wasm-pack --version
```

### Coverage Discrepancy

```bash
# Verify source map paths
pnpm test --coverage --reporters=text-summary

# Check for untested files
pnpm test --coverage --coverageReporters=text --coverageReporters=html
# Open coverage/index.html
```

## Test Environment Variables

Create `.env.test`:

```
NODE_ENV=test
DATABASE_URL=file:./test.db
API_URL=http://localhost:8787
OPENAI_API_KEY=sk-test-key (test mode - mock)
GEMINI_API_KEY=test-key (test mode - mock)
AUTH_SECRET=test-secret-only-for-testing
GOOGLE_CLIENT_ID=test-client-id
FACEBOOK_APP_ID=test-app-id
```

## Performance Testing

### Load Testing Scripts

Create `scripts/load-test.js`:

```javascript
const autocannon = require('autocannon');

const instances = [
  { method: 'GET', path: '/health' },
  { method: 'POST', path: '/ai/chat', body: { userId: 'test', message: 'hello' } },
];

autocannon({
  url: 'http://localhost:8787',
  connections: 100,
  duration: 30,
  pipelining: 10,
}, (err, result) => {
  console.log(result);
});
```

Run:
```bash
node scripts/load-test.js
```

## Best Practices

1. **Mock external APIs** - OpenAI, Cloudflare Workers
2. **Use factories** - `createMemoryNode(userId, type, content, embedding)`
3. **Clean up after tests** - Delete created records
4. **Test edge cases** - Empty arrays, nulls, invalid input
5. **Keep tests fast** - < 100ms per test suite
6. **Test integration points** - DB queries, API responses
7. **Use descriptive test names** - Clear what's being tested
8. **Follow AAA pattern** - Arrange, Act, Assert
9. **Avoid test interdependence** - Each test should be independent
10. **Use fixtures for common data** - Reusable test data

## Known Testing Limitations

- Cannot test actual OpenAI API in CI (cost) - use mocks
- WASM performance testing requires native environment
- Mobile E2E tests require simulator/device (slow on CI)
- Cloudflare Workers require `wrangler` in CI (slow startup)
- D1 local database has different performance than production
- OAuth flows require manual testing or complex mocking

## Future Improvements

- [ ] Add contract testing for API boundaries
- [ ] Implement visual regression testing for web UI
- [ ] Add chaos testing for API resilience
- [ ] Set up automated performance baseline comparison
- [ ] Add mutation testing to find untested code
- [ ] Implement cross-browser E2E testing matrix
- [ ] Add load testing to CI/CD pipeline
- [ ] Create test data generation service

---

**Last Updated:** 2026-04-27
**Testing Framework:** Vitest (primary), Jest (legacy), Rust built-in test
**Coverage Tool:** Istanbul/NYC, Codecov
**E2E Frameworks:** Playwright (Web), Detox (Mobile)