import { Issuer, generators } from "openid-client";
import config from "../config";

let keycloakIssuer: any;
let keycloakClient: any;

export async function initKeycloak() {
  keycloakIssuer = await Issuer.discover("http://keycloak:4000/realms/master");

  keycloakClient = new keycloakIssuer.Client({
    client_id: config.keycloackId,        // instagram-backend
    client_secret: config.keycloackSecret,
    redirect_uris: ["http://localhost:8000/api/v1/auth/keycloak/callback"],
    response_types: ["code"],
  });

  console.log("Keycloak Initialized");
}

export { keycloakClient };
