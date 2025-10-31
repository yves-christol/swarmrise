"use client";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";

export function SignInForm() {
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto">
      <p>Log in to access the service, it's free up to 10 users!</p>
      <SignInButton mode="modal">
        <button className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2">
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2">
          Sign up
        </button>
      </SignUpButton>
    </div>
  );
}

