import { useEffect, useRef } from "react";

export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  const hasAddedState = useRef(false);
  const onCloseRef = useRef(onClose);
  
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ backButtonSheet: true }, "");
      hasAddedState.current = true;
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (hasAddedState.current && isOpen) {
        event.preventDefault();
        hasAddedState.current = false;
        onCloseRef.current();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && hasAddedState.current) {
      hasAddedState.current = false;
      if (window.history.state?.backButtonSheet) {
        window.history.back();
      }
    }
  }, [isOpen]);
}
