import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { config } from '../config/index.js';
import { ConnectorService } from '../services/ConnectorService.js';
import { internalServiceClient } from '../services/InternalServiceClient.js';

const router = Router();

/**
 * POST /chat/message — proxy request to Chat Service (Cloud Run)
 *
 * Frontend → Backend (authenticate) → Chat Service (internal)
 * The backend validates the user's JWT, then forwards the request
 * to the Chat Service with an internal token. The Chat Service uses
 * the user's JWT to call other backend APIs on the user's behalf.
 */
router.post('/message', authenticate, async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const orgId = req.params.orgId;
    const projectId = req.params.projectId;
    const userToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    // Forward to Chat Service with SSE streaming
    const response = await internalServiceClient.fetch(`${config.chatServiceUrl}/internal/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orgId,
        projectId,
        sessionId,
        message,
        backendToken: userToken, // pass user's JWT so Chat Service can call backend APIs
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Chat service unavailable' }));
      return res.status(response.status).json(err);
    }

    // Stream SSE response back to frontend
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
router.post('/tool-response', authenticate, async (req, res, next) => {
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

export default router;
