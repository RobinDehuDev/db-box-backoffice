import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F4F5] p-6">
      <SignIn forceRedirectUrl="/stats" fallbackRedirectUrl="/stats" />
    </div>
  )
}
