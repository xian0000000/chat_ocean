package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"ocean-chat/firebase"
	"ocean-chat/middleware"

	"github.com/go-chi/chi/v5"
)

type Room struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	CreatedBy   string          `json:"createdBy"`
	CreatedAt   int64           `json:"createdAt"`
	Members     map[string]bool `json:"members"`
}

type CreateRoomRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// POST /rooms
func CreateRoom(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)

	var req CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		respondError(w, http.StatusBadRequest, "Field 'name' wajib diisi")
		return
	}

	room := Room{
		Name:        req.Name,
		Description: req.Description,
		CreatedBy:   uid,
		CreatedAt:   time.Now().UnixMilli(),
		Members:     map[string]bool{uid: true},
	}

	ref, err := firebase.Database.NewRef("rooms").Push(r.Context(), room)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal membuat room")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]string{"roomId": ref.Key})
}

// GET /rooms
func GetRooms(w http.ResponseWriter, r *http.Request) {
	var rooms map[string]Room
	ref := firebase.Database.NewRef("rooms")
	if err := ref.Get(r.Context(), &rooms); err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal mengambil rooms")
		return
	}

	respondJSON(w, http.StatusOK, rooms)
}

// GET /rooms/:roomId
func GetRoom(w http.ResponseWriter, r *http.Request) {
	roomId := chi.URLParam(r, "roomId")

	var room Room
	ref := firebase.Database.NewRef("rooms/" + roomId)
	if err := ref.Get(r.Context(), &room); err != nil {
		respondError(w, http.StatusNotFound, "Room tidak ditemukan")
		return
	}

	respondJSON(w, http.StatusOK, room)
}

// DELETE /rooms/:roomId
func DeleteRoom(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	roomId := chi.URLParam(r, "roomId")

	// Cek apakah user adalah pembuat room
	var room Room
	ref := firebase.Database.NewRef("rooms/" + roomId)
	if err := ref.Get(r.Context(), &room); err != nil {
		respondError(w, http.StatusNotFound, "Room tidak ditemukan")
		return
	}

	if room.CreatedBy != uid {
		respondError(w, http.StatusForbidden, "Hanya pembuat room yang bisa menghapus")
		return
	}

	// Hapus room dan semua messages-nya sekaligus
	updates := map[string]any{
		"rooms/"+roomId:    nil,
		"messages/"+roomId: nil,
	}

	if err := firebase.Database.NewRef("/").Update(r.Context(), updates); err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal menghapus room")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Room berhasil dihapus"})
}

// POST /rooms/:roomId/members/:uid
func AddMember(w http.ResponseWriter, r *http.Request) {
	callerUID := middleware.GetUID(r)
	roomId := chi.URLParam(r, "roomId")
	targetUID := chi.URLParam(r, "uid")

	// Cek room ada dan caller adalah member atau creator
	var room Room
	ref := firebase.Database.NewRef("rooms/" + roomId)
	if err := ref.Get(r.Context(), &room); err != nil {
		respondError(w, http.StatusNotFound, "Room tidak ditemukan")
		return
	}

	// User boleh join sendiri, tapi untuk tambah orang lain harus member/creator
	if callerUID != targetUID && !room.Members[callerUID] && room.CreatedBy != callerUID {
		respondError(w, http.StatusForbidden, "Kamu tidak punya akses untuk menambah member")
		return
	}

	// Tambah member
	memberRef := firebase.Database.NewRef("rooms/" + roomId + "/members/" + targetUID)
	if err := memberRef.Set(r.Context(), true); err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal menambah member")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Member berhasil ditambahkan"})
}

// DELETE /rooms/:roomId/members/:uid
func KickMember(w http.ResponseWriter, r *http.Request) {
	callerUID := middleware.GetUID(r)
	roomId := chi.URLParam(r, "roomId")
	targetUID := chi.URLParam(r, "uid")

	// Cek room ada
	var room Room
	ref := firebase.Database.NewRef("rooms/" + roomId)
	if err := ref.Get(r.Context(), &room); err != nil {
		respondError(w, http.StatusNotFound, "Room tidak ditemukan")
		return
	}

	// Hanya creator yang bisa kick orang lain
	// User bisa keluar sendiri (kick diri sendiri)
	if callerUID != targetUID && room.CreatedBy != callerUID {
		respondError(w, http.StatusForbidden, "Hanya pembuat room yang bisa kick member")
		return
	}

	// Creator tidak bisa di-kick (termasuk kick diri sendiri jika creator)
	if targetUID == room.CreatedBy {
		respondError(w, http.StatusBadRequest, "Pembuat room tidak bisa di-kick")
		return
	}

	memberRef := firebase.Database.NewRef("rooms/" + roomId + "/members/" + targetUID)
	if err := memberRef.Delete(r.Context()); err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal kick member")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Member berhasil dikeluarkan"})
}
