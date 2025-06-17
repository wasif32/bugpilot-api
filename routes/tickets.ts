import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
    getAllUserTickets,
    getTicketsByProject,
    createTicket,
    getTicketById,
    updateTicket,
    deleteTicket,
    addCommentToTicket,
    uploadScreenshotToTicket
} from '../controllers/ticketController';



const router: Router = Router();

router.get('/project/:projectId', authMiddleware, getTicketsByProject);
router.post('/', authMiddleware, createTicket);
router.get('/my-tickets', authMiddleware, getAllUserTickets);

// Single Ticket Routes
router.get('/:id', authMiddleware, getTicketById); // Get details of a specific ticket
router.put('/:id', authMiddleware, updateTicket); // Update specific fields of a ticket
router.delete('/:id', authMiddleware, deleteTicket); // Delete a ticket

// Ticket Features
router.post('/:id/comments', authMiddleware, addCommentToTicket); // Add a comment to a ticket
router.post('/:id/upload-screenshot', authMiddleware, uploadScreenshotToTicket); // Upload a screenshot to a ticket



export default router;
