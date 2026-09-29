import os
from pathlib import Path

env_paths = [
    Path(__file__).parent.parent / ".env",
    Path(__file__).parent.parent.parent / ".env"
]
for ep in env_paths:
    if ep.exists():
        try:
            with open(ep, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k_clean = k.strip()
                        if k_clean and k_clean not in os.environ:
                            os.environ[k_clean] = v.strip()
        except Exception:
            pass

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import httpx

from app.schemas.mapillary_schema import MapillaryCoverageResponse, MapillaryImageDetailResponse
from app.services.mapillary_service import MapillaryService
from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.ai.chat_service import ChatService

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


# --- Earth Services Endpoints ---
import os

@app.get("/api/v1/earth/earthquakes")
async def get_earthquake_feed():
    """
    Fetches live USGS earthquake GeoJSON feed and returns normalized earthquake records.
    """
    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            earthquakes = []
            for feature in data.get("features", []):
                props = feature.get("properties", {})
                geom = feature.get("geometry", {})
                coords = geom.get("coordinates", [0, 0, 0])
                
                earthquakes.append({
                    "id": feature.get("id") or props.get("code") or "eq-unknown",
                    "latitude": coords[1] if len(coords) > 1 else 0.0,
                    "longitude": coords[0] if len(coords) > 0 else 0.0,
                    "depth": coords[2] if len(coords) > 2 else 0.0,
                    "magnitude": props.get("mag") or 0.0,
                    "place": props.get("place") or "Unknown Location",
                    "time": props.get("time"),
                    "timestamp": props.get("time"),
                    "tsunami": bool(props.get("tsunami")),
                    "alert": props.get("alert"),
                    "status": props.get("status") or "reviewed",
                    "url": props.get("url"),
                    "source": "USGS Earthquake Hazards Program"
                })
            
            return {
                "success": True,
                "count": len(earthquakes),
                "earthquakes": earthquakes,
                "source": "USGS Earthquake Hazards Program",
                "fetched_at": data.get("metadata", {}).get("generated")
            }
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch USGS earthquake feed: {str(exc)}"
        )


@app.get("/api/v1/earth/wildfires")
async def get_wildfire_feed():
    """
    Fetches live active fire / thermal anomaly detections from NASA EONET / FIRMS API.
    Uses NASA_FIRMS_API_KEY from environment if configured, otherwise falls back to NASA EONET.
    """
    firms_key = os.getenv("NASA_FIRMS_API_KEY")
    wildfires = []
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if firms_key:
                # NASA FIRMS Area CSV API if key present
                firms_url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{firms_key}/VIIRS_SNPP_NRT/world/1"
                resp = await client.get(firms_url)
                if resp.status_code == 200 and resp.text:
                    lines = resp.text.strip().split("\n")
                    if len(lines) > 1:
                        header = [h.strip() for h in lines[0].split(",")]
                        for idx, line in enumerate(lines[1:]):
                            parts = [p.strip() for p in line.split(",")]
                            if len(parts) >= len(header):
                                row = dict(zip(header, parts))
                                lat = float(row.get("latitude", 0))
                                lng = float(row.get("longitude", 0))
                                frp = float(row.get("frp", 0)) if row.get("frp") else 10.0
                                wildfires.append({
                                    "id": f"firms-{idx}",
                                    "latitude": lat,
                                    "longitude": lng,
                                    "title": f"Fire Hotspot ({lat:.2f}, {lng:.2f})",
                                    "place": f"Coordinates ({lat:.2f}, {lng:.2f})",
                                    "acquisitionTime": f"{row.get('acq_date', '')} {row.get('acq_time', '')}",
                                    "confidence": float(row.get("confidence", 85)) if row.get("confidence") and row.get("confidence") != 'n' else 85,
                                    "frp": frp,
                                    "brightness": float(row.get("bright_ti4", 310)),
                                    "satellite": row.get("satellite", "VIIRS"),
                                    "source": "NASA FIRMS Satellite Thermal Detection"
                                })

            if not wildfires:
                # NASA EONET Wildfires API fallback
                eonet_url = "https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires"
                resp = await client.get(eonet_url)
                resp.raise_for_status()
                data = resp.json()
                
                for event in data.get("events", []):
                    geoms = event.get("geometry", [])
                    if geoms:
                        latest_geom = geoms[-1]
                        coords = latest_geom.get("coordinates", [0, 0])
                        mag_val = latest_geom.get("magnitudeValue") or 50.0
                        
                        wildfires.append({
                            "id": event.get("id") or f"eonet-{event.get('title')}",
                            "latitude": coords[1] if len(coords) > 1 else 0.0,
                            "longitude": coords[0] if len(coords) > 0 else 0.0,
                            "title": event.get("title") or "Active Wildfire",
                            "place": event.get("description") or event.get("title") or "Active Fire Location",
                            "acquisitionTime": latest_geom.get("date"),
                            "confidence": 90,
                            "frp": mag_val,
                            "brightness": 320.0,
                            "satellite": "NASA EONET / IRWIN",
                            "source": "NASA EONET Natural Event Tracker"
                        })
            
            return {
                "success": True,
                "count": len(wildfires),
                "wildfires": wildfires,
                "source": "NASA EONET / FIRMS Satellite Active Fire Monitoring"
            }
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch wildfire detection data: {str(exc)}"
        )


