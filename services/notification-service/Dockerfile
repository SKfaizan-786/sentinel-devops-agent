FROM node:18-alpine

WORKDIR /app

# Copy package files first to leverage Docker layer caching
# This layer only changes when package*.json files change
COPY package*.json ./

# Install dependencies (use ci for deterministic, faster builds in CI/CD/Docker)
# Dependencies are installed in a separate layer that can be cached
RUN npm ci --only=production

# Copy the rest of the application code
# This layer will be rebuilt when application code changes, but dependencies remain cached
COPY . .

EXPOSE 3003

CMD ["npm", "start"]
