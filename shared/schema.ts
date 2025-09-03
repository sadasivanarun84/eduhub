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
  textColor: text("text_color").notNull().default("#000000"), // Text color
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

// Three Dice Game Models
export const threeDiceCampaigns = pgTable("three_dice_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  totalAmount: integer("total_amount"),
  totalWinners: integer("total_winners").notNull(),
  currentSpent: integer("current_spent").default(0),
  currentWinners: integer("current_winners").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const threeDiceFaces = pgTable("three_dice_faces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => threeDiceCampaigns.id),
  diceNumber: integer("dice_number").notNull(), // 1, 2, or 3 (which dice)
  faceNumber: integer("face_number").notNull(), // 1-6 (which face on the dice)
  text: text("text").notNull(),
  color: text("color").notNull(),
  textColor: text("text_color").notNull().default("#000000"), // Text color
  amount: text("amount"), // Prize value (can be money or items)
  maxWins: integer("max_wins").default(0), // Maximum times this prize can be won
  currentWins: integer("current_wins").default(0), // Current times this prize has been won
  createdAt: timestamp("created_at").defaultNow(),
});

export const threeDiceResults = pgTable("three_dice_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => threeDiceCampaigns.id),
  dice1Face: integer("dice1_face").notNull(), // Face rolled on dice 1 (1-6)
  dice2Face: integer("dice2_face").notNull(), // Face rolled on dice 2 (1-6)
  dice3Face: integer("dice3_face").notNull(), // Face rolled on dice 3 (1-6)
  winner1: text("winner1").notNull(), // Prize from dice 1
  winner2: text("winner2").notNull(), // Prize from dice 2
  winner3: text("winner3").notNull(), // Prize from dice 3
  amount1: text("amount1"), // Prize value from dice 1
  amount2: text("amount2"), // Prize value from dice 2
  amount3: text("amount3"), // Prize value from dice 3
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
  textColor: true,
  amount: true,
  maxWins: true,
});

export const insertDiceResultSchema = createInsertSchema(diceResults).pick({
  campaignId: true,
  winner: true,
  faceNumber: true,
  amount: true,
});

// Three Dice Game Schemas
export const insertThreeDiceCampaignSchema = createInsertSchema(threeDiceCampaigns).pick({
  name: true,
  totalAmount: true,
  totalWinners: true,
});

export const insertThreeDiceFaceSchema = createInsertSchema(threeDiceFaces).pick({
  campaignId: true,
  diceNumber: true,
  faceNumber: true,
  text: true,
  color: true,
  textColor: true,
  amount: true,
  maxWins: true,
});

export const insertThreeDiceResultSchema = createInsertSchema(threeDiceResults).pick({
  campaignId: true,
  dice1Face: true,
  dice2Face: true,
  dice3Face: true,
  winner1: true,
  winner2: true,
  winner3: true,
  amount1: true,
  amount2: true,
  amount3: true,
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

// Three Dice Game Types
export type InsertThreeDiceCampaign = z.infer<typeof insertThreeDiceCampaignSchema>;
export type ThreeDiceCampaign = typeof threeDiceCampaigns.$inferSelect;
export type InsertThreeDiceFace = z.infer<typeof insertThreeDiceFaceSchema>;
export type ThreeDiceFace = typeof threeDiceFaces.$inferSelect;
export type InsertThreeDiceResult = z.infer<typeof insertThreeDiceResultSchema>;
export type ThreeDiceResult = typeof threeDiceResults.$inferSelect;

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
