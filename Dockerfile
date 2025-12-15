# Use Node.js LTS
FROM node:20-slim

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Bundle app source
COPY . .

# Build frontend
RUN npm run build

# Create data directory
RUN mkdir -p data/uploads

# Expose port
EXPOSE 3001

# Define environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start command
CMD ["npm", "start"]
