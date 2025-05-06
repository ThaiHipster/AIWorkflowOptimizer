import Anthropic from '@anthropic-ai/sdk';
import { 
  Message,
  MessageParam,
  MessageCreateParams,
  Tool
} from '@anthropic-ai/sdk/resources';
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
  private static readonly WORKFLOW_DISCOVERY_SYSTEM = `You are **Workflow-Sage v2**, a world-class operations analyst and interview
facilitator. Your only goal in this phase is to extract a complete, precise map
of one business workflow from the human operator with minimal friction, culminating
in a structured summary.

FORMAT YOUR RESPONSES CAREFULLY:
- When showing lists, ALWAYS use proper Markdown formatting:
  * For numbered lists, use "1. ", "2. ", etc. at the start of lines with a blank line before the list starts
  * For bullet points, use "- " or "* " at the start of lines with a blank line before the list starts
  * NEVER run bullet points together in a single paragraph
  * ALWAYS include a newline before and after each list item
- Always use proper paragraph breaks with blank lines between paragraphs
- Format section titles using **bold text**

──────────────────────────────  OPERATING RULES  ──────────────────────────────
1. TOKEN BUDGET • Keep the running total under **50,000 tokens**. Warn the user
   if fewer than 5,000 remain.

2. DISCOVERY LOOP • Repeat until the workflow is confirmed complete:
   a. Ask exactly **one** focused question; wait for the user's answer.
   b. If the answer is vague or missing a required detail, ask a follow-up.
   c. VITAL: When the user identifies ANY step or event (especially the start_event):
      • ALWAYS probe deeper to identify the true trigger/origin by asking:
      • "What causes [the stated first step] to happen in the first place?"
      • "Is there a specific event that triggers this workflow before [stated first step]?"
      • "Would someone need to make a decision or notice something before [stated first step]?"
      • Only proceed when confident you've identified the true origin of the workflow
   d. Capture answers silently—do *not* reveal internal notes until the final summary.

3. REQUIRED DATA (all must be filled before exit)
   • \`title\`         – short name of the workflow
   • \`start_event\`   – what initially triggers it
     • CRITICAL: You MUST verify this is truly the earliest possible starting point
     • Never accept the first step mentioned without investigating prior triggers
     • Ask "What prompts [stated first step] to occur in the first place?"
   • \`end_event\`     – how it finishes / success criteria
   • \`steps[]\`       – ordered major activities (verb phrases)
   • \`people[]\`      – each role + flag \`internal\` / \`external\`
   • \`systems[]\`     – each tool/platform + flag \`internal\` / \`external\`
   • \`pain_points[]\` – bottlenecks, delays, error-prone hand-offs

4. CONFIRMATION • When you believe all fields are captured:
   • Present a concise summary using proper markdown formatting with double newlines between sections.
   • Make sure to format using proper heading markers and bullet points:

     **Workflow:** [Title]

     **Start Event:** [What initially triggers the workflow]

     **End Event:** [Success criteria / completion]

     **Steps:**
     1. [First step]
     2. [Second step]

     **People:**
     • [Person/Role 1] (internal/external)
     • [Person/Role 2] (internal/external)

     **Systems:**
     • [System 1] (internal/external)
     • [System 2] (internal/external)

     **Pain Points:**
     • [Pain point 1]
     • [Pain point 2]

   • **Crucially:** After presenting the summary, ask the user to confirm its accuracy and completeness by asking: **"Is this summary accurate and does it represent the complete workflow, or did we miss anything?"**
   • If the user indicates changes are needed or it's incomplete, resume questioning (go back to rule 2).
   • **Data Structure Output:** (Implicit Task for LLM/Backend) Once the user *confirms* the summary is accurate and complete, the underlying application logic should ensure this summary data is stored as a structured JSON object (matching the REQUIRED DATA fields) for later use by other processes (like diagram generation). Your role as Workflow-Sage is to get the confirmation.

5. DIAGRAM OFFER • ***(REVISED SECTION)*** After the user explicitly confirms the workflow summary is complete and accurate:
   • Ask: **"Great! Now that we have the workflow mapped out, would you like me to generate a diagram of it?"**
   • If **yes** → Respond simply with something like: **"Okay, generating the workflow diagram now. It will appear shortly..."** (The backend application will handle the actual generation process based on the user's affirmative response). Your task here is just to acknowledge the request.
   • If **no** → Politely ask what they'd like to do next, such as: **"Understood. Would you like to explore potential AI opportunities for this workflow instead?"**

6. PROHIBITIONS • While in the discovery phase (Rules 1-4) **do not** suggest AI or
   automation ideas, vendors, or improvements. Focus solely on data capture and confirmation.

──────────────────────────────  INTERVIEW STYLE  ──────────────────────────────
* Friendly, succinct, plain business English.
* Encourage bullet-point answers ("Feel free to answer in bullets").
* Expand acronyms the first time they appear.
* Never proceed past rule 4 if required data is missing or unconfirmed.
* Use numbering for multi-part questions when helpful.

────────────────────────────  OUTPUT FORMATS  ────────────────────────────────
* During discovery (Rule 2) → Output **only** the next question / follow-up.
* At confirmation (Rule 4) → Output the Markdown summary and the confirmation question.
* At diagram offer (Rule 5):
  * If user says **yes** → ***(REVISED)*** Output **only** the brief acknowledgment text (e.g., "Okay, generating the workflow diagram now. It will appear shortly..."). **DO NOT** attempt to generate or output any diagram, image, artifact, Mermaid code, or description of a diagram.
  * If user says **no** → Output the polite next question (e.g., asking about AI opportunities).

───────────────────────────────────────────────────────────────────────────────
Remember: your genius lies in asking the right next question—one at a time—
until the workflow is fully mapped and the user explicitly confirms the summary is complete and accurate.

After confirmation, structure this information into a JSON object following this exact format:

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

  private static readonly AI_OPPORTUNITIES_SYSTEM = `You are **Workflow-Sage · AI-Opportunity Mode**.
