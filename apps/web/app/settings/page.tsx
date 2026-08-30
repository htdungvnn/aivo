'use client';

/**
 * Settings Page
 * User settings and session management
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useRequireActiveAccount } from '@/components/auth/AuthProvider';
import { getAuthClient, Session } from '@repo/api-client';
import styles from './settings.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const { user, session, roles, isLoading } = useAuth();
  const { canAccess, needsVerification, isSuspended } = useRequireActiveAccount();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (canAccess) {
      loadSessions();
    }
  }, [canAccess]);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const authClient = getAuthClient();
      const response = await authClient.getSessions();
      setSessions(response.sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to end this session?')) return;

    setIsRevoking(sessionId);
    try {
      const authClient = getAuthClient();
      await authClient.revokeSession(sessionId);
      await loadSessions();
    } catch (error) {
      console.error('Failed to revoke session:', error);
      alert('Failed to revoke session');
    } finally {
      setIsRevoking(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('This will sign you out from all other devices. Continue?')) return;

    try {
      const authClient = getAuthClient();
      await authClient.revokeAllSessions();
      await loadSessions();
      alert('All other sessions have been terminated');
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
      alert('Failed to revoke sessions');
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;

    try {
      const authClient = getAuthClient();
      await authClient.logout();
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const handleDeleteAccount = () => {
    router.push('/settings/delete-account');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceInfo = (sess: Session) => {
    const device = sess.deviceName || sess.clientType || 'Unknown Device';
    const platform = sess.platform || sess.userAgent || 'Unknown platform';
    return { device, platform };
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
      <header className={styles.header}>
        <h1>Settings</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Sign Out
        </button>
      </header>

      <main className={styles.main}>
        {/* Profile Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>
          <div className={styles.card}>
            <div className={styles.profileInfo}>
              <div className={styles.avatar}>
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" />
                ) : (
                  <span>{user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}</span>
                )}
              </div>
              <div className={styles.userDetails}>
                <p className={styles.userName}>{user?.displayName || 'User'}</p>
                <p className={styles.userEmail}>{user?.email}</p>
                <span className={styles.statusBadge}>{user?.status}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Roles</h2>
          <div className={styles.card}>
            <div className={styles.rolesList}>
              {roles.map((role) => (
                <span key={role} className={styles.roleBadge}>
                  {role}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Verification Warning */}
        {needsVerification && (
          <section className={styles.section}>
            <div className={styles.warningCard}>
              <span className={styles.warningIcon}>📧</span>
              <div className={styles.warningContent}>
                <h3>Email Not Verified</h3>
                <p>Verify your email to access all features.</p>
              </div>
              <button
                onClick={() => router.push('/verify-email')}
                className={styles.warningButton}
              >
                Verify Now
              </button>
            </div>
          </section>
        )}

        {/* Sessions Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Active Sessions</h2>
            <button
              onClick={handleRevokeAllSessions}
              className={styles.revokeAllButton}
              disabled={sessions.length <= 1}
            >
              Sign out all other devices
            </button>
          </div>

          <div className={styles.sessionsList}>
            {isLoadingSessions ? (
              <div className={styles.loading}>Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className={styles.empty}>No active sessions</div>
            ) : (
              sessions.map((sess) => {
                const { device, platform } = getDeviceInfo(sess);
                const isCurrent = sess.id === session?.id;

                return (
                  <div key={sess.id} className={styles.sessionCard}>
                    <div className={styles.sessionInfo}>
                      <div className={styles.sessionHeader}>
                        <span className={styles.deviceIcon}>
                          {platform.toLowerCase().includes('ios') ||
                          platform.toLowerCase().includes('android')
                            ? '📱'
                            : '💻'}
                        </span>
                        <div>
                          <p className={styles.deviceName}>
                            {device}
                            {isCurrent && (
                              <span className={styles.currentBadge}>Current</span>
                            )}
                          </p>
                          <p className={styles.platformName}>{platform}</p>
                        </div>
                      </div>
                      <div className={styles.sessionMeta}>
                        <p>
                          <span className={styles.metaLabel}>Last active:</span>{' '}
                          {formatDate(sess.lastActiveAt)}
                        </p>
                        <p>
                          <span className={styles.metaLabel}>Created:</span>{' '}
                          {formatDate(sess.createdAt)}
                        </p>
                        {sess.ipAddress && (
                          <p>
                            <span className={styles.metaLabel}>IP:</span> {sess.ipAddress}
                          </p>
                        )}
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        disabled={isRevoking === sess.id}
                        className={styles.revokeButton}
                      >
                        {isRevoking === sess.id ? 'Revoking...' : 'End Session'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Account Actions */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <div className={styles.accountActions}>
            <button
              onClick={handleDeleteAccount}
              className={styles.deleteAccountButton}
            >
              Delete Account
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
