// backend/migrations/..._adicionar_status_livros_estante.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('Livros_Estante', function(table) {
    // Adiciona a nova coluna 'status'
    // defaultTo define 'Quero Ler' como o padrão ao adicionar um livro
    table.string('status', 50).notNullable().defaultTo('Quero Ler');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('Livros_Estante', function(table) {
    // Remove a coluna caso precisemos reverter a migration
    table.dropColumn('status');
  });
};