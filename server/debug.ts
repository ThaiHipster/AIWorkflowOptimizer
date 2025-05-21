import { storage } from './storage';
import { Claude } from './claude';
import { v4 as uuidv4 } from 'uuid';

// Sample workflow conversation - each array element represents a user message
const SAMPLE_WORKFLOW_CONVERSATION = [
  "BCBA Hiring",
  "Clinic manager submits a requisition to the Recruiting Team",
  "It could be any of these. Let's just keep the requisition as the start of the workflow.",
  "The recruiting team will post the job description to Indeed and start collecting resumes. They will also begin to search LinkedIn for BCBAs in the area of the clinic and do cold outreach to those candidates.",
  "So far, the people involved are the clinic manager who submits their acquisition, the recruiting team member who does the search work, and there would also be a Regional Vice President who has approved this requisition.",
  "The recruiting team member will screen the candidates and do intro calls with any candidate that they think may be hireable. They will then pass on the top candidate to the clinic manager to schedule an in-person interview with the clinic manager.",
  "If the clinic manager wants to hire the candidate they've interviewed, they would let the recruiting team know, and the recruiting team will take over again to get an offer letter to the candidate, negotiate that offer letter, and deal with an external firm called Mintz who does the background check on the candidate. Finally, they would set the candidate's start date and communicate that with the clinic manager.",
  "It is truly when the Bcba starts their first day at the clinic. After the clinic manager has the start date, They need to pass that information along to the scheduler and to the outreach team, who both need to know that more capacity will come into the clinic and can adjust the schedule accordingly, and find new clients if applicable."
];

// Sample workflow JSON that would be generated after completing the conversation
const SAMPLE_WORKFLOW_JSON = {
  title: "BCBA Hiring Process",
  start_event: "Clinic manager submits a requisition",
  end_event: "BCBA starts first day at clinic",
  steps: [
    {
      id: "step1",
      description: "Clinic manager submits hiring requisition to Recruiting Team",
      actor: "Clinic Manager"
    },
    {
      id: "step2",
      description: "Regional Vice President approves requisition",
      actor: "Regional VP"
    },
    {
      id: "step3",
      description: "Recruiting team posts job description to Indeed",
      actor: "Recruiting Team"
    },
    {
      id: "step4",
      description: "Recruiting team searches LinkedIn for qualified candidates",
      actor: "Recruiting Team"
    },
    {
      id: "step5",
      description: "Recruiting team conducts initial candidate screening calls",
      actor: "Recruiting Team"
    },
    {
      id: "step6",
      description: "Clinic manager conducts in-person interviews with top candidates",
      actor: "Clinic Manager"
    },
    {
      id: "step7",
      description: "Recruiting team prepares and sends offer letter",
      actor: "Recruiting Team"
    },
    {
      id: "step8",
      description: "External firm conducts background check",
      actor: "Mintz (External)"
    },
    {
      id: "step9",
      description: "Recruiting team sets start date and communicates with clinic",
      actor: "Recruiting Team"
    },
    {
      id: "step10",
      description: "Clinic manager informs scheduler and outreach team of new hire",
      actor: "Clinic Manager"
    }
  ],
  people: [
    {
      id: "person1",
      name: "Clinic Manager",
      type: "internal"
    },
    {
      id: "person2",
      name: "Recruiting Team Member",
      type: "internal"
    },
    {
      id: "person3",
      name: "Regional Vice President",
      type: "internal"
    },
    {
      id: "person4",
      name: "Scheduler",
      type: "internal"
    },
    {
      id: "person5",
      name: "Outreach Team",
      type: "internal"
    }
  ],
  systems: [
    {
      id: "system1",
      name: "Indeed",
      type: "external"
    },
    {
      id: "system2",
      name: "LinkedIn",
      type: "external"
    },
    {
      id: "system3",
      name: "Mintz Background Check",
      type: "external"
    }
  ],
  pain_points: [
    "Manual scheduling of interviews takes significant time",
    "Background check process can cause unexpected delays",
    "Limited visibility into the recruiting pipeline for clinic managers",
    "No automated system to alert schedulers about new capacity"
  ]
};

