"use client";

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex justify-center">
      <SignIn
        routing="hash"
        signUpUrl="/signup"
        fallbackRedirectUrl="/auth/redirect"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none border-0 p-0",
            headerTitle: "text-2xl font-semibold text-gray-800",
            headerSubtitle: "text-gray-500 text-sm",
            formButtonPrimary:
              "bg-indigo-600 hover:bg-indigo-700 text-sm font-medium",
            formFieldInput:
              "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm",
            footerActionLink: "text-indigo-600 font-medium hover:underline",
          },
        }}
      />
    </div>
  );
}
