/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock OpenAI BEFORE any imports that use it
const mockOpenAI = {
  embeddings: {
    create: jest.fn(),
  },
};

// Mock the openai module - must be at top level before imports
jest.mock("openai", () => ({
  OpenAI: jest.fn().mockImplementation(() => mockOpenAI),
}));

import { MemorySearcher, createSearcher } from "../vector-search.ts";

describe("MemorySearcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should compute cosine similarity correctly", async () => {
    const searcher = createSearcher({ openaiApiKey: "test-key" });

    // Identical vectors should have similarity 1
    const vec = [1, 0, 0, 0];
    const same = [1, 0, 0, 0];
     
    const similarity = (searcher as any).cosineSimilarity(vec, same);
    expect(similarity).toBeCloseTo(1, 5);

    // Orthogonal vectors should have similarity 0
    const orthogonal = [0, 1, 0, 0];
     
    const orthoSim = (searcher as any).cosineSimilarity(vec, orthogonal);
    expect(orthoSim).toBeCloseTo(0, 5);

    // Opposite vectors should have similarity -1
    const opposite = [-1, 0, 0, 0];
     
    const oppSim = (searcher as any).cosineSimilarity(vec, opposite);
    expect(oppSim).toBeCloseTo(-1, 5);
  });

  it("should return 0 for vectors of different lengths", async () => {
    const searcher = createSearcher({ openaiApiKey: "test-key" });
    const vec1 = [1, 2, 3];
    const vec2 = [1, 2, 3, 4];
     
    const similarity = (searcher as any).cosineSimilarity(vec1, vec2);
    expect(similarity).toBe(0);
  });

  it("should return 0 for empty vectors", async () => {
    const searcher = createSearcher({ openaiApiKey: "test-key" });
     
    const similarity = (searcher as any).cosineSimilarity([], []);
    expect(similarity).toBe(0);
  });

  it("should boost recency score for newer memories", async () => {
    const searcher = createSearcher({
      openaiApiKey: "test-key",
      recencyHalfLifeHours: 168, // 1 week
    });

    const now = Date.now();
    const recentMemory = {
      content: "test content",
      embedding: new Array(1536).fill(0),
      metadata: { confidence: 0.9, extractedAt: now - 1000 * 60 * 60 }, // 1 hour ago
    } as any;

    const oldMemory = {
      content: "test content",
      embedding: new Array(1536).fill(0),
      metadata: { confidence: 0.9, extractedAt: now - 1000 * 60 * 60 * 168 }, // 1 week ago
    } as any;

     
    const recentScore = (searcher as any).computeScore(recentMemory, new Array(1536).fill(0));
     
    const oldScore = (searcher as any).computeScore(oldMemory, new Array(1536).fill(0));

    expect(recentScore).toBeGreaterThan(oldScore);
  });

  it("should boost score for high confidence memories", async () => {
    const searcher = createSearcher({
      openaiApiKey: "test-key",
      confidenceWeight: 0.5,
    });

    const highConfMemory = {
      content: "test",
      embedding: new Array(1536).fill(0),
      metadata: { confidence: 1.0, extractedAt: Date.now() },
    } as any;

    const lowConfMemory = {
      content: "test",
      embedding: new Array(1536).fill(0),
      metadata: { confidence: 0.5, extractedAt: Date.now() },
    } as any;

     
    const highScore = (searcher as any).computeScore(highConfMemory, new Array(1536).fill(0));
     
    const lowScore = (searcher as any).computeScore(lowConfMemory, new Array(1536).fill(0));

    expect(highScore).toBeGreaterThan(lowScore);
  });

  it("should apply priority boost for constraint type", async () => {
    const searcher = createSearcher({ openaiApiKey: "test-key" });

    const constraintMemory = {
      content: "test",
      type: "constraint",
      embedding: new Array(1536).fill(0),
      metadata: { confidence: 1.0, extractedAt: Date.now() },
    } as any;

    const entityMemory = {
      content: "test",
      type: "entity",
      embedding: new Array(1536).fill(0),
      metadata: { confidence: 1.0, extractedAt: Date.now() },
    } as any;

     
    const constraintScore = (searcher as any).computeScore(constraintMemory, new Array(1536).fill(0));
     
    const entityScore = (searcher as any).computeScore(entityMemory, new Array(1536).fill(0));

    expect(constraintScore).toBeGreaterThan(entityScore);
  });

  it("should cache embeddings", async () => {
    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(1) }],
    });

    const searcher = createSearcher({
      openaiApiKey: "test-key",
      embeddingCacheTtl: 60000,
    });

    // First call should hit API
     
    const emb1 = await (searcher as any).getEmbedding("test text");
    expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(1);

    // Second call with same text should use cache
     
    const emb2 = await (searcher as any).getEmbedding("test text");
    expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(1);
    expect(emb1).toEqual(emb2);
  });

  it("should return zero vector on embedding error", async () => {
    mockOpenAI.embeddings.create.mockRejectedValue(new Error("API error"));

    const searcher = createSearcher({ openaiApiKey: "test-key" });

     
    const embedding = await (searcher as any).getEmbedding("test text");

    expect(embedding).toHaveLength(1536);
    expect(embedding.every((v: number) => v === 0)).toBe(true);
  });

  it("should truncate text for embedding", async () => {
    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0) }],
    });

    const searcher = createSearcher({ openaiApiKey: "test-key" });

    const longText = "a".repeat(10000);
     
    await (searcher as any).getEmbedding(longText);

    expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.stringContaining("a".repeat(8000)),
      })
    );
  });
});

describe("createSearcher", () => {
  it("should create searcher with default config", () => {
    const searcher = createSearcher({ openaiApiKey: "test-key" });
    expect(searcher).toBeInstanceOf(MemorySearcher);
  });

  it("should create searcher with custom config", () => {
    const searcher = createSearcher({
      openaiApiKey: "test-key",
      semanticWeight: 0.8,
      recencyWeight: 0.1,
      confidenceWeight: 0.1,
    });
    expect(searcher).toBeInstanceOf(MemorySearcher);
  });
});
