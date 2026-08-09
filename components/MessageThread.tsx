"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Msg = {
  id: string;
  body: string;
  sender: string;
  created_at: string;
};

export default function MessageThread({
  threadProfileId,
  initialMessages,
  senderRole,
}: {
  threadProfileId: string;
  initialMessages: Msg[];
  senderRole: "client" | "admin";
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        thread_profile_id: threadProfileId,
        body: text.trim().slice(0, 3000),
        sender: senderRole,
      })
      .select()
      .single();
    if (!error && data) {
      setMessages((m) => [...m, data as Msg]);
      setText("");
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            No messages yet. Start the conversation below.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender === senderRole;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                  mine ? "bg-flow-600 text-white" : "bg-line text-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-sky-100" : "text-slate-400"}`}>
                  {m.sender} · {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          maxLength={3000}
        />
        <button type="submit" disabled={busy || !text.trim()} className="btn-primary disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
