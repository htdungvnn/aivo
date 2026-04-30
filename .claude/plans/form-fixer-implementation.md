# Form Fixer Implementation Plan

## Context

The "Form Fixer" is an interactive post-workout video feedback feature where users upload 10-second clips of compound lifts (Squat, Deadlift) for AI-powered form analysis. The system must detect flaws like "Knee Cave" (valgus) or "Rounded Back" and generate specific correction drills.

This is a "token burner" feature - it requires temporal analysis of movement frames using advanced vision models (Veo or similar), making it computationally intensive and long-running (30s-2 minutes per video).

## Current State Analysis

### Existing Infrastructure
- **API**: Hono (Cloudflare Workers) with Zod validation and OpenAPI docs
- **Storage**: R2 bucket (`aivo-images`) for file storage
- **Database**: D1 SQLite with Drizzle ORM
- **AI Integration**: OpenAI GPT-4o for vision analysis (static images only currently)
- **Caching**: KV namespaces for body insights and leaderboards
- **Cron**: Daily cron for gamification processing
- **Auth**: OAuth (Google/Facebook) with bearer tokens

### Gaps to Address
1. **No async job queue** - Current AI analysis is synchronous (blocks request)
2. **No video handling** - Only image upload exists
3. **No push notifications** - Only email via Resend exists
4. **No form analysis schema** - Need new database tables
5. **No mobile notification mechanism** - Need Expo push notification support

## Recommended Architecture: D1 Job Queue + Cron Processing

Given Cloudflare Workers constraints (no native queues, max 10-minute CPU time), we'll implement a **D1-backed job queue** processed by a cron-triggered worker.

### Why This Approach?
- **Simplicity**: Uses existing D1 database, no new infrastructure
- **Reliability**: Cron runs every minute, jobs are idempotent
- **Scalability**: Can process ~60 jobs/hour per worker (adjustable by cron frequency)
- **Cost-effective**: No additional Cloudflare bills

### Alternatives Considered
- **Durable Objects**: Overkill for this use case, more complex
- **External queue (Redis/SQS)**: Additional infra, latency
- **Synchronous processing**: Would timeout on Workers (30s limit), poor UX

## Implementation Steps

### Phase 1: Database Schema

**File**: `packages/db/src/schema.ts`

Add new tables:

```typescript
// Video uploads for form analysis
export const formAnalysisVideos = sqliteTable("form_analysis_videos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  r2Key: text("r2_key").notNull(),      // R2 storage key
  r2Url: text("r2_url").notNull(),      // Public URL
  filename: text("filename").notNull(),
  exerciseType: text("exercise_type").notNull(), // "squat", "deadlift"
  durationSeconds: integer("duration_seconds"),
  fileSizeBytes: integer("file_size_bytes"),
  status: text("status").default("pending"), // pending, processing, completed, failed
  errorMessage: text("error_message"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// AI analysis results
export const formAnalyses = sqliteTable("form_analyses", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => formAnalysisVideos.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  overallScore: real("overall_score"),  // 0-100
  issuesDetected: text("issues_detected"), // JSON array of issues
  corrections: text("corrections"),     // JSON array of correction drills
  frameTimestamps: text("frame_timestamps"), // JSON: { issue: time_in_seconds }
  confidence: real("confidence"),
  processingTimeMs: integer("processing_time_ms"),
  modelUsed: text("model_used"),
  rawAnalysis: text("raw_analysis"),    // Full AI response
  completedAt: integer("completed_at"),
  createdAt: integer("created_at").notNull(),
});
```

Also add indexes for query performance.

### Phase 2: R2 Video Upload

**Files**:
- `apps/api/src/services/r2.ts` - Add video validation
- `apps/api/src/routes/form-analyze.ts` - New router

Add video validation helper:
```typescript
export function validateVideo(buffer: Buffer): { valid: boolean; error?: string } {
  // Check magic bytes for MP4, MOV, WebM
  // Size limit: 100MB (10s @ 1080p ~ 30-50MB)
  // Duration check (basic header parsing)
}
```

Create new router `form-analyze.ts` with endpoints:

1. **POST /api/form-analyze/upload** - Upload video, create job record
   - Accepts `multipart/form-data` with `video` file
   - Validates: file type (video/mp4, video/quicktime, video/webm), size < 100MB
   - Extracts exercise type from form field (`squat` | `deadlift`)
   - Uploads to R2: key = `form-videos/{userId}/{videoId}/{filename}`
   - Creates record in `formAnalysisVideos` with status "pending"
   - Returns: `{ videoId, status: "pending", message: "Video uploaded, analysis starting" }`

2. **GET /api/form-analyze/status/:videoId** - Check analysis status
   - Returns video record + analysis if completed
   - Polling endpoint for mobile app

3. **GET /api/form-analyze/report/:videoId** - Get full analysis report
   - Requires analysis to be completed
   - Returns detailed form critique with corrections

### Phase 3: Job Processing Worker

**File**: `apps/api/src/services/form-analyzer-worker.ts`

