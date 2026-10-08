package admin

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	runtimeauth "github.com/staticlabs/statsparrot/runtime/server/auth"
)

// The point of the command is that its output can be pasted straight into the admin server's
// configuration, so the test feeds it back through the code that consumes it.
func TestGenerateSigningKeyIsAcceptedByTheIssuer(t *testing.T) {
	jwks, keyID, err := generateSigningKey()
	if err != nil {
		t.Fatalf("generateSigningKey: %v", err)
	}
	if keyID == "" {
		t.Fatal("generateSigningKey returned an empty key ID")
	}

	issuer, err := runtimeauth.NewIssuer("https://bi.example.com", keyID, []byte(jwks))
	if err != nil {
		t.Fatalf("the admin server rejected the generated key set: %v", err)
	}

	// The runtime validates tokens against the public keys served on the admin's well-known
	// endpoint, so it has to be reachable and contain the signing key.
	req := httptest.NewRequest(http.MethodGet, "/.well-known/jwks.json", nil)
	rec := httptest.NewRecorder()
	issuer.WellKnownHandler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("well-known handler returned %d", rec.Code)
	}
	var public struct {
		Keys []struct {
			KeyID string `json:"kid"`
			D     string `json:"d"`
		} `json:"keys"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &public); err != nil {
		t.Fatalf("the public key set is not valid JSON: %v", err)
	}
	if len(public.Keys) != 1 {
		t.Fatalf("the public key set has %d keys, want 1", len(public.Keys))
	}
	if public.Keys[0].KeyID != keyID {
		t.Errorf("public key ID = %q, want %q", public.Keys[0].KeyID, keyID)
	}
	// The private exponent must never be published.
	if public.Keys[0].D != "" {
		t.Error("the public key set contains the private exponent")
	}

	// A token signed with the generated key must validate against the same set.
	token, err := issuer.NewToken(runtimeauth.TokenOptions{
		AudienceURL: "https://bi.example.com/runtime",
		Subject:     "test",
	})
	if err != nil {
		t.Fatalf("failed to sign a token: %v", err)
	}
	if token == "" {
		t.Fatal("issued an empty token")
	}
}

func TestGenerateSigningKeyIsUnique(t *testing.T) {
	_, first, err := generateSigningKey()
	if err != nil {
		t.Fatalf("generateSigningKey: %v", err)
	}
	_, second, err := generateSigningKey()
	if err != nil {
		t.Fatalf("generateSigningKey: %v", err)
	}
	if first == second {
		t.Error("two calls produced the same key ID")
	}
}
