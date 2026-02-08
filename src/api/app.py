"""
Kenya Farm IoT - API Application
"""
from fastapi import FastAPI

app = FastAPI(
    title="Kenya Farm IoT",
    description="Smart farming and agricultural monitoring API",
    version="0.1.0",
)


@app.get("/")
async def root():
    return {"message": "Kenya Farm IoT API", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
