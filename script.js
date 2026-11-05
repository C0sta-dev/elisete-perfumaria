// ==========================================
// CONFIGURAÇÕES
// ==========================================

const telefoneWhatsApp = "5599981570313";

const cupons = {
  ELISETE10: 10,
};

// ==========================================
// ESTADOS
// ==========================================

let perfumes = [];
let carrinho = [];
let descontoAplicado = 0;
let cupomAplicado = "";

// ==========================================
// ELEMENTOS
// ==========================================

const containerProdutos = document.getElementById("products");
const contadorCarrinho = document.getElementById("cart-count");

// ==========================================
// SEGURANÇA E FORMATAÇÃO
// ==========================================

function escaparHTML(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (caractere) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[caractere],
  );
}

function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ==========================================
// CARREGAR PRODUTOS DO SUPABASE
// ==========================================

async function carregarProdutos() {
  containerProdutos.textContent = "Carregando perfumes...";

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("id, nome, categoria, descricao, preco, imagem_url, ativo, estoque")
    .eq("ativo", true)
    .order("id", { ascending: false });

  if (error) {
    console.error("Erro ao buscar produtos:", error);

    containerProdutos.textContent =
      "Não foi possível carregar os perfumes. Tente novamente.";
    return;
  }

  perfumes = (data || []).map((produto) => ({
    ...produto,
    imagem: produto.imagem_url || "",
  }));

  renderizarProdutos();
}

// ==========================================
// MOSTRAR PRODUTOS
// ==========================================

function renderizarProdutos() {
  if (!containerProdutos) return;

  if (perfumes.length === 0) {
    containerProdutos.textContent = "Nenhum perfume disponível no momento.";
    return;
  }

  containerProdutos.innerHTML = perfumes
    .map(
      (perfume) => `
        <div class="product-card">

            <div class="product-image">
                <img
                    src="${escaparHTML(perfume.imagem)}"
                    alt="${escaparHTML(perfume.nome)}"
                    loading="lazy"
                >
            </div>

            <div class="product-info">

                <span class="product-category">
                    ${escaparHTML(perfume.categoria)}
                </span>
                <span class="product-stock">
    ${
      Number(perfume.estoque) > 0
        ? `${perfume.estoque} unidades disponíveis`
        : "Produto indisponível"
    }
</span>

                <h3>${escaparHTML(perfume.nome)}</h3>

                <p>${escaparHTML(perfume.descricao)}</p>

                <div class="product-bottom">

                    <strong>${formatarPreco(perfume.preco)}</strong>

                   <button
    class="add-button"
    data-add-id="${escaparHTML(perfume.id)}"
    ${Number(perfume.estoque) <= 0 ? "disabled" : ""}
>
    ${Number(perfume.estoque) > 0 ? "Adicionar" : "Indisponível"}
</button>

                </div>
            </div>
        </div>
    `,
    )
    .join("");

  containerProdutos.querySelectorAll("[data-add-id]").forEach((botao) => {
    botao.addEventListener("click", function () {
      adicionarCarrinho(this.dataset.addId, this);
    });
  });
}

// ==========================================
// ADICIONAR AO CARRINHO
// ==========================================

function adicionarCarrinho(id, botao) {
  const perfume = perfumes.find((item) => String(item.id) === String(id));

  if (!perfume) return;

  const estoque = Number(perfume.estoque);

  const itemExistente = carrinho.find((item) => String(item.id) === String(id));

  const quantidadeAtual = itemExistente ? itemExistente.quantidade : 0;

  if (quantidadeAtual >= estoque) {
    alert("Quantidade máxima disponível em estoque atingida.");
    return;
  }

  if (itemExistente) {
    itemExistente.quantidade++;
  } else {
    carrinho.push({
      ...perfume,
      quantidade: 1,
    });
  }

  atualizarContador();

  if (botao) {
    const textoOriginal = botao.textContent;

    botao.textContent = "✓ Adicionado";
    botao.disabled = true;

    setTimeout(() => {
      botao.textContent = textoOriginal;
      botao.disabled = false;
    }, 1000);
  }
}

// ==========================================
// CONTADOR DO CARRINHO
// ==========================================

function atualizarContador() {
  if (!contadorCarrinho) return;

  const quantidade = carrinho.reduce(
    (total, item) => total + item.quantidade,
    0,
  );

  contadorCarrinho.textContent = quantidade;
}

// ==========================================
// ABRIR CARRINHO
// ==========================================

function abrirCarrinho() {
  const overlay = document.getElementById("cart-overlay");

  if (!overlay) return;

  overlay.classList.add("active");
  document.body.style.overflow = "hidden";

  renderizarCarrinho();
}

