package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/golang-jwt/jwt/v5"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	_ "modernc.org/sqlite"
)

// ---- Models ----
type Image struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Type    string `json:"type"`
	SizeMB  int64  `json:"sizeMB"`
	Updated string `json:"updated"`
	File    string `json:"file"` // local filename or s3 key
}

type User struct {
	ID        int64  `json:"id"`
	Email     string `json:"email"`
	Role      string `json:"role"` // admin|operator|viewer
	CreatedAt string `json:"created_at"`
}

// ---- Storage Abstraction ----
type Storage interface {
	Put(ctx context.Context, key string, r io.Reader, size int64) error
	Delete(ctx context.Context, key string) error
	Presign(ctx context.Context, key string, expiry time.Duration) (string, error)
	LocalPath(key string) (string, bool) // returns path and true if local storage
}

// Local storage implementation
type LocalStorage struct {
	Root string
}

func (s *LocalStorage) Put(ctx context.Context, key string, r io.Reader, size int64) error {
	dst := filepath.Join(s.Root, key)
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	out, err := os.Create(dst)
	if err != nil { return err }
	defer out.Close()
	_, err = io.Copy(out, r)
	return err
}
func (s *LocalStorage) Delete(ctx context.Context, key string) error {
	return os.Remove(filepath.Join(s.Root, key))
}
func (s *LocalStorage) Presign(ctx context.Context, key string, expiry time.Duration) (string, error) {
	return "", errors.New("presign not supported for local storage")
}
func (s *LocalStorage) LocalPath(key string) (string, bool) {
	return filepath.Join(s.Root, key), true
}

// S3 storage implementation
type S3Storage struct {
	Client     *minio.Client
	Bucket     string
	UseSSL     bool
	Region     string
}

func (s *S3Storage) Put(ctx context.Context, key string, r io.Reader, size int64) error {
	_, err := s.Client.PutObject(ctx, s.Bucket, key, r, size, minio.PutObjectOptions{})
	return err
}
func (s *S3Storage) Delete(ctx context.Context, key string) error {
	return s.Client.RemoveObject(ctx, s.Bucket, key, minio.RemoveObjectOptions{})
}
func (s *S3Storage) Presign(ctx context.Context, key string, expiry time.Duration) (string, error) {
	reqParams := make(url.Values)
	u, err := s.Client.PresignedGetObject(ctx, s.Bucket, key, expiry, reqParams)
	if err != nil { return "", err }
	return u.String(), nil
}
func (s *S3Storage) LocalPath(key string) (string, bool) { return "", false }

// ---- Server ----
type Server struct {
	DB        *sql.DB
	WebRoot   string
	Store     Storage
	ImageRoot string
	JWTSecret string

	// OIDC
	OIDCEnabled bool
	OIDCIssuer  string
	OAuth2Conf  *oauth2.Config
	OIDCVerifier *oidc.IDTokenVerifier

	Mux *http.ServeMux
}

