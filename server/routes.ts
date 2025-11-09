import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const NS_API_KEY = process.env.NS_API_KEY;
const NS_BASE_URL = "https://gateway.apiportal.ns.nl/reisinformatie-api/api";
const NS_DISRUPTIONS_BASE_URL = "https://gateway.apiportal.ns.nl/disruptions";

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

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/departures", async (req, res) => {
    try {
      const { station, maxJourneys = "10", lang = "nl" } = req.query;
      
      if (!station) {
        return res.status(400).json({ error: "Station parameter is required" });
      }

      const data = await fetchNS("/v2/departures", {
        station: station as string,
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

      if (station) params.station = station as string;
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
        lang = "nl" 
      } = req.query;
      
      if (!fromStation || !toStation) {
        return res.status(400).json({ error: "fromStation and toStation parameters are required" });
      }

      const params: Record<string, string | string[]> = {
        fromStation: fromStation as string,
        toStation: toStation as string,
        lang: lang as string,
      };

      if (dateTime) {
        params.dateTime = dateTime as string;
      }

      if (searchForArrival === "true") {
        params.searchForArrival = "true";
      }

      if (viaStation) {
        if (Array.isArray(viaStation)) {
          params.viaStation = viaStation.filter(v => v) as string[];
        } else {
          params.viaStation = viaStation as string;
        }
      }

      const data = await fetchNS("/v3/trips", params);

      res.json(data);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ error: "Failed to fetch trips" });
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
      if (isActive) params.isActive = isActive as string;
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

      let actualStationCode = stationCode;

      if (stationCode.length > 4 || stationCode.includes(" ")) {
        try {
          const stationsData = await fetchNS("/v2/stations", {});
          const stations = stationsData.payload || [];
          const matchedStation = stations.find((s: any) => 
            s.namen?.lang?.toLowerCase() === stationCode.toLowerCase() ||
            s.namen?.middel?.toLowerCase() === stationCode.toLowerCase() ||
            s.namen?.kort?.toLowerCase() === stationCode.toLowerCase()
          );
          
          if (matchedStation) {
            actualStationCode = matchedStation.code || matchedStation.UICCode;
          }
        } catch (lookupError) {
          console.error("Station lookup failed, trying original code:", lookupError);
        }
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

  const httpServer = createServer(app);

  return httpServer;
}
