"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  LayoutDashboard,
  BarChart3,
  History,
  Menu,
  Bot,
} from "lucide-react";
import Logo from "@/components/logo";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/history", icon: History, label: "History" },
  { href: "/progress", icon: BarChart3, label: "Progress" },
  { href: "/guide", icon: Bot, label: "AI Guide" },
];

function UserNav() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatars/01.png" alt="@shadcn" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">John Doe</p>
            <p className="text-xs leading-none text-muted-foreground">
              m@example.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link href="/" className="w-full">
            Log out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Nav() {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href)}
            tooltip={item.label}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function MobileNav() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-sidebar text-sidebar-foreground p-0">
                <SidebarHeader className="p-2">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground px-2">
                        <Logo className="h-6 w-6" />
                        <span>Tonal Tracker</span>
                    </Link>
                </SidebarHeader>
                <SidebarContent className="p-2">
                    <Nav />
                </SidebarContent>
            </SheetContent>
        </Sheet>
    )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex flex-col md:flex-row">
        <Sidebar collapsible="icon" className="hidden md:flex">
          <SidebarHeader>
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground px-2">
                <Logo className="h-6 w-6" />
                <span className="group-data-[collapsible=icon]:hidden">Tonal Tracker</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <Nav />
          </SidebarContent>
          <SidebarFooter>
            {/* Can add elements to footer here */}
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <MobileNav />
            <div className="w-full flex-1">
              {/* Optional: Can add a search bar or other header elements here */}
            </div>
            <UserNav />
          </header>
          <main className="flex-1 p-4 sm:px-6 sm:py-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
