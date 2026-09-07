import math

def calculate_storm_risk(temp: float, humidity: float, pressure: float, wind_speed: float, rainfall: float) -> dict:
    score = 0
    factors = []
    
    if pressure < 995:
        score += 45
        factors.append(f"Deep Barometric Low ({pressure} hPa)")
    elif pressure < 1005:
        score += 25
        factors.append(f"Sub-normal Pressure ({pressure} hPa)")
        
    if wind_speed > 60:
        score += 35
        factors.append(f"Gale Wind Speeds ({wind_speed} km/h)")
    elif wind_speed > 35:
        score += 20
        factors.append(f"Brisk Winds ({wind_speed} km/h)")
        
    if humidity > 85:
        score += 15
        factors.append(f"High Relative Moisture ({humidity}%)")
        
    if rainfall > 15:
        score += 15
        factors.append(f"Heavy Precipitation ({rainfall} mm/h)")
        
    score = min(100, max(0, score))
    
    if score >= 80:
        category = "EXTREME"
    elif score >= 60:
        category = "HIGH"
    elif score >= 40:
        category = "MODERATE"
    elif score >= 20:
        category = "LOW"
    else:
        category = "VERY_LOW"
        
    confidence = 92 if pressure > 0 and wind_speed > 0 else 75
    
    return {
        "score": score,
        "category": category,
        "confidence": confidence,
        "contributing_factors": factors,
        "summary": f"Storm risk classified as {category} based on pressure and wind metrics.",
        "recommendations": [
            "Monitor official weather advisories and satellite radar feeds.",
            "Secure unanchored outdoor equipment."
        ] if score >= 40 else ["Atmospheric conditions remain stable."]
    }
