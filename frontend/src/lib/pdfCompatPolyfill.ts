// pdfjs-dist (usado pelos 4 parsers de PDF: histórico, matrícula, plano de
// ensino e matriz curricular) chama `Promise.withResolvers()` tanto na thread
// principal quanto dentro do worker. Safari/WebKit só ganhou isso na 17.4
// (março/2024) — abaixo disso a leitura do PDF quebra com uma exceção
// genérica, em qualquer navegador do iOS (Chrome pro iOS roda o mesmo motor
// WebKit por exigência da Apple, então falha igual ao Safari). O worker tem
// escopo global próprio, então esse polyfill é aplicado de novo lá via
// `worker.rollupOptions.output.banner` no vite.config.ts.
declare global {
  interface PromiseConstructor {
    withResolvers?<T>(): {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: unknown) => void;
    };
  }
}

if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export {};
