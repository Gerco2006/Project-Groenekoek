import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CollapsibleSearchFormProps {
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title?: string;
}

export default function CollapsibleSearchForm({
  children,
  isOpen,
  onToggle,
  title = "Zoekopties",
}: CollapsibleSearchFormProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="backdrop-blur-sm bg-muted/90 dark:bg-muted/70 rounded-b-xl md:rounded-xl border overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-2 md:py-4 h-auto hover-elevate rounded-none"
            data-testid="button-toggle-search"
          >
            <span className="font-semibold text-base md:text-lg">{title}</span>
            {isOpen ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-6 space-y-4">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
