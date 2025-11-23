import { Request, Response } from 'express';
import { businessService } from '../services/index.js';

export const createSpecialist = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const userId = req.user!.userId;

    // Verify user owns the business
    const business = await businessService.getBusinessById(businessId);
    const businessOwnerId = business.user._id
      ? business.user._id.toString()
      : business.user.toString();
    if (businessOwnerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to create specialists for this business',
      });
    }

    const specialist = await businessService.createSpecialist({
      businessId,
      userId: req.body.userId,
      specialty: req.body.specialty,
      bio: req.body.bio,
      schedule: req.body.schedule,
    });

    return res.status(201).json({
      status: 'success',
      data: { specialist },
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create specialist',
    });
  }
};

export const getSpecialistsByBusiness = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const specialists = await businessService.getSpecialistsByBusiness(businessId);

    return res.status(200).json({
      status: 'success',
      data: { specialists },
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get specialists',
    });
  }
};

export const getSpecialistById = async (req: Request, res: Response) => {
  try {
    const { businessId, specialistId } = req.params;
    const specialists = await businessService.getSpecialistsByBusiness(businessId);
    const specialist = specialists.find((s) => s._id.toString() === specialistId);

    if (!specialist) {
      return res.status(404).json({
        status: 'error',
        message: 'Specialist not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { specialist },
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get specialist',
    });
  }
};

export const updateSpecialist = async (req: Request, res: Response) => {
  try {
    const { businessId, specialistId } = req.params;
    const userId = req.user!.userId;

    // Verify user owns the business
    const business = await businessService.getBusinessById(businessId);
    const businessOwnerId = business.user._id
      ? business.user._id.toString()
      : business.user.toString();
    if (businessOwnerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to update specialists for this business',
      });
    }

    const specialist = await businessService.updateSpecialist(specialistId, businessId, {
      userId: req.body.userId,
      specialty: req.body.specialty,
      bio: req.body.bio,
      schedule: req.body.schedule,
    });

    return res.status(200).json({
      status: 'success',
      data: { specialist },
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update specialist',
    });
  }
};

export const deleteSpecialist = async (req: Request, res: Response) => {
  try {
    const { businessId, specialistId } = req.params;
    const userId = req.user!.userId;

    // Verify user owns the business
    const business = await businessService.getBusinessById(businessId);
    const businessOwnerId = business.user._id
      ? business.user._id.toString()
      : business.user.toString();
    if (businessOwnerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete specialists for this business',
      });
    }

    await businessService.deleteSpecialist(specialistId, businessId);

    return res.status(200).json({
      status: 'success',
      message: 'Specialist deleted successfully',
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to delete specialist',
    });
  }
};
