
export interface Security
{
  type: 'none' | 'httpBasic' | 'httpBearer' | 'apiKey' | 'oauth2';
  name?: string;
  in?: string;
  tokenUrl?: string;
  authorizationUrl?: string;
  scopes?: string;
}
