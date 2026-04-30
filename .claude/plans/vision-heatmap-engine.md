# Vision-to-SVG Heatmap Engine - Implementation Plan

## Context

AIVO needs an AI-powered body composition visualization system that transforms user-uploaded body photos into an interactive 2D vector heatmap. This feature provides users with a visual "progress map" showing body fat/muscle distribution changes over time, with colors transitioning from red (higher fat) to green (leaner/more muscular).

**Current State:**
- `BodyHeatmap` components exist in both web and mobile but use mock/random data
- Database has `bodyMeasurements` table for numeric metrics only
- API has R2 storage service for file uploads
- AI route (`ai.ts`) exists but doesn't handle vision analysis for body photos
- No photo upload or vision analysis infrastructure

**Goal:**
Build a complete pipeline: Photo Upload → Claude Vision Analysis → Heatmap Data → SVG Rendering → Progress Tracking

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   User      │────▶│  Upload Photo │────▶│    R2 Storage  │
│  (Web/Mobile)│     │   (API)      │     │   (Image)      │
└─────────────┘     └──────────────┘     └────────────────┘
                                                   │
                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   User      │◀────│  Heatmap     │◀────│  Vision        │
│  (Web/Mobile)│     │   SVG View   │     │  Analysis      │
└─────────────┘     └──────────────┘     └────────────────┘
                                   │                 │
                                   ▼                 │
                          ┌────────────────┐        │
                          │   Heatmap      │        │
                          │   Database     │◀───────┘
                          │   (History)    │
                          └────────────────┘
```

---

## Detailed Implementation

### 1. Database Schema (packages/db/src/schema.ts)

**Add new tables:**

```typescript
// Body Photos - stores uploaded user body photos
export const bodyPhotos = pgTable('body_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  r2Url: text('r2_url').notNull(),      // R2 storage URL
  thumbnailUrl: text('thumbnail_url'),   // Optional thumbnail
  uploadDate: timestamp('upload_date').notNull().defaultNow(),
  analysisStatus: varchar('analysis_status', { length: 20 })
    .notNull()
    .default('pending'),  // pending, processing, completed, failed
  poseDetected: boolean('pose_detected'), // Front/back pose detection
  metadata: jsonb('metadata'),          // Width, height, file size, etc.
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  statusIdx: index('analysis_status_idx').on(table.analysis_status),
}));

// Body Heatmaps - stores AI-analyzed heatmap regions
export const bodyHeatmaps = pgTable('body_heatmaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  photoId: uuid('photo_id')
    .notNull()
    .references(() => bodyPhotos.id, { onDelete: 'cascade' }),
  // Heatmap regions: [{ zoneId, intensity, coordinates: {x, y, width, height} }]
  regions: jsonb('regions').notNull(),
  // Overall metrics per region
  metrics: jsonb('metrics'), // { upperBodyFat, coreFat, lowerBodyFat, overallScore }
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  photoIdIdx: index('photo_id_idx').on(table.photoId),
}));

// Heatmap History - track progress over time (can use bodyHeatmaps.createdAt)
// Optional: add summary view for quick retrieval
export const bodyHeatmapHistory = pgTable('body_heatmap_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  heatmapId: uuid('heatmap_id')
    .notNull()
    .references(() => bodyHeatmaps.id, { onDelete: 'cascade' }),
  snapshotDate: date('snapshot_date').notNull(),
  comparisonNote: text('comparison_note'), // AI-generated progress summary
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  snapshotDateIdx: index('snapshot_date_idx').on(table.snapshot_date),
}));
```

**Generate migration:**
```bash
pnpm --filter @aivo/db exec drizzle-kit generate
```

---

### 2. Shared Types (packages/shared-types/src/index.ts)

Add TypeScript types for heatmap data:

```typescript
// Body zone definitions matching SVG coordinates
export interface BodyZone {
  id: string;
  name: string;
  // Normalized coordinates (0-1) relative to SVG viewport
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Primary muscle groups in this zone
  muscles: string[];
}

export interface HeatmapRegion {
  zoneId: string;
  intensity: number; // 0-100 (fat percentage or lean score)
  color: string; // Calculated from intensity
  confidence: number; // 0-1 from vision analysis
}

