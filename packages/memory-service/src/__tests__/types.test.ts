/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  isHealthCritical,
  isValidEmbedding,
  isMemoryNode,
  formatMemoryContext,
  MemoryType,
  createMemoryNode,
} from "../types.ts";

describe("Types and Utilities", () => {
  describe("isHealthCritical", () => {
    it("should detect injury keywords", () => {
      expect(isHealthCritical("User has lower back injury")).toBe(true);
      expect(isHealthCritical("Knee pain from running")).toBe(true);
      expect(isHealthCritical("Shoulder strain")).toBe(true);
    });

    it("should detect medical context", () => {
      expect(isHealthCritical("Saw doctor for back pain")).toBe(true);
      expect(isHealthCritical("Physical therapy twice a week")).toBe(true);
      expect(isHealthCritical("Chiropractor visit")).toBe(true);
    });

    it("should detect body part mentions", () => {
      expect(isHealthCritical("Lower back tightness")).toBe(true);
      expect(isHealthCritical("Neck discomfort")).toBe(true);
      expect(isHealthCritical("Hip flexor pain")).toBe(true);
    });

    it("should return false for non-health content", () => {
      expect(isHealthCritical("I like running")).toBe(false);
      expect(isHealthCritical("Completed workout")).toBe(false);
      expect(isHealthCritical("User is 30 years old")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(isHealthCritical("LOWER BACK INJURY")).toBe(true);
      expect(isHealthCritical("lower back injury")).toBe(true);
    });
  });

  describe("isValidEmbedding", () => {
    it("should accept valid 1536-dimensional vector", () => {
      const valid = new Array(1536).fill(0.5);
      expect(isValidEmbedding(valid)).toBe(true);
    });

    it("should reject wrong dimensions", () => {
      expect(isValidEmbedding([1, 2, 3])).toBe(false);
      expect(isValidEmbedding(new Array(100).fill(0))).toBe(false);
    });

    it("should reject non-array", () => {
       
      expect(isValidEmbedding(null as any)).toBe(false);
       
      expect(isValidEmbedding("string" as any)).toBe(false);
       
      expect(isValidEmbedding({} as any)).toBe(false);
    });

    it("should reject arrays with NaN or Infinity", () => {
      expect(isValidEmbedding([NaN, 0, 0])).toBe(false);
      expect(isValidEmbedding([Infinity, 0, 0])).toBe(false);
      expect(isValidEmbedding([-Infinity, 0, 0])).toBe(false);
    });
  });

  describe("isMemoryNode", () => {
    it("should validate proper memory node", () => {
      const now = Date.now();
      const node = {
        id: "test-id",
        userId: "user-123",
        type: MemoryType.FACT,
        content: "Test content",
        embedding: new Array(1536).fill(0),
        metadata: { source: "conversation", confidence: 0.9, extractedAt: now, verifications: 1 },
        relatedNodes: [],
        createdAt: now,
        updatedAt: now,
      };
      expect(isMemoryNode(node)).toBe(true);
    });

    it("should reject incomplete objects", () => {
       
      expect(isMemoryNode({} as any)).toBe(false);
       
      expect(isMemoryNode({ id: "1" } as any)).toBe(false);
       
      expect(isMemoryNode({ id: "1", userId: "u", type: "fact", content: "c" } as any)).toBe(false);
    });

    it("should reject non-array embedding", () => {
      const now = Date.now();
      const node = {
        id: "test-id",
        userId: "user-123",
        type: MemoryType.FACT,
        content: "Test content",
        embedding: "not an array",
        metadata: { source: "conversation", confidence: 0.9, extractedAt: now, verifications: 1 },
        relatedNodes: [],
        createdAt: now,
        updatedAt: now,
      };
      expect(isMemoryNode(node)).toBe(false);
    });
  });

  describe("createMemoryNode", () => {
    it("should create node with defaults", () => {
      const node = createMemoryNode(
        "user-123",
        MemoryType.FACT,
        "Test content",
        new Array(1536).fill(0)
      );

      expect(node.userId).toBe("user-123");
      expect(node.type).toBe(MemoryType.FACT);
      expect(node.content).toBe("Test content");
      expect(node.metadata.source).toBe("conversation");
      expect(node.metadata.confidence).toBe(1.0);
      expect(node.metadata.verifications).toBe(1);
      expect(node.relatedNodes).toEqual([]);
      expect(typeof node.createdAt).toBe("number");
      expect(typeof node.updatedAt).toBe("number");
    });

    it("should accept custom metadata", () => {
      const node = createMemoryNode(
        "user-123",
        MemoryType.PREFERENCE,
        "User likes running",
        new Array(1536).fill(0),
        {
          source: "workout",
          confidence: 0.85,
          verifications: 2,
          tags: ["exercise", "cardio"],
        }
      );

      expect(node.metadata.source).toBe("workout");
      expect(node.metadata.confidence).toBe(0.85);
      expect(node.metadata.verifications).toBe(2);
      expect(node.metadata.tags).toEqual(["exercise", "cardio"]);
    });
  });

  describe("formatMemoryContext", () => {
    it("should format empty array as empty string", () => {
      expect(formatMemoryContext([])).toBe("");
    });

    it("should format memories by type", () => {
      const now = Date.now();
      const memories = [
        {
          id: "1",
          userId: "u",
          type: MemoryType.FACT,
          content: "Fact content",
          embedding: new Array(1536).fill(0),
          metadata: { source: "c", confidence: 0.9, extractedAt: now, verifications: 1 },
          relatedNodes: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "2",
          userId: "u",
          type: MemoryType.PREFERENCE,
          content: "Pref content",
          embedding: new Array(1536).fill(0),
          metadata: { source: "c", confidence: 0.8, extractedAt: now, verifications: 1 },
          relatedNodes: [],
          createdAt: now,
          updatedAt: now,
        },
      ];

      const formatted = formatMemoryContext(memories);

      expect(formatted).toContain("Facts");
      expect(formatted).toContain("Preferences");
      expect(formatted).toContain("Fact content");
      expect(formatted).toContain("Pref content");
    });
  });
});
