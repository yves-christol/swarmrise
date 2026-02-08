import { Authenticated, Unauthenticated } from "convex/react"
import { AuthenticatedView } from "../AuthenticatedView"
import { Anonymous } from "../Anonymous"
import { Header } from "../Header"

export default function App() {
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <Authenticated>
        <AuthenticatedView />
      </Authenticated>
      <Unauthenticated>
        <main className="flex-1 min-h-0 p-8 flex flex-col gap-16 overflow-auto">
          <Anonymous />
        </main>
      </Unauthenticated>
    </div>
  )
}