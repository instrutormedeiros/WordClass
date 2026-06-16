import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import { randomBytes } from "crypto";
import { Server, Socket } from "socket.io";

interface SlideSettings {
  isOpen: boolean;
  maxWordsPerSubmit: number;
  maxWordLength: number;
  allowMultipleSubmissions: boolean;
  profanityFilter: boolean;
  showResultsToAudience: boolean;
}

type SlideType =
  | "pick-answer"
  | "short-answer"
  | "spinner-wheel"
  | "match-pairs"
  | "correct-order"
  | "categorise"
  | "poll"
  | "open-ended"
  | "wordcloud"
  | "brainstorm"
  | "idea-board"
  | "pin-on-image"
  | "ranking"
  | "rating-scale"
  | "qa"
  | "survey"
  | "content"
  | "heading"
  | "list"
  | "diagram"
  | "image"
  | "qr-code"
  | "youtube"
  | "embed";

interface Slide {
  id: string;
  type: SlideType;
  question: string;
  words: Record<string, number>;
  options: string[];
  votes: Record<string, number>;
  responses: string[];
  ratings: Record<string, number>;
  content: string;
  settings: SlideSettings;
  submissions: Record<string, string[]>;
}

interface Presentation {
  id: string;
  code: string;
  title: string;
  slides: Slide[];
  currentSlideIndex: number;
  presenterId: string;
  presenterKey: string;
  createdAt: number;
  updatedAt: number;
  participantsCount: number;
  version: "live";
}

const presentations: Record<string, Presentation> = {};
const isDevelopment = process.env.NODE_ENV !== "production";

const DEFAULT_SETTINGS: SlideSettings = {
  isOpen: true,
  maxWordsPerSubmit: 3,
  maxWordLength: 30,
  allowMultipleSubmissions: true,
  profanityFilter: true,
  showResultsToAudience: false,
};

const SLIDE_TEMPLATES: Record<SlideType, { label: string; question: string; options?: string[]; content?: string }> = {
  "pick-answer": { label: "Resposta única", question: "Qual é a resposta correta?", options: ["Opção A", "Opção B", "Opção C", "Opção D"] },
  "short-answer": { label: "Resposta curta", question: "Responda em poucas palavras." },
  "spinner-wheel": { label: "Roleta", question: "Qual opção a roleta deve escolher?", options: ["Grupo 1", "Grupo 2", "Grupo 3", "Grupo 4"] },
  "match-pairs": { label: "Pares", question: "Combine os pares corretos." },
  "correct-order": { label: "Ordem correta", question: "Coloque os itens na ordem correta." },
  categorise: { label: "Categorizar", question: "Em qual categoria isso se encaixa?", options: ["Categoria A", "Categoria B", "Categoria C"] },
  poll: { label: "Votação", question: "Qual opção você prefere?", options: ["Opção 1", "Opção 2", "Opção 3"] },
  "open-ended": { label: "Aberta", question: "Compartilhe sua resposta." },
  wordcloud: { label: "Nuvem de palavras", question: "Que palavra define este encontro?" },
  brainstorm: { label: "Brainstorm", question: "Quais ideias você quer sugerir?" },
  "idea-board": { label: "Quadro de ideias", question: "Publique uma ideia para o grupo." },
  "pin-on-image": { label: "Marcar na imagem", question: "Onde você marcaria sua resposta?" },
  ranking: { label: "Ranking", question: "Qual item deve ficar no topo?" },
  "rating-scale": { label: "Escala", question: "Como você avalia este tema?", options: ["1", "2", "3", "4", "5"] },
  qa: { label: "Perguntas e respostas", question: "Qual pergunta você quer fazer?" },
  survey: { label: "Pesquisa", question: "Escolha a alternativa da pesquisa.", options: ["Concordo", "Neutro", "Discordo"] },
  content: { label: "Conteúdo", question: "Conteúdo", content: "Use este slide para explicar uma ideia importante." },
  heading: { label: "Título", question: "Título do bloco", content: "Subtítulo ou chamada principal." },
  list: { label: "Lista", question: "Lista", content: "Primeiro ponto\nSegundo ponto\nTerceiro ponto" },
  diagram: { label: "Diagrama", question: "Diagrama", content: "Entrada -> Processo -> Resultado" },
  image: { label: "Imagem", question: "Imagem", content: "Adicione aqui uma legenda ou URL de imagem." },
  "qr-code": { label: "QR Code", question: "QR Code", content: "https://wordclass-934a0.web.app" },
  youtube: { label: "YouTube", question: "Vídeo", content: "Cole aqui o link do YouTube." },
  embed: { label: "Embed", question: "Embed", content: "Cole aqui o conteúdo incorporado." },
};

