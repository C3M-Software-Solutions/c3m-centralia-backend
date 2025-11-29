import nodemailer from 'nodemailer';

import { IReservation } from '../models/Reservation.js';
import { config } from '../config/index.js';

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
    if (!config.smtp.host || !config.smtp.port || !config.smtp.user || !config.smtp.pass) {
      console.warn('Email configuration not found. Notifications will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  private async sendEmail(data: EmailData): Promise<void> {
    if (!this.transporter) {
      console.log('Email not sent - transporter not configured:', data.subject);
      return;
    }

    try {
      const fromEmail = config.smtp.fromEmail || config.smtp.user;
      console.log(`Sending email to ${data.to}: ${data.subject}`);
      await this.transporter.sendMail({
        from: `"${config.smtp.fromName}" <${fromEmail}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
      });
      console.log('send');
      console.log(`Email sent successfully to ${data.to}: ${data.subject}`);
    } catch (error) {
      // Log error but don't throw - allows system to continue working without email
      console.error('Error sending email (email notifications disabled):', error);
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
      console.log('Sending reservation created notification:', data);

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

  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<void> {
    try {
      // Use backend static page if FRONTEND_URL is not explicitly set or is localhost:3000
      const frontendUrl = process.env.FRONTEND_URL;
      const backendUrl = `http://localhost:${process.env.PORT || 5000}`;

      // If no frontend URL is set or is default, use backend static page
      const baseUrl =
        !frontendUrl || frontendUrl === 'http://localhost:3000' ? backendUrl : frontendUrl;

      const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;

      await this.sendEmail({
        to: email,
        subject: 'Recuperación de Contraseña - C3M Centralia',
        html: this.getPasswordResetTemplate(name, resetUrl),
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  private getPasswordResetTemplate(name: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Recuperación de Contraseña</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${name}</strong>,</p>
            
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en C3M Centralia.</p>
            
            <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
            </div>
            
            <div class="warning">
              <p><strong>⚠️ Importante:</strong></p>
              <ul>
                <li>Este enlace es válido por <strong>1 hora</strong></li>
                <li>Solo puedes usar este enlace una vez</li>
                <li>Si no solicitaste este cambio, ignora este correo</li>
              </ul>
            </div>
            
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            
            <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura. Tu contraseña actual seguirá siendo válida.</p>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no respondas.</p>
            <p>&copy; 2024 C3M Centralia. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const notificationService = new NotificationService();
