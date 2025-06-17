import { Router } from 'express';
import { getProjects, createProject, getProjectDetails, addProjectMembers } from '../controllers/projectController';
import { authMiddleware } from '../middleware/authMiddleware';

const router: Router = Router();

router.get('/', authMiddleware, getProjects);
router.post('/', authMiddleware, createProject);

// Get specific project details
router.get('/:projectId', authMiddleware, getProjectDetails);
// Add members to a project
router.post('/:projectId/members', authMiddleware, addProjectMembers);

export default router;
