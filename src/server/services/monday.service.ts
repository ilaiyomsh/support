import FormData from 'form-data';
import axios from 'axios';
import { logger } from '../utils/logger.js';

export interface CreateItemParams {
  token: string;
  boardId: string;
  itemName: string;
  columnValues?: Record<string, any>;
}

export interface UploadFileParams {
  token: string;
  itemId: string;
  columnId: string;
  file: Buffer;
  fileName: string;
}

/**
 * Monday.com API Service
 */
export class MondayService {
  private readonly API_URL = 'https://api.monday.com/v2';

  /**
   * יצירת אייטם חדש בלוח
   */
  async createItem(params: CreateItemParams): Promise<{ id: string }> {
    const { token, boardId, itemName, columnValues = {} } = params;

    // ✅ לוג להדפסת הטוקן (ללא הצגת כל הטוקן מסיבות אבטחה)
    logger.info('Creating item in Monday', { 
      boardId, 
      itemName: itemName.substring(0, 50), 
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPrefix: token ? token.substring(0, 20) + '...' : null,
      tokenType: typeof token
    });

    // ✅ וידוא שהטוקן בפורמט הנכון
    let authToken = token;
    if (token && token.startsWith('Bearer')) {
      // Monday API accepts token without "Bearer " prefix
      logger.warn('Token has Bearer prefix, removing it');
      authToken = token.replace(/^Bearer\s+/i, '');
    }

    // המרת columnValues ל-JSON string (Monday API מצפה ל-JSON string)
    const columnValuesJson = JSON.stringify(columnValues);

    // שימוש ב-GraphQL variables (הפורמט הנכון לפי Monday API)
    const mutation = `
      mutation CreateItem($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    const variables = {
      boardId: boardId,
      itemName: itemName,
      columnValues: columnValuesJson
    };

    logger.info('Monday API request', {
      boardId,
      itemName: itemName.substring(0, 50),
      columnValuesKeys: Object.keys(columnValues),
      columnValuesJsonLength: columnValuesJson.length
    });

    try {
      const response = await axios.post(
        this.API_URL,
        { 
          query: mutation,
          variables: variables
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken, // ✅ Use processed token
            
          }
        }
      );

      const result = response.data;

      if (result.errors) {
        logger.error('Monday API error', { 
          errors: result.errors,
          fullResponse: JSON.stringify(result, null, 2)
        });
        throw new Error(`Monday API error: ${result.errors[0].message}`);
      }

      if (!result.data?.create_item?.id) {
        throw new Error('Failed to create item: No ID returned');
      }

      logger.info('Item created', { itemId: result.data.create_item.id, boardId });
      return { id: result.data.create_item.id };

    } catch (error: any) {
      const errorDetails = error.response?.data || {};
      logger.error('Error creating item', { 
        error: error.message, 
        stack: error.stack,
        response: errorDetails,
        responseString: JSON.stringify(errorDetails, null, 2),
        status: error.response?.status,
        boardId 
      });
      
      // Extract Monday API error message if available
      if (errorDetails.errors && errorDetails.errors.length > 0) {
        throw new Error(`Monday API error: ${errorDetails.errors[0].message}`);
      }
      
      throw error;
    }
  }

  /**
   * העלאת קובץ לאייטם
   * Uses the /v2/file endpoint as per Monday API documentation
   */
  async uploadFile(params: UploadFileParams): Promise<{ id: string }> {
    const { token, itemId, columnId, file, fileName } = params;

    // Monday File Upload API - requires multipart/form-data
    // Must use /v2/file endpoint, not /v2
    const FILE_UPLOAD_URL = 'https://api.monday.com/v2/file';
    const formData = new FormData();
    
    // GraphQL mutation query
    const mutation = `mutation ($file: File!) {
      add_file_to_column(
        item_id: ${itemId},
        column_id: "${columnId}",
        file: $file
      ) {
        id
      }
    }`;
    
    // Variables map - according to Monday docs example:
    // map should be {"fieldName": "variables.variableName"}
    // The field name in formData must match the key in the map
    const map = JSON.stringify({ 'file': 'variables.file' });
    
    formData.append('query', mutation);
    formData.append('map', map);
    formData.append('file', file, fileName);

    try {
      logger.info('Uploading file to Monday', { 
        itemId, 
        columnId, 
        fileName, 
        fileSize: file.length,
        endpoint: FILE_UPLOAD_URL
      });

      const response = await axios.post(
        FILE_UPLOAD_URL,
        formData,
        {
          headers: {
            'Authorization': token,
            
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 300000 // 5 minutes timeout for large files
        }
      );

      const result = response.data;

      if (result.errors) {
        logger.error('Monday upload error', { errors: result.errors });
        throw new Error(`Monday upload error: ${result.errors[0].message}`);
      }

      logger.info('File uploaded successfully', { itemId, columnId, fileName });
      return { id: result.data?.add_file_to_column?.id || 'unknown' };

    } catch (error: any) {
      logger.error('Error uploading file', { 
        error: error.message, 
        itemId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data
      });
      throw error;
    }
  }

  /**
   * קבלת עמודות של לוח
   */
  async getBoardColumns(token: string, boardId: string): Promise<Array<{ id: string; title: string; type: string }>> {
    logger.info('Getting board columns', { 
      boardId,
      hasToken: !!token,
      tokenLength: token?.length
    });

    const query = `
      query {
        boards(ids: [${boardId}]) {
          columns {
            id
            title
            type
          }
        }
      }
    `;

    try {
      logger.info('Sending request to Monday API for board columns', { boardId });
      
      const response = await axios.post(
        this.API_URL,
        { query },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
          
          }
        }
      );

      const result = response.data;

      if (result.errors) {
        logger.error('Monday API error getting board columns', { 
          errors: result.errors,
          boardId 
        });
        throw new Error(`Monday API error: ${result.errors[0].message}`);
      }

      const columns = result.data?.boards?.[0]?.columns || [];
      logger.info('Board columns retrieved successfully', { 
        boardId, 
        columnCount: columns.length,
        columnIds: columns.map((c: any) => c.id)
      });

      return columns;

    } catch (error: any) {
      logger.error('Error getting board columns', { 
        error: error.message, 
        stack: error.stack,
        boardId,
        status: error.response?.status,
        responseData: error.response?.data
      });
      throw error;
    }
  }
}

export const mondayService = new MondayService();

