
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Dumbbell,
  LayoutDashboard,
  BarChart3,
  History,
  Menu,
  Bot,
  LogOut,
  Loader2,
  Settings,
  List,
  Bookmark,
  Trophy,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useEffect, useState, useMemo } from "react";
import type { UserProfile } from "@/lib/types";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/guide", icon: Bot, label: "AI Guide" },
  { href: "/programs", icon: Bookmark, label: "Programs" },
  { href: "/workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/exercises", icon: List, label: "Exercises" },
  { href: "/history", icon: History, label: "History" },
  { href: "/progress", icon: BarChart3, label: "Progress" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
];

const secondaryNavItems = [
  { href: "/articles", icon: List, label: "Blog" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

function UserNav() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const initials = useMemo(() => {
    if (!isUserLoading && user) {
      if (user.displayName) {
        return user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      } else if (user.email) {
        return user.email.substring(0, 2).toUpperCase();
      } else {
        return 'U';
      }
    }
    return '';
  }, [user, isUserLoading]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName || 'Anonymous'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || 'No email'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Nav({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href)}
            tooltip={item.label}
            onClick={onLinkClick}
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

function SecondaryNav({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      {secondaryNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href)}
            tooltip={item.label}
            onClick={onLinkClick}
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
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col bg-sidebar text-sidebar-foreground p-0 max-w-64">
        <SheetHeader className="p-2 border-b">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground px-2" onClick={() => setIsOpen(false)}>
            <Logo className="h-6 w-6" />
            <span>fRepo</span>
          </Link>
        </SheetHeader>
        <SidebarContent className="p-2">
          <Nav onLinkClick={() => setIsOpen(false)} />
        </SidebarContent>
        <SidebarFooter className="p-2 mt-auto border-t">
          <SecondaryNav onLinkClick={() => setIsOpen(false)} />
        </SidebarFooter>
      </SheetContent>
    </Sheet>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userProfileRef = useMemoFirebase(() =>
    user ? doc(firestore, `users/${user.uid}/profile/main`) : null
    , [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/');
      return;
    }

    // Check for Premium Status
    // Strict Guard: If isPremium is NOT true, redirect.
    // This blocks 'false' (unpaid) AND 'undefined' (legacy/broken state).
    if (!isUserLoading && !isProfileLoading && user && userProfile) {
      const isPaymentPage = pathname === '/payment-required';
      const isAndroid = /android/i.test(navigator.userAgent);

      // Grandfather Clause: Allow all accounts created before Feb 7, 2026
      const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date();
      const isLegacyUser = creationTime < new Date('2026-02-07T00:00:00Z');

      // AUTO-SYNC: If user is on Android, "bless" them as Premium.
      // This ensures that if they bought the app (or are just using the Android version),
      // their account gets upgraded so they can also use the Web version later.
      if (isAndroid && userProfile.isPremium !== true) {
        setDocumentNonBlocking(doc(firestore, `users/${user.uid}/profile/main`), {
          isPremium: true
        }, { merge: true });
      }

      // Access Rules:
      // 1. Premium User (Paid)
      // 2. Android Device (Bypass for Store Policy)
      // 3. Legacy User (Grandfathered)
      // 4. Payment Page (Always allowed)
      const hasAccess = userProfile.isPremium === true || isAndroid || isLegacyUser || isPaymentPage;

      if (!hasAccess) {
        router.replace('/payment-required');
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router, pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex flex-col md:flex-row">
        <Sidebar collapsible="icon" className="hidden md:flex">
          <SidebarHeader>
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground px-2">
              <Logo className="h-6 w-6" />
              <span className="group-data-[collapsible=icon]:hidden">fRepo</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <Nav />
          </SidebarContent>
          <SidebarFooter>
            <SecondaryNav />
            <div className="text-xs text-center text-muted-foreground p-2 group-data-[collapsible=icon]:hidden">
              v2.1
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <MobileNav />
            <div className="w-full flex-1">
              {/* Optional: Can add a search bar or other header elements here */}
            </div>
            <UserNav />
          </header>
          <main className="flex-1 p-4 pt-6 sm:px-6 sm:py-6">
            {(isUserLoading || !user) ? (
              <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
