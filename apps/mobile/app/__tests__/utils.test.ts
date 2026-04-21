// Simple utility function test without React Native imports
function add(a: number, b: number): number {
  return a + b;
}

function formatName(first: string, last: string): string {
  return `${first} ${last}`;
}

describe('Utility Functions', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(0, 0)).toBe(0);
    expect(add(-1, 1)).toBe(0);
  });

  it('should format full name', () => {
    expect(formatName('John', 'Doe')).toBe('John Doe');
    expect(formatName('Jane', 'Smith')).toBe('Jane Smith');
  });
});
