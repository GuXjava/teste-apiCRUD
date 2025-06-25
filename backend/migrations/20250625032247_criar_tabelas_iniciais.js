// dentro do arquivo da migration (ex: /migrations/20250625_criar_tabelas.js)
exports.up = function(knex) {
  return knex.schema
    .createTable('Estantes', function(table) {
      table.increments('id_estante').primary();
      table.string('nome_estante', 255).notNullable().unique();
    })
    .createTable('Livros', function(table) {
      table.increments('id_livro').primary();
      table.string('google_book_id').notNullable().unique();
      table.string('titulo').notNullable();
      table.string('autores');
      table.string('capa_url');
      table.text('descricao');
    })
    .createTable('Livros_Estante', function(table) {
      table.primary(['id_livro_fk', 'id_estante_fk']);

      table.integer('id_livro_fk').unsigned().notNullable()
           .references('id_livro').inTable('Livros').onDelete('CASCADE');

      table.integer('id_estante_fk').unsigned().notNullable()
           .references('id_estante').inTable('Estantes').onDelete('CASCADE');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('Livros_Estante')
    .dropTableIfExists('Livros')
    .dropTableIfExists('Estantes');
};