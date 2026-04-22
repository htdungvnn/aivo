# Semantic Coaching Memory System

The Semantic Coaching Memory System is AIVO's core intelligence feature that solves the "Goldfish Memory" problem. It automatically extracts, stores, and retrieves relevant user context from conversations to provide personalized coaching.

## Overview

Traditional AI chatbots forget everything between sessions. AIVO's memory system:

- **Extracts** structured facts from conversations using OpenAI
- **Embeds** facts into 1536-dimensional vectors for semantic search
- **Stores** memories in a graph database with relationships
- **Retrieves** relevant context based on the current conversation
- **Deduplicates** to avoid storing redundant information
- **Prioritizes** critical health information (injuries, restrictions)

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User Message   │────▶│  Conversation    │────▶│   Fact          │
│                 │     │  Summarizer      │     │   Extraction    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  AI Response    │◀────│   Memory         │◀────│  Deduplication │
│                 │     │   Service        │     │  & Embedding    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Graph DB      │
                       │  (D1 SQLite)    │
                       └─────────────────┘
```

### Components

1. **ConversationSummarizer** (`src/summarizer.ts`)
   - Uses OpenAI GPT-4o-mini to extract facts
   - Returns structured `ExtractedFact` objects with type, content, confidence
   - Includes deduplication against existing memories

2. **MemorySearcher** (`src/vector-search.ts`)
   - Generates embeddings using OpenAI `text-embedding-3-small`
   - Computes cosine similarity for semantic search
   - Applies hybrid scoring (semantic 0.6 + recency 0.2 + confidence 0.2)
   - Caches embeddings for performance

3. **ContextBuilder** (`src/compression.ts`)
   - Assembles memories into token-efficient context strings
   - Enforces per-category token reserves
   - Truncates to fit budget
   - Formats for AI prompt injection

4. **MemoryService** (`src/service.ts`)
   - Orchestrates all components
   - Handles database operations
   - Manages memory lifecycle and pruning
   - Provides public API for chat integration

## Memory Types

| Type | Description | Examples |
|------|-------------|----------|
| `entity` | People, places, gyms, equipment | "Gold's Gym", " squat rack" |
| `preference` | Likes, dislikes, dietary restrictions | "Prefers morning workouts", "No dairy" |
| `fact` | Static information | "Age: 32", "Weight: 180 lbs" |
| `event` | Completed workouts, achievements | "Bench pressed 225 lbs on 2024-01-15" |
| `emotional` | Motivation, energy, mood, pain | "Feeling fatigued this week" |
| `constraint` | Goals, time, equipment access | "Can only train 3x/week", "No bench at home" |

## Critical Health Information

Certain keywords trigger **critical health flag** - these memories are:
- Always included in context (never filtered by confidence)
- Preserved during memory pruning
- Prioritized in retrieval

### Keywords

```
injury, injured, pain, hurt, damage, strain, sprain,
herniated, bulging, disc, surgery, recovery, rehab,
hernia, fracture, broken, torn, rupture, dislocated,
medical, doctor, physical therapy, chiropractor,
lower back, upper back, neck, shoulder, knee, ankle,
hip, elbow, wrist, pre-existing, condition
```

## Token Budgeting

Default budget: **2000 tokens** distributed with reserves:

| Category | Reserve |
|----------|---------|
| Critical Health | 300 |
| Facts | 200 |
| Preferences | 200 |
| Emotional State | 200 |
| Events & Achievements | 300 |
| Constraints | 300 |
| Entities | 50 |
| **Total** | 1550 (leaves 450 for flexibility) |

Each individual memory limited to **150 tokens**.

## Deduplication

Facts with **cosine similarity ≥ 0.85** are considered duplicates:
- New fact is discarded if it's too similar to an existing one
- Verification count is incremented on the existing fact instead
- Confidence may be boosted with each verification

## Database Schema

### memoryNodes

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | UUID |
| userId | TEXT | Owner |
| type | TEXT | MemoryType enum |
| content | TEXT | Human-readable fact |
| embedding | TEXT (JSON) | 1536-dimensional vector |
| metadata | TEXT (JSON) | Source, confidence, verifications, etc. |
| relatedNodes | TEXT (JSON) | Array of connected node IDs |
| createdAt | INTEGER | Unix timestamp |
| updatedAt | INTEGER | Unix timestamp |

### memoryEdges

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | UUID |
| fromNodeId | TEXT | Source node |
| toNodeId | TEXT | Target node |
| relationship | TEXT | RelationshipType enum |
| weight | REAL | 0-1 strength |
| createdAt | INTEGER | Unix timestamp |

### compressedContexts (optional)

Stores pre-compressed context strings for frequently accessed users to reduce computation.

## API Reference

### MemoryService Constructor

```typescript
const service = new MemoryService({
  openaiApiKey: string;
  db: DrizzleD1Database<typeof schema>;
  summarizerConfig?: {
    maxFacts?: number;         // Default: 10
    minConfidence?: number;    // Default: 0.6
    deduplicationThreshold?: number; // Default: 0.85
  };
  vectorSearchConfig?: {
    semanticWeight?: number;   // Default: 0.6
    recencyWeight?: number;    // Default: 0.2
    confidenceWeight?: number; // Default: 0.2
    recencyHalfLifeHours?: number; // Default: 24
  };
});
```

### processConversationTurn

Processes a completed conversation turn and stores extracted memories.

```typescript
const result = await service.processConversationTurn(
  userId: string,
  userMessage: string,
  aiResponse: string,
  conversationId: string
);
// Returns: { factsExtracted, memoriesCreated, edgesCreated }
```

**Note:** This is called **after** the AI response to avoid blocking the user's reply.

### getMemoriesForContext

Retrieves relevant memories formatted for AI context injection.

```typescript
const context = await service.getMemoriesForContext(
  userId: string,
  currentQuery: string,  // Current user message for semantic search
  tokenBudget?: number   // Default: 2000
);
// Returns: formatted string ready for system prompt
```

### getMemories

Direct query interface with filters.

```typescript
const memories = await service.getMemories(userId, {
  query?: string;         // Semantic search query
  types?: MemoryType[];   // Filter by types
  limit?: number;         // Max results
  minConfidence?: number; // Confidence threshold
  maxAgeDays?: number;    // Max age in days
  includeCritical?: boolean; // Force include critical health info
  priorityTypes?: MemoryType[]; // Boost these types
});
```

### enforceMemoryLimit

Prunes old/low-confidence memories to stay within limits.

```typescript
await service.enforceMemoryLimit(userId);
// Keeps top 100 memories by score, max age 365 days
```

## Integration with AI Chat

The memory system integrates into the chat endpoint (`apps/api/src/routes/ai.ts`):

```typescript
// Before calling OpenAI, inject memory context
const memoryService = getMemoryService(c.env.DB, c.env.OPENAI_API_KEY);
const memoryContext = await memoryService.getMemoriesForContext(
  userId,
  validated.message,
  1500 // token budget
);
if (memoryContext) {
  messages.push({ role: "system", content: memoryContext });
}

