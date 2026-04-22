import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
dotenv.config();

const NS_API_KEY = process.env.NS_API_KEY;
const NS_BASE_URL = "https://gateway.apiportal.ns.nl/reisinformatie-api/api";
const NS_DISRUPTIONS_BASE_URL = "https://gateway.apiportal.ns.nl/disruptions";
const NS_VIRTUAL_TRAIN_URL = "https://gateway.apiportal.ns.nl/virtual-train-api";

// Simple in-memory cache for rolling stock (5 min TTL)
const rollingStockCache = new Map<string, { types: string[]; numberOfCarriages: number | null; expires: number }>();

// Parse carriage count from type name, e.g. "VIRM-4" → 4, "SLT-6" → 6, "FLIRT3" → 3
function parseCarriageCount(type: string): number | null {
  if (!type) return null;
  const match = type.match(/-?(\d+)$/);
  if (match) {
    const n = parseInt(match[1]);
    if (n >= 1 && n <= 20) return n;
  }
  return null;
}

async function fetchRollingStock(trainNumber: string): Promise<{ types: string[]; numberOfCarriages: number | null }> {
  if (!trainNumber) return { types: [], numberOfCarriages: null };
  const cached = rollingStockCache.get(trainNumber);
  if (cached && cached.expires > Date.now()) return { types: cached.types, numberOfCarriages: cached.numberOfCarriages };

  let types: string[] = [];
  let numberOfCarriages: number | null = null;

  // Try virtual train API first (real-time, works for active trains)
  try {
    const vtResponse = await fetch(
      `${NS_VIRTUAL_TRAIN_URL}/v1/trein/${trainNumber}`,
      { headers: { "Ocp-Apim-Subscription-Key": NS_API_KEY || "" } }
    );
    if (vtResponse.ok) {
      const data = await vtResponse.json();
      const parts: any[] = data.materieeldelen || [];
      if (parts.length > 0) {
        types = Array.from(new Set<string>(parts.map((d: any) => d.type).filter(Boolean)));
        // Sum bakken (individual carriages) per stel; fall back to type suffix if missing
        const total = parts.reduce((sum: number, part: any) => {
          if (Array.isArray(part.bakken) && part.bakken.length > 0) return sum + part.bakken.length;
          return sum + (parseCarriageCount(part.type) ?? 1);
        }, 0);
        numberOfCarriages = total > 0 ? total : null;
      }
    }
  } catch { /* ignore */ }

  // Fallback: journey API for planned stock (works for future trains too)
  if (numberOfCarriages === null) {
    try {
      const journeyData = await fetchNS("/v2/journey", { train: trainNumber });
      const payload = journeyData?.payload ?? journeyData;
      const stock = payload?.plannedStock ?? payload?.actualStock;
      if (stock) {
        const trainParts: any[] = stock.trainParts || [];
        if (trainParts.length > 0) {
          // Sum carriages inferred from each stel's trainType (e.g. "VIRM-4" → 4)
          const total = trainParts.reduce((sum: number, part: any) => {
            return sum + (parseCarriageCount(part.trainType) ?? 1);
          }, 0);
          numberOfCarriages = total > 0 ? total : null;
          if (!types.length && stock.trainType) types = [stock.trainType];
        } else if (stock.numberOfParts) {
          // Last resort: use stellen count (less accurate but better than nothing)
          numberOfCarriages = stock.numberOfParts;
          if (!types.length && stock.trainType) types = [stock.trainType];
        }
      }
    } catch { /* ignore */ }
  }

  rollingStockCache.set(trainNumber, { types, numberOfCarriages, expires: Date.now() + 5 * 60 * 1000 });
  return { types, numberOfCarriages };
}

async function fetchRollingStockTypes(trainNumber: string): Promise<string[]> {
  return (await fetchRollingStock(trainNumber)).types;
}

async function enrichWithRollingStock(items: any[], numberField: string): Promise<any[]> {
  const results = await Promise.all(
    items.map(async (item) => {
      const types = await fetchRollingStockTypes(item.product?.[numberField] || "");
      return { ...item, rollingStockTypes: types };
    })
  );
  return results;
}

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

let spoorkaartCache: any = null;
let spoorkaartCacheTime: number = 0;
const SPOORKAART_CACHE_TTL = 86400000; // 24 hours - track data rarely changes

const NS_SPOORKAART_URL = "https://gateway.apiportal.ns.nl/spoorkaart-api/api/v1";

async function fetchNSSpoorkaart(endpoint: string) {
  const url = `${NS_SPOORKAART_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      "Ocp-Apim-Subscription-Key": NS_API_KEY || "",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NS Spoorkaart API error: ${response.status} - ${error}`);
  }

  return response.json();
}

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

