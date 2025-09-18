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
  userId: varchar("user_id").references(() => users.id), // Owner of this campaign
  isPublic: boolean("is_public").default(false), // Public campaigns visible to all
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
  userId: varchar("user_id").references(() => users.id), // Owner of this campaign
  isPublic: boolean("is_public").default(false), // Public campaigns visible to all
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
  totalRolls: integer("total_rolls").default(100),
  currentRolls: integer("current_rolls").default(0),
  isActive: boolean("is_active").default(true),
  userId: varchar("user_id").references(() => users.id), // Owner of this campaign
  isPublic: boolean("is_public").default(false), // Public campaigns visible to all
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
  totalRolls: true,
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

// Slot Machine User Settings
export const userSlotSettings = pgTable("user_slot_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  credits: integer("credits").default(1000),
  defaultBet: integer("default_bet").default(10),
  totalSpins: integer("total_spins").default(0),
  totalWins: integer("total_wins").default(0),
  totalWinnings: integer("total_winnings").default(0),
  biggestWin: integer("biggest_win").default(0),
  winStreak: integer("win_streak").default(0),
  currentStreak: integer("current_streak").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSlotSettingsSchema = createInsertSchema(userSlotSettings).pick({
  userId: true,
  credits: true,
  defaultBet: true,
});

export type InsertUserSlotSettings = z.infer<typeof insertUserSlotSettingsSchema>;
export type UserSlotSettings = typeof userSlotSettings.$inferSelect;

// Enhanced user schema with Google OAuth support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  googleId: text("google_id").unique(),
  displayName: text("display_name"),
  profilePicture: text("profile_picture"),
  role: text("role").notNull().default("user"), // "user", "admin", "super_admin"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  googleId: true,
  displayName: true,
  profilePicture: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
