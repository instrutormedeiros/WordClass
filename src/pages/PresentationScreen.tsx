import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Cloud, Loader2, Menu, MousePointer2, QrCode, Volume2, Users, X } from "lucide-react";
import { SlideVisual, SLIDE_LABELS, totalResponses } from "../components/SlideVisual";
import { socket } from "../socket";
import type { Presentation as PresentationType, Slide } from "../types";

type ScreenEffect = "confetti" | "applause" | "drumroll" | "cheer";

export default function PresentationScreen() {
  const { code } = useParams();
  const navigate = useNavigate();
  const presenterKey = code ? localStorage.getItem(`wordclass:presenter:${code}`) || "" : "";
  const [presentation, setPresentation] = useState<PresentationType | null>(null);
  const [showJoinPanel, setShowJoinPanel] = useState(false);
  const [activeEffect, setActiveEffect] = useState<{ effect: ScreenEffect; id: string } | null>(null);
  const [soundReady, setSoundReady] = useState(false);
  const lastEffectIdRef = useRef("");

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }

    socket.emit("screen_join", { code }, (response: any) => {
      if (response.success) setPresentation(response.presentation);
      else navigate("/");
    });

    const showEffect = (effect: ScreenEffect, id: string) => {
      if (lastEffectIdRef.current === id) return;
      lastEffectIdRef.current = id;
      setActiveEffect({ effect, id });
      try {
        playEffectSound(effect);
      } catch {
        // Browsers can block audio before the presenter enables sound; the visual effect should still run.
      }
      window.setTimeout(() => setActiveEffect((current) => (current?.id === id ? null : current)), 2400);
    };
    const replaceSlide = (slide: Slide) => setPresentation((prev) => (prev ? { ...prev, slides: prev.slides.map((item) => (item.id === slide.id ? slide : item)) } : prev));
    const onSlideUpdated = ({ slide, effect, effectId }: { slide: Slide; effect?: ScreenEffect; effectId?: string }) => {
      replaceSlide(slide);
      if (effect && effectId) showEffect(effect, effectId);
    };
    const onSlideChanged = ({ index, presentation: updatedPresentation }: { index: number; presentation?: PresentationType }) => {
      setPresentation((prev) => (updatedPresentation ? updatedPresentation : prev ? { ...prev, currentSlideIndex: index } : null));
    };
    const onEffectTriggered = ({ effect, id }: { effect: ScreenEffect; id: string }) => showEffect(effect, id);

    socket.on("slide_updated", onSlideUpdated);
    socket.on("slide_changed", onSlideChanged);
    socket.on("presentation_updated", ({ presentation: updatedPresentation }: { presentation: PresentationType }) => setPresentation(updatedPresentation));
    socket.on("word_added", ({ slideId, words }: { slideId: string; words: Record<string, number> }) => {
      setPresentation((prev) => (prev ? { ...prev, slides: prev.slides.map((slide) => (slide.id === slideId ? { ...slide, words } : slide)) } : prev));
    });
    socket.on("word_removed", ({ slideId, words }: { slideId: string; words: Record<string, number> }) => {
      setPresentation((prev) => (prev ? { ...prev, slides: prev.slides.map((slide) => (slide.id === slideId ? { ...slide, words } : slide)) } : prev));
    });
    socket.on("words_cleared", ({ slideId }: { slideId: string }) => {
      setPresentation((prev) => (prev ? { ...prev, slides: prev.slides.map((slide) => (slide.id === slideId ? { ...slide, words: {}, votes: {}, responses: [], ratings: {} } : slide)) } : prev));
    });
    socket.on("participant_count", ({ count }: { count: number }) => setPresentation((prev) => (prev ? { ...prev, participantsCount: count } : prev)));
    socket.on("effect_triggered", onEffectTriggered);

    return () => {
      socket.off("slide_updated", onSlideUpdated);
      socket.off("slide_changed", onSlideChanged);
      socket.off("presentation_updated");
      socket.off("word_added");
      socket.off("word_removed");
      socket.off("words_cleared");
      socket.off("participant_count");
      socket.off("effect_triggered", onEffectTriggered);
    };
  }, [code, navigate]);

  const currentSlide = presentation?.slides[presentation.currentSlideIndex];
  const joinUrl = `${window.location.origin}/join/${code}`;
  const canControlScreen = Boolean(presenterKey);
  const removeWord = (word: string) => {
    if (!canControlScreen || !currentSlide) return;
    socket.emit("remove_word", { code, presenterKey, slideId: currentSlide.id, word });
  };
  const triggerEffect = (effect: ScreenEffect) => {
    if (!canControlScreen) return;
    socket.emit("trigger_effect", { code, presenterKey, effect });
  };

  useEffect(() => {
    if (!canControlScreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "c") triggerEffect("confetti");
      if (event.key.toLowerCase() === "a") triggerEffect("applause");
      if (event.key.toLowerCase() === "d") triggerEffect("drumroll");
      if (event.key.toLowerCase() === "s") triggerEffect("cheer");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canControlScreen, code, presenterKey]);

  if (!presentation || !currentSlide) {
    return <div className="grid min-h-screen place-items-center bg-[#06152b]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-black p-5 text-[#2f3037]">
      <div className="relative flex h-[calc(100vh-40px)] overflow-hidden rounded-lg bg-white shadow-2xl">
        {showJoinPanel && (
          <aside className="z-20 flex w-[26rem] shrink-0 flex-col items-center bg-[#424a5d] px-8 py-8 text-white">
            <button onClick={() => setShowJoinPanel(false)} className="mb-16 ml-auto grid h-12 w-12 place-items-center rounded-full bg-black/20 text-white hover:bg-black/30" title="Fechar QR code" aria-label="Fechar QR code">
              <X className="h-7 w-7" />
            </button>
            <div className="rounded-2xl bg-white p-4">
              <QRCode value={joinUrl} size={286} />
            </div>
            <div className="mt-20 text-center">
              <p className="text-4xl font-black">Entrar em:</p>
              <p className="mt-5 break-all text-4xl font-semibold leading-tight">{joinUrl.replace(/^https?:\/\//, "")}</p>
              <p className="mt-6 text-5xl font-black tracking-wide">{code}</p>
            </div>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="grid h-[74px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 bg-[#f7f7f8] px-4 md:grid-cols-[1fr_minmax(0,auto)_1fr] md:px-8">
            <div className="flex items-center gap-4 text-slate-300">
              <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-200/60" title="Menu">
                <Menu className="h-5 w-5" />
              </button>
            </div>

            <button onClick={() => setShowJoinPanel((value) => !value)} className="flex min-w-0 items-center justify-center gap-2 text-base font-medium tracking-tight text-[#303038] hover:text-[#5d2cb6] sm:text-xl lg:gap-3 lg:text-3xl" title="Mostrar QR code" aria-label="Mostrar QR code">
              <span className="hidden truncate sm:inline">Para participar, acesse:</span>
              <span className="font-black">{joinUrl.replace(/^https?:\/\//, "")}</span>
              {showJoinPanel ? <X className="h-5 w-5 shrink-0 lg:h-7 lg:w-7" /> : <QrCode className="h-5 w-5 shrink-0 lg:h-7 lg:w-7" />}
            </button>

            <div className="hidden items-center justify-end gap-3 md:flex">
              <div className="grid h-11 w-11 place-items-center rounded-xl text-[#5d2cb6]">
                <Cloud className="h-7 w-7" />
              </div>
              <span className="hidden text-3xl font-black tracking-tight lg:inline">WordClass</span>
            </div>
          </header>

          <div className="sr-only">
            <p>{presentation.title}</p>
            <p>{SLIDE_LABELS[currentSlide.type]}</p>
          </div>

          <main className="relative min-h-0 flex-1 bg-white px-4 pb-28 pt-8 md:px-12 md:pb-20 md:pt-10">
            {currentSlide.type === "wordcloud" ? (
              <div className="mb-3">
                <span className="mb-2 inline-flex items-center gap-2 text-xs font-black text-[#16796e]">
                  <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                  Nuvem de palavras
                </span>
                <h1 className="max-w-6xl text-2xl font-black leading-tight tracking-tight text-[#111936] md:text-3xl">{currentSlide.question}</h1>
              </div>
            ) : (
              <div className="mb-6">
                <span className="mb-3 inline-block rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-black uppercase tracking-widest text-[#5d2cb6]">{SLIDE_LABELS[currentSlide.type]}</span>
                <h1 className="max-w-6xl text-5xl font-black leading-tight tracking-tight">{currentSlide.question}</h1>
              </div>
            )}

            <div className={`${currentSlide.type === "wordcloud" ? "h-[calc(100%-5.5rem)]" : "h-[calc(100%-8rem)]"} mx-auto max-w-7xl`}>
              <SlideVisual slide={currentSlide} large wordCloudVariant="clustered" onWordClick={currentSlide.type === "wordcloud" && canControlScreen ? removeWord : undefined} />
            </div>

            <div className="absolute bottom-6 left-4 right-4 flex flex-wrap items-center justify-between gap-3 text-[#303038] md:left-8 md:right-8">
              <div className="flex items-center gap-5">
                <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100" title="Menu">
                  <Menu className="h-5 w-5" />
                </button>
                <span className="rounded-lg bg-slate-100 px-4 py-2 text-xl font-black">{presentation.currentSlideIndex + 1}</span>
                <MousePointer2 className="h-5 w-5 text-[#5d2cb6]" />
              </div>

              {currentSlide.type === "wordcloud" && (
                <button className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-black shadow-sm md:px-6 md:text-xl">
                  Agrupar em temas
                </button>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 text-base font-black md:gap-5 md:text-xl">
                <button
                  onClick={() => {
                    unlockEffectAudio();
                    setSoundReady(true);
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base ${soundReady ? "bg-[#e7fff5] text-[#16796e]" : "bg-slate-100 text-[#303038]"}`}
                  title="Ativar som dos efeitos"
                >
                  <Volume2 className="h-5 w-5" />
                  {soundReady ? "Som ativo" : "Ativar som"}
                </button>
                <span className="inline-flex items-center gap-2">
                  <MousePointer2 className="h-5 w-5" />
                  {totalResponses(currentSlide)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {presentation.participantsCount} / 50
                </span>
                <CheckCircle2 className="h-7 w-7 fill-[#63c989] text-white" />
              </div>
            </div>
          </main>
        </div>
        {activeEffect && <EffectOverlay effect={activeEffect.effect} />}
      </div>
    </div>
  );
}

function EffectOverlay({ effect }: { effect: ScreenEffect }) {
  const symbols: Record<ScreenEffect, string[]> = {
    confetti: ["🎉", "✨", "🎊", "⭐", "🎈", "✨", "🎉", "🎊", "⭐", "🎈", "✨", "🎉", "🎊", "⭐"],
    applause: ["👏", "👏", "👏", "🙌", "👏", "👏", "🙌", "👏", "👏", "👏", "👏", "🙌"],
    drumroll: ["🥁", "🥁", "🥁", "⚡", "🥁", "🥁", "⚡", "🥁", "🥁", "⚡"],
    cheer: ["✨", "🌟", "🙌", "🎉", "✨", "🌟", "🙌", "🎉", "✨", "🌟"],
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {symbols[effect].map((symbol, index) => (
        <span
          key={`${symbol}-${index}`}
          className="absolute animate-[effect-fall_2.2s_ease-out_forwards] text-5xl drop-shadow-lg"
          style={{
            left: `${8 + ((index * 17) % 84)}%`,
            top: `${-10 - (index % 5) * 9}%`,
            animationDelay: `${(index % 6) * 0.08}s`,
            transform: `rotate(${index % 2 ? -12 : 12}deg)`,
          }}
        >
          {symbol}
        </span>
      ))}
      <style>{`
        @keyframes effect-fall {
          0% { opacity: 0; transform: translateY(0) scale(.7) rotate(0deg); }
          12% { opacity: 1; }
          72% { opacity: 1; }
          100% { opacity: 0; transform: translateY(100vh) scale(1.12) rotate(220deg); }
        }
      `}</style>
    </div>
  );
}

function playEffectSound(effect: ScreenEffect) {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const now = context.currentTime;

  const beep = (frequency: number, start: number, duration: number, type: OscillatorType = "sine", gainValue = 0.08) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now + start);
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(gainValue, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + start);
    oscillator.stop(now + start + duration + 0.02);
  };

  if (effect === "drumroll") {
    for (let index = 0; index < 12; index += 1) beep(index % 2 ? 120 : 170, index * 0.08, 0.07, "square", 0.05);
  } else if (effect === "applause") {
    for (let index = 0; index < 9; index += 1) beep(520 + index * 18, index * 0.06, 0.045, "triangle", 0.035);
  } else {
    [523, 659, 784, 1046].forEach((frequency, index) => beep(frequency, index * 0.09, 0.22, "sine", 0.06));
  }

  window.setTimeout(() => void context.close(), 1800);
}

function unlockEffectAudio() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.connect(context.destination);
  const oscillator = context.createOscillator();
  oscillator.frequency.setValueAtTime(220, context.currentTime);
  oscillator.connect(gain);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.03);
  window.setTimeout(() => void context.close(), 120);
}
