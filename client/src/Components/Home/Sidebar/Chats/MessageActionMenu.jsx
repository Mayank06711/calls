import { useState, useCallback } from "react";
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { MoreVert } from "@mui/icons-material";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";

const MessageActionMenu = ({ items, iconSize = 18, iconColor }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const colors = useSubscriptionColors();
  const open = Boolean(anchorEl);

  const handleOpen = useCallback((e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback((e) => {
    if (e) e.stopPropagation();
    setAnchorEl(null);
  }, []);

  const handleItemClick = useCallback((e, onClick) => {
    e.stopPropagation();
    setAnchorEl(null);
    onClick();
  }, []);

  const visibleItems = items.filter((item) => item.show !== false);
  if (visibleItems.length === 0) return null;

  return (
    <>
      <IconButton
        size="small"
        onClick={handleOpen}
        sx={{
          color: iconColor || colors.third,
          opacity: 0.7,
          "&:hover": { opacity: 1, bgcolor: "rgba(255,255,255,0.1)" },
          p: "4px",
        }}
      >
        <MoreVert sx={{ fontSize: iconSize }} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        slotProps={{
          paper: {
            sx: {
              bgcolor: "var(--color-dark-primary, #1e1e2e)",
              color: "var(--color-dark-text, #cdd6f4)",
              borderRadius: "12px",
              border: `1px solid ${toRgba(colors.fourth, 0.33)}`,
              minWidth: 160,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {visibleItems.map((item) => (
          <MenuItem
            key={item.label}
            onClick={(e) => handleItemClick(e, item.onClick)}
            sx={{
              fontSize: "0.8rem",
              py: 1,
              "&:hover": { bgcolor: toRgba(colors.third, 0.22) },
            }}
          >
            {item.icon && (
              <ListItemIcon sx={{ color: item.danger ? "#ef4444" : colors.third, minWidth: 32 }}>
                {item.icon}
              </ListItemIcon>
            )}
            <ListItemText
              primary={item.label}
              sx={{ color: item.danger ? "#ef4444" : "inherit" }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default MessageActionMenu;
