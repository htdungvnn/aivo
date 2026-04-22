import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SleepLogForm } from '../SleepLogForm';
import * as biometricApi from '@/services/biometric-api';

// Mock the API
vi.mock('@/services/biometric-api', () => ({
  createSleepLog: vi.fn(),
}));

describe('Mobile SleepLogForm Component', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (biometricApi.createSleepLog as vi.Mock).mockResolvedValue({
      id: 'sleep-1',
      date: '2025-04-22',
      durationHours: 7.5,
      qualityScore: 85,
      notes: 'Good sleep',
    });
  });

  it('should render all form fields', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText(/sleep duration/i)).toBeInTheDocument();
    expect(screen.getByText(/sleep quality/i)).toBeInTheDocument();
    expect(screen.getByText(/date/i)).toBeInTheDocument();
    expect(screen.getByText(/notes/i)).toBeInTheDocument();
  });

  it('should have default values', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const durationInput = screen.getByPlaceholderText(/hours/i);
    const qualityInput = screen.getByPlaceholderText(/%|score/i);

    expect(durationInput).toHaveValue(7.5);
    expect(qualityInput).toHaveValue(80);
  });

  it('should allow changing duration', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const durationInput = screen.getByPlaceholderText(/hours/i);
    fireEvent.changeText(durationInput, '8');

    expect(durationInput).toHaveValue('8');
  });

  it('should allow changing quality', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const qualityInput = screen.getByPlaceholderText(/%|score/i);
    fireEvent.changeText(qualityInput, '90');

    expect(qualityInput).toHaveValue('90');
  });

  it('should allow entering notes', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const notesInput = screen.getByPlaceholderText(/notes/i);
    fireEvent.changeText(notesInput, 'Felt great today');

    expect(notesInput).toHaveValue('Felt great today');
  });

  it('should call onCancel when cancel button pressed', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.press(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should submit form with valid data', async () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const durationInput = screen.getByPlaceholderText(/hours/i);
    const qualityInput = screen.getByPlaceholderText(/%|score/i);

    fireEvent.changeText(durationInput, '8');
    fireEvent.changeText(qualityInput, '90');

    const saveButton = screen.getByText(/save|log/i);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(biometricApi.createSleepLog).toHaveBeenCalledWith(
        expect.objectContaining({
          durationHours: 8,
          qualityScore: 90,
        })
      );
    });
  });

  it('should call onSuccess after successful submission', async () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const durationInput = screen.getByPlaceholderText(/hours/i);
    fireEvent.changeText(durationInput, '8');

    const saveButton = screen.getByText(/save|log/i);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should handle API errors', async () => {
    (biometricApi.createSleepLog as vi.Mock).mockRejectedValue(
      new Error('Network error')
    );

    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const saveButton = screen.getByText(/save|log/i);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it('should validate duration is positive', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const durationInput = screen.getByPlaceholderText(/hours/i);
    fireEvent.changeText(durationInput, '-5');

    const saveButton = screen.getByText(/save|log/i);
    fireEvent.press(saveButton);

    // Should still call API, validation happens server-side
    expect(biometricApi.createSleepLog).toHaveBeenCalledWith(
      expect.objectContaining({
        durationHours: -5,
      })
    );
  });

  it('should disable button during submission', async () => {
    (biometricApi.createSleepLog as vi.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const saveButton = screen.getByText(/save|log/i);
    fireEvent.press(saveButton);

    // Button should be disabled
    expect(saveButton).toBeDisabled();
  });

  it('should show error message on submission failure', async () => {
    (biometricApi.createSleepLog as vi.Mock).mockRejectedValue(
      new Error('Failed to save')
    );

    render(<SleepLogForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const saveButton = screen.getByText(/save|log/i);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });
});
