# WordClass 2.0

Aplicação de apresentações interativas em tempo real para aulas, reuniões e eventos. O apresentador cria uma sala, compartilha código ou QR code e o público participa pelo celular.

## O que existe na versão 2.0

- Login do apresentador em `/present` com usuário `admin` e senha `admin`.
- Modelos prontos para aula, reunião, evento ou apresentação em branco.
- Painel do administrador em `/present/:codigo`.
- Tela dos alunos em `/join/:codigo`.
- Tela de telão em `/screen/:codigo`.
- Biblioteca de tipos de slide inspirada em ferramentas profissionais: quiz, votação, resposta aberta, resposta curta, nuvem de palavras, brainstorm, ranking, escala, Q&A, pesquisa e slides de conteúdo.
- Respostas ao vivo via Socket.IO.
- Nuvem de palavras sem sobreposição, com tamanho maior conforme repetição.
- Roteiros prontos que adicionam vários slides de uma vez.
- Título da apresentação editável.
- Contador de participantes.
- QR code e link de entrada.
- Configurações por slide: abrir/pausar respostas, limite de entradas, reenvio, filtro de linguagem e exibição de resultados ao público.
- Exportação dos resultados em CSV.

## Como funciona

1. O administrador acessa `/present`, faz login e escolhe um modelo.
2. Os alunos entram pelo código em `/join/:codigo`.
3. O telão exibe a apresentação em `/screen/:codigo`.
4. Cada resposta atualiza o painel e o telão em tempo real.
5. O administrador troca slides, edita perguntas, adiciona tipos e limpa resultados.

## Rodar localmente

```bash
npm install
npm run dev
```

Depois, abra:

- Site: `http://localhost:3000`
- Apresentador: `http://localhost:3000/present`
- Aluno: `http://localhost:3000/join/SEU_CODIGO`
- Telão: `http://localhost:3000/screen/SEU_CODIGO`

## Comandos

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Publicação gratuita no Firebase

Este projeto está preparado para o Firebase `wordclass-934a0` usando apenas recursos do plano Spark, sem cartão e sem Blaze.

A publicação usa:

- Firebase Hosting: entrega o site no endereço `https://wordclass-934a0.web.app`.
- Cloud Firestore: sincroniza as apresentações, respostas e telão em tempo real.
- GitHub: versionamento do projeto.

Com Firebase CLI instalado e autenticado, publique com:

```bash
npm run build
npm run deploy:hosting
```

Não é usado Cloud Run, Cloud Functions ou App Hosting, porque esses caminhos exigem conta de faturamento.
