import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  totalAmount: integer("total_amount"),
  totalWinners: integer("total_winners").notNull(),
  threshold: integer("threshold"),
  currentSpent: integer("current_spent").default(0),
  currentWinners: integer("current_winners").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wheelSections = pgTable("wheel_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  text: text("text").notNull(),
  color: text("color").notNull(),
  amount: integer("amount"), // Prize amount if applicable
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const spinResults = pgTable("spin_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  winner: text("winner").notNull(),
  amount: integer("amount"), // Amount won
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  name: true,
  totalAmount: true,
  totalWinners: true,
  threshold: true,
});

export const insertWheelSectionSchema = createInsertSchema(wheelSections).pick({
  campaignId: true,
  text: true,
  color: true,
  amount: true,
  order: true,
});

export const insertSpinResultSchema = createInsertSchema(spinResults).pick({
  campaignId: true,
  winner: true,
  amount: true,
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;
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
