
const ADMIN_UID = "1e0558dc-839f-4c35-b384-6ae80fb69228";

// ELEMENTOS
const productForm = document.getElementById("product-form");
const formSection = document.getElementById("product-form-section");
const productsList = document.getElementById("products-list");
const formMessage = document.getElementById("form-message");

const imageInput = document.getElementById("product-image");
const imagePreview = document.getElementById("image-preview");
const previewPlaceholder = document.getElementById("preview-placeholder");

const ordersList = document.getElementById("orders-list");

const tabOrders = document.getElementById("tab-orders");
const tabProducts = document.getElementById("tab-products");
const ordersPanel = document.getElementById("orders-panel");
const productsPanel = document.getElementById("products-panel");

let produtos = [];
let pedidosAtuais = [];
let imagemAtual = "";

// NAVEGAÇÃO DAS ABAS
function abrirAba(aba) {
    const mostrarPedidos = aba === "orders";

    ordersPanel.hidden = !mostrarPedidos;
    productsPanel.hidden = mostrarPedidos;

    tabOrders.classList.toggle("active", mostrarPedidos);
    tabProducts.classList.toggle("active", !mostrarPedidos);
}

tabOrders.addEventListener("click", () => abrirAba("orders"));
tabProducts.addEventListener("click", () => abrirAba("products"));

// VERIFICAR ADMINISTRADOR
async function verificarAdministrador() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user || data.user.id !== ADMIN_UID) {
        await supabaseClient.auth.signOut();
        window.location.href = "admin.html";
        return false;
    }

    return true;
}

// PRÉVIA DA IMAGEM
function mostrarPrevia(url) {
    if (url) {
        imagePreview.src = url;
        imagePreview.hidden = false;
        previewPlaceholder.hidden = true;
    } else {
        imagePreview.src = "";
        imagePreview.hidden = true;
        previewPlaceholder.hidden = false;
    }
}

// SELECIONAR IMAGEM
imageInput.addEventListener("change", function () {
    const arquivo = this.files[0];

    if (!arquivo) {
        mostrarPrevia(imagemAtual);
        return;
    }

    const urlTemporaria = URL.createObjectURL(arquivo);
    mostrarPrevia(urlTemporaria);
});

// ENVIAR IMAGEM PARA O SUPABASE
async function enviarImagem(arquivo) {
    const extensao = arquivo.name.split(".").pop().toLowerCase();

    const nomeArquivo =
        `${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`;

    const { error } = await supabaseClient
        .storage
        .from("produtos")
        .upload(nomeArquivo, arquivo, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) throw error;

    const { data } = supabaseClient
        .storage
        .from("produtos")
        .getPublicUrl(nomeArquivo);

    return data.publicUrl;
}

// CARREGAR PRODUTOS
async function carregarProdutos() {
    productsList.textContent = "Carregando produtos...";

    const { data, error } = await supabaseClient
        .from("produtos")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        productsList.textContent = "Erro ao carregar: " + error.message;
        return;
    }

    produtos = data || [];
    mostrarProdutos();
}

// MOSTRAR PRODUTOS
function mostrarProdutos() {
    productsList.innerHTML = "";

    if (produtos.length === 0) {
        productsList.textContent = "Nenhum perfume cadastrado ainda.";
        return;
    }

    produtos.forEach(produto => {
        const item = document.createElement("div");
        item.className = "product-item";

        const imagem = document.createElement("img");
        imagem.src = produto.imagem_url || "";
        imagem.alt = produto.nome;
        imagem.onerror = () => imagem.style.display = "none";

        const info = document.createElement("div");
        info.className = "product-info";

        const nome = document.createElement("h4");
        nome.textContent = produto.nome;

        const detalhes = document.createElement("p");

        detalhes.textContent =
            produto.categoria + " • R$ " +
            Number(produto.preco).toFixed(2).replace(".", ",") +
            " • Estoque: " + produto.estoque + " unidades" +
            (produto.ativo ? " • Ativo" : " • Inativo");

        info.append(nome, detalhes);

        const actions = document.createElement("div");
        actions.className = "product-actions";

        const editButton = document.createElement("button");
        editButton.className = "edit-button";
        editButton.textContent = "Editar";
        editButton.addEventListener("click", () => editarProduto(produto.id));

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Excluir";
        deleteButton.addEventListener("click", () => excluirProduto(produto.id));

        actions.append(editButton, deleteButton);
        item.append(imagem, info, actions);

        productsList.appendChild(item);
    });
}

