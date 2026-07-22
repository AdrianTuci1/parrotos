import { Router } from 'express';
import { authenticate, requireOrgAccess } from '../middleware/auth.js';
import { config } from '../config/index.js';
import { chatFallbackService } from '../services/ChatFallbackService.js';
import { ConnectorService } from '../services/ConnectorService.js';
import { internalServiceClient } from '../services/InternalServiceClient.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireOrgAccess);

/**
 * POST /chat/message — proxy request to Chat Service (Cloud Run)
 *
 * Frontend → Backend (authenticate) → Chat Service (internal)
 * The backend validates the user's JWT, then forwards the request
 * to the Chat Service with an internal token. The Chat Service uses
 * the user's JWT to call other backend APIs on the user's behalf.
 */
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message, title } = req.body;
    const { orgId, projectId } = req.params;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    // Try real chat service first; if unreachable, fall back to local OpenAI/mock SSE
    let useFallback = false;
    let response;
    try {
      const userToken = req.headers.authorization?.replace('Bearer ', '');
      response = await internalServiceClient.fetch(`${config.chatServiceUrl}/internal/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, projectId, sessionId, message, title, backendToken: userToken }),
      });
      if (!response.ok) useFallback = true;
    } catch {
      useFallback = true;
    }

    if (useFallback) {
      // Persist session to Firestore (create or update)
      const { gcpService } = await import('../services/GcpService.js');
      const sessionsRef = gcpService.firestore
        .collection('organizations').doc(orgId)
        .collection('projects').doc(projectId)
        .collection('chatSessions');
      
      const sessionDoc = await sessionsRef.doc(sessionId).get();
      const now = new Date().toISOString();
      if (!sessionDoc.exists) {
        await sessionsRef.doc(sessionId).set({
          title: title || message.slice(0, 50) || 'New Chat',
          userId: req.user.userId,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const existingData = sessionDoc.data();
        const updates = { updatedAt: now };
        // Update title if still default or empty
        if (!existingData.title || existingData.title === 'New Chat' || existingData.title === 'Untitled Chat') {
          updates.title = title || message.slice(0, 50) || 'New Chat';
        }
        await sessionsRef.doc(sessionId).update(updates);
      }

      // Save user message
      await sessionsRef.doc(sessionId).collection('messages').add({
        role: 'user',
        content: message,
        userId: req.user.userId,
        createdAt: now,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      let assistantContent = '';
      try {
        for await (const event of chatFallbackService.stream({ message })) {
          if (event.type === 'text') assistantContent += event.content;
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } catch (err) {
        const errorMsg = err.message || 'Unknown error';
        assistantContent = errorMsg;
        res.write(`data: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`);
      }

      // Save assistant response
      if (assistantContent) {
        await sessionsRef.doc(sessionId).collection('messages').add({
          role: 'assistant',
          content: assistantContent,
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }

      res.end();
      return;
    }

    // Ensure session exists in Firestore
    try {
      const { gcpService } = await import('../services/GcpService.js');
      const sessionsRef = gcpService.firestore
        .collection('organizations').doc(orgId)
        .collection('projects').doc(projectId)
        .collection('chatSessions');
      
      const sessionDoc = await sessionsRef.doc(sessionId).get();
      const now = new Date().toISOString();
      if (!sessionDoc.exists) {
        await sessionsRef.doc(sessionId).set({
          title: title || message.slice(0, 50) || 'New Chat',
          userId: req.user.userId,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const existingData = sessionDoc.data();
        if (!existingData.title || existingData.title === 'New Chat' || existingData.title === 'Untitled Chat') {
          await sessionsRef.doc(sessionId).update({
            title: title || message.slice(0, 50) || 'New Chat',
            updatedAt: now,
          });
        } else {
          await sessionsRef.doc(sessionId).update({ updatedAt: now });
        }
      }
    } catch (e) {
      console.error('Failed to persist chat session:', e.message);
    }

    // Stream real chat service response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } finally {
      reader.releaseLock();
    }

    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Chat service unreachable' });
    } else {
      res.end();
    }
  }
});

/**
 * POST /chat/tool-response — receive user input for a pending tool call
 *
 * Frontend sends the user's response to a tool call (e.g., credentials entered,
 * choice selected). Backend executes the tool and returns the result.
 */
router.post('/tool-response', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const { toolCallId, toolName, payload } = req.body;
    const userToken = req.headers.authorization?.replace('Bearer ', '');

    if (!toolCallId || !toolName || !payload) {
      return res.status(400).json({ error: 'toolCallId, toolName, and payload are required' });
    }

    let result;

    switch (toolName) {
      case 'open_integration_modal': {
        const { connector_type, credentials } = payload;
        if (!connector_type || !credentials) {
          return res.status(400).json({ error: 'connector_type and credentials required' });
        }
        const connectorService = new ConnectorService();
        result = await connectorService.deployConnector(orgId, projectId, connector_type, credentials);
        break;
      }

      case 'show_widget': {
        result = { type: 'widget', queryRef: payload.widget_query_ref, title: payload.title };
        break;
      }

      case 'suggest_connectors': {
        result = { type: 'suggestion', reason: payload.reason, connectors: payload.connectors };
        break;
      }

      case 'run_analytics_query': {
        const response = await fetch(
          `${config.apiPrefix}/organizations/${orgId}/projects/${projectId}/analytics/query`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: payload.sql }),
          }
        );
        const data = await response.json();
        result = { type: 'query_result', question: payload.question, result: data.data };
        break;
      }

      case 'navigate_to': {
        result = { type: 'action', action: 'navigate', section: payload.section };
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown tool: ${toolName}` });
    }

    res.json({ success: true, data: { toolCallId, result } });
  } catch (err) {
    next(err);
  }
});


router.get('/history', async (req, res, next) => {
  try {
    const { orgId, projectId } = req.params;
    const { gcpService } = await import('../services/GcpService.js');
    const snapshot = await gcpService.firestore
      .collection('organizations').doc(orgId)
      .collection('projects').doc(projectId)
      .collection('chatSessions')
      .get();
    
    const sessions = [];
    snapshot.forEach(doc => {
      sessions.push({ id: doc.id, ...doc.data() });
    });
    
    sessions.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
});


router.delete('/history/:sessionId', async (req, res, next) => {
  try {
    const { orgId, projectId, sessionId } = req.params;
    const { gcpService } = await import('../services/GcpService.js');
    
    await gcpService.firestore
      .collection('organizations').doc(orgId)
      .collection('projects').doc(projectId)
      .collection('chatSessions').doc(sessionId)
      .delete();
      
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;

