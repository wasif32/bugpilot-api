// backend/controllers/userController.ts
import { Response } from 'express';
import User from '../models/User'; // Assuming this path is correct for your User model
import Project from '../models/Project'; // Assuming this path is correct for your Project model
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware'; // Assuming this path is correct for AuthRequest

export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, projectId } = req.query;
    const { userId } = req;

    if (!email || typeof email !== 'string' || email.trim() === '') {
        res.status(400).json({ message: 'Email query parameter is required.' });
        return;
    }

    let projectMemberUserIds: string[] = [];

    if (projectId && typeof projectId === 'string' && mongoose.Types.ObjectId.isValid(projectId)) {
        try {
            const project = await Project.findById(projectId).select('members');
    
          if (project && project.members && Array.isArray(project.members)) {
        
                projectMemberUserIds = project.members.map(member => member.user._id.toString());
            } else if (!project) {
                console.warn(`Project with ID ${projectId} not found. Cannot exclude existing members based on project data.`);
            }
        } catch (error: any) {
            console.error("Error fetching project members for exclusion:", error.message);
            // Continue execution, as an error here shouldn't block the user search entirely
        }
    }

    try {
        const idsToExclude = userId ? [...projectMemberUserIds, userId] : projectMemberUserIds;

        const users = await User.find({
            email: { $regex: email, $options: 'i' },
            _id: { $nin: idsToExclude },
        }).select('name email');

        res.status(200).json(users);

    } catch (error: any) {
        console.error("Server error during user search query:", error.message);
        res.status(500).json({ message: 'Server error while searching users.' });
    }
};