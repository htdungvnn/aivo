# AI Gamified Social Proof Infographic Generator - Implementation Plan

## Context

The AIVO platform needs an AI-powered feature to automatically transform user fitness data into compelling, shareable social proof images. The goal is to increase user engagement and organic growth through viral content.

**Problem:** Users want to share their fitness achievements but lack the time/creativity to make attractive graphics.

**Solution:** AI generates personalized "hype narratives" based on weekly wins, and Rust/WASM renders these into high-quality PNG images at the edge, optimized for Instagram/TikTok sharing.

**User Story:** As a user, I want to generate a beautiful infographic about my week's fitness accomplishments (e.g., "You lifted the equivalent of a baby elephant!") with a single tap, so I can share it on social media to celebrate and inspire others.

---

## Existing Assets to Leverage

### 1. Database Schema
- `socialProofCards` table already exists (schema.ts lines 355-365)
  - Fields: `id`, `userId`, `type`, `title`, `subtitle`, `data`, `shareableImageUrl`, `createdAt`, `isPublic`
  - Ready to store generated infographics

### 2. Shared Types
- `SocialProofCard` interface exists in shared-types
- Heatmap utilities: `BODY_OUTLINE_FRONT/BACK`, `MUSCLE_POSITIONS`, `getHeatmapColor()`
- Muscle group definitions

### 3. R2 Storage
- Existing `R2_BUCKET` binding configured in wrangler.toml
- `apps/api/src/services/r2.ts` provides `uploadImage()` function
- Public CDN URLs: `https://bucket.r2.dev/{key}`

### 4. AI Integration
- OpenAI integration via `apps/api/src/services/ai.ts`
- Token optimization WASM (`@aivo/optimizer`) available for context management
- AI chat pattern: system prompt + user message → structured JSON response

### 5. Rust WASM Infrastructure
- `packages/aivo-compute` - existing WASM package with fitness calculations
- Build system: `wasm-pack build --target bundler`
- TypeScript integration pattern established

---

## Proposed Implementation

### Phase 1: Shared Types Package (`packages/shared-types`)

**File: `/packages/shared-types/src/index.ts`** (extend existing)

Add new types for infographic generation:

```typescript
// Infographic template types
export type InfographicTemplate = 
  | "weekly_summary" 
  | "milestone" 
  | "streak" 
  | "muscle_heatmap"
  | "comparison";

export interface InfographicConfig {
  template: InfographicTemplate;
  theme: "dark" | "light" | "neon" | "ocean" | "sunset" | "vibrant";
  layout: "portrait" | "landscape" | "square";
  colorScheme: ColorPalette;
  typography: TypographyConfig;
  includeStats: Statistic[];
  includeComparison: boolean;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textMuted: string;
}

export interface TypographyConfig {
  headlineFont: string;
  bodyFont: string;
  headlineSize: number;
  subheadSize: number;
  bodySize: number;
}

// AI-generated story for the infographic
export interface InfographicStory {
  headline: string;
  subheadline?: string;
  narrative: string;  // Main "hype" paragraph
  stats: Array<{
    label: string;
    value: string | number;
    unit?: string;
    comparison?: string;  // e.g., "Top 10% of users"
    icon?: string;
  }>;
  callToAction: string;
  funFacts: string[];
  tone: "motivational" | "celebratory" | "educational" | "competitive";
  readingLevel: "easy" | "medium" | "challenging";
}

// Complete infographic data structure
export interface InfographicData {
  id: string;
  userId: string;
  template: InfographicTemplate;
  config: InfographicConfig;
  story: InfographicStory;
  stats: UserStats;  // Computed from user data
  createdAt: Date;
  shareableImageUrl?: string;  // R2 URL after rendering
  svgContent?: string;  // Raw SVG (for debugging)
  width: number;
  height: number;
}

// User statistics for infographic generation
export interface UserStats {
  period: {
    startDate: string;  // ISO
    endDate: string;    // ISO
    type: "weekly" | "monthly" | "all_time";
  };
  workouts: {
    count: number;
    totalMinutes: number;
    totalCalories: number;
    avgDuration: number;
    types: Record<WorkoutType, number>;
    personalRecords: PersonalRecord[];
  };
  strength: {
    totalVolume: number;
    topExercises: Array<{ name: string; volume: number }>;
    estimatedOneRMs: Record<string, number>;
  };
  gamification: {
    streak: number;
    longestStreak: number;
    points: number;
    level: number;
    badges: number;
    leaderboardRank?: number;
    percentile?: number;
  };
  body: {
    weightChange?: number;
    bodyFatChange?: number;
    muscleGain?: number;
    bmi?: number;
    healthScore?: number;
    muscleDevelopment?: Array<{ group: MuscleGroup; score: number }>;
  };
  comparisons: {
    vsAverage: Record<string, number>;  // How user compares to average
    personalBests: Array<{ metric: string; improvement: number }>;
  };
}

// SVG Template Element
export interface SvgTemplateElement {
  type: "text" | "rect" | "circle" | "image" | "path" | "group";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  content?: string;
  attributes?: Record<string, string | number>;
  children?: SvgTemplateElement[];
}

// Render result
export interface InfographicRenderResult {
  svg: string;
  pngBuffer?: Uint8Array;  // Only if PNG export requested
  pngUrl?: string;         // R2 URL if uploaded
  renderTimeMs: number;
  width: number;
  height: number;
}
```

