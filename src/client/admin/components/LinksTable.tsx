import type { LinkIndexItem } from '../services/api';
import LinkStatusChip from './LinkStatusChip';
import { useNewRequestsStatus } from '../hooks/useNewRequestsStatus';

interface LinksTableProps {
  links: LinkIndexItem[];
  onEdit: (link: LinkIndexItem) => void;
  onDelete: (link: LinkIndexItem) => void;
  onCopy: (code: string) => void;
  isRefreshing?: boolean;
}

export default function LinksTable({ links, onEdit, onDelete, onCopy, isRefreshing = false }: LinksTableProps) {
  const { newRequestsMap } = useNewRequestsStatus(links);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (links.length === 0) {
    return (
      <div className="empty-state">
        <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <p className="empty-state-text">לא נמצאו לינקים</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      {isRefreshing && (
        <div className="table-loading-overlay">
          <div className="table-loading-spinner" />
        </div>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>שם</th>
            <th>קוד</th>
            <th>לוח יעד</th>
            <th>נוצר ע"י</th>
            <th>תאריך</th>
            <th>סטטוס</th>
            <th className="table-actions-column">
              <span>פעולות</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.code} className="table-row group">
              <td className="table-name-cell">
                {link.name || 'לינק ללא שם'}
              </td>
              <td>
                <button
                  className="code-copy-btn"
                  onClick={() => onCopy(link.code)}
                  title="העתק קוד"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {link.code}
                </button>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {link.boardUrl ? (
                    <a
                      href={link.boardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="board-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {link.boardName}
                    </a>
                  ) : (
                    link.boardName
                  )}
                  {newRequestsMap[link.code] && (
                    <span className="new-requests-badge" title="יש פניות חדשות">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                        <circle cx="4" cy="4" r="4" />
                      </svg>
                    </span>
                  )}
                </div>
              </td>
              <td className="table-secondary-text">{link.creatorName || 'לא ידוע'}</td>
              <td className="table-secondary-text">{formatDate(link.createdAt)}</td>
              <td>
                <LinkStatusChip isActive={link.isActive !== false} />
              </td>
              <td className="table-actions-cell">
                <div className="table-actions-buttons">
                  <button
                    className="table-action-btn table-action-btn-edit"
                    onClick={() => onEdit(link)}
                    title="ערוך"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="table-action-btn table-action-btn-copy"
                    onClick={() => onCopy(link.code)}
                    title="העתק קוד"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  <button
                    className="table-action-btn table-action-btn-delete"
                    onClick={() => onDelete(link)}
                    title="מחק"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

