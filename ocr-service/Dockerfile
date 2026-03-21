FROM python:3.10-slim

# 安装 poppler-utils（pdf2image 依赖）和字体支持
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先复制依赖文件以利用 Docker 层缓存
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# 暴露服务端口
EXPOSE 8866

# 首次运行时 PaddleOCR 会自动下载模型，预热阶段需联网
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8866", "--timeout-keep-alive", "120", "--h11-max-incomplete-event-size", "104857600"]
