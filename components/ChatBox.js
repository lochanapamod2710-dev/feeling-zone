"use client";

import { useState, useEffect, useRef } from "react";
import { db, auth, firebaseConfigured } from "@/lib/firebase";
import { ref, push, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { getBotReply } from "@/lib/aiBot";
import { MessageSquare, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatBox() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!firebaseConfigured || !db || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const nextSessionId = user?.uid || "";
      setSessionId(nextSessionId);
      if (typeof window !== "undefined" && nextSessionId) {
        localStorage.setItem("chat_session_id", nextSessionId);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !db || !sessionId) return;

    const chatRef = ref(db, `chats/${sessionId}`);
    const unsubscribe = onValue(chatRef, (snap) => {
      const data = snap.val();
      setChat(
        data
          ? Object.keys(data).map((k) => ({ id: k, ...data[k] }))
          : []
      );
    });

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, open]);

  const send = async (e) => {
    e.preventDefault();
    if (!firebaseConfigured || !db || !auth?.currentUser || !msg.trim() || !sessionId) return;

    const userMessage = msg.trim();
    setMsg("");

    await push(ref(db, `chats/${sessionId}`), {
      text: userMessage,
      type: "user",
      time: Date.now(),
    });

    const reply = getBotReply(userMessage);

    setTimeout(async () => {
      await push(ref(db, `chats/${sessionId}`), {
        text: reply,
        type: "bot",
        time: Date.now(),
      });
    }, 600);
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 bg-white text-black p-4 rounded-full shadow-2xl z-50 flex items-center justify-center border border-white/20"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-[340px] h-[450px] bg-[#0d0d0d]/95 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            <div className="border-b border-white/10 pb-3 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">AI Support Buddy (Private)</h3>
            </div>

            {!firebaseConfigured && <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-2">Firebase is not configured.</div>}

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar text-sm">
              {chat.length === 0 ? (
                <div className="text-center text-neutral-600 py-20 text-xs">
                  Say "Hi" to start a private conversation...
                </div>
              ) : (
                chat.map((c) => (
                  <div
                    key={c.id}
                    className={`flex ${c.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl leading-relaxed ${
                        c.type === "bot"
                          ? "bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-tl-none"
                          : "bg-white/10 text-white rounded-tr-none"
                      }`}
                    >
                      {c.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={send} className="flex gap-2 mt-3 border-t border-white/10 pt-3">
              <input
                disabled={!firebaseConfigured}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-blue-500 transition text-white placeholder-neutral-600"
                placeholder="Type a message..."
              />
              <button
                type="submit"
                className="p-3 bg-white text-black rounded-xl hover:bg-neutral-200 transition flex items-center justify-center"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