// After receiving AI response, process for memory extraction (async)
memoryService.processConversationTurn(
  userId,
  validated.message,
  aiMessage,
  insertedConversation.id
).catch(console.error); // Don't block response
```

## Configuration

### Environment Variables

The memory service requires:

```
OPENAI_API_KEY=sk-...          # OpenAI API key for GPT-4o-mini + text-embedding-3-small
```

### Database Tables

Ensure migrations are applied:

```bash
cd packages/db
pnpmx drizzle-kit generate
pnpmx drizzle-kit migrate
```

Required tables:
- `memoryNodes`
- `memoryEdges`
- `compressedContexts` (optional)

## Testing

```bash
cd packages/memory-service
pnpm test        # Run unit tests (48 tests)
pnpm build       # TypeScript compilation
pnpm type-check  # Type verification
```

## Performance Considerations

- **Embedding generation** is cached to avoid redundant API calls
- **Memory retrieval** uses efficient SQLite queries with vector similarity
- **Async processing** means memory extraction doesn't block chat responses
- **Token budgeting** prevents context overflow

## Limitations

- Requires OpenAI API (incurs cost)
- Storage limited by D1 database quotas
- Max 1536-dimensional vectors (OpenAI constraint)
- Memory pruning is time-based and score-based

## Future Enhancements

- [ ] Compression for stored embeddings (PQ, HNSW)
- [ ] Multi-modal memories (images, voice)
- [ ] Cross-user anonymized learning
- [ ] Real-time streaming extraction
- [ ] Memory explainability (why this was retrieved)

---

**Last Updated:** 2025-04-20  
**Version:** 1.0.0
