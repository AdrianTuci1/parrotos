package assetstore

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"
)

func assetURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("failed to parse %q: %v", raw, err)
	}
	return u
}

func TestObjectPath(t *testing.T) {
	cases := []struct {
		raw  string
		want string
	}{
		{"gs://my-bucket/deploy/org__proj__id.tar.gz", "deploy/org__proj__id.tar.gz"},
		{"s3://my-bucket/image/org__logo__id.png", "image/org__logo__id.png"},
		{"gs://my-bucket/", ""},
	}
	for _, c := range cases {
		if got := ObjectPath(assetURL(t, c.raw)); got != c.want {
			t.Errorf("ObjectPath(%q) = %q, want %q", c.raw, got, c.want)
		}
	}
}

func TestGCSUploadHeaders(t *testing.T) {
	headers := gcsUploadHeaders(1024)
	if headers["Content-Type"] != "application/octet-stream" {
		t.Errorf("Content-Type = %q", headers["Content-Type"])
	}
	if headers["x-goog-content-length-range"] != "1,1024" {
		t.Errorf("x-goog-content-length-range = %q", headers["x-goog-content-length-range"])
	}
}

func TestNewS3RejectsIncompleteConfig(t *testing.T) {
	ctx := context.Background()
	if _, err := NewS3(ctx, S3Config{Region: "auto"}); err == nil {
		t.Error("expected an error for an empty bucket")
	}
	if _, err := NewS3(ctx, S3Config{Bucket: "b"}); err == nil {
		t.Error("expected an error for an empty region")
	}
	if _, err := NewS3(ctx, S3Config{Bucket: "b", Region: "auto", AccessKeyID: "key"}); err == nil {
		t.Error("expected an error for an access key without a secret")
	}
}

func newTestS3(t *testing.T) *S3 {
	t.Helper()
	s, err := NewS3(context.Background(), S3Config{
		Bucket:          "my-bucket",
		Region:          "auto",
		Endpoint:        "https://account.r2.cloudflarestorage.com",
		AccessKeyID:     "access-key",
		SecretAccessKey: "secret-key",
	})
	if err != nil {
		t.Fatalf("NewS3: %v", err)
	}
	return s
}

func TestS3Surface(t *testing.T) {
	s := newTestS3(t)
	if s.Scheme() != "s3" {
		t.Errorf("Scheme() = %q", s.Scheme())
	}
	if s.BucketName() != "my-bucket" {
		t.Errorf("BucketName() = %q", s.BucketName())
	}
}

func TestS3SignedUploadURL(t *testing.T) {
	s := newTestS3(t)
	signedURL, headers, err := s.SignedUploadURL(context.Background(), "image/logo.png", 3<<20, 15*time.Minute)
	if err != nil {
		t.Fatalf("SignedUploadURL: %v", err)
	}

	// The SDK uses virtual-hosted addressing by default: the bucket is a host label and the
	// object path is relative to it.
	u := assetURL(t, signedURL)
	if u.Host != "my-bucket.account.r2.cloudflarestorage.com" {
		t.Errorf("host = %q", u.Host)
	}
	if u.Path != "/image/logo.png" {
		t.Errorf("path = %q", u.Path)
	}
	if u.Query().Get("X-Amz-Signature") == "" {
		t.Error("the URL is not signed")
	}

	// The signature covers only the host, so a client must not send any header of its own.
	for k := range headers {
		if strings.EqualFold(k, "host") {
			t.Errorf("upload headers contain %q; browsers refuse to set it", k)
		}
	}
}

func TestS3SignedDownloadURL(t *testing.T) {
	s := newTestS3(t)
	signedURL, err := s.SignedDownloadURL(context.Background(), "deploy/archive.tar.gz", 15*time.Minute)
	if err != nil {
		t.Fatalf("SignedDownloadURL: %v", err)
	}
	u := assetURL(t, signedURL)
	if u.Path != "/deploy/archive.tar.gz" {
		t.Errorf("path = %q", u.Path)
	}
	if u.Query().Get("X-Amz-Signature") == "" {
		t.Error("the URL is not signed")
	}
}

func TestRequiredHeaders(t *testing.T) {
	headers := requiredHeaders(http.Header{
		"Host":         {"bucket.example.com"},
		"Content-Type": {"application/octet-stream"},
		"Empty":        {},
	})
	if _, ok := headers["Host"]; ok {
		t.Error("Host must be dropped")
	}
	if headers["Content-Type"] != "application/octet-stream" {
		t.Errorf("Content-Type = %q", headers["Content-Type"])
	}
	if _, ok := headers["Empty"]; ok {
		t.Error("an empty header must be dropped")
	}
}