// NOVO PERFUME
document.getElementById("new-product-button").addEventListener("click", () => {
    productForm.reset();

    document.getElementById("product-id").value = "";
    document.getElementById("product-stock").value = 0;
    document.getElementById("form-title").textContent = "Cadastrar perfume";
    document.getElementById("save-button").textContent = "Salvar perfume";

    imagemAtual = "";
    mostrarPrevia("");

    formMessage.textContent = "";
    formMessage.style.color = "";

    formSection.hidden = false;
    formSection.scrollIntoView({ behavior: "smooth" });
});

// EDITAR PERFUME
function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);

    if (!produto) return;

    document.getElementById("product-id").value = produto.id;
    document.getElementById("product-name").value = produto.nome;
    document.getElementById("product-category").value = produto.categoria;
    document.getElementById("product-description").value = produto.descricao || "";
    document.getElementById("product-price").value = produto.preco;
    document.getElementById("product-stock").value = produto.estoque ?? 0;

    imagemAtual = produto.imagem_url || "";
    imageInput.value = "";

    mostrarPrevia(imagemAtual);

    document.getElementById("form-title").textContent = "Editar perfume";
    document.getElementById("save-button").textContent = "Atualizar perfume";

    formMessage.textContent = "";
    formMessage.style.color = "";

    formSection.hidden = false;
    formSection.scrollIntoView({ behavior: "smooth" });
}

// SALVAR OU ATUALIZAR PERFUME
productForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const id = document.getElementById("product-id").value;
    const arquivo = imageInput.files[0];

    const estoque = Number(
        document.getElementById("product-stock").value
    );

    const produto = {
        nome: document.getElementById("product-name").value.trim(),
        categoria: document.getElementById("product-category").value,
        descricao: document.getElementById("product-description").value.trim(),
        preco: Number(document.getElementById("product-price").value),
        estoque: estoque,
        imagem_url: imagemAtual,
        ativo: true
    };

    if (!produto.nome || !Number.isFinite(produto.preco) || produto.preco < 0) {
        formMessage.textContent = "Confira o nome e o preço informado.";
        return;
    }

    if (!Number.isInteger(estoque) || estoque < 0) {
        formMessage.textContent =
            "Informe uma quantidade inteira de estoque, igual ou maior que zero.";
        return;
    }

    if (arquivo) {
        const formatosPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!formatosPermitidos.includes(arquivo.type)) {
            formMessage.textContent = "Escolha uma imagem JPG, PNG ou WEBP.";
            return;
        }

        if (arquivo.size > 5 * 1024 * 1024) {
            formMessage.textContent = "A imagem deve ter no máximo 5 MB.";
            return;
        }
    }

    const saveButton = document.getElementById("save-button");

    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";
    formMessage.textContent = "";

    try {
        if (arquivo) {
            formMessage.textContent = "Enviando imagem...";
            produto.imagem_url = await enviarImagem(arquivo);
        }

        formMessage.textContent = "Salvando perfume...";

        let resultado;

        if (id) {
            resultado = await supabaseClient
                .from("produtos")
                .update(produto)
                .eq("id", id);
        } else {
            resultado = await supabaseClient
                .from("produtos")
                .insert([produto]);
        }

        if (resultado.error) throw resultado.error;

        formMessage.style.color = "green";
        formMessage.textContent = "Perfume salvo com sucesso!";

        productForm.reset();

        document.getElementById("product-id").value = "";
        document.getElementById("product-stock").value = 0;

        imagemAtual = "";
        mostrarPrevia("");

        formSection.hidden = true;

        await carregarProdutos();

    } catch (error) {
        formMessage.style.color = "red";
        formMessage.textContent = "Erro: " + error.message;

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = id
            ? "Atualizar perfume"
            : "Salvar perfume";
    }
});

// EXCLUIR PERFUME
async function excluirProduto(id) {
    const confirmar = confirm(
        "Tem certeza que deseja excluir este perfume?"
    );

    if (!confirmar) return;

    const { error } = await supabaseClient
        .from("produtos")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir: " + error.message);
        return;
    }

    alert("Perfume excluído com sucesso!");

    await carregarProdutos();
}

// CANCELAR FORMULÁRIO
document.getElementById("cancel-button").addEventListener("click", () => {
    productForm.reset();

    imagemAtual = "";
    mostrarPrevia("");

    formSection.hidden = true;
});

// GERENCIAMENTO DE PEDIDOS

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(data) {
    return new Date(data).toLocaleString("pt-BR");
}

// CARREGAR PEDIDOS
async function carregarPedidos() {
    if (!ordersList) return;

    ordersList.textContent = "Carregando pedidos...";

    const { data, error } = await supabaseClient
        .from("pedidos")
        .select("*, itens_pedido(*)")
        .order("created_at", { ascending: false });

    if (error) {
        ordersList.textContent =
            "Erro ao carregar pedidos: " + error.message;
        return;
    }

    pedidosAtuais = data || [];

    mostrarPedidos(pedidosAtuais);
}

