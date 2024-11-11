"use client"

import { useCallback, useState } from "react"
import { getPredictionInput } from "@/services/ai"
import { ConnectButton } from "@mysten/dapp-kit"
import { Loader2 } from "lucide-react"

import { Agreement } from "@/types/agreement"
import { siteConfig } from "@/config/site"
import { dayjs } from "@/lib/dayjs"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Home() {
  const [messages, setMessages] = useState<
    (
      | {
          role: "user" | "assistant"
          content: string
        }
      | {
          role: "result"
          content: Agreement
        }
    )[]
  >([])

  const [input, setInput] = useState("")
  const [thinking, setThinking] = useState(false)
  const submit = useCallback(async () => {
    if (!input) return

    const newMessage = [...messages, { content: input, role: "user" }] as any
    setMessages([...newMessage, { content: "", role: "assistant" }] as const)
    setInput("")
    setThinking(true)
    const result = await getPredictionInput(
      newMessage.map((m: any) => ({
        role: m.role === "result" ? "assistant" : m.role,
        content:
          typeof m.content === "object"
            ? JSON.stringify(
                {
                  type: "FINAL_ANSWER",
                  FINAL_ANSWER: m.content,
                },
                null,
                2
              )
            : m.content,
      }))
    )
    setThinking(false)

    if (!result) return

    if (result.type === "TALK") {
      setMessages([
        ...newMessage,
        { content: result.TALK || "", role: "assistant" },
      ] as const)
    }

    if (result.type === "FINAL_ANSWER") {
      setMessages([
        ...newMessage,
        {
          content: result.FINAL_ANSWER!,
          role: "result",
        },
      ] as const)
    }
  }, [input, messages])

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 py-8">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">{siteConfig.name}</h1>
        <ConnectButton />
      </div>

      <div className="w-full max-w-[600px]">
        {messages.length === 0 ? (
          <form
            className="flex w-full items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              submit()
            }}
          >
            <Input
              placeholder="Create market on anything"
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
            <Button type="submit">Create</Button>
          </form>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index, a) => (
              <div
                key={index}
                className={cn(
                  "flex w-full items-center justify-start gap-2",
                  message.role === "user" && "justify-end"
                )}
              >
                {thinking &&
                message.role !== "user" &&
                a.length - 1 === index ? (
                  <div>
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                ) : message.role === "result" ? (
                  <div>
                    <div className="space-y-2 rounded-md bg-primary-foreground p-4">
                      <div className="space-y-2 text-sm">
                        <div className="text-lg font-bold">
                          {message.content.title}
                        </div>
                        <div className="text-muted-foreground">
                          {message.content.description}
                        </div>
                        <div>
                          <div className="font-semibold">
                            Relevant information
                          </div>
                          <div className="text-muted-foreground">
                            {message.content.relevantInformation}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold">Rules</div>
                          <div className="text-muted-foreground">
                            {message.content.rules}
                          </div>
                        </div>
                        <div className="italic">
                          Resolves in{" "}
                          {dayjs(message.content.resolveAt).fromNow()} (
                          {dayjs(message.content.resolveAt).format(
                            "DD/MM/YYYY, HH:mm Z"
                          )}
                          )
                        </div>
                        <div className="italic">
                          Betting end{" "}
                          {dayjs(message.content.betEndAt).fromNow()} (
                          {dayjs(message.content.betEndAt).format(
                            "DD/MM/YYYY, HH:mm Z"
                          )}
                          )
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {message.content.outcomes.map((outcome, index) => (
                          <div className="rounded-md border p-2" key={index}>
                            <div>{outcome.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {outcome.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button size="xs">Create Market With This Version</Button>
                  </div>
                ) : (
                  <div className="whitespace-normal rounded-md bg-primary-foreground p-2">
                    {message.content}
                  </div>
                )}
              </div>
            ))}
            <form
              className="flex w-full items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault()
                submit()
              }}
            >
              <Input
                placeholder="Create market on anything"
                onChange={(e) => setInput(e.target.value)}
                value={input}
              />
              <Button type="submit">Send</Button>
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault()
                  setMessages([])
                }}
              >
                Reset
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
