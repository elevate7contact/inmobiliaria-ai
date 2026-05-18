"use client";
// src/components/chat/ChatWidgetLazy.tsx
// Wrapper client para lazy-loadear ChatWidget sin SSR.
// Necesario porque layout.tsx es server component y dynamic({ssr:false}) requiere client.

import dynamic from "next/dynamic";

const ChatWidget = dynamic(
  () => import("@/components/chat/ChatWidget").then((m) => m.ChatWidget),
  { ssr: false }
);

export default function ChatWidgetLazy() {
  return <ChatWidget />;
}
