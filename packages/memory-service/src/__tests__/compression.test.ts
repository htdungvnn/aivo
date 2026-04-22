import { estimateTokens, truncateToTokenBudget } from "../compression.ts";
import { createContextBuilder } from "../compression.ts";
import { MemoryNode, MemoryType } from "../types.ts";

describe("Token Utilities", () => {
  describe("estimateTokens", () => {
    it("should estimate tokens for simple text", () => {
      // "hello world" (11 chars) appears 3 times = 33 chars / 4 = 8.25 -> 9 tokens
      // Actually: "hello world hello world" = 22 chars / 4 = 5.5 -> 6 tokens
      expect(estimateTokens("hello world hello world")).toBe(6);
    });

    it("should handle empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });

    it("should round up", () => {
      // 5 chars / 4 = 1.25 -> 2 tokens
      expect(estimateTokens("hello")).toBe(2);
    });

    it("should handle long text", () => {
      const longText = "a".repeat(1000);
      expect(estimateTokens(longText)).toBe(250);
    });
  });

  describe("truncateToTokenBudget", () => {
    it("should not truncate if within budget", () => {
      const text = "hello world";
      const result = truncateToTokenBudget(text, 100);
      expect(result).toBe(text);
    });

    it("should truncate if over budget", () => {
      const text = "a".repeat(1000);
      const result = truncateToTokenBudget(text, 100);
      expect(result.length).toBeLessThan(1000);
      expect(result).toContain("... [truncated]");
    });

    it("should handle exact budget", () => {
      const text = "a".repeat(400); // 100 tokens
      const result = truncateToTokenBudget(text, 100);
      expect(result).toBe(text);
    });
  });
});

describe("ContextBuilder", () => {
  const createMemory = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
    id: `mem-${Math.random()}`,
    userId: "user-123",
    type: MemoryType.FACT,
    content: "Test fact",
    embedding: new Array(1536).fill(0),
    metadata: {
      source: "conversation",
      confidence: 0.9,
      extractedAt: Date.now(),
      verifications: 1,
    },
    relatedNodes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  describe("buildFromMemories", () => {
    it("should format memories by type", () => {
      const builder = createContextBuilder();

      const memories = [
        createMemory({ type: MemoryType.FACT, content: "Fact 1" }),
        createMemory({ type: MemoryType.PREFERENCE, content: "Pref 1" }),
        createMemory({ type: MemoryType.FACT, content: "Fact 2" }),
      ];

      const context = builder.buildFromMemories(memories);

      expect(context.contextString).toContain("Facts");
      expect(context.contextString).toContain("Preferences");
      expect(context.contextString).toContain("Fact 1");
      expect(context.contextString).toContain("Fact 2");
      expect(context.contextString).toContain("Pref 1");
    });

    it("should sort memories by confidence within type", () => {
      const builder = createContextBuilder();

      const memories = [
        createMemory({ type: MemoryType.FACT, content: "Low conf", metadata: { confidence: 0.5 } }),
        createMemory({ type: MemoryType.FACT, content: "High conf", metadata: { confidence: 0.95 } }),
        createMemory({ type: MemoryType.FACT, content: "Med conf", metadata: { confidence: 0.75 } }),
      ];

      const context = builder.buildFromMemories(memories);

      const lines = context.contextString.split("\n");
      const factSection = lines.find(l => l.includes("Facts"));
      expect(factSection).toBeDefined();

      // High confidence should appear first
      const factIndex = lines.indexOf("## Facts");
      const nextLines = lines.slice(factIndex + 1, factIndex + 4);
      expect(nextLines[0]).toContain("High conf");
    });

    it("should show confidence percentages", () => {
      const builder = createContextBuilder();

      const memories = [
        createMemory({ content: "Test fact", metadata: { confidence: 0.875 } }),
      ];

      const context = builder.buildFromMemories(memories);

      expect(context.contextString).toContain("88%"); // Rounded from 87.5%
    });

    it("should show verification count when > 1", () => {
      const builder = createContextBuilder();

      const memories = [
        createMemory({ metadata: { verifications: 3 } }),
      ];

      const context = builder.buildFromMemories(memories);

      expect(context.contextString).toContain("3x");
    });

    it("should respect token budget", () => {
      const builder = createContextBuilder({ maxPerType: 2 });

      const memories = Array(20).fill(null).map((_, i) =>
        createMemory({ content: `Memory ${i}` })
      );

      const context = builder.buildFromMemories(memories);

      expect(context.tokens).toBeLessThanOrEqual(200);
    });

    it("should prioritize critical health info", () => {
      const builder = createContextBuilder();

      const memories = [
        createMemory({ type: MemoryType.FACT, content: "User has lower back injury", metadata: { confidence: 0.9 } }),
        createMemory({ type: MemoryType.FACT, content: "Normal health fact", metadata: { confidence: 0.9 } }),
        createMemory({ type: MemoryType.PREFERENCE, content: "Pref 1", metadata: { confidence: 0.9 } }),
      ];

      const context = builder.buildFromMemories(memories);

      const lines = context.contextString.split("\n");
      const criticalIdx = lines.findIndex(l => l.includes("CRITICAL HEALTH"));
      const factsIdx = lines.findIndex(l => l.includes("Facts") && !l.includes("CRITICAL"));

      expect(criticalIdx).toBeGreaterThan(-1);
      expect(factsIdx).toBeGreaterThan(-1);
      expect(criticalIdx).toBeLessThan(factsIdx);
    });

    it("should return empty string for no memories", () => {
      const builder = createContextBuilder();
      const context = builder.buildFromMemories([]);
      expect(context.contextString).toBe("");
    });
  });

  describe("source tracking", () => {
    it("should track memory counts by type", () => {
      const builder = createContextBuilder();

      const memories = [
        createMemory({ type: MemoryType.FACT }),
        createMemory({ type: MemoryType.FACT }),
        createMemory({ type: MemoryType.PREFERENCE }),
      ];

      const context = builder.buildFromMemories(memories);

      expect(context.sources.facts).toBe(2);
      expect(context.sources.preferences).toBe(1);
    });
  });
});
