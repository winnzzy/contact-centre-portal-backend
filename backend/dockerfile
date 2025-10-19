FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy everything
COPY . .

# Install dependencies
RUN npm install

# Expose port
EXPOSE 10000

# Start the app
CMD ["npm", "start"]
