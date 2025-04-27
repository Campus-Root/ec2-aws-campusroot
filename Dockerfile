# Use Node.js LTS version
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose the port on which your application runs
EXPOSE 1239

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