func main() {
	port := getenv("BOOTAH_HTTP_PORT", "8080")
	webRoot := getenv("BOOTAH_WEB_ROOT", "./webui")
	dbPath := getenv("BOOTAH_DB_PATH", "./data/bootah.db")
	imagesDir := getenv("BOOTAH_IMAGES_DIR", "./data/images")
	jwtSecret := getenv("BOOTAH_JWT_SECRET", "dev-secret-change-me")

	// Storage selection
	storageMode := strings.ToLower(getenv("BOOTAH_STORAGE", "local"))
	var store Storage
	switch storageMode {
	case "s3":
		endpoint := getenv("BOOTAH_S3_ENDPOINT", "")
		access := getenv("BOOTAH_S3_ACCESS_KEY", "")
		secret := getenv("BOOTAH_S3_SECRET_KEY", "")
		region := getenv("BOOTAH_S3_REGION", "us-east-1")
		bucket := getenv("BOOTAH_S3_BUCKET", "bootah")
		useSSL := getenv("BOOTAH_S3_USE_SSL", "true") == "true"
		if endpoint == "" || access == "" || secret == "" {
			log.Fatal("S3 storage selected but S3 env vars not set")
		}
		client, err := minio.New(endpoint, &minio.Options{
			Creds:  credentials.NewStaticV4(access, secret, ""),
			Secure: useSSL,
			Region: region,
		})
		if err != nil { log.Fatalf("minio new: %v", err) }
		ctx := context.Background()
		exists, err := client.BucketExists(ctx, bucket)
		if err != nil { log.Fatalf("check bucket: %v", err) }
		if !exists {
			if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{Region: region}); err != nil {
				log.Fatalf("make bucket: %v", err)
			}
		}
		store = &S3Storage{Client: client, Bucket: bucket, Region: region, UseSSL: useSSL}
	default:
		if err := os.MkdirAll(imagesDir, 0o755); err != nil { log.Fatal(err) }
		store = &LocalStorage{Root: imagesDir}
	}

	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil { log.Fatal(err) }
	db, err := sql.Open("sqlite", dbPath)
	if err != nil { log.Fatalf("open db: %v", err) }
	defer db.Close()
	must(initDB(db))
	must(initAuth(db))
	must(initAudit(db))
	must(initJobs(db))
	must(initDrivers(db))

	issuer := getenv("BOOTAH_OIDC_ISSUER", "")
	clientID := getenv("BOOTAH_OIDC_CLIENT_ID", "")
	clientSecret := getenv("BOOTAH_OIDC_CLIENT_SECRET", "")
	redirectURL := getenv("BOOTAH_OIDC_REDIRECT_URL", "")
	oidcEnabled := issuer != "" && clientID != "" && clientSecret != "" && redirectURL != ""

	s := &Server{
		DB:        db,
		WebRoot:   webRoot,
		Store:     store,
		ImageRoot: imagesDir,
		JWTSecret: jwtSecret,
		OIDCEnabled: oidcEnabled,
		OIDCIssuer:  issuer,
		Mux:       http.NewServeMux(),
	}

	if oidcEnabled {
		ctx := context.Background()
		provider, err := oidc.NewProvider(ctx, issuer)
		if err != nil { log.Fatalf("oidc provider: %v", err) }
		s.OAuth2Conf = &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  redirectURL,
			Endpoint:     provider.Endpoint(),
			Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
		}
		s.OIDCVerifier = provider.Verifier(&oidc.Config{ClientID: clientID})
	}

	s.routes()

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: corsMiddleware(loggingMiddleware(s.Mux)),
	}

	go func() {
		log.Printf("Bootah v8 listening on http://localhost:%s (storage=%s, oidc=%v)", port, storageMode, oidcEnabled)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	log.Println("Bootah stopped")
}

func (s *Server) routes() {
	s.Mux.Handle("/", http.FileServer(http.Dir(s.WebRoot)))

	s.Mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "ts": time.Now()})
	})

	s.authRoutes()
	s.adminUserRoutes()
	s.adminAuditRoutes()
	s.adminStorageRoutes()
	s.winpeRoutes()
	s.driverRoutes()

	s.Mux.HandleFunc("/api/v1/images", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			s.handleListImages(w, r)
		case http.MethodPost:
			if !s.requireRole(w, r, "admin") { return }
			s.handleUploadImage(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	s.Mux.HandleFunc("/api/v1/images/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/v1/images/")
		if path == "" { http.NotFound(w, r); return }
		parts := strings.Split(path, "/")
		id := parts[0]
		if id == "" { http.NotFound(w, r); return }
		if len(parts) == 1 && r.Method == http.MethodDelete {
			if !s.requireRole(w, r, "admin") { return }
			s.handleDeleteImage(w, r, id)
			return
		}
		if len(parts) == 2 && parts[1] == "download" && r.Method == http.MethodGet {
			s.handleDownloadImage(w, r, id)
			return
		}
		http.NotFound(w, r)
	})

	s.Mux.HandleFunc("/ipxe/boot.ipxe", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintf(w, `#!ipxe
set menu-default winpe
:menu
menu Bootah iPXE Menu
item --key w winpe  WinPE (Capture & Deploy)
item --key u ubuntu Ubuntu 24.04 Live (ISO)
item --key q quit   Quit
choose --default %s target && goto ${target}

:winpe
kernel http://${next-server}:/assets/winpe/bootx64.efi
initrd http://${next-server}:/assets/winpe/boot.wim
boot

:ubuntu
kernel http://${next-server}:/assets/ubuntu/vmlinuz
initrd http://${next-server}:/assets/ubuntu/initrd
imgargs vmlinuz initrd=initrd boot=casper netboot=nfs nfsroot=${next-server}:/srv/bootah/images/ubuntu
boot

:quit
exit
`, getenv("BOOTAH_IPXE_DEFAULT", "winpe"))
	})

	if s.OIDCEnabled {
		s.Mux.HandleFunc("/api/auth/oidc/start", s.oidcStart)
		s.Mux.HandleFunc("/api/auth/oidc/callback", s.oidcCallback)
	}
}