const OPTION_TYPES = new Set<SlideType>(["pick-answer", "spinner-wheel", "categorise", "poll", "survey"]);
const TEXT_TYPES = new Set<SlideType>(["short-answer", "open-ended", "brainstorm", "idea-board", "pin-on-image", "ranking", "qa", "match-pairs", "correct-order"]);
const CONTENT_TYPES = new Set<SlideType>(["content", "heading", "list", "diagram", "image", "qr-code", "youtube", "embed"]);

type DeckTemplate = "classroom" | "meeting" | "event";

const DECK_TEMPLATES: Record<DeckTemplate, Array<{ type: SlideType; question?: string; options?: string[]; content?: string }>> = {
  classroom: [
    { type: "wordcloud", question: "Qual palavra resume o tema de hoje?" },
    { type: "poll", question: "Como você está se sentindo sobre este conteúdo?", options: ["Entendi bem", "Tenho dúvidas", "Preciso praticar"] },
    { type: "short-answer", question: "Qual foi a principal ideia aprendida até agora?" },
    { type: "qa", question: "Que pergunta você gostaria de fazer?" },
  ],
  meeting: [
    { type: "wordcloud", question: "Qual prioridade deve guiar nossa decisão?" },
    { type: "ranking", question: "Qual ação deveria vir primeiro?" },
    { type: "rating-scale", question: "De 1 a 5, quão alinhado o grupo está?" },
    { type: "open-ended", question: "Qual próximo passo você sugere?" },
  ],
  event: [
    { type: "heading", question: "Bem-vindos", content: "Use o código na tela para participar ao vivo." },
    { type: "wordcloud", question: "Qual palavra define este encontro?" },
    { type: "survey", question: "De onde você está participando?", options: ["Sala", "Online", "Outro local"] },
    { type: "qa", question: "Envie uma pergunta para o palco." },
  ],
};

const BLOCKED_WORDS = new Set([
  "MERDA",
  "PORRA",
  "CARALHO",
  "FUCK",
  "SHIT",
  "BITCH",
]);

function publicPresentation(presentation: Presentation) {
  return {
    ...presentation,
    presenterKey: undefined,
    slides: presentation.slides.map(({ submissions, ...slide }) => slide),
  };
}

function generateCode(): string {
  let code: string;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (Object.values(presentations).some((p) => p.code === code));
  return code;
}

function generateId(): string {
  return randomBytes(8).toString("hex");
}

function generatePresenterKey(): string {
  return randomBytes(24).toString("hex");
}

function findPresentation(code: string): Presentation | undefined {
  return Object.values(presentations).find((p) => p.code === code);
}

function isSlideType(type: unknown): type is SlideType {
  return typeof type === "string" && type in SLIDE_TEMPLATES;
}

function createSlide(type: SlideType = "wordcloud", question?: string): Slide {
  const template = SLIDE_TEMPLATES[type];
  return {
    id: generateId(),
    type,
    question: String(question || template.question).trim().slice(0, 180),
    words: {},
    options: [...(template.options || [])],
    votes: {},
    responses: [],
    ratings: {},
    content: template.content || "",
    settings: { ...DEFAULT_SETTINGS },
    submissions: {},
  };
}

