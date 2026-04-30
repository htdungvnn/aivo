# Semantic Coaching Memory System - Implementation Plan

## Context

**Problem**: The AI coach has "goldfish memory" - it doesn't remember user preferences, injuries, or important facts across conversations.

**Solution**: Build a complete semantic memory system that:
1. Extracts structured facts from each conversation using OpenAI
2. Generates vector embeddings for semantic search
3. Stores memories in a graph structure (nodes + edges)
4. Dynamically injects relevant memories into each AI conversation
5. Compresses old conversations to stay within token budgets

**Goal**: The AI should remember "user has a lower back injury" or "user hates broccoli" indefinitely and use that information to personalize coaching.

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   AI Chat API   │────▶│  Memory Service  │────▶│    D1 Database  │
│   (ai.ts)       │     │   (TypeScript)   │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │                         │
         │                        │                         │
         ▼                        ▼                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   OpenAI Chat   │     │   OpenAI Embed   │     │   memoryNodes   │
│  (gpt-4o-mini)  │     │  (text-embed-3)  │     │   memoryEdges   │
└─────────────────┘     └──────────────────┘     │ compressedCtxs  │
                                                └─────────────────┘
```

---

## Memory Types

```typescript
enum MemoryType {
  ENTITY = "entity",       // People, places, gyms, equipment
  PREFERENCE = "preference", // Likes, dislikes, dietary restrictions
  FACT = "fact",           // Static info: age, weight, fitness level
  EVENT = "event",         // Workouts, achievements, milestones
  EMOTIONAL = "emotional", // Motivation, energy, mood, pain levels
  RELATIONSHIP = "relationship", // How memories connect
}
```

---

## Implementation Phases

### PHASE 1: Shared Types & Database Schema Extension

**Files to create/modify:**

1. **`packages/shared-types/src/memory.ts`** - New file
   - Define `MemoryNode`, `MemoryEdge`, `MemoryQuery`, `FactExtraction` types
   - Export type guards and constructors

2. **`packages/db/src/schema.ts`**
   - Verify existing `memoryNodes`, `memoryEdges`, `compressedContexts` tables
   - Add indexes for performance: `userId + type`, `userId + createdAt`
   - Consider adding `embedding` column with better type support

**Key types:**

```typescript
export interface MemoryNode {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;           // Human-readable fact
  embedding: number[];       // Vector from OpenAI
  metadata: MemoryMetadata;  // JSON with source, confidence, timestamps
  relatedNodes: string[];    // IDs of connected memories
}

export interface MemoryMetadata {
  source: 'conversation' | 'workout' | 'body_metric' | 'manual';
  confidence: number;        // 0-1 extraction confidence
  extractedAt: number;       // timestamp
  sourceId?: string;         // conversation/workout ID that generated this
  verifications: number;     // how many times this fact was reinforced
}

export interface MemoryEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationship: RelationshipType; // 'related_to', 'contradicts', 'temporal_before', etc.
  weight: number;             // 0-1 strength
}

export interface MemoryQuery {
  userId: string;
  query?: string;             // For semantic search
  types?: MemoryType[];       // Filter by type
  limit?: number;             // Default: 10
  minConfidence?: number;     // Default: 0.7
  maxAgeDays?: number;        // Time window filter
}
```

---

### PHASE 2: Memory Service - Core Logic

**New package: `packages/memory-service`** (or add to existing `packages/api-client`)

**Structure:**

```
packages/memory-service/
├── src/
│   ├── index.ts           # Main exports
│   ├── service.ts         # MemoryService class
│   ├── summarizer.ts      # Fact extraction using OpenAI
│   ├── vector-search.ts   # Semantic search with embeddings
│   ├── compression.ts     # Memory compression & context building
│   └── types.ts           # Type definitions (or import from shared-types)
├── package.json
└── tsconfig.json
```

**Implementation tasks:**

#### 2.1 `summarizer.ts` - Fact Extraction

```typescript
export class ConversationSummarizer {
  async extractFacts(
    userId: string,
    conversation: Message[],
    existingMemories: MemoryNode[]
  ): Promise<ExtractedFacts[]> {
    // Build prompt with conversation + existing context
    const prompt = buildExtractionPrompt(conversation, existingMemories);
    
    // Call OpenAI with structured response format
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: FACT_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });
    
    // Parse and validate structured facts
    const facts = parseExtractedFacts(response.choices[0].message.content);
    
    // Deduplicate against existing memories (cosine similarity check)
    return this.deduplicateFacts(facts, existingMemories);
  }
}
```

**System prompt for extraction:**
```
Extract structured facts from this fitness coaching conversation.
Return JSON with this schema:
{
  "facts": [
    {
      "type": "fact|preference|entity|event|emotional",
      "content": "clear statement of the fact",
      "confidence": 0.0-1.0,
      "relatedTo": ["other_fact_ids"]
    }
  ]
}

