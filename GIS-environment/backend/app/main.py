from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import httpx

app = FastAPI(
    title="AI Weather Intelligence Platform Backend API",
    description="Scalable enterprise API backend for global weather monitoring, GIS overlays, and AI prediction models.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WeatherQuery(BaseModel):
    latitude: float
    longitude: float
    target_date: Optional[str] = None

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "AI Weather Intelligence Platform Backend",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/weather/prediction")
def get_weather_prediction(query: WeatherQuery):
    return {
        "success": True,
        "latitude": query.latitude,
        "longitude": query.longitude,
        "target_date": query.target_date,
        "prediction": {
            "probability": 15,
            "risk_level": "LOW",
            "confidence": 92,
            "message": "Atmospheric pressure and gradient remain stable."
        }
    }

from app.schemas.ai_risk_schema import (
    WeatherDataInput,
    CompositeAIRiskResponse,
)
from app.ai.risk_facade import AIRiskOrchestrator

@app.post("/api/v1/ai/risk/assess", response_model=CompositeAIRiskResponse)
def assess_ai_risk(input_data: WeatherDataInput, location_name: Optional[str] = "Regional Target"):
    return AIRiskOrchestrator.assess_risk(input_data, location_name)


# --- GDACS Proxy Route (fixes browser CORS block) ---
@app.get("/api/v1/gdacs/storms")
async def get_gdacs_storms():
    """
    Proxies the GDACS disaster GeoJSON feed server-side, avoiding the
    browser CORS restriction that blocks direct client-side fetches
    from www.gdacs.org.
    """
    url = "https://www.gdacs.org/xml/gdacs.geojson"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch GDACS data: {str(exc)}"
        )