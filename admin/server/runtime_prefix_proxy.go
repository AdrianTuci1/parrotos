package server

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/staticlabs/statsparrot/runtime/pkg/httputil"
)

// hopByHopHeaders are connection-specific headers that must not be forwarded by a proxy.
// See RFC 7230, section 6.1.
var hopByHopHeaders = []string{
	"Connection",
	"Keep-Alive",
	"Proxy-Authenticate",
	"Proxy-Authorization",
	"Proxy-Connection",
	"Te",
	"Trailer",
	"Transfer-Encoding",
	"Upgrade",
}

// runtimeInternalPaths are paths the runtime serves for operators and that are not part of
// its API. The runtime does not authenticate them, so they must not become reachable on the
// public origin just because the runtime is proxied there. Operators scrape the runtime's own
// listener instead.
var runtimeInternalPaths = []string{"/metrics", "/debug/"}

// runtimePrefixProxy proxies requests below a path prefix to a runtime host. It lets the
// admin server expose project runtimes on its own origin, for example
// https://app.example.com/runtime, so the browser reaches every project's runtime without
// per-project hostnames, extra TLS certificates or cross-origin requests.
//
// The Authorization header is forwarded untouched. The browser holds a runtime JWT issued
// by the admin service (GetDeploymentCredentials, GetProject), and the runtime validates
// that token against the admin as its issuer.
func (s *Server) runtimePrefixProxy(w http.ResponseWriter, r *http.Request) error {
	target, err := url.Parse(s.opts.RuntimeProxyTarget)
	if err != nil {
		return httputil.Errorf(http.StatusInternalServerError, "invalid runtime proxy target: %v", err)
	}
	if target.Scheme == "" || target.Host == "" {
		return httputil.Errorf(http.StatusInternalServerError, "runtime proxy target must be an absolute URL, got %q", s.opts.RuntimeProxyTarget)
	}

	upstreamPath := "/" + strings.TrimPrefix(r.PathValue("path"), "/")
	for _, internal := range runtimeInternalPaths {
		if strings.HasPrefix(upstreamPath, internal) {
			return httputil.Errorf(http.StatusNotFound, "not found")
		}
	}

	// The prefix is stripped: the runtime always serves its API from the root.
	proxyURL := target.JoinPath(strings.TrimPrefix(upstreamPath, "/"))
	proxyURL.RawQuery = r.URL.RawQuery

	req, err := http.NewRequestWithContext(r.Context(), r.Method, proxyURL.String(), r.Body)
	if err != nil {
		return httputil.Error(http.StatusInternalServerError, err)
	}
	for k, v := range r.Header {
		req.Header[k] = v
	}
	for _, h := range hopByHopHeaders {
		req.Header.Del(h)
	}
	// The upstream request is same-origin as far as the browser is concerned, so neither
	// the inbound Origin nor the internal Host header should leak to the runtime.
	req.Header.Del("Origin")
	req.Header.Set("X-Original-URI", r.RequestURI)
	req.Host = target.Host

	return proxyRoundTrip(w, req)
}

// clientRuntimeHost rewrites a deployment's runtime host into the URL that browsers should
// use. When the admin server proxies runtimes on its own origin (RuntimePublicURL), all
// deployments are reachable through that single URL; otherwise the host is returned as is.
//
// Only client-facing responses use this. Server-to-server calls (see runtimeProxyForOrgAndProject)
// keep using the internal host from the database.
func (s *Server) clientRuntimeHost(internalHost string) string {
	if s.opts.RuntimePublicURL != "" {
		return s.opts.RuntimePublicURL
	}
	return internalHost
}

// runtimeProxyPrefix returns the path prefix under which the runtime is proxied, in the
// form "/prefix/".
func (s *Server) runtimeProxyPrefix() string {
	prefix := strings.Trim(s.opts.RuntimeProxyPrefix, "/")
	if prefix == "" {
		prefix = "runtime"
	}
	return fmt.Sprintf("/%s/", prefix)
}