func (s *Server) handleListImages(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`SELECT id, name, type, size_mb, updated, file FROM images ORDER BY updated DESC`)
	if err != nil { http.Error(w, err.Error(), 500); return }
	defer rows.Close()
	var out []Image
	for rows.Next() {
		var im Image
		if err := rows.Scan(&im.ID, &im.Name, &im.Type, &im.SizeMB, &im.Updated, &im.File); err != nil {
			http.Error(w, err.Error(), 500); return
		}
		out = append(out, im)
	}
	writeJSON(w, 200, out)
}

func (s *Server) handleUploadImage(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(1 << 31); err != nil {
		http.Error(w, "invalid multipart: "+err.Error(), 400); return
	}
	name := r.FormValue("name")
	fh, hdr, err := getFilePart(r, "file")
	if err != nil { http.Error(w, "file required: "+err.Error(), 400); return }
	defer fh.Close()
	if name == "" { name = hdr.Filename }
	typ := detectType(hdr.Filename)

	id := genID()
	key := id + strings.ToLower(filepath.Ext(hdr.Filename))

	size, err := s.StorePut(r.Context(), key, fh)
	if err != nil { http.Error(w, "store put: "+err.Error(), 500); return }
	now := time.Now().Format("2006-01-02")
	if _, err := s.DB.Exec(`INSERT INTO images (id, name, type, size_mb, updated, file) VALUES (?,?,?,?,?,?)`, id, name, typ, size/(1024*1024), now, key); err != nil {
		http.Error(w, "db insert: "+err.Error(), 500); return
	}
	var actorID *int64 = nil
	if _, c, err := s.verifyAuth(r); err==nil {
		if v,ok := c["sub"].(float64); ok { vv := int64(v); actorID = &vv }
	}
	s.audit(actorID, "upload", "image", map[string]any{"id": id, "name": name, "sizeMB": size/(1024*1024)})
	writeJSON(w, 201, map[string]any{"id": id, "name": name, "type": typ, "sizeMB": size/(1024*1024), "updated": now})
}

func (s *Server) handleDeleteImage(w http.ResponseWriter, r *http.Request, id string) {
	var key string
	err := s.DB.QueryRow(`SELECT file FROM images WHERE id=?`, id).Scan(&key)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) { http.NotFound(w, r); return }
		http.Error(w, err.Error(), 500); return
	}
	_ = s.Store.Delete(r.Context(), key)
	if _, err := s.DB.Exec(`DELETE FROM images WHERE id=?`, id); err != nil {
		http.Error(w, err.Error(), 500); return
	}
	var actorID *int64 = nil
	if _, c, err := s.verifyAuth(r); err==nil {
		if v,ok := c["sub"].(float64); ok { vv := int64(v); actorID = &vv }
	}
	s.audit(actorID, "delete", "image", map[string]any{"id": id})
	writeJSON(w, 200, map[string]any{"deleted": id})
}

func (s *Server) handleDownloadImage(w http.ResponseWriter, r *http.Request, id string) {
	var key, name string
	err := s.DB.QueryRow(`SELECT file, name FROM images WHERE id=?`, id).Scan(&key, &name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) { http.NotFound(w, r); return }
		http.Error(w, err.Error(), 500); return
	}
	if p, ok := s.Store.LocalPath(key); ok {
		f, err := os.Open(p)
		if err != nil { http.Error(w, err.Error(), 500); return }
		defer f.Close()
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", name+filepath.Ext(key)))
		http.ServeContent(w, r, key, time.Now(), f)
		return
	}
	u, err := s.Store.Presign(r.Context(), key, 15*time.Minute)
	if err != nil { http.Error(w, err.Error(), 500); return }
	http.Redirect(w, r, u, http.StatusTemporaryRedirect)
}

func (s *Server) StorePut(ctx context.Context, key string, r io.Reader) (int64, error) {
	pr, pw := io.Pipe()
	var size int64
	go func() { defer pw.Close(); n, _ := io.Copy(pw, r); size = n }()
	if err := s.Store.Put(ctx, key, pr, -1); err != nil { return 0, err }
	return size, nil
}

// ---- Auth ----
func initAuth(db *sql.DB) error {
	ddl := `CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT UNIQUE NOT NULL,
		passhash TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'viewer',
		created_at TEXT NOT NULL
	);`
	if _, err := db.Exec(ddl); err != nil { return err }
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer'`)
	return nil
}

