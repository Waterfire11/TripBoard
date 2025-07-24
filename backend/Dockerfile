# backend/Dockerfile
FROM python:3.13.5-slim
LABEL authors="Cheng JR"

WORKDIR /app

# Copy the dependency list and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the code of Django project
COPY . .

EXPOSE 8000

# Start command: Automatically execute the migration before starting the development server
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]