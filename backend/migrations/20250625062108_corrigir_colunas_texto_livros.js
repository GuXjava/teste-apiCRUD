// Dentro do novo arquivo ...corrigir_colunas_texto_livros.js

exports.up = function(knex) {
  return knex.schema.alterTable('Livros', function(table) {
    // Altera as colunas para o tipo TEXT, que suporta textos longos
    table.text('descricao').alter();
    table.text('capa_url').alter(); 
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('Livros', function(table) {
    // Reverte para varchar(255) em caso de rollback
    table.string('descricao', 255).alter();
    table.string('capa_url', 255).alter();
  });
};