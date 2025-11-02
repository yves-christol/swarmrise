"use client";

import { Authenticated, Unauthenticated } from "convex/react"
import { Authentified } from "../Authentified"
import { Anonymous } from "../Anonymous"
import { Header } from "../Header"

export default function App() {
  return (
    <>
      <Header />
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