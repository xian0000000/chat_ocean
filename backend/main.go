package main

import (
	"log"
	"net/http"
	"os"

	"ocean-chat/firebase"
	"ocean-chat/handlers"
	"ocean-chat/middleware"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Init Firebase Admin SDK
	firebase.Init()

	r := chi.NewRouter()

	// Global middleware
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{os.Getenv("FRONTEND_URL")},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.VerifyFirebaseToken)

		// Users
		r.Get("/users/{uid}", handlers.GetUser)
		r.Get("/users", handlers.GetUsers)

		// Rooms
		r.Post("/rooms", handlers.CreateRoom)
		r.Get("/rooms", handlers.GetRooms)
		r.Get("/rooms/{roomId}", handlers.GetRoom)
		r.Delete("/rooms/{roomId}", handlers.DeleteRoom)

		// Members
		r.Post("/rooms/{roomId}/members/{uid}", handlers.AddMember)
		r.Delete("/rooms/{roomId}/members/{uid}", handlers.KickMember)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on :%s", port)
	http.ListenAndServe(":"+port, r)
}
