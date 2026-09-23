"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRightLeft, BookOpen, Check, Clock3, Copy, Download, Edit2, Flame,
  Heart, Lock, Mail, Search, Save, Share2, Shield, Sparkles, Trash2,
  Volume2, VolumeX, X, MessageCircle, RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ref, push, onValue, remove, update } from "firebase/database";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { formatDistanceToNow } from "date-fns";
import ChatBox from "@/components/ChatBox";

import { db, auth, firebaseConfigured } from "@/lib/firebase";

const CHARACTER_LIMIT = 500;

export default function FeelingZoneUltimate() {
  const audioRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDownloader, setShowDownloader] = useState(false);
  const [videoLink, setVideoLink] = useState("");
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [randomPost, setRandomPost] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured || !db || !auth) {
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      const read = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
      setMyPosts(read("myPosts"));
      setFavorites(read("favoritePosts"));
      setLikedPosts(read("likedPosts"));
      const draft = localStorage.getItem("draftText");
      if (draft) setText(draft);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAdmin(!user.isAnonymous);
        return;
      }

      setIsAdmin(false);
      try {
        await signInAnonymously(auth);
      } catch {
      }
    });

    const unsubscribePosts = onValue(ref(db, "posts"), (snapshot) => {
      const data = snapshot.val();
      const formatted = data ? Object.keys(data).map((id) => ({ id, ...data[id] })).reverse() : [];
      setPosts(formatted);
      setLoading(false);
    }, () => setLoading(false));

    return () => { unsubscribeAuth(); unsubscribePosts(); };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("draftText", text);
  }, [text]);

  const persist = (key, value) => {
    if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
  };

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(() => alert("Tap the page once, then try Music again."));
    setIsPlaying(!isPlaying);
  };

  const handleAdminClick = async () => {
    if (isAdmin) {
      if (confirm("Log out from admin?")) await signOut(auth);
    } else {
      setAdminError("");
      setShowAdminModal(true);
    }
  };

  const submitAdminLogin = async (e) => {
    e.preventDefault();
    if (!firebaseConfigured || !auth) return setAdminError("Firebase is not configured");
    setAdminError("");
    if (!adminEmail || !adminPassword) return setAdminError("Fill all fields");
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      setShowAdminModal(false);
      setAdminEmail("");
      setAdminPassword("");
    } catch { setAdminError("Invalid admin credentials"); }
  };

  const publishPost = async () => {
    if (!firebaseConfigured || !db || !auth) return alert("Firebase is not configured");
    if (!auth.currentUser) return alert("Please wait a moment and try again.");
    if (!text.trim()) return alert("Post cannot be empty!");
    if (text.length > CHARACTER_LIMIT) return alert("Post exceeds character limit!");
    try {
      const res = await push(ref(db, "posts"), {
        name: name.trim() || "Anonymous",
        text: text.trim(),
        likes: 0,
        timestamp: Date.now(),
        ownerUid: auth.currentUser.uid,
      });
      const next = [...myPosts, res.key];
      setMyPosts(next); persist("myPosts", next);
      setText("");
      setName("");
      localStorage.removeItem("draftText");
    } catch { alert("Failed to publish post. Check Firebase configuration/rules."); }
  };

  const startEdit = (p) => { setEditingPostId(p.id); setEditText(p.text); };
  const cancelEdit = () => { setEditingPostId(null); setEditText(""); };
  const saveEdit = async (id) => {
    if (!firebaseConfigured || !db || !auth) return alert("Firebase is not configured");
    if (!auth.currentUser) return alert("Please wait a moment and try again.");
    if (!editText.trim()) return alert("Post cannot be empty!");
    if (editText.length > CHARACTER_LIMIT) return alert("Post exceeds limit!");
    try { await update(ref(db, `posts/${id}`), { text: editText.trim(), editedAt: Date.now() }); cancelEdit(); }
    catch { alert("Failed to update post"); }
  };

  const likePost = async (id, likes) => {
    if (!firebaseConfigured || !db || !auth) return alert("Firebase is not configured");
    if (!auth.currentUser) return alert("Please wait a moment and try again.");
    if (likedPosts.includes(id)) return;
    const next = [...likedPosts, id];
    try {
      await update(ref(db, `posts/${id}`), { likes: (likes || 0) + 1 });
      setLikedPosts(next); persist("likedPosts", next);
    } catch { alert("Failed to like post"); }
  };

  const toggleFavorite = (id) => {
    const next = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
    setFavorites(next); persist("favoritePosts", next);
  };

  const sharePost = async (p) => {
    const shareText = `${p.text}\n\n— ${p.name || "Anonymous"}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Feeling Zone", text: shareText }); return; } catch {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const copyPost = async (p) => {
    try { await navigator.clipboard.writeText(`${p.text}\n— ${p.name || "Anonymous"}`); setCopiedId(p.id); setTimeout(() => setCopiedId(null), 1500); }
    catch { alert("Copy is not available on this browser."); }
  };

  const downloadPost = (p) => {
    const blob = new Blob([`${p.text}\n\n— ${p.name || "Anonymous"}\nFeeling Zone`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `feeling-zone-${p.id}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const showRandomPostFunc = () => {
    if (posts.length) setRandomPost(posts[Math.floor(Math.random() * posts.length)]);
  };

  const filteredPosts = posts
    .filter((p) => !showFavorites || favorites.includes(p.id))
    .filter((p) => !search.trim() || `${p.text} ${p.name}`.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => sort === "popular" ? (b.likes || 0) - (a.likes || 0) : sort === "oldest" ? (a.timestamp || 0) - (b.timestamp || 0) : (b.timestamp || 0) - (a.timestamp || 0));

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);

  const runDownload = async () => {
    if (!videoLink.trim()) return alert("Please paste a link first!");
    setDownloadLoading(true);
    try {
      const res = await fetch("/.netlify/functions/download", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: videoLink.trim() }) });
      const data = await res.json();
      if (data?.url) window.open(data.url, "_blank");
      else alert(data?.error || "Could not process this link.");
    } catch { alert("Downloader backend is unavailable."); }
    finally { setDownloadLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white overflow-x-hidden selection:bg-pink-500/30">
      <div className="fixed top-[-200px] left-[-200px] w-[500px] h-[500px] bg-pink-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
      <audio ref={audioRef} loop><source src="https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3" type="audio/mpeg" /></audio>

      <div className="max-w-6xl mx-auto p-4 md:p-8 relative z-10">
        {!firebaseConfigured && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-xs text-red-300">
            Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* environment variables before using posts or admin login.
          </div>
        )}

        <div className="text-center py-10">
          <button onClick={handleAdminClick} className={`text-[10px] uppercase tracking-widest mb-4 flex items-center gap-1 mx-auto transition border px-3 py-1 rounded-full ${isAdmin ? "text-green-400 border-green-500/30 bg-green-500/5" : "text-neutral-600 border-white/5 hover:text-white"}`}>
            <Shield size={12} /> {isAdmin ? "Admin Logged In (Logout)" : "Admin Panel"}
          </button>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-br from-white via-neutral-200 to-neutral-700 bg-clip-text text-transparent">Feeling Zone</h1>
          <p className="text-neutral-500 text-sm mt-3">Anonymous feelings wall ✨</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <a href="https://whatsapp.com/channel/0029Vb5Yk6lDJ6Gz8QZ2kn41" target="_blank" rel="noopener noreferrer" className="glass flex items-center gap-2 px-5 py-3 rounded-2xl text-xs hover:bg-white/[0.1] transition text-green-400 border border-green-500/20">Join WhatsApp Channel</a>
          <button onClick={() => setShowDownloader(!showDownloader)} className="glass flex items-center gap-2 px-5 py-3 rounded-2xl text-xs hover:bg-white/[0.1] transition"><ArrowRightLeft size={14} /> {showDownloader ? "Switch to Poetry" : "Switch to Downloader"}</button>
          <button onClick={toggleMusic} className="glass flex items-center gap-2 px-5 py-3 rounded-2xl text-xs hover:bg-white/[0.1] transition">{isPlaying ? <Volume2 size={14} className="text-pink-400" /> : <VolumeX size={14} />} Music</button>
          <button onClick={showRandomPostFunc} className="glass flex items-center gap-2 px-5 py-3 rounded-2xl text-xs hover:bg-white/[0.1] transition"><Sparkles size={14} /> Random</button>
          <button onClick={() => setShowFavorites(!showFavorites)} className={`glass flex items-center gap-2 px-5 py-3 rounded-2xl text-xs transition ${showFavorites ? "border-pink-500/40 text-pink-300" : ""}`}><Heart size={14} /> Favorites ({favorites.length})</button>
          {isAdmin && <button onClick={() => setShowStats(!showStats)} className="glass flex items-center gap-2 px-5 py-3 rounded-2xl text-xs"><Flame size={14} /> Admin Stats</button>}
        </div>

        <AnimatePresence>{randomPost && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass mb-8 p-6 rounded-[2rem] border border-pink-500/20 bg-pink-500/10 relative">
          <button onClick={() => setRandomPost(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={16} /></button>
          <div className="flex items-center gap-2 text-pink-400 text-xs uppercase mb-3"><Sparkles size={12} /> Random Feeling</div>
          <p className="text-lg leading-relaxed whitespace-pre-wrap">{randomPost.text}</p><div className="mt-4 text-xs text-neutral-400">— {randomPost.name}</div>
        </motion.div>}</AnimatePresence>

        <AnimatePresence>{showStats && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass mb-8 p-5 rounded-[2rem] grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div><div className="text-2xl font-black">{posts.length}</div><div className="text-[10px] text-neutral-500 uppercase">Posts</div></div>
          <div><div className="text-2xl font-black">{totalLikes}</div><div className="text-[10px] text-neutral-500 uppercase">Likes</div></div>
          <div><div className="text-2xl font-black">{myPosts.length}</div><div className="text-[10px] text-neutral-500 uppercase">Your posts</div></div>
          <div><div className="text-2xl font-black">{favorites.length}</div><div className="text-[10px] text-neutral-500 uppercase">Favorites</div></div>
        </motion.div>}</AnimatePresence>

        <div className="glass rounded-[2rem] p-6">
          {!showDownloader ? <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-5">
              <div className="glass p-5 rounded-[2rem] border border-white/5">
                <h2 className="font-bold mb-5 flex items-center gap-2">Share Feeling</h2>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="Your Name (Optional)..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm mb-4 outline-none focus:border-pink-500 transition" />
                <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={CHARACTER_LIMIT} placeholder="Write something..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 h-40 text-sm resize-none outline-none focus:border-pink-500 transition" />
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1"><span>{text ? "Draft auto-saved" : ""}</span><span className={text.length >= CHARACTER_LIMIT ? "text-red-500" : ""}>{text.length}/{CHARACTER_LIMIT}</span></div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button onClick={publishPost} className="bg-white text-black font-bold py-4 rounded-2xl hover:scale-[1.02] transition">Publish</button>
                  <button onClick={() => { setText(""); localStorage.removeItem("draftText"); }} className="bg-white/5 border border-white/10 font-bold py-4 rounded-2xl hover:bg-white/10 transition flex items-center justify-center gap-2"><RotateCcw size={14}/> Clear</button>
                </div>
              </div>
              <div className="glass p-4 rounded-[2rem] border border-white/5 text-[11px] text-neutral-500 flex gap-3"><Lock size={16} className="shrink-0 text-green-400" /><span>Your saved draft, likes and favorites stay in this browser. Public posts are stored in Firebase according to your database rules.</span></div>
            </div>

            <div className="lg:col-span-2">
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="relative flex-1"><Search size={15} className="absolute left-4 top-4 text-neutral-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search feelings or names..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 pl-11 text-sm outline-none focus:border-pink-500 transition" /></div>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-black/70 border border-white/10 rounded-2xl px-4 text-sm outline-none"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="popular">Most liked</option></select>
              </div>
              <div className="text-[10px] text-neutral-600 mb-3 uppercase tracking-wider">Showing {filteredPosts.length} of {posts.length} feelings</div>

              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? <div className="text-center py-20 text-neutral-500">Loading feelings...</div> : filteredPosts.length === 0 ? <div className="text-center py-20 text-neutral-500">{showFavorites ? "No favorites yet." : search ? "No matching feelings found." : "No posts yet. Be the first!"}</div> : filteredPosts.map((p) => {
                  const words = p.text.trim().split(/\s+/).length;
                  const readTime = Math.max(1, Math.ceil(words / 200));
                  const isMyPost = myPosts.includes(p.id) && auth?.currentUser?.uid === p.ownerUid;
                  const isLiked = likedPosts.includes(p.id);
                  return <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-5 rounded-[2rem] hover:bg-white/[0.04] transition border border-white/5">
                    {editingPostId === p.id ? <div className="space-y-3"><textarea value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={CHARACTER_LIMIT} className="w-full bg-black/60 border border-white/20 rounded-2xl p-4 text-sm outline-none focus:border-pink-500 h-32 resize-none" /><div className="flex justify-between items-center"><span className="text-[10px] text-neutral-500">{editText.length}/{CHARACTER_LIMIT}</span><div className="flex gap-2"><button onClick={cancelEdit} className="flex items-center gap-1 text-xs text-neutral-400 bg-white/5 px-3 py-1.5 rounded-xl"><X size={12}/> Cancel</button><button onClick={() => saveEdit(p.id)} className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-xl"><Save size={12}/> Save</button></div></div></div> : <>
                      <p className="text-sm leading-relaxed mb-5 whitespace-pre-wrap">{p.text}</p>
                      <div className="flex justify-between items-center flex-wrap gap-3 text-[10px] text-neutral-500 uppercase">
                        <div className="flex gap-3 items-center">
                          <button onClick={() => likePost(p.id, p.likes)} className={`flex items-center gap-1 transition ${isLiked ? "text-pink-400" : "text-neutral-400 hover:text-pink-400"}`}><Heart size={14} fill={isLiked ? "currentColor" : "none"}/>{p.likes || 0}</button>
                          <button onClick={() => toggleFavorite(p.id)} className={`transition ${favorites.includes(p.id) ? "text-yellow-400" : "text-neutral-400 hover:text-yellow-300"}`} title="Favorite"><Sparkles size={14}/></button>
                          <button onClick={() => sharePost(p)} className="text-green-400 hover:scale-105 transition" title="Share"><Share2 size={14}/></button>
                          <button onClick={() => copyPost(p)} className="text-blue-400 hover:scale-105 transition" title="Copy">{copiedId === p.id ? <Check size={14}/> : <Copy size={14}/>}</button>
                          <button onClick={() => downloadPost(p)} className="text-neutral-400 hover:text-white transition" title="Download"><Download size={14}/></button>
                          {(isMyPost || isAdmin) && <button onClick={() => startEdit(p)} className="text-blue-400 flex items-center gap-1"><Edit2 size={12}/> Edit</button>}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap"><span className="flex items-center gap-1"><BookOpen size={10}/>{readTime} min</span><span className="flex items-center gap-1"><Clock3 size={10}/>{p.timestamp ? formatDistanceToNow(p.timestamp, { addSuffix: true }) : ""}</span><span className="text-neutral-400 font-semibold normal-case">{p.name}</span>{p.editedAt && <span className="text-neutral-600">edited</span>}{isAdmin && <button onClick={async () => { if (confirm("Delete this post permanently?")) await remove(ref(db, `posts/${p.id}`)); }}><Trash2 size={12} className="text-red-500"/></button>}</div>
                      </div>
                    </>}
                  </motion.div>;
                })}
              </div>
            </div>
          </div> : <div className="text-center py-20"><Download size={48} className="mx-auto text-blue-500 mb-6"/><h2 className="text-3xl font-bold mb-3">Media Downloader</h2><p className="text-neutral-500 text-sm mb-8">Paste a supported social media link</p><input value={videoLink} onChange={(e) => setVideoLink(e.target.value)} className="w-full max-w-lg bg-black/40 border border-white/10 rounded-2xl p-5 mb-5 outline-none focus:border-blue-500 transition" placeholder="Paste link here..."/><button disabled={downloadLoading} onClick={runDownload} className="w-full max-w-lg bg-blue-600 py-5 rounded-2xl font-bold hover:bg-blue-700 transition block mx-auto disabled:opacity-50">{downloadLoading ? "Processing..." : "Download Video"}</button><p className="text-[10px] text-neutral-600 mt-4">Downloader requires the server-side RAPIDAPI_KEY to be configured on Netlify.</p></div>}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-10 relative z-10">
        <div className="glass rounded-[2rem] p-5 text-center border border-white/5">
          <p className="text-xs text-neutral-500 mb-2">Follow Feeling Zone on WhatsApp</p>
          <a href="https://whatsapp.com/channel/0029Vb5Yk6lDJ6Gz8QZ2kn41" target="_blank" rel="noopener noreferrer" className="text-sm text-green-400 hover:text-green-300 transition">𝗙𝗲𝗲𝗹𝗶𝗻𝗴 𝗭𝗼𝗻𝗲...!🫀🕊️✨</a>
        </div>
      </div>

      <AnimatePresence>{showAdminModal && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"><motion.div initial={{ scale: .95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0f0f0f] border border-white/10 p-6 rounded-[2rem] w-full max-w-sm relative shadow-2xl"><button onClick={() => setShowAdminModal(false)} className="absolute top-4 right-4 text-neutral-400"><X size={18}/></button><div className="text-center mb-6"><div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3"><Shield size={20} className="text-pink-500"/></div><h3 className="font-bold text-lg">Admin Authentication</h3><p className="text-xs text-neutral-500 mt-1">Authorized access only</p></div><form onSubmit={submitAdminLogin} className="space-y-4"><div className="relative"><Mail className="absolute left-4 top-4 text-neutral-600" size={16}/><input type="email" placeholder="Admin Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 pl-11 text-sm outline-none focus:border-pink-500"/></div><div className="relative"><Lock className="absolute left-4 top-4 text-neutral-600" size={16}/><input type="password" placeholder="Password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 pl-11 text-sm outline-none focus:border-pink-500"/></div>{adminError && <p className="text-xs text-red-500 text-center">{adminError}</p>}<button type="submit" className="w-full bg-white text-black font-bold p-3 rounded-xl text-sm">Login as Admin</button></form></motion.div></motion.div>}</AnimatePresence>
      <ChatBox />
    </div>
  );
}
