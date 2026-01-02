import { useState, useEffect, useRef } from 'react';
import type { ColumnMapping } from '@shared/types';
import type { Column } from '../types/board.types';
import type { Board } from '../types/board.types';
import { useBoards } from '../hooks/useBoards';
import { useBoardColumns } from '../hooks/useBoardColumns';
import { validateMapping } from '../utils/mappingValidator';
import { useLinkMutation } from '../hooks/useLinkMutation';

interface LinkConfigModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  linkCode?: string;
  initialData?: {
    linkName?: string;
    boardId?: string;
    boardName?: string;
    columnMapping?: ColumnMapping;
    formTitle?: string;
    formDescription?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

// Icons
const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#6366f1' }}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const DatabaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const LayoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const SaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);


// Custom Dropdown Component (without search)
const CustomDropdown = ({
  options,
  selectedId,
  placeholder,
  onSelect,
  isLoading
}: {
  options: { id: string; title: string }[];
  selectedId?: string;
  placeholder: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === selectedId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid #e2e8f0', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 36px 10px 12px',
          fontSize: '14px',
          border: `1px solid ${selectedId ? '#6366f1' : '#e2e8f0'}`,
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          color: selectedId ? '#6366f1' : '#64748b',
          fontWeight: selectedId ? '500' : '400',
          textAlign: 'right',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ flex: 1, textAlign: 'right' }}>
          {selectedOption?.title || placeholder}
        </span>
        <div style={{ 
          color: selectedId ? '#6366f1' : '#94a3b8',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          <ChevronDownIcon />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          zIndex: 100000,
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {options.length === 0 ? (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '14px',
            }}>
              אין אפשרויות זמינות
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSelect(option.id);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  border: 'none',
                  backgroundColor: option.id === selectedId ? '#eef2ff' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'right',
                  fontSize: '14px',
                  color: option.id === selectedId ? '#6366f1' : '#374151',
                  fontWeight: option.id === selectedId ? '500' : '400',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (option.id !== selectedId) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (option.id !== selectedId) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ flex: 1, textAlign: 'right' }}>{option.title}</span>
                {option.id === selectedId && (
                  <div style={{ color: '#6366f1' }}>
                    <CheckIcon />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Custom Board Selector with Search
const BoardSelector = ({
  boards,
  selectedBoardId,
  selectedBoardName,
  onSelect,
  isLoading
}: {
  boards: Board[];
  selectedBoardId: string;
  selectedBoardName: string;
  onSelect: (boardId: string, boardName: string) => void;
  isLoading: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredBoards = boards.filter(b => 
    b.type === 'board' && 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (board: Board) => {
    onSelect(board.id, board.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', height: '44px' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid #e2e8f0', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', maxWidth: '400px' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 40px 12px 16px',
          fontSize: '14px',
          border: `1px solid ${selectedBoardId ? '#6366f1' : '#e2e8f0'}`,
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          color: selectedBoardId ? '#6366f1' : '#64748b',
          fontWeight: selectedBoardId ? '500' : '400',
          textAlign: 'right',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ flex: 1, textAlign: 'right' }}>
          {selectedBoardName || 'בחר לוח...'}
        </span>
        <div style={{ 
          color: selectedBoardId ? '#6366f1' : '#94a3b8',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          <ChevronDownIcon />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          zIndex: 100000,
          maxHeight: '320px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Search Input */}
          <div style={{
            padding: '12px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}>
              <div style={{ color: '#94a3b8' }}>
                <SearchIcon />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש לוח..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  backgroundColor: 'transparent',
                  textAlign: 'right',
                }}
              />
            </div>
          </div>

          {/* Options List */}
          <div style={{
            overflowY: 'auto',
            maxHeight: '240px',
          }}>
            {filteredBoards.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '14px',
              }}>
                {searchQuery ? 'לא נמצאו לוחות תואמים' : 'אין לוחות זמינים'}
              </div>
            ) : (
              filteredBoards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => handleSelect(board)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    border: 'none',
                    backgroundColor: board.id === selectedBoardId ? '#eef2ff' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'right',
                    fontSize: '14px',
                    color: board.id === selectedBoardId ? '#6366f1' : '#374151',
                    fontWeight: board.id === selectedBoardId ? '500' : '400',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (board.id !== selectedBoardId) {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (board.id !== selectedBoardId) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ flex: 1, textAlign: 'right' }}>{board.name}</span>
                  {board.id === selectedBoardId && (
                    <div style={{ color: '#6366f1' }}>
                      <CheckIcon />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  sectionIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6366f1',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  formField: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: '8px',
    textAlign: 'right' as const,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '80px',
  },
  boardSelect: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '0',
  },
  boardSelectLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: '12px',
  },
  select: {
    width: '100%',
    maxWidth: '400px',
    padding: '12px 40px 12px 16px',
    fontSize: '14px',
    border: '1px solid #6366f1',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#6366f1',
    fontWeight: '500' as const,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
  },
  selectWrapper: {
    position: 'relative' as const,
    maxWidth: '400px',
  },
  selectIcon: {
    position: 'absolute' as const,
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6366f1',
    pointerEvents: 'none' as const,
  },
  hint: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '8px',
  },
  mappingTable: {
    borderTop: '1px solid #e2e8f0',
  },
  mappingHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    padding: '12px 20px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '12px',
    fontWeight: '600' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
  },
  mappingRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
    alignItems: 'center',
  },
  mappingLabel: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#374151',
  },
  mappingSelect: {
    width: '100%',
    padding: '10px 36px 10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#64748b',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
  },
  mappingSelectWrapper: {
    position: 'relative' as const,
  },
  fixedValue: {
    padding: '10px 12px',
    fontSize: '14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#64748b',
    fontStyle: 'italic' as const,
  },
  fixedHint: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  btnPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600' as const,
    color: '#ffffff',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  btnSecondary: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#64748b',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

// Mapping Row Component
const MappingRow = ({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  columns,
  columnType,
  isLoading,
  isFixed,
  fixedValue
}: { 
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  columns?: Column[];
  columnType?: string | string[];
  isLoading?: boolean;
  isFixed?: boolean;
  fixedValue?: string;
}) => {
  const filteredColumns = columns?.filter(col => {
    if (!columnType) return true;
    if (Array.isArray(columnType)) {
      return columnType.includes(col.type);
    }
    return col.type === columnType;
  }) || [];

  const options = filteredColumns.map(col => ({ id: col.id, title: col.title }));

  return (
    <div style={styles.mappingRow}>
      <div style={styles.mappingLabel}>{label}</div>
      <div>
        {isFixed ? (
          <div>
            <div style={styles.fixedValue}>{fixedValue}</div>
            <div style={styles.fixedHint}>ערך זה נוצר אוטומטית</div>
          </div>
        ) : (
          <CustomDropdown
            options={options}
            selectedId={value}
            placeholder={placeholder || 'בחר עמודה...'}
            onSelect={(id) => onChange?.(id)}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default function LinkConfigModal({
  isOpen,
  mode,
  linkCode,
  initialData,
  onClose,
  onSuccess
}: LinkConfigModalProps) {
  const [linkName, setLinkName] = useState('');
  const [boardId, setBoardId] = useState('');
  const [boardName, setBoardName] = useState('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // State חדש עבור אינדיקטור פניות חדשות
  const [indicatorEnabled, setIndicatorEnabled] = useState(false);
  const [statusColumnId, setStatusColumnId] = useState('');
  const [statusLabel, setStatusLabel] = useState('');

  const { boards, isLoading: isLoadingBoards } = useBoards();
  const { allColumns, statusColumns, statusColumnsWithSettings, boardUrl, isLoading: isLoadingColumns } = useBoardColumns(boardId);
  const { createLink, updateLink, fetchFullLinkDetails, isLoading: isMutating, error: mutationError } = useLinkMutation();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Load and set form data when modal opens
  useEffect(() => {
    if (!isOpen) {
      setLinkName('');
      setBoardId('');
      setBoardName('');
      setColumnMapping({});
      setFormTitle('');
      setFormDescription('');
      setIsLoadingDetails(false);
      setIndicatorEnabled(false);
      setStatusColumnId('');
      setStatusLabel('');
      return;
    }

    if (mode === 'create') {
      setLinkName('');
      setBoardId('');
      setBoardName('');
      setColumnMapping({});
      setFormTitle('');
      setFormDescription('');
      setIsLoadingDetails(false);
      setIndicatorEnabled(false);
      setStatusColumnId('');
      setStatusLabel('');
      return;
    }

    if (mode === 'edit' && linkCode) {
      if (initialData?.linkName) {
        setLinkName(initialData.linkName);
      }
      
      if (initialData) {
        setBoardId(initialData.boardId || '');
        setBoardName(initialData.boardName || '');
        setFormTitle(initialData.formTitle || '');
        setFormDescription(initialData.formDescription || '');
      }
      
      setIsLoadingDetails(true);
      fetchFullLinkDetails(linkCode)
        .then((linkConfig) => {
          if (linkConfig) {
            setBoardId(linkConfig.targetConfig?.boardId || initialData?.boardId || '');
            setBoardName(linkConfig.targetConfig?.boardName || initialData?.boardName || '');
            setColumnMapping(linkConfig.columnMapping || {});
            setFormTitle(linkConfig.formConfig?.title || initialData?.formTitle || '');
            setFormDescription(linkConfig.formConfig?.description || initialData?.formDescription || '');
            
            // טען הגדרות אינדיקטור
            if (linkConfig.newRequestIndicator) {
              setIndicatorEnabled(linkConfig.newRequestIndicator.enabled || false);
              setStatusColumnId(linkConfig.newRequestIndicator.statusColumnId || '');
              setStatusLabel(linkConfig.newRequestIndicator.targetStatusLabel || '');
            } else {
              setIndicatorEnabled(false);
              setStatusColumnId('');
              setStatusLabel('');
            }
          }
        })
        .catch((err) => {
          console.error('Error loading link details:', err);
          if (initialData) {
            setBoardId(initialData.boardId || '');
            setBoardName(initialData.boardName || '');
            setColumnMapping(initialData.columnMapping || {});
            setFormTitle(initialData.formTitle || '');
            setFormDescription(initialData.formDescription || '');
          }
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    }
  }, [isOpen, mode, linkCode, initialData, fetchFullLinkDetails]);

  const handleSave = async () => {
    const validation = validateMapping(columnMapping, allColumns);
    if (!validation.isValid) {
      console.error('Validation errors:', validation.errors);
      return;
    }

    if (!linkName.trim() || !boardId || !boardName) {
      console.error('Missing required fields');
      return;
    }

    try {
      const newRequestIndicator = indicatorEnabled && statusColumnId && statusLabel ? {
        enabled: true,
        statusColumnId,
        targetStatusLabel: statusLabel,
        targetStatusIndex: (() => {
          const selectedCol = statusColumnsWithSettings.find(c => c.id === statusColumnId);
          const selectedLabel = selectedCol?.settings?.labels?.find(l => l.label === statusLabel);
          return selectedLabel?.index ?? 0;
        })()
      } : undefined;

      if (mode === 'create') {
        await createLink({
          linkName: linkName.trim(),
          boardId,
          boardName,
          boardUrl,
          columnMapping,
          formTitle: formTitle.trim() || '',
          formDescription: formDescription.trim() || '',
          newRequestIndicator
        });
      } else if (linkCode) {
        await updateLink(linkCode, {
          linkName: linkName.trim(),
          boardId,
          boardName,
          boardUrl,
          columnMapping,
          formTitle: formTitle.trim() || '',
          formDescription: formDescription.trim() || '',
          newRequestIndicator
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving link:', error);
    }
  };

  const updateField = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', width: '100%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingsIcon />
            הגדרות לינק
          </h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="סגור">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="modal-content" style={{ backgroundColor: '#f8fafc' }}>
          {isLoadingDetails ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '14px', color: '#64748b' }}>טוען פרטי לינק...</div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              {/* Section 1: Link & Form Settings */}
              <div style={styles.sectionHeader}>
                <div style={styles.sectionIcon}>
                  <FileTextIcon />
                </div>
                <span style={styles.sectionTitle}>הגדרות הקישור והטופס</span>
              </div>

              <div style={styles.card}>
                <div style={styles.formField}>
                  <label style={styles.label}>שם הקישור (לשימוש פנימי)</label>
                  <input
                    type="text"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="תן שם לקישור הזה..."
                    style={styles.input}
                  />
                </div>

                <div style={styles.formField}>
                  <label style={styles.label}>כותרת טופס</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="הכותרת שתוצג ללקוח"
                    style={styles.input}
                  />
                </div>

                <div style={{ ...styles.formField, marginBottom: 0 }}>
                  <label style={styles.label}>תיאור טופס</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="תיאור שיוצג ללקוח"
                    style={styles.textarea}
                    rows={3}
                  />
                </div>
              </div>

              {/* Section 2: Board & Mapping */}
              <div style={styles.sectionHeader}>
                <div style={styles.sectionIcon}>
                  <DatabaseIcon />
                </div>
                <span style={styles.sectionTitle}>חיבור ללוח ומיפוי נתונים</span>
              </div>

              <div style={{ ...styles.card, padding: 0, overflow: 'visible' }}>
                {/* Board Selection */}
                <div style={styles.boardSelect}>
                  <div style={styles.boardSelectLabel}>
                    <LayoutIcon />
                    לאיזה לוח במערכת ייכנסו הפניות?
                  </div>
                  <BoardSelector
                    boards={boards}
                    selectedBoardId={boardId}
                    selectedBoardName={boardName}
                    onSelect={(id, name) => {
                      setBoardId(id);
                      setBoardName(name);
                      setColumnMapping({});
                      // איפוס האינדיקטור בעת שינוי לוח
                      setIndicatorEnabled(false);
                      setStatusColumnId('');
                      setStatusLabel('');
                    }}
                    isLoading={isLoadingBoards}
                  />
               
                </div>

                {/* --- NEW FEATURE UI: New Request Indicator --- */}
                {boardId && (
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e0e7ff',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    overflow: 'visible',
                    marginTop: '16px',
                    marginBottom: '16px',
                    marginLeft: '24px',
                    marginRight: '24px'
                  }}>
                    {/* Feature Header/Toggle */}
                    <div style={{
                      padding: '16px',
                      backgroundColor: 'rgba(99, 102, 241, 0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: indicatorEnabled ? '1px solid #e0e7ff' : 'none'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#312e81',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}>
                        <div style={{ color: '#6366f1' }}>
                          <BellIcon />
                        </div>
                        אינדיקטור פניות פתוחות
                      </div>
                      <label style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={indicatorEnabled}
                          onChange={(e) => setIndicatorEnabled(e.target.checked)}
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            width: 0,
                            height: 0
                          }}
                        />
                        <div style={{
                          width: '36px',
                          height: '20px',
                          backgroundColor: indicatorEnabled ? '#6366f1' : '#e5e7eb',
                          borderRadius: '9999px',
                          position: 'relative',
                          transition: 'background-color 0.2s',
                          cursor: 'pointer'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '2px',
                            right: indicatorEnabled ? '2px' : '18px',
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#ffffff',
                            borderRadius: '50%',
                            border: '1px solid #d1d5db',
                            transition: 'right 0.2s',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                          }} />
                        </div>
                      </label>
                    </div>

                    {/* Feature Content */}
                    {indicatorEnabled && (
                      <div style={{
                        padding: '16px',
                        animation: 'slideIn 0.2s ease-out',
                        position: 'relative',
                        zIndex: 1
                      }}>
                       
                        
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '16px'
                        }}>
                          {/* 1. Select Column */}
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#374151',
                              marginBottom: '4px'
                            }}>
                              עמודת סטטוס למעקב
                            </label>
                            <CustomDropdown
                              options={statusColumns.map(col => ({ id: col.id, title: col.title }))}
                              selectedId={statusColumnId}
                              placeholder="-- בחר עמודה --"
                              onSelect={(id) => {
                                setStatusColumnId(id);
                                setStatusLabel('');
                              }}
                              isLoading={isLoadingColumns}
                            />
                          </div>

                          {/* 2. Select Label */}
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#374151',
                              marginBottom: '4px'
                            }}>
                              הצג התראה עבור סטטוס:
                            </label>
                            <CustomDropdown
                              options={(() => {
                                if (!statusColumnId) return [];
                                const selectedCol = statusColumnsWithSettings.find(c => c.id === statusColumnId);
                                return selectedCol?.settings?.labels?.map(label => ({
                                  id: label.label,
                                  title: label.label || '(ריק)'
                                })) || [];
                              })()}
                              selectedId={statusLabel}
                              placeholder="-- בחר ערך --"
                              onSelect={(label) => setStatusLabel(label)}
                              isLoading={!statusColumnId || isLoadingColumns}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mapping Table */}
                {boardId && (
                  <div style={styles.mappingTable}>
                    <div style={styles.mappingHeader}>
                      <div>שדה מהטופס</div>
                      <div>עמודת יעד בלוח</div>
                    </div>

                    <MappingRow
                      label="שם האייטם"
                      isFixed
                      fixedValue="שם הפונה - שם החשבון (נוצר אוטומטית)"
                    />

                    <MappingRow
                      label="שם הפונה"
                      placeholder="בחר עמודת TEXT..."
                      value={columnMapping.requesterName}
                      onChange={(v) => updateField('requesterName', v)}
                      columns={allColumns}
                      columnType={['text', 'long_text']}
                      isLoading={isLoadingColumns}
                    />

                    <MappingRow
                      label="אימייל הפונה"
                      placeholder="בחר עמודת EMAIL..."
                      value={columnMapping.userEmail}
                      onChange={(v) => updateField('userEmail', v)}
                      columns={allColumns}
                      columnType="email"
                      isLoading={isLoadingColumns}
                    />

                    <MappingRow
                      label="תיאור"
                      placeholder="בחר עמודת TEXT..."
                      value={columnMapping.description}
                      onChange={(v) => updateField('description', v)}
                      columns={allColumns}
                      columnType={['text', 'long_text']}
                      isLoading={isLoadingColumns}
                    />

                    <MappingRow
                      label="וידאו"
                      placeholder="בחר עמודת FILE..."
                      value={columnMapping.video}
                      onChange={(v) => updateField('video', v)}
                      columns={allColumns}
                      columnType="file"
                      isLoading={isLoadingColumns}
                    />

                    <MappingRow
                      label="שם החשבון"
                      placeholder="בחר עמודת TEXT..."
                      value={columnMapping.accountName}
                      onChange={(v) => updateField('accountName', v)}
                      columns={allColumns}
                      columnType={['text', 'long_text']}
                      isLoading={isLoadingColumns}
                    />

                    <MappingRow
                      label="לוח מקור"
                      placeholder="בחר עמודת LINK..."
                      value={columnMapping.sourceBoardName}
                      onChange={(v) => updateField('sourceBoardName', v)}
                      columns={allColumns}
                      columnType="link"
                      isLoading={isLoadingColumns}
                    />
                  </div>
                )}

                {!boardId && (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                    בחר לוח כדי להתחיל במיפוי השדות
                  </div>
                )}
              </div>

              {/* Error */}
              {mutationError && (
                <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginTop: '16px' }}>
                  <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>שגיאה:</div>
                  <div style={{ color: '#dc2626', fontSize: '14px' }}>{mutationError}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            onClick={handleSave}
            disabled={!linkName.trim() || !boardId || !boardName || isMutating || isLoadingDetails}
            style={{
              ...styles.btnPrimary,
              opacity: (!linkName.trim() || !boardId || !boardName || isMutating || isLoadingDetails) ? 0.5 : 1,
              cursor: (!linkName.trim() || !boardId || !boardName || isMutating || isLoadingDetails) ? 'not-allowed' : 'pointer',
            }}
          >
            {isMutating ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                שומר...
              </>
            ) : (
              <>
                <SaveIcon />
                שמור הגדרות
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isMutating}
            style={styles.btnSecondary}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
