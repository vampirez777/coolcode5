import { useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import MessageAttachment from "@/components/deals/MessageAttachment";
import { IMAGE_ACCEPT_ATTR } from "@/lib/uploadDealAttachment";

const SYSTEM_MSG_PREFIXES = ["✅", "📦", "🎉", "↩️", "🚫", "⚠️", "🔒"];
const isSystemMessage = (msg: any) =>
  !msg.attachment_url && typeof msg.message === "string" && SYSTEM_MSG_PREFIXES.some((p) => msg.message.startsWith(p));

const stripPrefix = (s: string) => {
  for (const p of SYSTEM_MSG_PREFIXES) {
    if (s.startsWith(p)) return s.slice(p.length).trim();
  }
  return s;
};

const fmtTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
};

const fmtTitle = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], { dateStyle: "long", timeStyle: "short" });
  } catch {
    return "";
  }
};

const sameDay = (a: string, b: string) => {
  try {
    const d1 = new Date(a), d2 = new Date(b);
    return d1.toDateString() === d2.toDateString();
  } catch {
    return false;
  }
};

const dayLabel = (iso: string) => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const yest = new Date(); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yest.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  } catch {
    return "";
  }
};

// Map a raw system message to a short label like "Deal Created"
const systemLabel = (msg: any, dealCreatedAt?: string): string => {
  const text: string = msg.message || "";
  if (text.includes("Roles confirmed")) return "Roles Confirmed";
  if (text.includes("Deposit verified")) return "Deposit Verified";
  if (text.includes("Buyer confirmed receipt")) return "Item Received";
  if (text.includes("Funds released")) return "Funds Released";
  if (text.includes("refunded")) return "Refunded";
  if (text.includes("cancelled") || text.includes("Cancel")) return "Cancelled";
  if (text.includes("dispute")) return "Dispute Opened";
  if (text.includes("Payout placed on security hold")) return "Payout On Hold";
  if (text.includes("Security hold released")) return "Hold Released";
  if (text.includes("Deal fee")) return "Fee Updated";
  if (text.includes("requested to cancel")) return "Cancellation Requested";
  return stripPrefix(text);
};

interface DealChatPanelProps {
  messages: any[];
  userId: string;
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingFile: boolean;
  typingUsers: string[];
  getUsername: (uid: string) => string;
  onBack?: () => void;
  title?: string;
  dealCreatedAt?: string;
  scrollRef?: React.RefObject<HTMLDivElement>;
  height?: string; // e.g. "h-96"
  getAvatarUrl?: (uid: string) => string | null;
  getRoleSuffix?: (uid: string) => string | null;
}

