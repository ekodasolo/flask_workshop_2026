FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_ENV=production
ENV AWS_DEFAULT_REGION=ap-northeast-1

EXPOSE 5000

CMD ["python", "app.py"]
