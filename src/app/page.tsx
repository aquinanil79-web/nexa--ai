"use client";

import { useState } from "react";
import { ArrowUp, Bot, ChevronDown, CircleHelp, FileText, FolderKanban, Image as ImageIcon, Menu, Mic, Plus, Search, Settings, Sparkles, SquarePen, X } from "lucide-react";
import styles from "./page.module.css";
import type { ChatMessage } from "@/types/ai";

const modes = ["General", "Reasoning", "Coding", "Study", "Writing", "Research"];
const navItems = [{ label: "New chat", icon: SquarePen }, { label: "Search", icon: Search, shortcut: "⌘ K" }, { label: "Projects", icon: FolderKanban }, { label: "Files", icon: FileText }, { label: "Agents", icon: Bot }];

export default function Home() {
  const [activeMode, setActiveMode] = useState("General");
  const [prompt, setPrompt] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("New chat");
  const [searchQuery, setSearchQuery] = useState("");

  function openView(view: string) {
    setActiveView(view);
    setSidebarOpen(false);
    if (view === "New chat") {
      setMessages([]);
      setPrompt("");
      setError("");
    }
  }

  async function sendMessage() {
    const content = prompt.trim();
    if (!content || isGenerating) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setPrompt("");
    setError("");
    setIsGenerating(true);
    try {
      const response = await fetch("/api/chat/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: nextMessages, mode: activeMode }) });
      if (!response.ok) {
        const raw = await response.text();
        let message = "The request could not be completed.";
        if (raw) {
          try {
            const payload = JSON.parse(raw) as { error?: string };
            message = payload.error ?? message;
          } catch {
            message = raw.trim() || message;
          }
        }
        throw new Error(message);
      }
      if (!response.body) throw new Error("The provider returned no response stream.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const data = event.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
          if (!data || data === "[DONE]") continue;
          const chunk = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }>; error?: string };
          if (chunk.error) throw new Error(chunk.error);
          const text = chunk.choices?.[0]?.delta?.content ?? "";
          if (text) setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: message.content + text } : message));
        }
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The request could not be completed."); setMessages((current) => current.at(-1)?.content ? current : current.slice(0, -1)); }
    finally { setIsGenerating(false); }
  }

  return (
    <main className={styles.appShell}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brandRow}><div className={styles.mark}><Sparkles size={16} strokeWidth={2.5} /></div><span className={styles.wordmark}>NEXA <span>AI</span></span><button className={styles.iconButtonMobile} onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <button className={styles.newChatButton} onClick={() => openView("New chat")}><Plus size={17} /> New chat <span>⌘ N</span></button>
        <nav className={styles.navList} aria-label="Main navigation">{navItems.slice(1).map(({ label, icon: Icon, shortcut }) => <button className={`${styles.navItem} ${activeView === label ? styles.navItemActive : ""}`} key={label} onClick={() => openView(label)} aria-current={activeView === label ? "page" : undefined}><Icon size={17} /><span>{label}</span>{shortcut && <kbd>{shortcut}</kbd>}</button>)}</nav>
        <div className={styles.sidebarBottom}><button className={`${styles.navItem} ${activeView === "Settings" ? styles.navItemActive : ""}`} onClick={() => openView("Settings")} aria-current={activeView === "Settings" ? "page" : undefined}><Settings size={17} /><span>Settings</span></button></div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}><button className={styles.menuButton} onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className={styles.breadcrumb}><span>Workspace</span></div><div className={styles.topbarActions}><button className={styles.topIcon} aria-label="Help"><CircleHelp size={18} /></button></div></header>
        <div className={styles.chatLayout}>
          <div className={styles.chatColumn}>
            {activeView !== "New chat" && <section className={styles.viewPanel} aria-labelledby="view-title"><p className={styles.viewEyebrow}>Workspace</p><h1 id="view-title">{activeView}</h1>{activeView === "Search" ? <><p>Search your conversations and workspace content.</p><input className={styles.searchInput} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search workspace..." autoFocus /></> : <><p>{activeView === "Settings" ? "Configure your providers and workspace preferences." : `Your ${activeView.toLowerCase()} workspace is ready for content.`}</p><div className={styles.viewEmpty}><Sparkles size={18} /><strong>{activeView === "Settings" ? "Provider settings" : `No ${activeView.toLowerCase()} yet`}</strong><small>{activeView === "Files" ? "File uploads will be available when storage is configured." : activeView === "Agents" ? "Agent runs require a confirmed task and tools." : activeView === "Projects" ? "Create a project to organize conversations and files." : "Connect a provider to manage its settings."}</small></div></>}</section>}
            {activeView === "New chat" && messages.length > 0 && <div className={styles.messageList}>{messages.map((message, index) => <article className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`} key={`${message.role}-${index}`}><span className={styles.messageRole}>{message.role === "user" ? "You" : "NEXA AI"}</span><p>{message.content || (isGenerating ? "Generating..." : "")}</p></article>)}</div>}
            {activeView === "New chat" && <div className={styles.composerArea}><div className={styles.modeScroller} role="tablist" aria-label="AI modes">{modes.map((mode) => <button key={mode} role="tab" aria-selected={activeMode === mode} className={`${styles.modeTab} ${activeMode === mode ? styles.modeActive : ""}`} onClick={() => setActiveMode(mode)}>{mode}</button>)}</div>{error && <p className={styles.errorMessage} role="alert">{error}</p>}<div className={styles.composer}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Ask anything. Start with an idea..." aria-label="Message NEXA AI" rows={1} /><div className={styles.composerToolbar}><div className={styles.composerTools}><button aria-label="Attach file"><Plus size={18} /></button><button aria-label="Attach image"><ImageIcon size={17} /></button><span className={styles.toolDivider} /><button className={styles.modelPicker}><span className={styles.modelOrb} />Auto <small>Best free model</small><ChevronDown size={14} /></button></div><div className={styles.composerActions}><button className={styles.voiceButton} aria-label="Voice input"><Mic size={17} /></button><button className={`${styles.sendButton} ${prompt ? styles.sendReady : ""}`} onClick={() => void sendMessage()} disabled={isGenerating} aria-label={isGenerating ? "Generating response" : "Send message"}><ArrowUp size={18} /></button></div></div></div><p className={styles.composerHint}><span>Enter</span> to send <i /> <span>Shift + Enter</span> for new line <label><span className={styles.tinyDot} /> Free models only</label></p></div>}
          </div>
        </div>
      </section>
    </main>
  );
}
