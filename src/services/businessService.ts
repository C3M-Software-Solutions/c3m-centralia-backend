import { Business } from '../models/Business.js';
import { Service } from '../models/Service.js';
import { Specialist } from '../models/Specialist.js';
import { Types } from 'mongoose';

export interface CreateBusinessData {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  ownerId: string;
}

export interface UpdateBusinessData {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  isActive?: boolean;
}

export interface CreateServiceData {
  businessId: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
}

export interface CreateSpecialistData {
  businessId: string;
  userId: string;
  specialty: string;
  bio?: string;
  schedule?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  services?: string[];
}

export class BusinessService {
  async createBusiness(data: CreateBusinessData) {
    const business = await Business.create({
      name: data.name,
      description: data.description,
      address: data.address,
      phone: data.phone,
      email: data.email,
      logo: data.logo,
      user: data.ownerId,
    });
    return business;
  }

  async getBusinessById(businessId: string) {
    if (!Types.ObjectId.isValid(businessId)) {
      throw new Error('Invalid business ID');
    }
    const business = await Business.findById(businessId).populate('user', 'name email');
    if (!business) {
      throw new Error('Business not found');
    }
    return business;
  }

  async getBusinessesByOwner(ownerId: string) {
    const businesses = await Business.find({ user: ownerId });
    return businesses;
  }

  async getAllBusinesses(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const businesses = await Business.find({ isActive: true })
      .populate('user', 'name email')
      .skip(skip)
      .limit(limit);

    const total = await Business.countDocuments({ isActive: true });

    return {
      businesses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateBusiness(businessId: string, ownerId: string, data: UpdateBusinessData) {
    if (!Types.ObjectId.isValid(businessId)) {
      throw new Error('Invalid business ID');
    }
    const business = await Business.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    // Verify ownership
    const businessUserId = business.user?.toString() || business.get('user')?.toString();
    if (businessUserId !== ownerId) {
      throw new Error('Unauthorized to update this business');
    }

    // Update fields
    Object.assign(business, data);
    await business.save();

    return business;
  }

  async deleteBusiness(businessId: string, ownerId: string) {
    if (!Types.ObjectId.isValid(businessId)) {
      throw new Error('Invalid business ID');
    }
    const business = await Business.findById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    // Verify ownership
    const businessUserId = business.user?.toString() || business.get('user')?.toString();
    if (businessUserId !== ownerId) {
      throw new Error('Unauthorized to delete this business');
    }

    await Business.deleteOne({ _id: businessId });
    return { message: 'Business deleted successfully' };
  }

  // Service management
  async createService(data: CreateServiceData) {
    // Verify business exists
    const business = await Business.findById(data.businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const service = await Service.create({
      business: data.businessId,
      name: data.name,
      description: data.description,
      duration: data.duration,
      price: data.price,
    });

    return service;
  }

  async getServicesByBusiness(businessId: string) {
    const services = await Service.find({ business: businessId, isActive: true });
    return services;
  }

  async updateService(serviceId: string, businessId: string, data: Partial<CreateServiceData>) {
    const service = await Service.findById(serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    // Verify service belongs to business
    if (service.business.toString() !== businessId) {
      throw new Error('Unauthorized to update this service');
    }

    Object.assign(service, data);
    await service.save();

    return service;
  }

  async deleteService(serviceId: string, businessId: string) {
    const service = await Service.findById(serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    // Verify service belongs to business
    if (service.business.toString() !== businessId) {
      throw new Error('Unauthorized to delete this service');
    }

    await Service.deleteOne({ _id: serviceId });
    return { message: 'Service deleted successfully' };
  }

  // Specialist management
  async createSpecialist(data: CreateSpecialistData) {
    // Verify business exists
    const business = await Business.findById(data.businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    // Validate services if provided
    if (data.services && data.services.length > 0) {
      const services = await Service.find({
        _id: { $in: data.services },
        business: data.businessId,
      });

      if (services.length !== data.services.length) {
        throw new Error('One or more services do not belong to this business');
      }
    }

    const specialist = await Specialist.create({
      business: data.businessId,
      user: data.userId,
      specialty: data.specialty,
      bio: data.bio,
      availability: data.schedule,
      services: data.services || [],
    });

    return await Specialist.findById(specialist._id)
      .populate('user', 'name email phone avatar')
      .populate('services', 'name duration price');
  }

  async getSpecialistsByBusiness(businessId: string) {
    const specialists = await Specialist.find({ business: businessId, isActive: true }).populate(
      'user',
      'name email phone avatar'
    );
    return specialists;
  }

  async updateSpecialist(
    specialistId: string,
    businessId: string,
    data: Partial<CreateSpecialistData>
  ) {
    const specialist = await Specialist.findById(specialistId);
    if (!specialist) {
      throw new Error('Specialist not found');
    }

    // Verify specialist belongs to business
    if (specialist.business.toString() !== businessId) {
      throw new Error('Unauthorized to update this specialist');
    }

    // Validate services if provided
    if (data.services) {
      const services = await Service.find({
        _id: { $in: data.services },
        business: businessId,
      });

      if (services.length !== data.services.length) {
        throw new Error('One or more services do not belong to this business');
      }
      specialist.services = data.services as any;
    }

    // Update other fields
    if (data.userId) specialist.user = data.userId as any;
    if (data.specialty) specialist.specialty = data.specialty;
    if (data.bio !== undefined) specialist.bio = data.bio;
    if (data.schedule) specialist.availability = data.schedule as any;

    await specialist.save();

    return await Specialist.findById(specialistId)
      .populate('user', 'name email phone avatar')
      .populate('services', 'name duration price');
  }

  async deleteSpecialist(specialistId: string, businessId: string) {
    const specialist = await Specialist.findById(specialistId);
    if (!specialist) {
      throw new Error('Specialist not found');
    }

    // Verify specialist belongs to business
    if (specialist.business.toString() !== businessId) {
      throw new Error('Unauthorized to delete this specialist');
    }

    await Specialist.deleteOne({ _id: specialistId });
    return { message: 'Specialist deleted successfully' };
  }
}

export const businessService = new BusinessService();
