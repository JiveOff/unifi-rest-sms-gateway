import consola from "consola";
import { session } from "../clients/ssh";
import { appEnv } from "../env";
import { parseSmsListOutput } from "../utils";

export const websocketHandler = {
  async open(ws: any) {
    consola.info(`WebSocket connection opened: ${ws.id}`);
    
    // Store authentication state
    ws.data.authenticated = !appEnv.API_KEY; // Auto-authenticate if no API_KEY set
    ws.data.buffer = '';
    
    if (!appEnv.API_KEY) {
      // If no API key required, start monitoring immediately
      startMonitoring(ws);
    } else {
      // Wait for authentication message
      ws.send(JSON.stringify({ 
        type: 'auth_required', 
        message: 'Please authenticate by sending: { "type": "auth", "apiKey": "YOUR_KEY" }' 
      }));
    }
  },

  message(ws: any, message: string | object) {
    const data = ws.data;
    
    // Handle authentication
    if (!data.authenticated) {
      try {
        // Message might already be parsed by Elysia
        const authMsg = typeof message === 'string' ? JSON.parse(message) : message;

        if (authMsg.type === 'auth' && authMsg.apiKey === appEnv.API_KEY) {
          data.authenticated = true;
          ws.send(JSON.stringify({ type: 'auth_success', message: 'Authentication successful' }));
          consola.success(`WebSocket ${ws.id} authenticated`);
          startMonitoring(ws);
        } else {
          ws.send(JSON.stringify({ type: 'auth_failed', message: 'Invalid API key' }));
          ws.close();
        }
      } catch (error) {
        consola.error('Error parsing auth message:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid authentication message format' }));
        ws.close();
      }
    }
  },

  close(ws: any) {
    consola.info(`WebSocket connection closed: ${ws.id}`);
  },
};

async function startMonitoring(ws: any) {
  let buffer = '';
  
  try {
    // Start monitoring SMS messages using async generator
    for await (const chunk of session.executeStreamingCommand('sms monitor')) {
      // Accumulate data in buffer
      buffer += chunk;
      
      // Try to parse complete messages from buffer
      const headerPattern = /--\[\s*\d+\]/g;
      const matches = [...buffer.matchAll(headerPattern)];
      
      // Need at least 2 headers to have a complete message, or check if we have all fields
      if (matches.length >= 2) {
        // Extract all complete messages (all but the last one that might be incomplete)
        const lastMatch = matches[matches.length - 1];
        if (lastMatch && lastMatch.index !== undefined) {
          const lastCompleteIndex = lastMatch.index;
          const completeData = buffer.substring(0, lastCompleteIndex);
          buffer = buffer.substring(lastCompleteIndex); // Keep last message in buffer
        
          if (completeData.trim()) {
            const messages = parseSmsListOutput(completeData);
            for (const message of messages) {
              if (appEnv.ENABLE_SENSITIVE_LOGS) {
                consola.success(`Sending SMS from ${message.sender}`);
              } else {
                consola.success('Sending SMS to WebSocket');
              }
              ws.send(JSON.stringify(message));
            }
          }
        }
      } else if (buffer.length > 0 && matches.length === 1) {
        // Check if we have all required fields for a single complete message
        // Text field is the last one, so if we have it, the message is complete
        if (buffer.includes('Text (')) {
          const messages = parseSmsListOutput(buffer);
          if (messages.length > 0) {
            for (const message of messages) {
              if (appEnv.ENABLE_SENSITIVE_LOGS) {
                consola.success(`Sending SMS from ${message.sender}`);
              } else {
                consola.success('Sending SMS to WebSocket');
              }
              ws.send(JSON.stringify(message));
            }
            buffer = ''; // Clear buffer after successful parse
          }
        }
      }
    }
  } catch (error) {
    consola.error('SMS monitor error:', error);
    ws.send(JSON.stringify({ 
      error: 'SMS monitoring error', 
      details: error instanceof Error ? error.message : String(error)
    }));
  }
}
