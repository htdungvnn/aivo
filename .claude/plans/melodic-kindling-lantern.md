# AI Nutritional "Shadow" - Implementation Plan

## Context

AIVO needs a vision-based food logging feature where users can snap a photo of their meal and get automatic macro estimation (protein/carbs/fat) and calorie counting. This "shadow" feature reduces friction in food tracking - the core pain point of manual logging.

The implementation follows existing patterns in the codebase:
- **Body Insights** (`/body/upload`, `/body/vision/analyze`) - similar image upload + AI vision flow
- **R2 Storage** - existing image hosting infrastructure
- **OpenAI GPT-4o** - vision capabilities for food identification
- **Drizzle ORM** - for storing food logs and nutritional database
- **Rust WASM** - for image preprocessing (resize/compress)

## Architecture Overview

```
User Photo → R2 Storage → AI Vision Analysis → Nutritional Database Lookup → Food Log Entry
     ↓              ↓                 ↓                          ↓
   Frontend    Cloudflare         OpenAI GPT-4o              D1 Database
              R2 Bucket
```

## Database Schema Changes

**File**: `packages/db/src/schema.ts`

Add new tables:

1. **`food_items`** - Nutritional database (seeded with common foods)
   - `id` (text, PK)
   - `name` (text, indexed)
   - `brand` (text, optional)
   - `serving_size` (real) - grams per serving
   - `serving_unit` (text) - "g", "oz", "cup", etc.
   - `calories` (real)
   - `protein_g` (real)
   - `carbs_g` (real)
   - `fat_g` (real)
   - `fiber_g` (real, optional)
   - `sugar_g` (real, optional)
   - `sodium_mg` (real, optional)
   - `is_verified` (integer) - 0=user submitted, 1=verified
   - `created_at` (integer)
   - Unique constraint on (name, brand)

2. **`food_logs`** - User's food entries
   - `id` (text, PK)
   - `user_id` (text, FK to users)
   - `meal_type` (text) - "breakfast", "lunch", "dinner", "snack"
   - `food_item_id` (text, FK to food_items, nullable)
   - `custom_name` (text) - for AI-identified or manual entries
   - `image_url` (text) - R2 URL of the photo (if from vision)
   - `estimated_portion_g` (real) - AI estimated weight in grams
   - `confidence` (real) - 0-1 confidence score
   - `calories` (real)
   - `protein_g` (real)
   - `carbs_g` (real)
   - `fat_g` (real)
   - `logged_at` (integer)
   - `created_at` (integer)
   - Index on (user_id, logged_at)
   - Index on (user_id, meal_type)

3. **`portion_visualizations`** - Reference images for portion training (optional, phase 2)
   - `id` (text, PK)
   - `food_item_id` (text, FK)
   - `image_url` (text, R2)
   - `portion_size_g` (real)
   - `visual_reference` (text) - description of visual cues

4. **`daily_nutrition_summaries`** - Materialized daily aggregates (cached)
   - `user_id` (text, FK, part of PK)
   - `date` (text, ISO date, part of PK)
   - `total_calories` (real)
   - `total_protein_g` (real)
   - `total_carbs_g` (real)
   - `total_fat_g` (real)
   - `food_log_count` (integer)
   - `updated_at` (integer)
   - Primary key: (user_id, date)

## API Endpoints

**File**: `apps/api/src/routes/nutrition.ts` (new file)

### 1. `POST /api/nutrition/upload`

Upload food image to R2.

**Request**: multipart/form-data with `image` file
**Response**:
```json
{
  "success": true,
  "data": {
    "imageUrl": "https://...",
    "key": "nutrition/...",
    "uploadedAt": "2025-04-22T..."
  }
}
```

**Validation**: Max 5MB, JPEG/PNG/WebP

### 2. `POST /api/nutrition/vision/analyze`

AI analysis of food image to identify items and estimate macros.

**Request**:
```json
{
  "imageUrl": "https://...",
  "mealType": "lunch" // optional: breakfast/lunch/dinner/snack
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "analysis-uuid",
    "userId": "...",
    "imageUrl": "...",
    "detectedItems": [
      {
        "name": "grilled chicken breast",
        "confidence": 0.92,
        "estimatedPortionG": 180,
        "portionUnit": "g",
        "calories": 280,
        "protein_g": 52,
        "carbs_g": 0,
        "fat_g": 6,
        "matchedFoodItemId": "optional-if-found-in-db"
      }
    ],
    "totalCalories": 580,
    "totalProtein": 65,
    "totalCarbs": 45,
    "totalFat": 22,
    "analysisConfidence": 0.88,
    "analysisNotes": "Well-lit image, clear portion estimation"
  }
}
```

