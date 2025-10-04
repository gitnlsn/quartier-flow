import { Footer } from "../_components/footer";
import { Header } from "../_components/header";
import { Container, Section } from "../_components/ui";

export default function PrivacidadePage() {
	return (
		<div className="relative min-h-screen bg-black text-white">
			<div className="fixed inset-0 overflow-hidden bg-radial-gradient" />
			<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />

			<Header />

			<main className="relative z-10 pt-20 md:pt-32">
				<Section>
					<Container size="lg">
						<h1 className="mb-4 font-extrabold text-4xl md:text-6xl">
							Política de Privacidade
						</h1>
						<p className="mb-8 text-gray-400">
							Última atualização: {new Date().toLocaleDateString("pt-BR")}
						</p>

						<div className="space-y-6 text-gray-300 leading-relaxed">
							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								1. Introdução
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								O Quartier Flow está comprometido com a proteção da sua
								privacidade. Esta Política de Privacidade descreve como
								coletamos, usamos, armazenamos e protegemos suas informações
								pessoais.
							</p>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Esta política está em conformidade com a Lei Geral de Proteção
								de Dados (LGPD - Lei nº 13.709/2018) e outras legislações
								aplicáveis.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								2. Informações que Coletamos
							</h2>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								2.1. Informações Fornecidas Diretamente
							</h3>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Dados de Cadastro:
									</strong>{" "}
									Nome, CPF, e-mail, telefone, endereço
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Dados do Condomínio:
									</strong>{" "}
									Nome do condomínio, CNPJ, endereço, número de unidades
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Dados Financeiros:
									</strong>{" "}
									Informações de pagamento, dados bancários para geração de
									boletos
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Comunicações:
									</strong>{" "}
									Mensagens, solicitações e interações com nosso suporte
								</li>
							</ul>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								2.2. Informações Coletadas Automaticamente
							</h3>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Dados de Uso:
									</strong>{" "}
									Páginas visitadas, recursos utilizados, tempo de sessão
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Dados de Dispositivo:
									</strong>{" "}
									Tipo de dispositivo, sistema operacional, navegador
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Dados de Localização:
									</strong>{" "}
									Endereço IP, localização aproximada
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Cookies:</strong>{" "}
									Pequenos arquivos armazenados para melhorar sua experiência
								</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								3. Como Usamos suas Informações
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Utilizamos seus dados para:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Fornecer e Melhorar Serviços:
									</strong>{" "}
									Processar transações, gerenciar sua conta, personalizar sua
									experiência
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Comunicação:</strong>{" "}
									Enviar notificações importantes, atualizações de serviço,
									newsletters (com seu consentimento)
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Segurança:</strong>{" "}
									Proteger contra fraudes, detectar e prevenir atividades
									maliciosas
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Conformidade Legal:
									</strong>{" "}
									Cumprir obrigações legais e regulatórias
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Análise e Pesquisa:
									</strong>{" "}
									Compreender como nossos serviços são usados e melhorar
									funcionalidades
								</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								4. Compartilhamento de Dados
							</h2>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								4.1. Não Vendemos seus Dados
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Nunca vendemos, alugamos ou comercializamos suas informações
								pessoais para terceiros.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								4.2. Compartilhamento Autorizado
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Podemos compartilhar seus dados apenas nas seguintes situações:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Prestadores de Serviço:
									</strong>{" "}
									Empresas que nos ajudam a operar a plataforma (hospedagem,
									processamento de pagamentos, e-mail)
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Requisitos Legais:
									</strong>{" "}
									Quando exigido por lei, ordem judicial ou autoridades
									governamentais
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Proteção de Direitos:
									</strong>{" "}
									Para proteger nossos direitos, propriedade ou segurança
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Transações Empresariais:
									</strong>{" "}
									Em caso de fusão, aquisição ou venda de ativos
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Com Seu Consentimento:
									</strong>{" "}
									Quando você autoriza expressamente
								</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								5. Armazenamento e Segurança
							</h2>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								5.1. Onde Armazenamos
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Seus dados são armazenados em servidores seguros localizados no
								Brasil e/ou em datacenters internacionais com certificações de
								segurança reconhecidas.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								5.2. Medidas de Segurança
							</h3>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									Criptografia de dados em trânsito e em repouso
								</li>
								<li className="text-base md:text-lg">
									Controles de acesso rigorosos e autenticação multifator
								</li>
								<li className="text-base md:text-lg">
									Monitoramento contínuo de segurança
								</li>
								<li className="text-base md:text-lg">
									Backups automáticos diários
								</li>
								<li className="text-base md:text-lg">
									Testes de segurança regulares
								</li>
								<li className="text-base md:text-lg">
									Treinamento de equipe em boas práticas de segurança
								</li>
							</ul>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								5.3. Retenção de Dados
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Mantemos seus dados pessoais apenas pelo tempo necessário para
								cumprir as finalidades descritas nesta política ou conforme
								exigido por lei. Após esse período, os dados são anonimizados ou
								excluídos de forma segura.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								6. Seus Direitos (LGPD)
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								De acordo com a LGPD, você tem os seguintes direitos sobre seus
								dados pessoais:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Confirmação e Acesso:
									</strong>{" "}
									Saber se processamos seus dados e acessá-los
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Correção:</strong>{" "}
									Corrigir dados incompletos ou desatualizados
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Anonimização, Bloqueio ou Eliminação:
									</strong>{" "}
									Solicitar a anonimização, bloqueio ou exclusão de dados
									desnecessários
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Portabilidade:
									</strong>{" "}
									Receber seus dados em formato estruturado e legível
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Revogação de Consentimento:
									</strong>{" "}
									Retirar consentimento a qualquer momento
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Oposição:</strong>{" "}
									Opor-se a tratamento baseado em legítimo interesse
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Revisão de Decisões Automatizadas:
									</strong>{" "}
									Solicitar revisão de decisões tomadas unicamente com base em
									processamento automatizado
								</li>
							</ul>

							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Para exercer seus direitos, entre em contato através de{" "}
								<strong className="font-bold text-white">
									privacidade@quartierflow.com
								</strong>
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								7. Cookies e Tecnologias Similares
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Utilizamos cookies e tecnologias similares para melhorar sua
								experiência:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Cookies Essenciais:
									</strong>{" "}
									Necessários para o funcionamento da plataforma
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Cookies de Desempenho:
									</strong>{" "}
									Ajudam a entender como você usa o site
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Cookies de Funcionalidade:
									</strong>{" "}
									Lembram suas preferências
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Cookies de Marketing:
									</strong>{" "}
									Personalizam anúncios (apenas com seu consentimento)
								</li>
							</ul>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Você pode gerenciar suas preferências de cookies nas
								configurações do seu navegador.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								8. Proteção de Menores
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Nossa plataforma não é direcionada a menores de 18 anos. Não
								coletamos intencionalmente informações de crianças. Se tomarmos
								conhecimento de coleta inadvertida, excluiremos os dados
								imediatamente.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								9. Links para Sites de Terceiros
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Nossa plataforma pode conter links para sites de terceiros. Não
								somos responsáveis pelas práticas de privacidade desses sites.
								Recomendamos que você leia as políticas de privacidade de cada
								site que visita.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								10. Alterações nesta Política
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Podemos atualizar esta Política de Privacidade periodicamente.
								Notificaremos sobre mudanças significativas através da
								plataforma ou por e-mail. A data da última atualização está
								sempre visível no topo desta página.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								11. Encarregado de Proteção de Dados (DPO)
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Nosso Encarregado de Proteção de Dados (Data Protection Officer)
								está disponível para esclarecer dúvidas sobre esta política e
								sobre o tratamento de dados pessoais.
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">E-mail:</strong>{" "}
									dpo@quartierflow.com
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Telefone:</strong>{" "}
									(11) 9999-9999
								</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								12. Contato
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Para questões sobre esta Política de Privacidade ou sobre o
								tratamento de seus dados pessoais:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">E-mail:</strong>{" "}
									privacidade@quartierflow.com
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Endereço:</strong>{" "}
									[Endereço da empresa]
								</li>
							</ul>
						</div>
					</Container>
				</Section>
			</main>

			<Footer />
		</div>
	);
}
