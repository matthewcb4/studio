
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Logo from "@/components/logo";
import { useAuth, initiateEmailSignIn, initiateGoogleLogin, useUser, initiateFacebookSignIn } from "@/firebase";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const loginImage = PlaceHolderImages.find((img) => img.id === "login-hero");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isUserLoading, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await initiateEmailSignIn(auth, values.email, values.password);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An error occurred during login.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setIsLoading(true);
    try {
      await initiateGoogleLogin(auth);
    } catch (error: any) {
      // Handle Capacitor browser auth - not an error, just a different flow
      if (error.message === 'BROWSER_AUTH_OPENED') {
        toast({
          title: "Browser Opened",
          description: "Please sign in using Chrome, then return to this app.",
        });
        setIsLoading(false);
        return;
      }
      console.error(error);
      toast({
        variant: "destructive",
        title: "Google Login Failed",
        description: error.message || "An error occurred during Google login.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onFacebookSignIn() {
    setIsLoading(true);
    try {
      await initiateFacebookSignIn(auth);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Facebook Login Failed",
        description: error.message || "An error occurred during Facebook login.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center animate-pulse">
          <p className="text-lg font-medium text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12 relative overflow-hidden">
        {/* Animated Background Effect for Form Side */}
        <div className="absolute inset-0 -z-10 bg-background">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        </div>

        <div className="mx-auto grid w-[350px] gap-6 z-10">
          <div className="grid gap-2 text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Logo className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-headline font-bold tracking-tight">fRepo</h1>
            </div>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} className="bg-background/50 backdrop-blur-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                      <FormLabel>Password</FormLabel>
                      <Link
                        href="#"
                        className="ml-auto inline-block text-sm underline text-muted-foreground hover:text-primary transition-colors"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} className="bg-background/50 backdrop-blur-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full shadow-lg hover:shadow-primary/25 transition-all">
                Login
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <Button variant="outline" className="w-full hover:bg-card hover:text-foreground transition-colors border-muted py-5" type="button" onClick={onGoogleSignIn}>
                <svg
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="google"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 488 512"
                >
                  <path
                    fill="currentColor"
                    d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-69.4 69.4c-24.5-23.4-58.6-37.9-97.9-37.9-86.3 0-156.5 70.2-156.5 156.5s70.2 156.5 156.5 156.5c97.2 0 133-57.2 138.8-88.5H248v-71.3h239.1c1.4 12.2 2.9 24.4 2.9 37.8z"
                  ></path>
                </svg>
                Login with Google
              </Button>
              <Button variant="outline" className="w-full hover:bg-card hover:text-foreground transition-colors border-muted py-5" type="button" onClick={onFacebookSignIn}>
                <svg
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="facebook"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                >
                  <path
                    fill="currentColor"
                    d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z"
                  ></path>
                </svg>
                Login with Facebook
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline hover:text-primary transition-colors">
              Sign up
            </Link>
          </div>
          <div className="mt-6 text-center text-xs">
            <Link href="/terms" className="underline text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
            {' '} | {' '}
            <Link href="/privacy" className="underline text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        {loginImage && (
          <>
            <div className="absolute inset-0 bg-primary/10 mix-blend-overlay z-10" />
            <Image
              src={loginImage.imageUrl}
              alt={loginImage.description}
              width="1200"
              height="1800"
              data-ai-hint={loginImage.imageHint}
              className="h-full w-full object-cover dark:brightness-[0.4] dark:grayscale-[0.3]"
            />
          </>
        )}
      </div>
    </div>
  );
}

