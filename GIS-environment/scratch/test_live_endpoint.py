import httpx

cities = [
    ("London (Regent St)", 51.5135, -0.1388),
    ("NYC (Broadway)", 40.7590, -73.9845),
    ("San Francisco (Market)", 37.7895, -122.4014),
    ("Nagpur", 21.1458, 79.0882),
]

for name, lat, lng in cities:
    url = "http://127.0.0.1:8000/api/v1/mapillary/coverage"
    params = {"latitude": lat, "longitude": lng, "radius": 800}
    r = httpx.get(url, params=params, timeout=10.0)
    print(f"[{name}] HTTP {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print("  Has Coverage:", data.get("has_coverage"))
        print("  Count:", data.get("count"))
        print("  Message:", data.get("message"))
        images = data.get("images", [])
        if images:
            img0 = images[0]
            print("  First image ID:", img0.get("id"))
            print("  thumb_2048_url preview:", img0.get("thumb_2048_url"))
    else:
        print("  Error:", r.text[:100])
