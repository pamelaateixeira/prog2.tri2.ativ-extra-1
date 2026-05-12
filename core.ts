// core.ts
// Camada de lógica da aplicação
// Responsável por:
// - Ler os dados do disco
// - Salvar alterações
// - Manipular a lista de tarefas
// - Fazer cache em memória para evitar leitura desnecessária

const DB_PATH = "./data/todos.json";

// Tempo de cache em memória (ms)
const CACHE_TTL = 5000; // 5 segundos

type TodoItem = string;

interface Cache {
  data: TodoItem[];
  loadedAt: number;
}

// Cache em memória
let cache: Cache | null = null;

/**
 * Garante que o arquivo exista
 */
async function ensureFile() {
  const file = Bun.file(DB_PATH);

  if (!(await file.exists())) {
    await Bun.write(DB_PATH, JSON.stringify([], null, 2));
  }
}

/**
 * Lê os itens do disco
 */
async function readFromDisk(): Promise<TodoItem[]> {
  await ensureFile();

  const file = Bun.file(DB_PATH);

  try {
    const text = await file.text();

    if (!text.trim()) {
      return [];
    }

    return JSON.parse(text);

  } catch {
    return [];
  }
}

/**
 * Salva os itens no disco
 */
async function saveToDisk(items: TodoItem[]) {
  await Bun.write(DB_PATH, JSON.stringify(items, null, 2));

  // Atualiza cache após salvar
  cache = {
    data: items,
    loadedAt: Date.now(),
  };
}

/**
 * Verifica se o cache ainda é válido
 */
function isCacheValid() {
  if (!cache) return false;

  return (Date.now() - cache.loadedAt) < CACHE_TTL;
}

export default {

  /**
   * Retorna todos os itens
   * Usa cache em memória quando possível
   */
  async getItems(): Promise<TodoItem[]> {

    // Cache HIT
    if (isCacheValid()) {
      return cache!.data;
    }

    // Cache MISS
    const items = await readFromDisk();

    cache = {
      data: items,
      loadedAt: Date.now(),
    };

    return items;
  },

  /**
   * Adiciona novo item
   */
  async addItem(item: string) {

    const items = await this.getItems();

    items.push(item);

    await saveToDisk(items);
  },

  /**
   * Atualiza item existente
   */
  async updateItem(index: number, newItem: string) {

    const items = await this.getItems();

    if (index < 0 || index >= items.length) {
      throw new Error("Index fora dos limites.");
    }

    items[index] = newItem;

    await saveToDisk(items);
  },

  /**
   * Remove item da lista
   */
  async removeItem(index: number) {

    const items = await this.getItems();

    if (index < 0 || index >= items.length) {
      throw new Error("Index fora dos limites.");
    }

    items.splice(index, 1);

    await saveToDisk(items);
  },

  /**
   * Limpa cache manualmente
   */
  clearCache() {
    cache = null;
  },

  /**
   * Força reload do disco
   */
  async reload() {

    const items = await readFromDisk();

    cache = {
      data: items,
      loadedAt: Date.now(),
    };

    return items;
  }
};