// MOSTRAR PEDIDOS, RESUMO E FILTRO
function mostrarPedidos(pedidos) {
    ordersList.innerHTML = "";

    // RESUMO
    const resumo = document.createElement("div");
    resumo.className = "orders-summary";

    const indicadores = [
        {
            titulo: "Total de pedidos",
            valor: pedidos.length
        },
        {
            titulo: "Aguardando confirmação",
            valor: pedidos.filter(
                p => p.status === "aguardando_confirmacao"
            ).length
        },
        {
            titulo: "Confirmados",
            valor: pedidos.filter(
                p => p.status === "confirmado"
            ).length
        },
        {
            titulo: "Cancelados",
            valor: pedidos.filter(
                p => p.status === "cancelado"
            ).length
        }
    ];

    indicadores.forEach(item => {
        const card = document.createElement("div");
        card.className = "summary-card";

        const titulo = document.createElement("p");
        titulo.textContent = item.titulo;

        const valor = document.createElement("h2");
        valor.textContent = item.valor;

        card.append(titulo, valor);
        resumo.appendChild(card);
    });

    ordersList.appendChild(resumo);

    // ATUALIZAR PEDIDOS
    const refreshButton = document.createElement("button");

    refreshButton.textContent = "Atualizar pedidos";
    refreshButton.className = "refresh-orders-button";
    refreshButton.addEventListener("click", carregarPedidos);

    ordersList.appendChild(refreshButton);

    // FILTRO
    const filtro = document.createElement("select");
    filtro.className = "orders-filter";

    filtro.innerHTML = `
        <option value="todos">Todos os pedidos</option>
        <option value="aguardando_confirmacao">Aguardando confirmação</option>
        <option value="confirmado">Confirmados</option>
        <option value="cancelado">Cancelados</option>
    `;

    ordersList.appendChild(filtro);

    // CONTAINER DA TABELA
    const container = document.createElement("div");
    container.className = "orders-table-container";

    ordersList.appendChild(container);

    // RENDERIZAR TABELA
    function renderizarTabela() {
        container.innerHTML = "";

        const pedidosFiltrados = filtro.value === "todos"
            ? pedidos
            : pedidos.filter(p => p.status === filtro.value);

        if (pedidosFiltrados.length === 0) {
            const vazio = document.createElement("p");
            vazio.textContent = "Nenhum pedido encontrado nesse filtro.";

            container.appendChild(vazio);
            return;
        }

        const tabela = document.createElement("table");
        tabela.className = "orders-table";

        const cabecalho = document.createElement("thead");
        const linhaCabecalho = document.createElement("tr");

        [
            "Pedido",
            "Cliente",
            "Data",
            "Total",
            "Status",
            "Ação"
        ].forEach(texto => {
            const th = document.createElement("th");
            th.textContent = texto;
            linhaCabecalho.appendChild(th);
        });

        cabecalho.appendChild(linhaCabecalho);

        const corpo = document.createElement("tbody");

        pedidosFiltrados.forEach(pedido => {
            const linha = document.createElement("tr");

            const numero = document.createElement("td");
            numero.textContent = "#" + pedido.id;

            const cliente = document.createElement("td");
            cliente.textContent = pedido.cliente_nome;

            const data = document.createElement("td");
            data.textContent = formatarData(pedido.created_at);

            const total = document.createElement("td");
            total.textContent = formatarMoeda(pedido.total);

            const status = document.createElement("td");

            status.textContent =
                pedido.status === "aguardando_confirmacao"
                    ? "Pendente"
                    : pedido.status === "confirmado"
                        ? "Confirmado"
                        : "Cancelado";

            status.className = "status-cell " + pedido.status;

            const acao = document.createElement("td");

            // BOTÃO DETALHES
            const detalhesButton = document.createElement("button");

            detalhesButton.textContent = "Detalhes";
            detalhesButton.className = "details-order-button";

            detalhesButton.addEventListener("click", () => {
                mostrarDetalhesPedido(pedido);
            });

            acao.appendChild(detalhesButton);

            // BOTÕES DE CONFIRMAR E CANCELAR
            if (pedido.status === "aguardando_confirmacao") {
                const confirmarButton = document.createElement("button");

                confirmarButton.textContent = "Confirmar";
                confirmarButton.className = "confirm-order-button";

                confirmarButton.addEventListener("click", () => {
                    confirmarPedido(pedido.id, confirmarButton);
                });

                const cancelarButton = document.createElement("button");

                cancelarButton.textContent = "Cancelar";
                cancelarButton.className = "cancel-order-button";

                cancelarButton.addEventListener("click", () => {
                    cancelarPedido(pedido.id, cancelarButton);
                });

                acao.append(confirmarButton, cancelarButton);
            }

            linha.append(
                numero,
                cliente,
                data,
                total,
                status,
                acao
            );

            corpo.appendChild(linha);
        });

        tabela.append(cabecalho, corpo);
        container.appendChild(tabela);
    }

    filtro.addEventListener("change", renderizarTabela);

    renderizarTabela();
}

