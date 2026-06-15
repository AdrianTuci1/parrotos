import { gcpService } from './GcpService.js';
import { Project } from '../models/Project.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { config } from '../config/index.js';
import { dataDeletionService } from './DataDeletionService.js';

export class ProjectService {
  constructor() {
    this.gcp = gcpService;
  }

  _generatePublicToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 24; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  _getPublicLinkUrl(token) {
    return `${config.frontendUrl}/p/${token}`;
  }

  getCollection(orgId) {
    return this.gcp.getProjectsCollection(orgId);
  }

  async create(orgId, dto) {
    const existing = await this.getCollection(orgId)
      .where('slug', '==', dto.slug)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new ConflictError('Project slug already exists in this organization');
    }

    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    const project = new Project({
      id: projectId,
      orgId,
      name: dto.name,
      slug: dto.slug,
      description: dto.description || '',
      settings: dto.settings || {},
      modules: dto.modules || {},
      publicLink: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create Firestore document
    await this.getCollection(orgId).doc(projectId).set(project.toFirestore());

    // Create BigQuery dataset if enabled
    if (config.enableBigQueryAnalytics) {
      try {
        await this.gcp.createDataset(orgId, projectId);
      } catch (err) {
        // Dataset might already exist, continue
      }
    }

    return project;
  }

  async findById(orgId, projectId) {
    const doc = await this.getCollection(orgId).doc(projectId).get();
    if (!doc.exists) {
      throw new NotFoundError('Project not found');
    }
    return Project.fromFirestore(doc.id, doc.data());
  }

  async findByOrg(orgId) {
    const snapshot = await this.getCollection(orgId).get();
    return snapshot.docs.map(doc => Project.fromFirestore(doc.id, doc.data()));
  }

  async update(orgId, projectId, dto) {
    await this.findById(orgId, projectId);
    const updates = {
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    await this.getCollection(orgId).doc(projectId).update(updates);
    return this.findById(orgId, projectId);
  }

  async delete(orgId, projectId) {
    await dataDeletionService.deleteProject(orgId, projectId);
  }

  async getSettings(orgId, projectId) {
    const doc = await this.gcp.getSettingsRef(orgId, projectId).get();
    if (!doc.exists) {
      return {};
    }
    return doc.data();
  }

  async updateSettings(orgId, projectId, settings) {
    await this.findById(orgId, projectId);
    await this.gcp.getSettingsRef(orgId, projectId).set(settings, { merge: true });
    return this.getSettings(orgId, projectId);
  }

  async generatePublicLink(orgId, projectId) {
    const project = await this.findById(orgId, projectId);
    
    // Dacă există deja un link, îl returnăm pe acela
    if (project.publicLink?.token) {
      return {
        token: project.publicLink.token,
        url: this._getPublicLinkUrl(project.publicLink.token),
        createdAt: project.publicLink.createdAt,
      };
    }

    // Generăm token nou
    const token = this._generatePublicToken();
    const now = new Date().toISOString();
    const publicLink = {
      token,
      createdAt: now,
      updatedAt: now,
    };

    await this.getCollection(orgId).doc(projectId).update({
      publicLink,
      updatedAt: now,
    });

    return {
      token,
      url: this._getPublicLinkUrl(token),
      createdAt: now,
    };
  }

  async revokePublicLink(orgId, projectId) {
    await this.findById(orgId, projectId);
    const now = new Date().toISOString();

    await this.getCollection(orgId).doc(projectId).update({
      publicLink: null,
      updatedAt: now,
    });

    return { revoked: true };
  }

  async regeneratePublicLink(orgId, projectId) {
    await this.revokePublicLink(orgId, projectId);
    return this.generatePublicLink(orgId, projectId);
  }

  async findByPublicToken(token) {
    // Căutăm în toate organizațiile - folosim collection group query
    const snapshot = await this.gcp.firestore
      .collectionGroup('projects')
      .where('publicLink.token', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundError('Public link not found or revoked');
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const orgId = data.orgId;
    const projectId = doc.id;

    return {
      orgId,
      projectId,
      project: Project.fromFirestore(projectId, data),
    };
  }

  async getPublicAnalyticsData(orgId, projectId) {
    const project = await this.findById(orgId, projectId);
    const settings = await this.getSettings(orgId, projectId);

    // Aici putem adăuga logica de agregare a datelor analytics
    // Deocamdată returnăm structura de bază
    return {
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
      },
      settings,
      // Datele analytics reale vor fi populate de serviciul de analytics
    };
  }
}
