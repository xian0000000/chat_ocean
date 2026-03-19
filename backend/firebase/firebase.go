package firebase

import (
	"context"
	"log"
	"os"
	"sync"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"firebase.google.com/go/v4/db"
	"google.golang.org/api/option"
)

var (
	App      *firebase.App
	Auth     *auth.Client
	Database *db.Client
	once     sync.Once
)

func Init() {
	once.Do(func() {
		ctx := context.Background()

		opt := option.WithCredentialsFile(os.Getenv("FIREBASE_CREDENTIALS_PATH"))

		config := &firebase.Config{
			DatabaseURL: os.Getenv("FIREBASE_DATABASE_URL"),
		}

		app, err := firebase.NewApp(ctx, config, opt)
		if err != nil {
			log.Fatalf("Firebase init error: %v", err)
		}

		authClient, err := app.Auth(ctx)
		if err != nil {
			log.Fatalf("Firebase auth error: %v", err)
		}

		dbClient, err := app.Database(ctx)
		if err != nil {
			log.Fatalf("Firebase database error: %v", err)
		}

		App = app
		Auth = authClient
		Database = dbClient

		log.Println("Firebase initialized")
	})
}
