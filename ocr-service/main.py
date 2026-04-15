import logging
import os
import tempfile
from functools import lru_cache

from fastapi import FastAPI, File, HTTPException, UploadFile
from pdf2image import convert_from_bytes

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()


@lru_cache(maxsize=1)
def get_ocr_engine():
    from rapidocr_onnxruntime import RapidOCR
    return RapidOCR()


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/ocr")
async def perform_ocr(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="文件内容为空")

    logger.info(f"Received {len(pdf_bytes)} bytes")
    try:
        ocr = get_ocr_engine()
        logger.info("OCR engine ready")
        lines = []
        with tempfile.TemporaryDirectory() as tmpdir:
            images = convert_from_bytes(pdf_bytes, dpi=150)
            logger.info(f"Converted to {len(images)} pages")
            for i, img in enumerate(images):
                img_path = os.path.join(tmpdir, f"page_{i:04d}.png")
                img.save(img_path, "PNG")
                img.close()
                result, _ = ocr(img_path)
                if result:
                    for item in result:
                        text = item[1]
                        if text and text.strip():
                            lines.append(text.strip())
        return {"text": "\n".join(lines)}
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        raise HTTPException(status_code=500, detail=f"OCR 识别失败: {e}")


@app.post("/analyze-pages")
async def analyze_pages(file: UploadFile = File(...)):
    """逐页 OCR，返回每页文字列表，供证据整理功能使用"""
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="文件内容为空")
    try:
        ocr = get_ocr_engine()
        pages = []
        with tempfile.TemporaryDirectory() as tmpdir:
            images = convert_from_bytes(pdf_bytes, dpi=150)
            for i, img in enumerate(images):
                img_path = os.path.join(tmpdir, f"page_{i:04d}.png")
                img.save(img_path, "PNG")
                img.close()
                result, _ = ocr(img_path)
                text = "\n".join(item[1].strip() for item in result if item[1] and item[1].strip()) if result else ""
                pages.append({"page": i + 1, "text": text})
        return {"pages": pages}
    except Exception as e:
        logger.error(f"analyze-pages failed: {e}")
        raise HTTPException(status_code=500, detail=f"逐页 OCR 失败: {e}")
