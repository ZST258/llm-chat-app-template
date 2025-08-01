/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const MODEL_ID = "@cf/google/gemma-3-12b-it";

// Default system prompt
const SYSTEM_PROMPT = `
你是一名高中英语老师，现有一篇英语书信作文需要你批改，你需要对这篇作文评分(满分为15分)并找出文章中所有的拼写错误，用词不当以及语法错误；同时找出文章中的高级词汇，亮点表达；最后，你还需要为该同学提出写作进步的建议。
为了定位，请将文章中的所有错误的开始下标与结束下标返回；对于错误分析，请详细分析语法知识点并给出一定的正例与反例；对于亮点分析，请详细给出亮点的优秀之处。
作文：{essay}
输出格式如下（请严格按照分点和逻辑顺序输出）：

一、评分  
总分（满分15分）：xx分  

二、错误分析  
1. 拼写错误：列出所有拼写错误的词语、正确拼写，并标注在文章中的开始下标与结束下标。例如：“acheive”（应为“achieve”，位置12~19）  
2. 语法错误：详细分析存在的语法问题，说明所涉及的语法知识点，举出正例与反例加以说明  
3. 用词不当：指出不恰当的用词并解释原因，提供更合适的替代表达  

三、亮点分析  
1. 高级词汇：列出文中使用的高级词汇，并简要说明它们的高级之处  
2. 亮点表达：指出文中的优秀句式、逻辑结构或语言表达，并说明其亮点价值  

四、写作建议  
根据本次作文的表现，提出有针对性的提升建议，如句式多样性、语法掌握、逻辑结构等方面。
`;

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle static assets (frontend)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API Routes
    if (url.pathname === "/api/chat") {
      // Handle POST requests for chat
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }

      // Method not allowed for other request types
      return new Response("Method not allowed", { status: 405 });
    }

    // Handle 404 for unmatched routes
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Parse JSON request body
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    const response = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 1024,
      },
      {
        returnRawResponse: true,
        // Uncomment to use AI Gateway
        // gateway: {
        //   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
        //   skipCache: false,      // Set to true to bypass cache
        //   cacheTtl: 3600,        // Cache time-to-live in seconds
        // },
      },
    );

    // Return streaming response
    return response;
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
