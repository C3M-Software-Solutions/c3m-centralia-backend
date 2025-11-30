import { Request, Response } from 'express';

import { businessService, availabilityService } from '../services/index.js';
import { Specialist } from '../models/index.js';

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
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      phone: req.body.phone,
      specialty: req.body.specialty,
      bio: req.body.bio,
      schedule: req.body.schedule,
      services: req.body.services,
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
    const { specialistId } = req.params;

    const specialist = await Specialist.findById(specialistId)
      .populate('user', 'name email phone avatar')
      .populate('services', 'name description duration price category')
      .populate('business', 'name address phone email');

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
      specialty: req.body.specialty,
      bio: req.body.bio,
      schedule: req.body.schedule,
      services: req.body.services,
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

export const resetSpecialistPassword = async (req: Request, res: Response) => {
  try {
    const { businessId, specialistId } = req.params;
    const { newPassword } = req.body;
    const userId = req.user!.userId;

    if (!newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'New password is required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters',
      });
    }

    // Verify user owns the business
    const business = await businessService.getBusinessById(businessId);
    const businessOwnerId = business.user._id
      ? business.user._id.toString()
      : business.user.toString();
    if (businessOwnerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to reset passwords for this business',
      });
    }

    // Reset specialist password
    const result = await businessService.resetSpecialistPassword(specialistId, newPassword);

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to reset password',
    });
  }
};

export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const { specialistId } = req.params;
    const { date, serviceId } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Date query parameter is required (format: YYYY-MM-DD)',
      });
    }

    // Parse date
    const requestedDate = new Date(date);
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const slots = await availabilityService.getAvailableSlots(
      specialistId,
      requestedDate,
      serviceId as string | undefined
    );

    return res.status(200).json({
      status: 'success',
      data: {
        date,
        specialistId,
        serviceId: serviceId || null,
        availableSlots: slots,
        totalSlots: slots.length,
      },
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get available slots',
    });
  }
};
