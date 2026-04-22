import { Suspense } from "react";
import ResetPassword from "@/views/ResetPassword";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />
      }
    >
      <ResetPassword />
    </Suspense>
  );
}
