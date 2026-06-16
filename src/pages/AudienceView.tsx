import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Cloud, Loader2, Send, Star, TimerReset, UserRound } from "lucide-react";
import { CONTENT_TYPES, isTextSlide, needsOptions, SlideVisual, SLIDE_LABELS } from "../components/SlideVisual";
import { socket } from "../socket";
import type { Presentation as PresentationType, Slide } from "../types";

export default function AudienceView() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState<PresentationType | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [typedCode, setTypedCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    if (!code) {
      return;
    }

    socket.emit("join_presentation", { code }, (response: any) => {
      if (response.success) {
        setPresentation(response.presentation);
        setJoinError("");
      } else {
        setPresentation(null);
        setTypedCode(code);
        setJoinError(response.message || "Código não encontrado.");
      }
    });

    const onSlideChanged = ({ index, presentation: updatedPresentation }: { index: number; presentation?: PresentationType }) => {
      setPresentation((prev) => (updatedPresentation ? { ...updatedPresentation, currentSlideIndex: index } : prev ? { ...prev, currentSlideIndex: index } : null));
      setText("");
      setMessage("");
    };
    const replaceSlide = (slide: Slide) => setPresentation((prev) => (prev ? { ...prev, slides: prev.slides.map((item) => (item.id === slide.id ? slide : item)) } : prev));
    const onWordAdded = ({ slideId, words: incomingWords }: { slideId: string; words: Record<string, number> }) => {
      setPresentation((prev) => (prev ? { ...prev, slides: prev.slides.map((slide) => (slide.id === slideId ? { ...slide, words: incomingWords } : slide)) } : prev));
    };

    socket.on("slide_changed", onSlideChanged);
    socket.on("presentation_updated", ({ presentation: updatedPresentation }: { presentation: PresentationType }) => setPresentation(updatedPresentation));
    socket.on("slide_updated", ({ slide }: { slide: Slide }) => replaceSlide(slide));
    socket.on("word_added", onWordAdded);
    socket.on("words_cleared", () => setMessage(""));
    socket.on("participant_count", ({ count }: { count: number }) => setPresentation((prev) => (prev ? { ...prev, participantsCount: count } : prev)));

    return () => {
      socket.off("slide_changed", onSlideChanged);
      socket.off("presentation_updated");
      socket.off("slide_updated");
      socket.off("word_added", onWordAdded);
      socket.off("words_cleared");
      socket.off("participant_count");
    };
  }, [code]);

  const currentSlide = presentation?.slides[presentation.currentSlideIndex];

  useEffect(() => {
    if (!currentSlide) return;
    setWords((previous) => Array.from({ length: currentSlide.settings.maxWordsPerSubmit }, (_, index) => previous[index] || ""));
    setText("");
  }, [currentSlide?.id, currentSlide?.settings.maxWordsPerSubmit]);

  const wordList = useMemo(
    () => Object.entries((currentSlide?.words || {}) as Record<string, number>).map(([text, value]) => ({ text, value })).sort((a, b) => b.value - a.value),
    [currentSlide?.words],
  );

  const submit = (payload: Record<string, unknown>, done?: () => void) => {
    if (!currentSlide || isSubmitting) return;
    setIsSubmitting(true);
    setMessage("");
    socket.emit("submit_response", { code, slideId: currentSlide.id, ...payload }, (response: any) => {
      setIsSubmitting(false);
      if (response?.success) {
        setMessage("Resposta enviada.");
        done?.();
      } else {
        setMessage(response?.message || "Não foi possível enviar agora.");
      }
    });
  };

  const submitWords = (event: FormEvent) => {
    event.preventDefault();
    const validWords = words.map((word) => word.trim()).filter(Boolean);
    if (validWords.length === 0) return;
    submit({ values: validWords }, () => setWords(Array.from({ length: currentSlide?.settings.maxWordsPerSubmit || 1 }, () => "")));
  };

  const submitText = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    submit({ value: text }, () => setText(""));
  };

  const enterByCode = (event: FormEvent) => {
    event.preventDefault();
    const cleanCode = typedCode.replace(/\D/g, "").slice(0, 6);
    if (cleanCode.length === 6) navigate(`/join/${cleanCode}`);
  };

  if (!code || joinError) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f8ff] px-5 text-[#0b1638]">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#06152b] text-white shadow-lg shadow-slate-300">
              <Cloud className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black">WordClass</span>
          </div>

          <section className="rounded-[32px] border border-slate-200 bg-white p-7 text-[#101820] shadow-2xl shadow-slate-200">
            <span className="mb-5 inline-flex rounded-full bg-[#e7fff5] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#16796e]">
              Área do aluno
            </span>
            <h1 className="text-4xl font-black leading-tight">Digite o código da apresentação.</h1>
            <p className="mt-3 font-semibold leading-7 text-slate-600">
              Use o código que aparece no telão ou escaneie o QR code mostrado pelo apresentador.
            </p>
            {joinError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">{joinError}</p>}

            <form onSubmit={enterByCode} className="mt-7 space-y-4">
              <input
                value={typedCode}
                onChange={(event) => setTypedCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoFocus
                placeholder="000000"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-center text-4xl font-black tracking-[0.25em] outline-none transition focus:border-[#2f6bff] focus:bg-white focus:ring-4 focus:ring-[#2f6bff]/10"
              />
              <button disabled={typedCode.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff5c35] px-6 py-4 text-lg font-black text-white shadow-lg shadow-[#ff5c35]/25 transition active:scale-[0.99] disabled:bg-slate-300 disabled:shadow-none">
                Entrar
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          </section>
        </div>
      </div>
    );
  }

  if (!presentation || !currentSlide) {
    return <div className="grid min-h-screen place-items-center bg-[#06152b]"><Loader2 className="h-10 w-10 animate-spin text-white" /></div>;
  }

  const isInformationalSlide = CONTENT_TYPES.includes(currentSlide.type);

  return (
    <div className="min-h-screen overflow-hidden bg-white text-[#111936]">
      <header className="sticky top-0 z-20 grid h-16 grid-cols-[3rem_1fr_3rem] items-center border-b border-slate-100 bg-white px-4">
        <button onClick={() => navigate("/")} className="grid h-10 w-10 place-items-center rounded-full text-[#1f2d55] hover:bg-slate-50" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="truncate text-center text-lg font-semibold">WordClass</h1>
        <div />
      </header>

      <div className="flex items-center justify-between bg-[#082a5f] px-6 py-4 text-white">
        <p className="text-2xl font-semibold">
          Código <span className="font-black text-[#22c787]">{code}</span>
        </p>
        <span className="inline-flex items-center gap-2 text-lg font-semibold">
          <UserRound className="h-5 w-5" />
          {presentation.participantsCount}
        </span>
      </div>

      <main className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col px-6 pb-56 pt-8">
        <div className="mb-7">
          <span className="mb-4 inline-block rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-black uppercase tracking-widest text-[#2563eb]">
            {SLIDE_LABELS[currentSlide.type]} · Slide {presentation.currentSlideIndex + 1}
          </span>
          <h2 className="text-4xl font-black leading-tight tracking-tight text-[#111936]">{currentSlide.question}</h2>
        </div>

        <section className="relative z-10 text-[#101820]">
          {!currentSlide.settings.isOpen && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
              <AlertCircle className="h-4 w-4" />
              O apresentador pausou novas respostas.
            </div>
          )}

          {currentSlide.type === "wordcloud" && (
            <form onSubmit={submitWords} className="space-y-4">
              <div>
                <input
                  value={words[0] || ""}
                  onChange={(event) => setWords([event.target.value.slice(0, currentSlide.settings.maxWordLength)])}
                  disabled={isSubmitting || !currentSlide.settings.isOpen}
                  placeholder="Digite sua palavra"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
                />
                <p className="mt-2 text-sm font-semibold text-slate-500">{(words[0] || "").length}/{currentSlide.settings.maxWordLength}</p>
              </div>
              <SubmitButton disabled={!words.some((word) => word.trim()) || !currentSlide.settings.isOpen || isSubmitting} loading={isSubmitting} />
            </form>
          )}

          {needsOptions(currentSlide.type) && (
            <div className="grid gap-3">
              {currentSlide.options.map((option) => (
                <button key={option} disabled={!currentSlide.settings.isOpen || isSubmitting} onClick={() => submit({ value: option })} className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-left text-lg font-black shadow-sm transition hover:border-[#2563eb] disabled:opacity-40">
                  {option}
                </button>
              ))}
            </div>
          )}

          {currentSlide.type === "rating-scale" && (
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button key={rating} disabled={!currentSlide.settings.isOpen || isSubmitting} onClick={() => submit({ value: String(rating) })} className="grid aspect-square place-items-center rounded-2xl border-2 border-slate-200 bg-white font-black shadow-sm transition hover:border-[#2563eb] disabled:opacity-40">
                  <Star className="h-5 w-5 fill-[#ffb703] text-[#ffb703]" />
                  {rating}
                </button>
              ))}
            </div>
          )}

          {isTextSlide(currentSlide.type) && (
            <form onSubmit={submitText} className="space-y-4">
              <textarea value={text} onChange={(event) => setText(event.target.value.slice(0, 240))} disabled={isSubmitting || !currentSlide.settings.isOpen} placeholder="Digite sua resposta..." className="min-h-36 w-full resize-none rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-lg font-semibold outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
              <SubmitButton disabled={!text.trim() || !currentSlide.settings.isOpen || isSubmitting} loading={isSubmitting} />
            </form>
          )}

          {isInformationalSlide && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#9df7d3] text-[#06152b]">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-black">Você já entrou na apresentação.</h3>
              <p className="mt-3 font-semibold leading-7 text-slate-600">
                Código <span className="font-black text-[#2f6bff]">{code}</span>. Aguarde o apresentador abrir uma pergunta para responder.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-black text-slate-600">
                <TimerReset className="h-5 w-5 text-[#2f6bff]" />
                Aguardando próximo slide respondível
              </div>
            </div>
          )}

          {message && (
            <p className={`mt-5 flex items-center justify-center gap-2 text-center text-sm font-black ${message.includes("enviada") ? "text-[#28c48f]" : "text-[#ff5c35]"}`}>
              {message.includes("enviada") && <CheckCircle2 className="h-4 w-4" />}
              {message}
            </p>
          )}
        </section>

        {currentSlide.settings.showResultsToAudience && (
          <section className="mt-5 h-72 rounded-[24px] border border-white/20 bg-white p-4 text-[#101820] shadow-2xl shadow-black/20">
            {currentSlide.type === "wordcloud" ? <SlideVisual slide={{ ...currentSlide, words: Object.fromEntries(wordList.map((word) => [word.text, word.value])) }} /> : <SlideVisual slide={currentSlide} />}
          </section>
        )}
        <StudentArt />
      </main>
    </div>
  );
}

