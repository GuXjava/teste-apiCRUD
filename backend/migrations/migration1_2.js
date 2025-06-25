// Dentro do novo arquivo de migration

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('Livros', function(table) {
    // Altera as colunas para o tipo TEXT, que suporta textos longos
    table.text('titulo').alter();
    table.text('autores').alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Esta função reverte a mudança, caso precisemos dar um passo atrás
  return knex.schema.alterTable('Livros', function(table) {
    table.string('titulo', 255).alter();
    table.string('autores', 255).alter();
  });
};