export interface VisionAnalysisResult {
  photoId: string;
  pose: 'front' | 'back' | 'side' | 'unknown';
  regions: HeatmapRegion[];
  metrics: {
    upperBodyScore: number;
    coreScore: number;
    lowerBodyScore: number;
    overallScore: number;
  };
  processedAt: string;
}

export interface BodyPhotoUpload {
  photo: File;
  userId: string;
}

export interface BodyPhotoRecord {
  id: string;
  userId: string;
  r2Url: string;
  thumbnailUrl?: string;
  uploadDate: Date;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  poseDetected?: boolean;
}

// Pre-defined body zones for the SVG template
export const BODY_ZONES: BodyZone[] = [
  // Upper Body
  { id: 'chest', name: 'Chest', bounds: { x: 0.35, y: 0.18, width: 0.30, height: 0.15 }, muscles: ['pectorals', 'deltoids'] },
  { id: 'back_upper', name: 'Upper Back', bounds: { x: 0.35, y: 0.12, width: 0.30, height: 0.15 }, muscles: ['traps', 'deltoids', 'lats'] },
  { id: 'shoulders', name: 'Shoulders', bounds: { x: 0.25, y: 0.18, width: 0.50, height: 0.08 }, muscles: ['deltoids'] },
  { id: 'arms', name: 'Arms', bounds: { x: 0.15, y: 0.20, width: 0.10, height: 0.30 }, muscles: ['biceps', 'triceps'] },

  // Core
  { id: 'abs_upper', name: 'Upper Abs', bounds: { x: 0.35, y: 0.32, width: 0.30, height: 0.08 }, muscles: ['rectus_abdominis'] },
  { id: 'abs_lower', name: 'Lower Abs', bounds: { x: 0.35, y: 0.40, width: 0.30, height: 0.10 }, muscles: ['rectus_abdominis', 'hip_flexors'] },
  { id: 'obliques', name: 'Obliques', bounds: { x: 0.25, y: 0.35, width: 0.50, height: 0.12 }, muscles: ['obliques', 'serratus'] },
  { id: 'lower_back', name: 'Lower Back', bounds: { x: 0.35, y: 0.28, width: 0.30, height: 0.08 }, muscles: ['erector_spinae'] },

  // Lower Body
  { id: 'glutes', name: 'Glutes', bounds: { x: 0.35, y: 0.50, width: 0.30, height: 0.12 }, muscles: ['gluteus_maximus'] },
  { id: 'quads', name: 'Quadriceps', bounds: { x: 0.30, y: 0.62, width: 0.40, height: 0.20 }, muscles: ['quadriceps'] },
  { id: 'hamstrings', name: 'Hamstrings', bounds: { x: 0.30, y: 0.82, width: 0.40, height: 0.15 }, muscles: ['hamstrings'] },
  { id: 'calves', name: 'Calves', bounds: { x: 0.35, y: 0.97, width: 0.30, height: 0.10 }, muscles: ['gastrocnemius'] },
];
```

---

### 3. Vision Analysis Service (apps/api/src/services/vision-analysis.ts)

**New service file:**

```typescript
import { Anthropic } from '@anthropic-ai/sdk';
import { BodyZone, HeatmapRegion, VisionAnalysisResult } from '@aivo/shared-types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Claude Vision prompt for body composition analysis
const VISION_ANALYSIS_PROMPT = `
Analyze this body photo for fitness assessment. Identify the following body zones and estimate their development/fat level:

ZONES: chest, back_upper, shoulders, arms, abs_upper, abs_lower, obliques, lower_back, glutes, quads, hamstrings, calves

For each zone, provide:
1. intensity: 0-100 (0 = very lean/muscular, 100 = high body fat)
2. confidence: 0-1 (your certainty)

Also detect the pose: "front", "back", "side", or "unknown".

Calculate overall scores (0-100, lower is better):
- upperBodyScore: average of chest, back_upper, shoulders, arms
- coreScore: average of abs_upper, abs_lower, obliques, lower_back
- lowerBodyScore: average of glutes, quads, hamstrings, calves
- overallScore: weighted average

Respond ONLY with valid JSON:
{
  "pose": "front|back|side|unknown",
  "regions": [
    {
      "zoneId": "chest|back_upper|...",
      "intensity": 0-100,
      "confidence": 0-1
    }
  ],
  "metrics": {
    "upperBodyScore": 0-100,
    "coreScore": 0-100,
    "lowerBodyScore": 0-100,
    "overallScore": 0-100
  }
}
`;

