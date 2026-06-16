import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import type { Presentation, Slide, SlideSettings, SlideType } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyAynE2g7mZeoBvi3ZG_m67fLG33I1uY0dk",
  authDomain: "wordclass-934a0.firebaseapp.com",
  projectId: "wordclass-934a0",
  storageBucket: "wordclass-934a0.firebasestorage.app",
  messagingSenderId: "1074086256787",
  appId: "1:1074086256787:web:6c37ffc8f2b0cb71052d66",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type Callback = (payload: any) => void;
type ListenerMap = Map<string, Set<Callback>>;

interface PrivatePresentation extends Presentation {
  presenterKey: string;
  lastEffect?: { effect: string; id: string; at: number };
}

interface LiveResponse {
  id?: string;
  slideId: string;
  type: SlideType;
  value?: string;
  values?: string[];
  createdAt: number;
}

const DEFAULT_SETTINGS: SlideSettings = {
  isOpen: true,
  maxWordsPerSubmit: 3,
  maxWordLength: 30,
  allowMultipleSubmissions: true,
  profanityFilter: true,
  showResultsToAudience: false,
};

const SLIDE_TEMPLATES: Record<SlideType, { question: string; options?: string[]; content?: string }> = {
  "pick-answer": { question: "Qual é a resposta correta?", options: ["Opção A", "Opção B", "Opção C", "Opção D"] },
  "short-answer": { question: "Responda em poucas palavras." },
  "spinner-wheel": { question: "Qual opção a roleta deve escolher?", options: ["Grupo 1", "Grupo 2", "Grupo 3", "Grupo 4"] },
  "match-pairs": { question: "Combine os pares corretos." },
  "correct-order": { question: "Coloque os itens na ordem correta." },
  categorise: { question: "Em qual categoria isso se encaixa?", options: ["Categoria A", "Categoria B", "Categoria C"] },
  poll: { question: "Qual opção você prefere?", options: ["Opção 1", "Opção 2", "Opção 3"] },
  "open-ended": { question: "Compartilhe sua resposta." },
  wordcloud: { question: "Que palavra define este encontro?" },
  brainstorm: { question: "Quais ideias você quer sugerir?" },
  "idea-board": { question: "Publique uma ideia para o grupo." },
  "pin-on-image": { question: "Onde você marcaria sua resposta?" },
  ranking: { question: "Qual item deve ficar no topo?" },
  "rating-scale": { question: "Como você avalia este tema?", options: ["1", "2", "3", "4", "5"] },
  qa: { question: "Qual pergunta você quer fazer?" },
  survey: { question: "Escolha a alternativa da pesquisa.", options: ["Concordo", "Neutro", "Discordo"] },
  content: { question: "Conteúdo", content: "Use este slide para explicar uma ideia importante." },
  heading: { question: "Título do bloco", content: "Subtítulo ou chamada principal." },
  list: { question: "Lista", content: "Primeiro ponto\nSegundo ponto\nTerceiro ponto" },
  diagram: { question: "Diagrama", content: "Entrada -> Processo -> Resultado" },
  image: { question: "Imagem", content: "Adicione aqui uma legenda ou URL de imagem." },
  "qr-code": { question: "QR Code", content: "https://wordclass-934a0.web.app" },
  youtube: { question: "Vídeo", content: "Cole aqui o link do YouTube." },
  embed: { question: "Embed", content: "Cole aqui o conteúdo incorporado." },
};

const DECK_TEMPLATES: Record<string, Array<{ type: SlideType; question?: string; options?: string[]; content?: string }>> = {
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

const BLOCKED_WORDS = new Set(["MERDA", "PORRA", "CARALHO", "FUCK", "SHIT", "BITCH"]);

function randomId() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2);
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createSlide(type: SlideType = "wordcloud", question?: string): Slide {
  const template = SLIDE_TEMPLATES[type];
  return {
    id: randomId(),
    type,
    question: String(question || template.question).slice(0, 180),
    words: {},
    options: [...(template.options || [])],
    votes: {},
    responses: [],
    ratings: {},
    content: template.content || "",
    settings: { ...DEFAULT_SETTINGS },
  };
}

