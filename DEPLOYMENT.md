# Gaming Chat - Deployment Guide

## Deploy to Render

### Option 1: Using Render Dashboard (Recommended)

1. **Create a Web Service**:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: gaming-chat
     - **Environment**: Node
     - **Build Command**: `npm run install:all && npm run build`
     - **Start Command**: `npm start`
     - **Environment Variables**:
       - `NODE_ENV` = `production`

2. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy your app

### Option 2: Using render.yaml (Infrastructure as Code)

1. Create a `render.yaml` file in the root directory (already created)
2. Push to GitHub
3. In Render Dashboard, click "New +" → "Blueprint"
4. Select your repository
5. Render will automatically detect and deploy using the blueprint

### Local Development

```bash
# Install dependencies
npm run install:all

# Run development servers (client + server)
npm run dev

# Client will run on http://localhost:5173
# Server will run on http://localhost:3001
```

### Build for Production

```bash
# Build client
npm run build

# Start production server
npm start
```

### Environment Variables

Create a `.env` file in the root directory:

```
PORT=3001
NODE_ENV=production
```

### Troubleshooting

- **Port Issues**: Render assigns a PORT automatically. The server uses `process.env.PORT || 3001`
- **Build Failures**: Make sure all dependencies are in package.json
- **WebSocket Issues**: Render supports WebSockets by default on all plans

### Post-Deployment

After deployment, your app will be available at:
`https://your-app-name.onrender.com`

Share this URL with friends to play together!
