def calculate_rain_wind_risk(rainfall: float, wind_speed: float, wind_gust: float = 0) -> dict:
    rain_score = min(100, int(rainfall * 5.5))
    wind_score = min(100, int((wind_speed / 70.0) * 100))
    
    rain_cat = "EXTREME" if rain_score >= 80 else "HIGH" if rain_score >= 60 else "MODERATE" if rain_score >= 40 else "LOW" if rain_score >= 20 else "VERY_LOW"
    wind_cat = "EXTREME" if wind_score >= 80 else "HIGH" if wind_score >= 60 else "MODERATE" if wind_score >= 40 else "LOW" if wind_score >= 20 else "VERY_LOW"
    
    rain_confidence = min(98, max(75, int(92 - (rainfall % 7) * 1.5)))
    wind_confidence = min(98, max(75, int(95 - (wind_speed % 9) * 1.2)))

    return {
        "heavy_rain": {
            "score": rain_score,
            "category": rain_cat,
            "confidence": rain_confidence,
            "contributing_factors": [f"Precipitation rate at {rainfall} mm/h"] if rainfall > 5 else ["Minimal precipitation recorded"],
            "summary": f"Rainfall hazard evaluated at {rain_cat} severity.",
            "recommendations": ["Prepare for localized urban waterlogging."] if rain_score >= 40 else ["No rain precautions needed."]
        },
        "high_wind": {
            "score": wind_score,
            "category": wind_cat,
            "confidence": wind_confidence,
            "contributing_factors": [f"Surface wind speed at {wind_speed} km/h"],
            "summary": f"Wind hazard evaluated at {wind_cat} severity.",
            "recommendations": ["Avoid high-rise exposure during peak gusts."] if wind_score >= 40 else ["Wind velocities are calm."]
        }
    }
