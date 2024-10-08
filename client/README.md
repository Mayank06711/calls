# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

// to get ssl certificates
// 1 generate a private key
//1>openssl genrsa -out key.pem
// 2 create csr(certificate signing request)
//2>openssl req -new -key key.pem -out csr.pem
//3 generate ssl certificate using csr after getting ssl certificate we can delete csr.pem file it
//3>  openssl x509 -req -days 20 -in csr.pem -signkey key.pem -out cert.pem