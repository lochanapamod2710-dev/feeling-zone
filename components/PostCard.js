"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { db, firebaseConfigured } from "@/lib/firebase";
import { ref, update } from "firebase/database";

export default function PostCard({ post }) {
  const [likes, setLikes] = useState(Number(post?.likes) || 0);
  const [busy, setBusy] = useState(false);

  const like = async () => {
    if (busy || !firebaseConfigured || !db || !post?.id) return;
    setBusy(true);
    const newLikes = likes + 1;
    try {
      await update(ref(db, `posts/${post.id}`), { likes: newLikes });
      setLikes(newLikes);
    } catch {
      // Keep the UI unchanged if Firebase rejects the write.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white/5 p-6 rounded-3xl">
      <p className="text-center mb-6 whitespace-pre-wrap">{post?.text || ""}</p>
      <button
        onClick={like}
        disabled={busy || !firebaseConfigured}
        className="flex items-center gap-2 mx-auto text-pink-400 disabled:opacity-50"
        type="button"
      >
        <Heart />
        {likes}
      </button>
    </div>
  );
}
