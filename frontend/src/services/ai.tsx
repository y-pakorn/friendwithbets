"use server"

import { CoreMessage, generateObject, tool } from "ai"
import { createStreamableValue } from "ai/rsc"
import _ from "lodash"
import { z } from "zod"

import { env } from "@/env.mjs"
import {
  Agreement,
  agreementOutcomeSchema,
  agreementSchema,
  OnChainAgreement,
} from "@/types/agreement"
import { openrouter } from "@/config/ai"

type StreamResponse =
  | StatusStreamResponse
  | TextStreamResponse
  | AgreementStreamResponse
type TextStreamResponse = {
  type: "text"
  text: string
}
type AgreementStreamResponse = {
  type: "agreement"
  agreement: Agreement
}
type StatusStreamResponse = {
  type: "raw_thought"
  status: string
  description?: string
}

const tools = {
  current_date_time: tool({
    description: "Get the current date and time.",
    parameters: z.object({}),
    execute: async () => {
      return {
        iso: new Date().toISOString(),
        utc: new Date().toUTCString(),
      }
    },
  }),
  google_search: tool({
    description:
      "Uses Google Search to return the most relevant web pages for a given query. Useful for finding up-to-date news and information about any topic.",
    parameters: z.object({
      query: z.string().describe("Search query, be precise and clear."),
    }),
    execute: async ({ query }) => {
      const data = await fetch("https://google.serper.dev/search", {
        method: "POST",
        cache: "no-cache",
        body: JSON.stringify({
          q: query,
          num: 10,
          hl: "en",
          gl: "us",
        }),
        headers: {
          "X-API-KEY": env.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
      }).then((d) => d.json())
      return _.omit(data, "searchParameters", "credits")
    },
  }),
  navigate_to_url: tool({
    description:
      "Navigate to the given URL and return the content of the page.",
    parameters: z.object({
      url: z.string().describe("URL of the page to navigate to."),
    }),
    execute: async ({ url }) => {
      const data = await fetch("https://scrape.serper.dev", {
        method: "POST",
        cache: "no-cache",
        body: JSON.stringify({
          url,
        }),
        headers: {
          "X-API-KEY": env.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
      }).then((d) => d.json())

      return _.omit(data, "credits")
    },
  }),
  //query_perplexity: tool({
  //description:
  //"Make a query to the online LLM model (Perplexity) to ask for information from the internet, may not be recent but can be used to get general information.",
  //parameters: z.object({
  //query: z.string().describe("Search query, be precise and clear."),
  //}),
  //execute: async ({ query }) => {
  //const { object } = await generateObject({
  //model: openrouter("perplexity/llama-3.1-sonar-small-128k-online"),
  //mode: "json",
  //schema: z.object({
  //data: z
  //.any()
  //.describe(
  //"The data object that contains the information. Normally object or array."
  //),
  //sources: z
  //.array(z.string())
  //.describe("The sources URL of the information."),
  //}),
  //prompt: `
  //Find the recent information about ${query} on the internet.

  //YOU MUST USE INTERNET TO GET THE REAL-TIME RECENT INFORMATION. DO NOT USE OLD INFORMATION.

  //Do not engage in any assistant-like conversation.
  //`,
  //})

  //return object
  //},
  //}),
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

export const getPredictionResolvedOutcome = async (
  _agreement: OnChainAgreement
) => {
  const agreement = _.omit(
    _agreement,
    "publicKey",
    "id",
    "resolveAt",
    "resolvedAt",
    "startAt",
    "betEndAt",
    "betsAgg",
    "betsTotal",
    "resolvedOutcome",
    "resolvedProof"
  )
  const generate = async function (messages: CoreMessage[]) {
    return generateObject({
      model: openrouter("google/gemini-flash-1.5"),
      mode: "json",
      schema: z.object({
        type: z
          .enum(["HIGH_LEVEL_PLANNING", "EXECUTE", "FINAL_ANSWER"])
          .describe(
            "The type of the action to be taken. Must be one of: HIGH_LEVEL_PLANNING, EXECUTE, FINAL_ANSWER."
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
                taskThought: z.string(),
              })
            ),
            thought: z.string(),
          })
          .optional()
          .describe(
            "Execute the available tools, optional, but must be present if the type is EXECUTE."
          ),
        FINAL_ANSWER: agreementOutcomeSchema
          .optional()
          .describe(
            "The final answer. optional, but must be present if the type is FINAL_ANSWER."
          ),
      }),
      system: `
Current date: ${new Date().toISOString()}, ${new Date().toUTCString()}

You are personal prediction market AI assistant. Based on the agreement, resolved and choose the correct outcome of the agreement.

BE PRECISE WITH TIMEZONE, DATE, AND TIME. Make sure that the date and time is correct and precise.

AVAILABLE TOOLS:
<start>
${toolsDescription}
<end>

AGREEMENT:
${JSON.stringify(agreement, null, 2)}

DO STEP BY STEP

Formulate a plan to choose the correct outcome of the agreement.

Think about what you need to do through planning and reasoning. The answer may not be direct, you may need to use multiple steps to get the final answer.

DO NOT ASSUME RECENT EVENTS OR INFORMATION. Search the internet first for confirming.

You always have access to internet by using "google_search", "navigate_to_url" tools.

When you are searching for 2 things, use 2 "google_search" tools, do not use 1 tool to search for 2 things.

ACTION: HIGH_LEVEL_PLANNING
DESCRIPTION: Plan and reason the steps to get the final answer.

ACTION: EXECUTE
DESCRIPTION: Execute the available tools one or multiple time, DO NOT EXECUTE THE SAME TOOL WITH SAME PARAMETERS.

ACTION: FINAL_ANSWER
DESCRIPTION: Give the final prediction market agreement information to the user
IF THIS ACTION IS USED, YOU MUST PROVIDE "FINAL_ANSWER" IN THE RESULT.

You can take multiple action and steps.

YOU MUST ALWAYS DO HIGH_LEVEL_PLANNING AFTER EVERY USER MESSAGE.

You can retry back to HIGH_LEVEL_PLANNING and start over if you think the direction to get the final answer is wrong.

After you are absolutely sure that you get the final answer. Give the final answer to the user.

You can use "google_search" to search google, and "navigate_to_url" to navigate to the URL and get the content of the page. You can use those tool multiple times and in many steps.

Reflect on the data, if you cannot find the data in current url that you navigated to, you can go back to the previous step and try to find the data in another URL. Or you can use "google_search" to search for the data. Or you can use HIGH_LEVEL_PLANNING to reflect and plan the next steps to retry.

ONLY the data in the FINAL_ANSWER will be returned to the user, not the previous messages or the steps. SO MAKE SURE that the FINAL_ANSWER contains all the information that the user needs.

The FINAL_ANSWER is a final prediction market agreement. So do not use any placeholder or incomplete or approximated information in the FINAL_ANSWER, instead insert the actual data.
`,
      messages,
      maxRetries: 5,
    })
  }

  const messages: CoreMessage[] = []
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
      return result.object.FINAL_ANSWER
    }
  }
}

