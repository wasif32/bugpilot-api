import { Response } from 'express';
import Ticket from '../models/Ticket';
import  Project  from '../models/Project'
import { AuthRequest } from '../middleware/authMiddleware'; // Assuming AuthRequest interface from your middleware
import mongoose, { Types } from 'mongoose';

//For screenshots
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure 'uploads' directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir);
    console.log(`'uploads' directory created at: ${uploadsDir}`);
  } catch (error: any) {
    console.error(`Error creating 'uploads' directory at ${uploadsDir}:`, error.message);
    // Optionally, you might want to throw an error or exit the process if this is critical
    // process.exit(1);
  }
} else {
  console.log(`'uploads' directory already exists at: ${uploadsDir}`);
}


// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Before calling cb(null, uploadsDir), it's good to ensure the directory is writable.
    // However, fs.mkdirSync above already handles existence.
    // If there were write permission issues AFTER creation, Multer itself would log.
    cb(null, uploadsDir); // Files will be saved in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    // Append timestamp and original extension to filename to prevent collisions
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Multer upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    // Multer's default error for fileFilter will be passed to the upload callback
    cb(new Error('Error: File upload only supports images (jpeg, jpg, png, gif)!'));
  },
}).single('screenshot'); 

export const getTicketsByProject = async (req: AuthRequest, res: Response): Promise<void> => {

  try {
    const { projectId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      res.status(400).json({ message: 'Invalid project ID format.' });
      return;
    }

    const tickets = await Ticket.find({
      project: new Types.ObjectId(projectId),
      $or: [
        { createdBy: new Types.ObjectId(req.userId) },
        { assignees: new Types.ObjectId(req.userId) }
      ]
    })
      
      .populate('createdBy', 'name email')
      .populate('assignees', 'name email')
      .sort({ createdAt: -1 });
    res.json(tickets)
  } catch (error: any) {
    console.error('Error fetching tickets by project:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- NEW CONTROLLER FUNCTION ---
export const getAllUserTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Fetch all tickets where the authenticated user is either the creator OR the assignee
    const tickets = await Ticket.find({
      $or: [
        { createdBy: req.userId },
        { assignees: req.userId }
      ]
    })
    .populate('createdBy', 'name email')
      .populate('assignees', 'name email')
      .populate('project', 'name') // Optionally populate project name
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching all user tickets:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
// --- END NEW CONTROLLER FUNCTION ---

export const getTicketById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params; // Ticket ID from the URL
  const { userId } = req; // Authenticated user ID from authMiddleware

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid ticket ID format.' });
    return;
  }

  try {
    const ticket = await Ticket.findById(id)
      .populate('createdBy', 'name email')
      .populate('assignees', 'name email')
      .populate('comments.user', 'name email');

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    // Authorization Check: Ensure the logged-in user is either:
    // a) The creator of the ticket
    // b) An assignee of the ticket
    // c) A member of the project the ticket belongs to
    const isCreator = ticket.createdBy && ticket.createdBy._id.toString() === userId?.toString();
    const isAssignee = ticket.assignees.some((assignee: any) => assignee._id.toString() === userId?.toString());

    let isProjectMember = false;
    if (ticket.project) {
        const project = await Project.findById(ticket.project);
        if (project && project.members.some((member: any) => member.user.toString() === userId?.toString())) {
            isProjectMember = true;
        }
    }

    if (!isCreator && !isAssignee && !isProjectMember) {
        res.status(403).json({ message: 'Not authorized to view this ticket.' });
        return;
    }

    res.status(200).json(ticket);
  } catch (error: any) {
    console.error(`Error fetching ticket ${id}:`, error.message);
    res.status(500).json({ message: 'Server error while fetching ticket details.' });
  }
};


export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, priority, project } = req.body;
  
  if (!title || !project) {
    res.status(400).json({ message: 'Title and Project are required.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(project)) {
    res.status(400).json({ message: 'Invalid project ID format.' });
    return;
  }

  try {
    const ticket = new Ticket({
      title,
      description,
      priority,
      project,
      createdBy: req.userId,
    });
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};



export const updateTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params; // Ticket ID from the URL
  const { title, description, status, priority, assignees } = req.body; // Fields to update
  const { userId } = req; // Authenticated user ID

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid ticket ID format.' });
    return;
  }

  try {
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    // Authorization Check: Only the creator or a project manager can update most fields.
    // Assignees can typically update status.
    const isCreator = ticket.createdBy._id.toString() === userId?.toString();

    let isProjectManager = false;
    const project = await Project.findById(ticket.project);
    if (project) {
        isProjectManager = project.members.some(member =>
            member.user.toString() === userId?.toString() && member.role === 'admin'
        );
    }

    const isAssignee = ticket.assignees.some((assignee: any) => assignee._id.toString() === userId?.toString());

    // Allow status update by creator or assignee or project manager
    // Allow other fields (title, desc, priority, assignees) update by creator or project manager only
    if (!isCreator && !isProjectManager) {
        if (status && !isAssignee) { // If only status is being changed, and user is not an assignee
             res.status(403).json({ message: 'Not authorized to update ticket status.' });
             return;
        }
        if ((title || description || priority || assignees) && !isCreator && !isProjectManager) {
            res.status(403).json({ message: 'Only ticket creator or project manager can update these fields.' });
            return;
        }
    }


    // Update fields if provided
    if (title !== undefined) ticket.title = title;
    if (description !== undefined) ticket.description = description;
    if (status !== undefined) {
      const allowedStatuses = ['To Do', 'In Progress', 'Done'];
      if (!allowedStatuses.includes(status)) {
        res.status(400).json({ message: `Invalid status provided. Must be one of: ${allowedStatuses.join(', ')}` });
        return;
      }
      ticket.status = status;
    }
    if (priority !== undefined) {
      const allowedPriorities = ['Low', 'Medium', 'High'];
      if (!allowedPriorities.includes(priority)) {
        res.status(400).json({ message: `Invalid priority provided. Must be one of: ${allowedPriorities.join(', ')}` });
        return;
      }
      ticket.priority = priority;
    }
    if (assignees !== undefined) {
      if (!Array.isArray(assignees)) {
        res.status(400).json({ message: 'Assignees must be an array of user IDs.' });
        return;
      }

      ticket.assignees = assignees;
    }

    const updatedTicket = await ticket.save();

    // Re-populate for response
    const populatedTicket = await Ticket.findById(updatedTicket._id)
      .populate('createdBy', 'name email')
      .populate('assignees', 'name email');

    res.status(200).json(populatedTicket);
  } catch (error: any) {
    console.error(`Error updating ticket ${id}:`, error.message);
    res.status(500).json({ message: 'Server error while updating ticket.' });
  }
};

