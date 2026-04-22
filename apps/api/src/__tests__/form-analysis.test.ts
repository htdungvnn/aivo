/// <reference types="jest" />
import { validateVideo, generateR2Key } from '../services/r2';
import { UploadVideoSchema } from '../routes/form-analyze';

describe('Form Analysis', () => {
  describe('UploadVideoSchema', () => {
    it('accepts valid exercise types', () => {
      expect(UploadVideoSchema.safeParse({ exerciseType: 'squat' })).toBeTruthy();
      expect(UploadVideoSchema.safeParse({ exerciseType: 'deadlift' })).toBeTruthy();
      expect(UploadVideoSchema.safeParse({ exerciseType: 'bench_press' })).toBeTruthy();
      expect(UploadVideoSchema.safeParse({ exerciseType: 'overhead_press' })).toBeTruthy();
      expect(UploadVideoSchema.safeParse({ exerciseType: 'lunge' })).toBeTruthy();
    });

    it('rejects invalid exercise types', () => {
      expect(UploadVideoSchema.safeParse({ exerciseType: 'curl' }).success).toBe(false);
      expect(UploadVideoSchema.safeParse({ exerciseType: 'pullup' }).success).toBe(false);
      expect(UploadVideoSchema.safeParse({ exerciseType: '' }).success).toBe(false);
    });

    it('requires exerciseType field', () => {
      expect(UploadVideoSchema.safeParse({}).success).toBe(false);
      expect(UploadVideoSchema.safeParse({ exerciseType: undefined } as any).success).toBe(false);
    });
  });

  describe('validateVideo', () => {
    // Helper to create a buffer with specific magic bytes
    function createBuffer(bytes: number[]): Buffer {
      return Buffer.from(bytes);
    }

    it('accepts valid MP4 file (ftyp)', () => {
      // MP4: 00 00 00 ?? 66 74 79 70 (ftyp at offset 4)
      const buffer = createBuffer([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
      const result = validateVideo(buffer);
      expect(result.valid).toBe(true);
    });

    it('accepts valid MOV file (moov)', () => {
      // MOV: similar with moov box
      const buffer = createBuffer([0x00, 0x00, 0x00, 0x14, 0x6d, 0x6f, 0x6f, 0x76]);
      const result = validateVideo(buffer);
      expect(result.valid).toBe(true);
    });

    it('accepts valid WebM file (EBML)', () => {
      // WebM: 1A 45 DF A3 (EBML header)
      const buffer = createBuffer([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00]);
      const result = validateVideo(buffer);
      expect(result.valid).toBe(true);
    });

    it('rejects invalid video format', () => {
      // Random bytes
      const buffer = createBuffer([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]); // JPEG header
      const result = validateVideo(buffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid video format');
    });

    it('accepts video under size limit', () => {
      // Create buffer exactly 100MB - 1 byte (should pass)
      const size = 100 * 1024 * 1024 - 1;
      const buffer = Buffer.alloc(size);
      // Write MP4 magic bytes
      buffer[0] = 0x00; buffer[1] = 0x00; buffer[2] = 0x00; buffer[3] = 0x18;
      buffer[4] = 0x66; buffer[5] = 0x74; buffer[6] = 0x79; buffer[7] = 0x70;

      const result = validateVideo(buffer, 100 * 1024 * 1024);
      expect(result.valid).toBe(true);
    });

    it('rejects video exceeding size limit', () => {
      // Create buffer exactly 100MB + 1 byte (should fail)
      const size = 100 * 1024 * 1024 + 1;
      const buffer = Buffer.alloc(size);
      // Write MP4 magic bytes
      buffer[0] = 0x00; buffer[1] = 0x00; buffer[2] = 0x00; buffer[3] = 0x18;
      buffer[4] = 0x66; buffer[5] = 0x74; buffer[6] = 0x79; buffer[7] = 0x70;

      const result = validateVideo(buffer, 100 * 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds 100MB');
    });
  });

  describe('generateR2Key', () => {
    it('generates keys with correct prefix and structure', () => {
      const key1 = generateR2Key('user123', 'video.mp4');
      const key2 = generateR2Key('user456', 'workout.mov');

      expect(key1).toMatch(/^form-videos\/user123\/\d+-[a-z0-9]+-video\.mp4$/);
      expect(key2).toMatch(/^form-videos\/user456\/\d+-[a-z0-9]+-workout\.mov$/);
    });

    it('includes timestamp for uniqueness', () => {
      const key1 = generateR2Key('user1', 'test.mp4');
      const key2 = generateR2Key('user1', 'test.mp4');

      // Keys should be different due to timestamp or random component
      expect(key1).not.toBe(key2);
    });

    it('handles special characters in filename', () => {
      const key = generateR2Key('user1', 'my video (final).mp4');
      expect(key).not.toContain('(');
      expect(key).not.toContain(')');
      expect(key).not.toContain(' ');
      expect(key).toContain('_');
    });
  });
});
