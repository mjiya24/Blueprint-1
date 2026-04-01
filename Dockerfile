FROM python:3.9-slim

# Create a working directory inside the container
WORKDIR /app

# 1. Copy the requirements file from your local backend folder
COPY backend/requirements.txt .

# 2. Install the long list of dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy all files from your local backend folder into the container's /app
# This moves server.py, the app/ folder, etc., to the top level of /app
COPY backend/ .

# 4. Define the port Render expects
ENV PORT=10000
EXPOSE 10000

# 5. Start the application
# We use 'sh -c' to ensure the $PORT environment variable is read correctly
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]