import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@/server/api/trpc";

function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ path, error }) => {
      if (process.env.NODE_ENV === "development") {
        console.error(`[tRPC] ${path ?? "unknown"}: ${error.message}`);
      }
    },
  });
}

export { handler as GET, handler as POST };
