import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, ImageIcon } from "lucide-react";

interface Props {
  url: string;
  type: string | null;
  name: string | null;
}

const MessageAttachment = ({ url, type, name }: Props) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isImage = (type || "").startsWith("image/");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // url is the storage path like "{deal_id}/{user_id}/filename"
      const { data } = await supabase.storage
        .from("deal-attachments")
        .createSignedUrl(url, 60 * 60); // 1 hour
      if (!cancelled && data?.signedUrl) setSignedUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!signedUrl) {
    return (
      <div className="mt-1 text-[10px] opacity-70 italic">Loading attachment…</div>
    );
  }

  if (isImage) {
    return (
      <a href={signedUrl} target="_blank" rel="noreferrer" className="block mt-1">
        <img
          src={signedUrl}
          alt={name || "attachment"}
          className="max-w-[220px] max-h-[220px] rounded-md object-cover border border-border/40"
        />
      </a>
    );
  }

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noreferrer"
      download={name || undefined}
      className="mt-1 inline-flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/40 hover:bg-background/60 border border-border/40 text-xs"
    >
      <FileText className="h-3.5 w-3.5" />
      <span className="truncate max-w-[160px]">{name || "Download file"}</span>
      <Download className="h-3 w-3 opacity-60" />
    </a>
  );
};

export { ImageIcon };
export default MessageAttachment;
