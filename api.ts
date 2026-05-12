// api.ts
import todo from "./core.ts";

const indexFile = Bun.file("./public/index.html");

// Função helper para respostas estáticas com cache
function staticFileResponse(file: Bun.BunFile) {
  return new Response(file, {
    headers: {
      // Cache por 1 hora no navegador
      "Cache-Control": "public, max-age=3600",

      // Tipo do conteúdo
      "Content-Type": file.type || "text/html",

      // Última modificação do arquivo
      "Last-Modified": new Date(file.lastModified).toUTCString(),

      // ETag simples baseada no tamanho + data
      "ETag": `"${file.size}-${file.lastModified}"`,
    },
  });
}

const server = Bun.serve({
  port: 3000,

  routes: {

    // Página inicial com cache
    "/": staticFileResponse(indexFile),

    "/api/todo": {

      GET: async () => {
        const items = await todo.getItems();

        return Response.json(items, {
          headers: {
            // APIs geralmente usam cache curto ou nenhum
            "Cache-Control": "no-store",
          },
        });
      },

      POST: async (req) => {
        const data = await req.json() as any;
        const item = data.item || null;

        if (!item)
          return Response.json(
            'Por favor, forneça um item para adicionar.',
            { status: 400 }
          );

        await todo.addItem(item);

        return Response.json(data);
      },
    },

    "/api/todo/:index": {

      PUT: async (req) => {
        const index = parseInt(req.params.index);

        if (isNaN(index))
          return Response.json(
            'Índice inválido. um número inteiro é esperado.',
            { status: 400 }
          );

        const data = await req.json() as any;
        const newItem = data.newItem || null;

        if (!newItem)
          return Response.json(
            'Por favor, forneça um novo item para atualizar.',
            { status: 400 }
          );

        try {
          await todo.updateItem(index, newItem);

          return Response.json(
            `Item no índice ${index} atualizado para "${newItem}".`
          );

        } catch (error: any) {
          return Response.json(error.message, { status: 400 });
        }
      },

      DELETE: async (req) => {
        const index = parseInt(req.params.index);

        if (isNaN(index))
          return Response.json('Índice inválido.', { status: 400 });

        try {
          await todo.removeItem(index);

          return Response.json(
            `Item no índice ${index} removido com sucesso.`
          );

        } catch (error: any) {
          return Response.json(error.message, { status: 400 });
        }
      },
    },
  },

  async fetch(req) {
    return new Response(`Not Found`, { status: 404 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);