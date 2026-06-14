import { CloudSchedulerClient } from '@google-cloud/scheduler';
import { config } from '../config/index.js';
import { ProjectService } from './ProjectService.js';
import { gcpService } from './GcpService.js';
import { internalServiceClient } from './InternalServiceClient.js';

const DEFAULT_OBSERVER_SETTINGS = {
  enabled: true,
  cadence: 'every_2_days',
  autoHealBindings: true,
  autoOptimizeQueries: true,
  freshnessWarningHours: 48,
  freshnessErrorHours: 96,
  costWarningBytes: 1_000_000_000,
  costErrorBytes: 10_000_000_000,
};

function normalizeSettings(raw = {}) {
  return {
    ...DEFAULT_OBSERVER_SETTINGS,
    ...raw,
  };
}

function toCronExpression(cadence) {
  switch (cadence) {
    case 'daily':
      return '0 3 * * *';
    case 'weekly':
      return '0 3 * * 1';
    case 'every_2_days':
      return '0 3 */2 * *';
    case 'manual':
    default:
      return null;
  }
}

function isLocalServiceUrl(url) {
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1', '0.0.0.0', 'observer'].includes(parsed.hostname);
  } catch {
    return true;
  }
}

function sanitizeJobSegment(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export class ObserverService {
  constructor() {
    this.projectService = new ProjectService();
    this.gcp = gcpService;
    this.schedulerClient = new CloudSchedulerClient();
  }

  async getSettings(orgId, projectId) {
    const settings = await this.projectService.getSettings(orgId, projectId);
    return normalizeSettings(settings?.observer);
  }

  async updateSettings(orgId, projectId, patch = {}) {
    const currentDoc = await this.projectService.getSettings(orgId, projectId);
    const nextSettings = {
      ...normalizeSettings(currentDoc?.observer),
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await this.projectService.updateSettings(orgId, projectId, {
      observer: nextSettings,
    });
    await this.syncScheduler(orgId, projectId, nextSettings);
    return nextSettings;
  }

  async getLatestReport(orgId, projectId) {
    const bucket = this.gcp.storage.bucket(config.gcsBucketName);
    const path = `specs/${orgId}/${projectId}/monitoring/health_report.json`;
    const blob = bucket.file(path);
    const [exists] = await blob.exists();
    if (!exists) return null;
    const [content] = await blob.download();
    return JSON.parse(content.toString());
  }

  async run(orgId, projectId, trigger = 'manual') {
    const settings = await this.getSettings(orgId, projectId);
    const dataset = this.gcp.getDatasetName(orgId, projectId);
    const targetUrl = `${config.observerServiceUrl.replace(/\/$/, '')}/run`;
    const response = await internalServiceClient.fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orgId,
        projectId,
        dataset,
        trigger,
        settings,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Observer service error: ${response.status}`);
    }

    return payload;
  }

  getSchedulerParent() {
    return `projects/${config.gcpProjectId}/locations/${config.gcpRegion}`;
  }

  getSchedulerJobName(orgId, projectId) {
    const orgKey = sanitizeJobSegment(orgId);
    const projectKey = sanitizeJobSegment(projectId);
    return `${this.getSchedulerParent()}/jobs/observer-${orgKey}-${projectKey}`;
  }

  async syncScheduler(orgId, projectId, settingsInput = null) {
    const settings = normalizeSettings(settingsInput || await this.getSettings(orgId, projectId));
    const cron = toCronExpression(settings.cadence);
    const jobName = this.getSchedulerJobName(orgId, projectId);

    if (!settings.enabled || !cron) {
      await this.deleteSchedulerJobIfExists(jobName);
      return { scheduled: false, cadence: settings.cadence };
    }

    const serviceBaseUrl = config.observerServiceUrl.replace(/\/$/, '');
    if (isLocalServiceUrl(serviceBaseUrl) || config.cloudRunAuthMode === 'disabled') {
      return { scheduled: false, cadence: settings.cadence, localOnly: true };
    }

    if (!config.cloudSchedulerInvokerServiceAccountEmail) {
      throw new Error('CLOUD_SCHEDULER_INVOKER_SERVICE_ACCOUNT_EMAIL is required for scheduled observer runs');
    }

    await this.deleteSchedulerJobIfExists(jobName);
    const dataset = this.gcp.getDatasetName(orgId, projectId);
    await this.schedulerClient.createJob({
      parent: this.getSchedulerParent(),
      job: {
        name: jobName,
        description: `Observer health checks for ${orgId}/${projectId}`,
        schedule: cron,
        timeZone: 'UTC',
        httpTarget: {
          uri: `${serviceBaseUrl}/run`,
          httpMethod: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': config.internalToken,
          },
          oidcToken: {
            serviceAccountEmail: config.cloudSchedulerInvokerServiceAccountEmail,
            audience: serviceBaseUrl,
          },
          body: Buffer.from(JSON.stringify({
            orgId,
            projectId,
            dataset,
            trigger: 'scheduled',
            settings,
          })).toString('base64'),
        },
      },
    });

    return { scheduled: true, cadence: settings.cadence, cron };
  }

  async deleteSchedulerJobIfExists(jobName) {
    try {
      await this.schedulerClient.deleteJob({ name: jobName });
    } catch (err) {
      if (err.code !== 5) {
        throw err;
      }
    }
  }
}

export const observerService = new ObserverService();
