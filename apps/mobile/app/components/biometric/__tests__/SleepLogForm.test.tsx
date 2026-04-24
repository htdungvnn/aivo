import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock expo-secure-store before biometric-api is imported
jest.mock('expo-secure-store', () => ({
  getItem: async (key) => {
    if (key === 'aivo_token') return 'test-jwt-token';
    if (key === 'aivo_user_id') return 'user-123';
    return null;
  },
  setItem: async (key, value) => {},
  removeItem: async (key) => {},
  clear: async () => {},
  getItemAsync: async (key) => {
    if (key === 'aivo_token') return 'test-jwt-token';
    if (key === 'aivo_user_id') return 'user-123';
    return null;
  },
  setItemAsync: async (key, value) => {},
  deleteItemAsync: async (key) => {},
  clearAsync: async () => {},
}));

// Mock the API
jest.mock('@/services/biometric-api', () => ({
  createSleepLog: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Import component AFTER mocks are set up
import SleepLogForm from '../SleepLogForm';
import * as biometricApi from '@/services/biometric-api';

// Debug: check if SleepLogForm is defined
console.log('SleepLogForm import:', SleepLogForm);

describe('SleepLogForm', () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Alert.alert to automatically trigger the first button's onPress (OK button)
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      if (buttons && buttons.length > 0 && buttons[0].onPress) {
        buttons[0].onPress();
      }
    });
    (biometricApi.createSleepLog as jest.Mock).mockResolvedValue({
      id: 'sleep-1',
      date: '2025-04-22',
      durationHours: 7.5,
      qualityScore: 85,
      notes: 'Good sleep',
    });
  });

  it('should render all form fields', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} />);

    // Verify labels are present
    expect(screen.getByText('Date')).toBeTruthy();
    expect(screen.getByText('Sleep Duration (hours)')).toBeTruthy();
    expect(screen.getByText('Sleep Quality (%)')).toBeTruthy();
    expect(screen.getByText('Notes (optional)')).toBeTruthy();
  });

  it('should have empty initial values', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} />);

    const durationInput = screen.getByPlaceholderText('e.g., 7.5');
    const qualityInput = screen.getByPlaceholderText('0-100');

    expect(durationInput.props.value).toBe('');
    expect(qualityInput.props.value).toBe('');
  });

  it('should allow changing duration', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} />);

    const durationInput = screen.getByPlaceholderText('e.g., 7.5');
    fireEvent.changeText(durationInput, '8');

    expect(durationInput.props.value).toBe('8');
  });

  it('should allow changing quality', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} />);

    const qualityInput = screen.getByPlaceholderText('0-100');
    fireEvent.changeText(qualityInput, '90');

    expect(qualityInput.props.value).toBe('90');
  });

  it('should allow entering notes', () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} />);

    const notesInput = screen.getByPlaceholderText(/Any factors affecting your sleep/i);
    fireEvent.changeText(notesInput, 'Felt great today');

    expect(notesInput.props.value).toBe('Felt great today');
  });

  it('should call onSuccess after successful submission', async () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} />);

    const durationInput = screen.getByPlaceholderText('e.g., 7.5');
    const qualityInput = screen.getByPlaceholderText('0-100');

    fireEvent.changeText(durationInput, '8');
    fireEvent.changeText(qualityInput, '90');

    const saveButton = screen.getByText('Save Sleep Log');
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

  it('should call onSuccess callback after successful submission', async () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} />);

    const durationInput = screen.getByPlaceholderText('e.g., 7.5');
    fireEvent.changeText(durationInput, '8');

    const saveButton = screen.getByText('Save Sleep Log');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should handle API errors', async () => {
    (biometricApi.createSleepLog as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    render(<SleepLogForm onSuccess={mockOnSuccess} />);

    const saveButton = screen.getByText('Save Sleep Log');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it('should validate duration is positive', async () => {
    render(<SleepLogForm onSuccess={mockOnSuccess} />);

    const durationInput = screen.getByPlaceholderText('e.g., 7.5');
    fireEvent.changeText(durationInput, '-5');

    const saveButton = screen.getByText('Save Sleep Log');
    fireEvent.press(saveButton);

    // Alert should show error; API should not be called
    await waitFor(() => {
      expect(biometricApi.createSleepLog).not.toHaveBeenCalled();
    });
  });

  it('should disable button during submission', async () => {
    (biometricApi.createSleepLog as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<SleepLogForm onSuccess={mockOnSuccess} />);

    const saveButton = screen.getByText('Save Sleep Log');
    fireEvent.press(saveButton);

    // Button should be disabled
    expect(saveButton).toBeDisabled();
  });

  it('should show error alert on submission failure', async () => {
    (biometricApi.createSleepLog as jest.Mock).mockRejectedValue(
      new Error('Failed to save')
    );

    render(<SleepLogForm onSuccess={mockOnSuccess} />);

    // Provide valid duration to pass validation
    const durationInput = screen.getByPlaceholderText('e.g., 7.5');
    fireEvent.changeText(durationInput, '8');

    const saveButton = screen.getByText('Save Sleep Log');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to save sleep log. Please try again.'
      );
    });
  });
});
