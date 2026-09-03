"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUp, Bot, Check, ChevronDown, CircleHelp, FileText, FolderKanban, Image as ImageIcon, Menu, Mic, Paperclip, Plus, Search, Settings, Sparkles, SquarePen, Trash2, X } from "lucide-react";
import styles from "./page.module.css";
import type { ChatMessage, ModelInfo } from "@/types/ai";

const modes = ["General", "Reasoning", "Coding", "Study", "Writing", "Research"];
const navItems = [{ label: "New chat", icon: SquarePen }, { label: "Search", icon: Search, shortcut: "⌘ K" }, { label: "Projects", icon: FolderKanban }, { label: "Files", icon: FileText }, { label: "Agents", icon: Bot }];
type Conversation = { id: string; title: string; messages: ChatMessage[]; mode: string; updatedAt: number };

function createConversation(): Conversation {
  return { id: crypto.randomUUID(), title: "New conversation", messages: [], mode: "General", updatedAt: Date.now() };
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [activeMode, setActiveMode] = useState("General");
  const [prompt, setPrompt] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("New chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [attachment, setAttachment] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem("nexa-conversations");
      const restored = saved ? JSON.parse(saved) as Conversation[] : [];
      const initial = restored.length ? restored : [createConversation()];
      setConversations(initial);
      setActiveConversationId(initial[0].id);
    });
  }, []);

  useEffect(() => {
    if (conversations.length) localStorage.setItem("nexa-conversations", JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    void fetch("/api/models").then((response) => response.ok ? response.json() : null).then((payload: { models?: ModelInfo[] } | null) => {
      const available = payload?.models ?? [];
      setModels(available);
      setSelectedModel(available[0]?.id ?? "");
    }).catch(() => undefined);
  }, []);

  function updateConversation(id: string, update: Partial<Conversation>) {
    setConversations((current) => current.map((conversation) => conversation.id === id ? { ...conversation, ...update, updatedAt: Date.now() } : conversation));
  }

  function openView(view: string) {
    setActiveView(view);
    setSidebarOpen(false);
    if (view === "New chat") {
      const conversation = createConversation();
      setConversations((current) => [conversation, ...current]);
      setActiveConversationId(conversation.id);
      setActiveMode("General");
      setPrompt("");
      setError("");
    }
  }

  function selectConversation(conversation: Conversation) {
    setActiveConversationId(conversation.id);
    setActiveMode(conversation.mode);
    setActiveView("New chat");
    setSidebarOpen(false);
  }

  function clearConversation() {
    if (activeConversationId) updateConversation(activeConversationId, { messages: [], title: "New conversation" });
    setError("");
  }

  function exportConversation() {
    if (!messages.length) return;
    const text = messages.map((message) => `${message.role.toUpperCase()}\n${message.content}`).join("\n\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    link.download = `${activeConversation?.title || "nexa-chat"}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function sendMessage() {
    const content = prompt.trim();
    if (!content || isGenerating) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    updateConversation(activeConversationId, { messages: [...nextMessages, { role: "assistant", content: "" }], title: messages.length ? activeConversation?.title : content.slice(0, 42), mode: activeMode });
    setPrompt("");
    setError("");
    setIsGenerating(true);
    try {
      const response = await fetch("/api/chat/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: nextMessages, mode: activeMode, model: selectedModel || undefined }) });
      if (!response.ok) { const payload = await response.json() as { error?: string }; throw new Error(payload.error ?? "The request could not be completed."); }
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
          if (text) setConversations((current) => current.map((conversation) => conversation.id === activeConversationId ? { ...conversation, messages: conversation.messages.map((message, index) => index === conversation.messages.length - 1 ? { ...message, content: message.content + text } : message) } : conversation));
        }
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The request could not be completed."); setConversations((current) => current.map((conversation) => conversation.id === activeConversationId && !conversation.messages.at(-1)?.content ? { ...conversation, messages: conversation.messages.slice(0, -1) } : conversation)); }
    finally { setIsGenerating(false); }
  }

  return (
    <main className={styles.appShell}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brandRow}><div className={styles.mark}><Sparkles size={16} strokeWidth={2.5} /></div><span className={styles.wordmark}>AI <span>HUB</span></span><button className={styles.iconButtonMobile} onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <button className={styles.newChatButton} onClick={() => openView("New chat")}><Plus size={17} /> New chat <span>⌘ N</span></button>
        <nav className={styles.navList} aria-label="Main navigation">{navItems.slice(1).map(({ label, icon: Icon, shortcut }) => <button className={`${styles.navItem} ${activeView === label ? styles.navItemActive : ""}`} key={label} onClick={() => openView(label)} aria-current={activeView === label ? "page" : undefined}><Icon size={17} /><span>{label}</span>{shortcut && <kbd>{shortcut}</kbd>}</button>)}</nav>
        <div className={styles.recentHeader}><span>Recent chats</span><button onClick={() => setSearchQuery("")} aria-label="Clear chat filter"><Search size={13} /></button></div>
        <div className={styles.recentList}>{conversations.filter((conversation) => conversation.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8).map((conversation) => <button className={`${styles.recentItem} ${conversation.id === activeConversationId && activeView === "New chat" ? styles.recentActive : ""}`} key={conversation.id} onClick={() => selectConversation(conversation)} title={conversation.title}>{conversation.title}</button>)}</div>
        <div className={styles.sidebarBottom}><button className={`${styles.navItem} ${activeView === "Settings" ? styles.navItemActive : ""}`} onClick={() => openView("Settings")} aria-current={activeView === "Settings" ? "page" : undefined}><Settings size={17} /><span>Settings</span></button></div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}><button className={styles.menuButton} onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className={styles.breadcrumb}><span>Workspace</span><b>/</b><span>{activeView}</span></div><div className={styles.topbarActions}><button className={styles.topIcon} onClick={exportConversation} disabled={!messages.length} aria-label="Export conversation"><ArrowDownToLine size={17} /></button><button className={styles.topIcon} aria-label="Help"><CircleHelp size={18} /></button></div></header>
        <div className={styles.chatLayout}>
          <div className={styles.chatColumn}>
            {activeView !== "New chat" && <section className={styles.viewPanel} aria-labelledby="view-title"><p className={styles.viewEyebrow}>NEXA workspace</p><h1 id="view-title">{activeView === "Search" ? "Search everything" : activeView}</h1>{activeView === "Search" ? <><p>Find a conversation by title, then jump right back in.</p><input className={styles.searchInput} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search conversations..." autoFocus /></> : <><p>{activeView === "Settings" ? "Configure providers and workspace preferences." : `Your ${activeView.toLowerCase()} workspace is ready for content.`}</p><div className={styles.viewEmpty}><Check size={18} /><strong>{activeView === "Settings" ? "Provider settings" : `${activeView} are ready`}</strong><small>{activeView === "Files" ? "Attach documents directly from the composer to keep context close." : activeView === "Agents" ? "Agent runs will require a confirmed task and tools." : activeView === "Projects" ? "Create a project to organize conversations and files." : `${models.length} free models are currently discoverable.`}</small></div></>}</section>}
            {activeView === "New chat" && messages.length > 0 && <div className={styles.messageList}>{messages.map((message, index) => <article className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`} key={`${message.role}-${index}`}><span className={styles.messageRole}>{message.role === "user" ? "You" : "NEXA AI"}</span><p>{message.content || (isGenerating ? "Generating..." : "")}</p></article>)}</div>}
            {activeView === "New chat" && <div className={styles.composerArea}><div className={styles.modeScroller} role="tablist" aria-label="AI modes">{modes.map((mode) => <button key={mode} role="tab" aria-selected={activeMode === mode} className={`${styles.modeTab} ${activeMode === mode ? styles.modeActive : ""}`} onClick={() => setActiveMode(mode)}>{mode}</button>)}</div>{error && <p className={styles.errorMessage} role="alert">{error}</p>}{attachment && <div className={styles.attachment}><Paperclip size={13} /> {attachment}<button onClick={() => setAttachment("")} aria-label="Remove attachment"><X size={13} /></button></div>}<div className={styles.composer}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Ask anything. Start with an idea..." aria-label="Message NEXA AI" rows={1} /><div className={styles.composerToolbar}><div className={styles.composerTools}><input ref={fileInput} type="file" hidden onChange={(event) => setAttachment(event.target.files?.[0]?.name ?? "")} /><button onClick={() => fileInput.current?.click()} aria-label="Attach file"><Plus size={18} /></button><button aria-label="Attach image" onClick={() => fileInput.current?.click()}><ImageIcon size={17} /></button><span className={styles.toolDivider} /><label className={styles.modelPicker}><span className={styles.modelOrb} /><select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} aria-label="Select model"><option value="">Auto</option>{models.map((model) => <option value={model.id} key={model.id}>{model.name}</option>)}</select><small>{models.length ? "Free models" : "Best available"}</small><ChevronDown size={14} /></label></div><div className={styles.composerActions}><button className={styles.voiceButton} aria-label="Voice input"><Mic size={17} /></button><button className={`${styles.sendButton} ${prompt ? styles.sendReady : ""}`} onClick={() => void sendMessage()} disabled={isGenerating} aria-label={isGenerating ? "Generating response" : "Send message"}><ArrowUp size={18} /></button></div></div></div><div className={styles.composerFooter}><p className={styles.composerHint}><span>Enter</span> to send <i /> <span>Shift + Enter</span> for new line</p>{messages.length > 0 && <button className={styles.clearButton} onClick={clearConversation}><Trash2 size={12} /> Clear chat</button>}</div></div>}
          </div>
        </div>
      </section>
    </main>
  );
}
