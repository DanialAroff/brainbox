# Deployment Guide

This guide covers how to deploy your FAQ Hub API to a server so others can use it.

## Prerequisites

Before deploying, you'll need:
1. A server or hosting platform
2. A running ChromaDB instance (accessible from your server)
3. An embedding service (LM Studio or compatible API)
4. Your FAQ files ready to ingest

---

## Configuration

### Step 1: Create Environment File

Copy `.env.example` to `.env` and configure for your production environment:

```bash
cp .env.example .env
```

Edit `.env` with your production values:

```env
# Server Configuration
PORT=3000

# Embedding Service Configuration
# This should point to your production embedding service (LM Studio, llama.cpp, or any OpenAI-compatible API)
EMBEDDING_SERVICE_URL=https://your-embedding-service.com/v1/embeddings
EMBED_MODEL=text-embedding-nomic-embed-text-v1.5

# ChromaDB Configuration
# Update these to point to your production ChromaDB instance
CHROMA_HOST=your-chromadb-server.com
CHROMA_PORT=8000
CHROMA_SSL=true
COLLECTION_NAME=internal-faq

# FAQ Files Directory
# Use absolute path on server or relative to project root
FAQS_PATH=/var/data/faqs

# CORS Configuration
# Specify allowed origins (comma-separated) or use * for all
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

### Important Configuration Notes:

1. **Embedding Service**: You'll need to deploy your own embedding service or use a cloud provider. Options include:
   - Self-hosted LM Studio on a GPU server
   - OpenAI API (requires code modification)
   - HuggingFace Inference API
   - Custom embedding service

2. **ChromaDB**: Deploy ChromaDB separately:
   - Use Docker: `docker run -p 8000:8000 chromadb/chroma`
   - Or use ChromaDB Cloud
   - Ensure it's accessible from your API server

3. **File Storage**: Your FAQ files need to be accessible on the server. You can:
   - Upload files to the server
   - Mount a network drive
   - Use cloud storage (requires code modification)

---

## Deployment Options

### Option 1: Traditional VPS (DigitalOcean, Linode, AWS EC2)

**Pros**: Full control, flexible, cost-effective for high traffic
**Cons**: Requires server management

#### Steps:

1. **Connect to your server**:
   ```bash
   ssh user@your-server.com
   ```

2. **Install Node.js** (if not installed):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone or upload your project**:
   ```bash
   git clone your-repo-url
   cd internal-faq-hub
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Create and configure .env file** (see Configuration section above)

6. **Upload FAQ files** to the path specified in `FAQS_PATH`

7. **Start with PM2** (process manager):
   ```bash
   npm install -g pm2
   pm2 start npm --name "faq-api" -- run api
   pm2 save
   pm2 startup
   ```

8. **Set up reverse proxy** (Nginx example):
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

9. **Set up SSL** with Let's Encrypt:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

---

### Option 2: Platform as a Service (Heroku, Railway, Render)

**Pros**: Easy deployment, automatic scaling, managed infrastructure
**Cons**: More expensive, less control

#### Railway (Recommended for simplicity):

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and initialize**:
   ```bash
   railway login
   railway init
   ```

3. **Add environment variables**:
   ```bash
   railway variables set EMBEDDING_SERVICE_URL="your-url"
   railway variables set CHROMA_HOST="your-host"
   # ... add all other env vars
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

5. **Configure start command** in Railway dashboard:
   - Start command: `npm run api`

#### Render:

1. Create a new Web Service on [render.com](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - Build Command: `npm install`
   - Start Command: `npm run api`
4. Add environment variables in the dashboard
5. Deploy

---

### Option 3: Docker Deployment

**Pros**: Consistent environment, easy to scale, works anywhere
**Cons**: Requires Docker knowledge

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:20-slim

   WORKDIR /app

   COPY package*.json ./
   RUN npm ci --only=production

   COPY . .

   EXPOSE 3000

   CMD ["npm", "run", "api"]
   ```

