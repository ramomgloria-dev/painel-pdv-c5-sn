export interface AuthenticatedUser {
  codusuario: string;
  nome: string;
  isAdmin: boolean;
  origem: 'CONSINCO' | 'LOCAL';
}

export interface AccessTokenPayload {
  sub: string; // codusuario
  nome: string;
  isAdmin: boolean;
  origem: 'CONSINCO' | 'LOCAL';
}