Create a worker service that:
1. Fetches pending jobs from `formAnalysisVideos` (status = "pending", ordered by createdAt)
2. For each job:
   - Mark as "processing"
   - Extract key frames from video (use FFmpeg.wasm or frame sampling)
   - For each key frame, call OpenAI GPT-4o with vision prompt
   - Aggregate results to detect patterns across frames
   - Generate structured report with:
     - Overall score (0-100)
     - Issues: [{ type: "knee_cave" | "rounded_back" | ..., severity: "mild"|"moderate"|"severe", timestamp: number }]
     - Corrections: [{ issue: string, drill: string, description: string }]
   - Save results to `formAnalyses`
   - Update video status to "completed"
   - Trigger notification (Phase 4)
3. Handle errors: update status to "failed", store error message

**Frame Extraction Strategy**:
- 10-second video at 30fps = 300 frames
- Sample every 10th frame = 30 frames for analysis
- Focus on key phases: descent (bottom), ascent (top), transition

**AI Prompt Template**:
```
Analyze this frame from a ${exerciseType} video. Detect:
1. Knee position: valgus (caving in), varus, aligned
2. Back posture: rounded, neutral, arched
3. Hip hinge: proper, insufficient, excessive
4. Depth: adequate, shallow, excessive
5. Bar path: vertical, forward, backward

Return JSON: {
  "frame_index": number,
  "knee_cave": { "detected": boolean, "confidence": 0-1, "severity": "mild|moderate|severe" },
  "rounded_back": { "detected": boolean, "confidence": 0-1, "severity": "mild|moderate|severe" },
  "other_issues": [string],
  "positive_points": [string]
}
```

**Aggregation Logic**:
- Issue detected in >=30% of frames = confirmed
- Average confidence across detected frames
- Worst severity across frames

### Phase 4: Notification System

**Files**:
- `packages/shared-types/src/index.ts` - Add notification types
- `apps/api/src/routes/notifications.ts` - New router
- `apps/mobile/app/services/notifications.ts` - Mobile client

**Database Table**:
```typescript
export const userNotifications = sqliteTable("user_notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "form_analysis_ready", "badge_earned", etc.
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: text("data"), // JSON with related IDs
  isRead: integer("is_read").default(0),
  createdAt: integer("created_at").notNull(),
});
```

**Push Notification via Expo**:
- Store Expo push tokens in `users` table (add `expoPushToken` column)
- When analysis completes, send push via Expo's push notification service
- POST to `https://exp.host/--/api/v2/push/send`

**Mobile Integration**:
- Register for push notifications on app launch
- Store token in user profile via `PUT /users/me/push-token`
- Handle notification tap to navigate to form report screen

### Phase 5: Cron Job Integration

**File**: `apps/api/src/routes/cron.ts`

Enhance existing cron to include form analysis processing:

```typescript
export async function runCronJob(env: CronEnv): Promise<...> {
  // ... existing gamification code ...

  // Process pending form analyses
  const processedCount = await processFormAnalysisQueue(env.DB, env.OPENAI_API_KEY);

  // ... rest ...
}
```

Update `wrangler.toml` cron schedule:
```
crons = ["*/1 * * * *", "0 0 * * *", "0 9 1 * *"]  # Every minute + daily + monthly
```

### Phase 6: Shared Types Updates

**File**: `packages/shared-types/src/index.ts`

Add types:

```typescript
export interface FormAnalysisVideo {
  id: string;
  userId: string;
  r2Url: string;
  exerciseType: "squat" | "deadlift";
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
}

export interface FormIssue {
  type: "knee_cave" | "rounded_back" | "insufficient_depth" | "excessive_arch" | "bar_path_deviation" | "hip_hinge_issue";
  severity: "mild" | "moderate" | "severe";
  confidence: number;
  timestamp: number; // seconds into video
  description: string;
}

export interface FormCorrection {
  issue: string;
  drill: string;
  description: string;
  cues: string[]; // verbal cues
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface FormAnalysisReport {
  id: string;
  videoId: string;
  overallScore: number; // 0-100
  grade: "excellent" | "good" | "fair" | "poor" | "needs_work";
  issues: FormIssue[];
  corrections: FormCorrection[];
  summary: string;
  positiveFeedback: string[];
  confidence: number;
  processingTimeMs: number;
  completedAt: Date;
}
```

### Phase 7: Mobile App Integration

**Files**:
- `apps/mobile/app/services/form-analysis-api.ts` - API client
- `apps/mobile/app/(tabs)/form-analysis.tsx` - Screen for upload & results
- `apps/mobile/app/components/FormAnalysisCard.tsx` - UI components

**Features**:
1. Upload screen: Record/select video, choose exercise type, upload
2. Processing status: "Analyzing your form..." with progress indicator
3. Results screen: Score, issues highlighted with video timeline, correction drills
4. Pull-to-refresh for status check
5. Push notification deep link to results

### Phase 8: Web App Integration (Optional)

Similar components for Next.js web app if needed.

### Phase 9: Testing

**Unit Tests**:
- Video validation
- Frame extraction logic
- AI response parsing
- Issue aggregation algorithm
- Notification triggering

