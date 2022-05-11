# stage1 - build react app first 
FROM node:alpine as build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY ./package.json /app/
COPY ./yarn.lock /app/
RUN yarn
COPY . /app
RUN yarn build

# stage 2 - build the final image and copy the react build files
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d

# support running as arbitrary user which belogs to the root group
RUN chmod g+rwx /var/cache/nginx /var/run /var/log/nginx && \
    chown nginx.root /var/cache/nginx /var/run /var/log/nginx && \
    # users are not allowed to listen on priviliged ports
    sed -i.bak 's/listen\(.*\)80;/listen 8081;/' /etc/nginx/conf.d/nginx.conf && \
    # Make /etc/nginx/html/ available to use
    mkdir -p /etc/nginx/html/ && chmod 777 /etc/nginx/html/ && \
    # comment user directive as master process is run as user in OpenShift anyhow
    sed -i.bak 's/^user/#user/' /etc/nginx/nginx.conf && \
    # Increase the number of worker connections per process
    sed -i 's/worker_connections\s*1024/worker_connections 10240/' /etc/nginx/nginx.conf


EXPOSE 8081

USER nginx:root

CMD ["nginx", "-g", "daemon off;"]