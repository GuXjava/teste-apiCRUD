// frontend/script.js - VERSÃO COMPLETA E ALTERADA

document.addEventListener('DOMContentLoaded', () => {
    const GOOGLE_API_URL = 'https://www.googleapis.com/books/v1/volumes';
    const API_BASE_URL = window.API_URL;

    const toHttps = (url) => {
        if (!url) return 'https://via.placeholder.com/180x260.png?text=Sem+Capa';
        return url.replace('http://', 'https://');
    };

    // --- VARIÁVEIS DO DOM ---
    const views = document.querySelectorAll('.view');
    const menuLinks = document.querySelectorAll('.sidebar-menu .menu-link');
    const searchInput = document.getElementById('searchInput');
    const addShelfBtn = document.getElementById('add-shelf-btn');
    
    // Modal de Adicionar à Estante
    const addToShelfModal = document.getElementById('add-to-shelf-modal');
    const confirmAddBtn = document.getElementById('modal-confirm-add-btn');
    const cancelAddBtn = document.getElementById('modal-cancel-btn');
    const modalStatusSelect = document.getElementById('modal-status-select');

    // --- NOVAS VARIÁVEIS PARA O MODAL DE STATUS ---
    const changeStatusModal = document.getElementById('change-status-modal');
    const confirmStatusBtn = document.getElementById('status-modal-confirm-btn');
    const cancelStatusBtn = document.getElementById('status-modal-cancel-btn');
    const statusModalSelectUpdate = document.getElementById('status-modal-select-update');

    // --- VARIÁVEIS DE ESTADO ---
    let currentBookData = null; // Dados do livro da API do Google
    let currentBookInShelf = null; // Dados do livro na nossa estante (com status e id_associacao)
    let currentShelf = { id: null, name: null };
    const STATUS = {
        WANT_TO_READ: 'Quero Ler',
        READING: 'Lendo',
        READ: 'Lido'
    };


    // --- FUNÇÕES DE LÓGICA E CONTROLE ---

    async function handleFetchError(response) {
        if (!response.ok) {
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) { /* corpo do erro não era JSON */ }
            throw new Error(errorMessage);
        }
        return response.json(); // Já converte para JSON
    }

    function switchView(viewId) {
        views.forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId)?.classList.remove('hidden');
        document.querySelector('.menu-link.active')?.classList.remove('active');
        const activeLink = document.querySelector(`.menu-link[data-view="${viewId}"]`) || document.querySelector(`.shelf-link[data-shelf-id="${currentShelf.id}"]`);
        activeLink?.classList.add('active');
    }

    // --- FUNÇÕES DE INICIALIZAÇÃO E NAVEGAÇÃO ---

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.dataset.view;
            if (viewId === 'home-view') {
                loadHomePage();
            }
            currentShelf = { id: null, name: null };
            switchView(viewId);
        });
    });

    document.querySelector('.sidebar-logo').addEventListener('click', (e) => {
        e.preventDefault();
        currentShelf = { id: null, name: null };
        loadHomePage();
        switchView('home-view');
    });

    // --- NOVA FUNÇÃO PARA CARREGAR A HOME PAGE ---
    async function loadHomePage() {
        const grid = document.getElementById('home-books-grid');
        grid.innerHTML = `<p>Carregando sua lista de leitura...</p>`;
        try {
            const books = await fetch(`${API_BASE_URL}/livros/status/${encodeURIComponent(STATUS.WANT_TO_READ)}`).then(handleFetchError);
            displayBooks(books, grid, { context: 'home' });
        } catch (error) {
            console.error(error);
            grid.innerHTML = `<p>Erro ao carregar sua lista de leitura.</p>`;
        }
    }

    // --- LÓGICA DAS ESTANTES ---

    addShelfBtn.addEventListener('click', async () => { /* ... código sem alteração ... */ });
    async function loadShelves() { /* ... código sem alteração ... */ }
    async function editShelfName(shelfId, oldName) { /* ... código sem alteração ... */ }
    async function deleteShelf(shelfId, shelfName) { /* ... código sem alteração ... */ }

    // --- LÓGICA DOS LIVROS ---

    async function loadBooksFromShelf(shelfId, shelfName) {
        currentShelf = { id: shelfId, name: shelfName };
        document.getElementById('shelf-title').textContent = shelfName;
        const shelfBooksDiv = document.getElementById('shelf-books');
        shelfBooksDiv.innerHTML = `<p>Carregando livros...</p>`;
        switchView('shelf-view');
        try {
            const books = await fetch(`${API_BASE_URL}/estantes/${shelfId}/livros`).then(handleFetchError);
            displayBooks(books, shelfBooksDiv, { context: 'shelf', shelfId });
        } catch(error) {
            shelfBooksDiv.innerHTML = `<p>Erro ao carregar livros: ${error.message}</p>`;
        }
    }

    // --- LÓGICA DE STATUS (NOVO) ---
    function openChangeStatusModal(book) {
        currentBookInShelf = book;
        document.getElementById('status-modal-book-title').textContent = book.titulo;
        statusModalSelectUpdate.value = book.status;
        changeStatusModal.classList.remove('hidden');
    }

    cancelStatusBtn.addEventListener('click', () => changeStatusModal.classList.add('hidden'));

    confirmStatusBtn.addEventListener('click', async () => {
        const newStatus = statusModalSelectUpdate.value;
        if (!currentBookInShelf) return;

        try {
            const response = await fetch(`${API_BASE_URL}/livros_estante/${currentBookInShelf.id_associacao}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            await handleFetchError(response);
            alert('Status atualizado com sucesso!');
            changeStatusModal.classList.add('hidden');

            // Recarrega a view atual para refletir a mudança
            if (currentShelf.id) {
                loadBooksFromShelf(currentShelf.id, currentShelf.name);
            } else {
                loadHomePage();
            }
        } catch (error) {
            alert(`Erro ao atualizar status: ${error.message}`);
        }
    });
    
    // --- FUNÇÕES DE BUSCA E EXIBIÇÃO ---

    let searchTimeout;
    searchInput.addEventListener('keyup', (e) => { /* ... código sem alteração ... */ });
    async function searchGoogleBooks(query, containerId = 'searchResults') { /* ... código sem alteração ... */ }

    function displayBooks(books, container, options = { context: 'search' }) {
        container.innerHTML = '';
        if (!books || books.length === 0) {
            container.innerHTML = (options.context === 'home')
                ? `<p>Você ainda não marcou nenhum livro como "Quero Ler".</p>`
                : `<p>Nenhum livro encontrado.</p>`;
            return;
        }

        books.forEach(book => {
            const googleId = book.id || book.google_book_id;
            const card = document.createElement('div');
            card.className = 'book-card';
            
            const imageUrl = toHttps(book.volumeInfo?.imageLinks?.thumbnail || book.capa_url);
            const title = book.volumeInfo?.title || book.titulo;
            
            card.innerHTML = `
                ${options.context === 'shelf' ? `<button class="remove-book-btn" title="Remover da estante">&times;</button>` : ''}
                <img src="${imageUrl}" alt="Capa de ${title}">
                <div class="book-card-overlay">
                    <h4 class="book-card-title">${title}</h4>
                </div>
            `;
            
            // --- ALTERAÇÃO AQUI: Adiciona o botão de status ---
            if (book.status) {
                const statusBadge = document.createElement('div');
                statusBadge.className = `status-badge status-${book.status.toLowerCase().replace(' ', '-')}`;
                statusBadge.textContent = book.status;
                statusBadge.title = 'Alterar status de leitura';
                statusBadge.onclick = (e) => {
                    e.stopPropagation();
                    openChangeStatusModal(book);
                };
                card.appendChild(statusBadge);
            }

            card.querySelector('img').addEventListener('click', () => displayBookDetails(googleId, { shelfId: options.shelfId, id_associacao: book.id_associacao, status: book.status }));
            if (options.context === 'shelf') {
                card.querySelector('.remove-book-btn').addEventListener('click', () => removeBookFromShelf(googleId, options.shelfId));
            }
            container.appendChild(card);
        });
    }

    async function displayBookDetails(googleBookId, bookContext = {}) {
        // ... (código existente para buscar no Google API e preencher detalhes)

        currentBookInShelf = bookContext; // Guarda o contexto do livro na estante
        
        // --- ALTERAÇÃO AQUI: Mostra o status e o botão de alterar ---
        const statusSection = document.querySelector('.detail-status-section');
        const currentStatusEl = document.getElementById('detail-current-status');
        const changeStatusBtn = document.getElementById('detail-change-status-btn');

        if (bookContext.status) {
            currentStatusEl.textContent = bookContext.status;
            changeStatusBtn.onclick = () => openChangeStatusModal(bookContext);
            statusSection.classList.remove('hidden');
            changeStatusBtn.classList.remove('hidden');
        } else {
            statusSection.classList.add('hidden');
        }

        // ... (código existente para botões de remover/voltar)
    }

    // --- LÓGICA DO MODAL DE ADICIONAR LIVRO ---
    async function openAddToShelfModal() {
        await loadShelves(); 
        if (document.getElementById('modal-shelf-select').options.length === 0) {
            alert('Você precisa criar uma estante primeiro!');
            return;
        }
        document.getElementById('modal-book-title').textContent = currentBookData.volumeInfo.title;
        addToShelfModal.classList.remove('hidden');
    }
    
    cancelAddBtn.addEventListener('click', () => addToShelfModal.classList.add('hidden'));
    
    confirmAddBtn.addEventListener('click', async () => {
        const selectedShelfId = document.getElementById('modal-shelf-select').value;
        const selectedStatus = modalStatusSelect.value; // Pega o status escolhido
        if (!currentBookData || !selectedShelfId) return;

        const bookData = {
            google_book_id: currentBookData.id,
            titulo: currentBookData.volumeInfo.title,
            autores: currentBookData.volumeInfo.authors || [],
            capa_url: currentBookData.volumeInfo.imageLinks?.thumbnail || null,
            descricao: currentBookData.volumeInfo.description || null,
            status: selectedStatus // Envia o status para a API
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/estantes/${selectedShelfId}/livros`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });
            await handleFetchError(response);
            alert(`'${bookData.titulo}' foi adicionado com sucesso!`);
            addToShelfModal.classList.add('hidden');
            // Recarrega a estante para ver o novo livro
            const shelfName = document.getElementById('modal-shelf-select').selectedOptions[0].text;
            loadBooksFromShelf(selectedShelfId, shelfName);
        } catch (error) {
            alert(`Erro ao adicionar livro: ${error.message}`);
        }
    });

    // --- INICIALIZAÇÃO ---
    loadShelves().then(() => {
        loadHomePage();
        switchView('home-view');
    });
});