Focus on:
- Health status: injuries, conditions, symptoms
- Preferences: foods, workout times, equipment likes/dislikes  
- Goals: explicit fitness/nutrition goals mentioned
- Events: completed workouts, achievements
- Constraints: time, equipment, location limitations
- Emotional state: motivation, energy, pain levels

Ignore: general chit-chat, already known facts, hypotheticals.
```

#### 2.2 `vector-search.ts` - Semantic Search

```typescript
export class MemorySearcher {
  async search(query: MemoryQuery): Promise<MemoryNode[]> {
    // 1. If query string provided, get embedding
    let queryEmbedding: number[] | null = null;
    if (query.query) {
      queryEmbedding = await this.getEmbedding(query.query);
    }
    
    // 2. Fetch candidates from D1
    const candidates = await this.fetchCandidates(query);
    
    // 3. Score and rank
    const scored = await Promise.all(
      candidates.map(async (memory) => {
        let score = 0;
        
        // Semantic similarity (if query provided)
        if (queryEmbedding) {
          score += this.cosineSimilarity(queryEmbedding, memory.embedding) * 0.6;
        }
        
        // Recency boost
        const ageHours = (Date.now() - memory.metadata.extractedAt) / (1000 * 60 * 60);
        score += Math.exp(-ageHours / 168) * 0.2; // Half-life of 1 week
        
        // Confidence boost
        score += memory.metadata.confidence * 0.2;
        
        return { memory, score };
      })
    );
    
    // 4. Apply thresholds and return top-k
    return scored
      .filter(s => s.score >= (query.minConfidence || 0.5))
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit || 10)
      .map(s => s.memory);
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    // Compute cosine similarity
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  private async getEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: this.truncateForEmbedding(text),
    });
    return response.data[0].embedding;
  }
}
```

#### 2.3 `compression.ts` - Context Building

```typescript
export class ContextBuilder {
  async buildContext(
    userId: string,
    currentQuery: string,
    tokenBudget: number = 2000
  ): Promise<{ memories: MemoryNode[], contextString: string, tokens: number }> {
    // 1. Query relevant memories
    const memories = await this.memoryService.search({
      userId,
      query: currentQuery,
      limit: 15,
    });
    
    // 2. Group by type and format
    const grouped = this.groupByType(memories);
    
    // 3. Build context string with priority ordering
    const contextParts: string[] = [];
    
    // Critical health info first (injuries, constraints)
    if (grouped.fact && grouped.fact.some(f => this.isHealthCritical(f.content))) {
      contextParts.push("CRITICAL HEALTH INFORMATION:\n" + 
        grouped.fact.filter(f => this.isHealthCritical(f.content)).map(f => f.content).join("\n"));
    }
    
    // Preferences next
    if (grouped.preference) {
      contextParts.push("USER PREFERENCES:\n" + 
        grouped.preference.map(p => p.content).join("\n"));
    }
    
    // Goals
    if (grouped.event) {
      contextParts.push("RECENT ACHIEVEMENTS:\n" + 
        this.formatRecentEvents(grouped.event.slice(0, 5)));
    }
    
    // Compose final context
    const contextString = contextParts.join("\n\n");
    const estimatedTokens = this.estimateTokens(contextString);
    
    // 4. Truncate if over budget
    if (estimatedTokens > tokenBudget) {
      return this.truncateContext(contextParts, tokenBudget);
    }
    
    return { memories, contextString, tokens: estimatedTokens };
  }
}
```

#### 2.4 `service.ts` - Main MemoryService

```typescript
export class MemoryService {
  constructor(
    private db: D1Database,
    private openai: OpenAI,
    private summarizeAfterTurn: boolean = true
  ) {}
  