---

### Phase 2: New Rust WASM Package `infographic-generator`

**Create: `/packages/infographic-generator/`**

**Cargo.toml:**
```toml
[package]
name = "infographic-generator"
version = "0.1.0"
edition = "2021"
description = "SVG/PNG infographic generator for fitness social proof"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
svg = "0.14"           # SVG DOM manipulation
resvg = "0.41"        # SVG → PNG rendering
tiny-skia = "0.11"     # Skia-based PNG export
usvg = "0.41"         # SVG parser
chrono = { version = "0.4", features = ["serde"] }

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
panic = "abort"
```

**Core functionality (src/lib.rs):**

1. **Template Engine:**
```rust
#[derive(Serialize, Deserialize)]
pub struct InfographicTemplate {
    pub width: u32,
    pub height: u32,
    pub background: Color,
    pub elements: Vec<TemplateElement>,
}

#[derive(Serialize, Deserialize)]
pub enum TemplateElement {
    Text { x: f64, y: f64, content: String, style: TextStyle },
    Rectangle { x: f64, y: f64, width: f64, height: f64, fill: Color },
    Circle { cx: f64, cy: f64, r: f64, fill: Color },
    Image { x: f64, y: f64, width: f64, height: f64, src: String },
    Group { children: Vec<TemplateElement>, transform: Transform },
}

// Render SVG from template + data
#[wasm_bindgen]
pub fn render_infographic_svg(
    template_json: &str,
    data_json: &str
) -> Result<String, JsError> {
    let template: InfographicTemplate = serde_json::from_str(template_json)?;
    let data: InfographicData = serde_json::from_str(data_json)?;
    
    let svg = build_svg(template, data)?;
    Ok(svg.to_string())
}

// Render PNG (base64) from SVG
#[wasm_bindgen]
pub fn render_infographic_png(
    svg_string: &str,
    scale: f64
) -> Result<Vec<u8>, JsError> {
    let png_bytes = render_png(svg_string, scale)?;
    Ok(png_bytes)
}
```

2. **Built-in Templates:**
- `weekly_summary`: Multi-section with header, key stats, highlights
- `milestone`: Achievement celebration with large numbers
- `streak`: Fire emoji, current streak, longest streak
- `muscle_heatmap`: Body outline with colored muscle zones
- `comparison`: Before/after or personal best comparison

3. **Color Scheme Generator:**
```rust
pub fn generate_color_scheme(
    user_level: i32,
    vibe: &str,  // "motivational", "calm", "energetic", etc.
    accent_preference: Option<&str>
) -> ColorPalette;
```

---

### Phase 3: AI Narrative Generation Service

**File: `apps/api/src/services/infographic-ai.ts`**

**Function: `generateInfographicStory(userId, config)`**

