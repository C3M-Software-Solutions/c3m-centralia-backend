import { Request, Response } from 'express';

import { businessService } from '../services/index.js';

export const createService = async (req: Request, res: Response) => {
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
        message: 'You are not authorized to create services for this business',
      });
    }

    const service = await businessService.createService({
      businessId,
      ...req.body,
    });

    return res.status(201).json({
      status: 'success',
      data: { service },
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create service',
    });
  }
};

export const getServicesByBusiness = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const services = await businessService.getServicesByBusiness(businessId);

    return res.status(200).json({
      status: 'success',
      data: { services },
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get services',
    });
  }
};

export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { businessId, serviceId } = req.params;
    const services = await businessService.getServicesByBusiness(businessId);
    const service = services.find((s) => s._id.toString() === serviceId);

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { service },
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get service',
    });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const { businessId, serviceId } = req.params;
    const userId = req.user!.userId;

    // Verify user owns the business
    const business = await businessService.getBusinessById(businessId);
    const businessOwnerId = business.user._id
      ? business.user._id.toString()
      : business.user.toString();
    if (businessOwnerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to update services for this business',
      });
    }

    const service = await businessService.updateService(serviceId, businessId, req.body);

    return res.status(200).json({
      status: 'success',
      data: { service },
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update service',
    });
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    const { businessId, serviceId } = req.params;
    const userId = req.user!.userId;

    // Verify user owns the business
    const business = await businessService.getBusinessById(businessId);
    const businessOwnerId = business.user._id
      ? business.user._id.toString()
      : business.user.toString();
    if (businessOwnerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete services for this business',
      });
    }

    await businessService.deleteService(serviceId, businessId);

    return res.status(200).json({
      status: 'success',
      message: 'Service deleted successfully',
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to delete service',
    });
  }
};