// ==========================================
// FECHAR CARRINHO
// ==========================================

function fecharCarrinho(event) {
  const overlay = document.getElementById("cart-overlay");

  if (!overlay) return;

  if (event && event.target !== overlay) return;

  overlay.classList.remove("active");
  document.body.style.overflow = "";
}

// ==========================================
// CÁLCULO DOS VALORES
// ==========================================

function calcularValores() {
  const subtotal = carrinho.reduce(
    (soma, item) => soma + Number(item.preco) * item.quantidade,
    0,
  );

  const desconto = subtotal * (descontoAplicado / 100);
  const total = subtotal - desconto;

  return {
    subtotal,
    desconto,
    total,
  };
}

// ==========================================
// RENDERIZAR CARRINHO
// ==========================================

function renderizarCarrinho() {
  const container = document.getElementById("cart-items");
  const subtotalElemento = document.getElementById("cart-subtotal");
  const descontoElemento = document.getElementById("cart-discount");
  const totalElemento = document.getElementById("cart-total");
  const botaoWhatsApp = document.querySelector(".whatsapp-button");

  if (!container || !subtotalElemento || !descontoElemento || !totalElemento) {
    return;
  }

  if (carrinho.length === 0) {
    descontoAplicado = 0;
    cupomAplicado = "";

    const mensagem = document.getElementById("coupon-message");

    if (mensagem) mensagem.textContent = "";

    container.innerHTML = `
            <div class="empty-cart">
                <p>Seu carrinho está vazio.</p>
            </div>
        `;

    subtotalElemento.textContent = formatarPreco(0);
    descontoElemento.textContent = formatarPreco(0);
    totalElemento.textContent = formatarPreco(0);

    if (botaoWhatsApp) botaoWhatsApp.disabled = true;

    return;
  }

  if (botaoWhatsApp) botaoWhatsApp.disabled = false;

  container.innerHTML = carrinho
    .map(
      (item) => `
        <div class="cart-item">

            <img
                src="${escaparHTML(item.imagem)}"
                alt="${escaparHTML(item.nome)}"
            >

            <div class="cart-item-info">

                <h3>${escaparHTML(item.nome)}</h3>

                <p>${formatarPreco(item.preco)}</p>

                <div class="quantity-controls">

                    <button data-quantity-id="${escaparHTML(item.id)}" data-variation="-1">
                        −
                    </button>

                    <span>${item.quantidade}</span>

                    <button data-quantity-id="${escaparHTML(item.id)}" data-variation="1">
                        +
                    </button>

                </div>

                <button
                    class="remove-item"
                    data-remove-id="${escaparHTML(item.id)}"
                >
                    Remover
                </button>

            </div>
        </div>
    `,
    )
    .join("");

  container.querySelectorAll("[data-quantity-id]").forEach((botao) => {
    botao.addEventListener("click", function () {
      alterarQuantidade(
        this.dataset.quantityId,
        Number(this.dataset.variation),
      );
    });
  });

  container.querySelectorAll("[data-remove-id]").forEach((botao) => {
    botao.addEventListener("click", function () {
      removerProduto(this.dataset.removeId);
    });
  });

  const valores = calcularValores();

  subtotalElemento.textContent = formatarPreco(valores.subtotal);
  descontoElemento.textContent = formatarPreco(valores.desconto);
  totalElemento.textContent = formatarPreco(valores.total);
}

// ==========================================
// ALTERAR QUANTIDADE
// ==========================================

function alterarQuantidade(id, variacao) {
  const item = carrinho.find((produto) => String(produto.id) === String(id));

  if (!item) return;

  const perfume = perfumes.find((produto) => String(produto.id) === String(id));

  if (!perfume) return;

  const novaQuantidade = item.quantidade + variacao;

  if (novaQuantidade > Number(perfume.estoque)) {
    alert("Você atingiu o limite disponível desse perfume.");
    return;
  }

  if (novaQuantidade <= 0) {
    removerProduto(id);
    return;
  }

  item.quantidade = novaQuantidade;

  atualizarContador();
  renderizarCarrinho();
}

// ==========================================
// REMOVER PRODUTO
// ==========================================

function removerProduto(id) {
  carrinho = carrinho.filter((item) => String(item.id) !== String(id));

  atualizarContador();
  renderizarCarrinho();
}

// ==========================================
// CUPOM DE DESCONTO
// ==========================================

