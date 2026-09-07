export type IndustrySector = 'agriculture' | 'mining' | 'aviation' | 'marine' | 'logistics' | 'disaster';

export interface SectorImpactGuidance {
  sector: IndustrySector;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  title: string;
  impacts: string[];
  suggestedActions: string[];
}

export interface LayerDataQuality {
  layerId: string;
  layerName: string;
  provider: string;
  lastUpdated: string;
  refreshInterval: string;
  coverage: string;
  confidence: number;
}
