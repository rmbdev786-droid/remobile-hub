import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import { isClerkConfigured } from "@/lib/config";
import "./globals.css";
const inter=Inter({subsets:["latin"],variable:"--font-inter"});
export const metadata:Metadata={title:{default:"Remobile Hub",template:"%s · Remobile Hub"},description:"Foxway-to-bol.com reseller operations, synchronized in one workspace."};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){const content=<html lang="en" className={inter.variable} suppressHydrationWarning><body><Providers>{children}</Providers></body></html>;return isClerkConfigured?<ClerkProvider>{content}</ClerkProvider>:content}
