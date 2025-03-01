import { FC } from "react";
import Image from "next/image";
import { CHAIN_ICONS, CHAIN_NAMES } from "@/config/chain-icons";

interface ChainIconProps {
   chainId: number;
   className?: string;
}

export const ChainIcon: FC<ChainIconProps> = ({
   chainId,
   className = "h-5 w-5",
}) => {
   const iconPath = CHAIN_ICONS[chainId];
   const chainName = CHAIN_NAMES[chainId];

   if (!iconPath) {
      // Fallback to the letter-based icon if no image is found
      return (
         <div
            className={`border border-primary/50 flex items-center justify-center ${className}`}
         >
            <span className="text-primary text-xs">
               {chainName?.[0] || "?"}
            </span>
         </div>
      );
   }

   return (
      <div className={`relative ${className}`}>
         <Image
            src={iconPath}
            alt={`${chainName} logo`}
            fill
            className="object-contain"
         />
      </div>
   );
};
