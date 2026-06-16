import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import QRCode from "react-qr-code";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clipboard,
  Cloud,
  Copy,
  ExternalLink,
  FileDown,
  Lock,
  Megaphone,
  Plus,
  RotateCcw,
  Settings,
  Smartphone,
  Sparkles,
  Trash2,
  Unlock,
  Users,
} from "lucide-react";
import { CONTENT_TYPES, INTERACTION_TYPES, needsOptions, QUIZ_TYPES, SlideVisual, SLIDE_LABELS, totalResponses } from "../components/SlideVisual";
import { socket } from "../socket";
import type { Presentation as PresentationType, Slide, SlideSettings, SlideType } from "../types";

export default function PresenterLive() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState<PresentationType | null>(null);
  const [copied, setCopied] = useState(false);
  const [draftPresentationId, setDraftPresentationId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSlideId, setDraftSlideId] = useState("");
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftOptions, setDraftOptions] = useState<string[]>([]);
  const pendingSlidePatch = useRef<Partial<Pick<Slide, "question" | "options" | "content">>>({});
  const isEditingTitle = useRef(false);
  const isEditingSlideContent = useRef(false);
  const draftTitleRef = useRef("");
  const draftQuestionRef = useRef("");
  const draftContentRef = useRef("");
  const draftOptionsRef = useRef<string[]>([]);
  const presenterKey = code ? localStorage.getItem(`wordclass:presenter:${code}`) || "" : "";

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }
    if (!presenterKey) {
      navigate("/present");
      return;
    }

    socket.emit("presenter_join", { code, presenterKey }, (response: any) => {
      if (response.success) setPresentation(response.presentation);
      else navigate("/present");
    });

    const protectLocalEdits = (updatedPresentation: PresentationType) => {
      setPresentation((prev) => {
        if (!prev) return updatedPresentation;
        const activeSlideId = prev.slides[prev.currentSlideIndex]?.id;
        return {
          ...updatedPresentation,
          title: isEditingTitle.current ? draftTitleRef.current : updatedPresentation.title,
          slides: updatedPresentation.slides.map((slide) => {
            if (!isEditingSlideContent.current || slide.id !== activeSlideId) return slide;
            return {
              ...slide,
              question: draftQuestionRef.current,
              content: draftContentRef.current,
              options: draftOptionsRef.current,
            };
          }),
        };
      });
    };
    const replaceSlide = (slide: Slide) => {
      setPresentation((prev) => {
        if (!prev) return prev;
        const activeSlideId = prev.slides[prev.currentSlideIndex]?.id;
        const nextSlide =
          isEditingSlideContent.current && slide.id === activeSlideId
            ? { ...slide, question: draftQuestionRef.current, content: draftContentRef.current, options: draftOptionsRef.current }
            : slide;
        return { ...prev, slides: prev.slides.map((item) => (item.id === nextSlide.id ? nextSlide : item)) };
      });
    };
    const onWordAdded = ({ slideId, words }: { slideId: string; words: Record<string, number> }) => {
      setPresentation((prev) => (prev ? { ...prev, slides: prev.slides.map((slide) => (slide.id === slideId ? { ...slide, words } : slide)) } : prev));
    };
    const onWordsCleared = ({ slideId }: { slideId: string }) => {
      setPresentation((prev) =>
        prev
          ? {
              ...prev,
              slides: prev.slides.map((slide) => (slide.id === slideId ? { ...slide, words: {}, votes: {}, responses: [], ratings: {} } : slide)),
            }
          : prev,
      );
    };
    const onWordRemoved = ({ slideId, words }: { slideId: string; words: Record<string, number> }) => {
      setPresentation((prev) => (prev ? { ...prev, slides: prev.slides.map((slide) => (slide.id === slideId ? { ...slide, words } : slide)) } : prev));
    };
    const onPresentationUpdated = ({ presentation: updatedPresentation }: { presentation: PresentationType }) => protectLocalEdits(updatedPresentation);
    const onSlideChanged = ({ index, presentation: updatedPresentation }: { index: number; presentation?: PresentationType }) => {
      if (updatedPresentation) {
        protectLocalEdits({ ...updatedPresentation, currentSlideIndex: index });
        return;
      }
      setPresentation((prev) => (prev ? { ...prev, currentSlideIndex: index } : null));
    };
    const onParticipantCount = ({ count }: { count: number }) => setPresentation((prev) => (prev ? { ...prev, participantsCount: count } : prev));

    socket.on("word_added", onWordAdded);
    socket.on("word_removed", onWordRemoved);
    socket.on("words_cleared", onWordsCleared);
    socket.on("presentation_updated", onPresentationUpdated);
    socket.on("slide_updated", ({ slide }: { slide: Slide }) => replaceSlide(slide));
    socket.on("slide_changed", onSlideChanged);
    socket.on("participant_count", onParticipantCount);

    return () => {
      socket.off("word_added", onWordAdded);
      socket.off("word_removed", onWordRemoved);
      socket.off("words_cleared", onWordsCleared);
      socket.off("presentation_updated", onPresentationUpdated);
      socket.off("slide_updated");
      socket.off("slide_changed", onSlideChanged);
      socket.off("participant_count", onParticipantCount);
    };
  }, [code, navigate, presenterKey]);

  const currentSlide = presentation?.slides[presentation.currentSlideIndex];
  const isTitleDraftReady = presentation ? draftPresentationId === presentation.id : false;
  const isDraftReady = currentSlide ? draftSlideId === currentSlide.id : false;
  const currentSlideWithDraft = currentSlide
    ? {
        ...currentSlide,
        question: isDraftReady ? draftQuestion : currentSlide.question,
        content: isDraftReady ? draftContent : currentSlide.content,
        options: isDraftReady ? draftOptions : currentSlide.options,
      }
    : undefined;
  const joinUrl = `${window.location.origin}/join/${code}`;
  const screenUrl = `${window.location.origin}/screen/${code}`;
  const currentTotal = currentSlideWithDraft ? totalResponses(currentSlideWithDraft) : 0;
  const topWords = useMemo(
    () => Object.entries((currentSlide?.words || {}) as Record<string, number>).map(([text, value]) => ({ text, value })).sort((a, b) => b.value - a.value),
    [currentSlide?.words],
  );

  const emitPresenterEvent = (event: string, payload: Record<string, unknown> = {}) => {
    socket.emit(event, { code, presenterKey, ...payload });
  };

  useEffect(() => {
    if (!presentation) return;
    setDraftPresentationId(presentation.id);
    setDraftTitle(presentation.title);
    draftTitleRef.current = presentation.title;
  }, [presentation?.id]);

  useEffect(() => {
    if (!currentSlide) return;
    setDraftSlideId(currentSlide.id);
    setDraftQuestion(currentSlide.question);
    setDraftContent(currentSlide.content);
    setDraftOptions(currentSlide.options);
    draftQuestionRef.current = currentSlide.question;
    draftContentRef.current = currentSlide.content;
    draftOptionsRef.current = currentSlide.options;
    pendingSlidePatch.current = {};
    isEditingSlideContent.current = false;
  }, [currentSlide?.id]);

  useEffect(() => {
    return () => {
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const changeSlide = (index: number) => {
    flushPendingSlideSave();
    emitPresenterEvent("change_slide", { index });
    setPresentation((prev) => (prev ? { ...prev, currentSlideIndex: index } : prev));
  };

  const persistSlide = (patch: Partial<Pick<Slide, "question" | "options" | "content">>) => {
    if (!presentation || !currentSlide) return;
    const slideId = currentSlide.id;
    setPresentation((prev) =>
      prev
        ? {
            ...prev,
            slides: prev.slides.map((slide) => (slide.id === slideId ? { ...slide, ...patch } : slide)),
          }
        : prev,
    );
    emitPresenterEvent("update_slide", { slideId: currentSlide.id, ...patch });
  };

  const queueSlideSave = (patch: Partial<Pick<Slide, "question" | "options" | "content">>) => {
    pendingSlidePatch.current = { ...pendingSlidePatch.current, ...patch };
  };

  const flushPendingSlideSave = () => {
    const nextPatch = pendingSlidePatch.current;
    pendingSlidePatch.current = {};
    if (Object.keys(nextPatch).length > 0) persistSlide(nextPatch);
  };

  const finishSlideEditing = () => {
    flushPendingSlideSave();
    window.setTimeout(() => {
      isEditingSlideContent.current = false;
    }, 1200);
  };

  const finishTitleEditing = () => {
    const title = draftTitleRef.current;
    setPresentation((prev) => (prev ? { ...prev, title } : prev));
    emitPresenterEvent("update_presentation_title", { title });
    window.setTimeout(() => {
      isEditingTitle.current = false;
    }, 1200);
  };

  const updateQuestionDraft = (question: string) => {
    isEditingSlideContent.current = true;
    draftQuestionRef.current = question;
    setDraftQuestion(question);
    queueSlideSave({ question });
  };

  const updateContentDraft = (content: string) => {
    isEditingSlideContent.current = true;
    draftContentRef.current = content;
    setDraftContent(content);
    queueSlideSave({ content });
  };

  const updateOptionsDraft = (options: string[]) => {
    isEditingSlideContent.current = true;
    draftOptionsRef.current = options;
    setDraftOptions(options);
    queueSlideSave({ options });
  };

  const updateSettings = (settings: Partial<SlideSettings>) => {
    if (!presentation || !currentSlide) return;
    const nextSettings = { ...currentSlide.settings, ...settings };
    setPresentation({ ...presentation, slides: presentation.slides.map((slide) => (slide.id === currentSlide.id ? { ...slide, settings: nextSettings } : slide)) });
    emitPresenterEvent("update_slide_settings", { slideId: currentSlide.id, settings: nextSettings });
  };

  const addSlide = (type: SlideType) => {
    flushPendingSlideSave();
    emitPresenterEvent("add_slide", { type });
  };
  const addTemplate = (template: "classroom" | "meeting" | "event") => {
    flushPendingSlideSave();
    emitPresenterEvent("add_template", { template });
  };
  const updateTitle = (title: string) => {
    if (!presentation) return;
    isEditingTitle.current = true;
    draftTitleRef.current = title;
    setDraftTitle(title);
  };
  const goPrevious = () => changeSlide(Math.max(0, presentation.currentSlideIndex - 1));
  const goNext = () => changeSlide(Math.min(presentation.slides.length - 1, presentation.currentSlideIndex + 1));
  const removeWord = (word: string) => {
    if (!currentSlide) return;
    emitPresenterEvent("remove_word", { slideId: currentSlide.id, word });
  };
  const triggerEffect = (effect: "confetti" | "applause" | "drumroll" | "cheer") => emitPresenterEvent("trigger_effect", { effect });
  const duplicateSlide = (slideId: string) => {
    flushPendingSlideSave();
    emitPresenterEvent("duplicate_slide", { slideId });
  };
  const deleteSlide = (slideId: string) => {
    flushPendingSlideSave();
    emitPresenterEvent("delete_slide", { slideId });
  };

  const exportCsv = () => {
    if (!presentation) return;
    const rows = [["slide", "tipo", "pergunta", "resposta", "total"]];
    presentation.slides.forEach((slide, index) => {
      Object.entries(slide.words).forEach(([word, count]) => rows.push([String(index + 1), SLIDE_LABELS[slide.type], slide.question, word, String(count)]));
      Object.entries(slide.votes).forEach(([option, count]) => rows.push([String(index + 1), SLIDE_LABELS[slide.type], slide.question, option, String(count)]));
      Object.entries(slide.ratings).forEach(([rating, count]) => rows.push([String(index + 1), SLIDE_LABELS[slide.type], slide.question, rating, String(count)]));
      slide.responses.forEach((response) => rows.push([String(index + 1), SLIDE_LABELS[slide.type], slide.question, response, "1"]));
    });
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `wordclass-${code}-resultados.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!presentation || !currentSlide || !currentSlideWithDraft) {
    return <div className="grid min-h-screen place-items-center bg-[#f7f3ea]"><div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2f6bff] border-t-white" /></div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eef2f6] font-sans text-[#101820]">
      <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm">
        <div className="flex min-w-0 items-center gap-4">
          <button onClick={() => navigate("/present")} className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white shadow-sm hover:border-[#2f6bff]" title="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#101820] text-white shadow-[0_5px_0_#ff5c35]"><Cloud className="h-6 w-6" /></div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-[#2f6bff]">Painel do apresentador</p>
            <input
              className="w-full min-w-0 truncate bg-transparent text-2xl font-black outline-none focus:text-[#2f6bff]"
              value={isTitleDraftReady ? draftTitle : presentation.title}
              onChange={(event) => updateTitle(event.target.value)}
              onFocus={() => {
                isEditingTitle.current = true;
                draftTitleRef.current = isTitleDraftReady ? draftTitle : presentation.title;
              }}
              onBlur={finishTitleEditing}
              maxLength={80}
              aria-label="Título da apresentação"
            />
          </div>
          <CheckCircle2 className="hidden h-6 w-6 text-[#28c48f] sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white shadow-sm hover:border-[#2f6bff]" title="Copiar link">
            {copied ? <Clipboard className="h-5 w-5 text-[#28c48f]" /> : <Copy className="h-5 w-5" />}
          </button>
          <button onClick={exportCsv} className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white shadow-sm hover:border-[#2f6bff]" title="Exportar">
            <FileDown className="h-5 w-5" />
          </button>
          <button onClick={() => window.open(`/join/${code}`, "_blank")} className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-black shadow-sm hover:border-[#2f6bff] md:inline-flex">
            <Smartphone className="h-4 w-4" />
            Aluno
          </button>
          <button onClick={() => window.open(screenUrl, "_blank")} className="inline-flex items-center gap-2 rounded-full bg-[#ff5c35] px-5 py-2 font-black text-white shadow-lg shadow-orange-200 transition hover:bg-[#e94d28]">
            <ExternalLink className="h-4 w-4" />
            Telão
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_390px]">
        <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <button onClick={() => addSlide("wordcloud")} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#101820] px-4 py-3 font-black text-white shadow-lg shadow-slate-300">
              <Plus className="h-5 w-5" />
              Novo slide
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {presentation.slides.map((slide, index) => (
              <div key={slide.id} className="mb-4 grid w-full grid-cols-[24px_1fr] gap-2 text-left">
                <span className={`pt-5 text-sm font-black ${index === presentation.currentSlideIndex ? "text-[#2f6bff]" : "text-slate-400"}`}>{index + 1}</span>
                <button onClick={() => changeSlide(index)} className={`group relative block rounded-2xl border bg-slate-50 p-3 text-left transition ${index === presentation.currentSlideIndex ? "border-[#2f6bff] shadow-md shadow-blue-100" : "border-slate-200 hover:border-slate-300"}`}>
                  <span className="block aspect-video rounded-xl bg-white p-3">
                    <span className="line-clamp-2 text-xs font-black">{slide.id === currentSlide.id && isDraftReady ? draftQuestion : slide.question}</span>
                    <span className="mt-5 block text-xs font-black text-[#2f6bff]">{SLIDE_LABELS[slide.type]}</span>
                  </span>
                  {presentation.slides.length > 1 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteSlide(slide.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          deleteSlide(slide.id);
                        }
                      }}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-rose-600 opacity-0 shadow-sm ring-1 ring-rose-100 transition group-hover:opacity-100"
                      title="Excluir slide"
                    >
                      <Trash2 className="h-4 w-4" />
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={goPrevious} disabled={presentation.currentSlideIndex === 0} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black shadow-sm disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
              <button onClick={goNext} disabled={presentation.currentSlideIndex === presentation.slides.length - 1} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black shadow-sm disabled:opacity-40">
                Avançar
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 overflow-y-auto p-6">
          <div className="mx-auto grid max-w-6xl gap-5">
            <section className="grid grid-cols-3 gap-4">
              <Metric icon={<Users />} label="Participantes" value={String(presentation.participantsCount)} />
              <Metric icon={<BarChart3 />} label="Respostas neste slide" value={String(currentTotal)} />
              <Metric icon={<Cloud />} label="Código" value={code || ""} />
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3">
                <p className="font-black">Para participar, acesse <span className="text-[#2f6bff]">{joinUrl.replace(/^https?:\/\//, "")}</span></p>
                <div className="flex items-center gap-3">
                  <QRCode value={joinUrl} size={52} />
                  <span className="text-2xl font-black text-[#ff5c35]">{code}</span>
                </div>
              </div>

              <textarea
                className="mb-5 w-full resize-none rounded-2xl border-2 border-transparent bg-white p-2 text-4xl font-black leading-tight outline-none focus:border-[#2f6bff]"
                value={isDraftReady ? draftQuestion : currentSlide.question}
                onChange={(event) => updateQuestionDraft(event.target.value)}
                onFocus={() => {
                  isEditingSlideContent.current = true;
                  draftQuestionRef.current = isDraftReady ? draftQuestion : currentSlide.question;
                }}
                onBlur={finishSlideEditing}
                rows={2}
                maxLength={180}
              />
              <div className="h-[420px] rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
                <SlideVisual slide={currentSlideWithDraft} large onWordClick={currentSlide.type === "wordcloud" ? removeWord : undefined} />
              </div>
            </section>

            <section className="flex flex-wrap justify-center gap-3">
              <button onClick={() => window.open(`/join/${code}`, "_blank")} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-slate-800 shadow-sm transition hover:border-[#2f6bff] hover:text-[#2f6bff]"><Smartphone className="h-4 w-4" /> Vista do aluno</button>
              <button onClick={() => emitPresenterEvent("clear_words", { slideId: currentSlide.id })} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-slate-800 shadow-sm transition hover:border-[#2f6bff] hover:text-[#2f6bff]"><RotateCcw className="h-4 w-4" /> Limpar resultados</button>
              <button onClick={() => duplicateSlide(currentSlide.id)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-slate-800 shadow-sm transition hover:border-[#2f6bff] hover:text-[#2f6bff]"><Copy className="h-4 w-4" /> Duplicar</button>
              <button onClick={() => deleteSlide(currentSlide.id)} disabled={presentation.slides.length <= 1} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-slate-800 shadow-sm transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-40"><Trash2 className="h-4 w-4" /> Excluir</button>
            </section>
          </div>
        </main>

        <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#101820] text-white"><Settings className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#ff5c35]">Editor</p>
              <h2 className="text-xl font-black">{SLIDE_LABELS[currentSlide.type]}</h2>
            </div>
          </div>

          <Panel title="Biblioteca de slides">
            <SlideGroup title="Quiz" types={QUIZ_TYPES} addSlide={addSlide} />
            <SlideGroup title="Sem pontuação" types={INTERACTION_TYPES} addSlide={addSlide} />
            <SlideGroup title="Conteúdo" types={CONTENT_TYPES} addSlide={addSlide} />
          </Panel>

          <Panel title="Roteiros prontos">
            <TemplateButton icon={<BookOpenCheck />} title="Aula interativa" text="Adiciona nuvem, votação, resposta curta e Q&A." onClick={() => addTemplate("classroom")} />
            <TemplateButton icon={<BriefcaseBusiness />} title="Reunião de decisão" text="Adiciona prioridade, ranking, escala e próximos passos." onClick={() => addTemplate("meeting")} />
            <TemplateButton icon={<Megaphone />} title="Evento ao vivo" text="Adiciona abertura, nuvem, pesquisa e perguntas para o palco." onClick={() => addTemplate("event")} />
          </Panel>

          <Panel title="Efeitos no telão">
            <div className="grid grid-cols-2 gap-2">
              <EffectButton label="Confete" icon="🎉" onClick={() => triggerEffect("confetti")} />
              <EffectButton label="Aplausos" icon="👏" onClick={() => triggerEffect("applause")} />
              <EffectButton label="Tambores" icon="🥁" onClick={() => triggerEffect("drumroll")} />
              <EffectButton label="Celebração" icon="✨" onClick={() => triggerEffect("cheer")} />
            </div>
          </Panel>

          <Panel title="Conteúdo do slide">
            <label className="mb-2 block text-sm font-black">Pergunta ou título</label>
            <textarea
              className="min-h-24 w-full resize-none rounded-2xl border-2 border-slate-200 p-3 font-bold outline-none focus:border-[#2f6bff]"
              value={isDraftReady ? draftQuestion : currentSlide.question}
              onChange={(event) => updateQuestionDraft(event.target.value)}
              onFocus={() => {
                isEditingSlideContent.current = true;
                draftQuestionRef.current = isDraftReady ? draftQuestion : currentSlide.question;
              }}
              onBlur={finishSlideEditing}
            />

            {needsOptions(currentSlide.type) && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-black">Opções</p>
                {(isDraftReady ? draftOptions : currentSlide.options).map((option, index) => (
                  <input
                    key={index}
                    value={option}
                    onFocus={() => {
                      isEditingSlideContent.current = true;
                      draftOptionsRef.current = isDraftReady ? draftOptions : currentSlide.options;
                    }}
                    onBlur={finishSlideEditing}
                    onChange={(event) => {
                      const nextOptions = [...(isDraftReady ? draftOptions : currentSlide.options)];
                      nextOptions[index] = event.target.value;
                      updateOptionsDraft(nextOptions);
                    }}
                    className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-bold outline-none focus:border-[#2f6bff]"
                  />
                ))}
                <button onClick={() => {
                  const options = isDraftReady ? draftOptions : currentSlide.options;
                  updateOptionsDraft([...options, `Opção ${options.length + 1}`]);
                }} className="text-sm font-black text-[#2f6bff]">Adicionar opção</button>
              </div>
            )}

            {CONTENT_TYPES.includes(currentSlide.type) && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-black">Conteúdo</label>
                <textarea
                  className="min-h-36 w-full resize-none rounded-2xl border-2 border-slate-200 p-3 font-bold outline-none focus:border-[#2f6bff]"
                  value={isDraftReady ? draftContent : currentSlide.content}
                  onChange={(event) => updateContentDraft(event.target.value)}
                  onFocus={() => {
                    isEditingSlideContent.current = true;
                    draftContentRef.current = isDraftReady ? draftContent : currentSlide.content;
                  }}
                  onBlur={finishSlideEditing}
                />
              </div>
            )}
          </Panel>

          <Panel title="Configurações ao vivo">
            <SettingToggle label={currentSlide.settings.isOpen ? "Recebendo respostas" : "Respostas bloqueadas"} checked={currentSlide.settings.isOpen} onChange={(checked) => updateSettings({ isOpen: checked })} icon={currentSlide.settings.isOpen ? <Unlock /> : <Lock />} />
            <SettingToggle label="Mostrar resultados ao aluno" checked={currentSlide.settings.showResultsToAudience} onChange={(checked) => updateSettings({ showResultsToAudience: checked })} />
            <SettingToggle label="Permitir mais de um envio" checked={currentSlide.settings.allowMultipleSubmissions} onChange={(checked) => updateSettings({ allowMultipleSubmissions: checked })} />
            <SettingToggle label="Filtrar linguagem imprópria" checked={currentSlide.settings.profanityFilter} onChange={(checked) => updateSettings({ profanityFilter: checked })} />
            <div className="pt-2">
              <label className="mb-2 block text-sm font-black">Entradas por aluno</label>
              <input type="number" min={1} max={10} value={currentSlide.settings.maxWordsPerSubmit} onChange={(event) => updateSettings({ maxWordsPerSubmit: Number(event.target.value) })} className="w-24 rounded-xl border-2 border-slate-200 px-3 py-2 font-black outline-none focus:border-[#2f6bff]" />
            </div>
          </Panel>

          <Panel title="Resultados">
            <ResultList slide={currentSlide} topWords={topWords} removeWord={removeWord} />
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-[#2f6bff] [&>svg]:h-5 [&>svg]:w-5">{icon}<span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span></div>
      <p className="truncate text-3xl font-black">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <h3 className="mb-3 font-black">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SlideGroup({ title, types, addSlide }: { title: string; types: SlideType[]; addSlide: (type: SlideType) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {types.map((type) => (
          <button key={type} onClick={() => addSlide(type)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-black transition hover:border-[#2f6bff] hover:bg-[#eef3ff] hover:text-[#2f6bff]">
            {SLIDE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}

function TemplateButton({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-[#2f6bff] hover:bg-[#eef3ff]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef3ff] text-[#2f6bff] [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <span>
        <span className="block font-black">{title}</span>
        <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">{text}</span>
      </span>
    </button>
  );
}

function EffectButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left font-black transition hover:border-[#2f6bff] hover:bg-[#eef3ff]">
      <span className="mb-1 block text-2xl">{icon}</span>
      <span className="inline-flex items-center gap-1 text-sm">
        <Sparkles className="h-3.5 w-3.5 text-[#2f6bff]" />
        {label}
      </span>
    </button>
  );
}

function ResultList({ slide, topWords, removeWord }: { slide: Slide; topWords: { text: string; value: number }[]; removeWord: (word: string) => void }) {
  if (slide.type === "wordcloud") {
    return (
      <>
        {topWords.slice(0, 8).map((word) => (
          <button key={word.text} onClick={() => removeWord(word.text)} className="flex w-full justify-between rounded-xl border border-transparent px-3 py-2 text-left font-black transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" title="Remover palavra do telão">
            <span>{word.text}</span>
            <span>{word.value}</span>
          </button>
        ))}
        {topWords.length === 0 && <p className="font-bold text-slate-400">Sem respostas ainda.</p>}
      </>
    );
  }

  const voteEntries = Object.entries(slide.votes).sort((a, b) => b[1] - a[1]);
  const ratingEntries = Object.entries(slide.ratings).sort((a, b) => Number(a[0]) - Number(b[0]));
  if (voteEntries.length > 0) {
    return <>{voteEntries.map(([label, count]) => <div key={label} className="flex justify-between py-1 font-black"><span>{label}</span><span>{count}</span></div>)}</>;
  }
  if (ratingEntries.length > 0) {
    return <>{ratingEntries.map(([label, count]) => <div key={label} className="flex justify-between py-1 font-black"><span>Nota {label}</span><span>{count}</span></div>)}</>;
  }
  if (slide.responses.length > 0) {
    return <>{slide.responses.slice(-5).reverse().map((response, index) => <p key={`${response}-${index}`} className="mb-2 rounded-xl bg-white px-3 py-2 text-sm font-bold">{response}</p>)}</>;
  }
  return <p className="font-bold text-slate-400">Sem respostas ainda.</p>;
}

function SettingToggle({ label, checked, onChange, icon }: { label: string; checked: boolean; onChange: (checked: boolean) => void; icon?: ReactNode }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left font-bold transition hover:border-[#2f6bff]">
      <span className="flex items-center gap-2 [&>svg]:h-4 [&>svg]:w-4">{icon}{label}</span>
      <span className={`flex h-6 w-11 items-center rounded-full px-1 ${checked ? "justify-end bg-[#2f6bff]" : "justify-start bg-slate-300"}`}><span className="h-4 w-4 rounded-full bg-white" /></span>
    </button>
  );
}
