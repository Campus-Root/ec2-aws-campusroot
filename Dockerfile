
# Use an official Node.js runtime as a parent image
FROM node:22

# Set the working directory in the container
RUN mkdir /opt/app
WORKDIR /opt/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install 

# Copy the rest of the application code
COPY . ./

# Install PM2 globally
RUN npm i pm2@latest -g

# Expose the port on which your application runs (adjust if needed)
EXPOSE 1234

# Start the application using PM2
CMD ["pm2-runtime", "src/index.js"]
