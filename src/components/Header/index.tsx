"use client";
import { dark } from '@clerk/themes'

import { UserButton } from "@clerk/clerk-react"
import { Logo } from "../../components/Logo";

export const Header = () => (
  <header className="sticky top-0 z-10 bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
    <Logo size={24} begin={2} repeatCount={1} /><b>swarmrise</b>
    <UserButton appearance={{ theme: dark }} />
  </header>
)
