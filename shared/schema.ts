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

export const widgetConfigSchema = z.object({
  activeWidgets: z.array(z.enum(['savedRoutes'])).default(['savedRoutes']),
  savedRoutes: z.array(savedRouteSchema).default([]),
});

export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
