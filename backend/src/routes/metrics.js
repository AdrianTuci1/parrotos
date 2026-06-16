import { Router } from 'express';
import { metricsResponse } from '../middleware/metrics.js';

const router = Router();

// Expose Prometheus metrics
router.get('/', metricsResponse);

// Proxy queries to Prometheus
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

router.get('/proxy', async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ error: 'Missing "query" parameter' });
    }

    const url = new URL(`${PROMETHEUS_URL}/api/v1/query`);
    url.searchParams.set('query', query);
    if (req.query.time) url.searchParams.set('time', req.query.time);

    const resp = await fetch(url.toString());
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy query_range to Prometheus
router.get('/proxy/range', async (req, res) => {
  try {
    const { query, start, end, step } = req.query;
    if (!query || !start || !end || !step) {
      return res.status(400).json({ error: 'Missing required parameters: query, start, end, step' });
    }

    const url = new URL(`${PROMETHEUS_URL}/api/v1/query_range`);
    url.searchParams.set('query', query);
    url.searchParams.set('start', start);
    url.searchParams.set('end', end);
    url.searchParams.set('step', step);

    const resp = await fetch(url.toString());
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List Prometheus targets
router.get('/proxy/targets', async (req, res) => {
  try {
    const resp = await fetch(`${PROMETHEUS_URL}/api/v1/targets`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
