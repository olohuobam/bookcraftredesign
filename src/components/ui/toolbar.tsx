"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
 Bold,
 Italic,
 Link,
 Heading,
 Quote,
 Highlighter,
 AlignLeft,
 AlignCenter,
 AlignRight,
 Palette,
 Underline,
 Strikethrough,
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

const ToolbarButton = ({
 label,
 icon: Icon,
 isActive,
 onClick,
 tooltip,
 showTooltip,
 hideTooltip,
}: {
 label: string;
 icon: React.ComponentType<{ className?: string }>;
 isActive: boolean;
 onClick: () => void;
 tooltip: string | null;
 showTooltip: (label: string) => void;
 hideTooltip: () => void;
}) => (
 <div
 className="relative"
 onMouseEnter={() => showTooltip(label)}
 onMouseLeave={hideTooltip}
 >
 <button
 type="button"
 className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors duration-200 ${
 isActive ? "bg-primary/10" : ""
 } hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`}
 aria-label={label}
 onClick={onClick}
 onFocus={() => showTooltip(label)}
 onBlur={hideTooltip}
 >
 <Icon className="h-4 w-4" />
 </button>
 <AnimatePresence>
 {tooltip === label && (
 <motion.div
 key={label}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 transition={{ duration: 0.2 }}
 className="text-nowrap font-medium absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded-md px-2 py-1 shadow-lg"
 >
 {label}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
);

const Toolbar = () => {
 const { t } = useLanguage();
 const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
 const [activeButtons, setActiveButtons] = useState<string[]>([]);
 const [tooltip, setTooltip] = useState<string | null>(null);

 const toggleActiveButton = (button: string) => {
 setActiveButtons((prev) =>
 prev.includes(button) ? prev.filter((b) => b !== button) : [...prev, button]
 );
 };

 const showTooltip = (label: string) => setTooltip(label);
 const hideTooltip = () => setTooltip(null);

  // TODO: Wire toolbar actions into actual editor content (e.g., via execCommand,
  // textarea selection manipulation, or migration to a rich-text editor like TipTap/Slate).
  // Current state: UI shell with visual active states only (v1 design-first approach).
 return (
 <div className="relative w-full flex items-center justify-center">
 <motion.div
 initial={{ opacity: 0, y: 10, scale: 0.9 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.9 }}
 transition={{ type: "spring", damping: 20, stiffness: 300 }}
 className="z-50 bg-secondary rounded-lg shadow-lg border border-primary/10 flex items-center gap-1 p-1 flex-wrap"
 >
 <ToolbarButton label={t('toolbarBold')} icon={Bold} isActive={activeButtons.includes("bold")} onClick={() => toggleActiveButton("bold")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 <ToolbarButton label={t('toolbarItalic')} icon={Italic} isActive={activeButtons.includes("italic")} onClick={() => toggleActiveButton("italic")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 <ToolbarButton label={t('toolbarUnderline')} icon={Underline} isActive={activeButtons.includes("underline")} onClick={() => toggleActiveButton("underline")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 <ToolbarButton label={t('toolbarStrikethrough')} icon={Strikethrough} isActive={activeButtons.includes("strikethrough")} onClick={() => toggleActiveButton("strikethrough")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 <ToolbarButton label={t('toolbarLink')} icon={Link} isActive={activeButtons.includes("link")} onClick={() => toggleActiveButton("link")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 <ToolbarButton label={t('toolbarHeading')} icon={Heading} isActive={activeButtons.includes("heading")} onClick={() => toggleActiveButton("heading")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 <ToolbarButton label={t('toolbarQuote')} icon={Quote} isActive={activeButtons.includes("quote")} onClick={() => toggleActiveButton("quote")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 <div className="w-px h-8 bg-gray-300"></div>
 <ToolbarButton label={t('toolbarHighlight')} icon={Highlighter} isActive={activeButtons.includes("highlight")} onClick={() => toggleActiveButton("highlight")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 <ToolbarButton label={t('toolbarChangeColor')} icon={Palette} isActive={activeButtons.includes("color")} onClick={() => toggleActiveButton("color")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 <div className="w-px h-8 bg-gray-300"></div>
 <ToolbarButton label={t('toolbarAlignLeft')} icon={AlignLeft} isActive={textAlign === "left"} onClick={() => setTextAlign("left")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 <ToolbarButton label={t('toolbarAlignCenter')} icon={AlignCenter} isActive={textAlign === "center"} onClick={() => setTextAlign("center")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 <ToolbarButton label={t('toolbarAlignRight')} icon={AlignRight} isActive={textAlign === "right"} onClick={() => setTextAlign("right")} tooltip={tooltip} showTooltip={showTooltip} hideTooltip={hideTooltip} />
 </motion.div>
 </div>
 );
};

export { Toolbar };