export class VisionAnalysisService {
  async analyzeBodyPhoto(imageUrl: string): Promise<VisionAnalysisResult> {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: imageUrl,
                },
              },
              {
                type: 'text',
                text: VISION_ANALYSIS_PROMPT,
              },
            ],
          },
        ],
      });

      const content = response.content[0]?.text;
      if (!content) {
        throw new Error('No response from vision analysis');
      }

      const result = JSON.parse(content) as VisionAnalysisResult;
      return result;
    } catch (error) {
      console.error('Vision analysis failed:', error);
      throw error;
    }
  }

  // Convert analysis results to heatmap regions with colors
  toHeatmapRegions(analysis: VisionAnalysisResult, zones: BodyZone[]): HeatmapRegion[] {
    return analysis.regions.map(region => {
      const zone = zones.find(z => z.id === region.zoneId);
      if (!zone) return null;

      // Color gradient: green (0) -> yellow (50) -> red (100)
      const color = this.intensityToColor(region.intensity);

      return {
        zoneId: region.zoneId,
        intensity: region.intensity,
        color,
        confidence: region.confidence,
      };
    }).filter((r): r is HeatmapRegion => r !== null);
  }

  private intensityToColor(intensity: number): string {
    // Convert 0-100 to color: green (#22c55e) -> yellow (#eab308) -> red (#ef4444)
    if (intensity <= 33) {
      return this.interpolateColor('#22c55e', '#eab308', intensity / 33);
    } else if (intensity <= 66) {
      return this.interpolateColor('#eab308', '#f97316', (intensity - 33) / 33);
    } else {
      return this.interpolateColor('#f97316', '#ef4444', (intensity - 66) / 34);
    }
  }

  private interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 0, g: 0, b: 0 };
  }
}
```

---

### 4. API Routes

**Option A: Extend existing ai.ts** (simpler, keeps AI logic together)
**Option B: Create new routes/body-photos.ts** (cleaner separation)

I recommend **Option B** for clarity:

**File: apps/api/src/routes/body-photos.ts**

```typescript
import { router } from '../lib/router';
import { authenticate } from '../middleware/auth';
import { r2 } from '../services/r2';
import { VisionAnalysisService } from '../services/vision-analysis';
import { db } from '../lib/db';
import { bodyPhotos, bodyHeatmaps } from '@aivo/db';
import { generateUuid } from 'crypto';

const visionService = new VisionAnalysisService();
const BODY_ZONES = require('@aivo/shared-types').BODY_ZONES;

// Upload body photo
router.post('/body-photos/upload', authenticate, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('photo') as File;

  if (!file) {
    return c.json({ error: 'No photo provided' }, 400);
  }

  const userId = c.get('user')?.id;
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Generate unique filename
  const ext = file.name.split('.').pop();
  const filename = `body-photos/${userId}/${generateUuid()}.${ext}`;

  // Upload to R2
  const bytes = await file.arrayBuffer();
  const r2Url = await r2.upload(filename, Buffer.from(bytes), {
    'Content-Type': `image/${ext}`,
  });

  // Create thumbnail (use existing body-compute or sharp)
  // For now, use same URL as thumbnail

  // Store in database
  const [photo] = await db.insert(bodyPhotos).values({
    userId,
    r2Url,
    thumbnailUrl: r2Url,
    analysisStatus: 'pending',
    poseDetected: false,
    metadata: {
      size: bytes.byteLength,
      originalName: file.name,
    },
  }).returning();

  return c.json({ photo });
});