**AI Prompt Strategy**:
```
System: You are a nutrition expert AI. Analyze food images and estimate macros.
User: [image]

Return JSON:
{
  "detectedItems": [
    {
      "name": "common food name",
      "confidence": 0.0-1.0,
      "estimatedPortionG": number,
      "portionUnit": "g"|"oz"|"cup"|"tbsp"|"tsp"|"piece",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number,
      "sugar_g": number
    }
  ],
  "portionEstimationMethod": "volume_analysis|comparison|density_calc",
  "analysisConfidence": 0.0-1.0,
  "analysisNotes": "string"
}
```

### 3. `POST /api/nutrition/logs/from-analysis`

Create food log entries from AI analysis results.

**Request**:
```json
{
  "analysisId": "string (optional, for audit trail)",
  "detectedItems": [...], // from vision analyze response
  "mealType": "lunch",
  "timestamp": 1713800000000 // optional, defaults to now
}
```

**Response**: Created food log entries with IDs

### 4. `POST /api/nutrition/logs`

Manual food log entry (for corrections/additions without photo).

**Request**:
```json
{
  "mealType": "lunch",
  "foodItemId": "optional-food-db-id",
  "customName": "Homemade pasta",
  "portionType": "serving"|"grams"|"unit",
  "portionValue": 1.5, // e.g., 1.5 servings or 200 grams
  "calories": 350,
  "protein_g": 15,
  "carbs_g": 45,
  "fat_g": 12,
  "loggedAt": 1713800000000 // optional
}
```

**Response**: Created food log entry

### 5. `GET /api/nutrition/logs`

Get user's food logs with optional filtering.

**Query Params**:
- `startDate` (timestamp)
- `endDate` (timestamp)
- `mealType` (optional filter)
- `limit` (default 100)

**Response**: Paginated food logs with daily summaries

### 6. `GET /api/nutrition/summary`

Get daily nutrition summary.

**Query Params**:
- `date` (ISO date, default today)

**Response**:
```json
{
  "date": "2025-04-22",
  "totalCalories": 1850,
  "targetCalories": 2200,
  "totalProtein": 120,
  "targetProtein": 150,
  "totalCarbs": 200,
  "targetCarbs": 250,
  "totalFat": 65,
  "targetFat": 73,
  "foodLogCount": 5,
  "meals": {
    "breakfast": {...},
    "lunch": {...},
    "dinner": {...},
    "snack": {...}
  }
}
```

### 7. `GET /api/nutrition/database/search`

Search nutritional database.

**Query Params**:
- `q` (search query)
- `limit` (default 20)

**Response**: Array of matching food items

## Shared Types

**File**: `packages/shared-types/src/index.ts`

Add to SECTION 4 (or create new SECTION for Nutrition):

```typescript
// SECTION 4: NUTRITION & FOOD LOGGING

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: number; // grams
  servingUnit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  isVerified: boolean;
  createdAt: Date;
}

export interface DetectedFoodItem {
  name: string;
  confidence: number;
  estimatedPortionG: number;
  portionUnit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  matchedFoodItemId?: string;
}

export interface VisionAnalysisResult {
  id: string;
  userId: string;
  imageUrl: string;
  detectedItems: DetectedFoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  analysisConfidence: number;
  analysisNotes?: string;
  createdAt: number;
}

export interface FoodLog {
  id: string;
  userId: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  foodItemId?: string;
  customName?: string;
  imageUrl?: string;
  estimatedPortionG?: number;
  confidence?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  loggedAt: number;
  createdAt: number;
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  targetCalories: number;
  totalProtein: number;
  targetProtein: number;
  totalCarbs: number;
  targetCarbs: number;
  totalFat: number;
  targetFat: number;
  foodLogCount: number;
  meals: {
    breakfast?: MealSummary;
    lunch?: MealSummary;
    dinner?: MealSummary;
    snack?: MealSummary;
  };
}

export interface MealSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  itemCount: number;
}
```

