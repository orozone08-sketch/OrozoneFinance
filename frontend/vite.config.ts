import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const workerProxy={
  target:"http://127.0.0.1:8787",
  changeOrigin:true,
  configure(proxy:any){
    proxy.on("proxyReq",(proxyReq:any,req:any)=>{
      const origin=req.headers.origin;
      if(origin==="http://localhost:5173"||origin==="http://127.0.0.1:5173") proxyReq.setHeader("Origin","http://127.0.0.1:8787");
    });
  }
};
export default defineConfig({ plugins: [react()], server: { port: 5173, strictPort:true, proxy: { "/api":workerProxy,"/auth":workerProxy } } });