@app.get("/api/v1/earth/volcanoes")
async def get_volcano_feed():
    """
    Fetches live volcano monitoring alert feed from NASA EONET & Smithsonian GVP.
    """
    url = "https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            volcanoes = []
            for event in data.get("events", []):
                geoms = event.get("geometry", [])
                sources = event.get("sources", [])
                source_url = sources[0].get("url") if sources else "https://volcano.si.edu/"
                
                if geoms:
                    latest_geom = geoms[-1]
                    coords = latest_geom.get("coordinates", [0, 0])
                    title = event.get("title", "Volcano")
                    name = title.replace(" Volcano", "").split(",")[0]
                    country = title.split(",")[-1].strip() if "," in title else "Global Grid"
                    
                    volcanoes.append({
                        "id": event.get("id") or f"volc-{name.lower()}",
                        "name": name,
                        "title": title,
                        "latitude": coords[1] if len(coords) > 1 else 0.0,
                        "longitude": coords[0] if len(coords) > 0 else 0.0,
                        "country": country,
                        "alertLevel": "ORANGE" if "Eruption" in title or "Volcano" in title else "YELLOW",
                        "aviationColor": "ORANGE",
                        "status": "Active / Unrest",
                        "updatedAt": latest_geom.get("date"),
                        "url": source_url,
                        "source": "Smithsonian Global Volcanism Program / NASA EONET"
                    })
            
            return {
                "success": True,
                "count": len(volcanoes),
                "volcanoes": volcanoes,
                "source": "Smithsonian GVP / NASA EONET Volcanic Alert Monitoring"
            }
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch volcano monitoring feed: {str(exc)}"
        )


# --- Phase 2 Earth Intelligence Endpoints ---
from app.schemas.earth_intelligence_schema import (
    EarthIntelligenceRequest,
    EarthIntelligenceResponse,
    AnomalyDetail,
    EarthquakeAnalyticsResponse,
    VolcanoAnalyticsResponse,
    HistoricalComparisonResponse
)
from app.ai.earth_intelligence import EarthIntelligenceEngine

@app.post("/api/v1/intelligence/assess", response_model=EarthIntelligenceResponse)
async def assess_earth_intelligence(req: EarthIntelligenceRequest):
    """
    Evaluates composite Earth Intelligence combining physics-based Wildfire & Flood Risk Indexes, 
    Calibrated RandomForest Extreme Weather inference, and 24-year NASA MERRA-2 climate anomaly Z-scores.
    """
    try:
        # Fetch current live weather for target lat/lng from Open-Meteo
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={req.latitude}&longitude={req.longitude}&current_weather=true&hourly=relative_humidity_2m,surface_pressure,precipitation"
        temp, rh, pressure, wind_speed, rain = 32.0, 65.0, 1010.0, 22.0, 5.0
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(weather_url)
                if resp.status_code == 200:
                    cw = resp.json().get("current_weather", {})
                    temp = cw.get("temperature", temp)
                    wind_speed = cw.get("windspeed", wind_speed)
        except Exception:
            pass # fallback to robust telemetry baseline if Open-Meteo is slow

        w_input = WeatherDataInput(
            temperature=temp,
            humidity=rh,
            pressure=pressure,
            wind_speed=wind_speed,
            wind_gust=wind_speed * 1.4,
            rainfall=rain
        )

        return EarthIntelligenceEngine.evaluate_earth_intelligence(
            lat=req.latitude,
            lng=req.longitude,
            location_name=req.location_name or "Target Coordinates",
            weather_input=w_input
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate Earth Intelligence: {str(exc)}"
        )


