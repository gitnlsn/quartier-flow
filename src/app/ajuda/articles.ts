/**
 * Central de ajuda (/ajuda): how-to articles with step-by-step walkthroughs.
 * Each step can show a short GIF recorded in the app (public/ajuda/*.gif);
 * steps whose GIF isn't recorded yet are shown as text only.
 *
 * Keep the wording in line with the screens: button and field names are
 * quoted exactly as they appear in the app.
 */

export type HelpCategory =
	| "administradora"
	| "condominio"
	| "cobrancas"
	| "areas-comuns"
	| "moradores";

export type HelpStep = {
	title: string;
	text: string;
	/** File in public/ajuda (without the folder), e.g. "criar-conta-1.gif". */
	gif?: string;
	gifAlt?: string;
};

export type HelpArticle = {
	slug: string;
	category: HelpCategory;
	title: string;
	summary: string;
	audience: string;
	steps: HelpStep[];
	faqs: { q: string; a: string }[];
	related: string[];
};

export const HELP_CATEGORIES: {
	id: HelpCategory;
	title: string;
	description: string;
}[] = [
	{
		id: "administradora",
		title: "Para administradoras",
		description:
			"Cadastro, plano, conta de recebimento e as faturas do Quartier Flow.",
	},
	{
		id: "condominio",
		title: "Condomínios e moradores",
		description: "Condomínios, unidades, convites e importação por planilha.",
	},
	{
		id: "cobrancas",
		title: "Cobranças e despesas",
		description:
			"Itens de cobrança, envio mensal, acompanhamento e prestação de contas.",
	},
	{
		id: "areas-comuns",
		title: "Áreas comuns e reservas",
		description:
			"Salão de festas, churrasqueira e outras áreas: regras, reservas e aprovação.",
	},
	{
		id: "moradores",
		title: "Moradores e síndicos",
		description: "Primeiro acesso, pagamento de cobranças e visão do síndico.",
	},
];

