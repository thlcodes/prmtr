package main

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

type DeviceCodeResponse struct {
	DeviceCode      string `json:"device_code"`
	UserCode        string `json:"user_code"`
	VerificationURI string `json:"verification_uri"`
	ExpiresIn       int    `json:"expires_in"`
	Interval        int    `json:"interval"`
}

type AccessTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
	Error       string `json:"error"`
	Interval    int    `json:"interval"`
}

type CopilotTokenResponse struct {
	Token     string `json:"token"`
	RefreshIn int    `json:"refresh_in"`
}

type Session struct {
	DeviceCode         string
	AccessToken        string
	CopilotToken       string
	CopilotTokenExpiry int64
}

func checkApiKey(w http.ResponseWriter, r *http.Request) bool {
	if r.Header.Get("X-Api-Key") != os.Getenv("SECRET") {
		w.WriteHeader(401)
		return false
	}
	return true
}

func cors(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Access-Control-Allow-Origin", r.Header.Get("Origin"))
	w.Header().Add("Access-Control-Expose-Headers", "ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, X-GitHub-SSO, X-GitHub-Request-Id, Deprecation, Sunset")
	w.Header().Add("Access-Control-Allow-Credentials", "true")
	w.Header().Add("Access-Control-Allow-Headers", "*")
}

