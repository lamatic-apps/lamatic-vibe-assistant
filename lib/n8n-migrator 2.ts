export const MIGRATION_PREAMBLE = `I want to migrate an n8n workflow to Lamatic. I'm pasting the full n8n JSON export below.

Please act as an n8n → Lamatic migration expert. Do the following:

1. PARSE the n8n JSON and identify every workflow it contains (n8n exports can include multiple workflows — treat each as a candidate for a separate Lamatic flow or a combined one, and ask me if unclear).

2. MAP each n8n node to its Lamatic equivalent using the reference table below. If a node has no direct equivalent, flag it explicitly and suggest the closest alternative or a workaround using codeNode.

3. FLAG unsupported integrations — if an n8n node uses a service or integration that Lamatic does not natively support, call it out clearly and propose the best available substitute (e.g. apiNode for generic HTTP calls, codeNode for custom logic, smtpNode instead of a niche email provider).

4. PRESERVE the logic — maintain branching, conditionals, loops, error handling, and data transformations as faithfully as possible in Lamatic's node model.

5. BUILD A PLAN following your standard planning process — mermaid diagram, structured nodes list, confidence score, and clarifying questions where needed.

---

N8N → LAMATIC NODE MAPPING REFERENCE:

TRIGGERS:
- n8n Manual Trigger → graphqlNode (API endpoint trigger) or chatTriggerNode (chat UI)
- n8n Webhook → webhookTriggerNode
- n8n Schedule / Cron → cronNode_trigger
- n8n Email Trigger (IMAP) → mailhookTriggerNode
- n8n Postgres Trigger → postgresNode_trigger
- n8n Google Sheets Trigger → googleSheetsNode_trigger
- n8n Google Drive Trigger → googleDriveNode_trigger
- n8n Gmail Trigger → gmailNode_trigger
- n8n Airtable Trigger → airtableNode_trigger
- n8n Slack Trigger → slackNode_trigger
- n8n Microsoft Teams Trigger → teamsNode_trigger
- n8n Notion Trigger → notionNode_trigger
- n8n OneDrive Trigger → onedriveNode_trigger
- n8n S3 Trigger → s3Node_trigger
- n8n Webflow Trigger → webflowNode_trigger
- n8n n8n Trigger → n8nTriggerNode

AI & LLM:
- n8n OpenAI / Anthropic / Gemini (text generation) → LLMNode
- n8n OpenAI (structured/JSON output) → InstructorLLMNode
- n8n OpenAI (image generation / DALL-E) → ImageGenNode
- n8n AI Agent / LangChain Agent → agentNode (Supervisor) + agentLoopEndNode
- n8n Basic LLM Chain → LLMNode
- n8n Summarize → LLMNode (with summarization prompt)
- n8n Text Classifier → agentClassifierNode
- n8n Embeddings → vectorizeNode
- n8n Vector Store (insert) → vectorNode action=index
- n8n Vector Store (query) → searchNode or hybridSearchNode
- n8n Memory (buffer/summary) → memoryNode + memoryRetrieveNode

LOGIC & FLOW CONTROL:
- n8n IF node → conditionNode
- n8n Switch node → conditionNode (multi-condition) or branchNode
- n8n Merge node → codeNode (accumulator, needs[] all upstream branches)
- n8n Split In Batches → forLoopNode + forLoopEndNode
- n8n Loop Over Items → forLoopNode action=list + forLoopEndNode
- n8n Wait → waitNode
- n8n Set → codeNode (or variablesNode for simple key-value assignment)
- n8n Code (JS/Python) → codeNode (JS only in Lamatic; Python logic must be rewritten)
- n8n Function / Function Item → codeNode
- n8n Execute Workflow → flowNode
- n8n Stop and Error → codeNode (throw or output error flag)
- n8n NoOp → codeNode (pass-through)

DATA & FILES:
- n8n HTTP Request → apiNode
- n8n GraphQL → apiNode (POST with GraphQL body)
- n8n Postgres → postgresNode
- n8n Read/Write Binary Files → extractFromFileNode (read) / codeNode (write)
- n8n Extract from File (PDF/CSV/XLSX/DOCX) → extractFromFileNode with matching action
- n8n Spreadsheet File → extractFromFileNode action=xlsx
- n8n HTML Extract / Cheerio → scraperNode or codeNode
- n8n XML → codeNode (parse XML in JS)
- n8n RSS Feed → apiNode (fetch) + codeNode (parse)
- n8n Crypto / Date & Time / Markdown → codeNode

SEARCH & RAG:
- n8n Vector Store Retriever → searchNode or hybridSearchNode
- n8n Document Loader → extractFromFileNode + chunkNode + vectorizeNode
- n8n Text Splitter → chunkNode
- n8n Pinecone / Weaviate / Qdrant → vectorNode (Lamatic built-in VectorDB)
- n8n Serper / SerpAPI / Tavily / Google Search → webSearchNode
- n8n Web Scraper / Puppeteer → scraperNode or crawlerNode or firecrawlNode

INTEGRATIONS — DIRECT EQUIVALENTS:
- n8n Gmail → gmailNode
- n8n Google Drive → googleDriveNode
- n8n Google Sheets → googleSheetsNode
- n8n Slack → slackNode action=postMessage
- n8n Microsoft Teams → teamsNode
- n8n Notion → notionNode
- n8n Airtable → airtableNode
- n8n Twilio (SMS/Voice/WhatsApp) → twilioNode
- n8n SMTP / Send Email → smtpNode
- n8n Webflow → webflowNode
- n8n OneDrive → onedriveNode
- n8n SharePoint → sharepointNode
- n8n AWS S3 → s3Node
- n8n MCP Client → mcpNode
- n8n n8n node → n8nNode

INTEGRATIONS — NO DIRECT EQUIVALENT (flag and propose alternative):
- HubSpot / Salesforce / Pipedrive → apiNode (REST API)
- Stripe / PayPal → apiNode (REST API)
- Jira / Linear / Asana / Trello → apiNode (REST API)
- GitHub / GitLab → apiNode (REST API)
- Typeform / Jotform → webhookTriggerNode
- Discord / Telegram → apiNode (Bot API)
- Zendesk / Freshdesk → apiNode (REST API)
- MySQL / MongoDB / Redis → apiNode or codeNode (no native node)
- FTP / SSH / SFTP → no equivalent, flag and discuss
- Dropbox → apiNode workaround
- Mailchimp / SendGrid / ActiveCampaign → smtpNode or apiNode
- Zoom / Calendly → apiNode (REST API)

RESPONSE TYPE:
- Workflow returns data to a caller → graphqlResponseNode
- Workflow sends to a chat UI → chatResponseNode
- Workflow sends back to n8n → n8nResponseNode
- Fire-and-forget (cron/event-driven) → no response node needed

---

IMPORTANT MIGRATION RULES:
- MULTIPLE WORKFLOWS: If the JSON contains more than one workflow, list them all. Ask whether to migrate as separate Lamatic flows or combined. Plan one at a time unless told otherwise.
- PYTHON CODE: n8n Code nodes with Python must be rewritten in JavaScript for Lamatic's codeNode. Flag every instance.
- CREDENTIALS: All credentialIds in the output will be "PLACEHOLDER" — the user replaces them from the Lamatic Connections page after import.
- ERROR BRANCHES: n8n "On Error" outputs → conditionNode else-branches or codeNode error flag checks.
- EXPRESSIONS: n8n uses $json / $node / $input syntax — translate all to Lamatic's [[nodeId.output.fieldName]] format.
- STICKY NOTES: Ignore n8n Sticky Note nodes — documentation only.
- DISABLED NODES: If a node has "disabled: true", note it and ask whether to include it.

---

N8N WORKFLOW JSON:
`;

export function validateN8nInput(raw: string): { valid: boolean; error?: string } {
  if (!raw || raw.trim().length === 0) {
    return { valid: false, error: "Please paste your n8n JSON export." };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw.trim());
  } catch (e) {
    return { valid: false, error: "Invalid JSON — please paste a valid n8n export." };
  }
  // n8n exports always have a "nodes" array or a "workflows" array at top level
  const hasNodes = Array.isArray(parsed.nodes);
  const hasWorkflows = Array.isArray(parsed.workflows);
  if (!hasNodes && !hasWorkflows) {
    return { valid: false, error: "This doesn't look like an n8n export. Expected a JSON with a 'nodes' or 'workflows' array." };
  }
  // Size check — warn if very large
  if (raw.length > 80000) {
    return { valid: false, error: "This workflow is very large (>80KB). Consider splitting it into smaller exports." };
  }
  return { valid: true };
}

export function buildMigrationMessage(n8nJsonRaw: string): string {
  return MIGRATION_PREAMBLE + n8nJsonRaw.trim();
}