func (s *Server) authRoutes() {
	secret := s.JWTSecret

	s.Mux.HandleFunc("/api/auth/register", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost { http.Error(w, "method not allowed", 405); return }
		var body struct{ Email, Password string }
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, err.Error(), 400); return }
		if strings.TrimSpace(body.Email) == "" || strings.TrimSpace(body.Password) == "" {
			http.Error(w, "email and password required", 400); return
		}
		hash, _ := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
		var cnt int
		_ = s.DB.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&cnt)
		role := "viewer"
		if cnt == 0 { role = "admin" }
		_, err := s.DB.Exec(`INSERT INTO users (email, passhash, role, created_at) VALUES (?,?,?,?)`,
			body.Email, string(hash), role, time.Now().Format(time.RFC3339))
		if err != nil { http.Error(w, "cannot register: "+err.Error(), 400); return }
		writeJSON(w, 201, map[string]any{"ok": true})
	})

	s.Mux.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost { http.Error(w, "method not allowed", 405); return }
		var body struct{ Email, Password string }
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, err.Error(), 400); return }
		var id int64; var passhash, role string
		err := s.DB.QueryRow(`SELECT id, passhash, role FROM users WHERE email=?`, body.Email).Scan(&id, &passhash, &role)
		if err != nil || bcrypt.CompareHashAndPassword([]byte(passhash), []byte(body.Password)) != nil {
			http.Error(w, "invalid credentials", 401); return
		}
		access, refresh, err := s.issueTokens(id, body.Email, role)
		if err != nil { http.Error(w, err.Error(), 500); return }
		http.SetCookie(w, &http.Cookie{Name:"bootah_refresh", Value:refresh, HttpOnly:true, Secure:false, Path:"/", SameSite:http.SameSiteLaxMode, MaxAge:int(30*24*time.Hour/time.Second)})
		s.audit(&id, "login", "auth", map[string]any{"email": body.Email})
		writeJSON(w, 200, map[string]any{"token": access})
	})

	s.Mux.HandleFunc("/api/auth/change_password", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost { http.Error(w, "method not allowed", 405); return }
		_, claims, err := s.verifyAuth(r)
		if err != nil { http.Error(w, "unauthorized", 401); return }
		uid := int64(claims["sub"].(float64))
		var body struct{ Current, New string }
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, err.Error(), 400); return }
		var hash string
		if err := s.DB.QueryRow(`SELECT passhash FROM users WHERE id=?`, uid).Scan(&hash); err != nil { http.Error(w, err.Error(), 500); return }
		if bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Current)) != nil { http.Error(w, "invalid current password", 400); return }
		newHash, _ := bcrypt.GenerateFromPassword([]byte(body.New), bcrypt.DefaultCost)
		if _, err := s.DB.Exec(`UPDATE users SET passhash=? WHERE id=?`, string(newHash), uid); err != nil { http.Error(w, err.Error(), 500); return }
		s.audit(nil, "change_password", "auth", map[string]any{})
		writeJSON(w, 200, map[string]any{"ok": true})
	})

	s.Mux.HandleFunc("/api/auth/refresh", func(w http.ResponseWriter, r *http.Request) {
		ck, err := r.Cookie("bootah_refresh"); if err != nil { http.Error(w, "no refresh", 401); return }
		t, err := jwt.ParseWithClaims(ck.Value, &jwt.RegisteredClaims{}, func(t *jwt.Token) (interface{}, error) { return []byte(secret), nil }, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
		if err != nil || !t.Valid { http.Error(w, "invalid refresh", 401); return }
		claims := t.Claims.(*jwt.RegisteredClaims)
		id, _ := strconv.ParseInt(claims.Subject, 10, 64)
		var email, role string
		if err := s.DB.QueryRow(`SELECT email, role FROM users WHERE id=?`, id).Scan(&email, &role); err != nil { http.Error(w, "user not found", 401); return }
		acc, ref, _ := s.issueTokens(id, email, role)
		http.SetCookie(w, &http.Cookie{Name:"bootah_refresh", Value:ref, HttpOnly:true, Secure:false, Path:"/", SameSite:http.SameSiteLaxMode, MaxAge:int(30*24*time.Hour/time.Second)})
		writeJSON(w, 200, map[string]any{"token": acc})
	})

	s.Mux.HandleFunc("/api/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		http.SetCookie(w, &http.Cookie{Name:"bootah_refresh", Value:"", MaxAge:0, Path:"/"})
		writeJSON(w, 200, map[string]any{"ok": true})
	})

	s.Mux.HandleFunc("/api/auth/me", func(w http.ResponseWriter, r *http.Request) {
		_, claims, err := s.verifyAuth(r)
		if err != nil { http.Error(w, "unauthorized", 401); return }
		writeJSON(w, 200, claims)
	})
}