  async processConversationTurn(
    userId: string,
    userMessage: string,
    aiResponse: string,
    conversationId: string
  ): Promise<void> {
    // 1. Fetch recent conversation history (last 5 turns)
    const recentTurns = await this.getRecentTurns(userId, 5);
    
    // 2. Fetch existing memories for context
    const existingMemories = await this.getMemories(userId);
    
    // 3. Extract new facts
    const newFacts = await this.summarizer.extractFacts(
      userId,
      [...recentTurns, { role: 'user', content: userMessage }, { role: 'assistant', content: aiResponse }],
      existingMemories
    );
    
    // 4. Generate embeddings for new facts
    const factsWithEmbeddings = await Promise.all(
      newFacts.map(async (fact) => {
        const embedding = await this.getEmbedding(fact.content);
        return { ...fact, embedding };
      })
    );
    
    // 5. Store new memory nodes
    for (const fact of factsWithEmbeddings) {
      await this.createMemoryNode(userId, fact);
    }
    
    // 6. Create relationships between new facts and existing similar ones
    await this.createMemoryEdges(userId, factsWithEmbeddings, existingMemories);
    
    // 7. Update compressed contexts periodically
    await this.updateCompressedContext(userId);
  }
  
  async getMemoriesForContext(
    userId: string,
    currentQuery: string,
    tokenBudget: number = 2000
  ): Promise<string> {
    const { contextString } = await this.contextBuilder.buildContext(
      userId, currentQuery, tokenBudget
    );
    return contextString;
  }
}
```

---

### PHASE 3: API Integration

**File: `apps/api/src/routes/ai.ts`** - Modify the chat endpoint

**Changes needed:**

1. **Add memory service initialization**:
```typescript
import { MemoryService } from "@aivo/memory-service";
// ...
const env = { DB: c.env.DB, OPENAI_API_KEY: c.env.OPENAI_API_KEY };
const memoryService = new MemoryService(env);
```

2. **Inject relevant memories into context**:
```typescript
// Before OpenAI call, get relevant memories
const memoryContext = await memoryService.getMemoriesForContext(
  userId,
  validated.message,
  1500  // Reserve 500 tokens for conversation history
);

