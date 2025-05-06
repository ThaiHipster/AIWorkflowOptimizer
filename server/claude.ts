import Anthropic from '@anthropic-ai/sdk';
import { storage } from './storage';
import { WebSearch } from './websearch';

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const MODEL_NAME = 'claude-3-7-sonnet-20250219';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set. Please add it to your environment variables.');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Web search instance
const webSearch = new WebSearch();

export class Claude {
  // System messages for different phases
  private static readonly WORKFLOW_DISCOVERY_SYSTEM = `You are an AI workflow consultant helping a user map out their business process. 
Guide the conversation to capture the following details about their workflow:
- title: A short, descriptive name for the workflow
- start_event: What triggers the workflow to begin
- end_event: What indicates the workflow is complete
- steps[]: Ordered sequence of activities in the workflow
- people[]: People involved (indicate if internal/external)
- systems[]: Systems used (indicate if internal/external)
- pain_points[]: Current challenges or inefficiencies

Ask clarifying questions one at a time to build a complete understanding. When you believe you have all the necessary information, provide a summary of the workflow and ask the user to confirm it's accurate. If confirmed, structure this information into a JSON object following this exact format:

{
  "title": "...",
  "start_event": "...",
  "end_event": "...",
  "steps": [
    {"id": "step1", "description": "...", "actor": "person1", "system": "system1"},
    ...
  ],
  "people": [
    {"id": "person1", "name": "...", "type": "internal/external"},
    ...
  ],
  "systems": [
    {"id": "system1", "name": "...", "type": "internal/external"},
    ...
  ],
  "pain_points": [
    "...",
    ...
  ]
}`;

  private static readonly DIAGRAM_GENERATION_SYSTEM = `You are an AI workflow visualization specialist. I will provide you with a JSON representation of a workflow. Your task is to create a Mermaid flowchart syntax that visualizes this workflow. 

Follow these guidelines:
1. Create a top-to-bottom flowchart using Mermaid syntax
2. Start with the start_event and end with the end_event
3. Include all steps in sequence
4. Add decision points if there are conditional flows
5. Use appropriate shapes for different elements
6. Use labels that are concise but descriptive
7. Indicate which people/systems are involved with each step when that information is available

Provide ONLY the Mermaid syntax, nothing else.`;

  private static readonly AI_OPPORTUNITIES_SYSTEM = `You are an AI implementation consultant analyzing a business workflow to identify strategic AI implementation opportunities. 
I will provide you with a JSON representation of a workflow. Your task is to identify 5-10 high-impact opportunities where AI could improve this workflow.

For each opportunity:
1. Identify the specific step or pain point to address
2. Name the AI opportunity
3. Provide a detailed description of the implementation
4. Assess the complexity (Low/Medium/High)
5. Estimate the expected benefit (quantified if possible)
6. Include sources for your recommendations (research, case studies, articles)

Format your response as a Markdown table with the following columns:
| Step/Pain-point | Opportunity | Description | Complexity | Expected Benefit | Sources |

After presenting the table, include numbered references for all sources cited.

You have access to a web search tool - use it to research industry-specific AI implementations relevant to this workflow to ensure your recommendations are current and realistic.`;

  private static readonly CREATE_PROMPT_SYSTEM = `You are an AI prompt engineering specialist. I will provide you with a brief description of an AI implementation opportunity. Your task is to create a detailed, specific prompt that could be given to an advanced AI system (like GPT-4 or Claude) to generate a comprehensive implementation plan.

Your prompt should:
1. Define the specific problem/opportunity clearly
2. Specify expected inputs and outputs
3. Include necessary constraints and requirements
4. Request specific types of information (technical architecture, integration points, timeline, etc.)
5. Ask for quantifiable metrics of success

Format the prompt as a clear, well-structured implementation request that could be directly copied and used with another AI system.`;

  // Generate title for a chat
  public static async generateChatTitle(chatId: string): Promise<string> {
    try {
      // Get the first 3 user messages
      const messages = await storage.getFirstNMessages(chatId, 6); // Get first 6 messages to ensure we have at least 3 from user
      const userMessages = messages.filter(m => m.role === 'user').slice(0, 3);
      
      if (userMessages.length === 0) {
        return 'New Workflow';
      }
      
      const content = userMessages.map(m => m.content).join('\n');
      
      const response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 50,
        temperature: 0.7,
        system: "Generate a concise, descriptive 2-3 word title for a workflow based on these initial messages from a user. Respond with ONLY the title, no additional text or formatting.",
        messages: [
          { role: 'user', content }
        ],
      });
      
      // Extract title from response and trim any extra whitespace or punctuation
      const title = response.content[0].text.trim().replace(/^["']|["']$/g, '');
      
      // Update the chat title in database
      await storage.updateChatTitle(chatId, title);
      
      return title;
    } catch (error) {
      console.error('Error generating chat title:', error);
      return 'New Workflow';
    }
  }