function createTemplateSlides(template: string, fallbackQuestion: string) {
  if (template === "blank") return [createSlide("wordcloud", fallbackQuestion)];
  const selected = DECK_TEMPLATES[template] || DECK_TEMPLATES.classroom;
  return selected.map((item, index) => {
    const slide = createSlide(item.type, index === 0 && fallbackQuestion ? fallbackQuestion : item.question);
    if (item.options) slide.options = [...item.options];
    if (item.content) slide.content = item.content;
    return slide;
  });
}

function publicPresentation(presentation: PrivatePresentation): Presentation {
  const { presenterKey: _presenterKey, lastEffect: _lastEffect, ...safePresentation } = presentation;
  return safePresentation;
}

function normalizeWord(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 60);
}

function isBlocked(value: string) {
  return BLOCKED_WORDS.has(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase());
}

function presentationRef(code: string) {
  return doc(db, "presentations", code);
}

function responsesRef(code: string) {
  return collection(db, "presentations", code, "responses");
}

async function readPresentation(code: string): Promise<PrivatePresentation | null> {
  const snapshot = await getDoc(presentationRef(code));
  return snapshot.exists() ? (snapshot.data() as PrivatePresentation) : null;
}

class FirebaseSocket {
  private listeners: ListenerMap = new Map();
  private unsubscribers = new Map<string, () => void>();
  private lastPresentationByCode = new Map<string, PrivatePresentation>();
  private responsesByCode = new Map<string, LiveResponse[]>();
  private lastEffectIdByCode = new Map<string, string>();

  on(event: string, callback: Callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback?: Callback) {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, payload: any, callback?: Callback) {
    this.handle(event, payload || {}, callback).catch((error) => {
      callback?.({ success: false, message: error?.message || "Não foi possível concluir a ação." });
    });
  }

  private fire(event: string, payload: any) {
    this.listeners.get(event)?.forEach((callback) => callback(payload));
  }

