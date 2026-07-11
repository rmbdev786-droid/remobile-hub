"use client";
import { useState } from "react";
import { QueryClient,QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/lib/trpc/client";
import { Toaster } from "sonner";
export function Providers({children}:{children:React.ReactNode}){const[queryClient]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:30_000,refetchOnWindowFocus:false,retry:1},mutations:{retry:0}}}));const[trpcClient]=useState(()=>trpc.createClient({links:[httpBatchLink({url:"/api/trpc",transformer:superjson})]}));return <trpc.Provider client={trpcClient} queryClient={queryClient}><QueryClientProvider client={queryClient}>{children}<Toaster theme="dark" richColors position="bottom-right"/></QueryClientProvider></trpc.Provider>}