// Analyze a pending photo
router.post('/body-photos/:id/analyze', authenticate, async (c) => {
  const { id } = c.req.param('id');
  const userId = c.get('user')?.id;

  // Verify ownership and pending status
  const photo = await db.query.bodyPhotos.findFirst({
    where: eq(bodyPhotos.id, id),
    where: and(eq(bodyPhotos.userId, userId), eq(bodyPhotos.analysisStatus, 'pending')),
  });

  if (!photo) {
    return c.json({ error: 'Photo not found or already analyzed' }, 404);
  }

  try {
    // Update status to processing
    await db.update(bodyPhotos)
      .set({ analysisStatus: 'processing' as const })
      .where(eq(bodyPhotos.id, id));

    // Run vision analysis
    const analysis = await visionService.analyzeBodyPhoto(photo.r2Url);
    const heatmapRegions = visionService.toHeatmapRegions(analysis, BODY_ZONES);

    // Store heatmap results
    const [heatmap] = await db.insert(bodyHeatmaps).values({
      userId,
      photoId: id,
      regions: heatmapRegions,
      metrics: analysis.metrics,
    }).returning();

    // Update photo as completed with pose detection
    await db.update(bodyPhotos)
      .set({
        analysisStatus: 'completed' as const,
        poseDetected: analysis.pose !== 'unknown',
      })
      .where(eq(bodyPhotos.id, id));

    return c.json({ heatmap, analysis });
  } catch (error) {
    // Mark as failed
    await db.update(bodyPhotos)
      .set({ analysisStatus: 'failed' as const })
      .where(eq(bodyPhotos.id, id));

    return c.json({ error: 'Analysis failed', details: error.message }, 500);
  }
});

// Get current heatmap (latest analysis)
router.get('/body-heatmap/current', authenticate, async (c) => {
  const userId = c.get('user')?.id;

  const result = await db
    .select()
    .from(bodyHeatmaps)
    .innerJoin(bodyPhotos, eq(bodyPhotos.id, bodyHeatmaps.photoId))
    .where(eq(bodyHeatmaps.userId, userId))
    .orderBy(desc(bodyHeatmaps.createdAt))
    .limit(1)
    .first();

  if (!result) {
    return c.json({ heatmap: null, photo: null });
  }

  return c.json({
    heatmap: result.bodyHeatmaps,
    photo: {
      id: result.bodyPhotos.id,
      r2Url: result.bodyPhotos.r2Url,
      uploadDate: result.bodyPhotos.uploadDate,
    },
  });
});

// Get heatmap history
router.get('/body-heatmap/history', authenticate, async (c) => {
  const userId = c.get('user')?.id;
  const limit = Math.min(Number(c.req.query('limit') || '10'), 50);

  const results = await db
    .select()
    .from(bodyHeatmaps)
    .innerJoin(bodyPhotos, eq(bodyPhotos.id, bodyHeatmaps.photoId))
    .where(eq(bodyHeatmaps.userId, userId))
    .orderBy(desc(bodyHeatmaps.createdAt))
    .limit(limit);

  return c.json({
    history: results.map(r => ({
      heatmap: r.bodyHeatmaps,
      photo: {
        id: r.bodyPhotos.id,
        r2Url: r.bodyPhotos.r2Url,
        uploadDate: r.bodyPhotos.uploadDate,
      },
    })),
  });
});

// Compare two heatmaps (progress view)
router.get('/body-heatmap/compare/:heatmapId1/:heatmapId2?', authenticate, async (c) => {
  const { heatmapId1, heatmapId2 } = c.req.param();
  const userId = c.get('user')?.id;

  const [heatmap1, heatmap2] = await Promise.all([
    db.query.bodyHeatmaps.findFirst({
      where: and(eq(bodyHeatmaps.id, heatmapId1), eq(bodyHeatmaps.userId, userId)),
    }),
    heatmapId2
      ? db.query.bodyHeatmaps.findFirst({
          where: and(eq(bodyHeatmaps.id, heatmapId2), eq(bodyHeatmaps.userId, userId)),
        })
      : null,
  ]);

  if (!heatmap1) {
    return c.json({ error: 'Primary heatmap not found' }, 404);
  }

  // Calculate differences between heatmaps
  const comparison = heatmap2
    ? this.compareHeatmaps(heatmap1.regions, heatmap2.regions)
    : null;

  return c.json({
    current: heatmap1,
    previous: heatmap2,
    comparison,
  });
});

private compareHeatmaps(current: any[], previous: any[]) {
  const diff: Record<string, { current: number; previous: number; change: number }> = {};

  current.forEach(region => {
    const prev = previous.find(p => p.zoneId === region.zoneId);
    diff[region.zoneId] = {
      current: region.intensity,
      previous: prev?.intensity ?? region.intensity,
      change: prev ? region.intensity - prev.intensity : 0,
    };
  });

  return diff;
}
```

---

### 5. Update BodyHeatmap Components

The existing components already have the structure. Update them to:

**Key Changes:**
- Accept `heatmapData` prop (from API) instead of generating random zones
- Use the `BODY_ZONES` constant for consistent zone definitions
- Calculate colors based on `intensity` from the API
- Support comparison mode (show positive/negative changes)
- Add loading states for async data fetching

**Web: apps/web/src/components/body/BodyHeatmap.tsx**

```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { BODY_ZONES, HeatmapRegion, BodyZone } from '@aivo/shared-types';

