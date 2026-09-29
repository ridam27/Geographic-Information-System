export interface MapillaryImage {
  id: str;
  latitude: number;
  longitude: number;
  capturedAt?: string;
  sequenceId?: string;
  thumb1024Url?: string;
  thumb2048Url?: string;
  creator?: string;
  compassAngle?: number;
}

export interface MapillaryCoverageResponse {
  success: boolean;
  hasCoverage: boolean;
  count: number;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  images: MapillaryImage[];
  message?: string;
}

export class MapillaryService {
  private static API_BASE = '/api/v1/mapillary';

  static async checkCoverage(
    latitude: number,
    longitude: number,
    radiusMeters: number = 500
  ): Promise<MapillaryCoverageResponse> {
    try {
      const url = `${this.API_BASE}/coverage?latitude=${latitude}&longitude=${longitude}&radius=${radiusMeters}`;
      const res = await fetch(url);
      if (!res.ok) {
        return {
          success: false,
          hasCoverage: false,
          count: 0,
          latitude,
          longitude,
          radiusMeters,
          images: [],
          message: 'Street View is temporarily unavailable. Please try again.',
        };
      }
      const data = await res.json();
      return {
        success: data.success ?? true,
        hasCoverage: data.has_coverage ?? false,
        count: data.count ?? 0,
        latitude: data.latitude ?? latitude,
        longitude: data.longitude ?? longitude,
        radiusMeters: data.radius_meters ?? radiusMeters,
        images: (data.images || []).map((img: any) => ({
          id: String(img.id),
          latitude: Number(img.latitude),
          longitude: Number(img.longitude),
          capturedAt: img.captured_at,
          sequenceId: img.sequence_id,
          thumb1024Url: img.thumb_1024_url,
          thumb2048Url: img.thumb_2048_url,
          creator: img.creator,
          compassAngle: img.compass_angle != null ? Number(img.compass_angle) : undefined,
        })),
        message: data.message,
      };
    } catch (err) {
      return {
        success: false,
        hasCoverage: false,
        count: 0,
        latitude,
        longitude,
        radiusMeters,
        images: [],
        message: 'Street View is temporarily unavailable. Please try again.',
      };
    }
  }
}