```typescript
interface AIGenerationRequest {
  userId: string;
  period: { start: string; end: string; type: "weekly" | "monthly" };
  userStats: UserStats;  // Aggregated from database
  template: InfographicTemplate;
  constraints: {
    maxHeadlineLength: number;
    readingLevel: "easy" | "medium";
    tone: string;
  };
}

async function generateInfographicStory(
  req: AIGenerationRequest
): Promise<InfographicStory> {
  // 1. Build context from user data
  const context = buildStoryContext(req.userStats, req.period);
  
  // 2. Create AI prompt
  const systemPrompt = `You are AIVO's viral content writer. Your job is to turn fitness data into exciting, shareable social media posts that make users feel proud and motivated.
  
  Guidelines:
  - Use emojis sparingly and appropriately (💪🔥🏆📈)
  - Highlight surprising/impressive numbers
  - Create relatable analogies ("equivalent to lifting X baby elephants!")
  - Use conversational, energetic tone
  - Keep headlines under 60 characters
  - Narrative paragraph: 2-3 sentences max
  - Tone: ${req.constraints.tone}
  - Reading level: ${req.constraints.readingLevel}
  
  Respond with JSON matching the InfographicStory schema.`;

  const userPrompt = `Create a social proof infographic for this user's ${req.period.type} fitness data:

${context}

Generate:
1. An exciting headline (under 60 chars) that makes them want to share
2. Optional catchy subheadline
3. A short 2-3 sentence "hype" paragraph celebrating their achievements
4. 3-5 key statistics with labels and units
5. A call-to-action for followers (e.g., "Join me on AIVO!")
6. 2-3 fun facts or comparisons
7. Overall tone`;

  // 3. Call OpenAI with JSON mode
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.8,  // Creative but controlled
    max_tokens: 500,
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content;
  const story: InfographicStory = JSON.parse(content);
  
  return story;
}
```

---

### Phase 4: API Endpoints

**File: `apps/api/src/routes/infographic.ts`**

**POST `/api/infographic/generate`**