export const getPredictionInput = async (prevMessages: CoreMessage[]) => {
  const controller = new AbortController()
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
            label: z
              .string()
              .describe("The label of execution, user will see this."),
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
            label: z
              .string()
              .describe("The label of execution, user will see this."),
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
                taskThought: z.string(),
              })
            ),
            thought: z.string(),
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

Prediction market agreement in this case can also be called: bet, prediction, or anything that intend to create a outcome prediction that will be resolved in the future.

The user will talk to you with the intention to generate a prediction market agreement information. So something like "Will bangkok rain in the next 30 mins?" is not a question to ask you, but that is the user intention to create a prediction market agreement of "Will bangkok rain in the next 30 mins?".

AVAILABLE TOOLS:
<start>
${toolsDescription}
<end>

User query context is in the messages. You can use the messages to understand the context and the intention of the user query. Make sure that you are refering to the same context and intention of the user query.

User maybe also asking to adjust the prediction market agreement (the final answer). You can adjust the prediction market agreement based on the user query. Answer as FINAL_ANSWER.

User can just talk to you, but your main goal is to generate a prediction market agreement information. So prompt the user to make a new type of agreement if the user is just talking to you.

DO STEP BY STEP

Formulate a plan to answer the user query.

If user says end of month, it means the last day of current month, do not ask the user for the exact date.
If user says end of year, it means the last day of current year, do not ask the user for the exact date.

