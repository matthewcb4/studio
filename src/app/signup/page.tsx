
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
import { useToast } from "@/hooks/use-toast";
import { useAuth, initiateEmailSignUp, initiateGoogleSignIn, useUser, setDocumentNonBlocking } from "@/firebase";
import { useEffect, useState } from "react";
import { doc } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Loader2 } from "lucide-react";


const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const loginImage = PlaceHolderImages.find((img) => img.id === "login-hero");
  const [isAndroid, setIsAndroid] = useState<boolean | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    // Defer state update to prevent sync state update in effect error
    const timer = setTimeout(() => {
        setIsAndroid(/android/i.test(navigator.userAgent));
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isUserLoading && user) {
      // Create user profile in Firestore
      const userRef = doc(firestore, `users/${user.uid}`);
      setDocumentNonBlocking(userRef, {
        id: user.uid,
        email: user.email,
        displayName: form.getValues('name') || user.displayName || user.email,
      }, { merge: true });

      toast({
        title: "Account Created!",
        description: "Redirecting you to the dashboard.",
      });
      setTimeout(() => router.push("/dashboard"), 1000);
    }
  }, [user, isUserLoading, router, firestore, form, toast]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    initiateEmailSignUp(auth, values.email, values.password);
  }

  function onGoogleSignIn() {
    initiateGoogleSignIn(auth);
  }

  const renderContent = () => {
    if (isAndroid === null) {
        return (
            <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">Checking device...</p>
            </div>
        )
    }
    
    if (isAndroid) {
        return (
            <>
                <div className="grid gap-2 text-center">
                    <h2 className="text-2xl font-bold">Create an account</h2>
                    <p className="text-balance text-muted-foreground">
                    Enter your information to get started
                    </p>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                            <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                            <Input placeholder="m@example.com" {...field} />
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
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                            <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">
                        Create account
                    </Button>
                    <Button variant="outline" className="w-full" type="button" onClick={onGoogleSignIn}>
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
                        Sign up with Google
                    </Button>
                    </form>
                </Form>
            </>
        )
    }

    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Available on Android</h2>
        <p className="text-balance text-muted-foreground mt-2">
          To create an account, please download fRepo from the Google Play Store on your Android device.
        </p>
        <Button asChild className="mt-4">
            <Link href="https://play.google.com/store/apps" target="_blank">
                Go to Play Store
            </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
       <div className="hidden bg-muted lg:block">
        {loginImage && (
          <Image
            src={loginImage.imageUrl}
            alt={loginImage.description}
            width="1200"
            height="1800"
            data-ai-hint={loginImage.imageHint}
            className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          />
        )}
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="flex justify-center items-center gap-2 mb-4">
              <Logo className="h-8 w-8" />
              <h1 className="text-3xl font-bold">fRepo</h1>
          </div>
          
          {renderContent()}
          
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/" className="underline">
              Sign in
            </Link>
          </div>
           <div className="mt-6 text-center text-xs">
            <Link href="/terms" className="underline text-muted-foreground">
              Terms of Service
            </Link>
            {' '} | {' '}
            <Link href="/privacy" className="underline text-muted-foreground">
              Privacy Policy
            </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
