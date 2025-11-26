// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
var NS_API_KEY = process.env.NS_API_KEY;
var NS_BASE_URL = "https://gateway.apiportal.ns.nl/reisinformatie-api/api";
var NS_DISRUPTIONS_BASE_URL = "https://gateway.apiportal.ns.nl/disruptions";
async function fetchNS(endpoint, params = {}) {
  const url = new URL(`${NS_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v) url.searchParams.append(key, v);
      });
    } else if (value) {
      url.searchParams.append(key, value);
    }
  });
  const response = await fetch(url.toString(), {
    headers: {
      "Ocp-Apim-Subscription-Key": NS_API_KEY || ""
    }
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NS API error: ${response.status} - ${error}`);
  }
  return response.json();
}
async function fetchNSDisruptions(endpoint, params = {}) {
  const url = new URL(`${NS_DISRUPTIONS_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v) url.searchParams.append(key, v);
      });
    } else if (value) {
      url.searchParams.append(key, value);
    }
  });
  const response = await fetch(url.toString(), {
    headers: {
      "Ocp-Apim-Subscription-Key": NS_API_KEY || ""
    }
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NS Disruptions API error: ${response.status} - ${error}`);
  }
  return response.json();
}
var stationsCache = null;
var stationsCacheTime = 0;
var STATIONS_CACHE_TTL = 36e5;
async function getStationCode(stationInput) {
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
  const matchedStation = stationsCache.find(
    (s) => s.code?.toLowerCase() === trimmedInput.toLowerCase() || s.namen?.lang?.toLowerCase() === trimmedInput.toLowerCase() || s.namen?.middel?.toLowerCase() === trimmedInput.toLowerCase() || s.namen?.kort?.toLowerCase() === trimmedInput.toLowerCase()
  );
  if (!matchedStation) {
    console.warn(`Station not found: ${trimmedInput}`);
    return null;
  }
  return matchedStation.code;
}
async function registerRoutes(app2) {
  app2.get("/api/departures", async (req, res) => {
    try {
      const { station, maxJourneys = "10", lang = "nl" } = req.query;
      if (!station) {
        return res.status(400).json({ error: "Station parameter is required" });
      }
      const stationCode = await getStationCode(station);
      if (!stationCode) {
        return res.status(400).json({ error: `Station not found: ${station}` });
      }
      const data = await fetchNS("/v2/departures", {
        station: stationCode,
        maxJourneys,
        lang
      });
      res.json(data);
    } catch (error) {
      console.error("Error fetching departures:", error);
      res.status(500).json({ error: "Failed to fetch departures" });
    }
  });
  app2.get("/api/arrivals", async (req, res) => {
    try {
      const { station, uicCode, dateTime, maxJourneys = "10", lang = "nl" } = req.query;
      if (!station && !uicCode) {
        return res.status(400).json({ error: "Station or uicCode parameter is required" });
      }
      const params = {
        maxJourneys,
        lang
      };
      if (station) {
        const stationCode = await getStationCode(station);
        if (!stationCode) {
          return res.status(400).json({ error: `Station not found: ${station}` });
        }
        params.station = stationCode;
      }
      if (uicCode) params.uicCode = uicCode;
      if (dateTime) params.dateTime = dateTime;
      const data = await fetchNS("/v2/arrivals", params);
      res.json(data);
    } catch (error) {
      console.error("Error fetching arrivals:", error);
      res.status(500).json({ error: "Failed to fetch arrivals" });
    }
  });
  app2.get("/api/trips", async (req, res) => {
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
      const fromCode = await getStationCode(fromStation);
      if (!fromCode) {
        return res.status(400).json({ error: `From station not found: ${fromStation}` });
      }
      const toCode = await getStationCode(toStation);
      if (!toCode) {
        return res.status(400).json({ error: `To station not found: ${toStation}` });
      }
      const viaCodes = [];
      if (viaStation) {
        const viaArray = Array.isArray(viaStation) ? viaStation : [viaStation];
        for (const via of viaArray) {
          const viaCode = await getStationCode(via);
          if (!viaCode) {
            return res.status(400).json({ error: `Via station not found: ${via}` });
          }
          viaCodes.push(viaCode);
        }
      }
      const params = {
        fromStation: fromCode,
        toStation: toCode,
        lang
      };
      if (dateTime) {
        params.dateTime = dateTime;
      }
      if (searchForArrival === "true") {
        params.searchForArrival = "true";
      }
      if (viaCodes.length > 0) {
        params.viaStation = viaCodes.length === 1 ? viaCodes[0] : viaCodes;
      }
      if (addChangeTime && parseInt(addChangeTime) > 0) {
        params.addChangeTime = addChangeTime;
      }
      if (wheelChairAccessible) {
        params.wheelChairAccessible = wheelChairAccessible;
      }
      const data = await fetchNS("/v3/trips", params);
      res.json(data);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });
  app2.get("/api/journey-by-material", async (req, res) => {
    try {
      const { material } = req.query;
      if (!material) {
        return res.status(400).json({ error: "Material number parameter is required" });
      }
      const virtualTrainResponse = await fetch(
        `https://gateway.apiportal.ns.nl/virtual-train-api/v1/ritnummer/${material}`,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": process.env.NS_API_KEY || ""
          }
        }
      );
      if (!virtualTrainResponse.ok) {
        if (virtualTrainResponse.status === 404) {
          return res.status(404).json({ error: "Material number not found" });
        }
        throw new Error(`Virtual Train API returned ${virtualTrainResponse.status}`);
      }
      const ritnummer = (await virtualTrainResponse.text()).trim();
      const journeyData = await fetchNS("/v2/journey", { train: ritnummer });
      res.json({
        ritnummer,
        journeyData
      });
    } catch (error) {
      console.error("Error fetching journey by material number:", error);
      res.status(500).json({ error: "Failed to fetch journey details using material number" });
    }
  });
  app2.get("/api/journey", async (req, res) => {
    try {
      const { id, train, dateTime } = req.query;
      if (!id && !train) {
        return res.status(400).json({ error: "Either id or train parameter is required" });
      }
      const params = {};
      if (id) params.id = id;
      if (train) params.train = train;
      if (dateTime) params.dateTime = dateTime;
      const data = await fetchNS("/v2/journey", params);
      res.json(data);
    } catch (error) {
      console.error("Error fetching journey:", error);
      res.status(500).json({ error: "Failed to fetch journey details" });
    }
  });
  app2.get("/api/train-composition/:ritnummer", async (req, res) => {
    try {
      const { ritnummer } = req.params;
      const { features, dateTime } = req.query;
      if (!ritnummer) {
        return res.status(400).json({ error: "Journey number parameter is required" });
      }
      let url = `https://gateway.apiportal.ns.nl/virtual-train-api/v1/trein/${ritnummer}`;
      const params = new URLSearchParams();
      if (features) params.append("features", features);
      if (dateTime) params.append("dateTime", dateTime);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      const response = await fetch(url, {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.NS_API_KEY || ""
        }
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
  app2.get("/api/train-crowding/:ritnummer", async (req, res) => {
    try {
      const { ritnummer } = req.params;
      if (!ritnummer) {
        return res.status(400).json({ error: "Journey number parameter is required" });
      }
      const response = await fetch(
        `https://gateway.apiportal.ns.nl/virtual-train-api/v1/prognose/${ritnummer}`,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": process.env.NS_API_KEY || ""
          }
        }
      );
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
  app2.get("/api/stations", async (req, res) => {
    try {
      const data = await fetchNS("/v2/stations");
      res.json(data);
    } catch (error) {
      console.error("Error fetching stations:", error);
      res.status(500).json({ error: "Failed to fetch stations" });
    }
  });
  app2.get("/api/disruptions", async (req, res) => {
    try {
      const { isActive, type } = req.query;
      const params = {};
      if (isActive !== void 0) params.isActive = isActive;
      if (type) params.type = type;
      const data = await fetchNSDisruptions("/v3", params);
      res.json(data);
    } catch (error) {
      console.error("Error fetching disruptions:", error);
      res.status(500).json({ error: "Failed to fetch disruptions" });
    }
  });
  app2.get("/api/disruptions/station/:stationCode", async (req, res) => {
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
  app2.get("/api/disruptions/:type/:id", async (req, res) => {
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
