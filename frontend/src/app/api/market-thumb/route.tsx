import { NextRequest } from "next/server"
import { ImageResponse } from "@vercel/og"

import { env } from "@/env.mjs"
import { cn } from "@/lib/utils"

export const runtime = "edge"

const fontFamily = "Bricolage Grotesque"

async function loadGoogleFont(url: string) {
  const css = await (await fetch(url)).text()
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)

  if (resource) {
    const response = await fetch(resource[1])
    if (response.status == 200) {
      return await response.arrayBuffer()
    }
  }

  throw new Error("failed to load font data")
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title")
  const description = request.nextUrl.searchParams.get("description")
  const large = request.nextUrl.searchParams.get("large")
  return new ImageResponse(
    (
      <div
        tw="flex flex-col justify-end p-12 h-full bg-white w-full"
        style={{
          fontFamily,
          gap: -20,
        }}
      >
        <div tw="flex flex-col">
          <img
            src={`${env.NEXT_PUBLIC_APP_URL}/icon.png`}
            style={{
              width: 120,
              height: 120,
            }}
          />
          <h2 tw="text-4xl font-bold">Friend With Bets</h2>
        </div>
        {title && (
          <h1 tw={cn("text-6xl font-bold", large === "true" && "text-8xl")}>
            {title}
          </h1>
        )}
        {description && <p tw="text-3xl">{description}</p>}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: fontFamily,
          data: await loadGoogleFont(
            "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz@12..96&display=swap"
          ),
          style: "normal",
          weight: 400,
        },

        {
          name: fontFamily,
          data: await loadGoogleFont(
            "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600&display=swap"
          ),
          style: "normal",
          weight: 700,
        },
      ],
    }
  )
}