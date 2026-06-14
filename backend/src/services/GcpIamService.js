import { google } from 'googleapis';
import { config } from '../config/index.js';

/**
 * GcpIamService — manages GCP IAM resources programmatically.
 *
 * Creates service accounts, assigns roles, enables APIs, and manages keys.
 * All operations are idempotent (safe to run multiple times).
 */

export class GcpIamService {
  constructor() {
    this.projectId = config.gcpProjectId;
    this.client = google.iam({ version: 'v1', auth: this.getAuth() });
    this.cloudresourcemanager = google.cloudresourcemanager({ version: 'v1', auth: this.getAuth() });
    this.serviceusage = google.serviceusage({ version: 'v1', auth: this.getAuth() });
  }

  async getAuth() {
    const auth = new google.auth.GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/iam',
      ],
    });
    return await auth.getClient();
  }

  /**
   * Ensure all service accounts exist for Sentry Data Platform.
   */
  async ensureAllServiceAccounts() {
    const accounts = [
      { name: 'sentry-backend', displayName: 'Sentry Backend API', description: 'Main backend API service' },
      { name: 'sentry-chat', displayName: 'Sentry Chat AI', description: 'AI chat service' },
      { name: 'sentry-harness', displayName: 'Sentry Harness', description: 'BigQuery discovery and spec generation' },
      { name: 'sentry-observer', displayName: 'Sentry Observer', description: 'Technical data health observer' },
      { name: 'sentry-compute', displayName: 'Sentry Compute', description: 'Default compute for Cloud Run' },
    ];

    const results = [];
    for (const acc of accounts) {
      const result = await this.ensureServiceAccount(acc.name, acc.displayName, acc.description);
      results.push(result);
    }
    return results;
  }

  /**
   * Create a service account if it doesn't exist.
   */
  async ensureServiceAccount(name, displayName, description) {
    const email = `${name}@${this.projectId}.iam.gserviceaccount.com`;

    try {
      // Check if exists
      await this.client.projects.serviceAccounts.get({
        name: `projects/${this.projectId}/serviceAccounts/${email}`,
      });
      return { name, email, status: 'already-exists' };
    } catch (err) {
      if (err.code !== 404) throw err;
    }

    // Create
    const [result] = await this.client.projects.serviceAccounts.create({
      name: `projects/${this.projectId}`,
      requestBody: {
        accountId: name,
        serviceAccount: {
          displayName,
          description,
        },
      },
    });

    return { name, email: result.email, status: 'created' };
  }

  /**
   * Assign a role to a service account.
   */
  async assignRole(serviceAccountEmail, role) {
    const resource = `projects/${this.projectId}`;

    // Get current policy
    const [policy] = await this.cloudresourcemanager.projects.getIamPolicy({
      resource,
      requestBody: { options: { requestedPolicyVersion: 3 } },
    });

    // Check if already assigned
    const exists = policy.bindings?.some(
      b => b.role === role && b.members?.includes(`serviceAccount:${serviceAccountEmail}`)
    );
    if (exists) return { serviceAccountEmail, role, status: 'already-assigned' };

    // Add binding
    policy.bindings = policy.bindings || [];
    const binding = policy.bindings.find(b => b.role === role);
    if (binding) {
      binding.members = binding.members || [];
      binding.members.push(`serviceAccount:${serviceAccountEmail}`);
    } else {
      policy.bindings.push({
        role,
        members: [`serviceAccount:${serviceAccountEmail}`],
      });
    }

    // Set updated policy
    await this.cloudresourcemanager.projects.setIamPolicy({
      resource,
      requestBody: { policy },
    });

    return { serviceAccountEmail, role, status: 'assigned' };
  }

  /**
   * Assign all roles for a service account by name.
   */
  async assignRolesForServiceAccount(name) {
    const email = `${name}@${this.projectId}.iam.gserviceaccount.com`;
    const roles = SERVICE_ACCOUNT_ROLES[name];
    if (!roles) throw new Error(`Unknown service account: ${name}`);

    const results = [];
    for (const role of roles) {
      const result = await this.assignRole(email, role);
      results.push(result);
    }
    return results;
  }

  /**
   * Enable a GCP API service.
   */
  async enableApi(serviceName) {
    const name = `projects/${this.projectId}/services/${serviceName}`;

    try {
      const [service] = await this.serviceusage.services.get({ name });
      if (service.state === 'ENABLED') {
        return { service: serviceName, status: 'already-enabled' };
      }
    } catch (err) {
      if (err.code !== 404) throw err;
    }

    await this.serviceusage.services.enable({ name });
    return { service: serviceName, status: 'enabled' };
  }

  /**
   * Enable all required APIs for Sentry Data Platform.
   */
  async enableAllApis() {
    const apis = [
      'firestore.googleapis.com',
      'bigquery.googleapis.com',
      'storage.googleapis.com',
      'storage-component.googleapis.com',
      'secretmanager.googleapis.com',
      'run.googleapis.com',
      'cloudscheduler.googleapis.com',
      'cloudbuild.googleapis.com',
      'logging.googleapis.com',
      'monitoring.googleapis.com',
      'bigquerydatatransfer.googleapis.com',
    ];

    const results = [];
    for (const api of apis) {
      const result = await this.enableApi(api);
      results.push(result);
    }
    return results;
  }

  /**
   * Create a service account key (for local development).
   */
  async createKey(serviceAccountName) {
    const email = `${serviceAccountName}@${this.projectId}.iam.gserviceaccount.com`;

    const [key] = await this.client.projects.serviceAccounts.keys.create({
      name: `projects/${this.projectId}/serviceAccounts/${email}`,
      requestBody: {
        keyAlgorithm: 'KEY_ALG_RSA_2048',
        privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE',
      },
    });

    return {
      name: key.name,
      privateKeyData: key.privateKeyData, // base64 encoded JSON
    };
  }

  /**
   * Full setup — create accounts, assign roles, enable APIs.
   */
  async fullSetup() {
    console.log('[GcpIamService] Starting full setup...');

    // 1. Enable APIs
    console.log('[GcpIamService] Enabling APIs...');
    const apiResults = await this.enableAllApis();
    console.log(`[GcpIamService] ${apiResults.filter(r => r.status === 'enabled').length} APIs enabled`);

    // 2. Create service accounts
    console.log('[GcpIamService] Creating service accounts...');
    const accountResults = await this.ensureAllServiceAccounts();
    console.log(`[GcpIamService] ${accountResults.filter(r => r.status === 'created').length} accounts created`);

    // 3. Assign roles
    console.log('[GcpIamService] Assigning roles...');
    const roleResults = [];
    for (const name of Object.keys(SERVICE_ACCOUNT_ROLES)) {
      const results = await this.assignRolesForServiceAccount(name);
      roleResults.push(...results);
    }
    console.log(`[GcpIamService] ${roleResults.filter(r => r.status === 'assigned').length} roles assigned`);

    return {
      apis: apiResults,
      accounts: accountResults,
      roles: roleResults,
    };
  }
}

// Role definitions per service account
const SERVICE_ACCOUNT_ROLES = {
  'sentry-backend': [
    'roles/datastore.user',
    'roles/bigquery.dataEditor',
    'roles/bigquery.jobUser',
    'roles/storage.objectAdmin',
    'roles/secretmanager.admin',
    'roles/run.admin',
    'roles/cloudscheduler.admin',
    'roles/iam.serviceAccountAdmin',
    'roles/logging.logWriter',
    'roles/monitoring.metricWriter',
  ],
  'sentry-chat': [
    'roles/datastore.user',
    'roles/storage.objectAdmin',
    'roles/logging.logWriter',
  ],
  'sentry-harness': [
    'roles/bigquery.dataViewer',
    'roles/bigquery.jobUser',
    'roles/storage.objectAdmin',
    'roles/datastore.user',
    'roles/logging.logWriter',
  ],
  'sentry-observer': [
    'roles/bigquery.dataViewer',
    'roles/bigquery.jobUser',
    'roles/storage.objectAdmin',
    'roles/logging.logWriter',
  ],
  'sentry-compute': [
    'roles/run.invoker',
  ],
};

export const gcpIamService = new GcpIamService();
