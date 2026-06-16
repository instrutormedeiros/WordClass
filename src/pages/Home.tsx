import { useState, FormEvent } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  GraduationCap,
  MessageSquareText,
  Play,
  Presentation,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

const tabContent = {
  negócios: {
    title: "Reuniões que saem do monólogo.",
    text: "Abra uma pergunta, capture prioridades do time e transforme percepções soltas em decisões visíveis para todos.",
    stats: ["80% mais participação", "2x mais clareza", "95% recomendam"],
  },
  educação: {
    title: "Aulas com participação de verdade.",
    text: "Faça uma turma inteira responder pelo celular e veja os conceitos mais repetidos ganharem destaque na tela.",
    stats: ["Mais engajamento", "Feedback imediato", "Discussões melhores"],
  },
  eventos: {
    title: "Palco, plateia e tela conectados.",
    text: "Use códigos, QR code e nuvens de palavras para criar momentos participativos em auditórios e transmissões.",
    stats: ["Entrada simples", "Ao vivo", "Visual memorável"],
  },
};

export default function Home() {
  const [code, setCode] = useState("");
  const [activeTab, setActiveTab] = useState<keyof typeof tabContent>("negócios");
  const navigate = useNavigate();

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/\D/g, "").slice(0, 6);
    if (cleanCode.length === 6) {
      navigate(`/join/${cleanCode}`);
    }
  };

  const selected = tabContent[activeTab];

  return (
    <div className="min-h-screen bg-white text-[#06152b] font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <button onClick={() => navigate("/")} className="flex items-center gap-3 font-black text-2xl tracking-tight">
            <span className="grid h-11 w-11 grid-cols-2 gap-1 rounded-xl p-1.5">
              <span className="rounded-full bg-[#2f6bff]" />
              <span className="rounded-tl-full rounded-br-md bg-[#ff5c35]" />
              <span className="rounded-bl-full rounded-tr-md bg-[#28c48f]" />
              <span className="rounded-full bg-[#ffd166]" />
            </span>
            WordClass
          </button>

          <nav className="hidden items-center gap-8 text-sm font-black text-slate-700 lg:flex">
            <a href="#recursos" className="hover:text-[#2f6bff]">Recursos</a>
            <a href="#soluções" className="hover:text-[#2f6bff]">Soluções</a>
            <a href="#como-funciona" className="hover:text-[#2f6bff]">Como funciona</a>
            <a href="#resultados" className="hover:text-[#2f6bff]">Resultados</a>
          </nav>

          <div className="flex items-center gap-3">
            <form onSubmit={handleJoin} className="hidden items-center rounded-full border border-slate-200 bg-slate-50 p-1 md:flex">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Código"
                className="w-28 bg-transparent px-3 py-2 text-sm font-black outline-none placeholder:text-slate-400"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
              />
              <button disabled={code.length !== 6} className="rounded-full bg-[#06152b] px-4 py-2 text-sm font-black text-white disabled:bg-slate-300">
                Entrar
              </button>
            </form>
            <button onClick={() => navigate("/present")} className="rounded-full bg-[#06152b] px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-black">
              Criar apresentação
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_70%_20%,#eef3ff_0,#fff_34%,#fff_100%)]">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:pb-24 lg:pt-20">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-[#2f6bff] shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c48f]" />
                Apresentações interativas em tempo real
              </div>
              <h1 className="text-6xl font-black leading-[0.92] tracking-tight text-[#06152b] sm:text-7xl lg:text-8xl">
                Ouça, aprenda e pense. <span className="text-[#ff5c35]">Juntos.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg font-semibold leading-8 text-slate-700">
                Envolva seu público com perguntas ao vivo, nuvens de palavras e resultados instantâneos que deixam qualquer apresentação mais participativa.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => navigate("/present")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#06152b] px-7 py-4 font-black text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5">
                  Criar apresentação gratuita
                  <ArrowRight className="h-5 w-5" />
                </button>
                <a href="#como-funciona" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-4 font-black text-[#06152b] shadow-sm transition hover:-translate-y-0.5">
                  <Play className="h-5 w-5 fill-[#06152b]" />
                  Ver como funciona
                </a>
              </div>

              <form onSubmit={handleJoin} className="mt-5 flex w-full max-w-md items-center rounded-2xl border-2 border-[#06152b] bg-white p-1.5 shadow-[5px_5px_0_#06152b] md:hidden">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Código do aluno"
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base font-black outline-none placeholder:text-slate-400"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                />
                <button disabled={code.length !== 6} className="rounded-xl bg-[#ff5c35] px-5 py-3 text-sm font-black text-white disabled:bg-slate-300">
                  Entrar
                </button>
              </form>

              <div className="mt-10 grid grid-cols-3 gap-4">
                <MiniStat icon={<Users className="h-5 w-5" />} title="Público" text="Participa de onde estiver" />
                <MiniStat icon={<BarChart3 className="h-5 w-5" />} title="Insights" text="Resultados na hora" />
                <MiniStat icon={<Sparkles className="h-5 w-5" />} title="Simples" text="Crie, apresente e engaje" />
              </div>
            </div>

            <div className="relative">
              <img
                src="/hero-collage.png"
                alt="Interface premium do WordClass com nuvem de palavras, celular do participante e resultados ao vivo"
                className="w-full rounded-[2rem] shadow-2xl shadow-slate-300 ring-1 ring-slate-200"
              />
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-[#f8fafc]">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <p className="text-lg font-black text-[#06152b]">Mais de 500 mil interações podem acontecer em uma única experiência bem conduzida.</p>
            <div className="grid grid-cols-2 gap-3 text-sm font-black text-slate-500 sm:grid-cols-5">
              {["Universidades", "Empresas", "Eventos", "Treinamentos", "Times"].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm">{item}</div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 text-sm font-black uppercase text-[#2f6bff]">Como funciona</p>
            <h2 className="text-4xl font-black tracking-tight sm:text-6xl">Do convite ao insight em poucos cliques.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Step number="01" title="Crie a pergunta" text="Defina o tema, escolha o formato e abra a apresentação com uma pergunta clara." />
            <Step number="02" title="Compartilhe o código" text="O público entra pelo celular usando código ou QR code, sem instalação." />
            <Step number="03" title="Veja tudo ao vivo" text="As respostas aparecem na tela em tempo real, com destaque para o que mais se repete." />
          </div>
        </section>

        <section id="soluções" className="bg-[#06152b] px-5 py-20 text-white sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="mb-3 text-sm font-black uppercase text-[#9df7d3]">Soluções</p>
                <h2 className="text-4xl font-black tracking-tight sm:text-6xl">Feito para engajar qualquer público.</h2>
              </div>
              <div className="flex rounded-2xl bg-white/10 p-1">
                {(Object.keys(tabContent) as Array<keyof typeof tabContent>).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-xl px-5 py-3 text-sm font-black capitalize transition ${activeTab === tab ? "bg-white text-[#06152b]" : "text-white/70 hover:text-white"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[2rem] bg-white p-8 text-[#06152b]">
                <h3 className="text-4xl font-black tracking-tight">{selected.title}</h3>
                <p className="mt-4 text-lg font-semibold leading-8 text-slate-600">{selected.text}</p>
                <div className="mt-8 grid gap-3">
                  {selected.stats.map((stat) => (
                    <div key={stat} className="flex items-center gap-3 rounded-2xl bg-[#f8fafc] px-4 py-4 font-black">
                      <CheckCircle2 className="h-5 w-5 text-[#28c48f]" />
                      {stat}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FeatureCard icon={<MessageSquareText />} title="Nuvens de palavras" text="Perceba rapidamente quais ideias estão dominando a sala." />
                <FeatureCard icon={<Users />} title="Participação fácil" text="Qualquer pessoa entra pelo código e responde em segundos." />
                <FeatureCard icon={<Workflow />} title="Controle do apresentador" text="Pause respostas, edite perguntas e mude slides ao vivo." />
                <FeatureCard icon={<GraduationCap />} title="Discussões melhores" text="Use as palavras como ponto de partida para conversar." />
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="mb-3 text-sm font-black uppercase text-[#ff5c35]">Recursos</p>
              <h2 className="text-4xl font-black tracking-tight sm:text-6xl">A apresentação deixa de ser estática.</h2>
              <p className="mt-5 text-lg font-semibold leading-8 text-slate-600">
                Com o WordClass, o público responde, a tela muda e o apresentador conduz a conversa com dados visuais em tempo real.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Resource title="Login do apresentador" text="Criação protegida por acesso administrativo." />
              <Resource title="QR code e código" text="Entrada simples para quem está na sala ou remoto." />
              <Resource title="Exportação CSV" text="Leve os resultados para relatórios e análises." />
              <Resource title="Filtro e limites" text="Controle quantidade, reenvio e palavras inadequadas." />
            </div>
          </div>
        </section>

        <section id="resultados" className="bg-[#f7f3ea] px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div className="rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200">
              <p className="mb-3 text-sm font-black uppercase text-[#2f6bff]">Resultados ao vivo</p>
              <h2 className="text-4xl font-black tracking-tight">Palavras maiores quando mais gente concorda.</h2>
              <p className="mt-4 text-lg font-semibold leading-8 text-slate-600">
                O visual da nuvem valoriza repetição sem empilhar palavras. Cada resposta ganha espaço próprio, cor e escala.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <BigMetric value="80%" label="mais participação" />
              <BigMetric value="2x" label="mais retenção" />
              <BigMetric value="95%" label="recomendam" />
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl rounded-[2.5rem] bg-[#06152b] px-8 py-14 text-center text-white shadow-2xl shadow-slate-300">
            <h2 className="text-4xl font-black tracking-tight sm:text-6xl">Pronto para ouvir sua audiência?</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/70">
              Crie uma apresentação, compartilhe o código e veja as respostas virarem uma experiência visual.
            </p>
            <button onClick={() => navigate("/present")} className="mt-8 rounded-xl bg-[#ff5c35] px-8 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-[#e94d28]">
              Criar apresentação agora
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function MiniStat({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3ff] text-[#2f6bff]">{icon}</span>
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
      <p className="mb-8 text-5xl font-black text-[#ff5c35]">{number}</p>
      <h3 className="text-2xl font-black">{title}</h3>
      <p className="mt-3 font-semibold leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[2rem] bg-white/10 p-6">
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2f6bff]">{icon}</span>
      <h3 className="text-2xl font-black">{title}</h3>
      <p className="mt-3 font-semibold leading-7 text-white/70">{text}</p>
    </div>
  );
}

function Resource({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">{title}</h3>
      <p className="mt-3 font-semibold leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function BigMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
      <p className="text-4xl font-black text-[#2f6bff]">{value}</p>
      <p className="mt-2 text-sm font-black text-slate-500">{label}</p>
    </div>
  );
}
