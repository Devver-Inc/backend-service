import { FlattenedJWSInput, JSONWebKeySet, JWSHeaderParameters } from 'jose';
export type Jwks = {
    (protectedHeader?: JWSHeaderParameters, token?: FlattenedJWSInput): Promise<CryptoKey>;
    coolingDown: boolean;
    fresh: boolean;
    reloading: boolean;
    reload: () => Promise<void>;
    jwks: () => JSONWebKeySet | undefined;
};
export type JwksUris = {
    jwksUri: string;
    issuerUri: string;
};
