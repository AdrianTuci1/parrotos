package assetstore

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Config configures an S3-compatible store. It works with AWS S3, Cloudflare R2, MinIO and
// anything else that speaks the S3 API.
type S3Config struct {
	// Bucket that holds the assets.
	Bucket string

	// Region is required. R2 uses "auto"; MinIO accepts any value.
	Region string

	// Endpoint overrides the AWS endpoint. Set it for R2 and MinIO; leave it empty for AWS S3.
	Endpoint string

	// AccessKeyID and SecretAccessKey are optional. When they are empty the AWS SDK's own
	// credential chain is used, which covers environment variables, a shared config file and an
	// instance role.
	AccessKeyID     string
	SecretAccessKey string

	// ForcePathStyle addresses objects as <endpoint>/<bucket>/<object>. MinIO needs it; S3 and
	// R2 work with either style.
	ForcePathStyle bool
}

// S3 stores assets in an S3-compatible bucket using V4 pre-signed URLs, so uploads and downloads
// go straight between the client and the bucket.
type S3 struct {
	bucket  string
	client  *s3.Client
	presign *s3.PresignClient
}

var _ Store = (*S3)(nil)

// NewS3 builds a store from the configuration. It does not reach the network: the first request
// does.
func NewS3(ctx context.Context, conf S3Config) (*S3, error) {
	if conf.Bucket == "" {
		return nil, fmt.Errorf("assets bucket is empty")
	}
	if conf.Region == "" {
		return nil, fmt.Errorf("assets bucket region is empty (use \"auto\" for Cloudflare R2)")
	}

	loadOpts := []func(*awsconfig.LoadOptions) error{awsconfig.WithRegion(conf.Region)}
	if conf.AccessKeyID != "" || conf.SecretAccessKey != "" {
		if conf.AccessKeyID == "" || conf.SecretAccessKey == "" {
			return nil, fmt.Errorf("assets bucket access key and secret access key must be set together")
		}
		loadOpts = append(loadOpts, awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(conf.AccessKeyID, conf.SecretAccessKey, ""),
		))
	}

	cfg, err := awsconfig.LoadDefaultConfig(ctx, loadOpts...)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		if conf.Endpoint != "" {
			o.BaseEndpoint = aws.String(conf.Endpoint)
		}
		o.UsePathStyle = conf.ForcePathStyle
	})

	return &S3{
		bucket:  conf.Bucket,
		client:  client,
		presign: s3.NewPresignClient(client),
	}, nil
}

func (s *S3) Scheme() string { return "s3" }

func (s *S3) BucketName() string { return s.bucket }

// SignedUploadURL returns a pre-signed PUT URL.
//
// maxSize is not used. A V4 query signature cannot carry a size condition the way a Google Cloud
// Storage signature can, so the limit is the caller's check on the declared upload size. An S3
// POST policy could enforce it, but that changes the upload from a PUT to a multipart form.
func (s *S3) SignedUploadURL(ctx context.Context, objectPath string, _ int64, expiry time.Duration) (string, map[string]string, error) {
	req, err := s.presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(objectPath),
	}, s3.WithPresignExpires(expiry))
	if err != nil {
		return "", nil, err
	}
	return req.URL, requiredHeaders(req.SignedHeader), nil
}

func (s *S3) SignedDownloadURL(ctx context.Context, objectPath string, expiry time.Duration) (string, error) {
	req, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(objectPath),
	}, s3.WithPresignExpires(expiry))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

func (s *S3) NewReader(ctx context.Context, objectPath string) (io.ReadCloser, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(objectPath),
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

// Delete removes an object. S3 reports success whether or not the object was there, so a missing
// object is not an error.
func (s *S3) Delete(ctx context.Context, objectPath string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(objectPath),
	})
	return err
}

// requiredHeaders turns the headers the signature expects into the map the client has to send.
// Host is dropped: every HTTP client derives it from the URL and browsers refuse to let a request
// set it.
func requiredHeaders(h http.Header) map[string]string {
	headers := make(map[string]string, len(h))
	for k, vs := range h {
		if strings.EqualFold(k, "host") || len(vs) == 0 {
			continue
		}
		headers[k] = strings.Join(vs, ", ")
	}
	return headers
}