function createTemplateSlides(template: unknown, fallbackQuestion: string): Slide[] {
  if (template === "blank") return [createSlide("wordcloud", fallbackQuestion)];
  const selected = typeof template === "string" && template in DECK_TEMPLATES ? DECK_TEMPLATES[template as DeckTemplate] : DECK_TEMPLATES.classroom;
  return selected.map((item, index) => {
    const slide = createSlide(item.type, index === 0 && fallbackQuestion ? fallbackQuestion : item.question);
    if (item.options) slide.options = [...item.options];
    if (item.content) slide.content = item.content;
    return slide;
  });
}

function isPresenter(socket: Socket, presentation: Presentation, presenterKey?: string): boolean {
  return socket.data.presenterFor === presentation.id || presenterKey === presentation.presenterKey;
}

function liveRoom(io: Server, presentation: Presentation) {
  return io.to(`host_${presentation.id}`).to(`viewer_${presentation.id}`).to(`screen_${presentation.id}`);
}

async function emitParticipantCount(io: Server, presentation: Presentation) {
  const sockets = await io.in(`viewer_${presentation.id}`).fetchSockets();
  presentation.participantsCount = sockets.length;
  presentation.updatedAt = Date.now();
  liveRoom(io, presentation).emit("participant_count", { count: presentation.participantsCount });
}

function normalizeWord(word: string, maxLength: number): string {
  return word
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength)
    .toLocaleUpperCase("pt-BR");
}

function validateWords(words: unknown, slide: Slide, participantId: string) {
  if (!slide.settings.isOpen) {
    return { accepted: [], error: "Esta pergunta está fechada para novas respostas." };
  }

  if (!Array.isArray(words)) {
    return { accepted: [], error: "Envio inválido." };
  }

  if (!slide.settings.allowMultipleSubmissions && slide.submissions[participantId]?.length) {
    return { accepted: [], error: "Você já respondeu esta pergunta." };
  }

  const accepted: string[] = [];
  const max = Math.max(1, Math.min(slide.settings.maxWordsPerSubmit, 10));

  for (const item of words) {
    if (typeof item !== "string") continue;
    const word = normalizeWord(item, slide.settings.maxWordLength);
    if (!word) continue;
    if (slide.settings.profanityFilter && BLOCKED_WORDS.has(word)) continue;
    if (!accepted.includes(word)) accepted.push(word);
    if (accepted.length >= max) break;
  }

  if (accepted.length === 0) {
    return { accepted, error: "Digite pelo menos uma palavra válida." };
  }

  return { accepted, error: "" };
}

function publicSlide(presentation: Presentation, slideId: string) {
  return publicPresentation(presentation).slides.find((s) => s.id === slideId);
}