## Rust WASM Image Preprocessing

**File**: `packages/aivo-compute/src/lib.rs`

Add new module `image_processor`:

```rust
/// Image preprocessing module for nutrition vision analysis
#[wasm_bindgen]
pub struct ImageProcessor;

#[wasm_bindgen]
impl ImageProcessor {
  /// Resize image to target dimensions while maintaining aspect ratio
  /// Returns base64 encoded JPEG
  #[wasm_bindgen(js_name = "resizeImage")]
  pub fn resize_image(
    image_data: &[u8],
    max_width: u32,
    max_height: u32,
    quality: f64
  ) -> Result<String, JsValue> {
    // Use image crate to decode, resize, re-encode
    // Return base64 string for transmission
  }

  /// Compress image to reduce file size
  /// Returns compressed bytes
  #[wasm_bindgen(js_name = "compressImage")]
  pub fn compress_image(
    image_data: &[u8],
    quality: f64,
    max_size_kb: u32
  ) -> Result<Vec<u8>, JsValue> {
    // Progressive compression until target size reached
  }

  /// Validate image is suitable for food analysis
  #[wasm_bindgen(js_name = "validateFoodImage")]
  pub fn validate_food_image(image_data: &[u8]) -> Result<(), JsValue> {
    // Check: not too dark, sufficient resolution, etc.
  }
}
```

**Cargo.toml dependencies**:
```toml
[dependencies]
image = "0.24"
base64 = "0.21"
wasm-bindgen = "0.2"
```

## Frontend Implementation

### New Page: Food Logging

**File**: `apps/web/src/app/dashboard/nutrition/page.tsx`

Features:
- Photo upload with preview
- AI analysis button with loading state
- Detected food items display with confidence scores
- Editable portions (user can adjust AI estimates)
- Meal type selector (breakfast/lunch/dinner/snack)
- Save to food logs
- Daily summary card showing macros progress

### Components:

1. **`FoodPhotoUploader`** (`apps/web/src/components/nutrition/FoodPhotoUploader.tsx`)
   - Drag & drop or click to upload
   - Image preview with remove option
   - Upload to R2

2. **`FoodDetectionCard`** (`apps/web/src/components/nutrition/FoodDetectionCard.tsx`)
   - Display AI-detected items
   - Allow editing: food name, portion size, units
   - Show confidence indicators
   - Manual item addition

3. **`DailyNutritionSummary`** (`apps/web/src/components/nutrition/DailyNutritionSummary.tsx`)
   - Progress bars for calories, protein, carbs, fat
   - Circular macros chart (or pie chart)
   - Meal breakdown by time
   - Target vs actual

4. **`FoodLogList`** (`apps/web/src/components/nutrition/FoodLogList.tsx`)
   - List of today's food entries
   - Grouped by meal type
   - Edit/delete functionality
   - Expand to see details

### Dashboard Integration