func (s *Server) adminUserRoutes() {
	s.Mux.HandleFunc("/api/admin/users", func(w http.ResponseWriter, r *http.Request) {
		if !s.requireRole(w, r, "admin") { return }
		if r.Method != http.MethodGet { http.Error(w, "method not allowed", 405); return }
		rows, err := s.DB.Query(`SELECT id, email, role, created_at FROM users ORDER BY id ASC`)
		if err != nil { http.Error(w, err.Error(), 500); return }
		defer rows.Close()
		var out []User
		for rows.Next() {
			var u User
			if err := rows.Scan(&u.ID, &u.Email, &u.Role, &u.CreatedAt); err != nil { http.Error(w, err.Error(), 500); return }
			out = append(out, u)
		}
		writeJSON(w, 200, out)
	})

	s.Mux.HandleFunc("/api/admin/users/role", func(w http.ResponseWriter, r *http.Request) {
		if !s.requireRole(w, r, "admin") { return }
		if r.Method != http.MethodPut { http.Error(w, "method not allowed", 405); return }
		var body struct{ ID int64 `json:"id"`; Role string `json:"role"` }
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, err.Error(), 400); return }
		role := strings.ToLower(strings.TrimSpace(body.Role))
		if role != "admin" && role != "operator" && role != "viewer" {
			http.Error(w, "invalid role", 400); return
		}
		if _, err := s.DB.Exec(`UPDATE users SET role=? WHERE id=?`, role, body.ID); err != nil { http.Error(w, err.Error(), 500); return }
		s.audit(nil, "role_update", "user", map[string]any{"id": body.ID, "role": role})
		writeJSON(w, 200, map[string]any{"ok": true})
	})

	s.Mux.HandleFunc("/api/admin/users/delete", func(w http.ResponseWriter, r *http.Request) {
		if !s.requireRole(w, r, "admin") { return }
		if r.Method != http.MethodDelete { http.Error(w, "method not allowed", 405); return }
		var body struct{ ID int64 `json:"id"` }
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, err.Error(), 400); return }
		if _, err := s.DB.Exec(`DELETE FROM users WHERE id=?`, body.ID); err != nil { http.Error(w, err.Error(), 500); return }
		writeJSON(w, 200, map[string]any{"deleted": body.ID})
	})

	s.Mux.HandleFunc("/api/admin/users/reset_password", func(w http.ResponseWriter, r *http.Request) {
		if !s.requireRole(w, r, "admin") { return }
		if r.Method != http.MethodPost { http.Error(w, "method not allowed", 405); return }
		var body struct{ ID int64 `json:"id"` }
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, err.Error(), 400); return }
		temp := genTempPassword()
		hash, _ := bcrypt.GenerateFromPassword([]byte(temp), bcrypt.DefaultCost)
		if _, err := s.DB.Exec(`UPDATE users SET passhash=? WHERE id=?`, string(hash), body.ID); err != nil { http.Error(w, err.Error(), 500); return }
		s.audit(nil, "reset_password", "user", map[string]any{"id": body.ID})
		writeJSON(w, 200, map[string]any{"temporaryPassword": temp})
	})
}

// ---- OIDC ----
func (s *Server) oidcStart(w http.ResponseWriter, r *http.Request) {
	if !s.OIDCEnabled { http.Error(w, "oidc disabled", 400); return }
	state := genID()
	url := s.OAuth2Conf.AuthCodeURL(state)
	writeJSON(w, 200, map[string]string{"redirect": url, "state": state})
}

