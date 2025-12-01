import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const NS_API_KEY = process.env.NS_API_KEY;
const NS_BASE_URL = "https://gateway.apiportal.ns.nl/reisinformatie-api/api";
const NS_DISRUPTIONS_BASE_URL = "https://gateway.apiportal.ns.nl/disruptions";
const NS_VIRTUAL_TRAIN_URL = "https://gateway.apiportal.ns.nl/virtual-train-api";
const NS_PLACES_URL = "https://gateway.apiportal.ns.nl/places-api/v2";

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

async function fetchNSPlaces(endpoint: string, params: Record<string, string | string[]> = {}) {
  const url = new URL(`${NS_PLACES_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v) url.searchParams.append(key, v);
      });
    } else if (value) {
      url.searchParams.append(key, value);
    }
  });

  console.log("Fetching NS Places:", url.toString());
  
  const response = await fetch(url.toString(), {
    headers: {
      "Ocp-Apim-Subscription-Key": NS_API_KEY || "",
    },
  });

  console.log("NS Places response status:", response.status);
  
  if (!response.ok) {
    const error = await response.text();
    console.error("NS Places API error body:", error);
    throw new Error(`NS Places API error: ${response.status} - ${error}`);
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

async function findNearestStation(lat: number, lng: number): Promise<{ code: string; name: string; distance: number } | null> {
  const now = Date.now();
  if (!stationsCache || now - stationsCacheTime > STATIONS_CACHE_TTL) {
    try {
      const data = await fetchNS("/v2/stations", {});
      stationsCache = data.payload || [];
      stationsCacheTime = now;
    } catch (error) {
      console.error("Failed to fetch stations for nearest lookup:", error);
      return null;
    }
  }

  const nlStations = stationsCache.filter((s: any) => 
    s.land === 'NL' && s.lat && s.lng && s.code
  );

  if (nlStations.length === 0) return null;

  let nearest: any = null;
  let minDistance = Infinity;

  for (const station of nlStations) {
    const dLat = station.lat - lat;
    const dLng = station.lng - lng;
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  if (!nearest) return null;

  const kmDistance = minDistance * 111;

  return {
    code: nearest.code,
    name: nearest.namen?.lang || nearest.code,
    distance: kmDistance
  };
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
        fromLat,
        fromLng,
        toLat,
        toLng,
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

      const params: Record<string, string | string[]> = {
        lang: lang as string,
      };

      let nearestFromStation: { code: string; name: string; distance: number } | null = null;
      let nearestToStation: { code: string; name: string; distance: number } | null = null;

      const fromCode = await getStationCode(fromStation as string);
      if (fromCode) {
        params.fromStation = fromCode;
      } else if (fromLat && fromLng) {
        nearestFromStation = await findNearestStation(parseFloat(fromLat as string), parseFloat(fromLng as string));
        if (nearestFromStation) {
          params.fromStation = nearestFromStation.code;
        } else {
          return res.status(400).json({ error: `Geen treinstation gevonden in de buurt van: ${fromStation}` });
        }
      } else {
        return res.status(400).json({ error: `Locatie niet gevonden: ${fromStation}. Selecteer een locatie uit de zoekresultaten.` });
      }

      const toCode = await getStationCode(toStation as string);
      if (toCode) {
        params.toStation = toCode;
      } else if (toLat && toLng) {
        nearestToStation = await findNearestStation(parseFloat(toLat as string), parseFloat(toLng as string));
        if (nearestToStation) {
          params.toStation = nearestToStation.code;
        } else {
          return res.status(400).json({ error: `Geen treinstation gevonden in de buurt van: ${toStation}` });
        }
      } else {
        return res.status(400).json({ error: `Locatie niet gevonden: ${toStation}. Selecteer een locatie uit de zoekresultaten.` });
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
            }
          }
        }
      }

      const response: any = { ...data };
      
      if (nearestFromStation) {
        response.nearestFromStation = {
          name: nearestFromStation.name,
          originalLocation: fromStation,
          distanceKm: Math.round(nearestFromStation.distance * 10) / 10
        };
      }
      
      if (nearestToStation) {
        response.nearestToStation = {
          name: nearestToStation.name,
          originalLocation: toStation,
          distanceKm: Math.round(nearestToStation.distance * 10) / 10
        };
      }

      res.json(response);
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

  app.get("/api/places", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json({ payload: [] });
      }

      const response = await fetch(
        `https://gateway.apiportal.ns.nl/places-api/v2/places?q=${encodeURIComponent(q)}&limit=10`,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": process.env.NS_API_KEY || "",
          },
        }
      );

      if (!response.ok) {
        console.error(`Places API returned ${response.status}: ${response.statusText}`);
        return res.json({ payload: [] });
      }

      const data = await response.json();
      
      const places: Array<{
        name: string;
        type: string;
        lat?: number;
        lng?: number;
        stationCode?: string;
      }> = [];
      
      if (data.payload && Array.isArray(data.payload)) {
        for (const group of data.payload) {
          if (group.locations && Array.isArray(group.locations)) {
            for (const loc of group.locations) {
              places.push({
                name: loc.name || loc.stationName || '',
                type: loc.type || group.type || 'unknown',
                lat: loc.lat,
                lng: loc.lng,
                stationCode: loc.stationCode || loc.code,
              });
            }
          }
        }
      }
      
      res.json({ payload: places });
    } catch (error) {
      console.error("Error fetching places:", error);
      res.json({ payload: [] });
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

  const httpServer = createServer(app);

  return httpServer;
}
