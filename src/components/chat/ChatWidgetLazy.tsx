"use client";
// src/components/chat/ChatWidgetLazy.tsx
// Wrapper client que:
// 1. Lazy-loadea ChatWidget sin SSR (perf)
// 2. Gatea por sesión + role: SOLO usuarios autenticados con role SEARCHER ven el botón.
//    REALTOR y ADMIN no ven el chat. Anónimos tampoco.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const ChatWidget = dynamic(
  () => import("@/components/chat/ChatWidget").then((m) => m.ChatWidget),
  { ssr: false }
);

export default function ChatWidgetLazy() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        if (mounted) setAllowed(false);
        return;
      }
      const role =
        (session.user.user_metadata?.role as string | undefined) ?? "SEARCHER";
      if (mounted) setAllowed(role === "SEARCHER");
    };

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!allowed) return null;
  return <ChatWidget />;
}