function SubmitButton({ disabled, loading }: { disabled: boolean; loading: boolean }) {
  return (
    <button disabled={disabled} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#18c486] px-6 py-4 text-2xl font-semibold text-white shadow-lg shadow-[#18c486]/25 transition active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none">
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Enviar <Send className="h-5 w-5" /></>}
    </button>
  );
}

function StudentArt() {
  return (
    <div className="pointer-events-none absolute -bottom-10 left-0 right-0 h-56 overflow-hidden">
      <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-[#2563eb]" />
      <div className="absolute bottom-0 left-12 h-32 w-40 rounded-t-full bg-[#ffc844]" />
      <div className="absolute bottom-20 left-40 h-16 w-16 rounded-full bg-[#2563eb]" />
      <div className="absolute bottom-4 right-20 h-32 w-5 rotate-12 rounded-full bg-[#20365f]" />
      <div className="absolute bottom-36 right-24 h-14 w-14 rounded-full bg-[#ff6257]" />
      {[0, 1, 2, 3, 4].map((item) => (
        <span
          key={item}
          className="absolute right-20 h-12 w-7 rounded-full bg-[#20365f]"
          style={{
            bottom: `${20 + item * 22}px`,
            transform: `translateX(${item % 2 ? -25 : 22}px) rotate(${item % 2 ? -42 : 42}deg)`,
          }}
        />
      ))}
    </div>
  );
}
