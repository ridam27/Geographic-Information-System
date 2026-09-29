import os
import pandas as pd
import openmeteo_requests
import requests_cache
from retry_requests import retry

# Setup the Open-Meteo API client with cache and retry on error
cache_session = requests_cache.CachedSession('.cache', expire_after=-1)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

# Target coordinates for key Bay of Bengal & Indian coastal cities
CITIES = {
    "Kolkata": {"lat": 22.5726, "lon": 88.3639},
    "Chennai": {"lat": 13.0827, "lon": 80.2707},
    "Bhubaneswar": {"lat": 20.2961, "lon": 85.8245},
    "Visakhapatnam": {"lat": 17.6868, "lon": 83.2185},
    "Mumbai": {"lat": 19.0760, "lon": 72.8777},
}

START_DATE = "2020-01-01"
END_DATE = "2024-01-01"

def fetch_data_for_city(city_name, coords):
    print(f"Fetching historical data for {city_name}...")
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": coords["lat"],
        "longitude": coords["lon"],
        "start_date": START_DATE,
        "end_date": END_DATE,
        "hourly": ["temperature_2m", "relative_humidity_2m", "surface_pressure", "wind_speed_10m", "precipitation"],
        "timezone": "auto"
    }
    responses = openmeteo.weather_api(url, params=params)
    response = responses[0]

    hourly = response.Hourly()
    hourly_temperature_2m = hourly.Variables(0).ValuesAsNumpy()
    hourly_relative_humidity_2m = hourly.Variables(1).ValuesAsNumpy()
    hourly_surface_pressure = hourly.Variables(2).ValuesAsNumpy()
    hourly_wind_speed_10m = hourly.Variables(3).ValuesAsNumpy()
    hourly_precipitation = hourly.Variables(4).ValuesAsNumpy()

    hourly_data = {"date": pd.date_range(
        start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
        end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
        freq=pd.Timedelta(seconds=hourly.Interval()),
        inclusive="left"
    )}
    hourly_data["temperature"] = hourly_temperature_2m
    hourly_data["humidity"] = hourly_relative_humidity_2m
    hourly_data["pressure"] = hourly_surface_pressure
    hourly_data["wind_speed"] = hourly_wind_speed_10m
    hourly_data["rainfall"] = hourly_precipitation
    hourly_data["city"] = city_name

    df = pd.DataFrame(data=hourly_data)
    
    # Simple data cleaning: remove NaNs
    df.dropna(inplace=True)
    
    # Cap anomalies (e.g. negative rainfall is impossible, fix it if it exists)
    df.loc[df['rainfall'] < 0, 'rainfall'] = 0
    
    # Create target variable: Storm classification
    # A simplified meteorological heuristic for labeling a "storm" in historical data 
    # to train on (since we don't have a separate storm database right now).
    # Realistically, this would be joined with a historical storm track DB (like IBTrACS).
    df['is_storm'] = ((df['pressure'] < 1000) & (df['wind_speed'] > 45)).astype(int)
    
    return df

if __name__ == "__main__":
    all_dfs = []
    for city, coords in CITIES.items():
        try:
            df = fetch_data_for_city(city, coords)
            all_dfs.append(df)
        except Exception as e:
            print(f"Error fetching for {city}: {e}")
            
    if all_dfs:
        final_df = pd.concat(all_dfs, ignore_index=True)
        # Ensure output directory exists
        os.makedirs(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'csv data'), exist_ok=True)
        out_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'csv data', 'historical_weather_data.csv')
        final_df.to_csv(out_path, index=False)
        print(f"Successfully generated dataset with {len(final_df)} rows at {out_path}.")
    else:
        print("Failed to generate dataset.")
