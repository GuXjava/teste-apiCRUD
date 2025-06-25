// backend/migrations/..._adicionar_pk_a_livros_estante.js

exports.up = function(knex) {
  return knex.schema.alterTable('Livros_Estante', function(table) {
    // Adiciona uma coluna de ID primário que se auto-incrementa
    table.increments('id_associacao').primary();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('Livros_Estante', function(table) {
    table.dropColumn('id_associacao');
  });
};