import { ReactNode, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface MasterDetailLayoutProps {
  master: ReactNode;
  detail: ReactNode;
  hasDetail: boolean;
  className?: string;
}

export default function MasterDetailLayout({
  master,
  detail,
  hasDetail,
  className = "",
}: MasterDetailLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {master}
        {detail}
      </div>
    );
  }

  return (
    <div className={`flex flex-row h-full ${className}`}>
      <div className={`flex-shrink-0 transition-all duration-300 ${hasDetail ? "w-[45%]" : "w-full"} overflow-hidden`}>
        {master}
      </div>
      {hasDetail && (
        <div className="flex-1 overflow-hidden">
          {detail}
        </div>
      )}
    </div>
  );
}
