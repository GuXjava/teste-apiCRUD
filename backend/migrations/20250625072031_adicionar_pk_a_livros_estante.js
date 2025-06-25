// Dentro do novo arquivo de migração que você criou.
// Ex: migrations/20250625_adicionar_pk_a_livros_estante.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('Livros_Estante', function(table) {
    // 1. Remove a chave primária composta antiga.
    // O Knex é inteligente e geralmente encontra pelo nome padrão da constraint.
    table.dropPrimary();

    // 2. Adiciona a nova coluna 'id_associacao' como a chave primária principal.
    // 'increments' cria um ID numérico que se auto-incrementa (SERIAL).
    table.increments('id_associacao').primary();

    // 3. (MUITO IMPORTANTE) Garante que a combinação de livro e estante continue única.
    table.unique(['id_livro_fk', 'id_estante_fk']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('Livros_Estante', function(table) {
    // Desfaz os passos na ordem inversa para permitir o rollback da migração:

    // 3. Remove a restrição de unicidade
    table.dropUnique(['id_livro_fk', 'id_estante_fk']);

    // 2. Remove a coluna 'id_associacao' que criamos
    table.dropColumn('id_associacao');

    // 1. Recria a chave primária composta original
    table.primary(['id_livro_fk', 'id_estante_fk']);
  });
};