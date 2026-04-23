import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req: any, _res: any, buf: any) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  const distPath = path.join(process.cwd(), "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Build directory not found: ${distPath}. Run the build command first.`
    );
  }

  const legalSourcePath = path.join(process.cwd(), "legal");
  const legalDistPath = path.join(process.cwd(), "dist", "legal");
  if (fs.existsSync(legalSourcePath)) {
    fs.mkdirSync(legalDistPath, { recursive: true });
    for (const file of ["privacy.md", "voorwaarden.md"]) {
      const sourceFile = path.join(legalSourcePath, file);
      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, path.join(legalDistPath, file));
      }
    }
  }

  app.use(express.static(distPath));
  app.use("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
