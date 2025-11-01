"use client";

import {
  Authenticated,
  Unauthenticated,
} from "convex/react"
import { UserButton } from "@clerk/clerk-react"
import { Logo } from "./components/Logo";
import { Authentified } from "./components/Authentified"
import { Anonymous } from "./components/Anonymous"

export default function App() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <Logo size={24} begin={2} repeatCount={1} /><b>swarmrise</b>
        <UserButton appearance={{ baseTheme: "dark" }} />
      </header>
      <main className="p-8 flex flex-col gap-16">
        <Authenticated>
          <Authentified />
        </Authenticated>
        <Unauthenticated>
          <Anonymous />
        </Unauthenticated>
      </main>
    </>
  )
}

