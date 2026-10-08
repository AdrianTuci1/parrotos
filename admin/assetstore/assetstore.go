// Package assetstore is the object storage that holds organization assets: branding images and
// the project archives uploaded with `statsparrot deploy`.
//
// The backend is chosen at startup from the deployment's configuration. Asset paths are recorded
// in the database as URLs of the form "<scheme>://<bucket>/<object>", so nothing outside this
// package has to know which backend is in use.
package assetstore

import (
	"context"
	"io"
	"net/url"
	"strings"
	"time"
)

// Store is the object storage backend.
type Store interface {
	// Scheme is the URL scheme used in asset paths, such as "gs" or "s3".
	Scheme() string

	// BucketName is the bucket the store reads from and writes to.
	BucketName() string

	// SignedUploadURL returns a URL the browser uploads an object to with a PUT, and the headers
	// it has to send with that request. Backends that can constrain the upload in the signature
	// reject anything larger than maxSize; the others leave the limit to the caller.
	SignedUploadURL(ctx context.Context, objectPath string, maxSize int64, expiry time.Duration) (string, map[string]string, error)

	// SignedDownloadURL returns a URL for reading an object.
	SignedDownloadURL(ctx context.Context, objectPath string, expiry time.Duration) (string, error)

	// NewReader opens an object for reading.
	NewReader(ctx context.Context, objectPath string) (io.ReadCloser, error)

	// Delete removes an object. Removing an object that no longer exists is not an error.
	Delete(ctx context.Context, objectPath string) error
}

// ObjectPath returns the path of an object inside its bucket, given an asset URL of the form
// "<scheme>://<bucket>/<object>".
func ObjectPath(u *url.URL) string {
	return strings.TrimPrefix(u.Path, "/")
}
