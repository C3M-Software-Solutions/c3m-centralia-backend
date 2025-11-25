import nodemailer from 'nodemailer';
import { IReservation } from '../models/Reservation.js';

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

interface NotificationData {
  userName: string;
  userEmail: string;
  specialistName: string;
  serviceName: string;
  businessName: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  cancellationReason?: string;
}

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Only initialize if email credentials are provided
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      console.warn('Email configuration not found. Notifications will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private async sendEmail(data: EmailData): Promise<void> {
    if (!this.transporter) {
      console.log('Email not sent - transporter not configured:', data.subject);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'C3M Centralia'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
      });
      console.log(`Email sent successfully to ${data.to}: ${data.subject}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private getReservationCreatedTemplate(data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Nueva Reservación Creada</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${data.specialistName}</strong>,</p>
            <p>Se ha creado una nueva reservación en tu agenda:</p>
            
            <div class="info-box">
              <h3>📋 Detalles de la Reservación</h3>
              <p><strong>Paciente:</strong> ${data.userName}</p>
              <p><strong>Email:</strong> ${data.userEmail}</p>
              <p><strong>Servicio:</strong> ${data.serviceName}</p>
              <p><strong>Negocio:</strong> ${data.businessName}</p>
              <p><strong>Fecha y Hora:</strong> ${this.formatDate(data.startDate)}</p>
              <p><strong>Duración:</strong> ${Math.round((data.endDate.getTime() - data.startDate.getTime()) / 60000)} minutos</p>
              ${data.notes ? `<p><strong>Notas del paciente:</strong> ${data.notes}</p>` : ''}
            </div>

            <p>Por favor, revisa tu agenda y confirma la cita lo antes posible.</p>
            
            <p style="text-align: center;">
              <strong>Estado actual:</strong> <span style="background-color: #FFC107; padding: 5px 10px; border-radius: 3px;">Pendiente de confirmación</span>
            </p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático de C3M Centralia</p>
            <p>No respondas a este correo</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getReservationConfirmedTemplate(data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2196F3; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
          .success { background-color: #4CAF50; color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Reservación Confirmada</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${data.userName}</strong>,</p>
            
            <div class="success">
              <h2 style="margin: 0;">✓ Tu cita ha sido confirmada</h2>
            </div>

            <p>Tu especialista ha confirmado la reservación. Aquí están los detalles:</p>
            
            <div class="info-box">
              <h3>📋 Información de tu Cita</h3>
              <p><strong>Especialista:</strong> ${data.specialistName}</p>
              <p><strong>Servicio:</strong> ${data.serviceName}</p>
              <p><strong>Lugar:</strong> ${data.businessName}</p>
              <p><strong>Fecha y Hora:</strong> ${this.formatDate(data.startDate)}</p>
              <p><strong>Duración:</strong> ${Math.round((data.endDate.getTime() - data.startDate.getTime()) / 60000)} minutos</p>
            </div>

            <div class="info-box" style="border-left-color: #FF9800;">
              <h3>📝 Recordatorios Importantes</h3>
              <ul>
                <li>Llega 10 minutos antes de tu cita</li>
                <li>Trae tu documento de identidad</li>
                <li>Si necesitas cancelar, hazlo con al menos 24 horas de anticipación</li>
              </ul>
            </div>

            <p>Recibirás un recordatorio 24 horas antes de tu cita.</p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático de C3M Centralia</p>
            <p>No respondas a este correo</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getReservationCancelledTemplate(data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f44336; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
          .warning { background-color: #FFF3E0; padding: 15px; border-left: 4px solid #FF9800; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Reservación Cancelada</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${data.userName}</strong>,</p>
            <p>Te informamos que tu reservación ha sido cancelada.</p>
            
            <div class="info-box">
              <h3>📋 Detalles de la Reservación Cancelada</h3>
              <p><strong>Especialista:</strong> ${data.specialistName}</p>
              <p><strong>Servicio:</strong> ${data.serviceName}</p>
              <p><strong>Lugar:</strong> ${data.businessName}</p>
              <p><strong>Fecha y Hora:</strong> ${this.formatDate(data.startDate)}</p>
              ${data.cancellationReason ? `<p><strong>Motivo:</strong> ${data.cancellationReason}</p>` : ''}
            </div>

            ${
              data.cancellationReason
                ? ''
                : `
            <div class="warning">
              <h3>💡 ¿Necesitas reagendar?</h3>
              <p>Puedes buscar otro horario disponible o contactar directamente con ${data.businessName} para encontrar una nueva fecha.</p>
            </div>
            `
            }

            <p>Lamentamos cualquier inconveniente que esto pueda causar.</p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático de C3M Centralia</p>
            <p>No respondas a este correo</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getReservationReminderTemplate(data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #FF9800; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
          .highlight { background-color: #FFF3E0; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Recordatorio de Cita</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${data.userName}</strong>,</p>
            
            <div class="highlight">
              <h2 style="margin: 0; color: #FF9800;">Tienes una cita mañana</h2>
            </div>

            <p>Este es un recordatorio de tu próxima cita médica:</p>
            
            <div class="info-box">
              <h3>📋 Detalles de tu Cita</h3>
              <p><strong>Especialista:</strong> ${data.specialistName}</p>
              <p><strong>Servicio:</strong> ${data.serviceName}</p>
              <p><strong>Lugar:</strong> ${data.businessName}</p>
              <p><strong>Fecha y Hora:</strong> ${this.formatDate(data.startDate)}</p>
              <p><strong>Duración estimada:</strong> ${Math.round((data.endDate.getTime() - data.startDate.getTime()) / 60000)} minutos</p>
            </div>

            <div class="info-box" style="border-left-color: #2196F3;">
              <h3>✅ Checklist para tu Cita</h3>
              <ul style="list-style-type: none; padding-left: 0;">
                <li>✓ Llega 10 minutos antes</li>
                <li>✓ Trae tu documento de identidad</li>
                <li>✓ Trae tus exámenes previos (si aplica)</li>
                <li>✓ Anota tus preguntas o síntomas</li>
              </ul>
            </div>

            <p><strong>Importante:</strong> Si no puedes asistir, por favor cancela tu cita lo antes posible.</p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático de C3M Centralia</p>
            <p>No respondas a este correo</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private extractNotificationData(reservation: IReservation): NotificationData {
    const userName =
      typeof reservation.user === 'object' && 'name' in reservation.user
        ? (reservation.user.name as string)
        : 'Usuario';

    const userEmail =
      typeof reservation.user === 'object' && 'email' in reservation.user
        ? (reservation.user.email as string)
        : '';

    const specialistName =
      typeof reservation.specialist === 'object' &&
      'user' in reservation.specialist &&
      typeof reservation.specialist.user === 'object' &&
      reservation.specialist.user !== null &&
      'name' in reservation.specialist.user
        ? (reservation.specialist.user.name as string)
        : 'Especialista';

    const serviceName =
      typeof reservation.service === 'object' && 'name' in reservation.service
        ? (reservation.service.name as string)
        : 'Servicio';

    const businessName =
      typeof reservation.business === 'object' && 'name' in reservation.business
        ? (reservation.business.name as string)
        : 'Negocio';

    return {
      userName,
      userEmail,
      specialistName,
      serviceName,
      businessName,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      notes: reservation.notes,
      cancellationReason: reservation.cancellationReason,
    };
  }

  async sendReservationCreated(reservation: IReservation): Promise<void> {
    try {
      const data = this.extractNotificationData(reservation);

      // Get specialist email
      const specialistEmail =
        typeof reservation.specialist === 'object' &&
        'user' in reservation.specialist &&
        typeof reservation.specialist.user === 'object' &&
        reservation.specialist.user !== null &&
        'email' in reservation.specialist.user
          ? reservation.specialist.user.email
          : '';

      if (!specialistEmail) {
        console.warn('Specialist email not found, skipping notification');
        return;
      }

      await this.sendEmail({
        to: specialistEmail as string,
        subject: `Nueva Reservación - ${data.userName}`,
        html: this.getReservationCreatedTemplate(data),
      });
    } catch (error) {
      console.error('Error sending reservation created notification:', error);
      // Don't throw error to avoid breaking the reservation flow
    }
  }

  async sendReservationConfirmed(reservation: IReservation): Promise<void> {
    try {
      const data = this.extractNotificationData(reservation);

      if (!data.userEmail) {
        console.warn('User email not found, skipping notification');
        return;
      }

      await this.sendEmail({
        to: data.userEmail,
        subject: `Cita Confirmada - ${data.specialistName}`,
        html: this.getReservationConfirmedTemplate(data),
      });
    } catch (error) {
      console.error('Error sending reservation confirmed notification:', error);
    }
  }

  async sendReservationCancelled(reservation: IReservation): Promise<void> {
    try {
      const data = this.extractNotificationData(reservation);

      if (!data.userEmail) {
        console.warn('User email not found, skipping notification');
        return;
      }

      await this.sendEmail({
        to: data.userEmail,
        subject: `Cita Cancelada - ${data.businessName}`,
        html: this.getReservationCancelledTemplate(data),
      });
    } catch (error) {
      console.error('Error sending reservation cancelled notification:', error);
    }
  }

  async sendReservationReminder(reservation: IReservation): Promise<void> {
    try {
      const data = this.extractNotificationData(reservation);

      if (!data.userEmail) {
        console.warn('User email not found, skipping notification');
        return;
      }

      await this.sendEmail({
        to: data.userEmail,
        subject: `Recordatorio: Cita Mañana con ${data.specialistName}`,
        html: this.getReservationReminderTemplate(data),
      });
    } catch (error) {
      console.error('Error sending reservation reminder notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
