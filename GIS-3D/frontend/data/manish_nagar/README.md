# Manish Nagar Survey Data Directory

This directory contains the geotagged survey files for the **Manish Nagar** layout.

### Default File Paths:
1. **GPX Track & Coordinates**:
   - `frontend/data/manish_nagar/manish_nagar.gpx`
2. **Geotagged Photos JSON**:
   - `frontend/data/manish_nagar/photos.json`
3. **Geotagged Videos JSON**:
   - `frontend/data/manish_nagar/videos.json`
4. **Photos Media Directory**:
   - `frontend/data/manish_nagar/photos/`
5. **Videos Media Directory**:
   - `frontend/data/manish_nagar/videos/`

---

### JSON Structure Examples

#### `photos.json`
```json
[
  {
    "id": "MN_P01",
    "filename": "site_photo_01.jpg",
    "photo": "photos/site_photo_01.jpg",
    "latitude": 21.102300,
    "longitude": 79.097290,
    "altitude": 312,
    "timestamp": "2026-09-15 10:30 AM",
    "description": "Manish Nagar junction survey capture"
  }
]
```

#### `videos.json`
```json
[
  {
    "id": "MN_V01",
    "filename": "survey_video_01.mp4",
    "video": "videos/survey_video_01.mp4",
    "latitude": 21.103100,
    "longitude": 79.098400,
    "duration": "00:45",
    "timestamp": "2026-09-15 10:45 AM",
    "description": "Road surface inspection video"
  }
]
```

---

### Customizing Paths in Code
You can override or customize paths at any time in `frontend/js/14_geotagged_media_manager.js` or via the global config:
```javascript
window.LAYOUT_SURVEY_CONFIG.manishnagar = {
  id: "manishnagar",
  label: "Manish Nagar",
  gpxUrl: "YOUR_CUSTOM_GPX_PATH",
  photosJsonUrl: "YOUR_CUSTOM_PHOTOS_JSON_PATH",
  videosJsonUrl: "YOUR_CUSTOM_VIDEOS_JSON_PATH",
  photosBaseUrl: "YOUR_CUSTOM_PHOTOS_BASE_PATH",
  videosBaseUrl: "YOUR_CUSTOM_VIDEOS_BASE_PATH"
};
```
