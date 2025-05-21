import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Claude } from "./claude";
import { DebugTools } from "./debug";
import { DEFAULT_CHAT_TITLE } from "@shared/constants";
import { z } from "zod";
import { loginSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes prefix
  const apiPrefix = "/api";

  // User login/signup
  app.post(`${apiPrefix}/auth/login`, async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getOrCreateUser(data.company_name, data.email);
      
      return res.status(200).json({ 
        success: true, 
        user: {
          id: user.id,
          company_name: user.company_name,
          email: user.email
        } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, errors: error.errors });
      }
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Chat history
  app.get(`${apiPrefix}/chats`, async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }
      
      const chats = await storage.getChatsByUserId(userId);
      return res.status(200).json({ success: true, chats });
    } catch (error) {
      console.error('Error fetching chats:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Create new chat
  app.post(`${apiPrefix}/chats`, async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }
      
      const chat = await storage.createChat(userId);
      
      // Add initial assistant message
      await storage.createMessage({
        chat_id: chat.id,
        role: 'assistant',
        content: "I'm here to help you map out your workflow. Let's start by understanding the process you'd like to analyze. Could you tell me about a specific workflow in your organization that you'd like to optimize?"
      });
      
      return res.status(201).json({ success: true, chat });
    } catch (error) {
      console.error('Error creating chat:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Get chat by ID
  app.get(`${apiPrefix}/chats/:chatId`, async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      
      if (!chatId) {
        return res.status(400).json({ success: false, message: 'Chat ID is required' });
      }
      
      const chat = await storage.getChatById(chatId);
      
      if (!chat) {
        return res.status(404).json({ success: false, message: 'Chat not found' });
      }
      
      return res.status(200).json({ success: true, chat });
    } catch (error) {
      console.error('Error fetching chat:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Create a message in a chat
  app.post(`${apiPrefix}/chats/:chatId/messages`, async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      const { content } = req.body;
      
      if (!chatId || !content) {
        return res.status(400).json({ 
          success: false, 
          message: 'Chat ID and message content are required' 
        });
      }
      
      // Verify chat exists
      const chat = await storage.getChatById(chatId);
      if (!chat) {
        return res.status(404).json({ 
          success: false, 
          message: 'Chat not found' 
        });
      }
      
      try {
        // Process message with Claude (which handles deduplication)
        console.log(`Processing message with Claude for chat ${chatId}: "${content.substring(0, 50)}..."`);
        
        // Try to process the message first (Claude will detect duplicates)
        const assistantResponse = await Claude.processMessage(chatId, content);
        
        // If we get here, it's not a duplicate, so save the user message
        const userMessage = await storage.createMessage({
          chat_id: chatId,
          role: 'user',
          content
        });
        
        // Then save assistant message
        const assistantMessage = await storage.createMessage({
          chat_id: chatId,
          role: 'assistant',
          content: assistantResponse
        });
        
        // If this is the 3rd user message, generate a title
        const messages = await storage.getMessagesByChatId(chatId);
        const userMessages = messages.filter(m => m.role === 'user');
        
        if (
          userMessages.length >= 3 &&
          (!chat.title || chat.title === DEFAULT_CHAT_TITLE)
        ) {
          // Generate and update the title (wait for it to complete)
          try {
            console.log(`Generating title for chat ${chatId} after ${userMessages.length} user messages`);
            const title = await Claude.generateChatTitle(chatId);
            console.log(`Set title to "${title}" for chat ${chatId}`);
            
            // Get updated chat with new title
            const updatedChat = await storage.getChatById(chatId);
            if (updatedChat && updatedChat.title !== DEFAULT_CHAT_TITLE) {
              console.log(`Successfully updated chat title to "${updatedChat.title}"`);
            } else {
              console.warn(`Failed to update chat title, still using default or unchanged`);
            }
          } catch (err) {
            console.error('Error generating chat title:', err);
          }
        }
        
        // Get updated chat data
        const updatedChat = await storage.getChatById(chatId);
        
        // Only return the updated chat, not separate messages
        return res.status(201).json({ 
          success: true, 
          chat: updatedChat
        });
      } catch (processingError: any) {
        // Special handling for duplicate messages
        if (processingError.message && processingError.message.includes('Duplicate message detected')) {
          console.log(`Duplicate message detected for chat ${chatId}`);
          return res.status(429).json({ 
            success: false, 
            message: processingError.message,
            isDuplicate: true
          });
        }
        
        // Re-throw for the outer catch
        throw processingError;
      }
    } catch (error: any) {
      console.error('Error creating message:', error);
      
      const errorMessage = error.message || 'Internal server error';
      return res.status(500).json({ 
        success: false, 
        message: errorMessage
      });
    }
  });

  // Generate diagram for a chat
  app.post(`${apiPrefix}/chats/:chatId/generate-diagram`, async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      
      if (!chatId) {
        return res.status(400).json({ success: false, message: 'Chat ID is required' });
      }
      
      // Generate the diagram
      const { imageUrl, mermaidSyntax } = await Claude.generateDiagram(chatId);
      
      return res.status(200).json({ 
        success: true, 
        diagram: { imageUrl, mermaidSyntax } 
      });
    } catch (error) {
      console.error('Error generating diagram:', error);
      return res.status(500).json({ success: false, message: 'Error generating diagram' });
    }
  });

  // Generate AI suggestions for a chat
  app.post(`${apiPrefix}/chats/:chatId/generate-suggestions`, async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      
      if (!chatId) {
        return res.status(400).json({ success: false, message: 'Chat ID is required' });
      }
      
      // Generate the suggestions
      await Claude.suggestAiOpportunities(chatId);
      
      // Get the updated chat with suggestions
      const chat = await storage.getChatById(chatId);
      
      return res.status(200).json({ 
        success: true, 
        chat
      });
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return res.status(500).json({ success: false, message: 'Error generating AI suggestions' });
    }
  });

  // Generate title for a chat
  app.post(`${apiPrefix}/chats/:chatId/generate-title`, async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      
      if (!chatId) {
        return res.status(400).json({ success: false, message: 'Chat ID is required' });
      }
      
      // Generate the title
      const title = await Claude.generateChatTitle(chatId);
      
      // Get the updated chat to ensure the title was saved
      const chat = await storage.getChatById(chatId);
      
      return res.status(200).json({ 
        success: true, 
        title,
        chat
      });
    } catch (error) {
      console.error('Error generating chat title:', error);
      return res.status(500).json({ success: false, message: 'Error generating chat title' });
    }
  });

  // Create implementation prompt for a specific opportunity
  app.post(`${apiPrefix}/create-implementation-prompt`, async (req: Request, res: Response) => {
    try {
      const { description } = req.body;
      
      if (!description) {
        return res.status(400).json({ success: false, message: 'Description is required' });
      }
      
      // Create the implementation prompt
      const prompt = await Claude.createImplementationPrompt(description);
      
      return res.status(200).json({ 
        success: true, 
        prompt
      });
    } catch (error) {
      console.error('Error creating implementation prompt:', error);
      return res.status(500).json({ success: false, message: 'Error creating implementation prompt' });
    }
  });

  // Debug routes - always available
  const debugPrefix = `${apiPrefix}/debug`;
  
  // Create a test chat with predefined messages
  app.post(`${debugPrefix}/create-test-chat`, async (req: Request, res: Response) => {
    try {
      const { userId, messageCount } = req.body;
      
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }
      
      const chat = await DebugTools.createTestChat(userId, messageCount);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Test chat created successfully',
        chat
      });
    } catch (error) {
      console.error('Error creating test chat:', error);
      return res.status(500).json({ success: false, message: 'Error creating test chat' });
    }
  });
  
  // Set a chat phase
  app.post(`${debugPrefix}/set-chat-phase`, async (req: Request, res: Response) => {
    try {
      const { chatId, phase } = req.body;
      
      if (!chatId) {
        return res.status(400).json({ success: false, message: 'Chat ID is required' });
      }
      
      if (!phase || ![1, 2, 3].includes(phase)) {
        return res.status(400).json({ success: false, message: 'Phase must be 1, 2, or 3' });
      }
      
      const chat = await DebugTools.setChatPhase(chatId, phase);
      
      return res.status(200).json({ 
        success: true, 
        message: `Chat phase set to ${phase}`,
        chat
      });
    } catch (error) {
      console.error('Error setting chat phase:', error);
      return res.status(500).json({ success: false, message: 'Error setting chat phase' });
    }
  });
  
  // Set workflow JSON
  app.post(`${debugPrefix}/set-workflow-json`, async (req: Request, res: Response) => {
    try {
      const { chatId } = req.body;
      
      if (!chatId) {
        return res.status(400).json({ success: false, message: 'Chat ID is required' });
      }
      
      const chat = await DebugTools.setWorkflowJson(chatId);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Workflow JSON set successfully',
        chat
      });
    } catch (error) {
      console.error('Error setting workflow JSON:', error);
      return res.status(500).json({ success: false, message: 'Error setting workflow JSON' });
    }
  });
  
  // Create a completed test chat
  app.post(`${debugPrefix}/create-completed-chat`, async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }
      
      const chat = await DebugTools.createCompletedTestChat(userId);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Completed test chat created successfully',
        chat
      });
    } catch (error) {
      console.error('Error creating completed test chat:', error);
      return res.status(500).json({ success: false, message: 'Error creating completed test chat' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
