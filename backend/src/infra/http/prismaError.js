// src/infra/http/prismaError.js
export function prismaErrorToHttp(err) {
  if (!err || !err.code) return null;
  switch (err.code) {
    case 'P2002':
      return { status: 409, code: 'CONFLICT', message: 'Valor já existente para campo único.' };
    case 'P2003':
      return { status: 400, code: 'FK_CONSTRAINT', message: 'Violação de integridade referencial (FK).' };
    case 'P2025':
      return { status: 404, code: 'NOT_FOUND', message: 'Registro não encontrado.' };
    default:
      return { status: 400, code: err.code, message: 'Erro de banco de dados.' };
  }
}