func (s *Server) oidcCallback(w http.ResponseWriter, r *http.Request) {
	if !s.OIDCEnabled { http.Error(w, "oidc disabled", 400); return }
	ctx := r.Context()
	code := r.URL.Query().Get("code")
	if code == "" { http.Error(w, "missing code", 400); return }
	oauth2Token, err := s.OAuth2Conf.Exchange(ctx, code)
	if err != nil { http.Error(w, "exchange: "+err.Error(), 400); return }
	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok { http.Error(w, "missing id_token", 400); return }
	idToken, err := s.OIDCVerifier.Verify(ctx, rawIDToken)
	if err != nil { http.Error(w, "verify: "+err.Error(), 400); return }
	var claims struct{ Email string `json:"email"` }
	if err := idToken.Claims(&claims); err != nil { http.Error(w, "claims: "+err.Error(), 400); return }
	if strings.TrimSpace(claims.Email) == "" { http.Error(w, "no email", 400); return }
	var id int64
	err = s.DB.QueryRow(`SELECT id FROM users WHERE email=?`, claims.Email).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		var cnt int
		_ = s.DB.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&cnt)
		role := "operator"
		if cnt == 0 { role = "admin" }
		_, err = s.DB.Exec(`INSERT INTO users (email, passhash, role, created_at) VALUES (?,?,?,?)`,
			claims.Email, "", role, time.Now().Format(time.RFC3339))
		if err != nil { http.Error(w, "create: "+err.Error(), 500); return }
		_ = s.DB.QueryRow(`SELECT id FROM users WHERE email=?`, claims.Email).Scan(&id)
	} else if err != nil {
		http.Error(w, err.Error(), 500); return
	}
	role := "viewer"
	_ = s.DB.QueryRow(`SELECT role FROM users WHERE id=?`, id).Scan(&role)
	access, refresh, _ := s.issueTokens(id, claims.Email, role)
	http.SetCookie(w, &http.Cookie{Name:"bootah_refresh", Value:refresh, HttpOnly:true, Secure:false, Path:"/", SameSite:http.SameSiteLaxMode, MaxAge:int(30*24*time.Hour/time.Second)})
	html := fmt.Sprintf(`<!doctype html><meta charset="utf-8"><script>
localStorage.setItem('bootah_token', %q);
fetch('/api/auth/me',{headers:{Authorization:'Bearer '+%q}}).then(r=>r.json()).then(me=>{
  localStorage.setItem('bootah_role', me.role||'');
  window.location.href='/';
});
</script>`, access, access)
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(200)
	_, _ = w.Write([]byte(html))
}

// ---- DB & helpers ----
func initDB(db *sql.DB) error {
	ddl := `CREATE TABLE IF NOT EXISTS images (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		size_mb INTEGER NOT NULL,
		updated TEXT NOT NULL,
		file TEXT NOT NULL
	);`
	_, err := db.Exec(ddl)
	return err
}

func getenv(k, def string) string { if v := strings.TrimSpace(os.Getenv(k)); v != "" { return v }; return def }
func getFilePart(r *http.Request, key string) (multipart.File, *multipart.FileHeader, error) { f, hdr, err := r.FormFile(key); return f, hdr, err }
func detectType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext { case ".wim": return "wim"; case ".ffu": return "ffu"; case ".iso": return "iso"; default: return strings.TrimPrefix(ext, ".") }
}
func genID() string { return fmt.Sprintf("%d%04d", time.Now().Unix(), rand.Intn(10000)) }
func genTempPassword() string {
	const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%"
	b := make([]byte, 12); for i := range b { b[i] = letters[rand.Intn(len(letters))] }; return string(b)
}

