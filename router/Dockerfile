FROM node:10.19.0 as builder
WORKDIR /app
COPY . /app
RUN npm install

FROM node:10.19-slim
COPY --from=builder /app .
EXPOSE 4000 8443
CMD [ "node", "appRest.js" ]