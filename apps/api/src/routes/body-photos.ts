import { Hono } from "hono";
import type { Context } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import type { R2Bucket, KVNamespace } from "@cloudflare/workers-types";
import { createDrizzleInstance } from "@aivo/db";
import { bodyPhotos, bodyHeatmaps } from "@aivo/db";
import { eq, desc, and } from "drizzle-orm";
import { authenticate, getUserFromContext } from "../middleware/auth";
import { VisionAnalysisService } from "../services/vision-analysis";
import { uploadImage } from "../services/body-insights";
import type { HeatmapRegion } from "@aivo/shared-types";

interface EnvWithR2 {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string;
  BODY_INSIGHTS_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
}

type HeatmapWithPhoto = {
  bodyHeatmaps: typeof bodyHeatmaps.$inferSelect;
  bodyPhotos: typeof bodyPhotos.$inferSelect;
};

export const BodyPhotosRouter = () => {
  const router = new Hono<{ Bindings: EnvWithR2 }>();

  // Helper to get user ID from context
  const getUserId = (c: Context): string | undefined => {
    const user = getUserFromContext(c);
    return user?.id;
  };

  // Upload body photo
  /**
   * @swagger
   * /body-photos/upload:
   *   post:
   *     summary: Upload body photo
   *     description: Upload a body photo for analysis and heatmap generation. Photo is stored in R2 and metadata in database.
   *     tags: [body-photos]
   *     security:
   *       - bearer: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               photo:
   *                 type: string
   *                 format: binary
   *                 description: Body image file (JPEG, PNG, WebP)
   *             required:
   *               - photo
   *     responses:
   *       200:
   *         description: Photo uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 photo:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     userId:
   *                       type: string
   *                     r2Url:
   *                       type: string
   *                     thumbnailUrl:
   *                       type: string
   *                     uploadDate:
   *                       type: integer
   *                     analysisStatus:
   *                       type: string
   *                       enum: [pending, processing, completed, failed]
   *       400:
   *         description: No photo provided
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Upload failed
   */
  router.post('/upload', authenticate, async (c) => {
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
    const { key } = await uploadImage(c.env.R2_BUCKET, {
      userId,
      image: Buffer.from(bytes),
      filename,
      contentType: `image/${ext}`,
      metadata: {},
    });

    // Construct the public URL using R2_PUBLIC_URL
    const baseUrl = c.env.R2_PUBLIC_URL?.replace(/\/$/, '') || '';
    const r2Url = `${baseUrl}/${key}`;

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
  /**
   * @swagger
   * /body-photos/{id}/analyze:
   *   post:
   *     summary: Analyze body photo
   *     description: Trigger AI vision analysis on a pending body photo to generate heatmap and metrics
   *     tags: [body-photos]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Photo ID to analyze
   *     responses:
   *       200:
   *         description: Analysis completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 heatmap:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     userId:
   *                       type: string
   *                     photoId:
   *                       type: string
   *                     regions:
   *                       type: array
   *                     metrics:
   *                       type: object
   *                 analysis:
   *                   type: object
   *                   description: Full vision analysis results
   *       404:
   *         description: Photo not found or already analyzed
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Analysis failed
   */
  router.post('/:id/analyze', authenticate, async (c) => {
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
      // eslint-disable-next-line no-console
      console.error('Analysis failed:', error);
      // Mark as failed
      await drizzle.update(bodyPhotos)
        .set({ analysisStatus: 'failed' as const })
        .where(eq(bodyPhotos.id, id));

      return c.json({ error: 'Analysis failed', details: error instanceof Error ? error.message : String(error) }, 500);
    }
  });

  // Get current heatmap (latest analysis)
  /**
   * @swagger
   * /body-heatmap/current:
   *   get:
   *     summary: Get current heatmap
   *     description: Retrieve the most recent body heatmap analysis for the authenticated user
   *     tags: [body-photos]
   *     security:
   *       - bearer: []
   *     responses:
   *       200:
   *         description: Current heatmap retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 heatmap:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     userId:
   *                       type: string
   *                     timestamp:
   *                       type: integer
   *                     imageUrl:
   *                       type: string
   *                     vectorData:
   *                       type: array
   *                     regions:
   *                       type: array
   *                     metrics:
   *                       type: object
   *                 photo:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     r2Url:
   *                       type: string
   *                     uploadDate:
   *                       type: integer
   *       401:
   *         description: Unauthorized
   */
  router.get('/heatmap/current', authenticate, async (c) => {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const drizzle = createDrizzleInstance(c.env.DB);

    const results = await drizzle
      .select({
        bodyHeatmaps,
        bodyPhotos,
      })
      .from(bodyHeatmaps)
      .innerJoin(bodyPhotos, eq(bodyPhotos.id, bodyHeatmaps.photoId))
      .where(eq(bodyHeatmaps.userId, userId))
      .orderBy(desc(bodyHeatmaps.createdAt))
      .limit(1);

    const row = results[0] as HeatmapWithPhoto | undefined;
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
  /**
   * @swagger
   * /body-heatmap/history:
   *   get:
   *     summary: Get heatmap history
   *     description: Retrieve historical body heatmap analyses for the authenticated user
   *     tags: [body-photos]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 10
   *         description: Maximum number of results
   *     responses:
   *       200:
   *         description: Heatmap history retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 history:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       heatmap:
   *                         type: object
   *                       photo:
   *                         type: object
   *       401:
   *         description: Unauthorized
   */
  router.get('/heatmap/history', authenticate, async (c) => {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const limit = Math.min(Number(c.req.query('limit') || '10'), 50);
    const drizzle = createDrizzleInstance(c.env.DB);

    const results = await drizzle
      .select({
        bodyHeatmaps,
        bodyPhotos,
      })
      .from(bodyHeatmaps)
      .innerJoin(bodyPhotos, eq(bodyPhotos.id, bodyHeatmaps.photoId))
      .where(eq(bodyHeatmaps.userId, userId))
      .orderBy(desc(bodyHeatmaps.createdAt))
      .limit(limit);

    return c.json({
      history: results.map((row): { heatmap: { regions: unknown; metrics: Record<string, unknown>; [key: string]: unknown }; photo: { id: string; r2Url: string; uploadDate: number } } => {
        const r = row as HeatmapWithPhoto;
        return {
          heatmap: {
            ...r.bodyHeatmaps,
            regions: JSON.parse(r.bodyHeatmaps.regions),
            metrics: JSON.parse(r.bodyHeatmaps.metrics || '{}'),
          },
          photo: {
            id: r.bodyPhotos.id,
            r2Url: r.bodyPhotos.r2Url,
            uploadDate: r.bodyPhotos.uploadDate,
          },
        };
      }),
    });
  });

  // Get heatmap by ID
  /**
   * @swagger
   * /body-heatmap/{id}:
   *   get:
   *     summary: Get heatmap by ID
   *     description: Retrieve a specific body heatmap analysis by its ID
   *     tags: [body-photos]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Heatmap ID
   *     responses:
   *       200:
   *         description: Heatmap retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 heatmap:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     userId:
   *                       type: string
   *                     timestamp:
   *                       type: integer
   *                     imageUrl:
   *                       type: string
   *                     vectorData:
   *                       type: array
   *                     regions:
   *                       type: array
   *                     metrics:
   *                       type: object
   *                 photo:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     r2Url:
   *                       type: string
   *                     uploadDate:
   *                       type: integer
   *       404:
   *         description: Heatmap not found
   *       401:
   *         description: Unauthorized
   */
  router.get('/heatmap/:id', authenticate, async (c) => {
    const id = c.req.param('id') as string;
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const drizzle = createDrizzleInstance(c.env.DB);

    const results = await drizzle
      .select({
        bodyHeatmaps,
        bodyPhotos,
      })
      .from(bodyHeatmaps)
      .innerJoin(bodyPhotos, eq(bodyPhotos.id, bodyHeatmaps.photoId))
      .where(and(eq(bodyHeatmaps.id, id), eq(bodyHeatmaps.userId, userId)))
      .limit(1);

    const row = results[0] as HeatmapWithPhoto | undefined;
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
  /**
   * @swagger
   * /body-heatmap/compare/{heatmapId1}/{heatmapId2}:
   *   get:
   *     summary: Compare two heatmaps
   *     description: Compare two body heatmaps to show progress over time. heatmapId2 is optional; if omitted, compares to the previous analysis.
   *     tags: [body-photos]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: heatmapId1
   *         required: true
   *         schema:
   *           type: string
   *         description: First (current) heatmap ID
   *       - in: path
   *         name: heatmapId2
   *         required: false
   *         schema:
   *           type: string
   *         description: Second (previous) heatmap ID; if omitted, uses most recent prior analysis
   *     responses:
   *       200:
   *         description: Comparison complete
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 current:
   *                   type: object
   *                 previous:
   *                   type: object
   *                   nullable: true
   *                 differences:
   *                   type: object
   *                   additionalProperties:
   *                     type: object
   *                     properties:
   *                       current:
   *                         type: number
   *                       previous:
   *                         type: number
   *                       change:
   *                         type: number
   *                       trend:
   *                         type: string
   *                         enum: [improved, regressed, stable]
   *       404:
   *         description: Primary heatmap not found
   *       401:
   *         description: Unauthorized
   */
  router.get('/heatmap/compare/:heatmapId1/:heatmapId2?', authenticate, async (c) => {
    const { heatmapId1, heatmapId2 } = c.req.param();
    const userId = getUserId(c);
    const drizzle = createDrizzleInstance(c.env.DB);

    const [heatmap1, heatmap2] = await Promise.all([
      drizzle.query.bodyHeatmaps.findFirst({
        where: and(eq(bodyHeatmaps.id, heatmapId1!), eq(bodyHeatmaps.userId, userId!)),
      }),
      heatmapId2
        ? drizzle.query.bodyHeatmaps.findFirst({
            where: and(eq(bodyHeatmaps.id, heatmapId2!), eq(bodyHeatmaps.userId, userId!)),
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
  /**
   * @swagger
   * /body-photos/{id}:
   *   delete:
   *     summary: Delete body photo
   *     description: Delete a body photo and its associated heatmap analysis. Requires ownership.
   *     tags: [body-photos]
   *     security:
   *       - bearer: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Photo ID to delete
   *     responses:
   *       200:
   *         description: Photo deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *       404:
   *         description: Photo not found
   *       401:
   *         description: Unauthorized
   */
  router.delete('/:id', authenticate, async (c) => {
    const id = c.req.param('id') as string;
    const userId = getUserId(c);
    const drizzle = createDrizzleInstance(c.env.DB);

    // Find photo and verify ownership
    const photo = await drizzle.query.bodyPhotos.findFirst({
      where: and(eq(bodyPhotos.id, id!), eq(bodyPhotos.userId, userId!)),
    });

    if (!photo) {
      return c.json({ error: 'Photo not found' }, 404);
    }

    // Delete from database (cascade will delete associated heatmap)
    await drizzle.delete(bodyPhotos).where(eq(bodyPhotos.id, id!));

    return c.json({ success: true });
  });

  return router;
};