DO NOT ASSUME RECENT EVENTS OR INFORMATION. Search the google/internet first for confirming.

When you are searching for 2 things, use a tool 2 times, do not use 1 tool to search for 2 things.

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

You can retry back to HIGH_LEVEL_PLANNING and start over if you think the direction to get the final answer is wrong.

The goal of the final generated agreement is to have the agreement that can be resolved and chose the correct outcome by searching the internet.

So in this stage (what you are doing right now), you need to generate a prediction market agreement that can be resolved in the future.

You must not query the future event because that is not possible anyway, but you can query to check if the information is available in the past or now.

Remember that you need to resolve the generated agreement in the future, so you need to make sure RIGHT NOW that the information is available to resolve the agreement. So DO NOT query directly for the future event.

DO NOT ASSUME THAT the event is too specific or too general. You need to try to query FIRST.

DO NOT QUERY for anything like "forecast" or "predict", you are not generating a forecast or prediction, you are generating a prediction market agreement that can be resolved. You just need to make sure that the information is available to resolve the agreement.

You can use "google_search" to search google, and "navigate_to_url" to navigate to the URL and get the content of the page. You can use those tool multiple times and in many steps.

You also need to solve for what "events" user are refering to. So if user says "Will Curry scores 30+ points in the next game?", you need to get information for his "next game" and validate the information. Or if user says "will mike tyson ko jake paul tonight", you will also need to get information for "mike tyson vs jake paul" and make sure the match is not finished yet.


Reflect on the data, if you cannot find the data in current url that you navigated to, you can go back to the previous step and try to find the data in another URL. Or you can use "google_search" to search for the data. Or you can use HIGH_LEVEL_PLANNING to reflect and plan the next steps to retry.

After you are absolutely sure that you get the final answer. Give the final answer to the user.

ONLY the data in the FINAL_ANSWER will be returned to the user, not the previous messages or the steps. SO MAKE SURE that the FINAL_ANSWER contains all the information that the user needs.

"betEndAt" is the final date time that the bet can be placed, it should be the date time that make sense to the user query. So if the user query is "Will bangkok rain in the next 30 mins?", the betEndAt should be 15 mins from now.

DO NOT USE any placeholder or incomplete or approximated information in the FINAL_ANSWER, instead insert the actual data.
`,
      messages,
      maxRetries: 5,
      abortSignal: controller.signal,
    })
  }

  const stream = createStreamableValue<StreamResponse>()
  const messages: CoreMessage[] = [...prevMessages]
  ;(async () => {
    try {
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

              console.log(
                `EXECUTE TOOL: ${toolName}`,
                toolParameters,
                toolResponse
              )
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
          stream.update({
            type: "agreement",
            agreement: result.object.FINAL_ANSWER!,
          })
          return
        } else if (result.object.type === "TALK") {
          stream.update({
            type: "text",
            text: result.object.TALK!,
          })
          return
        } else if (result.object.type === "HIGH_LEVEL_PLANNING") {
          stream.update({
            type: "raw_thought",
            status: result.object.HIGH_LEVEL_PLANNING!.label,
            description:
              result.object.HIGH_LEVEL_PLANNING!.observationReflection,
          })
        } else if (result.object.type === "EXECUTE") {
          stream.update({
            type: "raw_thought",
            status: result.object.EXECUTE!.label,
            description: result.object.EXECUTE!.thought,
          })
        }
      }
    } finally {
      controller.abort()
      stream.done()
    }
  })()

  return stream.value
}
