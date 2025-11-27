import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'travnl-pwa-install-dismissed';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') {
      return;
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if on iOS (has different install flow)
    const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iosDevice);
    
    // Check if mobile
    const isMobile = window.innerWidth < 768;
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show dialog when we get the prompt (Android/Chrome)
      if (isMobile) {
        setTimeout(() => {
          setShowDialog(true);
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For mobile devices, show dialog after delay
    // On iOS this shows instructions, on Android it waits for beforeinstallprompt
    if (isMobile) {
      setTimeout(() => {
        setShowDialog(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    }
    setShowDialog(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowDialog(false);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md mx-4" data-testid="dialog-pwa-install">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            TravNL installeren
          </DialogTitle>
          <DialogDescription className="text-left">
            Voeg TravNL toe aan je startscherm voor snelle toegang tot reisinfo, 
            vertrektijden en live treinposities.
          </DialogDescription>
        </DialogHeader>
        
        {isIOS ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Om TravNL te installeren op je iPhone of iPad:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li className="flex items-start gap-1">
                <span>1.</span>
                <span>Tik op het <Share className="inline w-4 h-4 mx-1" /> Deel-icoon onderaan</span>
              </li>
              <li className="flex items-start gap-1">
                <span>2.</span>
                <span>Scroll en tik op <span className="font-medium">"Zet op beginscherm"</span></span>
              </li>
              <li className="flex items-start gap-1">
                <span>3.</span>
                <span>Tik op <span className="font-medium">"Voeg toe"</span></span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {deferredPrompt ? (
              <p>Klik op de knop hieronder om TravNL te installeren als app.</p>
            ) : (
              <p>Gebruik het menu van je browser om deze site toe te voegen aan je startscherm.</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-4">
          {!isIOS && deferredPrompt && (
            <Button 
              onClick={handleInstall} 
              className="w-full"
              data-testid="button-pwa-install"
            >
              <Download className="w-4 h-4 mr-2" />
              Installeren
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleDismiss}
            className="w-full"
            data-testid="button-pwa-dismiss"
          >
            <X className="w-4 h-4 mr-2" />
            Niet meer tonen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
