"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ConnectModal,
  useCurrentAccount,
  useResolveSuiNSName,
} from "@mysten/dapp-kit"
import {
  ChevronsUpDown,
  Compass,
  Handshake,
  LayoutDashboard,
  Plus,
  SunMoon,
} from "lucide-react"
import { useTheme } from "next-themes"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { DropdownMenu, DropdownMenuTrigger } from "./ui/dropdown-menu"

const NAVIGATIONS = [
  {
    label: "Platform",
    items: [
      {
        label: "Create",
        href: "/",
        icon: Plus,
      },
      {
        label: "Discover",
        href: "/discover",
        icon: Compass,
      },
    ],
  },
  {
    label: "Portfolio",
    items: [
      {
        label: "My Bets",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  const account = useCurrentAccount()
  const name = useResolveSuiNSName(account?.address)

  const [open, setOpen] = useState(false)

  const { setTheme, resolvedTheme } = useTheme()

  return (
    <>
      <ConnectModal
        open={open}
        onOpenChange={setOpen}
        trigger={<div className="sr-only" />}
      />
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <Image
              src="/icon.png"
              alt="Friend With Bets"
              width={24}
              height={24}
            />
            <h1 className="text-lg font-bold">Friend With Bets</h1>
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          {NAVIGATIONS.map((nav, index) => (
            <SidebarGroup key={index}>
              <SidebarGroupLabel>{nav.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.items.map((item, index) => (
                    <SidebarMenuItem key={index}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-6" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}

          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() =>
                      setTheme(resolvedTheme === "dark" ? "light" : "dark")
                    }
                  >
                    <SunMoon className="size-6" />
                    <span>Toogle Theme</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    onClick={(e) => {
                      if (!account) {
                        e.preventDefault()
                        setOpen(true)
                      }
                    }}
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        className="object-cover"
                        alt={name.data || account?.address}
                      />
                      <AvatarFallback className="rounded-lg">
                        {name.data?.slice(0, 1) ||
                          account?.address.slice(2, 5) ||
                          "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {name.data ||
                          account?.address.slice(0, 8) ||
                          "Connect Wallet"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {account?.address || "Please Connect Wallet"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  )
}