export const HELP_ARTICLES: HelpArticle[] = [
	// ---------------------------------------------------------------- Administradora
	{
		slug: "criar-conta-e-assinar-plano",
		category: "administradora",
		title: "Criar a conta e assinar o plano",
		summary:
			"Do primeiro acesso à assinatura: seus dados, a administradora, o plano e os Termos de Uso, em 4 passos.",
		audience: "Administradora",
		steps: [
			{
				title: "Crie sua conta",
				text: "Acesse “Quero cadastrar minha administradora” e entre com Google ou com um link por email. Se for seu primeiro acesso, o link também cria a sua conta. Nada é contratado nesta etapa.",
				gif: "criar-conta-1.gif",
				gifAlt: "Tela Crie sua conta com o envio do link por email",
			},
			{
				title: "Informe seu nome e a administradora",
				text: "No cadastro guiado, informe seu nome e depois a razão social e o CNPJ da administradora. O CNPJ é formatado enquanto você digita e validado na hora.",
				gif: "criar-conta-2.gif",
				gifAlt: "Passos 1 e 2 do cadastro: nome, razão social e CNPJ",
			},
			{
				title: "Escolha o plano",
				text: "Você paga por assento: cada morador e cada síndico ativos nos seus condomínios. O exemplo abaixo dos planos mostra quanto custaria um condomínio típico.",
				gif: "criar-conta-3.gif",
				gifAlt: "Escolha do plano com o exemplo de valor mensal",
			},
			{
				title: "Revise, leia os Termos e assine",
				text: "O resumo mostra o plano, os preços, a data da primeira fatura e o vencimento. Leia os Termos de Uso e as regras de cobrança, marque as três confirmações e clique em “Assinar plano”. Você recebe um email com o resumo do que acontece a seguir.",
				gif: "criar-conta-4.gif",
				gifAlt: "Revisão, Termos de Uso, confirmações e assinatura do plano",
			},
		],
		faqs: [
			{
				q: "Existe período gratuito?",
				a: "Não. A cobrança começa no mês da assinatura, proporcional aos dias desde a assinatura até o fim do mês.",
			},
			{
				q: "Posso parar o cadastro e continuar depois?",
				a: "Sim. O cadastro é salvo a cada passo. Ao entrar de novo, você continua de onde parou em Início, “Concluir cadastro”.",
			},
			{
				q: "O CNPJ já está cadastrado. E agora?",
				a: "Outra pessoa já cadastrou a sua empresa. Peça a quem administra a conta da administradora para dar acesso a você.",
			},
		],
		related: ["dados-da-empresa", "conta-de-recebimento-asaas"],
	},
	{
		slug: "dados-da-empresa",
		category: "administradora",
		title: "Dados da empresa e endereço pelo CEP",
		summary:
			"Os dados exigidos para criar a conta de recebimento, com preenchimento automático do endereço.",
		audience: "Administradora",
		steps: [
			{
				title: "Abra Conta de recebimento",
				text: "No menu, em Administradora, clique em “Conta de recebimento”. O primeiro bloco são os dados da empresa.",
			},
			{
				title: "Preencha os dados e o CEP",
				text: "Escolha o tipo de empresa e informe celular e faturamento mensal (exigido pelo Asaas para a verificação cadastral). Ao digitar o CEP, rua e bairro são preenchidos automaticamente e o cursor vai para o número. Confira e clique em “Salvar dados da empresa”.",
				gif: "dados-da-empresa-1.gif",
				gifAlt:
					"Preenchimento dos dados da empresa com busca automática do CEP",
			},
		],
		faqs: [
			{
				q: "O CEP não foi encontrado. O que faço?",
				a: "Confira os números. Se o CEP for novo ou a busca estiver indisponível, preencha o endereço manualmente: os campos continuam editáveis.",
			},
			{
				q: "Posso alterar os dados depois?",
				a: "Até criar a conta de recebimento, sim. Depois disso, os dados são alterados no Asaas (“Alterar dados no Asaas”), onde passam pela análise cadastral; clique em “Atualizar situação” para trazê-los de volta.",
			},
		],
		related: ["conta-de-recebimento-asaas"],
	},
	{
		slug: "conta-de-recebimento-asaas",
		category: "administradora",
		title: "Conta de recebimento no Asaas e verificação",
		summary:
			"Os pagamentos dos moradores vão para uma conta Asaas da administradora. Veja como criá-la e aprová-la.",
		audience: "Administradora",
		steps: [
			{
				title: "Crie a conta de recebimento",
				text: "Com os dados da empresa salvos, clique em “Criar conta de recebimento”. A conta é criada no Asaas, nosso parceiro de pagamentos, em nome da administradora.",
				gif: "conta-asaas-1.gif",
				gifAlt:
					"Criação da conta de recebimento e lista de documentos pendentes",
			},
			{
				title: "Envie os documentos (KYC)",
				text: "A lista mostra cada documento e a situação. Quando houver um link, clique em “Enviar documento”. Documentos sem link são enviados entrando no Asaas com o email da conta de recebimento: use “Entrar no Asaas para enviar documentos”.",
			},
			{
				title: "Acompanhe a aprovação",
				text: "A análise leva até 48 horas após o envio. Clique em “Atualizar situação” para ver o status. Quando aparecer “Aprovada”, você já pode enviar cobranças aos moradores.",
			},
		],
		faqs: [
			{
				q: "Por que preciso de uma conta no Asaas?",
				a: "É por ela que os moradores pagam por boleto e Pix e que os valores chegam à administradora. O Quartier Flow não guarda o dinheiro dos moradores.",
			},
			{
				q: "Não recebi o email de ativação do Asaas.",
				a: "Confira a caixa de spam. No site do Asaas, use “Esqueci minha senha” com o email da conta de recebimento para criar a senha.",
			},
			{
				q: "Quais tarifas são cobradas?",
				a: "As tarifas do meio de pagamento são descontadas dos valores repassados, conforme os Termos de Uso, seção 8.4. O morador não paga tarifa extra.",
			},
		],
		related: ["dados-da-empresa", "enviar-cobrancas-do-mes"],
	},
	{
		slug: "faturas-do-quartier-flow",
		category: "administradora",
		title: "Faturas do Quartier Flow",
		summary:
			"Como a mensalidade é calculada, quando a fatura chega e como pagar.",
		audience: "Administradora",
		steps: [
			{
				title: "Como a fatura é calculada",
				text: "No dia 1º, você recebe a fatura do mês anterior: moradores e síndicos ativos no último dia do mês, aos preços do seu plano. A primeira fatura é proporcional aos dias desde a assinatura. Faturas abaixo de R$ 5,00 não são cobradas.",
			},
			{
				title: "Veja e pague",
				text: "No menu, em Minha área, abra “Faturas do Quartier Flow”. Clique em uma fatura para ver o detalhamento e em “Pagar” para abrir o boleto e o Pix. O vencimento é no dia 10.",
				gif: "faturas-1.gif",
				gifAlt: "Lista de faturas com o detalhamento e o botão Pagar",
			},
		],
		faqs: [
			{
				q: "Recebo a fatura por email?",
				a: "Sim, com o valor, o detalhamento e o link para pagar. Ela também fica disponível em “Faturas do Quartier Flow”.",
			},
			{
				q: "E se eu atrasar?",
				a: "As funções de gestão podem ser restritas até a regularização. Os moradores nunca perdem acesso às próprias cobranças.",
			},
			{
				q: "Troquei de plano no meio do mês. Qual preço vale?",
				a: "O novo preço vale a partir da fatura seguinte.",
			},
		],
		related: ["encerrar-ou-reabrir", "criar-conta-e-assinar-plano"],
	},
	{
		slug: "encerrar-ou-reabrir",
		category: "administradora",
		title: "Encerrar ou reabrir a administradora",
		summary:
			"O que acontece ao encerrar, o que continua disponível e como voltar.",
		audience: "Administradora",
		steps: [
			{
				title: "Leia o que acontece",
				text: "Em “Plano”, no fim da página, clique em “Encerrar administradora”. A tela explica tudo antes de confirmar: a última fatura (proporcional aos dias usados no mês), as cobranças dos moradores que continuam valendo e os condomínios, que ficam só para consulta.",
				gif: "encerrar-1.gif",
				gifAlt: "Tela de encerramento com as consequências explicadas",
			},
			{
				title: "Confirme com o nome da administradora",
				text: "Digite o nome da administradora e clique em “Encerrar administradora”. Você volta para a sua área de morador ou síndico, e “Faturas do Quartier Flow” continua no menu para pagar o que estiver em aberto.",
			},
			{
				title: "Reabra quando quiser",
				text: "Em Início, clique em “Reabrir administradora”: confira os dados, escolha um plano e aceite os Termos de Uso de novo.",
			},
		],
		faqs: [
			{
				q: "As cobranças já enviadas aos moradores são canceladas?",
				a: "Não. Elas continuam valendo, os moradores podem pagá-las e o valor segue para a conta Asaas da administradora.",
			},
			{
				q: "Perco o histórico?",
				a: "Não. Os condomínios ficam disponíveis só para consulta, para você, os síndicos e os moradores.",
			},
		],
		related: ["faturas-do-quartier-flow"],
	},

	// ---------------------------------------------------------------- Condomínio
	{
		slug: "criar-condominio",
		category: "condominio",
		title: "Criar um condomínio",
		summary: "Cadastre o condomínio e conheça a área de gestão dele.",
		audience: "Administradora",
		steps: [
			{
				title: "Cadastre o condomínio",
				text: "Em “Todos os condomínios”, clique em “Novo condomínio”, informe o nome (CNPJ e endereço são opcionais) e clique em “Criar condomínio”.",
				gif: "criar-condominio-1.gif",
				gifAlt: "Cadastro de um novo condomínio",
			},
			{
				title: "Navegue pelos módulos",
				text: "O menu lateral passa a mostrar o condomínio escolhido e seus módulos: Visão geral, Cobranças, Despesas, Unidades e moradores e Configurações. Para trocar de condomínio, use o seletor no topo do menu.",
				gif: "criar-condominio-2.gif",
				gifAlt: "Menu do condomínio com os módulos e o seletor",
			},
		],
		faqs: [
			{
				q: "A Visão geral mostra “Precisa de atenção”. O que é?",
				a: "São os próximos passos que faltam para cobrar, como ativar a cobrança mensal ou cadastrar o primeiro item comum. Cada aviso tem um botão que leva direto ao lugar certo.",
			},
		],
		related: ["adicionar-unidades", "convidar-moradores-e-sindicos"],
	},
	{
		slug: "adicionar-unidades",
		category: "condominio",
		title: "Adicionar unidades",
		summary: "Cadastre várias unidades de uma vez, com blocos e intervalos.",
		audience: "Administradora",
		steps: [
			{
				title: "Adicione as unidades",
				text: "Em “Unidades e moradores”, clique em “Adicionar unidades”. Informe o bloco (opcional) e os números separados por vírgula ou em intervalos, como “101-104, 201”. Unidades repetidas são ignoradas.",
				gif: "unidades-1.gif",
				gifAlt: "Cadastro de unidades com intervalo de números",
			},
		],
		faqs: [
			{
				q: "Meu condomínio tem torres.",
				a: "Repita o cadastro uma vez por torre, informando o nome no campo Bloco.",
			},
		],
		related: ["convidar-moradores-e-sindicos", "importar-planilha"],
	},
	{
		slug: "convidar-moradores-e-sindicos",
		category: "condominio",
		title: "Convidar moradores e síndicos",
		summary:
			"Cada pessoa recebe um convite por email. Saiba quem paga a unidade e por que o CPF é pedido.",
		audience: "Administradora",
		steps: [
			{
				title: "Preencha o convite",
				text: "Em “Unidades e moradores”, clique em “Convidar”. Escolha o papel (morador ou síndico), informe nome, email, unidade e tipo (proprietário, inquilino ou dependente).",
				gif: "convidar-1.gif",
				gifAlt: "Formulário de convite com nome, email, unidade e CPF",
			},
			{
				title: "Defina quem paga a unidade",
				text: "Marque “Responsável pelo pagamento da unidade” para quem recebe a cobrança mensal. Para essa pessoa, o CPF é obrigatório, porque é exigido para emitir boletos. Clique em “Convidar”: o convite segue por email.",
			},
		],
		faqs: [
			{
				q: "Uma unidade sem responsável recebe cobrança?",
				a: "Não. Ela aparece como “Sem pagador” e fica de fora do envio até alguém ser marcado como responsável.",
			},
			{
				q: "A pessoa já tem conta no Quartier Flow.",
				a: "Sem problema: o convite liga a conta existente ao condomínio, e ela vê o condomínio no próximo acesso.",
			},
		],
		related: ["importar-planilha", "primeiro-acesso"],
	},
	{
		slug: "importar-planilha",
		category: "condominio",
		title: "Importar moradores por planilha",
		summary: "Traga todos os moradores de uma vez a partir de um CSV ou XLSX.",
		audience: "Administradora",
		steps: [
			{
				title: "Escolha o arquivo e as colunas",
				text: "Em “Unidades e moradores”, clique em “Importar planilha” e escolha um arquivo CSV ou XLSX. Indique qual coluna é nome, email, unidade, bloco, CPF, responsável pelo pagamento, tipo e papel.",
			},
			{
				title: "Confira a prévia e importe",
				text: "A prévia mostra cada linha como Novo, Já tem conta, Ignorado ou Erro, com o motivo. Corrija o que for preciso e confirme: os convites são enviados por email.",
			},
		],
		faqs: [
			{
				q: "Preciso de um modelo de planilha?",
				a: "Não. Use a sua planilha como está; basta indicar as colunas na importação.",
			},
		],
		related: ["convidar-moradores-e-sindicos"],
	},

	// ---------------------------------------------------------------- Cobranças
	{
		slug: "itens-de-cobranca",
		category: "cobrancas",
		title: "Itens de cobrança",
		summary:
			"Itens comuns (de todas as unidades) e individuais (de uma unidade), mensais, parcelados ou únicos.",
		audience: "Administradora",
		steps: [
			{
				title: "Crie os itens comuns",
				text: "Em Cobranças, no quadro “1. Itens comuns”, crie itens como taxa condominial e fundo de reserva: nome, valor, frequência (todo mês, parcelado ou uma vez) e o mês de início.",
				gif: "itens-1.gif",
				gifAlt: "Criação de um item comum de cobrança",
			},
			{
				title: "Adicione itens individuais",
				text: "No quadro “2. Itens individuais”, lance o que só uma unidade paga, como consumo de gás, vaga extra ou multa. Também dá para importar uma planilha com uma linha por unidade e item.",
			},
		],
		faqs: [
			{
				q: "Uma unidade paga um valor diferente da taxa comum.",
				a: "Abra a unidade em “Unidades e moradores” e defina o valor desta unidade para o item. Vazio volta a usar o valor padrão.",
			},
			{
				q: "Arquivar um item muda cobranças já enviadas?",
				a: "Não. O item só deixa de entrar nas próximas cobranças.",
			},
		],
		related: ["enviar-cobrancas-do-mes"],
	},
	{
		slug: "enviar-cobrancas-do-mes",
		category: "cobrancas",
		title: "Preparar e enviar as cobranças do mês",
		summary:
			"Uma cobrança por unidade com a soma dos itens do mês, conferida antes do envio.",
		audience: "Administradora",
		steps: [
			{
				title: "Configure a cobrança mensal",
				text: "Em Configurações, defina o dia de preparação e o dia do vencimento (de 1 a 28), a multa (até 2%) e os juros ao mês. A prévia mostra as datas e o efeito do atraso.",
				gif: "enviar-1.gif",
				gifAlt: "Configuração das datas, multa e juros da cobrança mensal",
			},
			{
				title: "Prepare e confira",
				text: "Em Cobranças, clique em “Preparar cobranças” do mês. Preparar não envia nada: a auditoria mostra cada unidade, o valor e o responsável, e aponta pendências (como unidade sem pagador ou sem CPF).",
				gif: "enviar-2.gif",
				gifAlt: "Preparação e auditoria das cobranças antes do envio",
			},
			{
				title: "Envie",
				text: "Corrigiu algo? Clique em “Recalcular”. Com tudo certo, clique em “Enviar cobranças”: cada morador responsável recebe o boleto com Pix por email. Se preferir, ative o envio automático em Configurações.",
			},
		],
		faqs: [
			{
				q: "Preciso da conta de recebimento aprovada?",
				a: "Sim. Sem a aprovação do Asaas, as cobranças não podem ser enviadas.",
			},
			{
				q: "Algumas cobranças falharam.",
				a: "Veja o motivo na tabela, corrija o cadastro e clique em “Reenviar cobranças com falha”.",
			},
		],
		related: ["itens-de-cobranca", "acompanhar-pagamentos"],
	},
	{
		slug: "acompanhar-pagamentos",
		category: "cobrancas",
		title: "Acompanhar pagamentos e atrasos",
		summary:
			"Recebido, a receber e vencido por mês, histórico completo e cobranças em atraso.",
		audience: "Administradora e síndico",
		steps: [
			{
				title: "Veja o resumo do mês",
				text: "A Visão geral do condomínio mostra o recebido, o que falta receber e o vencido. Em Cobranças, o acompanhamento lista as cobranças que vencem no mês escolhido, com a situação de cada uma.",
				gif: "acompanhar-1.gif",
				gifAlt: "Resumo do mês e acompanhamento das cobranças",
			},
			{
				title: "Consulte o histórico",
				text: "O histórico traz todas as cobranças desde o início, com filtros por mês, unidade e situação. As cobranças vencidas de qualquer mês ficam reunidas em “Cobranças vencidas”.",
			},
		],
		faqs: [
			{
				q: "A situação de um pagamento é atualizada sozinha?",
				a: "Sim. O Asaas avisa o Quartier Flow quando um boleto ou Pix é pago, vence ou é estornado.",
			},
		],
		related: ["enviar-cobrancas-do-mes", "despesas-e-notas"],
	},
	{
		slug: "inadimplencia-e-acordos",
		category: "cobrancas",
		title: "Inadimplência, acordos e perdão de dívidas",
		summary:
			"Veja quem está em atraso, negocie um acordo em parcelas, perdoe cobranças e configure os lembretes de pagamento.",
		audience: "Administradora e síndico",
		steps: [
			{
				title: "Veja quem está em atraso",
				text: "Em Inadimplência, o topo mostra o total vencido, quantas unidades estão inadimplentes e os acordos em andamento. Clique em uma unidade para ver cada cobrança vencida e há quantos dias. Só a administradora e o síndico veem esta lista; nunca a divulgue aos moradores. Para cobrança judicial, use “Exportar CSV”.",
				gif: "inadimplencia-1.gif",
				gifAlt:
					"Lista de unidades com cobranças vencidas e o detalhe de uma unidade",
			},
			{
				title: "Proponha um acordo",
				text: "Clique em “Propor acordo”, escolha as cobranças renegociadas e informe o valor negociado (pode incluir multa e juros, ou um desconto) e o número de parcelas. As parcelas entram nas próximas cobranças mensais da unidade, como “Acordo (1/4)”. Se combinar uma entrada, ela vira um boleto à parte, emitido na hora. As cobranças antigas são canceladas no Asaas e aparecem como “Renegociada”.",
				gif: "inadimplencia-2.gif",
				gifAlt: "Criação de um acordo em 4 parcelas para uma unidade em atraso",
			},
			{
				title: "Perdoe cobranças quando fizer sentido",
				text: "Abra a unidade e clique em “Perdoar cobranças”, por exemplo quando o antigo morador quitou a dívida na venda do imóvel ou por decisão da assembleia. O motivo é obrigatório e fica registrado na cobrança e no histórico. As cobranças são canceladas no Asaas e não dá para desfazer.",
				gif: "inadimplencia-3.gif",
				gifAlt: "Perdão de uma cobrança com o motivo registrado",
			},
			{
				title: "Configure os lembretes de pagamento",
				text: "Em Configurações, “Lembretes de pagamento” define quando o Asaas avisa cada responsável: no dia do vencimento e alguns dias antes, quando a cobrança vence e alguns dias depois, por e-mail, SMS ou WhatsApp. Cada mensagem tem uma tarifa do Asaas, paga pela administradora.",
				gif: "inadimplencia-4.gif",
				gifAlt: "Escolha dos lembretes antes e depois do vencimento",
			},
			{
				title: "O que o morador vê",
				text: "Em Minhas cobranças, o morador vê o acordo com o progresso das parcelas e quanto falta, além do link para pagar a entrada. As cobranças renegociadas aparecem como “Renegociada”, sem botão de pagamento.",
				gif: "inadimplencia-5.gif",
				gifAlt: "Visão do morador com o acordo e as cobranças renegociadas",
			},
		],
		faqs: [
			{
				q: "E se o morador não pagar uma parcela do acordo?",
				a: "A cobrança mensal fica vencida, a unidade volta a aparecer como inadimplente e o acordo fica “Em atraso”. Você decide: aguardar o pagamento ou clicar em “Encerrar”. Ao encerrar, as parcelas que ainda não foram cobradas viram um “Saldo do acordo encerrado”, que pode entrar em um novo acordo ou ser perdoado.",
			},
			{
				q: "A unidade não tem responsável financeiro. Posso fazer um acordo?",
				a: "Não: o acordo precisa de um responsável para receber as parcelas. Cadastre o responsável em Unidades e moradores ou, se for o caso, perdoe as cobranças.",
			},
			{
				q: "Quem calcula a multa e os juros?",
				a: "O Asaas, no momento do pagamento, conforme a multa e os juros configurados. No acordo mostramos uma estimativa para ajudar na negociação.",
			},
			{
				q: "Unidades inadimplentes podem reservar áreas comuns?",
				a: "Depende da área: se “Bloquear unidades inadimplentes” estiver marcado, unidades com cobrança vencida não conseguem reservar.",
			},
		],
		related: ["acompanhar-pagamentos", "enviar-cobrancas-do-mes"],
	},
	{
		slug: "despesas-e-notas",
		category: "cobrancas",
		title: "Despesas e notas fiscais",
		summary:
			"Registre as despesas do condomínio com a foto da nota para a prestação de contas.",
		audience: "Administradora",
		steps: [
			{
				title: "Registre a despesa",
				text: "Em Despesas, clique em “Lançar despesa”. Informe descrição, categoria, fornecedor, valor e data do pagamento, e anexe a nota fiscal ou o recibo (foto ou PDF, até 4 MB). No celular, dá para tirar a foto na hora.",
				gif: "despesas-1.gif",
				gifAlt: "Cadastro de uma despesa com anexo da nota fiscal",
			},
			{
				title: "Consulte por mês",
				text: "Escolha o mês para ver as despesas e o total. Clique no anexo para abrir a nota.",
			},
		],
		faqs: [
			{
				q: "Quem vê as despesas?",
				a: "A administradora e os síndicos do condomínio. Os moradores veem as despesas no balancete, depois que ele é publicado.",
			},
			{
				q: "Por que não consigo lançar ou excluir uma despesa de um mês?",
				a: "O balancete desse mês já foi publicado, então as despesas dele ficam bloqueadas para não mudar o que os moradores viram. Despublique o balancete, corrija e publique de novo.",
			},
		],
		related: ["balancetes-e-prestacao-de-contas", "acompanhar-pagamentos"],
	},
	{
		slug: "balancetes-e-prestacao-de-contas",
		category: "cobrancas",
		title: "Balancetes e prestação de contas",
		summary:
			"Acompanhe receitas, despesas e saldo do condomínio, publique o balancete do mês e deixe os moradores consultarem.",
		audience: "Administradora, síndico e morador",
		steps: [
			{
				title: "Informe o saldo inicial",
				text: "Em Balancetes, clique em “Informar saldo inicial” e digite quanto o condomínio tinha em caixa no primeiro dia de um mês, antes de usar o Quartier Flow. Os pagamentos e as despesas a partir desse mês entram no saldo. Só dá para alterar enquanto nenhum balancete estiver publicado.",
				gif: "balancetes-1.gif",
				gifAlt: "Saldo inicial informado e a lista de meses com o saldo final",
			},
			{
				title: "Acompanhe as finanças",
				text: "Na Visão geral do condomínio, o quadro “Finanças” mostra o saldo em caixa, a receita e as despesas do mês, a inadimplência de hoje e um gráfico de receitas e despesas dos últimos 12 meses. A receita é o que os moradores pagaram no mês, menos as tarifas do Asaas.",
				gif: "balancetes-2.gif",
				gifAlt: "Quadro Finanças com o gráfico de receitas e despesas",
			},
			{
				title: "Revise e publique o balancete",
				text: "Abra um mês que já terminou. Enquanto é “Rascunho”, os valores são calculados na hora e os moradores não veem. Confira receitas, tarifas, despesas por categoria e o saldo final, clique em “Publicar” e, se quiser, deixe uma observação para os moradores. Ao publicar, os valores ficam congelados e as despesas do mês ficam bloqueadas.",
				gif: "balancetes-3.gif",
				gifAlt:
					"Revisão do balancete de outubro e publicação com uma observação",
			},
			{
				title: "O que o morador vê",
				text: "Em Balancetes, na Minha área, o morador vê só os balancetes publicados do condomínio da unidade, com a observação da administração, e pode baixar o PDF ou exportar em CSV.",
				gif: "balancetes-4.gif",
				gifAlt: "Morador abrindo o balancete publicado de outubro",
			},
		],
		faqs: [
			{
				q: "Como corrijo um balancete publicado?",
				a: "Abra o balancete e clique em “Despublicar”. Ele some para os moradores e as despesas do mês voltam a poder ser alteradas. Corrija e publique de novo. Tudo fica registrado no histórico.",
			},
			{
				q: "Quando um pagamento entra como receita?",
				a: "No mês em que o morador pagou, assim que o Asaas confirma o pagamento. Cobranças estornadas, canceladas ou perdoadas não entram.",
			},
			{
				q: "O síndico pode publicar?",
				a: "Não. O síndico vê o quadro de finanças e todos os balancetes, inclusive os rascunhos, mas quem publica é a administradora.",
			},
			{
				q: "Posso publicar o mês atual?",
				a: "Não. O balancete só pode ser publicado depois que o mês termina, para não faltar nenhum pagamento ou despesa.",
			},
		],
		related: ["despesas-e-notas", "acompanhar-pagamentos"],
	},

	// ---------------------------------------------------------------- Áreas comuns
	{
		slug: "reservas-de-areas-comuns",
		category: "areas-comuns",
		title: "Reservas de áreas comuns",
		summary:
			"Cadastre as áreas com suas regras, deixe os moradores reservarem pelo app e aprove os pedidos.",
		audience: "Administradora, síndico e morador",
		steps: [
			{
				title: "Cadastre as áreas e ative as reservas",
				text: "Em Reservas, aba “Áreas e regras”, clique em “Nova área”: nome, capacidade, regras de uso, taxa (entra na próxima cobrança mensal da unidade), reserva por dia inteiro ou por hora, antecedência, dias de funcionamento e se precisa de aprovação. Marque “Bloquear unidades inadimplentes” se a convenção permitir. Depois, clique em “Ativar reservas”.",
				gif: "reservas-1.gif",
				gifAlt: "Cadastro do salão de festas e ativação das reservas",
			},
			{
				title: "O morador reserva pelo app",
				text: "Em “Reservar área comum”, o morador escolhe a área, o dia livre no calendário, a lista de convidados (opcional) e clica em “Pedir reserva”. Se a área exige aprovação, a reserva fica “Aguardando aprovação”.",
				gif: "reservas-2.gif",
				gifAlt: "Morador escolhendo o dia e pedindo a reserva do salão",
			},
			{
				title: "Aprove ou recuse",
				text: "Os pedidos aparecem em Reservas, em “Aguardando aprovação”. Clique em “Aprovar” ou “Recusar”. A reserva confirmada aparece em “Próximas reservas”, com a taxa e o mês da cobrança em que ela entra. Para fechar uma área em datas específicas, use “Bloquear datas”.",
				gif: "reservas-3.gif",
				gifAlt: "Aprovação de uma reserva pendente",
			},
		],
		faqs: [
			{
				q: "Como a taxa da reserva é cobrada?",
				a: "Ela entra como item na próxima cobrança mensal da unidade que ainda não foi enviada. Se a reserva for cancelada antes do envio, a taxa sai da cobrança.",
			},
			{
				q: "O morador pode cancelar?",
				a: "Sim, até o prazo definido na área (por exemplo, 2 dias antes). Depois disso, só a administração cancela.",
			},
			{
				q: "Quem pode aprovar reservas?",
				a: "A administradora e o síndico do condomínio.",
			},
		],
		related: ["inadimplencia-e-acordos", "itens-de-cobranca"],
	},
	// ---------------------------------------------------------------- Moradores e síndicos
	{
		slug: "primeiro-acesso",
		category: "moradores",
		title: "Primeiro acesso de moradores e síndicos",
		summary: "Como entrar depois de receber o convite da administradora.",
		audience: "Morador e síndico",
		steps: [
			{
				title: "Entre com o email do convite",
				text: "Acesse “Entrar” e use Google ou receba um link por email, sempre com o mesmo email em que recebeu o convite. Não há senha para lembrar.",
				gif: "primeiro-acesso-1.gif",
				gifAlt: "Tela de entrada com link por email",
			},
			{
				title: "Veja a sua área",
				text: "Em Início aparecem as cobranças em aberto. O síndico também vê os condomínios em que atua.",
			},
		],
		faqs: [
			{
				q: "Entrei e não vejo meu condomínio.",
				a: "Confira se entrou com o mesmo email do convite. Se a administradora ainda não convidou você, peça o convite para esse email.",
			},
		],
		related: ["pagar-cobrancas", "o-que-o-sindico-ve"],
	},
	{
		slug: "pagar-cobrancas",
		category: "moradores",
		title: "Pagar cobranças por boleto ou Pix",
		summary:
			"Encontre a cobrança, veja o detalhamento e pague sem tarifa extra.",
		audience: "Morador",
		steps: [
			{
				title: "Abra Minhas cobranças",
				text: "Em “Minhas cobranças” ficam as cobranças das unidades em que você é o responsável pelo pagamento, com o detalhamento de cada item.",
				gif: "pagar-1.gif",
				gifAlt: "Lista de cobranças do morador com o detalhamento",
			},
			{
				title: "Pague",
				text: "Clique em “Pagar com Pix ou boleto” para abrir a página de pagamento, com o boleto e o código Pix. A situação muda para paga assim que o pagamento é confirmado.",
			},
		],
		faqs: [
			{
				q: "Paguei e a cobrança ainda aparece em aberto.",
				a: "O Pix costuma ser confirmado em minutos; o boleto, em até 3 dias úteis.",
			},
			{
				q: "Há multa por atraso?",
				a: "Sim, conforme a configuração do condomínio: multa de até 2% e juros proporcionais aos dias de atraso.",
			},
		],
		related: ["primeiro-acesso"],
	},
	{
		slug: "o-que-o-sindico-ve",
		category: "moradores",
		title: "O que o síndico vê",
		summary: "Acompanhamento do condomínio sem precisar pedir relatórios.",
		audience: "Síndico",
		steps: [
			{
				title: "Acompanhe o condomínio",
				text: "O síndico vê a Visão geral, as cobranças, as despesas com as notas e as unidades e moradores, sempre só para consulta. As alterações são feitas pela administradora.",
				gif: "sindico-1.gif",
				gifAlt: "Visão do síndico com o condomínio só para consulta",
			},
		],
		faqs: [
			{
				q: "O síndico pode enviar cobranças?",
				a: "Não. Envio de cobranças, convites e cadastros ficam com a administradora.",
			},
		],
		related: ["acompanhar-pagamentos", "despesas-e-notas"],
	},
];

export const getHelpArticle = (slug: string) =>
	HELP_ARTICLES.find((article) => article.slug === slug);
