import { useEffect, useState } from 'react';
import mondaySdk from 'monday-sdk-js';
import LinksDashboard from './components/LinksDashboard';
import ToastContainer, { useToast } from './components/ToastContainer';
import './App.css';

// Initialize Monday SDK
const monday = mondaySdk();

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const { toasts, removeToast, error: showError } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
    monday.execute('valueCreatedForUser');
        
        // Check if there's an error in URL hash (from OAuth redirect)
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.substring(1));
        const error = hashParams.get('error');
        const oauthStatus = hashParams.get('oauth');
        
        // Handle OAuth errors
        if (error && oauthStatus === 'failed') {
          const errorMessage = decodeURIComponent(error);
          console.error('OAuth error:', errorMessage);
          showError('שגיאת אימות: ' + errorMessage);
          // Clear hash and show auth screen
          window.history.replaceState({}, '', '/admin/');
          setNeedsAuth(true);
          setIsLoading(false);
          return;
        }
        
        // Check if accountId is in URL hash (from OAuth redirect)
        const accountIdFromHash = hashParams.get('accountId');
        
        // Save accountId to localStorage if it's in the hash
        if (accountIdFromHash && oauthStatus === 'success') {
          localStorage.setItem('monday_account_id', accountIdFromHash);
          // Clean up hash
          window.history.replaceState({}, '', '/admin/');
        }
        
        // Get accountId from localStorage or try Monday context
        let accountId: string | null = localStorage.getItem('monday_account_id');
        
        if (!accountId) {
          try {
            const contextResponse = await monday.get('context');
            accountId = contextResponse.data?.account?.id || null;
            // Save to localStorage if we got it from context
            if (accountId) {
              localStorage.setItem('monday_account_id', accountId);
            }
          } catch (contextError) {
            console.warn('Could not get context:', contextError);
          }
        }
        
        // Check OAuth status
        if (accountId) {
          const statusResponse = await fetch(`/oauth/status?accountId=${accountId}`);
          const status = await statusResponse.json();
          
          if (status.authenticated) {
            setNeedsAuth(false);
          } else {
            // Clear invalid accountId from localStorage
            localStorage.removeItem('monday_account_id');
            setNeedsAuth(true);
          }
        } else {
          setNeedsAuth(true);
        }
        
      } catch (error) {
        console.error('Error checking auth status:', error);
        showError('שגיאה בבדיקת סטטוס האימות');
        // On error, assume needs auth
        setNeedsAuth(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleAuthorize = () => {
    window.location.href = '/oauth/authorize';
  };

  if (isLoading) {
    return (
      <div
        dir="rtl"
        className="loading-screen"
      >
        <div className="loading-spinner" />
        <div className="loading-text">
          טוען...
        </div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div
        dir="rtl"
        className="auth-screen"
      >
        <div className="auth-container">
          <div className="auth-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="auth-title">
            נדרש אימות
          </h1>
          <p className="auth-description">
            עליך לאשר את האפליקציה כדי להשתמש בה. לחץ על הכפתור להלן כדי להתחיל.
          </p>
          <button
            className="btn btn-primary btn-large auth-button"
            onClick={handleAuthorize}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            התחבר עם Monday
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        dir="rtl"
        className="app-container"
      >
        <div className="app-content">
          <LinksDashboard />
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export default App;

