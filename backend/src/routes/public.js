import { Router } from 'express';
import { ProjectService } from '../services/ProjectService.js';
import { success } from '../utils/response.js';

const router = Router();
const projectService = new ProjectService();

// GET /api/v1/public/p/:token - Verifică dacă token-ul este valid și returnează info proiect
router.get('/p/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = await projectService.findByPublicToken(token);

    success(res, {
      valid: true,
      project: {
        id: result.project.id,
        name: result.project.name,
        slug: result.project.slug,
        description: result.project.description,
      },
      orgId: result.orgId,
      projectId: result.projectId,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/public/p/:token/analytics - Returnează datele analytics pentru vizualizare publică
router.get('/p/:token/analytics', async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = await projectService.findByPublicToken(token);
    const analyticsData = await projectService.getPublicAnalyticsData(
      result.orgId,
      result.projectId
    );

    success(res, {
      project: analyticsData.project,
      settings: analyticsData.settings,
      // Aici se vor adăuga datele analytics reale
      analytics: {},
    });
  } catch (err) {
    next(err);
  }
});

export default router;