  private subscribe(code: string) {
    if (this.unsubscribers.has(code)) return;
    const unsubscribePresentation = onSnapshot(presentationRef(code), (snapshot) => {
      if (!snapshot.exists()) return;
      const next = snapshot.data() as PrivatePresentation;
      this.lastPresentationByCode.set(code, next);
      this.publish(code);
    });
    const unsubscribeResponses = onSnapshot(responsesRef(code), (snapshot) => {
      const responses = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<LiveResponse, "id">) }));
      responses.sort((a, b) => a.createdAt - b.createdAt);
      this.responsesByCode.set(code, responses);
      this.publish(code);
    });
    this.unsubscribers.set(code, () => {
      unsubscribePresentation();
      unsubscribeResponses();
    });
  }

  private publish(code: string) {
    const basePresentation = this.lastPresentationByCode.get(code);
    if (!basePresentation) return;
    const previous = this.lastPresentationByCode.get(`${code}:published`);
    const next = this.withAggregatedResponses(basePresentation, this.responsesByCode.get(code) || []);
    this.lastPresentationByCode.set(`${code}:published`, next);
    const safe = publicPresentation(next);
    this.fire("presentation_updated", { presentation: safe });
    this.fire("participant_count", { count: next.participantsCount || 0 });

    if (!previous || previous.currentSlideIndex !== next.currentSlideIndex) {
      this.fire("slide_changed", { index: next.currentSlideIndex, presentation: safe });
    }

    next.slides.forEach((slide, index) => {
      const oldSlide = previous?.slides[index];
      if (!oldSlide || JSON.stringify(oldSlide) !== JSON.stringify(slide)) {
        this.fire("slide_updated", { slide });
        if (JSON.stringify(oldSlide?.words || {}) !== JSON.stringify(slide.words || {})) {
          this.fire("word_added", { slideId: slide.id, words: slide.words || {} });
          this.fire("word_removed", { slideId: slide.id, words: slide.words || {} });
        }
      }
    });

    if (next.lastEffect?.id && this.lastEffectIdByCode.get(code) !== next.lastEffect.id) {
      this.lastEffectIdByCode.set(code, next.lastEffect.id);
      this.fire("effect_triggered", next.lastEffect);
    }
  }

  private withAggregatedResponses(presentation: PrivatePresentation, responses: LiveResponse[]): PrivatePresentation {
    const slides = presentation.slides.map((slide) => ({
      ...slide,
      words: { ...slide.words },
      votes: { ...slide.votes },
      responses: [...slide.responses],
      ratings: { ...slide.ratings },
    }));

    responses.forEach((response) => {
      const index = slides.findIndex((slide) => slide.id === response.slideId);
      if (index < 0) return;
      const slide = slides[index];
      if (response.type === "wordcloud") {
        (response.values || []).forEach((word) => {
          slide.words[word] = (slide.words[word] || 0) + 1;
        });
        return;
      }
      const value = response.value || response.values?.[0] || "";
      if (!value) return;
      if (response.type === "rating-scale") {
        slide.ratings[value] = (slide.ratings[value] || 0) + 1;
        return;
      }
      if (slide.options.length > 0) {
        slide.votes[value] = (slide.votes[value] || 0) + 1;
        return;
      }
      slide.responses = [...slide.responses, value].slice(-300);
    });

    return { ...presentation, slides };
  }

  private async handle(event: string, payload: any, callback?: Callback) {
    const code = String(payload.code || "");
    if (["presenter_join", "join_presentation", "screen_join", "get_presentation"].includes(event)) {
      const presentation = await readPresentation(code);
      if (!presentation) {
        callback?.({ success: false, message: "Código não encontrado." });
        return;
      }
      if (event === "presenter_join" && payload.presenterKey !== presentation.presenterKey) {
        callback?.({ success: false, message: "Acesso do apresentador inválido." });
        return;
      }
      await this.markParticipant(code, event);
      this.subscribe(code);
      callback?.({ success: true, presentation: publicPresentation(this.withAggregatedResponses(presentation, this.responsesByCode.get(code) || [])) });
      return;
    }

    if (event === "create_presentation") {
      if (payload.username !== "admin" || payload.password !== "admin") {
        callback?.({ success: false, message: "Login ou senha inválidos." });
        return;
      }
      let newCode = generateCode();
      while ((await getDoc(presentationRef(newCode))).exists()) newCode = generateCode();
      const presenterKey = randomId() + randomId();
      const now = Date.now();
      const presentation: PrivatePresentation = {
        id: randomId(),
        code: newCode,
        title: String(payload.title || "WordClass").slice(0, 80),
        slides: createTemplateSlides(String(payload.template || "classroom"), String(payload.question || "")),
        currentSlideIndex: 0,
        presenterId: "admin",
        presenterKey,
        createdAt: now,
        updatedAt: now,
        participantsCount: 0,
        version: "live",
      };
      await setDoc(presentationRef(newCode), { ...presentation, createdAtServer: serverTimestamp() });
      this.subscribe(newCode);
      callback?.({ success: true, presentation: publicPresentation(presentation), presenterKey });
      return;
    }

    if (event === "submit_response" || event === "submit_words") {
      await this.submitResponse(payload, callback);
      return;
    }

    await this.presenterAction(event, payload, callback);
  }

  private async markParticipant(code: string, event: string) {
    if (event !== "join_presentation") return;
    const key = `wordclass:participant:${code}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, randomId());
    await updateDoc(presentationRef(code), { participantsCount: increment(1), updatedAt: Date.now() }).catch(() => undefined);
  }

  private async presenterAction(event: string, payload: any, callback?: Callback) {
    const code = String(payload.code || "");
    const ref = presentationRef(code);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error("Código não encontrado.");
      const presentation = snapshot.data() as PrivatePresentation;
      if (payload.presenterKey !== presentation.presenterKey) throw new Error("Acesso do apresentador inválido.");

      let slides = [...presentation.slides];
      let currentSlideIndex = presentation.currentSlideIndex;
      const slideIndex = slides.findIndex((slide) => slide.id === payload.slideId);
      const currentSlide = slideIndex >= 0 ? slides[slideIndex] : slides[currentSlideIndex];

      if (event === "change_slide") currentSlideIndex = Math.max(0, Math.min(Number(payload.index || 0), slides.length - 1));
      if (event === "add_slide") slides = [...slides, createSlide(payload.type)];
      if (event === "add_template") slides = [...slides, ...createTemplateSlides(String(payload.template || "classroom"), "")];
      if (event === "duplicate_slide" && currentSlide) slides = [...slides, { ...currentSlide, id: randomId(), question: `${currentSlide.question} (cópia)` }];
      if (event === "delete_slide" && slides.length > 1) {
        slides = slides.filter((slide) => slide.id !== payload.slideId);
        currentSlideIndex = Math.min(currentSlideIndex, slides.length - 1);
      }
      if (event === "update_slide" && currentSlide) {
        slides = slides.map((slide) =>
          slide.id === currentSlide.id
            ? {
                ...slide,
                question: payload.question === undefined ? slide.question : String(payload.question),
                options: Array.isArray(payload.options) ? payload.options.map(String) : slide.options,
                content: payload.content === undefined ? slide.content : String(payload.content),
              }
            : slide,
        );
      }
      if (event === "update_slide_settings" && currentSlide) {
        slides = slides.map((slide) => (slide.id === currentSlide.id ? { ...slide, settings: { ...slide.settings, ...payload.settings } } : slide));
      }
      if (event === "clear_words" && currentSlide) {
        slides = slides.map((slide) => (slide.id === currentSlide.id ? { ...slide, words: {}, votes: {}, responses: [], ratings: {} } : slide));
      }
      if (event === "remove_word" && currentSlide) {
        const word = String(payload.word || "");
        slides = slides.map((slide) => {
          if (slide.id !== currentSlide.id) return slide;
          const nextWords = { ...slide.words };
          delete nextWords[word];
          return { ...slide, words: nextWords };
        });
      }

      const update: Partial<PrivatePresentation> = { slides, currentSlideIndex, updatedAt: Date.now() };
      if (event === "update_presentation_title") update.title = String(payload.title || "");
      if (event === "trigger_effect") update.lastEffect = { effect: String(payload.effect || "confetti"), id: randomId(), at: Date.now() };
      transaction.update(ref, update);
    });
    if (event === "clear_words") await this.deleteResponses(String(payload.code || ""), String(payload.slideId || ""));
    if (event === "remove_word") await this.deleteWordResponses(String(payload.code || ""), String(payload.slideId || ""), String(payload.word || ""));
    callback?.({ success: true });
  }

  private async submitResponse(payload: any, callback?: Callback) {
    const code = String(payload.code || "");
    const presentation = await readPresentation(code);
    if (!presentation) throw new Error("Código não encontrado.");
    const slide = presentation.slides.find((item) => item.id === payload.slideId) || presentation.slides[presentation.currentSlideIndex];
    if (!slide?.settings.isOpen) throw new Error("O apresentador pausou novas respostas.");
    const response = this.prepareResponse(slide, payload);
    if (!response) throw new Error("Nada para enviar.");
    await addDoc(responsesRef(code), { ...response, createdAtServer: serverTimestamp() });
    callback?.({ success: true });
  }

  private prepareResponse(slide: Slide, payload: any): Omit<LiveResponse, "id"> | null {
    const value = String(payload.value || "").trim();
    const values = Array.isArray(payload.values) ? payload.values.map(String) : value ? [value] : [];
    if (slide.type === "wordcloud") {
      const cleanWords = values
        .map(normalizeWord)
        .filter(Boolean)
        .filter((word) => !slide.settings.profanityFilter || !isBlocked(word))
        .slice(0, slide.settings.maxWordsPerSubmit);
      if (cleanWords.length === 0) return null;
      return { slideId: slide.id, type: slide.type, values: cleanWords, createdAt: Date.now() };
    }
    if (!value) return null;
    return { slideId: slide.id, type: slide.type, value, createdAt: Date.now() };
  }

  private async deleteResponses(code: string, slideId: string) {
    const snapshot = await getDocs(responsesRef(code));
    await Promise.all(snapshot.docs.filter((item) => item.data().slideId === slideId).map((item) => deleteDoc(item.ref)));
  }

  private async deleteWordResponses(code: string, slideId: string, word: string) {
    const snapshot = await getDocs(responsesRef(code));
    await Promise.all(
      snapshot.docs
        .filter((item) => item.data().slideId === slideId && Array.isArray(item.data().values) && item.data().values.includes(word))
        .map((item) => deleteDoc(item.ref)),
    );
  }
}

export const socket = new FirebaseSocket();
