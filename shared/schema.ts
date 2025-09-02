import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  totalAmount: integer("total_amount"),
  totalWinners: integer("total_winners").notNull(),
  currentSpent: integer("current_spent").default(0),
  currentWinners: integer("current_winners").default(0),
  rotationSequence: json("rotation_sequence").$type<number[]>().default([]), // Array of section indexes in rotation order
  currentSequenceIndex: integer("current_sequence_index").default(0), // Current position in rotation sequence
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wheelSections = pgTable("wheel_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  text: text("text").notNull(),
  color: text("color").notNull(),
  amount: integer("amount"), // Prize amount if applicable
  maxWins: integer("max_wins").default(0), // Maximum times this prize can be won
  currentWins: integer("current_wins").default(0), // Current times this prize has been won
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

// Dice Game Models
export const diceCampaigns = pgTable("dice_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  totalAmount: integer("total_amount"),
  totalWinners: integer("total_winners").notNull(),
  currentSpent: integer("current_spent").default(0),
  currentWinners: integer("current_winners").default(0),
  rotationSequence: json("rotation_sequence").$type<number[]>().default([]), // Array of dice face numbers (1-6)
  currentSequenceIndex: integer("current_sequence_index").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const diceFaces = pgTable("dice_faces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => diceCampaigns.id),
  faceNumber: integer("face_number").notNull(), // 1-6
  text: text("text").notNull(),
  color: text("color").notNull(),
  amount: text("amount"), // Prize value (can be money or items)
  maxWins: integer("max_wins").default(0), // Maximum times this prize can be won
  currentWins: integer("current_wins").default(0), // Current times this prize has been won
  createdAt: timestamp("created_at").defaultNow(),
});

export const diceResults = pgTable("dice_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => diceCampaigns.id),
  winner: text("winner").notNull(),
  faceNumber: integer("face_number").notNull(), // Which face was rolled (1-6)
  amount: text("amount"), // Prize value won
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  name: true,
  totalAmount: true,
  totalWinners: true,
});

export const insertWheelSectionSchema = createInsertSchema(wheelSections).pick({
  campaignId: true,
  text: true,
  color: true,
  amount: true,
  maxWins: true,
  order: true,
});

export const insertSpinResultSchema = createInsertSchema(spinResults).pick({
  campaignId: true,
  winner: true,
  amount: true,
});

// Dice Game Schemas
export const insertDiceCampaignSchema = createInsertSchema(diceCampaigns).pick({
  name: true,
  totalAmount: true,
  totalWinners: true,
});

export const insertDiceFaceSchema = createInsertSchema(diceFaces).pick({
  campaignId: true,
  faceNumber: true,
  text: true,
  color: true,
  amount: true,
  maxWins: true,
});

export const insertDiceResultSchema = createInsertSchema(diceResults).pick({
  campaignId: true,
  winner: true,
  faceNumber: true,
  amount: true,
});

// Spinning Wheel Types
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertWheelSection = z.infer<typeof insertWheelSectionSchema>;
export type WheelSection = typeof wheelSections.$inferSelect;
export type InsertSpinResult = z.infer<typeof insertSpinResultSchema>;
export type SpinResult = typeof spinResults.$inferSelect;

// Dice Game Types
export type InsertDiceCampaign = z.infer<typeof insertDiceCampaignSchema>;
export type DiceCampaign = typeof diceCampaigns.$inferSelect;
export type InsertDiceFace = z.infer<typeof insertDiceFaceSchema>;
export type DiceFace = typeof diceFaces.$inferSelect;
export type InsertDiceResult = z.infer<typeof insertDiceResultSchema>;
export type DiceResult = typeof diceResults.$inferSelect;

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
