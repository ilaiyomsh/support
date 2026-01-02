import { useState } from 'react';
import mondaySdk from 'monday-sdk-js';
import { Power, Info, AlertCircle } from 'lucide-react';
import { clientApi } from '../services/api';

const monday = mondaySdk();

interface SetupScreenProps {
  onConnected: (code: string, adminName: string) => void;
}

export default function SetupScreen({ onConnected }: SetupScreenProps) {
  const [code, setCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidCode = (c: string) => /^[A-Z0-9]{6}$/.test(c.toUpperCase());

  const handleConnect = async () => {
    const upperCode = code.toUpperCase();

    if (!isValidCode(upperCode)) {
      setError('קוד לא תקין. הקוד צריך להכיל 6 תווים.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // קבלת instanceId מה-context
      let instanceId: string;
      try {
        const contextResponse = await monday.get('context');
        instanceId = contextResponse.data?.instanceId;

        if (!instanceId) {
          // נסה גם דרך get('instanceId') ישירות
          const instanceResponse = await monday.get('instanceId');
          instanceId = instanceResponse.data;
        }

        if (!instanceId) {
          throw new Error('instanceId לא נמצא ב-context');
        }
      } catch (contextError: any) {
        setError('שגיאה בטעינת פרטי המופע. אנא רענן את הדף.');
        console.error('Error getting instanceId:', contextError);
        setIsConnecting(false);
        return;
      }

      const validateData = await clientApi.validateLink(upperCode);

      if (validateData.valid && validateData.adminName) {
        const connectData = await clientApi.connect(upperCode, instanceId);

        if (connectData.success) {
          onConnected(upperCode, connectData.adminName || validateData.adminName);
        } else {
          setError(connectData.error || 'שגיאה בחיבור');
        }
      } else {
        setError('קוד לא תקין או לא קיים');
      }
    } catch (err) {
      setError('שגיאה בחיבור לשרת');
      console.error('Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="auth-screen" dir="rtl">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <Power className="auth-icon" size={32} />
          </div>
          <h1 className="auth-title">חבר את האפליקציה</h1>
          <p className="auth-description">הזן את קוד הלינק שקיבלת מהמנהל שלך כדי להתחיל</p>
        </div>

        <div className="auth-content">
          <div className="form-field">
            <label className="form-label">קוד התחברות</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                maxLength={6}
                placeholder="A1B2C3"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                className={`input ${error ? 'input-error' : ''}`}
                style={{
                  textAlign: 'center',
                  fontSize: '24px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.4em',
                  padding: '16px',
                  backgroundColor: error ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-gray-50)',
                  color: error ? 'var(--color-red-600)' : 'var(--color-text-primary)'
                }}
              />
              {code.length === 6 && !error && (
                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-green-500)' }}>
                  <Info size={20} />
                </div>
              )}
            </div>
            {error ? (
              <p className="support-hint-error" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                <AlertCircle size={14} />
                {error}
              </p>
            ) : (
              <p className="support-hint" style={{ textAlign: 'center' }}>הקוד מכיל 6 תווים (אותיות ומספרים)</p>
            )}
          </div>

          <button
            onClick={handleConnect}
            disabled={code.length !== 6 || isConnecting}
            className={`btn btn-primary btn-large btn-full ${isConnecting ? '' : 'auth-button'}`}
            style={{ marginBottom: '16px' }}
          >
            {isConnecting ? (
              <>
                <div className="loading-spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%' }} />
                מתחבר...
              </>
            ) : (
              <>התחבר עכשיו</>
            )}
          </button>

          <div style={{ paddingTop: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            
          </div>
        </div>
      </div>
    </div>
  );
}
