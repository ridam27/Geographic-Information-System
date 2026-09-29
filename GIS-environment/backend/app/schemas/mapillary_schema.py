from pydantic import BaseModel, Field
from typing import Optional, List

class MapillaryImageItem(BaseModel):
    id: str
    latitude: float
    longitude: float
    captured_at: Optional[str] = None
    sequence_id: Optional[str] = None
    thumb_1024_url: Optional[str] = None
    thumb_2048_url: Optional[str] = None
    creator: Optional[str] = None
    compass_angle: Optional[float] = None

class MapillaryCoverageResponse(BaseModel):
    success: bool = True
    has_coverage: bool = False
    count: int = 0
    latitude: float
    longitude: float
    radius_meters: float
    images: List[MapillaryImageItem] = Field(default_factory=list)
    message: Optional[str] = None

class MapillaryImageDetailResponse(BaseModel):
    success: bool = True
    image: Optional[MapillaryImageItem] = None
    message: Optional[str] = None

class MapillarySequenceResponse(BaseModel):
    success: bool = True
    sequence_id: str
    count: int = 0
    images: List[MapillaryImageItem] = Field(default_factory=list)
    message: Optional[str] = None
