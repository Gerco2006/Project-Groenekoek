import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Trash2, Edit2, Check, X } from "lucide-react";
import { localStorageUtils } from "@/lib/localStorage";
import { SavedRoute, WidgetProps } from "@/types/widgets";
import { Input } from "@/components/ui/input";

export default function SavedRoutesWidget({ onAction }: WidgetProps) {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState("");

  const loadRoutes = () => {
    setRoutes(localStorageUtils.getSavedRoutes());
  };

  useEffect(() => {
    loadRoutes();
    
    const handleStorageChange = () => {
      loadRoutes();
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("savedRoutesChanged", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("savedRoutesChanged", handleStorageChange);
    };
  }, []);

  const handleDelete = (routeId: string) => {
    localStorageUtils.deleteRoute(routeId);
    loadRoutes();
    window.dispatchEvent(new Event("savedRoutesChanged"));
  };

  const handleRouteClick = (route: SavedRoute) => {
    onAction?.("selectRoute", route);
  };

  const startEdit = (route: SavedRoute) => {
    setEditingId(route.id);
    setEditNickname(route.nickname || "");
  };

  const saveEdit = (routeId: string) => {
    localStorageUtils.updateRoute(routeId, { nickname: editNickname.trim() || undefined });
    setEditingId(null);
    setEditNickname("");
    loadRoutes();
    window.dispatchEvent(new Event("savedRoutesChanged"));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNickname("");
  };

  if (routes.length === 0) {
    return null;
  }

  return (
    <Card data-testid="widget-saved-routes">
      <CardHeader>
        <CardTitle>Opgeslagen Routes</CardTitle>
        <CardDescription>Klik op een route om deze te gebruiken</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {routes.map((route) => (
          <Card
            key={route.id}
            className="hover-elevate cursor-pointer transition-all"
            data-testid={`saved-route-${route.id}`}
          >
            <CardContent className="p-4">
              {editingId === route.id ? (
                <div className="space-y-3">
                  <Input
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    placeholder="Geef een naam (optioneel)"
                    autoFocus
                    data-testid={`input-edit-nickname-${route.id}`}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEdit(route.id)}
                      data-testid={`button-save-nickname-${route.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Opslaan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEdit}
                      data-testid={`button-cancel-nickname-${route.id}`}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : (
                <div onClick={() => handleRouteClick(route)}>
                  {route.nickname && (
                    <div className="font-semibold mb-2 text-base" data-testid={`text-route-nickname-${route.id}`}>
                      {route.nickname}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium" data-testid={`text-route-from-${route.id}`}>{route.from}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium" data-testid={`text-route-to-${route.id}`}>{route.to}</span>
                  </div>
                  {route.viaStations.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" data-testid={`badge-via-stations-${route.id}`}>
                        Via: {route.viaStations.join(", ")}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(route);
                      }}
                      data-testid={`button-edit-route-${route.id}`}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Naam wijzigen
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(route.id);
                      }}
                      data-testid={`button-delete-route-${route.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Verwijderen
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
