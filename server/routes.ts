import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const NS_API_KEY = process.env.NS_API_KEY;
const NS_BASE_URL = "https://gateway.apiportal.ns.nl/reisinformatie-api/api";
const NS_DISRUPTIONS_BASE_URL = "https://gateway.apiportal.ns.nl/disruptions";
const NS_VIRTUAL_TRAIN_URL = "https://gateway.apiportal.ns.nl/virtual-train-api";

async function fetchNS(endpoint: string, params: Record<string, string | string[]> = {}) {
  const url = new URL(`${NS_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v) url.searchParams.append(key, v);
      });
    } else if (value) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      "Ocp-Apim-Subscription-Key": NS_API_KEY || "",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NS API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function fetchNSDisruptions(endpoint: string, params: Record<string, string | string[]> = {}) {
  const url = new URL(`${NS_DISRUPTIONS_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v) url.searchParams.append(key, v);
      });
    } else if (value) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      "Ocp-Apim-Subscription-Key": NS_API_KEY || "",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NS Disruptions API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function fetchNSVirtualTrain(endpoint: string, params: Record<string, string | string[]> = {}) {
  const url = new URL(`${NS_VIRTUAL_TRAIN_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v) url.searchParams.append(key, v);
      });
    } else if (value) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      "Ocp-Apim-Subscription-Key": NS_API_KEY || "",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NS Virtual Train API error: ${response.status} - ${error}`);
  }

  return response.json();
}

let stationsCache: any = null;
let stationsCacheTime: number = 0;
const STATIONS_CACHE_TTL = 3600000;