function resetSlideResults(slide: Slide) {
  slide.words = {};
  slide.votes = {};
  slide.responses = [];
  slide.ratings = {};
  slide.submissions = {};
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true, app: "WordClass" });
  });

  io.on("connection", (socket) => {
    if (isDevelopment) console.log("Client connected:", socket.id);

    socket.on("create_presentation", ({ title, question, template, username, password }, callback) => {
      if (username !== "admin" || password !== "admin") {
        callback?.({ success: false, message: "Login ou senha inválidos." });
        return;
      }

      const code = generateCode();
      const presenterKey = generatePresenterKey();
      const now = Date.now();
      const presentation: Presentation = {
        id: code,
        code,
        title: String(title || "Apresentação sem título").trim().slice(0, 80),
        slides: createTemplateSlides(template, String(question || "Que palavra você quer ver aparecer aqui?").trim().slice(0, 160)),
        currentSlideIndex: 0,
        presenterId: socket.id,
        presenterKey,
        createdAt: now,
        updatedAt: now,
        participantsCount: 0,
        version: "live",
      };

      presentations[presentation.id] = presentation;
      socket.data.presenterFor = presentation.id;
      socket.join(`host_${presentation.id}`);
      callback({ success: true, presentation: publicPresentation(presentation), presenterKey });
    });

    socket.on("presenter_join", ({ code, presenterKey }, callback) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation || presenterKey !== presentation.presenterKey) {
        callback?.({ success: false, message: "Sessão do apresentador não encontrada." });
        return;
      }

      presentation.presenterId = socket.id;
      socket.data.presenterFor = presentation.id;
      socket.join(`host_${presentation.id}`);
      callback?.({ success: true, presentation: publicPresentation(presentation) });
      emitParticipantCount(io, presentation);
    });

    socket.on("join_presentation", ({ code }, callback) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation) {
        callback?.({ success: false, message: "Apresentação não encontrada." });
        return;
      }

      socket.data.viewerFor = presentation.id;
      socket.join(`viewer_${presentation.id}`);
      callback?.({ success: true, presentation: publicPresentation(presentation) });
      emitParticipantCount(io, presentation);
    });

    socket.on("screen_join", ({ code }, callback) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation) {
        callback?.({ success: false, message: "Apresentação não encontrada." });
        return;
      }

      socket.data.screenFor = presentation.id;
      socket.join(`screen_${presentation.id}`);
      callback?.({ success: true, presentation: publicPresentation(presentation) });
      socket.emit("participant_count", { count: presentation.participantsCount });
    });

    socket.on("get_presentation", ({ code }, callback) => {
      const presentation = findPresentation(String(code || ""));
      if (presentation) {
        callback?.({ success: true, presentation: publicPresentation(presentation) });
      } else {
        callback?.({ success: false, message: "Apresentação não encontrada." });
      }
    });

    socket.on("submit_words", ({ code, slideId, words }, callback) => {
      const presentation = findPresentation(String(code || ""));
      const slide = presentation?.slides.find((s) => s.id === slideId);

      if (!presentation || !slide) {
        callback?.({ success: false, message: "Pergunta não encontrada." });
        return;
      }

      const { accepted, error } = validateWords(words, slide, socket.id);
      if (error) {
        callback?.({ success: false, message: error });
        return;
      }

      for (const word of accepted) {
        slide.words[word] = (slide.words[word] || 0) + 1;
      }
      slide.submissions[socket.id] = [...(slide.submissions[socket.id] || []), ...accepted];
      presentation.updatedAt = Date.now();

      liveRoom(io, presentation).emit("word_added", { slideId, words: slide.words });
      liveRoom(io, presentation).emit("slide_updated", { slide: publicSlide(presentation, slideId) });
      callback?.({ success: true, accepted });
    });

    socket.on("submit_response", ({ code, slideId, value, values }, callback) => {
      const presentation = findPresentation(String(code || ""));
      const slide = presentation?.slides.find((s) => s.id === slideId);

      if (!presentation || !slide) {
        callback?.({ success: false, message: "Pergunta não encontrada." });
        return;
      }

      if (!slide.settings.isOpen) {
        callback?.({ success: false, message: "Esta pergunta está fechada para novas respostas." });
        return;
      }

      if (!slide.settings.allowMultipleSubmissions && slide.submissions[socket.id]?.length) {
        callback?.({ success: false, message: "Você já respondeu esta pergunta." });
        return;
      }

      if (slide.type === "wordcloud") {
        const { accepted, error } = validateWords(values || [value], slide, socket.id);
        if (error) {
          callback?.({ success: false, message: error });
          return;
        }
        for (const word of accepted) slide.words[word] = (slide.words[word] || 0) + 1;
        slide.submissions[socket.id] = [...(slide.submissions[socket.id] || []), ...accepted];
      } else if (OPTION_TYPES.has(slide.type)) {
        const selected = String(value || "").trim().slice(0, 120);
        if (!selected || (slide.options.length > 0 && !slide.options.includes(selected))) {
          callback?.({ success: false, message: "Escolha uma opção válida." });
          return;
        }
        slide.votes[selected] = (slide.votes[selected] || 0) + 1;
        slide.submissions[socket.id] = [...(slide.submissions[socket.id] || []), selected];
      } else if (slide.type === "rating-scale") {
        const selected = String(value || "").trim();
        if (!["1", "2", "3", "4", "5"].includes(selected)) {
          callback?.({ success: false, message: "Escolha uma nota de 1 a 5." });
          return;
        }
        slide.ratings[selected] = (slide.ratings[selected] || 0) + 1;
        slide.submissions[socket.id] = [...(slide.submissions[socket.id] || []), selected];
      } else if (TEXT_TYPES.has(slide.type)) {
        const text = String(value || "").trim().replace(/\s+/g, " ").slice(0, 240);
        if (!text) {
          callback?.({ success: false, message: "Digite uma resposta válida." });
          return;
        }
        slide.responses.push(text);
        slide.submissions[socket.id] = [...(slide.submissions[socket.id] || []), text];
      } else if (CONTENT_TYPES.has(slide.type)) {
        callback?.({ success: false, message: "Este slide é apenas informativo." });
        return;
      }

      presentation.updatedAt = Date.now();
      liveRoom(io, presentation).emit("slide_updated", { slide: publicSlide(presentation, slideId) });
      callback?.({ success: true });
    });

    socket.on("change_slide", ({ code, index, presenterKey }) => {
      const presentation = findPresentation(String(code || ""));
      if (
        presentation &&
        isPresenter(socket, presentation, presenterKey) &&
        Number.isInteger(index) &&
        index >= 0 &&
        index < presentation.slides.length
      ) {
        presentation.currentSlideIndex = index;
        presentation.updatedAt = Date.now();
        liveRoom(io, presentation).emit("slide_changed", { index, presentation: publicPresentation(presentation) });
      }
    });

    socket.on("add_slide", ({ code, presenterKey, type }) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation || !isPresenter(socket, presentation, presenterKey)) return;

      presentation.slides.push(createSlide(isSlideType(type) ? type : "wordcloud"));
      presentation.currentSlideIndex = presentation.slides.length - 1;
      presentation.updatedAt = Date.now();
      liveRoom(io, presentation).emit("presentation_updated", { presentation: publicPresentation(presentation) });
    });

    socket.on("add_template", ({ code, presenterKey, template }) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation || !isPresenter(socket, presentation, presenterKey)) return;

      const nextSlides = createTemplateSlides(template, "");
      presentation.slides.push(...nextSlides);
      presentation.currentSlideIndex = Math.max(0, presentation.slides.length - nextSlides.length);
      presentation.updatedAt = Date.now();
      liveRoom(io, presentation).emit("presentation_updated", { presentation: publicPresentation(presentation) });
    });

    socket.on("update_presentation_title", ({ code, presenterKey, title }) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation || !isPresenter(socket, presentation, presenterKey)) return;

      presentation.title = String(title ?? "").slice(0, 80);
      presentation.updatedAt = Date.now();
      liveRoom(io, presentation).emit("presentation_updated", { presentation: publicPresentation(presentation) });
    });

    socket.on("duplicate_slide", ({ code, slideId, presenterKey }) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation || !isPresenter(socket, presentation, presenterKey)) return;

      const slide = presentation.slides.find((s) => s.id === slideId);
      if (!slide) return;

      presentation.slides.push({
        ...createSlide(slide.type, `${slide.question} (cópia)`),
        options: [...slide.options],
        content: slide.content,
        settings: { ...slide.settings },
      });
      presentation.currentSlideIndex = presentation.slides.length - 1;
      presentation.updatedAt = Date.now();
      liveRoom(io, presentation).emit("presentation_updated", { presentation: publicPresentation(presentation) });
    });

    socket.on("delete_slide", ({ code, slideId, presenterKey }) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation || !isPresenter(socket, presentation, presenterKey) || presentation.slides.length <= 1) return;

      const index = presentation.slides.findIndex((s) => s.id === slideId);
      if (index === -1) return;

      presentation.slides.splice(index, 1);
      presentation.currentSlideIndex = Math.min(presentation.currentSlideIndex, presentation.slides.length - 1);
      presentation.updatedAt = Date.now();
      liveRoom(io, presentation).emit("presentation_updated", { presentation: publicPresentation(presentation) });
    });

    socket.on("update_slide", ({ code, slideId, question, options, content, presenterKey }) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation || !isPresenter(socket, presentation, presenterKey)) return;

      const slide = presentation.slides.find((s) => s.id === slideId);
      if (!slide) return;

      if (question !== undefined) slide.question = String(question ?? "").slice(0, 180);
      if (Array.isArray(options)) {
        slide.options = options.map((option) => String(option ?? "").slice(0, 80)).slice(0, 12);
      }
      if (content !== undefined) slide.content = String(content ?? "").slice(0, 1200);
      presentation.updatedAt = Date.now();
      liveRoom(io, presentation).emit("slide_updated", { slide: publicSlide(presentation, slideId) });
    });

    socket.on("remove_word", ({ code, slideId, word, presenterKey }) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation || !isPresenter(socket, presentation, presenterKey)) return;

      const slide = presentation.slides.find((s) => s.id === slideId);
      if (!slide || slide.type !== "wordcloud") return;

      const normalized = normalizeWord(String(word || ""), slide.settings.maxWordLength);
      if (!normalized || !Object.prototype.hasOwnProperty.call(slide.words, normalized)) return;

      delete slide.words[normalized];
      presentation.updatedAt = Date.now();
      liveRoom(io, presentation).emit("word_removed", { slideId, word: normalized, words: slide.words });
      liveRoom(io, presentation).emit("slide_updated", { slide: publicSlide(presentation, slideId) });
    });

    socket.on("trigger_effect", ({ code, presenterKey, effect }) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation || !isPresenter(socket, presentation, presenterKey)) return;

      const allowedEffects = new Set(["confetti", "applause", "drumroll", "cheer"]);
      const selectedEffect = String(effect || "");
      if (!allowedEffects.has(selectedEffect)) return;

      const effectId = generateId();
      const currentSlide = presentation.slides[presentation.currentSlideIndex];
      liveRoom(io, presentation).emit("effect_triggered", { effect: selectedEffect, id: effectId, at: Date.now() });
      if (currentSlide) {
        liveRoom(io, presentation).emit("slide_updated", { slide: publicSlide(presentation, currentSlide.id), effect: selectedEffect, effectId });
      }
    });

    socket.on("update_slide_settings", ({ code, slideId, settings, presenterKey }) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation || !isPresenter(socket, presentation, presenterKey)) return;

      const slide = presentation.slides.find((s) => s.id === slideId);
      if (!slide) return;

      slide.settings = {
        ...slide.settings,
        ...settings,
        maxWordsPerSubmit: Math.max(1, Math.min(Number(settings?.maxWordsPerSubmit ?? slide.settings.maxWordsPerSubmit), 10)),
        maxWordLength: Math.max(10, Math.min(Number(settings?.maxWordLength ?? slide.settings.maxWordLength), 60)),
      };
      presentation.updatedAt = Date.now();
      liveRoom(io, presentation).emit("slide_updated", { slide: publicSlide(presentation, slideId) });
    });

    socket.on("clear_words", ({ code, slideId, presenterKey }) => {
      const presentation = findPresentation(String(code || ""));
      if (!presentation || !isPresenter(socket, presentation, presenterKey)) return;

      const slide = presentation.slides.find((s) => s.id === slideId);
      if (!slide) return;

      resetSlideResults(slide);
      presentation.updatedAt = Date.now();
      liveRoom(io, presentation).emit("words_cleared", { slideId });
      liveRoom(io, presentation).emit("slide_updated", { slide: publicSlide(presentation, slideId) });
    });

    socket.on("disconnect", () => {
      if (isDevelopment) console.log("Client disconnected:", socket.id);
      const presentation = Object.values(presentations).find((p) => p.id === socket.data.viewerFor);
      if (presentation) emitParticipantCount(io, presentation);
    });
  });

  if (isDevelopment) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`WordClass running on http://localhost:${PORT}`);
  });
}

startServer();
