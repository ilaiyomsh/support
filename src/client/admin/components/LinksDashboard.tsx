import { useState } from 'react';
import { useLinksIndex } from '../hooks/useLinksIndex';
import { useLinksFilter, type FilterType } from '../hooks/useLinksFilter';
import { adminApi, type LinkIndexItem } from '../services/api';
import DashboardToolbar from './DashboardToolbar';
import LinksTable from './LinksTable';
import LinkConfigModal from './LinkConfigModal';
import { useToast } from './ToastContainer';

export default function LinksDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedLink, setSelectedLink] = useState<LinkIndexItem | null>(null);

  const { links, isLoading, isRefreshing, refreshIndex, removeLinkFromIndex } = useLinksIndex();
  const filteredLinks = useLinksFilter({ links, searchQuery, filter });
  const { success, error } = useToast();

  const handleCreate = () => {
    setSelectedLink(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (link: LinkIndexItem) => {
    setSelectedLink(link);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDelete = async (link: LinkIndexItem) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הלינק "${link.name}"?`)) {
      return;
    }

    try {
      await adminApi.deleteLink(link.code);
      await removeLinkFromIndex(link.code);
      success('הלינק נמחק בהצלחה');
    } catch (err) {
      console.error('Error deleting link:', err);
      error('שגיאה במחיקת הלינק');
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      success('הקוד הועתק ללוח');
    } catch (err) {
      console.error('Error copying code:', err);
      error('שגיאה בהעתקת הקוד');
    }
  };

  const INSTALL_LINK = 'https://auth.monday.com/oauth2/authorize?client_id=0e40d583bba8deca2032ce65c3687b2a&response_type=install';

  const handleOpenInstallLink = () => {
    window.open(INSTALL_LINK, '_blank', 'noopener,noreferrer');
  };

  const handleModalSuccess = () => {
    refreshIndex(false);
    success(modalMode === 'create' ? 'הלינק נוצר בהצלחה' : 'הלינק עודכן בהצלחה');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedLink(null);
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <div className="loading-text">טוען לינקים...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <DashboardToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={setFilter}
          onCreateClick={handleCreate}
          onOpenInstallLink={handleOpenInstallLink}
        />

        {filteredLinks.length === 0 ? (
          <div className="dashboard-empty-state">
            <div className="empty-state">
              <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <p className="empty-state-text">
                {links.length === 0 ? 'אין לינקים עדיין' : 'לא נמצאו לינקים'}
              </p>
              {links.length === 0 && (
                <p className="empty-state-subtext">
                  צור את הקישור הראשון כדי להתחיל
                </p>
              )}
            </div>
            {links.length === 0 && (
              <button
                className="btn btn-primary btn-medium empty-state-button"
                onClick={handleCreate}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                צור את הקישור הראשון
              </button>
            )}
          </div>
        ) : (
          <LinksTable
            links={filteredLinks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCopy={handleCopy}
            isRefreshing={isRefreshing}
          />
        )}

        <LinkConfigModal
          isOpen={isModalOpen}
          mode={modalMode}
          linkCode={selectedLink?.code}
          initialData={
            selectedLink
              ? {
                  linkName: selectedLink.name,
                  boardId: selectedLink.boardId,
                  boardName: selectedLink.boardName
                }
              : undefined
          }
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      </div>
    </div>
  );
}

