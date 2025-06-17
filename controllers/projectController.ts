import { Response } from 'express';
import Project, {IProject} from '../models/Project';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import mongoose from 'mongoose';

// NEW HELPER FUNCTION: This is crucial for role-based authorization within a project
const isAuthorizedInProject = (
  project: IProject,
  userId: string,
  requiredRole: 'admin' | 'developer' | 'viewer'
): boolean => {
  
  const member = project.members.find(m => {
      
      return m.user._id.toString() === userId;
  });

  if (!member) {
     
      return false;
  }

  
  const rolesOrder = { 'viewer': 0, 'developer': 1, 'admin': 2 };
  const isAuthorized = rolesOrder[member.role] >= rolesOrder[requiredRole];

  return isAuthorized;
};

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await Project.find({
      $or: [
        { createdBy: req.userId },
        { 'members.user': req.userId }
      ]
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description } = req.body;
  try {
     // Ensure req.userId is available from your authentication middleware
     if (!req.userId) {
      res.status(401).json({ message: 'User not authenticated.' });
      return;
    }
    const project = new Project({
      name, description, createdBy: req.userId, 
       // Automatically add the creator as an 'admin' member
       members: [
        {
          user: req.userId,
          role: 'admin',
        },
      ],
     });
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProjectDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const { userId } = req; // We no longer need `user` for global roles here

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    res.status(400).json({ message: 'Invalid project ID format.' });
    return;
  }

  try {
    // ProjectSchema.pre(/^find/, ...) handles population for members.user and createdBy
    // Ensure that your 'pre' hook on the ProjectSchema is correctly populating 'members.user'
    // If not, you might need to add .populate('members.user', 'name email') here explicitly.
    const project = await Project.findById(projectId);

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    // --- MODIFIED AUTHORIZATION LOGIC START ---
    // Authorization: User must be a member of the project.
    // Corrected comparison: member.user is a populated object, so access its _id
    const isProjectMember = project.members.some(member => {
        // Add a console log here to inspect the 'member' object and 'userId'
        // This will help confirm that 'member.user' is indeed an object with an '_id'
       
        return member.user && member.user._id && member.user._id.toString() === userId;
    });

    if (!isProjectMember) { // Simplified condition
      res.status(403).json({ message: 'Not authorized to view this project. You must be a project member.' });
      return;
    }
    // --- MODIFIED AUTHORIZATION LOGIC END ---

    // If authorization passes, send the project data
    res.status(200).json(project);
  } catch (error: any) {
    console.error(`Error fetching project ${projectId}:`, error.message);
    res.status(500).json({ message: 'Server error while fetching project.' });
  }
};

export const addProjectMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const { newMembers } = req.body;
  const { userId } = req; // Only need userId now, user object (for global role) is not strictly needed for this check

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    res.status(400).json({ message: 'Invalid project ID format.' });
    return;
  }
  if (!Array.isArray(newMembers) || newMembers.some(m => !mongoose.Types.ObjectId.isValid(m.user) || !['admin', 'developer', 'viewer'].includes(m.role))) {
    res.status(400).json({ message: 'Invalid new members format. Must be an array of { user: ID, role: "admin" | "developer" | "viewer" }.' });
    return;
  }
  if (newMembers.length === 0) {
    res.status(400).json({ message: 'No new members provided to add.' });
    return;
  }

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    // --- MODIFIED AUTHORIZATION LOGIC START ---
    // Authorization: Only a project 'admin' can add members
    const hasProjectAdminRole = isAuthorizedInProject(project, userId!, 'admin'); // userId from authMiddleware

    if (!hasProjectAdminRole) {
      res.status(403).json({ message: 'Not authorized to add members to this project. Requires project admin privileges.' });
      return;
    }
    // --- MODIFIED AUTHORIZATION LOGIC END ---

    const currentMemberIds = project.members.map(member => member.user.toString());
    const membersToAdd: typeof project.members = [];

    for (const newMember of newMembers) {
      // Only add users who are not already members of the project
      if (!currentMemberIds.includes(newMember.user.toString())) {
        membersToAdd.push({
          user: new mongoose.Types.ObjectId(newMember.user),
          role: newMember.role,
        });
      }
    }

    if (membersToAdd.length === 0) {
      res.status(200).json({ message: 'All provided users are already members or invalid.', project });
      return;
    }

    project.members.push(...membersToAdd);
    await project.save();

    const updatedProject = await Project.findById(projectId); // Re-fetch to get populated members

    res.status(200).json({ message: 'Members added successfully.', project: updatedProject });
  } catch (error: any) {
    console.error(`Error adding members to project ${projectId}:`, error.message);
    res.status(500).json({ message: 'Server error while adding members.' });
  }
};
