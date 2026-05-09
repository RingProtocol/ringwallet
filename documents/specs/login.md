# Login — Product Definition (LLM-Oriented)

This document defines the login flow and UI behavior. Use it when implementing or changing login, routing, or auth state.

---

## 1. When to Show Login

- **First open:** When the user opens the PWA for the first time, show the login screen (at minimum, show the login button).
- **Product introduction:** Before login, show a product introduction so the user understands what Ring Wallet is. Render the **Introduce.tsx** component below the login button on the login screen. Content should align with the project README (vision, principles, open source, tagline).
- **Return from background:** When the user brings the app back from background (e.g. tab switch, app switch, lock screen), treat it like a fresh session: show the login screen again (show the login button). Do not assume the user is still logged in until they complete login.

---

## 2. Login Trigger and Flow

- **Single primary action:** The main action on the login screen is a **Login** button (in `App.tsx`).
- **Automatic face recognition:** When the user taps/clicks the login button, **automatically start face recognition** (no extra “Start face recognition” step). The login action = trigger face recognition; no separate confirmation before starting it.

---

## 3. Success Path

- **On login success:** Navigate to the home screen and render **Home.tsx** (home page content). The user must see the home view; do not stay on the login screen after a successful login.

---

## 4. Failure Path

- **On login failure:**
  - Show a clear “Login failed” (or equivalent) message to the user.
  - In **Login.tsx**, below the login button, display the **failure reason** in **red** text (e.g. “Face verification failed”, “Network error”, or the actual error message returned). Keep this message in the same view as the login button so the user can retry with context.

---

## Quick Reference for Agents

| Scenario                   | Behavior                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| First open / return to app | Show login screen; at least show the login button. Show **Introduce.tsx** (product intro) below the login button. |
| User taps Login            | Automatically trigger face recognition (no extra step).                                                           |
| Login succeeds             | Navigate to home and show **Home.tsx**.                                                                           |
| Login fails                | Show “Login failed”; show failure reason in **red** below button in **App.tsx**.                                  |
