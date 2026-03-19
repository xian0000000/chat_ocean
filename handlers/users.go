package handlers

import (
	"encoding/json"
	"net/http"

	"ocean-chat/firebase"
	"ocean-chat/middleware"

	"github.com/go-chi/chi/v5"
)

type User struct {
	DisplayName string `json:"displayName"`
	PhotoURL    string `json:"photoURL"`
	Email       string `json:"email"`
	CreatedAt   int64  `json:"createdAt"`
	Online      bool   `json:"online"`
}

// GET /users/:uid
func GetUser(w http.ResponseWriter, r *http.Request) {
	uid := chi.URLParam(r, "uid")

	var user User
	ref := firebase.Database.NewRef("users/" + uid)
	if err := ref.Get(r.Context(), &user); err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	respondJSON(w, http.StatusOK, user)
}

// GET /users
func GetUsers(w http.ResponseWriter, r *http.Request) {
	// Hanya bisa dipanggil oleh user yang sudah login
	_ = middleware.GetUID(r)

	var users map[string]User
	ref := firebase.Database.NewRef("users")
	if err := ref.Get(r.Context(), &users); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch users")
		return
	}

	respondJSON(w, http.StatusOK, users)
}

// Helper
func respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, map[string]string{"error": msg})
}
