import { pgTable, text, uuid, timestamp, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// User table schema
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_name: text('company_name').notNull(),
  email: text('email').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    companyEmailUnique: uniqueIndex('company_email_unique').on(table.company_name, table.email)
  };
});

// Chat table schema
export const chats = pgTable('chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id),
  title: text('title'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  workflow_json: jsonb('workflow_json'),
  ai_suggestions_markdown: text('ai_suggestions_markdown'),
  phase: integer('phase').default(1),
  completed: integer('completed').default(0),
});

// Message table schema
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chat_id: uuid('chat_id').notNull().references(() => chats.id),
  content: text('content').notNull(),
  role: text('role').notNull(), // 'user' or 'assistant'
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.user_id],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chat_id],
    references: [chats.id],
  }),
}));

// Create schemas for validation
export const userInsertSchema = createInsertSchema(users, {
  company_name: (schema) => schema.min(1, "Company name is required"),
  email: (schema) => schema.email("Invalid email address"),
});

export const chatInsertSchema = createInsertSchema(chats);
export const messageInsertSchema = createInsertSchema(messages);

// Create select schemas
export const userSelectSchema = createSelectSchema(users);
export const chatSelectSchema = createSelectSchema(chats);
export const messageSelectSchema = createSelectSchema(messages);

// Create login schema
export const loginSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
});

// Create workflow JSON schema
export const workflowJsonSchema = z.object({
  title: z.string(),
  start_event: z.string(),
  end_event: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    description: z.string(),
    actor: z.string().optional(),
    system: z.string().optional(),
  })),
  people: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['internal', 'external']),
  })),
  systems: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['internal', 'external']),
  })),
  pain_points: z.array(z.string()).optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof userInsertSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof chatInsertSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof messageInsertSchema>;
export type Login = z.infer<typeof loginSchema>;
export type WorkflowJson = z.infer<typeof workflowJsonSchema>;
