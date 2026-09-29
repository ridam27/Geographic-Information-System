import os
import re
import math
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

from app.schemas.chat_schema import (
    ChatRequest,
    ChatResponse,
    ChatSource,
    ResolvedLocation,
    ChatMessageHistory
)
from app.schemas.ai_risk_schema import WeatherDataInput
from app.ai.risk_facade import AIRiskOrchestrator
from app.ai.earth_intelligence import EarthIntelligenceEngine

# Preset Locations Map (Common Indian & Global Hubs)
LOCATION_PRESETS: Dict[str, Tuple[float, float, str]] = {
    "nagpur": (21.1458, 79.0882, "India"),
    "mumbai": (19.0760, 72.8777, "India"),
    "delhi": (28.6139, 77.2090, "India"),
    "new delhi": (28.6139, 77.2090, "India"),
    "chennai": (13.0827, 80.2707, "India"),
    "kolkata": (22.5726, 88.3639, "India"),
    "bengaluru": (12.9716, 77.5946, "India"),
    "bangalore": (12.9716, 77.5946, "India"),
    "hyderabad": (17.3850, 78.4867, "India"),
    "pune": (18.5204, 73.8567, "India"),
    "ahmedabad": (23.0225, 72.5714, "India"),
    "jaipur": (26.9124, 75.7873, "India"),
    "kochi": (9.9312, 76.2673, "India"),
    "tokyo": (35.6762, 139.6503, "Japan"),
    "new york": (40.7128, -74.0060, "USA"),
    "london": (51.5074, -0.1278, "UK"),
    "sydney": (-33.8688, 151.2093, "Australia"),
    "singapore": (1.3521, 103.8198, "Singapore"),
}

SYSTEM_PROMPT = """You are Cojag AI, the Earth Intelligence assistant for this GIS Storm Prediction application.
You answer questions using factual data supplied by the application's backend.

CRITICAL INSTRUCTIONS:
1. Never invent weather, earthquake, wildfire, volcano or storm data.
2. Never claim to predict earthquakes or volcanic eruptions.
3. Clearly distinguish:
   - LIVE OBSERVATION (e.g. current Open-Meteo weather, detected fires, recorded quakes)
   - RISK INDEX (e.g. calculated wildfire or flood risk score)
   - ML PREDICTION (e.g. storm probability model output)
   - HISTORICAL DATA / CLIMATE ANOMALY
4. When explaining a prediction, explain the actual values supplied by the backend.
5. If information is unavailable or unresolvable, clearly state so.
6. Always prioritize the application's retrieved data over general knowledge.
7. Provide clear, concise, well-structured natural language responses.
"""

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two points in km."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

