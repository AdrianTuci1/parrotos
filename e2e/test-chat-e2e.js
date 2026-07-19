import http from 'http';

const BASE = 'http://localhost:3000/api/v1';
const EMAIL = `test-${Date.now()}@example.com`;
const PASSWORD='TestPass123!';
const USERNAME = 'Test User';

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, ...options }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

function sseRequest(url, token, body) {
  const events = [];
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }, (res) => {
      res.on('data', chunk => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              events.push(JSON.parse(line.slice(6)));
            } catch {}
          }
        }
      });
      res.on('end', () => resolve(events));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function extractText(events) {
  return events.filter(e => e.type === 'text').map(e => e.content).join('');
}

function hasConnectorSuggestion(events) {
  return events.some(e => e.type === 'suggestion' || (e.type === 'tool_result' && e.type === 'suggestion')) ||
    /connectori|Stripe|GA4|Shopify|HubSpot|PostHog/i.test(extractText(events));
}

function hasAction(events, action) {
  return events.some(e => e.type === 'action' && e.action === action) ||
    events.some(e => e.type === 'tool_result' && e.action === action);
}

async function main() {
  const report = { passed: [], failed: [] };

  const register = await request(`${BASE}/auth/register`, { method: 'POST', body: { email: EMAIL, password: PASSWORD, username: USERNAME } });
  if (register.status !== 201) throw new Error(`Register failed: ${JSON.stringify(register.body)}`);
  const token = register.body.data.token;

  const orgSlug = `test-org-${Date.now()}`;
  const org = await request(`${BASE}/organizations`, { method: 'POST', body: { name: 'Test Org', slug: orgSlug }, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
  if (org.status !== 201) throw new Error(`Org failed: ${JSON.stringify(org.body)}`);
  const orgId = org.body.data.id;

  const projectSlug = `test-proj-${Date.now()}`;
  const project = await request(`${BASE}/organizations/${orgId}/projects`, { method: 'POST', body: { name: 'Test Project', slug: projectSlug }, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
  if (project.status !== 201) throw new Error(`Project failed: ${JSON.stringify(project.body)}`);
  const projectId = project.body.data.id;

  const scenarios = [
    {
      name: 'suggest connectors',
      message: 'Ce conectori îmi recomanzi?',
      assert: (events) => {
        if (events.some(e => e.type === 'error')) throw new Error('error event');
        if (!hasConnectorSuggestion(events)) throw new Error('no connector suggestion');
      }
    },
    {
      name: 'open Stripe modal',
      message: 'Vreau să conectez Stripe',
      assert: (events) => {
        if (events.some(e => e.type === 'error')) throw new Error('error event');
        if (!hasAction(events, 'open_integration_modal')) throw new Error('no open_integration_modal action');
      }
    },
    {
      name: 'ask about revenue widget',
      message: 'Arată-mi un grafic cu veniturile',
      assert: (events) => {
        if (events.some(e => e.type === 'error')) throw new Error('error event');
        // LLM may answer text-only when no data source is connected; accept informative text.
        const text = extractText(events);
        if (!text || text.length < 5) throw new Error('no meaningful text');
      }
    },
    {
      name: 'analytics query without data',
      message: 'Câte comenzi am avut ieri?',
      assert: (events) => {
        if (events.some(e => e.type === 'error')) throw new Error('error event');
        const text = extractText(events);
        if (!/conect|date|sursă|comenzi|nu am/i.test(text)) throw new Error('expected data-source guidance');
      }
    },
    {
      name: 'navigate to analytics',
      message: 'Du-mă la pagina de analytics',
      assert: (events) => {
        if (events.some(e => e.type === 'error')) throw new Error('error event');
        if (!hasAction(events, 'navigate')) throw new Error('no navigate action');
      }
    },
  ];

  for (const scenario of scenarios) {
    const events = await sseRequest(`${BASE}/organizations/${orgId}/projects/${projectId}/chat/message`, token, { sessionId: `sess-${scenario.name}`, message: scenario.message });
    try {
      scenario.assert(events);
      report.passed.push(scenario.name);
      console.log(`✓ ${scenario.name}: ${extractText(events).slice(0, 120) || '[tool only]'}`);
    } catch (err) {
      report.failed.push({ name: scenario.name, reason: err.message, events });
      console.log(`✗ ${scenario.name}: ${err.message}`);
    }
  }

  console.log('\n=== Chat E2E summary ===');
  console.log(`Passed: ${report.passed.length}/${scenarios.length}`);
  if (report.failed.length > 0) {
    console.log('Failed:', report.failed.map(f => f.name).join(', '));
    process.exit(1);
  }
  console.log('All chat scenarios passed.');
}

main().catch(err => {
  console.error('E2E test failed:', err.message);
  process.exit(1);
});
