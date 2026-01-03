import { useState, useCallback, useEffect } from 'react';
import { Send, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { clientApi } from '../services/api';
import RecordingPanel from './RecordingPanel';
import { TicketMetadata } from '@shared/types';
import {
  type InstanceMetadata,
  type CurrentUserMetadata,
  buildTicketMetadata,
  loadInstanceMetadata,
  loadCurrentUserMetadata,
  isBoardOwner
} from '../services/monday-metadata';
import { validateDescription, validateEmail } from '../services/validation';

interface SupportScreenProps {
  linkCode: string;
 // adminName?: string; // Display who we are contacting
  onDisconnect?: () => void; // Allow logging out
  instanceMetadata?: InstanceMetadata | null;
  currentUserMetadata?: CurrentUserMetadata | null;
}


export default function SupportScreen({
  linkCode,
  // adminName,
  onDisconnect,
  instanceMetadata,
  currentUserMetadata
}: SupportScreenProps) {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [localInstanceMetadata, setLocalInstanceMetadata] = useState<InstanceMetadata | null>(instanceMetadata || null);
  const [localUserMetadata, setLocalUserMetadata] = useState<CurrentUserMetadata | null>(currentUserMetadata || null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<{ title?: string; description?: string } | null>(null);
  
  // Debug log for initial props
  useEffect(() => {
    console.log('[SupportScreen] Initial props received:', {
      hasInstanceMetadata: !!instanceMetadata,
      hasCurrentUserMetadata: !!currentUserMetadata,
      instanceMetadataBoardOwners: instanceMetadata?.boardOwners,
      currentUserMetadataUserId: currentUserMetadata?.userId,
      localInstanceMetadataBoardOwners: localInstanceMetadata?.boardOwners,
      localUserMetadataUserId: localUserMetadata?.userId
    });
  }, []); // Run only once on mount
  
  // בדיקה אם המשתמש הוא board owner
  const canDisconnect = localInstanceMetadata && localUserMetadata 
    ? isBoardOwner(localInstanceMetadata, localUserMetadata)
    : false;

  // בניית metadata מלא (להשתמש גם בתוך RecordingPanel)
  const buildMetadata = (): TicketMetadata => {
    return buildTicketMetadata(
      localInstanceMetadata || instanceMetadata!,
      localUserMetadata || currentUserMetadata!
    );
  };
  
  // Debug log
  useEffect(() => {
    if (localInstanceMetadata && localUserMetadata) {
      console.log('[SupportScreen] canDisconnect check:', {
        hasMetadata: !!localInstanceMetadata,
        hasUserMetadata: !!localUserMetadata,
        boardOwners: localInstanceMetadata.boardOwners,
        userId: localUserMetadata.userId,
        canDisconnect
      });
    }
  }, [localInstanceMetadata, localUserMetadata, canDisconnect]);

  const handleRecordingComplete = useCallback((url: string) => {
    setVideoUrl(url);
  }, []);

  // תמיד טען מחדש boardOwners מה-API (לא נשמר ב-storage)
  useEffect(() => {
    const loadMetadata = async () => {
      const needsInstanceMetadata = !localInstanceMetadata;
      const needsUserMetadata = !localUserMetadata;
      const needsBoardOwners = localInstanceMetadata && !localInstanceMetadata.boardOwners;
      
      if (needsInstanceMetadata || needsUserMetadata || needsBoardOwners) {
        console.log('[SupportScreen] Loading metadata:', {
          needsInstanceMetadata,
          needsUserMetadata,
          needsBoardOwners
        });
        
        setIsLoadingMetadata(true);
        try {
          // תמיד טען instance metadata מחדש כדי לקבל boardOwners מעודכנים
          if (needsInstanceMetadata || needsBoardOwners) {
            console.log('[SupportScreen] Loading instance metadata with fresh boardOwners from API');
            const instanceMeta = await loadInstanceMetadata();
            console.log('[SupportScreen] Instance metadata loaded:', {
              boardId: instanceMeta.boardId,
              hasBoardOwners: !!instanceMeta.boardOwners,
              boardOwnersCount: instanceMeta.boardOwners?.length || 0,
              boardOwners: instanceMeta.boardOwners
            });
            setLocalInstanceMetadata(instanceMeta);
          }
          if (needsUserMetadata) {
            const userMeta = await loadCurrentUserMetadata();
            console.log('[SupportScreen] User metadata loaded:', {
              userId: userMeta.userId,
              userName: userMeta.userName
            });
            setLocalUserMetadata(userMeta);
          }
        } catch (err: any) {
          console.error('[SupportScreen] Error loading metadata:', err);
          setError(`שגיאה בטעינת מידע: ${err.message || 'שגיאה לא ידועה'}`);
        } finally {
          setIsLoadingMetadata(false);
        }
      }
    };

    loadMetadata();
  }, [localInstanceMetadata, localUserMetadata]);

  // טעינת הגדרות הטופס מהלינק
  useEffect(() => {
    const loadFormConfig = async () => {
      try {
        const response = await fetch(`/api/links/${linkCode}`);
        if (response.ok) {
          const data = await response.json();
          setFormConfig(data.link?.formConfig || null);
        }
      } catch (err) {
        console.error('Error loading link config:', err);
      }
    };
    loadFormConfig();
  }, [linkCode]);

  // אימות תיאור בזמן אמת (רק מקסימום)
  useEffect(() => {
    const validation = validateDescription(description);
    if (!validation.valid) {
      setDescriptionError(validation.error || null);
    } else {
      setDescriptionError(null);
    }
  }, [description]);

  const handleSubmit = async () => {
    // אימות תיאור (רק מקסימום)
    const descriptionValidation = validateDescription(description);
    if (!descriptionValidation.valid) {
      setError(descriptionValidation.error || 'תיאור התקלה לא תקין');
      return;
    }

    // בדיקה שחובה לפחות תיאור או סרטון
    if (!description.trim() && !videoUrl) {
      setError('יש להקליט סרטון או לתאר את הבעיה');
      return;
    }

    // בדיקה שיש לנו את כל המידע הנדרש
    const finalInstanceMetadata = localInstanceMetadata || instanceMetadata;
    const finalUserMetadata = localUserMetadata || currentUserMetadata;

    if (!finalInstanceMetadata || !finalUserMetadata) {
      setError('חסר מידע על המופע או המשתמש. אנא רענן את הדף או נסה שוב.');
      return;
    }

    // אימות אימייל (אם קיים)
    const emailValidation = validateEmail(finalUserMetadata.userEmail);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'פורמט אימייל לא תקין');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setDescriptionError(null);

    try {
      // בניית metadata מלא
      const metadata: TicketMetadata = buildMetadata();

      const result = await clientApi.submitTicket({
        linkCode,
        description: description.trim(),
        videoUrl: videoUrl,
        metadata
      });

      if (result.success) {
        setSubmittedId(result.itemId || null);
        // ניקוי IndexedDB אחרי שליחה מוצלחת
        const { dbService } = await import('../services/db');
        dbService.cleanupOldRecords();
        setVideoUrl(null);
      } else {
        setError(result.message || 'שגיאה בשליחת הפנייה. אנא נסה שוב.');
      }
    } catch (err: any) {
      // טיפול בשגיאות רשת עם הודעות מפורטות
      let errorMessage = 'שגיאה כללית בשליחת הפנייה';

      if (err.message) {
        if (err.message.includes('HTTP error')) {
          errorMessage = 'שגיאה בתקשורת עם השרת. אנא בדוק את החיבור לאינטרנט ונסה שוב.';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = 'לא ניתן להתחבר לשרת. אנא בדוק את החיבור לאינטרנט.';
        } else {
          errorMessage = `שגיאה: ${err.message}`;
        }
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // טעינת metadata
  if (isLoadingMetadata) {
    return (
      <div className="loading-screen" dir="rtl">
        <div className="loading-spinner" />
        <p className="loading-text">טוען מידע...</p>
      </div>
    );
  }

  // שגיאה קריטית - חסר metadata ולא ניתן לטעון
  if ((!localInstanceMetadata && !instanceMetadata) || (!localUserMetadata && !currentUserMetadata)) {
    return (
      <div className="auth-screen" dir="rtl">
        <div className="auth-container">
          <div className="success-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-red-600)' }}>
            <AlertCircle size={32} />
          </div>
          <h2 className="auth-title">שגיאה בטעינת מידע</h2>
          <p className="auth-description">לא ניתן לטעון את פרטי המופע או המשתמש. אנא רענן את הדף או חזור לעמוד הראשי.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary btn-medium btn-full"
            >
              רענן דף
            </button>
            {onDisconnect && canDisconnect && (
              <button
                onClick={onDisconnect}
                className="btn btn-tertiary btn-medium btn-full"
              >
                חזרה לעמוד הראשי
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (submittedId) {
    return (
      <div className="success-screen" dir="rtl">
        <div className="success-card">
          <div className="success-icon">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="success-title">הפנייה נשלחה!</h2>
          <p className="success-id">מספר פנייה: <span className="success-id-value">{submittedId}</span></p>
          <p className="success-description">תודה שדיווחת לנו. צוות התמיכה יבדוק את הנושא בהקדם.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-tertiary btn-medium"
          >
            פתח פנייה נוספת
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="support-container" dir="rtl">
      <div className="support-card">
        {/* HEADER SECTION */}
        <div className="support-header">
          <div className="support-header-content">
            <div className="support-header-actions">
              <div style={{ flex: 1, marginLeft: '16px' }}>
                <h1 className="support-title">
                  {formConfig?.title || null }
                </h1>
              </div>

              {onDisconnect && canDisconnect && (
                <button
                  onClick={onDisconnect}
                  className="btn btn-tertiary btn-small"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <LogOut size={16} />
                  <span style={{ display: window.innerWidth >= 640 ? 'inline' : 'none' }}>התנתק</span>
                </button>
              )}
            </div>

            <div>
              <p className="support-description">
                {formConfig?.description || null }
              </p>
            </div>
          </div>
        </div>

        {/* FORM BODY */}
        <div className="support-body">
          {/* Text Input Section */}
          <div className="support-field">
            <label className="support-label support-label-required">
              תיאור התקלה
            </label>
            <textarea
              className={`textarea ${descriptionError ? 'textarea-error' : ''}`}
              placeholder="מה קרה? באיזה שלב הופיעה השגיאה? תאר את הצעדים לשחזור..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError(null);
              }}
            />
           
          </div>

          <hr className="support-divider" />

          {/* Recording Section */}
          <div className="support-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <label className="support-label">הקלטת מסך</label>
              
            </div>
            <RecordingPanel 
              onRecordingComplete={handleRecordingComplete}
              ticketData={
                localInstanceMetadata && localUserMetadata
                  ? {
                      description: description.trim(),
                      metadata: buildMetadata(),
                      linkCode
                    }
                  : undefined
              }
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <AlertCircle className="error-message-icon" size={18} />
              <div className="error-message-content">
                <p className="error-message-title">אירעה שגיאה</p>
                <p className="error-message-text">{error}</p>
                {(error.includes('תקשורת') || error.includes('חיבור')) && (
                  <button
                    onClick={handleSubmit}
                    className="error-message-action"
                  >
                    נסה שוב
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div style={{ paddingTop: '16px' }}>
            <button
              onClick={handleSubmit}
              disabled={!!descriptionError || isSubmitting || isLoadingMetadata || (!description && !videoUrl)}
              className={`btn btn-primary btn-large btn-full ${!descriptionError && (description || videoUrl) && !isSubmitting ? '' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <div className="loading-spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%' }} />
                  שולח...
                </>
              ) : (
                <>
                  שלח פנייה
                  <Send size={18} style={{ transform: 'scaleX(-1)' }} />
                </>
              )}
            </button>
            <p className="support-hint" style={{ textAlign: 'center', marginTop: '16px' }}>
              המידע יישלח באופן מאובטח לשרתי החברה
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
