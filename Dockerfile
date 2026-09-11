# Multi-stage: Vite build + FastAPI serving SPA at same origin.
# Deploy target: Railway / Render / any Docker PaaS with managed Postgres.

FROM node:22-bookworm-slim AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_BASE_URL=/api
ENV VITE_USE_MOCK=false
RUN npm run build

FROM python:3.11-slim-bookworm
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential libpq-dev \
  && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY pycore ./pycore
COPY backend ./backend
RUN pip install --no-cache-dir -e .

COPY --from=frontend /fe/dist ./frontend/dist

ENV PYTHONPATH=/app:/app/backend
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DEBUG=false
ENV STATIC_DIR=/app/frontend/dist
ENV UPLOAD_DIR=/app/backend/data/uploads
ENV MAIL_DEV_PRINT=true

EXPOSE 8000

WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn src.main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000}"]
