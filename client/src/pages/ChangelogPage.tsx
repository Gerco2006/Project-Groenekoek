import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText } from "lucide-react";
import PageContainer from "@/components/PageContainer";

interface ChangelogEntry {
  name: string;
  type: "grote-update" | "kleine-update";
  content: string;
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^#{3}\s+(.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^#{1}\s+(.+)$/gm, '<h1 class="text-xl font-bold mt-0 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>)(\n<li)/g, '$1$2')
    .replace(/(<li[^>]*>[\s\S]*?<\/li>)+/g, (match) => `<ul class="space-y-1 my-2">${match}</ul>`)
    .replace(/\n{2,}/g, '</p><p class="mb-3">')
    .replace(/^(?!<[hul])(.+)$/gm, (line) => line.trim() ? line : '')
    .replace(/^<\/p><p class="mb-3">(<[hul])/, '$1');
}

export default function ChangelogPage() {
  const [filter, setFilter] = useState<"alle" | "grote-update" | "kleine-update">("alle");

  const { data: entries = [], isLoading, error } = useQuery<ChangelogEntry[]>({
    queryKey: ["/api/changelog"],
  });

  const filtered = filter === "alle"
    ? entries
    : entries.filter((e) => e.type === filter);

  return (
    <PageContainer>
      <div className="min-h-screen bg-background md:px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Changelog</h1>
          <p className="text-muted-foreground">Overzicht van alle updates en wijzigingen</p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="alle" data-testid="tab-alle">Alle</TabsTrigger>
            <TabsTrigger value="grote-update" data-testid="tab-grote">Grote updates</TabsTrigger>
            <TabsTrigger value="kleine-update" data-testid="tab-kleine">Kleine updates</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive py-8 text-center">
            Kon changelogs niet laden
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FileText className="w-10 h-10" />
            <p className="text-sm">Geen changelogs gevonden</p>
          </div>
        )}

        <div className="space-y-6">
          {filtered.map((entry) => (
            <div
              key={`${entry.type}-${entry.name}`}
              data-testid={`changelog-${entry.name}`}
              className="border rounded-md overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b">
                <span className="font-semibold text-sm">{entry.name}</span>
                <Badge
                  variant={entry.type === "grote-update" ? "default" : "secondary"}
                  data-testid={`badge-type-${entry.name}`}
                >
                  {entry.type === "grote-update" ? "Grote update" : "Kleine update"}
                </Badge>
              </div>
              <div
                className="px-4 py-4 text-sm text-foreground leading-relaxed prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.content) }}
              />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
