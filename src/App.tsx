"use client";

import {
  Authenticated,
  Unauthenticated,
} from "convex/react"
import { UserButton } from "@clerk/clerk-react"
import { Authentified } from "./components/Authentified"
import { Anonymous } from "./components/Anonymous"

export default function App() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <img src="bee-swarmrise.svg" width="24" height="24" />Swarmrise
        <UserButton />
      </header>
      <main className="p-8 flex flex-col gap-16">
        <h1 className="text-4xl font-bold text-center">
          Swarmrise
        </h1>
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

