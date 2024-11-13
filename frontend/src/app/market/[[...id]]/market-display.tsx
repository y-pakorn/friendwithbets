"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit"
import { bcs } from "@mysten/sui/bcs"
import { Ed25519Keypair, Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519"
import { Transaction } from "@mysten/sui/transactions"
import type { WalletAccount } from "@mysten/wallet-standard"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import BigNumber from "bignumber.js"
import { Clock, Coins, Info, Key, LinkIcon, Loader2, LogIn } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { OnChainAgreement } from "@/types/agreement"
import { contract } from "@/config/contract"
import { dayjs } from "@/lib/dayjs"
import { formatSuiDecimal, mistToSui, suiToMist } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { SuiIcon } from "@/components/sui-icon"
import { getMarkets, stringToBytes } from "@/services/sui"

export function MarketDisplay() {
  const params = useParams<{ id: string[] }>()
  const id = params.id[0]

  const client = useSuiClient()
  const market = useQuery({
    queryKey: ["market", id],
    queryFn: async () => {
      if (!id) return null
      const [market] = await getMarkets([id], client)
      return market
    },
  })

  return (
    <main className="container flex min-h-screen flex-col gap-4 py-8">
      {market.isLoading ? (
        <>
          <Skeleton className="h-10 w-1/2" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </>
      ) : !market.data ? (
        <h1 className="text-3xl font-bold">Market not found</h1>
      ) : (
        <Market market={market.data!} />
      )}
    </main>
  )
}

const Market = ({ market }: { market: OnChainAgreement }) => {
  const account = useCurrentAccount()
  const searchParams = useSearchParams()
  const key = useMemo(() => searchParams.get("key"), [searchParams])
  const isPublic = !market.publicKey

  return (
    <>
      <h1 className="inline-flex items-center gap-2 text-3xl font-bold">
        {market.title}
        {!isPublic && <Badge variant="secondary">Private</Badge>}
      </h1>
      <p className="text-muted-foreground">{market.description}</p>
      <div className="flex items-center gap-2">
        {
          //<Button
          //onClick={async () => {
          //const outcome = await getPredictionResolvedOutcome(market)
          //console.log(outcome.FINAL_ANSWER)
          //}}
          //>
          //Resolve
          //</Button>
        }
        {isPublic ? (
          <Button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              toast.success("Link copied to clipboard")
            }}
            size="sm"
            variant="outline"
          >
            <LinkIcon className="mr-2 size-4" />
            Share Market
          </Button>
        ) : key ? (
          <>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                toast.success("Link copied to clipboard")
              }}
              size="sm"
            >
              <LinkIcon className="mr-2 size-4" />
              Share Market With Access
            </Button>
            <Button
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.delete("key")
                navigator.clipboard.writeText(url.toString())
                toast.success("Link copied to clipboard")
              }}
              size="sm"
              variant="outline"
            >
              <LinkIcon className="mr-2 size-4" />
              Share Market
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(key)
                toast.success("Key copied to clipboard")
              }}
              size="sm"
              variant="outline"
            >
              <Key className="mr-2 size-4" />
              Export Key
            </Button>
          </>
        ) : (
          <AuthorizeButton market={market} />
        )}
      </div>
      <div className="space-y-4 text-sm">
        <div className="rounded-md bg-primary-foreground p-4">
          <div className="font-semibold">Relevant information</div>
          <div className="text-muted-foreground">
            {market.relevantInformation}
          </div>
        </div>
        <div className="rounded-md bg-primary-foreground p-4">
          <div className="font-semibold">Rules</div>
          <div className="text-muted-foreground">{market.rules}</div>
        </div>
        <div className="rounded-md bg-primary-foreground p-4">
          <div className="font-semibold">Resolving</div>
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            {market.resolveQuery}{" "}
            {market.resolveSources.map((e, i) => (
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
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="rounded-md bg-primary-foreground p-4">
          <div className="text-sm">Start At</div>
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <Clock className="size-4" />
            <div className="text-lg font-semibold">
              {dayjs(market.startAt).format("DD/MM/YYYY HH:mm:ss")}
            </div>
          </div>
        </div>
        <div className="rounded-md bg-primary-foreground p-4">
          <div className="text-sm">Bet End At</div>
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <Clock className="size-4" />
            <div className="text-lg font-semibold">
              {dayjs(market.betEndAt).format("DD/MM/YYYY HH:mm:ss")} (
              {market.betEndAt < new Date()
                ? "Closed"
                : dayjs(market.betEndAt).fromNow()}
              )
            </div>
          </div>
        </div>
        <div className="rounded-md bg-primary-foreground p-4">
          <div className="text-sm">Resolve At</div>
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <Clock className="size-4" />
            <div className="text-lg font-semibold">
              {dayjs(market.resolveAt).format("DD/MM/YYYY HH:mm:ss")}
              {market.resolveAt >= new Date()
                ? ` (${dayjs(market.resolveAt).fromNow()})`
                : ""}
            </div>
          </div>
        </div>
      </div>
      <h1 className="text-2xl font-semibold">Outcomes</h1>
      <div className="grid gap-2">
        {market.outcomes.map((outcome, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-md bg-primary-foreground p-4"
          >
            <div>
              <div className="text-lg font-semibold">{outcome.title}</div>
              <div className="text-sm text-muted-foreground">
                {outcome.description}
              </div>
            </div>
            <div className="ml-auto text-end">
              <div className="flex items-center gap-2">
                <Coins className="size-4 shrink-0" />
                <div className="text-lg font-semibold">
                  {formatSuiDecimal(market.betsAgg[i])}
                </div>
                <SuiIcon />
              </div>
              <div className="text-sm text-muted-foreground">
                {BigNumber(market.betsTotal).gt(0)
                  ? BigNumber(market.betsAgg[i])
                      .div(market.betsTotal)
                      .times(100)
                      .toFixed(2)
                  : 0}
                %
              </div>
            </div>
            {account && (
              <BetButton
                market={market}
                outcomeIndex={i}
                account={account}
                disabled={!isPublic && !key}
              />
            )}
          </div>
        ))}
      </div>
    </>
  )
}

const BetButton = ({
  market,
  outcomeIndex,
  account,
  disabled,
}: {
  market: OnChainAgreement
  outcomeIndex: number
  account: WalletAccount
  disabled?: boolean
}) => {
  const [open, setOpen] = useState(false)

  const balance = useSuiClientQuery("getBalance", {
    owner: account.address,
    coinType: "0x2::sui::SUI",
  })

  const formSchema = useMemo(() => {
    const totalBalance = balance.data?.totalBalance || 0
    return z.object({
      amount: z
        .string()
        .refine((v) => BigNumber(v).lte(mistToSui(totalBalance)), {
          message: "Insufficient balance",
        })
        .refine((v) => BigNumber(v).gt(0), {
          message: "Amount must be greater than 0",
        }),
    })
  }, [balance.data?.totalBalance])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    reValidateMode: "onChange",
    defaultValues: {
      amount: "0",
    },
  })

  const params = useSearchParams()

  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()
  const client = useSuiClient()

  const qClient = useQueryClient()

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const amount = suiToMist(data.amount)
    const key = params.get("key")

    const tb = new Transaction()

    const signature = market.publicKey
      ? await (async () => {
          if (!key) {
            toast.error("No key found for private market", {
              description: "Please provide a key to access this market",
            })
            throw new Error("No key found for private market")
          }

          const keypair = Ed25519Keypair.fromSecretKey(key)
          if (
            !keypair
              .getPublicKey()
              .equals(new Ed25519PublicKey(market.publicKey!))
          ) {
            toast.error("Invalid key for private market", {
              description: "Please provide a valid key to access this market",
            })
            throw new Error("Invalid key for private market")
          }

          const message = `Verifying Market Access ${account.address.slice(2)}`
          const signature = await keypair.sign(stringToBytes(message))

          return tb.pure(bcs.vector(bcs.U8).serialize(signature))
        })()
      : tb.pure(bcs.vector(bcs.U8).serialize([]))

    const [coin] = tb.splitCoins(tb.gas, [amount.toString()])
    const [bet] = tb.moveCall({
      target: `${contract.core}::core::bet`,
      arguments: [
        tb.object(market.id),
        signature,
        tb.pure(bcs.U64.serialize(outcomeIndex)),
        coin,
        tb.object("0x6"), // clock
      ],
    })
    tb.transferObjects([bet], account.address)

    const signed = await signAndExecute({
      transaction: tb,
    })

    const { errors } = await client.waitForTransaction({
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

    balance.refetch()
    qClient.refetchQueries({
      predicate: (query) => query.queryKey[0] === "market",
    })

    setOpen(false)
  }

  const amount = useWatch({
    control: form.control,
    name: "amount",
    defaultValue: "0",
  })

  const expectedReturn = useMemo(() => {
    if (market.betsTotal === "0" || !amount) return "0.00"
    return BigNumber(amount || 0)
      .times(
        mistToSui(market.betsTotal).minus(
          mistToSui(market.betsAgg[outcomeIndex])
        )
      )
      .div(BigNumber(amount).plus(mistToSui(market.betsAgg[outcomeIndex])))
      .toFixed(2)
  }, [amount, market.betsAgg[outcomeIndex], market.betsTotal])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={market.betEndAt < new Date() || disabled}
          variant="secondary"
        >
          Bet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Bet on {market.outcomes[outcomeIndex].title}
          </DialogTitle>
          <DialogDescription>
            {market.outcomes[outcomeIndex].description}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Bet Amount"
                      {...field}
                      autoComplete="off"
                    />
                  </FormControl>
                  <div>
                    <FormDescription
                      className="inline-flex cursor-pointer items-center gap-1"
                      onClick={() =>
                        form.setValue(
                          "amount",
                          mistToSui(balance.data?.totalBalance).toString()
                        )
                      }
                    >
                      Your balance:{" "}
                      {formatSuiDecimal(balance.data?.totalBalance || 0)}{" "}
                      <SuiIcon />
                    </FormDescription>
                  </div>
                  <div>
                    <FormDescription className="inline-flex items-center gap-1">
                      Expected return: {expectedReturn} <SuiIcon />
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Place Bet
                {form.formState.isSubmitting && (
                  <Loader2 className="ml-2 size-4 animate-spin" />
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const AuthorizeButton = ({ market }: { market: OnChainAgreement }) => {
  const [open, setOpen] = useState(false)

  const formSchema = z.object({
    key: z.string().min(1),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: "",
    },
  })

  const router = useRouter()
  const pathname = usePathname()

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const publicKey = new Ed25519PublicKey(market.publicKey!)
    try {
      const keypair = Ed25519Keypair.fromSecretKey(data.key)
      if (!keypair.getPublicKey().equals(publicKey)) {
        toast.error("Invalid key for private market", {
          description: "Please provide a valid key to access this market",
        })
        return
      }
      router.replace(`${pathname}?key=${data.key}`)
      setOpen(false)
    } catch (e) {
      toast.error("Malformed key for private market", {
        description: "Please provide a valid key to access this market",
      })
      return
    }
  }

  const account = useCurrentAccount()
  const { mutateAsync: sign } = useSignPersonalMessage()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          onClick={async (e) => {
            if (market.creator === account?.address) {
              e.preventDefault()

              const message = stringToBytes(
                `Create Market "${market.title}", bet end at ${market.betEndAt.valueOf()}, resolve at ${market.resolveAt.valueOf()}, by ${account.address}`
              )
              const signed = await sign({
                message,
              })
              const keypair = Ed25519Keypair.fromSecretKey(
                Buffer.from(signed.signature, "base64").subarray(0, 32)
              )
              const publicKey = keypair.getPublicKey()

              if (publicKey.equals(new Ed25519PublicKey(market.publicKey!))) {
                router.replace(`${pathname}?key=${keypair.getSecretKey()}`)
                return
              } else {
                toast.error("Malformed key")
              }
            }
          }}
          disabled={market.betEndAt < new Date()}
        >
          <LogIn className="mr-2 size-4" />
          Authorize Access To Market
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Authorize Access To Market</DialogTitle>
          <DialogDescription>
            To access this private market, please provide the correct key.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input placeholder="Key" {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Authorize
                {form.formState.isSubmitting && (
                  <Loader2 className="ml-2 size-4 animate-spin" />
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
