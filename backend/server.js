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

// ROTA PARA LISTAR TODAS AS ESTANTES (Nenhuma mudança necessária aqui)
app.get('/api/estantes', async (req, res) => {
    try {
        const estantes = await db('Estantes').select('*').orderBy('nome_estante', 'asc');
        res.json(estantes);
    } catch (error) {
        console.error("Erro ao listar estantes:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// --- MUDANÇA 1: ROTA DE CRIAR ESTANTE ---
app.post('/api/estantes', async (req, res) => {
    try {
        const { nome_estante } = req.body;
        if (!nome_estante || nome_estante.trim() === '') {
            return res.status(400).json({ message: "O nome da estante é obrigatório." });
        }
        
        // Ajustado com .returning('*') para ser compatível com PostgreSQL
        const [estanteAdicionada] = await db('Estantes')
            .insert({ nome_estante: nome_estante.trim() })
            .returning('*');

        res.status(201).json(estanteAdicionada);

    } catch (error) {
        // O código de erro '23505' é para violação de unicidade no PostgreSQL. O seu já estava correto!
        if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
            return res.status(409).json({ message: "Uma estante com este nome já existe." });
        }
        console.error("Erro ao criar estante:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// ROTA PARA ATUALIZAR NOME DA ESTANTE (Nenhuma mudança necessária aqui, já era compatível)
app.put('/api/estantes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome_estante } = req.body;
        if (!nome_estante || nome_estante.trim() === '') {
            return res.status(400).json({ message: "O nome da estante é obrigatório." });
        }

        const count = await db('Estantes').where({ id_estante: id }).update({ nome_estante: nome_estante.trim() });

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

// ROTA PARA DELETAR UMA ESTANTE (Nenhuma mudança necessária aqui, já era compatível)
app.delete('/api/estantes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let success = false;

        await db.transaction(async trx => {
            await trx('Livros_Estante').where({ id_estante_fk: id }).del();
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

// ROTA PARA LISTAR TODOS OS LIVROS DE UMA ESTANTE ESPECÍFICA (Nenhuma mudança necessária aqui)
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

// --- MUDANÇA 2: ROTA DE ADICIONAR LIVRO ---
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
                // Ajustado com .returning('id_livro') para ser compatível com PostgreSQL
                const [livroInserido] = await trx('Livros').insert({
                    google_book_id,
                    titulo,
                    autores: autores ? autores.join(', ') : 'Autor desconhecido',
                    capa_url,
                    descricao
                }).returning('id_livro'); // Pedimos para retornar o objeto com o ID

                id_livro_fk = livroInserido.id_livro;
            }
            
            const existingRelation = await trx('Livros_Estante').where({ id_livro_fk, id_estante_fk }).first();
            if (existingRelation) {
                // Lançando um erro com uma mensagem específica para ser pego no catch
                const err = new Error('DUPLICATE_ENTRY');
                err.code = '23505'; // Simulando o código de erro para consistência
                throw err;
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

// ROTA PARA REMOVER UM LIVRO DE UMA ESTANTE (Nenhuma mudança necessária aqui, já era compatível)
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