FROM python:3.11-slim
WORKDIR /app

# 1. Copy everything
COPY . .

# 2. Install dependencies
RUN cd backend && pip install --no-cache-dir -r requirements.txt

# 3. Set PYTHONPATH so it can see the folder we just renamed
ENV PYTHONPATH="/app:/app/backend:/app/emergentintegrations"
ENV PORT=10000
EXPOSE 10000

# 4. Start the app
WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]