// verifyAuth using JWT lib
type jwtClaims struct {
	Sub   int64  `json:"sub"`
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}
func (s *Server) issueTokens(id int64, email, role string) (string, string, error) {
	now := time.Now()
	acc := jwt.NewWithClaims(jwt.SigningMethodHS256, jwtClaims{
		Sub: id, Email: email, Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	})
	ref := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		Subject:   fmt.Sprint(id),
		ExpiresAt: jwt.NewNumericDate(now.Add(30 * 24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(now),
		ID:        genID(),
	})
	accStr, err := acc.SignedString([]byte(s.JWTSecret))
	if err != nil { return "", "", err }
	refStr, err := ref.SignedString([]byte(s.JWTSecret))
	if err != nil { return "", "", err }
	return accStr, refStr, nil
}
func (s *Server) parseAccess(token string) (*jwtClaims, error) {
	t, err := jwt.ParseWithClaims(token, &jwtClaims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.JWTSecret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil { return nil, err }
	if claims, ok := t.Claims.(*jwtClaims); ok && t.Valid { return claims, nil }
	return nil, fmt.Errorf("invalid token")
}
func (s *Server) verifyAuth(r *http.Request) (string, map[string]any, error) {
	ah := r.Header.Get("Authorization")
	if !strings.HasPrefix(ah, "Bearer ") { return "", nil, fmt.Errorf("no bearer") }
	tok := strings.TrimPrefix(ah, "Bearer ")
	claims, err := s.parseAccess(tok)
	if err != nil { return "", nil, err }
	m := map[string]any{"sub": claims.Sub, "email": claims.Email, "role": claims.Role}
	return tok, m, nil
}

// simple logging/cors
func loggingMiddleware(next http.Handler) http.Handler { return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { start := time.Now(); next.ServeHTTP(w, r); log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start)) }) }
func corsMiddleware(next http.Handler) http.Handler { return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Header().Set("Access-Control-Allow-Origin", "*"); w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization"); if r.Method == http.MethodOptions { w.WriteHeader(http.StatusNoContent); return }; next.ServeHTTP(w, r) }) }
func writeJSON(w http.ResponseWriter, status int, v any) { w.Header().Set("Content-Type", "application/json"); w.WriteHeader(status); json.NewEncoder(w).Encode(v) }

// ---- Audit Log ----
func initAudit(db *sql.DB) error {
	ddl := `CREATE TABLE IF NOT EXISTS audit (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ts TEXT NOT NULL,
		actor_id INTEGER,
		action TEXT NOT NULL,
		resource TEXT NOT NULL,
		meta TEXT
	);`
	_, err := db.Exec(ddl)
	return err
}
func (s *Server) audit(actorID *int64, action, resource string, meta map[string]any) {
	js, _ := json.Marshal(meta)
	var aid any = nil
	if actorID != nil { aid = *actorID }
	_, _ = s.DB.Exec(`INSERT INTO audit (ts, actor_id, action, resource, meta) VALUES (?,?,?,?,?)`,
		time.Now().Format(time.RFC3339), aid, action, resource, string(js))
}
func (s *Server) adminAuditRoutes() {
	s.Mux.HandleFunc("/api/admin/audit", func(w http.ResponseWriter, r *http.Request) {
		if !s.requireRole(w, r, "admin") { return }
		rows, err := s.DB.Query(`SELECT id, ts, actor_id, action, resource, meta FROM audit ORDER BY id DESC LIMIT 500`)
		if err != nil { http.Error(w, err.Error(), 500); return }
		defer rows.Close()
		var out []map[string]any
		for rows.Next() {
			var id int64; var ts, action, resource, meta string; var actor any
			if err := rows.Scan(&id, &ts, &actor, &action, &resource, &meta); err != nil { http.Error(w, err.Error(), 500); return }
			out = append(out, map[string]any{"id": id, "ts": ts, "actor_id": actor, "action": action, "resource": resource, "meta": meta})
		}
		writeJSON(w, 200, out)
	})
}

// ---- Storage health ----
func (s *Server) adminStorageRoutes() {
	s.Mux.HandleFunc("/api/admin/storage/health", func(w http.ResponseWriter, r *http.Request) {
		if !s.requireRole(w, r, "admin") { return }
		mode := getenv("BOOTAH_STORAGE", "local")
		resp := map[string]any{"mode": mode}
		switch mode {
		case "s3":
			resp["bucket"] = getenv("BOOTAH_S3_BUCKET", "")
			resp["region"] = getenv("BOOTAH_S3_REGION", "")
			if s3, ok := s.Store.(*S3Storage); ok {
				_, err := s3.Presign(r.Context(), "healthcheck.txt", 1*time.Second)
				if err != nil { resp["ok"] = false; resp["error"] = err.Error() } else { resp["ok"] = true }
			}
		default:
			resp["ok"] = true
		}
		writeJSON(w, 200, resp)
	})
}

// ---- WinPE Builder (stub) ----
func initJobs(db *sql.DB) error {
	ddl := `CREATE TABLE IF NOT EXISTS jobs (
		id TEXT PRIMARY KEY,
		kind TEXT NOT NULL,
		status TEXT NOT NULL,
		created_at TEXT NOT NULL,
		result TEXT
	);`
	_, err := db.Exec(ddl)
	return err
}
func (s *Server) winpeRoutes() {
	s.Mux.HandleFunc("/api/admin/winpe/jobs", func(w http.ResponseWriter, r *http.Request) {
		if !s.requireRole(w, r, "admin") { return }
		switch r.Method {
		case http.MethodGet:
			rows, err := s.DB.Query(`SELECT id, kind, status, created_at, result FROM jobs ORDER BY created_at DESC LIMIT 100`)
			if err != nil { http.Error(w, err.Error(), 500); return }
			defer rows.Close()
			var out []map[string]any
			for rows.Next() {
				var id, kind, status, created, result string
				if err := rows.Scan(&id, &kind, &status, &created, &result); err != nil { http.Error(w, err.Error(), 500); return }
				out = append(out, map[string]any{"id": id, "kind": kind, "status": status, "created_at": created, "result": result})
			}
			writeJSON(w, 200, out)
		case http.MethodPost:
			id := "job-" + genID()
			now := time.Now().Format(time.RFC3339)
			result := "/assets/winpe/boot.wim"
			_, err := s.DB.Exec(`INSERT INTO jobs (id, kind, status, created_at, result) VALUES (?,?,?,?,?)`, id, "winpe-build", "completed", now, result)
			if err != nil { http.Error(w, err.Error(), 500); return }
			s.audit(nil, "winpe_build", "job", map[string]any{"job": id})
			writeJSON(w, 201, map[string]any{"id": id, "status": "completed", "result": result})
		default:
			http.Error(w, "method not allowed", 405)
		}
	})
}

// ---- Driver Packs ----
func initDrivers(db *sql.DB) error {
	ddl1 := `CREATE TABLE IF NOT EXISTS driver_packs (
		id TEXT PRIMARY KEY,
		vendor TEXT NOT NULL,
		model TEXT NOT NULL,
		version TEXT NOT NULL,
		url TEXT NOT NULL,
		checksum TEXT,
		notes TEXT
	);`
	ddl2 := `CREATE TABLE IF NOT EXISTS image_driver_packs (
		image_id TEXT NOT NULL,
		pack_id TEXT NOT NULL,
		PRIMARY KEY (image_id, pack_id)
	);`
	if _, err := db.Exec(ddl1); err != nil { return err }
	if _, err := db.Exec(ddl2); err != nil { return err }
	return nil
}
func (s *Server) driverRoutes() {
	// CRUD driver packs (admin)
	s.Mux.HandleFunc("/api/admin/driver_packs", func(w http.ResponseWriter, r *http.Request) {
		if !s.requireRole(w, r, "admin") { return }
		switch r.Method {
		case http.MethodGet:
			rows, err := s.DB.Query(`SELECT id, vendor, model, version, url, checksum, notes FROM driver_packs ORDER BY vendor, model`)
			if err != nil { http.Error(w, err.Error(), 500); return }
			defer rows.Close()
			var out []map[string]any
			for rows.Next() {
				var id, vendor, model, version, url, checksum, notes string
				if err := rows.Scan(&id, &vendor, &model, &version, &url, &checksum, &notes); err != nil { http.Error(w, err.Error(), 500); return }
				out = append(out, map[string]any{"id": id, "vendor": vendor, "model": model, "version": version, "url": url, "checksum": checksum, "notes": notes})
			}
			writeJSON(w, 200, out)
		case http.MethodPost:
			var body map[string]any
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, err.Error(), 400); return }
			id := "drv-" + genID()
			_, err := s.DB.Exec(`INSERT INTO driver_packs (id, vendor, model, version, url, checksum, notes) VALUES (?,?,?,?,?,?,?)`,
				id, body["vendor"], body["model"], body["version"], body["url"], body["checksum"], body["notes"])
			if err != nil { http.Error(w, err.Error(), 500); return }
			writeJSON(w, 201, map[string]any{"id": id})
		case http.MethodDelete:
			var body struct{ ID string `json:"id"` }
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, err.Error(), 400); return }
			if _, err := s.DB.Exec(`DELETE FROM driver_packs WHERE id=?`, body.ID); err != nil { http.Error(w, err.Error(), 500); return }
			writeJSON(w, 200, map[string]any{"deleted": body.ID})
		default:
			http.Error(w, "method not allowed", 405)
		}
	})

	// Attach/detach to images (admin)
	s.Mux.HandleFunc("/api/admin/images/packs", func(w http.ResponseWriter, r *http.Request) {
		if !s.requireRole(w, r, "admin") { return }
		switch r.Method {
		case http.MethodGet:
			img := r.URL.Query().Get("image_id")
			rows, err := s.DB.Query(`SELECT p.id, p.vendor, p.model, p.version FROM driver_packs p JOIN image_driver_packs m ON p.id=m.pack_id WHERE m.image_id=?`, img)
			if err != nil { http.Error(w, err.Error(), 500); return }
			defer rows.Close()
			var out []map[string]any
			for rows.Next() {
				var id, vendor, model, version string
				if err := rows.Scan(&id, &vendor, &model, &version); err != nil { http.Error(w, err.Error(), 500); return }
				out = append(out, map[string]any{"id": id, "vendor": vendor, "model": model, "version": version})
			}
			writeJSON(w, 200, out)
		case http.MethodPost:
			var body struct{ ImageID, PackID string }
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, err.Error(), 400); return }
			if _, err := s.DB.Exec(`INSERT OR IGNORE INTO image_driver_packs (image_id, pack_id) VALUES (?,?)`, body.ImageID, body.PackID); err != nil { http.Error(w, err.Error(), 500); return }
			writeJSON(w, 201, map[string]any{"ok": true})
		case http.MethodDelete:
			var body struct{ ImageID, PackID string }
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, err.Error(), 400); return }
			if _, err := s.DB.Exec(`DELETE FROM image_driver_packs WHERE image_id=? AND pack_id=?`, body.ImageID, body.PackID); err != nil { http.Error(w, err.Error(), 500); return }
			writeJSON(w, 200, map[string]any{"ok": true})
		default:
			http.Error(w, "method not allowed", 405)
		}
	})
}
