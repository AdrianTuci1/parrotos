package admin

import (
	"testing"

	"github.com/kelseyhightower/envconfig"
)

// The S3 variable names are part of the deployment's configuration contract, so they are pinned
// here: envconfig derives names from the Go field names, and a rename would silently stop reading
// a variable that .env.example still documents.
func TestAssetsConfigFromEnvironment(t *testing.T) {
	t.Setenv("STATSPARROT_ADMIN_ASSETS_DRIVER", "s3")
	t.Setenv("STATSPARROT_ADMIN_ASSETS_BUCKET", "my-bucket")
	t.Setenv("STATSPARROT_ADMIN_ASSETS_S3_REGION", "auto")
	t.Setenv("STATSPARROT_ADMIN_ASSETS_S3_ENDPOINT", "https://account.r2.cloudflarestorage.com")
	t.Setenv("STATSPARROT_ADMIN_ASSETS_S3_ACCESS_KEY_ID", "access-key")
	t.Setenv("STATSPARROT_ADMIN_ASSETS_S3_SECRET_ACCESS_KEY", "secret-key")
	t.Setenv("STATSPARROT_ADMIN_ASSETS_S3_FORCE_PATH_STYLE", "true")

	var conf Config
	if err := envconfig.Process("statsparrot_admin", &conf); err != nil {
		t.Fatalf("envconfig: %v", err)
	}

	if conf.AssetsDriver != "s3" {
		t.Errorf("AssetsDriver = %q, want %q", conf.AssetsDriver, "s3")
	}
	if conf.AssetsBucket != "my-bucket" {
		t.Errorf("AssetsBucket = %q", conf.AssetsBucket)
	}
	if conf.AssetsS3Region != "auto" {
		t.Errorf("AssetsS3Region = %q", conf.AssetsS3Region)
	}
	if conf.AssetsS3Endpoint != "https://account.r2.cloudflarestorage.com" {
		t.Errorf("AssetsS3Endpoint = %q", conf.AssetsS3Endpoint)
	}
	if conf.AssetsS3AccessKeyID != "access-key" {
		t.Errorf("AssetsS3AccessKeyID = %q", conf.AssetsS3AccessKeyID)
	}
	if conf.AssetsS3SecretAccessKey != "secret-key" {
		t.Errorf("AssetsS3SecretAccessKey = %q", conf.AssetsS3SecretAccessKey)
	}
	if !conf.AssetsS3ForcePathStyle {
		t.Error("AssetsS3ForcePathStyle is false")
	}
}

// Google Cloud Storage stays the default so that an existing deployment that sets nothing but
// STATSPARROT_ADMIN_ASSETS_BUCKET keeps working.
func TestAssetsDriverDefaultsToGCS(t *testing.T) {
	t.Setenv("STATSPARROT_ADMIN_ASSETS_DRIVER", "")

	var conf Config
	if err := envconfig.Process("statsparrot_admin", &conf); err != nil {
		t.Fatalf("envconfig: %v", err)
	}
	if conf.AssetsDriver != "gcs" {
		t.Errorf("AssetsDriver = %q, want %q", conf.AssetsDriver, "gcs")
	}
}