function aplicarCupom() {
  const campo = document.getElementById("coupon-code");
  const mensagem = document.getElementById("coupon-message");

  if (!campo || !mensagem) return;

  const codigo = campo.value.trim().toUpperCase();

  if (!codigo) {
    mensagem.textContent = "Digite um cupom.";
    mensagem.style.color = "#b33";
    return;
  }

  if (carrinho.length === 0) {
    mensagem.textContent = "Adicione produtos primeiro.";
    mensagem.style.color = "#b33";
    return;
  }

  if (cupons[codigo] !== undefined) {
    descontoAplicado = cupons[codigo];
    cupomAplicado = codigo;

    mensagem.textContent = `Cupom aplicado! ${descontoAplicado}% de desconto.`;

    mensagem.style.color = "#218c55";
  } else {
    descontoAplicado = 0;
    cupomAplicado = "";

    mensagem.textContent = "Cupom inválido.";
    mensagem.style.color = "#b33";
  }

  renderizarCarrinho();
}

// ==========================================
// FINALIZAR PELO WHATSAPP
// ==========================================

async function finalizarWhatsApp() {
  if (carrinho.length === 0) {
    alert("Seu carrinho está vazio.");
    return;
  }

  const nome = document.getElementById("customer-name").value.trim();
  const telefone = document.getElementById("customer-phone").value.trim();

  if (!nome || !telefone) {
    alert("Preencha seu nome e telefone antes de finalizar.");
    return;
  }

  const telefoneLimpo = telefone.replace(/\D/g, "");

  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 13) {
    alert("Informe um número de WhatsApp válido.");
    return;
  }

  const botao = document.querySelector(".whatsapp-button");

  if (botao) {
    botao.disabled = true;
    botao.textContent = "Registrando pedido...";
  }

  try {
    const itens = carrinho.map((item) => ({
      produto_id: Number(item.id),
      quantidade: Number(item.quantidade),
    }));

    const { data: pedidoId, error } = await supabaseClient.rpc("criar_pedido", {
      p_cliente_nome: nome,
      p_cliente_telefone: telefoneLimpo,
      p_itens: itens,
      p_cupom: cupomAplicado || null,
    });

    if (error) throw error;

    if (!pedidoId) {
      throw new Error("O banco não retornou o número do pedido.");
    }

    let mensagem = "*ELISETE PERFUMARIA*\n";
    mensagem += "*NOVO PEDIDO #" + pedidoId + "*\n\n";
    mensagem += "*Cliente:* " + nome + "\n";
    mensagem += "*Telefone:* " + telefoneLimpo + "\n\n";

    carrinho.forEach((item) => {
      const subtotalItem = Number(item.preco) * item.quantidade;

      mensagem += `*${item.nome}*\n`;
      mensagem += `Quantidade: ${item.quantidade}\n`;
      mensagem += `Subtotal: ${formatarPreco(subtotalItem)}\n\n`;
    });

    mensagem += "--------------------------\n";
    mensagem += "Subtotal: " + formatarPreco(calcularValores().subtotal) + "\n";
    mensagem += "Cupom: " + (cupomAplicado || "Nenhum") + "\n";
    mensagem += "Desconto: " + formatarPreco(calcularValores().desconto) + "\n";
    mensagem += "*TOTAL: " + formatarPreco(calcularValores().total) + "*\n\n";
    mensagem += "Aguardo confirmação do pedido!";

    const link = `https://wa.me/${telefoneWhatsApp}?text=${encodeURIComponent(mensagem)}`;

    window.open(link, "_blank");

    alert(
      "Pedido #" +
        pedidoId +
        " registrado com sucesso!\nAguardando confirmação da loja.",
    );
    carrinho = [];
    descontoAplicado = 0;
    cupomAplicado = "";

    atualizarContador();
    renderizarCarrinho();

    document.getElementById("customer-name").value = "";
    document.getElementById("customer-phone").value = "";
    document.getElementById("coupon-code").value = "";
  } catch (error) {
    console.error("Erro ao registrar pedido:", error);
    alert("Não foi possível registrar o pedido: " + error.message);
  } finally {
    if (botao) {
      botao.disabled = carrinho.length === 0;
      botao.textContent = "Finalizar pedido pelo WhatsApp";
    }
  }
  mensagem += "--------------------------\n";
  mensagem += `Subtotal: ${formatarPreco(valores.subtotal)}\n`;
  mensagem += `Cupom: ${cupomAplicado || "Nenhum"}\n`;
  mensagem += `Desconto: ${formatarPreco(valores.desconto)}\n`;
  mensagem += `*TOTAL: ${formatarPreco(valores.total)}*\n\n`;
  mensagem += "Aguardo confirmação do pedido!";

  const link = `https://wa.me/${telefoneWhatsApp}?text=${encodeURIComponent(mensagem)}`;

  window.open(link, "_blank");
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

atualizarContador();
carregarProdutos();

console.log("ELISETE PERFUMARIA conectada!");