async function getStationCode(stationInput: string): Promise<string | null> {
  if (!stationInput) return stationInput;

  const trimmedInput = stationInput.trim();
  if (!trimmedInput) return null;

  const now = Date.now();
  if (!stationsCache || now - stationsCacheTime > STATIONS_CACHE_TTL) {
    try {
      const data = await fetchNS("/v2/stations", {});
      stationsCache = data.payload || [];
      stationsCacheTime = now;
    } catch (error) {
      console.error("Failed to fetch stations for code lookup:", error);
      throw new Error("Station lookup service unavailable");
    }
  }

  const matchedStation = stationsCache.find((s: any) => 
    s.code?.toLowerCase() === trimmedInput.toLowerCase() ||
    s.namen?.lang?.toLowerCase() === trimmedInput.toLowerCase() ||
    s.namen?.middel?.toLowerCase() === trimmedInput.toLowerCase() ||
    s.namen?.kort?.toLowerCase() === trimmedInput.toLowerCase()
  );

  if (!matchedStation) {
    console.warn(`Station not found: ${trimmedInput}`);
    return null;
  }

  return matchedStation.code;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/departures", async (req, res) => {
    try {
      const { station, maxJourneys = "10", lang = "nl" } = req.query;
      
      if (!station) {
        return res.status(400).json({ error: "Station parameter is required" });
      }

      const stationCode = await getStationCode(station as string);
      if (!stationCode) {
        return res.status(400).json({ error: `Station not found: ${station}` });
      }

      const data = await fetchNS("/v2/departures", {
        station: stationCode,
        maxJourneys: maxJourneys as string,
        lang: lang as string,
      });

      res.json(data);
    } catch (error) {
      console.error("Error fetching departures:", error);
      res.status(500).json({ error: "Failed to fetch departures" });
    }
  });

  app.get("/api/arrivals", async (req, res) => {
    try {
      const { station, uicCode, dateTime, maxJourneys = "10", lang = "nl" } = req.query;
      
      if (!station && !uicCode) {
        return res.status(400).json({ error: "Station or uicCode parameter is required" });
      }

      const params: Record<string, string> = {
        maxJourneys: maxJourneys as string,
        lang: lang as string,
      };

      if (station) {
        const stationCode = await getStationCode(station as string);
        if (!stationCode) {
          return res.status(400).json({ error: `Station not found: ${station}` });
        }
        params.station = stationCode;
      }
      if (uicCode) params.uicCode = uicCode as string;
      if (dateTime) params.dateTime = dateTime as string;

      const data = await fetchNS("/v2/arrivals", params);

      res.json(data);
    } catch (error) {
      console.error("Error fetching arrivals:", error);
      res.status(500).json({ error: "Failed to fetch arrivals" });
    }
  });

  app.get("/api/trips", async (req, res) => {
    try {
      const { 
        fromStation, 
        toStation, 
        dateTime,
        searchForArrival,
        viaStation,
        lang = "nl",
        addChangeTime,
        wheelChairAccessible
      } = req.query;
      
      if (!fromStation || !toStation) {
        return res.status(400).json({ error: "fromStation and toStation parameters are required" });
      }

      const fromCode = await getStationCode(fromStation as string);
      if (!fromCode) {
        return res.status(400).json({ error: `From station not found: ${fromStation}` });
      }

      const toCode = await getStationCode(toStation as string);
      if (!toCode) {
        return res.status(400).json({ error: `To station not found: ${toStation}` });
      }

      const viaCodes: string[] = [];
      if (viaStation) {
        const viaArray = Array.isArray(viaStation) ? viaStation : [viaStation];
        for (const via of viaArray) {
          const viaCode = await getStationCode(via as string);
          if (!viaCode) {
            return res.status(400).json({ error: `Via station not found: ${via}` });
          }
          viaCodes.push(viaCode);
        }
      }

      const params: Record<string, string | string[]> = {
        fromStation: fromCode,
        toStation: toCode,
        lang: lang as string,
      };

      if (dateTime) {
        params.dateTime = dateTime as string;
      }

      if (searchForArrival === "true") {
        params.searchForArrival = "true";
      }

      if (viaCodes.length > 0) {
        params.viaStation = viaCodes.length === 1 ? viaCodes[0] : viaCodes;
      }

      if (addChangeTime && parseInt(addChangeTime as string) > 0) {
        params.addChangeTime = addChangeTime as string;
      }

      if (wheelChairAccessible) {
        params.wheelChairAccessible = wheelChairAccessible as string;
      }

      const data = await fetchNS("/v3/trips", params);

      res.json(data);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.get("/api/journey-by-material", async (req, res) => {
    try {
      const { material } = req.query;
      
      if (!material) {
        return res.status(400).json({ error: "Material number parameter is required" });
      }

      // Step 1: Convert material number to journey number
      const virtualTrainResponse = await fetch(
        `https://gateway.apiportal.ns.nl/virtual-train-api/v1/ritnummer/${material}`,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": process.env.NS_API_KEY || "",
          },
        }
      );

      if (!virtualTrainResponse.ok) {
        if (virtualTrainResponse.status === 404) {
          return res.status(404).json({ error: "Material number not found" });
        }
        throw new Error(`Virtual Train API returned ${virtualTrainResponse.status}`);
      }

      const ritnummer = (await virtualTrainResponse.text()).trim();
      
      // Step 2: Fetch journey details using the journey number
      const journeyData = await fetchNS("/v2/journey", { train: ritnummer });

      // Return both the ritnummer and the full journey data
      res.json({
        ritnummer,
        journeyData
      });
    } catch (error) {
      console.error("Error fetching journey by material number:", error);
      res.status(500).json({ error: "Failed to fetch journey details using material number" });
    }
  });

  app.get("/api/journey", async (req, res) => {
    try {
      const { id, train, dateTime } = req.query;
      
      if (!id && !train) {
        return res.status(400).json({ error: "Either id or train parameter is required" });
      }

      const params: Record<string, string> = {};
      
      if (id) params.id = id as string;
      if (train) params.train = train as string;
      if (dateTime) params.dateTime = dateTime as string;

      const data = await fetchNS("/v2/journey", params);

      res.json(data);
    } catch (error) {
      console.error("Error fetching journey:", error);
      res.status(500).json({ error: "Failed to fetch journey details" });
    }
  });

  app.get("/api/train-composition/:ritnummer", async (req, res) => {
    try {
      const { ritnummer } = req.params;
      const { features, dateTime } = req.query;
      
      if (!ritnummer) {
        return res.status(400).json({ error: "Journey number parameter is required" });
      }

      let url = `https://gateway.apiportal.ns.nl/virtual-train-api/v1/trein/${ritnummer}`;
      const params = new URLSearchParams();
      
      if (features) params.append("features", features as string);
      if (dateTime) params.append("dateTime", dateTime as string);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.NS_API_KEY || "",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: "Train composition not found" });
        }
        throw new Error(`Virtual Train API returned ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching train composition:", error);
      res.status(500).json({ error: "Failed to fetch train composition" });
    }
  });

  app.get("/api/train-crowding/:ritnummer", async (req, res) => {
    try {
      const { ritnummer } = req.params;
      const { departureTime } = req.query;
      
      if (!ritnummer) {
        return res.status(400).json({ error: "Journey number parameter is required" });
      }

      // Build URL with optional query parameters
      let url = `https://gateway.apiportal.ns.nl/virtual-train-api/v1/prognose/${ritnummer}`;
      const params = new URLSearchParams();
      
      if (departureTime) {
        // Extract date from ISO timestamp (YYYY-MM-DD format)
        const date = (departureTime as string).split('T')[0];
        params.append('date', date);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.NS_API_KEY || "",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: "Train crowding data not found" });
        }
        throw new Error(`Virtual Train API returned ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching train crowding:", error);
      res.status(500).json({ error: "Failed to fetch train crowding data" });
    }
  });

  app.get("/api/stations", async (req, res) => {
    try {
      const data = await fetchNS("/v2/stations");
      res.json(data);
    } catch (error) {
      console.error("Error fetching stations:", error);
      res.status(500).json({ error: "Failed to fetch stations" });
    }
  });

  app.get("/api/disruptions", async (req, res) => {
    try {
      const { isActive, type } = req.query;
      
      const params: Record<string, string> = {};
      if (isActive !== undefined) params.isActive = isActive as string;
      if (type) params.type = type as string;

      const data = await fetchNSDisruptions("/v3", params);
      res.json(data);
    } catch (error) {
      console.error("Error fetching disruptions:", error);
      res.status(500).json({ error: "Failed to fetch disruptions" });
    }
  });

  app.get("/api/disruptions/station/:stationCode", async (req, res) => {
    try {
      const { stationCode } = req.params;
      
      if (!stationCode) {
        return res.status(400).json({ error: "Station code is required" });
      }

      const actualStationCode = await getStationCode(stationCode);
      if (!actualStationCode) {
        return res.status(400).json({ error: `Station not found: ${stationCode}` });
      }

      const data = await fetchNSDisruptions(`/v3/station/${actualStationCode}`);
      res.json(data);
    } catch (error) {
      console.error("Error fetching station disruptions:", error);
      res.status(500).json({ error: "Failed to fetch station disruptions" });
    }
  });

  app.get("/api/disruptions/:type/:id", async (req, res) => {
    try {
      const { type, id } = req.params;
      
      if (!type || !id) {
        return res.status(400).json({ error: "Type and ID are required" });
      }

      const data = await fetchNSDisruptions(`/v3/${type}/${id}`);
      res.json(data);
    } catch (error) {
      console.error("Error fetching disruption details:", error);
      res.status(500).json({ error: "Failed to fetch disruption details" });
    }
  });

  app.get("/api/trains-map", async (req, res) => {
    try {
      const { 
        lat = "52.1", 
        lng = "5.1", 
        radius = "100000",
        limit = "200",
        features = "materieel"
      } = req.query;

      const params: Record<string, string> = {
        lat: lat as string,
        lng: lng as string,
        radius: radius as string,
        limit: limit as string,
        features: features as string,
      };

      const data = await fetchNSVirtualTrain("/vehicle", params);
      res.json(data);
    } catch (error) {
      console.error("Error fetching trains map data:", error);
      res.status(500).json({ error: "Failed to fetch trains map data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
