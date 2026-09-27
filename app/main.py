"""
VarshaNetra Backend API Service
FastAPI Application with Nowcast Router Registration
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import nowcast

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="VarshaNetra Disaster Intelligence API",
    description="Live Doppler Radar, Satellite Nowcasting, and Flood Decision Support System",
    version="1.0.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register nowcast router as specified in Section D
app.include_router(nowcast.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "VarshaNetra FastAPI Backend"}
