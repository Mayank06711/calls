import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { Close, ContentCopy, Check } from "@mui/icons-material";
import { format } from "date-fns";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";

const MessageDetailsDialog = ({ open, onClose, message, currentUserId, otherUserName }) => {
  const colors = useSubscriptionColors();
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  const isSender = message.senderId === currentUserId;
  const timeLabel = isSender ? "Sent" : "Received";
  const senderName = isSender ? "You" : (otherUserName || message.senderName || "Unknown");

  const rows = [
    { label: "From", value: senderName },
    { label: "Type", value: message.type || "text" },
    { label: timeLabel, value: message.timestamp ? format(new Date(message.timestamp), "dd/MM/yyyy HH:mm:ss") : "—" },
    { label: "Status", value: message.status || "—" },
  ];

  if (message.type === "text" && message.content) {
    rows.push({ label: "Message", value: message.content });
  }

  if (message.fileName) {
    rows.push({ label: "File", value: message.fileName });
  }

  const handleCopy = () => {
    const text = rows.map(({ label, value }) => `${label}: ${value}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "var(--color-dark-primary, #1e1e2e)",
            color: "var(--color-dark-text, #cdd6f4)",
            borderRadius: "16px",
            border: `1px solid ${toRgba(colors.fourth, 0.33)}`,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
          fontSize: "0.95rem",
          fontWeight: 600,
        }}
      >
        Message Details
        <div className="flex items-center gap-1">
          <IconButton onClick={handleCopy} size="small" sx={{ color: colors.third }}>
            {copied ? <Check sx={{ fontSize: 18 }} /> : <ContentCopy sx={{ fontSize: 16 }} />}
          </IconButton>
          <IconButton onClick={onClose} size="small" sx={{ color: colors.third }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <div className="space-y-3">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center text-sm">
              <span className="text-light-text/50 dark:text-dark-text/50">{label}</span>
              <span className="text-light-text dark:text-dark-text font-medium max-w-[60%] text-right break-words">{value}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageDetailsDialog;
