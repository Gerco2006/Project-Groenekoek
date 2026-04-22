import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ChevronLeft, Mail, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import PageContainer from "@/components/PageContainer";
import ReactMarkdown, { type Components } from "react-markdown";

interface LegalDoc {
  doc: string;
  content: string;
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-xl font-bold mt-0 mb-3">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold mt-5 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-1">{children}</h3>,
  p: ({ children }) => <p className="mb-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 my-2">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-4 border-border" />,
};

function DocContent({ queryKey }: { queryKey: string }) {
  const { data, isLoading, error } = useQuery<LegalDoc>({
    queryKey: [queryKey],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-destructive py-8 text-center">
        Kon document niet laden
      </div>
    );
  }

  return (
    <div className="text-sm text-foreground leading-relaxed">
      <ReactMarkdown components={markdownComponents}>{data.content}</ReactMarkdown>
    </div>
  );
}

export default function LegalPage() {
  const [tab, setTab] = useState<"privacy" | "voorwaarden">("privacy");

  return (
    <PageContainer>
      <div className="min-h-screen bg-background md:px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/meer">
            <Button variant="ghost" size="icon" data-testid="button-back-meer">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-1">Juridisch & Support</h1>
            <p className="text-muted-foreground">Privacybeleid, voorwaarden en contactinformatie</p>
          </div>
        </div>

        <Card data-testid="card-support">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Neem contact op</CardTitle>
                <CardDescription>Vragen, feedback of een probleem melden</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <a
              href="mailto:info@travnl.nl"
              data-testid="link-support-email"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Mail className="w-4 h-4" />
              info@travnl.nl
            </a>
          </CardContent>
        </Card>

        <div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="privacy" data-testid="tab-privacy">
                Privacy
              </TabsTrigger>
              <TabsTrigger value="voorwaarden" data-testid="tab-voorwaarden">
                Voorwaarden
              </TabsTrigger>
            </TabsList>

            <TabsContent value="privacy">
              <Card data-testid="card-privacy">
                <CardContent className="pt-6">
                  <DocContent queryKey="/api/legal/privacy" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voorwaarden">
              <Card data-testid="card-voorwaarden">
                <CardContent className="pt-6">
                  <DocContent queryKey="/api/legal/voorwaarden" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageContainer>
  );
}
