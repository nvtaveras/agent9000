import { StaticImageData } from "next/image";

// Import your chain logos here
// You'll need to add these logo files to your public directory
export const CHAIN_ICONS: Record<number, string> = {
   10: "/chain-icons/optimism.svg", // Optimism
   8453: "/chain-icons/base.svg", // Base
   34443: "/chain-icons/mode.png", // Mode
};

export const CHAIN_NAMES: Record<number, string> = {
   10: "Optimism",
   8453: "Base",
   34443: "Mode",
};
