export const config = {
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/c3m_centralia',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_key',
    expire: process.env.JWT_EXPIRE || '1h',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'c3m-centralia-uploads',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 's3' | 'cloudinary',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.SMTP_FROM_NAME || 'C3M Software Solutions',
    fromEmail: process.env.SMTP_FROM_EMAIL,
  },
  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  cron: {
    secret: process.env.CRON_SECRET,
  },
};
