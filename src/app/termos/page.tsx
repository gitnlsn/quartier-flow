import { Footer } from "../_components/footer";
import { Header } from "../_components/header";
import { Container, Section } from "../_components/ui";

export default function TermosPage() {
	return (
		<div className="relative min-h-screen bg-black text-white">
			<div className="fixed inset-0 overflow-hidden bg-radial-gradient" />
			<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />

			<Header />

			<main className="relative z-10 pt-20 md:pt-32">
				<Section>
					<Container size="lg">
						<h1 className="mb-4 font-extrabold text-4xl md:text-6xl">
							Termos de Uso
						</h1>
						<p className="mb-8 text-gray-400">
							Última atualização: {new Date().toLocaleDateString("pt-BR")}
						</p>

						<div className="space-y-6 text-gray-300 leading-relaxed">
							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								1. Aceitação dos Termos
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Ao acessar e usar o Quartier Flow ("Plataforma"), você concorda
								com estes Termos de Uso. Se você não concorda com qualquer parte
								destes termos, não deve usar nossa plataforma.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								2. Descrição do Serviço
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								O Quartier Flow é uma plataforma de gestão condominial que
								oferece ferramentas para síndicos, moradores e administradoras
								gerenciarem condomínios de forma eficiente, transparente e
								digital.
							</p>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Nossos serviços incluem, mas não se limitam a:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									Gestão financeira e emissão de boletos
								</li>
								<li className="text-base md:text-lg">Comunicação centralizada</li>
								<li className="text-base md:text-lg">
									Sistema de reservas de áreas comuns
								</li>
								<li className="text-base md:text-lg">Controle de manutenção</li>
								<li className="text-base md:text-lg">Portal do morador</li>
								<li className="text-base md:text-lg">Assembleias digitais</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								3. Elegibilidade
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Para usar a Plataforma, você deve ter pelo menos 18 anos de
								idade e capacidade legal para celebrar contratos. Ao se
								registrar, você garante que todas as informações fornecidas são
								verdadeiras e precisas.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								4. Cadastro e Conta de Usuário
							</h2>
							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								4.1. Criação de Conta
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Para acessar determinadas funcionalidades, você precisará criar
								uma conta fornecendo informações válidas como nome, e-mail e
								outras informações necessárias.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								4.2. Segurança da Conta
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Você é responsável por manter a confidencialidade de suas
								credenciais de acesso e por todas as atividades que ocorram sob
								sua conta. Notifique-nos imediatamente sobre qualquer uso não
								autorizado.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								5. Uso Aceitável
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Você concorda em NÃO:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									Usar a Plataforma para atividades ilegais ou não autorizadas
								</li>
								<li className="text-base md:text-lg">
									Tentar acessar áreas restritas do sistema ou contas de outros
									usuários
								</li>
								<li className="text-base md:text-lg">
									Interferir ou interromper a segurança ou funcionamento da
									Plataforma
								</li>
								<li className="text-base md:text-lg">
									Fazer engenharia reversa, descompilar ou desmontar qualquer
									parte da Plataforma
								</li>
								<li className="text-base md:text-lg">
									Transmitir vírus, malware ou qualquer código malicioso
								</li>
								<li className="text-base md:text-lg">
									Violar direitos de propriedade intelectual
								</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								6. Propriedade Intelectual
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Todo o conteúdo da Plataforma, incluindo textos, gráficos,
								logos, ícones, imagens, áudio, vídeo, software e compilações de
								dados, é propriedade do Quartier Flow ou de seus licenciadores e
								está protegido por leis de direitos autorais.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								7. Dados e Privacidade
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								O uso de seus dados pessoais é regido por nossa{" "}
								<a
									href="/privacidade"
									className="underline decoration-gray-600 hover:decoration-white"
								>
									Política de Privacidade
								</a>
								. Ao usar a
								Plataforma, você concorda com a coleta, uso e compartilhamento
								de informações conforme descrito na política.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								8. Pagamentos e Cobrança
							</h2>
							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								8.1. Taxas de Serviço
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								O uso da Plataforma pode estar sujeito a taxas de assinatura ou
								outros encargos conforme descritos em nossos planos de preços.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								8.2. Faturamento
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								As cobranças são processadas automaticamente no método de
								pagamento fornecido. Você é responsável por manter informações
								de pagamento válidas e atualizadas.
							</p>

							<h3 className="mt-10 mb-5 font-bold text-2xl tracking-tight md:text-3xl">
								8.3. Cancelamento
							</h3>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Você pode cancelar sua assinatura a qualquer momento. O
								cancelamento entrará em vigor ao final do período de faturamento
								atual.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								9. Limitação de Responsabilidade
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								A Plataforma é fornecida "como está" e "conforme disponível".
								Não garantimos que o serviço será ininterrupto, seguro ou livre
								de erros.
							</p>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Em nenhuma circunstância o Quartier Flow será responsável por
								danos indiretos, incidentais, especiais, consequenciais ou
								punitivos, incluindo perda de lucros, dados, uso, boa vontade ou
								outras perdas intangíveis.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								10. Indenização
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Você concorda em indenizar e isentar o Quartier Flow, seus
								diretores, funcionários e parceiros de quaisquer reivindicações,
								danos, obrigações, perdas, responsabilidades, custos ou dívidas
								decorrentes de:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">Seu uso da Plataforma</li>
								<li className="text-base md:text-lg">Violação destes Termos</li>
								<li className="text-base md:text-lg">
									Violação de direitos de terceiros
								</li>
							</ul>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								11. Modificações dos Termos
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Reservamo-nos o direito de modificar estes Termos a qualquer
								momento. Notificaremos sobre mudanças significativas através da
								Plataforma ou por e-mail. O uso continuado da Plataforma após
								tais modificações constitui sua aceitação dos novos termos.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								12. Rescisão
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Podemos suspender ou encerrar sua conta e acesso à Plataforma a
								nosso critério, sem aviso prévio, por conduta que acreditamos
								violar estes Termos ou ser prejudicial a outros usuários, nós ou
								terceiros.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								13. Lei Aplicável
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Estes Termos são regidos pelas leis da República Federativa do
								Brasil. Quaisquer disputas serão resolvidas nos tribunais da
								comarca de São Paulo, SP.
							</p>

							<h2 className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl tracking-tight md:text-5xl">
								14. Contato
							</h2>
							<p className="mb-6 text-base leading-relaxed md:text-lg">
								Para questões sobre estes Termos de Uso, entre em contato
								conosco:
							</p>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li className="text-base md:text-lg">
									<strong className="font-bold text-white">E-mail:</strong>{" "}
									legal@quartierflow.com
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
