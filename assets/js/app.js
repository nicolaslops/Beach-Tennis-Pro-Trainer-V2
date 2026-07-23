"use strict";

const APP_KEYS = {
  favorites: "btpt_favorite_exercises",
  favoritePlans: "btpt_favorite_plans",
  currentWorkout: "btpt_current_workout",
  savedWorkouts: "btpt_saved_workouts",
  audioPrefs: "btpt_audio_prefs",
  theme: "btpt_theme"
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function compactSearchText(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function matchesSearchFields(fields, search) {
  const query = normalizeText(search);
  if (!query) return true;
  const compactQuery = compactSearchText(search);
  const source = safeArray(fields).join(" ");
  const blob = normalizeText(source);
  const compactBlob = compactSearchText(source);
  return blob.includes(query) || Boolean(compactQuery && compactBlob.includes(compactQuery));
}

function titleCase(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function levelRank(value) {
  const level = normalizeText(value);
  if (level.includes("iniciante")) return 1;
  if (level.includes("intermediario")) return 2;
  if (level.includes("avancado")) return 3;
  return 99;
}

function compareByLevelOrder(a, b) {
  return levelRank(a && a.nivel) - levelRank(b && b.nivel);
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function uniqueValues(items, selector) {
  return Array.from(new Set(items.map(selector).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), "pt-BR")
  );
}

function sumValues(items, selector) {
  return items.reduce((total, item) => total + Number(selector(item) || 0), 0);
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item) || "Sem categoria";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function safeArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function safeFilename(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70) || "beach-tennis-pro-trainer";
}

function resolvePublicAsset(path) {
  const value = String(path || "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/") && window.location.protocol === "file:") return `.${value}`;
  return value;
}

function exerciseImageSrc(exercise) {
  return "";
}

function neutralizeInstruction(value) {
  return String(value || "")
    .replace(/\b[oO]\s+professor\s+deve\s+conduzir\b/g, "Em aulas com professor, conduza")
    .replace(/\b[oO]\s+professor\s+deve\b/g, "Em aulas com professor, o treinador pode")
    .replace(/\b[oO]\s+aluno\s+deve\s+obedecer\b/g, "Quem está treinando deve seguir")
    .replace(/\b[oO]\s+aluno\s+deve\b/g, "Quem está treinando deve")
    .replace(/\b[eE]ste exercício foi pensado para o professor\b/g, "Use este treino")
    .replace(/\b[pP]eça ao aluno\b/g, "Oriente quem está treinando")
    .replace(/\b[aA]luno\b/g, "praticante")
    .replace(/\s+/g, " ")
    .trim();
}

function getShortObjective(objetivo, limit = 220) {
  const text = neutralizeInstruction(objetivo);
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  const sentenceEnd = Math.max(slice.lastIndexOf("."), slice.lastIndexOf(";"), slice.lastIndexOf(","));
  const end = sentenceEnd > 110 ? sentenceEnd + 1 : slice.lastIndexOf(" ");
  return `${slice.slice(0, end > 80 ? end : limit).trim()}...`;
}

function displayObjectiveText(objetivo) {
  return sentenceStart(neutralizeInstruction(objetivo));
}

function lessonFocusDescription(plan) {
  const text = normalizeText([plan.nome, plan.objetivo_principal, plan.publico].join(" "));
  if (text.includes("saque") && text.includes("recepc")) return "saque, leitura da recep\u00e7\u00e3o e primeira organiza\u00e7\u00e3o depois da bola inicial";
  if (text.includes("saque")) return "rotina de saque, escolha de alvo e prepara\u00e7\u00e3o para a primeira cobertura";
  if (text.includes("recepc")) return "recep\u00e7\u00e3o, controle da devolu\u00e7\u00e3o e recupera\u00e7\u00e3o da posi\u00e7\u00e3o depois do contato";
  if (text.includes("voleio")) return "voleio, controle de dire\u00e7\u00e3o e estabilidade perto da rede";
  if (text.includes("bandeja")) return "bandeja, recuo equilibrado e devolu\u00e7\u00e3o com margem para reorganizar a dupla";
  if (text.includes("smash")) return "smash, ajuste corporal e finaliza\u00e7\u00e3o segura sem perder cobertura";
  if (text.includes("defesa")) return "defesa, leitura da bola forte e resposta alta para recuperar tempo no ponto";
  if (text.includes("ataque")) return "ataque controlado, sele\u00e7\u00e3o de bola e continuidade da cobertura depois da acelera\u00e7\u00e3o";
  if (text.includes("dupla") || text.includes("comunic")) return "comunica\u00e7\u00e3o da dupla, divis\u00e3o de responsabilidades e ocupa\u00e7\u00e3o correta dos espa\u00e7os";
  if (text.includes("grupo") || text.includes("rotacao") || text.includes("circuito")) return "organiza\u00e7\u00e3o em grupo, rota\u00e7\u00e3o eficiente e alto tempo de pr\u00e1tica com pouca fila";
  if (text.includes("deslocamento") || text.includes("movimenta")) return "movimenta\u00e7\u00e3o na areia, base de espera e recupera\u00e7\u00e3o r\u00e1pida entre uma bola e outra";
  if (text.includes("tatico") || text.includes("jogo") || text.includes("ponto")) return "tomada de decis\u00e3o, padr\u00f5es t\u00e1ticos e aplica\u00e7\u00e3o do fundamento em situa\u00e7\u00f5es reais de ponto";
  if (text.includes("condicionamento") || text.includes("fisic")) return "condicionamento espec\u00edfico na areia, resist\u00eancia de deslocamento e qualidade t\u00e9cnica sob fadiga";
  return "fundamentos do Beach Tennis, controle de bola e aplica\u00e7\u00e3o progressiva em situa\u00e7\u00f5es parecidas com jogo";
}

function buildDetailedLessonObjective(plan) {
  const level = titleCase(plan.nivel || "treino");
  const audience = plan.publico || "praticantes";
  const focus = lessonFocusDescription(plan);
  const blocks = safeArray(plan.estrutura_da_aula)
    .map((block) => block.bloco)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ")
    .toLowerCase();
  const result = neutralizeInstruction(plan.resultado_esperado || "")
    .replace(/^Ao final,?\s*/i, "")
    .replace(/^Quem está treinando/i, "quem est\u00e1 treinando");
  const base = `Desenvolver ${focus} em uma aula de n\u00edvel ${level.toLowerCase()} para ${audience}, usando uma sequ\u00eancia pr\u00e1tica com ${blocks || "aquecimento, parte t\u00e9cnica e aplica\u00e7\u00e3o em jogo"}.`;
  const value = `O plano orienta o professor e o aluno a entenderem o que praticar, como medir a evolu\u00e7\u00e3o e quando aumentar a dificuldade, sempre preservando seguran\u00e7a, ritmo e qualidade de execu\u00e7\u00e3o.`;
  const expected = result ? `Resultado esperado: ${result.charAt(0).toLowerCase()}${result.slice(1)}` : "Resultado esperado: maior consist\u00eancia, menos erros n\u00e3o for\u00e7ados e mais clareza para aplicar o fundamento em jogo.";
  return `${base} ${value} ${expected}`;
}

function getAudioScript(exercicio) {
  const objective = getShortObjective(exercicio.objetivo, 150).replace(/\.\.\.$/, ".");
  const firstStep = neutralizeInstruction(safeArray(exercicio.passo_a_passo)[0] || "Comece em ritmo leve e mantenha controle do corpo.");
  const safety = neutralizeInstruction(safeArray(exercicio.cuidados_de_seguranca)[0] || "Não tenha pressa: primeiro faça o movimento certo, depois aumente a velocidade.");
  return [
    objective ? `Neste treino, o foco é ${objective.charAt(0).toLowerCase()}${objective.slice(1)}` : "",
    firstStep,
    safety,
    "Execute com atenção e pare se sentir desconforto."
  ].filter(Boolean).join(" ");
}

function cleanTextForSpeech(text) {
  return neutralizeInstruction(text)
    .replace(/\b[oO]\s+professor\s+deve\b/g, "Em aula com professor, o treinador pode")
    .replace(/\b[oO]\s+aluno\s+deve\b/g, "Quem est\u00e1 treinando deve")
    .replace(/\b[eE]xecute o exerc\u00edcio\b/g, "Fa\u00e7a o exerc\u00edcio")
    .replace(/\b[rR]ealize o movimento\b/g, "Fa\u00e7a o movimento")
    .replace(/\b[dD]eslocar-se\b/g, "se mover")
    .replace(/\b[eE]fetuar\b/g, "fazer")
    .replace(/\b[cC]onduzir a atividade\b/g, "organizar o treino")
    .replace(/\b[oO]bjetivando\b/g, "com o objetivo de")
    .replace(/\s*[,;]\s*/g, ", ")
    .replace(/\s*:\s*/g, ": ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

function sentenceStart(text) {
  const value = cleanTextForSpeech(text);
  if (!value) return "";
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function sentenceLimit(text, limit = 120) {
  const value = cleanTextForSpeech(text);
  if (value.length <= limit) return value;
  const slice = value.slice(0, limit);
  const sentenceEnd = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
  if (sentenceEnd > 70) return slice.slice(0, sentenceEnd + 1).trim();
  const softEnd = Math.max(slice.lastIndexOf(","), slice.lastIndexOf(";"));
  if (softEnd > 70) return `${slice.slice(0, softEnd).trim()}.`;
  const wordEnd = slice.lastIndexOf(" ");
  return `${slice.slice(0, wordEnd > 70 ? wordEnd : limit).trim()}.`;
}

function speechSentence(text) {
  const value = cleanTextForSpeech(text);
  if (!value) return "";
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function simplifyObjective(objetivo) {
  const text = cleanTextForSpeech(objetivo)
    .replace(/^o objetivo (deste|desse) treino (e|\u00e9)\s*/i, "")
    .replace(/^desenvolver\s+/i, "desenvolver ");
  return sentenceLimit(text, 125);
}

function firstObjectiveSentence(objetivo, limit = 185) {
  const text = cleanTextForSpeech(objetivo)
    .replace(/^o objetivo (deste|desse) treino (e|\u00e9)\s*/i, "")
    .replace(/^desenvolver\s+/i, "desenvolver ");
  if (!text) return "";
  const firstEnd = text.search(/[.!?]/);
  if (firstEnd > 50 && firstEnd <= limit) return text.slice(0, firstEnd + 1).trim();
  return sentenceLimit(text, limit).replace(/\s+(de|da|do|dos|das|sem|para|com|em)\.$/i, ".");
}

function getMainStep(exercicio) {
  return sentenceLimit(safeArray(exercicio && exercicio.passo_a_passo)[0] || "em posi\u00e7\u00e3o equilibrada, com aten\u00e7\u00e3o no corpo e na bola", 125);
}

function getMainAction(exercicio) {
  const steps = safeArray(exercicio && exercicio.passo_a_passo);
  return sentenceLimit(steps[1] || steps[0] || "mantenha o movimento simples, controlado e bem organizado", 135);
}

function getMainTip(exercicio) {
  const tips = [
    ...safeArray(exercicio && exercicio.dicas),
    ...safeArray(exercicio && exercicio.dicas_tecnicas)
  ];
  return sentenceLimit(tips[0] || "", 115);
}

function getMainSafetyTip(exercicio) {
  return sentenceLimit(safeArray(exercicio && exercicio.cuidados_de_seguranca)[0] || "respeite seu limite e pare se sentir dor ou desconforto", 120);
}

function participantRoleCue(exercise) {
  const context = exerciseContext(exercise);
  const primary = exercisePrimaryContext(exercise);
  const noBall = normalizeText(exercise && exercise.tipo).includes("sem bola") || context.includes("sem bola");
  const hasGroup = primary.includes("grupo") || primary.includes("rodizio") || primary.includes("fila") || primary.includes("circuito") || primary.includes("estacao");
  const hasOpponent = primary.includes("adversario") || primary.includes("oponente") || primary.includes("jogo condicionado");
  const hasDoubles = primary.includes("dupla") || primary.includes("tatica") || primary.includes("posicionamento") || primary.includes("cobertura") || primary.includes("minha ou sua");
  const hasSupport = context.includes("professor") || context.includes("apoio") || context.includes("envio") || context.includes("lancamento") || context.includes("lancar") || context.includes("alimentacao");

  if (hasGroup) {
    return noBall
      ? "Papéis: um praticante executa a repetição, os demais aguardam fora da área de movimento e entram em rodízio somente quando houver espaço seguro."
      : "Papéis: o praticante ativo executa o golpe, o professor ou parceiro envia a bola com controle e os demais aguardam em fila lateral, entrando em rodízio depois da repetição.";
  }
  if (hasDoubles && hasOpponent) {
    return "Papéis: A1 executa a bola principal, A2 protege o espaço livre da dupla, e O1/O2 representam a referência adversária para deixar claro para onde a bola deve ir.";
  }
  if (hasDoubles) {
    return "Papéis: A1 executa a ação principal e A2 acompanha em cobertura, comunicando antes da bola e voltando junto para a base depois da repetição.";
  }
  if (!noBall && hasSupport) {
    return "Papéis: o professor ou parceiro envia a bola de forma controlada, enquanto o praticante ajusta os pés, executa o fundamento e devolve para o alvo combinado.";
  }
  if (!noBall && ["recepcao", "voleio", "bandeja", "smash", "defesa"].includes(animationKind(exercise))) {
    return "Papéis: uma pessoa envia a bola com controle e o praticante executa o fundamento, priorizando ajuste de pés, contato equilibrado e devolução para o alvo.";
  }
  return "";
}

function buildPremiumLessonObjective(plan) {
  const level = titleCase(plan.nivel || "treino");
  const audience = plan.publico || "praticantes";
  const focus = lessonFocusDescription(plan);
  const blocks = safeArray(plan.estrutura_da_aula)
    .map((block) => block.bloco)
    .filter(Boolean)
    .slice(0, 4)
    .join(", ")
    .toLowerCase();
  const blockDescriptions = safeArray(plan.estrutura_da_aula)
    .map((block) => neutralizeInstruction(block.descricao))
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
  const relatedExercises = [...new Set(safeArray(plan.estrutura_da_aula).flatMap((block) => safeArray(block.exercicios_relacionados)))]
    .slice(0, 6)
    .join(", ");
  const result = neutralizeInstruction(plan.resultado_esperado || "")
    .replace(/^Ao final,?\s*/i, "")
    .replace(/^Quem está treinando/i, "quem está treinando");
  const base = `Este plano tem como objetivo desenvolver ${focus} em uma aula de nível ${level.toLowerCase()} para ${audience}, com uma progressão organizada por ${blocks || "aquecimento, parte técnica, aplicação tática e desafio final"}.`;
  const method = blockDescriptions ? `Os blocos foram organizados para que o praticante comece entendendo o padrão de movimento, avance para repetições com alvo claro e termine aplicando a habilidade em uma situação próxima do jogo: ${blockDescriptions}` : "Os blocos foram organizados para transformar repetição técnica em aplicação prática, sem perder controle, segurança e tomada de decisão.";
  const exercises = relatedExercises ? `Os exercícios relacionados (${relatedExercises}) aparecem nessa ordem para criar uma escada de aprendizagem: primeiro controle e leitura, depois execução com melhor posicionamento e, por fim, transferência para pontuação ou jogo condicionado.` : "Os exercícios aparecem em sequência para criar uma escada de aprendizagem: primeiro controle e leitura, depois posicionamento e, por fim, aplicação em jogo.";
  const expected = result ? `Resultado esperado: ${result.charAt(0).toLowerCase()}${result.slice(1)}` : "Resultado esperado: maior consistência, menos erros não forçados e mais clareza para aplicar o fundamento em jogo.";
  return `${base} ${method} ${exercises} ${expected}`;
}

function buildEvolutionWeekDetail(plan, week, exerciseManager) {
  const trainings = safeArray(week && week.treinos);
  const cleanPhrase = (value) => neutralizeInstruction(value).replace(/[.!?]+$/g, "");
  const focus = cleanPhrase(week && week.foco || plan && plan.objetivo || "evolução progressiva no Beach Tennis");
  const dayNames = trainings.map((training) => training.dia).filter(Boolean);
  const dayObjectives = trainings.map((training) => cleanPhrase(training.objetivo_do_treino)).filter(Boolean);
  const ids = [...new Set(trainings.flatMap((training) => safeArray(training.exercicios_sugeridos)))];
  const exercises = exerciseManager ? exerciseManager.getMany(ids) : [];
  const categories = Object.entries(countBy(exercises, (exercise) => exercise.categoria))
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)
    .slice(0, 3);
  const firstObjective = dayObjectives[0] || focus;
  const lastObjective = dayObjectives[dayObjectives.length - 1] || focus;
  const categoryText = categories.length ? categories.join(", ") : "fundamentos, controle de bola e posicionamento";
  const sequenceText = dayNames.length ? `Sequência: ${dayNames.join(", ")}` : "Sequência semanal";
  const firstText = speechSentence(sentenceStart(sentenceLimit(firstObjective, 105)));
  const lastText = speechSentence(sentenceStart(sentenceLimit(lastObjective, 105)));
  return `Foco da semana: ${sentenceStart(focus)}. ${sequenceText}. Comece por: ${firstText} Finalize com: ${lastText} Os treinos combinam ${categoryText} para melhorar controle, leitura e aplicação em jogo.`;
}

function getAudioScript(exercicio) {
  return cleanTextForSpeech(exercicio && exercicio.texto_para_audio || "");
}

function stepTechnicalCue(exercise) {
  const context = exerciseContext(exercise);
  if (context.includes("sem bola")) return "Controle a postura, a respiração e a qualidade do deslocamento antes de aumentar a velocidade.";
  if (context.includes("saque")) return "Priorize rotina de preparação, contato à frente do corpo e direção clara para o alvo escolhido.";
  if (context.includes("recepc")) return "Leia a trajetória cedo, ajuste a base antes do contato e devolva com margem para ganhar tempo.";
  if (context.includes("voleio")) return "Mantenha raquete à frente, base baixa e contato curto, buscando precisão antes de velocidade.";
  if (context.includes("bandeja")) return "Recuar equilibrado é mais importante que força; finalize com margem e recupere a posição.";
  if (context.includes("smash")) return "Ataque apenas quando estiver bem posicionado, com ombros alinhados e área livre para finalização.";
  if (context.includes("defesa")) return "Use uma resposta alta e segura para reorganizar a dupla antes de acelerar novamente.";
  if (context.includes("ataque")) return "Escolha a bola certa para acelerar e mantenha cobertura depois do golpe.";
  if (context.includes("dupla") || context.includes("tatica") || context.includes("posicionamento")) return "Comunique antes da bola, ocupe o espaço combinado e recupere junto com o parceiro.";
  if (context.includes("deslocamento") || context.includes("condicionamento") || context.includes("mobilidade") || context.includes("aquecimento")) return "Controle a postura na areia, mantenha passos curtos e reduza a intensidade se a técnica cair.";
  if (context.includes("precisao") || context.includes("controle")) return "Acompanhe acertos no alvo e reduza a força quando a bola perder direção.";
  return "Mantenha organização, distância segura e qualidade técnica antes de aumentar o ritmo.";
}

function exerciseContext(exercise) {
  return normalizeText([
    exercise && exercise.nome,
    exercise && exercise.tipo,
    exercise && exercise.categoria,
    exercise && exercise.objetivo,
    exercise && exercise.organizacao_na_quadra,
    exercise && exercise.numero_alunos_ideal,
    exercise && exercise.prompt_imagem_diagrama,
    safeArray(exercise && exercise.tags).join(" ")
  ].join(" "));
}

function exercisePrimaryContext(exercise) {
  return normalizeText([
    exercise && exercise.nome,
    exercise && exercise.tipo,
    exercise && exercise.categoria,
    exercise && exercise.objetivo,
    safeArray(exercise && exercise.tags).join(" ")
  ].join(" "));
}

function beginnerSetupCue(exercise) {
  const context = exerciseContext(exercise);
  if (context.includes("sem bola")) return "comece em uma área livre da areia, com cones ou marcas bem visíveis, mantendo distância segura de outros alunos.";
  if (context.includes("saque")) return "fique atrás da linha de fundo, de frente para a rede, com os pés afastados na largura dos ombros e a bola controlada na mão antes de iniciar.";
  if (context.includes("recepc")) return "fique no fundo da quadra, de frente para quem vai enviar a bola, com joelhos levemente flexionados e raquete pronta na frente do corpo.";
  if (context.includes("voleio")) return "comece perto da rede, sem encostar nela, com a raquete alta e o corpo equilibrado para tocar na bola antes que ela passe por você.";
  if (context.includes("bandeja") || context.includes("smash")) return "comece em posição de expectativa, observe a bola alta, ajuste os pés para trás com calma e só golpeie quando estiver equilibrado.";
  if (context.includes("dupla") || context.includes("tatica") || context.includes("posicionamento")) return "combine antes quem cobre o meio e quem cobre a paralela; os dois jogadores devem se mover juntos, sem deixar um espaço grande entre eles.";
  if (context.includes("deslocamento") || context.includes("mobilidade") || context.includes("aquecimento") || context.includes("condicionamento")) return "comece em uma área livre da areia, com cones ou marcas bem visíveis, mantendo distância segura de outros alunos.";
  if (context.includes("precisao") || context.includes("controle")) return "posicione um alvo simples, como cone, arco ou marca na areia, e fique a uma distância em que consiga acertar com controle antes de aumentar a dificuldade.";
  return "comece em posição equilibrada, olhando para a bola ou para o sinal do professor, com espaço livre ao redor e raquete pronta quando o exercício tiver bola.";
}

function beginnerBallCue(exercise) {
  const context = exerciseContext(exercise);
  if (context.includes("sem bola")) return "Neste exercício não há golpe. Use cones, linhas na areia ou comandos de voz para guiar o movimento.";
  if (context.includes("saque")) return "A bola começa na mão do aluno e deve passar por cima da rede em direção ao alvo escolhido no outro lado da quadra.";
  if (context.includes("recepc")) return "A bola começa no professor, parceiro ou sacador; o aluno deve devolver com margem, preferindo altura e controle em vez de força.";
  if (context.includes("voleio")) return "A bola deve chegar controlada perto da rede; o aluno toca com movimento curto e direciona para o alvo combinado.";
  if (context.includes("bandeja")) return "A bola deve vir alta; o aluno recua, deixa a bola à frente do corpo e devolve com trajetória segura, sem tentar finalizar com pressa.";
  if (context.includes("smash")) return "A bola deve ser alta e atacável; o aluno só acelera quando estiver embaixo dela e com espaço livre para terminar o golpe.";
  if (context.includes("defesa")) return "A bola vem com pressão ou simulando ataque; a resposta deve subir o suficiente para dar tempo de reorganizar a dupla.";
  if (context.includes("ataque")) return "A bola deve ir para uma zona vulnerável do adversário, mas o aluno precisa escolher direção com controle antes de colocar velocidade.";
  return "Quando houver bola, ela deve seguir a direção definida no exercício; se perder muito a direção, reduza a velocidade e volte ao controle.";
}

function beginnerSuccessCue(exercise) {
  const context = exerciseContext(exercise);
  if (context.includes("sem bola")) return "está certo quando o movimento fica estável, a postura se mantém organizada e o aluno consegue repetir sem perder equilíbrio ou segurança.";
  if (context.includes("precisao") || context.includes("controle")) return "está certo quando a maioria das bolas chega perto do alvo e o corpo termina equilibrado, sem correria depois do golpe.";
  if (context.includes("dupla") || context.includes("tatica") || context.includes("posicionamento")) return "está certo quando a dupla se comunica antes da bola, cobre o meio sem trombar e volta organizada depois de cada ação.";
  if (context.includes("deslocamento") || context.includes("condicionamento")) return "está certo quando o aluno chega na marca sem cruzar os pés de forma descontrolada, respira bem e mantém postura mesmo cansado.";
  if (context.includes("saque")) return "está certo quando a rotina se repete igual, a bola passa com margem sobre a rede e o aluno já se prepara para a próxima bola.";
  if (context.includes("recepc")) return "está certo quando a devolução ganha altura, passa segura e o aluno recupera a posição antes da próxima bola.";
  return "está certo quando o movimento fica controlado, a bola ou o deslocamento segue o alvo proposto e o aluno consegue repetir sem perder equilíbrio.";
}

function beginnerMetricCue(exercise) {
  const duration = Number(exercise && exercise.duracao_minutos || 0);
  const intensity = titleCase(exercise && exercise.intensidade || "moderada").toLowerCase();
  const reps = duration <= 8 ? "6 a 8 repetições" : duration <= 12 ? "8 a 12 repetições" : "2 a 3 séries curtas";
  return `Use ${reps} em intensidade ${intensity}. Conte acertos no alvo, erros sem necessidade, tempo para voltar à base e se o aluno manteve segurança na areia.`;
}

function racketAndBodyCue(exercise) {
  const context = exerciseContext(exercise);
  if (context.includes("sem bola")) return "mantenha braços soltos, tronco firme e olhar para a área de deslocamento, usando a raquete apenas se ela ajudar na postura.";
  if (context.includes("saque")) return "segure a raquete firme, mas sem travar o punho; mantenha o tronco de lado para a rede e conduza a raquete de baixo para cima até terminar apontando para o alvo.";
  if (context.includes("recepc")) return "deixe a raquete pronta na frente do corpo, com cotovelos soltos, e gire pouco o tronco para devolver com controle.";
  if (context.includes("voleio")) return "segure a raquete alta, à frente do peito, e bloqueie a bola com gesto curto, sem puxar o braço para trás.";
  if (context.includes("bandeja")) return "prepare a raquete acima do ombro, gire o tronco de lado e use o braço como guia, sem tentar bater com força máxima.";
  if (context.includes("smash")) return "aponte o corpo para a bola alta, eleve o braço com a raquete e finalize para baixo apenas quando estiver equilibrado.";
  if (context.includes("defesa")) return "deixe a raquete à frente do corpo e use pernas flexionadas para absorver a bola, priorizando resposta alta e segura.";
  if (context.includes("ataque")) return "prepare cedo, escolha o alvo antes do contato e acelere só depois de ajustar os pés.";
  return "segure a raquete com firmeza leve, mantenha joelhos flexionados e use o tronco para orientar o movimento sem perder equilíbrio.";
}

function movementExecutionCue(exercise) {
  const context = exerciseContext(exercise);
  if (context.includes("sem bola")) return "execute o gesto ou deslocamento sem pressa, sentindo o apoio dos pés na areia e mantendo o tronco estável. Volte à base antes da próxima repetição e aumente a velocidade apenas se a postura continuar limpa.";
  if (context.includes("saque")) return "comece com uma rotina simples: ajuste os pés, olhe o alvo, lance ou solte a bola com controle e faça a raquete atravessar a bola em direção à zona escolhida. Depois do contato, dê um passo curto para dentro da quadra e fique pronto para a próxima bola.";
  if (context.includes("recepc")) return "leia a bola cedo, dê pequenos passos de ajuste antes do contato e devolva com margem sobre a rede. O movimento deve terminar com o corpo voltando para a base, não parado depois da batida.";
  if (context.includes("voleio")) return "aproxime a raquete da linha da bola, bloqueie com movimento curto e volte imediatamente para a posição de espera na rede. O objetivo é controlar a direção, não fazer um golpe grande.";
  if (context.includes("bandeja")) return "recuar com passos curtos é a prioridade. Entre embaixo da bola, mantenha o contato à frente do corpo e devolva com trajetória segura para ganhar tempo de reorganização.";
  if (context.includes("smash")) return "ajuste o corpo antes de atacar, suba a raquete, mire uma área livre e finalize com equilíbrio. Se a bola ficar atrás do corpo, transforme em bandeja ou devolução segura.";
  if (context.includes("defesa")) return "baixe o centro de gravidade, use passos curtos para chegar na linha da bola e responda alto. A defesa deve dar tempo para recuperar posição, não virar um golpe apressado.";
  if (context.includes("ataque")) return "construa a jogada antes de acelerar: identifique a bola favorável, escolha alvo e finalize mantendo cobertura depois do golpe.";
  if (context.includes("dupla") || context.includes("tatica") || context.includes("posicionamento")) return "a dupla deve se mover como um bloco: um cobre a bola, o outro fecha o espaço livre. A comunicação vem antes da corrida.";
  if (context.includes("deslocamento") || context.includes("mobilidade") || context.includes("aquecimento") || context.includes("condicionamento") || context.includes("coordenacao") || context.includes("reacao")) return "use passos curtos na areia, empurre o chão sem cruzar as pernas de forma descontrolada e retorne à base antes da próxima repetição.";
  if (context.includes("precisao") || context.includes("controle")) return "reduza a força, olhe o alvo antes de bater e termine o movimento apontando para a direção escolhida.";
  return "execute uma repetição por vez, confirme o alvo, mova os pés antes do golpe e finalize voltando para a base com controle.";
}

function commonCorrectionCue(exercise) {
  const errors = safeArray(exercise && exercise.erros_comuns)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => neutralizeInstruction(item).replace(/[.!?]+$/g, "").trim())
    .filter(Boolean);
  if (errors.length) return `Erros mais prováveis: ${errors.join("; ")}. Corrija reduzindo a velocidade, reorganizando os pés e voltando para uma execução menor e mais controlada.`;
  return "Os erros mais comuns são pressa, excesso de força e perder equilíbrio. Corrija diminuindo o ritmo, usando alvo maior e repetindo até o movimento ficar estável.";
}

function practicalTipCue(exercise) {
  const tip = safeArray(exercise && exercise.dicas_tecnicas).concat(safeArray(exercise && exercise.dicas)).filter(Boolean)[0];
  if (tip) return sentenceLimit(tip, 135);
  const context = exerciseContext(exercise);
  if (context.includes("sem bola")) return "Se a postura perder qualidade, pare por alguns segundos, respire e recomece mais devagar.";
  if (context.includes("saque")) return "Antes de sacar, olhe para o alvo por um segundo; isso ajuda o corpo a organizar a direção.";
  if (context.includes("voleio")) return "Pense em bloquear a bola, não em bater nela; quanto menor o gesto, maior o controle.";
  if (context.includes("defesa")) return "Na dúvida, devolva alto e seguro para ganhar tempo.";
  return "Use controle primeiro e velocidade depois; quando o acerto cair, volte um nível de dificuldade.";
}

function buildBeginnerGuideItems(exercise) {
  const errors = safeArray(exercise && exercise.erros_comuns).slice(0, 2).join(" Evite também: ");
  const easy = neutralizeInstruction(exercise && exercise.variacao_facil || "");
  return [
    { title: "Objetivo simples", text: getShortObjective(exercise && exercise.objetivo, 160) },
    { title: "Onde ficar", text: beginnerSetupCue(exercise) },
    { title: "O que observar", text: `${beginnerBallCue(exercise)} ${beginnerSuccessCue(exercise)}` },
    { title: "Erros comuns", text: errors ? `Evite: ${neutralizeInstruction(errors)}` : "Evite pressa, excesso de força e perder a base antes de concluir a ação." },
    { title: "Adaptação fácil", text: easy || "Reduza a velocidade, aumente o alvo e faça menos repetições até o movimento ficar claro e seguro." }
  ];
}

function buildTeachingGuideItems(exercise) {
  const objective = simplifyObjective(exercise && exercise.objetivo) || "melhorar o fundamento com controle, seguran\u00e7a e repeti\u00e7\u00e3o consciente";
  const setup = beginnerSetupCue(exercise);
  const firstStep = getMainStep(exercise);
  const movement = movementExecutionCue(exercise);
  const attention = stepTechnicalCue(exercise);
  const correction = commonCorrectionCue(exercise);
  const tip = practicalTipCue(exercise);
  return [
    { title: "Objetivo", text: `Treine ${objective.charAt(0).toLowerCase()}${objective.slice(1)}. A prioridade \u00e9 entender a tarefa antes de buscar velocidade ou for\u00e7a.` },
    { title: "Posi\u00e7\u00e3o inicial", text: `${sentenceStart(setup)} Comece parado, confirme o alvo e s\u00f3 inicie quando o corpo estiver equilibrado.` },
    { title: "Primeiro passo", text: `${sentenceStart(firstStep)} Fa\u00e7a a primeira repeti\u00e7\u00e3o devagar para sentir o tempo correto do movimento.` },
    { title: "Como executar", text: `${sentenceStart(movement)} Durante a execu\u00e7\u00e3o, ${attention.charAt(0).toLowerCase()}${attention.slice(1)}` },
    { title: "Corre\u00e7\u00e3o e dica", text: `${sentenceStart(sentenceLimit(correction, 150))} Dica pr\u00e1tica: ${tip.charAt(0).toLowerCase()}${tip.slice(1)}` }
  ];
}

function enrichExerciseStepText(step, index, exercise) {
  const text = neutralizeInstruction(step);
  const isBeginner = normalizeText(exercise && exercise.nivel).includes("iniciante");
  const cue = stepTechnicalCue(exercise);
  const setup = beginnerSetupCue(exercise);
  const ball = beginnerBallCue(exercise);
  const success = beginnerSuccessCue(exercise);
  const metric = beginnerMetricCue(exercise);
  const body = racketAndBodyCue(exercise);
  const movement = movementExecutionCue(exercise);
  const correction = commonCorrectionCue(exercise);
  const tip = practicalTipCue(exercise);
  const objective = firstObjectiveSentence(exercise && exercise.objetivo);
  const roles = participantRoleCue(exercise);
  const baseText = text.endsWith(".") ? text : `${text}.`;
  const objectiveLine = objective ? `O foco desta etapa é: ${sentenceStart(objective)}` : "O foco desta etapa é executar o exercício com controle, segurança e clareza.";
  if (text.length > 360) return `${baseText} ${sentenceStart(metric)}`;
  if (index === 0) {
    return isBeginner
      ? `${baseText} Organização inicial: ${sentenceStart(setup)} ${sentenceStart(body)} ${roles ? `${sentenceStart(roles)} ` : ""}${objectiveLine}`
      : `${baseText} Organização inicial: ${sentenceStart(setup)} ${sentenceStart(body)} ${roles ? `${sentenceStart(roles)} ` : ""}Confirme o alvo e execute com qualidade antes de aumentar o ritmo.`;
  }
  if (index === 1) return `${baseText} ${sentenceStart(movement)} ${sentenceStart(ball)}`;
  if (index === 2) return `${baseText} Controle da repetição: ${sentenceStart(metric)} ${sentenceStart(success)}`;
  if (index === 3) return `${baseText} Correção durante o exercício: ${sentenceStart(correction)}`;
  if (index === 4) return `${baseText} Dica prática: ${sentenceStart(tip)} ${sentenceStart(cue)}`;
  return `${baseText} Ao terminar, volte para a posição inicial, respire, confira se manteve equilíbrio, direção e segurança, e só aumente o ritmo quando conseguir repetir com controle.`;
}

function splitLongSentence(sentence, maxLength) {
  const words = cleanTextForSpeech(sentence).split(" ").filter(Boolean);
  const chunks = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

function splitTextIntoChunks(text, minLength = 220, maxLength = 260) {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return [];
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  const chunks = [];
  let current = "";
  sentences.forEach((sentence) => {
    const value = sentence.trim();
    if (!value) return;
    if (value.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitLongSentence(value, maxLength));
      return;
    }
    const next = current ? `${current} ${value}` : value;
    if (next.length <= maxLength) {
      current = next;
    } else {
      if (current) chunks.push(current);
      current = value.length < minLength ? value : "";
      if (!current) chunks.push(value);
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

class StorageManager {
  constructor() {
    this.userId = window.BTPT_AUTH?.session?.user?.id || "";
    this.legacyOwnerKey = "btpt_legacy_data_claimed_by";
    if (this.userId && !localStorage.getItem(this.legacyOwnerKey)) {
      localStorage.setItem(this.legacyOwnerKey, this.userId);
    }
  }

  scopedKey(key) {
    return this.userId ? `btpt_user_${this.userId}_${key}` : key;
  }

  readRaw(key) {
    const scoped = this.scopedKey(key);
    const scopedValue = localStorage.getItem(scoped);
    if (scopedValue !== null || !this.userId) return scopedValue;
    const legacyOwner = localStorage.getItem(this.legacyOwnerKey);
    const legacyValue = legacyOwner === this.userId ? localStorage.getItem(key) : null;
    if (legacyValue !== null) {
      localStorage.setItem(scoped, legacyValue);
      window.BTPT_USER_DATA_SYNC?.schedule();
    }
    return legacyValue;
  }

  getJSON(key, fallback) {
    try {
      const raw = this.readRaw(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn("Falha ao ler armazenamento local.", error);
      return fallback;
    }
  }

  setJSON(key, value) {
    localStorage.setItem(this.scopedKey(key), JSON.stringify(value));
    window.BTPT_USER_DATA_SYNC?.schedule();
  }

  getFavoriteExercises() {
    return this.getJSON(APP_KEYS.favorites, []);
  }

  toggleFavoriteExercise(id) {
    const list = this.getFavoriteExercises();
    const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    this.setJSON(APP_KEYS.favorites, next);
    return next;
  }

  getFavoritePlans() {
    return this.getJSON(APP_KEYS.favoritePlans, []);
  }

  toggleFavoritePlan(id) {
    const list = this.getFavoritePlans();
    const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    this.setJSON(APP_KEYS.favoritePlans, next);
    return next;
  }

  getCurrentWorkout() {
    return this.getJSON(APP_KEYS.currentWorkout, { name: "", goal: "", exerciseIds: [] });
  }

  setCurrentWorkout(workout) {
    this.setJSON(APP_KEYS.currentWorkout, workout);
  }

  getSavedWorkouts() {
    return this.getJSON(APP_KEYS.savedWorkouts, []);
  }

  setSavedWorkouts(workouts) {
    this.setJSON(APP_KEYS.savedWorkouts, workouts);
  }

  getSavedWorkoutProgress(workoutId) {
    return this.getJSON(`bt_saved_workout_progress_${workoutId}`, []);
  }

  toggleSavedWorkoutExercise(workoutId, exerciseId) {
    const list = this.getSavedWorkoutProgress(workoutId);
    const next = list.includes(exerciseId) ? list.filter((item) => item !== exerciseId) : [...list, exerciseId];
    this.setJSON(`bt_saved_workout_progress_${workoutId}`, next);
    return next;
  }

  clearSavedWorkoutProgress(workoutId) {
    localStorage.removeItem(this.scopedKey(`bt_saved_workout_progress_${workoutId}`));
    window.BTPT_USER_DATA_SYNC?.schedule();
  }

  getAudioPrefs() {
    return this.getJSON(APP_KEYS.audioPrefs, { rate: 1, volume: 1 });
  }

  setAudioPrefs(prefs) {
    this.setJSON(APP_KEYS.audioPrefs, prefs);
  }

  getTheme() {
    return this.readRaw(APP_KEYS.theme) || "dark";
  }

  setTheme(theme) {
    localStorage.setItem(this.scopedKey(APP_KEYS.theme), theme === "dark" ? "dark" : "light");
    window.BTPT_USER_DATA_SYNC?.schedule();
  }

  getLessonProgress(planId) {
    return this.getJSON(`bt_plan_progress_${planId}`, null);
  }

  setLessonProgress(planId, progress) {
    this.setJSON(`bt_plan_progress_${planId}`, progress);
  }

  getEvolutionProgress(evolutionId) {
    return this.getJSON(`bt_evolution_progress_${evolutionId}`, null);
  }

  setEvolutionProgress(evolutionId, progress) {
    this.setJSON(`bt_evolution_progress_${evolutionId}`, progress);
  }
}

class IndexedDBManager {
  constructor(userId = "anonymous") {
    const scope = String(userId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "");
    this.dbName = `BeachTennisProTrainerDB_V118_${scope}`;
    this.version = 2;
    this.db = null;
    this.stores = ["exercicios", "planos_aula", "planos_evolucao"];
  }

  open() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB indisponível neste navegador."));
        return;
      }
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = () => {
        const db = request.result;
        this.stores.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "id" });
          }
        });
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  transaction(storeNames, mode = "readonly") {
    return this.db.transaction(storeNames, mode);
  }

  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const request = this.transaction([storeName]).objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  count(storeName) {
    return new Promise((resolve, reject) => {
      const request = this.transaction([storeName]).objectStore(storeName).count();
      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  }

  clearAndPut(storeName, items) {
    return new Promise((resolve, reject) => {
      const transaction = this.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      store.clear();
      items.forEach((item) => store.put(item));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async seed(initialData) {
    await this.clearAndPut("exercicios", initialData.exercicios);
    await this.clearAndPut("planos_aula", initialData.planos_aula);
    await this.clearAndPut("planos_evolucao", initialData.planos_evolucao);
  }
}

class ExerciseManager {
  constructor(items) {
    this.items = items;
    this.map = new Map(items.map((item) => [item.id, item]));
  }

  getById(id) {
    return this.map.get(id);
  }

  getMany(ids) {
    return safeArray(ids).map((id) => this.getById(id)).filter(Boolean);
  }

  getFiltered(filters) {
    const tag = normalizeText(filters.tag);
    return this.items.filter((exercise) => {
      const searchableFields = [
        exercise.id,
        exercise.nome,
        exercise.categoria,
        exercise.nivel,
        exercise.tipo,
        exercise.objetivo,
        exercise.descricao_curta,
        safeArray(exercise.tags).join(" ")
      ];
      if (!matchesSearchFields(searchableFields, filters.search)) return false;
      if (filters.level && normalizeText(exercise.nivel) !== normalizeText(filters.level)) return false;
      if (filters.type && normalizeText(exercise.tipo) !== normalizeText(filters.type)) return false;
      if (filters.category && exercise.categoria !== filters.category) return false;
      if (filters.intensity && exercise.intensidade !== filters.intensity) return false;
      if (filters.indicated && exercise.indicado_para !== filters.indicated) return false;
      if (tag && !safeArray(exercise.tags).some((item) => normalizeText(item).includes(tag))) return false;
      if (filters.duration && !this.matchesDuration(exercise.duracao_minutos, filters.duration)) return false;
      return true;
    });
  }

  matchesDuration(minutes, range) {
    const value = Number(minutes || 0);
    if (range === "0-8") return value <= 8;
    if (range === "9-12") return value >= 9 && value <= 12;
    if (range === "13-20") return value >= 13 && value <= 20;
    if (range === "21+") return value >= 21;
    return true;
  }
}

class LessonPlanManager {
  constructor(items) {
    this.items = safeArray(items).map((item) => ({
      ...item,
      objetivo_principal: buildPremiumLessonObjective(item)
    }));
    this.map = new Map(this.items.map((item) => [item.id, item]));
  }

  getById(id) {
    return this.map.get(id);
  }

  getFiltered(filters) {
    return this.items.filter((plan) => {
      const searchableFields = [
        plan.id,
        plan.nome,
        plan.objetivo_principal,
        plan.publico,
        safeArray(plan.tags).join(" "),
        safeArray(plan.estrutura_da_aula).flatMap((block) => safeArray(block.exercicios_relacionados)).join(" ")
      ];
      if (!matchesSearchFields(searchableFields, filters.search)) return false;
      if (filters.level && plan.nivel !== filters.level) return false;
      if (filters.audience && normalizeText(plan.publico) !== normalizeText(filters.audience)) return false;
      if (filters.intensity && plan.intensidade !== filters.intensity) return false;
      if (filters.duration && !this.matchesDuration(plan.duracao_total_minutos, filters.duration)) return false;
      return true;
    });
  }

  matchesDuration(minutes, range) {
    const value = Number(minutes || 0);
    if (range === "0-45") return value <= 45;
    if (range === "46-60") return value >= 46 && value <= 60;
    if (range === "61+") return value >= 61;
    return true;
  }
}

class EvolutionPlanManager {
  constructor(items) {
    this.items = safeArray(items).slice().sort((a, b) => compareByLevelOrder(a, b) || Number(a.duracao_semanas || 0) - Number(b.duracao_semanas || 0));
    this.map = new Map(this.items.map((item) => [item.id, item]));
  }

  getById(id) {
    return this.map.get(id);
  }
}

class WorkoutBuilderManager {
  constructor(storage, exerciseManager) {
    this.storage = storage;
    this.exerciseManager = exerciseManager;
    this.current = storage.getCurrentWorkout();
  }

  syncFields(name, goal) {
    this.current.name = name || "";
    this.current.goal = goal || "";
    this.persist();
  }

  addExercise(id) {
    if (!this.current.exerciseIds.includes(id)) {
      this.current.exerciseIds.push(id);
      this.persist();
    }
    return this.current;
  }

  removeExercise(id) {
    this.current.exerciseIds = this.current.exerciseIds.filter((item) => item !== id);
    this.persist();
    return this.current;
  }

  moveExercise(id, direction) {
    const ids = safeArray(this.current.exerciseIds);
    const from = ids.indexOf(id);
    const step = direction === "up" ? -1 : 1;
    const to = from + step;
    if (from < 0 || to < 0 || to >= ids.length) return this.current;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    this.current.exerciseIds = ids;
    this.persist();
    return this.current;
  }

  clear() {
    this.current = { name: "", goal: "", exerciseIds: [] };
    this.persist();
  }

  load(workout) {
    this.current = {
      name: workout.name || workout.nome || "",
      goal: workout.goal || workout.objetivo || "",
      exerciseIds: safeArray(workout.exerciseIds)
    };
    this.persist();
  }

  persist() {
    this.storage.setCurrentWorkout(this.current);
  }

  getExercises() {
    return this.exerciseManager.getMany(this.current.exerciseIds);
  }

  getTotalDuration() {
    return sumValues(this.getExercises(), (item) => item.duracao_minutos);
  }

  saveCurrent() {
    const exercises = this.getExercises();
    if (!exercises.length) return null;
    const saved = this.storage.getSavedWorkouts();
    const item = {
      id: "TR-" + Date.now(),
      name: this.current.name || "Treino personalizado",
      goal: this.current.goal || "Treino organizado no Beach Tennis Pro Trainer",
      exerciseIds: [...this.current.exerciseIds],
      createdAt: new Date().toISOString()
    };
    this.storage.setSavedWorkouts([item, ...saved]);
    return item;
  }

  deleteSaved(id) {
    const next = this.storage.getSavedWorkouts().filter((item) => item.id !== id);
    this.storage.setSavedWorkouts(next);
  }
}

class AudioManager {
  constructor(storage) {
    this.storage = storage;
    this.prefs = storage.getAudioPrefs();
    this.currentAudio = null;
    this.voices = [];
    this.speechTimers = [];
    this.speechToken = 0;
    this.currentUtterance = null;
    this.loadVoices();
  }

  bindControls() {
    const rate = document.getElementById("audioRate");
    const volume = document.getElementById("audioVolume");
    const rateValue = document.getElementById("audioRateValue");
    const volumeValue = document.getElementById("audioVolumeValue");
    if (!rate || !volume) return;
    rate.max = "1.5";
    const normalizedRate = Math.max(0.7, Math.min(1.5, Number(this.prefs.rate || 1)));
    const normalizedVolume = Math.max(0, Math.min(1, Number(this.prefs.volume ?? 1)));
    rate.value = normalizedRate;
    volume.value = normalizedVolume;
    const syncRangeFill = (input) => {
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const current = Number(input.value || min);
      const progress = max > min ? ((current - min) / (max - min)) * 100 : 0;
      input.style.setProperty("--range-progress", `${Math.max(0, Math.min(100, progress))}%`);
    };
    const update = () => {
      this.prefs = {
        rate: Math.max(0.7, Math.min(1.5, Number(rate.value || 1))),
        volume: Math.max(0, Math.min(1, Number(volume.value || 0)))
      };
      syncRangeFill(rate);
      syncRangeFill(volume);
      rateValue.textContent = `${this.prefs.rate.toFixed(1)}x`;
      volumeValue.textContent = `${Math.round(this.prefs.volume * 100)}%`;
      this.storage.setAudioPrefs(this.prefs);
    };
    rate.addEventListener("input", update);
    volume.addEventListener("input", update);
    update();
  }

  speak(text, audioUrl = "") {
    if (audioUrl) {
      this.stop();
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.volume = this.prefs.volume;
      this.currentAudio.playbackRate = Math.max(0.7, Math.min(1.5, Number(this.prefs.rate || 1)));
      this.currentAudio.play().catch(() => window.appController.toast("Não foi possível tocar o áudio."));
      return;
    }
    if (!("speechSynthesis" in window)) {
      window.appController.toast("Áudio indisponível neste navegador.");
      return;
    }
    this.stop();
    const utterance = new SpeechSynthesisUtterance(String(text || "Explicação não disponível."));
    utterance.lang = "pt-BR";
    utterance.rate = Math.max(0.7, Math.min(1.5, Number(this.prefs.rate || 1)));
    utterance.volume = Math.max(0, Math.min(1, Number(this.prefs.volume ?? 1)));
    window.speechSynthesis.speak(utterance);
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  loadVoices() {
    if (!("speechSynthesis" in window)) return [];
    const updateVoices = () => {
      this.voices = window.speechSynthesis.getVoices() || [];
      return this.voices;
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return this.voices;
  }

  getBestVoice() {
    const voices = this.voices.length ? this.voices : this.loadVoices();
    if (!voices.length) return null;
    const byLang = voices.find((voice) => String(voice.lang || "").toLowerCase() === "pt-br");
    if (byLang) return byLang;
    const byName = (name) => voices.find((voice) => normalizeText(voice.name).includes(normalizeText(name)));
    return byName("Google portugu\u00eas do Brasil")
      || byName("Google portugu\u00eas")
      || byName("Microsoft Maria")
      || byName("Microsoft Francisca")
      || byName("Microsoft Daniel")
      || byName("Luciana")
      || byName("Portuguese Brazil")
      || byName("Brasil")
      || voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith("pt"))
      || voices.find((voice) => voice.default)
      || voices[0];
  }

  speak(text, audioUrl = "") {
    if (audioUrl) {
      this.stop();
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.volume = this.prefs.volume;
      this.currentAudio.playbackRate = Math.max(0.7, Math.min(1.5, Number(this.prefs.rate || 1)));
      this.currentAudio.play().catch(() => window.appController.toast("N\u00e3o foi poss\u00edvel tocar o \u00e1udio."));
      return;
    }
    if (!("speechSynthesis" in window)) {
      window.appController.toast("\u00c1udio indispon\u00edvel neste navegador.");
      return;
    }
    this.stop();
    const chunks = splitTextIntoChunks(text || "Explica\u00e7\u00e3o n\u00e3o dispon\u00edvel.");
    const token = ++this.speechToken;
    this.speakChunk(chunks.length ? chunks : ["Explica\u00e7\u00e3o n\u00e3o dispon\u00edvel."], 0, token);
  }

  speakChunk(chunks, index, token) {
    if (token !== this.speechToken || index >= chunks.length) return;
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    const voice = this.getBestVoice();
    utterance.lang = "pt-BR";
    utterance.rate = Math.max(0.7, Math.min(1.5, Number(this.prefs.rate || 1)));
    utterance.pitch = 1;
    utterance.volume = Math.max(0, Math.min(1, Number(this.prefs.volume ?? 1)));
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (token !== this.speechToken) return;
      const delay = index % 2 === 0 ? 360 : 430;
      const timer = window.setTimeout(() => this.speakChunk(chunks, index + 1, token), delay);
      this.speechTimers.push(timer);
    };
    utterance.onerror = () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      this.speechTimers.forEach((timer) => window.clearTimeout(timer));
      this.speechTimers = [];
      this.currentUtterance = null;
    };
    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  stop() {
    this.speechToken += 1;
    this.speechTimers.forEach((timer) => window.clearTimeout(timer));
    this.speechTimers = [];
    this.currentUtterance = null;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }
}

function animationKind(exercise) {
  const context = exerciseContext(exercise);
  if (context.includes("saque")) return "saque";
  if (context.includes("recepc")) return "recepcao";
  if (context.includes("voleio")) return "voleio";
  if (context.includes("bandeja")) return "bandeja";
  if (context.includes("smash")) return "smash";
  if (context.includes("defesa")) return "defesa";
  if (context.includes("ataque")) return "ataque";
  if (context.includes("dupla") || context.includes("tatica") || context.includes("posicionamento")) return "dupla";
  if (context.includes("precisao") || context.includes("controle")) return "controle";
  if (context.includes("deslocamento") || context.includes("mobilidade") || context.includes("aquecimento") || context.includes("condicionamento") || context.includes("coordenacao") || context.includes("reacao")) return "movimento";
  return "controle";
}

function animationHasBall(animation) {
  return safeArray(animation && animation.bolas).length > 0
    || safeArray(animation && animation.frames).some((frame) => safeArray(frame.movimentos_bola).length > 0);
}

function animationHasPlayerMovement(animation) {
  return safeArray(animation && animation.frames).some((frame) => safeArray(frame.movimentos_jogadores).length > 0);
}

function animationNeedsRepair(exercise, animation) {
  if (!animation || safeArray(animation.frames).length < 2 || !safeArray(animation.jogadores).length) return true;
  const context = exerciseContext(exercise);
  const kind = animationKind(exercise);
  const noBall = normalizeText(exercise && exercise.tipo).includes("sem bola") || context.includes("sem bola");
  if (!noBall && ["saque", "recepcao", "voleio", "bandeja", "smash", "defesa", "ataque", "controle"].includes(kind) && !animationHasBall(animation)) return true;
  if (["movimento", "dupla", "defesa", "bandeja", "smash"].includes(kind) && !animationHasPlayerMovement(animation)) return true;
  return false;
}

function makeFrame(title, narration, playerMove, ballMove, arrows, highlights = []) {
  return {
    titulo: title,
    narracao_curta: narration,
    movimentos_jogadores: safeArray(playerMove),
    movimentos_bola: safeArray(ballMove),
    setas: safeArray(arrows),
    destaques: highlights
  };
}

function makeContextualAnimation(exercise) {
  const kind = animationKind(exercise);
  const noBall = normalizeText(exercise && exercise.tipo).includes("sem bola") || exerciseContext(exercise).includes("sem bola");
  const base = {
    nome_animacao: `Animação didática - ${exercise && exercise.nome || "exercício"}`,
    descricao_geral: movementExecutionCue(exercise),
    quadra: { modelo: "quadra de beach tennis 16m x 8m", rede: { x: 50 } },
    loop: false,
    duracao_frame_ms: 1300,
    legenda: noBall ? ["círculos = participantes", "setas azuis = deslocamento", "cones = referência"] : ["círculos = participantes", "setas azuis = deslocamento", "setas amarelas = bola", "retângulos = alvo"],
    jogadores: [
      { id: "A1", rotulo: "aluno", inicio: { x: 78, y: 24 } },
      { id: "T1", rotulo: "apoio", inicio: { x: 28, y: 78 } }
    ],
    bolas: noBall ? [] : [{ id: "B1", inicio: { x: 30, y: 78 } }],
    cones: [],
    zonas_alvo: [{ id: "Z1", rotulo: "alvo", x: 28, y: 82, largura: 16, altura: 18 }]
  };
  if (kind === "movimento" || noBall) {
    base.jogadores = [{ id: "A1", rotulo: "aluno", inicio: { x: 72, y: 30 } }];
    base.bolas = [];
    base.zonas_alvo = [];
    base.cones = [{ id: "C1", rotulo: "base", x: 72, y: 30 }, { id: "C2", rotulo: "ida", x: 72, y: 50 }, { id: "C3", rotulo: "volta", x: 58, y: 40 }];
    base.frames = [
      makeFrame("Base inicial", "Comece em postura atlética, com passos curtos.", [], [], [], ["A1", "C1"]),
      makeFrame("Deslocamento controlado", "Mova-se até a marca sem cruzar as pernas de forma descontrolada.", [{ jogador_id: "A1", de: { x: 72, y: 30 }, para: { x: 72, y: 50 } }], [], [{ tipo: "movimento", de: { x: 72, y: 30 }, para: { x: 72, y: 50 }, rotulo: "lateral" }], ["A1", "C2"]),
      makeFrame("Retorno à base", "Volte para a posição inicial antes da próxima repetição.", [{ jogador_id: "A1", de: { x: 72, y: 50 }, para: { x: 58, y: 40 } }], [], [{ tipo: "movimento", de: { x: 72, y: 50 }, para: { x: 58, y: 40 }, rotulo: "retorno" }], ["A1", "C3"])
    ];
    return base;
  }
  if (kind === "saque") {
    base.jogadores = [{ id: "A1", rotulo: "sacador", inicio: { x: 86, y: 24 } }];
    base.bolas = [{ id: "B1", inicio: { x: 84, y: 25 } }];
    base.zonas_alvo = [{ id: "Z1", rotulo: "alvo saque", x: 24, y: 82, largura: 18, altura: 20 }];
    base.frames = [
      makeFrame("Posição de saque", "Sacador atrás da linha de fundo, olhando o alvo.", [], [], [], ["A1"]),
      makeFrame("Bola cruza a rede", "A bola sai controlada em direção ao alvo diagonal.", [], [{ bola_id: "B1", de: { x: 84, y: 25 }, para: { x: 24, y: 82 } }], [{ tipo: "bola", de: { x: 84, y: 25 }, para: { x: 24, y: 82 }, rotulo: "saque" }], ["B1", "Z1"]),
      makeFrame("Recuperação", "Depois do contato, entre um passo e fique pronto.", [{ jogador_id: "A1", de: { x: 86, y: 24 }, para: { x: 76, y: 32 } }], [], [{ tipo: "movimento", de: { x: 86, y: 24 }, para: { x: 76, y: 32 }, rotulo: "recupera" }], ["A1"])
    ];
    return base;
  }
  if (kind === "voleio") {
    base.jogadores = [{ id: "A1", rotulo: "aluno", inicio: { x: 48, y: 43 } }, { id: "T1", rotulo: "apoio", inicio: { x: 42, y: 78 } }];
    base.bolas = [{ id: "B1", inicio: { x: 42, y: 78 } }];
    base.zonas_alvo = [{ id: "Z1", rotulo: "alvo curto", x: 42, y: 82, largura: 14, altura: 16 }];
    base.frames = [
      makeFrame("Raquete pronta na rede", "Aluno perto da rede, com raquete à frente do peito.", [], [], [], ["A1"]),
      makeFrame("Bloqueio curto", "A bola chega controlada e o toque é curto para o alvo.", [], [{ bola_id: "B1", de: { x: 42, y: 78 }, para: { x: 48, y: 45 } }], [{ tipo: "bola", de: { x: 42, y: 78 }, para: { x: 48, y: 45 }, rotulo: "bola" }], ["B1", "A1"]),
      makeFrame("Volta à base", "Depois do voleio, volte a fechar a rede.", [{ jogador_id: "A1", de: { x: 48, y: 43 }, para: { x: 48, y: 39 } }], [{ bola_id: "B1", de: { x: 48, y: 45 }, para: { x: 42, y: 82 } }], [{ tipo: "bola", de: { x: 48, y: 45 }, para: { x: 42, y: 82 }, rotulo: "direção" }], ["Z1"])
    ];
    return base;
  }
  if (["bandeja", "smash"].includes(kind)) {
    base.jogadores = [{ id: "A1", rotulo: "aluno", inicio: { x: 48, y: 38 } }, { id: "T1", rotulo: "apoio", inicio: { x: 28, y: 78 } }];
    base.bolas = [{ id: "B1", inicio: { x: 28, y: 78 } }];
    base.frames = [
      makeFrame("Leitura da bola alta", "Observe a bola alta antes de correr para ela.", [], [], [], ["A1"]),
      makeFrame(kind === "smash" ? "Ajuste para finalizar" : "Recuo equilibrado", "Ajuste os pés antes do contato.", [{ jogador_id: "A1", de: { x: 48, y: 38 }, para: { x: 38, y: 34 } }], [{ bola_id: "B1", de: { x: 28, y: 78 }, para: { x: 38, y: 34 } }], [{ tipo: "movimento", de: { x: 48, y: 38 }, para: { x: 38, y: 34 }, rotulo: "ajuste" }, { tipo: "bola", de: { x: 28, y: 78 }, para: { x: 38, y: 34 }, rotulo: "bola alta" }], ["A1", "B1"]),
      makeFrame("Direção segura", "Finalize ou devolva com margem para o alvo.", [], [{ bola_id: "B1", de: { x: 38, y: 34 }, para: { x: 28, y: 84 } }], [{ tipo: "bola", de: { x: 38, y: 34 }, para: { x: 28, y: 84 }, rotulo: kind }], ["Z1"])
    ];
    return base;
  }
  if (kind === "recepcao" || kind === "defesa") {
    base.jogadores = [{ id: "A1", rotulo: kind === "defesa" ? "defesa" : "recepção", inicio: { x: 82, y: 22 } }, { id: "T1", rotulo: "envio", inicio: { x: 22, y: 80 } }];
    base.bolas = [{ id: "B1", inicio: { x: 22, y: 80 } }];
    base.zonas_alvo = [{ id: "Z1", rotulo: "devolução segura", x: 32, y: 76, largura: 18, altura: 18 }];
    base.frames = [
      makeFrame("Base no fundo", "Comece no fundo com joelhos flexionados e raquete pronta.", [], [], [], ["A1"]),
      makeFrame("Leitura e ajuste", "A bola chega e o aluno ajusta os pés antes do contato.", [{ jogador_id: "A1", de: { x: 82, y: 22 }, para: { x: 78, y: 30 } }], [{ bola_id: "B1", de: { x: 22, y: 80 }, para: { x: 78, y: 30 } }], [{ tipo: "bola", de: { x: 22, y: 80 }, para: { x: 78, y: 30 }, rotulo: "envio" }], ["A1", "B1"]),
      makeFrame("Resposta com margem", "Devolva alto e seguro para ganhar tempo.", [], [{ bola_id: "B1", de: { x: 78, y: 30 }, para: { x: 32, y: 76 } }], [{ tipo: "bola", de: { x: 78, y: 30 }, para: { x: 32, y: 76 }, rotulo: "resposta" }], ["Z1"])
    ];
    return base;
  }
  if (kind === "dupla") {
    const target = visualParticipantTarget(exercise);
    base.jogadores = target >= 4
      ? [
          { id: "A1", rotulo: "jogador 1", inicio: { x: 76, y: 38 } },
          { id: "A2", rotulo: "parceiro", inicio: { x: 76, y: 58 } },
          { id: "O1", rotulo: "oponente", inicio: { x: 24, y: 38 } },
          { id: "O2", rotulo: "oponente", inicio: { x: 24, y: 58 } }
        ]
      : [
          { id: "A1", rotulo: "jogador 1", inicio: { x: 76, y: 38 } },
          { id: "A2", rotulo: "parceiro", inicio: { x: 76, y: 58 } }
        ];
    base.bolas = noBall ? [] : [{ id: "B1", inicio: { x: 24, y: 40 } }];
    base.zonas_alvo = noBall ? [] : [{ id: "Z1", rotulo: "zona alvo", x: 28, y: 78, largura: 20, altura: 16 }];
    base.frames = [
      makeFrame("Dupla organizada", "A1 fica responsável pela bola principal e A2 fecha o espaço livre.", [], [], [], ["A1", "A2"]),
      makeFrame("Ação e cobertura", "A1 executa a ação principal enquanto A2 acompanha em cobertura.", [{ jogador_id: "A1", de: { x: 76, y: 38 }, para: { x: 70, y: 44 } }, { jogador_id: "A2", de: { x: 76, y: 58 }, para: { x: 74, y: 52 } }], noBall ? [] : [{ bola_id: "B1", de: { x: 24, y: 40 }, para: { x: 70, y: 44 } }], noBall ? [{ tipo: "movimento", de: { x: 76, y: 38 }, para: { x: 70, y: 44 }, rotulo: "A1" }, { tipo: "movimento", de: { x: 76, y: 58 }, para: { x: 74, y: 52 }, rotulo: "A2" }] : [{ tipo: "bola", de: { x: 24, y: 40 }, para: { x: 70, y: 44 }, rotulo: "bola" }, { tipo: "movimento", de: { x: 76, y: 58 }, para: { x: 74, y: 52 }, rotulo: "cobertura" }], ["A1", "A2", "B1"]),
      makeFrame("Retorno em bloco", "Depois da ação, a dupla volta organizada para não abrir espaço.", [{ jogador_id: "A1", de: { x: 70, y: 44 }, para: { x: 76, y: 38 } }, { jogador_id: "A2", de: { x: 74, y: 52 }, para: { x: 76, y: 58 } }], noBall ? [] : [{ bola_id: "B1", de: { x: 70, y: 44 }, para: { x: 28, y: 78 } }], noBall ? [{ tipo: "movimento", de: { x: 70, y: 44 }, para: { x: 76, y: 38 }, rotulo: "retorno" }] : [{ tipo: "bola", de: { x: 70, y: 44 }, para: { x: 28, y: 78 }, rotulo: "direção" }], ["A1", "A2", "Z1"])
    ];
    return base;
  }
  base.frames = [
    makeFrame("Organização inicial", "Posicione-se de frente para o objetivo do exercício.", [], [], [], ["A1"]),
    makeFrame("Execução controlada", movementExecutionCue(exercise), [{ jogador_id: "A1", de: { x: 78, y: 24 }, para: { x: 68, y: 34 } }], noBall ? [] : [{ bola_id: "B1", de: { x: 30, y: 78 }, para: { x: 68, y: 34 } }], [{ tipo: noBall ? "movimento" : "bola", de: noBall ? { x: 78, y: 24 } : { x: 30, y: 78 }, para: { x: 68, y: 34 }, rotulo: noBall ? "move" : "bola" }], ["A1"]),
    makeFrame("Finalização e retorno", "Finalize equilibrado e volte para a base.", [{ jogador_id: "A1", de: { x: 68, y: 34 }, para: { x: 76, y: 28 } }], [], [{ tipo: "movimento", de: { x: 68, y: 34 }, para: { x: 76, y: 28 }, rotulo: "base" }], ["A1"])
  ];
  return base;
}

function desiredAnimationParticipantCount(exercise, currentCount) {
  const context = exerciseContext(exercise);
  const noBall = normalizeText(exercise && exercise.tipo).includes("sem bola") || context.includes("sem bola");
  const numberText = String(exercise && exercise.numero_alunos_ideal || "");
  const numbers = numberText.match(/\d+/g) || [];
  const maxInText = numbers.length ? Math.max(...numbers.map(Number)) : 0;
  let desired = Math.max(1, currentCount || 0);

  if (context.includes("grupo") || context.includes("rodizio") || context.includes("rodízio") || context.includes("fila") || context.includes("estacao") || context.includes("estação")) {
    desired = Math.max(desired, 4);
  } else if (context.includes("dupla") || context.includes("tatica") || context.includes("tática") || context.includes("posicionamento") || context.includes("cobertura") || context.includes("minha ou sua")) {
    desired = Math.max(desired, 4);
  } else if (!noBall && !context.includes("saque")) {
    desired = Math.max(desired, 2);
  }

  if (maxInText >= 4 && (context.includes("grupo") || context.includes("dupla") || context.includes("fila") || context.includes("rodizio") || context.includes("rodízio"))) {
    desired = Math.max(desired, Math.min(maxInText, 4));
  }

  return Math.min(4, desired);
}

function uniqueAnimationPlayerId(preferredId, usedIds) {
  if (!usedIds.has(preferredId)) return preferredId;
  let index = 2;
  while (usedIds.has(`P${index}`)) index += 1;
  return `P${index}`;
}

function visualParticipantTarget(exercise) {
  const context = exerciseContext(exercise);
  const primary = exercisePrimaryContext(exercise);
  const noBall = normalizeText(exercise && exercise.tipo).includes("sem bola") || context.includes("sem bola");
  const hasGroup = primary.includes("grupo") || primary.includes("rodizio") || primary.includes("fila") || primary.includes("circuito") || primary.includes("estacao");
  const hasOpponent = primary.includes("adversario") || primary.includes("oponente") || primary.includes("jogo condicionado");
  const hasDoubles = primary.includes("dupla") || primary.includes("tatica") || primary.includes("posicionamento") || primary.includes("cobertura") || primary.includes("minha ou sua");
  const hasSupport = context.includes("professor") || context.includes("apoio") || context.includes("envio") || context.includes("lancamento") || context.includes("lancar") || context.includes("alimentacao");

  if (hasDoubles && hasOpponent) return 4;
  if (hasDoubles) return 2;
  if (hasGroup) return 3;
  if (!noBall && hasSupport) return 2;
  if (!noBall && ["recepcao", "voleio", "bandeja", "smash", "defesa"].includes(animationKind(exercise))) return 2;
  return 1;
}

function additionalAnimationPlayerTemplates(exercise) {
  const context = exerciseContext(exercise);
  if (context.includes("dupla") || context.includes("tatica") || context.includes("tática") || context.includes("posicionamento") || context.includes("cobertura") || context.includes("minha ou sua")) {
    return [
      { id: "A2", rotulo: "parceiro", inicio: { x: 76, y: 38 } },
      { id: "O1", rotulo: "oponente", inicio: { x: 24, y: 38 } },
      { id: "O2", rotulo: "oponente", inicio: { x: 24, y: 62 } },
      { id: "T1", rotulo: "apoio", inicio: { x: 18, y: 78 } }
    ];
  }
  if (context.includes("grupo") || context.includes("rodizio") || context.includes("rodízio") || context.includes("fila") || context.includes("estacao") || context.includes("estação")) {
    return [
      { id: "P2", rotulo: "aluno 2", inicio: { x: 82, y: 38 } },
      { id: "P3", rotulo: "aluno 3", inicio: { x: 82, y: 52 } },
      { id: "P4", rotulo: "aluno 4", inicio: { x: 82, y: 66 } },
      { id: "T1", rotulo: "professor", inicio: { x: 24, y: 78 } }
    ];
  }
  return [
    { id: "T1", rotulo: "apoio", inicio: { x: 28, y: 78 } },
    { id: "P2", rotulo: "parceiro", inicio: { x: 76, y: 38 } },
    { id: "P3", rotulo: "fila", inicio: { x: 84, y: 54 } }
  ];
}

function ensureAnimationParticipants(animation, exercise) {
  if (!animation) return animation;
  let players = safeArray(animation.jogadores).map((player) => ({
    ...player,
    inicio: player && player.inicio ? { ...player.inicio } : { x: 50, y: 50 }
  }));
  const referencedIds = new Set();
  safeArray(animation.frames).forEach((frame) => {
    safeArray(frame.movimentos_jogadores).forEach((move) => {
      if (move.jogador_id) referencedIds.add(move.jogador_id);
    });
    safeArray(frame.destaques).forEach((id) => {
      if (players.some((player) => player.id === id)) referencedIds.add(id);
    });
  });
  const targetCount = Math.max(visualParticipantTarget(exercise), referencedIds.size || 1);
  if (players.length > targetCount) {
    players = players
      .map((player, index) => ({ player, index, score: referencedIds.has(player.id) ? 10 : 0 }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, targetCount)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.player);
  }
  const usedIds = new Set(players.map((player) => player.id).filter(Boolean));
  additionalAnimationPlayerTemplates(exercise).forEach((template) => {
    if (players.length >= targetCount) return;
    const id = uniqueAnimationPlayerId(template.id, usedIds);
    usedIds.add(id);
    players.push({ ...template, id, inicio: { ...template.inicio } });
  });
  return { ...animation, jogadores: players };
}

function normalizedExerciseAnimation(exercise) {
  const animation = exercise && exercise.animacao_diagrama;
  const preparedAnimation = animationNeedsRepair(exercise, animation) ? makeContextualAnimation(exercise) : animation;
  return ensureAnimationParticipants(preparedAnimation, exercise);
}

class DiagramPlayer {
  constructor(containerElement) {
    this.container = containerElement;
    this.exercise = null;
    this.animation = null;
    this.currentFrame = 0;
    this.timer = null;
    this.uid = `diagram-${Math.random().toString(36).slice(2)}`;
  }

  renderExerciseAnimation(exercicio) {
    this.clear();
    this.exercise = exercicio;
    this.animation = normalizedExerciseAnimation(exercicio);
    if (!this.container) return;
    if (!this.animation || !safeArray(this.animation.frames).length) {
      this.container.innerHTML = `<div class="diagram-box">${new DiagramManager().renderExerciseDiagram(exercicio)}</div>`;
      return;
    }
    this.container.innerHTML = `
      <div class="animated-diagram-card">
        <div class="animated-diagram-topline">
          <div>
            <span class="eyebrow">Animação do exercício</span>
            <strong>${escapeHTML(this.animation.nome_animacao || exercicio.nome)}</strong>
          </div>
          <span class="diagram-step-indicator" data-diagram-indicator></span>
        </div>
        <div class="animated-diagram-stage">
          <div data-diagram-stage></div>
          <button class="diagram-play-overlay" data-diagram-action="toggle" aria-label="Reproduzir animação">Play</button>
        </div>
        <div class="animated-diagram-caption">
          <strong data-diagram-title></strong>
          <p data-diagram-narration></p>
        </div>
        <div class="diagram-progress" data-diagram-progress></div>
      </div>
    `;
    this.container.querySelectorAll("[data-diagram-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.diagramAction;
        if (action === "toggle") this.togglePlay();
        if (action === "play") this.play();
        if (action === "pause") this.pause();
      });
    });
    this.goToFrame(0);
  }

  render(exercicio) {
    this.renderExerciseAnimation(exercicio);
  }

  play() {
    if (!this.animation || this.timer) return;
    this.container && this.container.classList.add("is-playing");
    this.timer = window.setInterval(() => this.nextFrame(), this.frameDuration());
    this.updateProgress();
  }

  pause() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.container && this.container.classList.remove("is-playing");
    this.updateProgress();
  }

  togglePlay() {
    if (this.timer) {
      this.pause();
    } else {
      this.play();
    }
  }

  reset() {
    this.pause();
    this.goToFrame(0);
  }

  nextFrame() {
    const total = safeArray(this.animation && this.animation.frames).length;
    if (!total) return;
    if (this.currentFrame >= total - 1) {
      if (this.animation.loop) {
        this.goToFrame(0);
      } else {
        this.pause();
      }
      return;
    }
    this.goToFrame(this.currentFrame + 1);
  }

  previousFrame() {
    const total = safeArray(this.animation && this.animation.frames).length;
    if (!total) return;
    this.goToFrame(this.currentFrame <= 0 ? total - 1 : this.currentFrame - 1);
  }

  goToFrame(index) {
    const frames = safeArray(this.animation && this.animation.frames);
    if (!frames.length || !this.container) return;
    this.currentFrame = Math.max(0, Math.min(index, frames.length - 1));
    const frame = frames[this.currentFrame];
    const stage = this.container.querySelector("[data-diagram-stage]");
    const title = this.container.querySelector("[data-diagram-title]");
    const narration = this.container.querySelector("[data-diagram-narration]");
    const indicator = this.container.querySelector("[data-diagram-indicator]");
    if (stage) stage.innerHTML = this.svg(frame);
    if (title) title.textContent = frame.titulo || `Passo ${this.currentFrame + 1}`;
    if (narration) narration.textContent = frame.narracao_curta || this.animation.descricao_geral || "";
    if (indicator) indicator.textContent = `Etapa ${this.currentFrame + 1} de ${frames.length} - ${frame.titulo || "Execução"}`;
    this.updateProgress();
  }

  updateProgress() {
    if (!this.container || !this.animation) return;
    const frames = safeArray(this.animation.frames);
    const progress = this.container.querySelector("[data-diagram-progress]");
    const toggle = this.container.querySelector('[data-diagram-action="toggle"]');
    if (toggle) {
      toggle.textContent = this.timer ? "Pausar" : "Play";
      toggle.setAttribute("aria-label", this.timer ? "Pausar animação" : "Reproduzir animação");
    }
    if (progress) {
      progress.innerHTML = frames.map((frame, index) => `
        <span class="diagram-progress-dot ${index === this.currentFrame ? "active" : ""}" aria-hidden="true"></span>
      `).join("");
    }
  }

  clear() {
    this.pause();
    if (this.container) this.container.innerHTML = "";
  }

  frameDuration() {
    const frame = safeArray(this.animation && this.animation.frames)[this.currentFrame] || {};
    return Number(frame.duracao_ms || this.animation.duracao_frame_ms || 1300);
  }

  svg(frame) {
    const highlights = new Set(safeArray(frame.destaques));
    const duration = Number(frame.duracao_ms || this.animation.duracao_frame_ms || 1300);
    return `
      <svg class="animated-diagram-svg" viewBox="0 0 620 430" role="img" aria-label="Animação didática do exercício">
        <defs>
          <marker id="${this.uid}-ball" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#f2b84b"></path>
          </marker>
          <marker id="${this.uid}-move" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
            <path d="M0,0 L9,4.5 L0,9 Z" fill="#006d77"></path>
          </marker>
          <pattern id="${this.uid}-sand" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="5" r="1.1" fill="#d4a95e" opacity=".34"></circle>
            <circle cx="12" cy="13" r="1" fill="#f3dca9" opacity=".62"></circle>
          </pattern>
        </defs>
        ${this.courtMarkup()}
        ${safeArray(this.animation.zonas_alvo).map((zone) => this.zoneMarkup(zone, highlights.has(zone.id))).join("")}
        ${safeArray(this.animation.cones).map((cone) => this.coneMarkup(cone, highlights.has(cone.id))).join("")}
        ${safeArray(frame.setas).map((arrow) => this.arrowMarkup(arrow)).join("")}
        ${this.playersMarkup(frame, highlights, duration)}
        ${this.ballsMarkup(frame, highlights, duration)}
        ${this.legendMarkup()}
      </svg>
    `;
  }

  courtMarkup() {
    const court = this.animation.quadra || {};
    const net = court.rede || {};
    const netPosition = Number(net.x || net.y || 50);
    const netX = 44 + (532 * netPosition) / 100;
    return `
      <rect x="12" y="14" width="596" height="378" rx="14" fill="#e8c98f"></rect>
      <rect x="12" y="14" width="596" height="378" rx="14" fill="url(#${this.uid}-sand)"></rect>
      <rect x="44" y="52" width="532" height="300" rx="5" fill="rgba(255,255,255,.05)" stroke="#ffffff" stroke-width="5"></rect>
      <line x1="${netX}" y1="52" x2="${netX}" y2="352" stroke="#17333d" stroke-width="11" opacity=".28"></line>
      <line x1="${netX}" y1="52" x2="${netX}" y2="352" stroke="#ffffff" stroke-width="3" opacity=".92"></line>
      <text x="62" y="82" fill="#17333d" font-size="13" font-weight="900" opacity=".62">lado A</text>
      <text x="504" y="82" fill="#17333d" font-size="13" font-weight="900" opacity=".62">lado B</text>
      <text x="30" y="34" fill="#17333d" font-size="14" font-weight="900">Vista superior</text>
    `;
  }

  playersMarkup(frame, highlights, duration) {
    const overlapGroups = new Map();
    return safeArray(this.animation.jogadores).map((player) => {
      const move = safeArray(frame.movimentos_jogadores).find((item) => item.jogador_id === player.id);
      const position = this.positionForPlayer(player.id, this.currentFrame);
      const origin = player.inicio || position || {};
      const overlapKey = `${Math.round(Number(origin.x || 0) / 4)}:${Math.round(Number(origin.y || 0) / 4)}`;
      const overlapIndex = overlapGroups.get(overlapKey) || 0;
      overlapGroups.set(overlapKey, overlapIndex + 1);
      const offsetDirection = overlapIndex % 2 === 0 ? 1 : -1;
      const offsetSize = overlapIndex ? 10 + Math.floor((overlapIndex - 1) / 2) * 7 : 0;
      const offset = offsetDirection * offsetSize;
      const from = this.point(move && move.de ? move.de : position);
      const to = this.point(move && move.para ? move.para : position);
      from.x += offset;
      to.x += offset;
      const label = player.rotulo ? player.rotulo.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase() : player.id;
      const movingClass = move ? " is-moving" : "";
      const highlightClass = highlights.has(player.id) ? " is-highlighted" : "";
      return `
        <g class="anim-player${movingClass}${highlightClass}" style="--from-x:${from.x}px;--from-y:${from.y}px;--to-x:${to.x}px;--to-y:${to.y}px;animation-duration:${duration}ms;transform:translate(${to.x}px, ${to.y}px);">
          <circle r="16"></circle>
          <text y="5" text-anchor="middle">${escapeHTML(label || player.id)}</text>
          <title>${escapeHTML(player.rotulo || player.id)}</title>
        </g>
      `;
    }).join("");
  }

  ballsMarkup(frame, highlights, duration) {
    const movements = safeArray(frame.movimentos_bola);
    const baseBalls = safeArray(this.animation.bolas);
    const movementOnlyBalls = movements
      .filter((move) => !baseBalls.some((ball) => ball.id === move.bola_id))
      .map((move) => ({ id: move.bola_id || "B", inicio: move.de || move.para }));
    return baseBalls.concat(movementOnlyBalls).map((ball) => {
      const move = movements.find((item) => item.bola_id === ball.id || (!item.bola_id && ball.id === "B"));
      const position = this.positionForBall(ball.id, this.currentFrame);
      const from = this.point(move && move.de ? move.de : position);
      const to = this.point(move && move.para ? move.para : position);
      const movingClass = move ? " is-moving" : "";
      const highlightClass = highlights.has(ball.id) ? " is-highlighted" : "";
      return `
        <g class="anim-ball${movingClass}${highlightClass}" style="--from-x:${from.x}px;--from-y:${from.y}px;--to-x:${to.x}px;--to-y:${to.y}px;animation-duration:${duration}ms;transform:translate(${to.x}px, ${to.y}px);">
          <circle r="7"></circle>
        </g>
      `;
    }).join("");
  }

  arrowMarkup(arrow) {
    if (!arrow.de || !arrow.para) return "";
    const start = this.point(arrow.de);
    const end = this.point(arrow.para);
    const isBall = normalizeText(arrow.tipo).includes("bola") || normalizeText(arrow.tipo).includes("trajetoria");
    const marker = isBall ? `${this.uid}-ball` : `${this.uid}-move`;
    const cls = isBall ? "ball-arrow" : "move-arrow";
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const curve = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y) ? -26 : 26;
    return `
      <g class="anim-arrow ${cls}">
        <path d="M${start.x} ${start.y} C${midX} ${midY + curve}, ${midX} ${midY + curve}, ${end.x} ${end.y}" marker-end="url(#${marker})"></path>
        ${arrow.rotulo ? `<text x="${midX}" y="${midY + curve - 6}" text-anchor="middle">${escapeHTML(arrow.rotulo)}</text>` : ""}
      </g>
    `;
  }

  coneMarkup(cone, highlighted) {
    const p = this.point(cone);
    return `
      <g class="anim-cone${highlighted ? " is-highlighted" : ""}">
        <path d="M${p.x} ${p.y - 10} L${p.x - 10} ${p.y + 10} L${p.x + 10} ${p.y + 10} Z"></path>
        ${cone.rotulo ? `<text x="${p.x}" y="${p.y + 24}" text-anchor="middle">${escapeHTML(cone.rotulo)}</text>` : ""}
      </g>
    `;
  }

  zoneMarkup(zone, highlighted) {
    const p = this.point(zone);
    const width = 532 * Number(zone.altura || 8) / 100;
    const height = 300 * Number(zone.largura || 8) / 100;
    return `
      <g class="anim-zone${highlighted ? " is-highlighted" : ""}">
        <rect x="${p.x - width / 2}" y="${p.y - height / 2}" width="${width}" height="${height}" rx="10"></rect>
        ${zone.rotulo ? `<text x="${p.x}" y="${p.y - height / 2 - 6}" text-anchor="middle">${escapeHTML(zone.rotulo)}</text>` : ""}
      </g>
    `;
  }

  legendMarkup() {
    const items = safeArray(this.animation.legenda).slice(0, 4);
    if (!items.length) return "";
    return `
      <g class="anim-legend" transform="translate(42 372)">
        ${items.map((item, index) => `<text x="${(index % 2) * 278}" y="${Math.floor(index / 2) * 20}">${escapeHTML(item)}</text>`).join("")}
      </g>
    `;
  }

  positionForPlayer(id, frameIndex) {
    const player = safeArray(this.animation.jogadores).find((item) => item.id === id);
    let position = (player && player.inicio) || { x: 50, y: 75 };
    safeArray(this.animation.frames).slice(0, frameIndex + 1).forEach((frame) => {
      safeArray(frame.movimentos_jogadores).forEach((move) => {
        if (move.jogador_id === id && move.para) position = move.para;
      });
    });
    return position;
  }

  positionForBall(id, frameIndex) {
    const ball = safeArray(this.animation.bolas).find((item) => item.id === id);
    let position = (ball && ball.inicio) || { x: 50, y: 50 };
    safeArray(this.animation.frames).slice(0, frameIndex + 1).forEach((frame) => {
      safeArray(frame.movimentos_bola).forEach((move) => {
        if ((move.bola_id === id || (!move.bola_id && id === "B")) && move.para) position = move.para;
      });
    });
    return position;
  }

  point(raw) {
    const sourceX = Number(raw && raw.x || 0);
    const sourceY = Number(raw && raw.y || 0);
    const visualX = Math.max(0, Math.min(100, sourceY));
    const visualY = Math.max(0, Math.min(100, sourceX));
    const x = 44 + (532 * visualX) / 100;
    const y = 52 + (300 * visualY) / 100;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }
}

class DiagramManager {
  renderExerciseDiagram(exercise) {
    return this.createExerciseDiagram(exercise);
  }

  createExerciseDiagram(exercise) {
    const source = normalizeText([
      exercise.nome,
      exercise.categoria,
      exercise.organizacao_na_quadra,
      safeArray(exercise.passo_a_passo).join(" "),
      exercise.prompt_imagem_diagrama
    ].join(" "));
    const isNoBall = normalizeText(exercise.tipo).includes("sem bola") || source.includes("sem bola");
    const title = escapeHTML(exercise.categoria || exercise.nome || "Diagrama");
    const actors = this.getActors(source);
    const arrows = this.getArrows(source, isNoBall);
    const ball = isNoBall ? "" : this.ballMarkup(source);
    const cones = this.coneMarkup(source, isNoBall);
    const targets = this.targetMarkup(source);
    const stations = this.stationMarkup(source);
    return `
      <svg viewBox="0 0 620 420" role="img" aria-label="Diagrama de quadra para ${title}">
        <defs>
          <marker id="arrowHead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#f26a4f"></path>
          </marker>
          <marker id="moveHead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#006d77"></path>
          </marker>
          <pattern id="sandPattern" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="5" r="1.1" fill="#d4a95e" opacity=".34"></circle>
            <circle cx="12" cy="13" r="1" fill="#f3dca9" opacity=".62"></circle>
          </pattern>
        </defs>
        <rect x="20" y="20" width="580" height="330" rx="8" fill="#e8c98f"></rect>
        <rect x="20" y="20" width="580" height="330" rx="8" fill="url(#sandPattern)"></rect>
        <rect x="70" y="58" width="480" height="240" rx="4" fill="rgba(255,255,255,.05)" stroke="#ffffff" stroke-width="5"></rect>
        <line x1="310" y1="58" x2="310" y2="298" stroke="#17333d" stroke-width="10" opacity=".28"></line>
        <line x1="310" y1="58" x2="310" y2="298" stroke="#ffffff" stroke-width="3" opacity=".92"></line>
        <text x="88" y="86" fill="#17333d" font-size="12" font-weight="900" opacity=".58">lado A</text>
        <text x="492" y="86" fill="#17333d" font-size="12" font-weight="900" opacity=".58">lado B</text>
        ${targets}
        ${cones}
        ${stations}
        ${arrows}
        ${actors}
        ${ball}
        <text x="36" y="35" fill="#17333d" font-size="15" font-weight="800">${title}</text>
        ${this.legendMarkup(isNoBall)}
      </svg>
    `;
  }

  getActors(context) {
    if (context.includes("grupo")) {
      return [
        this.player(118, 282, "P1"),
        this.player(178, 282, "P2"),
        this.player(238, 282, "P3"),
        this.player(392, 108, "A1", "#0b5861"),
        this.player(462, 108, "A2", "#0b5861"),
        this.player(530, 108, "T", "#f26a4f")
      ].join("");
    }
    if (context.includes("tatica") || context.includes("dupla") || context.includes("posicionamento")) {
      return [
        this.player(178, 118, "P1"),
        this.player(178, 268, "P2"),
        this.player(442, 118, "A1", "#0b5861"),
        this.player(442, 268, "A2", "#0b5861")
      ].join("");
    }
    if (context.includes("voleio")) {
      return [this.player(248, 150, "P1"), this.player(438, 118, "T", "#f26a4f")].join("");
    }
    if (context.includes("bandeja")) {
      return [this.player(236, 168, "P1"), this.player(452, 116, "T", "#f26a4f")].join("");
    }
    if (context.includes("smash")) {
      return [this.player(242, 176, "P1"), this.player(440, 110, "T", "#f26a4f")].join("");
    }
    if (context.includes("saque")) {
      return [this.player(128, 285, "P1"), this.player(450, 108, "A1", "#0b5861")].join("");
    }
    if (context.includes("recepcao")) {
      return [this.player(145, 284, "P1"), this.player(482, 96, "T", "#f26a4f")].join("");
    }
    if (context.includes("deslocamento") || context.includes("condicionamento") || context.includes("coordenacao") || context.includes("reacao") || context.includes("mobilidade") || context.includes("aquecimento")) {
      return [this.player(128, 292, "P1"), this.player(500, 92, "T", "#f26a4f")].join("");
    }
    if (context.includes("defesa")) {
      return [this.player(142, 286, "P1"), this.player(470, 112, "A1", "#0b5861")].join("");
    }
    if (context.includes("controle") || context.includes("precisao")) {
      return [this.player(190, 266, "P1"), this.player(420, 116, "T", "#f26a4f")].join("");
    }
    return [this.player(180, 270, "P1"), this.player(438, 112, "T", "#f26a4f")].join("");
  }

  getArrows(context, isNoBall) {
    if (context.includes("saque")) {
      return `
        ${this.ballArrow("M132 268 C230 204, 348 142, 485 92")}
        ${this.moveArrow("M128 285 C118 260, 118 242, 132 222", true)}
      `;
    }
    if (context.includes("recepcao")) {
      return `
        ${this.ballArrow("M475 104 C372 154, 258 224, 152 284")}
        ${this.ballArrow("M154 270 C238 210, 352 154, 455 112")}
      `;
    }
    if (context.includes("voleio")) {
      return `
        ${this.ballArrow("M432 120 C365 132, 306 144, 252 150")}
        ${this.ballArrow("M252 148 C314 132, 388 116, 492 96")}
      `;
    }
    if (context.includes("bandeja")) {
      return `
        ${this.moveArrow("M236 170 C216 198, 194 226, 166 258", true)}
        ${this.ballArrow("M450 112 C365 82, 256 104, 170 248")}
        ${this.ballArrow("M170 248 C270 188, 372 136, 494 100")}
      `;
    }
    if (context.includes("smash")) {
      return `
        ${this.ballArrow("M438 110 C360 84, 282 96, 244 168")}
        ${this.ballArrow("M244 170 C314 182, 410 234, 514 282")}
      `;
    }
    if (context.includes("defesa")) {
      return `
        ${this.ballArrow("M472 112 C350 150, 246 216, 142 286")}
        ${this.moveArrow("M142 286 C194 268, 224 230, 250 190", true)}
      `;
    }
    if (context.includes("tatica") || context.includes("dupla") || context.includes("posicionamento")) {
      return `
        ${this.moveArrow("M178 118 C212 152, 212 232, 178 268", true)}
        ${this.moveArrow("M442 118 C408 152, 408 232, 442 268", true)}
        ${this.ballArrow("M178 118 C280 104, 356 104, 442 118")}
      `;
    }
    if (context.includes("controle") || context.includes("precisao")) {
      return `
        ${this.ballArrow("M194 258 C265 220, 336 170, 448 124")}
        ${this.ballArrow("M448 124 C366 158, 284 214, 198 260")}
      `;
    }
    if (context.includes("deslocamento") || context.includes("reacao") || context.includes("coordenacao") || context.includes("condicionamento") || context.includes("aquecimento") || context.includes("mobilidade") || isNoBall) {
      return `
        ${this.moveArrow("M128 292 C112 236, 126 160, 182 110", true)}
        ${this.moveArrow("M182 110 C250 146, 244 238, 128 292", true)}
      `;
    }
    return `${this.ballArrow("M185 268 C275 210, 360 158, 450 110")}`;
  }

  targetMarkup(context) {
    if (context.includes("tatica") || context.includes("posicionamento") || context.includes("dupla")) {
      return `
        ${this.zone(70, 58, 240, 120, "lado A alto")}
        ${this.zone(70, 178, 240, 120, "lado A baixo")}
        ${this.zone(310, 58, 240, 120, "lado B alto")}
        ${this.zone(310, 178, 240, 120, "lado B baixo")}
      `;
    }
    if (context.includes("saque")) {
      return this.zone(408, 68, 118, 62, "alvo saque");
    }
    if (context.includes("smash") || context.includes("ataque")) {
      return this.zone(420, 226, 110, 62, "zona alvo");
    }
    if (context.includes("controle") || context.includes("precisao")) {
      return this.zone(406, 88, 110, 72, "alvo controle");
    }
    return "";
  }

  coneMarkup(context, isNoBall) {
    if (!(context.includes("cone") || context.includes("circuito") || context.includes("alvo") || context.includes("deslocamento") || context.includes("reacao") || context.includes("grupo") || context.includes("condicionamento") || context.includes("coordenacao") || isNoBall)) {
      return "";
    }
    return [[92, 92], [92, 288], [232, 110], [232, 288], [528, 92], [528, 288]]
      .map(([x, y]) => `<path d="M${x} ${y - 10} L${x - 10} ${y + 10} L${x + 10} ${y + 10} Z" fill="#f26a4f" opacity=".85"></path>`)
      .join("");
  }

  stationMarkup(context) {
    if (!context.includes("condicionamento") && !context.includes("circuito")) return "";
    return [[118, 110, "1"], [230, 288, "2"], [420, 288, "3"], [520, 110, "4"]].map(([x, y, label]) => `
      <g>
        <circle cx="${x}" cy="${y}" r="16" fill="#ffffff" stroke="#006d77" stroke-width="4"></circle>
        <text x="${x}" y="${y + 5}" fill="#006d77" font-size="13" font-weight="900" text-anchor="middle">${label}</text>
      </g>
    `).join("");
  }

  ballMarkup(context) {
    if (context.includes("recepcao") || context.includes("defesa")) return this.ball(160, 270);
    if (context.includes("bandeja") || context.includes("smash")) return this.ball(250, 116);
    if (context.includes("controle") || context.includes("precisao")) return this.ball(448, 124);
    return this.ball(470, 102);
  }

  ballArrow(path) {
    return `<path d="${path}" fill="none" stroke="#f26a4f" stroke-width="6" stroke-linecap="round" marker-end="url(#arrowHead)"></path>`;
  }

  moveArrow(path, dashed = false) {
    return `<path d="${path}" fill="none" stroke="#006d77" stroke-width="5" ${dashed ? 'stroke-dasharray="10 8"' : ""} stroke-linecap="round" marker-end="url(#moveHead)"></path>`;
  }

  zone(x, y, width, height, label) {
    return `
      <g>
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="#dfff55" opacity=".22" stroke="#c99735" stroke-width="3" stroke-dasharray="8 7"></rect>
        <text x="${x + width / 2}" y="${y + height / 2 + 4}" fill="#6f5015" font-size="12" font-weight="900" text-anchor="middle">${escapeHTML(label)}</text>
      </g>
    `;
  }

  ball(x, y) {
    return `<circle cx="${x}" cy="${y}" r="9" fill="#dfff55" stroke="#17333d" stroke-width="3"></circle>`;
  }

  legendMarkup(isNoBall) {
    return `
      <g transform="translate(50 374)">
        <line x1="0" y1="0" x2="34" y2="0" stroke="#f26a4f" stroke-width="5" marker-end="url(#arrowHead)"></line>
        <text x="44" y="4" fill="#17333d" font-size="12" font-weight="800">bola</text>
        <line x1="96" y1="0" x2="130" y2="0" stroke="#006d77" stroke-width="5" stroke-dasharray="8 6" marker-end="url(#moveHead)"></line>
        <text x="140" y="4" fill="#17333d" font-size="12" font-weight="800">movimento</text>
        ${isNoBall ? '<text x="250" y="4" fill="#61717d" font-size="12" font-weight="800">sem bola</text>' : ""}
      </g>
    `;
  }

  player(x, y, label, fill = "#006d77") {
    return `
      <g>
        <circle cx="${x}" cy="${y}" r="19" fill="${fill}" stroke="#ffffff" stroke-width="4"></circle>
        <text x="${x}" y="${y + 5}" fill="#ffffff" font-size="13" font-weight="900" text-anchor="middle">${escapeHTML(label)}</text>
      </g>
    `;
  }
}

class PDFService {
  constructor(exerciseManager = null) {
    this.exerciseManager = exerciseManager;
  }

  setExerciseManager(exerciseManager) {
    this.exerciseManager = exerciseManager;
  }

  exerciseById(id) {
    return this.exerciseManager && this.exerciseManager.getById ? this.exerciseManager.getById(id) : null;
  }

  exerciseReference(id) {
    const exercise = this.exerciseById(id);
    if (!exercise) return `${id} - exercicio nao encontrado no banco`;
    return `${exercise.id} - ${exercise.nome} - ${exercise.categoria} - ${exercise.duracao_minutos} min`;
  }

  exerciseReferenceLines(ids, label = "Exercicios") {
    const values = safeArray(ids).filter(Boolean);
    if (!values.length) return [`${label}: nenhum exercicio relacionado.`];
    return [`${label}:`, ...values.map((id) => `- ${this.exerciseReference(id)}`)];
  }

  exportExercise(exercise) {
    const tips = [
      ...safeArray(exercise.dicas),
      ...safeArray(exercise.dicas_tecnicas),
      exercise.como_o_professor_deve_conduzir
    ].filter(Boolean);
    this.exportStructuredDocument({
      title: exercise.nome,
      subtitle: "Exercicio premium de Beach Tennis",
      meta: [
        ["Nivel", titleCase(exercise.nivel)],
        ["Categoria", exercise.categoria],
        ["Duracao", `${exercise.duracao_minutos} min`],
        ["Intensidade", titleCase(exercise.intensidade)],
        ["Tipo", titleCase(exercise.tipo)],
        ["Alunos", exercise.numero_alunos_ideal]
      ],
      sections: [
        { title: "Objetivo", lines: [exercise.objetivo] },
        { title: "Guia para iniciante", lines: normalizeText(exercise.nivel).includes("iniciante") ? buildBeginnerGuideItems(exercise).map((item) => `${item.title}: ${item.text}`) : [] },
        { title: "Materiais", lines: safeArray(exercise.materiais_necessarios).length ? safeArray(exercise.materiais_necessarios).map((item) => `- ${item}`) : ["Nenhum material especifico alem de espaco seguro na areia."] },
        { title: "Organizacao de quadra", lines: [exercise.organizacao_na_quadra || "Organize a area antes de iniciar, deixando espaco livre para deslocamento e retorno a base."] },
        { title: "Passo a passo", lines: safeArray(exercise.passo_a_passo).map((step, index) => `${index + 1}. ${neutralizeInstruction(step)}`) },
        { title: "Metricas de controle", lines: [beginnerMetricCue(exercise), "Registre acertos, erros sem necessidade, qualidade do equilibrio e tempo para voltar a posicao inicial."] },
        { title: "Variacoes", lines: [exercise.variacao_facil ? `Facil: ${exercise.variacao_facil}` : "", exercise.variacao_dificil ? `Dificil: ${exercise.variacao_dificil}` : ""].filter(Boolean) },
        { title: "Erros comuns", lines: safeArray(exercise.erros_comuns).map((item) => `- ${item}`) },
        { title: "Dicas e observacoes", lines: tips.map((tip) => `- ${tip}`) },
        { title: "Cuidados de seguranca", lines: safeArray(exercise.cuidados_de_seguranca).map((item) => `- ${item}`) }
      ]
    });
  }

  exportWorkout(workout, exercises) {
    const total = sumValues(exercises, (item) => item.duracao_minutos);
    this.exportStructuredDocument({
      title: workout.name || "Treino personalizado",
      subtitle: "Treino montado no Beach Tennis Pro Trainer",
      meta: [
        ["Duracao total", `${total} min`],
        ["Exercicios", String(exercises.length)],
        ["Objetivo", workout.goal || "Treino personalizado"],
        ["Intensidade", this.averageIntensityLabel(exercises)]
      ],
      sections: [
        { title: "Objetivo do treino", lines: [workout.goal || "Executar os exercicios na ordem proposta, mantendo controle tecnico e seguranca na areia."] },
        { title: "Organizacao recomendada", lines: ["Separe os materiais antes de comecar, defina os alvos na quadra e faca as transicoes entre exercicios sem pressa.", "Use pausas curtas para explicar o proximo bloco e reorganizar bolas, cones e alunos."] },
        ...safeArray(exercises).map((exercise, index) => ({
          title: `${index + 1}. ${exercise.nome}`,
          lines: [
            `${titleCase(exercise.nivel)} | ${exercise.categoria} | ${exercise.duracao_minutos} min | ${titleCase(exercise.intensidade)}`,
            `Objetivo: ${exercise.objetivo}`,
            `Como comecar: ${beginnerSetupCue(exercise)}`,
            safeArray(exercise.passo_a_passo).slice(0, 2).map((step, stepIndex) => `${stepIndex + 1}. ${neutralizeInstruction(step)}`).join(" "),
            `Metrica: ${beginnerMetricCue(exercise)}`
          ]
        }))
      ]
    });
  }

  exportLesson(plan) {
    this.exportStructuredDocument({
      title: plan.nome,
      subtitle: "Plano de aula premium",
      meta: [
        ["Nivel", titleCase(plan.nivel)],
        ["Publico", plan.publico],
        ["Duracao", `${plan.duracao_total_minutos} min`],
        ["Intensidade", titleCase(plan.intensidade)]
      ],
      sections: [
        { title: "Objetivo do plano", lines: [plan.objetivo_principal, buildPremiumLessonObjective(plan)] },
        ...safeArray(plan.estrutura_da_aula).map((block, index) => ({
          title: `Bloco ${index + 1}: ${block.bloco}`,
          lines: [
            `Tempo: ${block.duracao_minutos} min`,
            `Objetivo do bloco: ${block.descricao}`,
            ...this.exerciseReferenceLines(block.exercicios_relacionados, "Exercicios relacionados")
          ]
        })),
        { title: "Partes da aula", lines: [`Aquecimento: ${plan.aquecimento}`, `Parte tecnica: ${plan.parte_tecnica}`, `Parte tatica: ${plan.parte_tatica}`, `Exercicio principal: ${plan.exercicio_principal}`, `Desafio final: ${plan.desafio_final}`, `Volta a calma: ${plan.volta_a_calma}`] },
        { title: "Observacoes de aplicacao", lines: [plan.observacoes_para_professor, plan.observacoes_para_aluno, plan.resultado_esperado].filter(Boolean) },
        { title: "Acompanhamento", lines: ["Marque os exercicios concluidos no app para atualizar o progresso do plano e identificar onde o aluno precisa repetir."] }
      ]
    });
  }

  exportEvolution(plan) {
    this.exportStructuredDocument({
      title: plan.nome,
      subtitle: "Plano de evolucao",
      meta: [
        ["Nivel", titleCase(plan.nivel)],
        ["Duracao", `${plan.duracao_semanas} semanas`],
        ["Publico", plan.publico],
        ["Semanas", String(safeArray(plan.semanas).length)]
      ],
      sections: [
        { title: "Objetivo da evolucao", lines: [displayObjectiveText(plan.objetivo)] },
        ...safeArray(plan.semanas).map((week) => ({
          title: `Semana ${week.semana}: ${week.foco}`,
          lines: safeArray(week.treinos).flatMap((training) => [
            `${training.dia} | ${training.duracao_total_minutos} min`,
            `Objetivo do dia: ${training.objetivo_do_treino}`,
            ...this.exerciseReferenceLines(training.exercicios_sugeridos, "Exercicios sugeridos"),
            `Orientacoes: ${training.observacoes}`
          ])
        })),
        { title: "Acompanhamento", lines: ["O dia so deve contar como concluido quando todos os exercicios daquele treino forem marcados como concluidos no app.", "Se algum exercicio for desmarcado, o progresso deve diminuir automaticamente."] }
      ]
    });
  }

  exportStructuredDocument(spec) {
    const normalized = {
      title: spec && spec.title || "Beach Tennis Pro Trainer",
      subtitle: spec && spec.subtitle || "Material premium",
      meta: safeArray(spec && spec.meta),
      sections: safeArray(spec && spec.sections)
        .map((section) => ({
          title: section && section.title || "Conteudo",
          lines: safeArray(section && section.lines).filter(Boolean)
        }))
        .filter((section) => section.lines.length)
    };
    const jsPDFClass = window.jspdf && window.jspdf.jsPDF;
    if (jsPDFClass) {
      try {
        this.exportJsPdf(normalized, jsPDFClass);
        return;
      } catch (error) {
        console.warn("Falha no gerador principal de PDF. Usando gerador local.", error);
      }
    }
    this.exportFallbackStructuredPdf(normalized);
  }

  exportJsPdf(spec, jsPDFClass) {
    const doc = new jsPDFClass({ unit: "pt", format: "a4" });
    const margin = 42;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const today = new Date().toLocaleDateString("pt-BR");
    let y = 126;
    const checkPageBreak = (height) => {
      if (y + height <= pageHeight - 54) return;
      doc.addPage();
      this.addPdfHeader(doc, spec, margin, pageWidth, contentWidth, today);
      y = 126;
    };
    this.addPdfHeader(doc, spec, margin, pageWidth, contentWidth, today);
    y = this.addPdfMeta(doc, spec.meta, margin, y, contentWidth, checkPageBreak);
    spec.sections.forEach((section) => {
      y = this.addPdfSectionTitle(doc, section.title, margin, y, contentWidth, checkPageBreak);
      section.lines.forEach((line) => {
        y = this.addPdfTextCard(doc, line, margin, y, contentWidth, checkPageBreak);
      });
      y += 6;
    });
    const pages = doc.getNumberOfPages ? doc.getNumberOfPages() : doc.internal.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      this.addPdfFooter(doc, page, pages, margin, pageHeight, pageWidth);
    }
    doc.save(`${safeFilename(spec.title)}.pdf`);
  }

  addPdfHeader(doc, spec, margin, pageWidth, contentWidth, today) {
    doc.setFillColor(0, 109, 119);
    doc.rect(0, 0, pageWidth, 96, "F");
    doc.setFillColor(40, 182, 166);
    doc.rect(0, 92, pageWidth, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(String(spec.title || "Beach Tennis Pro Trainer"), margin, 38, { maxWidth: contentWidth });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`${spec.subtitle || "Material premium"} | Beach Tennis Pro Trainer | Gerado em ${today}`, margin, 66, { maxWidth: contentWidth });
  }

  addPdfFooter(doc, page, pages, margin, pageHeight, pageWidth) {
    doc.setDrawColor(217, 226, 225);
    doc.line(margin, pageHeight - 42, pageWidth - margin, pageHeight - 42);
    doc.setTextColor(97, 113, 125);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Beach Tennis Pro Trainer - Pagina ${page} de ${pages}`, margin, pageHeight - 26);
  }

  addPdfMeta(doc, meta, margin, y, contentWidth, checkPageBreak) {
    const items = safeArray(meta).filter((item) => item && item[1]);
    if (!items.length) return y;
    const colGap = 10;
    const colWidth = (contentWidth - colGap) / 2;
    items.forEach(([label, value], index) => {
      const x = margin + (index % 2) * (colWidth + colGap);
      if (index % 2 === 0) checkPageBreak(48);
      doc.setFillColor(248, 251, 250);
      doc.setDrawColor(217, 226, 225);
      doc.roundedRect(x, y, colWidth, 38, 6, 6, "FD");
      doc.setTextColor(0, 109, 119);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(String(label).toUpperCase(), x + 10, y + 14, { maxWidth: colWidth - 20 });
      doc.setTextColor(23, 35, 46);
      doc.setFontSize(10);
      doc.text(String(value), x + 10, y + 29, { maxWidth: colWidth - 20 });
      if (index % 2 === 1 || index === items.length - 1) y += 46;
    });
    return y + 4;
  }

  addPdfSectionTitle(doc, title, margin, y, contentWidth, checkPageBreak) {
    checkPageBreak(38);
    doc.setFillColor(232, 247, 245);
    doc.setDrawColor(190, 231, 225);
    doc.roundedRect(margin, y, contentWidth, 30, 7, 7, "FD");
    doc.setTextColor(0, 109, 119);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.4);
    doc.text(String(title || "Secao"), margin + 12, y + 20, { maxWidth: contentWidth - 24 });
    return y + 40;
  }

  addPdfTextCard(doc, value, margin, y, contentWidth, checkPageBreak) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return y;
    const wrapped = doc.splitTextToSize(text, contentWidth - 24);
    const height = Math.max(38, wrapped.length * 13.5 + 20);
    checkPageBreak(height);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, height, 7, 7, "FD");
    doc.setTextColor(23, 35, 46);
    doc.setFont("helvetica", /^\d+\.|^- /.test(text) ? "bold" : "normal");
    doc.setFontSize(9.8);
    doc.text(wrapped, margin + 12, y + 19);
    return y + height + 10;
  }

  averageIntensityLabel(exercises) {
    const text = safeArray(exercises).map((exercise) => normalizeText(exercise.intensidade)).join(" ");
    if (text.includes("alta")) return "Alta";
    if (text.includes("media") || text.includes("moderada")) return "Moderada";
    return "Baixa a moderada";
  }

  exportFallbackStructuredPdf(spec) {
    const entries = this.flattenStructuredPdfEntries(spec);
    const pages = [];
    let currentPage = [];
    let used = 0;
    entries.forEach((entry) => {
      const cost = entry.type === "section" ? 3 : Math.max(2, entry.lines.length + 1);
      if (used + cost > 38 && currentPage.length) {
        pages.push(currentPage);
        currentPage = [];
        used = 0;
      }
      currentPage.push(entry);
      used += cost;
    });
    if (currentPage.length) pages.push(currentPage);
    const objects = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
    const pageRefs = [];
    const fontId = 3 + pages.length * 2;
    pages.forEach((pageEntries, index) => {
      const pageId = 3 + index * 2;
      const contentId = pageId + 1;
      pageRefs.push(`${pageId} 0 R`);
      const content = this.fallbackStructuredPageContent(spec, pageEntries, index + 1, pages.length);
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });
    objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageRefs.length} >>`;
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    this.downloadBlob(new Blob([pdf], { type: "application/pdf" }), `${safeFilename(spec.title)}.pdf`);
  }

  flattenStructuredPdfEntries(spec) {
    const entries = [
      { type: "meta", lines: this.wrapPdfLine(`${spec.subtitle || "Material premium"} | Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 82) }
    ];
    safeArray(spec.meta).forEach(([label, value]) => {
      if (value) entries.push({ type: "card", lines: this.wrapPdfLine(`${label}: ${value}`, 82) });
    });
    safeArray(spec.sections).forEach((section) => {
      const lines = safeArray(section.lines).filter(Boolean);
      if (!lines.length) return;
      entries.push({ type: "section", lines: [String(section.title || "Secao")] });
      lines.forEach((line) => entries.push({ type: "card", lines: this.wrapPdfLine(line, 82) }));
    });
    return entries;
  }

  fallbackStructuredPageContent(spec, entries, page, pages) {
    let y = 730;
    const commands = [
      "0 0.43 0.47 rg",
      "0 760 595 82 re f",
      "BT",
      "/F1 18 Tf",
      "1 1 1 rg",
      "46 810 Td",
      `(${this.pdfEscape(this.ascii(spec.title || "Beach Tennis Pro Trainer").slice(0, 70))}) Tj`,
      "0 -24 Td",
      "/F1 9 Tf",
      "(Beach Tennis Pro Trainer) Tj",
      "ET"
    ];
    entries.forEach((entry) => {
      if (entry.type === "section") {
        commands.push("0.91 0.97 0.96 rg", `46 ${y - 16} 503 24 re f`, "BT", "/F1 11 Tf", "0 0.43 0.47 rg", `58 ${y} Td`, `(${this.pdfEscape(this.ascii(entry.lines[0]).slice(0, 88))}) Tj`, "ET");
        y -= 36;
        return;
      }
      const height = Math.max(26, entry.lines.length * 13 + 12);
      commands.push("0.98 0.99 0.98 rg", `46 ${y - height + 5} 503 ${height} re f`, "BT", "/F1 9.5 Tf", "0.09 0.14 0.18 rg", `58 ${y - 8} Td`, "13 TL");
      entry.lines.forEach((line) => commands.push(`(${this.pdfEscape(this.ascii(line).slice(0, 108))}) Tj T*`));
      commands.push("ET");
      y -= height + 8;
    });
    commands.push("BT", "/F1 8 Tf", "0.38 0.44 0.49 rg", "46 32 Td", `(Beach Tennis Pro Trainer - pagina ${page} de ${pages}) Tj`, "ET");
    return commands.join("\n");
  }

  exportTextDocument(title, lines) {
    const jsPDFClass = window.jspdf && window.jspdf.jsPDF;
    if (jsPDFClass) {
      try {
        const doc = new jsPDFClass({ unit: "pt", format: "a4" });
        const margin = 46;
        const width = doc.internal.pageSize.getWidth() - margin * 2;
        let y = margin;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const drawHeader = () => {
          doc.setFillColor(0, 109, 119);
          doc.rect(0, 0, pageWidth, 92, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(18);
          doc.text(String(title || "Beach Tennis Pro Trainer"), margin, 44, { maxWidth: width });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text("Beach Tennis Pro Trainer", margin, 68);
        };
        drawHeader();
        y = 122;
        doc.setTextColor(23, 35, 46);
        doc.setFontSize(10.5);
        safeArray(lines).forEach((line) => {
          const text = String(line || " ");
          const isHeading = /:$/.test(text) && text.length < 42;
          const wrapped = doc.splitTextToSize(text, width);
          wrapped.forEach((part) => {
            if (y > 790) {
              doc.addPage();
              drawHeader();
              y = 122;
            }
            if (isHeading) {
              doc.setFillColor(232, 247, 245);
              doc.roundedRect(margin - 8, y - 12, width + 16, 22, 5, 5, "F");
              doc.setTextColor(0, 109, 119);
              doc.setFont("helvetica", "bold");
            } else {
              doc.setTextColor(23, 35, 46);
              doc.setFont("helvetica", "normal");
            }
            doc.text(part, margin, y);
            y += isHeading ? 18 : 15;
          });
          y += isHeading ? 8 : 4;
        });
        const pages = doc.getNumberOfPages ? doc.getNumberOfPages() : doc.internal.getNumberOfPages();
        for (let page = 1; page <= pages; page += 1) {
          doc.setPage(page);
          doc.setTextColor(97, 113, 125);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(`Beach Tennis Pro Trainer • Página ${page} de ${pages}`, margin, pageHeight - 26);
        }
        doc.save(`${safeFilename(title)}.pdf`);
        return;
      } catch (error) {
        console.warn("Falha no gerador principal de PDF. Usando gerador local.", error);
      }
    }
    this.exportFallbackPdf(title, lines);
  }

  exportFallbackPdf(title, lines) {
    const cleanLines = safeArray(lines)
      .join("\n")
      .split("\n")
      .flatMap((line) => this.wrapPdfLine(line, 92));
    const pages = [];
    const perPage = 42;
    for (let i = 0; i < cleanLines.length; i += perPage) {
      pages.push(cleanLines.slice(i, i + perPage));
    }
    const objects = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
    const pageRefs = [];
    const fontId = 3 + pages.length * 2;
    pages.forEach((pageLines, index) => {
      const pageId = 3 + index * 2;
      const contentId = pageId + 1;
      pageRefs.push(`${pageId} 0 R`);
      const content = [
        "0 0.43 0.47 rg",
        "0 760 595 82 re f",
        "BT",
        "/F1 18 Tf",
        "1 1 1 rg",
        "46 810 Td",
        `(${this.pdfEscape(this.ascii(title || "Beach Tennis Pro Trainer").slice(0, 70))}) Tj`,
        "0 -24 Td",
        "/F1 9 Tf",
        "(Beach Tennis Pro Trainer) Tj",
        "ET",
        "BT",
        "/F1 10.5 Tf",
        "0.09 0.14 0.18 rg",
        "46 730 Td",
        "14 TL",
        ...pageLines.map((line) => `(${this.pdfEscape(this.ascii(line).slice(0, 110))}) Tj T*`),
        "ET",
        "BT",
        "/F1 8 Tf",
        "0.38 0.44 0.49 rg",
        "46 32 Td",
        `(Beach Tennis Pro Trainer - pagina ${index + 1} de ${pages.length}) Tj`,
        "ET"
      ].join("\n");
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });
    objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageRefs.length} >>`;
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    this.downloadBlob(new Blob([pdf], { type: "application/pdf" }), `${safeFilename(title)}.pdf`);
  }

  wrapPdfLine(value, maxLength = 92) {
    const words = this.ascii(value || " ").replace(/\s+/g, " ").trim().split(" ");
    const lines = [];
    let current = "";
    words.forEach((word) => {
      if (!current) {
        current = word;
        return;
      }
      if (`${current} ${word}`.length > maxLength) {
        lines.push(current);
        current = word;
      } else {
        current = `${current} ${word}`;
      }
    });
    if (current) lines.push(current);
    return lines.length ? lines : [" "];
  }

  ascii(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  pdfEscape(value) {
    return String(value || "").replace(/[\\()]/g, "\\$&");
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "beach-tennis-pro-trainer.pdf";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}


class ModalManager {
  constructor(diagramManager, app) {
    this.diagramManager = diagramManager;
    this.app = app;
    this.root = document.getElementById("modalRoot");
    this.diagramPlayer = null;
    this.stack = [];
  }

  getScrollTop() {
    const modal = this.root.querySelector(".modal");
    return modal ? modal.scrollTop : 0;
  }

  setScrollTop(value) {
    const modal = this.root.querySelector(".modal");
    if (modal) modal.scrollTop = Number(value || 0);
  }

  icon(name) {
    const icons = {
      heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2 4.9 13.1c-2.7-2.7-2.2-7.4 1.4-8.8 2.1-.8 4.1-.2 5.2 1.4C12.6 4.1 14.6 3.5 16.7 4.3c3.6 1.4 4.1 6.1 1.4 8.8L12 20.2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
      heartFilled: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2 4.9 13.1c-2.7-2.7-2.2-7.4 1.4-8.8 2.1-.8 4.1-.2 5.2 1.4C12.6 4.1 14.6 3.5 16.7 4.3c3.6 1.4 4.1 6.1 1.4 8.8L12 20.2Z" fill="currentColor"/></svg>`,
      sound: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h4l5-4v13l-5-4H4v-5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16.2 8.2a5.4 5.4 0 0 1 0 7.6M18.8 5.7a9 9 0 0 1 0 12.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
    };
    return icons[name] || "";
  }

  soundButton(id, variant = "secondary") {
    return `
      <button class="button ${variant} icon-action icon-action-sound" data-action="speak-exercise" data-id="${id}" title="Ouvir explicação" aria-label="Ouvir explicação">
        ${this.icon("sound")}<span class="sr-only">Ouvir</span>
      </button>
    `;
  }

  favoriteButton(id, isFavorite) {
    const label = isFavorite ? "Remover dos favoritos" : "Favoritar exercício";
    return `
      <button class="button ghost icon-action icon-action-heart ${isFavorite ? "is-favorite" : ""}" data-action="favorite-exercise" data-id="${id}" title="${label}" aria-label="${label}" aria-pressed="${isFavorite ? "true" : "false"}">
        ${this.icon(isFavorite ? "heartFilled" : "heart")}<span class="sr-only">${label}</span>
      </button>
    `;
  }

  showExercise(exercise, isFavorite, options = {}) {
    if (this.diagramPlayer) this.diagramPlayer.clear();
    const related = Boolean(options.related);
    const origin = options.source || options.origin || "";
    const compactActions = ["workout_builder", "workout_progress", "lesson_plan", "evolution_plan"].includes(origin);
    const closeAction = related ? "close-related-exercise" : "close-modal";
    const soundButton = this.soundButton(exercise.id);
    const favoriteButton = this.favoriteButton(exercise.id, isFavorite);
    const iconPair = `<div class="exercise-icon-pair">${soundButton}${favoriteButton}</div>`;
    const desktopActions = compactActions ? `
            ${iconPair}
          ` : `
            ${iconPair}
            <button class="button primary" data-action="add-exercise" data-id="${exercise.id}">Adicionar</button>
            <button class="button secondary" data-action="export-exercise" data-id="${exercise.id}">Exportar PDF</button>
          `;
    const bottomActions = compactActions ? `
          ${iconPair}
        ` : `
          ${iconPair}
          <button class="button primary" data-action="add-exercise" data-id="${exercise.id}">Adicionar</button>
        `;
    const essentialBadges = [
      this.pill(titleCase(exercise.nivel)),
      this.pill(exercise.categoria, "coral"),
      this.pill(exercise.duracao_minutos ? `${exercise.duracao_minutos} min` : ""),
      this.pill(titleCase(exercise.intensidade))
    ].join("");
    this.root.innerHTML = `
      <article class="modal exercise-detail-modal ${related ? "related-exercise-sheet" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal-header">
          <div>
            <span class="eyebrow">${related ? "Exerc\u00edcio relacionado" : escapeHTML(exercise.id)}</span>
            <h2 id="modal-title">${escapeHTML(exercise.nome)}</h2>
            <div class="meta-row essential-badges">${essentialBadges}</div>
            <div class="exercise-add-feedback desktop-feedback" data-exercise-add-feedback hidden>Exerc\u00edcio adicionado ao montador de treinos.</div>
          </div>
          <div class="inline-actions desktop-detail-actions">
            ${desktopActions}
          </div>
          <button class="button ghost mobile-close-button" data-action="${closeAction}">Fechar</button>
        </header>
        <div class="modal-body exercise-detail-body">
          <div class="exercise-detail-tabs" role="tablist" aria-label="Seções do exercício">
            <button class="exercise-detail-tab is-active" type="button" role="tab" aria-selected="true" data-action="set-exercise-detail-tab" data-tab="objective">Objetivo</button>
            <button class="exercise-detail-tab" type="button" role="tab" aria-selected="false" data-action="set-exercise-detail-tab" data-tab="steps">Passo a passo</button>
            <button class="exercise-detail-tab" type="button" role="tab" aria-selected="false" data-action="set-exercise-detail-tab" data-tab="extras">Extras</button>
          </div>
          <div class="exercise-detail-panels">
            <section class="exercise-detail-panel is-active" data-exercise-panel="objective">
              ${this.exerciseObjectivePart(exercise)}
            </section>
            <section class="exercise-detail-panel" data-exercise-panel="steps" hidden>
              ${this.exerciseStepsPart(exercise)}
            </section>
            <section class="exercise-detail-panel" data-exercise-panel="extras" hidden>
              ${this.exerciseExtrasPart(exercise)}
            </section>
          </div>
        </div>
        <div class="modal-actions-sticky exercise-bottom-actions">
          <div class="exercise-add-feedback mobile-feedback" data-exercise-add-feedback hidden>Exerc\u00edcio adicionado ao montador de treinos.</div>
          ${bottomActions}
        </div>
      </article>
    `;
    this.root.hidden = false;
    const host = this.root.querySelector("[data-diagram-host]");
    this.diagramPlayer = new DiagramPlayer(host);
    this.diagramPlayer.renderExerciseAnimation(exercise);
  }

  setExerciseDetailTab(tabName) {
    const activeTab = ["objective", "steps", "extras"].includes(tabName) ? tabName : "objective";
    this.root.querySelectorAll("[data-exercise-panel]").forEach((panel) => {
      const active = panel.dataset.exercisePanel === activeTab;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    this.root.querySelectorAll("[data-action='set-exercise-detail-tab']").forEach((button) => {
      const active = button.dataset.tab === activeTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  showExerciseAddFeedback() {
    const items = this.root.querySelectorAll("[data-exercise-add-feedback]");
    if (!items.length) return;
    items.forEach((item) => {
      window.clearTimeout(item.hideTimer);
      item.hidden = false;
      item.classList.remove("is-visible");
      void item.offsetWidth;
      item.classList.add("is-visible");
      item.hideTimer = window.setTimeout(() => {
        item.classList.remove("is-visible");
        window.setTimeout(() => {
          item.hidden = true;
        }, 180);
      }, 2600);
    });
  }

  showRelatedExercise(exercise, isFavorite, context = {}) {
    const previous = {
      html: this.root.innerHTML,
      scrollTop: this.getScrollTop(),
      context
    };
    this.stack.push(previous);
    this.showExercise(exercise, isFavorite, { ...context, related: true });
  }

  closeRelatedExercise() {
    if (this.diagramPlayer) this.diagramPlayer.clear();
    this.diagramPlayer = null;
    const previous = this.stack.pop();
    if (!previous) {
      this.close();
      return;
    }
    this.root.innerHTML = previous.html;
    this.root.hidden = false;
    window.requestAnimationFrame(() => this.setScrollTop(previous.scrollTop));
  }

  closeTop() {
    if (this.stack.length) {
      this.closeRelatedExercise();
      return;
    }
    this.close();
  }

  showLesson(plan, isFavorite) {
    if (this.diagramPlayer) this.diagramPlayer.clear();
    this.diagramPlayer = null;
    const progress = this.app.getLessonPlanProgress(plan);
    const exerciseIds = this.app.getPlanExerciseIds(plan);
    const completedExercises = safeArray(progress.completedExercises).length;
    const blockCount = safeArray(plan.estrutura_da_aula).length;
    this.root.innerHTML = `
      <article class="modal plan-modal" data-plan-modal="${plan.id}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal-header plan-modal-header">
          <div>
            <span class="eyebrow">${escapeHTML(plan.id)}</span>
            <h2 id="modal-title">${escapeHTML(plan.nome)}</h2>
            <div class="meta-row">
              ${this.pill(titleCase(plan.nivel))}
              ${this.pill(`${plan.duracao_total_minutos} min`, "coral")}
              ${this.pill(plan.intensidade)}
            </div>
          </div>
          <div class="inline-actions">
            <button class="button secondary" data-action="export-plan" data-id="${plan.id}">Exportar PDF</button>
            <button class="button ghost icon-action icon-action-heart ${isFavorite ? "is-favorite" : ""}" data-action="favorite-plan" data-id="${plan.id}" title="${isFavorite ? "Remover dos favoritos" : "Favoritar plano"}" aria-label="${isFavorite ? "Remover dos favoritos" : "Favoritar plano"}" aria-pressed="${isFavorite ? "true" : "false"}">${this.icon(isFavorite ? "heartFilled" : "heart")}<span class="sr-only">${isFavorite ? "Favorito" : "Favoritar"}</span></button>
            <button class="button ghost" data-action="close-modal">Voltar</button>
          </div>
        </header>
        <div class="modal-body plan-execution-body plan-detail-body">
          <div class="exercise-detail-tabs plan-detail-tabs" role="tablist" aria-label="Seções do plano">
            <button class="exercise-detail-tab plan-detail-tab is-active" type="button" role="tab" aria-selected="true" data-action="set-plan-detail-tab" data-tab="overview">Principal</button>
            <button class="exercise-detail-tab plan-detail-tab" type="button" role="tab" aria-selected="false" data-action="set-plan-detail-tab" data-tab="structure">Estrutura da aula</button>
          </div>
          <div class="plan-detail-panels">
            <section class="plan-detail-panel is-active" data-plan-panel="overview">
              <section class="execution-panel plan-main-panel">
                ${this.progressBar(progress.progressPercent, `${completedExercises} de ${exerciseIds.length} exerc\u00edcios conclu\u00eddos`, `${blockCount} blocos did\u00e1ticos`)}
                <div class="execution-metrics">
                  <span>Tempo planejado <strong>${escapeHTML(plan.duracao_total_minutos)} min</strong></span>
                  <span>Restante estimado <strong>${escapeHTML(this.app.getLessonRemainingMinutes(plan, progress))} min</strong></span>
                  <span>Status <strong>${escapeHTML(this.statusLabel(progress.status))}</strong></span>
                </div>
              </section>
              <div class="plan-mobile-objective">${this.objectiveBlock(plan.objetivo_principal, "Objetivo do plano")}</div>
            </section>
            <section class="plan-detail-panel" data-plan-panel="structure" hidden>
              <section class="plan-block-list">
                <div class="section-mini-heading">
                  <div>
                    <h3>Estrutura da aula</h3>
                    <p>Toque em cada bloco para abrir o didático da aula.</p>
                  </div>
                  <span>${blockCount} blocos</span>
                </div>
                ${safeArray(plan.estrutura_da_aula).map((block, index) => this.lessonBlockCard(plan, block, index, progress)).join("")}
              </section>
            </section>
          </div>
        </div>
      </article>
    `;
    this.root.hidden = false;
  }

  setPlanDetailTab(tabName) {
    const activeTab = ["overview", "structure"].includes(tabName) ? tabName : "overview";
    this.root.querySelectorAll("[data-plan-panel]").forEach((panel) => {
      const active = panel.dataset.planPanel === activeTab;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    this.root.querySelectorAll("[data-action='set-plan-detail-tab']").forEach((button) => {
      const active = button.dataset.tab === activeTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  showEvolution(plan) {
    if (this.diagramPlayer) this.diagramPlayer.clear();
    this.diagramPlayer = null;
    const progress = this.app.getEvolutionProgressState(plan);
    const weeks = safeArray(plan.semanas);
    const selectedWeekNumber = progress.currentDay ? Number(progress.currentWeek || progress.selectedWeek || 0) : Number(progress.selectedWeek || 0);
    const currentWeekNumber = selectedWeekNumber || progress.currentWeek || (weeks[0] && weeks[0].semana) || 1;
    const currentWeek = selectedWeekNumber ? weeks.find((week) => Number(week.semana) === Number(selectedWeekNumber)) : null;
    const currentDay = currentWeek ? safeArray(currentWeek.treinos).find((training) => this.app.getEvolutionDayKey(currentWeek.semana, training.dia) === progress.currentDay) : null;
    const inDayMode = Boolean(currentDay);
    const backAction = inDayMode
      ? `data-action="back-evolution-days" data-id="${plan.id}" data-week="${currentWeek.semana}"`
      : `data-action="close-modal"`;
    const backLabel = "Voltar";
    this.root.innerHTML = `
      <article class="modal evolution-modal" data-evolution-modal="${plan.id}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal-header plan-modal-header">
          <div>
            <span class="eyebrow">${escapeHTML(plan.id)}</span>
            <h2 id="modal-title">${escapeHTML(plan.nome)}</h2>
            <div class="meta-row">
              ${this.pill(titleCase(plan.nivel))}
              ${this.pill(`${plan.duracao_semanas} semanas`, "coral")}
            </div>
          </div>
          <div class="inline-actions">
            ${inDayMode ? "" : `<button class="button secondary" data-action="export-evolution" data-id="${plan.id}">Exportar PDF</button>`}
            <button class="button ghost" ${backAction}>${backLabel}</button>
          </div>
        </header>
        <div class="modal-body plan-execution-body">
          <section class="execution-panel">
            ${this.progressBar(progress.progressPercent, `${safeArray(progress.completedDays).length} dias conclu\u00eddos`, `${safeArray(progress.completedWeeks).length} semanas conclu\u00eddas`)}
          </section>
          ${inDayMode ? `
            ${this.evolutionDayDetail(plan, currentWeek, currentDay, progress)}
          ` : `
            <details class="mobile-objective-drawer">
              <summary>Objetivo da evolu\u00e7\u00e3o</summary>
              ${this.objectiveBlock(displayObjectiveText(plan.objetivo), "Objetivo da evolu\u00e7\u00e3o")}
            </details>
            <section class="week-tabs" aria-label="Semanas da evolu\u00e7\u00e3o">
              ${weeks.map((week) => {
                const selected = selectedWeekNumber && Number(week.semana) === Number(selectedWeekNumber);
                const weekProgress = this.app.getEvolutionWeekProgress(plan, progress, week);
                return `<button class="week-tab ${selected ? "is-active" : ""} ${weekProgress.percent >= 100 ? "is-complete" : ""}" data-action="open-evolution-week" data-id="${plan.id}" data-week="${week.semana}">
                  <strong>Semana ${escapeHTML(week.semana)}</strong>
                </button>`;
              }).join("")}
            </section>
            ${currentWeek ? this.evolutionWeekPanel(plan, currentWeek, progress) : `
              <section class="evolution-week-empty">
                <strong>Escolha uma semana</strong>
                <span>Toque em uma semana acima para ver somente os dias e treinos dela.</span>
              </section>
            `}
          `}
        </div>
      </article>
    `;
    this.root.hidden = false;
  }

  lessonBlockCard(plan, block, index, progress) {
    const ids = safeArray(block.exercicios_relacionados);
    const completedIds = safeArray(progress.completedExercises);
    const blockComplete = ids.length > 0 && ids.every((exerciseId) => completedIds.includes(exerciseId));
    return `
      <details class="execution-card lesson-accordion-card ${blockComplete ? "is-complete block-completed" : ""}">
        <summary class="lesson-accordion-summary">
          <div>
            <span class="eyebrow">${escapeHTML(block.duracao_minutos)} min</span>
            <h4>${escapeHTML(block.bloco)}</h4>
            ${blockComplete ? `<span class="completed-badge">Bloco concluído</span>` : ""}
          </div>
          <span class="accordion-indicator" aria-hidden="true">+</span>
        </summary>
        <div class="lesson-accordion-body">
          <p>${escapeHTML(neutralizeInstruction(block.descricao))}</p>
          ${ids.length ? `<div class="related-exercise-list"><span class="eyebrow">Exerc\u00edcios relacionados</span>${ids.map((exerciseId) => this.relatedExerciseCard(exerciseId, {
            source: "lesson_plan",
            planId: plan.id,
            completed: completedIds.includes(exerciseId),
            completeAction: "toggle-plan-exercise"
          })).join("")}</div>` : ""}
        </div>
      </details>
    `;
  }

  evolutionWeekPanel(plan, week, progress) {
    return `
      <section class="evolution-week-panel">
        ${this.objectiveBlock(buildEvolutionWeekDetail(plan, week, this.app.exerciseManager), "Detalhamento da semana")}
        <div class="day-card-grid">
          ${safeArray(week.treinos).map((training) => this.evolutionDayCard(plan, week, training, progress)).join("")}
        </div>
      </section>
    `;
  }

  evolutionDayCard(plan, week, training, progress) {
    const dayKey = this.app.getEvolutionDayKey(week.semana, training.dia);
    const dayProgress = this.app.getEvolutionDayProgress(progress, dayKey, training);
    const completed = this.app.isEvolutionDayComplete(progress, dayKey, training);
    const statusLabel = completed ? "Dia conclu\u00eddo" : dayProgress.done > 0 ? "Em andamento" : "Em aberto";
    return `
      <article class="day-card ${completed ? "is-complete" : ""}" data-action="open-evolution-day" data-id="${plan.id}" data-week="${week.semana}" data-day-key="${dayKey}" role="button" aria-label="Abrir treino do dia ${escapeHTML(training.dia)}">
        <div>
          <span class="eyebrow">${escapeHTML(training.duracao_total_minutos)} min</span>
          <h4>${escapeHTML(training.dia)}</h4>
        </div>
        ${this.progressBar(dayProgress.percent, `${dayProgress.done} de ${dayProgress.total} exerc\u00edcios`, statusLabel)}
        <div class="inline-actions">
          <button class="button primary small" data-action="open-evolution-day" data-id="${plan.id}" data-week="${week.semana}" data-day-key="${dayKey}">Abrir treino do dia</button>
        </div>
      </article>
    `;
  }

  evolutionDayDetail(plan, week, training, progress) {
    const dayKey = this.app.getEvolutionDayKey(week.semana, training.dia);
    const completed = this.app.isEvolutionDayComplete(progress, dayKey, training);
    return `
      <section class="execution-card day-detail-card ${completed ? "is-complete" : ""}">
        <div class="execution-card-header">
          <div>
            <h4>${escapeHTML(training.dia)} - ${escapeHTML(training.duracao_total_minutos)} min</h4>
            ${completed ? `<span class="completed-badge">Dia conclu\u00eddo</span>` : ""}
          </div>
        </div>
        <div class="related-exercise-list">
          ${safeArray(training.exercicios_sugeridos).map((exerciseId) => this.relatedExerciseCard(exerciseId, {
            source: "evolution_plan",
            evolutionId: plan.id,
            weekNumber: week.semana,
            dayKey,
            completed: safeArray(progress.completedExercises && progress.completedExercises[dayKey]).includes(exerciseId),
            completeAction: "toggle-evolution-exercise"
          })).join("")}
        </div>
      </section>
    `;
  }

  relatedExerciseCard(exerciseId, options = {}) {
    const exercise = this.app.exerciseManager.getById(exerciseId);
    if (!exercise) return "";
    const completed = Boolean(options.completed);
    const sourceAttrs = [
      options.planId ? `data-plan-id="${escapeHTML(options.planId)}"` : "",
      options.evolutionId ? `data-evolution-id="${escapeHTML(options.evolutionId)}"` : "",
      options.weekNumber ? `data-week="${escapeHTML(options.weekNumber)}"` : "",
      options.dayKey ? `data-day-key="${escapeHTML(options.dayKey)}"` : "",
      options.source ? `data-source="${escapeHTML(options.source)}"` : ""
    ].filter(Boolean).join(" ");
    return `
      <article class="related-exercise-card ${completed ? "is-complete" : ""}">
        <div class="related-exercise-main">
          <strong>${escapeHTML(exercise.nome)}</strong>
          <span>${escapeHTML(titleCase(exercise.nivel))} | ${escapeHTML(exercise.categoria)} | ${escapeHTML(exercise.duracao_minutos)} min</span>
        </div>
        <div class="related-exercise-actions">
          <button class="button secondary small related-open-button" data-action="open-related-exercise" data-id="${exercise.id}" ${sourceAttrs}>Abrir</button>
          ${options.completeAction ? `<button class="completion-toggle ${completed ? "is-complete" : ""}" data-action="${options.completeAction}" data-id="${exercise.id}" ${sourceAttrs}>${completed ? "Conclu\u00eddo" : "Marcar conclu\u00eddo"}</button>` : ""}
        </div>
      </article>
    `;
  }

  miniExerciseVisual(exercise, className = "") {
    return "";
  }

  progressBar(percent, primary, secondary = "") {
    const value = Math.max(0, Math.min(100, Math.round(Number(percent || 0))));
    return `
      <div class="plan-progress" style="--progress:${value}%">
        <div class="plan-progress-top"><strong>${value}%</strong><span>${escapeHTML(primary || "")}</span></div>
        <div class="plan-progress-track"><span style="width:${value}%"></span></div>
        ${secondary ? `<small>${escapeHTML(secondary)}</small>` : ""}
      </div>
    `;
  }

  statusLabel(status) {
    if (status === "concluido") return "conclu\u00eddo";
    if (status === "em_andamento") return "em andamento";
    return "n\u00e3o iniciado";
  }

  close() {
    if (this.diagramPlayer) this.diagramPlayer.clear();
    this.diagramPlayer = null;
    this.stack = [];
    this.root.hidden = true;
    this.root.innerHTML = "";
  }

  exerciseObjectivePart(exercise) {
    const objective = neutralizeInstruction(exercise.objetivo || exercise.descricao_curta || "");
    const description = neutralizeInstruction(exercise.descricao_curta || "");
    return `
      <section class="exercise-objective-layout">
        ${this.exerciseVisualCard(exercise)}
        <div class="exercise-objective-copy">
          <span class="eyebrow">Objetivo do treino</span>
          <p>${escapeHTML(objective)}</p>
          ${description && description !== objective ? `<p class="exercise-objective-note">${escapeHTML(description)}</p>` : ""}
        </div>
      </section>
    `;
  }

  exerciseVisualCard(exercise) {
    const animationSnapshot = this.exerciseAnimationSnapshotCard(exercise);
    if (animationSnapshot) return animationSnapshot;

    const cover = exercise && exercise.imagem_capa ? exerciseImageSrc(exercise) : "";
    if (cover) {
      return `
        <figure class="exercise-visual-card has-real-cover" aria-label="Imagem do exercício ${escapeHTML(exercise.nome)}">
          <img class="exercise-detail-cover-image" src="${escapeHTML(cover)}" alt="${escapeHTML(exercise.nome)}" loading="lazy">
          <figcaption class="exercise-visual-meta">
            <strong>${escapeHTML(titleCase(exercise.categoria || "Treino"))}</strong>
            <span>${escapeHTML(titleCase(exercise.tipo || "Exercício"))}</span>
          </figcaption>
        </figure>
      `;
    }
    const kind = normalizeText(exercise.categoria || exercise.tipo || "");
    const showBall = !normalizeText(exercise.tipo).includes("sem bola");
    const playerClass = kind.includes("dupla") || kind.includes("grupo") || kind.includes("tatica") ? "has-pair" : "";
    return `
      <div class="exercise-visual-card ${this.visualTone(exercise.categoria || exercise.nome)} ${playerClass}" aria-label="Diagrama visual do exercício ${escapeHTML(exercise.nome)}">
        <div class="exercise-visual-court" aria-hidden="true">
          <span class="court-net"></span>
          <span class="court-center"></span>
          <span class="court-zone zone-a"></span>
          <span class="court-zone zone-b"></span>
          <span class="visual-player visual-player-a">A1</span>
          <span class="visual-player visual-player-b">P1</span>
          ${showBall ? `<span class="visual-ball"></span><span class="visual-ball-line"></span>` : ""}
        </div>
        <div class="exercise-visual-meta">
          <strong>${escapeHTML(titleCase(exercise.categoria || "Treino"))}</strong>
          <span>${escapeHTML(titleCase(exercise.tipo || "Exercício"))}</span>
        </div>
      </div>
    `;
  }

  exerciseAnimationSnapshotCard(exercise) {
    const animation = normalizedExerciseAnimation(exercise);
    const frames = safeArray(animation && animation.frames);
    if (!animation || !frames.length) return "";

    const frameIndex = frames.reduce((bestIndex, frame, index) => {
      const score =
        safeArray(frame.setas).length * 5 +
        safeArray(frame.movimentos_bola).length * 4 +
        safeArray(frame.movimentos_jogadores).length * 3 +
        safeArray(frame.destaques).length;
      const bestFrame = frames[bestIndex] || {};
      const bestScore =
        safeArray(bestFrame.setas).length * 5 +
        safeArray(bestFrame.movimentos_bola).length * 4 +
        safeArray(bestFrame.movimentos_jogadores).length * 3 +
        safeArray(bestFrame.destaques).length;
      return score >= bestScore ? index : bestIndex;
    }, 0);

    const frame = frames[frameIndex] || frames[0];
    const player = new DiagramPlayer(null);
    player.animation = animation;
    player.currentFrame = frameIndex;
    const svg = player.svg(frame).replace('class="animated-diagram-svg"', 'class="animated-diagram-svg objective-snapshot-svg"');
    const hasBall =
      safeArray(animation.bolas).length > 0 ||
      frames.some((item) => safeArray(item.movimentos_bola).length > 0);
    const visualTip = hasBall
      ? "Dica visual: bola amarela mostra a trajetória; setas azuis mostram deslocamento."
      : "Dica visual: setas azuis mostram o caminho; cones e zonas indicam referências.";

    return `
      <figure class="exercise-visual-card has-animation-snapshot" aria-label="Ilustração do exercício ${escapeHTML(exercise.nome)} baseada na animação">
        <div class="objective-snapshot-stage">
          ${svg}
        </div>
        <figcaption class="exercise-visual-meta objective-snapshot-meta">
          <strong>${escapeHTML(titleCase(exercise.categoria || "Treino"))}</strong>
          <span>${escapeHTML(frame.titulo || "Execução")}</span>
        </figcaption>
        <small class="objective-visual-tip">${escapeHTML(visualTip)}</small>
      </figure>
    `;
  }

  exerciseStepsPart(exercise) {
    return `
      <section class="detail-section diagram-panel">
        <div class="diagram-animator-host" data-diagram-host></div>
      </section>
      <section class="detail-section">
        <h3>Passo a passo</h3>
        ${this.stepsSection(exercise.passo_a_passo)}
      </section>
    `;
  }

  exerciseExtrasPart(exercise) {
    const tips = [
      ...safeArray(exercise.dicas),
      ...safeArray(exercise.dicas_tecnicas)
    ].filter(Boolean).slice(0, 5);
    const variations = this.variationCards(exercise);
    const variationContent = variations ? `<section class="detail-section"><h3>Variações</h3>${variations}</section>` : "";
    const audioContent = `
      <section class="detail-section audio-extra-card">
        <h3>Áudio do treino</h3>
        <div class="inline-actions">
          ${this.soundButton(exercise.id)}
          <button class="button ghost" data-action="stop-audio">Parar</button>
        </div>
      </section>
    `;
    return `
      <div class="extras-accordion-stack">
        ${this.accordion("Dicas", this.listSection("Dicas", tips), false)}
        ${this.accordion("Erros comuns", this.listSection("Erros comuns", safeArray(exercise.erros_comuns).slice(0, 6)), false)}
        ${this.accordion("Variações", variationContent, false)}
        ${this.accordion("Benefícios", this.listSection("Benefícios", safeArray(exercise.beneficios).slice(0, 6)), false)}
        ${this.accordion("Segurança", this.listSection("Cuidados de segurança", safeArray(exercise.cuidados_de_seguranca).slice(0, 5)), false)}
        ${this.accordion("Materiais", this.listSection("Materiais necessários", safeArray(exercise.materiais_necessarios).slice(0, 5)), false)}
        ${this.accordion("Áudio do treino", audioContent, false)}
      </div>
    `;
  }

  visualTone(value = "") {
    const tones = ["tone-aqua", "tone-sand", "tone-orange", "tone-sea", "tone-night"];
    const text = String(value || "");
    const score = Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return tones[score % tones.length];
  }

  pill(text, variant = "") {
    if (!String(text || "").trim()) return "";
    const normalized = normalizeText(text);
    const typeClass = normalized.includes("sem bola") ? "is-no-ball" : normalized.includes("com bola") ? "is-ball" : "";
    const intensityClass = ["leve", "baixa", "moderada", "media", "média", "alta"].some((value) => normalized.includes(normalizeText(value))) ? "is-intensity" : "";
    return `<span class="pill ${variant} ${typeClass} ${intensityClass}">${escapeHTML(text)}</span>`;
  }

  textSection(title, text) {
    if (!text) return "";
    return `
      <section class="detail-section">
        <h3>${escapeHTML(title)}</h3>
        <p>${escapeHTML(neutralizeInstruction(text))}</p>
      </section>
    `;
  }

  listSection(title, items, ordered = false) {
    const values = safeArray(items).filter(Boolean);
    if (!values.length) return "";
    const tag = ordered ? "ol" : "ul";
    const content = values.map((item) => `<li>${escapeHTML(neutralizeInstruction(item))}</li>`).join("");
    return `
      <section class="detail-section">
        <h3>${escapeHTML(title)}</h3>
        <${tag}>${content}</${tag}>
      </section>
    `;
  }

  objectiveBlock(objective, label = "Objetivo do treino") {
    const full = neutralizeInstruction(objective);
    if (!full) return "";
    const short = getShortObjective(full, 175);
    const needsToggle = full.length > short.length;
    return `
      <section class="objective-block ${needsToggle ? "is-collapsed" : ""}">
        <span class="eyebrow">${escapeHTML(label)}</span>
        <p class="objective-short">${escapeHTML(short)}</p>
        ${needsToggle ? `<p class="objective-full" hidden>${escapeHTML(full)}</p>
        <button class="text-toggle" data-action="toggle-objective" type="button">Ver objetivo completo</button>` : ""}
      </section>
    `;
  }

  tipsBlock(items) {
    const values = safeArray(items).filter(Boolean).slice(0, 5);
    if (!values.length) return "";
    return this.accordion("Dicas rápidas", `
      <section class="detail-section tips-block">
        <h3>Dicas r\u00e1pidas</h3>
        <div class="tips-grid">
          ${values.map((item) => `<div class="tip-chip">${escapeHTML(neutralizeInstruction(item))}</div>`).join("")}
        </div>
      </section>
    `);
  }

  variationCards(exercise) {
    const cards = [
      ["F\u00e1cil", exercise.variacao_facil],
      ["Dif\u00edcil", exercise.variacao_dificil]
    ].filter(([, value]) => value);
    if (!cards.length) return "";
    return `
      <div class="variation-grid">
        ${cards.map(([label, value]) => `
          <div class="variation-card">
            <span>${escapeHTML(label)}</span>
            <p>${escapeHTML(neutralizeInstruction(value))}</p>
          </div>
        `).join("")}
      </div>
    `;
  }

  stepsSection(items) {
    const steps = safeArray(items).filter(Boolean);
    if (!steps.length) return "";
    return `
      <ol class="steps-list steps-numbered">
        ${steps.map((step, index) => `
          <li class="step-card">
            <div class="step-card-header">
              <span>${index + 1}</span>
              <strong>Passo ${index + 1}</strong>
            </div>
            <p class="step-text">${escapeHTML(neutralizeInstruction(step))}</p>
          </li>
        `).join("")}
      </ol>
    `;
  }

  accordion(title, content, open = false) {
    if (!String(content || "").replace(/<[^>]*>/g, "").trim()) return "";
    return `
      <details class="detail-accordion" ${open ? "open" : ""}>
        <summary>${escapeHTML(title)}</summary>
        <div class="detail-accordion-body">${content}</div>
      </details>
    `;
  }

  tagSection(tags) {
    const values = safeArray(tags).filter(Boolean);
    if (!values.length) return "";
    return `
      <section class="detail-section">
        <h3>Tags</h3>
        <div class="tag-row">${values.map((tag) => this.pill(tag)).join("")}</div>
      </section>
    `;
  }
}


class DashboardManager {
  constructor(exerciseManager, lessonManager, evolutionManager, storage) {
    this.exerciseManager = exerciseManager;
    this.lessonManager = lessonManager;
    this.evolutionManager = evolutionManager;
    this.storage = storage;
    this.sessionRecommendation = null;
  }

  render() {
    const exercises = this.exerciseManager.items;
    const accessibleExercises = exercises.filter((exercise) => window.BTPT_ACCESS.canAccessExercise(exercise.id));
    const average = Math.round(sumValues(exercises, (item) => item.duracao_minutos) / exercises.length);
    const favoriteTotal = this.storage.getFavoriteExercises().length + this.storage.getFavoritePlans().length;
    const stats = [
      [window.BTPT_ACCESS.currentPlan() === "free" ? "Exercícios liberados" : "Exercícios", accessibleExercises.length],
      ["Planos de aula", this.lessonManager.items.length],
      ["Planos de evolução", this.evolutionManager.items.length],
      ["Favoritos", favoriteTotal],
      ["Treinos salvos", this.storage.getSavedWorkouts().length],
      ["Tempo médio", `${average} min`]
    ];
    const statsRoot = document.getElementById("dashboardStats");
    if (statsRoot) statsRoot.innerHTML = stats.map(([label, value]) => `
      <div class="stat-card"><strong>${escapeHTML(value)}</strong><span>${escapeHTML(label)}</span></div>
    `).join("");
    this.renderGreeting();
    this.renderHomeHero();
    this.renderHomeEvolution();
    this.renderBars("levelChart", countBy(exercises, (item) => titleCase(item.nivel)));
    this.renderBars("typeChart", countBy(exercises, (item) => titleCase(item.tipo)));
    const categories = Object.entries(countBy(exercises, (item) => item.categoria))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    this.renderBars("categoryChart", Object.fromEntries(categories));
  }

  renderGreeting() {
    const target = document.querySelector("[data-home-greeting]") || document.querySelector(".home-kicker > span");
    if (!target) return;
    const hour = new Date().getHours();
    let greeting = "Boa noite";
    if (hour >= 5 && hour < 12) greeting = "Bom dia";
    if (hour >= 12 && hour < 18) greeting = "Boa tarde";
    target.textContent = `${greeting}, atleta.`;
  }

  renderHomeHero() {
    const chip = document.querySelector("[data-home-hero-chip]");
    const title = document.querySelector("[data-home-hero-title]");
    const meta = document.querySelector("[data-home-hero-meta]");
    const primary = document.querySelector("[data-home-hero-primary]");
    const secondary = document.querySelector("[data-home-hero-secondary]");
    if (!chip || !title || !meta || !primary || !secondary) return;
    primary.hidden = false;
    secondary.hidden = false;

    const currentWorkout = this.storage.getCurrentWorkout();
    const currentExercises = this.exerciseManager.getMany(safeArray(currentWorkout.exerciseIds));
    if (currentExercises.length) {
      const summary = this.exerciseSummary(currentExercises);
      chip.textContent = "Treino em montagem";
      title.textContent = `Treino de ${summary.category}`;
      meta.innerHTML = this.homeMeta([`${summary.count} exercícios`, `${summary.duration} min`, summary.level, summary.type]);
      this.configureHomeButton(primary, "Continuar treino", "navigate", "builder");
      this.configureHomeButton(secondary, "Adicionar exercícios", "navigate", "exercises");
      return;
    }

    const starter = this.recommendedExerciseSummary();
    chip.textContent = starter.chip || "Treino recomendado";
    title.textContent = starter.title;
    meta.innerHTML = this.homeMeta(starter.meta);
    const primaryAction = starter.primary?.action || "navigate";
    this.configureHomeButton(
      primary,
      starter.primary?.text || "Explorar exercícios",
      primaryAction,
      primaryAction === "navigate" ? (starter.primary?.targetView || "exercises") : "",
      starter.primary?.id || ""
    );
    const favoriteItemId = ["open-plan", "open-exercise"].includes(primaryAction) ? starter.primary?.id : "";
    if (favoriteItemId) {
      const isPlan = primaryAction === "open-plan";
      const favorite = isPlan
        ? this.storage.getFavoritePlans().includes(favoriteItemId)
        : this.storage.getFavoriteExercises().includes(favoriteItemId);
      secondary.hidden = false;
      secondary.textContent = favorite ? "\u2665" : "\u2661";
      secondary.type = "button";
      secondary.dataset.action = isPlan ? "favorite-plan" : "favorite-exercise";
      secondary.dataset.id = favoriteItemId;
      delete secondary.dataset.targetView;
      secondary.classList.add("hero-favorite-button");
      secondary.classList.toggle("is-active", favorite);
      secondary.setAttribute("aria-label", favorite ? "Remover dos favoritos" : "Favoritar recomendação");
      secondary.setAttribute("aria-pressed", favorite ? "true" : "false");
      secondary.setAttribute("title", favorite ? "Remover dos favoritos" : "Favoritar");
    } else {
      secondary.hidden = true;
      secondary.removeAttribute("data-action");
      secondary.removeAttribute("data-target-view");
      secondary.removeAttribute("data-id");
      secondary.removeAttribute("aria-label");
      secondary.removeAttribute("aria-pressed");
      secondary.removeAttribute("title");
      secondary.classList.remove("hero-favorite-button", "is-active");
    }
  }

  renderHomeEvolution() {
    const label = document.querySelector("[data-home-progress-label]");
    const title = document.querySelector("[data-home-progress-title]");
    const copy = document.querySelector("[data-home-progress-copy]");
    const value = document.querySelector("[data-home-progress-value]");
    const meter = document.querySelector("[data-home-progress-meter]");
    if (!label || !title || !copy || !value || !meter) return;
    const fill = meter.querySelector("i");

    if (!window.BTPT_ACCESS.canAccessFeature("evolution")) {
      label.textContent = "Evolução Plus";
      title.textContent = "Planos guiados de 4, 8 e 12 semanas";
      copy.innerHTML = "Disponível nos planos Plus e Pro.";
      value.textContent = "Conhecer planos";
      meter.style.setProperty("--progress", "0%");
      if (fill) fill.style.width = "0%";
      return;
    }

    const active = this.activeEvolutionSummary();
    if (!active || active.progress.status === "nao_iniciado") {
      label.textContent = "Evolução";
      title.textContent = "Nenhuma evolução iniciada";
      copy.innerHTML = "Abra um plano de evolução para acompanhar semana, dias concluídos e progresso real.";
      value.textContent = "0% iniciado";
      meter.style.setProperty("--progress", "0%");
      if (fill) fill.style.width = "0%";
      return;
    }

    const { plan, progress, totalWeeks, totalDays } = active;
    const percent = Math.max(0, Math.min(100, Math.round(progress.progressPercent || 0)));
    label.textContent = plan.nome;
    title.textContent = `Semana ${progress.currentWeek} de ${totalWeeks}`;
    copy.innerHTML = `<strong>${safeArray(progress.completedDays).length}</strong> de <strong>${totalDays}</strong> dias concluídos.`;
    value.textContent = `${percent}% da evolução`;
    meter.style.setProperty("--progress", `${percent}%`);
    if (fill) fill.style.width = `${percent}%`;
  }

  configureHomeButton(button, text, action, targetView = "", id = "") {
    button.textContent = text;
    button.dataset.action = action;
    button.type = "button";
    button.classList.remove("hero-favorite-button", "is-active");
    button.removeAttribute("aria-pressed");
    if (targetView) button.dataset.targetView = targetView;
    else delete button.dataset.targetView;
    if (id) button.dataset.id = id;
    else delete button.dataset.id;
  }

  homeMeta(values) {
    return safeArray(values)
      .filter(Boolean)
      .map((value) => `<span>${escapeHTML(value)}</span>`)
      .join("");
  }

  exerciseSummary(exercises) {
    const category = this.topValue(exercises, (item) => item.categoria) || "Beach Tennis";
    const level = this.topValue(exercises, (item) => titleCase(item.nivel)) || "Todos os níveis";
    const type = this.topValue(exercises, (item) => titleCase(item.tipo)) || "Treino misto";
    return {
      category,
      level,
      type,
      count: exercises.length,
      duration: sumValues(exercises, (item) => item.duracao_minutos)
    };
  }

  savedWorkoutSummary(workout) {
    const exercises = this.exerciseManager.getMany(safeArray(workout.exerciseIds));
    const completed = this.storage.getSavedWorkoutProgress(workout.id);
    const done = exercises.filter((exercise) => completed.includes(exercise.id)).length;
    const summary = this.exerciseSummary(exercises);
    return {
      ...summary,
      percent: exercises.length ? Math.round((done / exercises.length) * 100) : 0
    };
  }

  pickSavedWorkout() {
    const saved = this.storage.getSavedWorkouts();
    if (!saved.length) return null;
    return saved
      .map((workout, index) => ({ workout, index, summary: this.savedWorkoutSummary(workout) }))
      .sort((a, b) => {
        const activeA = a.summary.percent > 0 && a.summary.percent < 100 ? 1 : 0;
        const activeB = b.summary.percent > 0 && b.summary.percent < 100 ? 1 : 0;
        return activeB - activeA || b.index - a.index;
      })[0].workout;
  }

  activeEvolutionSummary() {
    const summaries = this.evolutionManager.items.map((plan) => {
      const stored = this.storage.getEvolutionProgress(plan.id) || {};
      const weeks = safeArray(plan.semanas);
      const totalDays = weeks.reduce((total, week) => total + safeArray(week.treinos).length, 0);
      const progress = this.normalizeEvolutionProgress(plan, stored);
      return { plan, progress, totalWeeks: weeks.length || Number(plan.duracao_semanas || 0), totalDays };
    });
    return summaries
      .filter(({ progress }) => progress.status !== "nao_iniciado" || progress.progressPercent > 0)
      .sort((a, b) => {
        const activeDiff = Number(b.progress.status === "em_andamento") - Number(a.progress.status === "em_andamento");
        return activeDiff || Number(b.progress.progressPercent || 0) - Number(a.progress.progressPercent || 0);
      })[0] || summaries[0] || null;
  }

  normalizeEvolutionProgress(plan, stored = {}) {
    const firstWeek = safeArray(plan.semanas)[0];
    const progress = {
      startedAt: "",
      status: "nao_iniciado",
      completedExercises: {},
      currentWeek: firstWeek ? firstWeek.semana : 1,
      completedDays: [],
      progressPercent: 0,
      ...stored
    };
    const completedExercises = progress.completedExercises && !Array.isArray(progress.completedExercises) && typeof progress.completedExercises === "object"
      ? progress.completedExercises
      : {};
    progress.completedExercises = completedExercises;
    const completedDays = [];
    let total = 0;
    let done = 0;
    safeArray(plan.semanas).forEach((week) => {
      safeArray(week.treinos).forEach((training) => {
        const key = `semana_${week.semana}_${normalizeText(training.dia).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
        const ids = safeArray(training.exercicios_sugeridos);
        const checked = safeArray(completedExercises[key]).filter((id) => ids.includes(id)).length;
        total += 1;
        if (ids.length && checked >= ids.length) {
          done += 1;
          completedDays.push(key);
        }
      });
    });
    progress.completedDays = completedDays;
    progress.progressPercent = Math.round((done / Math.max(1, total)) * 100);
    if (progress.progressPercent >= 100) progress.status = "concluido";
    else if (progress.startedAt || Object.values(completedExercises).some((items) => safeArray(items).length)) progress.status = "em_andamento";
    else progress.status = "nao_iniciado";
    return progress;
  }

  recommendedExerciseSummary() {
    if (this.sessionRecommendation) return this.sessionRecommendation;

    const plans = window.BTPT_ACCESS.canAccessFeature("lessonPlans")
      ? safeArray(this.lessonManager.items).filter((plan) => plan && plan.id)
      : [];
    if (plans.length) {
      const plan = plans[Math.floor(Math.random() * plans.length)];
      const exerciseIds = [...new Set(safeArray(plan.estrutura_da_aula)
        .flatMap((block) => safeArray(block.exercicios_relacionados)))];
      const exercises = this.exerciseManager.getMany(exerciseIds);
      const duration = Number(plan.duracao_total_minutos || 0)
        || sumValues(exercises, (item) => item.duracao_minutos)
        || 40;
      this.sessionRecommendation = {
        chip: "Treino aleatório",
        title: plan.nome || "Treino recomendado",
        meta: [
          titleCase(plan.nivel) || this.topValue(exercises, (item) => titleCase(item.nivel)) || "Todos os níveis",
          `${duration} min`,
          exerciseIds.length ? `${exerciseIds.length} exercícios` : "Plano pronto"
        ],
        primary: { text: "Acessar treino aleatório", action: "open-plan", id: plan.id },
        secondary: { text: "Ver exercícios", action: "navigate", targetView: "exercises" }
      };
      return this.sessionRecommendation;
    }

    const exercises = this.exerciseManager.items.filter((exercise) => window.BTPT_ACCESS.canAccessExercise(exercise.id));
    const exercise = exercises[Math.floor(Math.random() * Math.max(1, exercises.length))];
    if (exercise) {
      this.sessionRecommendation = {
        chip: "Exercício aleatório",
        title: exercise.nome,
        meta: [titleCase(exercise.nivel), `${exercise.duracao_minutos} min`, exercise.categoria],
        primary: { text: "Abrir exercício", action: "open-exercise", id: exercise.id },
        secondary: { text: "Favoritar", action: "favorite-exercise", id: exercise.id }
      };
      return this.sessionRecommendation;
    }
    const categories = Object.entries(countBy(exercises, (item) => item.categoria))
      .filter(([category]) => category)
      .sort((a, b) => b[1] - a[1]);
    const category = categories.length
      ? categories[Math.floor(Math.random() * Math.min(categories.length, 12))][0]
      : "Fundamentos";
    const related = exercises
      .filter((item) => item.categoria === category)
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);
    const duration = sumValues(related, (item) => item.duracao_minutos) || 40;
    this.sessionRecommendation = {
      chip: "Treino aleatório",
      title: `${category} na areia`,
      meta: [this.topValue(related, (item) => titleCase(item.nivel)) || "Todos os níveis", `${duration} min`, `${related.length || 8} exercícios`],
      primary: { text: "Acessar treino aleatório", action: "navigate", targetView: "exercises" },
      secondary: { text: "Montar treino", action: "navigate", targetView: "builder" }
    };
    return this.sessionRecommendation;
  }

  topValue(items, selector) {
    const entries = Object.entries(countBy(items, selector)).sort((a, b) => b[1] - a[1]);
    return entries[0] ? entries[0][0] : "";
  }

  renderBars(id, data) {
    const root = document.getElementById(id);
    if (!root) return;
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(([, count]) => count), 1);
    root.innerHTML = entries.map(([label, count]) => `
      <div class="bar-row">
        <span class="bar-label" title="${escapeHTML(label)}">${escapeHTML(label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${Math.max(4, (count / max) * 100)}%"></span></span>
        <strong>${count}</strong>
      </div>
    `).join("");
  }
}

class FilterManager {
  constructor(exercises, lessons, onExerciseChange, onLessonChange) {
    this.exercises = exercises;
    this.lessons = lessons;
    this.onExerciseChange = onExerciseChange;
    this.onLessonChange = onLessonChange;
  }

  bind() {
    this.populateSelect("filterLevel", uniqueValues(this.exercises, (item) => item.nivel), "Todos");
    this.populateSelect("filterType", uniqueValues(this.exercises, (item) => item.tipo), "Todos");
    this.populateSelect("filterCategory", uniqueValues(this.exercises, (item) => item.categoria), "Todas");
    this.populateSelect("filterIntensity", uniqueValues(this.exercises, (item) => item.intensidade), "Todas");
    this.populateSelect("filterIndicated", uniqueValues(this.exercises, (item) => item.indicado_para), "Todos");
    this.populateSelect("lessonLevel", uniqueValues(this.lessons, (item) => item.nivel), "Todos");
    this.populateSelect("lessonAudience", uniqueValues(this.lessons, (item) => item.publico), "Todos");
    this.populateSelect("lessonIntensity", uniqueValues(this.lessons, (item) => item.intensidade), "Todas");
    document.getElementById("tagOptions").innerHTML = uniqueValues(this.exercises.flatMap((item) => safeArray(item.tags)), (item) => item)
      .map((tag) => `<option value="${escapeHTML(tag)}"></option>`)
      .join("");
    const exerciseFilters = document.getElementById("exerciseFilters");
    const lessonFilters = document.getElementById("lessonFilters");
    const mobileSearch = document.getElementById("mobileFilterSearch");
    const desktopSearch = document.getElementById("filterSearch");
    const updateExercises = () => {
      if (mobileSearch.value !== desktopSearch.value) mobileSearch.value = desktopSearch.value;
      this.updateActiveChips();
      this.onExerciseChange();
    };
    const updateLessons = () => {
      this.updateLessonActiveChips();
      this.onLessonChange();
    };
    exerciseFilters.addEventListener("input", updateExercises);
    exerciseFilters.addEventListener("change", updateExercises);
    mobileSearch.addEventListener("input", () => {
      desktopSearch.value = mobileSearch.value;
      this.updateActiveChips();
      this.onExerciseChange();
    });
    lessonFilters.addEventListener("input", updateLessons);
    lessonFilters.addEventListener("change", updateLessons);
    document.getElementById("clearFiltersButton").addEventListener("click", () => {
      exerciseFilters.reset();
      mobileSearch.value = "";
      this.closeFilters();
      this.updateActiveChips();
      this.onExerciseChange();
    });
    const clearLessonFiltersButton = document.getElementById("clearLessonFiltersButton");
    if (clearLessonFiltersButton) {
      clearLessonFiltersButton.addEventListener("click", () => {
        lessonFilters.reset();
        this.closeFilters();
        this.updateLessonActiveChips();
        this.onLessonChange();
      });
    }
    document.getElementById("openFiltersButton").addEventListener("click", () => this.openFilters("exercise"));
    const openLessonFiltersButton = document.getElementById("openLessonFiltersButton");
    if (openLessonFiltersButton) openLessonFiltersButton.addEventListener("click", () => this.openFilters("lesson"));
    document.getElementById("filterBackdrop").addEventListener("click", () => this.closeFilters());
    document.getElementById("activeFilterChips").addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter-key]");
      if (!button) return;
      this.clearFilter(button.dataset.filterKey);
      this.updateActiveChips();
      this.onExerciseChange();
    });
    const activeLessonFilterChips = document.getElementById("activeLessonFilterChips");
    if (activeLessonFilterChips) {
      activeLessonFilterChips.addEventListener("click", (event) => {
        const button = event.target.closest("[data-lesson-filter-key]");
        if (!button) return;
        this.clearLessonFilter(button.dataset.lessonFilterKey);
        this.updateLessonActiveChips();
        this.onLessonChange();
      });
    }
    this.updateActiveChips();
    this.updateLessonActiveChips();
  }

  populateSelect(id, values, label) {
    const select = document.getElementById(id);
    select.innerHTML = `<option value="">${label}</option>` + values.map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(titleCase(value))}</option>`).join("");
  }

  getExerciseFilters() {
    return {
      search: document.getElementById("filterSearch").value,
      level: document.getElementById("filterLevel").value,
      type: document.getElementById("filterType").value,
      category: document.getElementById("filterCategory").value,
      duration: document.getElementById("filterDuration").value,
      intensity: document.getElementById("filterIntensity").value,
      indicated: document.getElementById("filterIndicated").value,
      tag: document.getElementById("filterTag").value
    };
  }

  openFilters(panel = "exercise") {
    const exerciseFilters = document.getElementById("exerciseFilters");
    const lessonFilters = document.getElementById("lessonFilters");
    const target = panel === "lesson" ? lessonFilters : exerciseFilters;
    exerciseFilters.classList.remove("is-open");
    lessonFilters.classList.remove("is-open");
    target.classList.add("is-open");
    const backdrop = document.getElementById("filterBackdrop");
    backdrop.hidden = false;
    backdrop.dataset.filterPanel = panel;
  }

  closeFilters() {
    document.getElementById("exerciseFilters").classList.remove("is-open");
    document.getElementById("lessonFilters").classList.remove("is-open");
    document.getElementById("filterBackdrop").hidden = true;
  }

  clearFilter(key) {
    const fieldMap = {
      search: "filterSearch",
      level: "filterLevel",
      type: "filterType",
      category: "filterCategory",
      duration: "filterDuration",
      intensity: "filterIntensity",
      indicated: "filterIndicated",
      tag: "filterTag"
    };
    const field = document.getElementById(fieldMap[key]);
    if (field) field.value = "";
    if (key === "search") document.getElementById("mobileFilterSearch").value = "";
  }

  clearLessonFilter(key) {
    const fieldMap = {
      search: "lessonSearch",
      level: "lessonLevel",
      audience: "lessonAudience",
      duration: "lessonDuration",
      intensity: "lessonIntensity"
    };
    const field = document.getElementById(fieldMap[key]);
    if (field) field.value = "";
  }

  updateActiveChips() {
    const filters = this.getExerciseFilters();
    const labels = {
      search: "Busca",
      level: "Nível",
      type: "Tipo",
      category: "Categoria",
      duration: "Duração",
      intensity: "Intensidade",
      indicated: "Indicado",
      tag: "Tag"
    };
    const chips = Object.entries(filters)
      .filter(([, value]) => value)
      .map(([key, value]) => {
        const normalized = normalizeText(value);
        const typeClass = normalized.includes("sem bola") ? "is-no-ball" : normalized.includes("com bola") ? "is-ball" : "";
        const intensityClass = ["leve", "baixa", "moderada", "media", "média", "alta"].some((item) => normalized.includes(normalizeText(item))) ? "is-intensity" : "";
        return `
        <span class="filter-chip filter-${escapeHTML(key)} ${typeClass} ${intensityClass}">
          ${escapeHTML(labels[key])}: ${escapeHTML(titleCase(value))}
          <button type="button" aria-label="Remover filtro ${escapeHTML(labels[key])}" data-filter-key="${key}">×</button>
        </span>
      `;
      })
      .join("");
    document.getElementById("activeFilterChips").innerHTML = chips;
  }

  getLessonFilters() {
    return {
      search: document.getElementById("lessonSearch").value,
      level: document.getElementById("lessonLevel").value,
      audience: document.getElementById("lessonAudience").value,
      duration: document.getElementById("lessonDuration").value,
      intensity: document.getElementById("lessonIntensity").value
    };
  }

  updateLessonActiveChips() {
    const root = document.getElementById("activeLessonFilterChips");
    if (!root) return;
    const filters = this.getLessonFilters();
    const labels = {
      search: "Busca",
      level: "Nível",
      audience: "Público",
      duration: "Duração",
      intensity: "Intensidade"
    };
    const chips = Object.entries(filters)
      .filter(([, value]) => value)
      .map(([key, value]) => {
        const normalized = normalizeText(value);
        const intensityClass = ["leve", "baixa", "moderada", "media", "média", "alta"].some((item) => normalized.includes(normalizeText(item))) ? "is-intensity" : "";
        return `
        <span class="filter-chip lesson-filter-${escapeHTML(key)} ${intensityClass}">
          ${escapeHTML(labels[key])}: ${escapeHTML(titleCase(value))}
          <button type="button" aria-label="Remover filtro ${escapeHTML(labels[key])}" data-lesson-filter-key="${key}">×</button>
        </span>
      `;
      })
      .join("");
    root.innerHTML = chips;
  }
}

class UIManager {
  constructor(app) {
    this.app = app;
    this.activeSavedWorkoutId = null;
    this.favoriteFilter = "exercises";
    this.subscriptionPollTimer = null;
    this.subscriptionPollAttempts = 0;
    this.viewTitles = {
      dashboard: "Home",
      exercises: "Exercícios",
      favorites: "Favoritos",
      builder: "Montador de treino",
      lessons: "Planos de aula",
      evolution: "Evolução",
      plans: "Planos",
      settings: "Configurações"
    };
  }

  bind() {
    document.body.dataset.view = "dashboard";
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action], [data-subscription-action], .nav-button, .bottom-nav-button");
      if (!button) return;
      if (button.dataset.subscriptionAction) {
        this.handleSubscriptionAction(button);
        return;
      }
      if (button.classList.contains("nav-button") || button.classList.contains("bottom-nav-button")) {
        this.switchView(button.dataset.view);
        return;
      }
      this.handleAction(button);
    });
    document.getElementById("workoutName").addEventListener("input", () => this.syncWorkoutFields());
    document.getElementById("workoutGoal").addEventListener("input", () => this.syncWorkoutFields());
    document.getElementById("modalRoot").addEventListener("click", (event) => {
      if (event.target.id === "modalRoot") this.app.closeModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !document.getElementById("modalRoot").hidden) this.app.closeModal();
    });
    window.addEventListener("scroll", () => this.updateScrollTopButton(), { passive: true });
    this.bindMobileZoomGuard();
    this.bindHorizontalBackGuard();
    this.updateScrollTopButton();
    window.addEventListener("btpt:open-plans", () => this.switchView("plans"));
    window.addEventListener("btpt:subscription-changed", () => {
      const authorizedPlan = window.BTPT_ACCESS.currentPlan();
      if (this.app.authorizedPlan && this.app.authorizedPlan !== authorizedPlan) {
        window.location.reload();
        return;
      }
      this.app.dashboardManager.sessionRecommendation = null;
      this.renderAll();
    });
    window.addEventListener("btpt:subscription-message", (event) => {
      this.app.toast(event.detail?.message || "Não foi possível abrir esta opção.", {
        variant: event.detail?.type || "warning"
      });
    });
  }

  bindMobileZoomGuard() {
    let lastTouchEnd = 0;
    document.addEventListener("touchend", (event) => {
      const target = event.target && event.target.closest ? event.target : event.target && event.target.parentElement;
      const editable = target && target.closest("input, textarea, select, [contenteditable='true']");
      if (editable) return;
      const now = Date.now();
      if (now - lastTouchEnd < 320) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });

    ["gesturestart", "gesturechange"].forEach((eventName) => {
      document.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
    });
  }

  bindHorizontalBackGuard() {
    let startX = 0;
    let startY = 0;
    let watchEdgeSwipe = false;
    const edgeSize = 34;
    const isEditableTarget = (target) => target && target.closest && target.closest("input, textarea, select, [contenteditable='true']");

    document.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1 || isEditableTarget(event.target)) {
        watchEdgeSwipe = false;
        return;
      }
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      watchEdgeSwipe = startX <= edgeSize || startX >= window.innerWidth - edgeSize;
    }, { passive: true });

    document.addEventListener("touchmove", (event) => {
      if (!watchEdgeSwipe || event.touches.length !== 1 || isEditableTarget(event.target)) return;
      const dx = event.touches[0].clientX - startX;
      const dy = event.touches[0].clientY - startY;
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        event.preventDefault();
      }
    }, { passive: false });
  }

  handleAction(button) {
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === "navigate") this.switchView(button.dataset.targetView);
    if (action === "close-filters") this.app.filterManager.closeFilters();
    if (action === "open-exercise") this.app.openExercise(id, { ...button.dataset });
    if (action === "export-exercise") this.app.exportExercise(id);
    if (action === "favorite-exercise") this.app.toggleExerciseFavorite(id);
    if (action === "add-exercise") this.app.addExerciseToWorkout(id, button);
    if (action === "remove-current-exercise") this.app.removeExerciseFromWorkout(id);
    if (action === "move-current-exercise") this.app.moveExerciseInWorkout(id, button.dataset.direction);
    if (action === "save-current-workout") this.app.saveCurrentWorkout();
    if (action === "clear-current-workout") this.app.clearCurrentWorkout();
    if (action === "export-current-workout") this.app.exportCurrentWorkout();
    if (action === "export-saved-workout") this.app.exportSavedWorkout(id);
    if (action === "load-saved-workout") this.app.loadSavedWorkout(id);
    if (action === "delete-saved-workout") this.app.deleteSavedWorkout(id);
    if (action === "close-saved-workout") this.app.closeSavedWorkout();
    if (action === "toggle-saved-workout-exercise") this.app.toggleSavedWorkoutExercise(button.dataset.workoutId, id);
    if (action === "open-plan") this.app.openLesson(id);
    if (action === "toggle-plan-exercise") this.app.togglePlanExercise(button.dataset.planId, id);
    if (action === "finish-plan") this.app.finishLessonPlan(id);
    if (action === "favorite-plan") this.app.togglePlanFavorite(id);
    if (action === "export-plan") this.app.exportLesson(id);
    if (action === "open-evolution") this.app.openEvolution(id);
    if (action === "open-evolution-week") this.app.openEvolutionWeek(id, button.dataset.week);
    if (action === "open-evolution-day") this.app.openEvolutionDay(id, button.dataset.week, button.dataset.dayKey);
    if (action === "back-evolution-days") this.app.backEvolutionToDays(id, button.dataset.week);
    if (action === "toggle-evolution-exercise") this.app.toggleEvolutionExercise(button.dataset.evolutionId, button.dataset.week, button.dataset.dayKey, id);
    if (action === "toggle-evolution-day") this.app.toggleEvolutionDay(id, button.dataset.week, button.dataset.dayKey);
    if (action === "finish-evolution") this.app.finishEvolutionPlan(id);
    if (action === "export-evolution") this.app.exportEvolution(id);
    if (action === "open-related-exercise") this.app.openRelatedExercise(id, { ...button.dataset });
    if (action === "close-related-exercise") this.app.closeRelatedExercise();
    if (action === "speak-exercise") this.app.speakExercise(id);
    if (action === "test-audio") this.app.audioManager.speak("Áudio ativo. Esta é uma explicação de teste do Beach Tennis Pro Trainer.");
    if (action === "stop-audio") this.app.audioManager.stop();
    if (action === "toggle-theme") this.app.toggleTheme();
    if (action === "next-home-card") this.nextHomeCard();
    if (action === "scroll-top") this.scrollToTop();
    if (action === "close-modal") this.app.closeModal();
    if (action === "set-favorite-filter") this.setFavoriteFilter(button.dataset.filter);
    if (action === "toggle-objective") this.toggleObjective(button);
    if (action === "toggle-step") this.toggleStep(button);
    if (action === "set-exercise-detail-tab") this.app.modalManager.setExerciseDetailTab(button.dataset.tab);
    if (action === "set-plan-detail-tab") this.app.modalManager.setPlanDetailTab(button.dataset.tab);
  }

  async handleSubscriptionAction(button) {
    const action = button.dataset.subscriptionAction;
    if (action === "view-plans") {
      window.BTPT_PAYWALL?.close();
      this.switchView("plans");
      return;
    }
    if (action === "checkout") {
      window.BTPT_SUBSCRIPTION?.openCheckout(button.dataset.plan);
      return;
    }
    if (action === "refresh") {
      button.disabled = true;
      const profile = await window.BTPT_AUTH?.refreshProfile();
      button.disabled = false;
      this.renderSubscriptionUI();
      this.renderExercises();
      this.renderLessons();
      this.renderEvolution();
      this.app.toast(profile ? "Acesso atualizado." : "Não foi possível verificar a compra agora.", {
        variant: profile ? "success" : "warning"
      });
      return;
    }
    if (action === "save-profile") {
      const input = document.getElementById("accountNameInput");
      const result = await window.BTPT_AUTH?.updateProfileName(input?.value);
      this.app.toast(result?.ok ? "Nome atualizado." : "Digite um nome válido para salvar.", {
        variant: result?.ok ? "success" : "warning"
      });
      if (result?.ok) this.renderSubscriptionUI();
    }
  }

  setFavoriteFilter(filter) {
    this.favoriteFilter = filter === "plans" ? "plans" : "exercises";
    this.renderFavorites();
  }

  toggleObjective(button) {
    const block = button.closest(".objective-block");
    if (!block) return;
    const expanded = block.classList.toggle("is-expanded");
    block.querySelector(".objective-short").hidden = expanded;
    block.querySelector(".objective-full").hidden = !expanded;
    button.textContent = expanded ? "Ocultar objetivo" : "Ver objetivo completo";
  }

  toggleStep(button) {
    const card = button.closest(".step-card");
    if (!card) return;
    const expanded = card.classList.toggle("is-expanded");
    button.textContent = expanded ? "ver menos" : "ver mais";
  }

  syncWorkoutFields() {
    this.app.workoutManager.syncFields(
      document.getElementById("workoutName").value,
      document.getElementById("workoutGoal").value
    );
    this.renderWorkout();
  }

  switchView(view) {
    const target = document.getElementById(`${view}-view`);
    if (!target) return;
    document.body.dataset.view = view;
    document.querySelectorAll(".view").forEach((element) => element.classList.remove("active"));
    document.querySelectorAll(".nav-button").forEach((element) => element.classList.toggle("active", element.dataset.view === view));
    document.querySelectorAll(".bottom-nav-button").forEach((element) => element.classList.toggle("active", element.dataset.view === view));
    target.classList.add("active");
    document.getElementById("viewTitle").textContent = this.viewTitles[view] || "Beach Tennis Pro Trainer";
    if (view === "favorites") this.renderFavorites();
    if (view === "builder") this.renderWorkout();
    if (view === "dashboard") this.app.dashboardManager.render();
    if (view === "plans" || view === "settings") this.renderSubscriptionUI();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  renderAll() {
    this.app.dashboardManager.render();
    this.renderExercises();
    this.renderFavorites();
    this.renderWorkout();
    this.renderLessons();
    this.renderEvolution();
    this.renderSubscriptionUI();
    this.app.updateThemeButton();
  }

  nextHomeCard() {
    const carousel = document.querySelector(".home-card-carousel");
    if (!carousel) return;
    const card = carousel.querySelector(".home-app-card");
    const gap = 12;
    const step = card ? card.getBoundingClientRect().width + gap : carousel.clientWidth * 0.82;
    const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 12;
    carousel.scrollTo({
      left: atEnd ? 0 : carousel.scrollLeft + step,
      behavior: "smooth"
    });
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    this.updateScrollTopButton();
  }

  updateScrollTopButton() {
    const button = document.querySelector(".scroll-top-button");
    if (!button) return;
    const modalOpen = !document.getElementById("modalRoot").hidden;
    const visible = !modalOpen && window.scrollY > 560;
    button.classList.toggle("is-visible", visible);
  }

  formatSubscriptionDate(value) {
    if (!value) return "Não informada";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Não informada";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  subscriptionStatusLabel(status) {
    const labels = {
      inactive: "Plano Grátis",
      active: "Acesso liberado",
      past_due: "Pagamento pendente",
      canceled: "Compra cancelada",
      refunded: "Reembolsada",
      chargeback: "Chargeback",
      expired: "Pagamento expirado"
    };
    return labels[String(status || "inactive").toLowerCase()] || titleCase(status || "Plano Grátis");
  }

  syncSubscriptionPolling(active) {
    if (!active) {
      window.clearInterval(this.subscriptionPollTimer);
      this.subscriptionPollTimer = null;
      this.subscriptionPollAttempts = 0;
      return;
    }
    if (this.subscriptionPollTimer) return;
    this.subscriptionPollAttempts = 0;
    this.subscriptionPollTimer = window.setInterval(async () => {
      this.subscriptionPollAttempts += 1;
      await window.BTPT_AUTH?.refreshProfile({ silent: true });
      if (this.subscriptionPollAttempts >= 10 || !window.BTPT_SUBSCRIPTION?.getPendingCheckout()) {
        this.syncSubscriptionPolling(false);
      }
    }, 12000);
  }

  renderSubscriptionUI() {
    const planConfig = window.BTPT_PLAN_CONFIG;
    const subscription = window.BTPT_SUBSCRIPTION?.getState() || { effectivePlan: "free", status: "inactive" };
    const plans = planConfig?.PLANS || {};
    const currentPlan = plans[subscription.effectivePlan] || plans.free;
    document.querySelectorAll("[data-current-plan-name]").forEach((element) => {
      element.textContent = subscription.accessType === "one_time"
        ? `${currentPlan.name} permanente`
        : subscription.lifetimeAccess
          ? `${currentPlan.name} vitalício`
        : subscription.legacyReviewRequired
          ? `${currentPlan.name} em revisão`
          : currentPlan.name;
    });

    const pricingGrid = document.getElementById("pricingGrid");
    if (pricingGrid) {
      pricingGrid.innerHTML = [plans.free, plans.plus, plans.pro].filter(Boolean).map((plan) => {
        const currentRank = planConfig.PLAN_RANK[subscription.effectivePlan] ?? 0;
        const planRank = planConfig.PLAN_RANK[plan.id] ?? 0;
        const isCurrent = plan.id === subscription.effectivePlan;
        const isIncluded = currentRank > planRank;
        const button = isCurrent
          ? `<button class="button plan-action is-current" type="button" disabled>Plano atual</button>`
          : isIncluded
            ? `<button class="button plan-action is-included" type="button" disabled>Incluído no seu plano</button>`
            : plan.id === "free"
              ? `<button class="button plan-action" type="button" disabled>Disponível gratuitamente</button>`
              : `<button class="button primary plan-action" type="button" data-subscription-action="checkout" data-plan="${plan.id}">Comprar ${escapeHTML(plan.name)}</button>`;
        return `
          <article class="pricing-card ${plan.id === "pro" ? "is-featured" : ""} ${isCurrent ? "is-current" : ""}">
            ${plan.id === "pro" ? '<span class="pricing-highlight">Acesso completo</span>' : ""}
            <div class="pricing-card-heading">
              <span class="pricing-plan-name">${escapeHTML(plan.name)}</span>
              <strong>${escapeHTML(plan.priceLabel)}</strong>
            </div>
            <ul>${safeArray(plan.benefits).map((benefit) => `<li>${escapeHTML(benefit)}</li>`).join("")}</ul>
            ${button}
          </article>
        `;
      }).join("");
    }

    const profileSummary = document.getElementById("accountProfileSummary");
    const user = subscription.user || window.BTPT_AUTH?.session?.user;
    const profile = subscription.profile || window.BTPT_AUTH?.profile;
    if (profileSummary) {
      profileSummary.innerHTML = `
        <div><span>Nome</span><strong>${escapeHTML(profile?.name || user?.user_metadata?.name || "Atleta")}</strong></div>
        <div><span>E-mail</span><strong>${escapeHTML(profile?.email || user?.email || "")}</strong></div>
      `;
    }
    const nameInput = document.getElementById("accountNameInput");
    if (nameInput && document.activeElement !== nameInput) {
      nameInput.value = profile?.name || user?.user_metadata?.name || "";
    }

    const summary = document.getElementById("subscriptionSummary");
    if (summary) {
      const oneTimeAccess = subscription.accessType === "one_time";
      const permanentAccess = oneTimeAccess || subscription.lifetimeAccess;
      const planLabel = oneTimeAccess
        ? `${currentPlan.name} permanente`
        : subscription.lifetimeAccess
          ? `${currentPlan.name} vitalício`
          : subscription.legacyReviewRequired
            ? `${currentPlan.name} em revisão`
            : currentPlan.name;
      const accessStatus = oneTimeAccess
        ? "Acesso permanente"
        : subscription.lifetimeAccess
          ? "Acesso vitalício"
          : subscription.legacyReviewRequired
            ? "Compra antiga preservada"
            : this.subscriptionStatusLabel(subscription.status);
      const paidValue = currentPlan.id === "free"
        ? currentPlan.priceLabel
        : subscription.legacyReviewRequired
          ? "Compra anterior"
          : currentPlan.priceLabel;
      const accessType = permanentAccess
        ? "Pagamento único"
        : subscription.legacyReviewRequired
          ? "Em revisão"
          : currentPlan.id === "free"
            ? "Grátis para sempre"
            : "Acesso legado";
      summary.innerHTML = `
        <div><span>Plano atual</span><strong>${escapeHTML(planLabel)}</strong></div>
        <div><span>Status</span><strong>${escapeHTML(accessStatus)}</strong></div>
        <div><span>Valor pago</span><strong>${escapeHTML(paidValue)}</strong></div>
        <div><span>Tipo de acesso</span><strong>${escapeHTML(accessType)}</strong></div>
      `;
    }

    const confirmation = document.getElementById("subscriptionConfirmation");
    if (confirmation) {
      const params = new URLSearchParams(window.location.search);
      const checkoutParam = params.get("checkout");
      const pending = window.BTPT_SUBSCRIPTION?.getPendingCheckout();
      const pendingPlan = pending?.plan || (["plus", "pro"].includes(checkoutParam) ? checkoutParam : null);
      const currentRank = planConfig.PLAN_RANK[subscription.effectivePlan] ?? 0;
      const pendingRank = pendingPlan ? planConfig.PLAN_RANK[pendingPlan] ?? 0 : Infinity;
      const confirmed = pendingPlan && currentRank >= pendingRank;
      const visible = !confirmed && (Boolean(pending) || ["pending", "plus", "pro"].includes(checkoutParam));
      confirmation.hidden = !visible;
      this.syncSubscriptionPolling(visible && Boolean(pending));
      if (confirmed) {
        window.BTPT_SUBSCRIPTION?.clearPendingCheckout();
        params.delete("checkout");
        const query = params.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
      }
    }
  }

  renderExercises() {
    const filters = this.app.filterManager.getExerciseFilters();
    const exercises = this.app.exerciseManager.getFiltered(filters);
    const accessibleCount = exercises.filter((exercise) => window.BTPT_ACCESS.canAccessExercise(exercise.id)).length;
    const isFree = window.BTPT_ACCESS.currentPlan() === "free";
    document.getElementById("exerciseCount").textContent = isFree
      ? `${accessibleCount} exercícios liberados no plano Grátis neste filtro.`
      : `${exercises.length} de ${this.app.exerciseManager.items.length} exercícios encontrados.`;
    document.getElementById("exerciseGrid").innerHTML = exercises.map((exercise) => this.exerciseCard(exercise)).join("") || this.empty("Nenhum exercício encontrado.");
  }

  renderFavorites() {
    const ids = this.app.storage.getFavoriteExercises();
    const exercises = this.app.exerciseManager.getMany(ids);
    const planIds = this.app.storage.getFavoritePlans();
    const plans = this.app.lessonManager.items.filter((plan) => planIds.includes(plan.id));
    const showingPlans = this.favoriteFilter === "plans";
    document.querySelectorAll(".favorite-segment").forEach((button) => {
      const active = button.dataset.filter === this.favoriteFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.getElementById("favoriteCount").textContent = showingPlans
      ? `${plans.length} planos favoritos.`
      : `${exercises.length} exercícios favoritos.`;
    document.getElementById("favoriteGrid").innerHTML = showingPlans
      ? (!window.BTPT_ACCESS.canAccessFeature("lessonPlans")
        ? window.BTPT_PAYWALL.inline("lessonPlans")
        : plans.map((plan, index) => this.lessonCard(plan, index)).join("") || this.empty("Nenhum plano favorito salvo ainda."))
      : exercises.map((exercise) => this.exerciseCard(exercise)).join("") || this.empty("Nenhum exercício favorito salvo ainda.");
  }

  renderWorkout() {
    const current = this.app.workoutManager.current;
    const exercises = this.app.workoutManager.getExercises();
    document.getElementById("workoutName").value = current.name || "";
    document.getElementById("workoutGoal").value = current.goal || "";
    document.getElementById("currentWorkoutSummary").innerHTML = [
      ["Duração", `${this.app.workoutManager.getTotalDuration()} min`],
      ["Intensidade", this.workoutIntensity(exercises)]
    ].map(([label, value]) => `<div class="summary-box"><strong>${escapeHTML(value)}</strong><span>${escapeHTML(label)}</span></div>`).join("");
    document.getElementById("currentWorkoutList").innerHTML = exercises.map((exercise, index) => this.workoutExerciseCard(exercise, index)).join("") || this.empty("Adicione exercícios pelo banco para montar o treino.");
    const saved = this.app.storage.getSavedWorkouts();
    if (this.activeSavedWorkoutId && !saved.some((workout) => workout.id === this.activeSavedWorkoutId)) {
      this.activeSavedWorkoutId = null;
    }
    document.getElementById("savedWorkoutList").innerHTML = saved.map((workout) => this.savedWorkoutCard(workout)).join("") || this.empty("Nenhum treino salvo.");
    const activeWorkout = saved.find((workout) => workout.id === this.activeSavedWorkoutId);
    const savedWorkoutPanel = document.getElementById("savedWorkoutOpenPanel");
    if (savedWorkoutPanel) {
      savedWorkoutPanel.innerHTML = "";
    }
    const builderWorkspace = document.getElementById("workoutBuilderWorkspace");
    const progressView = document.getElementById("savedWorkoutProgressView");
    const builderHeaderActions = document.getElementById("builderHeaderActions");
    if (builderHeaderActions) builderHeaderActions.hidden = Boolean(activeWorkout);
    if (builderWorkspace) builderWorkspace.hidden = Boolean(activeWorkout);
    if (progressView) {
      progressView.hidden = !activeWorkout;
      progressView.innerHTML = activeWorkout ? this.savedWorkoutProgressScreen(activeWorkout) : "";
    }
    this.renderMobileWorkoutBar(exercises);
  }

  savedWorkoutPanel(workout) {
    const exercises = this.app.exerciseManager.getMany(workout.exerciseIds);
    const completedIds = this.app.storage.getSavedWorkoutProgress(workout.id);
    const completedCount = exercises.filter((exercise) => completedIds.includes(exercise.id)).length;
    const percent = exercises.length ? Math.round((completedCount / exercises.length) * 100) : 0;
    const status = completedCount === exercises.length && exercises.length ? "concluido" : completedCount ? "em_andamento" : "nao_iniciado";
    return `
      <section class="saved-workout-panel">
        <div class="saved-workout-panel-header">
          <div>
            <span class="eyebrow">Treino aberto</span>
            <h4>${escapeHTML(workout.name)}</h4>
          </div>
          <button class="button ghost small" data-action="close-saved-workout">Fechar</button>
        </div>
        ${this.cardProgress(percent, status)}
        <div class="saved-workout-exercise-list">
          ${exercises.map((exercise) => {
            const completed = completedIds.includes(exercise.id);
            return `
              <div class="saved-workout-exercise ${completed ? "is-complete" : ""}">
                ${this.miniExerciseVisual(exercise, "saved-workout-thumb")}
                <strong>${escapeHTML(exercise.nome)}</strong>
                <button class="completion-toggle ${completed ? "is-complete" : ""}" data-action="toggle-saved-workout-exercise" data-workout-id="${escapeHTML(workout.id)}" data-id="${exercise.id}">
                  ${completed ? "Conclu\u00eddo" : "Marcar conclu\u00eddo"}
                </button>
              </div>
            `;
          }).join("") || this.empty("Este treino salvo n\u00e3o tem exerc\u00edcios dispon\u00edveis.")}
        </div>
      </section>
    `;
  }

  workoutExerciseCard(exercise, index) {
    const total = safeArray(this.app.workoutManager.current.exerciseIds).length;
    const isFirst = index === 0;
    const isLast = index === total - 1;
    return `
      <article class="workout-exercise-card" data-action="open-exercise" data-source="workout_builder" data-id="${exercise.id}" role="button" aria-label="Ver exercício ${escapeHTML(exercise.nome)}">
        <div class="workout-card-main">
          <div class="workout-order-tools" aria-label="Ordem do exercicio">
            <span class="workout-order">#${index + 1}</span>
            <div class="workout-reorder-controls">
              <button class="reorder-button" type="button" data-action="move-current-exercise" data-id="${exercise.id}" data-direction="up" title="Mover para cima" aria-label="Mover exercicio para cima" ${isFirst ? "disabled aria-disabled=\"true\"" : ""}>&uarr;</button>
              <button class="reorder-button" type="button" data-action="move-current-exercise" data-id="${exercise.id}" data-direction="down" title="Mover para baixo" aria-label="Mover exercicio para baixo" ${isLast ? "disabled aria-disabled=\"true\"" : ""}>&darr;</button>
            </div>
          </div>
          ${this.miniExerciseVisual(exercise, "workout-thumb")}
          <div>
            <h4>${escapeHTML(exercise.nome)}</h4>
            <div class="workout-card-meta">
              <span>${escapeHTML(exercise.categoria)}</span>
              <span>${escapeHTML(titleCase(exercise.tipo))}</span>
              <span>${escapeHTML(exercise.duracao_minutos)} min</span>
              <span>${escapeHTML(titleCase(exercise.intensidade))}</span>
            </div>
          </div>
        </div>
        <div class="workout-card-actions">
          <button class="button secondary small" data-action="open-exercise" data-source="workout_builder" data-id="${exercise.id}">Ver exercício</button>
          <button class="button ghost small danger" data-action="remove-current-exercise" data-id="${exercise.id}">Remover</button>
        </div>
      </article>
    `;
  }

  savedWorkoutStats(workout) {
    const exercises = this.app.exerciseManager.getMany(workout.exerciseIds);
    const completedIds = this.app.storage.getSavedWorkoutProgress(workout.id);
    const completedCount = exercises.filter((exercise) => completedIds.includes(exercise.id)).length;
    const percent = exercises.length ? Math.round((completedCount / exercises.length) * 100) : 0;
    const status = completedCount === exercises.length && exercises.length ? "concluido" : completedCount ? "em_andamento" : "nao_iniciado";
    const duration = sumValues(exercises, (item) => item.duracao_minutos);
    return { exercises, completedIds, completedCount, percent, status, duration };
  }

  savedWorkoutCard(workout) {
    const stats = this.savedWorkoutStats(workout);
    return `
      <article class="saved-workout-card" data-action="load-saved-workout" data-id="${workout.id}" role="button" aria-label="Ver progresso do treino ${escapeHTML(workout.name)}">
        <div>
          <span class="eyebrow">Treino salvo</span>
          <h4>${escapeHTML(workout.name)}</h4>
          <p>${escapeHTML(workout.goal)}</p>
          <div class="workout-card-meta">
            <span>${stats.exercises.length} exercícios</span>
            <span>${stats.duration} min</span>
            <span>${stats.completedCount} concluídos</span>
          </div>
        </div>
        ${this.cardProgress(stats.percent, stats.status)}
        <div class="workout-card-actions">
          <button class="button primary small" data-action="load-saved-workout" data-id="${workout.id}">Ver progresso</button>
          <button class="button ghost small danger" data-action="delete-saved-workout" data-id="${workout.id}">Excluir</button>
        </div>
      </article>
    `;
  }

  savedWorkoutProgressScreen(workout) {
    const stats = this.savedWorkoutStats(workout);
    return `
      <div class="workout-progress-card">
        <div class="workout-progress-header">
          <div>
            <span class="eyebrow">Progresso do treino</span>
            <h3>${escapeHTML(workout.name)}</h3>
            <p>${escapeHTML(workout.goal)}</p>
          </div>
          <div class="workout-progress-header-actions">
            <button class="button secondary" data-action="export-saved-workout" data-id="${workout.id}">Exportar PDF</button>
            <button class="button ghost" data-action="close-saved-workout">Voltar</button>
          </div>
        </div>
        <div class="workout-progress-overview">
          ${this.cardProgress(stats.percent, stats.status)}
          <div class="workout-progress-stats">
            <span><strong>${stats.completedCount}</strong> concluídos</span>
            <span><strong>${stats.exercises.length}</strong> exercícios</span>
            <span><strong>${stats.duration}</strong> min</span>
          </div>
        </div>
        <div class="workout-progress-list">
          ${stats.exercises.map((exercise, index) => {
            const completed = stats.completedIds.includes(exercise.id);
            return `
              <article class="workout-progress-exercise-card ${completed ? "is-complete" : ""}" data-action="open-exercise" data-source="workout_progress" data-id="${exercise.id}" role="button" aria-label="Ver exercício ${escapeHTML(exercise.nome)}">
                <div class="workout-card-main">
                  <span class="workout-order">${index + 1}</span>
                  ${this.miniExerciseVisual(exercise, "workout-thumb")}
                  <div>
                    <h4>${escapeHTML(exercise.nome)}</h4>
                    <div class="workout-card-meta">
                      <span>${escapeHTML(exercise.categoria)}</span>
                      <span>${escapeHTML(exercise.duracao_minutos)} min</span>
                      <span>${escapeHTML(titleCase(exercise.intensidade))}</span>
                    </div>
                  </div>
                </div>
                <div class="workout-card-actions">
                  <button class="button secondary small" data-action="open-exercise" data-source="workout_progress" data-id="${exercise.id}">Ver exercício</button>
                  <button class="completion-toggle ${completed ? "is-complete" : ""}" data-action="toggle-saved-workout-exercise" data-workout-id="${escapeHTML(workout.id)}" data-id="${exercise.id}">
                    ${completed ? "Concluído" : "Marcar concluído"}
                  </button>
                </div>
              </article>
            `;
          }).join("") || this.empty("Este treino salvo não tem exercícios disponíveis.")}
        </div>
      </div>
    `;
  }

  renderLessons() {
    if (!window.BTPT_ACCESS.canAccessFeature("lessonPlans")) {
      document.getElementById("lessonCount").textContent = "Conteúdo exclusivo do plano Pro.";
      document.getElementById("lessonGrid").innerHTML = window.BTPT_PAYWALL.inline("lessonPlans");
      return;
    }
    const filters = this.app.filterManager.getLessonFilters();
    const plans = this.sortActiveFirst(this.app.lessonManager.getFiltered(filters), (plan) => this.app.getLessonPlanProgress(plan));
    document.getElementById("lessonCount").textContent = `${plans.length} de ${this.app.lessonManager.items.length} planos disponiveis.`;
    document.getElementById("lessonGrid").innerHTML = plans.map((plan, index) => this.lessonCard(plan, index)).join("") || this.empty("Nenhum plano encontrado.");
  }

  renderEvolution() {
    if (!window.BTPT_ACCESS.canAccessFeature("evolution")) {
      document.getElementById("evolutionGrid").innerHTML = window.BTPT_PAYWALL.inline("evolution");
      return;
    }
    const plans = this.app.evolutionManager.items.slice().sort((a, b) => compareByLevelOrder(a, b) || Number(a.duracao_semanas || 0) - Number(b.duracao_semanas || 0));
    document.getElementById("evolutionGrid").innerHTML = plans.map((plan) => {
      const progress = this.app.getEvolutionProgressState(plan);
      const label = progress.status === "concluido" ? "Ver evolu\u00e7\u00e3o" : "Abrir evolu\u00e7\u00e3o";
      const cover = plan && plan.imagem_capa ? resolvePublicAsset(plan.imagem_capa) : "";
      const media = cover
        ? `<img class="evolution-cover-image" src="${escapeHTML(cover)}" alt="${escapeHTML(plan.nome)}" loading="lazy">`
        : this.frontCardArt("", "", "evolution", `${plan.nome} ${plan.objetivo || ""}`);
      return `
      <article class="evolution-card journey-card media-card evolution-media-card ${progress.status === "concluido" ? "is-complete" : ""}" data-action="open-evolution" data-id="${plan.id}" role="button" aria-label="${escapeHTML(label)} ${escapeHTML(plan.nome)}">
        <div class="card-media evolution-program-media ${cover ? "has-real-cover" : ""} ${this.visualTone(plan.nome)}" style="--progress:${Math.max(4, Math.round(progress.progressPercent || 0))}%">
          ${media}
        </div>
        <div class="card-content">
          <div class="meta-row">
            ${this.pill(titleCase(plan.nivel))}
            ${this.pill(`${plan.duracao_semanas} semanas`, "coral")}
            ${progress.status === "em_andamento" ? this.pill("Em execu\u00e7\u00e3o", "active") : ""}
          </div>
          <h3 class="card-title">${escapeHTML(plan.nome)}</h3>
          ${this.cardProgress(progress.progressPercent, progress.status)}
          <div class="card-actions">
            <button class="button primary small" data-action="open-evolution" data-id="${plan.id}">${label}</button>
            <button class="button secondary small" data-action="export-evolution" data-id="${plan.id}">PDF</button>
          </div>
        </div>
      </article>`;
    }).join("");
  }

  frontCardArt(primary = "Treino", secondary = "", variant = "exercise", context = "") {
    const hasCaption = Boolean(String(primary || secondary || "").trim());
    const visualClass = this.frontVisualClass(`${primary} ${secondary} ${context}`);
    return `
      <div class="front-card-art front-card-art-${variant} ${visualClass}" aria-hidden="true">
        <span class="front-court"></span>
        <span class="front-net"></span>
        <span class="front-center"></span>
        <span class="front-zone front-zone-a"></span>
        <span class="front-zone front-zone-b"></span>
        <span class="front-shot"></span>
        <span class="front-player front-player-a"></span>
        <span class="front-player front-player-b"></span>
        <span class="front-player front-player-c"></span>
        <span class="front-player front-player-d"></span>
        <span class="front-cone front-cone-a"></span>
        <span class="front-cone front-cone-b"></span>
        <span class="front-ladder"></span>
        <span class="front-ball"></span>
        ${hasCaption ? `<div class="front-card-caption">
          <strong>${escapeHTML(titleCase(primary || "Treino"))}</strong>
          ${secondary ? `<span>${escapeHTML(titleCase(secondary))}</span>` : ""}
        </div>` : ""}
      </div>
    `;
  }

  frontVisualClass(context = "") {
    const text = normalizeText(context);
    const classes = [];
    if (text.includes("sem bola")) classes.push("front-is-no-ball");
    if (text.includes("saque")) classes.push("front-is-saque");
    if (text.includes("recepcao") || text.includes("recepção")) classes.push("front-is-recepcao");
    if (text.includes("voleio")) classes.push("front-is-voleio");
    if (text.includes("bandeja")) classes.push("front-is-bandeja");
    if (text.includes("smash")) classes.push("front-is-smash");
    if (text.includes("defesa")) classes.push("front-is-defesa");
    if (text.includes("ataque")) classes.push("front-is-ataque");
    if (text.includes("precisao") || text.includes("precisão") || text.includes("alvo")) classes.push("front-is-precisao");
    if (text.includes("reacao") || text.includes("reação")) classes.push("front-is-reacao");
    if (text.includes("dupla") || text.includes("grupo") || text.includes("tatica") || text.includes("tática")) classes.push("front-is-dupla");
    if (text.includes("aquecimento") || text.includes("mobilidade") || text.includes("coordenacao") || text.includes("coordenação") || text.includes("deslocamento") || text.includes("fisic") || text.includes("condicionamento")) classes.push("front-is-fisico");
    return classes.join(" ");
  }

  miniExerciseVisual(exercise, className = "") {
    return "";
  }

  visualTone(value = "") {
    const tones = ["tone-aqua", "tone-sand", "tone-orange", "tone-sea", "tone-night"];
    const text = String(value || "");
    const score = Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return tones[score % tones.length];
  }

  exerciseCard(exercise) {
    const favorite = this.app.storage.getFavoriteExercises().includes(exercise.id);
    const locked = !window.BTPT_ACCESS.canAccessExercise(exercise.id);
    return `
      <article class="exercise-card media-card clean-list-card ${locked ? "is-locked" : ""}">
        <div class="card-content">
          <div class="card-title-row">
            <h3 class="card-title">${escapeHTML(exercise.nome)}</h3>
            ${locked
              ? '<span class="card-lock" title="Disponível no Plus e Pro" aria-label="Exercício bloqueado">&#128274;</span>'
              : `<button class="media-favorite card-favorite ${favorite ? "is-active" : ""}" title="${favorite ? "Remover dos favoritos" : "Favoritar"}" aria-label="${favorite ? "Remover dos favoritos" : "Favoritar"}" aria-pressed="${favorite ? "true" : "false"}" data-action="favorite-exercise" data-id="${exercise.id}">${favorite ? "\u2665" : "\u2661"}</button>`}
          </div>
          <div class="meta-row">
            ${this.pill(exercise.categoria, "coral")}
            ${this.pill(titleCase(exercise.nivel))}
          </div>
          <div class="card-mini-meta">
            <span>${escapeHTML(exercise.duracao_minutos)} min</span>
            <span>${escapeHTML(titleCase(exercise.intensidade))}</span>
            <span>${escapeHTML(titleCase(exercise.indicado_para || "ambos"))}</span>
          </div>
          <p class="card-body">${escapeHTML(locked ? "Disponível nos planos Plus e Pro. Toque para conhecer as opções de acesso." : exercise.objetivo)}</p>
          <div class="card-actions">
            <button class="button ${locked ? "secondary" : "primary"} small" data-action="open-exercise" data-id="${exercise.id}">${locked ? "Ver planos" : "Detalhes"}</button>
            ${locked ? "" : `<button class="button secondary small" data-action="add-exercise" data-id="${exercise.id}">Adicionar</button>`}
          </div>
        </div>
      </article>
    `;
  }

  lessonCard(plan, index = 0) {
    const favorite = this.app.storage.getFavoritePlans().includes(plan.id);
    const progress = this.app.getLessonPlanProgress(plan);
    const exerciseCount = this.app.getPlanExerciseIds(plan).length;
    const blockCount = safeArray(plan.estrutura_da_aula).length;
    const label = progress.status === "concluido" ? "Ver plano" : "Abrir plano";
    return `
      <article class="lesson-card media-card clean-list-card ${progress.status === "concluido" ? "is-complete" : ""}" data-action="open-plan" data-id="${plan.id}" role="button" aria-label="${escapeHTML(label)} ${escapeHTML(plan.nome)}">
        <div class="card-content">
          <div class="card-title-row">
            <h3 class="card-title">${escapeHTML(plan.nome)}</h3>
            <button class="media-favorite card-favorite ${favorite ? "is-active" : ""}" title="${favorite ? "Remover plano dos favoritos" : "Favoritar plano"}" aria-label="${favorite ? "Remover plano dos favoritos" : "Favoritar plano"}" aria-pressed="${favorite ? "true" : "false"}" data-action="favorite-plan" data-id="${plan.id}">${favorite ? "\u2665" : "\u2661"}</button>
          </div>
          <div class="meta-row">
            ${this.pill(titleCase(plan.nivel))}
            ${this.pill(`${plan.duracao_total_minutos} min`, "coral")}
            ${progress.status === "em_andamento" ? this.pill("Em execu\u00e7\u00e3o", "active") : ""}
            ${index < 6 ? this.pill("Recomendado") : ""}
          </div>
          <div class="card-mini-meta">
            <span>${blockCount} blocos</span>
            <span>${exerciseCount} exercícios</span>
            <span>${escapeHTML(titleCase(plan.publico || "ambos"))}</span>
          </div>
          ${this.cardProgress(progress.progressPercent, progress.status)}
          <div class="card-actions">
            <button class="button primary small" data-action="open-plan" data-id="${plan.id}">${label}</button>
            <button class="button secondary small" data-action="export-plan" data-id="${plan.id}">PDF</button>
          </div>
        </div>
      </article>
    `;
  }

  renderMobileWorkoutBar(exercises) {
    const bar = document.getElementById("mobileWorkoutBar");
    if (!bar) return;
    const total = sumValues(exercises, (item) => item.duracao_minutos);
    document.getElementById("mobileWorkoutCount").textContent = `${exercises.length} ${exercises.length === 1 ? "exercício" : "exercícios"}`;
    document.getElementById("mobileWorkoutDuration").textContent = `${total} min`;
    bar.classList.toggle("is-visible", exercises.length > 0);
    document.body.classList.toggle("has-workout", exercises.length > 0);
  }

  pill(text, variant = "") {
    const typeClass = this.typeLabelClass(text);
    return `<span class="pill ${variant} ${typeClass}">${escapeHTML(text)}</span>`;
  }

  typeLabelClass(text = "") {
    const normalized = normalizeText(text);
    if (normalized.includes("sem bola")) return "is-no-ball";
    if (normalized.includes("com bola")) return "is-ball";
    if (["leve", "baixa", "moderada", "media", "média", "alta"].some((value) => normalized.includes(normalizeText(value)))) return "is-intensity";
    return "";
  }

  cardProgress(percent, status) {
    const value = Math.max(0, Math.min(100, Math.round(Number(percent || 0))));
    const label = status === "concluido" ? "Concluido" : status === "em_andamento" ? "Em execucao" : "Nao iniciado";
    return `
      <div class="card-progress" style="--progress:${value}%">
        <div><strong>${value}%</strong><span>${escapeHTML(label)}</span></div>
        <span class="card-progress-track"><span style="width:${value}%"></span></span>
      </div>
    `;
  }

  sortActiveFirst(items, getProgress) {
    return items
      .map((item, index) => ({ item, index, progress: getProgress(item) }))
      .sort((a, b) => {
        const activeDiff = Number(b.progress.status === "em_andamento") - Number(a.progress.status === "em_andamento");
        return activeDiff || a.index - b.index;
      })
      .map(({ item }) => item);
  }


  empty(text) {
    return `<div class="empty-state">${escapeHTML(text)}</div>`;
  }

  workoutIntensity(exercises) {
    if (!exercises.length) return "Sem dados";
    const counts = countBy(exercises, (item) => item.intensidade);
    return titleCase(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
  }
}

class AppController {
  constructor() {
    this.userId = window.BTPT_AUTH?.session?.user?.id || "";
    this.storage = new StorageManager();
    this.db = new IndexedDBManager(this.userId);
    this.diagramManager = new DiagramManager();
    this.pdfService = new PDFService();
    this.audioManager = new AudioManager(this.storage);
    this.applyTheme(this.storage.getTheme());
  }

  async init() {
    let databaseReady = false;
    try {
      await this.db.open();
      databaseReady = true;
    } catch (error) {
      console.warn("IndexedDB indisponível; o conteúdo offline não poderá ser usado.", error);
    }

    try {
      const result = await window.BTPT_CONTENT.load(window.BTPT_AUTH?.getClient?.());
      if (result.ok) {
        if (result.plan && result.plan !== window.BTPT_ACCESS.currentPlan()) {
          await window.BTPT_AUTH?.refreshProfile({ silent: true });
          result.data = window.BTPT_CONTENT.restrictToCurrentPlan(result.data);
        }
        if (databaseReady) await this.db.seed(result.data);
        this.startApp(result.data.exercicios, result.data.planos_aula, result.data.planos_evolucao);
        this.toast("Conteúdo do seu plano carregado.");
        return;
      }

      if (!databaseReady) throw new Error("Conteúdo indisponível. Conecte-se à internet e tente novamente.");
      const cached = window.BTPT_CONTENT.restrictToCurrentPlan({
        exercicios: await this.db.getAll("exercicios"),
        planos_aula: await this.db.getAll("planos_aula"),
        planos_evolucao: await this.db.getAll("planos_evolucao")
      });
      if (!cached.exercicios.length) {
        throw new Error("Nenhum conteúdo offline autorizado foi encontrado neste dispositivo.");
      }
      this.startApp(cached.exercicios, cached.planos_aula, cached.planos_evolucao);
      this.toast("Modo offline: acesso conservador ao conteúdo já autorizado.", { variant: "warning" });
    } catch (error) {
      console.warn("Não foi possível carregar o conteúdo autorizado.", error);
      this.showFatalError(error);
    }
  }

  startApp(exercises, lessons, evolutions) {
    const freeValidation = window.BTPT_FREE_EXERCISES?.validate(exercises);
    if (!freeValidation?.valid) {
      throw new Error(`Configuração dos exercícios gratuitos inválida: ${safeArray(freeValidation?.missing).join(", ") || "a lista deve conter exatamente 25 IDs únicos"}.`);
    }
    this.authorizedPlan = window.BTPT_ACCESS.currentPlan();
    this.exerciseManager = new ExerciseManager(exercises);
    this.pdfService.setExerciseManager(this.exerciseManager);
    this.lessonManager = new LessonPlanManager(lessons);
    this.evolutionManager = new EvolutionPlanManager(evolutions);
    this.workoutManager = new WorkoutBuilderManager(this.storage, this.exerciseManager);
    this.modalManager = new ModalManager(this.diagramManager, this);
    this.dashboardManager = new DashboardManager(this.exerciseManager, this.lessonManager, this.evolutionManager, this.storage);
    this.ui = new UIManager(this);
    this.filterManager = new FilterManager(
      this.exerciseManager.items,
      this.lessonManager.items,
      () => this.ui.renderExercises(),
      () => this.ui.renderLessons()
    );
    this.filterManager.bind();
    this.audioManager.bindControls();
    this.ui.bind();
    this.ui.renderAll();
    try {
      const requestedPlan = window.sessionStorage.getItem("btpt_requested_plan");
      if (["plus", "pro"].includes(requestedPlan)) {
        window.sessionStorage.removeItem("btpt_requested_plan");
        this.ui.switchView("plans");
      }
    } catch {
      // O dashboard continua sendo a tela inicial quando o storage não está disponível.
    }
    this.updateThemeButton();
  }

  applyTheme(theme) {
    const dark = theme === "dark";
    document.documentElement.classList.toggle("dark-mode", dark);
    document.body && document.body.classList.toggle("dark-mode", dark);
  }

  toggleTheme() {
    const next = document.documentElement.classList.contains("dark-mode") ? "light" : "dark";
    this.storage.setTheme(next);
    this.applyTheme(next);
    this.updateThemeButton();
  }

  updateThemeButton() {
    const dark = document.documentElement.classList.contains("dark-mode");
    document.querySelectorAll('[data-action="toggle-theme"]').forEach((button) => {
      button.classList.toggle("is-active", dark);
      button.setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");
      button.setAttribute("title", dark ? "Modo claro" : "Modo escuro");
      const icon = button.querySelector(".theme-toggle-icon");
      const label = button.querySelector("[data-theme-label]");
      if (icon) icon.textContent = dark ? "☀" : "☾";
      if (label) label.textContent = dark ? "Escuro" : "Claro";
    });
  }

  openExercise(id, context = {}) {
    const exercise = this.exerciseManager.getById(id);
    if (!exercise) return;
    if (!window.BTPT_ACCESS.guardExercise(id)) return;
    this.modalManager.showExercise(exercise, this.storage.getFavoriteExercises().includes(id), context);
  }

  toggleExerciseFavorite(id) {
    if (!window.BTPT_ACCESS.guardExercise(id)) return;
    this.storage.toggleFavoriteExercise(id);
    this.ui.renderExercises();
    this.ui.renderFavorites();
    this.dashboardManager.render();
    const exercise = this.exerciseManager.getById(id);
    if (exercise && !document.getElementById("modalRoot").hidden) {
      this.modalManager.showExercise(exercise, this.storage.getFavoriteExercises().includes(id), { related: this.modalManager.stack.length > 0 });
    }
    this.toast("Favoritos atualizados.");
  }

  addExerciseToWorkout(id, triggerButton = null) {
    if (!window.BTPT_ACCESS.guardExercise(id)) return;
    this.workoutManager.addExercise(id);
    if (this.filterManager) this.filterManager.closeFilters();
    this.ui.renderWorkout();
    this.dashboardManager.render();
    if (triggerButton && triggerButton.closest("#modalRoot .modal")) {
      this.modalManager.showExerciseAddFeedback();
    }
    this.toast("Exercício adicionado ao montador de treinos!", { key: "workout-add", variant: "success" });
  }

  removeExerciseFromWorkout(id) {
    this.workoutManager.removeExercise(id);
    this.ui.renderWorkout();
    this.dashboardManager.render();
  }

  moveExerciseInWorkout(id, direction) {
    this.workoutManager.moveExercise(id, direction);
    this.ui.renderWorkout();
    this.dashboardManager.render();
  }

  saveCurrentWorkout() {
    this.ui.syncWorkoutFields();
    const saved = this.workoutManager.saveCurrent();
    if (!saved) {
      this.toast("Adicione pelo menos um exercício antes de salvar.");
      return;
    }
    this.workoutManager.clear();
    this.ui.renderWorkout();
    this.dashboardManager.render();
    this.toast("Treino salvo.");
  }

  clearCurrentWorkout() {
    this.workoutManager.clear();
    this.ui.renderWorkout();
    this.dashboardManager.render();
    this.toast("Treino limpo.");
  }

  loadSavedWorkout(id) {
    const workout = this.storage.getSavedWorkouts().find((item) => item.id === id);
    if (!workout) return;
    this.ui.activeSavedWorkoutId = id;
    if (document.body.dataset.view !== "builder") this.ui.switchView("builder");
    else this.ui.renderWorkout();
    window.scrollTo({ top: 0, behavior: "smooth" });
    this.toast("Treino aberto.");
  }

  closeSavedWorkout() {
    this.ui.activeSavedWorkoutId = null;
    this.ui.renderWorkout();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  toggleSavedWorkoutExercise(workoutId, exerciseId) {
    if (!workoutId || !exerciseId) return;
    if (!window.BTPT_ACCESS.guardExercise(exerciseId)) return;
    this.storage.toggleSavedWorkoutExercise(workoutId, exerciseId);
    this.ui.activeSavedWorkoutId = workoutId;
    this.ui.renderWorkout();
    this.dashboardManager.render();
  }

  deleteSavedWorkout(id) {
    this.workoutManager.deleteSaved(id);
    this.storage.clearSavedWorkoutProgress(id);
    if (this.ui.activeSavedWorkoutId === id) this.ui.activeSavedWorkoutId = null;
    this.ui.renderWorkout();
    this.dashboardManager.render();
    this.toast("Treino excluído.");
  }

  exportCurrentWorkout() {
    this.ui.syncWorkoutFields();
    const exercises = this.workoutManager.getExercises();
    if (!exercises.length) {
      this.toast("Adicione exercícios antes de exportar.");
      return;
    }
    this.pdfService.exportWorkout(this.workoutManager.current, exercises);
  }

  exportSavedWorkout(id) {
    const workout = this.storage.getSavedWorkouts().find((item) => item.id === id);
    if (!workout) {
      this.toast("Treino salvo não encontrado.");
      return;
    }
    const exercises = this.exerciseManager.getMany(workout.exerciseIds);
    if (exercises.some((exercise) => !window.BTPT_ACCESS.canAccessExercise(exercise.id))) {
      window.BTPT_PAYWALL.show({ feature: "exercise", requiredPlan: "plus" });
      return;
    }
    if (!exercises.length) {
      this.toast("Este treino salvo não tem exercícios para exportar.");
      return;
    }
    this.pdfService.exportWorkout(workout, exercises);
  }

  exportExercise(id) {
    const exercise = this.exerciseManager.getById(id);
    if (!window.BTPT_ACCESS.guardExercise(id)) return;
    if (exercise) this.pdfService.exportExercise(exercise);
  }

  openLesson(id) {
    if (!window.BTPT_ACCESS.guardFeature("lessonPlans")) return;
    const plan = this.lessonManager.getById(id);
    if (plan) this.modalManager.showLesson(plan, this.storage.getFavoritePlans().includes(id));
  }

  togglePlanFavorite(id) {
    if (!window.BTPT_ACCESS.guardFeature("lessonPlans")) return;
    this.storage.toggleFavoritePlan(id);
    this.ui.renderLessons();
    this.ui.renderFavorites();
    this.dashboardManager.render();
    const plan = this.lessonManager.getById(id);
    if (plan && !document.getElementById("modalRoot").hidden) {
      this.modalManager.showLesson(plan, this.storage.getFavoritePlans().includes(id));
    }
    this.toast("Plano favorito atualizado.");
  }

  exportLesson(id) {
    if (!window.BTPT_ACCESS.guardFeature("lessonPlans")) return;
    const plan = this.lessonManager.getById(id);
    if (plan) this.pdfService.exportLesson(plan);
  }

  openEvolution(id) {
    if (!window.BTPT_ACCESS.guardFeature("evolution")) return;
    const plan = this.evolutionManager.getById(id);
    if (plan) {
      const progress = this.getEvolutionProgressState(plan);
      progress.selectedWeek = "";
      progress.currentDay = "";
      this.storage.setEvolutionProgress(plan.id, progress);
      this.modalManager.showEvolution(plan);
    }
  }

  exportEvolution(id) {
    if (!window.BTPT_ACCESS.guardFeature("evolution")) return;
    const plan = this.evolutionManager.getById(id);
    if (plan) this.pdfService.exportEvolution(plan);
  }


  openRelatedExercise(id, context = {}) {
    const exercise = this.exerciseManager.getById(id);
    if (!exercise) return;
    if (!window.BTPT_ACCESS.guardExercise(id)) return;
    this.modalManager.showRelatedExercise(exercise, this.storage.getFavoriteExercises().includes(id), {
      ...context,
      scrollTop: this.modalManager.getScrollTop()
    });
  }

  closeRelatedExercise() {
    this.modalManager.closeRelatedExercise();
  }

  closeModal() {
    this.modalManager.closeTop();
  }

  getPlanExerciseIds(plan) {
    return [...new Set(safeArray(plan.estrutura_da_aula).flatMap((block) => safeArray(block.exercicios_relacionados)))];
  }

  getLessonPlanProgress(plan) {
    const stored = this.storage.getLessonProgress(plan.id) || {};
    const progress = {
      planId: plan.id,
      startedAt: "",
      completedAt: "",
      status: "nao_iniciado",
      completedBlocks: [],
      completedExercises: [],
      lastOpenedBlock: "",
      progressPercent: 0,
      ...stored
    };
    progress.completedBlocks = safeArray(progress.completedBlocks);
    progress.completedExercises = safeArray(progress.completedExercises);
    progress.progressPercent = this.calculateLessonProgress(plan, progress);
    if (progress.progressPercent >= 100) progress.status = "concluido";
    if (progress.progressPercent > 0 && progress.status === "nao_iniciado") progress.status = "em_andamento";
    return progress;
  }

  saveLessonPlanProgress(plan, progress) {
    progress.progressPercent = this.calculateLessonProgress(plan, progress);
    if (progress.progressPercent >= 100) {
      progress.status = "concluido";
      progress.completedAt = progress.completedAt || new Date().toISOString();
    } else if (progress.startedAt) {
      progress.status = "em_andamento";
      progress.completedAt = "";
    }
    this.storage.setLessonProgress(plan.id, progress);
  }

  calculateLessonProgress(plan, progress) {
    const totalExercises = this.getPlanExerciseIds(plan).length;
    const total = Math.max(1, totalExercises);
    const doneExercises = safeArray(progress.completedExercises).filter((id) => this.exerciseManager.getById(id)).length;
    return Math.round((doneExercises / total) * 100);
  }

  getLessonRemainingMinutes(plan, progress) {
    const percent = Math.max(0, Math.min(100, Number(progress.progressPercent || 0)));
    return Math.max(0, Math.round(Number(plan.duracao_total_minutos || 0) * (100 - percent) / 100));
  }

  togglePlanExercise(planId, exerciseId) {
    if (!window.BTPT_ACCESS.guardFeature("lessonPlans")) return;
    const plan = this.lessonManager.getById(planId);
    if (!plan) return;
    const scrollTop = this.modalManager.getScrollTop();
    const progress = this.getLessonPlanProgress(plan);
    if (!progress.startedAt) progress.startedAt = new Date().toISOString();
    progress.completedExercises = progress.completedExercises.includes(exerciseId)
      ? progress.completedExercises.filter((item) => item !== exerciseId)
      : [...progress.completedExercises, exerciseId];
    this.saveLessonPlanProgress(plan, progress);
    this.modalManager.showLesson(plan, this.storage.getFavoritePlans().includes(planId));
    window.requestAnimationFrame(() => this.modalManager.setScrollTop(scrollTop));
    this.ui.renderLessons();
  }

  finishLessonPlan(id) {
    if (!window.BTPT_ACCESS.guardFeature("lessonPlans")) return;
    const plan = this.lessonManager.getById(id);
    if (!plan) return;
    const progress = this.getLessonPlanProgress(plan);
    progress.startedAt = progress.startedAt || new Date().toISOString();
    progress.completedExercises = this.getPlanExerciseIds(plan);
    progress.status = "concluido";
    progress.completedAt = new Date().toISOString();
    this.saveLessonPlanProgress(plan, progress);
    this.modalManager.showLesson(plan, this.storage.getFavoritePlans().includes(id));
    this.ui.renderLessons();
    this.toast("Plano marcado como concluido.");
  }

  getEvolutionDayKey(weekNumber, day) {
    return `semana_${weekNumber}_${normalizeText(day).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
  }

  getEvolutionProgressState(plan) {
    const stored = this.storage.getEvolutionProgress(plan.id) || {};
    const firstWeek = safeArray(plan.semanas)[0];
    const firstDay = firstWeek && safeArray(firstWeek.treinos)[0];
    const progress = {
      evolutionId: plan.id,
      startedAt: "",
      completedAt: "",
      status: "nao_iniciado",
      completedWeeks: [],
      completedDays: [],
      completedExercises: {},
      currentWeek: firstWeek ? firstWeek.semana : 1,
      selectedWeek: "",
      currentDay: "",
      progressPercent: 0,
      ...stored
    };
    progress.completedWeeks = safeArray(progress.completedWeeks);
    progress.completedExercises = progress.completedExercises && !Array.isArray(progress.completedExercises) && typeof progress.completedExercises === "object" ? progress.completedExercises : {};
    Object.keys(progress.completedExercises).forEach((key) => {
      progress.completedExercises[key] = safeArray(progress.completedExercises[key]);
    });
    progress.completedDays = this.getCompletedEvolutionDays(plan, progress);
    progress.completedWeeks = this.getCompletedEvolutionWeeks(plan, progress);
    progress.progressPercent = this.calculateEvolutionProgress(plan, progress);
    if (progress.progressPercent >= 100) progress.status = "concluido";
    if (progress.progressPercent < 100 && (progress.startedAt || this.hasEvolutionExerciseProgress(progress))) {
      progress.status = "em_andamento";
      progress.completedAt = "";
    }
    if (!progress.startedAt && !this.hasEvolutionExerciseProgress(progress)) {
      progress.status = "nao_iniciado";
      progress.completedAt = "";
    }
    return progress;
  }

  saveEvolutionProgress(plan, progress) {
    progress.completedDays = this.getCompletedEvolutionDays(plan, progress);
    progress.completedWeeks = this.getCompletedEvolutionWeeks(plan, progress);
    progress.progressPercent = this.calculateEvolutionProgress(plan, progress);
    if (progress.progressPercent >= 100) {
      progress.status = "concluido";
      progress.completedAt = progress.completedAt || new Date().toISOString();
    } else if (progress.startedAt || this.hasEvolutionExerciseProgress(progress)) {
      progress.status = "em_andamento";
      progress.completedAt = "";
    } else {
      progress.status = "nao_iniciado";
      progress.completedAt = "";
    }
    this.storage.setEvolutionProgress(plan.id, progress);
  }

  calculateEvolutionProgress(plan, progress) {
    let total = 0;
    let done = 0;
    safeArray(plan.semanas).forEach((week) => {
      safeArray(week.treinos).forEach((training) => {
        const key = this.getEvolutionDayKey(week.semana, training.dia);
        total += 1;
        if (this.isEvolutionDayComplete(progress, key, training)) done += 1;
      });
    });
    return Math.round((done / Math.max(1, total)) * 100);
  }

  getEvolutionDayProgress(progress, dayKey, training) {
    const ids = safeArray(training.exercicios_sugeridos);
    const done = safeArray(progress.completedExercises && progress.completedExercises[dayKey]).filter((id) => ids.includes(id)).length;
    return { done, total: ids.length, percent: Math.round((done / Math.max(1, ids.length)) * 100) };
  }

  isEvolutionDayComplete(progress, dayKey, training) {
    const day = this.getEvolutionDayProgress(progress, dayKey, training);
    return day.total > 0 && day.done >= day.total;
  }

  getCompletedEvolutionDays(plan, progress) {
    const completed = [];
    safeArray(plan.semanas).forEach((week) => {
      safeArray(week.treinos).forEach((training) => {
        const key = this.getEvolutionDayKey(week.semana, training.dia);
        if (this.isEvolutionDayComplete(progress, key, training)) completed.push(key);
      });
    });
    return completed;
  }

  hasEvolutionExerciseProgress(progress) {
    return Object.values(progress.completedExercises || {}).some((items) => safeArray(items).length > 0);
  }

  getEvolutionWeekProgress(plan, progress, week) {
    let total = 0;
    let done = 0;
    safeArray(week.treinos).forEach((training) => {
      const key = this.getEvolutionDayKey(week.semana, training.dia);
      total += 1;
      if (this.isEvolutionDayComplete(progress, key, training)) done += 1;
    });
    return { done, total, percent: Math.round((done / Math.max(1, total)) * 100) };
  }

  getCompletedEvolutionWeeks(plan, progress) {
    return safeArray(plan.semanas)
      .filter((week) => this.getEvolutionWeekProgress(plan, progress, week).percent >= 100)
      .map((week) => String(week.semana));
  }

  openEvolutionWeek(id, weekNumber) {
    if (!window.BTPT_ACCESS.guardFeature("evolution")) return;
    const plan = this.evolutionManager.getById(id);
    if (!plan) return;
    const progress = this.getEvolutionProgressState(plan);
    progress.currentWeek = Number(weekNumber);
    progress.selectedWeek = Number(weekNumber);
    progress.currentDay = "";
    this.saveEvolutionProgress(plan, progress);
    this.modalManager.showEvolution(plan);
    this.ui.renderEvolution();
    this.dashboardManager.render();
  }

  openEvolutionDay(id, weekNumber, dayKey) {
    if (!window.BTPT_ACCESS.guardFeature("evolution")) return;
    const plan = this.evolutionManager.getById(id);
    if (!plan) return;
    const progress = this.getEvolutionProgressState(plan);
    progress.startedAt = progress.startedAt || new Date().toISOString();
    progress.status = progress.status === "concluido" ? "concluido" : "em_andamento";
    progress.currentWeek = Number(weekNumber);
    progress.selectedWeek = Number(weekNumber);
    progress.currentDay = dayKey;
    this.saveEvolutionProgress(plan, progress);
    this.modalManager.showEvolution(plan);
    this.ui.renderEvolution();
    this.dashboardManager.render();
  }

  backEvolutionToDays(id, weekNumber) {
    if (!window.BTPT_ACCESS.guardFeature("evolution")) return;
    const plan = this.evolutionManager.getById(id);
    if (!plan) return;
    const progress = this.getEvolutionProgressState(plan);
    progress.currentWeek = Number(weekNumber || progress.currentWeek || 1);
    progress.selectedWeek = Number(weekNumber || progress.currentWeek || 1);
    progress.currentDay = "";
    this.saveEvolutionProgress(plan, progress);
    this.modalManager.showEvolution(plan);
    this.ui.renderEvolution();
    this.dashboardManager.render();
  }

  toggleEvolutionExercise(evolutionId, weekNumber, dayKey, exerciseId) {
    if (!window.BTPT_ACCESS.guardFeature("evolution")) return;
    const plan = this.evolutionManager.getById(evolutionId);
    if (!plan) return;
    const scrollTop = this.modalManager.getScrollTop();
    const progress = this.getEvolutionProgressState(plan);
    progress.startedAt = progress.startedAt || new Date().toISOString();
    progress.currentWeek = Number(weekNumber);
    progress.currentDay = dayKey;
    const list = safeArray(progress.completedExercises[dayKey]);
    progress.completedExercises[dayKey] = list.includes(exerciseId)
      ? list.filter((id) => id !== exerciseId)
      : [...list, exerciseId];
    this.saveEvolutionProgress(plan, progress);
    this.modalManager.showEvolution(plan);
    window.requestAnimationFrame(() => this.modalManager.setScrollTop(scrollTop));
    this.ui.renderEvolution();
    this.dashboardManager.render();
  }

  toggleEvolutionDay(evolutionId, weekNumber, dayKey) {
    if (!window.BTPT_ACCESS.guardFeature("evolution")) return;
    const plan = this.evolutionManager.getById(evolutionId);
    if (!plan) return;
    const scrollTop = this.modalManager.getScrollTop();
    const progress = this.getEvolutionProgressState(plan);
    progress.startedAt = progress.startedAt || new Date().toISOString();
    progress.currentWeek = Number(weekNumber);
    progress.currentDay = dayKey;
    this.saveEvolutionProgress(plan, progress);
    this.modalManager.showEvolution(plan);
    window.requestAnimationFrame(() => this.modalManager.setScrollTop(scrollTop));
    this.ui.renderEvolution();
    this.dashboardManager.render();
  }

  finishEvolutionPlan(id) {
    if (!window.BTPT_ACCESS.guardFeature("evolution")) return;
    const plan = this.evolutionManager.getById(id);
    if (!plan) return;
    const progress = this.getEvolutionProgressState(plan);
    progress.startedAt = progress.startedAt || new Date().toISOString();
    safeArray(plan.semanas).forEach((week) => {
      safeArray(week.treinos).forEach((training) => {
        const key = this.getEvolutionDayKey(week.semana, training.dia);
        progress.completedExercises[key] = safeArray(training.exercicios_sugeridos);
      });
    });
    progress.status = "concluido";
    progress.completedAt = new Date().toISOString();
    this.saveEvolutionProgress(plan, progress);
    this.modalManager.showEvolution(plan);
    this.ui.renderEvolution();
    this.dashboardManager.render();
    this.toast("Evolucao concluida.");
  }

  speakExercise(id) {
    if (!window.BTPT_ACCESS.guardExercise(id)) return;
    const exercise = this.exerciseManager.getById(id);
    if (exercise) this.audioManager.speak(getAudioScript(exercise), exercise.audio_url);
  }

  toast(message, options = {}) {
    const root = document.getElementById("toastRoot");
    const key = options.key || message;
    Array.from(root.children).forEach((item) => {
      if (item.dataset.toastKey === key) item.remove();
    });
    const item = document.createElement("div");
    item.className = `toast ${options.variant ? `is-${options.variant}` : ""}`.trim();
    item.dataset.toastKey = key;
    item.textContent = message;
    root.appendChild(item);
    window.setTimeout(() => item.remove(), 3200);
  }

  showFatalError(error) {
    document.querySelector(".main").innerHTML = `
      <section class="panel">
        <h1>Não foi possível iniciar o app</h1>
        <p>${escapeHTML(error && error.message ? error.message : "Erro inesperado.")}</p>
      </section>
    `;
  }
}

function bootAuthenticatedApp() {
  const userId = window.BTPT_AUTH?.session?.user?.id || "";
  if (!userId) return;
  if (window.appController) {
    if (window.appController.userId !== userId) window.location.reload();
    return;
  }
  window.appController = new AppController();
  window.appController.init();
}

window.addEventListener("btpt:auth-ready", bootAuthenticatedApp);
window.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("auth-ready")) bootAuthenticatedApp();
});
