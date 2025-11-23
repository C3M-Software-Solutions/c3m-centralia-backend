# Deployment Guide

This guide covers deploying the C3M Centralia Backend to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Options](#deployment-options)
4. [MongoDB Atlas Setup](#mongodb-atlas-setup)
5. [AWS Deployment](#aws-deployment)
6. [Heroku Deployment](#heroku-deployment)
7. [Docker Deployment](#docker-deployment)
8. [Post-Deployment](#post-deployment)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

- Node.js 20+ installed
- MongoDB database (local or cloud)
- Git repository
- Domain name (optional)
- SSL certificate (for production)

---

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file:

```env
# Server
NODE_ENV=production
PORT=5000

# Database (MongoDB Atlas recommended)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/c3m_centralia?retryWrites=true&w=majority

# JWT (Generate strong secrets)
JWT_SECRET=<generate-strong-secret-key-here>
JWT_REFRESH_SECRET=<generate-strong-refresh-secret-key-here>
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=c3m-centralia-production

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@yourdomain.com

# App URLs
FRONTEND_URL=https://yourdomain.com
```

### Generate Strong Secrets

```bash
# Generate JWT secrets (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 64
```

---

## Deployment Options

### Option 1: Traditional Server (VPS/Dedicated)

- **Pros**: Full control, cost-effective for scale
- **Cons**: More maintenance, requires DevOps knowledge
- **Best for**: Production apps with specific requirements

### Option 2: Platform as a Service (Heroku, Railway)

- **Pros**: Easy deployment, managed infrastructure
- **Cons**: Can be expensive at scale
- **Best for**: MVP, rapid prototyping

### Option 3: Container Platform (AWS ECS, Google Cloud Run)

- **Pros**: Scalable, modern architecture
- **Cons**: More complex setup
- **Best for**: Scalable production applications

### Option 4: Serverless (AWS Lambda, Vercel)

- **Pros**: Auto-scaling, pay-per-use
- **Cons**: Cold starts, platform limitations
- **Best for**: Variable traffic patterns

---

## MongoDB Atlas Setup

### 1. Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (M0 Free tier available)

### 2. Configure Database Access

1. Database Access → Add New Database User
2. Choose "Password" authentication
3. Create username and strong password
4. Set privileges to "Read and write to any database"

### 3. Configure Network Access

1. Network Access → Add IP Address
2. For development: Allow access from anywhere (0.0.0.0/0)
3. For production: Add specific IP addresses

### 4. Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password

Example:

```
mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/c3m_centralia?retryWrites=true&w=majority
```

---

## AWS Deployment

### Using AWS Elastic Beanstalk

#### 1. Install AWS CLI and EB CLI

```bash
# Install AWS CLI
pip install awscli

# Install Elastic Beanstalk CLI
pip install awsebcli

# Configure AWS credentials
aws configure
```

#### 2. Initialize Elastic Beanstalk

```bash
# Initialize EB in your project
eb init

# Select:
# - Region: us-east-1 (or your preferred region)
# - Application name: c3m-centralia-backend
# - Platform: Node.js
# - SSH: Yes (recommended)
```

#### 3. Create Environment

```bash
# Create production environment
eb create c3m-production

# Or create staging environment
eb create c3m-staging
```

#### 4. Set Environment Variables

```bash
eb setenv \
  NODE_ENV=production \
  MONGODB_URI="mongodb+srv://..." \
  JWT_SECRET="your_secret" \
  JWT_REFRESH_SECRET="your_refresh_secret" \
  CORS_ORIGIN="https://yourdomain.com" \
  AWS_ACCESS_KEY_ID="your_key" \
  AWS_SECRET_ACCESS_KEY="your_secret" \
  AWS_REGION="us-east-1" \
  AWS_S3_BUCKET="your_bucket"
```

#### 5. Deploy

```bash
# Deploy to current environment
eb deploy

# Check status
eb status

# View logs
eb logs

# Open application in browser
eb open
```

### Using AWS EC2 (Manual Setup)

#### 1. Launch EC2 Instance

1. AWS Console → EC2 → Launch Instance
2. Choose Ubuntu Server 22.04 LTS
3. Instance type: t2.micro (free tier) or t2.small
4. Configure security group:
   - SSH (22) - Your IP
   - HTTP (80) - Anywhere
   - HTTPS (443) - Anywhere
   - Custom TCP (5000) - Anywhere

#### 2. Connect to Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

#### 3. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install -y nginx
```

#### 4. Clone and Setup Project

```bash
# Clone repository
git clone https://github.com/yourusername/c3m-centralia-backend.git
cd c3m-centralia-backend

# Install dependencies
npm install

# Create .env file
nano .env
# Paste your production environment variables

# Build TypeScript
npm run build
```

#### 5. Start with PM2

```bash
# Start application
pm2 start dist/server.js --name c3m-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Monitor application
pm2 status
pm2 logs c3m-api
```

#### 6. Configure Nginx (Optional)

```bash
sudo nano /etc/nginx/sites-available/c3m-api
```

Add configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/c3m-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

---

## Heroku Deployment

### 1. Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu
curl https://cli-assets.heroku.com/install.sh | sh

# Windows
# Download installer from https://devcenter.heroku.com/articles/heroku-cli
```

### 2. Login and Create App

```bash
# Login to Heroku
heroku login

# Create app
heroku create c3m-centralia-api

# Add MongoDB addon (optional)
heroku addons:create mongolab:sandbox
```

### 3. Configure Environment Variables

```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="mongodb+srv://..."
heroku config:set JWT_SECRET="your_secret"
heroku config:set JWT_REFRESH_SECRET="your_refresh_secret"
heroku config:set CORS_ORIGIN="https://yourdomain.com"
```

### 4. Create Procfile

```bash
echo "web: npm start" > Procfile
```

### 5. Deploy

```bash
# Add Heroku remote
heroku git:remote -a c3m-centralia-api

# Push to Heroku
git push heroku main

# Check logs
heroku logs --tail

# Open app
heroku open
```

---

## Docker Deployment

### 1. Create Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]
```

### 2. Create .dockerignore

```
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
dist
```

### 3. Create docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '5000:5000'
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
    restart: unless-stopped
    depends_on:
      - mongodb

  mongodb:
    image: mongo:8
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    restart: unless-stopped

volumes:
  mongodb_data:
```

### 4. Build and Run

```bash
# Build image
docker build -t c3m-api .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 5. Deploy to Docker Registry

```bash
# Tag image
docker tag c3m-api your-registry/c3m-api:latest

# Push to registry
docker push your-registry/c3m-api:latest
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Check health endpoint
curl https://api.yourdomain.com/health

# Expected response:
# {"status":"ok","message":"Server is running","timestamp":"..."}
```

### 2. Test API Endpoints

```bash
# Test registration
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### 3. Setup Monitoring

#### Using PM2 (if deployed on EC2)

```bash
# Enable monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# View monitoring dashboard
pm2 monit
```

#### Setup External Monitoring

Consider these services:

- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry, Rollbar
- **Performance**: New Relic, Datadog
- **Logs**: Papertrail, LogDNA

### 4. Setup Backups

#### MongoDB Atlas (Automated)

1. Atlas Console → Backup
2. Enable Cloud Backup
3. Configure backup schedule
4. Set retention policies

#### Manual Backups (EC2)

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="./backups/backup_$TIMESTAMP"
# Upload to S3
aws s3 cp ./backups/backup_$TIMESTAMP s3://your-backup-bucket/ --recursive
# Remove local backup after 7 days
find ./backups -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Add health check script
cat > health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="https://api.yourdomain.com/health"
if curl -f $HEALTH_URL > /dev/null 2>&1; then
    echo "$(date): API is healthy"
else
    echo "$(date): API is down! Restarting..."
    pm2 restart c3m-api
    # Send alert
    curl -X POST https://hooks.slack.com/... -d '{"text":"API is down!"}'
fi
EOF

chmod +x health-check.sh

# Run every 5 minutes
crontab -e
# Add: */5 * * * * /path/to/health-check.sh >> /var/log/health-check.log 2>&1
```

### Log Management

```bash
# View PM2 logs
pm2 logs c3m-api --lines 100

# Clear old logs
pm2 flush

# Application logs
tail -f /var/log/c3m-api.log
```

### Update Deployment

```bash
# On server
cd /path/to/c3m-centralia-backend
git pull origin main
npm install
npm run build
pm2 restart c3m-api
```

### Security Best Practices

1. **Keep dependencies updated**

   ```bash
   npm audit
   npm update
   ```

2. **Enable firewall**

   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow http
   sudo ufw allow https
   ```

3. **Setup fail2ban** (prevents brute force)

   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```

4. **Regular security audits**
   - Review access logs
   - Monitor authentication attempts
   - Check for unusual activity

5. **Implement rate limiting** (already configured in code)

---

## Troubleshooting

### Common Issues

#### MongoDB Connection Failed

```bash
# Check MongoDB URI format
echo $MONGODB_URI

# Test connection
mongo "$MONGODB_URI" --eval "db.adminCommand('ping')"
```

#### Application Won't Start

```bash
# Check Node.js version
node --version  # Should be 20+

# Check for port conflicts
sudo lsof -i :5000

# Check environment variables
printenv | grep NODE
```

#### High Memory Usage

```bash
# Check PM2 status
pm2 status

# Restart application
pm2 restart c3m-api

# Increase memory limit
pm2 start dist/server.js --name c3m-api --max-memory-restart 500M
```

#### SSL Certificate Issues

```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Check certificate expiration
sudo certbot certificates
```

---

## Rollback Strategy

### Quick Rollback

```bash
# If using PM2, keep old version
pm2 save --force

# If issues occur, revert git
git revert HEAD
npm install
npm run build
pm2 restart c3m-api
```

### Blue-Green Deployment

1. Deploy new version to separate environment
2. Test thoroughly
3. Switch traffic to new version
4. Keep old version running for quick rollback

---

## Support

For issues and questions:

- GitHub Issues: [your-repo-url]
- Email: support@yourdomain.com
- Documentation: [docs-url]