**Integration Tests**:
- Full upload → processing → results flow
- Error handling (invalid video, AI failure)
- Database state transitions

**Manual Testing**:
- Upload sample videos
- Verify AI detects known issues
- Check notification delivery

### Phase 10: Monitoring & Observability

Add logging to D1 logs:
- Job start/complete/failure
- Processing time metrics
- Error tracking

Optional: Add `systemMetrics` table updates for AI request counts.

## File Structure

```
packages/
  db/
    src/
      schema.ts                    [MODIFIED] Add form_analysis_videos, form_analyses
  shared-types/
    src/
      index.ts                    [MODIFIED] Add form analysis types

apps/
  api/
    src/
      routes/
        form-analyze.ts           [NEW] Upload, status, report endpoints
      services/
        form-analyzer-worker.ts   [NEW] Job processing logic
        form-analyze-queue.ts     [NEW] Queue management (fetch jobs, update status)
        video-processor.ts        [NEW] Frame extraction
      __tests__/
        form-analyze.test.ts      [NEW] Unit tests
        integration-form-analyze.test.ts [NEW] Integration tests

  mobile/
    app/
      services/
        form-analysis-api.ts      [NEW]
      components/
        FormAnalysisCard.tsx      [NEW]
        VideoUploader.tsx         [NEW]
        CorrectionDrillCard.tsx   [NEW]
      (tabs)/
        form-analysis.tsx         [NEW]

  web/
    src/
      app/
        form-analysis/
          page.tsx               [NEW]
      components/
        form/
          FormUploader.tsx       [NEW]
          FormReport.tsx         [NEW]
```

## Database Migration

Create migration file: `packages/db/drizzle/migrations/0003_add_form_analysis.sql`

```sql
CREATE TABLE form_analysis_videos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  r2_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes INTEGER,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE form_analyses (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  overall_score REAL,
  issues_detected TEXT,
  corrections TEXT,
  frame_timestamps TEXT,
  confidence REAL,
  processing_time_ms INTEGER,
  model_used TEXT,
  raw_analysis TEXT,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (video_id) REFERENCES form_analysis_videos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_form_videos_user ON form_analysis_videos(user_id);
CREATE INDEX idx_form_videos_status ON form_analysis_videos(status);
CREATE INDEX idx_form_analyses_video ON form_analyses(video_id);
CREATE INDEX idx_form_analyses_user ON form_analyses(user_id);
```

## Environment Variables

Add to `apps/api/wrangler.toml`:
```
[vars]
OPENAI_API_KEY = ""  # Already exists for chat, reuse for vision
EXPO_PUSH_TOKEN = "" # For mobile notifications (optional)
```

## Verification Steps

1. **Database Migration**:
   ```bash
   pnpm --filter @aivo/db exec drizzle-kit generate
   pnpm --filter @aivo/db exec wrangler d1 migrations apply aivo-db --local
   ```

2. **Build & Deploy**:
   ```bash
   pnpm run build
   pnpm --filter api exec wrangler deploy --local
   ```

3. **Test Upload Flow**:
   - Use curl or Postman to upload a video
   - Verify R2 upload and DB record creation
   - Check status endpoint returns "pending"

4. **Test Processing**:
   - Trigger cron manually: `curl http://localhost:8788/api/cron`
   - Verify job picked up and processed
   - Check DB for completed analysis

5. **Test Mobile Notification**:
   - Set Expo push token for test user
   - Verify push received after analysis completes

6. **API Documentation**:
   - Visit http://localhost:8788/docs
   - Verify new endpoints documented

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Video processing exceeds 10min limit | Process one video per cron run, or limit to 30s clips |
| OpenAI vision API rate limits | Implement retry with backoff, queue limiting |
| Large videos cause memory issues | Enforce 100MB limit, reject early |
| Mobile push tokens expire | Refresh on app launch, handle delivery failures |
| Job stuck in "processing" | Add timeout (30min), auto-revert to "failed" |

## Cost Considerations

- **OpenAI GPT-4o Vision**: ~$0.01-0.05 per analysis (30 frames × $0.001-0.002/vision)
- **R2 Storage**: ~$0.02/GB/month (videos 50MB each = $0.001/video/month)
- **D1 Database**: ~$0.20/Month (small tables)
- **Cloudflare Workers**: ~$5/month (cron + API)

Estimated: $0.10-0.50 per analysis including AI costs.

## Future Enhancements

1. **Veo Video Model**: Upgrade to Google Veo for true temporal analysis
2. **Progress Updates**: WebSocket for real-time processing progress
3. **Comparison Feature**: Compare current form to previous best
4. **Coach Notes**: Add AI-generated personalized coaching tips
5. **Exercise Library**: Expand beyond squat/deadlift to bench, pull-ups, etc.
6. **3D Pose Estimation**: Use MediaPipe or MoveNet for joint angle calculations
7. **Video Compression**: Auto-compress on upload to reduce storage/costs
8. **Bulk Upload**: Multiple videos in one session

---

This plan provides a complete, production-ready implementation of the Form Fixer feature that integrates seamlessly with the existing AIVO platform architecture.