'use client';

/**
 * Admin Panel - User Management
 * Admin-only page for managing users
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useRequireAdmin } from '@/components/auth/AuthProvider';
import { getAuthClient } from '@repo/api-client';
import styles from './admin.module.css';

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  createdAt: number;
  roles: string[];
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { canAccess, hasRole } = useRequireAdmin();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (canAccess && hasRole) {
      loadUsers();
    }
  }, [canAccess, hasRole, page, filterStatus]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const authClient = getAuthClient();
      const response = await authClient.adminGetUsers({
        page,
        pageSize,
        status: filterStatus,
        search: searchQuery,
      });

      setUsers(response.users || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just reload with current filters
    loadUsers();
  };

  const handleSuspendUser = async (userId: string) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;

    setActionLoading(userId);
    try {
      const authClient = getAuthClient();
      await authClient.adminSuspendUser(userId);
      await loadUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to suspend user:', error);
      alert('Failed to suspend user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reactivate this user?')) return;

    setActionLoading(userId);
    try {
      const authClient = getAuthClient();
      await authClient.adminReactivateUser(userId);
      await loadUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to reactivate user:', error);
      alert('Failed to reactivate user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignRole = async (userId: string, role: string) => {
    try {
      const authClient = getAuthClient();
      await authClient.adminAssignRole(userId, role);
      await loadUsers();
    } catch (error) {
      console.error('Failed to assign role:', error);
      alert('Failed to assign role');
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    if (!confirm(`Remove ${role} role from this user?`)) return;

    try {
      const authClient = getAuthClient();
      await authClient.adminRemoveRole(userId, role);
      await loadUsers();
    } catch (error) {
      console.error('Failed to remove role:', error);
      alert('Failed to remove role');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#22c55e';
      case 'suspended':
        return '#ef4444';
      case 'pending_verification':
        return '#f59e0b';
      default:
        return '#999';
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!canAccess || !hasRole) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h1>Access Denied</h1>
          <p>You do not have permission to access this page.</p>
          <button onClick={() => router.push('/dashboard')} className={styles.backButton}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Admin Panel</h1>
        <div className={styles.headerInfo}>
          <span>Logged in as: {user?.email}</span>
        </div>
      </header>

      <main className={styles.main}>
        {/* Search and Filter */}
        <div className={styles.toolbar}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or name..."
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              Search
            </button>
          </form>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Users Table */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Status</th>
                <th>Roles</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingUsers ? (
                <tr>
                  <td colSpan={6} className={styles.loadingRow}>
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.userAvatar}>
                          {u.displayName?.charAt(0) || u.email.charAt(0)}
                        </div>
                        <span>{u.displayName || 'No name'}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span
                        className={styles.statusBadge}
                        style={{ backgroundColor: getStatusColor(u.status) }}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rolesCell}>
                        {u.roles.map((role) => (
                          <span key={role} className={styles.roleBadge}>
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <button
                        onClick={() => setSelectedUser(u)}
                        className={styles.manageButton}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={styles.pageButton}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={styles.pageButton}
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* User Management Modal */}
      {selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Manage User</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.userInfo}>
                <div className={styles.userAvatarLarge}>
                  {selectedUser.displayName?.charAt(0) || selectedUser.email.charAt(0)}
                </div>
                <div>
                  <p className={styles.userName}>
                    {selectedUser.displayName || 'No name'}
                  </p>
                  <p className={styles.userEmail}>{selectedUser.email}</p>
                  <span
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(selectedUser.status) }}
                  >
                    {selectedUser.status}
                  </span>
                </div>
              </div>

              <div className={styles.actionSection}>
                <h3>Account Status</h3>
                {selectedUser.status === 'suspended' ? (
                  <button
                    onClick={() => handleReactivateUser(selectedUser.id)}
                    disabled={actionLoading === selectedUser.id}
                    className={styles.actionButton}
                  >
                    {actionLoading === selectedUser.id ? 'Reactivating...' : 'Reactivate User'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSuspendUser(selectedUser.id)}
                    disabled={actionLoading === selectedUser.id}
                    className={`${styles.actionButton} ${styles.danger}`}
                  >
                    {actionLoading === selectedUser.id ? 'Suspending...' : 'Suspend User'}
                  </button>
                )}
              </div>

              <div className={styles.actionSection}>
                <h3>Roles</h3>
                <div className={styles.rolesList}>
                  {selectedUser.roles.map((role) => (
                    <div key={role} className={styles.roleItem}>
                      <span className={styles.roleName}>{role}</span>
                      {role !== 'admin' && (
                        <button
                          onClick={() => handleRemoveRole(selectedUser.id, role)}
                          className={styles.removeRoleButton}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!selectedUser.roles.includes('admin') && (
                  <button
                    onClick={() => handleAssignRole(selectedUser.id, 'admin')}
                    className={styles.assignRoleButton}
                  >
                    Make Admin
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
