import { createElement, useEffect } from "react";

const SCRIPT_ID = "elevenlabs-convai-widget";
const AGENT_ID = "agent_4801kxc51684eec90qve8h7hvhe4";

export function VoiceAgent() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    script.type = "text/javascript";
    document.body.appendChild(script);
  }, []);

  return createElement("elevenlabs-convai", {
    "agent-id": AGENT_ID,
    "avatar-image-url": "https://fulltime-pa.lovable.app/logo-fulltime.png",
    "avatar-orb-color-1": "#D0F854",
    "avatar-orb-color-2": "#0c1a14",
    "action-text": "¿Dudas? Pregúntale a FullTime",
    "start-call-text": "Hablar con FullTime",
    "end-call-text": "Terminar",
    "expand-text": "Escríbenos",
    "listening-text": "Te escucho, Profe…",
    "speaking-text": "FullTime está hablando…",
    "variant": "expandable",
  });
}
