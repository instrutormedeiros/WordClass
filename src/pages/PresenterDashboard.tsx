import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpenCheck, BriefcaseBusiness, CheckCircle2, Cloud, LockKeyhole, Loader2, LogOut, Megaphone, PlusCircle, Sparkles } from "lucide-react";
import { socket } from "../socket";

const AUTH_KEY = "wordclass:auth";
const templates = [
  { id: "classroom", title: "Aula interativa", text: "Nuvem, votação, resposta curta e perguntas dos alunos.", icon: <BookOpenCheck className="h-5 w-5" /> },
  { id: "meeting", title: "Reunião de decisão", text: "Prioridades, ranking, escala de alinhamento e próximos passos.", icon: <BriefcaseBusiness className="h-5 w-5" /> },
  { id: "event", title: "Evento ao vivo", text: "Abertura, nuvem, pesquisa rápida e Q&A para o palco.", icon: <Megaphone className="h-5 w-5" /> },
  { id: "blank", title: "Em branco", text: "Comece só com uma nuvem e monte o restante depois.", icon: <Cloud className="h-5 w-5" /> },
] as const;

export default function PresenterDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem(AUTH_KEY) === "true");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("O que vem à sua mente sobre este tema?");
  const [template, setTemplate] = useState<(typeof templates)[number]["id"]>("classroom");
  const [isLoading, setIsLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "admin") {
      localStorage.setItem(AUTH_KEY, "true");
      setIsAuthenticated(true);
      setLoginError("");
      return;
    }
    setLoginError("Login ou senha inválidos.");
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !question.trim()) return;

    setIsLoading(true);
    setCreateError("");
    socket.emit("create_presentation", { title, question, template, username: "admin", password: "admin" }, (response: any) => {
      setIsLoading(false);
      if (response.success) {
        localStorage.setItem(`wordclass:presenter:${response.presentation.code}`, response.presenterKey);
        navigate(`/present/${response.presentation.code}`);
      } else {
        setCreateError(response.message || "Não foi possível criar a apresentação.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#eef2f6] p-4 font-sans text-[#101820] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-row items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-3 font-black text-xl tracking-tight">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101820] text-white shadow-lg shadow-slate-300">
              <Cloud className="h-5 w-5" />
            </span>
            WordClass
          </button>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-black text-slate-700 shadow-sm hover:text-[#101820]">
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            )}
            <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-black text-slate-700 shadow-sm hover:text-[#101820]">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>
        </header>

        {!isAuthenticated ? (
          <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[34px] border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-200 sm:p-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-700">
                <LockKeyhole className="h-4 w-4" />
                Área do apresentador
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">Entre para criar sua apresentação.</h1>
              <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
                Use o acesso administrativo para abrir o painel de criação e controlar as interações ao vivo.
              </p>

              <form onSubmit={handleLogin} className="mt-8 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-black">Login</label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg font-black outline-none transition focus:border-[#2f6bff] focus:bg-white focus:ring-4 focus:ring-[#2f6bff]/10"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-black">Senha</label>
                  <input
                    type="password"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg font-black outline-none transition focus:border-[#2f6bff] focus:bg-white focus:ring-4 focus:ring-[#2f6bff]/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                {loginError && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">{loginError}</p>}
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff5c35] px-6 py-4 text-lg font-black text-white shadow-lg shadow-[#ff5c35]/25 transition hover:-translate-y-0.5 hover:bg-[#e94d28]">
                  <LockKeyhole className="h-5 w-5" />
                  Entrar
                </button>
              </form>
            </section>

            <PresentationPreview question="Perguntas melhores começam com controle." />
          </div>
        ) : (
          <div className="grid items-stretch gap-8 xl:grid-cols-[0.94fr_1.06fr]">
            <section className="rounded-[34px] border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-200 sm:p-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#e7fff5] px-4 py-2 text-sm font-black text-[#16796e]">
                <Sparkles className="h-4 w-4" />
                WordClass 2.0
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">Crie um roteiro interativo completo.</h1>
              <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
                Escolha um modelo, personalize a primeira pergunta e entre direto no painel ao vivo com slides prontos.
              </p>

              <form onSubmit={handleCreate} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800">Nome do evento</label>
                  <input
                    type="text"
                    placeholder="Ex: Workshop de Inovação"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg font-black outline-none transition focus:border-[#2f6bff] focus:bg-white focus:ring-4 focus:ring-[#2f6bff]/10"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={80}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800">Primeira pergunta</label>
                  <textarea
                    placeholder="Ex: Como você resumiria nosso desafio em uma palavra?"
                    className="min-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg font-black outline-none transition focus:border-[#2f6bff] focus:bg-white focus:ring-4 focus:ring-[#2f6bff]/10"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={160}
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-black text-slate-800">Modelo da apresentação</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {templates.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTemplate(item.id)}
                        className={`min-h-32 rounded-2xl border p-4 text-left transition ${template === item.id ? "border-[#2f6bff] bg-[#eef3ff] shadow-lg shadow-[#2f6bff]/10" : "border-slate-200 bg-slate-50 hover:border-[#2f6bff] hover:bg-white"}`}
                      >
                        <span className="mb-3 flex items-center justify-between">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#2f6bff]">{item.icon}</span>
                          {template === item.id && <CheckCircle2 className="h-5 w-5 text-[#101820]" />}
                        </span>
                        <span className="block font-black">{item.title}</span>
                        <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {createError && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">{createError}</p>}
                <button
                  type="submit"
                  disabled={!title.trim() || !question.trim() || isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff5c35] px-6 py-4 text-lg font-black text-white shadow-lg shadow-[#ff5c35]/25 transition hover:-translate-y-0.5 hover:bg-[#e94d28] disabled:translate-y-0 disabled:bg-slate-300 disabled:shadow-none"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
                  Criar e apresentar
                </button>
              </form>
            </section>

            <PresentationPreview question={question || "Sua pergunta aparece aqui"} template={template} />
          </div>
        )}
      </div>
    </div>
  );
}

function PresentationPreview({ question, template = "classroom" }: { question: string; template?: string }) {
  const selected = templates.find((item) => item.id === template) || templates[0];
  return (
    <section className="relative hidden min-h-[640px] overflow-hidden rounded-[34px] border border-slate-200 bg-[#101820] p-6 shadow-2xl shadow-slate-300 lg:block">
      <div className="rounded-[28px] bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="rounded-full bg-[#2f6bff] px-4 py-2 text-xs font-black text-white">Ao vivo</span>
          <span className="font-black text-slate-500">Código 482 901</span>
        </div>
        <h2 className="text-4xl font-black leading-tight">{question}</h2>
        <div className="mt-8 h-80 rounded-[28px] bg-slate-50 p-4">
          <div className="flex h-full flex-wrap items-center justify-center gap-x-6 gap-y-5 overflow-hidden">
            <PreviewWord text="COLABORAÇÃO" className="-rotate-6 text-4xl text-[#2f6bff]" />
            <PreviewWord text="CLAREZA" className="rotate-3 text-3xl text-[#8b5cf6]" />
            <PreviewWord text="IDEIAS" className="rotate-2 text-7xl text-[#ff5c35]" />
            <PreviewWord text="ENERGIA" className="-rotate-3 text-4xl text-[#00a86b]" />
            <PreviewWord text="FOCO" className="rotate-6 text-6xl text-[#101820]" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-3">
          {["Nuvem", "Votação", "Resposta", "Q&A"].map((item, index) => (
            <div key={item} className={`rounded-2xl border px-3 py-4 text-center text-sm font-black ${index === 0 ? "border-[#2f6bff] bg-[#eef3ff] text-[#2f6bff]" : "border-slate-200 bg-white"}`}>
              {item}
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-[#101820] p-4 text-white">
          <p className="text-xs font-black uppercase tracking-widest text-[#9df7d3]">Modelo selecionado</p>
          <p className="mt-1 text-xl font-black">{selected.title}</p>
          <p className="mt-1 text-sm font-semibold text-white/70">{selected.text}</p>
        </div>
      </div>
    </section>
  );
}

function PreviewWord({ text, className }: { text: string; className: string }) {
  return (
    <span className="inline-flex whitespace-nowrap px-6 py-4">
      <span className={`inline-block font-black tracking-normal ${className}`}>{text}</span>
    </span>
  );
}