export const deleteTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { userId } = req;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid ticket ID format.' });
    return;
  }

  try {
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    // Authorization: Only the creator or a project manager can delete
    const isCreator = ticket.createdBy._id.toString() === userId?.toString();
    let isProjectManager = false;
    const project = await Project.findById(ticket.project);
    if (project) {
        isProjectManager = project.members.some(member =>
            member.user.toString() === userId?.toString() && member.role === 'admin'
        );
    }

    if (!isCreator && !isProjectManager) {
      res.status(403).json({ message: 'Not authorized to delete this ticket.' });
      return;
    }

    // Remove associated screenshots from file system (optional, but good practice)
    for (const screenshotPath of ticket.screenshots) {
      const fullPath = path.join(uploadsDir, path.basename(screenshotPath)); // Get filename from URL
      if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, (err) => {
          if (err) console.error(`Failed to delete screenshot file: ${fullPath}`, err);
        });
      }
    }

    await ticket.deleteOne(); // Or use findByIdAndDelete(id)

    res.status(200).json({ message: 'Ticket removed successfully' });
  } catch (error: any) {
    console.error(`Error deleting ticket ${id}:`, error.message);
    res.status(500).json({ message: 'Server error while deleting ticket.' });
  }
};

// --- ADD COMMENT TO TICKET ---
export const addCommentToTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params; // Ticket ID
  const { text } = req.body; // Comment text
  const { userId } = req; // Authenticated user ID

  if (!text || !text.trim()) {
    res.status(400).json({ message: 'Comment text cannot be empty.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid ticket ID format.' });
    return;
  }

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    const newComment = {
      user: userId,
      text,
      createdAt: new Date(),
    };

    ticket.comments.push(newComment as any); // Push the new comment
    await ticket.save();

    // To return the populated comment immediately, find it and populate
    const addedComment = ticket.comments[ticket.comments.length - 1]; // Get the last added comment
    await Ticket.populate(addedComment, { path: 'user', select: 'name email' });

    res.status(201).json(addedComment);
  } catch (error: any) {
    console.error(`Error adding comment to ticket ${id}:`, error.message);
    res.status(500).json({ message: 'Server error while adding comment.' });
  }
};

// --- UPLOAD SCREENSHOT TO TICKET ---
export const uploadScreenshotToTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params; // Ticket ID
  const { userId } = req; // Authenticated user ID

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid ticket ID format.' });
    return;
  }

  upload(req, res, async (err) => {
    if (err) {
      // Multer errors (e.g., file size limit, invalid file type)
      console.error("Multer upload error:", err.message);
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
      const ticket = await Ticket.findById(id);
      if (!ticket) {
        // Delete the uploaded file if ticket not found
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error(`Error deleting temp file: ${req.file?.path}`, unlinkErr);
        });
        return res.status(404).json({ message: 'Ticket not found.' });
      }

 // Use Render's automatic external URL if available, otherwise fallback for local dev
 const backendBaseUrl = process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`;
 const imageUrl = `${backendBaseUrl}/uploads/${req.file.filename}`; // This assumes /api is NOT part of the static route

      ticket.screenshots.push(imageUrl);
      await ticket.save();

      res.status(200).json({ message: 'Screenshot uploaded successfully', imageUrl });
    } catch (error: any) {
      // Delete the uploaded file if any other server error occurs
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error(`Error deleting temp file: ${req.file?.path}`, unlinkErr);
      });
      console.error(`Error uploading screenshot for ticket ${id}:`, error.message);
      res.status(500).json({ message: 'Server error while uploading screenshot.' });
    }
  });
};