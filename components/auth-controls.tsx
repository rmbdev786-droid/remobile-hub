"use client";
import { SignedIn,SignedOut,SignInButton,UserButton } from "@clerk/nextjs";
export function AuthControls(){return <><SignedIn><UserButton appearance={{elements:{avatarBox:"h-8 w-8 rounded-[8px]"}}}/></SignedIn><SignedOut><SignInButton mode="modal"><button className="min-h-9 rounded-[8px] border border-[#2E2E35] bg-[#141416] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.05em] text-[#F0F0F0] hover:border-[#606068] hover:bg-[#1A1A1E]">Sign in</button></SignInButton></SignedOut></>}
