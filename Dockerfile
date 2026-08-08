FROM python:3.12-slim

COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir
COPY data data
COPY src src
COPY static static
COPY templates templates
COPY app.py .

EXPOSE 5000

CMD ["python3", "app.py"]