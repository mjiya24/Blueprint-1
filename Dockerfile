FROM python:3.11-slim
WORKDIR /app

# 1. Copy everything
COPY . .

# 2. Install dependencies
RUN cd backend && pip install --no-cache-dir -r requirements.txt

# 3. Simplify the PYTHONPATH
# This tells Python to look in /app for local project modules
ENV PYTHONPATH="/app"
ENV PORT=10000
EXPOSE 10000

# 4. Start the app
WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]