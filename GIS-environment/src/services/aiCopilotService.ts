import { cities } from '../mockData';

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  citations?: { label: string; value: string }[];
}

export class AICopilotService {
  /**
   * Process natural language query and synthesize weather response with citations
   */
  static async queryCopilot(userPrompt: string, selectedLocationId: string | null): Promise<CopilotMessage> {
    const prompt = userPrompt.toLowerCase().trim();
    const city = cities.find(c => c.id === selectedLocationId) || cities[0];
    const nowISO = new Date().toISOString();

    if (prompt.includes('rain') || prompt.includes('precipitation')) {
      const willRain = city.baseHumidity > 70;
      return {
        id: `msg_${Date.now()}`,
        sender: 'copilot',
        text: willRain
          ? `Yes, elevated precipitation probability detected for ${city.name} tomorrow (${Math.round(city.baseHumidity)}% relative humidity). Localized rain showers expected.`
          : `Precipitation probability for ${city.name} remains low (<15%). Clear to partly cloudy skies expected.`,
        timestamp: nowISO,
        citations: [
          { label: 'Data Source', value: 'Open-Meteo GFS Forecast Model' },
          { label: 'Relative Humidity', value: `${city.baseHumidity}%` },
          { label: 'Barometric Pressure', value: `${city.basePressure} hPa` },
        ],
      };
    }

    if (prompt.includes('storm') || prompt.includes('risk') || prompt.includes('cyclone')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'copilot',
        text: `Active storm risk analysis: The Bay of Bengal regional grid currently shows a MODERATE to HIGH storm threat. Primary cyclone Eye tracking near Lat 15.4°N, Lng 88.2°E with max sustained winds of 95 km/h.`,
        timestamp: nowISO,
        citations: [
          { label: 'AI Risk Engine', value: 'Logistic Regression Model (Conf: 94%)' },
          { label: 'Storm Track', value: 'Global Cyclonic Feed (Bay of Bengal)' },
        ],
      };
    }

    if (prompt.includes('summarize') || prompt.includes('today') || prompt.includes('threat')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'copilot',
        text: `Today's Weather Intelligence Summary: Ambient temperatures average ${city.baseTemp}°C across ${city.country}. Atmospheric pressure is stable at ${city.basePressure} hPa. No active severe cyclone warnings in immediate urban zones.`,
        timestamp: nowISO,
        citations: [
          { label: 'Surface Telemetry', value: `${city.name} Anemometer Station` },
          { label: 'Air Quality Index', value: 'AQI 45 (Satisfactory)' },
        ],
      };
    }

    // Default conversational response
    return {
      id: `msg_${Date.now()}`,
      sender: 'copilot',
      text: `Based on current telemetry for ${city.name}, temperature is ${city.baseTemp}°C with wind speed of ${city.baseWindSpeed} km/h. How else can I assist your operational weather decision making?`,
      timestamp: nowISO,
      citations: [
        { label: 'Location', value: `${city.name}, ${city.country}` },
        { label: 'Refresh Rate', value: 'Live 10-min interval' },
      ],
    };
  }
}
