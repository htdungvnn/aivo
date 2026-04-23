import { cn } from '../utils';

describe('cn (className merger)', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('handles array of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles object syntax', () => {
    expect(cn('foo', { bar: true, baz: false })).toBe('foo bar');
  });

  it('trims extra whitespace', () => {
    expect(cn('  foo  ', '  bar  ')).toBe('foo bar');
  });

  it('handles complex Tailwind conflicts with twMerge', () => {
    // Test that conflicting utilities are resolved correctly
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('flex', 'block')).toBe('block');
  });

  it('handles responsive classes', () => {
    expect(cn('p-4', 'md:p-8', 'lg:p-12')).toBe('p-4 md:p-8 lg:p-12');
  });

  it('handles dark mode variants', () => {
    expect(cn('bg-white', 'dark:bg-gray-900')).toBe('bg-white dark:bg-gray-900');
  });

  it('handles state variants', () => {
    expect(cn('hover:bg-blue-500', 'focus:ring-2')).toBe('hover:bg-blue-500 focus:ring-2');
  });

  it('works with empty string', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('handles nested arrays', () => {
    expect(cn(['foo', ['bar', 'baz']], 'qux')).toBe('foo bar baz qux');
  });

  it('preserves order when merging', () => {
    expect(cn('first', 'second', 'third')).toBe('first second third');
  });

  it('handles numeric values (converted to string)', () => {
    expect(cn('p', 4)).toBe('p 4');
  });
});
