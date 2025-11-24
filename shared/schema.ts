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
  platform: z.string().optional(),
  plannedDeparture: z.string().optional(),
  actualDeparture: z.string().optional(),
  plannedArrival: z.string().optional(),
  actualArrival: z.string().optional(),
  departureDelayMinutes: z.number().optional(),
  arrivalDelayMinutes: z.number().optional(),
  cancelled: z.boolean().optional(),
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

export const widgetConfigSchema = z.object({
  activeWidgets: z.array(z.enum(['savedRoutes', 'savedTrips'])).default([]),
  savedRoutes: z.array(savedRouteSchema).default([]),
  savedTrips: z.array(savedTripSchema).default([]),
});

export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
