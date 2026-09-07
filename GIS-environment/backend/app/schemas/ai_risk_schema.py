from pydantic import BaseModel, Field
from typing import List, Optional

class WeatherDataInput(BaseModel):
    temperature: float = Field(..., description="Temperature in Celsius")
    apparent_temperature: Optional[float] = Field(None, description="Feels like temperature")
    humidity: float = Field(..., description="Relative humidity percentage (0-100)")
    pressure: float = Field(..., description="Pressure in hPa")
    wind_speed: float = Field(..., description="Wind speed in km/h")
    wind_gust: Optional[float] = Field(None, description="Wind gust in km/h")
    rainfall: float = Field(..., description="Precipitation rate in mm/h")
    cloud_cover: Optional[float] = Field(0, description="Cloud cover percentage")
    aqi: Optional[float] = Field(45, description="Air Quality Index")

class RiskAssessmentDetail(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Risk score from 0 to 100")
    category: str = Field(..., description="VERY_LOW | LOW | MODERATE | HIGH | EXTREME")
    confidence: int = Field(..., ge=0, le=100, description="Confidence percentage")
    contributing_factors: List[str] = Field(default_factory=list)
    summary: str
    recommendations: List[str] = Field(default_factory=list)

class CompositeAIRiskResponse(BaseModel):
    success: bool
    location_name: Optional[str] = "Regional Target"
    composite_risk_score: int
    composite_risk_category: str
    overall_confidence: int
    storm_risk: RiskAssessmentDetail
    heavy_rain_risk: RiskAssessmentDetail
    high_wind_risk: RiskAssessmentDetail
    heat_stress_risk: RiskAssessmentDetail
    aqi_risk: RiskAssessmentDetail
    ai_executive_summary: str
