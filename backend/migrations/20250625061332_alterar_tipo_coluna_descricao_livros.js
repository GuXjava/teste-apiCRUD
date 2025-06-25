// Dentro do novo arquivo de migration

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('Livros', function(table) {
    // Altera a coluna para o tipo TEXT, que suporta textos longos
    table.text('descricao').alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Esta função reverte a mudança, caso precisemos
  return kn.schema.alterTable('Livros', function(table) {
    table.string('descricao', 255).alter();
  });
};