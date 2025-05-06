import { db } from '@db';
import { 
  users, 
  chats, 
  messages,
  User,
  InsertUser,
  Chat,
  InsertChat,
  Message,
  InsertMessage
} from '@shared/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// User operations
export const storage = {
  // User methods
  async getUserByCompanyAndEmail(company_name: string, email: string): Promise<User | undefined> {
    try {
      const result = await db.query.users.findFirst({
        where: and(
          eq(users.company_name, company_name),
          eq(users.email, email)
        ),
      });
      return result;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  },

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  async getOrCreateUser(company_name: string, email: string): Promise<User> {
    try {
      let user = await this.getUserByCompanyAndEmail(company_name, email);
      
      if (!user) {
        user = await this.createUser({ 
          company_name, 
          email 
        });
      }
      
      return user;
    } catch (error) {
      console.error('Error getting or creating user:', error);
      throw error;
    }
  },

  // Chat methods
  async getChatsByUserId(userId: string): Promise<Chat[]> {
    try {
      const results = await db.query.chats.findMany({
        where: eq(chats.user_id, userId),
        orderBy: [desc(chats.updated_at)],
        with: {
          messages: {
            limit: 1,
            orderBy: [asc(messages.created_at)]
          }
        }
      });
      return results;
    } catch (error) {
      console.error('Error getting chats by user id:', error);
      throw error;
    }
  },

  async getChatById(chatId: string): Promise<Chat | undefined> {
    try {
      const result = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
        with: {
          messages: {
            orderBy: [asc(messages.created_at)]
          }
        }
      });
      return result;
    } catch (error) {
      console.error('Error getting chat by id:', error);
      throw error;
    }
  },

  async createChat(userId: string): Promise<Chat> {
    try {
      const chatId = uuidv4();
      const [chat] = await db.insert(chats).values({
        id: chatId,
        user_id: userId,
        title: 'New Workflow'
      }).returning();
      return chat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  },

  async updateChatTitle(chatId: string, title: string): Promise<Chat> {
    try {
      const [updatedChat] = await db.update(chats)
        .set({ title, updated_at: new Date() })
        .where(eq(chats.id, chatId))
        .returning();
      return updatedChat;
    } catch (error) {
      console.error('Error updating chat title:', error);
      throw error;
    }
  },

  async updateChatPhase(chatId: string, phase: number): Promise<Chat> {
    try {
      const [updatedChat] = await db.update(chats)
        .set({ phase, updated_at: new Date() })
        .where(eq(chats.id, chatId))
        .returning();
      return updatedChat;
    } catch (error) {
      console.error('Error updating chat phase:', error);
      throw error;
    }
  },

  async updateChatCompleted(chatId: string, completed: number): Promise<Chat> {
    try {
      const [updatedChat] = await db.update(chats)
        .set({ completed, updated_at: new Date() })
        .where(eq(chats.id, chatId))
        .returning();
      return updatedChat;
    } catch (error) {
      console.error('Error updating chat completed:', error);
      throw error;
    }
  },

  async updateWorkflowJson(chatId: string, workflowJson: any): Promise<Chat> {
    try {
      const [updatedChat] = await db.update(chats)
        .set({ 
          workflow_json: workflowJson, 
          updated_at: new Date() 
        })
        .where(eq(chats.id, chatId))
        .returning();
      return updatedChat;
    } catch (error) {
      console.error('Error updating workflow JSON:', error);
      throw error;
    }
  },

  async updateAiSuggestions(chatId: string, aiSuggestionsMarkdown: string): Promise<Chat> {
    try {
      const [updatedChat] = await db.update(chats)
        .set({ 
          ai_suggestions_markdown: aiSuggestionsMarkdown, 
          updated_at: new Date() 
        })
        .where(eq(chats.id, chatId))
        .returning();
      return updatedChat;
    } catch (error) {
      console.error('Error updating AI suggestions:', error);
      throw error;
    }
  },

  // Message methods
  async getMessagesByChatId(chatId: string): Promise<Message[]> {
    try {
      const results = await db.query.messages.findMany({
        where: eq(messages.chat_id, chatId),
        orderBy: [asc(messages.created_at)]
      });
      return results;
    } catch (error) {
      console.error('Error getting messages by chat id:', error);
      throw error;
    }
  },

  async createMessage(messageData: InsertMessage): Promise<Message> {
    try {
      // Also update the chat's updated_at timestamp
      await db.update(chats)
        .set({ updated_at: new Date() })
        .where(eq(chats.id, messageData.chat_id));
        
      const [message] = await db.insert(messages).values(messageData).returning();
      return message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  },

  async getFirstNMessages(chatId: string, n: number): Promise<Message[]> {
    try {
      const results = await db.query.messages.findMany({
        where: eq(messages.chat_id, chatId),
        orderBy: [asc(messages.created_at)],
        limit: n
      });
      return results;
    } catch (error) {
      console.error(`Error getting first ${n} messages:`, error);
      throw error;
    }
  }
};
