import { gcpService } from './GcpService.js';
import { NotFoundError } from '../utils/errors.js';
import { config } from '../config/index.js';

export class AnalyticsService {
  constructor() {
    this.gcp = gcpService;
  }

  async query(orgId, projectId, sql) {
    if (!config.enableBigQueryAnalytics) {
      throw new NotFoundError('BigQuery analytics is disabled');
    }

    const datasetName = this.gcp.getDatasetName(orgId, projectId);
    const fullQuery = sql.replace(/\$\{dataset\}/g, datasetName);

    const [rows] = await this.gcp.bigQuery.query({
      query: fullQuery,
      location: config.bigQueryLocation,
    });

    return rows;
  }

  async getSchema(orgId, projectId) {
    const datasetName = this.gcp.getDatasetName(orgId, projectId);
    const dataset = this.gcp.bigQuery.dataset(datasetName);
    const [tables] = await dataset.getTables();

    const schema = await Promise.all(
      tables.map(async (table) => {
        const [metadata] = await table.getMetadata();
        return {
          tableId: table.id,
          schema: metadata.schema.fields.map((field) => ({
            name: field.name,
            type: field.type,
            mode: field.mode,
            description: field.description,
          })),
          numRows: metadata.numRows,
          createdAt: metadata.creationTime,
        };
      })
    );

    return schema;
  }

  async createTable(orgId, projectId, tableId, schema) {
    const datasetName = this.gcp.getDatasetName(orgId, projectId);
    const dataset = this.gcp.bigQuery.dataset(datasetName);

    const [table] = await dataset.createTable(tableId, {
      schema: schema.map((field) => ({
        name: field.name,
        type: field.type,
        mode: field.mode || 'NULLABLE',
        description: field.description,
      })),
    });

    return table;
  }

  async insertRows(orgId, projectId, tableId, rows) {
    const datasetName = this.gcp.getDatasetName(orgId, projectId);
    const table = this.gcp.bigQuery.dataset(datasetName).table(tableId);
    await table.insert(rows);
  }

  async queryDatabase(orgId, projectId, source, query) {
    // In a real implementation, this would connect to the actual database
    // For now, we route through BigQuery which has the data synced
    if (!config.enableBigQueryAnalytics) {
      throw new NotFoundError('Database analytics is disabled');
    }

    const datasetName = this.gcp.getDatasetName(orgId, projectId);
    const fullQuery = query.replace(/\$\{dataset\}/g, datasetName);

    const [rows] = await this.gcp.bigQuery.query({
      query: fullQuery,
      location: config.bigQueryLocation,
    });

    return rows;
  }

  async getDashboardMetrics(orgId, projectId) {
    const queries = {
      totalEvents: `SELECT COUNT(*) as count FROM \`${config.gcpProjectId}.${this.gcp.getDatasetName(orgId, projectId)}.events\``,
      eventsByDay: `SELECT DATE(timestamp) as date, COUNT(*) as count FROM \`${config.gcpProjectId}.${this.gcp.getDatasetName(orgId, projectId)}.events\` GROUP BY date ORDER BY date DESC LIMIT 30`,
      topSources: `SELECT source, COUNT(*) as count FROM \`${config.gcpProjectId}.${this.gcp.getDatasetName(orgId, projectId)}.events\` GROUP BY source ORDER BY count DESC LIMIT 10`,
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      try {
        const [rows] = await this.gcp.bigQuery.query({ query, location: config.bigQueryLocation });
        results[key] = rows;
      } catch (err) {
        results[key] = [];
      }
    }

    return results;
  }
}
