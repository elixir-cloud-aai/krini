# Stage 1: Build React app
FROM node:alpine AS build
WORKDIR /app

# Copy package files first for better caching
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . /app
RUN yarn build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration (consider using a volume for easier changes)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Optimization and Security:

# Permissions - Combined commands and more efficient
RUN chown -R nginx:root /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html && \
    chmod -R g+rw /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html

# Port change (consider using a variable for flexibility)
RUN sed -i 's/listen\(.*\)80;/listen 8081;/' /etc/nginx/conf.d/default.conf

# Remove unnecessary file and directory creation/chmod
# Nginx user directive - No longer needed in most cases (OpenShift)
RUN sed -i 's/^user/#user/' /etc/nginx/conf.d/default.conf

# Worker connections - Only if necessary
RUN sed -i 's/worker_connections\s*1024/worker_connections 10240/' /etc/nginx/conf.d/default.conf

EXPOSE 8081

# Set user in the final stage (more secure)
USER nginx:root

CMD ["nginx", "-g", "daemon off;"]