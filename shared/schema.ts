import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const savedRouteSchema = z.object({
  id: z.string(),
  name: z.string(),
  from: z.string(),
  to: z.string(),
  viaStations: z.array(z.string()).default([]),
  createdAt: z.string(),
});

export type SavedRoute = z.infer<typeof savedRouteSchema>;

export const tripLegSchema = z.object({
  trainType: z.string(),
  trainNumber: z.string(),
  from: z.string(),
  to: z.string(),
  departure: z.string(),
  arrival: z.string(),
  direction: z.string().optional(),
  platform: z.string().optional(),
  arrivalPlatform: z.string().optional(),
  plannedDeparture: z.string().optional(),
  actualDeparture: z.string().optional(),
  plannedArrival: z.string().optional(),
  actualArrival: z.string().optional(),
  departureDelayMinutes: z.number().optional(),
  arrivalDelayMinutes: z.number().optional(),
  cancelled: z.boolean().optional(),
  fromUicCode: z.string().optional(),
  toUicCode: z.string().optional(),
  departureDateTime: z.string().optional(),
  crowdForecast: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export const savedTripSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  from: z.string(),
  to: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  duration: z.string(),
  transfers: z.number(),
  legs: z.array(tripLegSchema),
  delayMinutes: z.number().optional(),
  status: z.string().optional(),
  createdAt: z.string(),
});

export type TripLeg = z.infer<typeof tripLegSchema>;
export type SavedTrip = z.infer<typeof savedTripSchema>;

export const disruptionStationSchema = z.object({
  id: z.string(),
  stationName: z.string(),
  createdAt: z.string(),
});

export type DisruptionStation = z.infer<typeof disruptionStationSchema>;

export const trackedMaterialSchema = z.object({
  id: z.string(),
  materialNumber: z.string(),
  name: z.string().optional(),
  createdAt: z.string(),
});

export type TrackedMaterial = z.infer<typeof trackedMaterialSchema>;

export const widgetConfigSchema = z.object({
  activeWidgets: z.array(z.enum(['savedRoutes', 'savedTrips', 'disruptions', 'materieelTracker', 'favoriteStations'])).default([]),
  savedRoutes: z.array(savedRouteSchema).default([]),
  savedTrips: z.array(savedTripSchema).default([]),
  disruptionStations: z.array(disruptionStationSchema).default([]),
  trackedMaterials: z.array(trackedMaterialSchema).default([]),
});

export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