class ChatService:

    @staticmethod
    async def process_chat_query(request: ChatRequest) -> ChatResponse:
        now_iso = datetime.now(timezone.utc).isoformat()
        query_text = request.message.strip()
        
        # 1. Resolve Location
        resolved_loc = await ChatService._resolve_location(query_text, request.location, request.latitude, request.longitude)
        
        # 2. Intent Detection
        intents = ChatService._detect_intents(query_text)
        
        # 3. Retrieve Live Telemetry & Build Context
        context_str, sources = await ChatService._build_factual_context(resolved_loc, intents, query_text)
        
        # 4. Call Groq API
        groq_key = os.getenv("GROQ_API_KEY", "").strip()
        groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
        
        if not groq_key or groq_key.startswith("your_"):
            # Fallback if GROQ_API_KEY is not set or invalid
            return ChatResponse(
                success=True,
                answer=f"**Live Telemetry Synthesis for {resolved_loc.name}**:\n\n{context_str}\n\n*(Note: Cojag AI reasoning engine is operating in direct telemetry mode.)*",
                sources=sources,
                location=resolved_loc,
                timestamp=now_iso,
                error="GROQ_API_KEY missing"
            )
            
        try:
            answer = await ChatService._call_groq(
                groq_key=groq_key,
                model=groq_model,
                user_message=query_text,
                context_str=context_str,
                history=request.history or []
            )
            
            return ChatResponse(
                success=True,
                answer=answer,
                sources=sources,
                location=resolved_loc,
                timestamp=now_iso
            )
        except Exception as exc:
            # Fallback on reasoning API failure
            return ChatResponse(
                success=True,
                answer=f"**Live Telemetry Synthesis for {resolved_loc.name}**:\n\n{context_str}\n\n*(Note: Cojag AI reasoning engine encountered a temporary issue: {str(exc)})*",
                sources=sources,
                location=resolved_loc,
                timestamp=now_iso,
                error=str(exc)
            )

    @staticmethod
    async def _resolve_location(
        query: str, 
        req_loc: Optional[str], 
        req_lat: Optional[float], 
        req_lng: Optional[float]
    ) -> ResolvedLocation:
        lower_q = query.lower()
        
        # 1. If explicit resolved location & coordinates were passed from frontend, use them immediately
        if req_loc and req_lat is not None and req_lng is not None:
            return ResolvedLocation(
                name=req_loc,
                latitude=req_lat,
                longitude=req_lng,
                country="Selected Location",
                source="Frontend Global Geocoder"
            )

        # 2. Try to extract explicit location preposition from query (e.g. "in London", "for Mumbai", "about Paris")
        preposition_match = re.search(r"\b(?:in|at|for|near|around|about|of|to)\s+([A-Za-z\s.\-']+)", lower_q)
        if preposition_match:
            extracted_query_loc = preposition_match.group(1).strip()
            extracted_query_loc = re.sub(r'\s+(today|tomorrow|yesterday|now|right now|\?|\!)$', '', extracted_query_loc).strip()
            if extracted_query_loc and len(extracted_query_loc) >= 2 and extracted_query_loc not in [
                "what", "is", "the", "weather", "temp", "today", "tomorrow", "storm", "risk", "here"
            ]:
                geo_res = await ChatService._geocode_open_meteo(extracted_query_loc)
                if geo_res:
                    return geo_res

        # 2. Check preset location map
        for loc_key, (lat, lng, country) in LOCATION_PRESETS.items():
            if re.search(r'\b' + re.escape(loc_key) + r'\b', lower_q):
                return ResolvedLocation(
                    name=loc_key.capitalize(),
                    latitude=lat,
                    longitude=lng,
                    country=country,
                    source="Preset Location Database"
                )

        # 3. Check passed request location parameter
        if req_loc:
            req_loc_clean = req_loc.lower().strip()
            if req_loc_clean in LOCATION_PRESETS:
                lat, lng, country = LOCATION_PRESETS[req_loc_clean]
                return ResolvedLocation(
                    name=req_loc.capitalize(),
                    latitude=lat,
                    longitude=lng,
                    country=country,
                    source="Request Location Preset"
                )
            
            geo_res = await ChatService._geocode_open_meteo(req_loc)
            if geo_res:
                return geo_res

        # 4. Fallback to provided lat/lng coordinates if given
        if req_lat is not None and req_lng is not None:
            name_label = req_loc if req_loc else f"Grid ({req_lat:.2f}, {req_lng:.2f})"
            return ResolvedLocation(
                name=name_label,
                latitude=req_lat,
                longitude=req_lng,
                country="Selected Grid Coordinates",
                source="User Map Coordinates"
            )

        # 5. Default fallback: Nagpur (21.1458, 79.0882)
        return ResolvedLocation(
            name="Nagpur",
            latitude=21.1458,
            longitude=79.0882,
            country="India",
            source="Default Regional Target (Nagpur)"
        )

    @staticmethod
    async def _geocode_open_meteo(location_name: str) -> Optional[ResolvedLocation]:
        try:
            url = f"https://geocoding-api.open-meteo.com/v1/search?name={location_name}&count=1&language=en&format=json"
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    if results:
                        item = results[0]
                        return ResolvedLocation(
                            name=item.get("name", location_name),
                            latitude=item.get("latitude", 0.0),
                            longitude=item.get("longitude", 0.0),
                            country=item.get("country", "Global"),
                            source="Open-Meteo Geocoding API"
                        )
        except Exception:
            pass
        return None

    @staticmethod
    def _detect_intents(query: str) -> List[str]:
        q = query.lower()
        intents = []
        
        weather_keywords = ['weather', 'temp', 'temperature', 'rain', 'rainy', 'raining', 'snow', 'wind', 'windy', 'humidity', 'forecast', 'sunny', 'cloud', 'cloudy', 'pressure', 'hot', 'cold', 'climate', 'today', 'tomorrow']
        storm_keywords = ['storm', 'cyclone', 'typhoon', 'hurricane', 'storm risk', 'storm probability', 'storm coming', 'gale', 'thunderstorm']
        earthquake_keywords = ['earthquake', 'quake', 'quakes', 'tremor', 'seismic', 'usgs', 'magnitude', 'tsunami']
        fire_keywords = ['fire', 'fires', 'wildfire', 'thermal', 'nasa firms', 'hotspot', 'burn']
        volcano_keywords = ['volcano', 'volcanic', 'eruption', 'ash', 'lava', 'magma']
        general_keywords = ['happening around', 'summary', 'overview', 'environment', 'gis', 'disaster', 'threats']

        if any(k in q for k in weather_keywords):
            intents.append("WEATHER")
        if any(k in q for k in storm_keywords):
            intents.append("STORM")
        if any(k in q for k in earthquake_keywords):
            intents.append("EARTHQUAKE")
        if any(k in q for k in fire_keywords):
            intents.append("WILDFIRE")
        if any(k in q for k in volcano_keywords):
            intents.append("VOLCANO")
        if any(k in q for k in general_keywords) or len(intents) >= 3:
            intents.append("GENERAL_SUMMARY")
            
        if not intents:
            intents = ["WEATHER", "STORM"]
            
        return list(set(intents))

    @staticmethod
    async def _build_factual_context(
        loc: ResolvedLocation, 
        intents: List[str], 
        user_query: str
    ) -> Tuple[str, List[ChatSource]]:
        context_blocks = []
        sources: List[ChatSource] = []
        now_ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # 1. Fetch Weather Data from Open-Meteo
        weather_data = None
        if "WEATHER" in intents or "STORM" in intents or "WILDFIRE" in intents or "GENERAL_SUMMARY" in intents:
            try:
                weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={loc.latitude}&longitude={loc.longitude}&current_weather=true&hourly=relative_humidity_2m,surface_pressure,precipitation_probability,temperature_2m,wind_speed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto"
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(weather_url)
                    if resp.status_code == 200:
                        data = resp.json()
                        cw = data.get("current_weather", {})
                        hourly = data.get("hourly", {})
                        daily = data.get("daily", {})
                        
                        rh_list = hourly.get("relative_humidity_2m", [60.0])
                        rh = rh_list[0] if rh_list else 60.0
                        press_list = hourly.get("surface_pressure", [1012.0])
                        press = press_list[0] if press_list else 1012.0
                        precip_prob_list = hourly.get("precipitation_probability", [0])
                        precip_prob = precip_prob_list[0] if precip_prob_list else 0

                        # Tomorrow daily forecast
                        t_max = daily.get("temperature_2m_max", [cw.get("temperature", 30)])
                        t_min = daily.get("temperature_2m_min", [cw.get("temperature", 20)])
                        p_max = daily.get("precipitation_probability_max", [0])
                        
                        tomorrow_max = t_max[1] if len(t_max) > 1 else t_max[0]
                        tomorrow_min = t_min[1] if len(t_min) > 1 else t_min[0]
                        tomorrow_rain_prob = p_max[1] if len(p_max) > 1 else p_max[0]

                        weather_data = {
                            "temp": cw.get("temperature", 25.0),
                            "wind_speed": cw.get("windspeed", 12.0),
                            "humidity": rh,
                            "pressure": press,
                            "precip_prob": precip_prob,
                            "tomorrow_max": tomorrow_max,
                            "tomorrow_min": tomorrow_min,
                            "tomorrow_rain_prob": tomorrow_rain_prob,
                            "time": cw.get("time", now_ts)
                        }
                        
                        context_blocks.append(
                            f"LIVE WEATHER OBSERVATION (Open-Meteo API):\n"
                            f"• Location: {loc.name} ({loc.country}) [Lat {loc.latitude:.4f}, Lng {loc.longitude:.4f}]\n"
                            f"• Current Temperature: {weather_data['temp']}°C\n"
                            f"• Relative Humidity: {weather_data['humidity']}%\n"
                            f"• Wind Speed: {weather_data['wind_speed']} km/h\n"
                            f"• Barometric Pressure: {weather_data['pressure']} hPa\n"
                            f"• Current Rain Probability: {weather_data['precip_prob']}%\n"
                            f"• Tomorrow Forecast: Max {tomorrow_max}°C, Min {tomorrow_min}°C, Rain Probability {tomorrow_rain_prob}%\n"
                            f"• Observation Timestamp: {weather_data['time']}"
                        )
                        sources.append(ChatSource(name="Open-Meteo Global Weather Service", type="Weather Telemetry", timestamp=str(weather_data['time'])))
            except Exception as e:
                context_blocks.append(f"LIVE WEATHER: Telemetry currently unavailable ({str(e)})")

        # 2. Storm ML Prediction
        if "STORM" in intents or "GENERAL_SUMMARY" in intents:
            try:
                temp = weather_data["temp"] if weather_data else 30.0
                rh = weather_data["humidity"] if weather_data else 65.0
                press = weather_data["pressure"] if weather_data else 1008.0
                wind = weather_data["wind_speed"] if weather_data else 25.0
                
                w_input = WeatherDataInput(
                    temperature=temp,
                    humidity=rh,
                    pressure=press,
                    wind_speed=wind,
                    wind_gust=wind * 1.3,
                    rainfall=10.0 if (weather_data and weather_data["precip_prob"] > 50) else 0.0
                )
                
                risk_result = AIRiskOrchestrator.assess_risk(w_input, location_name=loc.name)
                storm_info = risk_result.storm_risk
                
                context_blocks.append(
                    f"STORM PREDICTION ML SYSTEM:\n"
                    f"• Target Location: {loc.name}\n"
                    f"• Model Storm Probability: {storm_info.score}%\n"
                    f"• Risk Category: {storm_info.category}\n"
                    f"• Overall Model Confidence: {storm_info.confidence}%\n"
                    f"• Contributing Factors: {', '.join(storm_info.contributing_factors)}\n"
                    f"• Executive Assessment: {storm_info.summary}\n"
                    f"• Model Run Timestamp: {now_ts}"
                )
                sources.append(ChatSource(name="GIS Storm Prediction ML Model Engine", type="ML Storm Prediction", timestamp=now_ts))
            except Exception as e:
                context_blocks.append(f"STORM ML MODEL: Inference engine unavailable ({str(e)})")

        # 3. USGS Earthquakes
        if "EARTHQUAKE" in intents or "GENERAL_SUMMARY" in intents:
            try:
                url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        eq_data = resp.json()
                        features = eq_data.get("features", [])
                        
                        eq_list = []
                        for f in features:
                            props = f.get("properties", {})
                            geom = f.get("geometry", {})
                            coords = geom.get("coordinates", [0, 0, 0])
                            eq_lat, eq_lng, eq_depth = coords[1], coords[0], coords[2]
                            dist = haversine_distance(loc.latitude, loc.longitude, eq_lat, eq_lng)
                            eq_list.append({
                                "place": props.get("place", "Unknown Location"),
                                "mag": props.get("mag", 0.0),
                                "depth": eq_depth,
                                "dist_km": dist,
                                "time": datetime.fromtimestamp(props.get("time", 0)/1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC") if props.get("time") else "Recent",
                                "alert": props.get("alert") or "green"
                            })
                            
                        # Sort by distance
                        eq_list.sort(key=lambda x: x["dist_km"])
                        nearest = eq_list[0] if eq_list else None
                        
                        # Top highest magnitude globally
                        high_mag_list = sorted(eq_list, key=lambda x: x["mag"], reverse=True)[:2]
                        
                        eq_summary = f"USGS EARTHQUAKE DETECTED ACTIVITY:\n" \
                                     f"• Total Quakes Detected Worldwide (Last 24h): {len(features)}\n"
                        if nearest:
                            eq_summary += f"• Nearest Detected Quake to {loc.name}: Mag {nearest['mag']} at {nearest['place']} ({nearest['dist_km']} km away, Depth {nearest['depth']} km, Time: {nearest['time']})\n"
                        if high_mag_list:
                            eq_summary += f"• Largest Global Quake (24h): Mag {high_mag_list[0]['mag']} at {high_mag_list[0]['place']}\n"
                        eq_summary += f"• Data Timestamp: {now_ts}\n" \
                                      f"• IMPORTANT NOTICE: USGS data records past seismic events. Science cannot predict future earthquakes."

                        context_blocks.append(eq_summary)
                        sources.append(ChatSource(name="USGS Earthquake Hazards Program", type="Seismic Observations", timestamp=now_ts))
            except Exception as e:
                context_blocks.append(f"EARTHQUAKE TELEMETRY: USGS feed currently unavailable ({str(e)})")

        # 4. Wildfires (NASA FIRMS / EONET)
        if "WILDFIRE" in intents or "GENERAL_SUMMARY" in intents:
            try:
                url = "https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires"
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        eonet_data = resp.json()
                        events = eonet_data.get("events", [])
                        
                        fire_list = []
                        for ev in events:
                            geoms = ev.get("geometry", [])
                            if geoms:
                                c = geoms[-1].get("coordinates", [0, 0])
                                f_lat, f_lng = c[1], c[0]
                                dist = haversine_distance(loc.latitude, loc.longitude, f_lat, f_lng)
                                fire_list.append({
                                    "title": ev.get("title", "Active Fire"),
                                    "dist_km": dist,
                                    "date": geoms[-1].get("date", "Recent")
                                })
                                
                        fire_list.sort(key=lambda x: x["dist_km"])
                        nearby_fires = [f for f in fire_list if f["dist_km"] <= 500]
                        
                        # Calculate physics-based Wildfire Risk Index
                        temp = weather_data["temp"] if weather_data else 32.0
                        rh = weather_data["humidity"] if weather_data else 40.0
                        wind = weather_data["wind_speed"] if weather_data else 20.0
                        wf_risk_score = min(100, max(5, int((temp * 1.5) + (wind * 1.2) - (rh * 0.8) + (20 if nearby_fires else 0))))
                        wf_risk_cat = "EXTREME" if wf_risk_score >= 80 else ("HIGH" if wf_risk_score >= 60 else ("MODERATE" if wf_risk_score >= 40 else "LOW"))

                        fire_summary = f"NASA SATELLITE ACTIVE FIRE MONITORING & WILDFIRE RISK:\n" \
                                       f"• Active Fires Detected in EONET Feed: {len(events)}\n" \
                                       f"• Active Fire Thermal Hotspots within 500km of {loc.name}: {len(nearby_fires)}\n"
                        if fire_list:
                            fire_summary += f"• Nearest Detected Fire Location: {fire_list[0]['title']} ({fire_list[0]['dist_km']} km away)\n"
                        fire_summary += f"• Calculated Wildfire Risk Index: {wf_risk_score}/100 ({wf_risk_cat} Risk)\n" \
                                        f"• Data Timestamp: {now_ts}\n" \
                                        f"• NOTE: Active fire detections reflect satellite thermal observations. Wildfire risk index estimates environmental fire susceptibility."
                        
                        context_blocks.append(fire_summary)
                        sources.append(ChatSource(name="NASA FIRMS / EONET Thermal Detection", type="Active Fire Observations", timestamp=now_ts))
            except Exception as e:
                context_blocks.append(f"WILDFIRE MONITORING: NASA FIRMS feed currently unavailable ({str(e)})")

        # 5. Volcanoes (NASA EONET / Smithsonian GVP)
        if "VOLCANO" in intents or "GENERAL_SUMMARY" in intents:
            try:
                url = "https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes"
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        volc_data = resp.json()
                        events = volc_data.get("events", [])
                        
                        volc_list = []
                        for ev in events:
                            geoms = ev.get("geometry", [])
                            if geoms:
                                c = geoms[-1].get("coordinates", [0, 0])
                                v_lat, v_lng = c[1], c[0]
                                dist = haversine_distance(loc.latitude, loc.longitude, v_lat, v_lng)
                                volc_list.append({
                                    "title": ev.get("title", "Volcano"),
                                    "dist_km": dist,
                                    "date": geoms[-1].get("date", "Active")
                                })
                                
                        volc_list.sort(key=lambda x: x["dist_km"])
                        nearest_volc = volc_list[0] if volc_list else None
                        
                        volc_summary = f"VOLCANIC ALERT MONITORING (Smithsonian GVP / NASA EONET):\n" \
                                       f"• Active Volcanic Events Monitored: {len(events)}\n"
                        if nearest_volc:
                            volc_summary += f"• Nearest Active Volcanic Activity to {loc.name}: {nearest_volc['title']} ({nearest_volc['dist_km']} km away, Status: Active/Unrest)\n"
                        volc_summary += f"• Data Timestamp: {now_ts}\n" \
                                        f"• NOTE: Observational alert monitoring. Volcanic eruptions cannot be predicted."

                        context_blocks.append(volc_summary)
                        sources.append(ChatSource(name="Smithsonian GVP / NASA EONET Volcanic Monitoring", type="Volcano Alerts", timestamp=now_ts))
            except Exception as e:
                context_blocks.append(f"VOLCANO MONITORING: NASA EONET feed currently unavailable ({str(e)})")

        full_context = "\n\n".join(context_blocks)
        return full_context, sources

    @staticmethod
    async def _call_groq(
        groq_key: str,
        model: str,
        user_message: str,
        context_str: str,
        history: List[ChatMessageHistory]
    ) -> str:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json"
        }
        
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        # Add conversation history turns (up to last 6 messages)
        for h in history[-6:]:
            if h.role in ["user", "assistant"]:
                messages.append({"role": h.role, "content": h.content})
                
        # Append current user prompt wrapped with real telemetry context
        user_prompt_with_context = f"REAL-TIME GIS TELEMETRY & CONTEXT:\n{context_str}\n\nUSER QUESTION:\n{user_message}"
        messages.append({"role": "user", "content": user_prompt_with_context})
        
        candidate_models = [model, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "groq/compound"]
        # Remove duplicates while preserving order
        candidate_models = list(dict.fromkeys(candidate_models))

        async with httpx.AsyncClient(timeout=15.0) as client:
            last_err = None
            for m in candidate_models:
                payload = {
                    "model": m,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 800
                }
                try:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        choices = res_data.get("choices", [])
                        if choices:
                            return choices[0].get("message", {}).get("content", "").strip()
                except Exception as e:
                    last_err = e

            raise last_err or ValueError("Failed to obtain completion from Groq candidate models.")
