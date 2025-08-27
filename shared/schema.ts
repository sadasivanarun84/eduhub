import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const wheelSections = pgTable("wheel_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  text: text("text").notNull(),
  color: text("color").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const spinResults = pgTable("spin_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  winner: text("winner").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertWheelSectionSchema = createInsertSchema(wheelSections).pick({
  text: true,
  color: true,
  order: true,
});

export const insertSpinResultSchema = createInsertSchema(spinResults).pick({
  winner: true,
});

export type InsertWheelSection = z.infer<typeof insertWheelSectionSchema>;
export type WheelSection = typeof wheelSections.$inferSelect;
export type InsertSpinResult = z.infer<typeof insertSpinResultSchema>;
export type SpinResult = typeof spinResults.$inferSelect;

// Keep existing user schema
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
