import { useState, useEffect } from 'react';
import mondaySdk from 'monday-sdk-js';
import { AlertCircle } from 'lucide-react';
import SetupScreen from './SetupScreen';
import SupportScreen from './SupportScreen';
import {
  loadInstanceMetadata,
  loadCurrentUserMetadata,
  type InstanceMetadata,
  type CurrentUserMetadata
} from '../services/monday-metadata';

const monday = mondaySdk();
const STORAGE_KEY = 'instance_config';
const METADATA_STORAGE_KEY = 'instance_metadata';

interface StoredConfig {
  linkCode: string;
  adminName: string;
  connectedAt: string;
  instanceMetadata?: InstanceMetadata;
}

export default function ClientPanel() {
  const [screen, setScreen] = useState<'setup' | 'support' | 'loading' | 'error'>('loading');
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [instanceMetadata, setInstanceMetadata] = useState<InstanceMetadata | null>(null);
  const [currentUserMetadata, setCurrentUserMetadata] = useState<CurrentUserMetadata | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // טעינת metadata וקוד שמור מ-Monday Storage
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingError(null);

        // טעינת metadata מה-monday context
        let metadata: InstanceMetadata | null = null;
        try {
          // נסה לטעון מ-storage קודם (ללא boardOwners)
          const metadataResult = await monday.storage.instance.getItem(METADATA_STORAGE_KEY);
          if (metadataResult?.data?.value) {
            const storedMetadata = JSON.parse(metadataResult.data.value);
            // השתמש בנתונים השמורים אבל טען boardOwners מחדש מה-API
            console.log('[ClientPanel] Loading boardOwners fresh from API (not stored)');
            const freshMetadata = await loadInstanceMetadata();
            // עדכן רק את boardOwners, שמור את השאר
            metadata = {
              ...storedMetadata,
              boardOwners: freshMetadata.boardOwners
            };
            // לא שומרים boardOwners ב-storage
            const metadataWithoutOwners = { ...metadata };
            delete (metadataWithoutOwners as any).boardOwners;
            await monday.storage.instance.setItem(METADATA_STORAGE_KEY, JSON.stringify(metadataWithoutOwners));
          } else {
            // אם אין storage, טען הכל מה-API
            console.log('[ClientPanel] Loading all metadata from API');
            metadata = await loadInstanceMetadata();
            // שמור בלי boardOwners
            const metadataWithoutOwners = { ...metadata };
            delete (metadataWithoutOwners as any).boardOwners;
            await monday.storage.instance.setItem(METADATA_STORAGE_KEY, JSON.stringify(metadataWithoutOwners));
          }
          if (metadata) {
            console.log('[ClientPanel] Metadata loaded:', {
              boardId: metadata.boardId,
              boardName: metadata.boardName,
              hasBoardOwners: !!metadata.boardOwners,
              boardOwners: metadata.boardOwners
            });
            setInstanceMetadata(metadata);
          }
        } catch (metadataError: any) {
          console.error('Error loading instance metadata:', metadataError);
          const errorMessage = metadataError?.message || 'שגיאה לא ידועה';
          setLoadingError(`שגיאה בטעינת פרטי המופע: ${errorMessage}`);
          // נמשיך גם אם יש שגיאה ב-metadata, אבל נציג הודעה
        }

        // טעינת פרטי המשתמש הנוכחי (לא נשמרים)
        try {
          const userMetadata = await loadCurrentUserMetadata();
          console.log('[ClientPanel] User metadata loaded:', {
            userId: userMetadata.userId,
            userName: userMetadata.userName
          });
          setCurrentUserMetadata(userMetadata);
        } catch (userError: any) {
          console.error('Error loading current user metadata:', userError);
          const errorMessage = userError?.message || 'שגיאה לא ידועה';
          if (loadingError) {
            setLoadingError(`${loadingError}\nשגיאה בטעינת פרטי המשתמש: ${errorMessage}`);
          } else {
            setLoadingError(`שגיאה בטעינת פרטי המשתמש: ${errorMessage}`);
          }
          // נמשיך גם אם יש שגיאה ב-user metadata
        }

        // טעינת קוד שמור
        try {
          const result = await monday.storage.instance.getItem(STORAGE_KEY);

          if (result?.data?.value) {
            const config: StoredConfig = JSON.parse(result.data.value);

            // בדיקה שהקוד עדיין תקין
            try {
              const validateResponse = await fetch(`/api/links/${config.linkCode}/validate`);

              if (!validateResponse.ok) {
                throw new Error(`HTTP error! status: ${validateResponse.status}`);
              }

              const validateData = await validateResponse.json();

              if (validateData.valid && validateData.adminName) {
                // קוד תקין - מעבר ישירות ל-SupportScreen
                setLinkCode(config.linkCode);
                setAdminName(validateData.adminName);
                setScreen('support');
                return;
              }
            } catch (validateError: any) {
              console.error('Error validating stored link code:', validateError);
              // אם יש שגיאה באימות, נמשיך ל-SetupScreen
            }
          }
        } catch (storageError: any) {
          console.error('Error reading storage:', storageError);
          // שגיאה בקריאת storage לא קריטית - נמשיך
        }

        // אין קוד שמור או קוד לא תקין - מעבר ל-SetupScreen
        setScreen('setup');
      } catch (error: any) {
        console.error('Error loading data:', error);
        const errorMessage = error?.message || 'שגיאה לא ידועה בטעינת הנתונים';
        setLoadingError(`שגיאה כללית: ${errorMessage}`);
        setScreen('setup');
      }
    };

    loadData();
  }, []);

  // Debug log when passing props to SupportScreen
  useEffect(() => {
    if (screen === 'support') {
      console.log('[ClientPanel] Passing to SupportScreen:', {
        hasInstanceMetadata: !!instanceMetadata,
        hasCurrentUserMetadata: !!currentUserMetadata,
        instanceMetadataBoardOwners: instanceMetadata?.boardOwners,
        currentUserMetadataUserId: currentUserMetadata?.userId
      });
    }
  }, [screen, instanceMetadata, currentUserMetadata]);

  const handleConnected = async (code: string, admin: string) => {
    // שמירת קוד ב-Monday Storage
    try {
      setLoadingError(null);

      // ודא שיש לנו metadata עם boardOwners (תמיד טען מחדש מה-API)
      let metadata = instanceMetadata;
      try {
        const freshMetadata = await loadInstanceMetadata();
        // עדכן רק את boardOwners
        if (metadata) {
          metadata = {
            ...metadata,
            boardOwners: freshMetadata.boardOwners
          };
        } else {
          metadata = freshMetadata;
        }
        // לא שומרים boardOwners ב-storage
        const metadataWithoutOwners = { ...metadata };
        delete (metadataWithoutOwners as any).boardOwners;
        await monday.storage.instance.setItem(METADATA_STORAGE_KEY, JSON.stringify(metadataWithoutOwners));
        setInstanceMetadata(metadata);
      } catch (metadataError: any) {
        console.error('Error loading metadata on connect:', metadataError);
        const errorMessage = metadataError?.message || 'שגיאה לא ידועה';
        setLoadingError(`שגיאה בטעינת פרטי המופע: ${errorMessage}`);
        // נמשיך גם אם יש שגיאה
      }

      const config: StoredConfig = {
        linkCode: code,
        adminName: admin,
        connectedAt: new Date().toISOString(),
        instanceMetadata: metadata || undefined
      };

      try {
        await monday.storage.instance.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch (storageError: any) {
        console.error('Error saving config:', storageError);
        // שגיאה בשמירה לא קריטית - נמשיך עם החיבור
      }

      setLinkCode(code);
      setAdminName(admin);
      setScreen('support');
    } catch (error: any) {
      console.error('Error in handleConnected:', error);
      const errorMessage = error?.message || 'שגיאה לא ידועה';
      setLoadingError(`שגיאה בחיבור: ${errorMessage}`);
      // גם אם השמירה נכשלה, נמשיך עם החיבור
      setLinkCode(code);
      setAdminName(admin);
      setScreen('support');
    }
  };

  const handleDisconnect = async () => {
    // מחיקת קוד מ-Monday Storage
    try {
      await monday.storage.instance.deleteItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error deleting config:', error);
    }

    setLinkCode(null);
    setAdminName(null);
    setScreen('setup');
  };

  if (screen === 'loading') {
    return (
      <div className="loading-screen" dir="rtl">
        <div className="loading-spinner" />
        <p className="loading-text">טוען...</p>
      </div>
    );
  }

  if (screen === 'error') {
    return (
      <div className="auth-screen" dir="rtl">
        <div className="auth-container">
          <div className="success-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-red-600)' }}>
            <AlertCircle size={32} />
          </div>
          <h2 className="auth-title">שגיאה בטעינת האפליקציה</h2>
          {loadingError && (
            <p className="auth-description" style={{ whiteSpace: 'pre-line' }}>{loadingError}</p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary btn-large btn-full"
          >
            רענן דף
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }} dir="rtl">
      {loadingError && (
        <div className="warning-message">
          <div className="warning-message-content">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <p className="font-medium" style={{ fontSize: '14px', whiteSpace: 'pre-line', flex: 1 }}>{loadingError}</p>
            <button
              onClick={() => setLoadingError(null)}
              className="warning-message-close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {screen === 'setup' ? (
        <SetupScreen onConnected={handleConnected} />
      ) : (
        <SupportScreen
          linkCode={linkCode!}
          adminName={adminName || undefined}
          onDisconnect={handleDisconnect}
          instanceMetadata={instanceMetadata || undefined}
          currentUserMetadata={currentUserMetadata || undefined}
        />
      )}
    </div>
  );
}
