/// <reference types="jest" />
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as formAnalyzer from '../services/form-analyzer';
import type { AnalysisResult } from '@aivo/shared-types';

describe('Form Analyzer - analyzeFormVideo', () => {
  const mockValidResult: AnalysisResult = {
    overallScore: 85,
    grade: 'A',
    issues: [
      {
        type: 'knee_valgus',
        severity: 'moderate',
        confidence: 0.85,
        timestampMs: 5000,
        description: 'Knees caving inward',
        impact: 'safety',
      },
    ],
    corrections: [
      {
        issueType: 'knee_valgus',
        drillName: 'Cues: Screw feet into floor',
        description: 'Focus on pushing knees outward',
        steps: ['Step 1', 'Step 2'],
        cues: ['Push knees out'],
        durationSeconds: 60,
        difficulty: 'beginner',
        equipment: [],
      },
    ],
    summary: {
      strengths: ['Good depth'],
      primaryConcern: 'Knee valgus',
      priority: 'medium',
    },
  };

  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('successfully analyzes video with valid OpenAI response', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockValidResult) } }],
      }),
    });

    const result = await formAnalyzer.analyzeFormVideo('https://example.com/video.mp4', 'squat', 'test-api-key');

    expect(result).toEqual(mockValidResult);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('throws error when apiKey is missing', async () => {
    await expect(formAnalyzer.analyzeFormVideo('url', 'squat', '')).rejects.toThrow('OpenAI API key not configured');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('handles OpenAI API errors (non-ok response)', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Internal server error' } }),
    });

    await expect(formAnalyzer.analyzeFormVideo('url', 'squat', 'key')).rejects.toThrow('Internal server error');
  });

  it('handles rate limiting with 429 status', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    await expect(formAnalyzer.analyzeFormVideo('url', 'squat', 'key')).rejects.toThrow('OpenAI rate limit exceeded. Please try again later.');
  });

  it('handles network failures', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));

    await expect(formAnalyzer.analyzeFormVideo('url', 'squat', 'key')).rejects.toThrow('Network error');
  });

  it('handles invalid JSON response', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'invalid json string' } }] }),
    });

    await expect(formAnalyzer.analyzeFormVideo('url', 'squat', 'key')).rejects.toThrow('Unexpected token');
  });

  it('handles missing content in response', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: {} }] }),
    });

    await expect(formAnalyzer.analyzeFormVideo('url', 'squat', 'key')).rejects.toThrow('Empty response from AI');
  });

  it('uses squat prompt by default for unknown exercise types', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(mockValidResult) } }] }),
    });

    await formAnalyzer.analyzeFormVideo('url', 'unknown' as any, 'key');

    const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    const messageContent = requestBody.messages[0].content[0].text;
    expect(messageContent).toContain('squat form analysis');
  });

  it('passes AbortSignal to fetch', async () => {
    const abortController = new AbortController();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(mockValidResult) } }] }),
    });

    await formAnalyzer.analyzeFormVideo('url', 'squat', 'key', abortController.signal);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: abortController.signal })
    );
  });
});