2. **Create docker-compose.yml** (includes ChromaDB):
   ```yaml
   version: '3.8'

   services:
     api:
       build: .
       ports:
         - "3000:3000"
       environment:
         - CHROMA_HOST=chromadb
         - CHROMA_PORT=8000
       depends_on:
         - chromadb
       volumes:
         - ./data:/app/data

     chromadb:
       image: chromadb/chroma
       ports:
         - "8000:8000"
       volumes:
         - chromadb_data:/chroma/chroma

   volumes:
     chromadb_data:
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

---

### Option 4: Serverless (AWS Lambda, Vercel, Netlify Functions)

**Pros**: Pay per request, auto-scaling
**Cons**: Cold starts, limited execution time, complex setup

**Note**: This API is not ideal for serverless due to:
- Long-running embedding operations
- Persistent ChromaDB connection
- File system dependencies

If you must use serverless, consider:
- Breaking into separate functions
- Using managed ChromaDB cloud
- Using cloud storage for files
- Adding caching layer

---

## Post-Deployment Steps

### 1. Ingest Your FAQ Files

After deployment, populate the database:

```bash
curl -X POST https://your-api-url.com/api/ingest \
  -H "Content-Type: application/json" \
  -d '{}'
```

Or SSH into your server and run:
```bash
npm run ingest
```

### 2. Test the API

```bash
# Health check
curl https://your-api-url.com/health

# Search test
curl -X POST https://your-api-url.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test question", "limit": 3}'
```

### 3. Monitor Your Service

Set up monitoring:
- Use PM2 monitoring: `pm2 monit`
- Set up error tracking (e.g., Sentry)
- Configure logs aggregation
- Set up uptime monitoring (e.g., UptimeRobot)

### 4. Secure Your API

Consider adding:
- API key authentication
- Rate limiting
- Request validation
- HTTPS only
- Firewall rules

Example: Add API key middleware to `api.ts`:
```typescript
app.use((req, res, next) => {
  const apiKey = req.header('X-API-Key');
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

---

## Scaling Considerations

### For High Traffic:

1. **Horizontal Scaling**:
   - Deploy multiple API instances
   - Use load balancer (Nginx, HAProxy, or cloud LB)
   - Ensure ChromaDB can handle concurrent connections

2. **Caching**:
   - Cache frequent queries with Redis
   - Cache embeddings to reduce API calls
   - Use CDN for static responses

3. **Database Optimization**:
   - Use ChromaDB with persistent storage
   - Consider indexing optimizations
   - Monitor query performance

4. **Rate Limiting**:
   ```bash
   npm install express-rate-limit
   ```

   Add to `api.ts`:
   ```typescript
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });

   app.use(limiter);
   ```

---

## Troubleshooting

### Common Issues:

1. **Can't connect to ChromaDB**:
   - Check `CHROMA_HOST` and `CHROMA_PORT`
   - Verify ChromaDB is running: `curl http://CHROMA_HOST:CHROMA_PORT/api/v1/heartbeat`
   - Check firewall rules

2. **Embedding service timeout**:
   - Verify `EMBEDDING_SERVICE_URL` is correct and accessible
   - Check if embedding service is running
   - Increase timeout if needed

3. **File path errors**:
   - Verify `FAQS_PATH` is correct
   - Check file permissions: `ls -la /path/to/faqs`
   - Use absolute paths in production

4. **CORS errors**:
   - Update `CORS_ORIGIN` in .env
   - Ensure protocol (http/https) matches

---

## Cost Estimation

### Self-Hosted VPS:
- Small VPS (2GB RAM): $5-12/month
- ChromaDB + API can run on same server
- Embedding service needs GPU: $30-100/month (or use cloud API)

### Platform as a Service:
- Railway/Render: ~$7-20/month for small apps
- Additional charges for ChromaDB instance
- Embedding API costs (if using OpenAI, etc.)

### Cloud Provider Comparison:
- DigitalOcean: $6/month (basic droplet)
- AWS Lightsail: $3.50/month (smallest)
- Railway: $5/month + usage
- Render: Free tier available, then $7/month

---

## Security Checklist

Before going live:

- [ ] Use HTTPS (SSL certificate)
- [ ] Set strong, unique API keys
- [ ] Configure proper CORS origins
- [ ] Add rate limiting
- [ ] Set up authentication
- [ ] Use environment variables (never commit .env)
- [ ] Enable firewall on server
- [ ] Keep dependencies updated
- [ ] Set up automated backups (ChromaDB data)
- [ ] Configure proper logging
- [ ] Monitor for errors and suspicious activity

---

## Next Steps

1. Choose your deployment platform based on your needs
2. Set up ChromaDB instance
3. Deploy or set up embedding service
4. Configure environment variables
5. Deploy the API
6. Upload and ingest FAQ files
7. Test thoroughly
8. Add authentication and monitoring
9. Share the API URL with your users!

For questions or issues, check the project documentation or create an issue in the repository.
