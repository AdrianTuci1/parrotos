package assetstore

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"cloud.google.com/go/storage"
)

// GCS stores assets in a Google Cloud Storage bucket. Objects are signed with V4 signatures, so
// the credentials behind the bucket handle need the iam.serviceAccounts.signBlob permission (see
// the signer option when the client is created).
type GCS struct {
	bucket *storage.BucketHandle
}

var _ Store = (*GCS)(nil)

// NewGCS wraps an existing bucket handle.
func NewGCS(bucket *storage.BucketHandle) *GCS {
	return &GCS{bucket: bucket}
}

func (g *GCS) Scheme() string { return "gs" }

func (g *GCS) BucketName() string { return g.bucket.BucketName() }

func (g *GCS) SignedUploadURL(_ context.Context, objectPath string, maxSize int64, expiry time.Duration) (string, map[string]string, error) {
	headers := gcsUploadHeaders(maxSize)
	signingHeaders := make([]string, 0, len(headers))
	for k, v := range headers {
		signingHeaders = append(signingHeaders, fmt.Sprintf("%s:%s", k, v))
	}

	signedURL, err := g.bucket.SignedURL(objectPath, &storage.SignedURLOptions{
		Scheme:  storage.SigningSchemeV4,
		Method:  "PUT",
		Headers: signingHeaders,
		Expires: time.Now().Add(expiry),
	})
	if err != nil {
		return "", nil, err
	}
	return signedURL, headers, nil
}

func (g *GCS) SignedDownloadURL(_ context.Context, objectPath string, expiry time.Duration) (string, error) {
	return g.bucket.SignedURL(objectPath, &storage.SignedURLOptions{
		Scheme:  storage.SigningSchemeV4,
		Method:  "GET",
		Expires: time.Now().Add(expiry),
	})
}

func (g *GCS) NewReader(ctx context.Context, objectPath string) (io.ReadCloser, error) {
	return g.bucket.Object(objectPath).NewReader(ctx)
}

func (g *GCS) Delete(ctx context.Context, objectPath string) error {
	err := g.bucket.Object(objectPath).Delete(ctx)
	if errors.Is(err, storage.ErrObjectNotExist) {
		return nil
	}
	return err
}

// gcsUploadHeaders are the headers to sign into an upload URL. The content-length-range header is
// part of the signature, so the bucket itself rejects an upload larger than maxSize.
func gcsUploadHeaders(maxSize int64) map[string]string {
	return map[string]string{
		"Content-Type":                "application/octet-stream",
		"x-goog-content-length-range": fmt.Sprintf("1,%d", maxSize),
	}
}
