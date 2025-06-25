// frontend/config.js

const environments = {
  // Para quando você rodar o site no seu PC
  development: {
    apiUrl: 'http://localhost:3000' // Sua API local
  },
  // Para quando o site estiver no ar no Render
  production: {
    apiUrl: 'https://livraria-api.onrender.com' // !!! COLOQUE A URL REAL DA SUA API AQUI !!!
  }
};

// Detecta se estamos no Render ou não
const isProduction = window.location.hostname.includes('onrender.com');

// Define a URL da API a ser usada
window.API_URL = (isProduction ? environments.production : environments.development).apiUrl;

console.log(`Ambiente detectado: ${isProduction ? 'Produção' : 'Desenvolvimento'}`);
console.log(`URL da API: ${window.API_URL}`);