interface BodyHeatmapProps {
  userId?: string;
  showComparison?: boolean; // Show change from previous
  comparisonMode?: 'improvement' | 'regression'; // Filter view
}

export function BodyHeatmap({ userId, showComparison = false }: BodyHeatmapProps) {
  const [regions, setRegions] = useState<HeatmapRegion[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHeatmap();
  }, [userId]);

  async function loadHeatmap() {
    setLoading(true);
    try {
      const data = await apiClient.bodyHeatmap.getCurrent();
      if (data.heatmap) {
        setRegions(data.heatmap.regions);
        setPhotoUrl(data.photo?.r2Url || '');
      }
    } finally {
      setLoading(false);
    }
  }

  // Render SVG with overlay rectangles for each zone
  const svgWidth = 300;
  const svgHeight = 500;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="body-svg">
        {/* Body silhouette outline - existing */}
        <BodyOutline />

        {/* Heatmap overlay zones */}
        {regions.map(region => {
          const zone = BODY_ZONES.find(z => z.id === region.zoneId);
          if (!zone) return null;

          const x = zone.bounds.x * svgWidth;
          const y = zone.bounds.y * svgHeight;
          const width = zone.bounds.width * svgWidth;
          const height = zone.bounds.height * svgHeight;

          return (
            <g key={region.zoneId}>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={region.color}
                fillOpacity={0.6}
                className="transition-all duration-500"
              >
                <title>{zone.name}: {Math.round(region.intensity)}%</title>
              </rect>
            </g>
          );
        })}
      </svg>

      {/* Color legend */}
      <div className="flex justify-between mt-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-green-500 rounded" /> Lean
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-yellow-500 rounded" /> Moderate
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-500 rounded" /> Higher Fat
        </span>
      </div>
    </div>
  );
}
```

**Mobile (NativeWind): Similar structure using react-native-svg**

---

### 6. API Client Updates (packages/api-client/src/index.ts)

Add methods:

```typescript
interface ApiClient {
  // Body photos
  uploadBodyPhoto(file: File): Promise<{ photo: BodyPhotoRecord }>;
  analyzeBodyPhoto(photoId: string): Promise<{ heatmap: any; analysis: any }>;

  // Heatmap
  getCurrentHeatmap(): Promise<{ heatmap: HeatmapData | null; photo: PhotoRef | null }>;
  getHeatmapHistory(limit?: number): Promise<{ history: HeatmapSnapshot[] }>;
  compareHeatmaps(id1: string, id2?: string): Promise<ComparisonResult>;
}
```

---

### 7. Progress Tracking & Comparison

The system inherently supports progress tracking:
- Each analysis is stored with timestamp
- Compare current vs previous heatmap
- Display change indicators:
  - Green arrow ↓ for improvement (intensity decreased)
  - Red arrow ↑ for regression (intensity increased)
  - Gray dash → for stable

**Add to HeatmapRegion for comparison:**
```typescript
interface HeatmapRegionWithChange extends HeatmapRegion {
  change?: number; // Positive = improvement (fat loss), Negative = regression
  trend: 'improved' | 'regressed' | 'stable';
}
```

---

### 8. Error Handling & Edge Cases

**Vision analysis failures:**
- Queue for retry (max 3 attempts)
- Fallback: Use manual body measurement data
- User notification: "Analysis pending - check back later"

**Pose detection:**
- Require front-facing photos first
- Validate image quality before sending to Claude
- Show guidance: "Ensure full body is visible, good lighting"

**Rate limiting:**
- Max 1 analysis per 24 hours per user
- Queue batch processing if needed

---

## Implementation Order (Phased)

### Phase 1: Database & Schema
1. Update `packages/db/src/schema.ts` with new tables
2. Generate and apply migration
3. Update `packages/db/src/index.ts` exports

### Phase 2: Shared Types
1. Add `BODY_ZONES` constant with 12-zone definitions
2. Define `VisionAnalysisResult`, `HeatmapRegion` interfaces
3. Export from `@aivo/shared-types`

### Phase 3: Backend Services
1. Create `apps/api/src/services/vision-analysis.ts`
2. Extend `apps/api/src/services/r2.ts` with body-photo helpers
3. Add Anthropic API key to `wrangler.toml` environment

### Phase 4: API Routes
1. Create `apps/api/src/routes/body-photos.ts`
2. Register routes in `apps/api/src/index.ts`
3. Add authentication middleware checks

### Phase 5: API Client
1. Update `packages/api-client/src/index.ts` with new methods
2. Generate types

### Phase 6: Frontend - Web
1. Update `apps/web/src/components/body/BodyHeatmap.tsx`
2. Fetch real data from API
3. Add loading/error states
4. Add comparison view toggle

### Phase 7: Frontend - Mobile
1. Update `apps/mobile/app/components/body/BodyHeatmap.tsx`
2. Add photo upload screen
3. Sync with API

### Phase 8: Testing
1. Unit tests for vision analysis service (mock Claude API)
2. Integration tests for upload → analyze → retrieve flow
3. E2E tests for heatmap rendering
4. Load testing for concurrent uploads

### Phase 9: Polish
1. SVG template refinements (better body outline)
2. Smooth animations for color transitions
3. Export heatmap as image
4. Share progress on social media

---

## Verification

**Manual Testing:**
1. Upload a body photo via API or UI
2. Check R2 for stored image
3. Verify database entry with `pending` status
4. Trigger analysis (auto or manual)
5. Verify Claude vision receives image
6. Confirm `bodyHeatmaps` entry created with regions
7. Load heatmap in web/mobile UI
8. Verify colors correspond to intensity values
9. Upload second photo, compare heatmaps

**API Testing:**
```bash
# Upload
curl -X POST http://localhost:8787/api/body-photos/upload \
  -H "Authorization: Bearer <token>" \
  -F "photo=@/path/to/body.jpg"

