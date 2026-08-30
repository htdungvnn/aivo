'use client';

/**
 * Delete Account Page
 * Process for deleting user account
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useRequireActiveAccount } from '@/components/auth/AuthProvider';
import { getAuthClient } from '@repo/api-client';
import styles from './delete-account.module.css';

export default function DeleteAccountPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { canAccess } = useRequireActiveAccount();
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmationValid = confirmationText.toLowerCase() === 'delete';

  const handleDeleteAccount = async () => {
    if (!isConfirmationValid) {
      alert('Please type "DELETE" to confirm');
      return;
    }

    const confirmed = confirm(
      'This action is permanent. All your data will be deleted and cannot be recovered. Are you absolutely sure?'
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const authClient = getAuthClient();
      await authClient.deleteAccount();
      alert('Your account has been deleted.');
      router.push('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!canAccess) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.icon}>⚠️</span>
          <h1>Delete Account</h1>
          <p className={styles.subtitle}>
            This action is permanent and cannot be undone
          </p>
        </div>

        <div className={styles.warningBox}>
          <h3>What will be deleted:</h3>
          <ul className={styles.warningList}>
            <li>Permanently remove your profile</li>
            <li>Delete all your data and content</li>
            <li>Remove access to all premium features</li>
            <li>Cancel any active subscriptions</li>
            <li>End all active sessions</li>
          </ul>
          <p className={styles.warningNote}>
            Your data will be removed from our servers within 30 days.
          </p>
        </div>

        <div className={styles.confirmationSection}>
          <label className={styles.confirmationLabel}>
            Type <strong>DELETE</strong> to confirm:
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="DELETE"
            className={styles.confirmationInput}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleDeleteAccount}
            disabled={!isConfirmationValid || isDeleting}
            className={styles.deleteButton}
          >
            {isDeleting ? 'Deleting...' : 'Delete My Account'}
          </button>
          <button
            onClick={() => router.back()}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
