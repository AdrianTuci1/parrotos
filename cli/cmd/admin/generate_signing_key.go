package admin

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"

	"github.com/go-jose/go-jose/v3"
	"github.com/spf13/cobra"
	"github.com/staticlabs/statsparrot/cli/pkg/cmdutil"
)

// GenerateSigningKeyCmd generates the RSA key pair the admin server uses to sign the runtime
// tokens it hands to browsers.
//
// The key is printed rather than written to a file: it is a deployment secret, and where a
// secret is stored is the operator's decision (a container secret, a password manager, an
// environment file on the host).
func GenerateSigningKeyCmd(ch *cmdutil.Helper) *cobra.Command {
	return &cobra.Command{
		Use:   "generate-signing-key",
		Short: "Generate an RSA key pair for signing runtime tokens",
		Long: `Generate an RSA key pair for signing runtime tokens.

Prints two environment variables to set on the admin server:

  STATSPARROT_ADMIN_SIGNING_JWKS    the private JWKS (all keys, including the signing key)
  STATSPARROT_ADMIN_SIGNING_KEY_ID  the key ID of the key to sign with

The runtime fetches the corresponding public keys from
{STATSPARROT_ADMIN_EXTERNAL_URL}/.well-known/jwks.json, so the two must agree.

Keep the output secret and stable: rotating it invalidates every token the admin has already
issued. To rotate, generate a new key and keep both in the JWKS.`,
		Args: cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			jwks, keyID, err := generateSigningKey()
			if err != nil {
				return err
			}
			ch.Printf("STATSPARROT_ADMIN_SIGNING_JWKS=%s\n", jwks)
			ch.Printf("STATSPARROT_ADMIN_SIGNING_KEY_ID=%s\n", keyID)
			return nil
		},
	}
}

func generateSigningKey() (jwksJSON string, keyID string, err error) {
	// 2048 bits matches what the runtime's own ephemeral issuer uses.
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate an RSA key: %w", err)
	}

	// The key ID is the JWK thumbprint, which is what the runtime's dev issuer does and what
	// the admin server expects to look up in the set.
	jwk := jose.JSONWebKey{
		Key:       key,
		Algorithm: string(jose.RS256),
		Use:       "sig",
	}
	thumbprint, err := jwk.Thumbprint(crypto.SHA256)
	if err != nil {
		return "", "", fmt.Errorf("failed to compute the key thumbprint: %w", err)
	}
	jwk.KeyID = base64.URLEncoding.EncodeToString(thumbprint)

	b, err := json.Marshal(jose.JSONWebKeySet{Keys: []jose.JSONWebKey{jwk}})
	if err != nil {
		return "", "", fmt.Errorf("failed to serialize the key set: %w", err)
	}
	return string(b), jwk.KeyID, nil
}
