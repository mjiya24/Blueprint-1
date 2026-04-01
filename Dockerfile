FROM python:3.11-slim

WORKDIR /app

# 1. Copy everything (including the .emergent folder) into the container first
COPY . .

# 2. Install dependencies 
# We move into the backend folder to run the install so it finds requirements.txt
RUN cd backend && pip install --no-cache-dir -r requirements.txt

# 3. Define the port Render expects
ENV PORT=10000
EXPOSE 10000

# 4. Start the application from the backend directory
WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]