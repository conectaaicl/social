FROM node:20-alpine AS runner
RUN apk add --no-cache openssl python3 make g++ ffmpeg ttf-dejavu fontconfig
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3011

# Only install production deps (no devDependencies - much smaller + faster)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

COPY public ./public

# Copy pre-built Next.js output from host
COPY .next ./.next

EXPOSE 3011
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]
