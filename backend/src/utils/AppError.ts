/**
 * Erro seguro para expor ao cliente. Qualquer erro que NÃO seja um AppError
 * (ex.: erro do driver Oracle, exceção inesperada) é tratado pelo
 * errorHandler como falha interna genérica — o detalhe técnico só vai pro log.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly publicMessage: string;

  constructor(statusCode: number, publicMessage: string) {
    super(publicMessage);
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Usuário ou senha inválidos.') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Você não tem permissão para acessar este recurso.') {
    super(403, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos.') {
    super(400, message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Muitas tentativas. Tente novamente em alguns minutos.') {
    super(429, message);
  }
}