func main() {
	sessions := &sync.Map{}

	http.HandleFunc("/api/device/code", func(w http.ResponseWriter, r *http.Request) {
		cors(w, r)
		if r.Method == http.MethodOptions {
			return
		}
		if !checkApiKey(w, r) {
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		req, _ := http.NewRequest("POST", "https://github.com/login/device/code?client_id=Iv1.b507a08c87ecfe98&scope=read:user", nil)
		req.Header.Add("Accept", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		var deviceResp DeviceCodeResponse
		if err := json.NewDecoder(resp.Body).Decode(&deviceResp); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		b := make([]byte, 32)
		_, _ = rand.Read(b)
		sessionID := fmt.Sprintf("%x", b)

		sessions.Store(sessionID, &Session{
			DeviceCode: deviceResp.DeviceCode,
		})

		http.SetCookie(w, &http.Cookie{
			Name:     "session",
			Value:    sessionID,
			Path:     "/",
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteNoneMode,
		})

		json.NewEncoder(w).Encode(map[string]string{
			"user_code":        deviceResp.UserCode,
			"verification_uri": deviceResp.VerificationURI,
		})
	})

	http.HandleFunc("/api/auth/check", func(w http.ResponseWriter, r *http.Request) {
		cors(w, r)
		if !checkApiKey(w, r) {
			return
		}
		cookie, err := r.Cookie("session")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		sessionVal, ok := sessions.Load(cookie.Value)
		if !ok {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}
		session := sessionVal.(*Session)

		if session.AccessToken != "" && session.CopilotToken != "" {
			json.NewEncoder(w).Encode(map[string]bool{"authenticated": true})
			return
		}

		url := fmt.Sprintf("https://github.com/login/oauth/access_token?client_id=Iv1.b507a08c87ecfe98&grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=%s", session.DeviceCode)
		req, _ := http.NewRequest("POST", url, nil)
		req.Header.Set("Accept", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			log.Printf("access_token status not ok: %d, %s", resp.StatusCode, err)
			json.NewEncoder(w).Encode(map[string]bool{"authenticated": false})
			return
		}

		var tokenResp AccessTokenResponse
		if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
			fmt.Printf("access_token decode failed: %s", err)
			json.NewEncoder(w).Encode(map[string]bool{"authenticated": false})
			return
		}
		resp.Body.Close()

		if tokenResp.AccessToken == "" {
			log.Printf("access_token empty")
			json.NewEncoder(w).Encode(map[string]any{"authenticated": false, "interval": tokenResp.Interval})
			return
		}

		session.AccessToken = tokenResp.AccessToken

		authenticated := getCopilotToken(session)
		sessions.Store(cookie.Value, session)

		json.NewEncoder(w).Encode(map[string]bool{"authenticated": authenticated})
	})

	http.HandleFunc("/api/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		cors(w, r)
		if !checkApiKey(w, r) {
			return
		}
		cookie, err := r.Cookie("session")
		if err == nil {
			sessions.Delete(cookie.Value)
		}
		http.SetCookie(w, &http.Cookie{
			Name:     "session",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
		})
		w.WriteHeader(http.StatusOK)
	})

	http.HandleFunc("/api/chat/stream", func(w http.ResponseWriter, r *http.Request) {
		cors(w, r)
		if r.Method == http.MethodOptions {
			return
		}
		if !checkApiKey(w, r) {
			return
		}
		cookie, err := r.Cookie("session")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		sessionVal, ok := sessions.Load(cookie.Value)
		if !ok {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}
		session := sessionVal.(*Session)

		if session.CopilotToken == "" {
			http.Error(w, "Not authenticated", http.StatusUnauthorized)
			return
		}

		if time.Now().Unix() >= session.CopilotTokenExpiry {
			log.Println("refreshing token ...")
			if !getCopilotToken(session) {
				http.Error(w, "could not refresh copilot token", http.StatusUnauthorized)
				return
			}
		}

		var reqBody struct {
			Message     string  `json:"message"`
			Temperature float64 `json:"temperature"`
		}
		if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Prepare Copilot API request
		copilotReqBody := map[string]any{
			"intent":      true,
			"model":       "gpt-4",
			"n":           1,
			"stream":      true,
			"temperature": reqBody.Temperature,
			"messages": []map[string]string{
				{"role": "user", "content": reqBody.Message},
			},
		}
		copilotReqBytes, _ := json.Marshal(copilotReqBody)

		copilotReq, _ := http.NewRequest("POST", "https://api.business.githubcopilot.com/chat/completions",
			bytes.NewReader(copilotReqBytes))
		copilotReq.Header.Set("Content-Type", "application/json; charset=utf-8")
		copilotReq.Header.Set("Authorization", "Bearer "+session.CopilotToken)
		copilotReq.Header.Set("Editor-Version", "vscode/1.99")

		resp, err := http.DefaultClient.Do(copilotReq)
		if err != nil {
			http.Error(w, "Failed to contact Copilot API", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		scanner := bufio.NewScanner(resp.Body)
		w.Header().Set("Content-Type", "text/event-stream")
		for scanner.Scan() {
			line := scanner.Text()
			w.Write([]byte(line + "\n"))
			w.(http.Flusher).Flush()
		}
	})

	http.HandleFunc("/api/chat/ask", func(w http.ResponseWriter, r *http.Request) {
		cors(w, r)
		if r.Method == http.MethodOptions {
			return
		}
		if !checkApiKey(w, r) {
			return
		}
		cookie, err := r.Cookie("session")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		sessionVal, ok := sessions.Load(cookie.Value)
		if !ok {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}
		session := sessionVal.(*Session)

		if session.CopilotToken == "" {
			http.Error(w, "Not authenticated", http.StatusUnauthorized)
			return
		}

		if time.Now().Unix() >= session.CopilotTokenExpiry {
			log.Println("refreshing token ...")
			if !getCopilotToken(session) {
				http.Error(w, "could not refresh copilot token", http.StatusUnauthorized)
				return
			}
		}

		var reqBody struct {
			Message     string  `json:"message"`
			Temperature float64 `json:"temperature"`
		}
		if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Prepare Copilot API request
		copilotReqBody := map[string]any{
			"intent":      true,
			"model":       "gpt-4",
			"n":           1,
			"stream":      false,
			"temperature": reqBody.Temperature,
			"messages": []map[string]string{
				{"role": "user", "content": reqBody.Message},
			},
		}
		copilotReqBytes, _ := json.Marshal(copilotReqBody)

		copilotReq, _ := http.NewRequest("POST", "https://api.business.githubcopilot.com/chat/completions",
			bytes.NewReader(copilotReqBytes))
		copilotReq.Header.Set("Content-Type", "application/json; charset=utf-8")
		copilotReq.Header.Set("Authorization", "Bearer "+session.CopilotToken)
		copilotReq.Header.Set("Editor-Version", "vscode/1.99")

		resp, err := http.DefaultClient.Do(copilotReq)
		if err != nil {
			http.Error(w, "Failed to contact Copilot API", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		data, _ := io.ReadAll(resp.Body)
		w.Write(data)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("Server starting on port %s...\n", port)
	http.ListenAndServe(":"+port, nil)
}

func getCopilotToken(session *Session) bool {
	req, _ := http.NewRequest("GET", "https://api.github.com/copilot_internal/v2/token", nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "VSCode/1.99")
	req.Header.Set("Authorization", "Bearer "+session.AccessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		log.Printf("copilot_token status not ok: %d, %s", resp.StatusCode, err)
		return false
	}

	var copilotResp CopilotTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&copilotResp); err != nil {
		fmt.Printf("access_token decode failed: %s", err)
		return false
	}

	session.CopilotToken = copilotResp.Token
	session.CopilotTokenExpiry = time.Now().Unix() + int64(copilotResp.RefreshIn)
	return true
}