Your mission is to analyze the user's confirmed workflow (provided as context)
and identify realistic, near-term AI or automation opportunities, grounded in
external examples and best practices accessed via web search.

FORMAT YOUR RESPONSES CAREFULLY:
- When showing lists, ALWAYS use proper Markdown formatting:
  * For numbered lists, use "1. ", "2. ", etc. at the start of lines with a blank line before the list starts
  * For bullet points, use "- " or "* " at the start of lines with a blank line before the list starts
  * NEVER run bullet points together in a single paragraph
  * ALWAYS include a newline before and after each list item
- Always use proper paragraph breaks with blank lines between paragraphs
- Format section titles using **bold text**

──────────────────────────  OPERATING FRAME  ──────────────────────────
1. **Source-grounded reasoning**
   • ***(REVISED)*** Use the provided **Web Search tool** when you need fresh examples, documentation, or vendor information relevant to potential opportunities. You should request searches via the available tool-use function when necessary.
   • For inspiration, consider the use cases found at these sites (you can use the **Web Search tool** to access and analyze relevant content from them): https://zapier.com/blog/all-articles/customers/; https://www.make.com/en/use-cases; https://www.gumloop.com/home (Popular Use Cases); https://relevanceai.com/academy/use-cases; https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders; https://www.microsoft.com/en-us/customers/search/
   • Prioritize reliable sources; discard hypey or low-quality blog content found during searches.

2. **Idea quality filter**
   Keep only ideas that meet **all**:
   • Can be built or configured in ≤ 12 weeks by an SMB team.
   • Improves customer experience, speed, cost, or accuracy relevant to the user's workflow steps or pain points.
   • Relies on widely available SaaS, APIs, open-source components, or established automation platforms.

3. **Description style**
   • 60-120 words per opportunity; plain English; no deep tech jargon.
   • Enough detail that a user can paste it into another advanced LLM (like yourself or ChatGPT) and ask "how do I build this?" or "create a basic implementation plan for this".
   • Mention generic capabilities (e.g. "LLM email triage", "automated data entry from invoice scans"); **avoid hard selling** specific vendors, but you may cite one or two illustrative platforms (e.g., Make.com, Zapier, specific AI service providers) as examples where appropriate in context.

4. **Token budget**: stay under 10,000 tokens for the response containing the table.

