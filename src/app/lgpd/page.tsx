import { Footer } from "../_components/footer";
import { Header } from "../_components/header";
import { Container, Section } from "../_components/ui";

export default function LGPDPage() {
	return (
		<div className="relative min-h-screen bg-black text-white">
			<div className="fixed inset-0 overflow-hidden bg-radial-gradient" />
			<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />

			<Header />

			<main className="relative z-10 pt-20 md:pt-32">
				<Section>
					<Container size="lg">
						<h1 className="mb-4 font-extrabold text-4xl md:text-6xl">
							Conformidade com a LGPD
						</h1>
						<p className="mb-8 text-gray-400">
							Lei Geral de Proteção de Dados - Lei nº 13.709/2018
						</p>

						<div className="space-y-6 text-gray-300 leading-relaxed">
							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Nosso Compromisso com a LGPD
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								O Quartier Flow foi desenvolvido desde o início com a
								conformidade à LGPD como prioridade máxima. Entendemos a
								importância da proteção de dados pessoais e nos comprometemos a
								tratar todas as informações com o mais alto nível de segurança e
								responsabilidade.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								O que é a LGPD?
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								A Lei Geral de Proteção de Dados (LGPD) é a legislação
								brasileira que regula o tratamento de dados pessoais por
								organizações públicas e privadas. Ela estabelece regras claras
								sobre coleta, armazenamento, tratamento e compartilhamento de
								informações pessoais.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								Princípios da LGPD que Seguimos
							</h3>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Finalidade:</strong>{" "}
									Tratamos dados apenas para propósitos legítimos e específicos
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Adequação:</strong> O
									tratamento é compatível com as finalidades informadas
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Necessidade:</strong>{" "}
									Coletamos apenas o mínimo necessário
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Livre Acesso:
									</strong>{" "}
									Você pode consultar seus dados a qualquer momento
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Qualidade dos Dados:
									</strong>{" "}
									Mantemos informações exatas e atualizadas
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Transparência:
									</strong>{" "}
									Informamos claramente como usamos seus dados
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Segurança:</strong>{" "}
									Protegemos seus dados com medidas técnicas robustas
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Prevenção:</strong>{" "}
									Adotamos medidas para prevenir danos
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Não Discriminação:
									</strong>{" "}
									Não usamos dados para fins discriminatórios
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">
										Responsabilização:
									</strong>{" "}
									Demonstramos conformidade e tomamos responsabilidade
								</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Bases Legais para Tratamento de Dados
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Tratamos seus dados pessoais com base nas seguintes hipóteses
								legais previstas na LGPD:
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								1. Consentimento
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Quando você fornece autorização expressa e inequívoca para
								tratamento de dados para finalidades específicas (exemplo:
								receber newsletters, participar de pesquisas).
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								2. Execução de Contrato
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Para fornecer os serviços contratados na plataforma, como gestão
								financeira, comunicação e reservas.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								3. Cumprimento de Obrigação Legal
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Quando exigido por lei ou por autoridades competentes (exemplo:
								obrigações fiscais, trabalhistas ou judiciais).
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								4. Legítimo Interesse
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Para finalidades legítimas como segurança da informação,
								prevenção a fraudes e melhoria de serviços, sempre respeitando
								seus direitos e liberdades fundamentais.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Dados Pessoais Tratados
							</h2>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								Dados Pessoais Comuns
							</h3>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									Identificação (nome, CPF, RG)
								</li>
								<li className="text-base md:text-lg">
									Contato (e-mail, telefone, endereço)
								</li>
								<li className="text-base md:text-lg">
									Dados profissionais (cargo, empresa)
								</li>
								<li className="text-base md:text-lg">
									Dados financeiros (informações de pagamento)
								</li>
								<li className="text-base md:text-lg">
									Dados de uso da plataforma
								</li>
							</ul>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								Dados Sensíveis
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Não coletamos dados pessoais sensíveis (origem racial ou étnica,
								convicção religiosa, opinião política, dados de saúde,
								biométricos, etc.) salvo quando estritamente necessário e com
								consentimento específico.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Seus Direitos como Titular de Dados
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								A LGPD garante os seguintes direitos:
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								1. Confirmação da Existência de Tratamento
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Saber se processamos seus dados pessoais.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								2. Acesso aos Dados
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Obter cópia dos seus dados pessoais que tratamos.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								3. Correção de Dados
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Solicitar correção de dados incompletos, inexatos ou
								desatualizados.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								4. Anonimização, Bloqueio ou Eliminação
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Solicitar anonimização, bloqueio ou eliminação de dados
								desnecessários, excessivos ou tratados em desconformidade com a
								lei.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								5. Portabilidade
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Receber seus dados em formato estruturado e interoperável para
								transferir a outro fornecedor.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								6. Eliminação de Dados Tratados com Consentimento
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Excluir dados pessoais que foram tratados com base em
								consentimento.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								7. Informação sobre Compartilhamento
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Saber com quais entidades públicas e privadas compartilhamos
								seus dados.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								8. Informação sobre Não Consentimento
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Ser informado sobre as consequências de não fornecer
								consentimento.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								9. Revogação do Consentimento
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Retirar consentimento a qualquer momento.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								10. Oposição ao Tratamento
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Opor-se a tratamento realizado com base em legítimo interesse.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								11. Revisão de Decisões Automatizadas
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Solicitar revisão de decisões tomadas unicamente com base em
								tratamento automatizado de dados.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Como Exercer Seus Direitos
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Para exercer qualquer um dos direitos acima:
							</p>
							<ol className="mb-8 ml-6 list-decimal space-y-2">
								<li className="text-base md:text-lg">
									Acesse sua conta e use as ferramentas de autogestão de dados
								</li>
								<li className="text-base md:text-lg">
									Entre em contato com nosso DPO através de{" "}
									<strong className="font-bold text-white">
										dpo@quartierflow.com
									</strong>
								</li>
								<li className="text-base md:text-lg">
									Envie solicitação formal para{" "}
									<strong className="font-bold text-white">
										privacidade@quartierflow.com
									</strong>
								</li>
							</ol>

							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Responderemos suas solicitações dentro do prazo legal de{" "}
								<strong className="font-bold text-white">15 dias</strong>,
								podendo ser prorrogado por mais 15 dias mediante justificativa.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Segurança e Proteção de Dados
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Implementamos medidas técnicas e organizacionais para proteger
								seus dados:
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								Medidas Técnicas
							</h3>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									Criptografia de dados (SSL/TLS, AES-256)
								</li>
								<li className="text-base md:text-lg">
									Firewalls e sistemas de detecção de intrusão
								</li>
								<li className="text-base md:text-lg">
									Autenticação multifator
								</li>
								<li className="text-base md:text-lg">
									Backups automáticos criptografados
								</li>
								<li className="text-base md:text-lg">
									Monitoramento contínuo de segurança
								</li>
								<li className="text-base md:text-lg">
									Testes de penetração regulares
								</li>
							</ul>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								Medidas Organizacionais
							</h3>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									Política de segurança da informação
								</li>
								<li className="text-base md:text-lg">
									Controles de acesso baseados em função (RBAC)
								</li>
								<li className="text-base md:text-lg">
									Treinamento regular da equipe
								</li>
								<li className="text-base md:text-lg">
									Acordo de confidencialidade com colaboradores
								</li>
								<li className="text-base md:text-lg">
									Processo de resposta a incidentes
								</li>
								<li className="text-base md:text-lg">
									Auditoria e revisões periódicas
								</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Incidentes de Segurança
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Em caso de incidente de segurança que possa acarretar risco ou
								dano relevante aos titulares de dados:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									Comunicaremos a ANPD em prazo razoável
								</li>
								<li className="text-base md:text-lg">
									Notificaremos você sobre o ocorrido
								</li>
								<li className="text-base md:text-lg">
									Informaremos as medidas tomadas para mitigar os efeitos
								</li>
								<li className="text-base md:text-lg">
									Tomaremos ações corretivas imediatas
								</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Transferência Internacional de Dados
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Seus dados são armazenados primariamente no Brasil. Quando
								necessário transferir dados para outros países, garantimos que:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									O país de destino oferece grau adequado de proteção
								</li>
								<li className="text-base md:text-lg">
									Ou utilizamos cláusulas contratuais padrão aprovadas
								</li>
								<li className="text-base md:text-lg">
									Ou obtemos seu consentimento específico
								</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Encarregado de Proteção de Dados (DPO)
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Nosso DPO (Data Protection Officer) é responsável por aceitar
								reclamações e comunicações dos titulares, prestar
								esclarecimentos e adotar providências.
							</p>

							<p className="mb-6 text-base leading-relaxed md:text-lg">
								<strong className="font-bold text-white">Nome:</strong> [Nome do
								DPO]
								<br />
								<strong className="font-bold text-white">E-mail:</strong>{" "}
								dpo@quartierflow.com
								<br />
								<strong className="font-bold text-white">Telefone:</strong> (11)
								9999-9999
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Autoridade Nacional de Proteção de Dados (ANPD)
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								A ANPD é a autoridade responsável por zelar, implementar e
								fiscalizar o cumprimento da LGPD no Brasil.
							</p>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Se você não estiver satisfeito com nossas práticas ou respostas,
								pode contatar a ANPD através de:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Site:</strong>{" "}
									https://www.gov.br/anpd
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">E-mail:</strong>{" "}
									anpd@anpd.gov.br
								</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Atualizações desta Página
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Esta página pode ser atualizada para refletir mudanças nas
								nossas práticas ou na legislação. Recomendamos que você a revise
								periodicamente.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								Contato
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Dúvidas sobre nossa conformidade com a LGPD ou sobre o
								tratamento de dados pessoais?
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">DPO:</strong>{" "}
									dpo@quartierflow.com
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Privacidade:</strong>{" "}
									privacidade@quartierflow.com
								</li>
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">Suporte:</strong>{" "}
									contato@quartierflow.com
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