// DETALHES DO PEDIDO
function mostrarDetalhesPedido(pedido) {
    let painel = document.getElementById("order-details");

    if (!painel) {
        painel = document.createElement("div");
        painel.id = "order-details";
        painel.className = "order-details";

        ordersList.appendChild(painel);
    }

    painel.innerHTML = "";

    const titulo = document.createElement("h3");
    titulo.textContent = "Detalhes do pedido #" + pedido.id;

    const cliente = document.createElement("p");
    cliente.textContent = "Cliente: " + pedido.cliente_nome;

    const telefone = document.createElement("p");
    telefone.textContent = "Telefone: " + pedido.cliente_telefone;

    const data = document.createElement("p");
    data.textContent = "Data: " + formatarData(pedido.created_at);

    const tituloProdutos = document.createElement("h4");
    tituloProdutos.textContent = "Produtos";

    const lista = document.createElement("ul");

    (pedido.itens_pedido || []).forEach(item => {
        const li = document.createElement("li");

        li.textContent =
            `${item.quantidade}x ${item.produto_nome} — ${formatarMoeda(item.subtotal)}`;

        lista.appendChild(li);
    });

    const subtotal = document.createElement("p");
    subtotal.textContent =
        "Subtotal: " + formatarMoeda(pedido.subtotal);

    const desconto = document.createElement("p");
    desconto.textContent =
        "Desconto: " + formatarMoeda(pedido.desconto);

    const total = document.createElement("h3");
    total.textContent =
        "Total: " + formatarMoeda(pedido.total);

    painel.append(
        titulo,
        cliente,
        telefone,
        data,
        tituloProdutos,
        lista,
        subtotal,
        desconto,
        total
    );

    if (pedido.cupom) {
        const cupom = document.createElement("p");
        cupom.textContent = "Cupom: " + pedido.cupom;

        painel.appendChild(cupom);
    }

    const fechar = document.createElement("button");

    fechar.textContent = "Fechar detalhes";

    fechar.addEventListener("click", () => {
        painel.remove();
    });

    painel.appendChild(fechar);

    painel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

// CONFIRMAR PEDIDO E DESCONTAR ESTOQUE
async function confirmarPedido(id, botao) {
    const confirmar = window.confirm(
        "Deseja confirmar o pedido #" + id +
        "?\n\nO estoque dos produtos será atualizado."
    );

    if (!confirmar) return;

    botao.disabled = true;
    botao.textContent = "Confirmando...";

    const { error } = await supabaseClient.rpc(
        "confirmar_pedido",
        {
            p_pedido_id: id
        }
    );

    if (error) {
        alert(
            "Não foi possível confirmar o pedido:\n" +
            error.message
        );

        botao.disabled = false;
        botao.textContent = "Confirmar";

        return;
    }

    alert("Pedido #" + id + " confirmado com sucesso!");

    await Promise.all([
        carregarPedidos(),
        carregarProdutos()
    ]);
}

// CANCELAR PEDIDO
async function cancelarPedido(pedidoId, botao) {
    const confirmar = window.confirm(
        `Tem certeza que deseja cancelar o pedido #${pedidoId}?`
    );

    if (!confirmar) return;

    botao.disabled = true;
    botao.textContent = "Cancelando...";

    const { error } = await supabaseClient.rpc(
        "cancelar_pedido",
        {
            p_pedido_id: pedidoId
        }
    );

    if (error) {
        alert("Erro ao cancelar pedido: " + error.message);

        botao.disabled = false;
        botao.textContent = "Cancelar";

        return;
    }

    alert("Pedido cancelado com sucesso!");

    await carregarPedidos();
}

// SAIR DA CONTA
document.getElementById("logout-button").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();

    window.location.href = "admin.html";
});

// INICIAR PAINEL
(async function iniciarPainel() {
    const autorizado = await verificarAdministrador();

    if (autorizado) {
        abrirAba("orders");

        await Promise.all([
            carregarProdutos(),
            carregarPedidos()
        ]);
    }
})();
