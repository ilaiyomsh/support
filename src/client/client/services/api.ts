import type {
  ValidateLinkResponse,
  ConnectRequest,
  ConnectResponse,
  SubmitTicketResponse,
  TicketMetadata
} from '@shared/types';

const API_BASE = '/api';

/**
 * Retry utility - מבצע retry פעם אחת בלבד
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 1
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      return await withRetry(fn, retries - 1);
    }
    throw error;
  }
}

export const clientApi = {
  /**
   * אימות קוד לינק
   */
  async validateLink(code: string): Promise<ValidateLinkResponse> {
    return withRetry(async () => {
      const response = await fetch(`${API_BASE}/links/${code}/validate`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  },

  /**
   * התחברות ללינק
   */
  async connect(linkCode: string, instanceId: string): Promise<ConnectResponse> {
    return withRetry(async () => {
      const response = await fetch(`${API_BASE}/config/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkCode, instanceId } as ConnectRequest)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  },

  /**
   * שליחת פנייה
   */
  async submitTicket(data: {
    linkCode: string;
    description: string;
    videoUrl?: string | null;
    metadata?: TicketMetadata;
  }): Promise<SubmitTicketResponse> {
    return withRetry(async () => {
      const formData = new FormData();
      formData.append('linkCode', data.linkCode);
      formData.append('description', data.description);

      if (data.metadata) {
        formData.append('metadata', JSON.stringify(data.metadata));
      }

      if (data.videoUrl) {
        formData.append('videoUrl', data.videoUrl);
      }

      const response = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    });
  }
};

