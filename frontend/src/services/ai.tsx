"use server"

import { createAISDKTools } from "@agentic/ai-sdk"
import { SerperClient } from "@agentic/serper"
import { CoreMessage, generateObject, generateText, tool } from "ai"
import _ from "lodash"
import { z } from "zod"

import { agreementSchema } from "@/types/agreement"
import { openrouter } from "@/config/ai"

export const getPredictionInput = async (prevMessages: CoreMessage[]) => {
  const serperTool = new SerperClient({
    gl: "us",
    hl: "en",
    num: 10,
  })
  const tools = {
    google_search: tool({
      description:
        "Uses Google Search to return the most relevant web pages for a given query. Useful for finding up-to-date news and information about any topic.",
      parameters: z.object({
        query: z.string().describe("Search query, be precise and clear."),
        num: z
          .number()
          .optional()
          .default(10)
          .describe("Number of results to return, default is 10."),
      }),
      execute: async ({ query, num }) => {
        const result = await serperTool.search({
          q: query,
          num,
          type: "search",
        })
        return _.omit(result, "searchParameters", "credits")
      },
    }),
    query_perplexity: tool({
      description:
        "Make a query to the online LLM model (Perplexity) to ask for information from the internet, may not be recent but can be used to get general information.",
      parameters: z.object({
        query: z.string().describe("Search query, be precise and clear."),
      }),
      execute: async ({ query }) => {
        const { text } = await generateText({
          model: openrouter("perplexity/llama-3.1-sonar-small-128k-online"),

          prompt: `
Find the information about ${query} on the internet.

USE THE MOST RECENT INFORMATION. DO NOT USE OLD INFORMATION.

Return the information as a form of data object.

Do not engage in any assistant-like conversation.
        `,
        })

        return {
          result: text,
        }
      },
    }),
  }

  const toolsDescription = _.chain(tools)
    .entries()
    .map(
      ([name, t], i) => `
Tool ${i}: ${name}
Description: ${(t as any).description}
${_.size(t.parameters.shape) === 0 ? "" : "Parameters:"}
${_.map(t.parameters.shape, (p, name) => {
  return `"${name}"${
    (p as any).isOptional() ? "?" : ""
  }: ${(p as any)?.description}`
}).join(",\n")}
        `
    )
    .join("\n")
    .value()

  const generate = async function (messages: CoreMessage[]) {
    return generateObject({
      model: openrouter("google/gemini-flash-1.5"),
      mode: "json",
      schema: z.object({
        type: z
          .enum(["HIGH_LEVEL_PLANNING", "EXECUTE", "TALK", "FINAL_ANSWER"])
          .describe(
            "The type of the action to be taken. Must be one of: HIGH_LEVEL_PLANNING, EXECUTE, TALK, FINAL_ANSWER."
          ),
        HIGH_LEVEL_PLANNING: z
          .object({
            name: z.string(),
            currentStateOfExecution: z.string(),
            observationReflection: z.string(),
            memory: z.string().nullable(),
            plan: z.string(),
            planReasoning: z.string(),
          })
          .optional()
          .describe(
            "High level planning, optional, but must be present if the type is HIGH_LEVEL_PLANNING."
          ),
        EXECUTE: z
          .object({
            name: z.string(),
            tasks: z.array(
              z.object({
                taskTool: z
                  .string()
                  .describe(
                    "A name of the tool to be called, can be one of the tools available."
                  ),
                taskToolParameters: z
                  .record(z.any())
                  .describe(
                    "The parameters to be passed to the tool, must match the tool parameters."
                  ),
                thought: z.string(),
              })
            ),
          })
          .optional()
          .describe(
            "Execute the available tools, optional, but must be present if the type is EXECUTE."
          ),
        TALK: z
          .string()
          .optional()
          .describe(
            "Text that will be displayed to the user. Used to ask user, display information/error, talk to user. optional, but must be present if the type is TALK."
          ),
        FINAL_ANSWER: agreementSchema
          .optional()
          .describe(
            "The final answer. optional, but must be present if the type is FINAL_ANSWER."
          ),
      }),
      system: `
Current date: ${new Date().toISOString()}, ${new Date().toUTCString()}

You are personal prediction market AI assistant. Generate a prediction market agreement information as a final answer from the user input.

Prediction market agreement in this case can also be called: bet, prediction, or anything that intend to predict the future outcome.

AVAILABLE TOOLS:
<start>
${toolsDescription}
<end>

User query context is in the messages. You can use the messages to understand the context and the intention of the user query.

User maybe also asking to adjust the prediction market agreement (the final answer). You can adjust the prediction market agreement based on the user query. Answer as FINAL_ANSWER.

User can just talk to you, but your main goal is to generate a prediction market agreement information. So prompt the user to make a new type of agreement if the user is just talking to you.

DO STEP BY STEP

Formulate a plan to answer the user query.

Think about what you need to do through planning and reasoning. The answer may not be direct, you may need to use multiple steps to get the final answer.

The agreement created in the final answer must can be answered by searching the internet, otherwise prompt the user for the limitation and ask user to make a new type of agreement.

Example:
- "make a bet i will get up tomorrow" -> The information of the user getting up tomorrow is not available on the internet, so prompt the user to make a new type of agreement. Such as "This type of prediction is not possible due to the information of the user getting up is not available on the internet. Please make a new type of prediction agreement."
- "eth >100k$ eoy" -> The information of the Ethereum price is available on the internet, so this is possible.
- "make a bet on the next liverpool football match" -> The information of the next liverpool football match is available on the internet, so this is possible.
- "bet if weather will be rainy tmr" -> The information of the weather tomorrow is available on the internet, so this is possible, but you need to ask the user for the location.
- "bet if weather will be rainy tmr in bkk" -> The information of the weather tomorrow in Bangkok is available on the internet, so this is possible.
- "Who will be inaugurated as President?" -> Assume that user is talking about US president -> Query the internet about information of the president candidates -> If the current period is the election period, then this is possible. -> If the current period is not the election period, then prompt the user to make a new type of agreement.

If user says end of month, it means the last day of current month, do not ask the user for the exact date.
If user says end of year, it means the last day of current year, do not ask the user for the exact date.

DO NOT ASSUME RECENT EVENTS OR INFORMATION. Search the internet first for confirming.

You always have access to internet by using "google_search" or "query_perplexity" tools.

When you are searching for 2 things, use 2 "google_search" tools, do not use 1 tool to search for 2 things.

ACTION: HIGH_LEVEL_PLANNING
DESCRIPTION: Plan and reason the steps to get the final answer.

ACTION: EXECUTE
DESCRIPTION: Execute the available tools one or multiple time, DO NOT EXECUTE THE SAME TOOL WITH SAME PARAMETERS.

ACTION: TALK
DESCRIPTION: If you need to ask the user for more information, use this action to prompt the user for more information. You can also display the information/error to the user. Or if user is just talking to you, you can talk back to the user with this action. You must be very concise and clear with the user. Do not talk too much, only direct information.
IF THIS ACTION IS USED, YOU MUST PROVIDE "TALK" IN THE RESULT.
DO NOT TALK WITH EMPTY MESSAGE.

ACTION: FINAL_ANSWER
DESCRIPTION: Give the final prediction market agreement information to the user
IF THIS ACTION IS USED, YOU MUST PROVIDE "FINAL_ANSWER" IN THE RESULT.

You can take multiple action and steps.

YOU MUST ALWAYS DO HIGH_LEVEL_PLANNING AFTER EVERY USER MESSAGE.

You must search and find the pinpoint information from the user query.

Do not insert something like "[Insert current Bitcoin price from a reliable source]", but use the tools to get the information and insert the actual data.

After you are absolutely sure that you get the final answer. Give the final answer to the user.

ONLY the data in the FINAL_ANSWER will be returned to the user, not the previous messages or the steps. SO MAKE SURE that the FINAL_ANSWER contains all the information that the user needs.

The FINAL_ANSWER is a final prediction market agreement. So do not use any placeholder or incomplete or approximated information in the FINAL_ANSWER, instead insert the actual data.
`,
      messages,
      maxRetries: 5,
    })
  }

  const messages: CoreMessage[] = [...prevMessages]
  while (true) {
    const result = await generate(messages)
    messages.push({
      role: "assistant",
      content: `${JSON.stringify(result.object, null, 2)}`,
    })

    console.log(result.object)

    if (result.object.type === "EXECUTE") {
      await Promise.all(
        result.object.EXECUTE!.tasks.map(async (task) => {
          const toolName = task.taskTool
          const toolParameters = task.taskToolParameters
          const tool = (tools as any)[toolName]
          const toolResponse = await tool.execute(toolParameters)

          console.log(`EXECUTE TOOL: ${toolName}`, toolResponse)
          messages.push({
            role: "assistant",
            content: `
TOOL_NAME: ${toolName}
TASK_TOOL_PARAMETERS: ${JSON.stringify(task.taskToolParameters)}
TOOL_RESPONSE: ${JSON.stringify(toolResponse, null, 2)}`,
          })
        })
      )
    }

    if (result.object.type === "FINAL_ANSWER") {
      return result.object
    }

    if (result.object.type === "TALK") {
      return result.object
    }
  }
}
