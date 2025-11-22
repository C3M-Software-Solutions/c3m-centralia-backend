# Docker Setup Guide

This guide explains how to run the C3M Centralia Backend using Docker and Docker Compose.

## Prerequisites

- Docker installed ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed ([Install Docker Compose](https://docs.docker.com/compose/install/))

## Quick Start

### 1. Start all services

```bash
docker-compose up -d
```

This will start:
- **MongoDB** on port `27017`
- **API Server** on port `5000`
- **Mongo Express** (MongoDB GUI) on port `8081`

### 2. View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f mongodb
```

### 3. Stop all services

```bash
docker-compose down
```

### 4. Stop and remove volumes (clean start)

```bash
docker-compose down -v
```

## Services

### API Server
- **Port**: 5000
- **URL**: http://localhost:5000
- **Health Check**: http://localhost:5000/health
- **API Docs**: http://localhost:5000/api-docs

### MongoDB
- **Port**: 27017
- **Username**: admin
- **Password**: admin123
- **Database**: c3m_centralia
- **Connection String**: `mongodb://admin:admin123@localhost:27017/c3m_centralia?authSource=admin`

### Mongo Express (Database GUI)
- **Port**: 8081
- **URL**: http://localhost:8081
- **Username**: admin
- **Password**: admin123

## Environment Variables

You can override environment variables by creating a `.env` file in the project root:

```env
# Server
NODE_ENV=development
PORT=5000

# JWT
JWT_SECRET=your_custom_secret
JWT_REFRESH_SECRET=your_custom_refresh_secret

# CORS
CORS_ORIGIN=http://localhost:3000

# AWS (optional)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
```

## Docker Commands

### Build images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build api

# Build without cache
docker-compose build --no-cache
```

### Restart services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart api
```

### Execute commands in containers

```bash
# Access API container shell
docker-compose exec api sh

# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p admin123

# Run npm commands
docker-compose exec api npm install
docker-compose exec api npm run build
```

### View service status

```bash
docker-compose ps
```

### Remove specific service

```bash
docker-compose rm api
```

## Production Deployment

### 1. Build production image

```bash
docker build -t c3m-api:latest .
```

### 2. Run production container

```bash
docker run -d \
  --name c3m-api \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI="your_mongodb_uri" \
  -e JWT_SECRET="your_secret" \
  -e JWT_REFRESH_SECRET="your_refresh_secret" \
  c3m-api:latest
```

### 3. Using docker-compose for production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    image: c3m-api:latest
    restart: always
    environment:
      NODE_ENV: production
      MONGODB_URI: ${MONGODB_URI}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    ports:
      - "5000:5000"
```

Run:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Development Workflow

### Hot Reload Development

The docker-compose setup includes volume mounting for hot reload:

1. Start services:
```bash
docker-compose up
```

2. Edit files in `src/` directory
3. Changes will automatically reload (using `tsx watch`)

### Install new dependencies

```bash
# Stop containers
docker-compose down

# Install dependency
npm install package-name

# Rebuild and start
docker-compose up --build
```

## Troubleshooting

### Port already in use

If ports are already in use, modify `docker-compose.yml`:

```yaml
services:
  api:
    ports:
      - "5001:5000"  # Change external port
  mongodb:
    ports:
      - "27018:27017"  # Change external port
```

### MongoDB connection issues

1. Check MongoDB is running:
```bash
docker-compose ps mongodb
```

2. Check logs:
```bash
docker-compose logs mongodb
```

3. Wait for MongoDB health check to pass:
```bash
docker-compose ps
# Wait until mongodb shows "healthy"
```

### Reset database

```bash
# Stop services and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

### API not starting

1. Check logs:
```bash
docker-compose logs api
```

2. Check if MongoDB is ready:
```bash
docker-compose exec mongodb mongosh -u admin -p admin123 --eval "db.adminCommand('ping')"
```

### Build cache issues

```bash
# Clear build cache
docker-compose build --no-cache

# Remove all unused Docker objects
docker system prune -a
```

## Health Checks

All services include health checks:

```bash
# Check API health
curl http://localhost:5000/health

# Check MongoDB health
docker-compose exec mongodb mongosh -u admin -p admin123 --eval "db.adminCommand('ping')"
```

## Monitoring

### View resource usage

```bash
docker stats
```

### View container details

```bash
docker-compose exec api printenv
```

## Backup and Restore

### Backup MongoDB

```bash
# Create backup
docker-compose exec mongodb mongodump \
  --username admin \
  --password admin123 \
  --authenticationDatabase admin \
  --db c3m_centralia \
  --out /data/backup

# Copy backup to host
docker cp c3m-mongodb:/data/backup ./backup
```

### Restore MongoDB

```bash
# Copy backup to container
docker cp ./backup c3m-mongodb:/data/backup

# Restore
docker-compose exec mongodb mongorestore \
  --username admin \
  --password admin123 \
  --authenticationDatabase admin \
  --db c3m_centralia \
  /data/backup/c3m_centralia
```

## Security Notes

⚠️ **Important for Production**:

1. Change default passwords in `docker-compose.yml`
2. Use Docker secrets for sensitive data
3. Don't expose MongoDB port publicly
4. Use strong JWT secrets
5. Enable MongoDB authentication
6. Use HTTPS/TLS in production
7. Implement rate limiting
8. Regular security updates

## Useful Links

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