────────────────────────────  OUTPUT FORMAT  ───────────────────────────
Return **only** a Markdown table containing 5-10 distinct opportunities, followed by the list of sources cited. Provide no extra commentary before or after the table/sources.

**Table Structure:**
| Step/Pain-point | Opportunity (≤6 words) | Description (60-120 words) | Complexity (Low/Med/High) | Expected Benefit | Sources |
|---|---|---|---|---|---|

* *Step/Pain-point* → Identify the specific part of the user's workflow the opportunity addresses, using labels from their workflow map if possible.
* *Opportunity* → A concise name for the proposed solution.
* *Description* → Follow the style guide in Rule #3.
* *Complexity* → Your subjective assessment of effort needed for an SMB to implement (Low/Med/High).
* *Expected Benefit* → Quantify or qualify the likely positive impact (e.g., "reduces processing time by ~X%", "improves data accuracy", "saves ~Y hrs/wk").
* *Sources* → Use numeric citations like \`[1]\`, \`[2]\` within the table's Description or Benefit cells where appropriate.

**Source Listing (After Table):**
List the full references corresponding to the numeric citations used in the table. Format clearly:
\`[1] Source Name/Type (e.g., Make.com Use Case, Google Cloud Case Study) - Brief Topic (Year if known) URL\`
Example: \`[1] Zapier Customer Story - Automated Invoice Processing (2024) https://zapier.com/customer-stories/...\`

────────────────────────────  REASONING PROTOCOL  ──────────────────────
* Work step-by-step internally, analyzing the provided workflow context (JSON) against potential AI applications.
* For each relevant step or pain-point:
    a. Brainstorm potential AI or automation interventions.
    b. ***(REVISED)*** If unsure about feasibility, technology, or examples, **request a search** using the provided **Web Search tool**. Briefly indicate what information you need (e.g., "Search for AI tools for automated customer support ticket tagging", "Find case studies on using OCR and LLMs for invoice data extraction"). Review the search results provided back to you (assume top relevant results are returned).
    c. Filter the best idea based on the quality criteria (Rule #2).
    d. Rate complexity and estimate benefits. Cite sources if specific examples or data from web searches informed the suggestion.
* Compile the final 5-10 best opportunities into the Markdown table.
* Output **only** the final table and the sources section. **Do not** mention the search requests you made or your internal reasoning steps in the final output.`;

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
          { role: 'user' as const, content }
        ],
      });
      
      // Extract title from response and trim any extra whitespace or punctuation
      let title = 'New Workflow';
      if (response.content && response.content.length > 0 && 'text' in response.content[0]) {
        title = response.content[0].text.trim().replace(/^["']|["']$/g, '');
      }
      
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
      console.log(`Processing workflow discovery for chat ${chatId}`);
      
      // Get the current chat to check its state
      const chat = await storage.getChatById(chatId);
      if (!chat) {
        throw new Error(`Chat with ID ${chatId} not found`);
      }
      
      // Convert chat history to proper types
      const typedMessages: MessageParam[] = chatHistory.map(msg => ({
        role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'user',
        content: msg.content
      }));
      
      // Add the current user message
      typedMessages.push({
        role: 'user' as const,
        content: userMessage
      });
      
      // Create the message for Claude with comprehensive system prompt
      const response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.7,
        system: this.WORKFLOW_DISCOVERY_SYSTEM,
        messages: typedMessages,
      });
      
      // Extract and validate the response text
      let assistantResponse = "I'm working on understanding your workflow...";
      if (response.content && response.content.length > 0 && 'text' in response.content[0]) {
        assistantResponse = response.content[0].text;
      }
      
      console.log(`Received response from Claude for chat ${chatId}`);
      
      // Check if response contains JSON (workflow summary)
      // Look for JSON in code blocks or directly in the text
      const jsonRegexPatterns = [
        /```json\s*({[\s\S]*?})\s*```/, // JSON in code block with json tag
        /```\s*({[\s\S]*?})\s*```/,     // JSON in untagged code block
        /({[\s\S]*"title"[\s\S]*"start_event"[\s\S]*"steps"[\s\S]*"people"[\s\S]*"systems"[\s\S]*"pain_points"[\s\S]*})/ // Direct JSON in text
      ];
      
      let workflowJson = null;
      let jsonStr = null;
      
      // Try each pattern until we find a match
      for (const pattern of jsonRegexPatterns) {
        const match = assistantResponse.match(pattern);
        if (match) {
          jsonStr = match[1];
          try {
            workflowJson = JSON.parse(jsonStr.trim());
            // If parsing succeeds, break the loop
            break;
          } catch (e) {
            console.warn(`Failed to parse potential JSON match with pattern ${pattern}:`, e);
            // Continue trying other patterns
          }
        }
      }
      
      if (workflowJson) {
        console.log(`Successfully parsed workflow JSON for chat ${chatId}`);
        
        // Validate the structure of the workflow JSON
        if (this.validateWorkflowJson(workflowJson)) {
          // Save the workflow JSON to the database
          await storage.updateWorkflowJson(chatId, workflowJson);
          
          // Move to phase 2
          await storage.updateChatPhase(chatId, 2);
          
          console.log(`Updated chat ${chatId} to phase 2`);
        } else {
          console.warn(`Invalid workflow JSON structure detected in chat ${chatId}`);
        }
      }
      
      return assistantResponse;
    } catch (error) {
      console.error('Error in workflow discovery:', error);
      throw error;
    }
  }
  
  // Helper method to validate workflow JSON structure
  private static validateWorkflowJson(json: any): boolean {
    try {
      // Check if all required fields are present
      const requiredFields = ['title', 'start_event', 'end_event', 'steps', 'people', 'systems', 'pain_points'];
      for (const field of requiredFields) {
        if (!json.hasOwnProperty(field)) {
          console.warn(`Workflow JSON missing required field: ${field}`);
          return false;
        }
      }
      
      // Check if steps is an array
      if (!Array.isArray(json.steps)) {
        console.warn('Workflow JSON steps is not an array');
        return false;
      }
      
      // Check if people is an array
      if (!Array.isArray(json.people)) {
        console.warn('Workflow JSON people is not an array');
        return false;
      }
      
      // Check if systems is an array
      if (!Array.isArray(json.systems)) {
        console.warn('Workflow JSON systems is not an array');
        return false;
      }
      
      // Check if pain_points is an array
      if (!Array.isArray(json.pain_points)) {
        console.warn('Workflow JSON pain_points is not an array');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error validating workflow JSON:', error);
      return false;
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
            role: 'user' as const, 
            content: `Please convert this workflow JSON to Mermaid flowchart syntax:\n\n${JSON.stringify(workflowJson, null, 2)}` 
          }
        ],
      });
      
      // Extract Mermaid syntax from response
      let mermaidSyntax = "";
      if (response.content && response.content.length > 0 && 'text' in response.content[0]) {
        mermaidSyntax = response.content[0].text;
      }
      
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
            role: 'user' as const, 
            content: `Generate a diagram visualization for this Mermaid flowchart code:\n\`\`\`mermaid\n${mermaidSyntax}\n\`\`\`` 
          }
        ],
      });
      
      // Find the image in the response artifacts if they exist
      let imageUrl = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16">Diagram could not be generated</text></svg>')}`;
      
      // Check if response has artifacts property (for Claude models that support image generation)
      if (response.artifacts && Array.isArray(response.artifacts) && response.artifacts.length > 0) {
        // Type guard to check if artifact has type and data properties
        const artifact = response.artifacts.find(a => 
          typeof a === 'object' && 
          a !== null && 
          'type' in a && 
          a.type === 'image' && 
          'data' in a
        );
        
        if (artifact && 'data' in artifact) {
          imageUrl = `data:image/png;base64,${artifact.data}`;
        }
      }
      
      // Return the image URL and mermaid syntax
      return {
        imageUrl,
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
      console.log(`Processing message for chat ${chatId} with content: "${userMessage.substring(0, 50)}..."`);
      
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
      
      console.log(`Current chat phase: ${chat.phase}`);
      
      // Check if this is the first user message
      const isFirstMessage = messageHistory.filter(msg => msg.role === 'user').length === 0;
      
      // Process based on phase
      switch (chat.phase) {
        case 1:
          // In workflow discovery phase
          console.log(`Processing workflow discovery for chat ${chatId}`);
          
          // Special handling for first message to give clear instructions
          if (isFirstMessage) {
            // Add additional context to help guide the user if this is their first message
            const enhancedUserMessage = `${userMessage}\n\nPlease help me map out this workflow with details about the people involved, systems used, and any pain points.`;
            return await this.workflowDiscovery(chatId, enhancedUserMessage, chatHistory);
          } else {
            return await this.workflowDiscovery(chatId, userMessage, chatHistory);
          }
        
        case 2:
          // In diagram phase
          console.log(`Processing diagram phase message for chat ${chatId}`);
          
          // Check if user confirms they want to generate a diagram
          const lastAssistantMessage = messageHistory
            .filter(msg => msg.role === 'assistant')
            .pop()?.content || '';
            
          const diagramMentioned = 
            userMessage.toLowerCase().includes('diagram') || 
            lastAssistantMessage.toLowerCase().includes('diagram');
            
          const userAgreed = 
            userMessage.toLowerCase().includes('yes') || 
            userMessage.toLowerCase().includes('sure') || 
            userMessage.toLowerCase().includes('okay') ||
            userMessage.toLowerCase().includes('generate') ||
            userMessage.toLowerCase().includes('create');
          
          if ((diagramMentioned && userAgreed) || userMessage.toLowerCase().includes('generate diagram')) {
            // This endpoint will return a message suggesting to view the diagram
            // The actual diagram generation happens in a separate API call
            await storage.updateChatPhase(chatId, 3);
            console.log(`Updated chat ${chatId} to phase 3 (AI opportunities)`);
            
            return 'I\'ve generated a workflow diagram based on our discussion! You can view it by clicking the "View Diagram" button below. Would you like me to suggest AI opportunities that could improve this workflow?';
          } else {
            // Continue refining the workflow if they're not ready for the diagram
            return await this.workflowDiscovery(chatId, userMessage, chatHistory);
          }
        
        case 3:
          // In AI suggestions phase
          console.log(`Processing AI opportunities phase message for chat ${chatId}`);
          
          // Check if user confirms they want AI suggestions
          const lastAssistantMsg = messageHistory
            .filter(msg => msg.role === 'assistant')
            .pop()?.content || '';
            
          const suggestMentioned = 
            userMessage.toLowerCase().includes('suggest') || 
            userMessage.toLowerCase().includes('opportunities') ||
            userMessage.toLowerCase().includes('ai') ||
            lastAssistantMsg.toLowerCase().includes('suggest') ||
            lastAssistantMsg.toLowerCase().includes('opportunities');
            
          const userConfirmed = 
            userMessage.toLowerCase().includes('yes') || 
            userMessage.toLowerCase().includes('sure') ||
            userMessage.toLowerCase().includes('okay') ||
            userMessage.toLowerCase().includes('please');
          
          if ((suggestMentioned && userConfirmed) || userMessage.toLowerCase().includes('generate suggestions')) {
            console.log(`User requested AI suggestions for chat ${chatId}`);
            return 'I\'ll analyze your workflow and research AI implementation opportunities that could help optimize it. This might take a moment as I search for relevant industry examples and best practices. Please click the "Generate AI Suggestions" button to start the process.';
          } else {
            // If they're not asking for suggestions yet, continue the conversation
            // but still in the context of the workflow
            const response = await anthropic.messages.create({
              model: MODEL_NAME,
              max_tokens: 2000,
              temperature: 0.7,
              system: "You are an AI workflow consultant. You have already helped the user map their workflow and create a diagram. Now you can discuss the workflow or answer questions about it. If the user seems interested in AI enhancement opportunities, suggest they click the 'Generate AI Suggestions' button.",
              messages: [
                ...chatHistory,
                { role: 'user', content: userMessage }
              ],
            });
            
            return response.content[0].text;
          }
        
        default:
          // For any other phase or if phase is undefined, default to workflow discovery
          console.log(`Using default workflow discovery for chat ${chatId} with unknown phase ${chat.phase}`);
          return await this.workflowDiscovery(chatId, userMessage, chatHistory);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }
}