Update `apps/web/src/app/dashboard/page.tsx`:
- Add Nutrition card to stats grid (showing today's calories/macros)
- Add "Log Food" quick action button

### Navigation

Update navigation to include Nutrition link in `apps/web/src/app/layout.tsx` or navigation component.

## Mobile App Implementation

**Files**: `apps/mobile/app/(tabs)/nutrition/` (new directory)

### Screen: FoodPhotoScreen

- Camera access or photo library
- Photo preview with crop/rotate (optional)
- Upload to API
- Display AI results for verification
- Select meal type
- Save

### Screen: FoodLogScreen

- Today's food summary at top
- List of entries grouped by meal
- Add manual entry button
- Tap to edit/delete

### Screen: DailyNutritionScreen

- Charts showing macros distribution
- Progress toward goals
- Historical view (week/month)

**Mobile API Client** updates in `packages/api-client/src/index.ts`:
- Add methods for nutrition endpoints
- `uploadFoodImage()`
- `analyzeFoodImage()`
- `createFoodLog()`
- `getFoodLogs()`
- `getDailyNutritionSummary()`
- `searchFoodDatabase()`

## Migration Strategy

### Phase 1: Schema & Seeding

**File**: `packages/db/migrations/0001_add_nutrition_tables.sql`

SQL migration adding the 4 new tables with proper indexes and foreign keys.

**Seeding Script** (new): `packages/db/scripts/seed-food-items.ts`

Seed with ~500 common foods:
- USDA FoodData Central API integration
- Pre-populate: proteins (chicken, beef, fish), carbs (rice, pasta, bread), vegetables, fruits, dairy
- Mark as `is_verified=1`

Run: `pnpm --filter @aivo/db exec tsx seed-food-items.ts`

### Phase 2: Backend API

1. Create `NutritionRouter` with all endpoints
2. Implement services:
   - `nutrition.service.ts` - business logic
   - `food-database.service.ts` - food lookup
   - `vision-analyzer.service.ts` - OpenAI integration
3. Update `apps/api/src/index.ts` to mount router at `/api/nutrition`

### Phase 3: Shared Types

Add nutrition types to `@aivo/shared-types` and generate types for all packages.

### Phase 4: Frontend Web

1. Create components folder structure
2. Build FoodPhotoUploader → analyze → review flow
3. Implement DailyNutritionSummary with charts
4. Add navigation link
5. Update dashboard with nutrition stats

### Phase 5: Mobile

1. Create nutrition tab screens
2. Implement camera integration (expo-image-picker)
3. Add API client methods
4. Build native UI components following existing patterns

### Phase 6: Rust WASM

1. Add image_processor module to `lib.rs`
2. Implement resize/compress with `image` crate
3. Add wasm-bindgen exports
4. Update build process in `package.json`
5. Integrate into API upload flow (optional: preprocess before R2 upload)

### Phase 7: AI Prompt Tuning

Iterate on system prompt for accurate:
- Food identification (handle mixed dishes, sauces)
- Portion estimation (use reference objects like plates)
- Macro calculation (cross-check with database)

Add confidence scoring and analysis notes for transparency.

### Phase 8: Testing & Polish

- Unit tests for nutrition service
- Integration tests for API endpoints
- E2E tests for full upload→analyze→log flow
- UI/UX refinement
- Error handling and user feedback

## Verification Steps

### Backend Verification

1. Start API locally: `cd apps/api && pnpm exec wrangler dev`
2. Test upload: `curl -F "image=@food.jpg" http://localhost:8787/api/nutrition/upload`
3. Test analyze: `curl -X POST -H "Content-Type: application/json" -H "X-User-Id: test-user" -H "Authorization: Bearer token" -d '{"imageUrl":"...","mealType":"lunch"}' http://localhost:8787/api/nutrition/vision/analyze`
4. Check DB: `pnpm --filter @aivo/db exec drizzle-kit studio` to verify tables
5. Verify food logs: `curl http://localhost:8787/api/nutrition/logs?userId=...`

### Frontend Verification

1. Start web: `cd apps/web && pnpm run dev`
2. Navigate to `/dashboard/nutrition`
3. Upload food photo
4. Verify AI analysis displays detected items
5. Adjust portion if needed, click "Log Food"
6. Check daily summary updates
7. Verify food log persists on page refresh

### Mobile Verification

1. Start Expo: `cd apps/mobile && pnpm exec expo start`
2. Navigate to Nutrition tab
3. Take/upload photo
4. Complete analysis and logging flow
5. Verify sync with API

### Database Verification

1. Check `food_items` has seeded data
2. Query `food_logs` for user test entries
3. Verify `daily_nutrition_summaries` updates on log creation
4. Test date range queries

## Critical Considerations

### AI Cost Optimization

- Cache OpenAI responses by image hash (KV namespace)
- Pre-process images with Rust to reduce token usage
- Batch process if analyzing multiple items
- Set monthly quotas per user

### Portion Estimation Accuracy

The hardest part: estimating portion size from 2D image.

**Strategies**:
1. Use plate/utensil size as reference (standardize: assume 10" plate)
2. AI estimates using depth from visual cues
3. Allow user to adjust after AI suggestion (learning loop)
4. For MVP: accept ±30% error, focus on trend tracking not absolute precision

**User Experience**:
- Show confidence scores
- Allow easy correction
- Track user corrections to improve AI (feedback loop)

### Nutritional Database

- Keep it simple initially: use AI's built-in knowledge
- Phase 2: Add verified food items for accuracy
- Allow user-created custom foods (stored per-user, can be promoted to global)
- Support barcode scanning (future phase)

### Privacy

- Food photos contain sensitive information
- Auto-delete images after analysis (configurable retention)
- Store only aggregated macros, optionally keep image for user reference
- Clear data retention policy in settings

## Files to Modify/Create

### Database
- `packages/db/src/schema.ts` - add tables
- `packages/db/drizzle.config.ts` - may need config update
- `packages/db/migrations/0001_add_nutrition_tables.sql` - new migration
- `packages/db/scripts/seed-food-items.ts` - seeding script

### API
- `apps/api/src/routes/nutrition.ts` - new router
- `apps/api/src/services/nutrition.service.ts` - new service
- `apps/api/src/services/vision-analyzer.service.ts` - new service (or extend body-insights)
- `apps/api/src/index.ts` - mount router
- `apps/api/wrangler.toml` - ensure R2 binding exists (already does)

### Shared Types
- `packages/shared-types/src/index.ts` - add nutrition interfaces

### Rust WASM
- `packages/aivo-compute/src/lib.rs` - add ImageProcessor
- `packages/aivo-compute/Cargo.toml` - add image, base64 deps
- `packages/aivo-compute/package.json` - ensure wasm-pack build script

### Web Frontend
- `apps/web/src/app/dashboard/nutrition/page.tsx` - main page
- `apps/web/src/components/nutrition/FoodPhotoUploader.tsx`
- `apps/web/src/components/nutrition/FoodDetectionCard.tsx`
- `apps/web/src/components/nutrition/DailyNutritionSummary.tsx`
- `apps/web/src/components/nutrition/FoodLogList.tsx`
- `apps/web/src/app/layout.tsx` or navigation - add Nutrition link
- `apps/web/src/app/dashboard/page.tsx` - add nutrition stats card
- `apps/web/src/components/body/BodyInsightCard.tsx` - move to shared? (optional refactor)

### Mobile
- `apps/mobile/app/(tabs)/nutrition/_layout.tsx`
- `apps/mobile/app/(tabs)/nutrition/index.tsx` - FoodLogScreen
- `apps/mobile/app/(tabs)/nutrition/photo.tsx` - FoodPhotoScreen
- `apps/mobile/app/(tabs)/nutrition/summary.tsx` - DailyNutritionScreen
- `apps/mobile/screens/` - if not using tabs structure

### API Client
- `packages/api-client/src/index.ts` - add nutrition methods

## Dependencies to Add

### API
```bash
cd apps/api
pnpm add zod-openapi @hono/zod-openapi
# Already have: hono, drizzle, openai
```

### Web
```bash
cd apps/web
pnpm add recharts # for charts
# Already have: framer-motion, lucide-react, tailwind
```

### Mobile
```bash
cd apps/mobile
pnpm add expo-image-picker expo-file-system
# Already have: @aivo/api-client
```

## Testing Strategy

### Unit Tests
- Nutrition service: portion calculation, macro aggregation
- Vision analyzer: prompt generation, response parsing
- Food database search: fuzzy matching, ranking
- WASM image processing: resize quality, compression ratio

### Integration Tests
- Full flow: upload → analyze → log → summary
- Manual entry validation
- Date range queries
- Cache invalidation

### E2E Tests
- Using Playwright or Cypress:
  - Upload food photo
  - Verify AI results display
  - Edit detected items
  - Save log
  - Check daily summary updates

## Rollout Plan

1. **Week 1-2**: Database schema + seeding, backend API (core endpoints)
2. **Week 3**: Rust WASM image processing
3. **Week 4**: Web frontend MVP (photo upload → analyze → log)
4. **Week 5**: Mobile implementation
5. **Week 6**: Testing, bug fixes, AI prompt tuning
6. **Week 7**: Beta release to internal team
7. **Week 8**: Public rollout with monitoring

## Success Metrics

- **Adoption**: % of daily active users logging food
- **Accuracy**: User correction rate on AI suggestions (target < 20%)
- **Retention**: Users who log food 3+ days per week
- **Engagement**: Avg. food entries per user per day
- **Satisfaction**: NPS score specific to nutrition feature

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI portion estimation too inaccurate | User adjustment UI, clear confidence display, aggregate trends not single meals |
| High OpenAI costs | Image pre-processing, caching, rate limiting, fallback to manual entry |
| Slow upload/analysis | Optimize image size (<200KB), loading states, async processing |
| Privacy concerns with food photos | Auto-delete option, local-only mode, clear data policy |
| Database size from food images | R2 lifecycle rules, compress aggressively |
