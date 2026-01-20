# Edge Functions Proxy - Documentation

## 📋 Vue d'ensemble

5 Edge Functions sécurisées pour proxy-fier les appels aux APIs d'IA :

| Fonction | API | Base URL |
|----------|-----|----------|
| `openai-proxy` | OpenAI (GPT, DALL-E) | api.openai.com |
| `anthropic-proxy` | Anthropic (Claude) | api.anthropic.com |
| `grok-proxy` | xAI (Grok) | api.x.ai |
| `google-proxy` | Google AI (Gemini) | generativelanguage.googleapis.com |
| `elevenlabs-proxy` | ElevenLabs (Voice) | api.elevenlabs.io |

## ✅ Fonctionnalités

- **Authentification** : Validation du token Supabase obligatoire
- **Rate Limiting** : 30 requêtes/minute par utilisateur
- **Whitelist** : Seuls les endpoints autorisés sont accessibles
- **Logging** : Chaque appel est loggé (user_id, endpoint, durée)
- **CORS** : Headers configurés pour dev et production

---

## 🔧 Configuration des Secrets

### Dans Supabase Dashboard

1. Aller dans **Settings** → **Edge Functions** → **Secrets**
2. Ajouter les secrets suivants :

```
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-api03-...
GROK_API_KEY=xai-...
GOOGLE_API_KEY=AIza...
ELEVENLABS_API_KEY=...
```

### Variables automatiques (déjà présentes)

Ces variables sont automatiquement disponibles :
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🚀 Déploiement

### Option 1 : Via Supabase CLI

```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Lier au projet
supabase link --project-ref <your-project-ref>

# Déployer toutes les fonctions
supabase functions deploy openai-proxy
supabase functions deploy anthropic-proxy
supabase functions deploy grok-proxy
supabase functions deploy google-proxy
supabase functions deploy elevenlabs-proxy
```

### Option 2 : Via le Dashboard

1. Aller dans **Edge Functions** dans le dashboard Supabase
2. Cliquer sur **New Function**
3. Copier/coller le code de chaque fonction
4. Déployer

---

## 📡 Utilisation depuis l'app

### Format de requête

```typescript
POST /functions/v1/{proxy-name}
Authorization: Bearer <supabase_access_token>
Content-Type: application/json

{
  "endpoint": "/v1/...",      // Endpoint de l'API cible
  "method": "POST",           // GET, POST, PUT, DELETE
  "payload": { ... }          // Body de la requête
}
```

### Exemples

#### OpenAI - Chat Completion

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/openai-proxy`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    endpoint: '/v1/chat/completions',
    payload: {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: 'Hello!' }
      ]
    }
  })
});
```

#### Anthropic - Claude Message

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/anthropic-proxy`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    endpoint: '/v1/messages',
    payload: {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: 'Hello!' }
      ]
    }
  })
});
```

#### Google - Gemini

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/google-proxy`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    endpoint: '/v1beta/models/gemini-1.5-flash:generateContent',
    payload: {
      contents: [{
        parts: [{ text: 'Hello!' }]
      }]
    }
  })
});
```

#### ElevenLabs - Text to Speech

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-proxy`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    endpoint: '/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL',
    payload: {
      text: 'Bonjour !',
      model_id: 'eleven_multilingual_v2'
    }
  })
});

// La réponse est un ArrayBuffer audio
const audioBlob = await response.blob();
```

---

## 🔒 Endpoints autorisés

### OpenAI
- `/v1/chat/completions`
- `/v1/completions`
- `/v1/embeddings`
- `/v1/images/generations`
- `/v1/audio/transcriptions`
- `/v1/audio/translations`
- `/v1/models`

### Anthropic
- `/v1/messages`
- `/v1/complete`

### Grok
- `/v1/chat/completions`
- `/v1/completions`

### Google
- `/v1beta/models/gemini-*:generateContent`
- `/v1beta/models/gemini-*:streamGenerateContent`
- `/v1/models`

### ElevenLabs
- `/v1/text-to-speech/{voice_id}`
- `/v1/text-to-speech/{voice_id}/stream`
- `/v1/voices`
- `/v1/voices/{voice_id}`
- `/v1/models`

---

## ⚠️ Codes d'erreur

| Code | Signification |
|------|---------------|
| 400 | Requête invalide (JSON malformé, endpoint manquant) |
| 401 | Non authentifié (token manquant ou invalide) |
| 403 | Endpoint non autorisé |
| 429 | Rate limit dépassé (30 req/min) |
| 500 | Erreur serveur (API key non configurée, erreur réseau) |

---

## 📊 Headers de réponse

Chaque réponse inclut :

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1705312345
X-Proxy-Duration: 234ms
```

---

## 🧪 Test local

```bash
# Démarrer les fonctions en local
supabase functions serve

# Tester avec curl
curl -X POST http://localhost:54321/functions/v1/openai-proxy \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/v1/models",
    "method": "GET"
  }'
```

---

## 🗑️ Nettoyage du .env

Une fois les proxies déployés et testés, **supprimer** ces variables du `.env` :

```bash
# À SUPPRIMER (ne plus exposer côté client)
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY
EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY
EXPO_PUBLIC_VIBECODE_GROK_API_KEY
EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY
EXPO_PUBLIC_VIBECODE_ELEVENLABS_API_KEY
```

Les clés sont maintenant sécurisées côté serveur uniquement.