```typescript
import { inferInfographicType } from "../services/infographic-ai";
import { renderInfographic } from "../services/infographic-renderer";

export const infographicRouter: RouteModule = {
  routes: [
    {
      path: "/api/infographic/generate",
      method: Methods.POST,
      handler: async (c) => {
        // 1. Authenticate
        const userId = await getUserId(c);
        
        // 2. Parse request
        const req = await c.req.json();
        const { period, template, config } = req as {
          period: { type: "weekly" | "monthly"; start: string; end?: string };
          template?: string;
          config?: Partial<InfographicConfig>;
        };
        
        // 3. Aggregate user stats from database
        const userStats = await aggregateUserStats(userId, period);
        
        // 4. Generate AI narrative
        const story = await generateInfographicStory({
          userId,
          period,
          userStats,
          template: inferInfographicType(userStats),
          constraints: {
            maxHeadlineLength: 60,
            readingLevel: "easy",
            tone: "motivational"
          }
        });
        
        // 5. Render SVG using WASM
        const svg = await renderInfographic({
          template: config?.template || "weekly_summary",
          story,
          stats: userStats,
          config: mergeConfig(config)
        });
        
        // 6. Upload SVG to R2 (optional for debugging)
        const svgKey = generateR2Key(userId, `infographic-${Date.now()}.svg`);
        await R2_BUCKET.put(svgKey, svg, {
          httpMetadata: { contentType: "image/svg+xml" }
        });
        
        // 7. Render PNG
        const pngBuffer = await renderInfographicPNG(svg, { scale: 2.0 });
        
        // 8. Upload PNG to R2
        const pngKey = generateR2Key(userId, `infographic-${Date.now()}.png`);
        await R2_BUCKET.put(pngKey, pngBuffer, {
          httpMetadata: { contentType: "image/png" }
        });
        
        // 9. Save record to database
        const cardId = crypto.randomUUID();
        await db.insert(socialProofCards).values({
          id: cardId,
          userId,
          type: "custom",
          title: story.headline,
          subtitle: story.subheadline || "",
          data: JSON.stringify({
            story,
            stats: userStats,
            template
          }),
          shareableImageUrl: `https://bucket.r2.dev/${pngKey}`,
          createdAt: Math.floor(Date.now() / 1000),
          isPublic: 0
        });
        
        // 10. Return result
        return c.json({
          success: true,
          data: {
            id: cardId,
            headline: story.headline,
            shareableImageUrl: `https://bucket.r2.dev/${pngKey}`,
            svgContent: svg  // Optional, for debugging
          }
        });
      }
    },
    
    {
      path: "/api/infographic/:id",
      method: Methods.GET,
      handler: async (c) => {
        const id = c.req.param("id");
        const card = await db.query.socialProofCards.findFirst({
          where: eq(socialProofCards.id, id)
        });
        
        if (!card) {
          return c.json(createErrorResponse("Infographic not found"), 404);
        }
        
        // Check user owns this card (or is public)
        const userId = await getUserId(c);
        if (card.userId !== userId && !card.isPublic) {
          return c.json(createErrorResponse("Not authorized"), 403);
        }
        
        return c.json(createApiResponse({
          id: card.id,
          title: card.title,
          subtitle: card.subtitle,
          shareableImageUrl: card.shareableImageUrl,
          data: JSON.parse(card.data || "{}"),
          createdAt: new Date(card.createdAt * 1000)
        }));
      }
    },
    
    {
      path: "/api/infographic/:id",
      method: Methods.DELETE,
      handler: async (c) => {
        const id = c.req.param("id");
        const userId = await getUserId(c);
        
        const card = await db.query.socialProofCards.findFirst({
          where: eq(socialProofCards.id, id)
        });
        
        if (!card || card.userId !== userId) {
          return c.json(createErrorResponse("Not found or unauthorized"), 404);
        }
        
        // Delete from R2 if URL exists
        if (card.shareableImageUrl) {
          const key = extractR2Key(card.shareableImageUrl);
          if (key) await R2_BUCKET.delete(key);
        }
        
        // Delete database record
        await db.delete(socialProofCards).where(eq(socialProofCards.id, id));
        
        return c.json(createApiResponse({ deleted: true }));
      }
    },
    
    {
      path: "/api/infographic/templates",
      method: Methods.GET,
      handler: async (c) => {
        // List available templates
        const templates = [
          { id: "weekly_summary", name: "Weekly Summary", description: "Your week in review" },
          { id: "milestone", name: "Milestone", description: "Celebrate a big achievement" },
          { id: "streak", name: "Streak", description: "Show off your consistency" },
          { id: "muscle_heatmap", name: "Muscle Heatmap", description: "Visualize your muscle development" },
          { id: "comparison", name: "Comparison", description: "Before/after or vs average" }
        ];
        
        return c.json(createApiResponse(templates));
      }
    }
  ]
};
```

---

### Phase 5: Infographic Renderer Service

**File: `apps/api/src/services/infographic-renderer.ts`**

```typescript
import init, { render_svg, render_png } from "@aivo/infographic-generator";

let wasmInitialized = false;
async function ensureWasm() {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
}

export async function renderInfographic(params: {
  template: string;
  story: InfographicStory;
  stats: UserStats;
  config: InfographicConfig;
}): Promise<string> {
  await ensureWasm();
  
  // 1. Select template
  const template = getTemplate(params.template, params.config);
  
  // 2. Build data JSON
  const data = {
    ...params.stats,
    config: params.config,
    template: params.template
  };
  
  // 3. Call WASM to render SVG
  const svgJson = render_svg(
    JSON.stringify(template),
    JSON.stringify(data)
  );
  
  const result = JSON.parse(svgJson);
  
  if (!result.success) {
    throw new Error(`SVG rendering failed: ${result.error}`);
  }
  
  return result.svg;
}

export async function renderInfographicPNG(
  svg: string,
  options: { scale?: number; quality?: number } = {}
): Promise<Uint8Array> {
  await ensureWasm();
  
  const scale = options.scale || 2.0;  // 2x for retina displays
  
  const pngBase64 = render_png(svg, scale);
  const pngBuffer = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));
  
  return pngBuffer;
}

