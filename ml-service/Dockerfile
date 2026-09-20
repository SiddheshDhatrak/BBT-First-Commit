FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
COPY data ./data
# Train at build time so the image never serves 503s; artifacts stay out of git.
RUN python -m src.train
EXPOSE 8001
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8001"]
