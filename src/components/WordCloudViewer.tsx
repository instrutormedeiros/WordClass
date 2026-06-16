import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import cloud from "d3-cloud";
import { MessageCircle } from "lucide-react";

interface WordCloudProps {
  words: { text: string; value: number }[];
  variant?: "balanced" | "clustered";
  onWordClick?: (word: string) => void;
}

interface PackedWord {
  text: string;
  value: number;
  x: number;
  y: number;
  rotate: number;
  size: number;
  color: string;
  width: number;
  height: number;
}

const COLORS = ["#2563eb", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#16a34a", "#f97316", "#ec4899", "#4f46e5"];
const FEATURE_COLORS = ["#2563eb", "#22c55e", "#ef4444", "#8b5cf6", "#f59e0b"];
const ROTATIONS = [-8, -4, 0, 0, 4, 8];
const CLOUD_ROTATIONS = [-90, -90, -90, 0, 0, 0, 0, 90];

function hashWord(text: string) {
  return text.split("").reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

export default function WordCloudViewer({ words, variant = "balanced", onWordClick }: WordCloudProps) {
  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-slate-500 p-8 border-2 border-dashed border-[#101820]/20 rounded-2xl bg-[#f5f2ea]">
        <MessageCircle className="w-16 h-16 mb-4 text-slate-300" />
        <p className="text-xl font-medium text-center">Aguardando participantes...</p>
        <p className="text-sm mt-2 text-center">Nenhuma palavra enviada ainda.</p>
      </div>
    );
  }

  const maxValue = Math.max(...words.map((word) => word.value), 1);
  const minValue = Math.min(...words.map((word) => word.value), 1);
  const range = Math.max(maxValue - minValue, 1);

  if (variant === "clustered") {
    return <PackedWordCloud words={words} maxValue={maxValue} minValue={minValue} range={range} onWordClick={onWordClick} />;
  }

  return (
    <div className="flex h-full w-full min-h-[220px] items-center justify-center overflow-hidden rounded-2xl bg-white p-4">
      <div className="flex max-h-full w-full flex-wrap items-center justify-center gap-x-5 gap-y-4 overflow-hidden px-2 py-4">
        {words.slice(0, 64).map((word, index) => {
          const weight = (word.value - minValue) / range;
          const size = 17 + Math.sqrt(weight || word.value / maxValue) * 44;
          const hash = hashWord(word.text);
          const rotation = ROTATIONS[hash % ROTATIONS.length];
          const color = index < FEATURE_COLORS.length ? FEATURE_COLORS[index] : COLORS[(hash + index) % COLORS.length];

          return (
            <span
              key={word.text}
              className={`inline-flex select-none items-center justify-center whitespace-nowrap px-5 py-4 transition-all duration-300 ${onWordClick ? "cursor-pointer rounded-xl hover:bg-rose-50" : ""}`}
              title={`${word.text}: ${word.value}`}
              onClick={() => onWordClick?.(word.text)}
            >
              <span
                className="inline-block font-black leading-none tracking-normal"
                style={{
                  color,
                  fontSize: `clamp(1rem, ${size}px, 3.6rem)`,
                  transform: `rotate(${rotation}deg)`,
                  textShadow: "0 3px 0 rgba(6, 21, 43, 0.08)",
                }}
              >
                {word.text}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function PackedWordCloud({
  words,
  maxValue,
  minValue,
  range,
  onWordClick,
}: {
  words: { text: string; value: number }[];
  maxValue: number;
  minValue: number;
  range: number;
  onWordClick?: (word: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 900, height: 480 });
  const [placedWords, setPlacedWords] = useState<PackedWord[]>([]);
  const visibleWords = useMemo(() => words.slice(0, 90), [words]);

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSize({
        width: Math.max(320, Math.floor(rect.width)),
        height: Math.max(260, Math.floor(rect.height)),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sortedWords = [...visibleWords].sort((a, b) => b.value - a.value);
    const areaFactor = Math.max(0.82, Math.min(1.26, size.width / 980));
    const cloudBox = {
      width: Math.max(320, Math.floor(size.width * 0.9)),
      height: Math.max(240, Math.floor(size.height * 0.68)),
    };
    const makeLayoutWords = (scale = 1) => sortedWords.map((word, index) => {
      const weight = (word.value - minValue) / range;
      const hash = hashWord(word.text);
      const weightedSize = 17 + Math.pow(weight || word.value / maxValue, 0.58) * 52;
      const featuredBoost = index === 0 ? 1.18 : index === 1 ? 1.08 : index === 2 ? 1 : 0.86;
      const sizePx = weightedSize * featuredBoost * areaFactor * scale;
      return {
        text: word.text,
        value: word.value,
        hash,
        index,
        size: Math.max(13, Math.min(78 * areaFactor * scale, sizePx)),
        color: index < FEATURE_COLORS.length ? FEATURE_COLORS[index] : COLORS[(hash + index) % COLORS.length],
      };
    });

    const randomValues = pseudoRandomSequence(5000, visibleWords.map((word) => `${word.text}:${word.value}`).join("|"));
    let activeLayout: ReturnType<typeof cloud> | null = null;
    const startLayout = (scale: number, attempt: number) => {
      const layoutWords = makeLayoutWords(scale);
      let randomIndex = 0;
      const layout = cloud<typeof layoutWords[number]>()
        .size([cloudBox.width, cloudBox.height])
        .words(layoutWords)
        .padding((word) => Math.max(0, Math.round((word.index < 5 ? 2 : 1) * scale)))
        .font("Arial")
        .fontWeight("800")
        .fontSize((word) => word.size)
        .rotate((word) => {
          if (word.index < 4) return 0;
          return CLOUD_ROTATIONS[(word.hash + word.index) % CLOUD_ROTATIONS.length];
        })
        .spiral("archimedean")
        .random(() => {
          const value = randomValues[randomIndex % randomValues.length];
          randomIndex += 1;
          return value;
        })
        .on("end", (output) => {
          if (cancelled) return;
          if (output.length < layoutWords.length && attempt < 6) {
            startLayout(scale * 0.82, attempt + 1);
            return;
          }
          applyPackedOutput(output);
        });

      activeLayout = layout;
      layout.start();
    };

    const applyPackedOutput = (output: Array<ReturnType<typeof makeLayoutWords>[number] & { x?: number; y?: number; rotate?: number }>) => {
        if (cancelled) return;
        setPlacedWords(
          output.map((word) => ({
            text: word.text || "",
            value: Number(word.value || 1),
            x: Number(word.x || 0),
            y: Number(word.y || 0),
            rotate: Number(word.rotate || 0),
            size: Number(word.size || 18),
            color: word.color,
            width: Number((word as typeof word & { width?: number }).width || 0),
            height: Number((word as typeof word & { height?: number }).height || Number(word.size || 18)),
          })),
        );
    };

    startLayout(1, 0);
    return () => {
      cancelled = true;
      activeLayout?.stop();
    };
  }, [maxValue, minValue, range, size.height, size.width, visibleWords]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * pixelRatio);
    canvas.height = Math.floor(size.height * pixelRatio);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    context.textAlign = "center";
    context.textBaseline = "alphabetic";

    const centerX = size.width / 2;
    const centerY = size.height / 2 + size.height * 0.04;
    for (const word of placedWords) {
      context.save();
      context.translate(centerX + word.x, centerY + word.y);
      context.rotate((word.rotate * Math.PI) / 180);
      context.font = `800 ${word.size}px Arial, sans-serif`;
      context.fillStyle = word.color;
      context.fillText(word.text, 0, 0);
      context.restore();
    }
  }, [placedWords, size.height, size.width]);

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!onWordClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left - size.width / 2,
      y: event.clientY - rect.top - (size.height / 2 + size.height * 0.04),
    };

    for (const word of [...placedWords].reverse()) {
      const angle = (-word.rotate * Math.PI) / 180;
      const dx = point.x - word.x;
      const dy = point.y - word.y;
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
      context.font = `800 ${word.size}px Arial, sans-serif`;
      const measuredWidth = context.measureText(word.text).width;
      const width = Math.max(measuredWidth, word.text.length * word.size * 0.42);
      const top = -word.size * 0.92;
      const bottom = word.size * 0.25;
      if (Math.abs(localX) <= width / 2 && localY >= top && localY <= bottom) {
        onWordClick(word.text);
        break;
      }
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full min-h-[360px] overflow-hidden rounded-2xl bg-white">
      <canvas
        ref={canvasRef}
        className={`h-full w-full ${onWordClick ? "cursor-pointer" : ""}`}
        onClick={handleCanvasClick}
        role="img"
        aria-label="Nuvem de palavras ao vivo"
      />
      <div className="pointer-events-none sr-only">
        {placedWords.map((word) => `${word.text}: ${word.value}`).join(", ")}
      </div>
    </div>
  );
}

function pseudoRandomSequence(length: number, seedText: string) {
  let seed = Math.max(1, hashWord(seedText));
  const values: number[] = [];
  for (let index = 0; index < length; index += 1) {
    seed = (seed * 16807) % 2147483647;
    values.push((seed - 1) / 2147483646);
  }
  return values;
}
