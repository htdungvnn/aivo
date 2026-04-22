import { Hono } from "hono";
import type { Context } from "hono";
import type { D1Database } from "drizzle-orm/d1";
import type { R2Bucket, KVNamespace } from "@cloudflare/workers-types";
import { createDrizzleInstance } from "@aivo/db";
import { bodyPhotos, bodyHeatmaps } from "@aivo/db";
import { eq, desc, and } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { VisionAnalysisService } from "../services/vision-analysis";
import { uploadImage } from "../services/body-insights";
import type { HeatmapRegion } from "@aivo/shared-types";

interface EnvWithR2 {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  BODY_INSIGHTS_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
}

export const BodyPhotosRouter = () => {
  const router = new Hono<{ Bindings: EnvWithR2 }>();

  // Helper to get user ID from context
  const getUserId = (c: Context): string | undefined => {
    const user = c.get('user') as { id: string } | undefined;
    return user?.id;
  };

  // Upload body photo
  router.post('/body-photos/upload', authenticate, async (c) => {
    const formData = await c.req.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return c.json({ error: 'No photo provided' }, 400);
    }

    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `body-photos/${userId}/${crypto.randomUUID()}.${ext}`;

    // Upload to R2
    const bytes = await file.arrayBuffer();
    const uploadResult = await uploadImage(c.env.R2_BUCKET, {
      userId,
      image: Buffer.from(bytes),
      filename,
      contentType: `image/${ext}`,
      metadata: {},
    });

    // Get the public URL
    const r2Url = uploadResult.url;

    // Create drizzle instance
    const drizzle = createDrizzleInstance(c.env.DB);

    // Store in database
    const [photo] = await drizzle.insert(bodyPhotos).values({
      id: crypto.randomUUID(),
      userId,
      r2Url,
      thumbnailUrl: r2Url,
      uploadDate: Math.floor(Date.now() / 1000),
      analysisStatus: 'pending',
      poseDetected: 0,
      metadata: JSON.stringify({
        size: bytes.byteLength,
        originalName: file.name,
        contentType: `image/${ext}`,
      }),
    }).returning();

    return c.json({ photo });
  });

  // Analyze a pending photo
  router.post('/body-photos/:id/analyze', authenticate, async (c) => {
    const id = c.req.param('id') as string;
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const drizzle = createDrizzleInstance(c.env.DB);

    // Verify ownership and pending status
    const photo = await drizzle.query.bodyPhotos.findFirst({
      where: (tbl) =>
        and(
          eq(tbl.id, id),
          eq(tbl.userId, userId),
          eq(tbl.analysisStatus, 'pending')
        ),
    });

    if (!photo) {
      return c.json({ error: 'Photo not found or already analyzed' }, 404);
    }

    try {
      // Update status to processing
      await drizzle.update(bodyPhotos)
        .set({ analysisStatus: 'processing' as const })
        .where(eq(bodyPhotos.id, id));

      // Run vision analysis
      if (!c.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured");
      }
      const visionService = new VisionAnalysisService(c.env.OPENAI_API_KEY);
      const analysis = await visionService.analyzeBodyPhoto(photo.r2Url);
      const heatmapRegions = visionService.toHeatmapRegions(analysis);

      // Store heatmap results
      const [heatmap] = await drizzle.insert(bodyHeatmaps).values({
        id: crypto.randomUUID(),
        userId: userId!,
        photoId: id,
        regions: JSON.stringify(heatmapRegions),
        metrics: JSON.stringify(analysis.metrics),
        createdAt: Math.floor(Date.now() / 1000),
      }).returning();

      // Update photo as completed with pose detection
      await drizzle.update(bodyPhotos)
        .set({
          analysisStatus: 'completed' as const,
          poseDetected: analysis.pose !== 'unknown' ? 1 : 0,
        })
        .where(eq(bodyPhotos.id, id));

      return c.json({
        heatmap: {
          ...heatmap,
          regions: heatmapRegions,
          metrics: analysis.metrics,
        },
        analysis,
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      // Mark as failed
      await drizzle.update(bodyPhotos)
        .set({ analysisStatus: 'failed' as const })
        .where(eq(bodyPhotos.id, id));

      return c.json({ error: 'Analysis failed', details: error instanceof Error ? error.message : String(error) }, 500);
    }
  });

  // Get current heatmap (latest analysis)
  router.get('/body-heatmap/current', authenticate, async (c) => {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const drizzle = createDrizzleInstance(c.env.DB);

    const results = await drizzle
      .select({
        bodyHeatmaps: true,
        bodyPhotos: true,
      })
      .from(bodyHeatmaps)
      .innerJoin(bodyPhotos, eq(bodyPhotos.id, bodyHeatmaps.photoId))
      .where(eq(bodyHeatmaps.userId, userId))
      .orderBy(desc(bodyHeatmaps.createdAt))
      .limit(1);

    const row = results[0];
    if (!row) {
      return c.json({ heatmap: null, photo: null });
    }

    return c.json({
      heatmap: {
        ...row.bodyHeatmaps,
        regions: JSON.parse(row.bodyHeatmaps.regions),
        metrics: JSON.parse(row.bodyHeatmaps.metrics || '{}'),
      },
      photo: {
        id: row.bodyPhotos.id,
        r2Url: row.bodyPhotos.r2Url,
        uploadDate: row.bodyPhotos.uploadDate,
      },
    });
  });

  // Get heatmap history
  router.get('/body-heatmap/history', authenticate, async (c) => {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const limit = Math.min(Number(c.req.query('limit') || '10'), 50);
    const drizzle = createDrizzleInstance(c.env.DB);

    const results = await drizzle
      .select({
        bodyHeatmaps: true,
        bodyPhotos: true,
      })
      .from(bodyHeatmaps)
      .innerJoin(bodyPhotos, eq(bodyPhotos.id, bodyHeatmaps.photoId))
      .where(eq(bodyHeatmaps.userId, userId))
      .orderBy(desc(bodyHeatmaps.createdAt))
      .limit(limit);

    return c.json({
      history: results.map((row) => ({
        heatmap: {
          ...row.bodyHeatmaps,
          regions: JSON.parse(row.bodyHeatmaps.regions),
          metrics: JSON.parse(row.bodyHeatmaps.metrics || '{}'),
        },
        photo: {
          id: row.bodyPhotos.id,
          r2Url: row.bodyPhotos.r2Url,
          uploadDate: row.bodyPhotos.uploadDate,
        },
      })),
    });
  });

  // Get heatmap by ID
  router.get('/body-heatmap/:id', authenticate, async (c) => {
    const id = c.req.param('id') as string;
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const drizzle = createDrizzleInstance(c.env.DB);

    const results = await drizzle
      .select({
        bodyHeatmaps: true,
        bodyPhotos: true,
      })
      .from(bodyHeatmaps)
      .innerJoin(bodyPhotos, eq(bodyPhotos.id, bodyHeatmaps.photoId))
      .where(and(eq(bodyHeatmaps.id, id), eq(bodyHeatmaps.userId, userId)))
      .limit(1);

    const row = results[0];
    if (!row) {
      return c.json({ error: 'Heatmap not found' }, 404);
    }

    return c.json({
      heatmap: {
        ...row.bodyHeatmaps,
        regions: JSON.parse(row.bodyHeatmaps.regions),
        metrics: JSON.parse(row.bodyHeatmaps.metrics || '{}'),
      },
      photo: {
        id: row.bodyPhotos.id,
        r2Url: row.bodyPhotos.r2Url,
        uploadDate: row.bodyPhotos.uploadDate,
      },
    });
  });

  // Compare two heatmaps (progress view)
  router.get('/body-heatmap/compare/:heatmapId1/:heatmapId2?', authenticate, async (c) => {
    const { heatmapId1, heatmapId2 } = c.req.param();
    const userId = getUserId(c);
    const drizzle = createDrizzleInstance(c.env.DB);

    const [heatmap1, heatmap2] = await Promise.all([
      drizzle.query.bodyHeatmaps.findFirst({
        where: and(eq(bodyHeatmaps.id, heatmapId1), eq(bodyHeatmaps.userId, userId)),
      }),
      heatmapId2
        ? drizzle.query.bodyHeatmaps.findFirst({
            where: and(eq(bodyHeatmaps.id, heatmapId2), eq(bodyHeatmaps.userId, userId)),
          })
        : null,
    ]);

    if (!heatmap1) {
      return c.json({ error: 'Primary heatmap not found' }, 404);
    }

    const regions1 = JSON.parse(heatmap1.regions);
    const regions2 = heatmap2 ? JSON.parse(heatmap2.regions) : null;

    // Calculate differences between heatmaps
    const differences: Record<string, { current: number; previous: number; change: number; trend: 'improved' | 'regressed' | 'stable' }> = {};

    regions1.forEach((region: HeatmapRegion) => {
      const prev = regions2?.find((r: HeatmapRegion) => r.zoneId === region.zoneId);
      const current = region.intensity;
      const previous = prev?.intensity ?? current;
      const change = previous - current;
      let trend: 'improved' | 'regressed' | 'stable' = 'stable';
      if (change > 5) {
        trend = 'improved';
      } else if (change < -5) {
        trend = 'regressed';
      }

      differences[region.zoneId] = { current, previous, change, trend };
    });

    return c.json({
      current: {
        ...heatmap1,
        regions: regions1,
        metrics: JSON.parse(heatmap1.metrics || '{}'),
      },
      previous: heatmap2
        ? {
            ...heatmap2,
            regions: regions2,
            metrics: JSON.parse(heatmap2.metrics || '{}'),
          }
        : null,
      differences,
    });
  });

  // Delete a body photo (and associated heatmap)
  router.delete('/body-photos/:id', authenticate, async (c) => {
    const id = c.req.param('id') as string;
    const userId = getUserId(c);
    const drizzle = createDrizzleInstance(c.env.DB);

    // Find photo and verify ownership
    const photo = await drizzle.query.bodyPhotos.findFirst({
      where: and(eq(bodyPhotos.id, id), eq(bodyPhotos.userId, userId)),
    });

    if (!photo) {
      return c.json({ error: 'Photo not found' }, 404);
    }

    // Delete from database (cascade will delete associated heatmap)
    await drizzle.delete(bodyPhotos).where(eq(bodyPhotos.id, id));

    return c.json({ success: true });
  });

  return router;
};
