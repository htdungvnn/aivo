// Mock OpenAI BEFORE the module uses it
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
  embeddings: {
    create: jest.fn(),
  },
};

// Mock the openai module - must be at top level before any imports
jest.mock("openai", () => ({
  OpenAI: jest.fn().mockImplementation(() => mockOpenAI),
}));

import { ConversationSummarizer } from "../summarizer.ts";

describe("ConversationSummarizer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should extract facts from a conversation about an injury", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              facts: [
                {
                  type: "fact",
                  content: "User has lower back injury from deadlifts",
                  confidence: 0.95,
                  relatedTo: ["injury", "pain"],
                },
              ],
            }),
          },
        },
      ],
    };
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0) }],
    });

    const summarizer = new ConversationSummarizer({
      openaiApiKey: "test-key",
      minConfidence: 0.7,
    });

    const facts = await summarizer.extractFacts("user-123", [
      { role: "user", content: "I injured my lower back deadlifting 3 weeks ago" },
      { role: "assistant", content: "I'm sorry to hear that. Have you seen a doctor?" },
    ]);

    expect(facts).toHaveLength(1);
    expect(facts[0].type).toBe("fact");
    expect(facts[0].content).toContain("lower back injury");
    expect(facts[0].confidence).toBe(0.95);
  });

  it("should extract multiple fact types", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              facts: [
                {
                  type: "preference",
                  content: "User dislikes running",
                  confidence: 0.9,
                  relatedTo: ["food", "dislike"],
                },
                {
                  type: "event",
                  content: "User completed first 5k run",
                  confidence: 0.95,
                  relatedTo: ["running", "achievement"],
                },
                {
                  type: "constraint",
                  content: "User only has 30 minutes for workouts",
                  confidence: 0.85,
                  relatedTo: ["time"],
                },
              ],
            }),
          },
        },
      ],
    };
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0) }],
    });

    const summarizer = new ConversationSummarizer({
      openaiApiKey: "test-key",
    });

    const facts = await summarizer.extractFacts("user-123", [
      { role: "user", content: "I hate running but I just finished my first 5k. I only have 30 minutes for workouts." },
      { role: "assistant", content: "Great achievement! We can work on shorter, efficient runs." },
    ]);

    expect(facts).toHaveLength(3);
    expect(facts.map(f => f.type)).toEqual(["preference", "event", "constraint"]);
  });

  it("should filter out low-confidence facts", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              facts: [
                { type: "fact", content: "High confidence fact", confidence: 0.9 },
                { type: "fact", content: "Low confidence fact", confidence: 0.5 },
              ],
            }),
          },
        },
      ],
    };
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0) }],
    });

    const summarizer = new ConversationSummarizer({
      openaiApiKey: "test-key",
      minConfidence: 0.7,
    });

    const facts = await summarizer.extractFacts("user-123", [
      { role: "user", content: "Test" },
    ]);

    expect(facts).toHaveLength(1);
    expect(facts[0].content).toBe("High confidence fact");
  });

  it("should limit the number of extracted facts", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              facts: Array(10).fill(null).map((_, i) => ({
                type: "fact",
                content: `Fact ${i}`,
                confidence: 0.9,
              })),
            }),
          },
        },
      ],
    };
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0) }],
    });

    const summarizer = new ConversationSummarizer({
      openaiApiKey: "test-key",
      maxFacts: 3,
    });

    const facts = await summarizer.extractFacts("user-123", [
      { role: "user", content: "Lots of information" },
    ]);

    expect(facts.length).toBeLessThanOrEqual(3);
  });

  it("should handle OpenAI API errors gracefully", async () => {
    mockOpenAI.chat.completions.create.mockRejectedValue(new Error("API error"));

    const summarizer = new ConversationSummarizer({
      openaiApiKey: "test-key",
    });

    const facts = await summarizer.extractFacts("user-123", [
      { role: "user", content: "Test" },
    ]);

    expect(facts).toEqual([]);
  });

  it("should map invalid types to valid MemoryType", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              facts: [
                { type: "injury", content: "User has injury", confidence: 0.9 },
                { type: "food", content: "User likes pizza", confidence: 0.85 },
              ],
            }),
          },
        },
      ],
    };
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0) }],
    });

    const summarizer = new ConversationSummarizer({
      openaiApiKey: "test-key",
    });

    const facts = await summarizer.extractFacts("user-123", [
      { role: "user", content: "Test" },
    ]);

    expect(facts[0].type).toBe("fact"); // injury -> fact
    expect(facts[1].type).toBe("preference"); // food -> preference
  });
});