# Analyze
curl -X POST http://localhost:8787/api/body-photos/{id}/analyze \
  -H "Authorization: Bearer <token>"

# Get current
curl http://localhost:8787/api/body-heatmap/current \
  -H "Authorization: Bearer <token>"
```

**Database Verification:**
```sql
SELECT * FROM body_photos WHERE user_id = ? ORDER BY upload_date DESC;
SELECT * FROM body_heatmaps WHERE user_id = ? ORDER BY created_at DESC;
```

---

## Token Efficiency Considerations

**Claude Vision Prompt Optimization:**
- Keep prompt concise but precise (under 1000 tokens)
- Request JSON-only response to avoid verbose explanations
- Use zone IDs instead of full names in prompt structure
- Cache analysis results - don't re-analyze same photo

**SVG Rendering:**
- Use normalized coordinates (0-1) to avoid large numbers
- Pre-define BODY_ZONES in shared types, reference by ID
- Cache rendered SVG if no data changes

**Database:**
- Store regions as compact JSON with minimal nesting
- Index on `userId` + `createdAt` for fast history queries
- Consider TTL for old heatmap photos if storage becomes concern

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude Vision cost too high | Implement rate limiting, batch processing, cache results |
| Inaccurate body composition from photos | Set realistic expectations, allow manual adjustment, combine with body measurements |
| R2 storage costs | Implement photo cleanup policy (keep only latest N photos) |
| Slow analysis times | Queue processing, show "pending" status, webhook notification |
| Privacy concerns | Encrypt photos at rest, automatic deletion after 90 days, clear user consent |

---

## Success Metrics

- Users upload ≥1 body photo: 30% of active users
- Heatmap viewed within 7 days of upload: 60%+ completion rate
- Average time between photo uploads: 21 days (monthly progress tracking)
- Heatmap comparison feature used: 40% of heatmap viewers
- User satisfaction (NPS): +5 on body visualization feature

---

## Critical Files Reference

**Backend:**
- `packages/db/src/schema.ts` - New tables
- `apps/api/src/services/vision-analysis.ts` - New service
- `apps/api/src/routes/body-photos.ts` - New routes
- `apps/api/wrangler.toml` - Add `ANTHROPIC_API_KEY`

**Shared:**
- `packages/shared-types/src/index.ts` - Types & BODY_ZONES

**Frontend:**
- `apps/web/src/components/body/BodyHeatmap.tsx` - Web component
- `apps/mobile/app/components/body/BodyHeatmap.tsx` - Mobile component

**API Client:**
- `packages/api-client/src/index.ts` - TypeScript client
