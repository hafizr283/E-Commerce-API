# Interview Session: E-Commerce API – Auth & JWT Flow

**Session ID:** `2026-09-09-ecommerce-auth-01`  
**Task type:** `output_prediction`  
**Total points:** 25  

---

## How to Answer

### Option A – Browser (recommended)
Open [`interview.html`](interview.html) in your browser. Your answers auto-save to `localStorage` as you type. When done, click **Export Answers (JSON)** and save the downloaded file as `answers.json` in this directory.

### Option B – In Chat
Tell the AI assistant your answers per question ID (`q1`, `q2`, `q3`, `q4`). The evaluator skill will append them to `answers.json` automatically.

---

## How to Evaluate

After saving answers, run the evaluator skill:

```
Use the project-answer-evaluator skill to grade session 2026-09-09-ecommerce-auth-01
```

The evaluator will read `task.json`, `answers.json`, cross-reference the actual source files, and produce:
- `evaluation-1.json` – machine-readable report
- `evaluation-1.md` – human-readable feedback

---

## Questions at a Glance

| # | Topic | Points |
|---|-------|--------|
| q1 | AuthService.register() – return values, password encoding, JWT subject | 7 |
| q2 | JwtUtil – token expiry, isTokenValid() on expired token, broad Exception risk | 7 |
| q3 | SecurityConfig – duplicate matchers, /api/products auth, CSRF trade-off | 8 |
| q4 | Gap analysis – missing /login endpoint and JWT filter | 8 |

---

## Source Files in Scope

- `src/main/java/com/example/demo/service/AuthService.java`
- `src/main/java/com/example/demo/config/JwtUtil.java`
- `src/main/java/com/example/demo/config/SecurityConfig.java`
- `src/main/java/com/example/demo/controller/AuthController.java`
- `src/main/java/com/example/demo/model/User.java`
