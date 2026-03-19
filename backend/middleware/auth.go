package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"ocean-chat/firebase"
)

type contextKey string

const UIDKey contextKey = "uid"

func VerifyFirebaseToken(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			respondError(w, http.StatusUnauthorized, "Missing or invalid Authorization header")
			return
		}

		idToken := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := firebase.Auth.VerifyIDToken(r.Context(), idToken)
		if err != nil {
			respondError(w, http.StatusUnauthorized, "Invalid or expired token")
			return
		}

		// Inject UID into context
		ctx := context.WithValue(r.Context(), UIDKey, token.UID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUID(r *http.Request) string {
	uid, _ := r.Context().Value(UIDKey).(string)
	return uid
}

func respondError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
