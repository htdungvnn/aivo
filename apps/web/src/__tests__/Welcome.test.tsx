import { render, screen } from '@testing-library/react';
import React from 'react';

// Simple component for testing
const Welcome: React.FC<{ name: string }> = ({ name }) => {
  return <h1>Welcome, {name}!</h1>;
};

describe('Welcome Component', () => {
  it('renders the welcome message with the provided name', () => {
    render(<Welcome name="AIVO User" />);
    expect(screen.getByText('Welcome, AIVO User!')).toBeInTheDocument();
  });

  it('renders with different names', () => {
    const { rerender } = render(<Welcome name="John" />);
    expect(screen.getByText('Welcome, John!')).toBeInTheDocument();

    rerender(<Welcome name="Jane" />);
    expect(screen.getByText('Welcome, Jane!')).toBeInTheDocument();
  });
});
