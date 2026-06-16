import QRCode from "react-qr-code";
import type { ReactNode } from "react";
import { BarChart3, Image as ImageIcon, ListChecks, MessageSquareText, QrCode, Star, Trophy } from "lucide-react";
import WordCloudViewer from "./WordCloudViewer";
import type { Slide, SlideType } from "../types";

export const SLIDE_LABELS: Record<SlideType, string> = {
  "pick-answer": "Resposta única",
  "short-answer": "Resposta curta",
  "spinner-wheel": "Roleta",
  "match-pairs": "Pares",
  "correct-order": "Ordem correta",
  categorise: "Categorizar",
  poll: "Votação",
  "open-ended": "Aberta",
  wordcloud: "Nuvem de palavras",
  brainstorm: "Brainstorm",
  "idea-board": "Quadro de ideias",
  "pin-on-image": "Marcar na imagem",
  ranking: "Ranking",
  "rating-scale": "Escala",
  qa: "Perguntas e respostas",
  survey: "Pesquisa",
  content: "Conteúdo",
  heading: "Título",
  list: "Lista",
  diagram: "Diagrama",
  image: "Imagem",
  "qr-code": "QR Code",
  youtube: "YouTube",
  embed: "Embed",
};

export const QUIZ_TYPES: SlideType[] = ["pick-answer", "short-answer", "spinner-wheel", "match-pairs", "correct-order", "categorise"];
export const INTERACTION_TYPES: SlideType[] = ["poll", "open-ended", "wordcloud", "brainstorm", "idea-board", "pin-on-image", "ranking", "rating-scale", "qa", "survey"];
export const CONTENT_TYPES: SlideType[] = ["content", "heading", "list", "diagram", "image", "qr-code", "youtube", "embed"];

const OPTION_TYPES = new Set<SlideType>(["pick-answer", "spinner-wheel", "categorise", "poll", "survey"]);
const TEXT_TYPES = new Set<SlideType>(["short-answer", "open-ended", "brainstorm", "idea-board", "pin-on-image", "ranking", "qa", "match-pairs", "correct-order"]);

export function needsOptions(type: SlideType) {
  return OPTION_TYPES.has(type);
}

export function isTextSlide(type: SlideType) {
  return TEXT_TYPES.has(type);
}

export function totalResponses(slide: Slide) {
  if (slide.type === "wordcloud") return Object.values(slide.words).reduce((sum, value) => sum + value, 0);
  if (slide.type === "rating-scale") return Object.values(slide.ratings).reduce((sum, value) => sum + value, 0);
  if (needsOptions(slide.type)) return Object.values(slide.votes).reduce((sum, value) => sum + value, 0);
  return slide.responses.length;
}

export function SlideVisual({
  slide,
  large = false,
  wordCloudVariant = "balanced",
  onWordClick,
}: {
  slide: Slide;
  large?: boolean;
  wordCloudVariant?: "balanced" | "clustered";
  onWordClick?: (word: string) => void;
}) {
  const words = Object.entries(slide.words).map(([text, value]) => ({ text, value })).sort((a, b) => b.value - a.value);
  const voteEntries = slide.options.map((option) => ({ option, value: slide.votes[option] || 0 }));
  const voteTotal = voteEntries.reduce((sum, item) => sum + item.value, 0);
  const ratingTotal = Object.values(slide.ratings).reduce((sum, value) => sum + value, 0);
  const textSize = large ? "text-3xl" : "text-lg";

  if (slide.type === "wordcloud") {
    return <WordCloudViewer words={words} variant={wordCloudVariant} onWordClick={onWordClick} />;
  }

  if (needsOptions(slide.type)) {
    return (
      <div className="grid h-full content-center gap-4">
        {voteEntries.map((item, index) => {
          const percent = voteTotal ? Math.round((item.value / voteTotal) * 100) : 0;
          return (
            <div key={item.option} className="rounded-2xl border-2 border-[#111827] bg-white p-4 shadow-[5px_5px_0_#111827]">
              <div className="mb-2 flex items-center justify-between gap-4 font-black">
                <span className={`${textSize} text-[#111827]`}>{item.option}</span>
                <span className="text-[#2f6bff]">{item.value}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#f1eadc]">
                <div className="h-full rounded-full bg-[#ff5c35]" style={{ width: `${percent}%` }} />
              </div>
              {large && <p className="mt-1 text-sm font-black text-slate-500">Alternativa {index + 1} · {percent}%</p>}
            </div>
          );
        })}
      </div>
    );
  }

  if (slide.type === "rating-scale") {
    return (
      <div className="grid h-full content-center gap-4">
        {[1, 2, 3, 4, 5].map((rating) => {
          const key = String(rating);
          const value = slide.ratings[key] || 0;
          const percent = ratingTotal ? Math.round((value / ratingTotal) * 100) : 0;
          return (
            <div key={key} className="flex items-center gap-4 rounded-2xl bg-white p-4 font-black shadow-sm">
              <span className="flex w-20 items-center gap-1 text-[#ffb703]"><Star className="h-5 w-5 fill-current" /> {rating}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-[#f1eadc]">
                <div className="h-full rounded-full bg-[#2f6bff]" style={{ width: `${percent}%` }} />
              </div>
              <span className="w-16 text-right text-[#111827]">{value}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (isTextSlide(slide.type)) {
    const icon = slide.type === "ranking" ? <Trophy /> : <MessageSquareText />;
    return (
      <div className="grid h-full content-start gap-3 overflow-hidden">
        {slide.responses.length === 0 ? (
          <EmptyResult icon={icon} label="Aguardando respostas dos alunos" />
        ) : (
          slide.responses.slice(-18).reverse().map((response, index) => (
            <div key={`${response}-${index}`} className="rounded-2xl bg-white px-5 py-4 text-xl font-black text-[#111827] shadow-sm">
              {response}
            </div>
          ))
        )}
      </div>
    );
  }

  if (slide.type === "qr-code") {
    const value = slide.content || "https://wordclass-934a0.web.app";
    return (
      <div className="grid h-full place-items-center">
        <div className="rounded-[2rem] border-2 border-[#111827] bg-white p-8 text-center shadow-[8px_8px_0_#111827]">
          <QRCode value={value} size={large ? 230 : 150} />
          <p className="mt-5 max-w-lg break-all text-lg font-black text-[#111827]">{value}</p>
        </div>
      </div>
    );
  }

  if (slide.type === "list") {
    return (
      <div className="grid h-full content-center gap-4">
        {(slide.content || "").split("\n").filter(Boolean).map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-4 rounded-2xl bg-white px-6 py-5 text-2xl font-black text-[#111827] shadow-sm">
            <ListChecks className="h-7 w-7 text-[#2f6bff]" />
            {item}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid h-full place-items-center text-center">
      <div className="max-w-3xl">
        <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[#9df7d3] text-[#06152b] [&>svg]:h-8 [&>svg]:w-8">
          {slide.type === "image" ? <ImageIcon /> : slide.type === "diagram" ? <BarChart3 /> : slide.type === "embed" ? <QrCode /> : <MessageSquareText />}
        </span>
        <p className={`${large ? "text-5xl" : "text-3xl"} whitespace-pre-line font-black leading-tight text-[#111827]`}>
          {slide.content || SLIDE_LABELS[slide.type]}
        </p>
      </div>
    </div>
  );
}

function EmptyResult({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="grid h-full place-items-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/55 text-center text-slate-400">
      <div>
        <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 [&>svg]:h-7 [&>svg]:w-7">{icon}</span>
        <p className="font-black">{label}</p>
      </div>
    </div>
  );
}
