import Anthropic from '@anthropic-ai/sdk';
import { 
  Message,
  MessageParam,
  MessageCreateParams,
  Tool
} from '@anthropic-ai/sdk/resources';
import { storage } from './storage';
import { DEFAULT_CHAT_TITLE } from '@shared/constants';
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

  private static readonly CREATE_PROMPT_SYSTEM = `# System Prompt: Generate Implementation Guidance Prompt

## ROLE
You are an expert **Implementation Prompt Generator**. Your task is to take a description of a proposed AI or automation opportunity for a business workflow and transform it into a detailed, actionable prompt. This generated prompt will be given by a user to another advanced AI assistant (like yourself, Claude, or ChatGPT) to request practical guidance on how to build or implement the described solution.

## INPUT
You will receive the following input:
* \`Opportunity Description\`: A text description (typically 60-120 words) outlining a specific AI/automation opportunity identified within a business workflow.

## TASK
Analyze the provided \`Opportunity Description\` and generate a *new prompt* that fulfills the following criteria:

1.  **Goal Clarity:** The generated prompt must clearly state the user's goal – seeking guidance on implementing the specific opportunity described.
2.  **Action-Oriented Questions:** It should ask the AI assistant for actionable advice, such as:
    * A potential step-by-step implementation plan (high-level).
    * Key technical considerations (e.g., data requirements, integration points).
    * Suggestions for specific tools, programming languages, libraries, APIs, or platforms (e.g., "Suggest relevant Python libraries," "What kind of database might be suitable?", "Are there specific cloud services like AWS Lambda or Google Cloud Functions that could be used?").
    * Potential challenges or prerequisites the user should be aware of.
    * Questions the user should ask vendors if considering off-the-shelf solutions.
3.  **Contextualization:** The generated prompt must incorporate the core details and context from the original \`Opportunity Description\`.
4.  **Structure & Formatting:** The generated prompt should be well-structured and clearly formatted (e.g., using bullet points or numbered lists for questions) so the user can easily copy and paste it.
5.  **Target Audience:** Assume the user receiving the generated prompt has some technical understanding but may not be an expert in the specific AI/automation domain mentioned. The prompt should guide the AI assistant to provide explanations accordingly.

## OUTPUT FORMAT
Your final output MUST be **only** the generated prompt text itself. Do not include any explanations, introductions, or concluding remarks before or after the generated prompt.

## INSTRUCTION
Now, based on the \`Opportunity Description\` you will receive, generate the implementation guidance prompt following all the requirements above. Remember to output ONLY the generated prompt text.`;

  // Generate title for a chat
  public static async generateChatTitle(chatId: string): Promise<string> {
    try {
      // Get the first 3 user messages
      const messages = await storage.getFirstNMessages(chatId, 6); // Get first 6 messages to ensure we have at least 3 from user
      const userMessages = messages.filter(m => m.role === 'user').slice(0, 3);
      
      if (userMessages.length === 0) {
        return DEFAULT_CHAT_TITLE;
      }
      
      const content = userMessages.map(m => m.content).join('\n');
      
      console.log(`Generating title using ${userMessages.length} user messages from chat ${chatId}`);
      
      const response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 50,
        temperature: 0.7,
        system: "Generate a concise, descriptive 2-3 word title for a workflow based on these initial messages from a user. Respond with ONLY the title, no additional text or formatting.",
        messages: [
          { role: 'user', content }
        ],
      });
      
      // Extract title from response safely
      let title = DEFAULT_CHAT_TITLE;
      
      // Make sure response has content blocks
      if (response.content && response.content.length > 0) {
        const firstBlock = response.content[0];
        
        // Extract text safely from the content block
        if (firstBlock.type === 'text') {
          title = firstBlock.text.trim().replace(/^["']|["']$/g, '');
          console.log(`Generated title: "${title}" for chat ${chatId}`);
        }
      }
      
      // Make sure title is reasonable
      if (title.length < 3 || title.length > 60) {
        console.log(`Title length ${title.length} outside acceptable range, using default`);
        title = DEFAULT_CHAT_TITLE;
      }
      
      // Update the chat title in database
      await storage.updateChatTitle(chatId, title);

      return title;
    } catch (error) {
      console.error('Error generating chat title:', error);
      return DEFAULT_CHAT_TITLE;
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
        max_tokens: 20000,
        temperature: 0.7,
        system: this.WORKFLOW_DISCOVERY_SYSTEM,
        messages: typedMessages,
      });
      
      // Extract and validate the response text
      let assistantResponse = "I'm working on understanding your workflow...";
      
      // Safely extract text from the content blocks
      if (response.content && response.content.length > 0) {
        const firstBlock = response.content[0];
        if (firstBlock.type === 'text') {
          assistantResponse = firstBlock.text;
        }
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
        max_tokens: 20000,
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
      
      // Safely extract text from the content blocks
      if (response.content && response.content.length > 0) {
        const firstBlock = response.content[0];
        if (firstBlock.type === 'text') {
          mermaidSyntax = firstBlock.text;
        }
      }
      
      return mermaidSyntax.replace(/```mermaid|```/g, '').trim();
    } catch (error) {
      console.error('Error generating Mermaid syntax:', error);
      throw error;
    }
  }

  // Two-step process for generating diagrams: JSON → Mermaid → Diagram
  public static async generateDiagram(chatId: string): Promise<{ imageUrl: string, mermaidSyntax: string }> {
    try {
      console.log(`Starting diagram generation for chat ${chatId}`);
      
      // Step 0: Get chat data
      const chat = await storage.getChatById(chatId);
      
      if (!chat || !chat.workflow_json) {
        throw new Error('No workflow data found for this chat');
      }
      
      console.log(`Retrieved workflow JSON for chat ${chatId}`);
      
      // Step 1: Generate Mermaid syntax from workflow JSON
      console.log(`Generating Mermaid syntax from workflow JSON`);
      const mermaidSyntax = await this.generateMermaidSyntax(chat.workflow_json);
      
      if (!mermaidSyntax || mermaidSyntax.trim() === '') {
        throw new Error('Failed to generate Mermaid syntax');
      }
      
      console.log(`Successfully generated Mermaid syntax`);
      
      // Step 2: Generate visual diagram from Mermaid syntax using Claude's artifact generation
      console.log(`Generating visual diagram from Mermaid syntax`);
      
      // Define a fallback SVG in case artifact generation fails
      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
        <rect width="100%" height="100%" fill="#f8f9fa" />
        <text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold">Workflow Diagram</text>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16">Could not generate visualization</text>
        <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">The Mermaid syntax is available in the response</text>
      </svg>`;
      
      let imageUrl = `data:image/svg+xml,${encodeURIComponent(fallbackSvg)}`;
      
      try {
        // Use Claude to generate a diagram with artifact generation
        const response = await anthropic.messages.create({
          model: MODEL_NAME,
          max_tokens: 1000,
          temperature: 0.2,
          system: "You are a diagram generator. Convert the provided Mermaid flowchart syntax into a visual diagram. Only focus on generating the diagram, don't add any explanation.",
          messages: [
            { 
              role: 'user' as const, 
              content: `Generate a visual diagram for this Mermaid flowchart code. Make sure to use clear color contrasts and appropriate spacing for readability:\n\n\`\`\`mermaid\n${mermaidSyntax}\n\`\`\``
            }
          ],
        });
        
        console.log('Received response from Claude for diagram generation');
        
        // Extract image from response if available
        if (response.content && response.content.length > 0) {
          // Find the image if it exists in content
          const imageBlock = response.content.find(block => 
            'type' in block && block.type === 'image'
          );
          
          if (imageBlock && 'type' in imageBlock && imageBlock.type === 'image' && 'source' in imageBlock) {
            const source = imageBlock.source;
            if ('media_type' in source && 'data' in source) {
              imageUrl = `data:${source.media_type};base64,${source.data}`;
              console.log('Successfully extracted image from Claude response');
            }
          } else {
            console.warn('No image found in Claude response');
          }
        }
      } catch (diagramError) {
        console.error('Error in diagram artifact generation:', diagramError);
        // We'll continue with the fallback image
      }
      
      // Return the image URL and mermaid syntax
      return {
        imageUrl,
        mermaidSyntax
      };
    } catch (error) {
      console.error('Error in diagram generation process:', error);
      throw error;
    }
  }

  // Phase 3: AI Opportunity Suggestions with Web Search
  public static async suggestAiOpportunities(chatId: string): Promise<string> {
    try {
      console.log(`Starting AI opportunity suggestion generation for chat ${chatId}`);
      
      // Get chat data
      const chat = await storage.getChatById(chatId);
      
      if (!chat || !chat.workflow_json) {
        throw new Error('No workflow data found for this chat');
      }
      
      console.log(`Retrieved workflow JSON for chat ${chatId}`);
      
      // Define the web search tool
      const tools = [
        {
          name: "web_search",
          description: "Search the web for AI implementation case studies, best practices, and industry research",
          input_schema: {
            type: "object" as const,
            properties: {
              query: {
                type: "string" as const,
                description: "The search query to find information about AI implementations and industry best practices"
              }
            },
            required: ["query"]
          }
        }
      ];
      
      // Set up the initial prompt
      const initialPrompt = `Please analyze this workflow JSON to identify AI implementation opportunities. Use the web_search tool to find current industry examples and best practices for similar workflows.\n\n${JSON.stringify(chat.workflow_json, null, 2)}`;
      
      console.log(`Sending initial request to Claude for AI opportunity identification`);
      
      // Create the initial message to Claude without using extended thinking
      const response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.7,
        system: this.AI_OPPORTUNITIES_SYSTEM,
        messages: [{ role: 'user', content: initialPrompt }],
        tools,
        tool_choice: { type: "auto" }
      });
      
      console.log(`Received initial response from Claude`);
      
      // Initialize tracking variables
      let finalResponse = response;
      let toolCallCount = 0;
      const maxToolCalls = 5; // Limit number of searches
      
      // Initialize message history with user and assistant messages
      // We'll use proper Anthropic SDK types for messages
      const messageHistory: MessageParam[] = [
        { role: 'user', content: initialPrompt }
      ];
      
      let currentResponse = response;
      let hasMoreToolCalls = this.hasToolUse(currentResponse);
      
      // Process tool calls in a loop
      while (hasMoreToolCalls && toolCallCount < maxToolCalls) {
        console.log(`Processing tool calls, iteration ${toolCallCount + 1}`);
        
        // Extract the tool calls from the response
        const toolCalls = this.extractToolCalls(currentResponse);
        
        if (toolCalls.length === 0) {
          break;
        }
        
        // Process each tool call and collect results
        const toolResults = [];
        
        for (const toolCall of toolCalls) {
          toolCallCount++;
          console.log(`Processing tool call ${toolCallCount}: ${toolCall.name}`);
          
          if (toolCall.name === 'web_search') {
            try {
              // Get the query from the tool call
              const input = typeof toolCall.input === 'string' 
                ? JSON.parse(toolCall.input) 
                : toolCall.input;
              
              const query = input.query;
              console.log(`Performing web search for query: "${query}"`);
              
              // Execute the search
              const searchResults = await webSearch.search(query);
              console.log(`Received ${searchResults.results.length} search results`);
              
              // Add the tool result
              toolResults.push({
                type: 'tool_result' as const,
                tool_use_id: toolCall.id,
                content: JSON.stringify(searchResults)
              });
              
            } catch (error) {
              console.error('Error processing web search:', error);
              
              // Add an error result
              toolResults.push({
                type: 'tool_result' as const,
                tool_use_id: toolCall.id,
                content: JSON.stringify({ 
                  results: [{
                    title: "Error performing web search",
                    link: "https://example.com",
                    snippet: "An error occurred while performing the web search. The service may be unavailable."
                  }]
                })
              });
            }
          }
        }
        
        if (toolResults.length > 0) {
          // Add the assistant's message to history
          messageHistory.push({ 
            role: 'assistant', 
            content: currentResponse.content 
          });
          
          // Add tool results as a user message
          messageHistory.push({ 
            role: 'user', 
            content: toolResults 
          });
          
          console.log('Sending follow-up request to Claude with tool results');
          
          // Send the follow-up request
          currentResponse = await anthropic.messages.create({
            model: MODEL_NAME,
            max_tokens: 4000,
            temperature: 0.7,
            system: this.AI_OPPORTUNITIES_SYSTEM,
            messages: messageHistory,
            tools,
            tool_choice: { type: "auto" }
          });
          
          console.log('Received follow-up response from Claude');
          finalResponse = currentResponse;
          
          // Check if there are more tool calls
          hasMoreToolCalls = this.hasToolUse(currentResponse);
        } else {
          // No successful tool results, so end the loop
          hasMoreToolCalls = false;
        }
      }
      
      console.log(`Finished processing tool calls after ${toolCallCount} iterations`);
      
      // Extract the final text content
      let aiSuggestions = '';
      
      if (finalResponse.content && Array.isArray(finalResponse.content)) {
        // Get all text blocks from the final response
        const textBlocks = finalResponse.content.filter(block => 
          typeof block === 'object' && 
          block !== null && 
          'type' in block && 
          block.type === 'text' && 
          'text' in block
        );
        
        // Combine all text blocks
        aiSuggestions = textBlocks.map(block => 'text' in block ? block.text : '').join('\n\n');
      }
      
      if (!aiSuggestions) {
        throw new Error('Failed to generate AI suggestions - no content in the response');
      }
      
      console.log(`Saving AI suggestions to database for chat ${chatId}`);
      
      // Save the AI suggestions to the database
      await storage.updateAiSuggestions(chatId, aiSuggestions);
      
      // Move to phase 3 completed
      await storage.updateChatPhase(chatId, 3);
      await storage.updateChatCompleted(chatId, 1);
      
      console.log(`Successfully completed AI opportunities generation for chat ${chatId}`);
      
      return aiSuggestions;
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      throw error;
    }
  }
  
  // Helper method to check if a response contains tool use blocks
  private static hasToolUse(response: Message): boolean {
    if (response.content && Array.isArray(response.content)) {
      return response.content.some(block => 
        typeof block === 'object' && 
        block !== null && 
        'type' in block && 
        block.type === 'tool_use'
      );
    }
    return false;
  }
  
  // Helper method to extract tool call information from a response
  private static extractToolCalls(response: Message): Array<{id: string, name: string, input: any}> {
    if (!response.content || !Array.isArray(response.content)) {
      return [];
    }
    
    const toolUseBlocks = response.content.filter(block => 
      typeof block === 'object' && 
      block !== null && 
      'type' in block && 
      block.type === 'tool_use'
    );
    
    return toolUseBlocks.map(block => {
      if ('id' in block && 'name' in block && 'input' in block) {
        return {
          id: block.id as string,
          name: block.name as string,
          input: block.input
        };
      }
      return null;
    }).filter(Boolean) as Array<{id: string, name: string, input: any}>;
  }

  // Create implementation prompt for a specific opportunity
  public static async createImplementationPrompt(description: string): Promise<string> {
    try {
      console.log(`Creating implementation prompt for: ${description.substring(0, 100)}...`);
      
      // Using standard settings without extended thinking
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
        ]
      });
      
      // Safely extract text from content
      let prompt = "Unable to generate prompt. Please try again with a more detailed description.";
      
      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        // Get the first text block
        const textBlocks = response.content.filter(block => 
          typeof block === 'object' && 
          block !== null && 
          'type' in block && 
          block.type === 'text' && 
          'text' in block
        );
        
        if (textBlocks.length > 0 && 'text' in textBlocks[0]) {
          prompt = textBlocks[0].text;
          console.log(`Generated implementation prompt of length ${prompt.length}`);
        }
      }
      
      return prompt;
    } catch (error) {
      console.error('Error creating implementation prompt:', error);
      return "An error occurred while generating the implementation prompt. Please try again.";
    }
  }

  // Message deduplication settings
  private static readonly processingMessages = new Map<string, Promise<string>>();
  private static readonly recentMessages = new Map<string, number>(); // chatId+content -> timestamp
  private static readonly MESSAGE_DEDUP_WINDOW = 10000; // 10 seconds to prevent duplicates
  
  // Helper method to clean up old message records
  private static cleanupRecentMessages(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    // Find old entries
    this.recentMessages.forEach((timestamp, key) => {
      if (now - timestamp > this.MESSAGE_DEDUP_WINDOW * 2) {
        keysToRemove.push(key);
      }
    });
    
    // Remove old entries
    keysToRemove.forEach(key => {
      this.recentMessages.delete(key);
    });
    
    console.log(`Cleaned up ${keysToRemove.length} old message entries`);
  }
  
  // Process a regular chat message (for any phase)
  public static async processMessage(chatId: string, userMessage: string): Promise<string> {
    // Generate a unique key for this message
    const messageKey = `${chatId}:${userMessage.substring(0, 50)}`;
    
    // Check if we're already processing this message
    if (this.processingMessages.has(messageKey)) {
      console.log(`Message already being processed: ${messageKey}`);
      return await this.processingMessages.get(messageKey)!;
    }
    
    // Check if we've recently processed the same message
    const now = Date.now();
    const recentKey = `${chatId}:${userMessage}`;
    if (this.recentMessages.has(recentKey)) {
      const timestamp = this.recentMessages.get(recentKey)!;
      if (now - timestamp < this.MESSAGE_DEDUP_WINDOW) {
        console.log(`Duplicate message detected within deduplication window: ${recentKey}`);
        throw new Error('Duplicate message detected. Please wait before sending the same message again.');
      }
    }
    
    // Set timestamp for this message
    this.recentMessages.set(recentKey, now);
    
    // Cleanup old entries every once in a while
    if (this.recentMessages.size > 100) {
      this.cleanupRecentMessages();
    }
    
    // Create a promise for this message processing
    const processingPromise = this.processMessageInternal(chatId, userMessage);
    
    // Register the promise so we can handle concurrent requests for the same message
    this.processingMessages.set(messageKey, processingPromise);
    
    try {
      // Wait for processing to complete
      const result = await processingPromise;
      return result;
    } finally {
      // Clean up after processing is done (success or failure)
      this.processingMessages.delete(messageKey);
    }
  }
  
  // Internal implementation of message processing
  private static async processMessageInternal(chatId: string, userMessage: string): Promise<string> {
    try {
      console.log(`Processing message for chat ${chatId} with content: "${userMessage.substring(0, 50)}..."`);
      
      // Get chat data to determine current phase
      const chat = await storage.getChatById(chatId);
      
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      // Get chat history
      const messageHistory = await storage.getMessagesByChatId(chatId);
      
      // Transform to the format expected by Anthropic API
      const chatHistory = messageHistory.map(msg => {
        return {
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        } as const;
      });
      
      // Log phase for debugging
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
            
            // Safely extract text from content
            let reply = "I'm analyzing your workflow details";
            
            if (response.content && response.content.length > 0) {
              const firstBlock = response.content[0]; 
              if (firstBlock.type === 'text') {
                reply = firstBlock.text;
              }
            }
            
            return reply;
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