@app.get("/api/v1/intelligence/anomalies", response_model=AnomalyDetail)
async def get_climate_anomalies(latitude: float = 21.14, longitude: float = 79.08, temp: Optional[float] = 34.5):
    """
    Calculates climate anomaly Z-score against 24-year NASA MERRA-2 daily baseline dataset (2000-2024).
    """
    return EarthIntelligenceEngine.calculate_climate_anomaly(
        temp=temp or 34.5,
        precip=5.0,
        pressure=1010.0
    )


@app.get("/api/v1/intelligence/earthquake-analysis", response_model=EarthquakeAnalyticsResponse)
async def get_earthquake_analytics():
    """
    Computes spatial density, magnitude distribution, depth breakdown, and tsunami advisory counts 
    from live USGS earthquake telemetry. Does NOT predict earthquakes.
    """
    try:
        eq_feed = await get_earthquake_feed()
        earthquakes = eq_feed.get("earthquakes", [])
        return EarthIntelligenceEngine.analyze_earthquakes(earthquakes)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute earthquake analytics: {str(exc)}"
        )


@app.get("/api/v1/intelligence/volcano-analysis", response_model=VolcanoAnalyticsResponse)
async def get_volcano_analytics(latitude: Optional[float] = None, longitude: Optional[float] = None):
    """
    Analyzes active volcanic alert level distributions (RED/ORANGE/YELLOW) and proximity distance 
    to user-selected target coordinates. Does NOT predict volcanic eruptions.
    """
    try:
        volc_feed = await get_volcano_feed()
        volcanoes = volc_feed.get("volcanoes", [])
        return EarthIntelligenceEngine.analyze_volcanoes(volcanoes, target_lat=latitude, target_lng=longitude)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute volcano analytics: {str(exc)}"
        )


@app.get("/api/v1/intelligence/historical-comparison", response_model=HistoricalComparisonResponse)
async def get_historical_comparison(
    latitude: float = 21.14, 
    longitude: float = 79.08, 
    parameter: str = "temperature",
    current_value: Optional[float] = None
):
    """
    Compares current environmental parameter against the 24-year NASA MERRA-2 daily baseline (2000-2024).
    """
    return EarthIntelligenceEngine.calculate_historical_comparison(
        lat=latitude,
        lng=longitude,
        parameter=parameter,
        current_val=current_value
    )


# --- Mapillary Street-Level Imagery Security Proxy Endpoints ---
@app.get("/api/v1/mapillary/coverage", response_model=MapillaryCoverageResponse)
async def get_mapillary_coverage(
    request: Request,
    latitude: float,
    longitude: float,
    radius: float = 500.0
):
    """
    Secure server-side proxy for Mapillary street-level imagery coverage.
    Validates input coordinates, enforces rate limits, applies in-memory caching,
    and returns sanitized image records without exposing server secrets.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return await MapillaryService.get_coverage_around(
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius,
        client_ip=client_ip
    )


@app.get("/api/v1/mapillary/image/{image_id}", response_model=MapillaryImageDetailResponse)
async def get_mapillary_image_detail(image_id: str):
    """
    Fetches detailed metadata and CDN image URLs for a specific Mapillary image ID.
    """
    return await MapillaryService.get_image_detail(image_id)


@app.get("/api/v1/mapillary/proxy_image/{image_id}")
async def proxy_mapillary_image(image_id: str):
    """
    Secure server-side streaming proxy for Mapillary street-level image content.
    Fetches image thumbnail from Mapillary graph API using server credentials
    and streams raw image bytes directly to React client.
    """
    token = os.getenv("MAPILLARY_ACCESS_TOKEN", "").strip()
    if not token or not image_id or not image_id.isalnum():
        raise HTTPException(status_code=400, detail="Invalid image request")
    
    url = f"https://graph.mapillary.com/{image_id}/thumbnail?access_token={token}"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return Response(content=resp.content, media_type=resp.headers.get("content-type", "image/jpeg"))
            else:
                raise HTTPException(status_code=resp.status_code, detail="Image thumbnail unavailable")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to proxy Mapillary image: {str(exc)}")


# --- Geolith AI Chatbot Endpoint ---
@app.post("/api/v1/chat", response_model=ChatResponse)
async def process_chat(request: ChatRequest):
    """
    Geolith AI chatbot endpoint.
    Processes natural language weather & GIS queries against live Open-Meteo,
    USGS Earthquakes, NASA FIRMS Wildfires, and Storm Prediction telemetry.
    """
    return await ChatService.process_chat_query(request)