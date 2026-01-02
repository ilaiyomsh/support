import mondaySdk from 'monday-sdk-js';
import type { TicketMetadata } from '@shared/types';

const monday = mondaySdk();

/**
 * פרטי המופע - נשמרים בזיכרון המופע
 */
export interface InstanceMetadata {
  accountId: string;
  accountName: string;
  boardId: string;
  boardName: string;
  boardUrl: string;
  boardOwners?: Array<{ id: string }>; // רשימת owners של הלוח
}

/**
 * פרטי המשתמש הנוכחי - לא נשמרים בזיכרון המופע
 */
export interface CurrentUserMetadata {
  userId: string;
  userName: string;
  userEmail?: string;
}

/**
 * טוען metadata מה-monday context
 */
export async function loadInstanceMetadata(): Promise<InstanceMetadata> {
  try {
    // קבלת context מה-monday
    const contextResponse = await monday.get('context');
    const contextData = contextResponse.data;

    console.log(contextData);

    const boardId = contextData?.boardId;
    const accountId = contextData?.account?.id;

    if (!boardId || !accountId) {
      throw new Error('Missing boardId or accountId in context');
    }

    // קריאה לקבלת פרטי הלוח
    const boardResponse = await monday.api(`
      query GetBoard($boardId: [ID!]!) {
        boards(ids: $boardId) {
          name
          url
          owners{
            id
            name
          }
        }
      }
    `, {
      variables: { boardId: [boardId] }
    });

    const board = boardResponse.data?.boards?.[0];
    if (!board) {
      throw new Error('Board not found');
    }

    // Debug: Log the raw API response with full details
    console.log('[loadInstanceMetadata] Raw board response:', {
      fullResponse: boardResponse,
      board: board,
      owners: board.owners,
      ownersType: typeof board.owners,
      ownersIsArray: Array.isArray(board.owners),
      ownersLength: board.owners?.length,
      ownersDetails: board.owners?.map((o: any) => ({ id: o.id, name: o.name || 'no name' }))
    });

    // קריאה לקבלת פרטי החשבון
    const accountResponse = await monday.api(`
      query GetAccount {
        account {
          name
        }
      }
    `);

    const account = accountResponse.data?.account;
    if (!account) {
      throw new Error('Account not found');
    }

    const boardOwners = board.owners || [];
    
    console.log('[loadInstanceMetadata] Final boardOwners:', {
      boardOwners,
      count: boardOwners.length,
      owners: boardOwners.map((o: any) => ({ id: o.id }))
    });

    return {
      accountId,
      accountName: account.name,
      boardId,
      boardName: board.name,
      boardUrl: board.url,
      boardOwners: boardOwners.map((owner: any) => ({ id: owner.id })) // Ensure we only store id
    };
  } catch (error) {
    console.error('Error loading instance metadata:', error);
    throw error;
  }
}

/**
 * טוען פרטי המשתמש הנוכחי
 */
export async function loadCurrentUserMetadata(): Promise<CurrentUserMetadata> {
  try {
    const meResponse = await monday.api(`
      query GetMe {
        me {
          id
          name
          email
          
        }
      }
    `);

    const me = meResponse.data?.me;
    if (!me) {
      throw new Error('User not found');
    }

    return {
      userId: me.id,
      userName: me.name,
      userEmail: me.email
    };
  } catch (error) {
    console.error('Error loading current user metadata:', error);
    throw error;
  }
}

/**
 * בודק אם המשתמש הנוכחי הוא board owner
 */
export function isBoardOwner(
  instanceMetadata: InstanceMetadata,
  userMetadata: CurrentUserMetadata
): boolean {
  if (!instanceMetadata.boardOwners || instanceMetadata.boardOwners.length === 0) {
    console.log('[isBoardOwner] No board owners found in metadata');
    return false;
  }
  
  const isOwner = instanceMetadata.boardOwners.some(owner => owner.id === userMetadata.userId);
  console.log('[isBoardOwner] Check:', {
    userId: userMetadata.userId,
    owners: instanceMetadata.boardOwners,
    isOwner
  });
  
  return isOwner;
}

/**
 * בונה TicketMetadata מפרטי המופע והמשתמש
 */
export function buildTicketMetadata(
  instanceMetadata: InstanceMetadata,
  userMetadata: CurrentUserMetadata,
  workspaceId?: string
): TicketMetadata {
  return {
    accountId: instanceMetadata.accountId,
    userId: userMetadata.userId,
    userName: userMetadata.userName,
    userEmail: userMetadata.userEmail,
    boardId: instanceMetadata.boardId,
    boardName: instanceMetadata.boardName,
    workspaceId: workspaceId || instanceMetadata.accountId, // fallback ל-accountId אם אין workspaceId
    timestamp: new Date().toISOString(),
    // שדות נדרשים על ידי השרת (tickets.ts שורות 103-105)
    requesterName: userMetadata.userName,
    accountName: instanceMetadata.accountName,
    sourceBoardName: instanceMetadata.boardName,
    sourceBoardUrl: instanceMetadata.boardUrl
  };
}