if (memoryContext) {
  messages.push({
    role: "system",
    content: `User Profile & Memories:\n${memoryContext}`,
  });
}
```

3. **Process conversation turn for memory extraction**:
```typescript
// After successful OpenAI response and DB insert
await memoryService.processConversationTurn(
  userId,
  validated.message,
  aiMessage,
  // conversationId from insert result
);
```

4. **Add API endpoint for memory management** (optional):
```typescript
// GET /ai/memories - Get user's memories
// DELETE /ai/memories/:id - Delete specific memory
// PATCH /ai/memories/:id - Update/correct a memory
```

---

### PHASE 4: Database Optimizations

**Migration: `packages/db/drizzle/migrations/0003_add_memory_indexes.sql`**

```sql
-- Indexes for faster memory queries
CREATE INDEX IF NOT EXISTS idx_memory_nodes_user_id_type ON memory_nodes(user_id, type);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_user_id_created_at ON memory_nodes(user_id, extracted_at);
CREATE INDEX IF NOT EXISTS idx_memory_edges_from_node ON memory_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_memory_edges_to_node ON memory_edges(to_node_id);
```

**Update schema.ts** to include indexes if using Drizzle's index API.

---

### PHASE 5: Rust/WASM Optimization (Optional Future)

For offline fallback or performance, consider:

**New package: `packages/memory-embedding-wasm`**

- Use `fasttext` Rust crate for local embeddings (~50KB WASM)
- Fallback when OpenAI API unavailable
- Pre-trained model for English fitness vocabulary

---

### PHASE 6: Testing

**Test Coverage:**

1. **Unit tests** (`packages/memory-service/src/__tests__/`):
   - Fact extraction with mock OpenAI responses
   - Vector search with test embeddings
   - Context building with various scenarios
   - Deduplication logic
   - Memory edge creation

2. **Integration tests** (`apps/api/src/routes/__tests__/ai.memory.test.ts`):
   - Full conversation with memory persistence
   - Memory retrieval affects subsequent responses
   - Memory deduplication across similar conversations
   - Token budget enforcement

3. **E2E test** (manual or Cypress):
   - User mentions injury → later AI avoids suggesting problematic exercises
   - User states food preference → AI respects in nutrition advice
   - Workout completion → added to recent achievements

---

### PHASE 7: Monitoring & Observability

**Add to `memoryService.processConversationTurn`:**

```typescript
// Log memory statistics
console.log({
  userId,
  factsExtracted: newFacts.length,
  memoriesTotal: existingMemories.length + newFacts.length,
  contextTokens: estimatedTokens,
  embeddingCalls: factsWithEmbeddings.length,
});
```

**Metrics to track:**
- Memory extraction latency (p50, p99)
- Facts extracted per conversation
- Memory search latency
- Context token usage
- Memory recall effectiveness (A/B test with/without memories)

---

## Critical Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `packages/shared-types/src/memory.ts` | Type definitions | **Create** |
| `packages/memory-service/src/service.ts` | Main service | **Create** |
| `packages/memory-service/src/summarizer.ts` | Fact extraction | **Create** |
| `packages/memory-service/src/vector-search.ts` | Semantic search | **Create** |
| `packages/memory-service/src/compression.ts` | Context building | **Create** |
| `packages/memory-service/package.json` | Package manifest | **Create** |
| `packages/db/drizzle/migrations/0003_add_memory_indexes.sql` | Database indexes | **Create** |
| `apps/api/src/routes/ai.ts` | Integrate memory service | **Modify** |
| `apps/api/src/routes/ai.test.ts` | Memory integration tests | **Create** |

---

## Verification Steps

1. **Run migrations**:
   ```bash
   pnpm --filter @aivo/db exec drizzle-kit generate
   pnpm --filter @aivo/db exec wrangler d1 migrations apply aivo-db --local
   ```

2. **Build memory-service**:
   ```bash
   pnpm --filter @aivo/memory-service build
   ```

3. **Start API dev server**:
   ```bash
   cd apps/api && pnpm exec wrangler dev
   ```

4. **Test memory extraction**:
   ```bash
   curl -X POST http://localhost:8787/ai/chat \
     -H "Authorization: Bearer test" \
     -H "X-User-Id: test-user" \
     -d '{"userId":"test-user","message":"I injured my lower back 3 weeks ago doing deadlifts"}'
   ```

5. **Verify memory stored**:
   ```bash
   pnpm --filter @aivo/db exec sqlite3 .wrangler/instance/aivo-db/data.db "SELECT * FROM memory_nodes WHERE user_id='test-user'"
   ```

6. **Test retrieval**:
   ```bash
   curl -X POST http://localhost:8787/ai/chat \
     -H "Authorization: Bearer test" \
     -H "X-User-Id: test-user" \
     -d '{"userId":"test-user","message":"What exercises should I avoid?"}'
   ```
   Should see memory context injected in the system prompt.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Memory extraction false positives | Confidence threshold > 0.8; manual review possible via API |
| Memory explosion (too many facts) | Limit: 500 memories/user; deduplication; age-based pruning |
| OpenAI API cost | Cache embeddings; batch extraction; limit to 5 facts/turn |
| Token budget exceeded | Aggressive truncation; compress old memories into summaries |
| Incorrect memory retrieval | Hybrid scoring (similarity + recency + confidence); allow user corrections |
| Privacy concerns | User can view/delete memories; encrypted storage option |
| Race conditions | Database transactions; optimistic locking |

---

## Success Criteria

- ✅ AI mentions user-specific facts in >70% of relevant conversations
- ✅ Memory extraction latency < 500ms (p99)
- ✅ Memory storage cost < $0.01/user/month (OpenAI embeddings)
- ✅ No false positive extractions >5% (manual review)
- ✅ Token budget compliance: 100% of requests stay within limit
- ✅ Zero memory leaks: old memories properly compressed/deleted

---

## Next Steps After Approval

1. Create `packages/memory-service` with full implementation
2. Add shared types to `packages/shared-types`
3. Create database migration for indexes
4. Integrate into `apps/api/src/routes/ai.ts`
5. Write unit and integration tests
6. Deploy to development environment
7. Manual E2E testing with sample conversations
8. Add monitoring dashboards
9. Deploy to production with feature flag
10. Gather user feedback and iterate