// Built-in templates
function getTemplate(templateId: string, config: InfographicConfig): SvgTemplate {
  const templates: Record<string, SvgTemplate> = {
    weekly_summary: buildWeeklySummaryTemplate(config),
    milestone: buildMilestoneTemplate(config),
    streak: buildStreakTemplate(config),
    muscle_heatmap: buildMuscleHeatmapTemplate(config),
    comparison: buildComparisonTemplate(config)
  };
  
  return templates[templateId] || templates.weekly_summary;
}
```

---

### Phase 6: User Stats Aggregation

**File: `apps/api/src/services/user-stats.ts`**

```typescript
export async function aggregateUserStats(
  userId: string,
  period: { type: "weekly" | "monthly"; start: string; end?: string }
): Promise<UserStats> {
  const endDate = period.end || new Date().toISOString().split("T")[0];
  const startDate = period.start;
  
  // Query workouts in period
  const workouts = await db.query.workouts.findMany({
    where: and(
      eq(workouts.userId, userId),
      gte(workouts.startTime, new Date(startDate).getTime() / 1000),
      lte(workouts.endTime, new Date(endDate).getTime() / 1000),
      eq(workouts.status, "completed")
    )
  });
  
  // Calculate workout stats
  const workoutStats = calculateWorkoutStats(workouts);
  
  // Get gamification profile
  const profile = await db.query.gamificationProfiles.findFirst({
    where: eq(gamificationProfiles.userId, userId)
  });
  
  // Get recent body metrics for changes
  const [beforeMetrics, afterMetrics] = await Promise.all([
    db.query.bodyMetrics.findFirst({
      where: and(
        eq(bodyMetrics.userId, userId),
        lt(bodyMetrics.timestamp, new Date(startDate).getTime() / 1000)
      ),
      orderBy: desc(bodyMetrics.timestamp)
    }),
    db.query.bodyMetrics.findFirst({
      where: and(
        eq(bodyMetrics.userId, userId),
        gte(bodyMetrics.timestamp, new Date(startDate).getTime() / 1000)
      ),
      orderBy: desc(bodyMetrics.timestamp)
    })
  ]);
  
  // Build complete UserStats
  return {
    period: { startDate, endDate, type: period.type },
    workouts: workoutStats,
    strength: calculateStrengthStats(workouts),
    gamification: {
      streak: profile?.streakCurrent || 0,
      longestStreak: profile?.streakLongest || 0,
      points: profile?.totalPoints || 0,
      level: profile?.level || 1,
      badges: 0, // TODO: count badges
      leaderboardRank: profile?.leaderboardPosition
    },
    body: {
      weightChange: calculateChange(beforeMetrics?.weight, afterMetrics?.weight),
      bodyFatChange: calculateChange(beforeMetrics?.bodyFatPercentage, afterMetrics?.bodyFatPercentage),
      bmi: afterMetrics?.bmi
    },
    comparisons: {
      vsAverage: {}, // TODO: compare to platform averages
      personalBests: [] // TODO: calculate PR improvements
    }
  };
}
```

---

### Phase 7: Rust Package `infographic-generator` - Implementation Details

**Directory: `/packages/infographic-generator/`**

**Structure:**
```
src/
├── lib.rs          # Main WASM bindings
├── templates.rs    # SVG template definitions
├── renderer.rs     # SVG building logic
├── png.rs          # PNG export using resvg
├── colors.rs       # Color scheme generation
└── types.rs        # Shared data structures
```

**types.rs:**
```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct InfographicData {
    pub story: StoryData,
    pub stats: StatsData,
    pub config: ConfigData,
    pub template: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StoryData {
    pub headline: String,
    pub subheadline: Option<String>,
    pub narrative: String,
    pub stats: Vec<StatData>,
    pub call_to_action: String,
    pub fun_facts: Vec<String>,
    pub tone: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StatData {
    pub label: String,
    pub value: String,
    pub unit: Option<String>,
    pub comparison: Option<String>,
    pub icon: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StatsData {
    pub workouts: WorkoutStats,
    pub gamification: GamificationStats,
    pub body: BodyStats,
}

// ... more structs

#[derive(Serialize, Deserialize, Clone)]
pub struct ColorPalette {
    pub primary: String,
    pub secondary: String,
    pub accent: String,
    pub background: String,
    pub text: String,
    pub text_muted: String,
}
```

**templates.rs:**
- Define SVG templates as procedural generation
- Use `svg` crate to build DOM programmatically
- Support placeholders like `{{headline}}`, `{{value}}` that get replaced

**renderer.rs:**
```rust
pub fn render_svg(template: &str, data_json: &str) -> Result<String, RenderError> {
    let data: InfographicData = serde_json::from_str(data_json)?;
    let template = get_template(&data.template)?;
    
    let mut svg = svg::node::Node::new("svg");
    svg = template.apply(svg, data)?;
    
    Ok(svg.to_string())
}
```

**png.rs:**
```rust
pub fn render_png(svg_str: &str, scale: f64) -> Result<Vec<u8>, RenderError> {
    use resvg::usvg::{self, TreeParsing};
    use tiny_skia::{Pixmap, Transform};
    
    let opt = usvg::Options::default();
    let tree = usvg::Tree::from_str(svg_str, &opt)
        .map_err(|e| RenderError::from(e.to_string()))?;
    
    let mut pixmap = Pixmap::new(
        (tree.size().width() * scale) as u32,
        (tree.size().height() * scale) as u32
    ).ok_or_else(|| RenderError::InvalidSize)?;
    
    pixmap.fill(tiny_skia::Color::WHITE);
    
    resvg::render(&tree, Transform::from_scale(scale, scale), &mut pixmap.as_mut());
    
    let png_data = pixmap.encode_png()
        .map_err(|e| RenderError::from(e.to_string()))?;
    
    Ok(png_data)
}
```

**colors.rs:**
```rust
pub fn generate_palette(theme: &str, level: i32) -> ColorPalette {
    match theme {
        "neon" => ColorPalette {
            primary: "#00ff88".to_string(),
            secondary: "#ff00ff".to_string(),
            accent: "#00ffff".to_string(),
            background: "#0a0a1a".to_string(),
            text: "#ffffff".to_string(),
            text_muted: "#888888".to_string(),
        },
        "ocean" => { /* ... */ },
        "sunset" => { /* ... */ },
        _ => default_palette(),
    }
}
```

---

### Phase 8: Package.json and Build Configuration

**Create: `/packages/infographic-generator/package.json`**
```json
{
  "name": "@aivo/infographic-generator",
  "version": "0.1.0",
  "main": "pkg/infographic_generator.js",
  "types": "pkg/infographic_generator.d.ts",
  "scripts": {
    "build": "wasm-pack build --target bundler --out-dir pkg",
    "test": "wasm-pack test --chrome --headless"
  },
  "keywords": ["wasm", "svg", "infographic", "fitness"],
  "license": "MIT"
}
```

**Update: `/apps/api/package.json`** (add dependency)
```json
{
  "dependencies": {
    "@aivo/infographic-generator": "workspace:*"
  }
}
```

**Update: `/apps/api/tsconfig.json`** (add path mapping)
```json
{
  "compilerOptions": {
    "paths": {
      "@aivo/compute": ["../../packages/aivo-compute/pkg"],
      "@aivo/optimizer": ["../../packages/optimizer/pkg"],
      "@aivo/infographic-generator": ["../../packages/infographic-generator/pkg"]
    }
  }
}
```

---

### Phase 9: Testing Strategy

**Unit Tests (Rust):**
- `infographic-generator/tests/` - test template rendering
- Test all built-in templates with sample data
- Test PNG export quality

**Integration Tests (API):**
- `apps/api/src/routes/__tests__/infographic.test.ts`
  - POST `/api/infographic/generate` with mock data
  - Verify R2 upload
  - Verify database record creation
  - Mock OpenAI responses with `nock` or similar

**End-to-End Test:**
1. Create test user
2. Add sample workouts, body metrics, gamification data
3. Call generate endpoint
4. Verify:
   - Response contains `shareableImageUrl`
   - R2 object exists and is valid PNG
   - Database record saved correctly
   - SVG content includes expected elements

---

### Phase 10: Rollout Considerations

**1. Rate Limiting:**
- Infographic generation is resource-intensive (AI + WASM + R2)
- Implement rate limit: 5 generations per user per day
- Track in database or Redis/KV

**2. Cost Management:**
- AI call: ~$0.001-0.002 per generation (gpt-4o-mini)
- WASM CPU time: minimal
- R2 storage: $0.023/GB/month (images ~50-200KB each)
- Bandwidth: negligible (R2 egress $0.01-0.04/GB)

**3. Async Processing Option:**
For heavy load, consider queue-based approach:
1. API accepts request, returns job ID
2. Worker processes in background (BullMQ/Cloudflare Queues)
3. WebSocket or polling for completion

**4. Monitoring:**
- Track generation latency (AI + WASM)
- Track success/failure rates
- Monitor R2 storage growth
- Alert on OpenAI API errors

---

## Critical Files to Modify/Create

| Path | Action | Purpose |
|------|--------|---------|
| `/packages/shared-types/src/index.ts` | MODIFY | Add Infographic types |
| `/packages/infographic-generator/Cargo.toml` | CREATE | New Rust package |
| `/packages/infographic-generator/src/lib.rs` | CREATE | WASM bindings |
| `/packages/infographic-generator/package.json` | CREATE | Package metadata |
| `/apps/api/src/services/infographic-ai.ts` | CREATE | AI narrative service |
| `/apps/api/src/services/infographic-renderer.ts` | CREATE | WASM renderer service |
| `/apps/api/src/services/user-stats.ts` | CREATE | Stats aggregation |
| `/apps/api/src/routes/infographic.ts` | CREATE | API endpoints |
| `/apps/api/tsconfig.json` | MODIFY | Add path mapping |
| `/apps/api/package.json` | MODIFY | Add dependency |
| `/scripts/deploy.sh` | MODIFY | Build new package |

---

## Verification Steps

### 1. Build Verification
```bash
# Build all WASM packages
pnpm run build:wasm

# Build API
cd apps/api && pnpm run build

# No TypeScript errors
pnpm run type-check
```

### 2. Unit Tests
```bash
# Rust WASM tests
cd packages/infographic-generator && wasm-pack test --headless

# TypeScript tests
cd apps/api && pnpm run test
```

### 3. Integration Test
```bash
# Start local dev
pnpm run dev

# Generate infographic (with test auth)
curl -X POST http://localhost:8787/api/infographic/generate \
  -H "Authorization: Bearer TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period": {"type": "weekly", "start": "2025-04-15"}}'

# Expected: { success: true, data: { id, headline, shareableImageUrl } }

# Verify image loads
curl -I <shareableImageUrl>
# Expected: Content-Type: image/png
```

### 4. Database Verification
```sql
SELECT * FROM social_proof_cards 
WHERE user_id = 'test-user' 
ORDER BY created_at DESC 
LIMIT 1;
```

### 5. R2 Verification
```bash
# List user's infographic images
wrangler r2 object list aivo-images --prefix "infographics/test-user/"
```

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI latency | Slow API responses | Set timeout (10s), fallback message |
| AI generates inappropriate content | Brand damage | Content moderation, prompt engineering, manual review option |
| WASM memory leaks | Worker OOM | Proper cleanup, limit concurrent renders |
| R2 storage costs | Unexpected expense | Set retention policy, auto-delete old images |
| User data privacy | GDPR/CCPA issues | Infographics only accessible to owner unless shared |
| Template rigidity | Poor UX | Multiple templates, AI adapts content to template |

---

## Success Criteria

1. **Functional:** User can generate infographic with 1 API call
2. **Quality:** PNG image is 1080x1080 (Instagram square), high DPI
3. **Performance:** < 5s end-to-end (including AI call)
4. **Cost:** < $0.01 per generation
5. **Engagement:** Track share button clicks and image downloads
6. **Storage:** PNG files < 200KB each (compressed)

---

## Next Steps After Implementation

1. Add frontend UI in `/apps/web/src/components/InfographicGenerator.tsx`
2. Add mobile version in `/apps/mobile/app/components/InfographicGenerator.tsx`
3. Implement share tracking (Facebook, Instagram, Twitter share counts)
4. Add user customization: choose template, colors, stats to highlight
5. Implement scheduled weekly generation (push notification when ready)
6. Add A/B testing for different AI prompts and templates
7. Add analytics to measure viral coefficient (shares per user)

---

This plan integrates seamlessly with the existing AIVO architecture using the same patterns as the body heatmaps and share cards already in the codebase. The use of WASM for rendering ensures consistent results across web, mobile (via API), and edge environments.