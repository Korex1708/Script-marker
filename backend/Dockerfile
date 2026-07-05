FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# Full install (not --production) is required here — `npx prisma generate` below needs
# the `prisma` CLI, which is a devDependency, to produce the @prisma/client used at runtime.
RUN npm ci

COPY . .
RUN npx prisma generate

EXPOSE 3001

# `npm start` runs `prisma migrate deploy` before booting, so the schema is created/updated
# against whatever Postgres DATABASE_URL points to before the server starts accepting requests.
CMD ["npm", "start"]
