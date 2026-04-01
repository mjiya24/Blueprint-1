FROM python:3.11-slim
WORKDIR /app

# 1. Copy the entire project
COPY . .

# 2. Install standard dependencies from the backend folder
RUN cd backend && pip install --no-cache-dir -r requirements.txt

# 3. Set environment variables so Python can find the .emergent folder
ENV PYTHONPATH="/app:/app/backend"
ENV PORT=10000
EXPOSE 10000

# 4. Start the app
WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]