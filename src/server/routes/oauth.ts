import { Router, Request, Response } from 'express';
import type { OAuthStatusResponse } from '@shared/types';
import { secureStorageService } from '../services/secure-storage.service.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';
// @ts-ignore - @mondaycom/apps-sdk types issue
import { SecretsManager } from '@mondaycom/apps-sdk';

const router = Router();

// Initialize Secrets Manager for accessing Monday Code secrets
const secretsManager = new SecretsManager();

/**
 * Helper function to get OAuth configuration
 * Tries process.env first (for local dev), then Secrets Manager (for Monday Code)
 */
async function getOAuthConfig() {
  // Try environment variables first (for local development)
  let clientId = process.env.MONDAY_CLIENT_ID || process.env.CLIENT_ID;
  let clientSecret = process.env.MONDAY_CLIENT_SECRET || process.env.CLIENT_SECRET || process.env.CLIENT_SECERT;
  let redirectUri = process.env.MONDAY_OAUTH_REDIRECT_URI;

  // If clientSecret is missing, try to get it from Secrets Manager (Monday Code)
  if (!clientSecret) {
    try {
      const secret = await secretsManager.get('MONDAY_CLIENT_SECRET');
      if (secret && typeof secret === 'string') {
        clientSecret = secret;
        logger.info('Retrieved MONDAY_CLIENT_SECRET from Secrets Manager');
      }
    } catch (error: any) {
      logger.warn('Failed to get MONDAY_CLIENT_SECRET from Secrets Manager', {
        error: error.message
      });
    }
  }

  // Also try to get other config from secrets if missing
  if (!clientId) {
    try {
      const secret = await secretsManager.get('MONDAY_CLIENT_ID');
      if (secret && typeof secret === 'string') {
        clientId = secret;
      }
    } catch (error: any) {
      // Ignore - already logged above pattern
    }
  }

  if (!redirectUri) {
    try {
      const secret = await secretsManager.get('MONDAY_OAUTH_REDIRECT_URI');
      if (secret && typeof secret === 'string') {
        redirectUri = secret;
      }
    } catch (error: any) {
      // Ignore
    }
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * GET /oauth/authorize - הפניה ל-Monday OAuth
 */
router.get('/authorize', async (_req: Request, res: Response) => {
  const { clientId, redirectUri } = await getOAuthConfig();

  if (!clientId || !redirectUri) {
    logger.error('Missing OAuth configuration', { 
      hasClientId: !!clientId, 
      hasRedirectUri: !!redirectUri
    });
    return res.status(500).json({ 
      error: 'OAuth not configured. Missing CLIENT_ID/MONDAY_CLIENT_ID or MONDAY_OAUTH_REDIRECT_URI' 
    });
  }

  // Monday OAuth authorization URL
  const authUrl = new URL('https://auth.monday.com/oauth2/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'boards:read boards:write me:read account:read');

  logger.info('Redirecting to OAuth', { authUrl: authUrl.toString() });
  res.redirect(authUrl.toString());
});

/**
 * GET /oauth/callback - קבלת token ושמירה ב-SecureStorage
 * 
 * נקודות קריטיות לבדיקה:
 * 1. Redirect URI בפורטל Monday חייב להתאים בדיוק: https://your-tunnel.apps-tunnel.monday.app/oauth/callback
 * 2. Scopes בקוד חייבים להתאים למה שהוגדר בפורטל
 * 3. אחרי הצלחה - חייב להיות redirect (לא JSON response)
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code, error, error_description, state } = req.query;

  logger.info('OAuth callback received', {
    hasCode: !!code,
    hasError: !!error,
    error,
    error_description,
    query: req.query
  });

  // Handle OAuth errors (as per documentation)
  if (error) {
    const errorCode = error as string;
    const errorDesc = typeof error_description === 'string' ? error_description : String(error_description || errorCode);
    
    logger.error('OAuth error from Monday', { 
      error: errorCode, 
      error_description: errorDesc,
      state 
    });
    
    // Redirect to admin with error in hash (not JSON - this prevents loop)
    const errorMsg = encodeURIComponent(errorDesc);
    return res.redirect(`/admin/#error=${errorMsg}&oauth=failed`);
  }

  if (!code || typeof code !== 'string') {
    logger.error('Missing authorization code', { query: req.query });
    // Redirect instead of JSON to prevent loop
    return res.redirect('/admin/#error=missing_code&oauth=failed');
  }

  // TODO: Validate state parameter if used (for CSRF protection)
  // if (state && !validateState(state)) {
  //   return res.status(400).json({ error: 'Invalid state parameter' });
  // }

  try {
    // 1. Exchange code for token
    // Get configuration from env vars or Secrets Manager
    const { clientId, clientSecret, redirectUri } = await getOAuthConfig();

    if (!clientId || !clientSecret || !redirectUri) {
      logger.error('Missing OAuth configuration', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri
      });
      return res.redirect('/admin/#error=missing_config&oauth=failed');
    }

    // Log redirect URI for debugging (without secret)
    logger.info('Exchanging code for token', {
      clientId,
      redirectUri,
      codeLength: code.length
    });

    const tokenResponse = await axios.post('https://auth.monday.com/oauth2/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri // CRITICAL: Must match exactly what's in Monday Developer Portal
    }, {
      headers: { 'Content-Type': 'application/json' }
    }).catch((err) => {
      // Log detailed error for debugging
      logger.error('Token exchange request failed', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      throw err;
    });

    // Check for errors in token response (as per OAuth documentation)
    if (tokenResponse.data.error) {
      logger.error('Token exchange error', { 
        error: tokenResponse.data.error,
        error_description: tokenResponse.data.error_description,
        fullResponse: tokenResponse.data
      });
      // Redirect instead of throwing to prevent loop
      const errorMsg = encodeURIComponent(tokenResponse.data.error_description || tokenResponse.data.error);
      return res.redirect(`/admin/#error=${errorMsg}&oauth=failed`);
    }

    const { access_token, token_type, scope } = tokenResponse.data;

    if (!access_token) {
      logger.error('No access token in response', { response: tokenResponse.data });
      throw new Error('No access token in response');
    }

    logger.info('Token received', { 
      token_type: token_type || 'Bearer',
      scope: scope || 'unknown',
      hasToken: !!access_token
    });

    logger.info('Token received, fetching user info');

    // 2. Get user and account info using the token
    const userInfoResponse = await axios.post(
      'https://api.monday.com/v2',
      {
        query: `
          query {
            me {
              id
              name
              email
            }
            account {
              id
              name
              slug
            }
          }
        `
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': access_token,
         
        }
      }
    );

    const { me, account } = userInfoResponse.data.data;

    if (!me || !account) {
      throw new Error('Failed to get user or account info');
    }

    logger.info('User info received', { accountId: account.id, userId: me.id });

    // 3. Save token and admin data to SecureStorage (קריאה אחת - מונע rate limit)
    // שומר גם ב-token_{accountId} וגם ב-admin_{accountId}
    await secureStorageService.setAdminComplete(account.id, {
      accessToken: access_token,
      accountId: account.id,
      accountName: account.name,
      userName: me.name,
      userEmail: me.email
    });

    logger.info('OAuth completed successfully', { accountId: account.id });

    // 5. Redirect to admin app with accountId in hash (hash is not sent to server)
    // The client-side will read it from the URL and save to localStorage
    res.redirect(`/admin/#accountId=${account.id}&oauth=success`);

  } catch (error: any) {
    logger.error('OAuth callback error', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // CRITICAL: Always redirect, never return JSON - this prevents OAuth loop
    const errorMsg = encodeURIComponent(error.message || 'OAuth authentication failed');
    return res.redirect(`/admin/#error=${errorMsg}&oauth=failed`);
  }
});

/**
 * GET /oauth/status - בדיקת סטטוס אימות
 */
router.get('/status', async (req: Request, res: Response<OAuthStatusResponse>) => {
  try {
    // Get accountId from query param (sent from client)
    const accountId = req.query.accountId as string;
    
    if (!accountId) {
      logger.warn('No accountId provided in status check');
      return res.json({
        authenticated: false
      });
    }
    
    // Check if token exists for this account
    const token = await secureStorageService.getAdminToken(accountId);
    const isAuthenticated = !!token;
    
    logger.info('OAuth status check', { 
      accountId, 
      isAuthenticated
    });
    
    res.json({
      authenticated: isAuthenticated
    });
  } catch (error: any) {
    logger.error('Error checking OAuth status', { error: error.message });
  res.json({
    authenticated: false
  });
  }
});

export default router;