const DealChatPanel = ({
  messages,
  userId,
  chatInput,
  setChatInput,
  onSend,
  onPaste,
  onChange,
  onFileSelected,
  uploadingFile,
  typingUsers,
  getUsername,
  onBack,
  title = "Live Chat",
  dealCreatedAt,
  scrollRef,
  height = "h-[28rem]",
  getAvatarUrl,
  getRoleSuffix,
}: DealChatPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build a virtual "Deal Created" event from dealCreatedAt and merge with messages.
  // Then group by date to insert "Today" separators.
  const items: Array<
    | { kind: "date"; key: string; label: string }
    | { kind: "system"; key: string; label: string; at: string }
    | { kind: "msg"; key: string; msg: any }
  > = [];

  const all: Array<{ at: string; node: any; isVirtualCreate?: boolean }> = [];
  if (dealCreatedAt) {
    all.push({ at: dealCreatedAt, node: { id: "__created", message: "Deal Created", created_at: dealCreatedAt }, isVirtualCreate: true });
  }
  for (const m of messages) all.push({ at: m.created_at, node: m });
  all.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  let lastDay: string | null = null;
  for (const entry of all) {
    if (!lastDay || !sameDay(lastDay, entry.at)) {
      items.push({ kind: "date", key: `d-${entry.at}`, label: dayLabel(entry.at) });
      lastDay = entry.at;
    }
    if (entry.isVirtualCreate) {
      items.push({ kind: "system", key: "__created", label: "Deal Created", at: entry.at });
    } else if (isSystemMessage(entry.node)) {
      items.push({ kind: "system", key: entry.node.id, label: systemLabel(entry.node), at: entry.at });
    } else {
      items.push({ kind: "msg", key: entry.node.id, msg: entry.node });
    }
  }

  // Group consecutive message items from the same sender into a single
  // dash-chat-group block so bubbles stack with one shared sender meta row,
  // matching the reference layout.
  type Block =
    | { kind: "date"; key: string; label: string }
    | { kind: "system"; key: string; label: string; at: string; green?: boolean }
    | { kind: "group"; key: string; senderId: string; mine: boolean; msgs: any[] };

  const blocks: Block[] = [];
  for (const it of items) {
    if (it.kind === "date") {
      blocks.push({ kind: "date", key: it.key, label: it.label });
    } else if (it.kind === "system") {
      blocks.push({ kind: "system", key: it.key, label: it.label, at: it.at });
    } else {
      const last = blocks[blocks.length - 1];
      const mine = it.msg.sender_id === userId;
      if (last && last.kind === "group" && last.senderId === it.msg.sender_id) {
        last.msgs.push(it.msg);
      } else {
        blocks.push({ kind: "group", key: it.key, senderId: it.msg.sender_id, mine, msgs: [it.msg] });
      }
    }
  }

  return (
    <div className={`dash-chat-panel ${height}`}>
      {/* Header */}
      <div className="dash-chat-panel__header-border dash-chat-header-strip">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="dash-chat-close-btn"
          >
            <img width="11" height="11" alt="" className="shrink-0" src="/dash-source/image/chat_back_chevron_11.svg" />
          </button>
        )}
        <span className="dash-chat-title dash-chat-title--center">{title}</span>
      </div>

      {/* Scroll area */}
      <div ref={scrollRef} className="dash-chat-scroll">
        {blocks.length === 0 && (
          <p className="dash-chat-muted-sm" style={{ textAlign: "center", padding: "1.5rem 0" }}>No messages yet</p>
        )}
        {blocks.map((b) => {
          if (b.kind === "date") {
            return (
              <div key={b.key} className="dash-chat-date-separator" aria-label={b.label}>
                <span className="dash-chat-date-separator__label">{b.label}</span>
              </div>
            );
          }
          if (b.kind === "system") {
            return (
              <div key={b.key} className="dash-chat-system-wrap">
                <p className={`dash-chat-system-line${b.green ? " dash-chat-system-line--green" : ""}`}>
                  <span>{b.label}</span>
                  <span className="dash-chat-system-time" title={fmtTitle(b.at)}> · {fmtTime(b.at)}</span>
                </p>
              </div>
            );
          }
          const mine = b.mine;
          const last = b.msgs[b.msgs.length - 1];
          const senderName = mine ? "Me" : getUsername(b.senderId);
          const roleSuffix = getRoleSuffix ? getRoleSuffix(b.senderId) : null;
          const avatarUrl = !mine && getAvatarUrl ? getAvatarUrl(b.senderId) : null;
          return (
            <div key={b.key} className={`dash-chat-group ${mine ? "dash-chat-group--me" : "dash-chat-group--them"}`}>
              <div className="dash-chat__stack">
                {b.msgs.map((msg: any, idx: number) => (
                  <div key={msg.id || idx} className={`dash-chat-bubble-row ${mine ? "dash-chat-bubble-row--me" : ""}`}>
                    <div className={`chat-bubble ${mine ? "chat-bubble--me" : "chat-bubble--other"}`}>
                      {msg.message && (
                        <p className="min-w-0 whitespace-pre-wrap break-words">{msg.message}</p>
                      )}
                      {msg.attachment_url && (
                        <MessageAttachment url={msg.attachment_url} type={msg.attachment_type} name={msg.attachment_name} />
                      )}
                    </div>
                    {idx === b.msgs.length - 1 && (
                      <span className="chat-time" title={fmtTitle(msg.created_at)}>{fmtTime(msg.created_at)}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className={`dash-chat__meta-row ${mine ? "dash-chat-meta-row--me" : ""}`}>
                <div className="dash-chat-avatar-ring" aria-hidden="true">
                  {avatarUrl && <img alt="" loading="lazy" className="dash-chat-avatar-img" src={avatarUrl} />}
                </div>
                <span className="chat-sender-name">
                  {mine ? "Me" : senderName}{roleSuffix ? ` (${roleSuffix})` : ""}
                </span>
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <p className="dash-chat-muted-sm" style={{ fontStyle: "italic", padding: "0 .5rem", opacity: 0.7 }}>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </p>
        )}
      </div>

      {/* Composer */}
      <div className="dash-chat-input-bar dash-chat-input-bar--bordered">
        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} accept={IMAGE_ACCEPT_ATTR} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFile}
          aria-label="Upload"
          className="dash-chat-send-btn"
          style={{ background: "transparent" }}
        >
          {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </button>
        <input
          value={chatInput}
          onChange={onChange ?? ((e) => setChatInput(e.target.value))}
          onPaste={onPaste}
          placeholder="Type a message..."
          className="dash-chat-input-field dash-chat-input-field--high-contrast"
          onKeyDown={(e) => e.key === "Enter" && onSend()}
        />
        <button
          type="button"
          onClick={onSend}
          aria-label="Send"
          className="dash-chat-send-btn"
        >
          <img width="28" height="28" alt="" src="/dash-source/image/chat_send_28.svg" />
        </button>
      </div>
    </div>
  );
};

export default DealChatPanel;