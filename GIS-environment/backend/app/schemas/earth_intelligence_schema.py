from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class EarthIntelligenceRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude of target coordinate")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude of target coordinate")
    location_name: Optional[str] = Field("Selected Location", description="Custom display name for target coordinate")

class RiskFactorDetail(BaseModel):
    name: str = Field(..., description="Parameter name e.g. Temperature Anomaly, Wind Gust, Soil Saturation")
    value: str = Field(..., description="Human-readable formatted parameter value e.g. 41.2°C, 85%")
    impact: str = Field(..., description="IMPACT_HIGH | IMPACT_MEDIUM | IMPACT_LOW")
    description: str = Field(..., description="Explanation of how this factor influences risk")

class AnomalyDetail(BaseModel):
    parameter: str = Field(..., description="e.g. Temperature, Precipitation, Surface Pressure")
    current_value: float = Field(..., description="Current observed value")
    historical_mean: float = Field(..., description="24-year NASA MERRA-2 historical mean")
    historical_std: float = Field(..., description="Historical standard deviation")
    anomaly_delta: float = Field(..., description="Difference from historical mean")
    z_score: float = Field(..., description="Gaussian Z-score (x - mu) / sigma")
    percentile: float = Field(..., description="Historical percentile rank (0-100)")
    classification: str = Field(..., description="NORMAL | MODERATE_ANOMALY | EXTREME_ANOMALY")

class RiskSection(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Risk score from 0 to 100")
    level: str = Field(..., description="LOW | MODERATE | HIGH | EXTREME")
    classification: str = Field(..., description="LIVE_DATA | ANALYTICS | ML_PREDICTION | RISK_INDEX")
    methodology: str = Field(..., description="Algorithm or formula name e.g. Canadian FWI / Calibrated RandomForest")
    contributing_factors: List[RiskFactorDetail] = Field(default_factory=list)
    summary: str = Field(..., description="Scientifically explainable risk summary")

class ModelMetadata(BaseModel):
    name: str
    version: str
    algorithm: str
    training_data: str
    last_trained: str
    metrics: Dict[str, Any]
    limitations: str

class EarthquakeAnalyticsResponse(BaseModel):
    success: bool
    total_events: int
    max_magnitude: float
    avg_depth: float
    shallow_count: int  # < 70km
    intermediate_count: int  # 70-300km
    deep_count: int  # > 300km
    tsunami_warnings: int
    cluster_count: int
    status_summary: str
    disclaimer: str = Field(
        "Notice: Earthquake analytics summarize spatial density and magnitude distributions. "
        "No earthquake prediction or timing forecast is generated.",
        description="Scientific scope disclaimer"
    )

class VolcanoAnalyticsResponse(BaseModel):
    success: bool
    total_monitored: int
    elevated_count: int
    red_alert_count: int
    orange_alert_count: int
    yellow_alert_count: int
    nearest_volcano: Optional[str] = None
    nearest_distance_km: Optional[float] = None
    status_summary: str
    disclaimer: str = Field(
        "Notice: Volcanic activity analysis is based on official alert levels from the Smithsonian GVP and NASA EONET. "
        "No eruption timing prediction is generated.",
        description="Scientific scope disclaimer"
    )

class HistoricalComparisonResponse(BaseModel):
    success: bool
    latitude: float
    longitude: float
    parameter: str
    current_value: float
    historical_mean: float
    historical_std: float
    anomaly_delta: float
    z_score: float
    percentile: float
    classification: str
    baseline_period: str = Field("2000-2024 (24-Year NASA MERRA-2 Baseline)")

class EarthIntelligenceResponse(BaseModel):
    success: bool
    latitude: float
    longitude: float
    location_name: str
    timestamp: str
    wildfire_risk: RiskSection
    flood_risk: RiskSection
    extreme_weather_risk: RiskSection
    climate_anomaly: AnomalyDetail
    model_metadata: Dict[str, ModelMetadata]
    data_quality: str = Field("GOOD", description="GOOD | LIMITED | UNAVAILABLE")
    disclaimer: str = Field(
        "Notice: Risk assessments combine physics-based meteorological formulas and calibrated machine learning. "
        "No earthquake or volcanic eruption predictions are generated.",
        description="Scientific scope disclaimer"
    )

