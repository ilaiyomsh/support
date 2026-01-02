import type { FilterType } from '../hooks/useLinksFilter';

interface DashboardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onCreateClick: () => void;
  onOpenInstallLink?: () => void;
}

export default function DashboardToolbar({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  onCreateClick,
  onOpenInstallLink
}: DashboardToolbarProps) {
  return (
    <div className="dashboard-toolbar">
      {/* שורה ראשונה - כותרת */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '16px' }}>
        <h1 className="dashboard-title" style={{ margin: 0 }}>
          ניהול טפסי פנייה
        </h1>
        {onOpenInstallLink && (
          <button
            className="btn btn-secondary btn-medium"
            onClick={onOpenInstallLink}
            title="פתח קישור התקנת אפליקציה אצל הלקוח"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            התקנה אצל הלקוח
          </button>
        )}
      </div>
      
      {/* שורה שנייה - חיפוש וכפתורים */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', width: '100%' }}>
        <div className="toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="search-input-wrapper">
            <svg className="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="חפש לפי שם או קוד..."
            />
          </div>
          
          {/* Button Group */}
          <div className="button-group">
            <button
              className={`button-group-btn ${filter === 'mine' ? 'active' : ''}`}
              onClick={() => onFilterChange('mine')}
            >
              שלי
            </button>
            <button
              className={`button-group-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => onFilterChange('all')}
            >
              הכל
            </button>
          </div>

          <button
            className="btn btn-primary btn-medium toolbar-create-btn"
            onClick={onCreateClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            צור קישור חדש
          </button>
        </div>
      </div>
    </div>
  );
}