  // Phase 1: Workflow Discovery
  public static async workflowDiscovery(chatId: string, userMessage: string, chatHistory: Array<{role: string, content: string}>): Promise<string> {
    try {
      const response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.7,
        system: this.WORKFLOW_DISCOVERY_SYSTEM,
        messages: [
          ...chatHistory,
          { role: 'user', content: userMessage }
        ],
      });
      
      const assistantResponse = response.content[0].text;
      
      // Check if response contains JSON (workflow summary)
      const jsonMatch = assistantResponse.match(/```json\s*({[\s\S]*?})\s*```|({[\s\S]*"pain_points"[\s\S]*})/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[2];
        try {
          const workflowJson = JSON.parse(jsonStr.trim());
          
          // Save the workflow JSON to the database
          await storage.updateWorkflowJson(chatId, workflowJson);
          
          // Move to phase 2
          await storage.updateChatPhase(chatId, 2);
        } catch (e) {
          console.error('Failed to parse workflow JSON:', e);
        }
      }
      
      return assistantResponse;
    } catch (error) {
      console.error('Error in workflow discovery:', error);
      throw error;
    }
  }

  // Phase 2: Diagram Generation
  public static async generateMermaidSyntax(workflowJson: any): Promise<string> {
    try {
      const response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.2,
        system: this.DIAGRAM_GENERATION_SYSTEM,
        messages: [
          { 
            role: 'user', 
            content: `Please convert this workflow JSON to Mermaid flowchart syntax:\n\n${JSON.stringify(workflowJson, null, 2)}` 
          }
        ],
      });
      
      // Extract Mermaid syntax from response
      const mermaidSyntax = response.content[0].text;
      return mermaidSyntax.replace(/```mermaid|```/g, '').trim();
    } catch (error) {
      console.error('Error generating Mermaid syntax:', error);
      throw error;
    }
  }

  public static async generateDiagram(chatId: string): Promise<{ imageUrl: string, mermaidSyntax: string }> {
    try {
      // Get chat data
      const chat = await storage.getChatById(chatId);
      
      if (!chat || !chat.workflow_json) {
        throw new Error('No workflow data found for this chat');
      }
      
      // Generate Mermaid syntax
      const mermaidSyntax = await this.generateMermaidSyntax(chat.workflow_json);
      
      // Use Claude to generate a diagram from the Mermaid syntax
      const response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.2,
        system: "Convert the provided Mermaid flowchart syntax into a visualization. Return only the flowchart diagram as an image.",
        messages: [
          { 
            role: 'user', 
            content: `Generate a diagram visualization for this Mermaid flowchart code:\n\`\`\`mermaid\n${mermaidSyntax}\n\`\`\`` 
          }
        ],
      });
      
      // Find the image in the response artifacts
      const imageArtifact = response.artifacts && response.artifacts.length > 0 
        ? response.artifacts.find(a => a.type === 'image')
        : null;
      
      if (!imageArtifact) {
        throw new Error('No image artifact found in Claude response');
      }
      
      // Return the image URL
      return {
        imageUrl: `data:image/png;base64,${imageArtifact.data}`,
        mermaidSyntax
      };
    } catch (error) {
      console.error('Error generating diagram:', error);
      throw error;
    }
  }

  // Phase 3: AI Opportunity Suggestions with Web Search
  public static async suggestAiOpportunities(chatId: string): Promise<string> {
    try {
      // Get chat data
      const chat = await storage.getChatById(chatId);
      
      if (!chat || !chat.workflow_json) {
        throw new Error('No workflow data found for this chat');
      }
      
      // Create the web search tool definition
      const tools = [
        {
          name: "web_search",
          description: "Search the web for AI implementation case studies, best practices, and industry research",
          input_schema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query"
              }
            },
            required: ["query"]
          }
        }
      ];
      
      // First message setting up the context and the need to use the search tool
      const response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.7,
        system: this.AI_OPPORTUNITIES_SYSTEM,
        messages: [
          { 
            role: 'user', 
            content: `Please analyze this workflow JSON to identify AI implementation opportunities. Use the web_search tool to find current industry examples and best practices for similar workflows.\n\n${JSON.stringify(chat.workflow_json, null, 2)}` 
          }
        ],
        tools,
        tool_choice: { type: "auto" }
      });
      
      // Process the first response and handle tool calls
      let finalResponse = response;
      let needsMoreSearches = true;
      let toolCallCount = 0;
      const maxToolCalls = 5; // Limit the number of search calls
      
      // The conversation history to build upon
      let conversation = [
        { 
          role: 'user' as const, 
          content: `Please analyze this workflow JSON to identify AI implementation opportunities. Use the web_search tool to find current industry examples and best practices for similar workflows.\n\n${JSON.stringify(chat.workflow_json, null, 2)}` 
        },
        response
      ];
      
      // Keep processing tool calls until the model is satisfied or we reach the max calls
      while (needsMoreSearches && toolCallCount < maxToolCalls) {
        // Check if the last response contains tool calls
        const lastMessage = conversation[conversation.length - 1];
        
        if (lastMessage.role === 'assistant' && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
          // Process each tool call
          const toolResponses = [];
          
          for (const toolCall of lastMessage.tool_calls) {
            if (toolCall.name === 'web_search') {
              toolCallCount++;
              
              try {
                // Extract the search query
                const input = JSON.parse(toolCall.input);
                const query = input.query;
                
                // Perform the web search
                const searchResults = await webSearch.search(query);
                
                // Add the tool response to the list
                toolResponses.push({
                  tool_call_id: toolCall.id,
                  role: 'tool' as const,
                  name: 'web_search',
                  content: JSON.stringify(searchResults)
                });
                
              } catch (error) {
                console.error('Error processing web search:', error);
                toolResponses.push({
                  tool_call_id: toolCall.id,
                  role: 'tool' as const,
                  name: 'web_search',
                  content: JSON.stringify({ results: [] })
                });
              }
            }
          }
          
          // Add tool responses to the conversation
          conversation = [...conversation, ...toolResponses];
          
          // Continue the conversation with the tool responses
          finalResponse = await anthropic.messages.create({
            model: MODEL_NAME,
            max_tokens: 4000,
            temperature: 0.7,
            system: this.AI_OPPORTUNITIES_SYSTEM,
            messages: conversation,
            tools,
            tool_choice: { type: "auto" }
          });
          
          // Add the assistant's response to the conversation
          conversation.push(finalResponse);
          
          // Check if the response has more tool calls
          needsMoreSearches = finalResponse.tool_calls && finalResponse.tool_calls.length > 0;
          
        } else {
          // No tool calls, so we're done
          needsMoreSearches = false;
        }
      }
      
      // Save the AI suggestions to the database
      const aiSuggestions = finalResponse.content[0].text;
      await storage.updateAiSuggestions(chatId, aiSuggestions);
      
      // Move to phase 3 completed
      await storage.updateChatPhase(chatId, 3);
      await storage.updateChatCompleted(chatId, 1);
      
      return aiSuggestions;
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      throw error;
    }
  }

  // Create implementation prompt for a specific opportunity
  public static async createImplementationPrompt(description: string): Promise<string> {
    try {
      const response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 2000,
        temperature: 0.7,
        system: this.CREATE_PROMPT_SYSTEM,
        messages: [
          { 
            role: 'user', 
            content: `Create a detailed implementation prompt for this AI opportunity: ${description}` 
          }
        ],
      });
      
      return response.content[0].text;
    } catch (error) {
      console.error('Error creating implementation prompt:', error);
      throw error;
    }
  }

  // Process a regular chat message (for any phase)
  public static async processMessage(chatId: string, userMessage: string): Promise<string> {
    try {
      // Get chat data to determine current phase
      const chat = await storage.getChatById(chatId);
      
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      // Get chat history
      const messageHistory = await storage.getMessagesByChatId(chatId);
      const chatHistory = messageHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
      // Process based on phase
      switch (chat.phase) {
        case 1:
          return await this.workflowDiscovery(chatId, userMessage, chatHistory);
        
        case 2:
          // If user confirms they want to generate a diagram
          if (userMessage.toLowerCase().includes('yes') && 
              (userMessage.toLowerCase().includes('diagram') || 
               messageHistory[messageHistory.length - 1].content.toLowerCase().includes('diagram'))) {
            
            // This endpoint will return a message suggesting to view the diagram
            // The actual diagram generation happens in a separate API call
            await storage.updateChatPhase(chatId, 3);
            return 'I\'ve generated a workflow diagram based on our discussion! You can view it by clicking the "View Diagram" button. Would you like me to suggest AI opportunities that could improve this workflow?';
          } else {
            // Continue regular conversation
            return await this.workflowDiscovery(chatId, userMessage, chatHistory);
          }
        
        case 3:
          // If user confirms they want AI suggestions
          if (userMessage.toLowerCase().includes('yes') && 
              (userMessage.toLowerCase().includes('suggest') || 
               messageHistory[messageHistory.length - 1].content.toLowerCase().includes('suggest'))) {
            
            return 'I\'ll analyze your workflow and research AI implementation opportunities that could help optimize it. This might take a moment as I search for relevant industry examples and best practices...';
          } else {
            // Continue regular conversation with workflow discovery system
            return await this.workflowDiscovery(chatId, userMessage, chatHistory);
          }
        
        default:
          // Default to workflow discovery for all other cases
          return await this.workflowDiscovery(chatId, userMessage, chatHistory);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }
}
