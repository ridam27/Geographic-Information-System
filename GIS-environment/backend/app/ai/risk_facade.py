from app.schemas.ai_risk_schema import (
    WeatherDataInput,
    CompositeAIRiskResponse,
    RiskAssessmentDetail,
)
from app.ai.risk_engine.storm_risk import calculate_storm_risk
from app.ai.risk_engine.rain_wind_risk import calculate_rain_wind_risk

class AIRiskOrchestrator:
    @staticmethod
    def assess_risk(data: WeatherDataInput, location_name: str = "Target Grid") -> CompositeAIRiskResponse:
        storm = calculate_storm_risk(data.temperature, data.humidity, data.pressure, data.wind_speed, data.rainfall)
        rain_wind = calculate_rain_wind_risk(data.rainfall, data.wind_speed, data.wind_gust or 0)
        
        # Heat stress evaluation
        heat_score = min(100, max(0, int((data.temperature - 25) * 4 + (data.humidity - 50) * 0.5)))
        heat_cat = "HIGH" if heat_score >= 60 else "MODERATE" if heat_score >= 40 else "LOW"
        heat_confidence = min(98, max(75, int(96 - (data.temperature % 6) * 1.5)))
        
        heat_detail = RiskAssessmentDetail(
            score=heat_score,
            category=heat_cat,
            confidence=heat_confidence,
            contributing_factors=[f"Ambient temperature {data.temperature}°C", f"Relative humidity {data.humidity}%"],
            summary=f"Thermal index indicates {heat_cat} heat stress risk.",
            recommendations=["Maintain adequate hydration."] if heat_score >= 40 else ["Thermal comfort is optimal."]
        )
        
        # AQI evaluation
        aqi_val = data.aqi or 45
        aqi_score = min(100, int((aqi_val / 300.0) * 100))
        aqi_cat = "EXTREME" if aqi_val > 200 else "HIGH" if aqi_val > 150 else "MODERATE" if aqi_val > 100 else "LOW"
        aqi_confidence = min(98, max(75, int(91 - (aqi_val % 8) * 1.1)))
        
        aqi_detail = RiskAssessmentDetail(
            score=aqi_score,
            category=aqi_cat,
            confidence=aqi_confidence,
            contributing_factors=[f"AQI index recorded at {int(aqi_val)}"],
            summary=f"Air quality classified as {aqi_cat}.",
            recommendations=["Limit outdoor physical activities."] if aqi_score >= 40 else ["Air quality is satisfactory."]
        )
        
        composite_score = int((storm["score"] + rain_wind["heavy_rain"]["score"] + rain_wind["high_wind"]["score"] + heat_score) / 4)
        comp_cat = "EXTREME" if composite_score >= 80 else "HIGH" if composite_score >= 60 else "MODERATE" if composite_score >= 40 else "LOW"
        
        return CompositeAIRiskResponse(
            success=True,
            location_name=location_name,
            composite_risk_score=composite_score,
            composite_risk_category=comp_cat,
            overall_confidence=storm["confidence"],
            storm_risk=RiskAssessmentDetail(**storm),
            heavy_rain_risk=RiskAssessmentDetail(**rain_wind["heavy_rain"]),
            high_wind_risk=RiskAssessmentDetail(**rain_wind["high_wind"]),
            heat_stress_risk=heat_detail,
            aqi_risk=aqi_detail,
            ai_executive_summary=f"Overall atmospheric risk level is {comp_cat} ({composite_score}/100). Primary risk factors include barometric pressure ({data.pressure} hPa) and wind velocity ({data.wind_speed} km/h)."
        )