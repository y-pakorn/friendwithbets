"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
  useSuiClient,
} from "@mysten/dapp-kit"
import { bcs } from "@mysten/sui/bcs"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Transaction } from "@mysten/sui/transactions"
import { readStreamableValue } from "ai/rsc"
import { Info, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Agreement } from "@/types/agreement"
import { contract } from "@/config/contract"
import { siteConfig } from "@/config/site"
import { dayjs } from "@/lib/dayjs"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getPredictionInput } from "@/services/ai"
import { stringToBytes, stringToNumberArray } from "@/services/sui"

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
  const [thoughts, setThoughts] = useState<
    {
      description?: string
      status: string
    }[]
  >([])
  const submit = useCallback(async () => {
    if (!input) return

    const newMessage = [...messages, { content: input, role: "user" }] as any
    setMessages([...newMessage, { content: "", role: "assistant" }] as const)
    setInput("")
    setThinking(true)
    setThoughts([])
    const stream = await getPredictionInput(
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
    for await (const result of readStreamableValue(stream)) {
      if (!result) continue
      if (result.type === "raw_thought") {
        setThoughts((t) => [...t, result])
      } else {
        setThinking(false)
        if (result.type === "text") {
          setMessages([
            ...newMessage,
            { content: result.text, role: "assistant" },
          ] as const)
        } else if (result.type === "agreement") {
          setMessages([
            ...newMessage,
            { content: result.agreement, role: "result" },
          ] as const)
        }
      }
    }
  }, [input, messages])

  const router = useRouter()

  const { mutateAsync: sign } = useSignPersonalMessage()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()
  const account = useCurrentAccount()
  const client = useSuiClient()

  const createMarket = async (agreement: Agreement, pub?: boolean) => {
    if (!account?.address) return

    const tb = new Transaction()
    const { publicKeyBcs, privateKey } = !pub
      ? await (async () => {
          const message = stringToBytes(
            `Create Market "${agreement.title}", bet end at ${agreement.betEndAt}, resolve at ${agreement.resolveAt}, by ${account.address}`
          )
          const signed = await sign({
            message,
          })
          const keypair = Ed25519Keypair.fromSecretKey(
            Buffer.from(signed.signature, "base64").subarray(0, 32)
          )
          const publicKey = keypair.getPublicKey().toRawBytes()

          return {
            publicKeyBcs: tb.pure(
              bcs.option(bcs.vector(bcs.U8)).serialize(publicKey)
            ),
            privateKey: keypair.getSecretKey(),
          }
        })()
      : {
          privateKey: null,
          publicKeyBcs: tb.pure(bcs.option(bcs.vector(bcs.U8)).serialize(null)),
        }

    tb.moveCall({
      target: `${contract.core}::core::new_market`,
      arguments: [
        tb.pure(bcs.vector(bcs.U8).serialize(stringToBytes(agreement.title))), // title
        tb.pure(
          bcs.vector(bcs.U8).serialize(stringToBytes(agreement.description))
        ), // description
        tb.pure(bcs.vector(bcs.U8).serialize(stringToBytes(agreement.rules))), // rules
        tb.pure(
          bcs
            .vector(bcs.U8)
            .serialize(stringToBytes(agreement.relevantInformation))
        ), // relevant Information
        tb.pure(bcs.U64.serialize(new Date(agreement.betEndAt).valueOf())), // betEndAt
        tb.pure(bcs.U64.serialize(new Date(agreement.resolveAt).valueOf())), // resolveAt
        tb.pure(
          bcs.vector(bcs.U8).serialize(stringToBytes(agreement.resolveQuery))
        ), // resolveQuery
        tb.pure(
          bcs
            .vector(bcs.vector(bcs.U8))
            .serialize(
              agreement.resolveSources.map((s) => stringToNumberArray(s))
            )
        ), // resolveSources
        tb.pure(
          bcs
            .vector(bcs.vector(bcs.U8))
            .serialize(
              agreement.outcomes.map((e) => stringToNumberArray(e.title))
            )
        ), // outcomes title
        tb.pure(
          bcs
            .vector(bcs.vector(bcs.U8))
            .serialize(
              agreement.outcomes.map((e) => stringToNumberArray(e.description))
            )
        ), // outcomes description
        publicKeyBcs, // publicKey (optional)
        tb.object("0x6"), // clock
      ],
    })

    const signed = await signAndExecute({
      transaction: tb,
    })

    const { effects, errors } = await client.waitForTransaction({
      digest: signed.digest,
      options: {
        showEffects: true,
      },
    })

    if (errors) {
      toast.error("Failed to create market", {
        description: errors.join(", "),
      })
      return
    }

    const marketId = effects?.created?.[0].reference.objectId

    router.push(`/market/${marketId}?key=${privateKey || ""}`)
  }

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 py-8">
      {messages.length === 0 ? (
        <>
          <div className="flex flex-col items-center text-center">
            <Image
              src="/icon.png"
              alt="Friend With Bets"
              width={60}
              height={60}
            />
            <h2 className="text-lg font-bold">{siteConfig.name}</h2>
            <h1 className="my-4 text-3xl font-medium">
              Bet on anything, anywhere, with anyone.
            </h1>
          </div>
          <form
            className="flex w-full max-w-[600px] items-center gap-2"
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
        </>
      ) : (
        <div className="flex w-full flex-1 flex-col gap-2">
          <div className="flex-1" />
          {messages.map((message, index, a) => (
            <div
              key={index}
              className={cn(
                "flex w-full items-center justify-start gap-2",
                message.role === "user" && "justify-end"
              )}
            >
              {thinking && message.role !== "user" && a.length - 1 === index ? (
                <div className="space-y-2">
                  <div className="w-fit rounded-md bg-primary-foreground p-4">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                  <div>
                    {thoughts.map((thoughts, i) => (
                      <div key={i} className="text-sm">
                        {thoughts.status}{" "}
                        <span className="text-muted-foreground">
                          {thoughts.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : message.role === "result" ? (
                <div>
                  <div
                    className={cn(
                      "space-y-2 rounded-md bg-primary-foreground p-4"
                    )}
                  >
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
                      <div>
                        <div className="font-semibold">Resolving</div>
                        <div className="inline-flex items-center gap-2 text-muted-foreground">
                          {message.content.resolveQuery}{" "}
                          {message.content.resolveSources.map((e, i) => (
                            <Link
                              key={i}
                              href={e}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonVariants({
                                size: "fit",
                                variant: "ghost",
                              })}
                            >
                              <Info className="size-3" />
                            </Link>
                          ))}
                        </div>
                      </div>
                      <div className="italic">
                        Resolves in {dayjs(message.content.resolveAt).fromNow()}{" "}
                        (
                        {dayjs(message.content.resolveAt).format(
                          "DD/MM/YYYY, HH:mm Z"
                        )}
                        )
                      </div>
                      <div className="italic">
                        Betting end {dayjs(message.content.betEndAt).fromNow()}{" "}
                        (
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
                  <Button
                    size="xs"
                    onClick={() => createMarket(message.content, true)}
                  >
                    Create Market (Public)
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => createMarket(message.content)}
                  >
                    Create Market (Private)
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "whitespace-normal rounded-md bg-primary-foreground p-2",
                    message.role === "user" && "bg-secondary"
                  )}
                >
                  {message.content}
                </div>
              )}
            </div>
          ))}
          <form
            className="bottom-0 flex w-full items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              submit()
            }}
          >
            <Input
              placeholder="Revise the market, e.g. make this by end of year."
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
    </main>
  )
}
