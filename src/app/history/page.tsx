'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Filter, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, MessageSquare, RefreshCw, Inbox } from 'lucide-react';
import '../globals.css';

interface MessageLog {
  id: number;
  phone_number: string;
  message: string;
  file_url: string | null;
  status: 'success' | 'failed';
  error_reason: string | null;
  wa_message_id: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate date options
  const dateOptions = useCallback(() => {
    const options = [
      { value: 'all', label: 'All Time' },
      { value: 'today', label: 'Today' },
      { value: 'yesterday', label: 'Yesterday' }
    ];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (i === 0) label = `This Month (${label})`;
      else if (i === 1) label = `Last Month (${label})`;
      options.push({ value, label });
    }
    options.push({ value: 'custom', label: 'Custom Date Range' });
    return options;
  }, [])();

  const fetchHistory = useCallback(async (page = 1, showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const queryParams: Record<string, string> = {
        page: String(page),
        limit: '15',
        status: statusFilter,
        month: monthFilter,
        search: searchQuery,
      };

      if (monthFilter === 'custom') {
        if (startDate) queryParams.startDate = startDate;
        if (endDate) queryParams.endDate = endDate;
      }

      const params = new URLSearchParams(queryParams);
      const res = await fetch(`/api/whatsapp/history?${params}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, monthFilter, searchQuery, startDate, endDate, router]);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const truncateMessage = (msg: string, maxLen = 60) => {
    if (!msg) return '—';
    return msg.length > maxLen ? msg.substring(0, maxLen) + '...' : msg;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory(1);
  };

  return (
    <div className="container" style={{ maxWidth: '1100px' }}>
      <div className="dashboard-card">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => router.push('/')} className="history-back-btn">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <MessageSquare size={22} color="var(--accent-primary)" />
                <h1 className="title" style={{ fontSize: '1.5rem', marginBottom: 0 }}>Message History</h1>
              </div>
              <p className="subtitle" style={{ fontSize: '0.9rem' }}>Track all sent messages and their delivery status</p>
            </div>
          </div>
          <button
            onClick={() => fetchHistory(pagination.page, true)}
            className="history-refresh-btn"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="history-filters">
          <form onSubmit={handleSearch} className="history-search-form">
            <Search size={16} className="history-search-icon" />
            <input
              type="text"
              placeholder="Search by phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="history-search-input"
            />
          </form>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="history-status-filter">
              <Clock size={14} />
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="history-select"
              >
                {dateOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {monthFilter === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="history-search-input"
                  style={{ padding: '0.65rem 1rem', width: 'auto' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="history-search-input"
                  style={{ padding: '0.65rem 1rem', width: 'auto' }}
                />
              </div>
            )}
            <div className="history-status-filter">
              <Filter size={14} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="history-select"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="history-stats">
          <span className="history-stat-item">
            <span className="history-stat-count">{pagination.total}</span> Total Messages
          </span>
          {statusFilter !== 'all' && (
            <span className="history-stat-badge" onClick={() => setStatusFilter('all')}>
              {statusFilter === 'success' ? '✓ Success' : '✗ Failed'} &times;
            </span>
          )}
        </div>

        {/* Content */}
        <div className="history-content">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div className="loader" style={{ margin: '0 auto' }}></div>
              <p className="info-text" style={{ marginTop: '1rem' }}>Loading message history...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">
                <Inbox size={48} />
              </div>
              <h3>No Messages Found</h3>
              <p>
                {searchQuery || statusFilter !== 'all' || monthFilter !== 'all'
                  ? 'No messages match your current filters. Try adjusting them.'
                  : 'Messages you send will appear here with their delivery status.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Phone</th>
                      <th>Message</th>
                      <th style={{ width: '100px' }}>Status</th>
                      <th>Details</th>
                      <th style={{ width: '140px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr key={log.id} className="history-row">
                        <td className="history-id">
                          {(pagination.page - 1) * pagination.limit + i + 1}
                        </td>
                        <td>
                          <span className="history-phone">{log.phone_number}</span>
                        </td>
                        <td>
                          <span className="history-message" title={log.message}>
                            {truncateMessage(log.message)}
                          </span>
                          {log.file_url && (
                            <span className="history-attachment-badge">📎 File</span>
                          )}
                        </td>
                        <td>
                          <span className={`history-status-pill ${log.status}`}>
                            {log.status === 'success' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            {log.status === 'success' ? 'Sent' : 'Failed'}
                          </span>
                        </td>
                        <td>
                          {log.status === 'failed' && log.error_reason ? (
                            <span className="history-error-text" title={log.error_reason}>
                              {truncateMessage(log.error_reason, 40)}
                            </span>
                          ) : log.status === 'success' ? (
                            <span className="history-success-id" title={log.wa_message_id || ''}>
                              Delivered
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="history-date">
                            <span>{formatDate(log.created_at)}</span>
                            <span className="history-time">{formatTime(log.created_at)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards (shown on small screens) */}
              <div className="history-cards-mobile">
                {logs.map((log, i) => (
                  <div key={log.id} className="history-card-mobile">
                    <div className="history-card-header">
                      <span className="history-phone">{log.phone_number}</span>
                      <span className={`history-status-pill ${log.status}`}>
                        {log.status === 'success' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {log.status === 'success' ? 'Sent' : 'Failed'}
                      </span>
                    </div>
                    <p className="history-card-message">{truncateMessage(log.message, 100)}</p>
                    {log.status === 'failed' && log.error_reason && (
                      <div className="history-card-error">{log.error_reason}</div>
                    )}
                    <div className="history-card-footer">
                      <Clock size={12} />
                      <span>{formatDate(log.created_at)} at {formatTime(log.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="history-pagination">
                  <button
                    className="history-page-btn"
                    onClick={() => fetchHistory(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <div className="history-page-numbers">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(p => {
                        // Show first, last, and pages near current
                        return p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1;
                      })
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="history-page-ellipsis">...</span>
                          )}
                          <button
                            className={`history-page-num ${p === pagination.page ? 'active' : ''}`}
                            onClick={() => fetchHistory(p)}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>
                  <button
                    className="history-page-btn"
                    onClick={() => fetchHistory(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