async function getStationCoordinates(stationNameOrUic: string): Promise<{ lat: number; lng: number } | null> {
  if (!stationNameOrUic) return null;

  const trimmedInput = stationNameOrUic.trim();
  if (!trimmedInput) return null;

  const now = Date.now();
  if (!stationsCache || now - stationsCacheTime > STATIONS_CACHE_TTL) {
    try {
      const data = await fetchNS("/v2/stations", {});
      stationsCache = data.payload || [];
      stationsCacheTime = now;
    } catch (error) {
      console.error("Failed to fetch stations for coordinates lookup:", error);
      return null;
    }
  }

  const matchedStation = stationsCache.find((s: any) => 
    s.UICCode === trimmedInput ||
    s.code?.toLowerCase() === trimmedInput.toLowerCase() ||
    s.namen?.lang?.toLowerCase() === trimmedInput.toLowerCase() ||
    s.namen?.middel?.toLowerCase() === trimmedInput.toLowerCase() ||
    s.namen?.kort?.toLowerCase() === trimmedInput.toLowerCase()
  );

  if (!matchedStation || !matchedStation.lat || !matchedStation.lng) {
    return null;
  }

  return { lat: matchedStation.lat, lng: matchedStation.lng };
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

      const departures = data?.payload?.departures || [];
      const enriched = await enrichWithRollingStock(departures, "number");
      res.json({ ...data, payload: { ...data.payload, departures: enriched } });
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

      const arrivals = data?.payload?.arrivals || [];
      const enriched = await enrichWithRollingStock(arrivals, "number");
      res.json({ ...data, payload: { ...data.payload, arrivals: enriched } });
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
        wheelChairAccessible,
        scrollRequestForwardContext,
        scrollRequestBackwardContext
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

      if (scrollRequestForwardContext) {
        params.scrollRequestForwardContext = scrollRequestForwardContext as string;
      }

      if (scrollRequestBackwardContext) {
        params.scrollRequestBackwardContext = scrollRequestBackwardContext as string;
      }

      const data = await fetchNS("/v3/trips", params);

      // Debug: log first trip's first leg to see available fields
      if (data.trips && data.trips[0] && data.trips[0].legs && data.trips[0].legs[0]) {
        const firstLeg = data.trips[0].legs[0];
        console.log('[TravNL Debug] NS API trips response - first leg origin fields:', {
          plannedDateTime: firstLeg.origin?.plannedDateTime,
          actualDateTime: firstLeg.origin?.actualDateTime,
          allOriginKeys: Object.keys(firstLeg.origin || {}),
        });
        console.log('[TravNL Debug] NS API trips response - first leg destination fields:', {
          plannedDateTime: firstLeg.destination?.plannedDateTime,
          actualDateTime: firstLeg.destination?.actualDateTime,
          allDestinationKeys: Object.keys(firstLeg.destination || {}),
        });
      }

      if (data.trips) {
        for (const trip of data.trips) {
          if (trip.legs) {
            for (const leg of trip.legs) {
              const originName = leg.origin?.name;
              const destName = leg.destination?.name;
              
              if (originName) {
                const originCoords = await getStationCoordinates(originName);
                if (originCoords) {
                  leg.origin.lat = originCoords.lat;
                  leg.origin.lng = originCoords.lng;
                }
              }
              
              if (destName) {
                const destCoords = await getStationCoordinates(destName);
                if (destCoords) {
                  leg.destination.lat = destCoords.lat;
                  leg.destination.lng = destCoords.lng;
                }
              }

              // Enrich with number of carriages
              if (leg.product?.number) {
                const stock = await fetchRollingStock(leg.product.number);
                if (stock.numberOfCarriages !== null) {
                  leg.numberOfCarriages = stock.numberOfCarriages;
                }
              }
            }
          }
        }
      }

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
            "Ocp-Apim-Subscription-Key": NS_API_KEY || "",
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
          "Ocp-Apim-Subscription-Key": NS_API_KEY || "",
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
          "Ocp-Apim-Subscription-Key": NS_API_KEY || "",
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
        radius = "150000",
        limit = "500",
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

  app.get("/api/spoorkaart", async (req, res) => {
    try {
      const now = Date.now();
      
      if (spoorkaartCache && now - spoorkaartCacheTime < SPOORKAART_CACHE_TTL) {
        return res.json(spoorkaartCache);
      }

      const data = await fetchNSSpoorkaart("/spoorkaart");
      spoorkaartCache = data;
      spoorkaartCacheTime = now;
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching spoorkaart data:", error);
      res.status(500).json({ error: "Failed to fetch railway track data" });
    }
  });

  // Fetch live trip data using ctxRecon or fallback to search
  app.get("/api/trip/live", async (req, res) => {
    try {
      const { ctxRecon, fromCode, toCode, plannedDeparture } = req.query;
      
      if (!ctxRecon && (!fromCode || !toCode || !plannedDeparture)) {
        return res.status(400).json({ 
          error: "Either ctxRecon or fromCode+toCode+plannedDeparture is required" 
        });
      }

      // Try using ctxRecon first (most accurate)
      if (ctxRecon) {
        try {
          const data = await fetchNS("/v3/trips", {
            ctxRecon: ctxRecon as string,
          });
          
          if (data.trips && data.trips.length > 0) {
            const trip = data.trips[0];
            // Add coordinates to legs
            if (trip.legs) {
              for (const leg of trip.legs) {
                const originName = leg.origin?.name;
                const destName = leg.destination?.name;
                
                if (originName) {
                  const originCoords = await getStationCoordinates(originName);
                  if (originCoords) {
                    leg.origin.lat = originCoords.lat;
                    leg.origin.lng = originCoords.lng;
                  }
                }
                
                if (destName) {
                  const destCoords = await getStationCoordinates(destName);
                  if (destCoords) {
                    leg.destination.lat = destCoords.lat;
                    leg.destination.lng = destCoords.lng;
                  }
                }

                if (leg.product?.number) {
                  const stock = await fetchRollingStock(leg.product.number);
                  if (stock.numberOfCarriages !== null) leg.numberOfCarriages = stock.numberOfCarriages;
                }
              }
            }
            return res.json({ success: true, trip, source: 'ctxRecon' });
          }
        } catch (err) {
          console.log("ctxRecon lookup failed, trying fallback search");
        }
      }

      // Fallback: search for matching trip
      if (fromCode && toCode && plannedDeparture) {
        // Convert station names to codes if needed
        const fromStationCode = await getStationCode(fromCode as string);
        const toStationCode = await getStationCode(toCode as string);
        
        if (!fromStationCode || !toStationCode) {
          return res.json({ success: false, error: 'Station not found' });
        }
        
        const data = await fetchNS("/v3/trips", {
          fromStation: fromStationCode,
          toStation: toStationCode,
          dateTime: plannedDeparture as string,
        });
        
        if (data.trips && data.trips.length > 0) {
          // Find trip closest to the planned departure time
          const targetTime = new Date(plannedDeparture as string).getTime();
          let bestTrip = data.trips[0];
          let bestDiff = Infinity;
          
          for (const trip of data.trips) {
            const tripDep = trip.legs?.[0]?.origin?.plannedDateTime;
            if (tripDep) {
              const diff = Math.abs(new Date(tripDep).getTime() - targetTime);
              if (diff < bestDiff) {
                bestDiff = diff;
                bestTrip = trip;
              }
            }
          }
          
          // Add coordinates
          if (bestTrip.legs) {
            for (const leg of bestTrip.legs) {
              const originName = leg.origin?.name;
              const destName = leg.destination?.name;
              
              if (originName) {
                const originCoords = await getStationCoordinates(originName);
                if (originCoords) {
                  leg.origin.lat = originCoords.lat;
                  leg.origin.lng = originCoords.lng;
                }
              }
              
              if (destName) {
                const destCoords = await getStationCoordinates(destName);
                if (destCoords) {
                  leg.destination.lat = destCoords.lat;
                  leg.destination.lng = destCoords.lng;
                }
              }

              if (leg.product?.number) {
                const stock = await fetchRollingStock(leg.product.number);
                if (stock.numberOfCarriages !== null) leg.numberOfCarriages = stock.numberOfCarriages;
              }
            }
          }
          
          return res.json({ success: true, trip: bestTrip, source: 'search' });
        }
      }

      // Trip not found
      res.json({ success: false, error: 'Trip not found or no longer available' });
    } catch (error) {
      console.error("Error fetching live trip:", error);
      res.status(500).json({ error: "Failed to fetch live trip data" });
    }
  });

  // Changelog endpoint
  app.get("/api/changelog", (_req, res) => {
    try {
      const rootDir = process.cwd();
      const entries: { name: string; type: "grote-update" | "kleine-update"; content: string }[] = [];

      const folders: { dir: string; type: "grote-update" | "kleine-update" }[] = [
        { dir: join(rootDir, "changelogs", "grote-update"), type: "grote-update" },
        { dir: join(rootDir, "changelogs", "kleine-update"), type: "kleine-update" },
      ];

      for (const { dir, type } of folders) {
        if (!existsSync(dir)) continue;
        const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
        for (const file of files) {
          const content = readFileSync(join(dir, file), "utf-8");
          entries.push({ name: file.replace(/\.md$/, ""), type, content });
        }
      }

      // Sort descending by filename (assumes version-based naming like v0.7.0)
      entries.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" }));

      res.json(entries);
    } catch (error) {
      console.error("Error reading changelog files:", error);
      res.status(500).json({ error: "Failed to read changelog" });
    }
  });

  app.get("/api/legal/:doc", (req, res) => {
    const allowed = ["privacy", "voorwaarden"];
    const doc = req.params.doc;
    if (!allowed.includes(doc)) {
      return res.status(404).json({ error: "Document niet gevonden" });
    }
    try {
      const filePath = join(process.cwd(), "legal", `${doc}.md`);
      if (!existsSync(filePath)) {
        return res.status(404).json({ error: "Document niet gevonden" });
      }
      const content = readFileSync(filePath, "utf-8");
      res.json({ doc, content });
    } catch (error) {
      console.error("Error reading legal document:", error);
      res.status(500).json({ error: "Failed to read document" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