export class DebugTools {
  /**
   * Create a sample chat with pre-defined messages for testing
   * @param userId User ID to create the chat for
   * @param messageCount Number of sample messages to include (default: all)
   * @returns The created chat object
   */
  static async createTestChat(userId: string, messageCount: number = SAMPLE_WORKFLOW_CONVERSATION.length): Promise<any> {
    try {
      // Create a new chat
      const chat = await storage.createChat(userId);
      console.log(`Created test chat ${chat.id} for user ${userId}`);
      
      // Prepare for message exchange
      let chatHistory: Array<{role: string, content: string}> = [];
      
      // Add messages up to the requested count
      const messagesToAdd = SAMPLE_WORKFLOW_CONVERSATION.slice(0, messageCount);
      
      for (const userMessage of messagesToAdd) {
        console.log(`Adding test message to chat ${chat.id}: "${userMessage.substring(0, 30)}..."`);
        
        // Save user message
        await storage.createMessage({
          chat_id: chat.id,
          role: 'user',
          content: userMessage
        });
        
        // Add to chat history for context
        chatHistory.push({ role: 'user', content: userMessage });
        
        try {
          // Generate assistant response
          const assistantResponse = await Claude.processMessage(chat.id, userMessage);
          
          // Save assistant message
          await storage.createMessage({
            chat_id: chat.id,
            role: 'assistant',
            content: assistantResponse
          });
          
          // Add to chat history for context
          chatHistory.push({ role: 'assistant', content: assistantResponse });
          
          // Add a brief delay between messages to avoid deduplication errors
          // Claude has a 10-second deduplication window
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          // If a specific message fails, log it but continue with the next messages
          console.error(`Error processing message "${userMessage.substring(0, 30)}..." for chat ${chat.id}:`, error);
          // Continue with the next message rather than failing the entire chat creation
        }
      }
      
      // Generate title if we've added enough messages
      if (messageCount >= 3) {
        try {
          const title = await Claude.generateChatTitle(chat.id);
          console.log(`Generated title "${title}" for chat ${chat.id}`);
        } catch (error) {
          console.error(`Error generating title for chat ${chat.id}:`, error);
          // Continue even if title generation fails
        }
      }
      
      // Return the updated chat
      return await storage.getChatById(chat.id);
    } catch (error) {
      console.error('Error creating test chat:', error);
      throw error;
    }
  }
  
  /**
   * Set a chat to a specific phase
   * @param chatId Chat ID to update
   * @param phase Phase to set (1, 2, or 3)
   * @returns The updated chat
   */
  static async setChatPhase(chatId: string, phase: number): Promise<any> {
    try {
      if (phase < 1 || phase > 3) {
        throw new Error('Phase must be 1, 2, or 3');
      }
      
      // Update the chat phase
      const chat = await storage.updateChatPhase(chatId, phase);
      console.log(`Set chat ${chatId} to phase ${phase}`);
      
      return chat;
    } catch (error) {
      console.error(`Error setting chat ${chatId} to phase ${phase}:`, error);
      throw error;
    }
  }
  
  /**
   * Set predefined workflow JSON for a chat
   * @param chatId Chat ID to update
   * @returns The updated chat
   */
  static async setWorkflowJson(chatId: string): Promise<any> {
    try {
      // Update the chat's workflow JSON
      const chat = await storage.updateWorkflowJson(chatId, SAMPLE_WORKFLOW_JSON);
      console.log(`Set sample workflow JSON for chat ${chatId}`);
      
      return chat;
    } catch (error) {
      console.error(`Error setting workflow JSON for chat ${chatId}:`, error);
      throw error;
    }
  }
  
  /**
   * Complete a test chat through all phases
   * @param userId User ID to create the chat for
   * @returns The completed chat object
   */
  static async createCompletedTestChat(userId: string): Promise<any> {
    try {
      // Create chat with all messages
      const chat = await this.createTestChat(userId);
      
      // Set to phase 2 (diagram generation)
      await this.setChatPhase(chat.id, 2);
      
      // Set workflow JSON
      await this.setWorkflowJson(chat.id);
      
      // Set to phase 3 (AI suggestions)
      await this.setChatPhase(chat.id, 3);
      
      // Generate AI suggestions
      try {
        await Claude.suggestAiOpportunities(chat.id);
        console.log(`Generated AI suggestions for chat ${chat.id}`);
      } catch (error) {
        console.error(`Error generating AI suggestions for chat ${chat.id}:`, error);
      }
      
      // Return the updated chat
      return await storage.getChatById(chat.id);
    } catch (error) {
      console.error('Error creating completed test chat:', error);
      throw error;
    }
  }
}
