import { Anthropic } from '@anthropic-ai/sdk';
import type { HeatmapRegion, VisionAnalysisResult } from '@aivo/shared-types';

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
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async analyzeBodyPhoto(imageUrl: string): Promise<VisionAnalysisResult> {
    try {
      const response = await this.anthropic.messages.create({
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

      const contentBlock = response.content[0];
      const content = 'text' in contentBlock ? contentBlock.text : undefined;
      if (!content) {
        throw new Error('No response from vision analysis');
      }

      const result = JSON.parse(content) as VisionAnalysisResult;
      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Vision analysis failed:', error);
      throw error;
    }
  }

  // Convert analysis results to heatmap regions with colors
  toHeatmapRegions(analysis: VisionAnalysisResult): HeatmapRegion[] {
    return analysis.regions.map(region => ({
      zoneId: region.zoneId,
      intensity: region.intensity,
      color: this.intensityToColor(region.intensity),
      confidence: region.confidence,
    }));
  }

  private intensityToColor(intensity: number): string {
    // Convert 0-100 to color: green (lean) -> yellow -> red (higher fat)
    // Using Claude's perception: lower intensity = better/leaner = green
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
