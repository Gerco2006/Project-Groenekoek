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
      <div className={`backdrop-blur-sm rounded-b-xl md:rounded-xl border overflow-hidden ${
        isOpen ? 'bg-card/80' : 'bg-muted/90 dark:bg-muted/70'
      }`}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-2 md:py-4 h-auto hover-elevate rounded-none"
            data-testid="button-toggle-search"
          >
            <span className="font-semibold text-base md:text-lg">{title}</span>
            <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              isOpen 
                ? 'bg-muted text-muted-foreground' 
                : 'bg-blue-500/15 text-blue-600 dark:bg-blue-400/20 dark:text-blue-400'
            }`}>
              {isOpen ? 'Inklappen' : 'Uitklappen'}
              {isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
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
