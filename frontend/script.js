document.addEventListener('DOMContentLoaded', () => {
    const GOOGLE_API_URL = 'https://www.googleapis.com/books/v1/volumes';
    const API_BASE_URL = window.API_URL;

    // --- MUDANÇA AQUI: Helper function para forçar HTTPS ---
    const toHttps = (url) => {
        if (!url) return 'https://via.placeholder.com/180x260.png?text=Sem+Capa';
        return url.replace('http://', 'https://');
    };

    const views = document.querySelectorAll('.view');
    const menuLinks = document.querySelectorAll('.sidebar-menu .menu-link');
    const searchInput = document.getElementById('searchInput');
    const addShelfBtn = document.getElementById('add-shelf-btn');
    const modal = document.getElementById('add-to-shelf-modal');
    const confirmAddBtn = document.getElementById('modal-confirm-add-btn');
    const cancelAddBtn = document.getElementById('modal-cancel-btn');

    let currentBookData = null;
    let currentShelf = { id: null, name: null };

    async function handleFetchError(response) {
        if (!response.ok) {
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // O corpo do erro não era JSON.
            }
            throw new Error(errorMessage);
        }
        return response;
    }

    function switchView(viewId) {
        views.forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId)?.classList.remove('hidden');
        document.querySelector('.menu-link.active')?.classList.remove('active');
        
        const activeLink = document.querySelector(`.menu-link[data-view="${viewId}"]`) || document.querySelector(`.shelf-link[data-shelf-id="${currentShelf.id}"]`);
        activeLink?.classList.add('active');
    }

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            currentShelf = { id: null, name: null };
            switchView(link.dataset.view);
        });
    });

    document.querySelector('.sidebar-logo').addEventListener('click', (e) => {
        e.preventDefault();
        currentShelf = { id: null, name: null };
        switchView('home-view');
    });

    // --- LÓGICA DAS ESTANTES (CRUD) ---

    addShelfBtn.addEventListener('click', async () => {
        const shelfName = prompt("Digite o nome da nova estante:");
        if (shelfName?.trim()) {
            try {
                const response = await fetch(`${API_BASE_URL}/estantes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome_estante: shelfName.trim() })
                });
                await handleFetchError(response);
                alert('Estante criada com sucesso!');
                loadShelves();
            } catch (error) {
                alert(`Erro ao criar estante: ${error.message}`);
            }
        }
    });

    async function loadShelves() {
        try {
            const response = await fetch(`${API_BASE_URL}/estantes`).then(handleFetchError);
            const shelves = await response.json();
            
            const shelvesList = document.getElementById('shelves-list');
            const modalShelfSelect = document.getElementById('modal-shelf-select');
            shelvesList.innerHTML = '';
            modalShelfSelect.innerHTML = '';

            if (shelves.length === 0) {
                shelvesList.innerHTML = '<li><span class="no-shelves">Nenhuma estante.</span></li>';
            } else {
                shelves.forEach(shelf => {
                    const li = document.createElement('li');
                    li.className = 'shelf-item-container';
                    li.innerHTML = `
                        <a href="#" class="menu-link shelf-link" data-shelf-id="${shelf.id_estante}">${shelf.nome_estante}</a>
                        <div class="shelf-actions">
                            <i class="fa-solid fa-pencil edit-shelf-btn" title="Editar nome"></i>
                            <i class="fa-solid fa-trash-can delete-shelf-btn" title="Excluir estante"></i>
                        </div>
                    `;
                    shelvesList.appendChild(li);

                    li.querySelector('.shelf-link').addEventListener('click', (e) => {
                        e.preventDefault();
                        loadBooksFromShelf(shelf.id_estante, shelf.nome_estante);
                    });
                    li.querySelector('.edit-shelf-btn').addEventListener('click', () => editShelfName(shelf.id_estante, shelf.nome_estante));
                    li.querySelector('.delete-shelf-btn').addEventListener('click', () => deleteShelf(shelf.id_estante, shelf.nome_estante));

                    const option = document.createElement('option');
                    option.value = shelf.id_estante;
                    option.textContent = shelf.nome_estante;
                    modalShelfSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Erro ao carregar estantes:", error);
            document.getElementById('shelves-list').innerHTML = '<li><span class="no-shelves">Erro ao carregar.</span></li>';
        }
    }

    async function editShelfName(shelfId, oldName) {
        const newName = prompt("Digite o novo nome para a estante:", oldName);
        if (newName?.trim() && newName.trim() !== oldName) {
            try {
                const response = await fetch(`${API_BASE_URL}/estantes/${shelfId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome_estante: newName.trim() })
                });
                await handleFetchError(response);
                alert('Estante atualizada com sucesso!');
                loadShelves();
            } catch (error) {
                alert(`Erro ao atualizar estante: ${error.message}`);
            }
        }
    }
    
    async function deleteShelf(shelfId, shelfName) {
        if (confirm(`Tem certeza que deseja excluir a estante "${shelfName}"?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/estantes/${shelfId}`, { method: 'DELETE' });
                await handleFetchError(response);
                alert('Estante excluída com sucesso!');
                if (currentShelf.id === shelfId) {
                    switchView('home-view');
                }
                loadShelves();
            } catch (error) {
                alert(`Erro ao excluir estante: ${error.message}`);
            }
        }
    }

    // --- LÓGICA DOS LIVROS ---

    async function loadBooksFromShelf(shelfId, shelfName) {
        currentShelf = { id: shelfId, name: shelfName };
        document.getElementById('shelf-title').textContent = shelfName;
        const shelfBooksDiv = document.getElementById('shelf-books');
        shelfBooksDiv.innerHTML = `<p>Carregando livros...</p>`;
        switchView('shelf-view');
        
        try {
            const response = await fetch(`${API_BASE_URL}/estantes/${shelfId}/livros`).then(handleFetchError);
            const books = await response.json();
            displayBooks(books, shelfBooksDiv, { context: 'shelf', shelfId });
        } catch(error) {
            shelfBooksDiv.innerHTML = `<p>Erro ao carregar livros: ${error.message}</p>`;
        }
    }

    async function removeBookFromShelf(googleBookId, shelfId) {
        if (confirm("Tem certeza que deseja remover este livro da estante?")) {
            try {
                const response = await fetch(`${API_BASE_URL}/estantes/${shelfId}/livros/${googleBookId}`, { method: 'DELETE' });
                await handleFetchError(response);
                alert('Livro removido com sucesso!');
                loadBooksFromShelf(shelfId, currentShelf.name);
            } catch (error) {
                alert(`Erro ao remover livro: ${error.message}`);
            }
        }
    }
    
    let searchTimeout;
    searchInput.addEventListener('keyup', (e) => {
        clearTimeout(searchTimeout);
        if (e.key === 'Enter' || searchInput.value.length > 2) {
            searchTimeout = setTimeout(() => searchGoogleBooks(searchInput.value.trim()), 500);
        }
    });

    async function searchGoogleBooks(query, containerId = 'searchResults') {
        if (!query) return;
        const resultsDiv = document.getElementById(containerId);
        resultsDiv.innerHTML = `<p>Buscando...</p>`;
        try {
            const response = await fetch(`${GOOGLE_API_URL}?q=${encodeURIComponent(query)}&maxResults=18`).then(handleFetchError);
            const data = await response.json();
            displayBooks(data.items, resultsDiv, { context: 'search' });
        } catch (error) {
            resultsDiv.innerHTML = `<p>Erro ao buscar: ${error.message}</p>`;
        }
    }

    function displayBooks(books, container, options = { context: 'search' }) {
        container.innerHTML = '';
        if (!books || books.length === 0) {
            container.innerHTML = `<p>Nenhum livro encontrado.</p>`;
            return;
        }

        books.forEach(book => {
            const googleId = book.id || book.google_book_id;
            const card = document.createElement('div');
            card.className = 'book-card';
            
            // --- MUDANÇA AQUI: Usando a função toHttps ---
            const imageUrl = toHttps(book.volumeInfo?.imageLinks?.thumbnail || book.capa_url);
            const title = book.volumeInfo?.title || book.titulo;
            
            card.innerHTML = `
                ${options.context === 'shelf' ? `<button class="remove-book-btn" title="Remover da estante">&times;</button>` : ''}
                <img src="${imageUrl}" alt="Capa de ${title}">
            `;

            card.querySelector('img').addEventListener('click', () => displayBookDetails(googleId, options.shelfId));
            if (options.context === 'shelf') {
                card.querySelector('.remove-book-btn').addEventListener('click', () => removeBookFromShelf(googleId, options.shelfId));
            }
            container.appendChild(card);
        });
    }

    async function displayBookDetails(googleBookId, shelfId = null) {
        switchView('detail-view');
        document.querySelector('.main-content').scrollTop = 0;
        
        try {
            const response = await fetch(`${GOOGLE_API_URL}/${googleBookId}`).then(handleFetchError);
            const book = await response.json();
            currentBookData = book;

            const info = book.volumeInfo;
            document.getElementById('detail-title').textContent = info.title;
            document.getElementById('detail-author-name').textContent = info.authors?.join(', ') || 'Desconhecido';
            document.getElementById('detail-description').innerHTML = info.description || 'Sem descrição disponível.';
            
            // --- MUDANÇA AQUI: Usando a função toHttps ---
            document.getElementById('detail-cover').src = toHttps(info.imageLinks?.thumbnail);
            
            document.getElementById('detail-add-to-shelf-btn').onclick = openAddToShelfModal;
            
            const removeBtn = document.getElementById('detail-remove-from-shelf-btn');
            const backBtn = document.getElementById('detail-back-to-shelf-btn');

            if (shelfId) {
                removeBtn.classList.remove('hidden');
                removeBtn.onclick = () => removeBookFromShelf(googleBookId, shelfId);
                
                backBtn.classList.remove('hidden');
                document.getElementById('back-to-shelf-name').textContent = `Voltar para "${currentShelf.name}"`;
                backBtn.onclick = () => loadBooksFromShelf(currentShelf.id, currentShelf.name);
            } else {
                removeBtn.classList.add('hidden');
                backBtn.classList.add('hidden');
            }

            const authorQuery = info.authors?.[0];
            if (authorQuery) {
                searchGoogleBooks(`inauthor:"${authorQuery}"`, 'similar-books-grid');
            } else {
                document.getElementById('similar-books-grid').innerHTML = '';
            }
        } catch (error) {
            alert(`Não foi possível carregar os detalhes do livro: ${error.message}`);
        }
    }

    async function openAddToShelfModal() {
        await loadShelves(); 
        if (document.getElementById('modal-shelf-select').options.length === 0) {
            alert('Você precisa criar uma estante primeiro!');
            return;
        }
        document.getElementById('modal-book-title').textContent = currentBookData.volumeInfo.title;
        modal.classList.remove('hidden');
    }

    function closeAddToShelfModal() {
        modal.classList.add('hidden');
    }
    cancelAddBtn.addEventListener('click', closeAddToShelfModal);
    
    confirmAddBtn.addEventListener('click', async () => {
        const selectedShelfId = document.getElementById('modal-shelf-select').value;
        if (!currentBookData || !selectedShelfId) return;

        const bookData = {
            google_book_id: currentBookData.id,
            titulo: currentBookData.volumeInfo.title,
            autores: currentBookData.volumeInfo.authors || [],
            capa_url: currentBookData.volumeInfo.imageLinks?.thumbnail || null,
            descricao: currentBookData.volumeInfo.description || null
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/estantes/${selectedShelfId}/livros`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });
            await handleFetchError(response);
            alert(`'${bookData.titulo}' foi adicionado com sucesso!`);
            closeAddToShelfModal();
        } catch (error) {
            alert(`Erro ao adicionar livro: ${error.message}`);
        }
    });

    // --- INICIALIZAÇÃO ---
    loadShelves().then(() => {
        switchView('home-view');
    });
});