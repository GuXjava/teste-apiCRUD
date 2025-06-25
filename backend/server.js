require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db/knex.js');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/*
|--------------------------------------------------------------------------
| Rotas para gerenciar ESTANTES
|--------------------------------------------------------------------------
*/

// ROTA PARA LISTAR TODAS AS ESTANTES
app.get('/api/estantes', async (req, res) => {
    try {
        const estantes = await db('Estantes').select('*').orderBy('nome_estante', 'asc');
        res.json(estantes);
    } catch (error) {
        console.error("Erro ao listar estantes:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// ROTA PARA CRIAR UMA NOVA ESTANTE
app.post('/api/estantes', async (req, res) => {
    try {
        const { nome_estante } = req.body;
        if (!nome_estante || nome_estante.trim() === '') {
            return res.status(400).json({ message: "O nome da estante é obrigatório." });
        }
        const [id] = await db('Estantes').insert({ nome_estante });
        res.status(201).json({ id_estante: id, nome_estante });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
            return res.status(409).json({ message: "Uma estante com este nome já existe." });
        }
        console.error("Erro ao criar estante:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// ROTA PARA ATUALIZAR NOME DA ESTANTE
app.put('/api/estantes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome_estante } = req.body;
        if (!nome_estante || nome_estante.trim() === '') {
            return res.status(400).json({ message: "O nome da estante é obrigatório." });
        }

        const count = await db('Estantes').where({ id_estante: id }).update({ nome_estante });

        if (count > 0) {
            res.status(200).json({ message: "Estante atualizada com sucesso." });
        } else {
            res.status(404).json({ message: "Estante não encontrada." });
        }
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
            return res.status(409).json({ message: "Uma estante com este nome já existe." });
        }
        console.error("Erro ao atualizar estante:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// ROTA PARA DELETAR UMA ESTANTE 
app.delete('/api/estantes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let success = false;

        await db.transaction(async trx => {
            // Primeiro, remove as associações de livros com esta estante
            await trx('Livros_Estante').where({ id_estante_fk: id }).del();
            // Depois, remove a estante
            const count = await trx('Estantes').where({ id_estante: id }).del();
            if (count > 0) {
                success = true;
            }
        });

        if (success) {
            res.status(200).json({ message: "Estante removida com sucesso." });
        } else {
            res.status(404).json({ message: "Estante não encontrada." });
        }
    } catch (error) {
        console.error("Erro ao deletar estante:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});


/*
|--------------------------------------------------------------------------
| Rotas para gerenciar LIVROS dentro das estantes
|--------------------------------------------------------------------------
*/

// ROTA PARA LISTAR TODOS OS LIVROS DE UMA ESTANTE ESPECÍFICA
app.get('/api/estantes/:id/livros', async (req, res) => {
    try {
        const { id } = req.params;
        const livros = await db('Livros_Estante')
            .join('Livros', 'Livros_Estante.id_livro_fk', '=', 'Livros.id_livro')
            .where({ id_estante_fk: id })
            .select('Livros.*');
        
        res.json(livros);
    } catch (error) {
        console.error("Erro ao listar livros da estante:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// ROTA PARA ADICIONAR UM LIVRO A UMA ESTANTE
app.post('/api/estantes/:id/livros', async (req, res) => {
    const { id: id_estante_fk } = req.params;
    const { google_book_id, titulo, autores, capa_url, descricao } = req.body;

    if (!google_book_id) {
        return res.status(400).json({ message: "O ID do livro é obrigatório." });
    }

    try {
        await db.transaction(async trx => {
            let livro = await trx('Livros').where({ google_book_id }).first();
            let id_livro_fk;

            if (livro) {
                id_livro_fk = livro.id_livro;
            } else {
                const [newId] = await trx('Livros').insert({
                    google_book_id,
                    titulo,
                    autores: autores ? autores.join(', ') : 'Autor desconhecido',
                    capa_url,
                    descricao
                });
                id_livro_fk = newId;
            }
            
            const existingRelation = await trx('Livros_Estante').where({ id_livro_fk, id_estante_fk }).first();
            if (existingRelation) {
                throw new Error('DUPLICATE_ENTRY');
            }

            await trx('Livros_Estante').insert({ id_livro_fk, id_estante_fk });
        });

        res.status(201).json({ message: "Livro adicionado à estante com sucesso." });
    } catch (error) {
        if (error.message === 'DUPLICATE_ENTRY' || error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
            return res.status(409).json({ message: "Este livro já está nesta estante." });
        }
        console.error("Erro ao adicionar livro à estante:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// ROTA PARA REMOVER UM LIVRO DE UMA ESTANTE
app.delete('/api/estantes/:shelfId/livros/:bookId', async (req, res) => {
    try {
        const { shelfId, bookId } = req.params;
        
        const livro = await db('Livros').where({ google_book_id: bookId }).first();
        if (!livro) {
            return res.status(404).json({ message: "Livro não encontrado no sistema." });
        }

        const count = await db('Livros_Estante')
            .where({ id_estante_fk: shelfId, id_livro_fk: livro.id_livro })
            .del();
        
        if (count > 0) {
            res.status(200).json({ message: "Livro removido da estante." });
        } else {
            res.status(404).json({ message: "Este livro não foi encontrado nesta estante." });
        }
    } catch (error) {
        console.error("Erro ao remover livro da estante:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});


// Listener do servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor backend rodando em http://0.0.0.0:${PORT}`);
});
